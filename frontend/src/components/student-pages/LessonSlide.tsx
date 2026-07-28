import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, ChevronLeft, ChevronRight, Check, Settings, Play, ArrowRight, Maximize2, Minimize2 } from 'lucide-react';
import CanvasElement from '../lesson-builder/CanvasElement';
import ConnectorRenderer from '../lesson-builder/ConnectorRenderer';
import GameBuilder from '../lesson-builder/GameBuilder';
import ChallengeSlideBuilder from '../lesson-builder/ChallengeSlideBuilder';
import StudentHomeworkView from './StudentHomeworkView';
import { useWebSocket } from '../../hooks/useWebSocket';

interface LessonSlideProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    lessonTitle?: string;
    slides?: any[];
    previewRole?: 'student' | 'teacher';
    /** Canlı ders mi (hoca takibi) yoksa öğrencinin tek başına tekrarı mı?
     *  false → serbest tekrar: hoca takibi yok, WS heartbeat yok, İleri/Geri serbest. */
    isLive?: boolean;
    courseId?: string;
    lessonIndex?: number;
    userData?: any;
    initialSlideIndex?: number;
    /** Bu slayt destesinin ait olduğu roadmap düğümünün sabit aşaması (ör. "ANLA").
     *  Verilirse tüm deste boyunca SABİT kalır — slayt içeriğinden tahmin edilmez. */
    moduleStage?: string;
    /** Aynı Ders içindeki modül dizisi (üst bar için) — {stage, status} sırayla. */
    dersStages?: { stage: string; status: 'done' | 'current' | 'upcoming' }[];
    /** Ders'te bu modülden sonraki roadmap düğümünün id'si (varsa). */
    nextModuleNodeId?: number | null;
    /** Sonraki düğümün aşaması (geçiş ekranında gösterilir). */
    nextModuleStage?: string | null;
    /** Kullanıcı geçiş ekranında "…'YA GEÇ" dediğinde çağrılır; parent bir sonraki düğümü açar. */
    onAdvanceModule?: (nextNodeId: number) => void;
    /** Bu modül tamamlanınca kazanılan gerçek XP (roadmap builder'da ayarlanan) — geçiş ekranında gösterilir. */
    moduleXp?: number;
}

const getStageColor = (title: string) => {
    const key = title.toUpperCase().trim();
    if (key.includes('ANLA')) return { bg: 'rgb(217, 70, 239)', border: '#f0abfc', shadow: 'rgba(217, 70, 239, 0.35)' };
    if (key.includes('UYGULA')) return { bg: 'rgb(6, 182, 212)', border: '#67e8f9', shadow: 'rgba(6, 182, 212, 0.35)' };
    if (key.includes('BİRLEŞTİR') || key.includes('BIRLESTIR')) return { bg: 'rgb(34, 197, 94)', border: '#86efac', shadow: 'rgba(34, 197, 94, 0.35)' };
    if (key.includes('ÜRET') || key.includes('URET')) return { bg: 'rgb(234, 179, 8)', border: '#fde047', shadow: 'rgba(234, 179, 8, 0.35)' };
    if (key.includes('QUIZ') || key.includes('QUİZ')) return { bg: 'rgb(124, 58, 237)', border: '#c084fc', shadow: 'rgba(124, 58, 237, 0.35)' };
    if (key.includes('ÖDEV') || key.includes('ODEV')) return { bg: 'rgb(37, 99, 235)', border: '#93c5fd', shadow: 'rgba(37, 99, 235, 0.35)' };
    return { bg: 'rgb(99, 102, 241)', border: '#a5b4fc', shadow: 'rgba(99, 102, 241, 0.35)' };
};

const getSlideStage = (slide: any): string => {
    if (!slide) return 'ANLA';

    // 1. Explicit stage / bubbleTitle on slide object
    const raw = slide.bubbleTitle || slide.bubble_title || slide.stage || slide.stageId || slide.category || slide.templateCategory;
    if (raw && typeof raw === 'string') {
        const upper = raw.toUpperCase().trim();
        if (upper.includes('ANLA')) return 'ANLA';
        if (upper.includes('UYGULA')) return 'UYGULA';
        if (upper.includes('BİRLEŞTİR') || upper.includes('BIRLESTIR')) return 'BİRLEŞTİR';
        if (upper.includes('ÜRET') || upper.includes('URET')) return 'ÜRET';
        if (upper.includes('QUIZ') || upper.includes('QUİZ')) return 'QUIZ';
        if (upper.includes('ÖDEV') || upper.includes('ODEV')) return 'ÖDEV';
        return raw.toUpperCase().trim();
    }

    // 2. Content-based inference fallback
    const elements = slide.elements || [];
    const hasCodeOrChallenge = slide.type === 'game' || slide.type === 'challenge' || elements.some((el: any) =>
        el.type === 'code' || el.type === 'challenge' || el.type === 'code_editor' || el.type === 'interactive' ||
        (el.extra && (el.extra.title?.includes('KODLAMA') || el.extra.title?.includes('UYGULA') || el.extra.title?.includes('PRATİK') || el.extra.title?.includes('TEST')))
    );
    if (hasCodeOrChallenge) return 'UYGULA';

    const hasQuiz = slide.type === 'quiz' || elements.some((el: any) => el.type === 'multiple_choice' || el.type === 'quiz');
    if (hasQuiz) return 'QUIZ';

    const hasHw = slide.type === 'homework' || slide.type === 'HOMEWORK';
    if (hasHw) return 'ÖDEV';

    return 'ANLA';
};

// Kanonik aşama sırası — üst bar bu sırayı takip eder.
const STAGE_ORDER = ['ANLA', 'UYGULA', 'BİRLEŞTİR', 'ÜRET', 'QUIZ', 'ÖDEV'];
// Bir modülün öğrenme iskeleti — bu 4 aşama slaytta olmasa da yol haritası olarak gösterilir.
const CORE_STAGES = ['ANLA', 'UYGULA', 'BİRLEŞTİR', 'ÜRET'];

// Aşamalar arası geçiş ekranı metinleri
const STAGE_INFO: Record<string, { emoji: string; done: string; desc: string; next: string }> = {
    ANLA: { emoji: '🎯', done: 'Anlama bölümü tamamlandı!', desc: 'Konunun ne olduğunu artık biliyorsun.', next: 'Şimdi öğrendiklerini uygulamaya hazır mısın?' },
    UYGULA: { emoji: '⚡', done: 'Uygulama bölümü tamamlandı!', desc: 'Kendi ellerinle denedin, harikasın!', next: 'Şimdi bilgini birleştirmeye hazır mısın?' },
    'BİRLEŞTİR': { emoji: '🧩', done: 'Birleştirme bölümü tamamlandı!', desc: 'Parçaları bir araya getirdin.', next: 'Şimdi kendi eserini üretmeye hazır mısın?' },
    'ÜRET': { emoji: '🚀', done: 'Üretme bölümü tamamlandı!', desc: 'Öğrendiklerinle bir şey ürettin!', next: 'Bir sonraki adıma hazır mısın?' },
    QUIZ: { emoji: '🧠', done: 'Quiz tamamlandı!', desc: 'Bilgini test ettin.', next: 'Devam etmeye hazır mısın?' },
    'ÖDEV': { emoji: '📝', done: 'Ödev bölümüne geldin!', desc: 'Öğrendiklerini pekiştirme zamanı.', next: 'Ödevi teslim etmeye hazır mısın?' },
};

// Türkçe yönelme eki (-a/-e/-ya/-ye) ile "X'YA GEÇ" üretir
const toStageLabel = (stage: string) => {
    const upper = stage.toUpperCase();
    const vowels = upper.match(/[AEIİOÖUÜ]/g) || [];
    const lastVowel = vowels[vowels.length - 1] || 'A';
    const isBack = 'AIOU'.includes(lastVowel);
    const endsWithVowel = /[AEIİOÖUÜ]$/.test(upper);
    const suffix = isBack ? (endsWithVowel ? 'YA' : 'A') : (endsWithVowel ? 'YE' : 'E');
    return `${stage}'${suffix} GEÇ`;
};

const LessonSlide: React.FC<LessonSlideProps> = ({
    isOpen,
    onClose,
    onComplete,
    lessonTitle,
    slides = [],
    previewRole = 'student',
    isLive = false,
    courseId,
    lessonIndex,
    userData,
    initialSlideIndex = 0,
    moduleStage,
    dersStages,
    nextModuleNodeId = null,
    nextModuleStage = null,
    onAdvanceModule,
    moduleXp
}) => {
    // Yalnızca canlı derse bağlanmış bir öğrenci hocayı takip eder / WS ile senkron olur.
    const isLiveStudent = previewRole === 'student' && isLive;
    // Modül-tabanlı roadmap modu: parent bu slayt destesinin sabit aşamasını biliyor
    // (bkz. HomePage). Bu moddayken aşama slayt içeriğinden ASLA tahmin edilmez.
    const isModuleMode = !!dersStages && dersStages.length > 0;
    const [currentSlide, setCurrentSlide] = useState(0);
    const [localSlides, setLocalSlides] = useState<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [gameStatuses, setGameStatuses] = useState<Record<string, { 
        name: string; 
        stars: number; 
        score: number; 
        isCompleted: boolean; 
        timestamp: number; 
    }>>({});

    const [allAnswers, setAllAnswers] = useState<Record<string, { 
        name: string; 
        scores: number[]; 
        isCorrects: boolean[]; 
    }>>({});

    useEffect(() => {
        setGameStatuses({});
        setAllAnswers({});
    }, [currentSlide]);

    // Sync States
    const [followMode, setFollowMode] = useState<'follow' | 'previous_only' | 'free'>('follow');
    const [teacherCurrentSlide, setTeacherCurrentSlide] = useState<number>(0);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    
    // Student follow choice state & ready state
    const [isFollowingTeacher, setIsFollowingTeacher] = useState<boolean>(true);
    const [isReady, setIsReady] = useState<boolean>(false);
    const [showCatchUpAlert, setShowCatchUpAlert] = useState<boolean>(false);
    // Aşamalar arası geçiş kutlama ekranı (ör. ANLA → UYGULA)
    const [stageTransition, setStageTransition] = useState<{ from: string; to: string } | null>(null);

    // Teacher active students tracking list
    const [studentsList, setStudentsList] = useState<{ [id: string]: { name: string, isReady: boolean, currentSlide: number, lastSeen: number } }>({});

    // Real-time WebSocket hook
    const { sendMessage, lastMessage } = useWebSocket();

    // Fullscreen state & auto-fullscreen on open/close
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement));
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('msfullscreenchange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('msfullscreenchange', handleFullscreenChange);
        };
    }, []);

    useEffect(() => {
        if (isOpen) {
            const elem = document.documentElement;
            if (!document.fullscreenElement && !(document as any).webkitFullscreenElement && !(document as any).msFullscreenElement) {
                if (elem.requestFullscreen) {
                    elem.requestFullscreen().catch(() => {});
                } else if ((elem as any).webkitRequestFullscreen) {
                    (elem as any).webkitRequestFullscreen();
                } else if ((elem as any).msRequestFullscreen) {
                    (elem as any).msRequestFullscreen();
                }
            }
        } else {
            if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                } else if ((document as any).msExitFullscreen) {
                    (document as any).msExitFullscreen();
                }
            }
        }

        return () => {
            if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
                if (document.exitFullscreen) {
                    document.exitFullscreen().catch(() => {});
                } else if ((document as any).webkitExitFullscreen) {
                    (document as any).webkitExitFullscreen();
                } else if ((document as any).msExitFullscreen) {
                    (document as any).msExitFullscreen();
                }
            }
        };
    }, [isOpen]);

    const toggleFullscreen = () => {
        if (document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).msFullscreenElement) {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if ((document as any).webkitExitFullscreen) {
                (document as any).webkitExitFullscreen();
            }
        } else {
            const elem = document.documentElement;
            if (elem.requestFullscreen) {
                elem.requestFullscreen().catch(() => {});
            } else if ((elem as any).webkitRequestFullscreen) {
                (elem as any).webkitRequestFullscreen();
            }
        }
    };

    // Deep copy slides on open/load
    useEffect(() => {
        if (isOpen) {
            setCurrentSlide(initialSlideIndex);
            setTeacherCurrentSlide(initialSlideIndex);
            // Canlı derste hoca takibiyle başla; tek-başına tekrarda serbest gezinme.
            setFollowMode(isLiveStudent ? 'follow' : 'free');
            setIsFollowingTeacher(isLiveStudent);
            setStudentsList({});
            setGameStatuses({});
            setAllAnswers({});
            setStageTransition(null);
            if (slides && slides.length > 0) {
                setLocalSlides(JSON.parse(JSON.stringify(slides)));
            } else {
                setLocalSlides([]);
            }
        }
    }, [isOpen, slides, initialSlideIndex, isLiveStudent]);

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
            const bTitle = getSlideStage(slide);
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

    // Student status heartbeat/status reporting loop (yalnızca canlı derste)
    useEffect(() => {
        if (!isLiveStudent || !isOpen) return;

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
    }, [currentSlide, isReady, isLiveStudent, isOpen, userData, courseId]);

    // Student sync status on mount/mount event (yalnızca canlı derste hocanın konumunu iste)
    useEffect(() => {
        if (isOpen && isLiveStudent) {
            sendMessage({ type: 'request_slide_status' });
        }
    }, [isLiveStudent, isOpen]);

    // Listen for incoming slide sync requests and updates
    useEffect(() => {
        if (!isOpen || !lastMessage) return;

        if (lastMessage.type === 'slide_status') {
            // Check if courseId matches this lesson
            if (lastMessage.courseId && courseId && String(lastMessage.courseId) !== String(courseId)) {
                return; // Ignore updates from other courses
            }

            if (isLiveStudent) {
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
        } else if (lastMessage.type === 'game_status') {
            if (previewRole === 'teacher') {
                if (lastMessage.courseId && courseId && String(lastMessage.courseId) !== String(courseId)) {
                    return;
                }
                const { sender_id, name, stars, score, isCompleted } = lastMessage;
                setGameStatuses(prev => ({
                    ...prev,
                    [sender_id]: {
                        name: name || 'Öğrenci',
                        stars: stars || 0,
                        score: score || 0,
                        isCompleted: isCompleted || false,
                        timestamp: Date.now()
                    }
                }));
            }
        } else if (lastMessage.type === 'question_answered') {
            if (previewRole === 'teacher') {
                if (lastMessage.courseId && courseId && String(lastMessage.courseId) !== String(courseId)) {
                    return;
                }
                const { sender_id, name, questionIndex, isCorrect: correct, score: qScore } = lastMessage;
                setAllAnswers(prev => {
                    const existing = prev[sender_id] || { name: name || 'Öğrenci', scores: [], isCorrects: [] };
                    const updatedScores = [...existing.scores];
                    const updatedCorrects = [...existing.isCorrects];
                    updatedScores[questionIndex] = qScore;
                    updatedCorrects[questionIndex] = correct;
                    return {
                        ...prev,
                        [sender_id]: {
                            ...existing,
                            scores: updatedScores,
                            isCorrects: updatedCorrects
                        }
                    };
                });
            }
        }
    }, [lastMessage, previewRole, isLiveStudent, isOpen, isFollowingTeacher, courseId, lessonIndex, currentSlide, followMode]);

    // Force follow update when toggling check state
    useEffect(() => {
        if (isLiveStudent && isFollowingTeacher) {
            setCurrentSlide(teacherCurrentSlide);
            setIsReady(false);
        }
    }, [isFollowingTeacher, teacherCurrentSlide, isLiveStudent]);

    // Auto trigger alert overlay when teacher moves ahead and student is not ready
    useEffect(() => {
        if (isLiveStudent && isOpen) {
            if (teacherCurrentSlide > currentSlide && !isReady) {
                setShowCatchUpAlert(true);
            }
        }
    }, [teacherCurrentSlide, isLiveStudent, isOpen, currentSlide, isReady]);

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

    // Bu deste boyunca SABİT aşama: modül modunda parent'tan gelir, aksi halde
    // (öğretmen önizlemesi / canlı ders) ilk slayttan bir kereliğine çıkarılır — asla
    // mevcut slayta göre değişmez, böylece bir ANLA slaytındaki kod örneği UYGULA sanılmaz.
    const deckStage = moduleStage || getSlideStage(localSlides[0]);

    const handleNext = () => {
        if (currentSlide < localSlides.length - 1) {
            setCurrentSlide(currentSlide + 1);
            setIsReady(false);
            return;
        }
        // Bu modülün (deck) son slaytına gelindi.
        if (isModuleMode && previewRole === 'student' && !isLive && nextModuleNodeId != null) {
            setStageTransition({ from: deckStage, to: nextModuleStage || 'Sonraki Modül' });
            return;
        }
        onComplete();
    };

    // Geçiş ekranındaki "…'YA GEÇ" butonu bir sonraki roadmap düğümünü (modülü) açar
    const proceedFromStageTransition = () => {
        if (!stageTransition) return;
        if (nextModuleNodeId != null) onAdvanceModule?.(nextModuleNodeId);
        setStageTransition(null);
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
            if (previewRole === 'teacher') {
                return (
                    <TeacherGameDashboard
                        slide={slide}
                        studentsList={studentsList}
                        gameStatuses={gameStatuses}
                        allAnswers={allAnswers}
                        sendMessage={sendMessage}
                        courseId={courseId}
                        onClose={handleNext}
                    />
                );
            }

            return (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-gray-50 rounded-2xl border-2 border-gray-100 shadow-md p-6">
                    <GameBuilder
                        slide={slide}
                        updateSlide={(updates) => {
                            setLocalSlides(prev => prev.map(s => s.id === slide.id ? { ...s, ...updates } : s));
                        }}
                        isPreview={true}
                        previewRole={previewRole}
                        userData={userData}
                        courseId={courseId}
                        onExitPreview={(stars) => {
                            if (previewRole === 'student') {
                                const calculatedStars = typeof stars === 'number' ? stars : 3;
                                const calculatedScore = calculatedStars * 33 + (calculatedStars === 3 ? 1 : 0);
                                const userName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : 'Öğrenci';
                                sendMessage({
                                    type: 'game_status',
                                    courseId: courseId,
                                    name: userName,
                                    stars: calculatedStars,
                                    score: calculatedScore,
                                    isCompleted: true
                                });
                            }
                            handleNext();
                        }}
                    />
                </div>
            );
        }

        if (slide.type === 'challenge') {
            return (
                <div className="w-full h-full relative overflow-hidden bg-slate-50 rounded-2xl border-2 border-gray-100 shadow-md">
                    <ChallengeSlideBuilder
                        slide={slide}
                        updateSlide={(updates) => {
                            setLocalSlides(prev => prev.map((s, i) => i === currentSlide ? { ...s, ...updates } : s));
                        }}
                        // Öğretmen bu ekranda görevi kurmaz, teslimleri izler.
                        role={previewRole === 'teacher' ? 'review' : 'student'}
                        courseId={courseId}
                        // Slayt id'si kurs içinde benzersiz ve İKİ TARAFTA DA aynı
                        // (course.notes içinde saklanır) — öğretmenin gördüğü teslim
                        // anahtarıyla öğrencininki bu sayede eşleşir.
                        submissionNodeId={`challenge:${slide.id}`}
                    />
                </div>
            );
        }

        if (slide.type === 'homework' || slide.type === 'HOMEWORK') {
            return (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-gray-50 rounded-2xl border-2 border-gray-100 shadow-md">
                    <StudentHomeworkView
                        slide={slide}
                        courseId={courseId}
                        isPreviewMode={previewRole === 'teacher'}
                        onClose={onClose}
                        onComplete={handleNext}
                    />
                </div>
            );
        }

        const slideIsDark = slide.background === 'dark';
        const currentBubbleTitle = getSlideStage(slide);
        const stageColor = getStageColor(currentBubbleTitle);

        return (
            <div
                ref={containerRef}
                className={`relative overflow-hidden select-text mx-auto w-full rounded-[2.5rem] border-4 border-b-[10px] shadow-2xl transition-all duration-500 ${
                    slideIsDark ? 'border-slate-800 border-b-slate-950 shadow-slate-950/50' : 'border-slate-200/90 shadow-slate-200/40'
                }`}
                style={{
                    aspectRatio: '16/9',
                    maxWidth: 'min(100%, calc((100vh - 14.5rem) * 16 / 9))',
                    maxHeight: '100%',
                    backgroundColor: slideIsDark ? '#0f172a' : '#ffffff',
                    borderBottomColor: slideIsDark ? '#020617' : stageColor.border,
                    backgroundImage: slideIsDark
                        ? 'radial-gradient(rgba(148,163,184,0.14) 1px, transparent 1px)'
                        : 'radial-gradient(#f1f5f9 1.2px, transparent 1.2px)',
                    backgroundSize: '24px 24px',
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
    const isHwSlide = slide?.type === 'homework' || slide?.type === 'HOMEWORK';

    // Disable logic based on synchronisation status rules
    const isNextDisabled = isLiveStudent && (
        isFollowingTeacher ||
        (followMode === 'previous_only' && currentSlide >= teacherCurrentSlide)
    );

    const isPrevDisabled = currentSlide === 0 ||
        (isLiveStudent && isFollowingTeacher);

    // Compute active students stats for current slide
    const connectedCount = Object.keys(studentsList).length;
    const readyOnCurrentSlide = Object.values(studentsList).filter(
        s => s.isReady && s.currentSlide === currentSlide
    ).length;

    // --- Learning-player header + bağlama duyarlı CTA verileri ---
    const totalSlides = localSlides?.length || 1;
    const stepNum = Math.min(currentSlide + 1, totalSlides);
    const progressPct = (stepNum / totalSlides) * 100;
    const isLastSlide = currentSlide === totalSlides - 1;
    // Modül modunda bu deste TEK bir aşamaya aittir (roadmap düğümünün kendi aşaması).
    // Değilse (öğretmen önizlemesi / canlı ders) eski davranış: slayt içeriğinden tahmin.
    const currentBubbleTitle = isModuleMode ? deckStage : getSlideStage(localSlides[currentSlide]);
    const streakVal = userData?.streak ?? 0;
    const xpVal = userData?.xp ?? 0;

    // Üst bar: modül modunda parent'ın verdiği gerçek Ders modül listesi; değilse
    // slayt içeriğinden tahmin edilen kanonik yol haritası (öğretmen önizleme fallback'i).
    const presentStages = new Set(bubbles.map(b => b.title));
    const extraStages = [...presentStages].filter(s => !STAGE_ORDER.includes(s));
    const displayStages = isModuleMode
        ? (dersStages as NonNullable<typeof dersStages>).map(d => d.stage)
        : [
            ...STAGE_ORDER.filter(s => CORE_STAGES.includes(s) || presentStages.has(s)),
            ...extraStages,
        ];
    const currentStageIdx = isModuleMode
        ? (dersStages as NonNullable<typeof dersStages>).findIndex(d => d.status === 'current')
        : displayStages.indexOf(currentBubbleTitle);

    // CTA ekranın türüne göre değişir ("Devam Et" her yerde olmasın)
    const hasChallengeEl = !!slide?.elements?.some((el: any) => el.type === 'challenge');
    const hasCodeEl = !!slide?.elements?.some((el: any) => el.type === 'code' || el.type === 'code_editor');
    const willAdvanceToNextModule = isModuleMode && previewRole === 'student' && !isLive && nextModuleNodeId != null;
    let ctaLabel = 'Devam Et';
    let CtaIcon = ChevronRight;
    if (isLastSlide && willAdvanceToNextModule) {
        ctaLabel = `${currentBubbleTitle}'YI TAMAMLA`;
        CtaIcon = Check;
    } else if (isLastSlide) {
        ctaLabel = 'Dersi Bitir';
        CtaIcon = Check;
    } else if (hasChallengeEl) {
        ctaLabel = 'Gönder';
        CtaIcon = ArrowRight;
    } else if (hasCodeEl) {
        ctaLabel = 'Çalıştır';
        CtaIcon = Play;
    }

    return (
        <div
            className="fixed inset-0 z-[150] flex flex-col items-center justify-center animate-in fade-in duration-300 select-none overflow-hidden font-display"
            style={{
                backgroundColor: isDark ? '#0b1220' : '#F8F9FC',
                backgroundImage: isDark
                    ? 'radial-gradient(rgba(148, 163, 184, 0.15) 1.2px, transparent 1.2px)'
                    : 'radial-gradient(rgba(148, 163, 184, 0.25) 1.2px, transparent 1.2px)',
                backgroundSize: '24px 24px',
            }}
        >
            {/* Fixed GoMufi Ambient Background Blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-5%] w-[45rem] h-[45rem] bg-[#23c55e]/5 rounded-full filter blur-[140px] opacity-70 animate-blob" />
                <div className="absolute top-[-5%] right-[-10%] w-[40rem] h-[40rem] bg-sky-400/5 rounded-full filter blur-[140px] opacity-70 animate-blob animation-delay-2000" />
                <div className="absolute bottom-[-15%] left-[20%] w-[45rem] h-[45rem] bg-indigo-400/5 rounded-full filter blur-[140px] opacity-70 animate-blob animation-delay-4000" />
            </div>

            {/* ── Learning-player üst bar ── */}
            <div className="absolute top-5 left-6 right-6 z-50 flex items-center justify-between gap-4">
                {/* SOL: Geri + Başlık + Streak + XP + Stepper */}
                <div className="flex items-center gap-3 min-w-0">
                    <button
                        onClick={onClose}
                        title="Dersten çık"
                        className="w-11 h-11 shrink-0 bg-white hover:bg-slate-50 border-2 border-b-4 border-slate-200 border-b-slate-300 text-slate-700 hover:text-rose-500 rounded-2xl flex items-center justify-center shadow-md active:translate-y-[2px] active:border-b-2 transition-all duration-75 cursor-pointer"
                    >
                        <ChevronLeft className="w-6 h-6 stroke-[3]" />
                    </button>

                    <div className="flex items-center gap-3 bg-white/90 backdrop-blur-md border-2 border-b-4 border-slate-200 border-b-slate-300 rounded-2xl px-4 py-2.5 shadow-md min-w-0">
                        <h2 className="text-sm md:text-base font-black text-gray-800 leading-tight truncate max-w-[160px] md:max-w-[240px]">
                            {lessonTitle || 'Ders'}
                        </h2>
                        <span className="w-px h-5 bg-slate-200 shrink-0" />
                        <span className="flex items-center gap-1 text-xs font-black text-orange-500 shrink-0 bg-orange-50 px-2.5 py-1 rounded-xl border border-orange-200" title="Günlük seri">
                            🔥 {streakVal}<span className="text-[10px] text-orange-400/80 font-bold">gün</span>
                        </span>
                        <span className="flex items-center gap-1 text-xs font-black text-amber-500 shrink-0 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200" title="Toplam XP">
                            ⭐ {xpVal}<span className="text-[10px] text-amber-400/80 font-bold">XP</span>
                        </span>
                    </div>

                    {/* Bölüm Stepper — tam kanonik yol haritası, salt gösterim (tıklayıp atlanamaz) */}
                    {displayStages.length > 0 && !isHwSlide && (
                        <div className="hidden lg:flex items-center gap-1 bg-white/90 backdrop-blur-xl border border-gray-200/80 rounded-2xl px-2 py-1.5 shadow-lg max-w-full select-none">
                            {displayStages.map((stageName, sIdx) => {
                                const state = sIdx < currentStageIdx ? 'done' : sIdx === currentStageIdx ? 'current' : 'upcoming';
                                const isActive = state === 'current';
                                // Modül modunda dersStages'teki her girdi gerçek bir roadmap düğümüdür.
                                const isPresent = isModuleMode || presentStages.has(stageName);
                                const stageColor = getStageColor(stageName);

                                return (
                                    <div
                                        key={`${stageName}-${sIdx}`}
                                        style={{
                                            backgroundColor: isActive ? stageColor.bg : 'transparent',
                                            boxShadow: isActive ? `0 4px 12px ${stageColor.shadow}` : 'none',
                                        }}
                                        className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl transition-all duration-300 shrink-0 ${
                                            isActive
                                                ? 'text-white font-black scale-[1.02]'
                                                : state === 'done'
                                                ? 'text-slate-600 font-bold'
                                                : `text-slate-400 font-bold ${isPresent ? '' : 'opacity-45'}`
                                        }`}
                                        title={isPresent ? stageName : `${stageName} (bu derste yok)`}
                                    >
                                        {isActive ? (
                                            <div className="w-2.5 h-2.5 rounded-full bg-white shrink-0 shadow-sm" />
                                        ) : state === 'done' ? (
                                            <div className="w-4 h-4 rounded-full bg-emerald-500 shrink-0 flex items-center justify-center">
                                                <Check className="w-2.5 h-2.5 text-white stroke-[4]" />
                                            </div>
                                        ) : (
                                            <div className={`w-2.5 h-2.5 rounded-full border-2 shrink-0 border-slate-300 ${isPresent ? '' : 'border-dashed'}`} />
                                        )}
                                        <span className="text-xs uppercase tracking-wider">{stageName}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* SAĞ: Mod Pili + Ayarlar + Kapat */}
                <div className="flex items-center gap-3 shrink-0">
                    {previewRole === 'teacher' && connectedCount > 0 && (
                        <span className="text-xs font-black uppercase tracking-wider px-4 py-2.5 bg-emerald-50 border-2 border-b-4 border-emerald-300 text-emerald-600 rounded-2xl shadow-sm flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            Hazır: {readyOnCurrentSlide} / {connectedCount}
                        </span>
                    )}

                    {isLiveStudent && !isHwSlide && (
                        <label className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 border-b-4 text-xs font-black select-none transition-all ${
                            followMode === 'follow'
                                ? 'bg-slate-50 border-slate-200 border-b-slate-300 text-gray-400 cursor-not-allowed'
                                : 'bg-white border-sky-200 border-b-sky-300 text-sky-600 hover:bg-sky-50/50 cursor-pointer'
                        }`}>
                            <input
                                type="checkbox"
                                checked={isFollowingTeacher}
                                disabled={followMode === 'follow'}
                                onChange={(e) => setIsFollowingTeacher(e.target.checked)}
                                className="rounded text-sky-500 focus:ring-sky-400 cursor-pointer"
                            />
                            <span>Öğretmeni Takip Et</span>
                            {followMode === 'follow' && <span className="text-[10px]">🔒</span>}
                        </label>
                    )}

                    {previewRole === 'student' && !isHwSlide && (
                        isLive ? (
                            <span className="text-xs font-black uppercase tracking-wider px-4 py-2.5 bg-white border-2 border-b-4 border-slate-200 border-b-slate-300 text-slate-600 rounded-2xl flex items-center gap-2 shadow-md">
                                <span className={`w-2.5 h-2.5 rounded-full ${isFollowingTeacher ? 'bg-sky-500 animate-pulse' : 'bg-amber-500'}`} />
                                {isFollowingTeacher ? 'Hoca Takibinde' : 'Serbest Gezinti'}
                            </span>
                        ) : (
                            <span className="text-xs font-black uppercase tracking-wider px-4 py-2.5 bg-emerald-50 border-2 border-b-4 border-emerald-300 text-emerald-600 rounded-2xl flex items-center gap-2 shadow-md">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                Tekrar Modu
                            </span>
                        )
                    )}

                    {previewRole === 'teacher' && (
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="w-11 h-11 bg-white hover:bg-slate-50 border-2 border-b-4 border-slate-200 border-b-slate-300 text-slate-600 hover:text-indigo-600 flex items-center justify-center rounded-2xl shadow-md active:translate-y-[2px] active:border-b-2 transition-all duration-75 cursor-pointer"
                            title="Ders Ayarları"
                        >
                            <Settings className="w-6 h-6" />
                        </button>
                    )}

                    <button
                        onClick={toggleFullscreen}
                        className="w-11 h-11 bg-white hover:bg-slate-50 border-2 border-b-4 border-slate-200 border-b-slate-300 text-slate-600 hover:text-indigo-600 flex items-center justify-center rounded-2xl shadow-md active:translate-y-[2px] active:border-b-2 transition-all duration-75 cursor-pointer"
                        title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>

                    <button
                        onClick={onClose}
                        className="w-11 h-11 bg-rose-500 hover:bg-rose-600 border-2 border-b-4 border-rose-700 text-white flex items-center justify-center rounded-2xl shadow-md active:translate-y-[2px] active:border-b-2 transition-all duration-75 cursor-pointer"
                        title="Kapat"
                    >
                        <X className="w-6 h-6 stroke-[3]" />
                    </button>
                </div>
            </div>

            {/* Full Screen Slide Content */}
            <div className="absolute inset-0 flex items-center justify-center px-6 md:px-10 pt-24 pb-28 z-10">
                {renderSlideContent()}
            </div>

            {/* Small Floating Bottom Navigation Overlay (Floating Island) */}
            {!isGameSlide && !isHwSlide && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 bg-white/95 backdrop-blur-xl border-2 border-b-4 border-slate-200/90 border-b-slate-300/90 rounded-[2rem] px-5 py-3 shadow-2xl select-none pointer-events-auto">
                    {/* ← Önceki */}
                    <button
                        onClick={handlePrev}
                        disabled={isPrevDisabled}
                        className={`group flex items-center gap-2 px-5 py-2.5 border-2 border-b-4 border-slate-200 border-b-slate-300 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-700 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 active:translate-y-[2px] active:border-b-2 transition-all duration-75 shadow-sm ${
                            isPrevDisabled ? 'opacity-30 pointer-events-none' : 'cursor-pointer'
                        }`}
                    >
                        <ChevronLeft className="w-4 h-4 stroke-[3] group-hover:-translate-x-0.5 transition-transform text-slate-500" />
                        <span>Önceki</span>
                    </button>

                    {/* Adım sayacı + gerçek progress bar */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-slate-600 tabular-nums shrink-0">
                            {stepNum} <span className="text-slate-300">/</span> {totalSlides}
                        </span>
                        <div className="w-24 md:w-44 h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shrink-0 p-0.5 shadow-inner">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500 rounded-full transition-all duration-500 shadow-sm"
                                style={{ width: `${Math.max(6, progressPct)}%` }}
                            />
                        </div>
                    </div>

                    {/* Student "Hazırım" Action Button (yalnızca canlı derste) */}
                    {isLiveStudent && (
                        <button
                            onClick={() => setIsReady(!isReady)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 text-xs font-black uppercase tracking-wider transition-all select-none cursor-pointer border-b-4 active:border-b-2 active:translate-y-[2px] ${
                                isReady
                                    ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400 text-white shadow-md'
                                    : 'bg-white border-slate-200 border-b-slate-300 text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            {isReady ? '✓ Hazırım!' : 'Hazır Değilim'}
                        </button>
                    )}

                    {/* Bağlama duyarlı CTA (Çalıştır / Gönder / …'yı Tamamla / Devam Et) */}
                    <button
                        onClick={handleNext}
                        disabled={isNextDisabled}
                        className={`group flex items-center gap-2 px-6 py-2.5 text-white rounded-2xl font-black text-xs md:text-sm uppercase tracking-wider transition-all duration-75 shadow-lg border-2 border-b-4 active:border-b-2 active:translate-y-[2px] ${
                            isNextDisabled ? 'opacity-30 pointer-events-none bg-gray-300 border-gray-400' : 'cursor-pointer'
                        } ${
                            isLastSlide
                                ? 'bg-gradient-to-r from-emerald-500 to-green-600 border-emerald-700 hover:from-emerald-400 hover:to-green-500 shadow-emerald-200'
                                : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 border-indigo-800 hover:from-indigo-500 hover:to-pink-400 shadow-indigo-200'
                        }`}
                    >
                        {!isLastSlide && hasCodeEl && <CtaIcon className="w-4 h-4 fill-current stroke-[2]" />}
                        <span>{ctaLabel}</span>
                        {(isLastSlide || !hasCodeEl) && (
                            <CtaIcon className="w-4 h-4 stroke-[3] group-hover:translate-x-0.5 transition-transform" />
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
                                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-655 font-black rounded-xl transition-all active:scale-98 cursor-pointer border-b-[3px] border-gray-300 active:border-b-0"
                            >
                                Önceki Etkinliği Bitir
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Aşamalar arası geçiş / kutlama ekranı ── */}
            {stageTransition && (() => {
                const info = STAGE_INFO[stageTransition.from] || {
                    emoji: '🎉',
                    done: `${stageTransition.from} bölümü tamamlandı!`,
                    desc: 'Harika iş çıkardın!',
                    next: 'Devam etmeye hazır mısın?',
                };
                const fromColor = getStageColor(stageTransition.from);
                const toColor = getStageColor(stageTransition.to);
                return (
                    <div
                        className="absolute inset-0 z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300"
                        style={{
                            background: `radial-gradient(circle at 50% 25%, ${fromColor.shadow}, rgba(15,23,42,0.55))`,
                            backdropFilter: 'blur(6px)',
                        }}
                    >
                        <div className="relative w-full max-w-md bg-white rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 border-b-slate-300 shadow-2xl p-8 text-center animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                            {/* Emoji rozeti */}
                            <div
                                className="mx-auto w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-4xl mb-4 shadow-md border-2 border-b-4"
                                style={{ backgroundColor: `${fromColor.bg}1a`, borderColor: fromColor.border }}
                            >
                                {info.emoji}
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 font-display mb-1.5">{info.done}</h2>
                            <p className="text-sm font-bold text-slate-500 mb-4">{info.desc}</p>

                            {moduleXp != null && moduleXp > 0 && (
                                <div className="inline-flex items-center gap-1.5 bg-amber-50 border-2 border-b-4 border-amber-200 border-b-amber-300 text-amber-600 font-black rounded-2xl px-4 py-2 mb-5 text-sm">
                                    ⭐ +{moduleXp} XP
                                </div>
                            )}

                            <p className="text-sm font-bold text-slate-600 mb-5">{info.next}</p>

                            {/* Sonraki aşamaya geç */}
                            <button
                                onClick={proceedFromStageTransition}
                                style={{ backgroundColor: toColor.bg, borderColor: toColor.border }}
                                className="group w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-black text-base uppercase tracking-wider border-2 border-b-[6px] shadow-lg active:translate-y-[3px] active:border-b-2 transition-all cursor-pointer"
                            >
                                <span>{toStageLabel(stageTransition.to)}</span>
                                <ArrowRight className="w-5 h-5 stroke-[3] group-hover:translate-x-0.5 transition-transform" />
                            </button>

                            <button
                                onClick={() => setStageTransition(null)}
                                className="mt-3 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                Bu bölümde kal
                            </button>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

interface TeacherGameDashboardProps {
    slide: any;
    studentsList: Record<string, { name: string, isReady: boolean, currentSlide: number, lastSeen: number }>;
    gameStatuses: Record<string, { name: string, stars: number, score: number, isCompleted: boolean, timestamp: number }>;
    allAnswers: Record<string, { name: string, scores: number[], isCorrects: boolean[] }>;
    sendMessage: (msg: any) => void;
    courseId?: string;
    onClose: () => void;
}

const TeacherGameDashboard: React.FC<TeacherGameDashboardProps> = ({ 
    slide, 
    studentsList, 
    gameStatuses, 
    allAnswers,
    sendMessage,
    courseId,
    onClose 
}) => {
    const questions = slide.gameConfig?.questions || [];
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timer, setTimer] = useState(100);
    const [phase, setPhase] = useState<'playing' | 'leaderboard'>('playing');

    const currentQuestion = questions[currentQuestionIndex];
    const questionTime = currentQuestion?.timeLimit || 30;

    // Timer Tick
    useEffect(() => {
        if (phase === 'playing' && currentQuestion) {
            setTimer(100);
            const interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 0) {
                        clearInterval(interval);
                        setPhase('leaderboard');
                        return 0;
                    }
                    return prev - (10 / questionTime);
                });
            }, 100);
            return () => clearInterval(interval);
        }
    }, [currentQuestionIndex, phase, questionTime, currentQuestion]);

    // Determine student statuses for the current question
    const students = Object.entries(studentsList).map(([id, s]) => {
        const studentAns = allAnswers[id];
        const hasAnswered = studentAns && studentAns.scores[currentQuestionIndex] !== undefined;
        const lastScore = studentAns?.scores[currentQuestionIndex] || 0;
        const totalScore = (studentAns?.scores || [])
            .slice(0, currentQuestionIndex + 1)
            .reduce((sum, val) => sum + (val || 0), 0);

        return {
            id,
            name: s.name,
            hasAnswered,
            lastScore,
            totalScore,
            isCorrect: studentAns?.isCorrects[currentQuestionIndex] || false
        };
    });

    const leaderboard = [...students].sort((a, b) => b.totalScore - a.totalScore);

    const handleNextQuestionOrFinish = () => {
        if (currentQuestionIndex < questions.length - 1) {
            const nextIdx = currentQuestionIndex + 1;
            // Broadcast next question index to student clients
            sendMessage({
                type: 'next_question',
                courseId: courseId,
                questionIndex: nextIdx
            });
            setCurrentQuestionIndex(nextIdx);
            setPhase('playing');
        } else {
            onClose();
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-900 text-white rounded-3xl p-8 shadow-2xl relative overflow-hidden font-sans border-2 border-slate-800">
            {/* Background elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 relative z-10">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🎮</span>
                    <div className="text-left">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block font-display">
                            Canlı Soru Paneli (Soru {currentQuestionIndex + 1}/{questions.length})
                        </span>
                        <h2 className="text-lg font-black font-display mt-0.5">{currentQuestion?.text || "Soru Yükleniyor..."}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {phase === 'playing' && (
                        <div className="w-24 bg-slate-950 border border-slate-800 rounded-full h-3 overflow-hidden flex items-center shrink-0">
                            <div className="bg-indigo-500 h-full transition-all duration-105 ease-linear" style={{ width: `${timer}%` }} />
                        </div>
                    )}
                    <button
                        onClick={handleNextQuestionOrFinish}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs px-6 py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer uppercase tracking-wider font-display border-b-[4px] border-emerald-700 active:border-b-0 active:translate-y-[4px] shrink-0"
                    >
                        {currentQuestionIndex < questions.length - 1 ? "Sonraki Soru ➔" : "Oyunu Bitir ➔"}
                    </button>
                </div>
            </div>

            {/* Content Split */}
            <div className="flex-1 flex gap-8 min-h-0 relative z-10 text-left">
                {/* Left Side: Leaderboard / Winners */}
                <div className="w-1/3 flex flex-col bg-slate-950/40 rounded-2xl p-6 border border-slate-800/60 min-h-0 overflow-y-auto custom-scrollbar">
                    <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-2 font-display">
                        🏆 LİDERLİK TABLOSU
                    </h3>
                    
                    {leaderboard.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                            <span className="text-4xl animate-bounce mb-3">⏳</span>
                            <p className="text-xs text-slate-400 font-bold">Öğrenci katılımı bekleniyor...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {leaderboard.map((student, idx) => {
                                const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : null;
                                return (
                                    <div 
                                        key={student.id} 
                                        className={`flex items-center justify-between p-3.5 rounded-xl border border-slate-800 transition-all ${
                                            idx === 0 
                                                ? 'bg-amber-500/10 border-amber-500/30' 
                                                : idx === 1 
                                                    ? 'bg-slate-300/10 border-slate-400/30' 
                                                    : idx === 2 
                                                        ? 'bg-amber-700/10 border-amber-800/30' 
                                                        : 'bg-slate-900/50 border-slate-850'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="w-6 text-center text-xs font-black text-indigo-400 font-display">
                                                {medal || `#${idx + 1}`}
                                            </span>
                                            <span className="font-extrabold text-sm text-slate-100 truncate">
                                                {student.name}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {student.lastScore > 0 && phase === 'leaderboard' && (
                                                <span className="text-[9px] font-black text-green-400 mr-1 bg-green-500/10 px-1.5 py-0.5 rounded font-display shrink-0">
                                                    +{student.lastScore}
                                                </span>
                                            )}
                                            <span className="bg-indigo-600/50 text-indigo-200 text-[10px] font-black px-2 py-0.5 rounded-md font-display shrink-0">
                                                {student.totalScore} Puan
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Right Side: Active Student Statuses */}
                <div className="flex-1 flex flex-col bg-slate-950/40 rounded-2xl p-6 border border-slate-800/60 min-h-0 overflow-y-auto custom-scrollbar">
                    <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider mb-4 flex justify-between font-display">
                        <span>👥 SINIF DURUMU (SORU {currentQuestionIndex + 1})</span>
                        <span className="text-slate-450 text-[10px]">
                            {students.filter(s => s.hasAnswered).length} / {students.length} Yanıtladı
                        </span>
                    </h3>

                    {students.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                            <span className="text-5xl mb-3">👥</span>
                            <p className="text-sm font-bold">Derse katılan aktif öğrenci bulunmuyor.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {students.map(s => (
                                <div 
                                    key={s.id}
                                    className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
                                        s.hasAnswered 
                                            ? 'bg-emerald-500/5 border-emerald-500/20' 
                                            : 'bg-slate-900/40 border-slate-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">👤</span>
                                        <div>
                                            <h4 className="font-extrabold text-sm text-slate-100">{s.name}</h4>
                                            <div className="text-[10px] text-slate-400 font-bold mt-0.5 flex items-center gap-1.5">
                                                {s.hasAnswered ? (
                                                    <span className="text-emerald-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Cevapladı {phase === 'leaderboard' && (s.isCorrect ? "✓ (Doğru)" : "✗ (Yanlış)")}
                                                    </span>
                                                ) : (
                                                    <span className="text-sky-400 flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                                                        Düşünüyor...
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        {s.hasAnswered && phase === 'leaderboard' ? (
                                            <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md shrink-0">
                                                +{s.lastScore} Puan
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider shrink-0">
                                                {s.hasAnswered ? "CEVAPLADI" : "BEKLENİYOR"}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default LessonSlide;
