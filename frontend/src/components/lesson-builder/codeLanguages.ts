import Prism from 'prismjs';

/* Prism dilbilgileri. Bunlar YAN ETKİLİ import: her biri kendini
   `Prism.languages`e yazar. Sıra önemli — türetilmiş diller (tsx, php, cpp)
   temel aldıkları dili (markup, clike, c) yüklü bulmak zorunda.

   `markup-templating` HERKES İÇİN ŞART, yalnızca PHP için değil: PHP bileşeni
   yüklenince global bir `before-tokenize` kancası kuruyor ve o kanca
   `markup-templating`i çağırıyor. Node'da bileşen bağımlılığını kendisi
   `require` ediyor, paketleyicide edemiyor — eksik olduğunda kanca HER
   `Prism.highlight` çağrısında patlıyor ve TÜM diller renksiz kalıyor
   (Python dahil; hata yakalanıp düz metne düşüyordu). */
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-php';
import 'prismjs/components/prism-ruby';
import 'prismjs/components/prism-kotlin';
import 'prismjs/components/prism-swift';
import 'prismjs/components/prism-dart';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-powershell';
import 'prismjs/components/prism-docker';

/**
 * Derste kullanılabilecek diller — tek kayıt defteri.
 *
 * NEDEN TEK YERDE: aynı dil listesi üç ayrı soruya cevap veriyor — öğretmenin
 * gördüğü menü, Prism'in renklendirme dilbilgisi ve VS Code'a gönderilirken
 * dosyanın uzantısı. Üçü ayrı listelerde dursaydı öğretmen "Go" seçtiğinde
 * renklendirme çalışır ama dosya `.py` olarak açılırdı.
 *
 * `runsInVSCode` ise dürüstlük meselesi: eklenti bir Java dosyasını çalıştırıp
 * bir Rust dosyasını çalıştıramıyorsa, arayüz "Çalıştır" sözünü yalnızca ilkine
 * vermeli. Çalıştırılamayan diller yine de EDİTÖRDE AÇILIR — ders örneği
 * göstermek için zaten çalıştırmak gerekmiyor.
 */

export interface CodeLanguage {
    id: string;
    label: string;
    /** Prism dilbilgisi anahtarı (`Prism.languages[...]`). */
    grammar: string;
    /** VS Code'a gönderilirken dosya uzantısı. */
    ext: string;
    group: string;
    /** Eklenti bu dili öğrencinin makinesinde çalıştırabiliyor mu? */
    runsInVSCode: boolean;
    /** Terminal/kabuk dili mi? (Varsayılan görünümü terminal olur.) */
    shell?: boolean;
    /** Terminal görünümündeki komut istemi. */
    prompt?: string;
}

export const CODE_LANGUAGES: CodeLanguage[] = [
    // — Popüler —
    { id: 'python', label: 'Python', grammar: 'python', ext: 'py', group: 'Popüler', runsInVSCode: true },
    { id: 'javascript', label: 'JavaScript', grammar: 'javascript', ext: 'js', group: 'Popüler', runsInVSCode: true },
    { id: 'typescript', label: 'TypeScript', grammar: 'typescript', ext: 'ts', group: 'Popüler', runsInVSCode: true },
    { id: 'java', label: 'Java', grammar: 'java', ext: 'java', group: 'Popüler', runsInVSCode: true },
    { id: 'csharp', label: 'C#', grammar: 'csharp', ext: 'cs', group: 'Popüler', runsInVSCode: false },
    { id: 'cpp', label: 'C++', grammar: 'cpp', ext: 'cpp', group: 'Popüler', runsInVSCode: false },
    { id: 'c', label: 'C', grammar: 'c', ext: 'c', group: 'Popüler', runsInVSCode: false },

    // — Web —
    { id: 'html', label: 'HTML', grammar: 'markup', ext: 'html', group: 'Web', runsInVSCode: false },
    { id: 'css', label: 'CSS', grammar: 'css', ext: 'css', group: 'Web', runsInVSCode: false },
    { id: 'jsx', label: 'React (JSX)', grammar: 'jsx', ext: 'jsx', group: 'Web', runsInVSCode: false },
    { id: 'tsx', label: 'React (TSX)', grammar: 'tsx', ext: 'tsx', group: 'Web', runsInVSCode: false },
    { id: 'php', label: 'PHP', grammar: 'php', ext: 'php', group: 'Web', runsInVSCode: true },

    // — Diğer diller —
    { id: 'go', label: 'Go', grammar: 'go', ext: 'go', group: 'Diğer Diller', runsInVSCode: true },
    { id: 'rust', label: 'Rust', grammar: 'rust', ext: 'rs', group: 'Diğer Diller', runsInVSCode: false },
    { id: 'ruby', label: 'Ruby', grammar: 'ruby', ext: 'rb', group: 'Diğer Diller', runsInVSCode: true },
    { id: 'kotlin', label: 'Kotlin', grammar: 'kotlin', ext: 'kt', group: 'Diğer Diller', runsInVSCode: false },
    { id: 'swift', label: 'Swift', grammar: 'swift', ext: 'swift', group: 'Diğer Diller', runsInVSCode: false },
    { id: 'dart', label: 'Dart', grammar: 'dart', ext: 'dart', group: 'Diğer Diller', runsInVSCode: false },

    // — Veri & yapılandırma —
    { id: 'sql', label: 'SQL', grammar: 'sql', ext: 'sql', group: 'Veri & Yapılandırma', runsInVSCode: false },
    { id: 'json', label: 'JSON', grammar: 'json', ext: 'json', group: 'Veri & Yapılandırma', runsInVSCode: false },
    { id: 'yaml', label: 'YAML', grammar: 'yaml', ext: 'yaml', group: 'Veri & Yapılandırma', runsInVSCode: false },
    { id: 'markdown', label: 'Markdown', grammar: 'markdown', ext: 'md', group: 'Veri & Yapılandırma', runsInVSCode: false },
    { id: 'docker', label: 'Dockerfile', grammar: 'docker', ext: 'Dockerfile', group: 'Veri & Yapılandırma', runsInVSCode: false },

    // — Terminal —
    // Komut satırı da öğretilen bir şey: `pip install`, `git commit`, `npm run`
    // dersin parçası. Bunlar "kod bloğu" gibi değil, terminal gibi görünmeli.
    { id: 'bash', label: 'Terminal (Bash)', grammar: 'bash', ext: 'sh', group: 'Terminal', runsInVSCode: true, shell: true, prompt: '$' },
    { id: 'powershell', label: 'Terminal (PowerShell)', grammar: 'powershell', ext: 'ps1', group: 'Terminal', runsInVSCode: true, shell: true, prompt: 'PS>' },
    { id: 'cmd', label: 'Terminal (CMD)', grammar: 'bash', ext: 'bat', group: 'Terminal', runsInVSCode: true, shell: true, prompt: 'C:\\>' },
];

/** Menüdeki sıra: kayıt defterindeki grup sırası korunur. */
export const LANGUAGE_GROUPS: Array<{ group: string; items: CodeLanguage[] }> =
    CODE_LANGUAGES.reduce((acc, lang) => {
        const found = acc.find((g) => g.group === lang.group);
        if (found) found.items.push(lang);
        else acc.push({ group: lang.group, items: [lang] });
        return acc;
    }, [] as Array<{ group: string; items: CodeLanguage[] }>);

const FALLBACK = CODE_LANGUAGES[0];

export const findLanguage = (id?: string): CodeLanguage =>
    CODE_LANGUAGES.find((l) => l.id === id) || FALLBACK;

/**
 * Kodu renklendirir.
 *
 * Dilbilgisi yüklenmemişse HAM METİN döner — `Prism.highlight` bilinmeyen bir
 * dilbilgisiyle çağrılınca patlıyor ve slaydın tamamını boş ekrana çeviriyordu.
 * Kaçış şart: sonuç `dangerouslySetInnerHTML` ile basılıyor.
 */
export const highlightCode = (code: string, languageId?: string): string => {
    const lang = findLanguage(languageId);
    const grammar = Prism.languages[lang.grammar];
    if (!grammar) {
        warnOnce(`Prism dilbilgisi yüklü değil: ${lang.grammar}`);
        return escapeHtml(code);
    }
    try {
        return Prism.highlight(code, grammar, lang.grammar);
    } catch (err) {
        // SESSİZ DÜŞMÜYORUZ: bu yol bir kez sessizce devreye girdi ve bütün
        // kod blokları düz metne döndü — kimse bir hata görmediği için sorunun
        // Prism'de olduğu anlaşılamadı. Renk gitti mi, konsolda sebebi yazsın.
        warnOnce(`Prism vurgulaması başarısız (${lang.grammar}): ${(err as Error).message}`);
        return escapeHtml(code);
    }
};

const warned = new Set<string>();
const warnOnce = (message: string): void => {
    if (warned.has(message)) return;
    warned.add(message);
    console.warn(`[GoMufi] ${message}`);
};

const escapeHtml = (text: string): string =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Terminal görünümü mü? Kabuk dilleri varsayılan olarak terminaldir. */
export const isTerminalView = (
    languageId?: string, mode?: 'editor' | 'terminal',
): boolean => (mode ? mode === 'terminal' : !!findLanguage(languageId).shell);
