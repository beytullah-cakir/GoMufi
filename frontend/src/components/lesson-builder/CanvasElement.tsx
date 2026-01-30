import React, { useEffect, useRef } from 'react';
import { RefreshCw, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
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
    showHandles?: boolean;
}

const CanvasElement: React.FC<CanvasElementProps> = ({
    el, isSelected, isEditing,
    setEditingElementId, updateElement, handleMouseDown,
    showHandles = true
}) => {
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isEditing && contentRef.current) {
            contentRef.current.focus();
            // Optional: Select all text or place cursor at end
            const range = document.createRange();
            range.selectNodeContents(contentRef.current);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }, [isEditing]);

    const htmlContent = React.useMemo(() => ({ __html: el.content }), [el.content]);

    // Move commonStyle definition outside or useMemo
    const style = React.useMemo(() => ({
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
        textAlign: el.style?.textAlign || 'center',
        // For sticky specifics, we can merge later or here?
        // Let's keep it general here as it was commonStyle
    } as React.CSSProperties), [el.style]);

    const getYoutubeId = (url: string) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    return (
        <div
            className="absolute group"
            style={{
                left: el.x || 0, top: el.y || 0,
                width: el.width || 100, height: el.height || 100,
                transform: `rotate(${el.rotation || 0}deg)`,
                zIndex: isSelected ? 50 : 10,
                pointerEvents: el.type === 'draw' ? 'none' : 'auto'
            }}
            onMouseDown={(e) => {
                if (isEditing) {
                    e.stopPropagation();
                    return;
                }
                handleMouseDown(e, el.id, 'drag');
            }}
            data-id={el.id}
            data-type={el.type}
        >
            {/* SELECTION OVERLAY */}
            {isSelected && !isEditing && (
                <div className={`absolute -inset-1 border-2 border-indigo-500 pointer-events-none z-50 ${!showHandles ? 'opacity-50 border-dashed' : ''}`}>
                    {/* Rotate Handle */}
                    {showHandles && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-indigo-500 rounded-full flex items-center justify-center cursor-grab pointer-events-auto shadow-sm" onMouseDown={(e) => handleMouseDown(e, el.id, 'rotate')}>
                            <RefreshCw className="w-3 h-3 text-indigo-600" />
                        </div>
                    )}
                    {/* Resize Handles */}
                    {showHandles && ['nw', 'ne', 'sw', 'se'].map(pos => (
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
                </div>
            )}

            {/* CONTENT */}
            <div
                className={`w-full h-full ${el.type === 'draw' ? '' : 'overflow-hidden'}`}
                onDoubleClick={(e) => {
                    if (['text', 'sticky', 'code', 'video'].includes(el.type)) {
                        e.stopPropagation(); setEditingElementId(el.id);
                    }
                }}
            >
                {el.type === 'shape' && (
                    <div className={`w-full h-full ${el.shapeType === 'circle' ? 'rounded-full' : ''}`}
                        style={{
                            backgroundColor: el.style?.backgroundColor,
                            borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : undefined,
                            borderWidth: el.style?.borderWidth ? `${el.style.borderWidth}px` : '4px',
                            borderColor: el.style?.borderColor || '#1f2937'
                        }}></div>
                )}
                {el.type === 'text' && (
                    <div className={`w-full h-full flex ${el.style?.verticalAlign === 'top' ? 'items-start' :
                        el.style?.verticalAlign === 'bottom' ? 'items-end' :
                            'items-center'
                        }`}>
                        <div
                            ref={contentRef}
                            className={`w-full outline-none cursor-text select-text ${el.style?.textAlign === 'left' ? 'text-left' :
                                el.style?.textAlign === 'right' ? 'text-right' :
                                    'text-center'
                                }`}
                            contentEditable={isEditing}
                            suppressContentEditableWarning
                            onMouseDown={(e) => {
                                if (isEditing) e.stopPropagation();
                            }}
                            onBlur={(e) => { updateElement(el.id, { content: e.currentTarget.innerHTML }); setEditingElementId(null); }}
                            style={style}
                            dangerouslySetInnerHTML={htmlContent}
                        />
                    </div>
                )}
                {el.type === 'sticky' && (
                    <div
                        className={`w-full h-full shadow-lg p-4 flex ${el.style?.verticalAlign === 'top' ? 'items-start' :
                            el.style?.verticalAlign === 'bottom' ? 'items-end' :
                                'items-center'
                            }`}
                        style={{ backgroundColor: el.style?.backgroundColor }}
                    >
                        <div
                            ref={contentRef}
                            className={`w-full outline-none cursor-text select-text ${el.style?.textAlign === 'left' ? 'text-left' :
                                el.style?.textAlign === 'right' ? 'text-right' :
                                    'text-center'
                                }`}
                            contentEditable={isEditing}
                            suppressContentEditableWarning
                            onMouseDown={(e) => {
                                if (isEditing) e.stopPropagation();
                            }}
                            onBlur={(e) => { updateElement(el.id, { content: e.currentTarget.innerHTML }); setEditingElementId(null); }}
                            style={style}
                            dangerouslySetInnerHTML={htmlContent}
                        />
                    </div>
                )}
                {el.type === 'code' && (
                    <div className="w-full h-full bg-[#1e1e1e] rounded-xl flex flex-col font-mono text-sm border-4 border-gray-800 overflow-hidden">
                        <div className="bg-[#252526] px-2 py-1 flex gap-1"><div className="w-2 h-2 rounded bg-red-500" /><div className="w-2 h-2 rounded bg-yellow-500" /></div>
                        <div ref={contentRef} contentEditable={isEditing} suppressContentEditableWarning className={`p-2 flex-1 text-gray-100 outline-none select-text ${!isEditing && 'pointer-events-none'}`} onBlur={(e) => { updateElement(el.id, { content: e.currentTarget.innerText }); setEditingElementId(null); }}>{el.content}</div>
                    </div>
                )}
                {(el.type === 'image' || el.type === 'video') && (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden"
                        style={{
                            borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : '16px',
                            borderWidth: (el.style?.borderWidth !== undefined) ? `${el.style.borderWidth}px` : (el.type === 'image' ? '2px' : '2px'),
                            borderColor: el.style?.borderColor || '#d1d5db',
                            borderStyle: el.src ? 'solid' : 'dashed'
                        }}
                    >
                        {el.type === 'image' ? (
                            el.src ? <img src={el.src} className="w-full h-full object-cover pointer-events-none" /> : <ImageIcon className="text-gray-300 w-10 h-10" />
                        ) : (
                            el.src ? (
                                getYoutubeId(el.src) ? (
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        src={`https://www.youtube.com/embed/${getYoutubeId(el.src)}`}
                                        title="YouTube video player"
                                        frameBorder="0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                        className={isEditing ? "pointer-events-auto" : "pointer-events-none"}
                                    />
                                ) : (
                                    <video src={el.src} controls className={`w-full h-full object-cover ${isEditing ? "pointer-events-auto" : "pointer-events-none"}`} />
                                )
                            ) : (
                                <VideoIcon className="text-gray-500 w-10 h-10" />
                            )
                        )}
                    </div>
                )}
                {el.type === 'draw' && (
                    <div className="w-full h-full">
                        <svg className="w-full h-full overflow-visible">
                            <path
                                className="pointer-events-auto cursor-pointer"
                                d={el.content}
                                fill="none"
                                stroke={el.style?.borderColor || '#1f2937'}
                                strokeWidth={el.style?.borderWidth || 3}
                                strokeOpacity={el.style?.opacity ?? 1}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CanvasElement;
