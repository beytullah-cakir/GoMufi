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

/**
 * Görevin TÜM dosyalarını sanal diske yazar ve oraya geçer.
 *
 * NEDEN: tek bir kod metnini `exec` etmek çok dosyalı görevlerde işe yaramıyor —
 * `main.py` içindeki `import odev` bulunamıyordu. Dosyalar VS Code'daki gibi
 * aynı klasöre yazılıyor ve program o klasörde çalışıyor.
 *
 * Önceki görevin dosyaları ve içe aktarılmış modülleri siliniyor: aynı adla
 * (`odev.py`) ikinci bir görev açıldığında Python eski modülü önbellekten
 * verirdi ve öğrenci düzelttiği kodun hiç çalışmadığını görürdü.
 */
const TASK_SETUP = `
import json, io, os, sys, shutil, importlib, contextlib, traceback

# Derlenmiş .pyc önbelleği yazılmaz: aynı saniyede aynı boyda değişen bir
# dosyada Python eski bayt kodu kullanabilir ve öğrencinin düzeltmesi görünmez.
sys.dont_write_bytecode = True
_dir = '/gomufi_task'
os.makedirs(_dir, exist_ok=True)
for _name in os.listdir(_dir):
    _p = os.path.join(_dir, _name)
    if os.path.isdir(_p):
        shutil.rmtree(_p, ignore_errors=True)
    else:
        os.remove(_p)
for _f in json.loads(files_json):
    with open(os.path.join(_dir, _f['name']), 'w', encoding='utf-8') as _h:
        _h.write(_f['content'])
os.chdir(_dir)
if _dir not in sys.path:
    sys.path.insert(0, _dir)
_root = os.path.abspath(_dir)
for _m in [m for m, mod in list(sys.modules.items())
           if os.path.abspath(str(getattr(mod, '__file__', '') or '/')).startswith(_root)]:
    del sys.modules[_m]
importlib.invalidate_caches()

def _user_traceback(_e):
    # Koşum betiğinin kendi satırları öğrenciyi yanıltır; yalnızca görev
    # dosyalarındaki satırlar gösterilir.
    _frames = [f for f in traceback.extract_tb(_e.__traceback__)
               if f.filename == entry_name or f.filename.startswith(_dir)]
    _lines = []
    if _frames:
        _lines.append('Traceback (most recent call last):')
        for f in _frames:
            _lines.append(f'  File "{os.path.basename(f.filename)}", line {f.lineno}')
            if f.line:
                _lines.append(f'    {f.line}')
    _lines.extend(l.rstrip('\\n') for l in traceback.format_exception_only(type(_e), _e))
    return '\\n'.join(_lines)

def _run_entry(_ns):
    # input() öğrencinin terminalinde değil burada soruluyor: cevapları görev
    # örneklerinden veriyoruz. Verilmezse tarayıcı prompt() penceresi açardı.
    _old_stdin = sys.stdin
    sys.stdin = io.StringIO(stdin_text)
    try:
        with open(entry_name, encoding='utf-8') as _h:
            _src = _h.read()
        exec(compile(_src, entry_name, 'exec'), _ns)
    finally:
        sys.stdin = _old_stdin
`;

const PROGRAM_HARNESS = `${TASK_SETUP}
_buf = io.StringIO()
_err = None
try:
    with contextlib.redirect_stdout(_buf):
        _run_entry({'__name__': '__main__'})
except SystemExit:
    pass
except BaseException as _e:
    _err = _user_traceback(_e)

json.dumps({"stdout": _buf.getvalue(), "error": _err})
`;

const FILE_TESTS_HARNESS = `${TASK_SETUP}
_ns = {'__name__': '__main__'}
_out = []
try:
    with contextlib.redirect_stdout(io.StringIO()):
        _run_entry(_ns)
except SystemExit:
    pass
except BaseException as _e:
    _out = [{"fatal": _user_traceback(_e)}]
if not _out:
    for _t in json.loads(tests_json):
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                _val = eval(_t["call"], _ns)
            _out.append({"id": _t["id"], "actual": "None" if _val is None else str(_val), "error": None})
        except Exception as _e:
            _out.append({"id": _t["id"], "actual": "", "error": type(_e).__name__ + ": " + str(_e)})

json.dumps(_out)
`;

export interface PythonFile {
    name: string;
    content: string;
}

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.25.0/full/';

/**
 * Görev çalıştırmaları için TEK, paylaşılan Python motoru.
 *
 * NEDEN HOOK DEĞİL: görev ekranında aynı anda birkaç bileşen Python'a
 * ihtiyaç duyuyor (tarayıcı editörü, fonksiyon testleri, öğretmenin test
 * doğrulaması). Hook her bileşene ayrı bir motor yüklüyordu — her biri
 * saniyeler süren ve onlarca MB tutan bir indirme. Motorun React durumuyla
 * da işi yok: çıktıyı koşum betiği kendisi topluyor.
 */
let sharedInstance: Promise<PyodideInterface | null> | null = null;

const loadSharedPyodide = (): Promise<PyodideInterface | null> => {
    if (!sharedInstance) {
        sharedInstance = (async () => {
            try {
                if (!window.loadPyodide) {
                    const script = document.createElement('script');
                    script.src = `${PYODIDE_URL}pyodide.js`;
                    script.async = true;
                    document.body.appendChild(script);
                    await new Promise((resolve, reject) => {
                        script.onload = resolve;
                        script.onerror = reject;
                    });
                }
                return await window.loadPyodide({ indexURL: PYODIDE_URL });
            } catch (err) {
                console.error('Failed to load Pyodide:', err);
                // Kalıcı başarısızlık sayılmasın: bir sonraki denemede yeniden yüklensin.
                sharedInstance = null;
                return null;
            }
        })();
    }
    return sharedInstance;
};

export const PYODIDE_UNAVAILABLE = 'Python motoru yüklenemedi.';

const loadTask = async (files: PythonFile[], entry: string, stdin: string) => {
    const instance = await loadSharedPyodide();
    if (!instance) return null;
    instance.globals.set('files_json', JSON.stringify(files.map(({ name, content }) => ({ name, content }))));
    instance.globals.set('entry_name', entry);
    instance.globals.set('stdin_text', stdin);
    return instance;
};

/**
 * Görevi dosyalarıyla birlikte çalıştırır: giriş dosyası çalışır, diğerleri
 * aynı klasörde durur (`import` edilebilir), `input()` `stdin`den beslenir.
 */
export const runPythonProgram = async (
    files: PythonFile[], entry: string, stdin = '',
): Promise<{ stdout: string; error: string | null }> => {
    try {
        const instance = await loadTask(files, entry, stdin);
        if (!instance) return { stdout: '', error: PYODIDE_UNAVAILABLE };
        const parsed = JSON.parse(String(await instance.runPythonAsync(PROGRAM_HARNESS)));
        return { stdout: String(parsed.stdout ?? ''), error: parsed.error || null };
    } catch (err: any) {
        return { stdout: '', error: err?.message || String(err) };
    }
};

/** Giriş dosyasını çalıştırır, sonra her test ifadesini değerlendirir (çok dosyalı). */
export const runPythonTests = async (
    files: PythonFile[], entry: string, tests: PythonTestCase[], stdin = '',
): Promise<{ results: PythonTestResult[]; fatal: string | null }> => {
    try {
        const instance = await loadTask(files, entry, stdin);
        if (!instance) return { results: [], fatal: PYODIDE_UNAVAILABLE };
        instance.globals.set('tests_json', JSON.stringify(tests));
        const parsed = JSON.parse(String(await instance.runPythonAsync(FILE_TESTS_HARNESS)));
        if (parsed.length === 1 && parsed[0].fatal) {
            return { results: [], fatal: String(parsed[0].fatal) };
        }
        const expectedById = new Map(tests.map((t) => [t.id, t.expected]));
        return {
            fatal: null,
            results: parsed.map((r: any) => ({
                id: r.id,
                actual: r.error ? '' : String(r.actual ?? ''),
                error: r.error || null,
                passed: !r.error && String(r.actual ?? '').trim() === (expectedById.get(r.id) || '').trim(),
            })),
        };
    } catch (err: any) {
        return { results: [], fatal: err?.message || String(err) };
    }
};

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
