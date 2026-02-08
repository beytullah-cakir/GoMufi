import React from 'react';
import { RefreshCw } from 'lucide-react';
import type { SlideElement } from './types';

interface SelectionOverlayProps {
    el: SlideElement;
    isEditing: boolean; // Hide overlay if editing text
    showHandles?: boolean;
    handleMouseDown: (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate', handle?: string) => void;
}

const SelectionOverlay: React.FC<SelectionOverlayProps> = ({
    el, isEditing, handleMouseDown, showHandles = true
}) => {
    if (isEditing) return null;

    // We must mimic the element's transform to position handles correctly
    // But we are rendering OUTSIDE the element.
    // So we need a container div that matches the element's position/rotation perfectly.

    return (
        <div
            className="absolute"
            style={{
                left: el.x || 0, top: el.y || 0,
                width: el.width || 100, height: el.height || 100,
                transform: `rotate(${el.rotation || 0}deg)`,
                pointerEvents: 'none', // Allow clicking through the box itself (to drag element)
                zIndex: 100 // Ensure on top!
            }}
        >
            {/* Box Border for non-arrow */}
            {el.type !== 'arrow' && (
                <div className={`absolute -inset-1 border-2 border-indigo-500 pointer-events-none ${!showHandles ? 'opacity-50 border-dashed' : ''}`}>
                    {/* Rotate Handle */}
                    {showHandles && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-indigo-500 rounded-full flex items-center justify-center cursor-grab pointer-events-auto shadow-sm"
                            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'rotate'); }}
                        >
                            <RefreshCw className="w-3 h-3 text-indigo-600" />
                        </div>
                    )}
                    {/* Resize Handles */}
                    {showHandles && (
                        <>
                            {/* Edges */}
                            <div className="absolute left-0 -top-1 w-full h-2 cursor-n-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 'n'); }} />
                            <div className="absolute left-0 -bottom-1 w-full h-2 cursor-s-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 's'); }} />
                            <div className="absolute -left-1 top-0 w-2 h-full cursor-w-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 'w'); }} />
                            <div className="absolute -right-1 top-0 w-2 h-full cursor-e-resize pointer-events-auto" onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 'e'); }} />

                            {/* Corners */}
                            {['nw', 'ne', 'sw', 'se'].map(pos => (
                                <div
                                    key={pos}
                                    className={`absolute w-3 h-3 bg-white border-2 border-indigo-500 rounded-full pointer-events-auto z-50
                                        ${pos === 'nw' ? '-top-1.5 -left-1.5 cursor-nw-resize' : ''}
                                        ${pos === 'ne' ? '-top-1.5 -right-1.5 cursor-ne-resize' : ''}
                                        ${pos === 'sw' ? '-bottom-1.5 -left-1.5 cursor-sw-resize' : ''}
                                        ${pos === 'se' ? '-bottom-1.5 -right-1.5 cursor-se-resize' : ''}
                                    `}
                                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', pos); }}
                                />
                            ))}
                        </>
                    )}
                </div>
            )}

            {/* Arrow Handles */}
            {el.type === 'arrow' && el.arrowConfig && showHandles && (
                <>
                    {/* Start Handle */}
                    <div
                        className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full pointer-events-auto cursor-move z-50 shadow-sm"
                        style={{ left: el.arrowConfig.start.x - 8, top: el.arrowConfig.start.y - 8 }}
                        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 'start'); }}
                    />
                    {/* End Handle */}
                    <div
                        className="absolute w-4 h-4 bg-white border-2 border-indigo-500 rounded-full pointer-events-auto cursor-move z-50 shadow-sm"
                        style={{ left: el.arrowConfig.end.x - 8, top: el.arrowConfig.end.y - 8 }}
                        onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, el.id, 'resize', 'end'); }}
                    />

                    {/* Smart Arrow Handles (Offset/Channel) if Arrow Style allows */}
                    {/* We need to re-calculate handle positions here or move that logic.
                        The logic for calculating mid-handle positions was inside CanvasElement's render block for SVG.
                        It is complex to duplicate.
                        
                        Strictly speaking, those handles are PART of the SVG render in CanvasElement because they depend on path data.
                        If we want them on top, we should move them here.
                        
                        However, duplicating the path calculation logic is bad.
                        Maybe we can leave the "Smart Handles" (channel/offset) inside CanvasElement IF they are clickable?
                        But if the element is behind, they will be behind.
                        
                        For now, let's just move the Start/End points which are simple coordinates.
                        The smart handles (blue dots on the line) will stay on the line. 
                        If the user wants them on top, we'd need to extract the path logic to a helper.
                        
                        Let's check CanvasElement.tsx again. The smart handles are rendered INSIDE the SVG component.
                        If I move them, I have to duplicate the math.
                        
                        For this task ("Selection Box on Front"), the main issue is usually the BORDER and CORNERS.
                        I will focus on that first. 
                        
                        Wait, the user said "outside selection box on front".
                        So the blue border and resize corners.
                        Arrow handles (start/end) are also critical.
                     */}
                </>
            )}
        </div>
    );
};

export default SelectionOverlay;
