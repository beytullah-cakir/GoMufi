import React, { useState, useEffect } from 'react';
import { Settings, Play, Eye, MessageCircle, AlertCircle } from 'lucide-react';
import type { SlideElement } from './types';

interface CodeWidgetProps {
    el: SlideElement;
    isEditing: boolean;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    setEditingElementId: (id: string | null) => void;
    handleMouseDown: (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate', handle?: string) => void;
}

const CodeWidget: React.FC<CodeWidgetProps> = ({ el, isEditing, updateElement, handleMouseDown, setEditingElementId }) => {
    // Determine view: 'code' (default) or 'settings' (teacher config)
    const [viewMode, setViewMode] = useState<'code' | 'settings'>('code');
    const [localCode, setLocalCode] = useState(el.content);

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

    const theme = el.codeConfig?.theme || 'dark';
    const bgColor = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const textColor = el.style?.color || (theme === 'dark' ? '#e5e7eb' : '#1f2937');
    const headerColor = theme === 'dark' ? '#2d2d2d' : '#f3f4f6';
    const borderColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // Config Panel Styles
    const inputBg = theme === 'dark' ? '#1e1e1e' : '#ffffff';
    const inputBorder = theme === 'dark' ? '#374151' : '#e5e7eb';
    const inputText = theme === 'dark' ? '#d1d5db' : '#374151';

    return (
        <div
            className="w-full h-full flex flex-col font-mono shadow-2xl rounded-xl overflow-hidden ring-1"
            style={{
                backgroundColor: bgColor,
                boxShadow: `0 0 0 1px ${borderColor}`,
                fontSize: el.style?.fontSize ? `${el.style.fontSize}px` : '14px'
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

                {/* TEACHER CONTROLS (Only visible if Editing or Selected) */}
                <div className="flex gap-2 opacity-100">
                    <button
                        onClick={(e) => { e.stopPropagation(); setViewMode('code'); }}
                        className={`p-1 rounded hover:bg-black/5 transition-colors ${viewMode === 'code' ? 'text-indigo-500' : 'text-gray-400'}`}
                        title="Code Editor"
                    >
                        <Play className="w-3.5 h-3.5" />
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
                    <textarea
                        className={`w-full h-full p-4 outline-none resize-none font-mono leading-relaxed selection:bg-indigo-500/30 ${isEditing ? 'cursor-text' : 'cursor-default pointer-events-none'}`}
                        style={{ backgroundColor: bgColor, color: textColor }}
                        value={localCode}
                        onChange={(e) => setLocalCode(e.target.value)}
                        onBlur={handleSaveCode}
                        spellCheck={false}
                        placeholder="// Write your code here..."
                        onKeyDown={(e) => {
                            // Stop propagation of delete to prevent element deletion while typing
                            e.stopPropagation();
                        }}
                    />
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

                </div>
            </div>

            {/* Footer / Status Bar (Optional decoration) */}
            <div className="bg-[#2d2d2d] px-3 py-1 flex justify-between items-center text-[10px] text-gray-500 select-none">
                <span>{viewMode === 'code' ? 'EDITOR MODE' : 'CONFIG MODE'}</span>
                <span>UTF-8</span>
            </div>
        </div>
    );
};

export default CodeWidget;
