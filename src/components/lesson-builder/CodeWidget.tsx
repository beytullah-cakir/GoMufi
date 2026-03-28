import React, { useState, useEffect } from 'react';
import { Settings, Play, Eye, MessageCircle, AlertCircle, Loader2, SquareTerminal, FileCode } from 'lucide-react';
import type { SlideElement } from './types';
import { usePyodide } from '../../hooks/usePyodide';

import Prism from 'prismjs';
import 'prismjs/components/prism-python'; // Import python syntax
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

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

// Prism Tomorrow Theme (inlined for reliability)
const PRISM_THEME_CSS = `
code[class*=language-],pre[class*=language-]{color:#ccc;background:0 0;font-family:Consolas,Monaco,'Andale Mono','Ubuntu Mono',monospace;font-size:1em;text-align:left;white-space:pre;word-spacing:normal;word-break:normal;word-wrap:normal;line-height:1.5;-moz-tab-size:4;-o-tab-size:4;tab-size:4;-webkit-hyphens:none;-moz-hyphens:none;-ms-hyphens:none;hyphens:none}pre[class*=language-]{padding:1em;margin:.5em 0;overflow:auto}:not(pre)>code[class*=language-],pre[class*=language-]{background:#2d2d2d}:not(pre)>code[class*=language-]{padding:.1em;border-radius:.3em;white-space:normal}.token.block-comment,.token.cdata,.token.comment,.token.doctype,.token.prolog{color:#999}.token.punctuation{color:#ccc}.token.attr-name,.token.deleted,.token.namespace,.token.tag{color:#e2777a}.token.function-name{color:#6196cc}.token.boolean,.token.function,.token.number{color:#f08d49}.token.class-name,.token.constant,.token.property,.token.symbol{color:#f8c555}.token.atrule,.token.builtin,.token.important,.token.keyword,.token.selector{color:#cc99cd}.token.attr-value,.token.char,.token.regex,.token.string,.token.variable{color:#7ec699}.token.entity,.token.operator,.token.url{color:#67cdcc}.token.bold,.token.important{font-weight:700}.token.italic{font-style:italic}.token.entity{cursor:help}.token.inserted{color:green}
`;

interface CodeWidgetProps {
    el: SlideElement;
    isEditing: boolean;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    setEditingElementId: (id: string | null) => void;
    handleMouseDown: (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate', handle?: string) => void;
}

const CodeWidget: React.FC<CodeWidgetProps> = ({ el, isEditing, updateElement, handleMouseDown, setEditingElementId }) => {
    // viewMode: 'code' | 'settings' | 'output'
    const [viewMode, setViewMode] = useState<'code' | 'settings' | 'output'>('code');
    const [localCode, setLocalCode] = useState(el.content);

    // Autocomplete State
    const [suggestions, setSuggestions] = useState<typeof PYTHON_SNIPPETS>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
    const [caretCoords, setCaretCoords] = useState({ x: 0, y: 0 });
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Pyodide Hook
    const { runCode, output, isLoading, error } = usePyodide();

    // Inject Styles once
    useEffect(() => {
        if (!document.getElementById('prism-theme-style')) {
            const style = document.createElement('style');
            style.id = 'prism-theme-style';
            style.innerHTML = PRISM_THEME_CSS;
            document.head.appendChild(style);
        }
    }, []);

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

    const handleRunCode = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setViewMode('output'); // Switch to output view
        await runCode(localCode);
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

            // Check if line ends with colon (ignoring trailing whitespace)
            const endsWithColon = currentLine.trimEnd().endsWith(':');

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
        if (!el.codeConfig?.enableAutocomplete) return;
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

        if (!el.codeConfig?.enableAutocomplete) return;

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

    // Highlight Function
    const getHighlightedCode = (code: string, lang: string) => {
        let grammar = Prism.languages[lang];
        if (!grammar) grammar = Prism.languages.python; // Fallback
        return Prism.highlight(code, grammar, lang);
    };

    const theme = el.codeConfig?.theme || 'dark';
    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    // textColor is unused in overlay mode (textarea is transparent)
    const headerColor = theme === 'dark' ? '#2d2d2d' : '#f3f4f6';
    const borderColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Config Panel Styles
    const inputBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const inputBorder = theme === 'dark' ? '#374151' : '#e5e7eb';
    const inputText = theme === 'dark' ? '#d1d5db' : '#374151';

    // Shared Editor Styles for perfect alignment
    const EDITOR_STYLES: React.CSSProperties = {
        fontFamily: el.style?.fontFamily || '"Menlo", "Monaco", "Courier New", monospace', // Use custom font or fallback
        fontSize: el.style?.fontSize ? `${el.style.fontSize}px` : '14px',
        fontWeight: el.style?.bold ? 'bold' : 'normal', // Bold support
        lineHeight: '1.5',
        padding: '16px', // Matches p-4
        margin: 0,
        border: 'none',
    };

    const language = el.codeConfig?.language || 'python';

    return (
        <div
            className="w-full h-full flex flex-col font-mono shadow-2xl rounded-xl overflow-hidden ring-1"
            style={{
                backgroundColor: bgColor,
                boxShadow: `0 0 0 1px ${borderColor}`,
                // fontSize handled in EDITOR_STYLES
            }}
        >
            {/* -- MAC TERMINAL HEADER -- */}
            <div
                className="px-4 py-2 flex items-center justify-between shrink-0 select-none group cursor-grab active:cursor-grabbing border-b"
                style={{ backgroundColor: headerColor, borderColor: borderColor }}
                onDoubleClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => handleMouseDown(e, el.id, 'drag')}
            >
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e] hover:brightness-110 transition-all" />
                    <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123] hover:brightness-110 transition-all" />
                    <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29] hover:brightness-110 transition-all" />
                </div>

                <div className="text-xs font-medium flex items-center gap-1 opacity-100 uppercase tracking-wider" style={{ color: inputText }}>
                    <span>{el.codeConfig?.language || 'python'}</span>
                </div>

                {/* TEACHER/STUDENT CONTROLS */}
                <div className="flex items-center gap-1 opacity-100">
                    {/* Run Button (Always visible) */}
                    <button
                        onClick={handleRunCode}
                        className="p-1.5 rounded-md bg-green-500/10 hover:bg-green-500/20 text-green-500 flex items-center gap-1 transition-all mr-2"
                        title="Run Code"
                    >
                        {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                        <span className="text-[10px] font-bold">RUN</span>
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setViewMode('code'); }}
                        className={`p-1 rounded hover:bg-black/5 transition-colors ${viewMode === 'code' ? 'text-indigo-500' : 'text-gray-400'}`}
                        title="Code Editor"
                    >
                        <FileCode className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setViewMode('output'); }}
                        className={`p-1 rounded hover:bg-black/5 transition-colors ${viewMode === 'output' ? 'text-indigo-500' : 'text-gray-400'}`}
                        title="Terminal / Output"
                    >
                        <SquareTerminal className="w-3.5 h-3.5" />
                    </button>

                    <button
                        onClick={(e) => { e.stopPropagation(); setViewMode('settings'); }}
                        className={`p-1 rounded hover:bg-black/5 transition-colors ${viewMode === 'settings' ? 'text-indigo-500' : 'text-gray-400'}`}
                        title="Widget Settings"
                    >
                        <Settings className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* -- CONTENT AREA -- */}
            <div className="flex-1 relative overflow-hidden">

                {/* 1. CODE EDITOR MODE */}
                <div className={`absolute inset-0 transition-transform duration-300 ease-in-out ${viewMode === 'code' ? 'translate-x-0' : '-translate-x-full'}`}>

                    {/* HIGHLIGHT LAYER (Bottom) */}
                    <pre
                        aria-hidden="true"
                        className={`language-${language} w-full h-full absolute top-0 left-0 pointer-events-none overflow-hidden`}
                        style={{
                            ...EDITOR_STYLES,
                            backgroundColor: bgColor,
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                        }}
                    >
                        <code
                            className={`language-${language}`}
                            style={{
                                fontFamily: 'inherit',
                                lineHeight: 'inherit',
                            }}
                            dangerouslySetInnerHTML={{ __html: getHighlightedCode(localCode, language) + '<br/>' }}
                        />
                    </pre>

                    {/* TEXTAREA LAYER (Top) */}
                    <textarea
                        ref={textareaRef}
                        className={`w-full h-full outline-none resize-none relative z-10 ${isEditing ? 'cursor-text' : 'cursor-default pointer-events-none'}`}
                        style={{
                            ...EDITOR_STYLES,
                            backgroundColor: 'transparent',
                            color: 'transparent',
                            caretColor: theme === 'dark' ? 'white' : 'black',
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                        }}
                        value={localCode}
                        onChange={handleCodeChange}
                        onBlur={handleSaveCode}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        placeholder="// Write your code here..."
                        onKeyDown={handleKeyDown}
                        onScroll={(e) => {
                            // Sync scroll
                            const pre = e.currentTarget.previousElementSibling;
                            if (pre) {
                                pre.scrollTop = e.currentTarget.scrollTop;
                                pre.scrollLeft = e.currentTarget.scrollLeft;
                            }
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

                {/* 2. SETTINGS MODE (Teacher Data) */}
                <div className={`absolute inset-0 p-4 flex flex-col gap-4 overflow-y-auto transition-transform duration-300 ease-in-out ${viewMode === 'settings' ? 'translate-x-0' : 'translate-x-full'}`}
                    style={{ backgroundColor: theme === 'dark' ? '#252526' : '#f9fafb' }}
                >

                    {/* Expected Output */}
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: inputText }}>
                            <Eye className="w-3 h-3 text-indigo-400" />
                            Beklenen Çıktı (Expected Output)
                        </label>
                        <textarea
                            className="w-full h-24 rounded-lg p-3 text-xs font-mono focus:ring-1 focus:ring-indigo-500 outline-none transition-colors resize-none border"
                            style={{ backgroundColor: inputBg, borderColor: inputBorder, color: inputText }}
                            placeholder="Öğrencinin kodunun üretmesi gereken çıktı..."
                            value={el.codeConfig?.expectedOutput || ''}
                            onChange={(e) => handleConfigUpdate('expectedOutput', e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Hint */}
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: inputText }}>
                            <MessageCircle className="w-3 h-3 text-yellow-400" />
                            İpucu (Student Hint)
                        </label>
                        <textarea
                            className="w-full h-20 rounded-lg p-3 text-xs font-sans focus:ring-1 focus:ring-yellow-500 outline-none transition-colors resize-none border"
                            style={{ backgroundColor: inputBg, borderColor: inputBorder, color: inputText }}
                            placeholder="Öğrenciye verilecek küçük bir ipucu..."
                            value={el.codeConfig?.hint || ''}
                            onChange={(e) => handleConfigUpdate('hint', e.target.value)}
                            onKeyDown={(e) => e.stopPropagation()}
                        />
                    </div>

                    {/* Language Selector */}
                    <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-70" style={{ color: inputText }}>
                            <AlertCircle className="w-3 h-3 text-green-400" />
                            Dil (Language)
                        </label>
                        <select
                            className="w-full rounded-lg p-2 text-xs outline-none border"
                            style={{ backgroundColor: inputBg, borderColor: inputBorder, color: inputText }}
                            value={el.codeConfig?.language || 'python'}
                            onChange={(e) => handleConfigUpdate('language', e.target.value)}
                        >
                            <option value="python">Python 3</option>
                            <option value="javascript">JavaScript</option>
                            <option value="typescript">TypeScript</option>
                            <option value="cpp">C++</option>
                        </select>
                    </div>

                    {/* Autocomplete Toggle */}
                    <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                        <div
                            className={`w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${el.codeConfig?.enableAutocomplete ? 'bg-green-500' : 'bg-gray-600'}`}
                            onClick={() => handleConfigUpdate('enableAutocomplete', !el.codeConfig?.enableAutocomplete)}
                        >
                            <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${el.codeConfig?.enableAutocomplete ? 'translate-x-5' : 'translate-x-0'}`} />
                        </div>
                        <label className="text-xs font-bold uppercase tracking-wider opacity-70 cursor-pointer" style={{ color: inputText }} onClick={() => handleConfigUpdate('enableAutocomplete', !el.codeConfig?.enableAutocomplete)}>
                            Snippets / Autocomplete
                        </label>
                    </div>

                </div>

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
                        {output.length === 0 && !isLoading && <span className="text-gray-600 italic">No output yet. Click RUN to execute.</span>}
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

            {/* Footer / Status Bar (Optional decoration) */}
            <div className="bg-[#2d2d2d] px-3 py-1 flex justify-between items-center text-[10px] text-gray-500 select-none">
                <span>
                    {viewMode === 'code' && 'EDITOR'}
                    {viewMode === 'settings' && 'CONFIG'}
                    {viewMode === 'output' && 'TERMINAL'}
                </span>
                <span>UTF-8</span>
            </div>
        </div>
    );
};

export default CodeWidget;
