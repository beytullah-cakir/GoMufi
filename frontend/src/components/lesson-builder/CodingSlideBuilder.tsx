import React, { useState, useEffect, useRef } from 'react';
import type { Slide } from './types';
import { Play, Loader2, SquareTerminal } from 'lucide-react';
import { usePyodide } from '../../hooks/usePyodide';
import Prism from 'prismjs';
import 'prismjs/components/prism-python'; // Import python syntax


// Shared Editor Styles
const EDITOR_STYLES: React.CSSProperties = {
    fontFamily: '"Menlo", "Monaco", "Courier New", monospace',
    fontSize: '14px',
    lineHeight: '1.5',
    padding: '16px',
    margin: 0,
    border: 'none',
};

interface CodingSlideBuilderProps {
    slide: Slide;
    updateSlide: (id: number, updates: Partial<Slide>) => void;
}

const CodingSlideBuilder: React.FC<CodingSlideBuilderProps> = ({ slide, updateSlide }) => {
    // We store the code in the slide's first element or a specific property if we wanted.
    // For now, let's assume valid Coding Slide has mostly one "content" source.
    // But usually `elements` is for generic objects.
    // Let's use `slide.gameConfig` or a specific field?
    // Actually, `gameConfig` is for games.
    // Let's stick to using `slide.elements` but we manage a specific "code" element internally or just use a state for now if it's transient?
    // User wants to save it.
    // Let's assume we store the code in a special field on `Slide` or we just use `elements[0]` effectively.
    // But to keep it clean, maybe we add `codeContent` to `Slide`? Or reuse `gameConfig`?
    // Let's look at `types.ts` again. I didn't add `codeContent`.
    // I can add it, or abuse `elements`.
    // Let's say `elements[0]` is the code source.

    // Initialize logic
    const initialCode = slide.elements?.[0]?.content || 'print("Hello World")';
    const [localCode, setLocalCode] = useState(initialCode);
    const { runCode, output, isLoading, error } = usePyodide();

    // Sync back to slide model (debounce?)
    useEffect(() => {
        // We will update the FIRST element's content as the source of truth
        if (slide.elements.length > 0) {
            if (slide.elements[0].content !== localCode) {
                // Creating a "fake" update via prop if needed, or we rely on parent saving.
                // But `updateSlide` expects partial slide.
                const newElements = [...slide.elements];
                newElements[0] = { ...newElements[0], content: localCode };
                updateSlide(slide.id, { elements: newElements });
            }
        } else {
            // If no elements exist, initialize one?
            // Ideally we do this on creation.
        }
    }, [localCode]); // Careful with infinite loops if updateSlide changes prop which changes localCode.

    // Highlight Function
    const getHighlightedCode = (code: string) => {
        let grammar = Prism.languages.python;
        return Prism.highlight(code, grammar, 'python');
    };

    const handleRunCode = async () => {
        await runCode(localCode);
    };

    return (
        <div className="w-full h-full flex bg-[#f5f5f7] p-8 gap-6">
            {/* LEFT: CODE EDITOR */}
            <div className="flex-1 bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col ring-1 ring-black/5">
                {/* Header */}
                <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]" />
                        <div className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]" />
                        <div className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]" />
                    </div>
                    <span className="font-mono text-xs font-bold text-gray-400 tracking-wider">PYTHON EDITOR</span>
                    <button
                        onClick={handleRunCode}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95"
                    >
                        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                        RUN CODE
                    </button>
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative overflow-auto custom-scrollbar">
                    {/* HIGHLIGHT LAYER */}
                    <pre
                        aria-hidden="true"
                        className="language-python w-full min-h-full absolute top-0 left-0 pointer-events-none"
                        style={{
                            ...EDITOR_STYLES,
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                            color: '#333' // Light mode text
                        }}
                    >
                        <code dangerouslySetInnerHTML={{ __html: getHighlightedCode(localCode) + '<br/>' }} />
                    </pre>

                    {/* INPUT LAYER */}
                    <textarea
                        className="w-full h-full outline-none resize-none relative z-10 bg-transparent text-transparent caret-indigo-600"
                        style={{
                            ...EDITOR_STYLES,
                            whiteSpace: 'pre-wrap',
                            wordWrap: 'break-word',
                        }}
                        value={localCode}
                        onChange={(e) => setLocalCode(e.target.value)}
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* RIGHT: TERMINAL OUTPUT */}
            <div className="w-[400px] bg-[#1e1e1e] rounded-2xl shadow-xl overflow-hidden flex flex-col ring-1 ring-white/10">
                <div className="bg-[#2d2d2d] px-4 py-3 border-b border-white/5 flex items-center gap-2 text-gray-400">
                    <SquareTerminal className="w-4 h-4" />
                    <span className="text-xs font-mono font-bold tracking-wider">TERMINAL</span>
                </div>

                <div className="flex-1 p-4 font-mono text-xs overflow-auto text-green-400 custom-scrollbar">
                    {isLoading && (
                        <div className="flex items-center gap-2 text-yellow-500 animate-pulse mb-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Running...</span>
                        </div>
                    )}

                    <div className="flex flex-col gap-1">
                        {!output.length && !error && !isLoading && (
                            <span className="text-gray-600 italic opacity-50">output will appear here...</span>
                        )}
                        {output.map((line, i) => (
                            <div key={i} className="whitespace-pre-wrap">{line}</div>
                        ))}
                        {error && (
                            <div className="text-red-400 mt-2 whitespace-pre-wrap border-t border-red-500/20 pt-2">
                                {error}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CodingSlideBuilder;
