import {
    checkTaskInVSCode, prepareTaskInVSCode, revealLineInVSCode,
    showHintInVSCode, showSuccessInVSCode, type TaskCheckResult, type TaskFile,
} from '../../vscodeBridge';
import { callLocalRunner } from '../../localRunnerClient';
import { runPythonProgram } from '../../hooks/usePyodide';

/**
 * UYGULA görevinin VS Code ile konuşma biçimi — iki taşıyıcı, tek arayüz.
 *
 * Aynı görev iki yerden çözülebiliyor:
 *   - VS Code'un ders panelinde (webview): eklenti bir postMessage uzağımızda.
 *   - Tarayıcıda: postMessage yok; öğrencinin makinesindeki yerel HTTP sunucusu var.
 *
 * Akış (hazırla → çalıştır → kontrol et → ipucu göster) İKİSİNDE DE AYNI.
 * Ayrımı burada, tek bir arayüzün arkasında kapatıyoruz; `useChallengeCheck`
 * hangi yüzeyde olduğunu hiç bilmiyor. Aksi halde aynı mantığın iki kopyası
 * olurdu ve biri düzeltilirken diğeri geride kalırdı.
 *
 * `entry`/`file` her çağrıda taşınıyor: çok dosyalı görevde hangi dosyanın
 * çalıştırılacağı ve ipucunun hangi dosyaya iliştiği dilden türetilemez.
 */

/**
 * Görevin VS Code'daki kimliği.
 *
 * `folder` görevin kendi klasörü; `courseId` + `taskKey` eklentinin yazım
 * kaydını (yazma / yapıştırma / silme) doğru öğrencinin doğru görevine
 * gönderebilmesi için. Eski eklenti bu alanları yok sayar.
 */
export interface TaskTarget {
    folder?: string;
    courseId?: number | string;
    taskKey?: string;
}

export interface ChallengeRuntime {
    /**
     * Görev dosyalarını hazırlar ve editörde açar.
     *
     * `folder` görevin kendi klasörü. Olmadan bütün görevler aynı klasöre aynı
     * adla (`gorev.py`) yazılıyordu ve eklenti var olan dosyaya dokunmadığı
     * için ikinci görev öğrencinin önüne BİRİNCİ görevin kodunu açıyordu.
     */
    prepare(files: TaskFile[], language: string, target?: TaskTarget): Promise<boolean>;
    /**
     * Görevi çalıştırır ve kod + çıktısıyla döner.
     * `null` = kanal yok (eklenti kapalı / yanıt vermiyor).
     *
     * `files` sitedeki güncel görev dosyaları. VS Code yolları bunu yok sayar —
     * orada gerçek dosyalar öğrencinin diskinde; yalnızca tarayıcı editörü,
     * kodun kendisi sitede durduğu için bunları çalıştırır.
     */
    check(language: string, stdin: string, entry: string, files: TaskFile[]): Promise<TaskCheckResult | null>;
    /** Koçun ipucunu editörde ilgili satırın yanına iliştirir. */
    hint(message: string, line: number, language: string, file: string): void;
    /** Doğru çözümde editörde kutlama vurgusu. */
    success(message: string, xp: number, language: string, file: string): void;
    /** Editörde belirtilen satıra git. */
    reveal(line: number, language: string, file: string): void;
}

/** VS Code ders paneli (webview): eklenti postMessage ile erişilebilir. */
export const panelRuntime: ChallengeRuntime = {
    prepare: async (files, language, target) => {
        const r = await prepareTaskInVSCode(files, language, 'student', target);
        return !!r?.ok;
    },
    check: (language, stdin, entry) => checkTaskInVSCode(language, 'student', stdin, true, entry),
    hint: (message, line, language, file) => showHintInVSCode(message, line, language, file),
    success: (message, xp, language, file) => showSuccessInVSCode(message, xp, language, file),
    reveal: (line, language, file) => revealLineInVSCode(line, language, file),
};

/**
 * Tarayıcı: eklentinin 127.0.0.1'deki yerel sunucusu.
 *
 * `/check` çağrısının süresi cömert: program öğrencinin GÖRDÜĞÜ terminalde
 * çalışıyor ve `input()` sorularına oradan cevap veriyor olabilir. 30 saniyelik
 * varsayılan, klavyeden veri bekleyen her görevi "VS Code yanıt vermedi"ye
 * çevirirdi.
 */
export const localRuntime: ChallengeRuntime = {
    prepare: async (files, language, target) => {
        // `starter` eski eklenti sürümleri için: `files`i tanımayan bir eklenti
        // en azından giriş dosyasını açabilsin.
        const entry = files.find((f) => f.entry) ?? files[0];
        const r = await callLocalRunner<{ ok: boolean }>('/task', {
            files, language, ...target, starter: entry?.content ?? '', entry: entry?.name,
        });
        return !!r?.ok;
    },
    check: (language, stdin, entry) =>
        callLocalRunner<TaskCheckResult>(
            '/check', { language, slot: 'student', stdin, entry }, 300_000,
        ),
    hint: (message, line, language, file) => {
        void callLocalRunner('/hint', { message, line, language, file });
    },
    success: (message, xp, language, file) => {
        void callLocalRunner('/success', { message, xp, language, file });
    },
    reveal: (line, language, file) => {
        void callLocalRunner('/reveal', { line, language, file });
    },
};

/**
 * Tarayıcı: VS Code yok, kod Pyodide'de çalışıyor.
 *
 * Eklentisi olmayan öğrencinin yolu ("Tarayıcıda yaz"). Eskiden bu yol kendi
 * ayrı mantığını taşıyordu — ölçütlere değil yalnızca `expectedOutput`a
 * bakıyor, YZ koçu hiç devreye girmiyordu; aynı görev VS Code'da geçip
 * tarayıcıda kalabiliyordu. Artık o da aynı `useChallengeCheck` döngüsünden
 * geçiyor, yalnızca çalıştıran farklı.
 *
 * Çalıştırılan dosyalar `check`e gelen `files`: öğrencinin editördeki güncel hâli.
 */
export const browserRuntime: ChallengeRuntime = {
    prepare: async () => true,
    check: async (language, stdin, entry, files) => {
        const entryFile = files.find((f) => f.name === entry) ?? files.find((f) => f.entry) ?? files[0];
        const base = { code: entryFile?.content ?? '', files, timedOut: false };
        if (language !== 'python') {
            return {
                ...base, ok: false, stdout: '', stderr: '',
                error: 'Tarayıcıda yalnızca Python çalıştırılabilir. Bu görev için VS Code gerekli.',
            };
        }
        const { stdout, error } = await runPythonProgram(files, entryFile?.name ?? 'main.py', stdin);
        return { ...base, ok: true, stdout, stderr: error ?? '' };
    },
    hint: () => undefined,
    success: () => undefined,
    reveal: () => undefined,
};
