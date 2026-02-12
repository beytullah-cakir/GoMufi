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
}

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

    return {
        runCode,
        output,
        isLoading,
        error,
        isReady: !!pyodide
    };
};
