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
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
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
        // Group Rotation
        initialGroupState?: { id: string, x: number, y: number, width: number, height: number, rotation: number, centerX: number, centerY: number }[];
        groupCenter?: { x: number, y: number };
        startAngle?: number;
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
        setSelectedElementIds(prev => prev.filter(eid => eid !== id));
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

    // Helper to get corners of a rotated rectangle
    const getRotatedCorners = (x: number, y: number, w: number, h: number, rotation: number) => {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const rad = rotation * (Math.PI / 180);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        const corners = [
            { x: x, y: y },         // TL
            { x: x + w, y: y },     // TR
            { x: x + w, y: y + h }, // BR
            { x: x, y: y + h }      // BL
        ];

        return corners.map(p => ({
            x: cx + (p.x - cx) * cos - (p.y - cy) * sin,
            y: cy + (p.x - cx) * sin + (p.y - cy) * cos
        }));
    };

    // Calculate AABB of selected elements (accounting for rotation)
    const getSelectionBounds = () => {
        if (selectedElementIds.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        const selectedEls = currentSlide.elements.filter(e => selectedElementIds.includes(e.id));
        if (selectedEls.length === 0) return null;

        selectedEls.forEach(el => {
            const corners = getRotatedCorners(el.x, el.y, el.width, el.height, el.rotation || 0);
            corners.forEach(p => {
                minX = Math.min(minX, p.x);
                minY = Math.min(minY, p.y);
                maxX = Math.max(maxX, p.x);
                maxY = Math.max(maxY, p.y);
            });
        });

        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, centerX: minX + (maxX - minX) / 2, centerY: minY + (maxY - minY) / 2 };
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
            setSelectedElementIds([newElement.id]); // Triggers ContextMenu render
        }
    };

    // -- TRANSFORM LOGIC --

    const handleMouseDown = (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate', handle?: string) => {
        if (activeTool === 'draw') {
            if (brushType === 'eraser') {
                e.stopPropagation();
                setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, elements: s.elements.filter(el => el.id !== id) } : s));
            }
            return;
        }
        if (editingElementId === id && action === 'drag') return;

        e.stopPropagation();

        // Check if we are interacting with the Group Handle (id === 'group')
        if (id === 'group') {
            // Group Rotate Initiation
            const selectedEls = currentSlide.elements.filter(el => selectedElementIds.includes(el.id));
            if (selectedEls.length === 0) return;

            const bounds = getSelectionBounds();
            if (!bounds) return;

            const canvasRect = canvasRef.current?.getBoundingClientRect();
            if (!canvasRect) return;

            const currentCx = canvasRect.left + (bounds.centerX * scale);
            const currentCy = canvasRect.top + (bounds.centerY * scale);
            const startAngle = Math.atan2(e.clientY - currentCy, e.clientX - currentCx) * (180 / Math.PI);

            setDragState({
                isDragging: false, isResizing: false, isRotating: true, pendingDrag: false,
                elementId: 'group',
                startX: e.clientX, startY: e.clientY,
                initialX: 0, initialY: 0, initialWidth: 0, initialHeight: 0, initialRotation: 0,

                groupCenter: { x: bounds.centerX, y: bounds.centerY },
                startAngle: startAngle,
                initialGroupState: selectedEls.map(el => ({
                    id: el.id,
                    x: el.x, y: el.y,
                    width: el.width, height: el.height,
                    rotation: el.rotation || 0,
                    centerX: el.x + el.width / 2,
                    centerY: el.y + el.height / 2
                }))
            });
            return;
        }

        // Multi-Selection Logic
        if (e.shiftKey) {
            if (selectedElementIds.includes(id)) {
                setSelectedElementIds(prev => prev.filter(eid => eid !== id));
            } else {
                setSelectedElementIds(prev => [...prev, id]);
            }
        } else {
            if (!selectedElementIds.includes(id)) {
                setSelectedElementIds([id]);
            }
            // If already selected, don't clear others yet (allows dragging group)
        }

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
            elementId: id, // Primary element for resize/rotate anchor
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

        if (selectionBox) {
            setSelectionBox(prev => prev ? { ...prev, currentX: mouseX, currentY: mouseY } : null);

            // Calculate Intersection
            const boxX = Math.min(selectionBox.startX, mouseX);
            const boxY = Math.min(selectionBox.startY, mouseY);
            const boxW = Math.abs(mouseX - selectionBox.startX);
            const boxH = Math.abs(mouseY - selectionBox.startY);

            const newSelection: string[] = [];
            currentSlide.elements.forEach(el => {
                // Simple AABB intersection
                if (
                    el.x < boxX + boxW &&
                    el.x + el.width > boxX &&
                    el.y < boxY + boxH &&
                    el.y + el.height > boxY
                ) {
                    newSelection.push(el.id);
                }
            });
            setSelectedElementIds(newSelection);
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
            // Move ALL selected elements
            setSlides(prev => prev.map(s => {
                if (s.id === currentSlideId) {
                    return {
                        ...s,
                        elements: s.elements.map(el => {
                            if (selectedElementIds.includes(el.id)) {
                                // We need to store initial positions for ALL elements to prevent drift
                                // But since we don't have that in simple state, we use delta from LAST frame? 
                                // No, using delta from start is better but we don't have initial for all.
                                // Simplified approach: We need to know the initial position of THIS element relative to the drag start?
                                // Actually, simpler: we can just add (dx - prevDx) if we tracked prevDx.
                                // OR: We just update x/y by movement.
                                // ISSUE: `updateElement` uses setSlides inside. calling it multiple times in a loop is BAD.
                                // We must update ALL elements in one go here.
                                return {
                                    ...el,
                                    // This is tricky without "initial positions" for everyone. 
                                    // Let's use the delta approach:
                                    // But React state updates are async/batched.
                                    // If we use functional update, we can't easily use "initial".
                                    // SOLUTION: We need to capture initial positions of ALL selected items on DragStart.
                                    // For now, let's just use the `dx` applied to the `initialX` of the PRIMARY element, 
                                    // and for others, we might drift if we just add delta to current.
                                    // WAIT: `updateElement` helper re-maps state. 

                                    // CORRECT WAY:
                                    // We need to calculate the NEW position based on the OLD (at start of drag).
                                    // But we only stored `initialX` for the `elementId`.

                                    // Let's change strategy:
                                    // We will blindly apply the delta (e.movementX) to the current state? No, floating point and rounding errors.

                                    // Let's defer to a simpler method: 
                                    // We'll iterate and apply `e.movementX/scale` to `el.x`.
                                    // Ideally, `DragState` should hold a map of initial positions.
                                    // MVP: Just add `e.movementX / scale` to current position.
                                    x: el.x + (e.movementX / scale),
                                    y: el.y + (e.movementY / scale)
                                };
                            }
                            return el;
                        })
                    };
                }
                return s;
            }));
            // updateElement(dragState.elementId, { x: initialX + dx, y: initialY + dy }); // OLD single move
        }

        if (isResizing && dragState.handle && dragState.elementId) {
            // Resizing only works for the primary element for now
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

        if (isRotating) {
            if (dragState.elementId === 'group') {
                // -- GROUP ROTATION --
                if (!dragState.groupCenter || dragState.startAngle === undefined || !dragState.initialGroupState) return;

                const canvasRect = canvasRef.current?.getBoundingClientRect();
                if (!canvasRect) return;

                const currentCx = canvasRect.left + (dragState.groupCenter.x * scale);
                const currentCy = canvasRect.top + (dragState.groupCenter.y * scale);
                const currentAngle = Math.atan2(e.clientY - currentCy, e.clientX - currentCx) * (180 / Math.PI);

                let angleDelta = currentAngle - dragState.startAngle;

                if (e.shiftKey) {
                    // Snapping for group
                    angleDelta = Math.round(angleDelta / 15) * 15;
                }

                const rad = angleDelta * (Math.PI / 180);
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                const { x: gx, y: gy } = dragState.groupCenter;

                setSlides(prev => prev.map(s => {
                    if (s.id === currentSlideId) {
                        return {
                            ...s,
                            elements: s.elements.map(el => {
                                const initialState = dragState.initialGroupState?.find(is => is.id === el.id);
                                if (initialState) {
                                    // Rotate CENTER
                                    // relX = cx - gx
                                    const relX = initialState.centerX - gx;
                                    const relY = initialState.centerY - gy;

                                    // Rotated Relative
                                    const newRelX = relX * cos - relY * sin;
                                    const newRelY = relX * sin + relY * cos;

                                    // New Absolute Center
                                    const newCx = gx + newRelX;
                                    const newCy = gy + newRelY;

                                    // New Top-Left
                                    const newX = newCx - initialState.width / 2;
                                    const newY = newCy - initialState.height / 2;

                                    const newRot = (initialState.rotation + angleDelta) % 360;

                                    return {
                                        ...el,
                                        x: newX,
                                        y: newY,
                                        rotation: newRot
                                    };
                                }
                                return el;
                            })
                        };
                    }
                    return s;
                }));

            } else {
                // -- SINGLE ELEMENT ROTATION --
                if (centerX !== undefined && centerY !== undefined) {
                    const canvasRect = canvasRef.current?.getBoundingClientRect();
                    if (!canvasRect) return;

                    const currentCx = canvasRect.left + (centerX * scale);
                    const currentCy = canvasRect.top + (centerY * scale);
                    const angle = Math.atan2(e.clientY - currentCy, e.clientX - currentCx);
                    const degree = angle * (180 / Math.PI);

                    let finalRotation = degree - 90;
                    if (e.shiftKey) finalRotation = Math.round(finalRotation / 45) * 45;
                    updateElement(dragState.elementId, { rotation: finalRotation });
                }
            }
        }
    };

    const handleMouseUp = () => {
        // Finalize Drawing
        if (isDrawing && activeTool === 'draw') {
            setIsDrawing(false);
            if (currentPathPoints.length > 2) {
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
        setSelectionBox(null);
    };

    const bounds = getSelectionBounds(); // For Group Overlay

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
                    setSelectedElementIds([]);
                } else {
                    // Start Box Selection
                    if (!canvasRef.current) return;
                    const canvasRect = canvasRef.current.getBoundingClientRect();
                    const mouseX = (e.clientX - canvasRect.left) / scale;
                    const mouseY = (e.clientY - canvasRect.top) / scale;

                    if (!e.shiftKey) setSelectedElementIds([]);
                    setSelectionBox({ startX: mouseX, startY: mouseY, currentX: mouseX, currentY: mouseY });

                    setActiveColorPickerId(null);
                }
            }}
        >
            {/* STYLES */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Fredoka:wght@300;400;500;600&family=Pacifico&family=Patrick+Hand&family=Fira+Code:wght@400;500&family=Inter:wght@400;700&display=swap');
                .cursor-eraser { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>') 0 24, auto; }
            `}</style>

            {/* HEADER & ACTIONS */}
            <div className="absolute top-4 left-4 z-50 flex items-center gap-4" onMouseDown={(e) => e.stopPropagation()}>
                <button onClick={onExit} className="w-12 h-12 bg-white rounded-2xl border-2 border-b-4 border-gray-200 hover:border-gray-300 text-gray-600 flex items-center justify-center transition-all"><Home className="w-6 h-6" /></button>
            </div>
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
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
                    if (type === 'pen') { setBrushOpacity(1); if (brushColor === '#ffffff') setBrushColor('#1f2937'); }
                    else if (type === 'highlighter') { setBrushOpacity(0.5); setBrushSize(15); setBrushColor('#f59e0b'); }
                    else if (type === 'eraser') {
                        // Eraser now acts as a delete tool
                        // We don't need to change color/opacity, just the mode
                    }
                }}
            />

            {/* FLOATING CONTEXT MENU */}
            {selectedElementIds.length > 0 && !dragState.isDragging && (
                (() => {
                    const selectedEls = currentSlide.elements.filter(e => selectedElementIds.includes(e.id));
                    return selectedEls.length > 0 ? (
                        <ContextMenu
                            elements={selectedEls}
                            scale={scale}
                            canvasRect={canvasRef.current?.getBoundingClientRect() || null}
                            activeColorPickerId={activeColorPickerId}
                            setActiveColorPickerId={setActiveColorPickerId}
                            updateElementStyle={updateElementStyle}
                            updateElement={updateElement}
                            deleteElement={deleteElement}
                            editingElementId={editingElementId}
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
                    onMouseDown={(e) => {
                        // If drawing, we want the event to bubble up to the main container or handle it here.
                        // The main container has the generic handler. 
                        // But we stopped propagation before.
                        if (activeTool === 'draw') {
                            // Don't stop propagation, let it bubble to container handler
                            // But prevent default to stop text selection
                            e.preventDefault();
                        } else {
                            // Allow bubbling to trigger Box Selection in parent
                        }
                    }}
                    className={`bg-white shadow-2xl relative transition-transform duration-200 origin-center select-none rounded-sm ${activeTool === 'draw' ? (brushType === 'eraser' ? 'cursor-eraser' : 'cursor-crosshair') : ''}`}
                    style={{ width: '1280px', height: '720px', transform: `scale(${scale})` }}
                >
                    <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '24px 24px' }} />

                    {/* Active Drawing Preview */}
                    {isDrawing && currentPathPoints.length > 1 && (
                        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]">
                            <path d={`M ${currentPathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`} fill="none" stroke={brushColor} strokeWidth={brushSize} strokeOpacity={brushOpacity} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}

                    {/* SELECTION BOX */}
                    {selectionBox && (
                        <div
                            className="absolute border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none z-[100]"
                            style={{ left: Math.min(selectionBox.startX, selectionBox.currentX), top: Math.min(selectionBox.startY, selectionBox.currentY), width: Math.abs(selectionBox.currentX - selectionBox.startX), height: Math.abs(selectionBox.currentY - selectionBox.startY) }}
                        />
                    )}

                    {/* Group Selection Overlay */}
                    {selectedElementIds.length > 1 && bounds && !dragState.isDragging && (
                        <div className="absolute border-2 border-indigo-500 z-40 pointer-events-none"
                            style={{
                                left: bounds.minX,
                                top: bounds.minY,
                                width: bounds.width,
                                height: bounds.height
                            }}
                        >
                            {/* Group Rotation Handle */}
                            <div
                                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border border-indigo-500 rounded-full flex items-center justify-center cursor-grab pointer-events-auto shadow-sm"
                                onMouseDown={(e) => handleMouseDown(e, 'group', 'rotate')}
                            >
                                <svg className="w-3 h-3 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                            </div>
                        </div>
                    )}

                    {currentSlide.elements.map(el => (
                        <CanvasElement
                            key={el.id}
                            el={el}
                            isSelected={selectedElementIds.includes(el.id)}
                            isEditing={editingElementId === el.id}
                            setEditingElementId={setEditingElementId}
                            updateElement={updateElement}
                            updateElementStyle={updateElementStyle}
                            deleteElement={deleteElement}
                            handleMouseDown={handleMouseDown}
                            showHandles={selectedElementIds.length === 1} // Hide individual handles if multi-selected
                        />
                    ))}
                </div>
            </div>

            {/* ZOOM Buttons */}
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute bottom-4 right-4 z-50 flex items-center bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-2 gap-2"
            >
                <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><Minus className="w-5 h-5" /></button>
                <span className="text-xs font-black w-12 text-center text-gray-800">{Math.round(scale * 100)}%</span>
                <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"><PlusIcon className="w-5 h-5" /></button>
            </div>

            {/* SLIDE STRIP - Restored */}
            <div
                onMouseDown={(e) => e.stopPropagation()}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-white/90 backdrop-blur rounded-2xl shadow-2xl border border-gray-200 overflow-x-auto max-w-[60vw]"
            >
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
