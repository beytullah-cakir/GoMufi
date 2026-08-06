import { useCallback, useRef } from 'react';
import api from '../api';
import { runInVSCode } from '../vscodeBridge';

/**
 * Sitedeki "Çalıştır" butonunu, öğrencinin makinesindeki VS Code eklentisine
 * yönlendirir.
 *
 * AKIŞ: GoMufi sunucusundan eşleşme bilgisi (port + token) alınır, sonra
 * doğrudan `http://127.0.0.1:<port>/run` çağrılır. Token'ı sunucudan almak
 * ŞART: eklenti ile site arasında başka güvenli bir kanal yok ve ikisi de aynı
 * kullanıcı olarak kimlik doğruluyor.
 *
 * HTTPS sayfadan `http://127.0.0.1` çağrılabilir — tarayıcılar localhost'u
 * "güvenilir köken" sayar, karışık içerik engeline takılmaz.
 *
 * Eklenti yoksa `run` false döner ve çağıran tarayıcı içi Pyodide'ye düşer;
 * böylece eklentisi olmayan öğrenci için hiçbir şey değişmez.
 */

interface Pairing {
    port: number;
    token: string;
}

/** Eşleşme sorgusunu her tıklamada yapmamak için kısa ömürlü önbellek. */
const CACHE_MS = 30_000;

export const useLocalRunner = () => {
    const cache = useRef<{ at: number; value: Pairing | null }>({ at: 0, value: null });

    const pairing = useCallback(async (): Promise<Pairing | null> => {
        const now = Date.now();
        if (now - cache.current.at < CACHE_MS) return cache.current.value;

        let value: Pairing | null = null;
        try {
            const res = await api.get('/devices/local-runner');
            if (res.data?.port && res.data?.token) value = res.data;
        } catch {
            // 404 = bu hesap için açık VS Code yok. Beklenen durum, sessiz geç.
        }
        cache.current = { at: now, value };
        return value;
    }, []);

    /** VS Code'a gönderir. Başarılıysa true; false ise çağıran Pyodide'ye düşmeli. */
    const run = useCallback(
        async (code: string, language = 'python', title?: string): Promise<boolean> => {
            // VS Code panelinde zaten eklentinin içindeyiz: eşleşme sorgusu, port
            // ve yerel HTTP turu gereksiz. Doğrudan mesajla gönder.
            if (runInVSCode(code, language, title)) return true;

            const p = await pairing();
            if (!p) return false;

            try {
                const res = await fetch(`http://127.0.0.1:${p.port}/run`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${p.token}`,
                    },
                    body: JSON.stringify({ code, language, title }),
                });
                if (!res.ok) throw new Error(String(res.status));
                return true;
            } catch {
                // VS Code kapanmış olabilir; önbelleği düşür ki bir sonraki
                // tıklama eşleşmeyi yeniden sorsun, sonra Pyodide'ye düş.
                cache.current = { at: 0, value: null };
                return false;
            }
        },
        [pairing],
    );

    /** Arayüzde "VS Code'da çalışacak" göstergesi için. */
    const isConnected = useCallback(async () => (await pairing()) !== null, [pairing]);

    return { run, isConnected };
};
