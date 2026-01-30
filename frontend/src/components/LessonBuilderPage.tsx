import React, { useState, useRef } from 'react';
import { Download, Upload, Home, Minus, Plus as PlusIcon } from 'lucide-react';
import type { Slide, SlideElement, ElementStyle } from './lesson-builder/types';
import Toolbar from './lesson-builder/Toolbar';
import ContextMenu from './lesson-builder/ContextMenu';
import CanvasElement from './lesson-builder/CanvasElement';

interface LessonBuilderProps {
    onExit: () => void;
}

const LessonBuilderPage: React.FC<LessonBuilderProps> = ({ onExit }) => {
    // -- State --
    const [slides, setSlides] = useState<Slide[]>([{ id: 1, elements: [] }]);
    const [currentSlideId, setCurrentSlideId] = useState<number>(1);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [scale, setScale] = useState(1);
    const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null);

    // Drag/Transform State
    const [dragState, setDragState] = useState<{
        isDragging: boolean;
        isResizing: boolean;
        isRotating: boolean;
        pendingDrag?: boolean;
        handle?: string;
        elementId?: string;
        startX: number;
        startY: number;
        initialX: number;
        initialY: number;
        initialWidth: number;
        initialHeight: number;
        initialRotation: number;
        centerX?: number;
        centerY?: number;
    }>({
        isDragging: false, isResizing: false, isRotating: false, pendingDrag: false,
        startX: 0, startY: 0, initialX: 0, initialY: 0,
        initialWidth: 0, initialHeight: 0, initialRotation: 0
    });

    const canvasRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currentSlide = slides.find(s => s.id === currentSlideId) || slides[0];

    // -- Persistence --
    const saveProject = () => {
        const data = JSON.stringify(slides, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `lesson-${Date.now()}.json`;
        a.click();
    };

    const loadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const parsed = JSON.parse(ev.target?.result as string);
                if (Array.isArray(parsed)) {
                    setSlides(parsed);
                    setCurrentSlideId(parsed[0]?.id || 1);
                }
            } catch (err) { alert("Invalid JSON"); }
        };
        reader.readAsText(file);
    };

    // -- Helpers --
    const updateElement = (id: string, updates: Partial<SlideElement>) => {
        setSlides(prev => prev.map(slide => {
            if (slide.id === currentSlideId) {
                return {
                    ...slide,
                    elements: slide.elements.map(el => el.id === id ? { ...el, ...updates } : el)
                };
            }
            return slide;
        }));
    };

    const updateElementStyle = (id: string, styleUpdates: Partial<ElementStyle>) => {
        const el = currentSlide.elements.find(e => e.id === id);
        if (!el) return;
        const newStyle = { ...el.style, ...styleUpdates };
        updateElement(id, { style: newStyle });
    };

    const deleteElement = (id: string) => {
        setSlides(prev => prev.map(slide => {
            if (slide.id === currentSlideId) {
                return { ...slide, elements: slide.elements.filter(el => el.id !== id) };
            }
            return slide;
        }));
        setSelectedElementId(null);
    };

    // -- Handlers --

    const handleToolbarDragStart = (e: React.DragEvent, type: string, extraData: any = {}) => {
        e.dataTransfer.setData('type', type);
        e.dataTransfer.setData('extra', JSON.stringify(extraData));
    };

    const handleCanvasDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const type = e.dataTransfer.getData('type');
        const extraData = JSON.parse(e.dataTransfer.getData('extra') || '{}');

        if (type) {
            const x = (e.clientX - canvasRect.left) / scale;
            const y = (e.clientY - canvasRect.top) / scale;
            const baseStyle: ElementStyle = { fontSize: 24, fontFamily: 'Fredoka' as const };

            // Sizes
            const sizes: Record<string, { w: number, h: number }> = {
                'text': { w: 200, h: 60 },
                'sticky': { w: 200, h: 200 },
                'shape': { w: 150, h: 150 },
                'code': { w: 400, h: 300 },
                'image': { w: 300, h: 200 },
                'video': { w: 400, h: 225 }
            };

            const size = sizes[type] || { w: 100, h: 100 };
            const props = {
                'text': { content: 'Double click to edit', style: baseStyle },
                'code': { content: 'print("Hello")', style: { ...baseStyle, fontFamily: 'Fira Code', fontSize: 14 } },
                'sticky': { content: 'Note...', style: { ...baseStyle, backgroundColor: '#fef3c7', fontFamily: 'Patrick Hand' } },
                'shape': { content: '', shapeType: extraData.shapeType || 'rectangle', style: { backgroundColor: '#e2e8f0' } },
                'image': { content: '' },
                'video': { content: '' }
            }[type] || {};

            const newElement: SlideElement = {
                id: Date.now().toString() + Math.random().toString().slice(2, 5), // Robust ID
                type: type as any,
                x: x - size.w / 2,
                y: y - size.h / 2,
                width: size.w,
                height: size.h,
                rotation: 0,
                ...props
            };

            setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, elements: [...s.elements, newElement] } : s));
            setSelectedElementId(newElement.id); // Triggers ContextMenu render
        }
    };

    // -- TRANSFORM LOGIC --

    const handleMouseDown = (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate', handle?: string) => {
        if (editingElementId === id && action === 'drag') return;

        e.stopPropagation();
        e.preventDefault();
        setSelectedElementId(id);
        if (action !== 'rotate') setActiveColorPickerId(null);

        const el = currentSlide.elements.find(e => e.id === id);
        if (!el) return;

        const centerX = el.x + el.width / 2;
        const centerY = el.y + el.height / 2;

        setDragState({
            isDragging: false, // Wait for threshold if dragging
            pendingDrag: action === 'drag',
            isResizing: action === 'resize',
            isRotating: action === 'rotate',
            handle,
            elementId: id,
            startX: e.clientX,
            startY: e.clientY,
            initialX: el.x,
            initialY: el.y,
            initialWidth: el.width,
            initialHeight: el.height,
            initialRotation: el.rotation || 0,
            centerX,
            centerY
        });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!dragState.elementId) return;

        const { isDragging, isResizing, isRotating, pendingDrag, startX, startY, initialX, initialY, initialWidth, initialHeight, centerX, centerY } = dragState;

        // Check drag threshold
        if (pendingDrag) {
            const dist = Math.hypot(e.clientX - startX, e.clientY - startY);
            if (dist > 5) {
                setDragState(prev => ({ ...prev, isDragging: true, pendingDrag: false }));
            } else {
                return; // Hasn't moved enough
            }
        }

        if (isDragging) {
            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;
            updateElement(dragState.elementId, { x: initialX + dx, y: initialY + dy });
        }

        if (isResizing && dragState.handle) {
            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;

            let newW = initialWidth;
            let newH = initialHeight;
            let newX = initialX;
            let newY = initialY;

            if (dragState.handle.includes('e')) newW = Math.max(20, initialWidth + dx);
            if (dragState.handle.includes('s')) newH = Math.max(20, initialHeight + dy);
            if (dragState.handle.includes('w')) {
                const w = Math.max(20, initialWidth - dx);
                newX = initialX + (initialWidth - w);
                newW = w;
            }
            if (dragState.handle.includes('n')) {
                const h = Math.max(20, initialHeight - dy);
                newY = initialY + (initialHeight - h);
                newH = h;
            }

            updateElement(dragState.elementId, { x: newX, y: newY, width: newW, height: newH });
        }

        if (isRotating && centerX !== undefined && centerY !== undefined) {
            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (!canvasRect) return;

            const currentCx = canvasRect.left + (centerX * scale);
            const currentCy = canvasRect.top + (centerY * scale);

            const angle = Math.atan2(e.clientY - currentCy, e.clientX - currentCx);
            const degree = angle * (180 / Math.PI);

            let finalRotation = degree + 90;
            if (e.shiftKey) {
                finalRotation = Math.round(finalRotation / 45) * 45;
            }

            updateElement(dragState.elementId, { rotation: finalRotation });
        }
    };

    const handleMouseUp = () => {
        setDragState(prev => ({ ...prev, isDragging: false, isResizing: false, isRotating: false, pendingDrag: false }));
    };

    return (
        <div
            className="w-full h-screen bg-[#f5f5f7] font-sans flex overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-700"
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseDown={() => {
                setSelectedElementId(null);
                setEditingElementId(null);
                setActiveColorPickerId(null);
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Fredoka:wght@300;400;500;600&family=Pacifico&family=Patrick+Hand&family=Fira+Code:wght@400;500&family=Inter:wght@400;700&display=swap');
            `}</style>

            {/* HEADER & ACTIONS */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                <button onClick={onExit} className="w-12 h-12 bg-white rounded-2xl border-2 border-b-4 border-gray-200 hover:border-gray-300 text-gray-600 flex items-center justify-center transition-all"><Home className="w-6 h-6" /></button>
            </div>
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button onClick={saveProject} className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border-2 border-b-4 border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-all"><Download className="w-5 h-5" /><span>Kaydet</span></button>
                <label className="flex items-center gap-2 px-4 py-3 bg-indigo-500 rounded-2xl border-2 border-b-4 border-indigo-700 hover:bg-indigo-600 text-white font-bold text-sm cursor-pointer transition-all shadow-indigo-200 shadow-lg"><Upload className="w-5 h-5" /><span>Yükle</span><input type="file" accept=".json" onChange={loadProject} className="hidden" ref={fileInputRef} /></label>
            </div>

            <Toolbar onDragStart={handleToolbarDragStart} />

            {/* FLOATING CONTEXT MENU */}
            {selectedElementId && !dragState.isDragging && (
                (() => {
                    const el = currentSlide.elements.find(e => e.id === selectedElementId);
                    return el ? (
                        <ContextMenu
                            el={el}
                            scale={scale}
                            canvasRect={canvasRef.current?.getBoundingClientRect() || null}
                            activeColorPickerId={activeColorPickerId}
                            setActiveColorPickerId={setActiveColorPickerId}
                            updateElementStyle={updateElementStyle}
                        />
                    ) : null;
                })()
            )}

            {/* CANVAS */}
            <div className="flex-1 overflow-auto relative bg-[#f5f5f7] flex items-center justify-center cursor-default h-full">
                <div
                    ref={canvasRef}
                    onDrop={handleCanvasDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onMouseDown={(e) => { e.stopPropagation(); setSelectedElementId(null); setEditingElementId(null); setActiveColorPickerId(null); }}
                    className="bg-white shadow-2xl relative transition-transform duration-200 origin-center select-none rounded-sm"
                    style={{ width: '1280px', height: '720px', transform: `scale(${scale})` }}
                >
                    <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '24px 24px' }} />

                    {currentSlide.elements.map(el => (
                        <CanvasElement
                            key={el.id}
                            el={el}
                            isSelected={selectedElementId === el.id}
                            isEditing={editingElementId === el.id}
                            setEditingElementId={setEditingElementId}
                            updateElement={updateElement}
                            updateElementStyle={updateElementStyle}
                            deleteElement={deleteElement}
                            handleMouseDown={handleMouseDown}
                        />
                    ))}
                </div>
            </div>

            {/* ZOOM Buttons */}
            <div className="absolute bottom-4 right-4 z-50 flex items-center bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-2 gap-2">
                <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><Minus className="w-5 h-5" /></button>
                <span className="text-xs font-black w-12 text-center text-gray-800">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><PlusIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};

export default LessonBuilderPage;
