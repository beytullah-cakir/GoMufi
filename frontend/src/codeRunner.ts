import { callLocalRunner } from './localRunnerClient';
import {
    checkTaskInVSCode, isEmbeddedInVSCode, prepareTaskInVSCode, runInVSCode, runTestsInVSCode,
    type TaskCheckResult, type TaskFile,
} from './vscodeBridge';

/**
 * Sitedeki BÜTÜN kod çalıştırma buradan geçer ve HER ZAMAN öğrencinin kendi
 * VS Code'unda çalışır.
 *
 * NEDEN PYODIDE YOK: tarayıcı içi Python sayfanın ana iş parçacığında
 * koşuyordu. Slayttaki bir Python kodu (öğretmenin, YZ'nin ya da bir PDF'e
 * gizlenmiş talimatla üretilmiş) `import js` ile sayfaya, öğrencinin
 * oturumuna ve oradan VS Code'daki yerel çalıştırıcıya erişebiliyordu. Artık
 * kod, öğrencinin gördüğü ve izin verdiği yerde — kendi VS Code'unda.
 *
 * İki taşıyıcı, tek arayüz: VS Code ders panelinin içindeyken postMessage,
 * tarayıcıdayken eklentinin 127.0.0.1'deki yerel sunucusu. `null` / `false`
 * dönüşünün TEK anlamı: VS Code bağlı değil (çağıran "VS Code'u aç" göstersin).
 */

export const VSCODE_REQUIRED = 'Kodu çalıştırmak için GoMufi VS Code eklentisi açık olmalı.';

export interface TestCase { id: string; call: string; expected: string }
export interface TestResult { id: string; passed: boolean; actual: string; error: string | null }

/** Slayttaki kod parçasını VS Code'da açar ve terminalde çalıştırır. */
export async function runSnippet(code: string, language: string, title?: string): Promise<boolean> {
    if (isEmbeddedInVSCode()) return runInVSCode(code, language, title);
    const res = await callLocalRunner<{ ok: boolean }>('/run', { code, language, title });
    return !!res?.ok;
}

/**
 * Fonksiyon testleri. `slot: 'student'`: öğrencinin diskteki gerçek dosyaları.
 * `slot: 'solution'` + `files`: öğretmenin çözümü önce yazılır, sonra test edilir.
 */
export async function runTests(
    tests: TestCase[], entry: string, stdin: string,
    slot: 'student' | 'solution' = 'student', files?: TaskFile[], language = 'python',
): Promise<{ results: TestResult[]; fatal: string | null } | null> {
    const body = { language, slot, entry, tests, stdin, ...(files ? { files } : {}) };
    const res = isEmbeddedInVSCode()
        ? await runTestsInVSCode(body)
        : await callLocalRunner<{ ok: boolean; results?: TestResult[]; fatal?: string | null; error?: string }>(
            '/tests', body, 60_000);
    if (!res) return null;
    if (!res.ok) return { results: [], fatal: res.error || 'Testler çalıştırılamadı.' };
    return { results: res.results || [], fatal: res.fatal ?? null };
}

/**
 * Öğretmenin çözümünü gizli bir süreçte çalıştırıp çıktısını ölçer
 * (beklenen çıktıyı doğrulamak için). Öğrencinin dosyalarına dokunmaz.
 */
export async function runSolution(
    files: TaskFile[], entry: string, stdin: string, language = 'python',
): Promise<{ stdout: string; error: string | null } | null> {
    let res: TaskCheckResult | null;
    if (isEmbeddedInVSCode()) {
        const prepared = await prepareTaskInVSCode(files, language, 'solution');
        if (!prepared?.ok) return prepared ? { stdout: '', error: prepared.error || 'Dosyalar hazırlanamadı.' } : null;
        res = await checkTaskInVSCode(language, 'solution', stdin, false, entry);
    } else {
        const prepared = await callLocalRunner<{ ok: boolean }>('/task', { files, language, slot: 'solution', entry });
        if (!prepared?.ok) return null;
        res = await callLocalRunner<TaskCheckResult>('/check', { language, slot: 'solution', stdin, entry, visible: false });
    }
    if (!res) return null;
    if (!res.ok) return { stdout: '', error: res.error || 'Çalıştırılamadı.' };
    return { stdout: res.stdout || '', error: res.stderr ? res.stderr : null };
}
