import * as childProcess from 'child_process';
import * as crypto from 'crypto';
import * as http from 'http';
import * as vscode from 'vscode';
import * as hints from './hints';
import { pythonTerminalLine, resolvePython, warnPythonMissing } from './environment';
import { slideFileName } from './paths';
import { workspaceRoot } from './workspace';

/**
 * Sitedeki "Çalıştır" butonunun ulaştığı yerel sunucu.
 *
 * Öğrencinin MAKİNESİNDE çalışan bir HTTP sunucusudur; bu yüzden güvenlik
 * varsayılanları burada tavizsiz:
 *   - YALNIZCA 127.0.0.1'e bağlanır (0.0.0.0 olsaydı aynı ağdaki herkes
 *     öğrencinin bilgisayarında kod çalıştırabilirdi)
 *   - Her istek rastgele bir token ister; token siteye yalnızca GoMufi
 *     sunucusu üzerinden, aynı kullanıcının oturumuna verilir
 *   - `Origin` başlığı beyaz listeye karşı denetlenir (CORS tek başına yetmez;
 *     tarayıcı dışı istemciler CORS'u zaten yok sayar, token bu yüzden şart)
 *   - Komut kümesi KAPALI bir listedir: kod çalıştır, görev dosyasını hazırla,
 *     görevi kontrol et, ipucu göster. Serbest dosya okuma/silme/yol seçme YOK —
 *     dokunulan tek dosya eklentinin kendi çalışma klasöründeki görev dosyası.
 *
 * HTTPS sayfadan `http://127.0.0.1` çağrılabilir: tarayıcılar localhost'u
 * "güvenilir köken" sayar ve karışık içerik engeline takılmaz.
 *
 * NEDEN /run'dan FAZLASI: web'deki UYGULA görevi artık tarayıcı içi bir
 * editörde değil, öğrencinin kendi VS Code'unda çözülüyor. Panel (webview)
 * bunu postMessage ile yapıyordu; tarayıcının postMessage'ı yok, elinde
 * yalnızca bu sunucu var. Aynı yetenekler burada HTTP karşılığıyla duruyor ki
 * iki yüzeyde de AYNI akış çalışsın.
 */

const DEFAULT_ORIGINS = [
    'https://gomufi.com',
    'https://www.gomufi.com',
    'https://go-mufi.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

/**
 * Dil → çalıştırma komutu. Öğrencinin makinesindeki gerçek yorumlayıcı kullanılır.
 *
 * Yalnızca TEK DOSYAYI doğrudan çalıştırabilen diller burada. C/C++/Rust gibi
 * derleme + bağlama + çıktı adı gerektirenler kasıtlı olarak yok: onlar için
 * uydurma bir komut çalıştırmaktansa dosyayı editörde açmak dürüst davranış
 * (bkz. `run`). Site de aynı listeyi biliyor ve butonu ona göre adlandırıyor
 * (`codeLanguages.ts` → runsInVSCode).
 */
const RUN_COMMAND: Record<string, (file: string) => string> = {
    python: (f) => `python "${f}"`,
    javascript: (f) => `node "${f}"`,
    typescript: (f) => `npx tsx "${f}"`,
    java: (f) => `java "${f}"`,
    go: (f) => `go run "${f}"`,
    ruby: (f) => `ruby "${f}"`,
    php: (f) => `php "${f}"`,
    bash: (f) => `bash "${f}"`,
    powershell: (f) => `powershell -File "${f}"`,
};

/**
 * Çıktı yakalayan çalıştırma için komut + argümanlar.
 *
 * `RUN_COMMAND` kabuğa yazılacak TEK bir metin üretir (terminal için doğru);
 * burada ise argümanları ayrı veriyoruz ki kabuk araya girmesin — dosya yolunda
 * boşluk veya `&` olsa bile bir şey yorumlanmaz.
 */
const CAPTURE_COMMAND: Record<string, (file: string) => { cmd: string; args: string[] }> = {
    javascript: (f) => ({ cmd: 'node', args: [f] }),
    typescript: (f) => ({ cmd: 'npx', args: ['tsx', f] }),
};

/**
 * Dil → dosya uzantısı. `RUN_COMMAND`den GENİŞ: çalıştıramadığımız dilleri de
 * doğru uzantıyla yazıyoruz ki VS Code'un kendi renklendirmesi ve dil sunucusu
 * devreye girsin. Bir Go örneği `.py` olarak açılsaydı editör onu Python
 * sanardı — ders örneği olarak da bozuk görünürdü.
 */
const EXTENSION: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
    jsx: 'jsx',
    tsx: 'tsx',
    java: 'java',
    csharp: 'cs',
    c: 'c',
    cpp: 'cpp',
    go: 'go',
    rust: 'rs',
    ruby: 'rb',
    php: 'php',
    kotlin: 'kt',
    swift: 'swift',
    dart: 'dart',
    html: 'html',
    css: 'css',
    sql: 'sql',
    json: 'json',
    yaml: 'yaml',
    markdown: 'md',
    bash: 'sh',
    powershell: 'ps1',
    cmd: 'bat',
};

/**
 * Görev dosyasının kime ait olduğu.
 *
 * İkisi AYRI dosya olmak zorunda: öğretmen bir görevi doğrularken öğrencinin
 * aynı klasördeki çözümünün üzerine yazamaz — aynı kişi hem ders hazırlayıp
 * hem o dersi deneyebilir.
 */
export type TaskSlot = 'student' | 'solution';

/** Görevin bir dosyası. Çok dosyalı görevlerde birden fazlası gelir. */
export interface TaskFile {
    name: string;
    content: string;
    /** Çalıştırılacak dosya. Tam olarak biri işaretlidir. */
    entry?: boolean;
}

const legacyTaskFile = (ext: string) => `gorev.${ext}`;

/**
 * Öğretmenin verdiği dosya adını güvenli hale getirir.
 *
 * Bu ad DİSKE YAZILIYOR ve tarayıcıdan geliyor. `../` içeren ya da mutlak bir
 * yol, sunucunun dokunduğu tek klasör kuralını delerdi — bu yüzden ad
 * doğrulanmıyor, YENİDEN KURULUYOR: yalnızca dosya adı bileşeni alınır ve
 * beyaz listeye uymayan her karakter atılır. Geriye bir şey kalmazsa dosya
 * reddedilir (adı biz uydurursak öğrenci `import odev` yazdığında bulamaz).
 */
/** Hazırlanan bir öğrenci görevi — yazım kaydedicinin izleyeceği klasör. */
export interface PreparedTask {
    dir: vscode.Uri;
    files: string[];
    courseId?: number;
    taskKey?: string;
}

const safeFileName = (raw: unknown): string | null => {
    if (typeof raw !== 'string') return null;
    const base = raw.split(/[\\/]/).pop() ?? '';
    const clean = base.replace(/[^A-Za-z0-9._-]/g, '').replace(/^\.+/, '');
    return clean && clean.length <= 64 ? clean : null;
};

/** Bir görevde en fazla kaç dosya olabilir. Ders dosyası, klasör değil. */
const MAX_TASK_FILES = 12;

/**
 * Çözüm dosyaları AYRI KLASÖRDE tutulur — ad ÖNEKİ ile değil.
 *
 * Tek dosyalı dünyada `_cozum.py` yetiyordu. Çok dosyalı görevde dosyalar
 * birbirini `import odev` ile çağırıyor; adın önüne bir şey eklemek bu
 * çağrıları kırar. Aynı adlar, ayrı klasör: hem çakışma yok, hem içe aktarma
 * çalışıyor.
 */
const SOLUTION_DIR = '_cozum';

/** Sunucunun kabul ettiği komutlar. Liste dışındaki her yol 404. */
const ROUTES = ['/ping', '/run', '/task', '/check', '/hint', '/success', '/reveal', '/terminal'];

export interface RunPayload {
    code: string;
    language?: string;
    /** Slayt/ders adı — dosya adını okunur kılmak için, güvenli hale getirilir. */
    title?: string;
}

export class LocalRunner {
    private server: http.Server | null = null;
    private terminal: vscode.Terminal | null = null;
    private terminalDir: string | null = null;
    readonly token = crypto.randomBytes(24).toString('hex');
    private boundPort = 0;
    private workingDir: vscode.Uri | null = null;

    /**
     * Yuva başına son hazırlanan görev: dosya adları + hangisi çalıştırılacak.
     *
     * NEDEN HATIRLIYORUZ: `/check`, `/hint`, `/reveal` çağrıları görevin
     * dosyalarını taşımıyor — yalnızca dili taşıyor. Tek dosyalı dünyada ad
     * dilden türetilebiliyordu (`gorev.py`); `main.py` + `odev.py` ikilisinde
     * türetilemez. Site her çağrıda `entry` gönderebilir, ama göndermediğinde
     * (eski sürüm, sayfa yenilenmesi) doğru dosyaya düşmek için son hazırlığı
     * biliyor olmamız gerekiyor.
     */
    private tasks = new Map<TaskSlot, {
        names: string[]; entry: string; folder?: string; courseId?: number; taskKey?: string;
    }>();

    /**
     * Öğrencinin görevi hazırlandı: yazım kaydedici bu klasörü izlemeye başlar.
     * Yalnızca `student` yuvası — öğretmenin çözüm doğrulaması kaydedilmez.
     */
    private readonly prepared = new vscode.EventEmitter<PreparedTask>();
    readonly onDidPrepareTask = this.prepared.event;
    /** Kontrol başlamak üzere: bekleyen yazım kaydı kontrolden ÖNCE gönderilsin. */
    private readonly willCheck = new vscode.EventEmitter<vscode.Uri>();
    readonly onWillCheckTask = this.willCheck.event;

    /**
     * Kodun yazılacağı klasörü belirler — panelde bir ders açıldığında oraya
     * geçilir. Ayarlanmamışsa ev dizinindeki genel çalışma klasörü kullanılır,
     * böylece ders açmadan siteden "Çalıştır" diyen öğrenci de çalışır durumda kalır.
     */
    setWorkingDir(dir: vscode.Uri | null): void {
        this.workingDir = dir;
    }

    get port(): number {
        return this.boundPort;
    }

    get running(): boolean {
        return this.server !== null;
    }

    async start(): Promise<number> {
        if (this.server) return this.boundPort;

        this.server = http.createServer((req, res) => {
            this.handle(req, res).catch(() => {
                if (!res.headersSent) res.writeHead(500);
                res.end();
            });
        });

        return new Promise<number>((resolve, reject) => {
            this.server!.once('error', reject);
            // Port 0 = işletim sistemi boş bir port versin; sabit port başka bir
            // uygulamayla çakışabilirdi. Gerçek port eşleşmeyle siteye bildirilir.
            this.server!.listen(0, '127.0.0.1', () => {
                const addr = this.server!.address();
                this.boundPort = typeof addr === 'object' && addr ? addr.port : 0;
                resolve(this.boundPort);
            });
        });
    }

    stop(): void {
        this.server?.close();
        this.server = null;
        this.boundPort = 0;
    }

    private allowedOrigins(): string[] {
        const extra = vscode.workspace.getConfiguration('gomufi').get<string[]>('allowedOrigins');
        return [...DEFAULT_ORIGINS, ...(extra ?? [])];
    }

    private async handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
        const origin = req.headers.origin ?? '';
        const originOk = this.allowedOrigins().includes(origin);

        if (originOk) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Vary', 'Origin');
        }

        if (req.method === 'OPTIONS') {
            res.writeHead(originOk ? 204 : 403).end();
            return;
        }
        if (!originOk) {
            res.writeHead(403).end('origin reddedildi');
            return;
        }
        const route = (req.url ?? '').split('?')[0];
        if (req.method !== 'POST' || !ROUTES.includes(route)) {
            res.writeHead(404).end();
            return;
        }
        if (!this.authorized(req)) {
            res.writeHead(401).end('token gecersiz');
            return;
        }

        const body = await readBody(req);
        let payload: any = {};
        if (body.trim()) {
            try {
                payload = JSON.parse(body);
            } catch {
                res.writeHead(400).end('gecersiz istek');
                return;
            }
        }

        const json = (data: Record<string, unknown>) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(data));
        };

        // Hata gövdede dönüyor, HTTP koduyla değil: çağıran taraf "bağlantı
        // koptu" ile "kodun çalışmadı"yı ayırt edebilmeli. 500 görseydi site
        // eşleşmeyi düşürüp Pyodide'ye kaçardı — oysa VS Code ayakta.
        try {
            await this.dispatch(route, payload, json);
        } catch (err) {
            json({ ok: false, error: (err as Error).message });
        }
    }

    /** Kapalı komut listesi. Her biri yalnızca görev/slayt dosyasına dokunur. */
    private async dispatch(
        route: string, payload: any, json: (data: Record<string, unknown>) => void,
    ): Promise<void> {
        const language = typeof payload.language === 'string' ? payload.language : 'python';
        const slot: TaskSlot = payload.slot === 'solution' ? 'solution' : 'student';

        switch (route) {
            // Eşleşme kaydı Redis'te TTL ile duruyor; kayıt tazeyken bile VS Code
            // kapanmış olabilir. Site "bağlantı aktif" ışığını buna bakarak yakar.
            case '/ping':
                json({ ok: true, name: 'gomufi' });
                return;

            case '/run': {
                if (typeof payload.code !== 'string' || !payload.code.trim()) {
                    json({ ok: false, error: 'kod bos' });
                    return;
                }
                await this.run(payload as RunPayload);
                json({ ok: true });
                return;
            }

            case '/task': {
                const path = await this.prepareTask(payload, language, slot);
                json({ ok: true, path });
                return;
            }

            case '/check': {
                // Yeni çalıştırma: bir önceki ipucu artık geçersiz olabilir.
                hints.clear(this.taskPath(language, slot, payload.entry));
                // Önce görünür terminal: öğrenci programı çalışırken görür ve
                // `input()` sorularına kendi cevap verir. Kabuk shell integration
                // desteklemiyorsa çıktı okunamaz; gizli sürece düşüyoruz.
                let result = payload.visible === false
                    ? null
                    : await this.runInTerminal(language, slot, payload.entry);
                if (!result) {
                    result = await this.checkTask(
                        language, slot, typeof payload.stdin === 'string' ? payload.stdin : '',
                        payload.entry,
                    );
                }
                json({ ok: true, ...result });
                return;
            }

            // Ders slaydındaki terminal bloğu ("pip install pandas").
            //
            // YAZAR, ÇALIŞTIRMAZ: komut terminale düşer, Enter'a öğrenci basar.
            // Makinesine paket kuran bir komutun tarayıcıdaki bir tıklamayla
            // sessizce çalışması, öğrencinin ne olduğunu görmemesi olurdu.
            case '/terminal': {
                const command = String(payload.command ?? '').trim();
                if (!command) {
                    json({ ok: false, error: 'komut bos' });
                    return;
                }
                const terminal = this.ensureTerminal(this.dir());
                terminal.show(true);

                // Son satır YAZILIR ama çalıştırılmaz — kararı öğrenci verir.
                // Ondan öncekiler (`cd proje` gibi hazırlık adımları) çalışmak
                // zorunda, yoksa son komut yanlış klasörde beklerdi.
                const lines = command.split('\n').map((l) => l.trim()).filter(Boolean);
                lines.forEach((line, i) => {
                    terminal.sendText(line, i < lines.length - 1);
                });
                json({ ok: true });
                return;
            }

            case '/hint': {
                const path = this.taskPath(language, slot, payload.file);
                const message = String(payload.message ?? '');
                if (message) hints.show(path, message, Number(payload.line) || 0);
                else hints.clear(path);
                json({ ok: true });
                return;
            }

            case '/success': {
                hints.showSuccess(
                    this.taskPath(language, 'student', payload.file),
                    String(payload.message || 'Tebrikler! Görevi tamamladın.'),
                    Number(payload.xp) || 100,
                );
                json({ ok: true });
                return;
            }

            case '/reveal': {
                await this.revealLine(Number(payload.line) || 1, language, slot, payload.file);
                json({ ok: true });
                return;
            }

            default:
                json({ ok: false, error: 'bilinmeyen komut' });
        }
    }

    /** Görev dosyasını açar, imleci verilen satıra koyar. */
    async revealLine(
        line: number, language = 'python', slot: TaskSlot = 'student', file?: unknown,
    ): Promise<void> {
        const doc = await vscode.workspace.openTextDocument(
            vscode.Uri.file(this.taskPath(language, slot, file)),
        );
        const editor = await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.One, preserveFocus: false,
        });
        const index = Math.min(Math.max(0, line - 1), Math.max(0, doc.lineCount - 1));
        const pos = new vscode.Position(index, 0);
        editor.selection = new vscode.Selection(pos, pos);
        editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
    }

    /** Sabit süreli karşılaştırma — token'ı deneme yanılmayla bulmayı zorlaştırır. */
    private authorized(req: http.IncomingMessage): boolean {
        const header = req.headers.authorization ?? '';
        const given = header.startsWith('Bearer ') ? header.slice(7) : '';
        const a = Buffer.from(given);
        const b = Buffer.from(this.token);
        return a.length === b.length && crypto.timingSafeEqual(a, b);
    }

    /**
     * Kodu dosyaya yazar, editörde açar ve VS Code'un kendi terminalinde çalıştırır.
     *
     * Hem tarayıcıdan gelen HTTP isteği hem de ders panelinin postMessage'ı buraya
     * düşer — "çalıştır" davranışı tek yerde tanımlı olsun diye. Panel için HTTP
     * turu yoktur: token ve origin denetimi yalnızca dış dünyadan gelen istekleri
     * korur, kendi webview'ümüzü değil.
     */
    /**
     * Kodu diske yazıp editörde açar — ÇALIŞTIRMADAN.
     *
     * Dar panelde slaydın kod bloğu buraya taşınıyor: panelde ikinci bir kod
     * ekranı çizmek yerine kod gerçek editöre gidiyor. Öğrenci henüz çalıştırmak
     * istemeyebilir, sadece bakmak/düzenlemek isteyebilir; bu yüzden terminal
     * açılmıyor.
     *
     * Dosyanın ÜZERİNE YAZIYOR olması bilinçli: aynı slayda geri dönen öğrenci
     * ikinci bir `slayt-2.py` değil, üzerinde çalıştığı dosyayı bulmalı. Ama bu
     * yüzden `run` ile aynı dosyayı paylaşıyorlar — öğrencinin düzenlemesi bir
     * sonraki "editörde aç" ile kaybolur. Slayt başına ayrı dosya, ödev
     * klasörleri gibi bir isimlendirme şeması gerektirir.
     */
    async open(payload: RunPayload): Promise<void> {
        // Her slayt kendi dosyasında; öğrenci o dosyada değişiklik yaptıysa
        // KORUNUR — slayttaki orijinale dönmek isterse tek tık.
        const { file, kept } = await this.materialize(payload, true);
        const doc = await vscode.workspace.openTextDocument(file);
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
        if (kept) {
            const DON = 'Slayttaki Koda Dön';
            const secim = await vscode.window.showInformationMessage(
                'GoMufi: Bu slaytta yaptığın değişiklikler korundu.', DON,
            );
            if (secim === DON) await this.writeCode(file, payload.code);
        }
    }

    /** Kodu çalışma klasörüne yazar ve dosya/dil bilgisini döner. */
    private async materialize(
        payload: RunPayload, keepEdits = false,
    ): Promise<{ file: vscode.Uri; dir: vscode.Uri; language: string; kept: boolean }> {
        // Ölçüt ÇALIŞTIRILABİLİRLİK DEĞİL, tanınırlık: Rust'ı çalıştıramıyoruz
        // ama dosyayı `.rs` olarak yazmalıyız. Eskiden bilinmeyen her dil
        // Python'a düşüyor ve bir Go örneği `slayt.py` olarak açılıyordu.
        const language = payload.language && EXTENSION[payload.language]
            ? payload.language
            : 'python';
        const ext = EXTENSION[language] ?? 'txt';

        const dir = this.dir();
        await vscode.workspace.fs.createDirectory(dir);
        const file = vscode.Uri.joinPath(dir, slideFileName(payload.title, ext));
        if (keepEdits && await exists(file)) {
            const current = new TextDecoder().decode(await vscode.workspace.fs.readFile(file));
            if (current !== payload.code) return { file, dir, language, kept: true };
        }
        await this.writeCode(file, payload.code);
        return { file, dir, language, kept: false };
    }

    /**
     * Slayt kodunu dosyaya yazar — dosya editörde AÇIKSA arabelleği de değiştirir.
     *
     * Yalnızca `fs.writeFile` yetmiyor: belge kirliyse (öğrenci ya da bir önceki
     * slayt üzerinde oynadıysa) VS Code kendi kaydedilmemiş sürümünü tutar ve
     * diskteki değişikliği ekrana yansıtmaz. Öğrenci "Kodu Dene" dediğinde solda
     * yeni slaydın kodu yerine eskisini görmesinin sebebi buydu.
     */
    private async writeCode(file: vscode.Uri, code: string): Promise<void> {
        const open = vscode.workspace.textDocuments.find(
            (d) => !d.isClosed && d.uri.fsPath === file.fsPath,
        );
        if (!open) {
            await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(code));
            return;
        }

        const edit = new vscode.WorkspaceEdit();
        const end = open.lineAt(open.lineCount - 1).range.end;
        edit.replace(open.uri, new vscode.Range(new vscode.Position(0, 0), end), code);
        await vscode.workspace.applyEdit(edit);
        await open.save();
    }

    /**
     * Sitenin gönderdiği görev dosyalarını temizler ve sıraya koyar.
     *
     * Tek dosyalı eski istekler (`starter` metni) burada tek elemanlı bir
     * listeye çevriliyor — böylece aşağıdaki her şey tek bir yoldan yürüyor ve
     * "çok dosyalı" ayrı bir kod dalı olmuyor.
     */
    private taskFiles(payload: any, language: string, slot: TaskSlot): TaskFile[] {
        const ext = EXTENSION[language] ?? 'py';
        const raw = Array.isArray(payload?.files) ? payload.files : [];

        const files: TaskFile[] = [];
        for (const item of raw.slice(0, MAX_TASK_FILES)) {
            const name = safeFileName(item?.name);
            // Adı kurtarılamayan dosyayı SESSİZCE ATIYORUZ, uydurma bir adla
            // yazmıyoruz: `import odev` yazan öğrenci onu bulamazdı.
            if (!name || files.some((f) => f.name === name)) continue;
            files.push({
                name,
                content: typeof item?.content === 'string' ? item.content : '',
                entry: item?.entry === true,
            });
        }

        if (!files.length) {
            files.push({
                name: safeFileName(payload?.entry) ?? legacyTaskFile(ext),
                content: String(payload?.starter ?? ''),
                entry: true,
            });
        }
        // TAM OLARAK BİR giriş dosyası: işaretsizse de, birden fazla
        // işaretliyse de ilki. Belirsiz kalırsa site bir dosyayı gösterirken
        // burada başka bir dosya çalışırdı.
        const at = Math.max(0, files.findIndex((f) => f.entry));
        files.forEach((f, i) => { f.entry = i === at; });

        this.tasks.set(slot, {
            names: files.map((f) => f.name),
            entry: (files.find((f) => f.entry) ?? files[0]).name,
            // Görevin kendi klasörü (ör. "birlestir-8374"). Yoksa eski davranış:
            // ortak klasör. Aynı temizlik dosya adlarındaki gibi — site
            // tarayıcıdan gelir, klasör adıyla dışarı çıkılamamalı.
            folder: safeFileName(payload?.folder) ?? undefined,
            // Yazım kaydının gideceği yer. Site yalnızca öğrenci için gönderir.
            courseId: Number.isFinite(Number(payload?.courseId)) ? Number(payload.courseId) : undefined,
            taskKey: typeof payload?.taskKey === 'string' ? payload.taskKey.slice(0, 120) : undefined,
        });
        return files;
    }

    /** Yuvanın klasörü: öğrenci çalışma klasörü, çözüm ise onun alt klasörü. */
    private slotDir(slot: TaskSlot): vscode.Uri {
        const dir = this.dir();
        if (slot === 'solution') return vscode.Uri.joinPath(dir, SOLUTION_DIR);
        // NEDEN GÖREV BAŞINA KLASÖR: tüm görevler aynı klasöre aynı adla
        // (`gorev.py`) yazılıyordu ve öğrenci dosyasına "varsa dokunma" kuralı
        // uygulandığı için ikinci görev, öğrencinin önüne BİRİNCİ görevin
        // kodunu açıyordu (Uygula'nın kodu Birleştir'de çıkıyordu).
        const folder = this.tasks.get(slot)?.folder;
        return folder ? vscode.Uri.joinPath(dir, folder) : dir;
    }

    /**
     * UYGULA görevinin dosyalarını hazırlar ve editörde açar.
     *
     * `slayt.<ext>` DEĞİL ayrı dosyalar: slayt dosyası her "editörde aç" ile
     * üzerine yazılıyor, görev dosyaları ise öğrencinin çözümü — kaybolmamalı.
     * Bu yüzden yalnızca YOKSA oluşturuluyor; ikinci kez açıldığında öğrencinin
     * yazdıkları yerinde kalır.
     *
     * ÇOK DOSYA: gerçek bir proje tek dosya değildir — `main.py` `odev.py`den
     * içe aktarır. Hepsi AYNI klasöre yazılıyor ve program o klasörde
     * çalıştırılıyor (bkz. `checkTask` cwd), yoksa `import` çalışmazdı.
     *
     * Dönen yol GİRİŞ dosyasınındır: ipuçları ve "şu satıra git" onu hedefler.
     */
    async prepareTask(payload: any, language = 'python', slot: TaskSlot = 'student'): Promise<string> {
        const lang = RUN_COMMAND[language] ? language : 'python';
        const files = this.taskFiles(payload, lang, slot);
        const dir = this.slotDir(slot);
        await vscode.workspace.fs.createDirectory(dir);

        for (const f of files) {
            const file = vscode.Uri.joinPath(dir, f.name);
            if (slot === 'solution') {
                // Öğretmen doğrulaması: içerik HER ZAMAN tazelenir. "Varsa
                // dokunma" kuralı burada geçerli olsaydı, ikinci bir görevi
                // doğrulayan öğretmen bir önceki çözümü çalıştırıp yanlış
                // çıktıyı "doğrulanmış" sanırdı.
                await this.writeCode(file, f.content);
            } else {
                // Öğrenci dosyası: yalnızca yoksa yazılır, çözümü kaybolmasın.
                try {
                    await vscode.workspace.fs.stat(file);
                } catch {
                    await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(f.content));
                }
            }
        }

        const meta = this.tasks.get(slot);
        if (slot === 'student') {
            this.prepared.fire({
                dir,
                files: files.map((f) => f.name),
                courseId: meta?.courseId,
                taskKey: meta?.taskKey,
            });
        }

        // Sekmeler görevdeki sırayla açılıyor, GİRİŞ dosyası EN SON: son açılan
        // sekme öne gelir, öğrenci de çalıştıracağı dosyada başlamalı.
        const ordered = [...files.filter((f) => !f.entry), ...files.filter((f) => f.entry)];
        let entryPath = '';
        for (const f of ordered) {
            const file = vscode.Uri.joinPath(dir, f.name);
            const doc = await vscode.workspace.openTextDocument(file);
            await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
            if (f.entry) entryPath = file.fsPath;
        }
        return entryPath;
    }

    /**
     * Görevin ÇALIŞTIRILACAK dosyası. Sıra: isteğin söylediği, son hazırlığın
     * hatırladığı, en sonda tek dosyalı dünyanın adı (`gorev.<ext>`).
     */
    private entryFile(language: string, slot: TaskSlot, entry?: unknown): vscode.Uri {
        const name = safeFileName(entry)
            ?? this.tasks.get(slot)?.entry
            ?? legacyTaskFile(EXTENSION[language] ?? 'py');
        return vscode.Uri.joinPath(this.slotDir(slot), name);
    }

    /**
     * Görevin TÜM dosyalarını diskten okur.
     *
     * Ölçüm ve YZ koçu site tarafında; oraya yalnızca çalıştırılan dosyayı
     * göndermek, `odev.py` içinde çözüm yazan öğrencinin emeğini görünmez
     * kılardı. Kayıp dosya sessizce atlanıyor: öğrenci bir dosyayı silmiş
     * olabilir ve bu kontrolü tümden çökertmemeli.
     */
    private async readTaskFiles(slot: TaskSlot): Promise<TaskFile[]> {
        const dir = this.slotDir(slot);
        const names = this.tasks.get(slot)?.names ?? [];
        const out: TaskFile[] = [];
        for (const name of names) {
            const file = vscode.Uri.joinPath(dir, name);
            try {
                const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === file.fsPath);
                if (open?.isDirty) await open.save();
                out.push({
                    name,
                    content: new TextDecoder().decode(await vscode.workspace.fs.readFile(file)),
                    entry: name === this.tasks.get(slot)?.entry,
                });
            } catch {
                continue;
            }
        }
        return out;
    }

    /**
     * Görev dosyasını çalıştırır ve çıktısını YAKALAYARAK döner.
     *
     * Terminal `sendText` ile çalıştırmak burada işe yaramaz: terminale yazılanı
     * geri okuyamayız, oysa hem otomatik kontrol hem YZ koçu öğrencinin gerçek
     * çıktısına ihtiyaç duyuyor. Bu yüzden ayrı bir süreç açıyoruz.
     *
     * Öğrenci kodu sonsuz döngüye girebilir — bu bir hata değil, öğrenmenin
     * normal bir parçası. Zaman aşımı olmasaydı süreç arkada asılı kalırdı.
     */
    async checkTask(
        language = 'python', slot: TaskSlot = 'student', stdin = '',
        entry?: unknown, timeoutMs = 10_000,
    ): Promise<{
        code: string; files: TaskFile[]; stdout: string; stderr: string; timedOut: boolean;
    }> {
        assertTrusted();
        await assertConsent();
        const lang = RUN_COMMAND[language] ? language : 'python';
        const dir = this.slotDir(slot);
        const file = this.entryFile(lang, slot, entry);
        if (slot === 'student') this.willCheck.fire(dir);

        // Öğrencinin kaydetmemiş olma ihtimali yüksek; diskten okumadan önce
        // açık belgeyi kaydediyoruz, yoksa bir önceki sürümü çalıştırırdık.
        const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === file.fsPath);
        if (open?.isDirty) await open.save();

        const raw = await vscode.workspace.fs.readFile(file);
        const code = new TextDecoder().decode(raw);
        const files = await this.readTaskFiles(slot);

        const spec = await captureSpec(lang, file.fsPath);
        if (!spec) {
            return { code, files, stdout: '', stderr: missingInterpreter(lang), timedOut: false };
        }
        return new Promise((resolve) => {
            const child = childProcess.execFile(
                spec.cmd, spec.args,
                {
                    cwd: dir.fsPath, timeout: timeoutMs, maxBuffer: 1024 * 1024, windowsHide: true,
                    // Windows'ta Python, çıktısı boruya gidince konsol kod sayfasını
                    // kullanıyor (Türkçe kurulumda cp1254) ve `ı` `ğ` `ş` UTF-8
                    // olarak çözülünce bozuluyor. Bunu zorlamazsak öğrencinin
                    // doğru çıktısı beklenenle asla eşleşmez.
                    env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
                },
                (err, stdout, stderr) => {
                    const killed = !!err && (err as any).killed === true;
                    let errText = (stderr || (err && !killed ? String(err.message) : '')) ?? '';

                    // Beslenecek girdi yokken `input()` çağrılmış: bu öğrencinin
                    // hatası DEĞİL, görevin örnek girdisi tanımlanmamış demek.
                    // Ham traceback öğrenciyi kendi kodunu aramaya iter.
                    if (!stdin && errText.includes('EOFError')) {
                        errText = 'Bu görev klavyeden girdi bekliyor ama örnek girdi tanımlanmamış. '
                            + 'Öğretmenin ÖRNEKLER tablosuna bir girdi eklemesi gerekiyor.';
                    }

                    resolve({
                        code,
                        files,
                        stdout: stdout ?? '',
                        // Yorumlayıcı bulunamadıysa stderr boş kalır; öğrenci
                        // "hiçbir şey olmadı" görmesin diye hatayı biz yazıyoruz.
                        stderr: errText,
                        timedOut: killed,
                    });
                },
            );
            // `input()` kullanan görevler için besleme. Boş gönderip kapatırsak
            // Python EOFError atar ve öğrenci, kodu doğru olduğu hâlde ham bir
            // traceback görür. Veri, görevin ÖRNEKLER tablosundan geliyor —
            // orası zaten "şu girdiye şu çıktı" demek.
            if (stdin) child.stdin?.write(stdin.endsWith('\n') ? stdin : `${stdin}\n`);
            child.stdin?.end();
        });
    }

    /**
     * Görev dosyasının tam yolu — ipuçlarının hangi dosyaya iliştiğini bilmek için.
     *
     * `file` verilirse o dosya, verilmezse görevin giriş dosyası. Koç ipucu
     * "3. satırda" derken hangi dosyanın 3. satırı olduğunu söylemek zorunda:
     * çok dosyalı görevde ipucu yanlış dosyaya iliştiğinde öğrenci var olmayan
     * bir hatayı arar.
     */
    taskPath(language = 'python', slot: TaskSlot = 'student', file?: unknown): string {
        const lang = RUN_COMMAND[language] ? language : 'python';
        return this.entryFile(lang, slot, file).fsPath;
    }

    /**
     * Görevi ÖĞRENCİNİN GÖRDÜĞÜ terminalde çalıştırır ve bitince çıktısını döner.
     *
     * NEDEN GİZLİ SÜREÇ DEĞİL: `input()` kullanan görevlerde gizli çalıştırma,
     * öğrencinin cevabını klavyeden yazmasına izin vermiyor — girdiyi biz
     * besliyoruz. Öğrenci aynı programı bir de kendi terminalinde çalıştırınca
     * ortada iki ayrı çalıştırma oluyor ve hangisinin kontrol edildiği
     * belirsizleşiyor. Tek çalıştırma, görünür yerde.
     *
     * Shell integration olmadan terminal çıktısı OKUNAMAZ; o yüzden yoksa
     * çağıran `checkTask`e düşer (orada girdi örneklerden beslenir).
     */
    async runInTerminal(
        language = 'python', slot: TaskSlot = 'student', entry?: unknown,
    ): Promise<{
        code: string; files: TaskFile[]; stdout: string; stderr: string; timedOut: boolean;
    } | null> {
        assertTrusted();
        await assertConsent();
        const lang = RUN_COMMAND[language] ? language : 'python';
        const dir = this.slotDir(slot);
        const file = this.entryFile(lang, slot, entry);
        if (slot === 'student') this.willCheck.fire(dir);

        const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === file.fsPath);
        if (open?.isDirty) await open.save();

        const raw = await vscode.workspace.fs.readFile(file);
        const code = new TextDecoder().decode(raw);
        const files = await this.readTaskFiles(slot);

        const terminal = this.ensureTerminal(dir);
        terminal.show(true);

        const shell = await waitForShellIntegration(terminal);
        if (!shell) return null;

        const line = await terminalCommand(lang, file.fsPath);
        if (!line) return { code, files, stdout: '', stderr: missingInterpreter(lang), timedOut: false };
        const execution = shell.executeCommand(line);

        // `read()` çalıştırma bitene kadar akar; bu bekleyiş aynı zamanda
        // "program durdu mu" sorusunun cevabı.
        let output = '';
        for await (const chunk of execution.read()) output += chunk;

        const clean = stripAnsi(output);
        // Terminalde stdout ve stderr tek akışta gelir, ayıramayız. Python
        // hatası ayırt edilebilir tek şey: traceback başlığı.
        const traceAt = clean.indexOf('Traceback (most recent call last)');
        return {
            code,
            files,
            stdout: traceAt >= 0 ? clean.slice(0, traceAt).trim() : clean.trim(),
            stderr: traceAt >= 0 ? clean.slice(traceAt).trim() : '',
            timedOut: false,
        };
    }

    private ensureTerminal(dir: vscode.Uri): vscode.Terminal {
        if (!this.terminal || this.terminal.exitStatus !== undefined
            || this.terminalDir !== dir.fsPath) {
            this.terminal?.dispose();
            this.terminal = vscode.window.createTerminal({ name: 'GoMufi', cwd: dir });
            this.terminalDir = dir.fsPath;
        }
        return this.terminal;
    }

    /** Çalışma klasörünün kökü: ders slaydının kodu (`slayt.<ext>`) burada durur. */
    workingRoot(): vscode.Uri {
        return this.dir();
    }

    private dir(): vscode.Uri {
        // Ders seçilmeden sitede "Çalıştır" denirse: ders kökünün altında ortak klasör.
        return this.workingDir ?? vscode.Uri.joinPath(workspaceRoot(), 'Serbest Çalışma');
    }

    async run(payload: RunPayload): Promise<void> {
        assertTrusted();
        await assertConsent();
        const { file, dir, language } = await this.materialize(payload);

        const doc = await vscode.workspace.openTextDocument(file);
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });

        // Çalıştırma komutu olmayan diller (C++, Rust, C#…) için iş burada
        // biter: dosya editörde açıldı. Uydurma bir komut göndermek terminalde
        // "command not found" üretir ve öğrenci hatayı KENDİ kodunda arar.
        if (!RUN_COMMAND[language]) return;
        const line = await terminalCommand(language, file.fsPath);
        if (!line) return; // Python yok: terminalCommand öğrenciyi zaten yönlendirdi

        const terminal = this.ensureTerminal(dir);
        terminal.show(true);
        terminal.sendText(line);
    }
}

/**
 * Terminalin shell integration'ı hazır olana kadar bekler.
 *
 * Yeni açılan bir terminalde bu ANINDA hazır olmuyor: VS Code kabuğa kendi
 * betiğini enjekte ediyor ve kabuk açılışını bitirmesi gerekiyor. Beklemeden
 * sorsaydık her ilk çalıştırma yedek yola düşerdi.
 */
function waitForShellIntegration(
    terminal: vscode.Terminal, timeoutMs = 5000,
): Promise<vscode.TerminalShellIntegration | null> {
    if (terminal.shellIntegration) return Promise.resolve(terminal.shellIntegration);

    return new Promise((resolve) => {
        const done = (value: vscode.TerminalShellIntegration | null) => {
            clearTimeout(timer);
            sub.dispose();
            resolve(value);
        };
        const sub = vscode.window.onDidChangeTerminalShellIntegration((e) => {
            if (e.terminal === terminal) done(e.shellIntegration);
        });
        // Kabuk shell integration desteklemiyor olabilir (eski PowerShell, özel
        // kabuk). Sonsuza kadar beklemek yerine yedek yola bırakıyoruz.
        const timer = setTimeout(() => done(null), timeoutMs);
    });
}

/** Terminal çıktısındaki renk/konum kaçış dizilerini temizler. */
function stripAnsi(text: string): string {
    return text
        // CSI dizileri: renk, imleç hareketi, satır temizleme
        .replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')
        // OSC dizileri: pencere başlığı, shell integration işaretleri
        .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '');
}

function readBody(req: http.IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', (chunk) => {
            data += chunk;
            // Slayt kodu küçüktür; büyük gövde kabul etmenin bir nedeni yok.
            if (data.length > 256 * 1024) {
                reject(new Error('gövde çok büyük'));
                req.destroy();
            }
        });
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}


async function exists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

/**
 * Terminale yazılacak çalıştırma satırı. Python için yorumlayıcı ARANIR
 * (bkz. environment.ts); bulunamazsa öğrenci yönlendirilir ve null döner.
 */
async function terminalCommand(language: string, file: string): Promise<string | null> {
    if (language === 'python') {
        const line = await pythonTerminalLine(file);
        if (!line) void warnPythonMissing();
        return line;
    }
    return RUN_COMMAND[language]?.(file) ?? null;
}

/** Çıktı yakalayan çalıştırmanın komutu; terminal satırıyla AYNI yorumlayıcı. */
async function captureSpec(language: string, file: string): Promise<{ cmd: string; args: string[] } | null> {
    if (language === 'python') {
        const py = await resolvePython();
        if (!py) {
            void warnPythonMissing();
            return null;
        }
        return { cmd: py.cmd, args: [...py.args, file] };
    }
    return CAPTURE_COMMAND[language]?.(file) ?? null;
}

function missingInterpreter(language: string): string {
    return language === 'python'
        ? 'Bu bilgisayarda Python bulunamadı. python.org adresinden Python 3 kurup VS Code\'u yeniden başlat.'
        : `${language} için otomatik kontrol desteklenmiyor; kodu terminalde kendin çalıştırabilirsin.`;
}

/**
 * Kısıtlı modda (güvenilmeyen klasör) kod ÇALIŞTIRILMAZ: öğrencinin açtığı
 * yabancı bir klasörde GoMufi'nin bir şey çalıştırması beklenmedik olurdu.
 * Ders klasörü ilk açılışta güvenilir işaretlenince bu hiç görünmez.
 */
function assertTrusted(): void {
    if (vscode.workspace.isTrusted) return;
    const GUVEN = 'Klasöre Güven';
    void vscode.window.showWarningMessage(
        'GoMufi: Bu klasör "Kısıtlı Mod"da açık; kod çalıştırılmadı.', GUVEN,
    ).then((secim) => {
        if (secim === GUVEN) void vscode.commands.executeCommand('workbench.trust.manage');
    });
    throw new Error('Klasör kısıtlı modda; kod çalıştırmak için klasöre güvenmen gerekiyor.');
}

/**
 * Bir kerelik izin: derslerdeki kod öğrencinin bilgisayarında çalışıyor.
 *
 * NEDEN: öğretmen hesapları herkese açık; kötü niyetli biri öğretmen olup
 * "Kodu Dene" slaydına zararlı Python koyabilirdi. Öğrenci (ya da velisi) ilk
 * çalıştırmada ne olduğunu bilerek izin verir; reddederse hiçbir şey çalışmaz.
 */
const CONSENT_KEY = 'gomufi.runConsent';
let consentStore: vscode.Memento | null = null;

export function initConsent(store: vscode.Memento): void {
    consentStore = store;
}

async function assertConsent(): Promise<void> {
    if (!consentStore || consentStore.get<boolean>(CONSENT_KEY)) return;
    const IZIN = 'İzin Ver';
    const secim = await vscode.window.showWarningMessage(
        'GoMufi: Derslerdeki kodlar bu bilgisayarda çalıştırılacak.',
        {
            modal: true,
            detail: 'Kod, VS Code terminalinde senin hesabınla çalışır ve dosyalarına erişebilir. '
                + 'Yalnızca okulunun ya da tanıdığın öğretmenlerin derslerinde izin ver. '
                + 'Kodu çalıştırmadan önce her zaman editörde görebilirsin.',
        },
        IZIN,
    );
    if (secim !== IZIN) throw new Error('Kod çalıştırma izni verilmedi.');
    await consentStore.update(CONSENT_KEY, true);
}
