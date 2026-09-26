import React, { useState, useEffect, useRef } from 'react';
import GrassIcon from '../../assets/sprites/grass.png';
import api from '../../api';
import { useNavigate } from 'react-router-dom';
import { openMeetingLink, rememberMeetingLink } from '../../meetingLink';
import { AnnouncementFeed, AttendanceCard, LatestAnnouncementBanner } from '../shared/SchoolNotices';
import MyConceptsModal from './MyConceptsModal';
import { Trophy, ChevronDown, ChevronRight, Zap, KeyRound, Brain, UserRound, FileText, PartyPopper, Sparkles, CheckCircle2, FolderOpen, Star } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import GameOverlay from './GameOverlay';
import LessonSlide from './LessonSlide';
import LiveLessonStudent from './LiveLessonStudent';
import StudentHomeworkView from './StudentHomeworkView';
import type { CourseData, PathNode } from '../../types';
import { completeModule, type CourseProgress } from '../../progress';
import CourseIcon from '../shared/CourseIcon';
import { LeagueIcon } from '../shared/LeagueBadge';
import GamifiedRoadmapPath, { moduleActionLabel, type RoadmapModule } from './GamifiedRoadmapPath';
import DailyQuests, { useActivity } from './DailyQuests';
import MufiSleep from '../../assets/sprites/MufiSleep.png';

/**
 * Bir düğümün ait olduğu "Ders" içindeki kardeş modülleri (ANLA/UYGULA/BİRLEŞTİR/ÜRET/...)
 * bulur. Bir "Ders", `lessonTopic` alanı dolu olan düğümle başlar (bkz. roadmap builder) ve
 * bir sonraki `lessonTopic` dolu düğüme kadar sürer.
 */
const getDersModules = (nodes: PathNode[], nodeId: number | null) => {
    const idx = nodes.findIndex(n => n.id === nodeId);
    if (idx === -1) return { siblings: [] as PathNode[], posInDers: -1 };
    let start = idx;
    while (start > 0 && nodes[start].lessonTopic === undefined) start--;
    let end = start + 1;
    while (end < nodes.length && nodes[end].lessonTopic === undefined) end++;
    return { siblings: nodes.slice(start, end), posInDers: idx - start };
};

interface HomePageProps {
    currentCourse: CourseData;
    activeCourseId: string;
    courses: Record<string, CourseData>;
    onCourseChange: (id: string) => void;
    setCourses: React.Dispatch<React.SetStateAction<Record<string, CourseData>>>;
    userData?: any;
    isUserDataLoading: boolean;
    refreshUserData: () => Promise<void>;
    isLiveSessionJoined: boolean;
    setIsLiveSessionJoined: (val: boolean) => void;
    /** Sunucudan dönen güncel ilerleme (yol haritası buradan yeniden kurulur) */
    onProgress: (courseId: string | number, progress: CourseProgress | null) => void;
    refreshProgress: (courseId: string | number) => Promise<void>;
}

const HomePage: React.FC<HomePageProps> = ({
    currentCourse,
    activeCourseId,
    courses,
    onCourseChange,
    setCourses,
    userData,
    isUserDataLoading,
    refreshUserData,
    isLiveSessionJoined,
    setIsLiveSessionJoined,
    onProgress,
    refreshProgress,
}) => {
    const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // "Kazanımlarım": öğrencinin kendi kazanım haritası (neyi öğrendim, neye çalışmalıyım).
    const [showConcepts, setShowConcepts] = useState(false);

    // Refs for outside click detection
    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const nodesContainerRef = useRef<HTMLDivElement>(null);

    // Outside click listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (nodesContainerRef.current && !nodesContainerRef.current.contains(event.target as Node)) {
                setActiveNodeId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Game Overlay State
    const [showGameOverlay, setShowGameOverlay] = useState(false);
    const [gameLevel, setGameLevel] = useState<number | null>(null);

    // Lesson Slide State
    const [showLessonSlide, setShowLessonSlide] = useState(false);
    const [lessonLevel, setLessonLevel] = useState<number | null>(null);

    // Sayfa içi kutlama (eskiden alert() + sayfa yenileme: canlı derste tüm sınıfın
    // ekranı aynı anda yenileniyordu).
    const [celebration, setCelebration] = useState<{ text: string; ok: boolean } | null>(null);
    const celebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const celebrate = (text: string, ok = true) => {
        setCelebration({ text, ok });
        if (celebrationTimer.current) clearTimeout(celebrationTimer.current);
        celebrationTimer.current = setTimeout(() => setCelebration(null), 4000);
    };

    // Homework Overlay State
    const [activeHomeworkSlide, setActiveHomeworkSlide] = useState<any | null>(null);

    // Real-time Class Session States
    const [isClassActive, setIsClassActive] = useState<boolean>(false);
    const [liveCourseId, setLiveCourseId] = useState<string | null>(null);
    const [lastActiveSessionTitle, setLastActiveSessionTitle] = useState<string | null>(null);
    const { sendMessage, lastMessage } = useWebSocket();
    // Seri ve günlük görevler: XP ya da ilerleme değişince yeniden okunur.
    const activity = useActivity(`${userData?.xp ?? 0}:${Object.keys(currentCourse?.progress?.completed || {}).length}`);
    const navigate = useNavigate();

    // Poll session status for enrolled courses to detect when teacher starts/stops lesson
    useEffect(() => {
        const coursesList = Object.values(courses);
        if (coursesList.length === 0) return;

        const checkSessionStatus = async () => {
            try {
                let anyActive = false;
                for (const course of coursesList) {
                    const res = await api.get(`/session-status/${course.id}`);
                    if (res.data.is_live) {
                        rememberMeetingLink(course.id, res.data.meeting_url);
                        setIsClassActive(true);
                        setLiveCourseId(course.id);
                        anyActive = true;
                        if (res.data.title) {
                            setLastActiveSessionTitle(res.data.title);
                        }
                        break;
                    }
                }
                
                // Transition from active to inactive -> auto unlock check
                if (!anyActive && isClassActive) {
                    setIsClassActive(false);
                    setLiveCourseId(null);
                    setIsLiveSessionJoined(false);
                    
                    // Öğretmenin canlı derste işlediği modüller sunucuda bitmiş sayılır;
                    // ilerlemeyi yenile ve sayfayı yeniden yüklemeden kutla.
                    if (lastActiveSessionTitle && lastActiveSessionTitle.startsWith("gomufi_session:") && liveCourseId) {
                        const before = courses[String(liveCourseId)]?.progress?.open_until ?? 0;
                        await refreshProgress(liveCourseId);
                        const lessonIndex = parseInt(lastActiveSessionTitle.split(":")[1]);
                        if (!isNaN(lessonIndex) && lessonIndex >= before) {
                            celebrate(`Canlı ders bitti! ${lessonIndex}. modüle kadar tamamlandı.`);
                        }
                    }
                    setLastActiveSessionTitle(null);
                }
            } catch (err) {
                console.error("Session status check failed:", err);
            }
        };

        checkSessionStatus();
        const interval = setInterval(checkSessionStatus, 4000);
        return () => clearInterval(interval);
    }, [courses, isClassActive, lastActiveSessionTitle, liveCourseId, setIsLiveSessionJoined]);

    const handleJoinLiveClass = async () => {
        const targetCourseId = liveCourseId || activeCourseId;
        try {
            // Öğretmen görüşme linki eklediyse (Zoom, Meet…) yeni sekmede açılır;
            // ders sınıftaysa link yoktur ve yalnızca canlı derse bağlanılır.
            openMeetingLink(targetCourseId);

            // Student enters live session roadmap dashboard
            setIsLiveSessionJoined(true);

            // Report student readiness & stats via websocket
            sendMessage({
                type: "student_status",
                courseId: targetCourseId,
                name: userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : "Öğrenci",
                isReady: true,
                currentSlide: 0
            });
        } catch (err) {
            console.error("Join live class helper error:", err);
        }
    };

    // Listen to WebSocket level_changed and lesson_completed messages for students
    useEffect(() => {
        if (!isLiveSessionJoined) return;
        if (lastMessage) {
            if (lastMessage.type === 'level_changed') {
                const { courseId: msgCourseId, nodeId: msgNodeId, isOpen: msgIsOpen } = lastMessage;
                
                if (msgCourseId && currentCourse && String(msgCourseId) === String(currentCourse.id)) {
                    if (msgIsOpen) {
                        setLessonLevel(msgNodeId);
                        setShowLessonSlide(true);
                    } else {
                        setShowLessonSlide(false);
                    }
                }
            } else if (lastMessage.type === 'lesson_completed') {
                const { courseId: msgCourseId, lessonIndex: msgLessonIndex, stars: msgStars } = lastMessage;
                
                if (msgCourseId && currentCourse && String(msgCourseId) === String(currentCourse.id)) {
                    const node = currentCourse.nodes.find(n => n.id === Number(msgLessonIndex));
                    if (node?.sectionId) {
                        void completeModule(currentCourse.id, String(node.sectionId), msgStars || 3, 'live').then((result) => {
                            if (!result) return;
                            onProgress(currentCourse.id, result);
                            celebrate(`${node.title} tamamlandı!${result.xp_awarded ? ` +${result.xp_awarded} XP` : ''}`);
                            if (result.xp_awarded) void refreshUserData?.();
                        });
                    }
                }
            }
        }
    }, [lastMessage, currentCourse, isLiveSessionJoined, activeCourseId, setCourses]);

    const handleNodeClick = (node: PathNode) => {
        if (activeNodeId === node.id) {
            setActiveNodeId(null);
        } else {
            setActiveNodeId(node.id);
        }
    };

    const handleCourseChange = (courseId: string) => {
        onCourseChange(courseId); // Prop call
        setIsDropdownOpen(false);
        setActiveNodeId(null);
    };

    const handleStartGame = (levelId: number) => {
        setGameLevel(levelId);
        setShowGameOverlay(true);
    };

    const handleOpenLesson = (levelId: number) => {
        setLessonLevel(levelId);
        setShowLessonSlide(true);
    };

    /**
     * Modülü sunucuda bitirir: ilerleme hesaba yazılır, XP modül başına bir kez
     * verilir, öğretmenin analizine düşer. Yol haritası dönen ilerlemeyle kurulur.
     */
    const finishModule = async (nodeId: number, stars = 3) => {
        const node = currentCourse.nodes.find(n => n.id === nodeId);
        if (!node?.sectionId) return;
        const result = await completeModule(activeCourseId, String(node.sectionId), stars);
        if (!result) {
            celebrate('İlerleme kaydedilemedi, bağlantını kontrol et.', false);
            return;
        }
        onProgress(activeCourseId, result);
        if (result.xp_awarded) {
            celebrate(`${node.title} tamamlandı! +${result.xp_awarded} XP`);
            if (refreshUserData) await refreshUserData();
        }
    };

    const handleLessonComplete = async () => {
        setShowLessonSlide(false);
        if (lessonLevel !== null) {
            await finishModule(lessonLevel);
            setLessonLevel(null);
        }
    };

    // Bir modül (ör. ANLA) bitti ama aynı Ders'te sıradaki modül (ör. UYGULA) var —
    // pencereyi kapatmadan sıradaki düğümün slaytlarını açar ve biten modülün roadmap
    // builder'da ayarlanan XP'sini verir (her modül kendi XP'sini kazandırır).
    const handleAdvanceModule = async (nextNodeId: number) => {
        if (lessonLevel === null) return;
        await finishModule(lessonLevel);
        setLessonLevel(nextNodeId);
    };

    const handleCloseGame = () => {
        setShowGameOverlay(false);
        setGameLevel(null);
    };

    const handleCloseLesson = () => {
        setShowLessonSlide(false);
        setLessonLevel(null);
    };

    const handleGameComplete = (stars: number) => {
        if (gameLevel === null) return;
        void finishModule(gameLevel, stars);
        handleCloseGame();
    };

    // LessonSlide üst barı + modüller-arası geçiş için: açık düğümün Ders içindeki
    // kardeşleri, aşama listesi ve varsa sıradaki modül.
    const { siblings: dersSiblings, posInDers } = getDersModules(currentCourse?.nodes || [], lessonLevel);
    const activeLessonNode = posInDers >= 0 ? dersSiblings[posInDers] : undefined;
    const dersStages = dersSiblings.map((n, i) => ({
        stage: n.stage || 'ANLA',
        status: (i < posInDers ? 'done' : i === posInDers ? 'current' : 'upcoming') as 'done' | 'current' | 'upcoming'
    }));
    const nextDersModule = posInDers >= 0 && posInDers + 1 < dersSiblings.length ? dersSiblings[posInDers + 1] : null;

    if (isUserDataLoading) {
        return (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center z-10">
                <div className="relative">
                    <div className="w-48 h-48 rounded-full border-8 border-indigo-100 animate-pulse"></div>
                    <div className="absolute inset-0 border-t-8 border-indigo-600 rounded-full animate-spin"></div>
                    <span className="absolute inset-0 flex items-center justify-center animate-bounce"><Zap size={56} className="text-indigo-600" /></span>
                </div>
                <h2 className="text-2xl font-black text-gray-800 mt-8 font-display animate-pulse uppercase tracking-widest">Maceran Yükleniyor...</h2>
                <div className="mt-4 flex gap-2">
                    <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                </div>
            </div>
        );
    }

    if (!currentCourse) {
        return (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center">
                <div className="w-64 h-64 bg-gray-50 rounded-full flex items-center justify-center mb-8">
                    <KeyRound size={96} className="animate-bounce text-amber-400" />
                </div>
                <h2 className="text-3xl font-black text-gray-800 mb-4 font-display">Henüz bir sınıfa katılmadın</h2>
                <p className="text-gray-500 max-w-md mb-8 text-lg font-medium">
                    Öğretmeninin verdiği katılım kodunu girerek sınıfına katıl; dersler burada açılacak.
                </p>
                <button 
                    onClick={() => navigate('/student/my-classes')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:translate-y-0 text-xl font-display uppercase tracking-widest"
                >
                    Katılım kodu gir
                </button>
            </div>
        );
    }

    const isDone = (n: PathNode) => !!(n.sectionId && currentCourse.progress?.completed?.[String(n.sectionId)]);
    const homeworkSlideOf = (n: PathNode) => n.slides?.find((sl: any) => sl.type === 'homework');
    const lessonSlidesOf = (n: PathNode) => (n.slides || []).filter((sl: any) => sl.type !== 'homework');
    // Sıradaki iş: açık, bitmemiş ve içeriği olan ilk modül.
    const nextNode = currentCourse.nodes.find((n) => !n.isLocked && !isDone(n) && (n.slides?.length ?? 0) > 0);
    const openNode = (n: PathNode) => {
        const hw = homeworkSlideOf(n);
        if (n.type === 'homework' || (hw && lessonSlidesOf(n).length === 0)) {
            if (hw) setActiveHomeworkSlide(hw);
            return;
        }
        if (lessonSlidesOf(n).length > 0) handleOpenLesson(n.id);
    };
    const roadmapModules: RoadmapModule[] = currentCourse.nodes.map((n) => ({
        key: String(n.id),
        title: n.title,
        stage: n.stage || 'ANLA',
        xp: n.xp ?? 500,
        slides: n.slides || [],
        stars: n.stars ?? 0,
        done: isDone(n),
        isLocked: n.isLocked,
        lessonNumber: n.lessonNumber,
        lessonTopic: n.lessonTopic,
    }));

    // Açık modüllerdeki teslim edilmemiş ödevler
    const activeHomeworks = currentCourse.nodes
        .filter((n) => !n.isLocked)
        .flatMap((n) => {
            const hw = homeworkSlideOf(n);
            return hw && !(currentCourse.progress?.submitted_homework || []).includes(String(hw.id))
                ? [{ nodeId: n.id, lessonTitle: n.title, slide: hw }] : [];
        });
    const homeworkWidget = activeHomeworks.length === 0 ? null : (
        <section className="bg-white rounded-3xl border-2 border-gray-200 border-b-4 p-4">
            <h3 className="text-gray-700 font-black text-sm flex items-center gap-1.5 mb-3">
                <FileText size={16} className="text-blue-500" /> Bekleyen ödevler ({activeHomeworks.length})
            </h3>
            <div className="space-y-2">
                {activeHomeworks.map((hw) => (
                    <button
                        type="button"
                        key={hw.nodeId}
                        onClick={() => setActiveHomeworkSlide(hw.slide)}
                        className="w-full text-left p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 hover:border-blue-300 rounded-2xl flex flex-col gap-1 transition-colors"
                    >
                        <span className="text-[11px] font-black text-blue-600 uppercase tracking-wide">{hw.lessonTitle}</span>
                        <span className="font-bold text-gray-800 text-sm truncate">{hw.slide.homeworkConfig?.title || 'Ödev'}</span>
                        <span className="text-xs font-black text-yellow-600 flex items-center gap-1"><Star size={12} className="fill-current" /> +{hw.slide.homeworkConfig?.points || 100} XP</span>
                    </button>
                ))}
            </div>
        </section>
    );

    // Calculate dynamic styles for the Course Box to match the header
    const courseBoxStyle = {
        borderColor: currentCourse.themeColor,
        color: currentCourse.themeColor
    };

    if (isLiveSessionJoined) {
        return (
            <LiveLessonStudent
                currentCourse={currentCourse}
                activeCourseId={activeCourseId}
                lastActiveSessionTitle={lastActiveSessionTitle}
                isLiveSessionJoined={isLiveSessionJoined}
                setIsLiveSessionJoined={setIsLiveSessionJoined}
                activeNodeId={activeNodeId}
                handleNodeClick={handleNodeClick}
                handleOpenLesson={handleOpenLesson}
                showLessonSlide={showLessonSlide}
                lessonLevel={lessonLevel}
                handleCloseLesson={handleCloseLesson}
                handleLessonComplete={handleLessonComplete}
                userData={userData}
            />
        );
    }

    return (
        <div className="absolute inset-0 bg-white flex flex-col overflow-y-auto overflow-x-hidden md:overflow-hidden">
            {showConcepts && activeCourseId && (
                <MyConceptsModal courseId={activeCourseId} onClose={() => setShowConcepts(false)} />
            )}

            {/* Üst şerit: kurs seçimi · kaldığın yerden devam · kazanımlar · canlı ders · XP */}
            <div className="w-full px-4 md:px-8 pt-4 md:pt-6 flex flex-wrap items-stretch gap-3 z-30 relative">
                {/* Kurs seçimi */}
                <div className="relative shrink-0" ref={courseDropdownRef}>
                    <button
                        type="button"
                        className="h-full min-h-16 px-3 md:px-4 rounded-2xl border-2 border-b-4 bg-white flex items-center gap-2 hover:-translate-y-0.5 transition-transform"
                        style={courseBoxStyle}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        aria-haspopup="listbox"
                        aria-expanded={isDropdownOpen}
                    >
                        <CourseIcon name={currentCourse.icon} size={28} />
                        <span className="font-black text-sm font-display max-w-[160px] truncate hidden sm:block">{currentCourse.title}</span>
                        {Object.keys(courses).length > 1 && <ChevronDown size={16} className="opacity-60" />}
                    </button>
                    {isDropdownOpen && (
                        <div role="listbox" className="absolute top-[110%] left-0 w-56 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                            {(Object.values(courses) as CourseData[]).map((course) => (
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={activeCourseId === course.id}
                                    key={course.id}
                                    className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 border-b last:border-0 border-gray-100 ${activeCourseId === course.id ? 'bg-gray-50' : ''}`}
                                    onClick={() => handleCourseChange(course.id)}
                                >
                                    <CourseIcon name={course.icon} size={22} className="text-gray-500" />
                                    <span className={`font-black text-sm font-display truncate ${activeCourseId === course.id ? 'text-gray-900' : 'text-gray-500'}`}>{course.title}</span>
                                    {activeCourseId === course.id && <span className="ml-auto w-2 h-2 rounded-full bg-green-500 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Kaldığın yerden devam et */}
                {nextNode ? (
                    <div
                        className="flex-1 min-w-[220px] max-w-[460px] rounded-2xl px-4 py-3 text-white flex items-center justify-between gap-3 border-b-4 border-black/10 shadow-sm"
                        style={{ backgroundColor: nextNode.baseColor }}
                    >
                        <div className="min-w-0">
                            <p className="text-[11px] font-black tracking-wider uppercase opacity-90">Kaldığın yerden devam et</p>
                            <p className="text-base font-black font-display truncate">{nextNode.title}</p>
                            <p className="text-xs font-bold opacity-90">{nextNode.stage || 'Modül'} · +{nextNode.xp ?? 500} XP</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => openNode(nextNode)}
                            className="shrink-0 bg-white font-black text-sm px-4 py-2.5 rounded-xl border-b-4 border-black/10 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-1"
                            style={{ color: nextNode.baseColor }}
                        >
                            Devam et <ChevronRight size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="flex-1 min-w-[220px] max-w-[460px] rounded-2xl px-4 py-3 bg-emerald-50 border-2 border-emerald-100 flex items-center gap-3">
                        <CheckCircle2 size={28} className="text-emerald-500 shrink-0" />
                        <div className="min-w-0">
                            <p className="text-sm font-black text-emerald-800">
                                {currentCourse.nodes.some((n) => n.isLocked) ? 'Açık modüllerin hepsini bitirdin' : 'Kursu tamamladın!'}
                            </p>
                            <p className="text-xs font-bold text-emerald-700/80">
                                {currentCourse.nodes.some((n) => n.isLocked) ? 'Öğretmenin sıradaki modülü açıp hazırlayınca burada görünecek.' : 'İstediğin modülü tekrar edebilirsin.'}
                            </p>
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setShowConcepts(true)}
                    className="shrink-0 px-4 bg-white border-2 border-gray-200 border-b-4 rounded-2xl flex flex-col items-center justify-center gap-0.5 hover:-translate-y-0.5 hover:border-indigo-300 transition-all min-h-16"
                    title="Neyi öğrendin, neye çalışmalısın?"
                >
                    <Brain size={22} className="text-indigo-500" />
                    <span className="text-[11px] font-black uppercase tracking-wide text-gray-600">Kazanımlarım</span>
                </button>

                {isClassActive && (
                    <button
                        type="button"
                        onClick={handleJoinLiveClass}
                        className="shrink-0 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black px-5 rounded-2xl flex items-center gap-3 shadow-lg shadow-emerald-100 min-h-16 border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[2px] transition-all hover:scale-105"
                    >
                        <span className="flex h-3 w-3 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                        </span>
                        <span className="flex flex-col text-left">
                            <span className="text-[11px] font-black text-emerald-100 uppercase tracking-wider leading-none mb-1">Ders başladı</span>
                            <span className="text-sm font-black leading-none">DERSE KATIL</span>
                        </span>
                    </button>
                )}

                {currentCourse.instructor && (
                    <div className="hidden 2xl:flex min-h-16 px-4 bg-white border-2 border-gray-200 border-b-4 rounded-2xl items-center gap-3 shrink-0 max-w-[220px]">
                        <span className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0"><UserRound size={20} className="text-indigo-500" /></span>
                        <span className="min-w-0">
                            <span className="block text-[11px] font-black text-gray-400 uppercase tracking-wider">Öğretmenin</span>
                            <span className="block text-sm font-black text-gray-800 truncate">{currentCourse.instructor.name}</span>
                        </span>
                    </div>
                )}

                {/* XP ve seviye (sunucudaki ilerlemeden) */}
                <div className="flex-1 min-w-[190px] sm:flex-none sm:w-72 sm:ml-auto bg-white border-2 border-gray-200 border-b-4 rounded-2xl min-h-16 px-4 py-2 flex items-center gap-3 shrink-0">
                    <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0"><Trophy size={20} /></span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                            <span className="text-base font-black text-gray-800 font-display whitespace-nowrap">{(userData?.xp ?? 0).toLocaleString('tr-TR')} XP</span>
                            <span className="flex items-center gap-1 text-[11px] font-black text-gray-500 whitespace-nowrap">
                                <LeagueIcon icon={userData?.progression?.league?.icon} color={userData?.progression?.league?.color} size={12} />
                                {userData?.progression?.league?.name ?? 'Bronz'} · Sv {userData?.progression?.level ?? 1}
                            </span>
                        </div>
                        <div className="mt-1 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" style={{ width: `${Math.max(4, Math.min(100, userData?.progression?.progress_pct ?? 0))}%` }} />
                        </div>
                        <span className="text-[11px] font-bold text-gray-400">Sonraki seviyeye {userData?.progression?.xp_to_next_level ?? 0} XP</span>
                    </div>
                </div>
            </div>

            <LatestAnnouncementBanner className="xl:hidden mx-4 mt-3 relative z-30" />

            {celebration && (
                <div role="status" aria-live="polite"
                     className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl border-2 font-black text-sm animate-in fade-in slide-in-from-top duration-300 ${
                         celebration.ok ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                    <span className="flex items-center gap-2">{celebration.ok && <PartyPopper size={18} />}{celebration.text}</span>
                </div>
            )}

            <div className="flex-1 md:min-h-0 flex relative">
            {/* Masaüstü: soldan sağa akan yol */}
            <div className="hidden md:flex flex-1 min-w-0 items-center justify-center relative z-20">
                <style>{`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                    @keyframes slideDownFade {
                        from { opacity: 0; transform: translateY(-30px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                    .animate-course-change {
                        animation: slideDownFade 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
                    }
                `}</style>
                <div className="w-full overflow-x-auto flex items-center px-12 md:px-24 no-scrollbar pt-48 pb-32 select-none" ref={nodesContainerRef}>
                    <div
                        key={activeCourseId}
                        className="flex items-center min-w-max relative pl-20 pr-20 animate-course-change"
                    >
                        {(() => {
                            const currentNodes = courses[activeCourseId].nodes;
                            return currentNodes.map((node, index) => {
                                const levelCounter = index + 1;

                                return (
                                    <React.Fragment key={node.id}>
                                        {/* STARTING LESSON HEADER */}
                                        {node.lessonTopic && (
                                            <div className="w-64 h-64 -mx-4 relative z-0 flex items-center justify-center">
                                                {/* Vertical Dashed Line */}
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] bg-gray-300 border-l-2 border-dashed border-gray-300 h-96 -z-10 opacity-50" />

                                                {/* Main Divider Body */}
                                                <div className="relative w-full flex flex-col items-center">
                                                    {/* Topic Badge */}
                                                    <div className="bg-white px-8 py-3 rounded-2xl shadow-none border-2 border-gray-100 flex flex-col items-center transform hover:scale-105 transition-transform cursor-pointer z-10">
                                                        <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-1">DERS {node.lessonNumber}</span>
                                                        <span className="text-lg font-black font-display tracking-tight text-gray-800">{node.lessonTopic}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {/* Node Container */}
                                        <div
                                            className={`relative z-10 group cursor-pointer transform hover:scale-105 transition-transform duration-200 ${node.curve === 'up' ? 'mt-32' : '-mt-12'} ${node.isLocked ? 'grayscale opacity-75 pointer-events-none' : ''}`}
                                            onClick={() => !node.isLocked && handleNodeClick(node)}
                                        >
                                            {/* Stars Rendering */}
                                            {node.stars !== undefined && (
                                                <div className="absolute top-35 left-1/2 -translate-x-1/2 flex gap-1 z-30 items-start">
                                                    {[0, 1, 2].map((i) => (
                                                        <svg
                                                            key={i}
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                            className={`w-8 h-8 drop-shadow-md transition-transform
                                                                ${i < (node.stars || 0) ? 'text-yellow-400' : 'text-gray-300'}
                                                                ${i === 0 ? 'rotate-6' : ''}
                                                                ${i === 1 ? 'translate-y-1 scale-110' : ''}
                                                                ${i === 2 ? '-rotate-6' : ''}
                                                            `}
                                                        >
                                                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                                        </svg>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Text Bubble */}
                                            <div
                                                className={`absolute bottom-full left-1/2 -translate-x-1/2 z-[60] origin-bottom transition-all duration-300 ease-out ${activeNodeId === node.id && !node.isLocked
                                                    ? 'opacity-100 scale-100 translate-y-[-80px]'
                                                    : 'opacity-0 scale-50 translate-y-4 pointer-events-none'
                                                    }`}
                                            >
                                                {/* DYNAMIC CARD BUBBLE */}
                                                <div className="relative min-w-[280px] transform hover:-translate-y-1 transition-transform duration-300 group/bubble cursor-default">
                                                    {/* Glow/Background Container */}
                                                    <div className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl border-x-2 border-t-2 border-b-[6px]" style={{ backgroundColor: node.baseColor, borderColor: node.strokeColor || 'rgba(0,0,0,0.1)' }}>
                                                        {/* Glow Shapes */}
                                                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-20 rounded-full blur-3xl"></div>
                                                        <div className="absolute bottom-0 -left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                                                        <Sparkles size={24} className="absolute top-4 right-6 text-white/30 animate-pulse" />
                                                    </div>

                                                    {/* Tail */}
                                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rotate-45 rounded-sm" style={{ backgroundColor: node.baseColor }}></div>

                                                    {/* Content */}
                                                    <div className="relative z-10 p-5 flex flex-col items-start text-left">
                                                        <h3 className="text-white font-black font-display text-xl leading-snug mb-1 drop-shadow-md pr-6">
                                                            {node.title || "Ders Başlığı"}
                                                        </h3>
                                                        <span className="text-white/90 font-bold text-xs uppercase tracking-widest mb-4">
                                                            {node.stage || 'Modül'} · {isDone(node) ? 'tamamlandı' : `+${node.xp ?? 500} XP`}
                                                        </span>

                                                        {node.type === 'homework' ? (
                                                            /* ── ÖDEV DÜĞÜMܤ ÖZEL BUTONLAR ── */
                                                            (() => {
                                                                const hwSlide = node.slides?.find((s: any) => s.type === 'homework');
                                                                const isHwSubmitted = hwSlide
                                                                    ? (currentCourse.progress?.submitted_homework || []).includes(String(hwSlide.id))
                                                                    : false;

                                                                return (
                                                                    <div className="w-full flex flex-col gap-2.5">
                                                                        {isHwSubmitted ? (
                                                                            <>
                                                                                {/* Teslim edildi badge */}
                                                                                <div className="w-full px-4 py-2.5 bg-green-500/25 border border-green-400/40 rounded-2xl flex items-center justify-center gap-2">
                                                                                    <span className="text-[11px] font-black uppercase tracking-wider text-green-100 flex items-center gap-1.5"><CheckCircle2 size={14} /> ÖDEV TESLİM EDİLDİ</span>
                                                                                </div>
                                                                                {/* Yine de girebilir */}
                                                                                <button
                                                                                    className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white text-center py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (hwSlide) setActiveHomeworkSlide(hwSlide);
                                                                                    }}
                                                                                >
                                                                                    <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5"><FolderOpen size={14} /> ÖDEVE GİR</span>
                                                                                </button>
                                                                            </>
                                                                        ) : (
                                                                            /* Henüz teslim edilmedi */
                                                                            <button
                                                                                className="w-full bg-yellow-400 hover:bg-yellow-300 text-yellow-950 text-center py-3.5 rounded-2xl shadow-lg border-b-[4px] border-black/10 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    if (hwSlide) setActiveHomeworkSlide(hwSlide);
                                                                                }}
                                                                            >
                                                                                <span className="font-black text-sm uppercase tracking-wider flex items-center gap-1.5">
                                                                                    <FileText size={16} /> ÖDEVİ TESLİM ET (+{hwSlide?.homeworkConfig?.points || 100} XP)
                                                                                </span>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })()
                                                        ) : (
                                                            /* ── NORMAL DÜĞÜMLERİN BAŞLAT BUTONU ── */
                                                            <>
                                                                <button
                                                                    className="w-full bg-white hover:bg-gray-50 text-center py-3.5 rounded-2xl shadow-lg border-b-[4px] border-black/5 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                                                    disabled={lessonSlidesOf(node).length === 0}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenLesson(node.id);
                                                                    }}
                                                                >
                                                                    <span className="font-black text-sm md:text-base uppercase tracking-wider" style={{ color: node.baseColor }}>
                                                                        {moduleActionLabel(lessonSlidesOf(node).length, isDone(node), node.xp ?? 500)}
                                                                    </span>
                                                                </button>

                                                                {/* Bu düğümde ayrıca homework slide varsa alt buton */}
                                                                {(() => {
                                                                    const hwSlide = node.slides?.find((s: any) => s.type === 'homework');
                                                                    if (!hwSlide) return null;
                                                                    const isHwSubmitted = (currentCourse.progress?.submitted_homework || []).includes(String(hwSlide.id));
                                                                    if (isHwSubmitted) {
                                                                        return (
                                                                            <div className="w-full mt-2.5 px-4 py-2.5 bg-green-500/20 border border-green-500/30 rounded-2xl text-center flex items-center justify-center gap-2">
                                                                                <span className="text-[10px] font-black uppercase tracking-wider text-green-100 flex items-center gap-1.5"><CheckCircle2 size={13} /> ÖDEV TESLİM EDİLDİ</span>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <button
                                                                            className="w-full mt-2.5 bg-yellow-400 hover:bg-yellow-350 text-yellow-950 text-center py-3.5 rounded-2xl shadow-lg border-b-[4px] border-black/10 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveHomeworkSlide(hwSlide);
                                                                            }}
                                                                        >
                                                                            <span className="font-black text-xs uppercase tracking-wider flex items-center gap-1.5">
                                                                                <FileText size={15} /> ÖDEVİ TESLİM ET (+{hwSlide.homeworkConfig?.points || 100} XP)
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })()}
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover Ring Effect */}
                                            <div className={`absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-16 border-8 rounded-[100%] opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none z-0 ${node.ringColor} ${node.isLocked ? 'hidden' : ''}`}></div>

                                            {/* Button Sprite */}
                                            <img src={node.button} alt="Button" className="w-36 relative z-10" />

                                            {/* Ground Shadow - Independent from floating icon */}
                                            {node.icon && (
                                                <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
                                                    <div
                                                        className="w-14 h-4 bg-gray-300 rounded-[100%] animate-shadow-pulse -mt-10"
                                                        style={{
                                                            animationDelay: `${index * 0.5 * -1}s`
                                                        }}
                                                    ></div>
                                                </div>
                                            )}

                                            {/* Icon/Number Container */}
                                            <div className={`absolute inset-0 flex items-center justify-center z-20 ${node.iconOffset || ''}`}>
                                                {node.icon ? (
                                                    <>
                                                        {/* Back Glow Effect - Double Layer */}
                                                        <div
                                                            className="absolute w-36 h-36 rounded-full blur-3xl opacity-100 animate-pulse"
                                                            style={{
                                                                backgroundColor: node.pastelColor,
                                                                animationDelay: `${index * 0.5 * -1}s`
                                                            }}
                                                        ></div>
                                                        <div
                                                            className="absolute w-16 h-16 bg-white rounded-full blur-2xl opacity-80 animate-pulse"
                                                            style={{
                                                                animationDelay: `${index * 0.5 * -1}s`
                                                            }}
                                                        ></div>

                                                        <img
                                                            src={node.icon}
                                                            alt={node.type}
                                                            className={`${node.iconSize} animate-float relative z-10`}
                                                            style={{
                                                                filter: `drop-shadow(0 0 5px ${node.pastelColor})`,
                                                                animationDelay: `${index * 0.5 * -1}s`
                                                            }}
                                                        />

                                                        {/* Level Number Underneath */}
                                                        <div
                                                            className="absolute top-[105%] flex flex-col items-center justify-start animate-float z-20 w-52"
                                                            style={{ animationDelay: `${index * 0.5 * -1}s` }}
                                                        >
                                                            <span
                                                                className="text-lg sm:text-xl font-black tracking-wide select-none text-center line-clamp-2 leading-tight max-w-[200px] px-1 break-words"
                                                                style={{
                                                                    fontFamily: "'Fredoka', sans-serif",
                                                                    color: 'white',
                                                                    WebkitTextStroke: `1.5px ${node.strokeColor}`,
                                                                    paintOrder: 'stroke fill',
                                                                    filter: `drop-shadow(0 0 4px ${node.pastelColor})`,
                                                                    textShadow: `2px 2px 0px ${node.strokeColor}`
                                                                }}
                                                                title={node.title}
                                                            >
                                                                {node.title?.toUpperCase()}
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Connector */}
                                        {index < currentNodes.length - 1 && (
                                            // STANDARD CONNECTOR
                                            <div className="w-40 h-20 -mx-4 relative z-0 flex items-center justify-center">
                                                <svg className="w-full h-full overflow-visible" viewBox="0 0 120 100" fill="none">
                                                    <path
                                                        d={
                                                            currentNodes[index + 1]?.lessonTopic
                                                                ? (node.curve === 'down' ? "M0 45 Q 60 70 120 45" : "M0 65 Q 60 20 120 45")
                                                                : (node.curve === 'down' ? "M0 45 Q 60 110 120 65" : "M0 65 Q 60 0 120 45")
                                                        }
                                                        stroke="#6B7280"
                                                        strokeWidth="12"
                                                        strokeLinecap="round"
                                                        strokeDasharray="0 25"
                                                        fill="none"
                                                    />
                                                </svg>

                                                {/* Decorative Grass */}
                                                <img src={GrassIcon} alt="" className={`absolute w-5 opacity-80 ${index % 2 === 0 ? '-rotate-6' : 'rotate-3'}`}
                                                    style={{ left: '10%', top: node.curve === 'down' ? '45%' : '55%', transform: `translate(0, ${index % 2 === 0 ? '5px' : '-5px'})` }} />
                                                <img src={GrassIcon} alt="" className={`absolute w-6 opacity-90 ${index % 3 === 0 ? 'rotate-6' : '-rotate-3'}`}
                                                    style={{ left: '30%', top: node.curve === 'down' ? '65%' : '35%', transform: `translate(0, ${index % 3 === 0 ? '-8px' : '4px'})` }} />
                                                <img src={GrassIcon} alt="" className={`absolute w-7 opacity-85 ${index % 2 !== 0 ? 'rotate-3 scale-110' : '-rotate-3 scale-90'}`}
                                                    style={{ left: '50%', top: node.curve === 'down' ? '80%' : '25%', transform: `translate(0, ${index % 4 === 0 ? '10px' : '-2px'})` }} />
                                                <img src={GrassIcon} alt="" className={`absolute w-5 opacity-80 ${index % 2 === 0 ? 'rotate-12' : '-rotate-6'}`}
                                                    style={{ left: '70%', top: node.curve === 'down' ? '85%' : '25%', transform: `translate(0, ${index % 2 !== 0 ? '6px' : '-6px'})` }} />
                                                <img src={GrassIcon} alt="" className={`absolute w-6 opacity-75 ${index % 3 === 0 ? '-rotate-3' : 'rotate-6'}`}
                                                    style={{ left: '90%', top: node.curve === 'down' ? '70%' : '35%', transform: `translate(0, ${index % 3 !== 0 ? '-5px' : '5px'})` }} />
                                            </div>
                                        )}
                                    </React.Fragment>
                                );
                            });
                        })()}
                    </div>
                </div>
            </div>

            {/* Telefon: VS Code panelindeki gibi yukarıdan aşağı akan yol */}
            <div className="md:hidden flex-1 min-w-0 pt-4">
                <GamifiedRoadmapPath
                    key={activeCourseId}
                    courseTitle={currentCourse.title}
                    modules={roadmapModules}
                    activeKey={nextNode ? String(nextNode.id) : null}
                    onSelectModule={(mod) => {
                        const node = currentCourse.nodes.find((n) => String(n.id) === mod.key);
                        if (node) openNode(node);
                    }}
                />
                <div className="px-4 pb-8 -mt-16 space-y-4 relative z-10">
                    <DailyQuests data={activity} />
                    {homeworkWidget}
                    <AttendanceCard courseId={activeCourseId} />
                </div>
            </div>

            {/* Geniş ekranda sağ sütun: akışta, yolun üstüne binmez */}
            <aside className="hidden xl:flex flex-col gap-5 w-72 shrink-0 overflow-y-auto no-scrollbar px-5 pb-6 pt-4 relative z-30">
                <DailyQuests data={activity} />
                {homeworkWidget}
                <AnnouncementFeed />
                <AttendanceCard courseId={activeCourseId} />
                <div className="relative mt-auto self-center pointer-events-none select-none" aria-hidden="true">
                    <span className="absolute top-2 right-6 text-2xl font-black text-sky-400 animate-zzz font-display">Z</span>
                    <img src={MufiSleep} alt="" className="w-40 animate-breathe" />
                </div>
            </aside>
            </div>


            {/* LESSON SLIDE OVERLAY — ana roadmap her zaman tek-başına tekrar (canlı değil) */}
            <LessonSlide
                isOpen={showLessonSlide}
                isLive={false}
                lessonTitle={currentCourse.nodes.find(n => String(n.id) === String(lessonLevel))?.title}
                slides={(currentCourse.nodes.find(n => String(n.id) === String(lessonLevel))?.slides || []).filter((s: any) => s.type !== 'homework')}
                onClose={handleCloseLesson}
                onComplete={handleLessonComplete}
                courseId={currentCourse.id}
                lessonIndex={currentCourse.nodes.find(n => String(n.id) === String(lessonLevel))?.lessonNumber}
                userData={userData}
                moduleStage={activeLessonNode?.stage}
                dersStages={dersStages}
                nextModuleNodeId={nextDersModule?.id ?? null}
                nextModuleStage={nextDersModule?.stage ?? null}
                onAdvanceModule={handleAdvanceModule}
                moduleXp={activeLessonNode?.xp ?? 500}
            />

            {/* GAME PAGE OVERLAY */}
            <GameOverlay
                isOpen={showGameOverlay}
                level={gameLevel}
                lessonTitle={currentCourse.nodes.find(n => String(n.id) === String(gameLevel))?.title}
                courseId={currentCourse.id}
                sectionId={currentCourse.nodes.find(n => String(n.id) === String(gameLevel))?.sectionId}
                localNodeIndex={currentCourse.nodes.find(n => String(n.id) === String(gameLevel))?.localNodeIndex}
                onClose={handleCloseGame}
                onComplete={handleGameComplete}
                onStatsUpdate={refreshUserData}
            />

            {/* HOMEWORK OVERLAY — tam ekran konumlandırma burada yapılır;
                StudentHomeworkView yalnızca kabına yayılır (bkz. bileşendeki not). */}
            {activeHomeworkSlide && (
                <div className="fixed inset-0 z-[300] bg-slate-50">
                    <StudentHomeworkView
                        slide={activeHomeworkSlide}
                        courseId={currentCourse.id}
                        onClose={() => { setActiveHomeworkSlide(null); void refreshProgress(currentCourse.id); }}
                        onComplete={() => {
                            setActiveHomeworkSlide(null);
                            refreshUserData();
                            void refreshProgress(currentCourse.id);
                        }}
                    />
                </div>
            )}

        </div>
    );
};

export default HomePage;
