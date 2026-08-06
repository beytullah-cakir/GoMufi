import * as childProcess from 'child_process';
import * as crypto from 'crypto';
import * as http from 'http';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

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
 *   - Tek bir komut vardır: kod çalıştır. Dosya okuma/silme/yol seçme YOK.
 *
 * HTTPS sayfadan `http://127.0.0.1` çağrılabilir: tarayıcılar localhost'u
 * "güvenilir köken" sayar ve karışık içerik engeline takılmaz.
 */

const DEFAULT_ORIGINS = [
    'https://gomufi.com',
    'https://www.gomufi.com',
    'https://go-mufi.vercel.app',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

/** Dil → çalıştırma komutu. Öğrencinin makinesindeki gerçek yorumlayıcı kullanılır. */
const RUN_COMMAND: Record<string, (file: string) => string> = {
    python: (f) => `python "${f}"`,
    javascript: (f) => `node "${f}"`,
    typescript: (f) => `npx tsx "${f}"`,
};

/**
 * Çıktı yakalayan çalıştırma için komut + argümanlar.
 *
 * `RUN_COMMAND` kabuğa yazılacak TEK bir metin üretir (terminal için doğru);
 * burada ise argümanları ayrı veriyoruz ki kabuk araya girmesin — dosya yolunda
 * boşluk veya `&` olsa bile bir şey yorumlanmaz.
 */
const CAPTURE_COMMAND: Record<string, (file: string) => { cmd: string; args: string[] }> = {
    python: (f) => ({ cmd: process.platform === 'win32' ? 'python' : 'python3', args: [f] }),
    javascript: (f) => ({ cmd: 'node', args: [f] }),
    typescript: (f) => ({ cmd: 'npx', args: ['tsx', f] }),
};

const EXTENSION: Record<string, string> = {
    python: 'py',
    javascript: 'js',
    typescript: 'ts',
};

/**
 * Görev dosyasının kime ait olduğu.
 *
 * İkisi AYRI dosya olmak zorunda: öğretmen bir görevi doğrularken öğrencinin
 * aynı klasördeki çözümünün üzerine yazamaz — aynı kişi hem ders hazırlayıp
 * hem o dersi deneyebilir.
 */
export type TaskSlot = 'student' | 'solution';

const taskFile = (slot: TaskSlot, ext: string) =>
    slot === 'solution' ? `_cozum.${ext}` : `gorev.${ext}`;

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
        if (req.method !== 'POST' || req.url !== '/run') {
            res.writeHead(404).end();
            return;
        }
        if (!this.authorized(req)) {
            res.writeHead(401).end('token gecersiz');
            return;
        }

        const body = await readBody(req);
        let payload: RunPayload;
        try {
            payload = JSON.parse(body);
        } catch {
            res.writeHead(400).end('gecersiz istek');
            return;
        }
        if (typeof payload.code !== 'string' || !payload.code.trim()) {
            res.writeHead(400).end('kod bos');
            return;
        }

        await this.run(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
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
        const { file } = await this.materialize(payload);
        const doc = await vscode.workspace.openTextDocument(file);
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
    }

    /** Kodu çalışma klasörüne yazar ve dosya/dil bilgisini döner. */
    private async materialize(payload: RunPayload): Promise<{ file: vscode.Uri; dir: vscode.Uri; language: string }> {
        const language = payload.language && RUN_COMMAND[payload.language]
            ? payload.language
            : 'python';
        const ext = EXTENSION[language] ?? 'txt';

        const dir = this.workingDir
            ?? vscode.Uri.file(path.join(os.homedir(), 'GoMufi', 'Calisma'));
        await vscode.workspace.fs.createDirectory(dir);
        const file = vscode.Uri.joinPath(dir, `slayt.${ext}`);
        await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(payload.code));
        return { file, dir, language };
    }

    /**
     * UYGULA görevinin dosyasını hazırlar ve editörde açar.
     *
     * `slayt.<ext>` DEĞİL ayrı bir `gorev.<ext>`: slayt dosyası her "editörde aç"
     * ile üzerine yazılıyor, görev dosyası ise öğrencinin çözümü — kaybolmamalı.
     * Bu yüzden yalnızca YOKSA oluşturuluyor; ikinci kez açıldığında öğrencinin
     * yazdıkları yerinde kalır.
     */
    async prepareTask(starter: string, language = 'python', slot: TaskSlot = 'student'): Promise<string> {
        const lang = RUN_COMMAND[language] ? language : 'python';
        const ext = EXTENSION[lang] ?? 'py';
        const dir = this.dir();
        await vscode.workspace.fs.createDirectory(dir);

        const file = vscode.Uri.joinPath(dir, taskFile(slot, ext));
        if (slot === 'solution') {
            // Öğretmen doğrulaması: içerik HER ZAMAN tazelenir. "Varsa dokunma"
            // kuralı burada geçerli olsaydı, ikinci bir görevi doğrulayan
            // öğretmen bir önceki çözümü çalıştırıp yanlış çıktıyı
            // "doğrulanmış" sanırdı.
            await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(starter));
        } else {
            // Öğrenci dosyası: yalnızca yoksa yazılır, çözümü kaybolmasın.
            try {
                await vscode.workspace.fs.stat(file);
            } catch {
                await vscode.workspace.fs.writeFile(file, new TextEncoder().encode(starter));
            }
        }

        const doc = await vscode.workspace.openTextDocument(file);
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });
        return file.fsPath;
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
    async checkTask(language = 'python', slot: TaskSlot = 'student', timeoutMs = 10_000): Promise<{
        code: string; stdout: string; stderr: string; timedOut: boolean;
    }> {
        const lang = RUN_COMMAND[language] ? language : 'python';
        const ext = EXTENSION[lang] ?? 'py';
        const dir = this.dir();
        const file = vscode.Uri.joinPath(dir, taskFile(slot, ext));

        // Öğrencinin kaydetmemiş olma ihtimali yüksek; diskten okumadan önce
        // açık belgeyi kaydediyoruz, yoksa bir önceki sürümü çalıştırırdık.
        const open = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === file.fsPath);
        if (open?.isDirty) await open.save();

        const raw = await vscode.workspace.fs.readFile(file);
        const code = new TextDecoder().decode(raw);

        const spec = CAPTURE_COMMAND[lang](file.fsPath);
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
                    resolve({
                        code,
                        stdout: stdout ?? '',
                        // Yorumlayıcı bulunamadıysa stderr boş kalır; öğrenci
                        // "hiçbir şey olmadı" görmesin diye hatayı biz yazıyoruz.
                        stderr: (stderr || (err && !killed ? String(err.message) : '')) ?? '',
                        timedOut: killed,
                    });
                },
            );
            child.stdin?.end();
        });
    }

    /** Görev dosyasının tam yolu — ipuçlarının hangi dosyaya iliştiğini bilmek için. */
    taskPath(language = 'python', slot: TaskSlot = 'student'): string {
        const lang = RUN_COMMAND[language] ? language : 'python';
        return vscode.Uri.joinPath(this.dir(), taskFile(slot, EXTENSION[lang] ?? 'py')).fsPath;
    }

    private dir(): vscode.Uri {
        return this.workingDir ?? vscode.Uri.file(path.join(os.homedir(), 'GoMufi', 'Calisma'));
    }

    async run(payload: RunPayload): Promise<void> {
        const { file, dir, language } = await this.materialize(payload);

        const doc = await vscode.workspace.openTextDocument(file);
        await vscode.window.showTextDocument(doc, { preview: false, viewColumn: vscode.ViewColumn.One });

        // Tek bir terminal yeniden kullanılır; her çalıştırmada yenisini açmak
        // birkaç denemeden sonra ekranı terminal sekmeleriyle doldururdu. Ama
        // ders değişip klasör değiştiyse yenisi gerekir: terminalin çalışma
        // dizini sonradan değiştirilemez ve öğrencinin `open('veri.txt')` gibi
        // göreli yolları yanlış klasörde aranırdı.
        if (!this.terminal || this.terminal.exitStatus !== undefined
            || this.terminalDir !== dir.fsPath) {
            this.terminal?.dispose();
            this.terminal = vscode.window.createTerminal({ name: 'GoMufi', cwd: dir });
            this.terminalDir = dir.fsPath;
        }
        this.terminal.show(true);
        this.terminal.sendText(RUN_COMMAND[language](file.fsPath));
    }
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
