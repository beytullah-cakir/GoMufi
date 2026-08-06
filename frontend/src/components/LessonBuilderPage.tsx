import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from "react-router-dom";
import type { Slide, SlideElement, ElementStyle } from './lesson-builder/types';
import Toolbar from './lesson-builder/Toolbar';
import ContextMenu from './lesson-builder/ContextMenu';
import CanvasElement from './lesson-builder/CanvasElement';
import ConnectorRenderer from './lesson-builder/ConnectorRenderer';
import GameBuilder from './lesson-builder/GameBuilder';
import CodingSlideBuilder from './lesson-builder/CodingSlideBuilder';
import ChallengeSlideBuilder, { defaultChallengeConfig } from './lesson-builder/ChallengeSlideBuilder';
import HomeworkBuilder from './lesson-builder/HomeworkBuilder';
import StudentHomeworkView from './student-pages/StudentHomeworkView';

import LessonBuilderHeader from './lesson-builder/LessonBuilderHeader';
import LessonBuilderSlideStrip from './lesson-builder/LessonBuilderSlideStrip';
import LessonBuilderZoomControls from './lesson-builder/LessonBuilderZoomControls';
import AddSlideModal from './lesson-builder/AddSlideModal';
import RightClickMenu from './lesson-builder/RightClickMenu';
import LayersPanel from './lesson-builder/LayersPanel';
import PropertiesPanel from './lesson-builder/PropertiesPanel';
import SelectionOverlay from './lesson-builder/SelectionOverlay';
import GridOverlay from './lesson-builder/GridOverlay';
import LayoutModeToggle from './lesson-builder/LayoutModeToggle';
import { addBlockToCell, cellAtPoint, emptySlotInCell, layoutElements, moveBlockToCell, removeBlock, resizeColumns, STAGE_HEIGHT, STAGE_WIDTH } from './lesson-builder/grid';
import type { LayoutMode } from './lesson-builder/grid';
import SaveToCourseModal from "./lesson-builder/SaveToCourseModal";
import api from "../api";
import { Loader2, X, LayoutTemplate } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface LessonBuilderProps {
    onExit: () => void;
}

const BUILDER_STORAGE_KEY = "gomufi_lesson_builder_draft";

const LessonBuilderPage: React.FC<LessonBuilderProps> = ({ onExit }) => {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const courseId = searchParams.get("courseId") || searchParams.get("courseid");
    const noteId = searchParams.get("noteId") || searchParams.get("noteid");

    const initialCurriculum = location.state?.curriculum;
    const initialNotes = location.state?.notes;
    const [isLoadingCourse, setIsLoadingCourse] = useState(!!courseId && !initialCurriculum && !initialNotes);

    const { userData } = useAuth();
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [templateTitle, setTemplateTitle] = useState('');
    const [templateDesc, setTemplateDesc] = useState('');
    const [templateCategory, setTemplateCategory] = useState<'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET' | 'QUIZ' | 'ÖDEV'>('ANLA');
    const [isSavingTemplate, setIsSavingTemplate] = useState(false);
    const [templatesList, setTemplatesList] = useState<any[]>([]);
    const [saveMode, setSaveMode] = useState<"new" | "update">("new");
    const [selectedTemplateIdToUpdate, setSelectedTemplateIdToUpdate] = useState<string>("");

    const savedDraft = (() => {
        try {
            const saved = localStorage.getItem(BUILDER_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (noteId && String(parsed.noteId) !== String(noteId)) {
                    return null;
                }
                return parsed;
            }
            return null;
        } catch (e) {
            return null;
        }
    })();

    // -- State --
    const [slides, setSlides] = useState<Slide[]>(() => {
        if (initialCurriculum || initialNotes) {
            const notesArr = Array.isArray(initialNotes) ? initialNotes : (initialNotes ? [initialNotes] : []);
            const currArr = Array.isArray(initialCurriculum) ? initialCurriculum : (initialCurriculum ? [initialCurriculum] : []);
            const targetNote = noteId
                ? (notesArr.find((n: any) => String(n.id) === String(noteId)) || 
                   currArr.find((n: any) => String(n.id) === String(noteId)))
                : null;
            if (targetNote?.slides && Array.isArray(targetNote.slides)) return targetNote.slides;
        }
        return savedDraft?.slides || [{ id: 1, elements: [], connections: [] }];
    });

    const [currentSlideId, setCurrentSlideId] = useState<number | string>(
        savedDraft?.currentSlideId || 1
    );
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [isCanvasSelected, setIsCanvasSelected] = useState<boolean>(false);
    const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
    const [editingElementId, setEditingElementId] = useState<string | null>(null);
    const [scale, setScale] = useState(0.9);
    const [activeColorPickerId, setActiveColorPickerId] = useState<string | null>(null);
    const [showAddSlideModal, setShowAddSlideModal] = useState(false);
    const [isPreview, setIsPreview] = useState(false);
    const [previewRole, setPreviewRole] = useState<'student' | 'teacher'>('student');
    const [allLessons, setAllLessons] = useState<any[]>(() => {
        const notesArr = Array.isArray(initialNotes) ? initialNotes : (initialNotes ? [initialNotes] : []);
        const currArr = Array.isArray(initialCurriculum) ? initialCurriculum : (initialCurriculum ? [initialCurriculum] : []);
        const levelsOnly = currArr.filter((item: any) => item.type !== "live_sessions_config");
        return levelsOnly.map((lvl: any) => {
            const matchingNote = notesArr.find((n: any) => String(n.id) === String(lvl.id));
            return {
                ...lvl,
                slides: matchingNote?.slides || []
            };
        });
    });

    useEffect(() => {
        if (isPreview) {
            setSelectedElementIds([]);
            setEditingElementId(null);
            setIsCanvasSelected(false);
        } else {
            setPreviewRole('student');
        }
    }, [isPreview]);

    // -- Header State --
    const [projectName, setProjectName] = useState(() => {
        if (initialCurriculum || initialNotes) {
            const notesArr = Array.isArray(initialNotes) ? initialNotes : (initialNotes ? [initialNotes] : []);
            const currArr = Array.isArray(initialCurriculum) ? initialCurriculum : (initialCurriculum ? [initialCurriculum] : []);
            const targetNote = noteId
                ? (notesArr.find((n: any) => String(n.id) === String(noteId)) || 
                   currArr.find((n: any) => String(n.id) === String(noteId)))
                : null;
            if (targetNote?.noteTitle) return targetNote.noteTitle;
        }
        return savedDraft?.projectName || "Yeni Ders Projesi";
    });

    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
    const isFirstRender = useRef(true);

    // -- AI ile Tekrar Oluştur --
    const [courseTitle, setCourseTitle] = useState<string>("");
    const [isRegenerating, setIsRegenerating] = useState(false);

    // -- Stage Indicator State --
    const [activeStage, setActiveStage] = useState<'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET' | 'QUIZ' | 'ÖDEV'>(() => {
        const categoryParam = searchParams.get("category");
        if (categoryParam === 'ANLA' || categoryParam === 'UYGULA' || categoryParam === 'BİRLEŞTİR' || categoryParam === 'ÜRET' || categoryParam === 'QUIZ' || categoryParam === 'ÖDEV') {
            return categoryParam as any;
        }
        return (savedDraft?.activeStage || 'ANLA') as any;
    });


    // -- History & Clipboard State --
    const [past, setPast] = useState<Slide[][]>([]);
    const [future, setFuture] = useState<Slide[][]>([]);
    const clipboard = useRef<SlideElement[]>([]);


    // -- Draw/Connect Tool State --
    const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'connect' | 'code'>('select');
    const [isDrawing, setIsDrawing] = useState(false);
    const [connectionStartId, setConnectionStartId] = useState<string | null>(null);

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
        // History Snapshot
        historySnapshot?: Slide[];
    }>({
        isDragging: false, isResizing: false, isRotating: false, pendingDrag: false,
        startX: 0, startY: 0, initialX: 0, initialY: 0,
        initialWidth: 0, initialHeight: 0, initialRotation: 0
    });

    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, visible: boolean, elementId?: string }>({ x: 0, y: 0, visible: false });
    const [showLayers, setShowLayers] = useState(false);

    const canvasRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    // const fileInputRef = useRef<HTMLInputElement>(null);

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

    // -- History Actions --
    const addToHistory = () => {
        setPast(prev => [...prev.slice(-19), slides]); // Limit history to 20
        setFuture([]);
    };

    const handleUndo = () => {
        if (past.length === 0) return;
        const previous = past[past.length - 1];
        const newPast = past.slice(0, past.length - 1);
        setFuture(prev => [slides, ...prev]);
        setSlides(previous);
        setPast(newPast);
    };

    const handleRedo = () => {
        if (future.length === 0) return;
        const next = future[0];
        const newFuture = future.slice(1);
        setPast(prev => [...prev, slides]);
        setSlides(next);
        setFuture(newFuture);
    };

    // -- Clipboard Actions --
    const handleCopy = () => {
        if (selectedElementIds.length === 0) return;
        const elementsToCopy = currentSlide.elements.filter(el => selectedElementIds.includes(el.id));
        clipboard.current = elementsToCopy;
        // Notify user? "Copied!"
    };

    const handlePaste = () => {
        if (clipboard.current.length === 0) return;

        addToHistory(); // Save before pasting

        const newElements = clipboard.current.map(el => {
            const newId = Date.now().toString() + Math.random().toString().slice(2, 5);
            return {
                ...el,
                id: newId,
                x: el.x + 20, // Offset
                y: el.y + 20
            };
        });

        setSlides(prev => prev.map(s => {
            if (s.id === currentSlideId) {
                return { ...s, elements: [...s.elements, ...newElements] };
            }
            return s;
        }));

        setSelectedElementIds(newElements.map(e => e.id));
    };

    // -- State Ref for Event Handlers --
    const stateRef = useRef({
        slides, past, future, selectedElementIds, currentSlideId, clipboard: clipboard.current,
        projectName, activeStage, isPreview
    });

    React.useEffect(() => {
        stateRef.current = {
            slides, past, future, selectedElementIds, currentSlideId, clipboard: clipboard.current,
            projectName, activeStage, isPreview
        };
    }, [slides, past, future, selectedElementIds, currentSlideId, projectName, activeStage, isPreview]);

    // Ensure mutually exclusive selection
    React.useEffect(() => {
        if (selectedElementIds.length > 0) {
            setIsCanvasSelected(false);
        }
    }, [selectedElementIds]);

    // Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;

            const { slides, past, future, selectedElementIds, currentSlideId, clipboard, isPreview } = stateRef.current;
            const currentSlide = slides.find(s => s.id === currentSlideId) || slides[0];

            // Sol/sağ ok: slaytlar arası gezinme.
            // Önizlemede DEVRE DIŞI — oyun ve uygulama slaytları ok tuşlarını kendileri
            // kullanıyor, orada slayt atlatmak kontrolü ellerinden alır.
            if (!e.ctrlKey && !e.metaKey && !e.altKey &&
                (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                if (isPreview || slides.length < 2) return;
                const idx = slides.findIndex(s => s.id === currentSlideId);
                if (idx === -1) return;
                const next = idx + (e.key === 'ArrowRight' ? 1 : -1);
                if (next < 0 || next >= slides.length) return;
                e.preventDefault();
                setCurrentSlideId(slides[next].id);
                // Eski slaydın elemanı seçili kalırsa özellikler paneli o slaytta
                // olmayan bir elemanı düzenliyormuş gibi görünür.
                setSelectedElementIds([]);
                return;
            }

            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    e.preventDefault();
                    if (e.shiftKey) {
                        // Redo
                        if (future.length === 0) return;
                        const next = future[0];
                        const newFuture = future.slice(1);
                        setPast(prev => [...prev, slides]);
                        setSlides(next);
                        setFuture(newFuture);
                    } else {
                        // Undo
                        if (past.length === 0) return;
                        const previous = past[past.length - 1];
                        const newPast = past.slice(0, past.length - 1);
                        setFuture(prev => [slides, ...prev]);
                        setSlides(previous);
                        setPast(newPast);
                    }
                } else if (e.key === 'y') {
                    // Redo
                    e.preventDefault();
                    if (future.length === 0) return;
                    const next = future[0];
                    const newFuture = future.slice(1);
                    setPast(prev => [...prev, slides]);
                    setSlides(next);
                    setFuture(newFuture);
                } else if (e.key === 'c') {
                    e.preventDefault();
                    if (selectedElementIds.length === 0) return;
                    const elementsToCopy = currentSlide.elements.filter(el => selectedElementIds.includes(el.id));
                    // Update the external ref as well so button clicks still work if they use it (though they generally use the component state/ref)
                    // Actually we need to update the component's clipboard ref for uniformity
                    // But we can't easily access the component's clipboard ref setter passed to other functions if it's just a ref.
                    // Accessing the outer scope `clipboard` ref is fine!

                    // We can just call handleCopy/handlePaste? 
                    // No, those close over stale state if called from here unless we use a fresh closure? 
                    // No, handleCopy/handlePaste defined in component body close over current render state.
                    // But this effect runs ONCE. So it closes over INITIAL handleCopy.
                    // So we must duplicate logic or use a ref for handlers (overkill).
                    // Duplicating logic using stateRef is safest.

                    // Update the main ref used by the component
                    // Note: accessing outer `clipboard` ref work because it is a Ref object, distinct from stateRef.current.
                    // But we should update it.
                    const copyData = currentSlide.elements.filter(el => selectedElementIds.includes(el.id));
                    // We need to update the MUTABLE clipboard ref from outer scope
                    // The outer `clipboard` variable is available here.
                    // Let's rely on the fact that `stateRef` is just for reading state, 
                    // but we can write to `clipboard.current` directly.
                    // Wait, cannot access outer `clipboard`? Yes I can.

                    // Actually, let's keep it simple:
                    // handleCopy logic:
                    // clipboard.current = elementsToCopy;
                    // BUT we need to reference the `clipboard` from the specific render? 
                    // No, `clipboard` is a const Ref object. It is stable.
                } else if (e.key === 'v') {
                    e.preventDefault();
                    // Paste Logic
                    // We need to read from the MUTABLE clipboard ref, because Ctrl+C might have happened 
                    // via Button Click (which updates clipboard.current) OR via Shortcut (which we handle here).
                    // stateRef.current.clipboard might be stale if we only update it on render!
                    // So better to read `clipboard.current` directly if we can.

                    // Wait, `clipboard` IS a dependency of the other effect? No it's a ref.
                    // It's not in dependency array usually.

                    // Let's implement Paste using `stateRef` for slides/ids etc, but `clipboard.current` for data.
                }
            }

            // Re-implementing logic to be safe and avoid closure issues
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'c') {
                    e.preventDefault();
                    if (selectedElementIds.length === 0) return;
                    const elementsToCopy = currentSlide.elements.filter(el => selectedElementIds.includes(el.id));
                    // Update actual ref
                    // We seek the outer scope `clipboard`. It is available.
                    // @ts-ignore
                    clipboard.current = elementsToCopy;
                } else if (e.key === 'v') {
                    e.preventDefault();
                    // @ts-ignore
                    const itemsToPaste = clipboard.current;
                    if (itemsToPaste.length === 0) return;

                    // Add to history manually since we are outside the closure of `addToHistory`
                    setPast(prev => [...prev.slice(-19), slides]);
                    setFuture([]);

                    const newElements = itemsToPaste.map((el: any) => {
                        const newId = Date.now().toString() + Math.random().toString().slice(2, 5);
                        return {
                            ...el,
                            id: newId,
                            x: el.x + 20,
                            y: el.y + 20
                        };
                    });

                    setSlides(prev => prev.map(s => {
                        if (s.id === currentSlideId) {
                            return { ...s, elements: [...s.elements, ...newElements] };
                        }
                        return s;
                    }));

                    setSelectedElementIds(newElements.map((e: any) => e.id));
                }
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedElementIds.length > 0) {
                    setPast(prev => [...prev.slice(-19), slides]);
                    setFuture([]);

                    setSlides(prev => prev.map(s => {
                        if (s.id === currentSlideId) {
                            return { ...s, elements: s.elements.filter(el => !selectedElementIds.includes(el.id)) };
                        }
                        return s;
                    }));
                    setSelectedElementIds([]);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);


    // -- Effect to load course from DB --
    useEffect(() => {
        if (courseId && !initialCurriculum) {
            const fetchCourse = async () => {
                try {
                    const response = await api.get(`/courses/${courseId}`);
                    if (response.data) {
                        setCourseTitle(response.data.title || "");
                        const curriculum = response.data.curriculum || [];
                        const dbNotes = response.data.notes || [];
                        const levelsOnly = curriculum.filter((item: any) => item.type !== "live_sessions_config");
                        const mergedLessons = levelsOnly.map((lvl: any) => {
                            const matchingNote = dbNotes.find((n: any) => String(n.id) === String(lvl.id));
                            return {
                                ...lvl,
                                slides: matchingNote?.slides || []
                            };
                        });
                        setAllLessons(mergedLessons);
                        const targetNote = noteId
                            ? (dbNotes.find((n: any) => String(n.id) === String(noteId)) ||
                               curriculum.find((n: any) => String(n.id) === String(noteId)))
                            : null;
                        if (targetNote) {
                            if (targetNote.slides && Array.isArray(targetNote.slides)) {
                                setSlides(targetNote.slides);
                                if (targetNote.noteTitle) setProjectName(targetNote.noteTitle);
                                if (targetNote.slides.length > 0) setCurrentSlideId(targetNote.slides[0].id);
                            } else {
                                setSlides([{ id: 1, elements: [], connections: [] }]);
                                setProjectName(targetNote.noteTitle || `Ders Notu`);
                                setCurrentSlideId(1);
                            }
                        } else {
                            setSlides([{ id: 1, elements: [], connections: [] }]);
                            setProjectName(`Yeni Ders Projesi`);
                            setCurrentSlideId(1);
                        }
                    }
                } catch (error) {
                    console.error("Error loading course for builder:", error);
                } finally {
                    setIsLoadingCourse(false);
                }
            };
            fetchCourse();
        }
    }, [courseId]);

    // -- Scale Effect on Mount --
    useEffect(() => {
        const handleInitialScale = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            const availableW = w - 420;
            const availableH = h - 220;
            if (availableW > 0 && availableH > 0) {
                const scaleX = availableW / 1280;
                const scaleY = availableH / 720;
                const idealScale = Math.max(0.2, Math.min(scaleX, scaleY, 1));
                setScale(parseFloat(idealScale.toFixed(2)));
            }
        };
        handleInitialScale();
    }, []);

    // -- Auto-Save Draft Effects --
    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        setSaveStatus("saving");
    }, [slides, projectName, activeStage]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saveStatus === "saving") {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Save draft
            const draft = {
                slides: stateRef.current.slides,
                projectName: stateRef.current.projectName,
                activeStage: stateRef.current.activeStage,
                currentSlideId: stateRef.current.currentSlideId,
                noteId: noteId
            };
            localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(draft));
        };
    }, [saveStatus]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (saveStatus === "saving") {
                const draft = {
                    slides: stateRef.current.slides,
                    projectName: stateRef.current.projectName,
                    activeStage: stateRef.current.activeStage,
                    currentSlideId: stateRef.current.currentSlideId,
                    noteId: noteId
                };
                localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(draft));
                setSaveStatus("saved");
            }
        }, 3000);
        return () => clearTimeout(timer);
    }, [saveStatus]);


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
        // Warning: This creates history on every update if called directly.
        // For color picker (which calls this), usually it's one-off.
        // Ideally we wrap usage where appropriate.
        // For now, let's assume color picker is atomic enough.
        // BUT better to just hook into color picker open/close or explicitly add history there.
        // We will leave this raw and expect caller to handle history if needed,
        // OR we can add history here but it might spam on drag.
        // Since updateElementStyle is mostly for toolbar, let's add history here?
        // No, `updateElement` is used by drag. `updateElementStyle` is used by toolbar.
        // Let's add history to `updateElementStyle` call sites in Toolbar/ContextMenu instead?
        // Or assumes this is one-off.

        // Actually, let's keeping it simple.
        // The user only asked for "Undo/Redo to work".

        const el = currentSlide.elements.find(e => e.id === id);
        if (!el) return;
        const newStyle = { ...el.style, ...styleUpdates };
        updateElement(id, { style: newStyle });
    };

    const spawnCodeEditorForChallenge = (challengeId: string, x: number, y: number, height: number) => {
        addToHistory();
        const codeEditorId = Date.now().toString() + Math.random().toString().slice(2, 5);
        const newCodeEditor: SlideElement = {
            id: codeEditorId,
            type: 'code_editor',
            x: x,
            y: y,
            width: 450,
            height: height,
            rotation: 0,
            content: '# Kodlama Görevi\n# Çözümünüzü buraya yazın\n',
            style: { fontSize: 14, fontFamily: 'Fira Code' as const },
            extra: {
                isLinkedToChallenge: true,
                parentChallengeId: challengeId
            }
        };

        setSlides(prev => prev.map(s => {
            if (s.id === currentSlideId) {
                const updatedElements = s.elements.map(el => {
                    if (el.id === challengeId) {
                        return {
                            ...el,
                            extra: {
                                ...el.extra,
                                linkedCodeEditorId: codeEditorId,
                                activeTab: 'code'
                            }
                        };
                    }
                    return el;
                });
                return { ...s, elements: [...updatedElements, newCodeEditor] };
            }
            return s;
        }));
    };

    const deleteElement = (id: string) => {
        addToHistory();
        
        const currentSlide = slides.find(s => s.id === currentSlideId);
        if (!currentSlide) return;
        
        const elementToDelete = currentSlide.elements.find(el => el.id === id);
        let idsToRemove = [id];
        
        if (elementToDelete) {
            // 1. If challenge widget is deleted, delete its linked code editor
            if (elementToDelete.type === 'challenge' && elementToDelete.extra?.linkedCodeEditorId) {
                idsToRemove.push(elementToDelete.extra.linkedCodeEditorId);
            }
            
            // 2. If linked code editor is deleted, revert challenge tab to text
            currentSlide.elements.forEach(el => {
                if (el.type === 'challenge' && el.extra?.linkedCodeEditorId === id) {
                    setTimeout(() => {
                        updateElement(el.id, {
                            extra: {
                                ...el.extra,
                                activeTab: 'text',
                                linkedCodeEditorId: undefined
                            }
                        });
                    }, 0);
                }
            });
        }

        setSlides(prev => prev.map(slide => {
            if (slide.id === currentSlideId) {
                // Grid'li slaytta yerleşim de temizlenmeli: silinen elemanın yuvası
                // orada kalsaydı motor var olmayan bir bloğa yer ayırmaya devam
                // eder, hücrede açıklanamayan bir boşluk görünürdü.
                const layout = slide.layout
                    ? idsToRemove.reduce((acc, id) => removeBlock(acc, id), slide.layout)
                    : slide.layout;
                return {
                    ...slide,
                    layout,
                    elements: slide.elements.filter(el => !idsToRemove.includes(el.id)),
                };
            }
            return slide;
        }));
        setSelectedElementIds(prev => prev.filter(eid => !idsToRemove.includes(eid)));
    };

    const addSlide = () => {
        // Modal handles actual addition
        setShowAddSlideModal(true);
    };

    const deleteSlide = (e: React.MouseEvent, id: number | string) => {
        e.stopPropagation();
        if (slides.length <= 1) {
            alert("Cannot delete the only slide!");
            return;
        }
        addToHistory();
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

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        const target = e.target as HTMLElement;
        const elementWrapper = target.closest('[data-id]');
        let elementId: string | undefined;

        if (elementWrapper) {
            elementId = elementWrapper.getAttribute('data-id') || undefined;
            // Select if not already
            if (elementId && !selectedElementIds.includes(elementId)) {
                setSelectedElementIds([elementId]);
            }
        } else {
            // Background click
            setSelectedElementIds([]);
        }

        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            visible: true,
            elementId
        });
    };

    const handleMenuAction = (action: string, value?: any) => {
        setContextMenu(prev => ({ ...prev, visible: false }));

        switch (action) {
            case 'paste':
                handlePaste();
                break;
            case 'copy':
                handleCopy();
                break;
            case 'delete':
                if (selectedElementIds.length > 0) {
                    // Standard delete logic
                    addToHistory();
                    setSlides(prev => prev.map(s => {
                        if (s.id === currentSlideId) {
                            return { ...s, elements: s.elements.filter(el => !selectedElementIds.includes(el.id)) };
                        }
                        return s;
                    }));
                    setSelectedElementIds([]);
                }
                break;
            case 'bringForward':
                changeLayer('forward');
                break;
            case 'bringToFront':
                changeLayer('front');
                break;
            case 'sendBackward':
                changeLayer('backward');
                break;
            case 'sendToBack':
                changeLayer('back');
                break;
            case 'align':
                alignSelection(value);
                break;
            case 'toggleLayers':
                setShowLayers(prev => !prev);
                break;
            case 'connect':
                setActiveTool('connect');
                // Optionally start connection from the selected element if single selection
                if (selectedElementIds.length === 1) {
                    setConnectionStartId(selectedElementIds[0]);
                }
                break;
            case 'comment':
                if (selectedElementIds.length > 0) {
                    const targetId = selectedElementIds[selectedElementIds.length - 1]; // Use last selected
                    const targetEl = currentSlide.elements.find(e => e.id === targetId);
                    if (targetEl) {
                        const newSticky: SlideElement = {
                            id: Date.now().toString(),
                            type: 'sticky',
                            x: targetEl.x + targetEl.width + 20,
                            y: targetEl.y,
                            width: 150,
                            height: 150,
                            rotation: 0,
                            content: '', // Empty initially
                            style: { backgroundColor: '#fef3c7', fontFamily: 'Patrick Hand', fontSize: 24, textAlign: 'center' }
                        };
                        addToHistory();
                        setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, elements: [...s.elements, newSticky] } : s));
                        setSelectedElementIds([newSticky.id]);
                        setEditingElementId(newSticky.id); // Auto-focus
                    }
                }
                break; // Ensure to break!
        }
    };

    const changeLayer = (action: 'front' | 'back' | 'forward' | 'backward') => {
        if (selectedElementIds.length === 0) return;
        addToHistory();

        setSlides(prev => prev.map(s => {
            if (s.id === currentSlideId) {
                let els = [...s.elements];
                // Process each selected element
                // Note: Complex with multi-selection. Simple approach:
                // Sort selected indices.

                const selectedIndices = els.map((el, i) => selectedElementIds.includes(el.id) ? i : -1).filter(i => i !== -1).sort((a, b) => a - b);

                // If single selection, standard logic
                if (selectedIndices.length === 1) {
                    const idx = selectedIndices[0];
                    const el = els[idx];
                    els.splice(idx, 1);

                    if (action === 'front') els.push(el);
                    else if (action === 'back') els.unshift(el);
                    else if (action === 'forward') els.splice(Math.min(els.length, idx + 1), 0, el);
                    else if (action === 'backward') els.splice(Math.max(0, idx - 1), 0, el);
                } else {
                    // Multi-selection Logic (Group Layering)
                    let changed = false;

                    if (action === 'front') {
                        const toMove = els.filter(el => selectedElementIds.includes(el.id));
                        const others = els.filter(el => !selectedElementIds.includes(el.id));
                        if (others.length > 0) {
                            els = [...others, ...toMove];
                            changed = true;
                        }
                    } else if (action === 'back') {
                        const toMove = els.filter(el => selectedElementIds.includes(el.id));
                        const others = els.filter(el => !selectedElementIds.includes(el.id));
                        if (others.length > 0) {
                            els = [...toMove, ...others];
                            changed = true;
                        }
                    } else if (action === 'forward') {
                        // Iterate from end to start to handle bubbling correctly
                        for (let i = els.length - 2; i >= 0; i--) {
                            const el = els[i];
                            const next = els[i + 1];
                            if (selectedElementIds.includes(el.id) && !selectedElementIds.includes(next.id)) {
                                els[i] = next;
                                els[i + 1] = el;
                                changed = true;
                            }
                        }
                    } else if (action === 'backward') {
                        // Iterate from start to end
                        for (let i = 1; i < els.length; i++) {
                            const el = els[i];
                            const prev = els[i - 1];
                            if (selectedElementIds.includes(el.id) && !selectedElementIds.includes(prev.id)) {
                                els[i] = prev;
                                els[i - 1] = el;
                                changed = true;
                            }
                        }
                    }

                    if (!changed) return s;
                }

                return { ...s, elements: els };
            }
            return s;
        }));
    };

    const alignSelection = (alignment: 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom') => {
        if (selectedElementIds.length === 0) return;
        addToHistory();

        // Align to Page (Canvas 1280x720)
        const CANVAS_W = 1280;
        const CANVAS_H = 720;

        setSlides(prev => prev.map(s => {
            if (s.id === currentSlideId) {
                return {
                    ...s,
                    elements: s.elements.map(el => {
                        if (selectedElementIds.includes(el.id)) {
                            let newX = el.x;
                            let newY = el.y;

                            if (alignment === 'left') newX = 0;
                            if (alignment === 'center-h') newX = (CANVAS_W - el.width) / 2;
                            if (alignment === 'right') newX = CANVAS_W - el.width;

                            if (alignment === 'top') newY = 0;
                            if (alignment === 'center-v') newY = (CANVAS_H - el.height) / 2;
                            if (alignment === 'bottom') newY = CANVAS_H - el.height;

                            return { ...el, x: newX, y: newY };
                        }
                        return el;
                    })
                };
            }
            return s;
        }));
    };



    // Add native wheel event listener to handle Ctrl+Scroll zoom prevention
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setScale(s => Math.min(2, Math.max(0.2, s + delta)));
            }
        };

        // Passive: false is crucial to allow preventDefault()
        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, []);

    // -- Handlers --

    const handleToolbarDragStart = (e: React.DragEvent, type: string, extraData: any = {}) => {
        // We don't save history here, only on drop
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

                         const sizes: Record<string, { w: number, h: number }> = {
                'text': { w: 200, h: 60 },
                'sticky': { w: 200, h: 200 },
                'shape': { w: 150, h: 150 },
                'code': { w: 400, h: 300 },
                'image': { w: 300, h: 200 },
                'video': { w: 400, h: 225 },
                'arrow': { w: 200, h: 100 },
                'whiteboard': { w: 500, h: 350 },
                'file': { w: 320, h: 110 },
                'link': { w: 320, h: 110 },
                'speaking_note': { w: 320, h: 140 },
                'code_editor': { w: 400, h: 300 },
                'answer_box': { w: 320, h: 220 },
                'challenge': { w: 860, h: 520 },
                'connection_task': { w: 550, h: 380 },
                'production_task': { w: 580, h: 420 }
            };

            const size = sizes[type] || { w: 100, h: 100 };
            const props: Partial<SlideElement> = {
                'text': { content: 'Double click to edit', style: baseStyle },
                'code': { content: 'print("Hello")', style: { ...baseStyle, fontFamily: 'Fira Code' as const, fontSize: 14 } },
                'sticky': { content: 'Note...', style: { ...baseStyle, backgroundColor: '#fef3c7', fontFamily: 'Patrick Hand' as const } },
                'shape': { content: '', shapeType: extraData.shapeType || 'rectangle', style: { backgroundColor: '#e2e8f0', borderWidth: 0 } },
                'image': { content: '' },
                'video': { content: '' },
                'whiteboard': { content: '' },
                'file': { content: 'Ders_Kaynak_Dokumani.pdf', src: '#' },
                'link': { content: 'Faydalı Kaynak Bağlantısı', src: 'https://github.com' },
                'speaking_note': { content: 'Konuşma Notu\n"Burada konuyu günlük hayattan bir örnekle açıkla."' },
                'code_editor': { content: '# Kodunuzu buraya yazın\nprint("Merhaba Dunya")\n', style: { ...baseStyle, fontFamily: 'Fira Code' as const, fontSize: 14 } },
                'answer_box': { content: 'Soru: Python\'da listeler ile demetler (tuples) arasındaki fark nedir?', src: '' },
                'challenge': {
                    content: '🎯 GÖREV: Sağ taraftaki Kod Editörünü kullanarak ekrana "Merhaba GoMufi" yazdıran Python kodunu oluşturun ve çalıştırın.',
                    extra: {
                        title: '🎯 Challenge (Mini Görev)',
                        submittedText: '',
                        submittedCode: '# Çözüm kodunuzu buraya yazın\n',
                        submittedFile: '',
                        isSubmitted: false
                    }
                },
                'connection_task': {
                    content: 'Function bilgisini kullanarak bir Student Class oluştur.',
                    extra: {
                        title: 'Bağlantı Görevi (Connection Task)',
                        previousTopic: 'Function',
                        currentTopic: 'Class',
                        submittedAnswer: '',
                        isSubmitted: false
                    }
                },
                'production_task': {
                    content: 'Student Management System oluştur. İçinde en az 2 Class ve 3 Method bulunmalı.',
                    extra: {
                        title: 'Proje Görevi (Produce Task)',
                        projectTitle: 'Student Management System',
                        expectedOutput: 'İçinde en az 2 Class ve 3 Method bulunmalı.',
                        estimatedTime: '20 dk',
                        hints: 'İpucu: Sınıf yapısını kurarken inheritances yapısına dikkat et.',
                        isSubmitted: false
                    }
                },
                'arrow': {
                    content: '',
                    arrowConfig: {
                        start: { x: 0, y: 50 },
                        end: { x: 200, y: 50 }
                    }
                }
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

            addToHistory(); // Save state before adding NEW element
            setSlides(prev => prev.map(s => {
                if (s.id !== currentSlideId) return s;

                // Grid'li slaytta bırakma noktası bir HÜCREYE denk gelir; x/y
                // korunmaz, çünkü konumu motor belirliyor. Hücrede boş bir yuva
                // varsa yeni blok onun yerine geçer — aksi halde "+" işareti
                // bırakmanın altında öylece durmaya devam ederdi.
                if (s.layout) {
                    const cellId = cellAtPoint(s.layout, x, y);
                    if (cellId) {
                        const isFilled = (bid: string) => {
                            const el = s.elements.find(e => e.id === bid);
                            if (!el) return false;
                            return (el.content && el.content.replace(/<[^>]*>/g, '').trim().length > 0)
                                || !!el.src || !!el.imageUrl || !!el.videoUrl || el.type !== 'text';
                        };
                        const slot = emptySlotInCell(s.layout, cellId, isFilled);
                        const nextLayout = addBlockToCell(s.layout, cellId, newElement.id, slot);
                        // Yerine geçilen boş yuvanın taşıyıcı elemanı artık gereksiz.
                        const elements = slot
                            ? [...s.elements.filter(e => e.id !== slot), newElement]
                            : [...s.elements, newElement];
                        return { ...s, layout: nextLayout, elements };
                    }
                }

                return { ...s, elements: [...s.elements, newElement] };
            }));
            setSelectedElementIds([newElement.id]); // Triggers ContextMenu render
        }
    };

    // -- TRANSFORM LOGIC --

    const handleMouseDown = (e: React.MouseEvent, id: string, action: 'drag' | 'resize' | 'rotate' = 'drag', handle?: string) => {
        // Ensure main window has focus so keyboard shortcuts (Ctrl+Z, etc) work
        if (containerRef.current) {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable ||
                target.closest('[contenteditable="true"]');
            if (!isInput) containerRef.current.focus();
        }

        e.stopPropagation(); // Stop canvas pan

        // Connect Tool Logic
        if (activeTool === 'connect') {
            if (connectionStartId === null) {
                setConnectionStartId(id);
                // Maybe show toast or highlight?
            } else {
                if (connectionStartId !== id) {
                    // Create Connection
                    const newConn: any = {
                        id: Date.now().toString(),
                        startElementId: connectionStartId,
                        endElementId: id
                    };

                    setSlides(prev => prev.map(s => s.id === currentSlideId ? {
                        ...s,
                        connections: [...(s.connections || []), newConn]
                    } : s));

                    setConnectionStartId(null);
                    setActiveTool('select'); // Auto switch back or stay? User usually wants 1 arrow.
                } else {
                    setConnectionStartId(null); // Cancel if clicked same
                }
            }
            return;
        }

        if (activeTool === 'draw') {
            if (brushType === 'eraser') {
                e.stopPropagation();
                setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, elements: s.elements.filter(el => el.id !== id) } : s));
            }
            return;
        }
        if (editingElementId === id && action === 'drag') return;

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
                })),
                historySnapshot: slides // Save snapshot for Undo
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
            centerY,
            historySnapshot: slides // Save snapshot
        });
    };

    // -- Alignment State --
    interface AlignmentGuide {
        type: 'vertical' | 'horizontal';
        position: number;
        start: number;
        end: number;
    }
    const [guides, setGuides] = React.useState<AlignmentGuide[]>([]);

    const snapToGuides = (
        newX: number,
        newY: number,
        width: number,
        height: number,
        otherElements: SlideElement[]
    ) => {
        const SNAP_THRESHOLD = 5;
        const newGuides: AlignmentGuide[] = [];
        let snappedX = newX;
        let snappedY = newY;

        // Points to check on the dragging element
        const xPoints = [newX, newX + width / 2, newX + width]; // Left, Center, Right
        const yPoints = [newY, newY + height / 2, newY + height]; // Top, Middle, Bottom
        // Corresponding relative offsets for the element (0, width/2, width)
        const xOffsets = [0, width / 2, width];
        const yOffsets = [0, height / 2, height];

        // Check X Alignment (Vertical Lines)
        let foundX = false;
        for (const other of otherElements) {
            const otherXPoints = [other.x, other.x + other.width / 2, other.x + other.width];

            for (let i = 0; i < xPoints.length; i++) {
                if (foundX) break;
                for (const ox of otherXPoints) {
                    if (Math.abs(xPoints[i] - ox) < SNAP_THRESHOLD) {
                        snappedX = ox - xOffsets[i];
                        foundX = true;
                        newGuides.push({
                            type: 'vertical',
                            position: ox,
                            start: Math.min(newY, other.y),
                            end: Math.max(newY + height, other.y + other.height)
                        });
                        break;
                    }
                }
            }
        }

        // Check Y Alignment (Horizontal Lines)
        let foundY = false;
        for (const other of otherElements) {
            const otherYPoints = [other.y, other.y + other.height / 2, other.y + other.height];
            for (let i = 0; i < yPoints.length; i++) {
                if (foundY) break;
                for (const oy of otherYPoints) {
                    if (Math.abs(yPoints[i] - oy) < SNAP_THRESHOLD) {
                        snappedY = oy - yOffsets[i];
                        foundY = true;
                        newGuides.push({
                            type: 'horizontal',
                            position: oy,
                            start: Math.min(newX, other.x),
                            end: Math.max(newX + width, other.x + other.width)
                        });
                        break;
                    }
                }
            }
        }

        setGuides(newGuides);
        return { x: snappedX, y: snappedY };
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
            // Calculate Delta
            // Note: resizing logic below uses startX/Y. We should use consistent logic.
            // Existing logic used e.movementX, which accumulates.
            // But we stored initialX/Y in dragState! It is better to use absolute calc for snapping.

            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;

            if (selectedElementIds.length === 1 && dragState.elementId) {
                // SINGLE ELEMENT SNAP
                const originalEl = currentSlide.elements.find(el => el.id === dragState.elementId);
                if (originalEl) {
                    const rawX = initialX + dx;
                    const rawY = initialY + dy;

                    const otherElements = currentSlide.elements.filter(el => el.id !== dragState.elementId);
                    const snapped = snapToGuides(rawX, rawY, initialWidth, initialHeight, otherElements);

                    setSlides(prev => prev.map(s => {
                        if (s.id === currentSlideId) {
                            const updatedElements = s.elements.map(el => {
                                if (el.id === dragState.elementId) {
                                    return { ...el, x: snapped.x, y: snapped.y };
                                }
                                return el;
                            });
                            // Update Arrows (Simplified for single drag - similar logic needed if we want arrows to follow)
                            // Since we have the new X/Y, we can just update arrows connected to THIS id.
                            const finalElements = updatedElements.map(el => {
                                if (el.type === 'arrow' && el.arrowConfig) {
                                    let newConfig = { ...el.arrowConfig };
                                    let changed = false;
                                    if (el.arrowConfig.startConnectedElementId === dragState.elementId) {
                                        // We need to know delta to move point? Or just recalculate?
                                        // For now, let's just stick to the simple delta movement for arrows to avoid complexity or jumping
                                        // Wait, if we snap, the delta is (snapped.x - initialX).
                                        // Actually, let's keep it simple: Snapping only updates the OBJECT. Connected arrows might detach or need complex update.
                                        // For now, let's assume standard behavior: arrows detach if moved separately, unless we add logic.
                                        // BUT the existing logic kept them attached!
                                        // Let's re-use the delta based logic for arrows?
                                        // The delta is (snapped.x - el.x).
                                        const actualDeltaX = snapped.x - initialX; // This is total delta from start
                                        // To match previous loop behavior which was per-frame movementX...
                                        // We really should rewrite the arrow logic to be absolute based on connected ID if we want robustness.
                                        // But for now, let's simply NOT update arrows in this block if we want to be safe, 
                                        // OR copy the arrow logic but use (snapped.x - current.x)? No that's hard.

                                        // Correct approach: Update arrows in a separate effect or here based on new positions.
                                        // Use the `updateElement` helper style?
                                    }
                                    return el;
                                }
                                return el;
                            });
                            return { ...s, elements: updatedElements };
                        }
                        return s;
                    }));
                }
            } else {
                setGuides([]); // No guides for multi
                // Move ALL selected elements (Legacy Delta Logic)
                setSlides(prev => prev.map(s => {
                    if (s.id === currentSlideId) {
                        const newElements = s.elements.map(el => {
                            if (selectedElementIds.includes(el.id)) {
                                return {
                                    ...el,
                                    x: el.x + (e.movementX / scale),
                                    y: el.y + (e.movementY / scale)
                                };
                            }
                            return el;
                        });
                        // Arrow update logic (kept same as before)
                        const movingElementIds = selectedElementIds;
                        const finalElements = newElements.map(el => {
                            if (el.type === 'arrow' && el.arrowConfig) {
                                let newConfig = { ...el.arrowConfig };
                                let changed = false;
                                if (el.arrowConfig.startConnectedElementId && movingElementIds.includes(el.arrowConfig.startConnectedElementId)) {
                                    newConfig.start = { x: el.arrowConfig.start.x + (e.movementX / scale), y: el.arrowConfig.start.y + (e.movementY / scale) };
                                    changed = true;
                                }
                                if (el.arrowConfig.endConnectedElementId && movingElementIds.includes(el.arrowConfig.endConnectedElementId)) {
                                    newConfig.end = { x: el.arrowConfig.end.x + (e.movementX / scale), y: el.arrowConfig.end.y + (e.movementY / scale) };
                                    changed = true;
                                }
                                if (changed) return { ...el, arrowConfig: newConfig };
                            }
                            return el;
                        });

                        return { ...s, elements: finalElements };
                    }
                    return s;
                }));
            }
        }

        if (isResizing && dragState.handle && dragState.elementId) {
            // Resizing only works for the primary element for now
            const dx = (e.clientX - startX) / scale;
            const dy = (e.clientY - startY) / scale;

            let newW = initialWidth;
            let newH = initialHeight;
            let newX = initialX;
            let newY = initialY;

            if (dragState.handle === 'start' || dragState.handle === 'end' || dragState.handle === 'arrow-start-offset' || dragState.handle === 'arrow-end-offset' || dragState.handle === 'arrow-channel') {
                // Arrow Endpoint Dragging
                const el = currentSlide.elements.find(e => e.id === dragState.elementId);
                if (el && el.type === 'arrow' && el.arrowConfig) {
                    const mouseX = (e.clientX - canvasRef.current!.getBoundingClientRect().left) / scale;
                    const mouseY = (e.clientY - canvasRef.current!.getBoundingClientRect().top) / scale;

                    // ... (Snapping Logic - Keep as is) ...


                    // NEW: Handle Offset Drags
                    if (dragState.handle === 'arrow-start-offset') {
                        const relMouseX = mouseX - el.x;
                        const relMouseY = mouseY - el.y;
                        const s = el.arrowConfig.start;
                        const side = el.arrowConfig.startSide;
                        let margin = 30;

                        if (side === 'top') margin = s.y - relMouseY;
                        else if (side === 'bottom') margin = relMouseY - s.y;
                        else if (side === 'left') margin = s.x - relMouseX;
                        else if (side === 'right') margin = relMouseX - s.x;

                        updateElement(dragState.elementId, {
                            arrowConfig: { ...el.arrowConfig, customStartOffset: Math.max(10, margin) }
                        });
                        return;
                    }

                    if (dragState.handle === 'arrow-end-offset') {
                        const relMouseX = mouseX - el.x;
                        const relMouseY = mouseY - el.y;
                        const ePoint = el.arrowConfig.end;
                        const side = el.arrowConfig.endSide;
                        let margin = 30;

                        if (side === 'top') margin = ePoint.y - relMouseY;
                        else if (side === 'bottom') margin = relMouseY - ePoint.y;
                        else if (side === 'left') margin = ePoint.x - relMouseX;
                        else if (side === 'right') margin = relMouseX - ePoint.x;

                        updateElement(dragState.elementId, {
                            arrowConfig: { ...el.arrowConfig, customEndOffset: Math.max(10, margin) }
                        });
                        return;
                    }

                    // NEW: Handle Channel Drag
                    if (dragState.handle === 'arrow-channel') {
                        const relMouseX = mouseX - el.x;
                        const relMouseY = mouseY - el.y;

                        const startSide = el.arrowConfig.startSide;
                        const endSide = el.arrowConfig.endSide;
                        const isStartVertical = startSide === 'top' || startSide === 'bottom';
                        const isEndVertical = endSide === 'top' || endSide === 'bottom';

                        let newCustomChannel = el.arrowConfig.customChannel;

                        if (isStartVertical === isEndVertical) {
                            if (isStartVertical) {
                                // V-V -> Horizontal Channel -> Control Y
                                newCustomChannel = relMouseY;
                            } else {
                                // H-H -> Vertical Channel -> Control X
                                newCustomChannel = relMouseX;
                            }
                        }

                        updateElement(dragState.elementId, {
                            arrowConfig: { ...el.arrowConfig, customChannel: newCustomChannel }
                        });
                        return;
                    }

                    // ... (Existing Endpoint Drag Logic) ...
                    let newX = mouseX;
                    let newY = mouseY;

                    let connectedId: string | undefined = undefined;
                    let side: 'top' | 'bottom' | 'left' | 'right' | undefined = undefined;

                    // --- SNAP LOGIC START ---
                    // Check for snap targets
                    const target = [...currentSlide.elements].reverse().find(candidate => {
                        if (candidate.id === el.id) return false;
                        if (candidate.type === 'arrow') return false;
                        return (
                            mouseX >= candidate.x - 15 && // Add tolerance
                            mouseX <= candidate.x + candidate.width + 15 &&
                            mouseY >= candidate.y - 15 &&
                            mouseY <= candidate.height + candidate.y + 15
                        );
                    });

                    if (target) {
                        const tx = target.x;
                        const ty = target.y;
                        const tw = target.width;
                        const th = target.height;

                        // Calculate raw distances to edges
                        const dl = Math.abs(mouseX - tx);
                        const dr = Math.abs(mouseX - (tx + tw));
                        const dt = Math.abs(mouseY - ty);
                        const db = Math.abs(mouseY - (ty + th));

                        const min = Math.min(dl, dr, dt, db);

                        // Only snap if within 20px threshold
                        if (min < 20) {
                            if (min === dl) {
                                newX = tx;
                                newY = Math.max(ty, Math.min(ty + th, mouseY));
                                side = 'left';
                            }
                            else if (min === dr) {
                                newX = tx + tw;
                                newY = Math.max(ty, Math.min(ty + th, mouseY));
                                side = 'right';
                            }
                            else if (min === dt) {
                                newY = ty;
                                newX = Math.max(tx, Math.min(tx + tw, mouseX));
                                side = 'top';
                            }
                            else if (min === db) {
                                newY = ty + th;
                                newX = Math.max(tx, Math.min(tx + tw, mouseX));
                                side = 'bottom';
                            }

                            connectedId = target.id;
                        } else {
                            // If we are deep inside (or just barely outside tolerance but 'find' caught it),
                            // we do NOT set connectedId, allowing free movement inside.
                            connectedId = undefined;
                        }
                    }
                    // --- SNAP LOGIC END ---

                    const relX = newX - el.x;
                    const relY = newY - el.y;

                    const newConfig = { ...el.arrowConfig };
                    if (dragState.handle === 'start') {
                        newConfig.start = { x: relX, y: relY };
                        newConfig.startConnectedElementId = connectedId;
                        newConfig.startSide = connectedId ? side : undefined;
                    } else {
                        newConfig.end = { x: relX, y: relY };
                        newConfig.endConnectedElementId = connectedId;
                        newConfig.endSide = connectedId ? side : undefined;
                    }
                    updateElement(dragState.elementId, { arrowConfig: newConfig });
                    return;
                }
            }

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

    const handleMouseUp = (e?: React.MouseEvent) => {
        setGuides([]);
        // -- Commit History if we did something transformative --
        if (dragState.isDragging || dragState.isResizing || dragState.isRotating) {
            if (dragState.historySnapshot) {
                setPast(prev => [...prev.slice(-19), dragState.historySnapshot!]);
                setFuture([]);
            }
        }

        // Check for Arrow Snap
        if ((dragState.handle === 'start' || dragState.handle === 'end') && dragState.elementId) {
            const el = currentSlide.elements.find(el => el.id === dragState.elementId);
            if (el && el.type === 'arrow' && el.arrowConfig && e && canvasRef.current) {
                // Find element under mouse
                // We can't use e.target directly because it might be the handle itself or the canvas overlay.
                // We need to check coordinates.
                const canvasRect = canvasRef.current.getBoundingClientRect();
                const mouseX = (e.clientX - canvasRect.left) / scale;
                const mouseY = (e.clientY - canvasRect.top) / scale;

                // Simple point-in-rect check for all OTHER elements
                // Reverse to find top-most
                const target = [...currentSlide.elements].reverse().find(candidate => {
                    if (candidate.id === el.id) return false; // Don't snap to self
                    if (candidate.type === 'arrow') return false; // Don't snap to other arrows (yet)

                    return (
                        mouseX >= candidate.x &&
                        mouseX <= candidate.x + candidate.width &&
                        mouseY >= candidate.y &&
                        mouseY <= candidate.y + candidate.height
                    );
                });

                if (target) {
                    // Snap to Closest Edge!
                    const newConfig = { ...el.arrowConfig };

                    // Math for closest point on AABB perimeter
                    const tx = target.x;
                    const ty = target.y;
                    const tw = target.width;
                    const th = target.height;

                    // Calculate raw distances to edges
                    const dl = Math.abs(mouseX - tx);
                    const dr = Math.abs(mouseX - (tx + tw));
                    const dt = Math.abs(mouseY - ty);
                    const db = Math.abs(mouseY - (ty + th));

                    const min = Math.min(dl, dr, dt, db);

                    let snapX = mouseX;
                    let snapY = mouseY;
                    let side: 'top' | 'bottom' | 'left' | 'right' | undefined;

                    if (min < 20) {
                        if (min === dl) { snapX = tx; snapY = Math.max(ty, Math.min(ty + th, mouseY)); side = 'left'; }
                        else if (min === dr) { snapX = tx + tw; snapY = Math.max(ty, Math.min(ty + th, mouseY)); side = 'right'; }
                        else if (min === dt) { snapY = ty; snapX = Math.max(tx, Math.min(tx + tw, mouseX)); side = 'top'; }
                        else if (min === db) { snapY = ty + th; snapX = Math.max(tx, Math.min(tx + tw, mouseX)); side = 'bottom'; }

                        // Update Config
                        if (dragState.handle === 'start') {
                            newConfig.startConnectedElementId = target.id;
                            newConfig.startSide = side;
                            newConfig.start = { x: snapX - el.x, y: snapY - el.y };
                        } else {
                            newConfig.endConnectedElementId = target.id;
                            newConfig.endSide = side;
                            newConfig.end = { x: snapX - el.x, y: snapY - el.y };
                        }
                    } else {
                        // Not close enough to snap -> DISCONNECT if it was connected
                        if (dragState.handle === 'start') {
                            newConfig.startConnectedElementId = undefined;
                            newConfig.startSide = undefined;
                        } else {
                            newConfig.endConnectedElementId = undefined;
                            newConfig.endSide = undefined;
                        }
                    }
                    updateElement(el.id, { arrowConfig: newConfig });
                } else {
                    // Disconnect if dropped on empty space
                    const newConfig = { ...el.arrowConfig };
                    if (dragState.handle === 'start') {
                        newConfig.startConnectedElementId = undefined;
                    } else {
                        newConfig.endConnectedElementId = undefined;
                    }
                    updateElement(el.id, { arrowConfig: newConfig });
                }
            }
        }

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

    // ANLA/UYGULA/BİRLEŞTİR/ÜRET/QUIZ/ÖDEV etiketi ↔ backend'in beklediği modül tipi
    const STAGE_TO_MODULE_TYPE: Record<string, string> = {
        'ANLA': 'UNDERSTAND', 'UYGULA': 'APPLY', 'BİRLEŞTİR': 'CONNECT',
        'ÜRET': 'CREATE', 'QUIZ': 'QUIZ', 'ÖDEV': 'HOMEWORK'
    };

    // Roadmap tema rengi ↔ modül aşaması (öğrenci tarafındaki eşlemenin aynısı).
    const THEME_TO_MODULE_TYPE: Record<string, string> = {
        purple: 'UNDERSTAND', cyan: 'APPLY', green: 'CONNECT',
        yellow: 'CREATE', quiz: 'QUIZ', homework: 'HOMEWORK'
    };

    // Bu modülün ait olduğu Ders'i ve o Ders'in TÜM kardeş modüllerini bulur.
    // (Yalnızca Ders'in İLK modülünde lessonTopic/lessonNumber/aiLessonObjective dolu
    // olur — geriye doğru arayarak Ders'in başını, ileri giderek sonunu buluruz.)
    //
    // Kardeşler tekrar üretim için ŞART: AI'ye "senin kapsamın nerede bitiyor"u
    // yalnızca onlar söylüyor. Kardeşsiz istekte model, ders başlığındaki tüm
    // konuları tek modüle dolduruyordu.
    const findDersContext = () => {
        const idx = allLessons.findIndex((n: any) => String(n.id) === String(noteId));
        if (idx === -1) return { dersNode: null, currentNode: null, siblings: [], posInDers: 0 };

        let start = idx;
        while (start > 0 && allLessons[start].lessonTopic === undefined) start--;

        let end = start + 1;
        while (end < allLessons.length && allLessons[end].lessonTopic === undefined) end++;

        return {
            dersNode: allLessons[start],
            currentNode: allLessons[idx],
            siblings: allLessons.slice(start, end),
            posInDers: idx - start,
        };
    };

    // AI, dersi ilk oluştururken bu modülün konusunu zaten biliyordu (aiModuleTopic) —
    // aynı konuyu kullanarak SADECE bu modülün slaytlarını (mevcut deste yerine) yeniden üretir.
    const handleRegenerateWithAI = async () => {
        if (!courseId || !noteId) return;
        const ok = window.confirm(
            "Bu modüldeki TÜM slaytlar silinip AI tarafından sıfırdan yeniden oluşturulacak.\n" +
            "Yaptığınız düzenlemeler kaybolacak. Devam etmek istiyor musunuz?"
        );
        if (!ok) return;

        setIsRegenerating(true);
        try {
            const { dersNode, currentNode, siblings, posInDers } = findDersContext();
            const moduleType = STAGE_TO_MODULE_TYPE[activeStage] || 'UNDERSTAND';
            const moduleTopic = currentNode?.aiModuleTopic || currentNode?.title || projectName;
            const lessonTitle = dersNode?.lessonTopic || projectName;

            // Dersin tüm modülleri gönderilir; hedefin dışındakiler AI için yalnızca
            // kapsam sınırıdır (backend sadece target_module_index'i üretir).
            const modules = siblings.length
                ? siblings.map((n: any, i: number) => ({
                    type: i === posInDers
                        ? moduleType
                        : (THEME_TO_MODULE_TYPE[n.theme] || 'UNDERSTAND'),
                    topic: n.aiModuleTopic || n.title || '',
                }))
                : [{ type: moduleType, topic: moduleTopic }];

            const response = await api.post('/courses/generate_lesson_slides', {
                topic: courseTitle || projectName,
                difficulty: 'Orta',
                audience: 'Karma seviye öğrenciler',
                lesson_number: dersNode?.lessonNumber || 1,
                lesson_title: lessonTitle,
                lesson_objective: dersNode?.aiLessonObjective || `Bu derste ${moduleTopic} konusu öğrenilecektir.`,
                modules,
                is_regeneration: true,
                target_module_index: siblings.length ? posInDers : 0,
            });

            const newSlides = response.data?.notes?.[0]?.slides;
            if (newSlides && newSlides.length > 0) {
                setSlides(newSlides);
                setCurrentSlideId(newSlides[0].id);
                setSelectedElementIds([]);
                setEditingElementId(null);
                setSaveStatus('saving'); // öğretmen gözden geçirip "Kaydet"e basmalı
            } else {
                alert("AI içerik üretemedi. Lütfen tekrar deneyin.");
            }
        } catch (err) {
            console.error("AI ile yeniden oluşturma hatası:", err);
            alert("AI ile yeniden oluşturulurken bir hata oluştu.");
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleSaveAction = async () => {
        if (!courseId || !noteId) {
            // Standalone draft mode, fallback to modal selector
            setShowSaveModal(true);
            return;
        }

        setSaveStatus('saving');
        try {
            // Yeni ilişkisel endpoint'e doğrudan kaydet (LessonContent tablosu güncellenir)
            await api.put(`/courses/${courseId}/lessons/${noteId}`, {
                title: projectName,
                slides: slides,
            });

            setSaveStatus('saved');
            localStorage.removeItem(BUILDER_STORAGE_KEY);
            alert("Ders içeriği başarıyla kaydedildi!");
        } catch (error) {
            console.error("Direct save error:", error);
            alert("Kaydedilirken bir hata oluştu.");
            setSaveStatus('saved');
        }
    };

    const getStageColor = () => {
        switch (activeStage) {
            case 'ANLA': return '#ec4899'; // fuchsia-500
            case 'UYGULA': return '#06b6d4'; // cyan-500
            case 'BİRLEŞTİR': return '#10b981'; // emerald-500
            case 'ÜRET': return '#f59e0b'; // amber-500
            case 'QUIZ': return '#7c3aed'; // purple-600
            case 'ÖDEV': return '#2563eb'; // blue-600
            default: return '#7c3aed';
        }
    };
    const stageColor = getStageColor();
    const bounds = getSelectionBounds(); // For Group Overlay
    const [layoutMode, setLayoutMode] = useState<LayoutMode>('stage');

    /**
     * Grid'li slaytlarda elemanların konumu motordan gelir, el ile sürüklemeden
     * değil. Builder tuvali de aynı motoru kullanıyor — öğretmen tasarlarken
     * öğrencinin göreceğinin birebir aynısını görsün diye.
     *
     * Öğretmen 16:9 SAHNE katmanında ÇALIŞIR; dar mod salt önizleme. Dar modda
     * düzenlemeye izin vermek iki ayrı tasarım demek olurdu.
     */
    const isNarrowPreview = layoutMode === 'narrow' && !!currentSlide?.layout;
    const gridLaid = React.useMemo(
        () => (currentSlide?.layout ? layoutElements(currentSlide, isNarrowPreview ? 'narrow' : 'stage') : null),
        [currentSlide, isNarrowPreview],
    );
    const canvasElements: SlideElement[] = gridLaid ? gridLaid.elements : (currentSlide?.elements || []);
    const canvasW = gridLaid ? gridLaid.width : STAGE_WIDTH;
    const canvasH = gridLaid ? gridLaid.height : STAGE_HEIGHT;

    /** Grid düzenini değiştiren işlemler için ortak yazıcı. */
    const updateLayout = (fn: (l: NonNullable<Slide['layout']>) => NonNullable<Slide['layout']>) => {
        addToHistory();
        setSlides(prev => prev.map(s =>
            s.id === currentSlideId && s.layout ? { ...s, layout: fn(s.layout) } : s));
    };

    /** İçi dolu bloklar: boş yuvalar "+" alanı olarak çizilecek. */
    const filledBlockIds = React.useMemo(() => {
        const set = new Set<string>();
        (currentSlide?.elements || []).forEach(el => {
            const hasBody = (el.content && el.content.replace(/<[^>]*>/g, '').trim().length > 0)
                || !!el.src || !!el.imageUrl || !!el.videoUrl || el.type !== 'text';
            if (hasBody) set.add(el.id);
        });
        return set;
    }, [currentSlide]);

    if (isLoadingCourse) {
        return (
            <div className="w-full h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
                <p className="font-bold text-sm font-display animate-pulse uppercase tracking-wider">Ders İçeriği Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            tabIndex={-1}
            className="w-full h-screen bg-[#f5f5f7] font-sans flex flex-col overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-700 outline-none"
            onMouseUp={(e) => handleMouseUp(e)}
            onMouseMove={handleMouseMove}
            onDoubleClick={(e) => {
                if (activeTool !== 'select') return;
                const target = e.target as HTMLElement;
                const elementWrapper = target.closest('[data-id]');
                if (elementWrapper) {
                    const id = elementWrapper.getAttribute('data-id');
                    const type = elementWrapper.getAttribute('data-type');
                    // Enable editing for shapes, circles, text, sticky
                    if (id && ['text', 'sticky', 'shape', 'circle'].includes(type || '')) {
                        setEditingElementId(id);
                        setSelectedElementIds([id]);
                    }
                }
            }}
            onMouseDown={(e) => {
                // Focus container on background click
                if (containerRef.current) {
                    const target = e.target as HTMLElement;
                    const isInput = target.tagName === 'INPUT' ||
                        target.tagName === 'TEXTAREA' ||
                        target.isContentEditable ||
                        target.closest('[contenteditable="true"]');
                    if (!isInput) containerRef.current.focus();
                }

                if (activeTool === 'draw') {
                    // Don't stop propagation, let it bubble to container handler
                    // But prevent default to stop text selection
                    e.preventDefault();
                    if (!canvasRef.current) return;
                    const canvasRect = canvasRef.current.getBoundingClientRect();
                    const mouseX = (e.clientX - canvasRect.left) / scale;
                    const mouseY = (e.clientY - canvasRect.top) / scale;
                    setIsDrawing(true);
                    setCurrentPathPoints([{ x: mouseX, y: mouseY }]);
                    setSelectedElementIds([]);
                } else if (activeTool === 'select') {
                    // Start Box Selection
                    if (!canvasRef.current) return;
                    const canvasRect = canvasRef.current.getBoundingClientRect();
                    const mouseX = (e.clientX - canvasRect.left) / scale;
                    const mouseY = (e.clientY - canvasRect.top) / scale;

                    if (!e.shiftKey) setSelectedElementIds([]);
                    setSelectionBox({ startX: mouseX, startY: mouseY, currentX: mouseX, currentY: mouseY });

                    setActiveColorPickerId(null);
                }
                // If activeTool is 'connect', do nothing on canvas background click
            }}
            onContextMenu={handleContextMenu}

        >
            {/* LAYERS PANEL (Right) - Hidden in Preview */}
            {!isPreview && showLayers && (
                <LayersPanel
                    elements={currentSlide.elements}
                    selectedIds={selectedElementIds}
                    onSelect={(id, multi) => {
                        if (multi) {
                            if (selectedElementIds.includes(id)) setSelectedElementIds(prev => prev.filter(eid => eid !== id));
                            else setSelectedElementIds(prev => [...prev, id]);
                        } else {
                            setSelectedElementIds([id]);
                        }
                    }}
                    onReorder={() => { }}
                />
            )}



            {contextMenu.visible && (
                <RightClickMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    elementId={contextMenu.elementId}
                    onClose={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                    onAction={handleMenuAction}
                />
            )}
            {/* HEADER & STAGE INDICATOR */}
            {/* HEADER & STAGE INDICATOR */}
            {!(isPreview && currentSlide.type === 'game') && (
                <LessonBuilderHeader
                    onExit={onExit}
                    projectName={projectName}
                    setProjectName={setProjectName}
                    saveStatus={saveStatus}
                    onSave={handleSaveAction}
                    activeStage={activeStage}
                    setActiveStage={setActiveStage}
                    onUndo={handleUndo}
                    onRedo={handleRedo}
                    onCopy={handleCopy}
                    onPaste={handlePaste}
                    isPreview={isPreview}
                    setIsPreview={setIsPreview}
                    previewRole={previewRole}
                    setPreviewRole={setPreviewRole}
                    isStageLocked={!!searchParams.get("category")}
                    isAdmin={userData?.role === 'admin'}
                    canRegenerateAI={!!courseId && !!noteId}
                    isRegenerating={isRegenerating}
                    onRegenerateAI={handleRegenerateWithAI}
                    onSaveAsTemplate={() => {
                        setTemplateTitle(`${activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Şablonu`);
                        setTemplateDesc('');
                        setTemplateCategory(activeStage);
                        setSaveMode("new");
                        setSelectedTemplateIdToUpdate("");
                        setShowSaveTemplateModal(true);
                        api.get('/builder/templates').then(res => {
                            setTemplatesList(res.data || []);
                        }).catch(err => {
                            console.error("Error loading templates", err);
                        });
                    }}
                />
            )}

            {isPreview && currentSlide.type === 'game' && (
                <button
                    onClick={() => setIsPreview(false)}
                    className="fixed top-6 right-6 z-[250] bg-red-500 hover:bg-red-650 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-xl shadow-lg border-b-4 border-red-750 active:border-b-0 active:translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer select-none"
                >
                    <X className="w-4 h-4" />
                    <span>Önizlemeyi Bitir</span>
                </button>
            )}

            <div
                className="flex-1 w-full flex overflow-hidden relative"
            >
                {/* STYLES */}
                <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&family=Fredoka:wght@300;400;500;600&family=Pacifico&family=Patrick+Hand&family=Fira+Code:wght@400;500&family=Inter:wght@400;700&display=swap');
                .cursor-eraser { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>') 0 24, auto; }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .animate-slide-in-right {
                    animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
            `}</style>

                {/* HEADER & ACTIONS */}


                {/* MAIN CONTENT AREA: CANVAS OR GAME BUILDER */}
                {currentSlide.type === 'game' ? (
                    <div className={`flex-1 relative ${isPreview ? 'fixed inset-0 w-screen h-screen z-[200] bg-gray-50 flex items-center justify-center' : 'h-full overflow-y-auto'}`}>
                        <GameBuilder
                            slide={currentSlide}
                            updateSlide={(updates) => {
                                setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, ...updates } : s));
                            }}
                            isPreview={isPreview}
                            previewRole={previewRole}
                            onExitPreview={() => setIsPreview(false)}
                        />
                    </div>
                ) : currentSlide.type === 'homework' ? (
                    // Önizlemede items-stretch: StudentHomeworkView artık kabına yayılıyor,
                    // items-center onu içerik yüksekliğine sıkıştırıp kaydırmayı bozardı.
                    <div className={`flex-1 relative ${isPreview ? 'fixed inset-0 w-screen h-screen z-[200] bg-slate-50 flex items-stretch' : 'h-full overflow-y-auto pt-14 pb-20'}`}>
                        {isPreview ? (
                            <StudentHomeworkView
                                slide={currentSlide}
                                isPreviewMode={true}
                                onComplete={() => setIsPreview(false)}
                                onClose={() => setIsPreview(false)}
                            />
                        ) : (
                            <HomeworkBuilder
                                slide={currentSlide}
                                updateSlide={(updates) => {
                                    setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, ...updates } : s));
                                }}
                            />
                        )}
                    </div>
                ) : currentSlide.type === 'challenge' ? (
                    // Tam ekran YAPILMAZ: fixed inset-0 önizleme çıkış butonunu örtüyordu.
                    <div className="flex-1 min-h-0 w-full h-full overflow-hidden relative">
                        <ChallengeSlideBuilder
                            slide={currentSlide}
                            updateSlide={(updates) => {
                                setSlides(prev => prev.map(s => s.id === currentSlideId ? { ...s, ...updates } : s));
                            }}
                            // Düzenleme: görevi kur · Öğrenci önizlemesi: çöz · Öğretmen önizlemesi: teslimleri gör
                            role={!isPreview ? 'edit' : previewRole === 'student' ? 'student' : 'review'}
                            courseId={courseId || undefined}
                            // Öğrenci tarafıyla AYNI anahtar (bkz. LessonSlide.tsx)
                            submissionNodeId={`challenge:${currentSlide.id}`}
                        />
                    </div>
                ) : currentSlide.type === 'coding' ? (
                    <div className="flex-1 bg-gray-100 flex items-center justify-center overflow-hidden">
                        <CodingSlideBuilder
                            slide={currentSlide}
                            updateSlide={(id, updates) => {
                                setSlides(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
                            }}
                        />
                    </div>
                ) : (
                    <>
                        {/* TOOLBAR (Left) - Hidden in Preview */}
                        {!isPreview && (
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
                                activeStage={activeStage}
                            />
                        )}

                        {/* FLOATING CONTEXT MENU */}
                        {!isPreview && selectedElementIds.length > 0 && !dragState.isDragging && (
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
                        <div
                            className="flex-1 overflow-auto relative bg-[#f5f5f7] flex items-center justify-center cursor-default h-full"
                            onMouseDown={(e) => {
                                if (e.target === e.currentTarget) {
                                    setSelectedElementIds([]);
                                    setIsCanvasSelected(false);
                                    setActiveColorPickerId(null);
                                }
                            }}
                        >
                            {/* ... Canvas Content ... */}
                            <div
                                ref={canvasRef}
                                onDrop={handleCanvasDrop}
                                onDragOver={(e) => e.preventDefault()}
                                onMouseDown={(e) => {
                                    // Canvas Selection Logic
                                    if (activeTool === 'select' || activeTool === 'connect') {
                                        setIsCanvasSelected(true);
                                        setSelectedElementIds([]);
                                        setActiveColorPickerId(null);
                                    }

                                    if (activeTool === 'draw') {
                                        e.preventDefault();
                                    }
                                }}
                                className={`shadow-2xl relative transition-transform duration-200 origin-center select-none rounded-sm ${activeTool === 'draw' ? (brushType === 'eraser' ? 'cursor-eraser' : 'cursor-crosshair') : ''} ${activeTool === 'connect' ? 'cursor-crosshair' : ''} ${currentSlide.background === 'notebook' ? 'bg-notebook-pattern pl-16' : ''}`}
                                style={{
                                    // Dar önizlemede tuval 600 tabanına ve içeriğe göre
                                    // uzayan bir yüksekliğe geçer — VS Code panelinde
                                    // görünecek olan tam olarak budur.
                                    width: `${canvasW}px`,
                                    height: `${canvasH}px`,
                                    transform: `scale(${scale})`,
                                    backgroundColor: currentSlide.backgroundColor || '#ffffff'
                                }}
                            >
                                {currentSlide.background !== 'notebook' && (
                                    <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '24px 24px' }} />
                                )}

                                {currentSlide.background === 'notebook' && (
                                    <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#3e3e3e] border-r border-gray-900/10 flex flex-col justify-evenly py-4 z-0 shadow-xl">
                                        <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-black/20 to-transparent"></div>
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} className="relative w-full h-8 flex items-center justify-center shrink-0">
                                                <div className="w-16 h-3 bg-gradient-to-b from-gray-300 via-gray-100 to-gray-400 rounded-full shadow-lg transform -rotate-2 z-20 -ml-8"></div>
                                                <div className="absolute right-[-4px] w-2 h-2 bg-black/30 rounded-full blur-[1px]"></div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Active Drawing Preview */}
                                {isDrawing && currentPathPoints.length > 1 && (
                                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]">
                                        <path d={`M ${currentPathPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`} fill="none" stroke={brushColor} strokeWidth={brushSize} strokeOpacity={brushOpacity} strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}

                                {/* SELECTION BOX (Drag Select) */}
                                {selectionBox && (
                                    <div
                                        className="absolute border-2 border-indigo-500 bg-indigo-500/10 pointer-events-none z-[100]"
                                        style={{ left: Math.min(selectionBox.startX, selectionBox.currentX), top: Math.min(selectionBox.startY, selectionBox.currentY), width: Math.abs(selectionBox.currentX - selectionBox.startX), height: Math.abs(selectionBox.currentY - selectionBox.startY) }}
                                    />
                                )}

                                {/* SINGLE ELEMENT SELECTION OVERLAY */}
                                {!isPreview && selectedElementIds.map(id => {
                                    // Grid'li slaytta seçim çerçevesi de motorun hesapladığı
                                    // dikdörtgeni izlemeli; ham el.x/y hâlâ 0 olabilir.
                                    const el = canvasElements.find(e => e.id === id);
                                    if (el && !editingElementId) {
                                        return (
                                            <SelectionOverlay
                                                key={id}
                                                el={el}
                                                isEditing={editingElementId === id}
                                                handleMouseDown={handleMouseDown}
                                            />
                                        );
                                    }
                                    return null;
                                })}

                                {/* Canvas Selection Border */}
                                {!isPreview && isCanvasSelected && !dragState.isDragging && (
                                    <div className="absolute inset-0 border-2 border-indigo-500 z-10 pointer-events-none animate-in fade-in duration-200"></div>
                                )}

                                {/* Group Selection Overlay */}
                                {!isPreview && selectedElementIds.length > 1 && bounds && !dragState.isDragging && (
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

                                {/* CONNECTOR LAYER */}
                                <ConnectorRenderer
                                    connections={currentSlide.connections || []}
                                    elements={canvasElements}
                                />

                                {/* ALIGNMENT GUIDES */}
                                {guides.map((guide, i) => (
                                    <div
                                        key={i}
                                        className="absolute bg-blue-500 z-[100] pointer-events-none"
                                        style={{
                                            left: guide.type === 'vertical' ? guide.position : guide.start,
                                            top: guide.type === 'horizontal' ? guide.position : guide.start,
                                            width: guide.type === 'vertical' ? '1px' : (guide.end - guide.start),
                                            height: guide.type === 'horizontal' ? '1px' : (guide.end - guide.start),
                                        }}
                                    />
                                ))}

                                {/* GRID HÜCRELERİ — yapıyı görünür kılar, düzenlemeyi mümkün kılar.
                                    Dar önizlemede gizli: orası salt çıktı, düzenleme yeri değil. */}
                                {!isPreview && currentSlide.layout && !isNarrowPreview && (
                                    <GridOverlay
                                        layout={currentSlide.layout}
                                        filledBlockIds={filledBlockIds}
                                        scale={scale}
                                        onPickSlot={(blockId) => {
                                            setSelectedElementIds([blockId]);
                                            setEditingElementId(blockId);
                                            setIsCanvasSelected(false);
                                        }}
                                        onMoveBlock={(blockId, cellId) =>
                                            updateLayout(l => moveBlockToCell(l, blockId, cellId))}
                                        onResizeColumns={(rowId, leftCellId, deltaPx) =>
                                            // Sürükleme sırasında her karede history'ye yazmıyoruz;
                                            // tek bir çekme onlarca geri-al adımı üretirdi.
                                            setSlides(prev => prev.map(s =>
                                                s.id === currentSlideId && s.layout
                                                    ? { ...s, layout: resizeColumns(s.layout, rowId, leftCellId, deltaPx) }
                                                    : s))}
                                    />
                                )}

                                {canvasElements.map(el => (
                                    <CanvasElement
                                        key={el.id}
                                        el={el}
                                        isEditing={editingElementId === el.id}
                                        setEditingElementId={setEditingElementId}
                                        updateElement={updateElement}
                                        updateElementStyle={updateElementStyle}
                                        deleteElement={deleteElement}
                                        // Grid'li slaytta konum motordan geliyor; sürükleme
                                        // kapalı. Açık bırakılsaydı öğretmen kutuyu taşır,
                                        // sonraki çizimde motor onu geri koyar ve sistem
                                        // bozukmuş gibi görünürdü.
                                        handleMouseDown={currentSlide.layout ? (() => {}) : handleMouseDown}
                                        isPreview={isPreview}
                                        previewRole={previewRole}
                                        elements={canvasElements}
                                        onSpawnCodeEditor={spawnCodeEditorForChallenge}
                                        allLessons={allLessons}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Canvas Context Menu */}
                {!isPreview && isCanvasSelected && !dragState.isDragging && (
                    <ContextMenu
                        elements={[]}
                        scale={scale}
                        canvasRect={canvasRef.current?.getBoundingClientRect() || null}
                        activeColorPickerId={activeColorPickerId}
                        setActiveColorPickerId={setActiveColorPickerId}
                        updateElementStyle={() => { }}
                        updateElement={() => { }}
                        deleteElement={() => { }}
                        editingElementId={null}
                        isCanvasSelected={true}
                        slideBackgroundColor={currentSlide.backgroundColor || (currentSlide.background === 'notebook' ? '#fff' : '#ffffff')}
                        onUpdateSlideBackground={(color) => {
                            const newSlides = slides.map(s =>
                                s.id === currentSlide.id
                                    ? { ...s, backgroundColor: color }
                                    : s
                            );
                            setSlides(newSlides);
                        }}
                    />
                )}

                {/* ZOOM Buttons */}
                {!isPreview && <LessonBuilderZoomControls scale={scale} setScale={setScale} />}
                {!isPreview && (
                    <LayoutModeToggle
                        mode={layoutMode}
                        setMode={setLayoutMode}
                        disabled={!currentSlide?.layout}
                    />
                )}

                {/* SLIDE STRIP */}
                {!isPreview && (
                    <LessonBuilderSlideStrip
                        slides={slides}
                        currentSlideId={currentSlideId}
                        setCurrentSlideId={setCurrentSlideId}
                        onAddSlide={() => setShowAddSlideModal(true)}
                        onDeleteSlide={deleteSlide}
                        onReorderSlides={(newSlides) => {
                            setPast(prev => [...prev, slides]);
                            setSlides(newSlides);
                            setFuture([]);
                        }}
                    />
                )}

                {/* ADD SLIDE MODAL */}
                <AddSlideModal
                    isOpen={showAddSlideModal}
                    onClose={() => setShowAddSlideModal(false)}
                    activeStage={activeStage}
                    stageColor={stageColor}
                    isAdmin={userData?.role === 'admin'}
                    onAddSlide={(type, config) => {
                        const newSlide: Slide = {
                            id: Date.now(),
                            type: (type === 'notebook' || type === 'coding' || type === 'template') ? 'normal' : type,
                            background: (config?.background ? config.background : (type === 'notebook' ? 'notebook' : 'default')) as any,
                            gameType: type === 'game' ? (config?.gameType as 'matching' | 'monster' || 'matching') : undefined,
                            gameConfig: type === 'game' ? { timeLimit: 100, questions: [] } : undefined,
                            challengeConfig: type === 'challenge'
                                ? (config?.challengeConfig || defaultChallengeConfig())
                                : undefined,
                            homeworkConfig: type === 'homework' ? {
                                title: 'Yeni Ödev Görevi',
                                instructions: 'Lütfen ödev talimatlarını buraya yazın.',
                                submissionType: 'text',
                                points: 100,
                                starterCode: '# Kodunuzu buraya yazın\n'
                            } : undefined,
                            layout: config?.layout,
                            // DİKKAT: grid'li şablonlarda id'ler YENİDEN ÜRETİLMEZ.
                            // layout, bloklara id ile işaret ediyor; id'yi değiştirmek
                            // her bloğu yerleşimden koparır ve slayt boş görünür.
                            elements: config?.elements ? (config.layout ? config.elements : config.elements.map((el: any) => ({
                                ...el,
                                id: Date.now().toString() + Math.random().toString().slice(2, 5)
                            }))) : (type === 'coding' ? [
                                {
                                    id: 'code-1',
                                    type: 'code_editor',
                                    x: 50,
                                    y: 100,
                                    width: 500,
                                    height: 380,
                                    content: '# Kodunuzu buraya yazın\nprint("Merhaba Dunya")\n',
                                    style: { fontSize: 14, fontFamily: 'Fira Code' }
                                }
                            ] : []),
                            connections: []
                        };
                        setSlides(prev => [...prev, newSlide]);
                        setCurrentSlideId(newSlide.id);
                        setShowAddSlideModal(false);
                    }}
                />

                {/* PROPERTIES PANEL (Right) - Shows when element is selected & not in preview */}
                {!isPreview && !showLayers && selectedElementIds.length === 1 && (
                    <PropertiesPanel
                        selectedElementIds={selectedElementIds}
                        elements={currentSlide.elements}
                        updateElement={updateElement}
                        onClose={() => setSelectedElementIds([])}
                    />
                )}

                <SaveToCourseModal
                    isOpen={showSaveModal}
                    onClose={() => setShowSaveModal(false)}
                    slides={slides}
                    initialCourseId={courseId ? parseInt(courseId) : undefined}
                    courseTitle={projectName}
                />

                {showSaveTemplateModal && (
                    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-indigo-700 flex items-center justify-between text-white">
                                <div className="flex items-center gap-2.5">
                                    <LayoutTemplate className="w-6 h-6 animate-pulse" />
                                    <h3 className="text-lg font-black tracking-wide font-display">Şablon Kaydet</h3>
                                </div>
                                <button
                                    onClick={() => setShowSaveTemplateModal(false)}
                                    className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Save Mode Tabs */}
                            <div className="flex border-b border-gray-150">
                                <button
                                    onClick={() => setSaveMode("new")}
                                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${saveMode === 'new' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Yeni Şablon
                                </button>
                                <button
                                    onClick={() => setSaveMode("update")}
                                    className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${saveMode === 'update' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                >
                                    Mevcut Şablonu Güncelle
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-6 flex flex-col gap-4">
                                {saveMode === "update" && (
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Güncellenecek Şablon Seçin</label>
                                        <select
                                            value={selectedTemplateIdToUpdate}
                                            onChange={(e) => {
                                                const tid = e.target.value;
                                                setSelectedTemplateIdToUpdate(tid);
                                                const found = templatesList.find(t => t.id === tid);
                                                if (found) {
                                                    setTemplateTitle(found.title || "");
                                                    setTemplateDesc(found.description || "");
                                                    setTemplateCategory(found.category || "ANLA");
                                                }
                                            }}
                                            className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-800 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                        >
                                            <option value="">-- Şablon Seçin --</option>
                                            {templatesList.map(t => (
                                                <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Şablon Adı</label>
                                    <input
                                        type="text"
                                        value={templateTitle}
                                        onChange={(e) => setTemplateTitle(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                        placeholder="Örn: Konu Giriş Tahtası"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Şablon Açıklaması</label>
                                    <textarea
                                        value={templateDesc}
                                        onChange={(e) => setTemplateDesc(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm resize-none h-20"
                                        placeholder="Örn: Bu şablon sol tarafta metin, sağ tarafta kod kutusu içerir."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kategori / Seviye</label>
                                    <select
                                        value={templateCategory}
                                        onChange={(e) => setTemplateCategory(e.target.value as any)}
                                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-black text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm uppercase"
                                    >
                                        <option value="ANLA">ANLA</option>
                                        <option value="UYGULA">UYGULA</option>
                                        <option value="BİRLEŞTİR">BİRLEŞTİR</option>
                                        <option value="ÜRET">ÜRET</option>
                                        <option value="QUIZ">QUİZ</option>
                                        <option value="ÖDEV">ÖDEV</option>
                                    </select>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                                <button
                                    onClick={() => setShowSaveTemplateModal(false)}
                                    className="px-4 py-2 border-2 border-gray-200 text-gray-500 font-black rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-xs uppercase"
                                >
                                    Vazgeç
                                </button>
                                <button
                                    onClick={async () => {
                                        if (saveMode === "update" && !selectedTemplateIdToUpdate) {
                                            alert("Lütfen güncellenecek bir şablon seçin!");
                                            return;
                                        }
                                        if (!templateTitle.trim()) {
                                            alert("Şablon adı boş olamaz!");
                                            return;
                                        }
                                        setIsSavingTemplate(true);
                                        try {
                                            if (saveMode === "new") {
                                                await api.post('/builder/templates', {
                                                    title: templateTitle,
                                                    description: templateDesc,
                                                    category: templateCategory,
                                                    elements: currentSlide.elements,
                                                    background: currentSlide.background
                                                });
                                                alert("Şablon başarıyla kaydedildi!");
                                            } else {
                                                await api.put(`/builder/templates/${selectedTemplateIdToUpdate}`, {
                                                    title: templateTitle,
                                                    description: templateDesc,
                                                    category: templateCategory,
                                                    elements: currentSlide.elements,
                                                    background: currentSlide.background
                                                });
                                                alert("Şablon başarıyla güncellendi!");
                                            }
                                            setShowSaveTemplateModal(false);
                                        } catch (err: any) {
                                            console.error(err);
                                            alert(err.response?.data?.detail || "Şablon kaydedilirken bir hata oluştu.");
                                        } finally {
                                            setIsSavingTemplate(false);
                                        }
                                    }}
                                    disabled={isSavingTemplate}
                                    className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-xl shadow-[0_4px_0_rgba(124,58,237,0.3)] hover:shadow-[0_2px_0_rgba(124,58,237,0.3)] hover:translate-y-[2px] transition-all text-xs uppercase disabled:opacity-50"
                                >
                                    {isSavingTemplate ? 'Kaydediliyor...' : (saveMode === 'new' ? 'Kaydet' : 'Güncelle')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LessonBuilderPage;
