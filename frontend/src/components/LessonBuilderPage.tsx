import React, { useState, useRef } from 'react';
import { Download, Upload, Home, Minus, Plus as PlusIcon, Trash2, Plus } from 'lucide-react';
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

    // -- Draw Tool State --
    const [activeTool, setActiveTool] = useState<'select' | 'draw'>('select');
    const [isDrawing, setIsDrawing] = useState(false);

    const [currentPathPoints, setCurrentPathPoints] = useState<{ x: number, y: number }[]>([]);
    const [brushColor, setBrushColor] = useState('#1f2937');
    const [brushSize, setBrushSize] = useState(5);
    const [brushType, setBrushType] = useState<'pen' | 'highlighter' | 'eraser'>('pen');
    const [brushOpacity, setBrushOpacity] = useState(1);

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

    const addSlide = () => {
        const newId = (slides[slides.length - 1]?.id || 0) + 1;
        setSlides(prev => [...prev, { id: newId, elements: [] }]);
        setCurrentSlideId(newId);
    };

    const deleteSlide = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (slides.length <= 1) {
            alert("Cannot delete the only slide!");
            return;
        }
        const newSlides = slides.filter(s => s.id !== id);
        setSlides(newSlides);
        if (currentSlideId === id) {
            setCurrentSlideId(newSlides[0].id);
        }
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
            const props: Partial<SlideElement> = {
                'text': { content: 'Double click to edit', style: baseStyle },
                'code': { content: 'print("Hello")', style: { ...baseStyle, fontFamily: 'Fira Code' as const, fontSize: 14 } },
                'sticky': { content: 'Note...', style: { ...baseStyle, backgroundColor: '#fef3c7', fontFamily: 'Patrick Hand' as const } },
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
                content: '',
                ...props
            };

            setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, elements: [...s.elements, newElement] } : s));
            setSelectedElementId(newElement.id); // Triggers ContextMenu render
        }
    };

    // -- TRANSFORM LOGIC --

    const handleMouseDown = (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate', handle?: string) => {
        if (activeTool === 'draw') {
            if (brushType === 'eraser') {
                e.stopPropagation();
                setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, elements: s.elements.filter(el => el.id !== id) } : s));
            }
            return; // Don't select/drag when drawing/erasing
        }
        if (editingElementId === id && action === 'drag') return;

        e.stopPropagation();
        // e.preventDefault(); // Removed to allow dblclick and focus
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
        if (!canvasRef.current) return;
        const canvasRect = canvasRef.current.getBoundingClientRect();
        const mouseX = (e.clientX - canvasRect.left) / scale;
        const mouseY = (e.clientY - canvasRect.top) / scale;

        // Drawing Logic
        if (isDrawing && activeTool === 'draw') {
            setCurrentPathPoints(prev => [...prev, { x: mouseX, y: mouseY }]);
            return;
        }

        if (brushType === 'eraser' && activeTool === 'draw' && e.buttons === 1) {
            // Eraser Logic: Delete elements on drag
            const target = document.elementFromPoint(e.clientX, e.clientY);
            const elementWrapper = target?.closest('[data-id]');
            if (elementWrapper) {
                const id = elementWrapper.getAttribute('data-id');
                const type = elementWrapper.getAttribute('data-type');
                if (id && type === 'draw') {
                    setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, elements: s.elements.filter(el => el.id !== id) } : s));
                }
            }
            return;
        }

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

            // Calculate the new rotation based on the difference from the start
            // We need to know the angle at the START of the drag to apply the delta
            // But here we are setting absolute rotation based on mouse position relative to center
            // To fix "flipping", we should probably set the rotation to (currentAngle - initialMouseAngle + initialElementRotation)

            // However, a simpler standard approach for rotation handles (which are usually at the bottom or top)
            // is to treat the handle position as the anchor.
            // If the handle is at the bottom (90 deg), and we click it, the mouse is at 90 deg.
            // If the element is 0 deg, the handle is at 90 deg.
            // If the element is 180 deg, the handle is at 270 deg (-90).

            // Let's use the delta approach for smoother non-snapping rotation
            // We need `startAngle` in state. Let's add it to `handleMouseDown` logic first.
            // actually, let's keep it simple: 
            // The handle is at the BOTTOM. So the mouse angle relative to center should correspond to the element rotation + 90.
            // So Element Rotation = Mouse Angle - 90.

            let finalRotation = degree - 90; // Correction for handle being at bottom (90 degrees)

            if (e.shiftKey) {
                finalRotation = Math.round(finalRotation / 45) * 45;
            }

            updateElement(dragState.elementId, { rotation: finalRotation });
        }
    };

    const handleMouseUp = () => {
        // Finalize Drawing
        if (isDrawing && activeTool === 'draw') {
            setIsDrawing(false);
            if (currentPathPoints.length > 2) {
                // Convert points to SVG Path
                const d = `M ${currentPathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`;

                // Calculate bounding box
                let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                currentPathPoints.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });

                const width = maxX - minX;
                const height = maxY - minY;

                // Add padding for stroke width so it doesn't get cropped
                const padding = Math.ceil(brushSize / 2) + 4;
                const finalMinX = minX - padding;
                const finalMinY = minY - padding;
                const finalWidth = width + (padding * 2);
                const finalHeight = height + (padding * 2);

                // Normalize path to new padded box
                const normalizedD = `M ${currentPathPoints.map(p => `${p.x - finalMinX} ${p.y - finalMinY}`).join(' L ')}`;

                const newEl: SlideElement = {
                    id: Date.now().toString(),
                    type: 'draw',
                    x: finalMinX,
                    y: finalMinY,
                    width: Math.max(finalWidth, 20),
                    height: Math.max(finalHeight, 20),
                    rotation: 0,
                    content: normalizedD, // Store path data here
                    style: { borderColor: brushColor, borderWidth: brushSize, opacity: brushOpacity }
                };

                setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, elements: [...s.elements, newEl] } : s));
            }
            setCurrentPathPoints([]);
        }

        setDragState(prev => ({ ...prev, isDragging: false, isResizing: false, isRotating: false, pendingDrag: false }));
    };

    return (
        <div
            className="w-full h-screen bg-[#f5f5f7] font-sans flex overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-700"
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onMouseDown={(e) => {
                if (activeTool === 'draw') {
                    if (brushType === 'eraser') return; // Prevent drawing with eraser (delete only)
                    // Drawing logic moved to child (Canvas) or handled via propagation?
                    // Actually, the main container handles the global mouse moves, but starting the drag 
                    // usually happens on the canvas. 
                    // Let's keep the start logic here for the 'empty space' clicks.
                    if (!canvasRef.current) return;
                    const canvasRect = canvasRef.current.getBoundingClientRect();
                    const mouseX = (e.clientX - canvasRect.left) / scale;
                    const mouseY = (e.clientY - canvasRect.top) / scale;
                    setIsDrawing(true);
                    setCurrentPathPoints([{ x: mouseX, y: mouseY }]);
                    setSelectedElementId(null);
                } else {
                    setSelectedElementId(null);
                    setEditingElementId(null);
                    setActiveColorPickerId(null);
                }
            }}
        >
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Fredoka:wght@300;400;500;600&family=Pacifico&family=Patrick+Hand&family=Fira+Code:wght@400;500&family=Inter:wght@400;700&display=swap');
                
                /* Custom Eraser Cursor - base64 encoded SVG */
                .cursor-eraser {
                    cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>') 0 24, auto;
                }
            `}</style>

            {/* HEADER & ACTIONS */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4">
                <button onClick={onExit} className="w-12 h-12 bg-white rounded-2xl border-2 border-b-4 border-gray-200 hover:border-gray-300 text-gray-600 flex items-center justify-center transition-all"><Home className="w-6 h-6" /></button>
            </div>
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button onClick={saveProject} className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border-2 border-b-4 border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-sm transition-all"><Download className="w-5 h-5" /><span>Kaydet</span></button>
                <label className="flex items-center gap-2 px-4 py-3 bg-indigo-500 rounded-2xl border-2 border-b-4 border-indigo-700 hover:bg-indigo-600 text-white font-bold text-sm cursor-pointer transition-all shadow-indigo-200 shadow-lg"><Upload className="w-5 h-5" /><span>Yükle</span><input type="file" accept=".json" onChange={loadProject} className="hidden" ref={fileInputRef} /></label>
            </div>

            <Toolbar
                onDragStart={handleToolbarDragStart}
                activeTool={activeTool}
                setTool={setActiveTool}
                brushColor={brushColor}
                setBrushColor={setBrushColor}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
                brushType={brushType}
                setBrushType={(type) => {
                    setBrushType(type);
                    if (type === 'pen') {
                        setBrushOpacity(1);
                        if (brushColor === '#ffffff') setBrushColor('#1f2937'); // Reset if was eraser
                    } else if (type === 'highlighter') {
                        setBrushOpacity(0.5);
                        setBrushSize(15);
                        setBrushColor('#f59e0b'); // Yellow default
                    } else if (type === 'eraser') {
                        // Eraser now acts as a delete tool
                        // We don't need to change color/opacity, just the mode
                    }
                }}
            />

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
                            updateElement={updateElement}
                            deleteElement={deleteElement}
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
                    onDrop={handleCanvasDrop}
                    onDragOver={(e) => e.preventDefault()}
                    onMouseDown={(e) => {
                        // If drawing, we want the event to bubble up to the main container or handle it here.
                        // The main container has the generic handler. 
                        // But we stopped propagation before.
                        if (activeTool === 'draw') {
                            // Don't stop propagation, let it bubble to container handler
                            // But prevent default to stop text selection
                            e.preventDefault();
                        } else {
                            e.stopPropagation();
                            setSelectedElementId(null);
                            setEditingElementId(null);
                            setActiveColorPickerId(null);
                        }
                    }}
                    className={`bg-white shadow-2xl relative transition-transform duration-200 origin-center select-none rounded-sm ${activeTool === 'draw' ? (brushType === 'eraser' ? 'cursor-eraser' : 'cursor-crosshair') : ''}`}
                    style={{ width: '1280px', height: '720px', transform: `scale(${scale})` }}
                >
                    <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '24px 24px' }} />

                    {/* Active Drawing Preview */}
                    {isDrawing && currentPathPoints.length > 1 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]">
                            <path
                                d={`M ${currentPathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                                fill="none"
                                stroke={brushColor}
                                strokeWidth={brushSize}
                                strokeOpacity={brushOpacity}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    )}

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

            {/* SLIDE STRIP - Restored */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-white/90 backdrop-blur rounded-2xl shadow-2xl border border-gray-200 overflow-x-auto max-w-[60vw]">
                {slides.map((s, idx) => (
                    <div
                        key={s.id}
                        onClick={() => setCurrentSlideId(s.id)}
                        className={`
                            w-32 h-20 rounded-xl border-2 cursor-pointer relative group transition-all shrink-0
                            ${currentSlideId === s.id ? 'border-indigo-500 shadow-indigo-200 shadow-lg scale-105 z-10' : 'border-gray-200 hover:border-gray-300 hover:scale-102'}
                            bg-white flex items-center justify-center overflow-hidden
                        `}
                    >
                        <span className={`text-2xl font-black ${currentSlideId === s.id ? 'text-indigo-100' : 'text-gray-100'}`}>{idx + 1}</span>
                        {/* Mini Preview (Simulated with element count) */}
                        <div className="absolute inset-0 flex flex-wrap gap-0.5 p-1 content-start opacity-30">
                            {s.elements.slice(0, 5).map(e => (
                                <div key={e.id} className="w-2 h-2 rounded-full bg-gray-400" />
                            ))}
                        </div>

                        {/* Delete Slide Button */}
                        <button
                            onClick={(e) => deleteSlide(e, s.id)}
                            className="absolute top-1 right-1 p-1 bg-red-100 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                <button
                    onClick={addSlide}
                    className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 transition-all shrink-0"
                >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-bold">New</span>
                </button>
            </div>
        </div>
    );
};

export default LessonBuilderPage;
