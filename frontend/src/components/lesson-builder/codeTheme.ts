import { useEffect } from 'react';

/**
 * Kod editörlerinin ORTAK teması ve tipografisi — tek kaynak.
 *
 * NEDEN AYRI DOSYA: tema CSS'i eskiden yalnızca CodeWidget'ın içinde duruyor ve
 * o bileşen mount olduğunda `document.head`'e ekleniyordu. UYGULA (challenge)
 * slaydında CodeWidget yok; Prism `token` sınıflarını üretiyor ama onları
 * renklendiren kural sayfada hiç bulunmadığı için kod DÜZ BEYAZ görünüyordu.
 * Artık kod editörü olan her bileşen `usePrismTheme()` çağırır.
 */

/** Prism "Tomorrow" teması (CDN'e bağımlı kalmamak için gömülü). */
export const PRISM_THEME_CSS = `
code[class*=language-],pre[class*=language-]{color:#ccc;background:0 0;font-family:Consolas,Monaco,'Andale Mono','Ubuntu Mono',monospace;font-size:1em;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none}pre[class*=language-]{padding:1em;margin:.5em 0;overflow:auto}:not(pre)>code[class*=language-],pre[class*=language-]{background:#2d2d2d}:not(pre)>code[class*=language-]{padding:.1em;border-radius:.3em;white-space:normal}.token.block-comment,.token.cdata,.token.comment,.token.doctype,.token.prolog{color:#999}.token.punctuation{color:#ccc}.token.attr-name,.token.deleted,.token.namespace,.token.tag{color:#e2777a}.token.function-name{color:#6196cc}.token.boolean,.token.function,.token.number{color:#f08d49}.token.class-name,.token.constant,.token.property,.token.symbol{color:#f8c555}.token.atrule,.token.builtin,.token.important,.token.keyword,.token.selector{color:#cc99cd}.token.attr-value,.token.char,.token.regex,.token.string,.token.variable{color:#7ec699}.token.entity,.token.operator,.token.url{color:#67cdcc}.token.bold,.token.important{font-weight:700}.token.italic{font-style:italic}.token.entity{cursor:help}.token.inserted{color:green}
`;

/** Temayı sayfaya bir kez enjekte eder. Kod editörü çizen her bileşen çağırır. */
export const usePrismTheme = () => {
    useEffect(() => {
        if (document.getElementById('prism-theme-style')) return;
        const style = document.createElement('style');
        style.id = 'prism-theme-style';
        style.innerHTML = PRISM_THEME_CSS;
        document.head.appendChild(style);
    }, []);
};

/**
 * Vurgulama katmanı (`<pre>`) ile yazma katmanı (`<textarea>`) AYNI stili
 * kullanmak ZORUNDA: font ailesi, boyut, satır yüksekliği veya dolgu bir
 * karakter bile kayarsa imleç metnin üstüne oturmaz.
 */
export const codeEditorStyles = (fontSize = 13): React.CSSProperties => ({
    fontFamily: '"Menlo", "Monaco", "Courier New", monospace',
    fontSize: `${fontSize}px`,
    lineHeight: '1.55',
    padding: '14px',
    margin: 0,
    border: 'none',
    tabSize: 4,
});

/**
 * Vurgulanan `<code>` için. Prism teması `code[class*=language-]` seçicisiyle
 * kendi font ve satır yüksekliğini dayatır; devralmaya zorlanmazsa yazı
 * katmanıyla arasında kayma oluşur.
 */
export const codeInheritStyles: React.CSSProperties = {
    fontFamily: 'inherit',
    fontSize: 'inherit',
    lineHeight: 'inherit',
};
