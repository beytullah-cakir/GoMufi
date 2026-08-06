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

export interface Session {
    token: string;
    role: Role;
    userId: string;
    displayName: string;
}

export class Auth {
    private session: Session | null = null;
    private readonly changed = new vscode.EventEmitter<Session | null>();
    readonly onDidChange = this.changed.event;

    constructor(private readonly ctx: vscode.ExtensionContext) {}

    get current(): Session | null {
        return this.session;
    }

    /** Eklenti açılışında kasadaki oturumu geri yükler. */
    async restore(): Promise<void> {
        const token = await this.ctx.secrets.get(TOKEN_KEY);
        const raw = this.ctx.globalState.get<Omit<Session, 'token'>>(PROFILE_KEY);
        // Profil hassas değil (ad/rol), asıl sır olan token kasada.
        this.session = token && raw ? { token, ...raw } : null;
        await this.publish();
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
        if (!opened) throw new Error('Tarayici acilamadi.');

        const session = await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'GoMufi: tarayicida onay bekleniyor...',
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
        await this.publish();
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
            if (!res.ok) throw new Error('Giris tamamlanamadi.');

            const data = (await res.json()) as DeviceToken;
            return {
                token: data.access_token,
                role: data.role,
                userId: data.user_id,
                displayName: data.display_name,
            };
        }
        throw new Error('Onay suresi doldu. Tekrar dene.');
    }

    async signOut(): Promise<void> {
        this.session = null;
        await this.ctx.secrets.delete(TOKEN_KEY);
        await this.ctx.globalState.update(PROFILE_KEY, undefined);
        await this.publish();
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
function viewFor(session: Session | null): 'student' | 'teacher' | 'none' {
    if (!session) return 'none';
    switch (session.role) {
        case 'student': return 'student';
        case 'teacher':
        case 'admin': return 'teacher';
        default: return 'none';
    }
}
