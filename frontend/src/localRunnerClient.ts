import api from './api';

/**
 * Tarayıcı ile öğrencinin kendi makinesindeki VS Code eklentisi arasındaki
 * doğrudan kanal.
 *
 * AKIŞ: GoMufi sunucusundan eşleşme bilgisi (port + token) alınır, sonra
 * `http://127.0.0.1:<port>/<komut>` çağrılır. Token'ı sunucudan almak ŞART:
 * eklenti ile site arasında başka güvenli bir kanal yok ve ikisi de AYNI
 * kullanıcı olarak kimlik doğruluyor.
 *
 * HTTPS sayfadan `http://127.0.0.1` çağrılabilir — tarayıcılar localhost'u
 * "güvenilir köken" sayar, karışık içerik engeline takılmaz.
 *
 * NEDEN AYRI MODÜL (hook değil): bu kanalı artık iki farklı yer kullanıyor —
 * slayttaki "Çalıştır" düğmesi (bir hook içinden) ve UYGULA görevinin kod
 * laboratuvarı (bir çalışma zamanı nesnesi içinden). Eşleşme önbelleği ikisi
 * için de ORTAK olmalı, yoksa aynı sayfada iki ayrı `/devices/local-runner`
 * sorgusu dönerdi.
 */

export interface Pairing {
    port: number;
    token: string;
}

/** Eşleşme sorgusunu her tıklamada yapmamak için kısa ömürlü önbellek. */
const CACHE_MS = 30_000;

let cache: { at: number; value: Pairing | null } = { at: 0, value: null };

/** Bir sonraki çağrı eşleşmeyi yeniden sorsun (VS Code kapanmış olabilir). */
export const dropPairing = (): void => {
    cache = { at: 0, value: null };
};

export const getPairing = async (force = false): Promise<Pairing | null> => {
    const now = Date.now();
    if (!force && now - cache.at < CACHE_MS) return cache.value;

    let value: Pairing | null = null;
    try {
        const res = await api.get('/devices/local-runner');
        if (res.data?.port && res.data?.token) value = res.data;
    } catch {
        // 404 = bu hesap için açık VS Code yok. Beklenen durum, sessiz geç.
    }
    cache = { at: now, value };
    return value;
};

/**
 * Eklentiye tek bir komut gönderir.
 *
 * `null` dönmesinin TEK anlamı vardır: kanal yok (eklenti kapalı, port ölü,
 * zaman aşımı). Eklentinin işleyip de başarısız olduğu durumlar gövdede
 * `{ ok: false, error }` olarak döner — çağıran "VS Code yok" ile "kodun
 * çalışmadı"yı ayırt edebilsin diye.
 */
export const callLocalRunner = async <T = any>(
    path: string, body: Record<string, unknown> = {}, timeoutMs = 30_000,
): Promise<T | null> => {
    const pairing = await getPairing();
    if (!pairing) return null;

    // Görev kontrolü öğrencinin terminalinde çalışıyor ve `input()` sorularına
    // cevap vermesini bekliyor olabilir — o yüzden süre çağırana bırakılıyor.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), timeoutMs);

    try {
        const res = await fetch(`http://127.0.0.1:${pairing.port}${path}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${pairing.token}`,
            },
            body: JSON.stringify(body),
            signal: abort.signal,
        });
        if (!res.ok) throw new Error(String(res.status));
        return (await res.json()) as T;
    } catch {
        // VS Code kapanmış olabilir; önbelleği düşür ki bir sonraki çağrı
        // eşleşmeyi yeniden sorsun.
        dropPairing();
        return null;
    } finally {
        clearTimeout(timer);
    }
};

/**
 * Eklenti gerçekten AYAKTA mı?
 *
 * Eşleşme kaydı sunucuda 120 sn yaşıyor; VS Code kapandıktan sonra da bir
 * süre "bağlı" görünür. Işığı yakmadan önce kapıyı çalıyoruz.
 */
export const pingLocalRunner = async (): Promise<boolean> => {
    const res = await callLocalRunner<{ ok: boolean }>('/ping', {}, 4000);
    return !!res?.ok;
};

/**
 * Terminal bloğundaki komutu öğrencinin VS Code terminaline yazar.
 *
 * NEDEN ÇALIŞTIRMIYORUZ, YAZIYORUZ: komut öğrencinin gözünün önünde, kendi
 * terminalinde belirir ve Enter'a O basar. `pip install` gibi makinesini
 * değiştiren bir komutun sessizce çalışması, öğrencinin kendi bilgisayarında
 * ne olduğunu görmemesi demekti.
 */
export const runTerminalCommand = async (
    command: string, language = 'bash',
): Promise<boolean> => {
    const res = await callLocalRunner<{ ok: boolean }>('/terminal', { command, language });
    return !!res?.ok;
};

/**
 * VS Code penceresini öne getirir.
 *
 * Yerel sunucu dosyayı açabiliyor ama pencereyi öne getiremez: işletim sistemi
 * odağı, HTTP isteğini alan sürece değil, kullanıcının tıkladığı bağlantının
 * sahibine verir. `vscode://` bağlantısı tıklamayı odağa çeviren tek yol.
 */
export const focusVSCode = (language = 'python'): void => {
    window.location.href = `vscode://gomufi.gomufi/task?language=${encodeURIComponent(language)}`;
};
