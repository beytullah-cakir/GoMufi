import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { shellLine } from './shell';

/**
 * Öğrencinin makinesindeki Python'u bulur.
 *
 * NEDEN TAHMİN ETMİYORUZ: eskiden terminal `python`, çıktı yakalayan
 * çalıştırma macOS/Linux'ta `python3` çağırıyordu — aynı kod iki yolda farklı
 * yorumlayıcıyla çalışabiliyordu. macOS'ta çoğu zaman `python` yok; Windows'ta
 * `python` Microsoft Store'u açan sahte bir kısayol olabiliyor (hiçbir şey
 * çalıştırmadan 9009 ile çıkar). Öğrenci "kodum çalışmıyor" sanıyordu.
 *
 * Sıra: Python eklentisinde seçili yorumlayıcı (öğrenci/öğretmen bilerek
 * seçmiştir) → `py -3` (Windows başlatıcısı) → `python3` → `python`. Her aday
 * `--version` ile gerçekten Python 3 olduğu doğrulanarak seçilir.
 */

export interface Interpreter {
    cmd: string;
    args: string[];
    version: string;
}

let cached: Interpreter | null | undefined;

/** Ayar ya da Python eklentisinin seçimi değişince yeniden aransın. */
export function resetPythonCache(): void {
    cached = undefined;
}

function probe(cmd: string, args: string[]): Promise<string | null> {
    return new Promise((resolve) => {
        childProcess.execFile(cmd, [...args, '--version'], { timeout: 5000, windowsHide: true }, (err, stdout, stderr) => {
            if (err) return resolve(null);
            const text = `${stdout || ''}${stderr || ''}`.trim();
            resolve(/^Python 3\./.test(text) ? text.replace(/^Python\s+/, '') : null);
        });
    });
}

async function fromPythonExtension(): Promise<string | null> {
    const ext = vscode.extensions.getExtension('ms-python.python');
    if (!ext) return null;
    try {
        const api: any = ext.isActive ? ext.exports : await ext.activate();
        const env = api?.environments?.getActiveEnvironmentPath?.();
        const p = typeof env?.path === 'string' ? env.path : null;
        return p && fs.existsSync(p) ? p : null;
    } catch {
        return null;
    }
}

export async function resolvePython(): Promise<Interpreter | null> {
    if (cached !== undefined) return cached;

    const candidates: Array<[string, string[]]> = [];
    const fromExt = await fromPythonExtension();
    if (fromExt) candidates.push([fromExt, []]);
    if (process.platform === 'win32') candidates.push(['py', ['-3']], ['python', []], ['python3', []]);
    else candidates.push(['python3', []], ['python', []]);

    for (const [cmd, args] of candidates) {
        const version = await probe(cmd, args);
        if (version) {
            cached = { cmd, args, version };
            return cached;
        }
    }
    // Bulunamadıysa önbelleğe ALMIYORUZ: öğrenci Python'u kurup tekrar
    // denediğinde VS Code'u yeniden başlatmak zorunda kalmasın.
    return null;
}

/** Terminale yazılacak "şu dosyayı Python'la çalıştır" satırı. */
export async function pythonTerminalLine(file: string): Promise<string | null> {
    const py = await resolvePython();
    return py ? shellLine(py.cmd, [...py.args, file], vscode.env.shell) : null;
}

const PYTHON_DOWNLOAD = 'https://www.python.org/downloads/';

/** Python yoksa öğrenciye ne yapacağını söyler (en fazla birkaç dakikada bir). */
let lastWarned = 0;
export async function warnPythonMissing(): Promise<void> {
    if (Date.now() - lastWarned < 60_000) return;
    lastWarned = Date.now();
    const KUR = 'Python\'u İndir';
    const TEKRAR = 'Tekrar Kontrol Et';
    const detail = process.platform === 'win32'
        ? 'Kurarken ilk ekrandaki "Add python.exe to PATH" kutusunu işaretle, sonra VS Code\'u kapatıp aç.'
        : 'Kurulumdan sonra VS Code\'u kapatıp aç.';
    const secim = await vscode.window.showWarningMessage(
        'GoMufi: Bu bilgisayarda Python bulunamadı. Derslerdeki kodu çalıştırmak için Python 3 gerekiyor.',
        { detail },
        KUR, TEKRAR,
    );
    if (secim === KUR) await vscode.env.openExternal(vscode.Uri.parse(PYTHON_DOWNLOAD));
    if (secim === TEKRAR) {
        resetPythonCache();
        const py = await resolvePython();
        if (py) void vscode.window.showInformationMessage(`GoMufi: Python ${py.version} bulundu, hazırsın.`);
        else lastWarned = 0;
    }
}

/**
 * Ortam kontrolü (ilk kurulum rehberinin bir adımı): Python var mı, Python
 * eklentisi kurulu mu. Eksik olanı söyler; hiçbir şeyi sormadan kurmaz.
 */
export async function checkEnvironment(): Promise<void> {
    const py = await resolvePython();
    if (!py) {
        await warnPythonMissing();
        return;
    }
    if (!vscode.extensions.getExtension('ms-python.python')) {
        const KUR = 'Python Eklentisini Kur';
        const secim = await vscode.window.showInformationMessage(
            `GoMufi: Python ${py.version} hazır. Kod renklendirme ve hata gösterimi için Microsoft'un Python eklentisini kurmanı öneririz.`,
            KUR, 'Şimdi Değil',
        );
        if (secim === KUR) {
            await vscode.commands.executeCommand('workbench.extensions.installExtension', 'ms-python.python');
        }
    }
}
