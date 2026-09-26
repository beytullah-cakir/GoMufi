import * as path from 'path';

/**
 * Yol hesapları — `vscode` modülüne DOKUNMAYAN saf yardımcılar, böylece
 * birim testlerde VS Code olmadan çalışır (bkz. src/test).
 */

/** Windows ve macOS'ta yol karşılaştırması büyük/küçük harf duyarsız. */
const caseInsensitive = (platform: string) => platform === 'win32' || platform === 'darwin';

function normalize(p: string, platform: string): string {
    const lib = platform === 'win32' ? path.win32 : path.posix;
    let out = lib.resolve(p);
    if (out.length > 1) out = out.replace(/[\\/]+$/, '');
    return caseInsensitive(platform) ? out.toLowerCase() : out;
}

/** `child`, `parent`ın kendisi ya da altında mı? */
export function isSameOrInside(parent: string, child: string, platform: string = process.platform): boolean {
    const a = normalize(parent, platform);
    const b = normalize(child, platform);
    if (a === b) return true;
    const sep = platform === 'win32' ? '\\' : '/';
    return b.startsWith(a.endsWith(sep) ? a : a + sep);
}

/**
 * Dosya sisteminde güvenli klasör/dosya adı.
 *
 * Windows'ta yasak olanlar: < > : " / \ | ? * ve kontrol karakterleri.
 * BOŞLUKLAR KORUNUR (yalnızca sadeleştirilir) — silinirse kelimeler birbirine
 * yapışıp ad okunmaz hale gelir. Windows sondaki nokta ve boşluğu da kabul
 * etmediği için ad sonu ayrıca kırpılır; CON, NUL gibi ayrılmış adlar da.
 */
export function safeFolderName(text: string, fallback = 'odev'): string {
    const cleaned = (text || '')
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60)
        .replace(/[. ]+$/, '');
    if (!cleaned || /^(con|prn|aux|nul|com\d|lpt\d)$/i.test(cleaned)) return fallback;
    return cleaned;
}

/**
 * Slayt kodunun dosya adı: her slayt KENDİ dosyasına yazılır ki öğrencinin bir
 * slayttaki düzenlemesi, başka bir slaytta "editörde aç" dendiğinde kaybolmasın.
 */
export function slideFileName(title: string | undefined, ext: string): string {
    const base = safeFolderName(title || '', '').replace(/\s+/g, '-').toLocaleLowerCase('tr-TR');
    return base ? `slayt-${base}.${ext}` : `slayt.${ext}`;
}

/** Laboratuvar modunda öğrenciye ait alt klasörün adı (ad + kimlik, çakışmasın). */
export function labFolderName(displayName: string, userId: string): string {
    return safeFolderName(`${displayName || 'Ogrenci'}-${userId}`, `ogrenci-${userId}`);
}
