import React from 'react';
import GrassIcon from "../../assets/sprites/grass.png";
import ButtonCyan from "../../assets/sprites/ButtonCyan.png";
import ButtonPurple from "../../assets/sprites/ButtonPurple.png";
import ButtonYellow from "../../assets/sprites/ButtonYellow.png";
import ButtonGreen from "../../assets/sprites/ButtonGreen.png";
import BrainIcon from "../../assets/sprites/Brain.png";
import PencilIcon from "../../assets/sprites/Pencil.png";
import PuzzleIcon from "../../assets/sprites/Puzzle.png";
import TrophyIcon from "../../assets/sprites/Trophy.png";
import ButtonDarkBlue from "../../assets/sprites/ButtonDarkBlue.png";
import ButtonDarkPurple from "../../assets/sprites/ButtonDarkPurple.png";
import QuestionIcon from "../../assets/sprites/Question.png";
import BagIcon from "../../assets/sprites/Bag.png";

interface LiveLessonTeacherProps {
    activeLaunchCourseId: string | number | null;
    activeLessonIndex: number | null;
    activeLessonTitle: string;
    coursesData: any[];
    sessionStudents: Record<string, any>;
    showLessonSlide: boolean;
    sendMessage: (msg: any) => void;
    setActiveLessonIndexState: (idx: number) => void;
    setActiveLessonTitle: (title: string) => void;
    setShowLessonSlide: (val: boolean) => void;
    onStopSession: () => Promise<void>;
}

const LiveLessonTeacher: React.FC<LiveLessonTeacherProps> = ({
    activeLaunchCourseId,
    activeLessonIndex,
    activeLessonTitle,
    coursesData,
    sessionStudents,
    showLessonSlide,
    sendMessage,
    setActiveLessonIndexState,
    setActiveLessonTitle,
    setShowLessonSlide,
    onStopSession
}) => {
    const activeCourse = coursesData.find(c => String(c.id) === String(activeLaunchCourseId));
    
    // Generate nodes exactly identical to the student roadmap
    const activeBubbles = (() => {
        if (!activeCourse) return [];
        const curriculum = activeCourse.curriculum || [];
        const dynamicNodes: any[] = [];
        const actualSections = curriculum.filter((item: any) => item.type !== 'live_sessions_config');

        actualSections.forEach((section: any, index: number) => {
            const sectionTitle = section.title || `Ders ${index + 1}`;
            const sectionId = section.id || `section_${index + 1}`;
            const matchingNote = activeCourse.notes?.find((n: any) => String(n.id) === String(section.id));
            const slides = matchingNote?.slides || [];
            
            const theme = section.theme;
            const themes: { [key: string]: any } = {
                purple: { button: ButtonPurple, icon: BrainIcon, ringColor: "border-fuchsia-400 bg-white", baseColor: "#d946ef", strokeColor: "#c026d3", pastelColor: "#fae8ff", glowColor: "rgba(232, 121, 249, 0.4)", iconSize: "w-20 h-20", iconOffset: "-mt-22" },
                cyan: { button: ButtonCyan, icon: PencilIcon, ringColor: "border-cyan-400 bg-white", baseColor: "#06b6d4", strokeColor: "#0891b2", pastelColor: "#cffafe", glowColor: "rgba(34, 211, 238, 0.4)", iconSize: "w-24 h-24", iconOffset: "-mt-20" },
                green: { button: ButtonGreen, icon: PuzzleIcon, ringColor: "border-green-400 bg-white", baseColor: "#22c55e", strokeColor: "#16a34a", pastelColor: "#dcfce7", glowColor: "rgba(74, 222, 128, 0.4)", iconSize: "w-20 h-20", iconOffset: "-mt-20" },
                yellow: { button: ButtonYellow, icon: TrophyIcon, ringColor: "border-yellow-400 bg-white", baseColor: "#eab308", strokeColor: "#ca8a04", pastelColor: "#fef9c3", glowColor: "rgba(250, 204, 21, 0.4)", iconSize: "w-24 h-24", iconOffset: "-mt-20" },
                quiz: { button: ButtonDarkPurple, icon: QuestionIcon, ringColor: "border-purple-400 bg-white", baseColor: "#7c3aed", strokeColor: "#6d28d9", pastelColor: "#ede9fe", glowColor: "rgba(139, 92, 246, 0.4)", iconSize: "w-26 h-26", iconOffset: "-mt-24" },
                homework: { button: ButtonDarkBlue, icon: BagIcon, ringColor: "border-indigo-400 bg-white", baseColor: "#2563eb", strokeColor: "#1d4ed8", pastelColor: "#e0e7ff", glowColor: "rgba(99, 102, 241, 0.4)", iconSize: "w-26 h-26", iconOffset: "-mt-24" },
            };

            const pattern = ["purple", "cyan", "green", "yellow"];
            const defaultTheme = pattern[index % pattern.length];
            const selectedTheme = theme && themes[theme] ? themes[theme] : themes[defaultTheme];
            
            dynamicNodes.push({
                id: index + 1,
                type: theme === 'quiz' ? 'quiz' : (theme === 'homework' ? 'homework' : 'step'),
                button: selectedTheme.button,
                icon: selectedTheme.icon,
                curve: index % 2 === 0 ? 'up' : 'down',
                iconSize: selectedTheme.iconSize,
                iconOffset: selectedTheme.iconOffset,
                ringColor: selectedTheme.ringColor,
                pastelColor: selectedTheme.pastelColor,
                glowColor: selectedTheme.glowColor,
                strokeColor: selectedTheme.strokeColor,
                baseColor: selectedTheme.baseColor,
                title: sectionTitle,
                stars: 0,
                isLocked: false,
                lessonNumber: section.lessonNumber,
                lessonTopic: section.lessonTopic,
                sectionId: sectionId,
                slides: slides
            });
        });
        return dynamicNodes;
    })();

    return (
        <div className="fixed inset-0 bg-white z-[140] flex flex-col items-center justify-start select-text overflow-hidden">
            <style>{`
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                @keyframes shadowPulse {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(0.85); opacity: 0.3; }
                }
                .animate-shadow-pulse {
                    animation: shadowPulse 3s ease-in-out infinite;
                }
            `}</style>

            {/* Top Floating Control Bar */}
            <div className="w-full max-w-7xl mx-auto px-8 pt-6 pb-2 flex justify-between items-center z-[150] shrink-0 select-none">
                <div className="bg-white px-5 py-3 rounded-2xl border-2 border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-display">
                            CANLI DERS AKTİF (ÖĞRETMEN)
                        </span>
                    </div>
                    <h2 className="text-sm font-black text-gray-800 font-display mt-0.5">{activeLessonTitle || "Canlı Ders"}</h2>
                    <p className="text-[10px] text-gray-400 font-bold">
                        Kurs: {activeCourse?.title}
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    {/* Roster Summary Badge */}
                    <div className="bg-white px-5 py-3.5 rounded-2xl border-2 border-gray-100 shadow-sm flex items-center gap-3">
                        <span className="text-xl">👥</span>
                        <div className="flex flex-col">
                            <span className="text-[9px] text-gray-400 font-black uppercase font-display">Aktif Sınıf</span>
                            <span className="text-xs font-black text-gray-700">
                                Öğrenci: {Object.keys(sessionStudents).length}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onStopSession}
                        className="px-6 py-3.5 bg-rose-500 hover:bg-rose-600 border-b-[4px] border-rose-700 active:border-b-0 active:translate-y-[4px] text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer select-none uppercase tracking-wider font-display"
                    >
                        Dersi Sonlandır
                    </button>
                </div>
            </div>

            {/* Full Screen Scrollable Node Road Path (Identical to Student Home Page layout) */}
            <div className="flex-1 w-full overflow-x-auto overflow-y-hidden flex items-center justify-start px-12 md:px-24 no-scrollbar pb-32 relative z-10">
                <div className="flex items-center min-w-max relative pl-10 pr-10 py-10">
                    {activeBubbles.map((node: any, index: number) => {
                        // Compute first slide index for this bubble
                        let firstSlideIndex = 0;
                        let slideAccumulator = 0;
                        for (const sibling of activeBubbles) {
                            if (sibling.id === node.id) {
                                firstSlideIndex = slideAccumulator;
                                break;
                            }
                            slideAccumulator += (sibling.slides || []).length;
                        }

                        const isBubbleActive = showLessonSlide && activeLessonTitle === node.title;
                        const totalConnected = Object.keys(sessionStudents).length;
                        const readyOnThisBubble = Object.values(sessionStudents).filter(
                            s => s.isReady && s.currentSlide >= firstSlideIndex && s.currentSlide < firstSlideIndex + (node.slides || []).length
                        ).length;

                        const handleNodeClick = () => {
                            setActiveLessonIndexState(firstSlideIndex);
                            setActiveLessonTitle(node.title);
                            setShowLessonSlide(true);

                            // Broadcast level change via WebSocket
                            sendMessage({
                                type: "level_changed",
                                courseId: activeLaunchCourseId,
                                nodeId: node.id,
                                isOpen: true
                            });
                        };

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

                                {/* Node Button Sprite Layout */}
                                <div 
                                    onClick={handleNodeClick}
                                    className={`relative z-10 group cursor-pointer transform hover:scale-105 transition-transform duration-200 ${node.curve === 'up' ? 'mt-32' : '-mt-12'}`}
                                >
                                    <div className="relative w-36 h-28 flex items-center justify-center">
                                        {/* Stars Rendering */}
                                        {node.stars !== undefined && (
                                            <div className="absolute top-35 left-1/2 -translate-x-1/2 flex gap-1 z-30 items-start">
                                                {[0, 1, 2].map((i) => (
                                                    <svg
                                                        key={i}
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        className={`w-8 h-8 drop-shadow-md transition-transform text-gray-300`}
                                                    >
                                                        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                                    </svg>
                                                ))}
                                            </div>
                                        )}

                                        {/* Hover Ring Effect */}
                                        <div className={`absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-16 border-8 rounded-[100%] opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none z-0 ${node.ringColor}`}></div>

                                        {/* Button Sprite */}
                                        <img src={node.button} alt="Button" className="w-36 relative z-10" />
                                        
                                        {/* Ground Shadow */}
                                        <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
                                            <div
                                                className="w-14 h-4 bg-gray-300 rounded-[100%] animate-shadow-pulse -mt-10"
                                                style={{ animationDelay: `${index * 0.5 * -1}s` }}
                                            ></div>
                                        </div>

                                        {/* Icon Container */}
                                        <div className={`absolute inset-0 flex items-center justify-center z-20 ${node.iconOffset || ''}`}>
                                            <div
                                                className="absolute w-32 h-32 rounded-full blur-3xl opacity-80 animate-pulse"
                                                style={{
                                                    backgroundColor: node.pastelColor,
                                                    animationDelay: `${index * 0.5 * -1}s`
                                                }}
                                            ></div>
                                            <img
                                                src={node.icon}
                                                alt={node.title}
                                                className="w-20 animate-float relative z-10"
                                                style={{
                                                    filter: `drop-shadow(0 0 5px ${node.pastelColor})`,
                                                    animationDelay: `${index * 0.5 * -1}s`
                                                }}
                                            />
                                            
                                            {isBubbleActive && (
                                                <div className="absolute -inset-1 border-4 border-emerald-400 rounded-full animate-ping z-30" />
                                            )}

                                            {/* Bubble Title */}
                                            <div
                                                className="absolute -bottom-14 flex flex-col items-center justify-center animate-float z-20"
                                                style={{ animationDelay: `${index * 0.5 * -1}s` }}
                                            >
                                                <span
                                                    className="text-lg font-black tracking-wider select-none text-center"
                                                    style={{
                                                        fontFamily: "'Fredoka', sans-serif",
                                                        color: 'white',
                                                        WebkitTextStroke: `1.5px ${node.strokeColor}`,
                                                        paintOrder: 'stroke fill',
                                                        filter: `drop-shadow(0 0 4px ${node.pastelColor})`,
                                                        textShadow: `2px 2px 0px ${node.strokeColor}`
                                                    }}
                                                >
                                                    {node.title?.toUpperCase()}
                                                </span>
                                                <span className="block text-[8px] text-gray-550 font-extrabold bg-white border border-gray-200/50 rounded-full px-2 py-0.5 mt-1.5 shadow-sm">
                                                    Hazır: {readyOnThisBubble} / {totalConnected || 0}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Connector SVG */}
                                {index < activeBubbles.length - 1 && (
                                    <div className="w-28 h-20 -mx-4 relative z-0 flex items-center justify-center shrink-0">
                                        <svg className="w-full h-full overflow-visible" viewBox="0 0 120 100" fill="none">
                                            <path
                                                d={
                                                    activeBubbles[index + 1]?.lessonTopic
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
                                        {/* Decorative Grass sprites inside path */}
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
                    })}
                </div>
            </div>
        </div>
    );
};

export default LiveLessonTeacher;
