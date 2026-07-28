import { useState } from 'react';

declare global {
    interface Window {
        loadPyodide: any;
    }
}

interface PyodideInterface {
    runPython: (code: string) => any;
    runPythonAsync: (code: string) => Promise<any>;
    setStdout: (options: { batched: (msg: string) => void }) => void;
    setStderr: (options: { batched: (msg: string) => void }) => void;
    loadPackage: (packages: string[]) => Promise<void>;
    globals: { set: (key: string, value: any) => void };
}

export interface PythonTestCase {
    id: string;
    /** Öğrencinin kodu çalıştıktan sonra değerlendirilecek ifade, ör. "asal_mi(7)" */
    call: string;
    /** Beklenen değerin metin karşılığı, ör. "True" */
    expected: string;
}

export interface PythonTestResult {
    id: string;
    passed: boolean;
    actual: string;
    error: string | null;
}

// Öğrencinin kodunu bir kez çalıştırıp her test ifadesini ayrı ayrı değerlendiren
// Python koşum betiği. Sonuç JSON olarak döner; böylece tek Pyodide çağrısıyla
// tüm testler gerçek değerlerle karşılaştırılır.
const TEST_HARNESS = `
import json, io, contextlib, traceback

_ns = {}
_out = []
try:
    with contextlib.redirect_stdout(io.StringIO()):
        exec(user_code, _ns)
except Exception:
    _out = [{"fatal": traceback.format_exc(limit=2)}]
else:
    for _t in json.loads(tests_json):
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                _val = eval(_t["call"], _ns)
            _out.append({"id": _t["id"], "actual": "None" if _val is None else str(_val), "error": None})
        except Exception as _e:
            _out.append({"id": _t["id"], "actual": "", "error": type(_e).__name__ + ": " + str(_e)})

json.dumps(_out)
`;

// Kodu çalıştırıp yalnızca stdout'u toplayan betik ("print ile yazdır" tipi görevler).
const CAPTURE_HARNESS = `
import json, io, contextlib, traceback

_buf = io.StringIO()
_err = None
try:
    with contextlib.redirect_stdout(_buf):
        exec(user_code, {})
except Exception as _e:
    _err = type(_e).__name__ + ": " + str(_e)

json.dumps({"stdout": _buf.getvalue(), "error": _err})
`;

export const usePyodide = () => {
    const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [output, setOutput] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    const initPyodide = async () => {
        if (pyodide) return pyodide;

        setIsLoading(true);
        try {
            // Check if script is already loaded
            if (!window.loadPyodide) {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js';
                script.async = true;
                script.defer = true;
                document.body.appendChild(script);

                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }

            const pyodideInstance = await window.loadPyodide({
                indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/'
            });

            // Capture stdout/stderr
            pyodideInstance.setStdout({
                batched: (msg: string) => {
                    setOutput((prev) => [...prev, msg]);
                }
            });

            pyodideInstance.setStderr({
                batched: (msg: string) => {
                    setOutput((prev) => [...prev, `Error: ${msg}`]);
                }
            });

            setPyodide(pyodideInstance);
            setIsLoading(false);
            return pyodideInstance;
        } catch (err) {
            console.error('Failed to load Pyodide:', err);
            setError('Python motoru yüklenemedi.');
            setIsLoading(false);
            return null;
        }
    };

    const runCode = async (code: string) => {
        setOutput([]); // Clear previous output
        setError(null);

        let instance = pyodide;
        if (!instance) {
            instance = await initPyodide();
        }

        if (!instance) return;

        try {
            // Load common packages if imported (basic heuristic)
            if (code.includes('numpy')) await instance.loadPackage(['numpy']);
            if (code.includes('pandas')) await instance.loadPackage(['pandas']);

            // Wrap in async to allow await usage in top level
            await instance.runPythonAsync(code);
        } catch (err: any) {
            setError(err.toString());
            setOutput((prev) => [...prev, `Traceback: ${err.message}`]);
        }
    };

    /**
     * Kodu çalıştırıp EKRANA BASILANI (stdout) döndürür.
     *
     * Her görev bir fonksiyon yazdırmaz — "adını print ile yazdır" gibi görevlerde
     * doğru cevap fonksiyonun dönüş değeri değil, çıktının kendisidir.
     */
    const runAndCapture = async (code: string): Promise<{ stdout: string; error: string | null }> => {
        const instance = pyodide || (await initPyodide());
        if (!instance) return { stdout: '', error: 'Python motoru yüklenemedi.' };

        try {
            instance.globals.set('user_code', code);
            const raw = await instance.runPythonAsync(CAPTURE_HARNESS);
            const parsed = JSON.parse(String(raw));
            return { stdout: String(parsed.stdout ?? ''), error: parsed.error || null };
        } catch (err: any) {
            return { stdout: '', error: err?.message || String(err) };
        }
    };

    /**
     * Öğrencinin kodunu çalıştırıp test ifadelerini GERÇEKTEN değerlendirir.
     *
     * Eskiden test sonucu `kod.includes('return')` gibi bir tahminle üretiliyordu:
     * dönüş değeri yanlış olsa bile tüm testler yeşil görünüyordu. Burada kod
     * gerçekten çalıştırılır ve her ifadenin değeri beklenenle karşılaştırılır.
     */
    const runTests = async (
        code: string,
        tests: PythonTestCase[]
    ): Promise<{ results: PythonTestResult[]; fatal: string | null }> => {
        const instance = pyodide || (await initPyodide());
        if (!instance) {
            return { results: [], fatal: 'Python motoru yüklenemedi.' };
        }

        try {
            instance.globals.set('user_code', code);
            instance.globals.set('tests_json', JSON.stringify(tests));
            const raw = await instance.runPythonAsync(TEST_HARNESS);
            const parsed = JSON.parse(String(raw));

            if (parsed.length === 1 && parsed[0].fatal) {
                return { results: [], fatal: String(parsed[0].fatal) };
            }

            const expectedById = new Map(tests.map((t) => [t.id, t.expected]));
            const results: PythonTestResult[] = parsed.map((r: any) => {
                const expected = (expectedById.get(r.id) || '').trim();
                return {
                    id: r.id,
                    actual: r.error ? '' : String(r.actual ?? ''),
                    error: r.error || null,
                    passed: !r.error && String(r.actual ?? '').trim() === expected,
                };
            });
            return { results, fatal: null };
        } catch (err: any) {
            return { results: [], fatal: err?.message || String(err) };
        }
    };

    return {
        runCode,
        runAndCapture,
        runTests,
        output,
        isLoading,
        error,
        isReady: !!pyodide
    };
};
