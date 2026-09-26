import { useCallback } from 'react';
import { callLocalRunner, getPairing } from '../localRunnerClient';
import { runInVSCode } from '../vscodeBridge';

/**
 * Sitedeki "Çalıştır" butonunu, öğrencinin makinesindeki VS Code eklentisine
 * yönlendirir.
 *
 * Kanalın kendisi `localRunnerClient`te; burada yalnızca "önce panel köprüsü,
 * sonra yerel sunucu" sıralaması var. Eklenti yoksa `run` false döner ve
 * çağıran "VS Code'u aç" gösterir — tarayıcıda kod çalıştırılmaz.
 */
export const useLocalRunner = () => {
    /** VS Code'a gönderir. Başarılıysa true; false ise VS Code bağlı değil. */
    const run = useCallback(
        async (code: string, language = 'python', title?: string): Promise<boolean> => {
            // VS Code panelinde zaten eklentinin içindeyiz: eşleşme sorgusu, port
            // ve yerel HTTP turu gereksiz. Doğrudan mesajla gönder.
            if (runInVSCode(code, language, title)) return true;

            const res = await callLocalRunner<{ ok: boolean }>('/run', { code, language, title });
            return !!res?.ok;
        },
        [],
    );

    /** Arayüzde "VS Code'da çalışacak" göstergesi için. */
    const isConnected = useCallback(async () => (await getPairing()) !== null, []);

    return { run, isConnected };
};
