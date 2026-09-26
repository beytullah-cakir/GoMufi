import * as crypto from 'crypto';
import * as vscode from 'vscode';
import type { DeviceToken, Role } from './types';

/**
 * Oturum yönetimi.
 *
 * Token `context.secrets` içinde tutulur — bu, işletim sisteminin şifre kasasıdır
 * (Windows Credential Manager / macOS Keychain / libsecret). `globalState` veya
 * ayarlar KULLANILMAZ: ikisi de düz metindir ve ayarlar Settings Sync ile başka
 * makinelere kopyalanır.
 */

const TOKEN_KEY = 'gomufi.accessToken';
const PROFILE_KEY = 'gomufi.profile';

/** Sona ermeden ne kadar önce tazeleyelim. */
const RENEW_MARGIN_MS = 5 * 60_000;
/** Geçici hatadan sonra yeniden deneme aralığı. */
const RENEW_RETRY_MS = 60_000;
/** Token'ın `exp` alanı okunamazsa körlemesine bekleme süresi. */
const RENEW_BLIND_MS = 15 * 60_000;

export interface Session {
    token: string;
    role: Role;
    userId: string;
    displayName: string;
}

export class Auth {
    private session: Session | null = null;
    private renewTimer: NodeJS.Timeout | null = null;
    private readonly changed = new vscode.EventEmitter<Session | null>();
    readonly onDidChange = this.changed.event;

    /**
     * Yalnızca TOKEN değişti (giriş, tazeleme, çıkış).
     *
     * `onDidChange`'den ayrı, çünkü o olay "oturum sahibi değişti" anlamına
     * geliyor ve dinleyicisi ders panelini açıyor. Tazeleme her yarım saatte bir
     * paneli yeniden açsaydı, öğrenci kapattığı panel önüne geri gelirdi.
     */
    private readonly tokenChanged = new vscode.EventEmitter<string | null>();
    readonly onDidChangeToken = this.tokenChanged.event;

    /**
     * Kullanıcı ŞİMDİ giriş yaptı (tarayıcı onayı geldi). `onDidChange`
     * açılışta kasadan geri yüklemede de tetikleniyor; ilk kurulum rehberi ve
     * "ders klasörüne geç" yalnızca gerçek girişte çalışmalı — yoksa her VS Code
     * penceresi açılışta ders klasörüne atlardı.
     */
    private readonly signedIn = new vscode.EventEmitter<Session>();
    readonly onDidSignIn = this.signedIn.event;

    constructor(private readonly ctx: vscode.ExtensionContext) {}

    get current(): Session | null {
        return this.session;
    }

    dispose(): void {
        this.stopRenew();
    }

    /** Eklenti açılışında kasadaki oturumu geri yükler. */
    async restore(): Promise<void> {
        // Laboratuvar modu: ortak bilgisayarda oturum VS Code kapanınca biter.
        // Kasada önceki öğrenciden kalmış bir token varsa (çökme, elektrik
        // kesintisi) onu da siliyoruz — sonraki öğrenci onun hesabıyla açmasın.
        if (vscode.workspace.getConfiguration('gomufi').get<boolean>('labMode') === true) {
            await this.ctx.secrets.delete(TOKEN_KEY);
            await this.ctx.globalState.update(PROFILE_KEY, undefined);
        }
        const token = await this.ctx.secrets.get(TOKEN_KEY);
        const raw = this.ctx.globalState.get<Omit<Session, 'token'>>(PROFILE_KEY);
        // Profil hassas değil (ad/rol), asıl sır olan token kasada.
        this.session = token && raw ? { token, ...raw } : null;
        this.scheduleRenew();
        await this.publish();
        this.tokenChanged.fire(this.session?.token ?? null);
    }

    /**
     * Kayan oturum: token'ı sona ERMEDEN taze biriyle değiştirir.
     *
     * Eskiden token girişte bir kez alınıyordu ve 30 dakika sonra ölüyordu;
     * öğrenci slaytları okurken oturumu düşüyor, paneldeki "Tekrar dene" ise
     * aynı ölü token'la aynı 401'i alıyordu — yani hiçbir işe yaramıyordu.
     */
    private async renew(): Promise<boolean> {
        if (!this.session) return false;
        const base = (
            vscode.workspace.getConfiguration('gomufi').get<string>('apiUrl') || ''
        ).replace(/\/+$/, '');

        let res: Response;
        try {
            res = await fetch(`${base}/auth/device-renew`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${this.session.token}` },
            });
        } catch {
            // Ağ hatası; token büyük ihtimalle hâlâ geçerli, birazdan yine dene.
            this.retryRenew();
            return false;
        }

        if (res.status === 401 || res.status === 403) {
            // Token gerçekten ölmüş (ör. makine uykudayken süresi doldu). Ölü bir
            // oturumu ayakta tutmak arayüzü yanıltır; temizleyip yolu gösteriyoruz.
            await this.signOut();
            void vscode.window
                .showWarningMessage('GoMufi: Oturumun sona erdi.', 'Giriş Yap')
                .then((s) => {
                    if (s === 'Giriş Yap') void vscode.commands.executeCommand('gomufi.signIn');
                });
            return false;
        }
        if (!res.ok) {
            this.retryRenew();
            return false;
        }

        const data = (await res.json()) as DeviceToken;
        this.session = { ...this.session, token: data.access_token };
        await this.ctx.secrets.store(TOKEN_KEY, data.access_token);
        this.scheduleRenew();
        this.tokenChanged.fire(data.access_token);
        return true;
    }

    private scheduleRenew(): void {
        this.stopRenew();
        if (!this.session) return;

        const exp = expiryOf(this.session.token);
        const delay = exp === null
            ? RENEW_BLIND_MS
            : Math.max(0, exp - Date.now() - RENEW_MARGIN_MS);
        this.renewTimer = setTimeout(() => { void this.renew(); }, delay);
    }

    private retryRenew(): void {
        this.stopRenew();
        this.renewTimer = setTimeout(() => { void this.renew(); }, RENEW_RETRY_MS);
    }

    private stopRenew(): void {
        if (this.renewTimer) {
            clearTimeout(this.renewTimer);
            this.renewTimer = null;
        }
    }

    /**
     * Giris TARAYICIDA yapilir; parola eklentiye HIC girilmez.
     *
     * Eklenti rastgele bir `state` uretir ve siteyi acar. Ogrenci sitede zaten
     * oturum acmis oldugu icin cogu zaman tek tik yeter. Eklenti bu arada
     * `state` ile token'i yoklar; token bir kez okunur ve sunucuda silinir.
     */
    async signIn(apiUrl: string, siteUrl: string): Promise<Session | null> {
        const base = apiUrl.replace(/\/+$/, '');
        const state = crypto.randomBytes(32).toString('hex');

        const opened = await vscode.env.openExternal(
            vscode.Uri.parse(`${siteUrl.replace(/\/+$/, '')}/vscode-baglan?state=${state}`),
        );
        if (!opened) throw new Error('Tarayıcı açılamadı.');

        const session = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'GoMufi: tarayıcıda onay bekleniyor…',
                cancellable: true,
            },
            (_progress, cancel) => this.poll(base, state, cancel),
        );
        if (!session) return null;

        this.session = session;
        await this.ctx.secrets.store(TOKEN_KEY, session.token);
        await this.ctx.globalState.update(PROFILE_KEY, {
            role: session.role,
            userId: session.userId,
            displayName: session.displayName,
        });
        this.scheduleRenew();
        await this.publish();
        this.tokenChanged.fire(session.token);
        this.signedIn.fire(session);
        return session;
    }

    /** Onay gelene kadar yoklar. Sunucu onaylanmamis durumda 404 doner. */
    private async poll(
        base: string, state: string, cancel: vscode.CancellationToken,
    ): Promise<Session | null> {
        const deadline = Date.now() + 5 * 60_000; // sunucudaki TTL ile ayni

        while (Date.now() < deadline) {
            if (cancel.isCancellationRequested) return null;
            await new Promise((r) => setTimeout(r, 2000));

            let res: Response;
            try {
                res = await fetch(`${base}/auth/device-poll?state=${state}`);
            } catch {
                continue; // gecici ag hatasi; yoklamaya devam
            }
            if (res.status === 404) continue; // henuz onaylanmadi
            if (!res.ok) throw new Error('Giriş tamamlanamadı.');

            const data = (await res.json()) as DeviceToken;
            return {
                token: data.access_token,
                role: data.role,
                userId: data.user_id,
                displayName: data.display_name,
            };
        }
        throw new Error('Onay süresi doldu. Tekrar dene.');
    }

    async signOut(): Promise<void> {
        this.stopRenew();
        this.session = null;
        await this.ctx.secrets.delete(TOKEN_KEY);
        await this.ctx.globalState.update(PROFILE_KEY, undefined);
        await this.publish();
        this.tokenChanged.fire(null);
    }

    /** Görünümlerin `when` koşulları bu bağlam anahtarlarına bakıyor. */
    private async publish(): Promise<void> {
        await vscode.commands.executeCommand(
            'setContext', 'gomufi.signedIn', this.session !== null,
        );
        await vscode.commands.executeCommand(
            'setContext', 'gomufi.view', viewFor(this.session),
        );
        this.changed.fire(this.session);
    }
}

/**
 * Rolü görünüme çevirir.
 *
 * Bu eşleme `package.json`'daki `when` dizelerinde değil burada duruyor: etkinlik
 * çubuğundaki GoMufi container'ı TÜM view'ları gizliyse ikonuyla birlikte yok
 * olur — eklenti kurulu görünür ama kullanıcı ona ulaşamaz. Bu yüzden her rol,
 * tanımadıklarımız dahil, bir görünüme düşmek zorunda.
 *
 * Admin sunucuda öğretmen gibi davranır (`get_current_teacher_id` admin'e bir
 * Teacher kaydı eşler), burada da öyle davranıyoruz.
 */
/**
 * JWT'nin `exp` alanını okur (ms cinsinden).
 *
 * İmza DOĞRULANMAZ ve doğrulanmasına gerek yok: bu bir yetki kararı değil,
 * yalnızca "ne zaman tazelemeliyim" zamanlaması. Yetkiyi her zamanki gibi
 * sunucu veriyor.
 */
function expiryOf(token: string): number | null {
    const payload = token.split('.')[1];
    if (!payload) return null;
    try {
        const json = Buffer.from(
            payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64',
        ).toString('utf8');
        const exp = (JSON.parse(json) as { exp?: unknown }).exp;
        return typeof exp === 'number' ? exp * 1000 : null;
    } catch {
        return null;
    }
}

function viewFor(session: Session | null): 'student' | 'teacher' | 'none' {
    if (!session) return 'none';
    switch (session.role) {
        case 'student': return 'student';
        case 'teacher':
        case 'admin': return 'teacher';
        default: return 'none';
    }
}
