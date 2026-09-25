import React, { useState, useEffect } from 'react';
import { Play, Loader2, SquareTerminal, FileCode, Copy, Check, ExternalLink } from 'lucide-react';
import type { SlideElement } from './types';
import { usePyodide } from '../../hooks/usePyodide';
import { usePrismTheme } from './codeTheme';
import { useLocalRunner } from '../../hooks/useLocalRunner';
import { findLanguage, highlightCode, isTerminalView } from './codeLanguages';
import { runTerminalCommand } from '../../localRunnerClient';
import { isEmbeddedInVSCode } from '../../vscodeBridge';
import { switchToVSCode, useVSCodeTarget } from '../../vscodeTarget';

// Basic Python Snippets
const PYTHON_SNIPPETS = [
    { label: 'print', doc: 'Print output', insert: 'print()' },
    { label: 'def', doc: 'Define function', insert: 'def function_name():\n    pass' },
    { label: 'if', doc: 'If condition', insert: 'if condition:\n    pass' },
    { label: 'for', doc: 'For loop', insert: 'for i in range(10):\n    pass' },
    { label: 'while', doc: 'While loop', insert: 'while condition:\n    pass' },
    { label: 'import', doc: 'Import module', insert: 'import ' },
    { label: 'class', doc: 'Define class', insert: 'class ClassName:\n    def __init__(self):\n        pass' },
    { label: 'return', doc: 'Return value', insert: 'return ' },
    { label: 'elif', doc: 'Else if', insert: 'elif condition:\n    pass' },
    { label: 'else', doc: 'Else', insert: 'else:\n    pass' },
    { label: 'try', doc: 'Try catch', insert: 'try:\n    pass\nexcept Exception as e:\n    print(e)' },
];

// Prism teması ve editör tipografisi tek kaynakta: codeTheme.ts

interface CodeWidgetProps {
    el: SlideElement;
    isEditing: boolean;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    setEditingElementId: (id: string | null) => void;
    handleMouseDown: (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate', handle?: string) => void;
    readOnly?: boolean;
    isPreview?: boolean;
}

const CodeWidget: React.FC<CodeWidgetProps> = ({ el, isEditing, updateElement, handleMouseDown, setEditingElementId, readOnly, isPreview }) => {
    // viewMode: 'code' | 'output'
    const [viewMode, setViewMode] = useState<'code' | 'output'>('code');
    const [localCode, setLocalCode] = useState(el.content);

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<typeof PYTHON_SNIPPETS>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [caretCoords, setCaretCoords] = useState({ x: 0, y: 0 });
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const preRef = React.useRef<HTMLPreElement>(null);
    const gutterRef = React.useRef<HTMLDivElement>(null);

    // Kopyalandı rozeti ve "ne oldu" bildirimi (VS Code yoksa, dil çalışmıyorsa…)
    const [copied, setCopied] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    // Hangi slayttayız? VS Code'a geçerken eklentiye verilecek adres.
    // Builder'da sağlayıcı yok (null) — orada bağlantı yalnızca paneli açar.
    const target = useVSCodeTarget();

    // Dil kayıt defterinden: etiket, Prism dilbilgisi, dosya uzantısı, komut istemi.
    const lang = findLanguage(el.codeConfig?.language);
    const terminalView = isTerminalView(el.codeConfig?.language, el.codeConfig?.mode);

    // Pyodide Hook
    const { runCode, output, isLoading, error } = usePyodide();
    // Sitedeki Calistir butonunu VS Code eklentisine yonlendirir (varsa).
    const localRunner = useLocalRunner();

    // Tema artık ortak modülden gelir (codeTheme.ts) — UYGULA slaydındaki editör
    // de aynı kaynağı kullanıyor, ikisi birbirinden ayrışmasın diye.
    usePrismTheme();

    // Sync local state when prop changes (if not currently editing heavily)
    useEffect(() => {
        setLocalCode(el.content);
    }, [el.content]);

    const handleSaveCode = () => {
        updateElement(el.id, { content: localCode });
        setEditingElementId(null);
    };

    const handleConfigUpdate = (key: string, value: any) => {
        updateElement(el.id, {
            codeConfig: {
                ...el.codeConfig,
                [key]: value
            }
        });
    };

    /**
     * Kodu ÇALIŞTIRMAK bu editörün işi değil — burası ders örneği yazılan yer.
     * Çalıştırma VS Code'da olur: gerçek yorumlayıcı, gerçek terminal, kurulu
     * paketler. Buton kodu oraya gönderir.
     *
     * TARAYICIDA buton aynı zamanda bir KAPI: kod gönderildikten sonra pencere
     * VS Code'a geçer ve öğrenci aynı slaytta orada devam eder. Panelin
     * içindeysek geçilecek yer yok, zaten oradayız.
     *
     * VS Code yoksa tek istisna Python: tarayıcı içi Pyodide onu çalıştırabilir.
     * Diğer dillerde uydurma bir çıktı üretmek yerine ne yapması gerektiğini
     * söylüyoruz — yanlış çıktı, çıktı olmamasından kötüdür.
     */
    const handleRunCode = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setNotice(null);

        if (await localRunner.run(localCode, lang.id)) {
            setViewMode('code');
            if (!lang.runsInVSCode) {
                setNotice(`${lang.label} dosyası VS Code'da açıldı. Çalıştırmak için kendi derleyicini kullan.`);
            }
            if (!isEmbeddedInVSCode()) switchToVSCode(target);
            return;
        }

        if (lang.id === 'python') {
            setViewMode('output');
            await runCode(localCode);
            return;
        }

        setViewMode('output');
        setNotice(`${lang.label} kodu tarayıcıda çalışmaz. VS Code eklentisini açtığında bu kod oraya gönderilir.`);
    };

    /** Terminal bloğu: komutu öğrencinin VS Code terminaline yollar. */
    const handleRunInTerminal = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setNotice(null);
        const ok = await runTerminalCommand(localCode, lang.id);
        setNotice(ok
            ? 'Komut VS Code terminaline yazıldı. Çalıştırmak için Enter\'a bas.'
            : 'VS Code bulunamadı. Komutu kopyalayıp kendi terminaline yapıştırabilirsin.');
        // Komut terminalde Enter bekliyor; öğrenci onu GÖRMELİ.
        if (ok && !isEmbeddedInVSCode()) switchToVSCode(target);
    };

    const handleCopy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(localCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            setNotice('Kopyalanamadı — metni elle seçebilirsin.');
        }
    };

    // --- Autocomplete Logic ---
    const getCaretCoordinates = () => {
        if (!textareaRef.current) return { x: 0, y: 0 };
        const textarea = textareaRef.current;
        const { selectionStart } = textarea;

        // Create a mirror div to calculate position
        const div = document.createElement('div');
        const style = window.getComputedStyle(textarea);

        // Copy styles
        Array.from(style).forEach(prop => {
            div.style.setProperty(prop, style.getPropertyValue(prop), style.getPropertyPriority(prop));
        });

        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word'; // Important for matching textarea wrapping
        div.style.top = '0';
        div.style.left = '0';

        // Text up to cursor
        const textContent = localCode.substring(0, selectionStart);
        div.textContent = textContent;

        // Append sentinel
        const span = document.createElement('span');
        span.textContent = '|';
        div.appendChild(span);

        document.body.appendChild(div);

        // Calculate relative position
        const top = span.offsetTop - textarea.scrollTop;
        const left = span.offsetLeft - textarea.scrollLeft;

        document.body.removeChild(div);

        return { x: left, y: top + 20 }; // +20 for line height approximate
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Stop bubbling details to parent (canvas) which handles 'Delete' etc.
        e.stopPropagation();

        if (readOnly) return;

        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev + 1) % suggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveSuggestionIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                insertSuggestion(suggestions[activeSuggestionIndex]);
                return;
            }
            if (e.key === 'Escape') {
                setShowSuggestions(false);
                return;
            }
        }

        // Ctrl+Space trigger
        if (e.ctrlKey && e.key === ' ') {
            e.preventDefault();
            triggerAutocomplete();
            return;
        }

        // Smart Indentation
        if (e.key === 'Enter') {
            if (!textareaRef.current) return;
            const textarea = textareaRef.current;
            const cursor = textarea.selectionStart;
            const text = localCode;

            // Get current line up to cursor
            const lastNewLine = text.lastIndexOf('\n', cursor - 1);
            const currentLine = text.substring(lastNewLine + 1, cursor);

            // Check previous indentation
            const match = currentLine.match(/^(\s*)/);
            const currentIndent = match ? match[1] : '';

            // Girinti kuralı Python'a özgü: JavaScript'te satır sonundaki `:`
            // bir nesne alanıdır, blok açmaz — orada girinti eklemek yanlış olur.
            const endsWithColon = lang.id === 'python' && currentLine.trimEnd().endsWith(':');

            e.preventDefault();

            let newIndent = currentIndent;
            if (endsWithColon) {
                newIndent += '    '; // Add 4 spaces
            }

            const insertion = '\n' + newIndent;
            const newText = text.substring(0, cursor) + insertion + text.substring(textarea.selectionEnd);

            setLocalCode(newText);

            // Move cursor
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = cursor + insertion.length;
                // Scroll to cursor if needed (simple check)
                textarea.blur();
                textarea.focus();
            }, 0);
        }

        // Tab key for indentation (insert 4 spaces)
        if (e.key === 'Tab') {
            e.preventDefault();
            if (!textareaRef.current) return;
            const textarea = textareaRef.current;
            const cursor = textarea.selectionStart;
            const text = localCode;

            const insertion = '    ';
            const newText = text.substring(0, cursor) + insertion + text.substring(textarea.selectionEnd);
            setLocalCode(newText);

            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = cursor + 4;
            }, 0);
        }
    };

    const insertSuggestion = (suggestion: typeof PYTHON_SNIPPETS[0]) => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const cursor = textarea.selectionStart;
        const text = localCode;

        // Find word boundary before cursor
        let start = cursor - 1;
        while (start >= 0 && /\w/.test(text[start])) start--;
        start++;

        // unused prefix variable removed
        const newText = text.substring(0, start) + suggestion.insert + text.substring(cursor);

        setLocalCode(newText);
        setShowSuggestions(false);

        // Restore focus and set new cursor position (approximate end of insertion)
        setTimeout(() => {
            textarea.focus();
            const newCursor = start + suggestion.insert.length;
            textarea.setSelectionRange(newCursor, newCursor);
        }, 0);
    };

    const triggerAutocomplete = () => {
        // Öneri listesi Python parçacıkları; başka bir dilde `def`/`elif`
        // önermek yardım değil, gürültü.
        if (!el.codeConfig?.enableAutocomplete || lang.id !== 'python') return;
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const cursor = textarea.selectionStart;
        const text = localCode;

        // Find word being typed
        let start = cursor - 1;
        while (start >= 0 && /\w/.test(text[start])) start--;
        start++;

        const currentWord = text.substring(start, cursor);

        // Filter suggestions
        const matches = PYTHON_SNIPPETS.filter(s => s.label.startsWith(currentWord));

        if (matches.length > 0) {
            setSuggestions(matches);
            setActiveSuggestionIndex(0);

            // Calculate Position
            const coords = getCaretCoordinates();
            setCaretCoords(coords);
            setShowSuggestions(true);
        } else {
            setShowSuggestions(false);
        }
    };

    // Auto-trigger on type
    const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setLocalCode(newValue);

        // Öneri listesi Python parçacıkları; başka bir dilde `def`/`elif`
        // önermek yardım değil, gürültü.
        if (!el.codeConfig?.enableAutocomplete || lang.id !== 'python') return;

        // Debounce or immediate check? Immediate is better for typing flow.
        const cursor = e.target.selectionStart;
        // Check if we just typed a char that is part of a word
        const charBefore = newValue[cursor - 1];
        if (charBefore && /\w/.test(charBefore)) {
            // Find current word
            let start = cursor - 1;
            while (start >= 0 && /\w/.test(newValue[start])) start--;
            start++;
            const word = newValue.substring(start, cursor);

            if (word.length >= 1) { // Trigger after 1 char
                const matches = PYTHON_SNIPPETS.filter(s => s.label.startsWith(word));
                if (matches.length > 0) {
                    setSuggestions(matches);
                    setActiveSuggestionIndex(0);

                    // Calculate Position
                    // Ideally we need to wait for render or use the current ref content which might not be updated yet?
                    // Actually textarea value is controlled by state, but ref.current.value might lag?
                    // React 18: ref sync. But we updated state (setLocalCode) just now.
                    // Safe way: we pass textarea to helper or helper uses ref which is still old value?
                    // Helper uses ref.current. With controlled component, ref.current.value usually updates.
                    // Let's try calling it directly.
                    const coords = getCaretCoordinates();
                    setCaretCoords(coords);
                    setShowSuggestions(true);
                } else {
                    setShowSuggestions(false);
                }
            } else {
                setShowSuggestions(false);
            }
        } else {
            setShowSuggestions(false);
        }
    };

    const theme = el.codeConfig?.theme || 'dark';
    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    // Terminal her zaman koyu: aydınlık temalı bir kabuk kimsenin ekranında
    // öyle görünmüyor, blok "terminal" olduğunu ilk bakışta söylemeli.
    const terminalBg = '#0c0c0c';
    // textColor is unused in overlay mode (textarea is transparent)
    const headerColor = terminalView ? '#1b1b1b' : theme === 'dark' ? '#2d2d2d' : '#f3f4f6';
    const borderColor = terminalView || theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    const inputText = terminalView ? '#9ca3af' : theme === 'dark' ? '#d1d5db' : '#374151';

    const fontSize = el.style?.fontSize || 14;

    /**
     * Terminalde komut istemi metnin PARÇASI DEĞİL, kenardaki bir sütun.
     * İçeriğe `$` yazsaydık öğretmenin kaydettiği kod da onu taşırdı ve
     * "kopyala" düğmesi çalışmayan bir komut verirdi.
     *
     * Bu sütunun satırlarla hizalı kalması için terminal görünümünde satır
     * kaydırma KAPALI (`pre`): kaydırılan bir satır iki satır yer kaplar ama
     * tek istem alır, ikisi anında birbirinden ayrışırdı.
     */
    const prompt = lang.prompt || '$';
    const gutterWidth = terminalView ? Math.round(prompt.length * fontSize * 0.62) + 14 : 0;

    // Shared Editor Styles for perfect alignment
    const EDITOR_STYLES: React.CSSProperties = {
        fontFamily: el.style?.fontFamily || '"Menlo", "Monaco", "Courier New", monospace', // Use custom font or fallback
        fontSize: `${fontSize}px`,
        fontWeight: el.style?.bold ? 'bold' : 'normal', // Bold support
        lineHeight: '1.5',
        padding: '16px', // Matches p-4
        paddingLeft: 16 + gutterWidth,
        margin: 0,
        border: 'none',
        whiteSpace: terminalView ? 'pre' : 'pre-wrap',
        wordWrap: terminalView ? 'normal' : 'break-word',
    };

    const language = lang.id;
    const lineCount = localCode.split('\n').length;

    return (
        <div
            className="w-full h-full flex flex-col font-mono shadow-2xl rounded-xl overflow-hidden ring-1"
            style={{
                backgroundColor: terminalView ? terminalBg : bgColor,
                boxShadow: `0 0 0 1px ${borderColor}`,
                // fontSize handled in EDITOR_STYLES
            }}
        >
            {/* -- MAC TERMINAL HEADER -- */}
            <div
                className="px-4 py-2 flex items-center justify-between shrink-0 select-none group cursor-grab active:cursor-grabbing border-b"
                style={{ backgroundColor: headerColor, borderColor: borderColor }}
                onDoubleClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => {
                    if (isPreview) {
                        e.stopPropagation();
                        return;
                    }
                    handleMouseDown(e, el.id, 'drag');
                }}
            >
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-110 transition-all" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-110 transition-all" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-110 transition-all" />
                </div>

                <div className="text-xs font-medium flex items-center gap-1.5 opacity-100 uppercase tracking-wider" style={{ color: inputText }}>
                    {terminalView ? <SquareTerminal className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
                    <span>{lang.label}</span>
                </div>

                {/* TEACHER/STUDENT CONTROLS */}
                <div className="flex items-center gap-1 opacity-100">
                    {/* Kopyala: terminal bloğunun asıl işi bu — öğrenci komutu
                        kendi terminaline yapıştırır. */}
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-md hover:bg-black/10 text-gray-400 hover:text-gray-200 transition-all"
                        title="Kopyala"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>

                    {terminalView ? (
                        <button
                            onClick={handleRunInTerminal}
                            className="p-1.5 rounded-md bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 flex items-center gap-1 transition-all mr-2"
                            title="Komutu VS Code terminaline gönder"
                        >
                            <SquareTerminal className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-bold">VS CODE</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleRunCode}
                            className="p-1.5 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-500 flex items-center gap-1 transition-all mr-2"
                            title={lang.runsInVSCode
                                ? "Kodu VS Code'a gönder ve orada çalıştır"
                                : "Kodu VS Code'da aç"}
                        >
                            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : lang.runsInVSCode ? <Play className="w-3.5 h-3.5 fill-current" />
                                : <ExternalLink className="w-3.5 h-3.5" />}
                            <span className="text-[10px] font-bold">{lang.runsInVSCode ? 'RUN' : 'AÇ'}</span>
                        </button>
                    )}

                    <button
                        onClick={(e) => { e.stopPropagation(); setViewMode('code'); }}
                        className={`p-1 rounded hover:bg-black/5 transition-colors ${viewMode === 'code' ? 'text-indigo-500' : 'text-gray-400'}`}
                        title={terminalView ? 'Komutlar' : 'Kod Editörü'}
                    >
                        <FileCode className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setViewMode('output'); }}
                        className={`p-1 rounded hover:bg-black/5 transition-colors ${viewMode === 'output' ? 'text-indigo-500' : 'text-gray-400'}`}
                        title="Çıktı"
                    >
                        <SquareTerminal className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* -- CONTENT AREA -- */}
            <div className="flex-1 relative overflow-hidden">

                {/* 1. CODE EDITOR MODE */}
                <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${viewMode === 'code' ? 'translate-x-0' : '-translate-x-full'}`}>

                    {/* HIGHLIGHT LAYER (Bottom) */}
                    <pre
                        ref={preRef}
                        aria-hidden="true"
                        className={`language-${language} w-full h-full absolute top-0 left-0 pointer-events-none overflow-hidden`}
                        style={{
                            ...EDITOR_STYLES,
                            backgroundColor: terminalView ? terminalBg : bgColor,
                        }}
                    >
                        <code
                            className={`language-${language}`}
                            style={{
                                fontFamily: 'inherit',
                                fontSize: 'inherit',
                                lineHeight: 'inherit',
                            }}
                            dangerouslySetInnerHTML={{ __html: highlightCode(localCode, language) + '<br/>' }}
                        />
                    </pre>

                    {/* PROMPT GUTTER — yalnızca terminal görünümünde */}
                    {terminalView && (
                        <div
                            ref={gutterRef}
                            aria-hidden="true"
                            className="absolute top-0 left-0 h-full pointer-events-none select-none overflow-hidden"
                            style={{
                                width: 16 + gutterWidth,
                                paddingTop: 16,
                                paddingLeft: 16,
                                fontFamily: EDITOR_STYLES.fontFamily,
                                fontSize: `${fontSize}px`,
                                lineHeight: '1.5',
                                color: '#22c55e',
                            }}
                        >
                            {Array.from({ length: lineCount }).map((_, i) => (
                                <div key={i} className="whitespace-pre">{prompt}</div>
                            ))}
                        </div>
                    )}

                    {/* TEXTAREA LAYER (Top) */}
                    <textarea
                        ref={textareaRef}
                        className={`w-full h-full outline-none resize-none relative z-10 ${isEditing && !readOnly ? 'cursor-text' : 'cursor-default'}`}
                        style={{
                            ...EDITOR_STYLES,
                            backgroundColor: 'transparent',
                            color: 'transparent',
                            caretColor: terminalView || theme === 'dark' ? 'white' : 'black',
                        }}
                        readOnly={readOnly}
                        value={localCode}
                        onChange={handleCodeChange}
                        onBlur={handleSaveCode}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder={terminalView ? 'pip install pandas' : 'Kodunu buraya yaz…'}
                        onKeyDown={handleKeyDown}
                        onScroll={(e) => {
                            // Üç katman (vurgulama, istem sütunu, yazı) tek gövde
                            // gibi kaymalı. Kardeş düğüme göre aramak kırılgandı:
                            // araya istem sütunu girince yanlış öğe kaydı.
                            const { scrollTop, scrollLeft } = e.currentTarget;
                            if (preRef.current) {
                                preRef.current.scrollTop = scrollTop;
                                preRef.current.scrollLeft = scrollLeft;
                            }
                            // İstem sütunu yatayda sabit: satır başındaki `$`
                            // kod sağa kayarken yerinde kalmalı.
                            if (gutterRef.current) gutterRef.current.scrollTop = scrollTop;
                        }}
                    />

                    {/* Autocomplete Overlay */}
                    {showSuggestions && (
                        <div
                            className="absolute z-50 shadow-2xl rounded-lg border overflow-hidden flex flex-col min-w-[150px]"
                            style={{
                                backgroundColor: theme === 'dark' ? '#1e1e1e' : 'white',
                                borderColor: borderColor,
                                top: caretCoords.y,
                                left: caretCoords.x,
                                maxHeight: '200px'
                            }}
                        >
                            {suggestions.map((s, i) => (
                                <div
                                    key={s.label}
                                    className={`px-3 py-1.5 flex flex-col cursor-pointer border-b border-white/5 last:border-0 ${i === activeSuggestionIndex ? 'bg-indigo-600' : 'hover:bg-white/5'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        insertSuggestion(s);
                                    }}
                                >
                                    <span className={`text-xs font-bold ${i === activeSuggestionIndex ? 'text-white' : (theme === 'dark' ? 'text-gray-200' : 'text-gray-800')}`}>{s.label}</span>
                                    <span className={`text-[10px] ${i === activeSuggestionIndex ? 'text-indigo-200' : 'text-gray-500'}`}>{s.doc}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 2. SETTINGS MODE (Refactored to Side Panel) */}

                {/* 3. TERMINAL / OUTPUT MODE */}
                <div className={`absolute inset-0 p-4 font-mono text-xs overflow-y-auto transition-transform duration-300 ease-in-out ${viewMode === 'output' ? 'translate-x-0' : 'translate-x-full'}`}
                    style={{ backgroundColor: '#0f0f0f', color: '#10b981' }} // Matrix green on black for terminal
                >
                    <div className="flex items-center gap-2 opacity-50 mb-4 border-b border-white/10 pb-2">
                        <SquareTerminal className="w-4 h-4" />
                        <span>TERMINAL OUTPUT</span>
                    </div>

                    {isLoading && (
                        <div className="flex items-center gap-2 text-yellow-500 animate-pulse mb-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Python Environment Loading...</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        {output.length === 0 && !isLoading && !notice && (
                            <span className="text-gray-600 italic">
                                {lang.runsInVSCode
                                    ? 'Henüz çıktı yok. Kod VS Code\'da çalıştırılır.'
                                    : `${lang.label} kodu VS Code'da açılır; çalıştırmak sana kalmış.`}
                            </span>
                        )}
                        {output.map((line, i) => (
                            <div key={i} className="whitespace-pre-wrap font-mono">{line}</div>
                        ))}
                        {error && (
                            <div className="text-red-500 mt-2 whitespace-pre-wrap border-t border-red-500/20 pt-2">
                                {error}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* Bildirim şeridi: "VS Code'a gönderildi", "bu dil tarayıcıda
                çalışmaz" gibi tek cümlelik geri bildirimler. Kod alanını
                kaplamıyor, çünkü asıl iş orada. */}
            {notice && (
                <div className="shrink-0 px-3 py-1.5 text-[10.5px] font-medium bg-sky-500/10 text-sky-300 border-t border-sky-500/20 flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate" title={notice}>{notice}</span>
                    <button
                        onClick={(e) => { e.stopPropagation(); setNotice(null); }}
                        className="shrink-0 text-sky-400/70 hover:text-sky-200 font-bold"
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* Footer / Status Bar (Optional decoration) */}
            <div className="bg-[#2d2d2d] px-3 py-1 flex justify-between items-center text-[10px] text-gray-500 select-none">
                <span>
                    {viewMode === 'code' ? (terminalView ? 'TERMİNAL' : 'EDITOR') : 'ÇIKTI'}
                </span>
                <span className="font-mono">
                    {terminalView ? lang.label : `.${lang.ext}`} · UTF-8
                </span>
            </div>
        </div>
    );
};

export default CodeWidget;
