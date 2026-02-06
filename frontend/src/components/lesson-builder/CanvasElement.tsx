import React, { useEffect, useRef } from 'react';
import { RefreshCw, Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import CodeWidget from './CodeWidget';
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
            {isSelected && !isEditing && el.type !== 'arrow' && (
                <div className={`absolute -inset-1 border-2 border-indigo-500 pointer-events-none z-50 ${!showHandles ? 'opacity-50 border-dashed' : ''}`}>
                    {/* Rotate Handle */}
                    {showHandles && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-indigo-500 rounded-full flex items-center justify-center cursor-grab pointer-events-auto shadow-sm" onMouseDown={(e) => handleMouseDown(e, el.id, 'rotate')}>
                            <RefreshCw className="w-3 h-3 text-indigo-600" />
                        </div>
                    )}
                    {/* Edge Resize Handles (Invisible Bars) */}
                    {showHandles && (
                        <>
                            {/* N - Top Edge */}
                            <div
                                className="absolute left-0 -top-1 w-full h-2 cursor-n-resize z-50 pointer-events-auto"
                                onMouseDown={(e) => handleMouseDown(e, el.id, 'resize', 'n')}
                            />
                            {/* S - Bottom Edge */}
                            <div
                                className="absolute left-0 -bottom-1 w-full h-2 cursor-s-resize z-50 pointer-events-auto"
                                onMouseDown={(e) => handleMouseDown(e, el.id, 'resize', 's')}
                            />
                            {/* W - Left Edge */}
                            <div
                                className="absolute -left-1 top-0 w-2 h-full cursor-w-resize z-50 pointer-events-auto"
                                onMouseDown={(e) => handleMouseDown(e, el.id, 'resize', 'w')}
                            />
                            {/* E - Right Edge */}
                            <div
                                className="absolute -right-1 top-0 w-2 h-full cursor-e-resize z-50 pointer-events-auto"
                                onMouseDown={(e) => handleMouseDown(e, el.id, 'resize', 'e')}
                            />
                        </>
                    )}

                    {/* Corner Resize Handles (Visible Circles) */}
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

            {/* ARROW ELEMENT */}
            {el.type === 'arrow' && el.arrowConfig && (
                <div className="w-full h-full pointer-events-none">
                    <svg className="w-full h-full overflow-visible pointer-events-none">
                        <defs>
                            <marker id={`arrowhead-${el.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                                <polygon points="0 0, 10 3.5, 0 7" fill={el.style?.color || '#374151'} />
                            </marker>
                        </defs>
                        {(() => {
                            const s = el.arrowConfig.start;
                            const e = el.arrowConfig.end;
                            let d = `M ${s.x} ${s.y} L ${e.x} ${e.y}`; // Default Straight

                            if (el.arrowConfig.arrowStyle === 'curved') {
                                // S-Curve Logic
                                const dist = Math.abs(e.x - s.x);
                                const cp1 = { x: s.x + dist * 0.5, y: s.y };
                                const cp2 = { x: e.x - dist * 0.5, y: e.y };

                                // Note: This matches the user's "Kıvrımlı" which is a smooth horizontal S-curve usually
                                d = `M ${s.x} ${s.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${e.x} ${e.y}`;
                            } else if (el.arrowConfig.arrowStyle === 'elbow') {
                                // Elbow Logic with Standoffs & Smart Routing
                                const startSide = el.arrowConfig.startSide;
                                const endSide = el.arrowConfig.endSide;

                                const startMargin = el.arrowConfig.customStartOffset ?? 30;
                                const endMargin = el.arrowConfig.customEndOffset ?? 30;

                                // 1. Calculate Standoff Points (p1, p2)
                                let p1 = { ...s };
                                if (startSide === 'top') p1.y -= startMargin;
                                else if (startSide === 'bottom') p1.y += startMargin;
                                else if (startSide === 'left') p1.x -= startMargin;
                                else if (startSide === 'right') p1.x += startMargin;

                                let p2 = { ...e };
                                if (endSide === 'top') p2.y -= endMargin;
                                else if (endSide === 'bottom') p2.y += endMargin;
                                else if (endSide === 'left') p2.x -= endMargin;
                                else if (endSide === 'right') p2.x += endMargin;

                                // 2. Determine Axis
                                const isStartVertical = startSide === 'top' || startSide === 'bottom';
                                const isEndVertical = endSide === 'top' || endSide === 'bottom';

                                let midPath = '';
                                let midHandlePos: { x: number, y: number } | null = null;
                                let midCursor = 'cursor-pointer';

                                if (isStartVertical === isEndVertical) {
                                    // Same Axis (V-V or H-H)
                                    if (startSide === endSide) {
                                        // Same Direction (U-Turn)
                                        if (isStartVertical) {
                                            // Top-Top / Bottom-Bottom -> Horizontal Channel
                                            const defaultChannel = startSide === 'top' ? Math.min(p1.y, p2.y) - 30 : Math.max(p1.y, p2.y) + 30;
                                            const channel = el.arrowConfig.customChannel ?? defaultChannel;

                                            midPath = `L ${p1.x} ${channel} L ${p2.x} ${channel}`;
                                            midHandlePos = { x: (p1.x + p2.x) / 2, y: channel };
                                            midCursor = 'cursor-ns-resize';
                                        } else {
                                            // Left-Left / Right-Right -> Vertical Channel
                                            const defaultChannel = startSide === 'left' ? Math.min(p1.x, p2.x) - 30 : Math.max(p1.x, p2.x) + 30;
                                            const channel = el.arrowConfig.customChannel ?? defaultChannel;

                                            midPath = `L ${channel} ${p1.y} L ${channel} ${p2.y}`;
                                            midHandlePos = { x: channel, y: (p1.y + p2.y) / 2 };
                                            midCursor = 'cursor-ew-resize';
                                        }
                                    } else {
                                        // Opposite Direction (Z-Shape)
                                        if (isStartVertical) {
                                            // V-V Opposite -> Horizontal Channel
                                            const defaultChannel = (p1.y + p2.y) / 2;
                                            const channel = el.arrowConfig.customChannel ?? defaultChannel;

                                            midPath = `L ${p1.x} ${channel} L ${p2.x} ${channel}`;
                                            midHandlePos = { x: (p1.x + p2.x) / 2, y: channel };
                                            midCursor = 'cursor-ns-resize';
                                        } else {
                                            // H-H Opposite -> Vertical Channel
                                            const defaultChannel = (p1.x + p2.x) / 2;
                                            const channel = el.arrowConfig.customChannel ?? defaultChannel;

                                            midPath = `L ${channel} ${p1.y} L ${channel} ${p2.y}`;
                                            midHandlePos = { x: channel, y: (p1.y + p2.y) / 2 };
                                            midCursor = 'cursor-ew-resize';
                                        }
                                    }
                                } else {
                                    // Orthogonal (L-Shape) - Start V, End H (or vice versa)
                                    // No middle channel for L-shape usually, unless we want to force a Z-shape?
                                    // The user might want to adjust the CORNER.
                                    // The corner is at Intersection.
                                    // If we implement 'breaks', we might convert L to Stepped.
                                    // For now, let's keep L-shape simple unless requested.
                                    if (isStartVertical) midPath = `L ${p1.x} ${p2.y}`;
                                    else midPath = `L ${p2.x} ${p1.y}`;
                                }

                                d = `M ${s.x} ${s.y} L ${p1.x} ${p1.y} ${midPath} L ${p2.x} ${p2.y} L ${e.x} ${e.y}`;

                                // Render Handles if selected
                                if (isSelected) {
                                    return (
                                        <>
                                            <path
                                                d={d}
                                                stroke={el.style?.color || '#374151'}
                                                strokeWidth={el.style?.borderWidth || 4}
                                                fill="none"
                                                markerEnd={`url(#arrowhead-${el.id})`}
                                                className="pointer-events-auto cursor-pointer"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                            {/* Start Offset Handle (p1) */}
                                            <circle cx={p1.x} cy={p1.y} r={5} fill="#fff" stroke="#3b82f6" strokeWidth={2}
                                                className={`pointer-events-auto ${isStartVertical ? 'cursor-ns-resize' : 'cursor-ew-resize'}`}
                                                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 'arrow-start-offset'); }}
                                            />

                                            {/* Middle Channel Handle */}
                                            {midHandlePos && (
                                                <circle cx={midHandlePos.x} cy={midHandlePos.y} r={5} fill="#fff" stroke="#3b82f6" strokeWidth={2}
                                                    className={`pointer-events-auto ${midCursor}`}
                                                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 'arrow-channel'); }}
                                                />
                                            )}

                                            {/* End Offset Handle (p2) */}
                                            <circle cx={p2.x} cy={p2.y} r={5} fill="#fff" stroke="#3b82f6" strokeWidth={2}
                                                className={`pointer-events-auto ${isEndVertical ? 'cursor-ns-resize' : 'cursor-ew-resize'}`}
                                                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 'arrow-end-offset'); }}
                                            />
                                        </>
                                    );
                                }
                            }

                            return (
                                <path
                                    d={d}
                                    stroke={el.style?.color || '#374151'}
                                    strokeWidth={el.style?.borderWidth || 4}
                                    fill="none"
                                    markerEnd={`url(#arrowhead-${el.id})`}
                                    className="pointer-events-auto cursor-pointer"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            );
                        })()}
                    </svg>

                    {/* Arrow Handles */}
                    {isSelected && !isEditing && (
                        <>
                            {/* Start Handle */}
                            <div
                                className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full pointer-events-auto cursor-move z-50 shadow-sm"
                                style={{ left: el.arrowConfig.start.x - 8, top: el.arrowConfig.start.y - 8 }}
                                onMouseDown={(e) => handleMouseDown(e, el.id, 'resize', 'start')}
                            />
                            {/* End Handle */}
                            <div
                                className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full pointer-events-auto cursor-move z-50 shadow-sm"
                                style={{ left: el.arrowConfig.end.x - 8, top: el.arrowConfig.end.y - 8 }}
                                onMouseDown={(e) => handleMouseDown(e, el.id, 'resize', 'end')}
                            />
                        </>
                    )}
                </div>
            )}

            {/* CONTENT */}
            <div
                className={`w-full h-full ${el.type === 'draw' || el.type === 'arrow' || (el.type === 'shape' && el.style?.borderPosition === 'outside') ? '' : 'overflow-hidden'}`}
                onDoubleClick={(e) => {
                    if (['text', 'sticky', 'code', 'video'].includes(el.type)) {
                        e.stopPropagation(); setEditingElementId(el.id);
                    }
                }}
            >
                {el.type === 'shape' && (
                    <div className={`w-full h-full flex ${el.style?.verticalAlign === 'top' ? 'items-start' : el.style?.verticalAlign === 'bottom' ? 'items-end' : 'items-center'} justify-center ${el.shapeType === 'circle' ? 'rounded-full' : ''}`}
                        style={{
                            backgroundColor: el.style?.backgroundColor,
                            borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : undefined,
                            borderWidth: (!el.style?.borderPosition || el.style?.borderPosition === 'inside') ? (el.style?.borderWidth !== undefined ? `${el.style.borderWidth}px` : '4px') : '0px',
                            borderColor: el.style?.borderColor || '#1f2937',
                            boxShadow: el.style?.borderPosition === 'outside' && el.style?.borderWidth ? `0 0 0 ${el.style.borderWidth}px ${el.style.borderColor || '#1f2937'}` : undefined,
                            padding: '10px'
                        }}>
                        <div
                            ref={contentRef}
                            className={`w-full min-h-[1.2em] outline-none ${isEditing ? 'cursor-text select-text' : 'cursor-default select-none'} ${el.style?.textAlign === 'left' ? 'text-left' :
                                el.style?.textAlign === 'right' ? 'text-right' :
                                    el.style?.textAlign === 'center' ? 'text-center' : 'text-center'
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
                {el.type === 'text' && (
                    <div className={`w-full h-full flex ${el.style?.verticalAlign === 'top' ? 'items-start' :
                        el.style?.verticalAlign === 'bottom' ? 'items-end' :
                            'items-center'
                        }`}>
                        <div
                            ref={contentRef}
                            className={`w-full outline-none ${isEditing ? 'cursor-text select-text' : 'cursor-default select-none'} ${el.style?.textAlign === 'left' ? 'text-left' :
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
                            className={`w-full outline-none ${isEditing ? 'cursor-text select-text' : 'cursor-default select-none'} ${el.style?.textAlign === 'left' ? 'text-left' :
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
                    <CodeWidget
                        el={el}
                        isEditing={isEditing}
                        updateElement={updateElement}
                        setEditingElementId={setEditingElementId}
                        handleMouseDown={handleMouseDown}
                    />
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
