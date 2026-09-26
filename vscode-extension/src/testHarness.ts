/**
 * Fonksiyon testleri için Python koşum betiği — `vscode`a dokunmaz (birim
 * testlerde doğrudan çalıştırılır).
 *
 * Eskiden bu betik tarayıcıda Pyodide içinde çalışıyordu. Pyodide sayfanın
 * ana iş parçacığında koştuğu için slayttaki Python kodu `import js` ile
 * sayfaya ve öğrencinin oturumuna erişebiliyordu. Artık bütün kod öğrencinin
 * kendi VS Code'unda, kendi Python'uyla çalışıyor; testler de.
 *
 * Kullanım: python harness.py <görev klasörü> <giriş dosyası> <testler.json> <işaret>
 * Öğrencinin programı bir kez çalışır (çıktısı yutulur), sonra her test ifadesi
 * aynı ad alanında değerlendirilir. Sonuç, öğrencinin kendi print'lerine
 * karışmasın diye rastgele bir işaretle başlayan TEK satırda yazılır.
 */
export const TEST_HARNESS = String.raw`
import contextlib, io, json, os, sys, traceback

task_dir, entry_name, tests_path, marker = sys.argv[1:5]
sys.dont_write_bytecode = True
os.chdir(task_dir)
if task_dir not in sys.path:
    sys.path.insert(0, task_dir)
with open(tests_path, encoding="utf-8") as _h:
    tests = json.load(_h)
entry_path = os.path.join(task_dir, entry_name)


def user_traceback(exc):
    frames = [f for f in traceback.extract_tb(exc.__traceback__)
              if os.path.abspath(f.filename).startswith(os.path.abspath(task_dir))]
    lines = []
    if frames:
        lines.append("Traceback (most recent call last):")
        for f in frames:
            lines.append('  File "%s", line %s' % (os.path.basename(f.filename), f.lineno))
            if f.line:
                lines.append("    " + f.line)
    lines.extend(l.rstrip("\n") for l in traceback.format_exception_only(type(exc), exc))
    return "\n".join(lines)


ns = {"__name__": "__main__", "__file__": entry_path}
out = []
try:
    with contextlib.redirect_stdout(io.StringIO()):
        with open(entry_path, encoding="utf-8") as _h:
            exec(compile(_h.read(), entry_path, "exec"), ns)
except SystemExit:
    pass
except BaseException as exc:
    out = [{"fatal": user_traceback(exc)}]

if not out:
    for t in tests:
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                value = eval(t["call"], ns)
            out.append({"id": t["id"], "actual": "None" if value is None else str(value), "error": None})
        except Exception as exc:
            out.append({"id": t["id"], "actual": "", "error": type(exc).__name__ + ": " + str(exc)})

sys.__stdout__.write(marker + json.dumps(out, ensure_ascii=False) + "\n")
sys.__stdout__.flush()
`;

export interface TestCase { id: string; call: string; expected: string }
export interface TestResult { id: string; passed: boolean; actual: string; error: string | null }

/** Koşum çıktısından sonucu çıkarır; öğrencinin yazdıkları yok sayılır. */
export function parseHarnessOutput(
    stdout: string, marker: string, tests: TestCase[],
): { results: TestResult[]; fatal: string | null } | null {
    const line = stdout.split(/\r?\n/).reverse().find((l) => l.startsWith(marker));
    if (!line) return null;
    let raw: any;
    try {
        raw = JSON.parse(line.slice(marker.length));
    } catch {
        return null;
    }
    if (!Array.isArray(raw)) return null;
    if (raw.length === 1 && raw[0]?.fatal) return { results: [], fatal: String(raw[0].fatal) };
    const expected = new Map(tests.map((t) => [t.id, t.expected]));
    return {
        fatal: null,
        results: raw.map((r: any) => ({
            id: String(r.id),
            actual: r.error ? '' : String(r.actual ?? ''),
            error: r.error ? String(r.error) : null,
            passed: !r.error && String(r.actual ?? '').trim() === (expected.get(String(r.id)) || '').trim(),
        })),
    };
}

/** Testleri temizler: kimlik ve ifade metin olmalı, sayı sınırlı. */
export function cleanTests(raw: unknown): TestCase[] {
    if (!Array.isArray(raw)) return [];
    return raw.slice(0, 50).flatMap((t: any) => (
        t && typeof t.call === 'string' && t.call.trim()
            ? [{ id: String(t.id ?? '').slice(0, 60) || 't', call: t.call.slice(0, 500), expected: String(t.expected ?? '') }]
            : []
    ));
}
