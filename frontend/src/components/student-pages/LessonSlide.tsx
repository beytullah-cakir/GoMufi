import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, ChevronLeft, ChevronRight, Check, Settings } from 'lucide-react';
import CanvasElement from '../lesson-builder/CanvasElement';
import ConnectorRenderer from '../lesson-builder/ConnectorRenderer';
import GameBuilder from '../lesson-builder/GameBuilder';
import { useWebSocket } from '../../hooks/useWebSocket';

interface LessonSlideProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    lessonTitle?: string;
    slides?: any[];
    previewRole?: 'student' | 'teacher';
    courseId?: string;
    lessonIndex?: number;
    userData?: any;
    initialSlideIndex?: number;
}

const LessonSlide: React.FC<LessonSlideProps> = ({ 
    isOpen, 
    onClose, 
    onComplete, 
    lessonTitle, 
    slides = [],
    previewRole = 'student',
    courseId,
    lessonIndex,
    userData,
    initialSlideIndex = 0
}) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [localSlides, setLocalSlides] = useState<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Sync States
    const [followMode, setFollowMode] = useState<'follow' | 'previous_only' | 'free'>('follow');
    const [teacherCurrentSlide, setTeacherCurrentSlide] = useState<number>(0);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Student follow choice state & ready state
    const [isFollowingTeacher, setIsFollowingTeacher] = useState<boolean>(true);
    const [isReady, setIsReady] = useState<boolean>(false);
    const [showCatchUpAlert, setShowCatchUpAlert] = useState<boolean>(false);

    // Teacher active students tracking list
    const [studentsList, setStudentsList] = useState<{ [id: string]: { name: string, isReady: boolean, currentSlide: number, lastSeen: number } }>({});

    // Real-time WebSocket hook
    const { sendMessage, lastMessage } = useWebSocket();

    // Deep copy slides on open/load
    useEffect(() => {
        if (isOpen) {
            setCurrentSlide(initialSlideIndex);
            setTeacherCurrentSlide(initialSlideIndex);
            setFollowMode('follow');
            setIsFollowingTeacher(true);
            setIsReady(false);
            setShowCatchUpAlert(false);
            setStudentsList({});
            if (slides && slides.length > 0) {
                setLocalSlides(JSON.parse(JSON.stringify(slides)));
            } else {
                setLocalSlides([]);
            }
        }
    }, [isOpen, slides, initialSlideIndex]);

    // Measure container size factor relative to 1280x720 base width/height
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const scaleX = rect.width / 1280;
                const scaleY = rect.height / 720;
                const idealScale = Math.max(0.1, Math.min(scaleX, scaleY, 1));
                setScale(parseFloat(idealScale.toFixed(3)));
            }
        };
        if (isOpen) {
            setTimeout(updateScale, 100); // Wait for transition
        }
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [isOpen, currentSlide, localSlides]);

    // Compute unique bubbles inside the slides list to construct dynamic mini-roadmap
    const bubbles = React.useMemo(() => {
        const list: { title: string; firstSlideIndex: number }[] = [];
        const seen = new Set<string>();
        localSlides.forEach((slide, idx) => {
            const bTitle = slide.bubbleTitle || "ANLA";
            if (!seen.has(bTitle)) {
                seen.add(bTitle);
                list.push({
                    title: bTitle,
                    firstSlideIndex: idx
                });
            }
        });
        return list;
    }, [localSlides]);

    // Teacher broadcasts slide change & mode updates to students reactive hook
    useEffect(() => {
        if (isOpen && previewRole === 'teacher') {
            sendMessage({
                type: 'slide_status',
                courseId: courseId,
                lessonIndex: lessonIndex,
                mode: followMode,
                currentSlide: currentSlide
            });
        }
    }, [currentSlide, followMode, previewRole, isOpen, courseId, lessonIndex]);

    // Student status heartbeat/status reporting loop
    useEffect(() => {
        if (previewRole !== 'student' || !isOpen) return;
        
        const reportStatus = () => {
            const userName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Öğrenci';
            sendMessage({
                type: 'student_status',
                courseId: courseId,
                name: userName,
                isReady: isReady,
                currentSlide: currentSlide
            });
        };
        
        reportStatus(); // Report instantly on dependency change
        const interval = setInterval(reportStatus, 3000); // Send heartbeat every 3s
        return () => clearInterval(interval);
    }, [currentSlide, isReady, previewRole, isOpen, userData, courseId]);

    // Student sync status on mount/mount event
    useEffect(() => {
        if (isOpen && previewRole === 'student') {
            sendMessage({ type: 'request_slide_status' });
        }
    }, [previewRole, isOpen]);

    // Listen for incoming slide sync requests and updates
    useEffect(() => {
        if (!isOpen || !lastMessage) return;

        if (lastMessage.type === 'slide_status') {
            // Check if courseId matches this lesson
            if (lastMessage.courseId && courseId && String(lastMessage.courseId) !== String(courseId)) {
                return; // Ignore updates from other courses
            }

            if (previewRole === 'student') {
                const { mode, currentSlide: tSlide } = lastMessage;
                setFollowMode(mode);
                setTeacherCurrentSlide(tSlide);
                
                // Force follow mode settings
                if (mode === 'follow') {
                    setIsFollowingTeacher(true);
                    setCurrentSlide(tSlide);
                    setIsReady(false); // Reset ready for the next step
                } else {
                    if (isFollowingTeacher) {
                        setCurrentSlide(tSlide);
                        setIsReady(false);
                    } else if (mode === 'previous_only' && currentSlide > tSlide) {
                        setCurrentSlide(tSlide);
                        setIsReady(false);
                    }
                }
            }
        } else if (lastMessage.type === 'request_slide_status') {
            if (previewRole === 'teacher') {
                // Teacher responds to newly joined student with current status
                sendMessage({
                    type: 'slide_status',
                    courseId: courseId,
                    lessonIndex: lessonIndex,
                    mode: followMode,
                    currentSlide: currentSlide
                });
            }
        } else if (lastMessage.type === 'student_status') {
            // Teacher aggregates student pings and status
            if (previewRole === 'teacher') {
                if (lastMessage.courseId && courseId && String(lastMessage.courseId) !== String(courseId)) {
                    return; // Ignore pings from other courses
                }
                const { sender_id, name, isReady: sReady, currentSlide: sSlide } = lastMessage;
                setStudentsList(prev => ({
                    ...prev,
                    [sender_id]: {
                        name: name || 'Öğrenci',
                        isReady: sReady || false,
                        currentSlide: sSlide ?? 0,
                        lastSeen: Date.now()
                    }
                }));
            }
        }
    }, [lastMessage, previewRole, isOpen, isFollowingTeacher, courseId, lessonIndex, currentSlide, followMode]);

    // Force follow update when toggling check state
    useEffect(() => {
        if (previewRole === 'student' && isFollowingTeacher) {
            setCurrentSlide(teacherCurrentSlide);
            setIsReady(false);
        }
    }, [isFollowingTeacher, teacherCurrentSlide, previewRole]);

    // Auto trigger alert overlay when teacher moves ahead and student is not ready
    useEffect(() => {
        if (previewRole === 'student' && isOpen) {
            if (teacherCurrentSlide > currentSlide && !isReady) {
                setShowCatchUpAlert(true);
            }
        }
    }, [teacherCurrentSlide, previewRole, isOpen, currentSlide, isReady]);

    // Clean inactive students (offline detection)
    useEffect(() => {
        if (previewRole !== 'teacher' || !isOpen) return;
        const interval = setInterval(() => {
            const now = Date.now();
            setStudentsList(prev => {
                const cleaned = { ...prev };
                let changed = false;
                for (const id in cleaned) {
                    if (now - cleaned[id].lastSeen > 12000) {
                        delete cleaned[id];
                        changed = true;
                    }
                }
                return changed ? cleaned : prev;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [previewRole, isOpen]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentSlide < localSlides.length - 1) {
            setCurrentSlide(currentSlide + 1);
            setIsReady(false);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
            setIsReady(false);
        }
    };

    const handleCatchUp = () => {
        setIsFollowingTeacher(true);
        setCurrentSlide(teacherCurrentSlide);
        setIsReady(false);
        setShowCatchUpAlert(false);
    };

    const handleStayAndFinish = () => {
        setIsFollowingTeacher(false);
        setShowCatchUpAlert(false);
    };

    const updateElement = (id: string, updates: any) => {
        setLocalSlides(prev => prev.map((s, idx) => {
            if (idx === currentSlide) {
                return {
                    ...s,
                    elements: s.elements.map((el: any) => el.id === id ? { ...el, ...updates } : el)
                };
            }
            return s;
        }));
    };

    const spawnCodeEditorForChallenge = (challengeId: string, x: number, y: number, height: number) => {
        const codeEditorId = Date.now().toString() + Math.random().toString().slice(2, 5);
        const newCodeEditor = {
            id: codeEditorId,
            type: 'code_editor' as const,
            x: x,
            y: y,
            width: 450,
            height: height,
            rotation: 0,
            content: '# Kodlama Görevi\n# Çözümünüzü buraya yazın\n',
            style: { fontSize: 14, fontFamily: 'Fira Code' }
        };

        setLocalSlides(prev => prev.map((s, idx) => {
            if (idx === currentSlide) {
                return {
                    ...s,
                    elements: [...(s.elements || []), newCodeEditor]
                };
            }
            return s;
        }));
    };

    const renderSlideContent = () => {
        if (!localSlides || localSlides.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 select-text">
                    <BookOpen className="w-16 h-16 text-indigo-500 mb-4 animate-bounce" />
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Ders İçeriği Boş</h2>
                    <p className="text-gray-600">Bu ders için henüz slayt eklenmemiş.</p>
                </div>
            );
        }

        const slide = localSlides[currentSlide];

        if (slide.type === 'game') {
            return (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-gray-50 rounded-2xl border-2 border-gray-100 shadow-md p-6">
                    <GameBuilder
                        slide={slide}
                        updateSlide={(updates) => {
                            setLocalSlides(prev => prev.map(s => s.id === slide.id ? { ...s, ...updates } : s));
                        }}
                        isPreview={true}
                        previewRole={previewRole}
                        onExitPreview={handleNext}
                    />
                </div>
            );
        }

        return (
            <div 
                ref={containerRef}
                className="w-full h-full flex items-center justify-center relative overflow-hidden select-text bg-transparent"
                style={{ 
                    aspectRatio: '16/9'
                }}
            >
                <div 
                    className="absolute select-none pointer-events-none origin-top-left"
                    style={{
                        width: 1280,
                        height: 720,
                        transform: `scale(${scale})`,
                        top: '50%',
                        left: '50%',
                        marginTop: -360 * scale,
                        marginLeft: -640 * scale,
                    }}
                >
                    {/* CONNECTOR LAYER */}
                    <ConnectorRenderer
                        connections={slide.connections || []}
                        elements={slide.elements}
                    />

                    {/* ELEMENTS */}
                    {slide.elements?.map((el: any) => (
                        <CanvasElement
                            key={el.id}
                            el={el}
                            isEditing={false}
                            setEditingElementId={() => {}}
                            updateElement={updateElement}
                            updateElementStyle={() => {}}
                            deleteElement={() => {}}
                            handleMouseDown={() => {}}
                            isPreview={true}
                            previewRole={previewRole}
                            elements={slide.elements}
                            onSpawnCodeEditor={spawnCodeEditorForChallenge}
                            allLessons={[]}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const slide = localSlides && localSlides.length > 0 ? localSlides[currentSlide] : null;
    const isDark = slide?.background === 'dark';
    const isGameSlide = slide?.type === 'game';

    // Disable logic based on synchronisation status rules
    const isNextDisabled = currentSlide === (localSlides?.length || 1) - 1 || 
        (previewRole === 'student' && (
            isFollowingTeacher || 
            (followMode === 'previous_only' && currentSlide >= teacherCurrentSlide)
        ));

    const isPrevDisabled = currentSlide === 0 || 
        (previewRole === 'student' && isFollowingTeacher);

    // Compute active students stats for current slide
    const connectedCount = Object.keys(studentsList).length;
    const readyOnCurrentSlide = Object.values(studentsList).filter(
        s => s.isReady && s.currentSlide === currentSlide
    ).length;

    return (
        <div 
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center animate-in fade-in duration-300 select-none overflow-hidden"
            style={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                backgroundImage: isDark ? 'radial-gradient(#374151 1px, transparent 1px)' : 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '20px 20px',
            }}
        >
            {/* Left Header Title & Roadmap Bubbles Timeline */}
            <div className="absolute top-6 left-8 z-50 flex items-center gap-6">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">CANLI DERS</span>
                    <h2 className="text-xs font-black text-gray-800 font-display leading-tight">{lessonTitle}</h2>
                </div>

                {/* mini-roadmap timeline for lesson bubbles */}
                {bubbles.length > 0 && (
                    <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-3 py-1 shadow-sm select-none">
                        {bubbles.map((b, bIdx) => {
                            const currentSlideBubble = localSlides[currentSlide]?.bubbleTitle || "ANLA";
                            const isActive = b.title === currentSlideBubble;
                            
                            // For students, check if they can click this bubble
                            const isClickable = previewRole === 'teacher' || (
                                previewRole === 'student' && !isFollowingTeacher && (
                                    followMode === 'free' || (followMode === 'previous_only' && b.firstSlideIndex <= teacherCurrentSlide)
                                )
                            );
                            
                            return (
                                <React.Fragment key={bIdx}>
                                    {bIdx > 0 && <span className="text-gray-300 text-[10px] font-black">➔</span>}
                                    <button
                                        onClick={() => isClickable && setCurrentSlide(b.firstSlideIndex)}
                                        disabled={!isClickable}
                                        className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-150 ${
                                            isActive
                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                : isClickable
                                                    ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-800 cursor-pointer'
                                                    : 'text-gray-350 cursor-not-allowed'
                                        }`}
                                    >
                                        {b.title}
                                    </button>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Control Header Bar (Right Side) */}
            <div className="absolute top-6 right-8 z-50 flex items-center gap-4">
                {/* Teacher Real-time Student Readiness Tracker */}
                {previewRole === 'teacher' && connectedCount > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-4 py-2 bg-emerald-50 border-2 border-emerald-100 text-emerald-600 rounded-full shadow-sm flex items-center gap-1.5 animate-pulse">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Hazır: {readyOnCurrentSlide} / {connectedCount}
                    </span>
                )}

                {/* Follow Mode Choice Toggle for Student */}
                {previewRole === 'student' && (
                    <label className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-black select-none transition-all ${
                        followMode === 'follow'
                            ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'bg-white border-sky-100 text-sky-650 hover:bg-sky-50/50 cursor-pointer active:scale-98'
                    }`}>
                        <input
                            type="checkbox"
                            checked={isFollowingTeacher}
                            disabled={followMode === 'follow'}
                            onChange={(e) => setIsFollowingTeacher(e.target.checked)}
                            className="rounded text-sky-500 focus:ring-sky-400 cursor-pointer"
                        />
                        <span>Öğretmeni Takip Et</span>
                        {followMode === 'follow' && <span className="text-[10px] text-gray-400">🔒</span>}
                    </label>
                )}

                {/* Mode status indicator for student */}
                {previewRole === 'student' && (
                    <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-full flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                            isFollowingTeacher ? 'bg-sky-500 animate-pulse' : 'bg-amber-500'
                        }`} />
                        {isFollowingTeacher ? 'Hoca Takibinde' : 'Serbest Gezinti'}
                    </span>
                )}

                {/* Settings trigger button for teacher */}
                {previewRole === 'teacher' && (
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-12 h-12 bg-white/80 hover:bg-white border-2 border-gray-200 text-gray-500 hover:text-sky-600 flex items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                        title="Ders Ayarları"
                    >
                        <Settings className="w-6 h-6" />
                    </button>
                )}

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-12 h-12 bg-white/80 hover:bg-white border-2 border-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    title="Kapat"
                >
                    <X className="w-6 h-6 stroke-[3]" />
                </button>
            </div>

            {/* Full Screen Slide Content */}
            <div className="absolute inset-0 flex items-center justify-center p-6 pb-24 z-10">
                {renderSlideContent()}
            </div>

            {/* Small Floating Bottom Navigation Overlay (Floating Island) */}
            {!isGameSlide && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-5 bg-white/70 backdrop-blur-md border border-gray-200/40 rounded-full px-4 py-2 shadow-xl select-none pointer-events-auto">
                    <button
                        onClick={handlePrev}
                        disabled={isPrevDisabled}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-full font-black text-[10px] uppercase tracking-wider text-gray-500 bg-white shadow-sm hover:border-gray-300 hover:text-gray-800 active:translate-y-[1px] transition-all duration-75 ${
                            isPrevDisabled ? 'opacity-30 pointer-events-none' : 'cursor-pointer'
                        }`}
                    >
                        <ChevronLeft className="w-3.5 h-3.5 stroke-[3] group-hover:-translate-x-0.5 transition-transform" />
                        <span>Geri</span>
                    </button>

                    <div className="flex gap-2 items-center">
                        {localSlides?.map((_, idx) => {
                            const isActive = idx === currentSlide;
                            // Check if student can click this slide indicator
                            const isIndicatorDisabled = previewRole === 'student' && (
                                isFollowingTeacher || 
                                (followMode === 'previous_only' && idx > teacherCurrentSlide)
                            );
                            
                            return (
                                <button
                                    key={idx}
                                    onClick={() => !isIndicatorDisabled && setCurrentSlide(idx)}
                                    disabled={isIndicatorDisabled}
                                    className={`h-2 rounded-full transition-all duration-300 ${
                                        isActive 
                                            ? 'w-6 bg-indigo-600 shadow-sm shadow-indigo-150' 
                                            : `w-2 bg-gray-200 ${isIndicatorDisabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-400 cursor-pointer'}`
                                    }`}
                                />
                            );
                        })}
                    </div>

                    {/* Student "Hazırım" Action Button */}
                    {previewRole === 'student' && (
                        <button
                            onClick={() => setIsReady(!isReady)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider transition-all select-none cursor-pointer active:scale-95 border-b-[3px] active:border-b-[1px] active:translate-y-[2px] ${
                                isReady 
                                    ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400 hover:border-emerald-500 shadow-emerald-100 text-white shadow-md' 
                                    : 'bg-white border-gray-200 hover:border-gray-350 text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            {isReady ? '✓ Hazırım!' : 'Hazır Değilim'}
                        </button>
                    )}

                    <button
                        onClick={handleNext}
                        disabled={isNextDisabled}
                        className={`group flex items-center gap-1.5 px-4 py-2 text-white rounded-full font-black text-[10px] uppercase tracking-wider transition-all duration-75 shadow-md border-b-[3px] active:border-b-[1px] active:translate-y-[2px] ${
                            isNextDisabled ? 'opacity-30 pointer-events-none bg-gray-300 border-gray-400' : 'cursor-pointer'
                        } ${
                            currentSlide === (localSlides?.length || 1) - 1
                                ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400 hover:border-emerald-500 shadow-emerald-100'
                                : 'bg-indigo-600 border-indigo-700 hover:bg-indigo-500 hover:border-indigo-600 shadow-indigo-100'
                        }`}
                    >
                        {currentSlide === (localSlides?.length || 1) - 1 ? (
                            <>
                                <span>Dersi Bitir</span>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </>
                        ) : (
                            <>
                                <span>Devam Et</span>
                                <ChevronRight className="w-3.5 h-3.5 stroke-[3] group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Collapsible Control Drawer Panel for Teacher */}
            {isSettingsOpen && previewRole === 'teacher' && (
                <div className="fixed inset-y-0 right-0 h-full w-80 bg-white shadow-2xl border-l border-gray-100 flex flex-col z-[160] animate-in slide-in-from-right duration-250 select-text">
                    {/* Header */}
                    <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-black text-gray-800 text-sm tracking-tight flex items-center gap-2">
                            <Settings className="w-4 h-4 text-sky-500" />
                            Ders Kontrol Paneli
                        </h3>
                        <button 
                            onClick={() => setIsSettingsOpen(false)}
                            className="p-1 text-gray-450 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
                        >
                            <X size={18} />
                        </button>
                    </div>
                    
                    {/* Body */}
                    <div className="p-6 flex-1 space-y-6 overflow-y-auto">
                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Öğrenci Kontrol Modu</h4>
                            <div className="space-y-3">
                                {/* Option 1: Follow */}
                                <button
                                    onClick={() => setFollowMode('follow')}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1.5 cursor-pointer active:scale-98 ${
                                        followMode === 'follow' 
                                            ? 'border-sky-500 bg-sky-50/30' 
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <span className={`text-xs font-black flex items-center gap-2 ${followMode === 'follow' ? 'text-sky-600' : 'text-gray-750'}`}>
                                        <span className={`w-2 h-2 rounded-full ${followMode === 'follow' ? 'bg-sky-500 animate-pulse' : 'bg-gray-300'}`} />
                                        Beni Takip Et
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold leading-normal">
                                        Öğrencilerin ekranı sizinle aynı anda ilerler, kendi başlarına slayt değiştiremezler.
                                    </span>
                                </button>
                                
                                {/* Option 2: Previous Only */}
                                <button
                                    onClick={() => setFollowMode('previous_only')}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1.5 cursor-pointer active:scale-98 ${
                                        followMode === 'previous_only' 
                                            ? 'border-sky-500 bg-sky-50/30' 
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <span className={`text-xs font-black flex items-center gap-2 ${followMode === 'previous_only' ? 'text-sky-600' : 'text-gray-750'}`}>
                                        <span className={`w-2 h-2 rounded-full ${followMode === 'previous_only' ? 'bg-sky-500 animate-pulse' : 'bg-gray-300'}`} />
                                        Sadece Önceki Slaytlar
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold leading-normal">
                                        Öğrenciler anlattığınız slaytlar arasında serbestçe geri dönebilir ama ileriyi göremezler.
                                    </span>
                                </button>
                                
                                {/* Option 3: Free */}
                                <button
                                    onClick={() => setFollowMode('free')}
                                    className={`w-full p-4 rounded-2xl border-2 text-left transition-all flex flex-col gap-1.5 cursor-pointer active:scale-98 ${
                                        followMode === 'free' 
                                            ? 'border-sky-500 bg-sky-50/30' 
                                            : 'border-gray-100 bg-white hover:border-gray-200'
                                    }`}
                                >
                                    <span className={`text-xs font-black flex items-center gap-2 ${followMode === 'free' ? 'text-sky-600' : 'text-gray-750'}`}>
                                        <span className={`w-2 h-2 rounded-full ${followMode === 'free' ? 'bg-sky-500 animate-pulse' : 'bg-gray-300'}`} />
                                        Serbest Dolaşım
                                    </span>
                                    <span className="text-[10px] text-gray-400 font-bold leading-normal">
                                        Öğrenciler tüm slaytlar arasında istedikleri gibi gezinebilirler.
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Teacher advanced slides catch-up warning alert modal overlay for student */}
            {showCatchUpAlert && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
                        <span className="text-4xl mb-3">⚠️</span>
                        <h3 className="font-black text-gray-800 text-lg mb-2">Öğretmen Sonraki Aşamaya Geçti</h3>
                        <p className="text-gray-500 font-bold text-xs mb-6">Öğretmen yeni bir etkinliğe/slayta geçti. Yetişmek ister misiniz yoksa buradaki çalışmanızı tamamlayacak mısınız?</p>
                        <div className="flex flex-col gap-2.5 w-full">
                            <button 
                                onClick={handleCatchUp}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-md transition-all active:scale-98 cursor-pointer border-b-[3px] border-emerald-700 active:border-b-0"
                            >
                                Yetiş (Devam Et)
                            </button>
                            <button 
                                onClick={handleStayAndFinish}
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-650 font-black rounded-xl transition-all active:scale-98 cursor-pointer border-b-[3px] border-gray-300 active:border-b-0"
                            >
                                Önceki Etkinliği Bitir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LessonSlide;
