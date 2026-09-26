import React, { useState, useEffect, useRef } from 'react';
import GrassIcon from '../../assets/sprites/grass.png';
import api from '../../api';
import { useNavigate } from 'react-router-dom';
import { openMeetingLink, rememberMeetingLink } from '../../meetingLink';
import { AnnouncementFeed, AttendanceCard, LatestAnnouncementBanner } from '../shared/SchoolNotices';
import MyConceptsModal from './MyConceptsModal';
import { Zap, FileText, PartyPopper, Sparkles, CheckCircle2, FolderOpen, Lock, ChevronLeft, ChevronRight, Rows3, Columns3 } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import GameOverlay from './GameOverlay';
import LessonSlide from './LessonSlide';
import LiveLessonStudent from './LiveLessonStudent';
import StudentHomeworkView from './StudentHomeworkView';
import type { CourseData, PathNode } from '../../types';
import { completeModule, type CourseProgress } from '../../progress';
import GamifiedRoadmapPath, { moduleActionLabel, type RoadmapModule } from './GamifiedRoadmapPath';
import DailyQuests, { useActivity } from './DailyQuests';
import HomeHero, { mufiLine } from './HomeHero';
import { HomeworkCard, NotificationBell, collectHomework, useHomeworkStatus, type HomeworkItem } from './studentFeed';
import { VSCodeGuideModal, VSCodeStatusChip, shouldAutoOpenGuide, useVSCodeStatus } from './VSCodeStatus';
import { ChunkyButton, Mufi, MufiEmpty, MufiTipCard } from './ui';

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
    /** Okunmamış hoca cevapları (bildirim zili). */
    unreadMessages?: number;
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
    unreadMessages = 0,
}) => {
    const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
    // "Kazanımlarım": öğrencinin kendi kazanım haritası (neyi öğrendim, neye çalışmalıyım).
    const [showConcepts, setShowConcepts] = useState(false);

    // Refs for outside click detection
    const nodesContainerRef = useRef<HTMLDivElement>(null);
    const nextNodeIdForScroll = currentCourse?.nodes.find((n) =>
        !n.isLocked && !(n.sectionId && currentCourse.progress?.completed?.[String(n.sectionId)]) && (n.slides?.length ?? 0) > 0)?.id;

    // Harita yönü: dikey (varsayılan, telefondaki gibi) ya da yatay. Tercih bu tarayıcıda kalır.
    const [mapLayout, setMapLayout] = useState<'vertical' | 'horizontal'>(() => {
        try { return localStorage.getItem('gomufi.mapLayout') === 'horizontal' ? 'horizontal' : 'vertical'; } catch { return 'vertical'; }
    });
    const chooseLayout = (next: 'vertical' | 'horizontal') => {
        setMapLayout(next);
        try { localStorage.setItem('gomufi.mapLayout', next); } catch { /* yalnızca bu oturum */ }
    };
    // Geniş ekranda dikey yol daha geniş kıvrılır ve yanında Mufi durur.
    const [isWide, setIsWide] = useState(() => window.matchMedia('(min-width: 768px)').matches);
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 768px)');
        const onChange = () => setIsWide(mq.matches);
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    // Dikey yol: sıradaki modül ekranın altında kalıyorsa açılışta ona in.
    useEffect(() => {
        if (mapLayout !== 'vertical' || nextNodeIdForScroll == null) return;
        // İlk birkaç modüldeyken karşılama alanı görünür kalsın; yol uzadıkça kaydır.
        const position = currentCourse?.nodes.findIndex((n) => n.id === nextNodeIdForScroll) ?? -1;
        if (position < 3) return;
        const frame = requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(`[data-module-key="${nextNodeIdForScroll}"]`);
            if (el && el.getBoundingClientRect().top > window.innerHeight - 160) {
                el.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        });
        return () => cancelAnimationFrame(frame);
    }, [mapLayout, activeCourseId, nextNodeIdForScroll]);

    // Yatay yol: hangi kenarda devamı var (oklar ve kenar solması için)
    const [mapEdges, setMapEdges] = useState({ left: false, right: false });
    const updateMapEdges = () => {
        const el = nodesContainerRef.current;
        if (!el) return;
        const left = el.scrollLeft > 8;
        const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 8;
        setMapEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
    };
    const scrollMap = (dir: 1 | -1) => {
        const el = nodesContainerRef.current;
        el?.scrollBy({ left: dir * el.clientWidth * 0.6, behavior: 'smooth' });
    };
    const fade = (on: boolean) => (on ? 'transparent 0, #000 72px' : '#000 0');
    const mapMask = `linear-gradient(to right, ${fade(mapEdges.left)}, #000 calc(100% - 72px), ${mapEdges.right ? 'transparent 100%' : '#000 100%'})`;

    // Outside click listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
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

    // Homework Overlay State — ödev, seçili kurstan başka bir kursa da ait olabilir
    // ("Ödevlerim" kartı tüm kursları listeler).
    const [activeHomework, setActiveHomework] = useState<{ slide: any; courseId: string } | null>(null);
    const setActiveHomeworkSlide = (slide: any | null) =>
        setActiveHomework(slide ? { slide, courseId: String(currentCourse?.id ?? activeCourseId) } : null);

    // Ödev durumları (teslim/not) ve VS Code bağlantısı
    const [homeworkTick, setHomeworkTick] = useState(0);
    const homeworkStatus = useHomeworkStatus(homeworkTick);
    const [showGuide, setShowGuide] = useState(false);
    const vscode = useVSCodeStatus(() => { if (shouldAutoOpenGuide()) setShowGuide(true); });

    // Real-time Class Session States
    const [isClassActive, setIsClassActive] = useState<boolean>(false);
    const [liveCourseId, setLiveCourseId] = useState<string | null>(null);
    const [lastActiveSessionTitle, setLastActiveSessionTitle] = useState<string | null>(null);
    const { sendMessage, lastMessage } = useWebSocket();
    // Seri ve günlük görevler: XP ya da ilerleme değişince yeniden okunur.
    const activity = useActivity(`${userData?.xp ?? 0}:${Object.keys(currentCourse?.progress?.completed || {}).length}`);
    const navigate = useNavigate();

    // Sıradaki modül (yolu açılışta ona kaydırmak için; aşağıdaki nextNode ile aynı kural)
    const nextNodeId = currentCourse?.nodes.find((n) =>
        !n.isLocked && !(n.sectionId && currentCourse.progress?.completed?.[String(n.sectionId)]) && (n.slides?.length ?? 0) > 0)?.id;

    // Yatay yol: fare tekerleği yana kaydırsın, açılışta sıradaki modül ortada olsun,
    // pencere boyu değişince oklar güncellensin.
    useEffect(() => {
        const el = nodesContainerRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
            const atStart = el.scrollLeft <= 0 && e.deltaY < 0;
            const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 && e.deltaY > 0;
            if (atStart || atEnd) return; // uçlarda sayfa normal kaysın
            e.preventDefault();
            el.scrollLeft += e.deltaY;
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        const ro = new ResizeObserver(() => requestAnimationFrame(updateMapEdges));
        ro.observe(el);
        const frame = requestAnimationFrame(() => {
            const target = nextNodeId != null ? el.querySelector<HTMLElement>(`[data-node-id="${nextNodeId}"]`) : null;
            if (target) {
                const box = target.getBoundingClientRect();
                const host = el.getBoundingClientRect();
                el.scrollLeft += box.left + box.width / 2 - (host.left + host.width / 2);
            }
            updateMapEdges();
        });
        return () => { el.removeEventListener('wheel', onWheel); ro.disconnect(); cancelAnimationFrame(frame); };
    }, [activeCourseId, nextNodeId, isUserDataLoading]);

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
                <MufiEmpty
                    pose="wave"
                    title="Henüz bir sınıfa katılmadın"
                    text="Öğretmeninin verdiği katılım kodunu gir; dersler ve macera haritan burada açılacak."
                    action={<ChunkyButton size="lg" onClick={() => navigate('/student/my-classes')}>Katılım kodu gir</ChunkyButton>}
                />
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

    // Ödevlerim (tüm kurslar) ve Mufi'nin cümlesi
    const homework = collectHomework(courses, homeworkStatus);
    const openHomework = (hw: HomeworkItem) => {
        if (hw.courseId !== String(activeCourseId)) handleCourseChange(hw.courseId);
        setActiveHomework({ slide: hw.slide, courseId: hw.courseId });
    };
    const someLocked = currentCourse.nodes.some((n) => n.isLocked);
    const line = mufiLine({
        name: userData?.first_name || 'kaşif',
        live: isClassActive,
        nextNode,
        allDone: !nextNode,
        someLocked,
        activity,
        homework,
        completedAny: Object.keys(currentCourse.progress?.completed || {}).length > 0,
    });
    const homeworkWidget = <HomeworkCard items={homework} onOpen={openHomework} />;

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
        <div className="absolute inset-0 bg-white bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] [background-size:22px_22px] flex flex-col overflow-y-auto overflow-x-hidden">
            {showConcepts && activeCourseId && (
                <MyConceptsModal courseId={activeCourseId} onClose={() => setShowConcepts(false)} />
            )}

            {showGuide && (
                <VSCodeGuideModal state={vscode.state} recheck={vscode.recheck} onClose={() => setShowGuide(false)} />
            )}

            {/* Kahraman alanı: Mufi'nin karşılaması, seviye/seri ve tek büyük "devam et" */}
            <div className="w-full px-4 md:px-8 pt-4 md:pt-6 z-30 relative">
                <HomeHero
                    line={line}
                    course={currentCourse}
                    courses={courses}
                    onPickCourse={handleCourseChange}
                    userData={userData}
                    activity={activity}
                    nextNode={nextNode}
                    onContinue={() => nextNode && openNode(nextNode)}
                    live={isClassActive}
                    onJoinLive={handleJoinLiveClass}
                    onOpenConcepts={() => setShowConcepts(true)}
                    tools={<>
                        <VSCodeStatusChip state={vscode.state} onClick={() => setShowGuide(true)} onDark />
                        <NotificationBell
                            homework={homework}
                            unreadMessages={unreadMessages}
                            onOpenHomework={openHomework}
                            onOpenMessages={() => navigate('/student/ask')}
                            onDark
                        />
                    </>}
                />
            </div>

            <LatestAnnouncementBanner className="xl:hidden mx-4 mt-3 relative z-30" />

            {celebration && (
                <div role="status" aria-live="polite"
                     className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-xl border-2 font-black text-sm animate-in fade-in slide-in-from-top duration-300 ${
                         celebration.ok ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                    <span className="flex items-center gap-2">{celebration.ok && <PartyPopper size={18} />}{celebration.text}</span>
                </div>
            )}

            {/* Yol görünümü seçimi (geniş ekran) */}
            <div className="hidden md:flex justify-end px-8 pt-4 relative z-30">
                <div className="inline-flex bg-white p-1 rounded-2xl border-2 border-slate-200" role="radiogroup" aria-label="Harita görünümü">
                    {([['vertical', 'Dikey', Rows3], ['horizontal', 'Yatay', Columns3]] as const).map(([key, label, Icon]) => (
                        <button key={key} type="button" role="radio" aria-checked={mapLayout === key}
                                onClick={() => chooseLayout(key)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors ${mapLayout === key ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}>
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 md:min-h-0 flex relative">
            {/* Masaüstü: soldan sağa akan yol ("Yatay" seçiliyse) */}
            <div className={`hidden ${mapLayout === 'horizontal' ? 'md:flex' : ''} flex-1 min-w-0 items-center justify-center relative z-20`}>
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
                {/* Yol yana taşıyor ama kaydırma çubuğu gizli: kenarlar yumuşak solar ve
                    oklar görünür — eskiden yol sağda keskin bir çizgiyle kesilmiş gibi duruyordu. */}
                {mapEdges.left && (
                    <button type="button" onClick={() => scrollMap(-1)} aria-label="Yolda geri git"
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 border-b-4 text-slate-600 hover:text-violet-600 hover:border-violet-300 active:border-b-2 active:translate-y-[calc(-50%+2px)] flex items-center justify-center shadow-sm">
                        <ChevronLeft size={24} strokeWidth={3} />
                    </button>
                )}
                {mapEdges.right && (
                    <button type="button" onClick={() => scrollMap(1)} aria-label="Yolda ileri git"
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-40 w-12 h-12 rounded-2xl bg-white border-2 border-slate-200 border-b-4 text-slate-600 hover:text-violet-600 hover:border-violet-300 active:border-b-2 active:translate-y-[calc(-50%+2px)] flex items-center justify-center shadow-sm">
                        <ChevronRight size={24} strokeWidth={3} />
                    </button>
                )}
                <div className="w-full overflow-x-auto flex items-center px-12 md:px-24 no-scrollbar pt-48 pb-32 select-none" ref={nodesContainerRef}
                     onScroll={updateMapEdges}
                     style={{ maskImage: mapMask, WebkitMaskImage: mapMask }}>
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
                                            data-node-id={node.id}
                                            className={`relative z-10 group cursor-pointer transform hover:scale-105 transition-transform duration-200 ${node.curve === 'up' ? 'mt-32' : '-mt-12'} ${node.isLocked ? 'grayscale opacity-75 pointer-events-none' : ''}`}
                                            onClick={() => !node.isLocked && handleNodeClick(node)}
                                        >
                                            {/* Stars Rendering */}
                                            {node.stars !== undefined && (
                                                <div className="absolute top-[5.9rem] left-1/2 -translate-x-1/2 flex gap-1 z-30 items-start">
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

                                            {/* Modül adı: okunur hap etiket (eskiden dış çizgili yazı butonun üstüne biniyordu) */}
                                            <div className="absolute top-[8.2rem] left-1/2 -translate-x-1/2 z-30 w-56 flex justify-center pointer-events-none">
                                                <span
                                                    className="px-3 py-1 rounded-xl bg-white border-2 border-b-4 text-sm font-black text-center leading-tight line-clamp-2 max-w-[13rem] shadow-sm"
                                                    style={{ borderColor: node.isLocked ? '#cbd5e1' : node.strokeColor, color: node.isLocked ? '#64748b' : node.strokeColor }}
                                                    title={node.title}
                                                >
                                                    {node.title}
                                                </span>
                                            </div>

                                            {/* Sıradaki modül: Mufi yanında bekliyor */}
                                            {nextNode?.id === node.id && (
                                                <div className="absolute -left-16 top-10 z-30 flex flex-col items-center pointer-events-none">
                                                    <span className="mb-1 px-2 py-0.5 rounded-lg bg-violet-500 text-white text-[11px] font-black whitespace-nowrap border-b-2 border-violet-700">Sıradaki!</span>
                                                    <Mufi pose="wave" className="w-16 animate-bob drop-shadow" />
                                                </div>
                                            )}

                                            {/* Kilitli modül */}
                                            {node.isLocked && (
                                                <span className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-slate-700 text-white flex items-center justify-center border-2 border-white shadow" title="Öğretmenin açınca başlar">
                                                    <Lock size={18} />
                                                </span>
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

            {/* Dikey yol: telefonda her zaman, geniş ekranda "Dikey" seçiliyse */}
            <div className={`${mapLayout === 'vertical' ? '' : 'md:hidden'} flex-1 min-w-0 pt-4 md:pt-2`}>
                <div className="w-full max-w-2xl mx-auto">
                    <GamifiedRoadmapPath
                        key={`${activeCourseId}-${isWide ? 'w' : 'n'}`}
                        courseTitle={currentCourse.title}
                        showHeader={false}
                        amplitude={isWide ? 1.7 : 1}
                        showGuide={isWide}
                        modules={roadmapModules}
                        activeKey={nextNode ? String(nextNode.id) : null}
                        onSelectModule={(mod) => {
                            const node = currentCourse.nodes.find((n) => String(n.id) === mod.key);
                            if (node) openNode(node);
                        }}
                    />
                </div>
                <div className="xl:hidden px-4 pb-8 -mt-16 space-y-4 relative z-10 max-w-2xl mx-auto">
                    <DailyQuests data={activity} />
                    {homeworkWidget}
                    <AttendanceCard courseId={activeCourseId} />
                </div>
            </div>

            {/* Geniş ekranda sağ sütun: akışta, yolun üstüne binmez */}
            <aside className="hidden xl:flex flex-col gap-5 w-80 shrink-0 self-start sticky top-0 max-h-[100dvh] overflow-y-auto no-scrollbar px-5 pb-6 pt-4 z-30">
                <DailyQuests data={activity} />
                {homeworkWidget}
                <AnnouncementFeed />
                <AttendanceCard courseId={activeCourseId} />
                <MufiTipCard />
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
            {activeHomework && (
                <div className="fixed inset-0 z-[300] bg-slate-50">
                    <StudentHomeworkView
                        slide={activeHomework.slide}
                        courseId={activeHomework.courseId}
                        onClose={() => { setActiveHomework(null); void refreshProgress(activeHomework.courseId); setHomeworkTick((t) => t + 1); }}
                        onComplete={() => {
                            setActiveHomework(null);
                            refreshUserData();
                            void refreshProgress(activeHomework.courseId);
                            setHomeworkTick((t) => t + 1);
                        }}
                    />
                </div>
            )}

        </div>
    );
};

export default HomePage;
