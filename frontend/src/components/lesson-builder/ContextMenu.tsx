import React, { useState } from 'react';
import { Bold, Italic, Underline, Grid, Trash2, Frame, AlignLeft, AlignCenter, AlignRight, ArrowUpToLine, ArrowDownToLine, FoldVertical, Minus, Spline, CornerDownRight } from 'lucide-react';
import type { SlideElement, ElementStyle } from './types';

interface ColorPickerProps {
    id: string; // ID of the representative element (or "multi")
    current?: string;
    onUpdate: (color: string) => void;
    setActiveColorPickerId: (id: string | null) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ current, onUpdate, setActiveColorPickerId }) => {
    const colors = [
        '#1f2937', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#881337', '#78350f'
    ];
    return (
        <div className="flex flex-wrap gap-1 w-40 p-2 bg-gray-800 rounded-xl shadow-xl border border-gray-600">
            {colors.map(c => (
                <button
                    key={c}
                    onClick={() => { onUpdate(c); setActiveColorPickerId(null); }}
                    className="w-5 h-5 rounded-full border border-gray-600 hover:scale-125 transition-transform"
                    style={{ backgroundColor: c }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                />
            ))}
            <div className="w-full h-[1px] bg-gray-700 my-1" />
            <label className="flex items-center gap-2 text-xs text-gray-400 w-full cursor-pointer hover:text-white relative">
                <Grid className="w-4 h-4" />
                <span>Custom</span>
                <input
                    type="color"
                    value={current || '#000000'}
                    onChange={(e) => { onUpdate(e.target.value); setActiveColorPickerId(null); }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onMouseDown={(e) => e.stopPropagation()}
                />
            </label>
        </div>
    );
};

interface ContextMenuProps {
    elements: SlideElement[];
    scale: number;
    canvasRect: DOMRect | null;
    activeColorPickerId: string | null;
    setActiveColorPickerId: (id: string | null) => void;
    updateElementStyle: (id: string, style: Partial<ElementStyle>) => void;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    deleteElement: (id: string) => void;
    editingElementId: string | null;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ elements, scale, canvasRect, activeColorPickerId, setActiveColorPickerId, updateElementStyle, updateElement, deleteElement, editingElementId }) => {

    if (!canvasRect || elements.length === 0) return null;

    // -- Helper: Bulk Updates --
    const bulkUpdateStyle = (updates: Partial<ElementStyle>) => {
        elements.forEach(el => updateElementStyle(el.id, updates));
    };

    const bulkUpdateBorderColor = (color: string) => {
        elements.forEach(el => updateElementStyle(el.id, { borderColor: color }));
    };

    const bulkDelete = () => {
        elements.forEach(el => deleteElement(el.id));
    };

    // -- Positioning --
    // Calculate bounding box of all elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach(el => {
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + el.width);
        maxY = Math.max(maxY, el.y + el.height);
    });

    const centerX = canvasRect.left + (minX + (maxX - minX) / 2) * scale;
    const topY = canvasRect.top + minY * scale;

    // -- Determine Primary / Mixed Types --
    const allCode = elements.every(el => el.type === 'code');
    const allText = elements.every(el => ['text', 'sticky', 'shape'].includes(el.type)); // Removed code from here
    const isSingle = elements.length === 1;
    const hasMedia = elements.some(el => ['image', 'video'].includes(el.type));
    const allBorders = elements.every(el => ['shape', 'image', 'video'].includes(el.type));

    // Representative Element (for default values)
    const firstEl = elements[0];

    // Menus
    const [isBorderMenuOpen, setIsBorderMenuOpen] = useState(false);
    const [isAlignMenuOpen, setIsAlignMenuOpen] = useState(false);

    return (
        <div
            className="fixed z-[1000] flex flex-col gap-2 animate-in fade-in zoom-in-95"
            style={{
                left: centerX,
                top: topY - 80, // Fixed offset above group
                transform: 'translateX(-50%)',
                transformOrigin: 'bottom center'
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
        >
            <div className="bg-gray-900 text-white p-2 rounded-xl shadow-2xl flex items-center gap-2 border border-gray-700 select-none">

                {/* Theme Selector (Code Only) */}
                {allCode && (
                    <div className="flex bg-gray-800 rounded border border-gray-600 p-0.5">
                        <button
                            onClick={() => updateElement(firstEl.id, { codeConfig: { ...firstEl.codeConfig, theme: 'dark' } })}
                            className={`p-1 rounded ${(!firstEl.codeConfig?.theme || firstEl.codeConfig.theme === 'dark') ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-gray-900 border border-gray-500" />
                        </button>
                        <button
                            onClick={() => updateElement(firstEl.id, { codeConfig: { ...firstEl.codeConfig, theme: 'light' } })}
                            className={`p-1 rounded ${firstEl.codeConfig?.theme === 'light' ? 'bg-gray-200 text-gray-900' : 'text-gray-400 hover:text-white'}`}
                        >
                            <div className="w-4 h-4 rounded-full bg-white border border-gray-300" />
                        </button>
                    </div>
                )}

                {/* Font Family (Text & Code) */}
                {(allText || allCode) && (
                    <select
                        className="bg-gray-800 text-xs rounded border border-gray-600 px-2 h-8 outline-none cursor-pointer hover:bg-gray-700 transition-colors"
                        value={firstEl.style?.fontFamily || (allCode ? 'Menlo' : 'Fredoka')}
                        onChange={(e) => bulkUpdateStyle({ fontFamily: e.target.value as any })}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {!allCode && (
                            <>
                                <option value="Fredoka">Fredoka</option>
                                <option value="Patrick Hand">El Yazısı</option>
                                <option value="Comic Neue">Komik</option>
                                <option value="Bangers">Bangers</option>
                                <option value="Pacifico">İtalik</option>
                                <option value="Inter">Modern</option>
                            </>
                        )}
                        <option value="Fira Code">Fira Code</option>
                        <option value="Menlo">Menlo</option>
                        <option value="Monaco">Monaco</option>
                        <option value="'Courier New'">Courier New</option>
                        <option value="monospace">Monospace</option>
                    </select>
                )}

                {/* Font Size */}
                {(allText || allCode) && (
                    <div className="flex items-center bg-gray-800 rounded border border-gray-600">
                        <button onMouseDown={(e) => { e.stopPropagation(); elements.forEach(el => updateElementStyle(el.id, { fontSize: Math.max(8, (el.style?.fontSize || 24) - 2) })) }} className="w-6 h-8 hover:bg-gray-700 flex items-center justify-center">-</button>
                        <span className="w-8 text-center text-xs tabular-nums">{firstEl.style?.fontSize || 24}</span>
                        <button onMouseDown={(e) => { e.stopPropagation(); elements.forEach(el => updateElementStyle(el.id, { fontSize: (el.style?.fontSize || 24) + 2 })) }} className="w-6 h-8 hover:bg-gray-700 flex items-center justify-center">+</button>
                    </div>
                )}

                {/* B/I/U */}
                {(allText || allCode) && (
                    <div className="flex gap-0.5">
                        <button onMouseDown={(e) => {
                            e.preventDefault(); // Prevent losing focus
                            e.stopPropagation();
                            /* Code widgets handle their own bold via style prop, not execCommand */
                            if (allCode) {
                                bulkUpdateStyle({ bold: !firstEl.style?.bold });
                            } else if (editingElementId === firstEl.id) {
                                document.execCommand('bold');
                            } else {
                                bulkUpdateStyle({ bold: !firstEl.style?.bold });
                            }
                        }} className={`p-1.5 rounded hover:bg-gray-700 ${firstEl.style?.bold ? 'text-yellow-400 bg-gray-800' : 'text-gray-300'}`}><Bold className="w-4 h-4" /></button>

                        <button onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (editingElementId === firstEl.id) {
                                document.execCommand('italic');
                            } else {
                                bulkUpdateStyle({ italic: !firstEl.style?.italic });
                            }
                        }} className={`p-1.5 rounded hover:bg-gray-700 ${firstEl.style?.italic ? 'text-yellow-400 bg-gray-800' : 'text-gray-300'}`}><Italic className="w-4 h-4" /></button>

                        <button onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (editingElementId === firstEl.id) {
                                document.execCommand('underline');
                            } else {
                                bulkUpdateStyle({ underline: !firstEl.style?.underline });
                            }
                        }} className={`p-1.5 rounded hover:bg-gray-700 ${firstEl.style?.underline ? 'text-yellow-400 bg-gray-800' : 'text-gray-300'}`}><Underline className="w-4 h-4" /></button>
                    </div>
                )}

                {/* Text Color Picker (A-Icon) - Visible for all text-capable elements */}
                {(allText || allCode) && (
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveColorPickerId(activeColorPickerId === 'text-color' ? null : 'text-color'); }}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            className={`w-8 h-8 rounded hover:bg-gray-700 flex flex-col items-center justify-center gap-0.5 transition-colors ${activeColorPickerId === 'text-color' ? 'bg-gray-800 ring-1 ring-gray-600' : ''}`}
                            title="Text Color"
                        >
                            <span className="font-serif font-bold text-lg leading-none text-gray-200">A</span>
                            <div
                                className="w-4 h-1 rounded-full"
                                style={{ backgroundColor: firstEl.style?.color || (allCode ? '#d4d4d4' : 'black') }}
                            />
                        </button>

                        {/* Dropdown */}
                        {activeColorPickerId === 'text-color' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[1001]">
                                <ColorPicker
                                    id="text-color"
                                    current={firstEl.style?.color}
                                    onUpdate={(color) => {
                                        elements.forEach(el => {
                                            if (el.type === 'code') {
                                                updateElementStyle(el.id, { color });
                                            } else {
                                                if (editingElementId === el.id) {
                                                    document.execCommand('foreColor', false, color);
                                                } else {
                                                    // Strip existing color formatting to allow global override
                                                    let newContent = el.content;
                                                    const div = document.createElement('div');
                                                    div.innerHTML = el.content;
                                                    const styledEls = div.querySelectorAll('*');
                                                    styledEls.forEach((node) => {
                                                        if (node instanceof HTMLElement) {
                                                            node.style.removeProperty('color');
                                                            if (node.getAttribute('color')) node.removeAttribute('color');
                                                            if (!node.getAttribute('style')) node.removeAttribute('style');
                                                        }
                                                    });
                                                    newContent = div.innerHTML;

                                                    updateElement(el.id, {
                                                        content: newContent,
                                                        style: { ...el.style, color: color }
                                                    });
                                                }
                                            }
                                        });
                                    }}
                                    setActiveColorPickerId={setActiveColorPickerId}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Fill Color Picker (Bucket/Circle) - Visible for Shapes & Sticky */}
                {(elements.every(el => ['shape', 'sticky', 'circle'].includes(el.type) || (el.type === 'shape' && el.shapeType === 'circle'))) && (
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setActiveColorPickerId(activeColorPickerId === 'fill-color' ? null : 'fill-color'); }}
                            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                            className={`w-6 h-6 rounded-full border-2 transition-colors block ml-1 ${activeColorPickerId === 'fill-color' ? 'border-white ring-2 ring-indigo-500' : 'border-gray-500 hover:border-white'}`}
                            style={{ backgroundColor: firstEl.style?.backgroundColor || 'transparent' }}
                            title="Fill Color"
                        />

                        {/* Dropdown */}
                        {activeColorPickerId === 'fill-color' && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[1001]">
                                <ColorPicker
                                    id="fill-color"
                                    current={firstEl.style?.backgroundColor}
                                    onUpdate={(color) => bulkUpdateStyle({ backgroundColor: color })}
                                    setActiveColorPickerId={setActiveColorPickerId}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Alignment */}
                {allText && (
                    <>
                        <div className="w-[1px] h-6 bg-gray-700 mx-1" />
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsAlignMenuOpen(!isAlignMenuOpen); setActiveColorPickerId(null); }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className={`p-1.5 rounded hover:bg-gray-700 ${isAlignMenuOpen ? 'text-indigo-400 bg-gray-800' : 'text-gray-300'}`}
                            >
                                <AlignLeft className="w-4 h-4" />
                            </button>
                            {isAlignMenuOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[1001]">
                                    <div className="bg-gray-900 p-2 rounded-xl shadow-xl border border-gray-600 flex flex-col gap-2 w-32" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                        <div className="flex justify-between bg-gray-800 rounded p-1">
                                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => bulkUpdateStyle({ textAlign: 'left' })} className={`p-1 rounded hover:bg-gray-700 ${firstEl.style?.textAlign === 'left' ? 'text-indigo-400' : 'text-gray-400'}`}><AlignLeft className="w-4 h-4" /></button>
                                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => bulkUpdateStyle({ textAlign: 'center' })} className={`p-1 rounded hover:bg-gray-700 ${(!firstEl.style?.textAlign || firstEl.style?.textAlign === 'center') ? 'text-indigo-400' : 'text-gray-400'}`}><AlignCenter className="w-4 h-4" /></button>
                                            <button onMouseDown={(e) => e.preventDefault()} onClick={() => bulkUpdateStyle({ textAlign: 'right' })} className={`p-1 rounded hover:bg-gray-700 ${firstEl.style?.textAlign === 'right' ? 'text-indigo-400' : 'text-gray-400'}`}><AlignRight className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Border Settings (Radius, Width, Color) */}
                {allBorders && (
                    <>
                        <div className="w-[1px] h-6 bg-gray-700 mx-1" />
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsBorderMenuOpen(!isBorderMenuOpen); setActiveColorPickerId(null); }}
                                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                className={`p-1.5 rounded hover:bg-gray-700 ${isBorderMenuOpen ? 'text-indigo-400 bg-gray-800' : 'text-gray-300'}`}
                            >
                                <Frame className="w-4 h-4" />
                            </button>

                            {isBorderMenuOpen && (
                                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-[1001]">
                                    <div className="bg-gray-900 p-3 rounded-xl shadow-xl border border-gray-600 flex flex-col gap-3 w-52" onMouseDown={(e) => e.stopPropagation()}>
                                        <div className="text-xs font-semibold text-gray-400 mb-1">Border Settings</div>

                                        {/* Radius */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px] text-gray-400">
                                                <span>Roundness</span>
                                                <span>{firstEl.style?.borderRadius ?? 0}px</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="50"
                                                value={firstEl.style?.borderRadius ?? (firstEl.type === 'shape' && firstEl.shapeType === 'circle' ? 50 : 0)}
                                                onChange={(e) => bulkUpdateStyle({ borderRadius: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            />
                                        </div>

                                        {/* Width */}
                                        <div className="flex flex-col gap-1">
                                            <div className="flex justify-between text-[10px] text-gray-400">
                                                <span>Thickness</span>
                                                <span>{firstEl.style?.borderWidth ?? 0}px</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="20"
                                                value={firstEl.style?.borderWidth ?? 0}
                                                onChange={(e) => bulkUpdateStyle({ borderWidth: parseInt(e.target.value) })}
                                                className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            />
                                        </div>

                                        {/* Color */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-400">Color</span>
                                            <div className="relative">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setActiveColorPickerId(activeColorPickerId === 'multi-border' ? null : 'multi-border'); }}
                                                    className={`w-6 h-6 rounded border-2 transition-colors block ${activeColorPickerId === 'multi-border' ? 'border-white ring-2 ring-indigo-500' : 'border-gray-500 hover:border-white'}`}
                                                    style={{ backgroundColor: firstEl.style?.borderColor || 'transparent' }}
                                                />
                                                {activeColorPickerId === 'multi-border' && (
                                                    <div className="absolute top-full right-0 pt-2 z-[1002]">
                                                        <ColorPicker
                                                            id="multi-border"
                                                            current={firstEl.style?.borderColor}
                                                            onUpdate={bulkUpdateBorderColor}
                                                            setActiveColorPickerId={setActiveColorPickerId}
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

                {/* URL Input (Single Item Only) */}
                {isSingle && hasMedia && (
                    <input
                        type="text"
                        placeholder="https://..."
                        className="bg-gray-800 text-xs rounded border border-gray-600 px-2 h-8 w-40 outline-none text-white focus:border-indigo-500 transition-colors"
                        value={firstEl.src || ''}
                        onChange={(e) => updateElement(firstEl.id, { src: e.target.value })}
                        onMouseDown={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                    />
                )}

                {/* Divider & Delete */}
                <div className="w-[1px] h-6 bg-gray-700 mx-1" />

                {/* Arrow Styles */}
                {elements.every(el => el.type === 'arrow') && (
                    <>
                        <div className="flex gap-0.5">
                            <button
                                onClick={() => elements.forEach(el => updateElement(el.id, { arrowConfig: { ...el.arrowConfig!, arrowStyle: 'straight' } }))}
                                className={`p-1.5 rounded hover:bg-gray-700 ${(!firstEl.arrowConfig?.arrowStyle || firstEl.arrowConfig.arrowStyle === 'straight') ? 'text-indigo-400 bg-gray-800' : 'text-gray-300'}`}
                                title="Straight"
                            >
                                <Minus className="w-4 h-4 rotate-45" />
                            </button>
                            <button
                                onClick={() => elements.forEach(el => updateElement(el.id, { arrowConfig: { ...el.arrowConfig!, arrowStyle: 'curved' } }))}
                                className={`p-1.5 rounded hover:bg-gray-700 ${firstEl.arrowConfig?.arrowStyle === 'curved' ? 'text-indigo-400 bg-gray-800' : 'text-gray-300'}`}
                                title="Curved"
                            >
                                <Spline className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => elements.forEach(el => updateElement(el.id, { arrowConfig: { ...el.arrowConfig!, arrowStyle: 'elbow' } }))}
                                className={`p-1.5 rounded hover:bg-gray-700 ${firstEl.arrowConfig?.arrowStyle === 'elbow' ? 'text-indigo-400 bg-gray-800' : 'text-gray-300'}`}
                                title="Elbow"
                            >
                                <CornerDownRight className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="w-[1px] h-6 bg-gray-700 mx-1" />
                    </>
                )}

                <button
                    onMouseDown={(e) => { e.stopPropagation(); bulkDelete(); }}
                    className="text-red-400 hover:bg-red-900/40 p-1.5 rounded transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

export default ContextMenu;
