import React from 'react';
import { RefreshCw, Image as ImageIcon, Trash2 } from 'lucide-react';
import type { SlideElement, ElementStyle } from './types';

interface CanvasElementProps {
    el: SlideElement;
    isSelected: boolean;
    isEditing: boolean;
    setEditingElementId: (id: string | null) => void;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    updateElementStyle: (id: string, style: Partial<ElementStyle>) => void;
    deleteElement: (id: string) => void;
    handleMouseDown: (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate', handle?: string) => void;
}

const CanvasElement: React.FC<CanvasElementProps> = ({
    el, isSelected, isEditing,
    setEditingElementId, updateElement, updateElementStyle, deleteElement, handleMouseDown
}) => {

    const commonStyle = (el: SlideElement): React.CSSProperties => ({
        fontWeight: el.style?.bold ? 'bold' : 'normal',
        fontStyle: el.style?.italic ? 'italic' : 'normal',
        textDecoration: el.style?.underline ? 'underline' : 'none',
        color: el.style?.color,
        fontSize: `${el.style?.fontSize || 24}px`,
        fontFamily: el.style?.fontFamily === 'Inter' ? '"Inter", sans-serif' :
            el.style?.fontFamily === 'Fredoka' ? '"Fredoka", sans-serif' :
                el.style?.fontFamily === 'Bangers' ? '"Bangers", cursive' :
                    el.style?.fontFamily === 'Comic Neue' ? '"Comic Neue", cursive' :
                        el.style?.fontFamily === 'Pacifico' ? '"Pacifico", cursive' :
                            el.style?.fontFamily === 'Fira Code' ? '"Fira Code", monospace' :
                                '"Patrick Hand", cursive',
        textAlign: el.style?.textAlign || 'center'
    });

    return (
        <div
            className="absolute group"
            style={{
                left: el.x || 0, top: el.y || 0,
                width: el.width || 100, height: el.height || 100,
                transform: `rotate(${el.rotation || 0}deg)`,
                zIndex: isSelected ? 50 : 10
            }}
            onMouseDown={(e) => handleMouseDown(e, el.id, 'drag')}
        >
            {/* SELECTION OVERLAY */}
            {isSelected && !isEditing && (
                <div className="absolute -inset-1 border-2 border-indigo-500 pointer-events-none z-50">
                    {/* Rotate Handle (Moved to Bottom) */}
                    <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-indigo-500 rounded-full flex items-center justify-center cursor-grab pointer-events-auto shadow-sm" onMouseDown={(e) => handleMouseDown(e, el.id, 'rotate')}>
                        <RefreshCw className="w-3 h-3 text-indigo-600" />
                    </div>
                    {/* Resize Handles */}
                    {['nw', 'ne', 'sw', 'se'].map(pos => (
                        <div
                            key={pos}
                            className={`absolute w-3 h-3 bg-white border-2 border-indigo-500 rounded-full pointer-events-auto z-50
                                ${pos === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' : ''}
                                ${pos === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' : ''}
                                ${pos === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : ''}
                                ${pos === 'se' ? '-bottom-1.5 -right-1.5 cursor-se-resize' : ''}
                            `}
                            onMouseDown={(e) => handleMouseDown(e, el.id, 'resize', pos)}
                        />
                    ))}

                    {/* Quick Tools (Delete & Color for Shapes) - Moved to Top */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white rounded-lg shadow-xl border border-gray-200 p-1 flex items-center gap-1 pointer-events-auto">

                        {/* BG Color for Shapes/Sticky */}
                        {['sticky', 'shape'].includes(el.type) && (
                            <div className="w-6 h-6 rounded overflow-hidden relative border border-gray-600 cursor-pointer hover:border-white">
                                <input
                                    type="color"
                                    className="absolute inset-0 w-[150%] h-[150%] -left-1/4 -top-1/4 p-0 cursor-pointer"
                                    value={el.style?.backgroundColor || '#ffffff'}
                                    onChange={(e) => updateElementStyle(el.id, { backgroundColor: e.target.value })}
                                    onMouseDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        )}

                        <div className="w-[1px] h-6 bg-gray-700 mx-1" />
                        <button onMouseDown={(e) => { e.stopPropagation(); deleteElement(el.id); }} className="text-red-400 hover:bg-red-900/40 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                </div>
            )}

            {/* CONTENT */}
            <div
                className="w-full h-full overflow-hidden"
                onDoubleClick={(e) => {
                    if (['text', 'sticky', 'code'].includes(el.type)) {
                        e.stopPropagation(); setEditingElementId(el.id);
                    }
                }}
            >
                {el.type === 'shape' && (
                    <div className={`w-full h-full border-4 border-gray-800 ${el.shapeType === 'circle' ? 'rounded-full' : 'rounded-2xl'}`} style={{ backgroundColor: el.style?.backgroundColor }}></div>
                )}
                {el.type === 'text' && (
                    <div
                        className={`w-full h-full flex items-center justify-center outline-none ${!isEditing && 'pointer-events-none'}`}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={(e) => { updateElement(el.id, { content: e.currentTarget.innerText }); setEditingElementId(null); }}
                        style={commonStyle(el)}
                    >{el.content}</div>
                )}
                {el.type === 'sticky' && (
                    <div
                        className={`w-full h-full shadow-lg p-4 flex items-center justify-center outline-none ${!isEditing && 'pointer-events-none'}`}
                        style={{ backgroundColor: el.style?.backgroundColor, ...commonStyle(el) }}
                        contentEditable={isEditing}
                        suppressContentEditableWarning
                        onBlur={(e) => { updateElement(el.id, { content: e.currentTarget.innerText }); setEditingElementId(null); }}
                    >{el.content}</div>
                )}
                {el.type === 'code' && (
                    <div className="w-full h-full bg-[#1e1e1e] rounded-xl flex flex-col font-mono text-sm border-4 border-gray-800 overflow-hidden">
                        <div className="bg-[#252526] px-2 py-1 flex gap-1"><div className="w-2 h-2 rounded bg-red-500" /><div className="w-2 h-2 rounded bg-yellow-500" /></div>
                        <div contentEditable={isEditing} suppressContentEditableWarning className={`p-2 flex-1 text-gray-100 outline-none ${!isEditing && 'pointer-events-none'}`} onBlur={(e) => { updateElement(el.id, { content: e.currentTarget.innerText }); setEditingElementId(null); }}>{el.content}</div>
                    </div>
                )}
                {(el.type === 'image' || el.type === 'video') && (
                    <div className="w-full h-full bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center">
                        {el.src ? <img src={el.src} className="w-full h-full object-cover pointer-events-none" /> : <ImageIcon className="text-gray-300 w-10 h-10" />}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CanvasElement;
