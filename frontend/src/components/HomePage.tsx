import React, { useState, useEffect } from 'react';


import TextBubble from '../assets/sprites/TextBubble.png';
import GrassIcon from '../assets/sprites/grass.png';


import GameOverlay from './GameOverlay';
import LessonSlide from './LessonSlide';
import type { CourseData, PathNode } from '../types';

interface HomePageProps {
    currentCourse: CourseData;
    activeCourseId: string;
    courses: Record<string, CourseData>;
    onCourseChange: (id: string) => void;
    setCourses: React.Dispatch<React.SetStateAction<Record<string, CourseData>>>;
}

const HomePage: React.FC<HomePageProps> = ({
    currentCourse,
    activeCourseId,
    courses,
    onCourseChange,
    setCourses
}) => {
    const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

    const handleLessonComplete = () => {
        setShowLessonSlide(false);
        if (lessonLevel !== null) {
            handleStartGame(lessonLevel);
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
                return node;
            });

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

    // Calculate dynamic styles for the Course Box to match the header
    const courseBoxStyle = {
        borderColor: currentCourse.themeColor,
        color: currentCourse.themeColor
    };

    return (
        <div className="absolute inset-0 bg-white flex flex-col items-center relative overflow-hidden">

            {/* Header Row: Course info + Unit Header + Stats + XP Bar */}
            <div className="w-full px-6 md:px-12 pt-6 flex justify-between items-start z-30 relative">
                {/* Left Side Container: Course Box + Unit Header + Instructor Widget */}
                <div className="flex items-center gap-4">
                    {/* Course Info Box (Dropdown Enabled) */}
                    <div className="relative">
                        <div
                            className="w-28 h-28 rounded-2xl border-4 flex flex-col items-center justify-center bg-white shadow-sm shrink-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer z-20 relative"
                            style={courseBoxStyle}
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className="text-4xl mb-1">{currentCourse.icon}</span>
                            <span className="font-black text-sm uppercase tracking-wider font-display">{currentCourse.title}</span>
                            {/* Dropdown Indicator */}
                            <div className="absolute top-2 right-2 opacity-50">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M6 9l6 6 6-6" />
                                </svg>
                            </div>
                        </div>

                        {/* DROPDOWN MENU */}
                        {isDropdownOpen && (
                            <div className="absolute top-[110%] left-0 w-48 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {Object.values(courses).map((course) => (
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
                        className="rounded-2xl p-4 md:p-6 text-white flex justify-between items-center shadow-md relative overflow-hidden group shrink-0 w-[450px] h-28 transition-colors duration-500 ease-in-out border-b-4 border-black/10"
                        style={{ backgroundColor: headerColor }}
                    >
                        {/* Status Bar Top Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>

                        <div className="relative z-10">
                            <h2 className="text-sm font-black tracking-widest opacity-90 mb-1 uppercase font-display">{headerSubtitle}</h2>
                            <h1 className="text-2xl md:text-3xl font-black font-display tracking-tight drop-shadow-sm">{headerTitle}</h1>
                        </div>

                        <button className="bg-white/20 hover:bg-white/30 text-white font-black px-5 py-3 rounded-xl text-sm transition-colors uppercase tracking-wider flex items-center gap-2 border-2 border-transparent">
                            <span className="text-xl">📖</span> REHBER
                        </button>
                    </div>

                    {/* Instructor Widget */}
                    <div className="hidden xl:flex h-28 px-8 bg-white border-2 border-gray-200 border-b-4 rounded-2xl items-center gap-5 shadow-sm ml-2">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-3xl">
                                {currentCourse.instructor.avatar}
                            </div>
                            {/* Online Status Dot */}
                            {currentCourse.instructor.isOnline && (
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Eğitmen</span>
                            <span className="text-lg font-black text-gray-800 font-display leading-none mb-1">{currentCourse.instructor.name}</span>
                            <span className={`text-xs font-bold flex items-center gap-1 px-2 py-0.5 rounded-full w-fit ${currentCourse.instructor.isOnline ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-100'}`}>
                                {currentCourse.instructor.isOnline && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>}
                                {currentCourse.instructor.status}
                            </span>
                        </div>

                        {/* Chat Action */}
                        <button className="w-10 h-10 ml-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-sky-500 flex items-center justify-center transition-colors border-2 border-transparent hover:border-gray-200">
                            <span className="text-xl">💬</span>
                        </button>
                    </div>
                </div>

                {/* Right Column: Stats + Widgets */}
                <div className="flex flex-col items-end relative z-50">
                    {/* User Stats Row */}
                    <div className="flex flex-col gap-3 w-80">

                        {/* REDESIGNED XP BAR */}
                        <div className="w-full bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-2 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-yellow-200 transition-colors">
                            {/* Background Progress Tint */}
                            <div className="absolute left-0 top-0 bottom-0 bg-yellow-50 w-[40%] z-0"></div>

                            <div className="flex items-center gap-3 relative z-10">
                                {/* Rank Icon / Badge */}
                                <div
                                    className="w-9 h-9 rounded-full bg-yellow-400 border-2 border-yellow-500 flex items-center justify-center shadow-[0_2px_0_#ca8a04] group-hover:scale-110 transition-transform"
                                    style={{ backgroundColor: currentCourse.themeColor === '#3b82f6' ? '#60a5fa' : '#facc15', borderColor: currentCourse.themeColor === '#3b82f6' ? '#3b82f6' : '#eab308', boxShadow: `0 2px 0 ${currentCourse.themeColor === '#3b82f6' ? '#2563eb' : '#ca8a04'}` }}
                                >
                                    <span className="text-sm font-black text-white">III</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">{currentCourse.stats.league}</span>
                                    <span className="text-sm font-black text-gray-700 font-display">{currentCourse.stats.xp}</span>
                                </div>
                            </div>

                            {/* Segmented Bar */}
                            <div className="flex gap-1 relative z-10">
                                <div className={`w-2 h-6 rounded-sm ${currentCourse.id === 'Matematik' ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
                                <div className={`w-2 h-6 rounded-sm ${currentCourse.id === 'Matematik' ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
                                <div className={`w-2 h-6 rounded-sm ${currentCourse.id === 'Matematik' ? 'bg-blue-400' : 'bg-yellow-400'}`}></div>
                                <div className="w-2 h-6 rounded-sm bg-gray-200"></div>
                                <div className="w-2 h-6 rounded-sm bg-gray-200"></div>
                            </div>
                        </div>


                    </div>

                    {/* Right Sidebar Widgets */}
                    <div className="absolute top-full mt-6 right-0 hidden xl:flex flex-col gap-6 w-80">
                        {/* Daily Quest Widget */}
                        <div className="bg-white rounded-3xl border-2 border-gray-200 border-b-4 p-5 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-center mb-5">
                                <h3 className="text-gray-700 font-black text-lg font-display tracking-tight">Günlük Görevler</h3>
                                <a href="#" className="font-bold text-xs text-green-500 hover:text-green-600 transition-colors uppercase tracking-wider bg-green-50 px-3 py-1 rounded-lg">TÜMÜ</a>
                            </div>
                            <div className="space-y-5">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-100 border-2 border-orange-200 flex items-center justify-center text-2xl shadow-sm shrink-0">⚡</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-gray-700 text-sm font-display">10 Puan kazan</span>
                                            <span className="font-bold text-orange-500 text-xs">3/10</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                            <div className="h-full bg-orange-400 w-[30%] rounded-full shadow-sm"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-green-100 border-2 border-green-200 flex items-center justify-center text-2xl shadow-sm shrink-0">🎯</div>
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-gray-700 text-sm font-display">Hatasız ders</span>
                                            <span className="font-bold text-gray-400 text-xs">0/1</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-100">
                                            <div className="h-full bg-green-500 w-0 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                <div className="w-full overflow-x-auto flex items-center px-24 no-scrollbar pt-64 pb-40 select-none">
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
                                        {/* Node Container */}
                                        <div
                                            className={`relative z-10 group cursor-pointer transform hover:scale-105 transition-transform duration-200 ${node.curve === 'up' ? 'mt-32' : '-mt-12'} ${node.isLocked ? 'grayscale opacity-75 pointer-events-none' : ''}`}
                                            onClick={() => !node.isLocked && handleNodeClick(node)}
                                        >
                                            {/* Stars Rendering */}
                                            {node.stars !== undefined && (
                                                <div className="absolute -top-24 left-1/2 -translate-x-1/2 flex gap-1 z-30 items-end">
                                                    {[0, 1, 2].map((i) => (
                                                        <svg
                                                            key={i}
                                                            xmlns="http://www.w3.org/2000/svg"
                                                            viewBox="0 0 24 24"
                                                            fill="currentColor"
                                                            className={`w-8 h-8 drop-shadow-md transition-transform
                                                                ${i < (node.stars || 0) ? 'text-yellow-400' : 'text-gray-300'}
                                                                ${i === 0 ? '-rotate-12 translate-y-1' : ''}
                                                                ${i === 1 ? '-translate-y-2 scale-110' : ''}
                                                                ${i === 2 ? 'rotate-12 translate-y-1' : ''}
                                                            `}
                                                        >
                                                            <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                                        </svg>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Text Bubble */}
                                            <div
                                                className={`absolute bottom-full left-1/2 -translate-x-1/2 z-[60] w-64 origin-bottom transition-all duration-300 ease-out ${activeNodeId === node.id && !node.isLocked
                                                    ? 'opacity-100 scale-100 scale-y-90 translate-y-[-20px] mb-12'
                                                    : 'opacity-0 scale-50 translate-y-4 mb-16 pointer-events-none'
                                                    }`}
                                            >
                                                <div className="relative flex items-center justify-center">
                                                    <img src={TextBubble} alt="Bubble" className="w-full drop-shadow-lg" />
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[75%] flex items-center gap-3">
                                                        {/* 3D Play Button */}
                                                        <div
                                                            className="relative w-12 h-12 group/btn cursor-pointer transition-transform active:scale-95"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenLesson(node.id);
                                                            }}
                                                        >
                                                            <div className="absolute inset-x-0 bottom-0 h-12 rounded-full" style={{ backgroundColor: node.strokeColor, filter: 'brightness(0.6)' }}></div>
                                                            <div className="absolute inset-x-0 bottom-2 h-12 rounded-full flex items-center justify-center transition-all group-active/btn:bottom-0" style={{ backgroundColor: node.strokeColor }}>
                                                                <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current ml-1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M8 5v14l11-7z" />
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        <span
                                                            className="text-gray-500 font-black font-display text-xl whitespace-nowrap cursor-pointer hover:text-gray-700 transition-colors"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenLesson(node.id);
                                                            }}
                                                        >
                                                            Teste Başla !
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Hover Ring Effect */}
                                            <div className={`absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-16 border-8 rounded-[100%] opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none z-0 ${node.ringColor} ${node.isLocked ? 'hidden' : ''}`}></div>

                                            {/* Button Sprite */}
                                            <img src={node.button} alt="Button" className="w-40 relative z-10" />

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
                                                            className="absolute -bottom-14 flex flex-col items-center justify-center animate-float z-20"
                                                            style={{ animationDelay: `${index * 0.5 * -1}s` }}
                                                        >
                                                            <span
                                                                className="text-2xl font-black tracking-wider select-none"
                                                                style={{
                                                                    fontFamily: "'Fredoka', sans-serif",
                                                                    color: 'white',
                                                                    WebkitTextStroke: `1.5px ${node.strokeColor}`,
                                                                    paintOrder: 'stroke fill',
                                                                    filter: `drop-shadow(0 0 4px ${node.pastelColor})`,
                                                                    textShadow: `2px 2px 0px ${node.strokeColor}`
                                                                }}
                                                            >
                                                                LEVEL {levelCounter}
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : null}
                                            </div>
                                        </div>

                                        {/* Connector (or Divider) */}
                                        {index < currentNodes.length - 1 && (
                                            <>
                                                {/* LESSON TRANSITION CHECK */}
                                                {(node.lessonNumber && currentNodes[index + 1]?.lessonNumber !== node.lessonNumber && currentNodes[index + 1]?.lessonTopic) ? (
                                                    // PREMIUM LESSON DIVIDER (Vertical Style)
                                                    <div className="w-64 h-64 -mx-4 relative z-0 flex items-center justify-center">
                                                        {/* Vertical Dashed Line */}
                                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] bg-gray-300 border-l-2 border-dashed border-gray-300 h-96 -z-10 opacity-50" />

                                                        {/* Main Divider Body */}
                                                        <div className="relative w-full flex flex-col items-center">
                                                            {/* Topic Badge */}
                                                            <div className="bg-white px-8 py-3 rounded-2xl shadow-none border-2 border-gray-100 flex flex-col items-center transform hover:scale-105 transition-transform cursor-pointer z-10">
                                                                <span className="text-[10px] font-bold text-gray-400 tracking-[0.2em] uppercase mb-1">DERS {currentNodes[index + 1].lessonNumber}</span>
                                                                <span className="text-lg font-black font-display tracking-tight text-gray-800">{currentNodes[index + 1].lessonTopic}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    // STANDARD CONNECTOR
                                                    <div className="w-32 h-24 -mx-6 relative z-0 flex items-center justify-center">
                                                        <svg className="w-full h-full overflow-visible" viewBox="0 0 120 100" fill="none">
                                                            <path
                                                                d={node.curve === 'down' ? "M0 45 Q 60 110 120 65" : "M0 65 Q 60 0 120 45"}
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
                                            </>
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
                lessonTitle={currentCourse.nodes.find(n => n.id === lessonLevel)?.title}
                onClose={handleCloseLesson}
                onComplete={handleLessonComplete}
            />

            {/* GAME PAGE OVERLAY */}
            <GameOverlay
                isOpen={showGameOverlay}
                level={gameLevel}
                lessonTitle={currentCourse.nodes.find(n => n.id === gameLevel)?.title}
                onClose={handleCloseGame}
                onComplete={handleGameComplete}
            />

        </div>
    );
};

export default HomePage;
