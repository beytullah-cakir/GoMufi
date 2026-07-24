import React, { useState, useEffect, useRef } from 'react';
import GrassIcon from '../../assets/sprites/grass.png';
import api from '../../api';
import { Swords, Users, Shield, Trophy, ChevronDown, PenTool, ChevronRight } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import GameOverlay from './GameOverlay';
import LessonSlide from './LessonSlide';
import LiveLessonStudent from './LiveLessonStudent';
import StudentHomeworkView from './StudentHomeworkView';
import type { CourseData, PathNode } from '../../types';

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
    setIsLiveSessionJoined
}) => {
    const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isClanDropdownOpen, setIsClanDropdownOpen] = useState(false);

    // Refs for outside click detection
    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const clanDropdownRef = useRef<HTMLDivElement>(null);
    const nodesContainerRef = useRef<HTMLDivElement>(null);

    // Outside click listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            if (clanDropdownRef.current && !clanDropdownRef.current.contains(event.target as Node)) {
                setIsClanDropdownOpen(false);
            }
            if (nodesContainerRef.current && !nodesContainerRef.current.contains(event.target as Node)) {
                setActiveNodeId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const squadMembers = [
        { id: 1, name: 'Ali', status: 'online', avatarSeed: 123 },
        { id: 2, name: 'Ayşe', status: 'in-class', avatarSeed: 456 },
        { id: 3, name: 'Can', status: 'offline', avatarSeed: 789 },
        { id: 4, name: 'Ece', status: 'online', avatarSeed: 101 },
    ];

    // Dynamic Header State
    const [headerColor, setHeaderColor] = useState<string>('#58cc02'); // Default Green
    const [headerTitle, setHeaderTitle] = useState<string>('İngilizce temellerini at');
    const [headerSubtitle, setHeaderSubtitle] = useState<string>('BÖLÜM 1, ÜNİTE 1');

    // Game Overlay State
    const [showGameOverlay, setShowGameOverlay] = useState(false);
    const [gameLevel, setGameLevel] = useState<number | null>(null);

    // Lesson Slide State
    const [showLessonSlide, setShowLessonSlide] = useState(false);
    const [lessonLevel, setLessonLevel] = useState<number | null>(null);

    // Homework Overlay State
    const [activeHomeworkSlide, setActiveHomeworkSlide] = useState<any | null>(null);

    // Real-time Class Session States
    const [isClassActive, setIsClassActive] = useState<boolean>(false);
    const [liveCourseId, setLiveCourseId] = useState<string | null>(null);
    const [lastActiveSessionTitle, setLastActiveSessionTitle] = useState<string | null>(null);
    const { sendMessage, lastMessage } = useWebSocket();

    const [myClass, setMyClass] = useState<{ class_name: string | null; classmates: any[] }>({
        class_name: null,
        classmates: []
    });

    const [isQuestsExpanded, setIsQuestsExpanded] = useState(true);

    useEffect(() => {
        if (!activeCourseId) return;

        const fetchClassData = async () => {
            try {
                const res = await api.get(`/student/my-class/${activeCourseId}`);
                setMyClass({
                    class_name: res.data.class_name,
                    classmates: res.data.classmates || []
                });
            } catch (err) {
                console.error("Failed to fetch student class data:", err);
                setMyClass({ class_name: null, classmates: [] });
            }
        };

        fetchClassData();
    }, [activeCourseId]);

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
                    
                    if (lastActiveSessionTitle && lastActiveSessionTitle.startsWith("gomufi_session:")) {
                        const parts = lastActiveSessionTitle.split(":");
                        const lessonIndex = parseInt(parts[1]);
                        
                        if (!isNaN(lessonIndex) && liveCourseId) {
                            const currentProgressStr = localStorage.getItem(`progress_${liveCourseId}`);
                            const currentProgress = currentProgressStr ? parseInt(currentProgressStr) : 0;
                            
                            if (lessonIndex > currentProgress) {
                                localStorage.setItem(`progress_${liveCourseId}`, lessonIndex.toString());
                                alert(`Tebrikler! Ders ${lessonIndex} tamamlandı. Bir sonraki modülün kilidi açıldı!`);
                                window.location.reload();
                            }
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
            // Open Jitsi Room in new window
            try {
                const jitsiRes = await api.get(`/jitsi/token/${targetCourseId}`);
                const { token, room, domain } = jitsiRes.data;
                const url = `https://${domain}/${room}?jwt=${token}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
                window.open(url, "_blank");
            } catch (jitsiErr) {
                console.warn('Jitsi token error, using freeFallback meet.jit.si', jitsiErr);
                const fallbackUrl = `https://meet.jit.si/GoMufi-Room-${targetCourseId}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
                window.open(fallbackUrl, "_blank");
            }

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
                    const completedLessonLevel = Number(msgLessonIndex);
                    setCourses(prev => {
                        const currentCourseData = prev[activeCourseId];
                        if (!currentCourseData) return prev;

                        const updatedNodes = currentCourseData.nodes.map(node => {
                            if (node.id === completedLessonLevel) {
                                return { ...node, stars: msgStars || 3 };
                            }
                            if (node.id === completedLessonLevel + 1) {
                                return { ...node, isLocked: false };
                            }
                            return node;
                        });

                        localStorage.setItem(`progress_${activeCourseId}`, completedLessonLevel.toString());

                        return {
                            ...prev,
                            [activeCourseId]: {
                                ...currentCourseData,
                                nodes: updatedNodes
                            }
                        };
                    });
                }
            }
        }
    }, [lastMessage, currentCourse, isLiveSessionJoined, activeCourseId, setCourses]);

    // Initialize/Update Header when currentCourse changes
    useEffect(() => {
        if (currentCourse) {
            // Find the last unlocked node (highest ID that is not locked)
            const reversedNodes = [...currentCourse.nodes].reverse();
            const lastUnlockedNode = reversedNodes.find(node => !node.isLocked);

            if (lastUnlockedNode) {
                setHeaderColor(lastUnlockedNode.baseColor);
                setHeaderTitle(lastUnlockedNode.title);
                setHeaderSubtitle(`BÖLÜM 1, DERS ${lastUnlockedNode.id}`);
            } else {
                setHeaderColor(currentCourse.themeColor);
                setHeaderTitle(currentCourse.defaultHeader.title);
                setHeaderSubtitle(currentCourse.defaultHeader.subtitle);
            }
        }
    }, [currentCourse]); // Re-run when course changes

    const handleNodeClick = (node: PathNode) => {
        if (activeNodeId === node.id) {
            setActiveNodeId(null);
        } else {
            setActiveNodeId(node.id);
            setHeaderColor(node.baseColor);
            setHeaderTitle(node.title);
            setHeaderSubtitle(`BÖLÜM 1, DERS ${node.id}`);
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

    const handleLessonComplete = async () => {
        setShowLessonSlide(false);
        if (lessonLevel !== null) {
            const gameLevel = lessonLevel;
            
            // 1. Award XP and Gems in the backend
            try {
                await api.post("/profile/student/stats", { xp_gain: 10, gems_gain: 2 });
            } catch (err) {
                console.error("Failed to update student stats:", err);
            }

            // 2. Refresh UI stats
            if (refreshUserData) {
                await refreshUserData();
            }

            // 3. Unlock next node and award 3 stars locally
            setCourses(prev => {
                const currentCourseData = prev[activeCourseId];
                if (!currentCourseData) return prev; // Safety

                const updatedNodes = currentCourseData.nodes.map(node => {
                    if (node.id === gameLevel) {
                        return { ...node, stars: 3 };
                    }
                    if (node.id === gameLevel + 1) {
                        return { ...node, isLocked: false };
                    }
                    return node;
                });

                // Persist progress: last completed node ID
                localStorage.setItem(`progress_${activeCourseId}`, gameLevel.toString());

                return {
                    ...prev,
                    [activeCourseId]: {
                        ...currentCourseData,
                        nodes: updatedNodes
                    }
                };
            });
            setLessonLevel(null);
        }
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

        setCourses(prev => {
            const currentCourseData = prev[activeCourseId];
            if (!currentCourseData) return prev; // Safety

            const updatedNodes = currentCourseData.nodes.map(node => {
                if (node.id === gameLevel) {
                    return { ...node, stars: stars };
                }
                if (node.id === gameLevel + 1) {
                    return { ...node, isLocked: false };
                }
                return node;
            });

            // Persist progress: last completed node ID
            localStorage.setItem(`progress_${activeCourseId}`, gameLevel.toString());

            return {
                ...prev,
                [activeCourseId]: {
                    ...currentCourseData,
                    nodes: updatedNodes
                }
            };
        });
        handleCloseGame();
    };

    if (isUserDataLoading) {
        return (
            <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 text-center z-10">
                <div className="relative">
                    <div className="w-48 h-48 rounded-full border-8 border-indigo-100 animate-pulse"></div>
                    <div className="absolute inset-0 border-t-8 border-indigo-600 rounded-full animate-spin"></div>
                    <span className="absolute inset-0 flex items-center justify-center text-6xl animate-bounce">⚡</span>
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
                    <span className="text-8xl animate-bounce">🛒</span>
                </div>
                <h2 className="text-3xl font-black text-gray-800 mb-4 font-display">Henüz Bir Kursun Yok!</h2>
                <p className="text-gray-500 max-w-md mb-8 text-lg font-medium">
                    Maceraya başlamak için Market'ten harika kurslarimizi keşfedebilir ve ilk adimini atabilirsin.
                </p>
                <button 
                    onClick={() => (window as any).setActivePage ? (window as any).setActivePage('Kurslar') : window.location.reload()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:translate-y-0 text-xl font-display uppercase tracking-widest"
                >
                    Kurslari Keşfet
                </button>
            </div>
        );
    }

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
        <div className="absolute inset-0 bg-white flex flex-col items-center relative overflow-hidden">

            {/* Header Row: Course info + Unit Header + Stats + XP Bar */}
            <div className="w-full px-6 md:px-12 pt-6 flex flex-wrap justify-between items-center gap-4 z-30 relative">
                {/* Left Side Container: Course Box + Unit Header + Live Join Button + Instructor Widget */}
                    <div className="flex flex-wrap items-center gap-4 flex-1 min-w-0">
                        {/* Course Info Box (Dropdown Enabled) */}
                        <div className="relative" ref={courseDropdownRef}>
                            <div
                                className="w-20 h-20 rounded-2xl border-4 flex flex-col items-center justify-center bg-white shadow-sm shrink-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer z-20 relative"
                                style={courseBoxStyle}
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <span className="text-3xl mb-0.5">{currentCourse.icon}</span>
                                <span className="font-black text-[10px] uppercase tracking-wider font-display truncate max-w-[70px]">{currentCourse.title}</span>
                                {/* Dropdown Indicator */}
                                <div className="absolute top-1 right-1 opacity-50">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </div>
                            </div>

                            {/* DROPDOWN MENU */}
                            {isDropdownOpen && (
                                <div className="absolute top-[110%] left-0 w-48 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    {(Object.values(courses) as CourseData[]).map((course) => (
                                        <div
                                            key={course.id}
                                            className={`flex items-center gap-3 p-4 cursor-pointer transition-colors hover:bg-gray-50 border-b last:border-0 border-gray-100 ${activeCourseId === course.id ? 'bg-gray-50' : ''}`}
                                            onClick={() => handleCourseChange(course.id)}
                                        >
                                            <span className="text-2xl">{course.icon}</span>
                                            <span className={`font-black text-sm uppercase font-display ${activeCourseId === course.id ? 'text-gray-900' : 'text-gray-500'}`}>
                                                {course.title}
                                            </span>
                                            {activeCourseId === course.id && (
                                                <div className="ml-auto w-2 h-2 rounded-full bg-green-500"></div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Unit Header (Left) */}
                        <div
                            className="rounded-2xl p-4 text-white flex justify-between items-center shadow-md relative overflow-hidden group shrink-0 w-full max-w-[380px] h-20 transition-colors duration-500 ease-in-out border-b-4 border-black/10"
                            style={{ backgroundColor: headerColor }}
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>

                            <div className="relative z-10">
                                <h2 className="text-[9px] font-black tracking-widest opacity-90 mb-0.5 uppercase font-display">{headerSubtitle}</h2>
                                <h1 className="text-base font-black font-display tracking-tight drop-shadow-sm truncate max-w-[200px]">{headerTitle}</h1>
                            </div>

                            <button className="bg-white/20 hover:bg-white/30 text-white font-black px-4 py-2 rounded-xl text-xs transition-colors uppercase tracking-wider flex items-center gap-1.5 border-2 border-transparent">
                                <span className="text-base">📖</span> REHBER
                            </button>
                        </div>

                        {/* Prominent Live Join Lesson Button */}
                        {isClassActive && (
                            <button
                                onClick={handleJoinLiveClass}
                                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black px-6 rounded-2xl flex items-center gap-3.5 shadow-lg shadow-emerald-100 cursor-pointer animate-bounce h-20 shrink-0 select-none border-b-4 border-emerald-700 active:border-b-0 active:translate-y-[2px] transition-all hover:scale-105"
                            >
                                <span className="flex h-3 w-3 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                </span>
                                <div className="flex flex-col text-left">
                                    <span className="text-[9px] font-black text-emerald-100 uppercase tracking-widest leading-none mb-1">Ders Başladı!</span>
                                    <span className="text-xs font-black tracking-wide leading-none">DERSE KATIL</span>
                                </div>
                            </button>
                        )}

                        {/* Instructor Widget */}
                        {currentCourse.instructor && (
                            <div className="hidden xl:flex h-20 w-56 px-4.5 bg-white border-2 border-gray-200 border-b-4 rounded-2xl items-center gap-3.5 shadow-sm shrink-0">
                                <div className="relative shrink-0">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-xl shadow-inner">
                                        {currentCourse.instructor.avatar}
                                    </div>
                                    {currentCourse.instructor.isOnline && (
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                                    )}
                                </div>

                                <div className="flex flex-col justify-center min-w-0 flex-1">
                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Eğitmen</span>
                                    <span className="text-sm font-black text-gray-800 font-display truncate leading-none mb-1.5">{currentCourse.instructor.name}</span>
                                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full w-fit leading-none ${currentCourse.instructor.isOnline ? 'text-green-600 bg-green-50 border border-green-150' : 'text-gray-400 bg-gray-50 border border-gray-100'}`}>
                                        {currentCourse.instructor.status}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* CLAN WIDGET (Restored Premium Gradient Style) */}
                        <div
                            ref={clanDropdownRef}
                            className="hidden 2xl:flex h-20 px-5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl items-center gap-4 shadow-sm shadow-indigo-200 relative group hover:scale-[1.02] transition-transform cursor-pointer border-b-4 border-indigo-700 shrink-0 select-none text-white font-sans"
                            onClick={() => setIsClanDropdownOpen(!isClanDropdownOpen)}
                        >
                            <div className="absolute top-1/2 right-6 text-white/10 transform rotate-12 scale-[2.5] pointer-events-none">
                                <Swords size={20} />
                            </div>

                            <div className="relative z-10">
                                <div className="w-10 h-10 rounded-xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-xl shadow-md backdrop-blur-sm">
                                    🚀
                                </div>
                            </div>

                            <div className="flex flex-col justify-center relative z-10 text-white min-w-[120px]">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className="font-black text-sm font-display leading-none truncate max-w-[140px]">{myClass.class_name || "Sınıf Bulunamadı"}</span>
                                </div>
                                <div className="flex items-center gap-2 text-indigo-100">
                                    <Users size={10} />
                                    <span className="text-[9px] font-bold uppercase tracking-wider">{myClass.class_name ? "Sınıfım" : "Sınıf Yok"}</span>
                                </div>
                            </div>

                            <div className="h-10 w-px bg-white/20 relative z-10"></div>

                            <div className="flex flex-col items-center justify-center relative z-10 text-white">
                                <span className="text-[8px] font-bold text-indigo-200 uppercase tracking-widest mb-0.5">ÜYE</span>
                                <span className="text-base font-black text-yellow-300 font-display leading-tight">{myClass.classmates.length}</span>
                            </div>

                            {/* SQUAD MEMBER DROPDOWN */}
                            {isClanDropdownOpen && (
                                <div className="absolute top-[110%] md:right-0 bg-white border-2 border-indigo-100 rounded-2xl shadow-xl z-[60] overflow-hidden w-64 animate-in fade-in slide-in-from-top-2 duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
                                    <div className="p-3 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                                        <span className="text-xs font-black text-indigo-800 uppercase tracking-wider">{myClass.class_name ? "Sınıf Arkadaşlarım" : "Sınıf Üyeleri"}</span>
                                        <span className="text-[10px] font-bold bg-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded">{myClass.classmates.length}</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto">
                                        {myClass.classmates.length > 0 ? (
                                            myClass.classmates.map((member) => (
                                                <div key={member.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors border-b last:border-0 border-gray-50">
                                                    <div className="relative shrink-0">
                                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatarSeed}`} alt={member.name} className="w-8 h-8 rounded-lg bg-gray-100 border border-gray-150" />
                                                        <div className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white ${member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h4 className="font-bold text-sm text-gray-800 truncate leading-tight mb-0.5">{member.name}</h4>
                                                        <span className="text-[10px] text-gray-400 font-medium uppercase">{member.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-6 text-center text-xs text-gray-400 font-bold italic">Sınıf arkadaşı bulunamadı.</div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Stats + Widgets */}
                    <div className="flex flex-col items-end relative z-50">
                        <div className="flex flex-col gap-3 w-64">
                            {/* REDESIGNED XP BAR (Dynamic values) */}
                            <div className="w-full bg-white border-2 border-gray-200 border-b-4 rounded-2xl h-20 px-4.5 flex items-center justify-between shadow-sm hover:border-amber-300 transition-colors shrink-0">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 flex items-center justify-center shadow-inner shrink-0">
                                        <Trophy size={20} />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Bronz Lig</span>
                                        <span className="text-sm font-black text-gray-800 font-display leading-none">{(userData?.xp ?? 0)} XP</span>
                                    </div>
                                </div>

                                {/* Beautiful Continuous Progress Bar */}
                                <div className="w-24 bg-gray-100 border border-gray-200/50 rounded-full h-3 overflow-hidden shadow-inner shrink-0">
                                    <div 
                                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.max(10, Math.min(100, ((userData?.xp ?? 0) % 100) || 30))}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar Widgets */}
                        <div className="absolute top-full mt-6 right-0 hidden xl:flex flex-col gap-6 w-64">
                            {/* Daily Quest Widget */}
                            <div className="bg-white rounded-3xl border-2 border-gray-200 border-b-4 p-4 shadow-sm hover:shadow-md transition-all group">
                                <div 
                                    className="flex justify-between items-center cursor-pointer select-none"
                                    onClick={() => setIsQuestsExpanded(!isQuestsExpanded)}
                                >
                                    <h3 className="text-gray-700 font-black text-sm font-display tracking-tight uppercase flex items-center gap-1.5">
                                        🎯 Günlük Görevler
                                    </h3>
                                    <div className="text-gray-400 hover:text-gray-600">
                                        {isQuestsExpanded ? <ChevronDown size={16} className="transform rotate-180 transition-transform duration-200" /> : <ChevronDown size={16} className="transition-transform duration-200" />}
                                    </div>
                                </div>
                                
                                {isQuestsExpanded && (
                                    <div className="space-y-4 mt-4 animate-in fade-in duration-200">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-lg shadow-sm shrink-0">⚡</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-black text-gray-700 text-xs truncate">10 Puan kazan</span>
                                                    <span className="font-bold text-orange-500 text-[10px]">{(userData?.xp ?? 0) % 10}/10</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                                    <div 
                                                        className="h-full bg-orange-400 rounded-full shadow-sm"
                                                        style={{ width: `${Math.min(100, (((userData?.xp ?? 0) % 10) / 10) * 100)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center text-lg shadow-sm shrink-0">🎯</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-black text-gray-700 text-xs truncate">Hatasız ders</span>
                                                    <span className="font-bold text-gray-400 text-[10px]">0/1</span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-150">
                                                    <div className="h-full bg-green-500 w-0 rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Active Homeworks Widget */}
                            {(() => {
                                if (!currentCourse || !currentCourse.nodes) return null;
                                // Find all unsubmitted homeworks in unlocked nodes
                                const activeHws = currentCourse.nodes
                                    .filter(n => !n.isLocked && n.slides)
                                    .flatMap(n => {
                                        const hs = n.slides?.find((s: any) => s.type === 'homework');
                                        if (hs && localStorage.getItem(`homework_submitted_${currentCourse.id}_${hs.id}`) !== 'true') {
                                            return [{
                                                nodeId: n.id,
                                                lessonTitle: n.title,
                                                slide: hs
                                            }];
                                        }
                                        return [];
                                    });

                                if (activeHws.length === 0) return null;

                                return (
                                    <div className="bg-white rounded-3xl border-2 border-gray-200 border-b-4 p-4 shadow-sm hover:shadow-md transition-all animate-in slide-in-from-bottom duration-300">
                                        <h3 className="text-gray-700 font-black text-sm font-display tracking-tight uppercase flex items-center gap-1.5 mb-3">
                                            📝 Aktif Ödevler ({activeHws.length})
                                        </h3>
                                        <div className="space-y-3">
                                            {activeHws.map((hw, idx) => (
                                                <div 
                                                    key={idx}
                                                    onClick={() => setActiveHomeworkSlide(hw.slide)}
                                                    className="p-3 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 hover:border-blue-300 rounded-2xl flex flex-col gap-1 cursor-pointer transition-all hover:shadow-sm"
                                                >
                                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">{hw.lessonTitle}</span>
                                                    <h5 className="font-bold text-gray-800 text-xs truncate">{hw.slide.homeworkConfig?.title || 'Ödev Görevi'}</h5>
                                                    <span className="text-[9px] font-black text-yellow-600 flex items-center gap-1 mt-1">
                                                        ★ +{hw.slide.homeworkConfig?.points || 100} XP
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>

            {/* Middle Section: Horizontal Path */}
            <div className="w-full flex-1 flex items-center justify-center relative z-20">
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
                        className="flex items-center min-w-max relative pl-10 pr-10 animate-course-change"
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
                                                        <div className="absolute top-4 right-6 text-white/30 text-2xl animate-pulse">✨</div>
                                                    </div>

                                                    {/* Tail */}
                                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-6 rotate-45 rounded-sm" style={{ backgroundColor: node.baseColor }}></div>

                                                    {/* Content */}
                                                    <div className="relative z-10 p-5 flex flex-col items-start text-left">
                                                        <h3 className="text-white font-black font-display text-xl leading-snug mb-1 drop-shadow-md pr-6">
                                                            {node.title || "Ders Başlığı"}
                                                        </h3>
                                                        <span className="text-white/90 font-bold text-xs uppercase tracking-widest mb-4">
                                                            DERS: {index + 1}/9
                                                        </span>

                                                        {node.type === 'homework' ? (
                                                            /* ── ÖDEV DÜĞÜMܤ ÖZEL BUTONLAR ── */
                                                            (() => {
                                                                const hwSlide = node.slides?.find((s: any) => s.type === 'homework');
                                                                const isHwSubmitted = hwSlide
                                                                    ? localStorage.getItem(`homework_submitted_${currentCourse.id}_${hwSlide.id}`) === 'true'
                                                                    : false;

                                                                return (
                                                                    <div className="w-full flex flex-col gap-2.5">
                                                                        {isHwSubmitted ? (
                                                                            <>
                                                                                {/* Teslim edildi badge */}
                                                                                <div className="w-full px-4 py-2.5 bg-green-500/25 border border-green-400/40 rounded-2xl flex items-center justify-center gap-2">
                                                                                    <span className="text-[11px] font-black uppercase tracking-wider text-green-100">✅ ÖDEV TESLİM EDİLDİ</span>
                                                                                </div>
                                                                                {/* Yine de girebilir */}
                                                                                <button
                                                                                    className="w-full bg-white/20 hover:bg-white/30 border border-white/30 text-white text-center py-3 rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        if (hwSlide) setActiveHomeworkSlide(hwSlide);
                                                                                    }}
                                                                                >
                                                                                    <span className="font-black text-xs uppercase tracking-wider">📂 ÖDEVE GİR</span>
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
                                                                                    📝 ÖDEVİ TESLİM ET (+{hwSlide?.homeworkConfig?.points || 100} XP)
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
                                                                    className="w-full bg-white hover:bg-gray-50 text-center py-3.5 rounded-2xl shadow-lg border-b-[4px] border-black/5 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleOpenLesson(node.id);
                                                                    }}
                                                                >
                                                                    <span className="font-black text-sm md:text-base uppercase tracking-wider" style={{ color: node.baseColor }}>BAŞLAT +10 PUAN</span>
                                                                </button>

                                                                {/* Bu düğümde ayrıca homework slide varsa alt buton */}
                                                                {(() => {
                                                                    const hwSlide = node.slides?.find((s: any) => s.type === 'homework');
                                                                    if (!hwSlide) return null;
                                                                    const isHwSubmitted = localStorage.getItem(`homework_submitted_${currentCourse.id}_${hwSlide.id}`) === 'true';
                                                                    if (isHwSubmitted) {
                                                                        return (
                                                                            <div className="w-full mt-2.5 px-4 py-2.5 bg-green-500/20 border border-green-500/30 rounded-2xl text-center flex items-center justify-center gap-2">
                                                                                <span className="text-[10px] font-black uppercase tracking-wider text-green-100">✅ ÖDEV TESLİM EDİLDİ</span>
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
                                                                                📝 ÖDEVİ TESLİM ET (+{hwSlide.homeworkConfig?.points || 100} XP)
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
                                            <div className="w-28 h-20 -mx-4 relative z-0 flex items-center justify-center">
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


            {/* LESSON SLIDE OVERLAY */}
            <LessonSlide
                isOpen={showLessonSlide}
                lessonTitle={currentCourse.nodes.find(n => String(n.id) === String(lessonLevel))?.title}
                slides={(currentCourse.nodes.find(n => String(n.id) === String(lessonLevel))?.slides || []).filter((s: any) => s.type !== 'homework')}
                onClose={handleCloseLesson}
                onComplete={handleLessonComplete}
                courseId={currentCourse.id}
                lessonIndex={currentCourse.nodes.find(n => String(n.id) === String(lessonLevel))?.lessonNumber}
                userData={userData}
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

            {/* HOMEWORK OVERLAY */}
            {activeHomeworkSlide && (
                <StudentHomeworkView
                    slide={activeHomeworkSlide}
                    courseId={currentCourse.id}
                    onClose={() => setActiveHomeworkSlide(null)}
                    onComplete={() => {
                        setActiveHomeworkSlide(null);
                        refreshUserData();
                    }}
                />
            )}

        </div>
    );
};

export default HomePage;
