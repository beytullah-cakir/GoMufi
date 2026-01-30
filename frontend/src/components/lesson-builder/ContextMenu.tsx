import React from 'react';
import { Bold, Italic, Underline, Grid } from 'lucide-react';
import type { SlideElement, ElementStyle } from './types';

interface ColorPickerProps {
    id: string;
    current?: string;
    updateElementStyle: (id: string, style: Partial<ElementStyle>) => void;
    setActiveColorPickerId: (id: string | null) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ id, current, updateElementStyle, setActiveColorPickerId }) => {
    const colors = [
        '#1f2937', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#881337', '#78350f'
    ];
    return (
        <div className="flex flex-wrap gap-1 w-40 p-2 bg-gray-800 rounded-xl shadow-xl border border-gray-600">
            {colors.map(c => (
                <button
                    key={c}
                    onClick={() => { updateElementStyle(id, { color: c }); setActiveColorPickerId(null); }}
                    className="w-5 h-5 rounded-full border border-gray-600 hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                    onMouseDown={(e) => e.stopPropagation()}
                />
            ))}
            <div className="w-full h-[1px] bg-gray-700 my-1" />
            <label className="flex items-center gap-2 text-xs text-gray-400 w-full cursor-pointer hover:text-white relative">
                <Grid className="w-4 h-4" />
                <span>Custom</span>
                <input
                    type="color"
                    value={current || '#000000'}
                    onChange={(e) => updateElementStyle(id, { color: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                />
            </label>
        </div>
    );
};

interface ContextMenuProps {
    el: SlideElement;
    scale: number;
    canvasRect: DOMRect | null;
    activeColorPickerId: string | null;
    setActiveColorPickerId: (id: string | null) => void;
    updateElementStyle: (id: string, style: Partial<ElementStyle>) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ el, scale, canvasRect, activeColorPickerId, setActiveColorPickerId, updateElementStyle }) => {

    if (!canvasRect) return null;

    const getElementScreenPos = () => {
        return {
            x: canvasRect.left + (el.x * scale) + (el.width * scale) / 2,
            y: canvasRect.top + (el.y * scale)
        };
    };

    const pos = getElementScreenPos();
    const isColorPickerOpen = activeColorPickerId === el.id;

    return (
        <div
            className="fixed z-[1000] flex flex-col gap-2 animate-in fade-in zoom-in-95"
            style={{
                left: pos.x,
                top: pos.y - 60, // Fixed offset above element
                transform: 'translateX(-50%)',
                transformOrigin: 'bottom center'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="bg-gray-900 text-white p-2 rounded-xl shadow-2xl flex items-center gap-2 border border-gray-700 select-none">
                {/* Font Family */}
                {['text', 'sticky', 'code'].includes(el.type) && (
                    <select
                        className="bg-gray-800 text-xs rounded border border-gray-600 px-2 h-8 outline-none cursor-pointer hover:bg-gray-700 transition-colors"
                        value={el.style?.fontFamily || 'Fredoka'}
                        onChange={(e) => updateElementStyle(el.id, { fontFamily: e.target.value as any })}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <option value="Fredoka">Fredoka</option>
                        <option value="Patrick Hand">El Yazısı</option>
                        <option value="Comic Neue">Komik</option>
                        <option value="Bangers">Bangers</option>
                        <option value="Pacifico">İtalik</option>
                        <option value="Inter">Modern</option>
                        <option value="Fira Code">Kod</option>
                    </select>
                )}

                {/* Font Size */}
                {['text', 'sticky', 'code'].includes(el.type) && (
                    <div className="flex items-center bg-gray-800 rounded border border-gray-600">
                        <button onMouseDown={(e) => { e.stopPropagation(); updateElementStyle(el.id, { fontSize: (el.style?.fontSize || 24) - 2 }) }} className="w-6 h-8 hover:bg-gray-700 flex items-center justify-center">-</button>
                        <span className="w-8 text-center text-xs tabular-nums">{el.style?.fontSize || 24}</span>
                        <button onMouseDown={(e) => { e.stopPropagation(); updateElementStyle(el.id, { fontSize: (el.style?.fontSize || 24) + 2 }) }} className="w-6 h-8 hover:bg-gray-700 flex items-center justify-center">+</button>
                    </div>
                )}

                {/* B/I/U */}
                {['text', 'sticky'].includes(el.type) && (
                    <div className="flex gap-0.5">
                        <button onMouseDown={(e) => { e.stopPropagation(); updateElementStyle(el.id, { bold: !el.style?.bold }) }} className={`p-1.5 rounded hover:bg-gray-700 ${el.style?.bold ? 'text-yellow-400 bg-gray-800' : 'text-gray-300'}`}><Bold className="w-4 h-4" /></button>
                        <button onMouseDown={(e) => { e.stopPropagation(); updateElementStyle(el.id, { italic: !el.style?.italic }) }} className={`p-1.5 rounded hover:bg-gray-700 ${el.style?.italic ? 'text-yellow-400 bg-gray-800' : 'text-gray-300'}`}><Italic className="w-4 h-4" /></button>
                        <button onMouseDown={(e) => { e.stopPropagation(); updateElementStyle(el.id, { underline: !el.style?.underline }) }} className={`p-1.5 rounded hover:bg-gray-700 ${el.style?.underline ? 'text-yellow-400 bg-gray-800' : 'text-gray-300'}`}><Underline className="w-4 h-4" /></button>
                    </div>
                )}

                {/* Color Trigger (Toggle Mode) */}
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setActiveColorPickerId(isColorPickerOpen ? null : el.id); }}
                        className={`w-6 h-6 rounded-full border-2 transition-colors block ${isColorPickerOpen ? 'border-white ring-2 ring-indigo-500' : 'border-gray-500 hover:border-white'}`}
                        style={{ backgroundColor: el.style?.color || 'white' }}
                    />

                    {/* Dropdown */}
                    {isColorPickerOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[1001]">
                            <ColorPicker id={el.id} current={el.style?.color} updateElementStyle={updateElementStyle} setActiveColorPickerId={setActiveColorPickerId} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContextMenu;
