import DOMPurify from 'dompurify';

/**
 * Öğretmen ve YZ içeriğini HTML olarak basmadan önce temizler.
 *
 * NEDEN: slayt metinleri zengin metin (kalın, renk, liste) olduğu için HTML
 * olarak saklanıyor ve `dangerouslySetInnerHTML` ile basılıyor. Öğretmen kaydı
 * herkese açık; kötü niyetli biri slayta `<img src=x onerror=…>` koyarsa kod,
 * kursa katılan HER öğrencide çalışırdı. Daha kötüsü: site VS Code'daki yerel
 * çalıştırıcının anahtarını alabildiği için bu, öğrencinin BİLGİSAYARINDA komut
 * çalıştırmaya kadar gidiyordu. YZ'nin ürettiği içerik de (öğretmenin yüklediği
 * PDF'e gizlenmiş talimatlarla) aynı yoldan geliyor.
 *
 * Yalnızca biçimlendirme etiketleri kalır; script, olay öznitelikleri
 * (onerror…), iframe/form/embed ve `javascript:` adresleri atılır.
 */

const ALLOWED_TAGS = [
    'b', 'strong', 'i', 'em', 'u', 's', 'strike', 'del', 'mark', 'small', 'sub', 'sup',
    'span', 'div', 'p', 'br', 'hr', 'font', 'blockquote',
    'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'code', 'pre', 'kbd', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
];
const ALLOWED_ATTR = ['style', 'class', 'href', 'target', 'rel', 'color', 'size', 'face', 'align', 'colspan', 'rowspan'];

let hooked = false;
function ensureHooks(): void {
    if (hooked) return;
    hooked = true;
    // Dışarı giden bağlantılar yeni sekmede ve açan sayfaya erişemeden açılsın.
    DOMPurify.addHook('afterSanitizeAttributes', (node) => {
        if (node.tagName === 'A' && node.getAttribute('href')) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
        }
    });
}

export function sanitizeHtml(html: unknown): string {
    if (typeof html !== 'string' || !html) return '';
    ensureHooks();
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR,
        // Yalnızca http(s), mailto ve sayfa içi/göreli adresler.
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    });
}

/** `dangerouslySetInnerHTML` için hazır nesne. */
export const safeHtml = (html: unknown): { __html: string } => ({ __html: sanitizeHtml(html) });

/**
 * Kullanıcı içeriğinden gelen bir bağlantıyı güvenli hale getirir: yalnızca
 * http(s), mailto, sayfa içi yol ve blob: kalır; `javascript:`, `data:text/html`
 * gibi çalıştırılabilir adresler '#' olur.
 */
export function safeUrl(url: unknown): string {
    const raw = typeof url === 'string' ? url.trim() : '';
    if (!raw) return '#';
    if (raw.startsWith('/') || raw.startsWith('#')) return raw;
    if (/^blob:/i.test(raw)) return raw;
    if (/^data:image\/(png|jpe?g|gif|webp);/i.test(raw)) return raw;
    // Kontrol karakterleri ve boşlukla gizlenmiş şemaları da yakala ("java\tscript:").
    // eslint-disable-next-line no-control-regex
    const compact = raw.replace(/[\u0000- ]/g, '');
    if (/^[a-z][a-z\d+.-]*:/i.test(compact)) {
        return /^(https?|mailto):/i.test(compact) ? raw : '#';
    }
    return `https://${raw}`;
}
