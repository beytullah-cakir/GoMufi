import React, { useState } from 'react';
import { Bold, Italic, Underline, Grid, Trash2, Frame, AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, ArrowDownToLine, FoldVertical } from 'lucide-react';
import type { SlideElement, ElementStyle } from './types';

interface ColorPickerProps {
    id: string;
    current?: string;
    updateElementStyle: (id: string, style: Partial<ElementStyle>) => void;
    setActiveColorPickerId: (id: string | null) => void;
    elType: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ id, current, updateElementStyle, setActiveColorPickerId, elType }) => {
    const isBorder = elType === 'border';
    const updateColor = (color: string) => {
        if (isBorder) {
            updateElementStyle(id, { borderColor: color });
        } else if (['shape', 'sticky'].includes(elType)) {
            updateElementStyle(id, { backgroundColor: color });
        } else {
            updateElementStyle(id, { color });
        }
        setActiveColorPickerId(null);
    };
    const colors = [
        '#1f2937', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#881337', '#78350f'
    ];
    return (
        <div className="flex flex-wrap gap-1 w-40 p-2 bg-gray-800 rounded-xl shadow-xl border border-gray-600">
            {colors.map(c => (
                <button
                    key={c}
                    onClick={() => updateColor(c)}
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
                    onChange={(e) => updateColor(e.target.value)}
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
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    deleteElement: (id: string) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ el, scale, canvasRect, activeColorPickerId, setActiveColorPickerId, updateElementStyle, updateElement, deleteElement }) => {

    if (!canvasRect) return null;

    const getElementScreenPos = () => {
        return {
            x: canvasRect.left + (el.x * scale) + (el.width * scale) / 2,
            y: canvasRect.top + (el.y * scale)
        };
    };

    const pos = getElementScreenPos();
    const isColorPickerOpen = activeColorPickerId === el.id;
    const [isBorderMenuOpen, setIsBorderMenuOpen] = useState(false);
    const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);

    return (
        <div
            className="fixed z-[1000] flex flex-col gap-2 animate-in fade-in zoom-in-95"
            style={{
                left: pos.x,
                top: pos.y - 80, // Fixed offset above element
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
                        style={{ backgroundColor: (['shape', 'sticky'].includes(el.type) ? el.style?.backgroundColor : el.style?.color) || 'white' }}
                    />

                    {/* Dropdown */}
                    {isColorPickerOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[1001]">
                            <ColorPicker
                                id={el.id}
                                current={(['shape', 'sticky'].includes(el.type) ? el.style?.backgroundColor : el.style?.color)}
                                updateElementStyle={updateElementStyle}
                                setActiveColorPickerId={setActiveColorPickerId}
                                elType={el.type}
                            />
                        </div>
                    )}
                </div>

                {/* Alignment (Text/Sticky only) */}
                {['text', 'sticky'].includes(el.type) && (
                    <>
                        <div className="w-[1px] h-6 bg-gray-700 mx-1" />
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsAlignMenuOpen(!isAlignMenuOpen); setActiveColorPickerId(null); }}
                                className={`p-1.5 rounded hover:bg-gray-700 ${isAlignMenuOpen ? 'text-indigo-400 bg-gray-800' : 'text-gray-300'}`}
                            >
                                <AlignLeft className="w-4 h-4" />
                            </button>
                            {isAlignMenuOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[1001]">
                                    <div className="bg-gray-900 p-2 rounded-xl shadow-xl border border-gray-600 flex flex-col gap-2 w-32" onMouseDown={(e) => e.stopPropagation()}>
                                        {/* Horizontal */}
                                        <div className="flex justify-between bg-gray-800 rounded p-1">
                                            <button onClick={() => updateElementStyle(el.id, { textAlign: 'left' })} className={`p-1 rounded hover:bg-gray-700 ${el.style?.textAlign === 'left' ? 'text-indigo-400' : 'text-gray-400'}`}><AlignLeft className="w-4 h-4" /></button>
                                            <button onClick={() => updateElementStyle(el.id, { textAlign: 'center' })} className={`p-1 rounded hover:bg-gray-700 ${(!el.style?.textAlign || el.style?.textAlign === 'center') ? 'text-indigo-400' : 'text-gray-400'}`}><AlignCenter className="w-4 h-4" /></button>
                                            <button onClick={() => updateElementStyle(el.id, { textAlign: 'right' })} className={`p-1 rounded hover:bg-gray-700 ${el.style?.textAlign === 'right' ? 'text-indigo-400' : 'text-gray-400'}`}><AlignRight className="w-4 h-4" /></button>
                                        </div>
                                        <div className="h-[1px] bg-gray-700" />
                                        {/* Vertical */}
                                        <div className="flex justify-between bg-gray-800 rounded p-1">
                                            <button onClick={() => updateElementStyle(el.id, { verticalAlign: 'top' })} className={`p-1 rounded hover:bg-gray-700 ${el.style?.verticalAlign === 'top' ? 'text-indigo-400' : 'text-gray-400'}`}><ArrowUpToLine className="w-4 h-4" /></button>
                                            <button onClick={() => updateElementStyle(el.id, { verticalAlign: 'middle' })} className={`p-1 rounded hover:bg-gray-700 ${(!el.style?.verticalAlign || el.style?.verticalAlign === 'middle') ? 'text-indigo-400' : 'text-gray-400'}`}><FoldVertical className="w-4 h-4" /></button>
                                            <button onClick={() => updateElementStyle(el.id, { verticalAlign: 'bottom' })} className={`p-1 rounded hover:bg-gray-700 ${el.style?.verticalAlign === 'bottom' ? 'text-indigo-400' : 'text-gray-400'}`}><ArrowDownToLine className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Border Settings (Radius, Width, Color) - for Shapes, Images, Videos */}
                {/* Border Settings Menu Trigger */}
                {['shape', 'image', 'video'].includes(el.type) && (
                    <>
                        <div className="w-[1px] h-6 bg-gray-700 mx-1" />
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsBorderMenuOpen(!isBorderMenuOpen); setActiveColorPickerId(null); }}
                                className={`p-1.5 rounded hover:bg-gray-700 ${isBorderMenuOpen ? 'text-indigo-400 bg-gray-800' : 'text-gray-300'}`}
                            >
                                <Frame className="w-4 h-4" />
                            </button>

                            {/* Border Settings Popup */}
                            {isBorderMenuOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[1001]">
                                    <div className="bg-gray-900 p-3 rounded-xl shadow-xl border border-gray-600 flex flex-col gap-3 w-52" onMouseDown={(e) => e.stopPropagation()}>
                                        <div className="text-xs font-semibold text-gray-400 mb-1">Border Settings</div>

                                        {/* Radius */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px] text-gray-400">
                                                <span>Roundness</span>
                                                <span>{el.style?.borderRadius ?? 0}px</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="50"
                                                value={el.style?.borderRadius ?? (el.type === 'shape' && el.shapeType === 'circle' ? 50 : 0)}
                                                onChange={(e) => updateElementStyle(el.id, { borderRadius: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            />
                                        </div>

                                        {/* Width */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px] text-gray-400">
                                                <span>Thickness</span>
                                                <span>{el.style?.borderWidth ?? 0}px</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="20"
                                                value={el.style?.borderWidth ?? 0}
                                                onChange={(e) => updateElementStyle(el.id, { borderWidth: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            />
                                        </div>

                                        {/* Color */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400">Color</span>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveColorPickerId(activeColorPickerId === `border-${el.id}` ? null : `border-${el.id}`); }}
                                                    className={`w-6 h-6 rounded border-2 transition-colors block ${activeColorPickerId === `border-${el.id}` ? 'border-white ring-2 ring-indigo-500' : 'border-gray-500 hover:border-white'}`}
                                                    style={{ backgroundColor: el.style?.borderColor || 'transparent' }}
                                                />
                                                {activeColorPickerId === `border-${el.id}` && (
                                                    <div className="absolute top-full right-0 pt-2 z-[1002]">
                                                        <ColorPicker
                                                            id={el.id}
                                                            current={el.style?.borderColor}
                                                            updateElementStyle={updateElementStyle}
                                                            setActiveColorPickerId={setActiveColorPickerId}
                                                            elType="border"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Image/Video URL Input */}
                {['image', 'video'].includes(el.type) && (
                    <input
                        type="text"
                        placeholder="https://..."
                        className="bg-gray-800 text-xs rounded border border-gray-600 px-2 h-8 w-40 outline-none text-white focus:border-indigo-500 transition-colors"
                        value={el.src || ''}
                        onChange={(e) => updateElement(el.id, { src: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()} // Prevent triggering shortcuts
                    />
                )}

                {/* Divider & Delete */}
                <div className="w-[1px] h-6 bg-gray-700 mx-1" />
                <button
                    onMouseDown={(e) => { e.stopPropagation(); deleteElement(el.id); }}
                    className="text-red-400 hover:bg-red-900/40 p-1.5 rounded transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ContextMenu;
