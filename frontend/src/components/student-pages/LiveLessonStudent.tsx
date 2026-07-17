import React from 'react';
import GrassIcon from "../../assets/sprites/grass.png";
import ButtonCyan from "../../assets/sprites/ButtonCyan.png";
import ButtonPurple from "../../assets/sprites/ButtonPurple.png";
import ButtonYellow from "../../assets/sprites/ButtonYellow.png";
import ButtonGreen from "../../assets/sprites/ButtonGreen.png";
import BrainIcon from "../../assets/sprites/Brain.png";
import PuzzleIcon from "../../assets/sprites/Puzzle.png";
import TrophyIcon from "../../assets/sprites/Trophy.png";
import ButtonDarkBlue from "../../assets/sprites/ButtonDarkBlue.png";
import QuestionIcon from "../../assets/sprites/Question.png";
import BagIcon from "../../assets/sprites/Bag.png";
import LessonSlide from './LessonSlide';

interface LiveLessonStudentProps {
    currentCourse: any;
    activeCourseId: string;
    lastActiveSessionTitle: string | null;
    isLiveSessionJoined: boolean;
    setIsLiveSessionJoined: (val: boolean) => void;
    activeNodeId: number | null;
    handleNodeClick: (node: any) => void;
    handleOpenLesson: (nodeId: number) => void;
    showLessonSlide: boolean;
    lessonLevel: number | string | null;
    handleCloseLesson: () => void;
    handleLessonComplete: () => void;
    userData: any;
}

const LiveLessonStudent: React.FC<LiveLessonStudentProps> = ({
    currentCourse,
    activeCourseId,
    lastActiveSessionTitle,
    isLiveSessionJoined,
    setIsLiveSessionJoined,
    activeNodeId,
    handleNodeClick,
    handleOpenLesson,
    showLessonSlide,
    lessonLevel,
    handleCloseLesson,
    handleLessonComplete,
    userData
}) => {
    const activeLiveLessonIndex = (() => {
        if (lastActiveSessionTitle && lastActiveSessionTitle.startsWith("gomufi_session:")) {
            const parts = lastActiveSessionTitle.split(":");
            const idx = parseInt(parts[1]);
            if (!isNaN(idx)) return idx;
        }
        return 1;
    })();

    const currentNodes = currentCourse?.nodes || [];

    return (
        <div className="absolute inset-0 bg-white flex flex-col items-center relative overflow-hidden">
            {/* Floating Live Lesson Header Row for Student */}
            <div className="w-full px-6 md:px-12 pt-6 flex justify-between items-center z-30 relative select-none">
                <div className="bg-white px-5 py-3 rounded-2xl border-2 border-gray-100 shadow-sm flex flex-col">
                    <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest font-display">
                            CANLI DERSTESİNİZ (HOCA TAKİBİNDE)
                        </span>
                    </div>
                    <h2 className="text-sm font-black text-gray-800 font-display mt-0.5">
                        {lastActiveSessionTitle && lastActiveSessionTitle.startsWith("gomufi_session:") 
                            ? "Canlı Ders Yol Haritası" 
                            : lastActiveSessionTitle || "Aktif Canlı Sınıf"}
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold">
                        Kurs: {currentCourse?.title}
                    </p>
                </div>

                <button
                    onClick={() => setIsLiveSessionJoined(false)}
                    className="px-6 py-3.5 bg-rose-500 hover:bg-rose-600 border-b-[4px] border-rose-700 active:border-b-0 active:translate-y-[4px] text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer uppercase tracking-wider font-display animate-pulse"
                >
                    Dersten Ayrıl
                </button>
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
                <div className="w-full overflow-x-auto flex items-center px-12 md:px-24 no-scrollbar pt-48 pb-32 select-none">
                    <div
                        key={activeCourseId}
                        className="flex items-center min-w-max relative pl-10 pr-10 animate-course-change"
                    >
                        {currentNodes.map((node: any, index: number) => {
                            const levelCounter = index + 1;
                            const isLocked = false; // Always unlocked during live lesson

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
                                        className={`relative z-10 group cursor-pointer transform hover:scale-105 transition-transform duration-200 ${node.curve === 'up' ? 'mt-32' : '-mt-12'} ${isLocked ? 'grayscale opacity-75 pointer-events-none' : ''}`}
                                        onClick={() => !isLocked && handleNodeClick(node)}
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
                                            className={`absolute bottom-full left-1/2 -translate-x-1/2 z-[60] origin-bottom transition-all duration-300 ease-out ${activeNodeId === node.id && !isLocked
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
                                        <div className={`absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-16 border-8 rounded-[100%] opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none z-0 ${node.ringColor} ${isLocked ? 'hidden' : ''}`}></div>

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
                        })}
                    </div>
            </div>

            {/* LESSON SLIDE OVERLAY */}
            <LessonSlide
                isOpen={showLessonSlide}
                lessonTitle={currentCourse?.nodes?.find((n: any) => String(n.id) === String(lessonLevel))?.title}
                slides={(() => {
                    const activeNode = currentCourse?.nodes?.find((n: any) => String(n.id) === String(lessonLevel));
                    if (activeNode?.type === 'homework' || activeNode?.type === 'HOMEWORK') {
                        const hwSlide = activeNode.slides?.find((s: any) => s.type === 'homework' || s.type === 'HOMEWORK');
                        if (hwSlide) return [{ ...hwSlide, id: activeNode.id }];
                        return [{
                            id: activeNode.id,
                            type: 'homework',
                            homeworkConfig: {
                                title: activeNode.title || 'Yeni Ödev Görevi',
                                instructions: activeNode.lessonTopic || 'Lütfen ödev talimatlarını buraya yazın.',
                                submissionType: 'file',
                                points: 100
                            }
                        }];
                    }
                    return activeNode?.slides || [];
                })()}
                onClose={handleCloseLesson}
                onComplete={handleLessonComplete}
                courseId={currentCourse?.id}
                lessonIndex={currentCourse?.nodes?.find((n: any) => String(n.id) === String(lessonLevel))?.lessonNumber}
                userData={userData}
            />
        </div>
    </div>
  );
};

export default LiveLessonStudent;
