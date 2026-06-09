import React, { useState, useEffect, useRef } from 'react';



import GrassIcon from '../../assets/sprites/grass.png';

import GameOverlay from './GameOverlay';
import LessonSlide from './LessonSlide';
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
}

const HomePage: React.FC<HomePageProps> = ({
    currentCourse,
    activeCourseId,
    courses,
    onCourseChange,
    setCourses,
    userData,
    isUserDataLoading,
    refreshUserData
}) => {
    const [activeNodeId, setActiveNodeId] = useState<number | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    // Refs for outside click detection
    const courseDropdownRef = useRef<HTMLDivElement>(null);
    const nodesContainerRef = useRef<HTMLDivElement>(null);

    // Outside click listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Course Dropdown
            if (courseDropdownRef.current && !courseDropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
            // Level Bubble (Active Node)
            // If click is not inside the nodes container, clear active node
            if (nodesContainerRef.current && !nodesContainerRef.current.contains(event.target as Node)) {
                setActiveNodeId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                // If it's the current node, update stars
                if (node.id === gameLevel) {
                    return { ...node, stars: stars };
                }
                // Unlock the NEXT node
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
                    Maceraya başlamak için Market'ten harika kurslarımızı keşfedebilir ve ilk adımını atabilirsin.
                </p>
                <button 
                    onClick={() => (window as any).setActivePage ? (window as any).setActivePage('Kurslar') : window.location.reload()}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-12 py-5 rounded-2xl shadow-xl shadow-indigo-200 transition-all hover:-translate-y-1 active:translate-y-0 text-xl font-display uppercase tracking-widest"
                >
                    Kursları Keşfet
                </button>
            </div>
        );
    }

    // Calculate dynamic styles for the Course Box to match the header
    const courseBoxStyle = {
        borderColor: currentCourse.themeColor,
        color: currentCourse.themeColor
    };

    return (
        <div className="absolute inset-0 bg-white flex flex-col items-center relative overflow-hidden">

            {/* Top Center: Course Selector */}
            <div className="w-full px-4 pt-6 flex justify-center z-30 relative">
                <div className="relative" ref={courseDropdownRef}>
                    <div
                        className="w-auto min-w-[240px] max-w-[400px] h-16 px-6 rounded-2xl border-4 flex items-center justify-center gap-4 bg-white shadow-sm shrink-0 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer z-20 relative"
                        style={courseBoxStyle}
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                        <span className="text-3xl flex-shrink-0">{currentCourse.icon}</span>
                        <span className="font-black text-sm md:text-base uppercase tracking-wider font-display truncate w-full text-left" title={currentCourse.title}>
                            {currentCourse.title}
                        </span>
                        {/* Dropdown Indicator */}
                        <div className="opacity-50 ml-2 flex-shrink-0">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M6 9l6 6 6-6" />
                            </svg>
                        </div>
                    </div>

                    {/* DROPDOWN MENU */}
                    {isDropdownOpen && (
                        <div className="absolute top-[110%] left-0 w-full min-w-[240px] bg-white border-4 border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {Object.values(courses).map((course) => (
                                <div
                                    key={course.id}
                                    className={`flex items-center gap-4 px-6 py-4 cursor-pointer transition-colors hover:bg-gray-50 border-b-2 last:border-0 border-gray-100 ${activeCourseId === course.id ? 'bg-indigo-50/50' : ''}`}
                                    onClick={() => handleCourseChange(course.id)}
                                >
                                    <span className="text-2xl flex-shrink-0 grayscale-[0.2] group-hover:grayscale-0 transition-all">{course.icon}</span>
                                    <span className={`font-black text-sm uppercase font-display truncate flex-1 ${activeCourseId === course.id ? 'text-indigo-900' : 'text-gray-500'}`} title={course.title}>
                                        {course.title}
                                    </span>
                                    {activeCourseId === course.id && (
                                        <div className="ml-auto w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
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
                                        {index === 0 && node.lessonTopic && (
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

                                                        <button
                                                            className="w-full bg-white hover:bg-gray-50 text-center py-3.5 rounded-2xl shadow-lg border-b-[4px] border-black/5 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleOpenLesson(node.id);
                                                            }}
                                                        >
                                                            <span className="font-black text-sm md:text-base uppercase tracking-wider" style={{ color: node.baseColor }}>BAŞLAT +10 PUAN</span>
                                                        </button>
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
                                                    <div className="w-28 h-20 -mx-4 relative z-0 flex items-center justify-center">
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
                courseId={currentCourse.id}
                sectionId={currentCourse.nodes.find(n => n.id === gameLevel)?.sectionId}
                localNodeIndex={currentCourse.nodes.find(n => n.id === gameLevel)?.localNodeIndex}
                onClose={handleCloseGame}
                onComplete={handleGameComplete}
                onStatsUpdate={refreshUserData}
            />

        </div>
    );
};

export default HomePage;
