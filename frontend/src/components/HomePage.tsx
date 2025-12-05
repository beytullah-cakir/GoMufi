import React, { useState } from 'react';
import MufiSleep from '../assets/sprites/MufiSleep.png';
import FireIcon from '../assets/sprites/Fire.png';

import ChestIcon from '../assets/sprites/Chest.png';
import HouseIcon from '../assets/sprites/House.png';
import ButtonCyan from '../assets/sprites/ButtonCyan.png';
import ButtonRed from '../assets/sprites/ButtonRed.png';
import ButtonPurple from '../assets/sprites/ButtonPurple.png';
import ButtonYellow from '../assets/sprites/ButtonYellow.png';
import ButtonGreen from '../assets/sprites/ButtonGreen.png';
import TextBubble from '../assets/sprites/TextBubble.png';
import GrassIcon from '../assets/sprites/grass.png';

const HomePage: React.FC = () => {
    const [activeNodeId, setActiveNodeId] = useState<number | null>(null);

    // --- Data Structures & Helpers ---

    type NodeType = 'start' | 'chest' | 'house' | 'paw';
    type CurveType = 'up' | 'down';

    interface PathNode {
        id: number;
        type: NodeType;
        button: string;
        icon?: string;
        curve: CurveType;
        iconSize: string; // Tailwind class for size
        iconOffset?: string; // Additional offset if needed
        ringColor: string; // Tailwind classes for ring border and bg
        numberGradient: string; // Tailwind classes for text gradient
        pastelColor: string; // Hex color for the number text
        glowColor: string; // Color for drop-shadow
        strokeColor: string; // Hex color for text stroke
    }

    const nodes: PathNode[] = [
        { id: 1, type: 'start', button: ButtonCyan, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-cyan-400 bg-white', numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400', pastelColor: '#A5F3FC', glowColor: 'rgba(34,211,238,0.4)', strokeColor: '#0891b2' },
        { id: 2, type: 'chest', button: ButtonRed, icon: ChestIcon, curve: 'up', iconSize: 'w-24 h-24', iconOffset: '-mt-24', ringColor: 'border-red-400 bg-white', numberGradient: 'bg-gradient-to-b from-red-100 to-red-400', pastelColor: '#FECACA', glowColor: 'rgba(248,113,113,0.4)', strokeColor: '#dc2626' },
        { id: 3, type: 'house', button: ButtonPurple, icon: HouseIcon, curve: 'down', iconSize: 'w-28 h-28', iconOffset: '-mt-28', ringColor: 'border-purple-400 bg-white', numberGradient: 'bg-gradient-to-b from-purple-100 to-purple-400', pastelColor: '#E9D5FF', glowColor: 'rgba(192,132,252,0.4)', strokeColor: '#9333ea' },
        { id: 4, type: 'paw', button: ButtonYellow, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-yellow-400 bg-white', numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400', pastelColor: '#FEF08A', glowColor: 'rgba(250,204,21,0.4)', strokeColor: '#ca8a04' },
        { id: 5, type: 'paw', button: ButtonGreen, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-green-400 bg-white', numberGradient: 'bg-gradient-to-b from-green-100 to-green-400', pastelColor: '#BBF7D0', glowColor: 'rgba(74,222,128,0.4)', strokeColor: '#16a34a' },
        { id: 6, type: 'paw', button: ButtonCyan, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-cyan-400 bg-white', numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400', pastelColor: '#A5F3FC', glowColor: 'rgba(34,211,238,0.4)', strokeColor: '#0891b2' },
        { id: 7, type: 'chest', button: ButtonRed, icon: ChestIcon, curve: 'down', iconSize: 'w-24 h-24', iconOffset: '-mt-24', ringColor: 'border-red-400 bg-white', numberGradient: 'bg-gradient-to-b from-red-100 to-red-400', pastelColor: '#FECACA', glowColor: 'rgba(248,113,113,0.4)', strokeColor: '#dc2626' },
        { id: 8, type: 'paw', button: ButtonPurple, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-purple-400 bg-white', numberGradient: 'bg-gradient-to-b from-purple-100 to-purple-400', pastelColor: '#E9D5FF', glowColor: 'rgba(192,132,252,0.4)', strokeColor: '#9333ea' },
        { id: 9, type: 'paw', button: ButtonYellow, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-yellow-400 bg-white', numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400', pastelColor: '#FEF08A', glowColor: 'rgba(250,204,21,0.4)', strokeColor: '#ca8a04' },
        { id: 10, type: 'house', button: ButtonGreen, icon: HouseIcon, curve: 'up', iconSize: 'w-28 h-28', iconOffset: '-mt-28', ringColor: 'border-green-400 bg-white', numberGradient: 'bg-gradient-to-b from-green-100 to-green-400', pastelColor: '#BBF7D0', glowColor: 'rgba(74,222,128,0.4)', strokeColor: '#16a34a' },
        { id: 11, type: 'paw', button: ButtonCyan, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-cyan-400 bg-white', numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400', pastelColor: '#A5F3FC', glowColor: 'rgba(34,211,238,0.4)', strokeColor: '#0891b2' },
        { id: 12, type: 'chest', button: ButtonRed, icon: ChestIcon, curve: 'up', iconSize: 'w-24 h-24', iconOffset: '-mt-24', ringColor: 'border-red-400 bg-white', numberGradient: 'bg-gradient-to-b from-red-100 to-red-400', pastelColor: '#FECACA', glowColor: 'rgba(248,113,113,0.4)', strokeColor: '#dc2626' },
        { id: 13, type: 'paw', button: ButtonPurple, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-purple-400 bg-white', numberGradient: 'bg-gradient-to-b from-purple-100 to-purple-400', pastelColor: '#E9D5FF', glowColor: 'rgba(192,132,252,0.4)', strokeColor: '#9333ea' },
        { id: 14, type: 'paw', button: ButtonYellow, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-yellow-400 bg-white', numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400', pastelColor: '#FEF08A', glowColor: 'rgba(250,204,21,0.4)', strokeColor: '#ca8a04' },
        { id: 15, type: 'house', button: ButtonGreen, icon: HouseIcon, curve: 'down', iconSize: 'w-28 h-28', iconOffset: '-mt-28', ringColor: 'border-green-400 bg-white', numberGradient: 'bg-gradient-to-b from-green-100 to-green-400', pastelColor: '#BBF7D0', glowColor: 'rgba(74,222,128,0.4)', strokeColor: '#16a34a' },
    ];

    return (
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
            {/* Header Section */}
            <div className="flex justify-between items-start p-8">
                {/* Sleeping Mufi */}
                <div className="relative">
                    <div className="w-48 h-8 bg-gray-300 rounded-[100%] absolute bottom-28 left-8"></div>
                    <img src={MufiSleep} alt="Sleeping Mufi" className="w-64 object-contain relative z-10 animate-breathe" />

                    {/* Zzz Animation */}
                    <div className="absolute top-20 left-24 z-20 pointer-events-none">
                        <span className="absolute text-3xl font-black text-gray-600 animate-float-z" style={{ animationDelay: '0s', fontFamily: "'Fredoka', sans-serif" }}>Z</span>
                        <span className="absolute text-4xl font-black text-gray-600 animate-float-z" style={{ animationDelay: '1.5s', left: '20px', top: '-20px', fontFamily: "'Fredoka', sans-serif" }}>Z</span>
                    </div>
                </div>

                {/* Stats & Quests */}
                <div className="flex flex-col items-end gap-6">
                    {/* Stats Bar */}
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                            <img src={FireIcon} alt="Streak" className="w-8 h-8" />
                            <span className="text-2xl font-black text-orange-500 font-display">8!</span>
                        </div>
                        <div className="relative w-48 h-6 bg-gray-200 rounded-full overflow-hidden border-2 border-gray-300">
                            <div className="absolute top-0 left-0 h-full bg-sky-400 w-[35%] rounded-full"></div>
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                10,526 / 30,000 XP
                            </span>
                        </div>
                    </div>

                    {/* Daily Quest Widget */}
                    <div className="bg-white rounded-3xl border-4 border-gray-200 p-6 w-72 shadow-lg">
                        <h3 className="text-xl font-black text-gray-700 mb-4 font-display">Daily Quest !</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-yellow-300 flex items-center justify-center border-b-4 border-yellow-500">
                                        <span className="text-white font-black text-xs">★</span>
                                    </div>
                                    <span className="font-bold text-gray-600 text-sm">Solve 10 Quiz !</span>
                                </div>
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-green-400 flex items-center justify-center border-b-4 border-green-600">
                                        <span className="text-white font-black text-xs">★</span>
                                    </div>
                                    <span className="font-bold text-gray-600 text-sm">Take 1 Lesson.</span>
                                </div>
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-indigo-400 flex items-center justify-center border-b-4 border-indigo-600">
                                        <span className="text-white font-black text-xs">★</span>
                                    </div>
                                    <span className="font-bold text-gray-600 text-sm">Solve 2 Test !</span>
                                </div>
                                <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Gamified Path */}
            <div className="flex-1 overflow-x-auto flex items-center px-20 pt-96 pb-80 no-scrollbar relative z-20 -mt-48">
                <div className="flex items-center min-w-max relative">

                    {(() => {
                        let levelCounter = 0;
                        return nodes.map((node, index) => {
                            const isLevel = node.type === 'start' || node.type === 'paw';
                            if (isLevel) levelCounter++;

                            return (
                                <React.Fragment key={node.id}>
                                    {/* Node Container */}
                                    <div
                                        className={`relative z-10 group cursor-pointer transform hover:scale-105 transition-transform duration-200 ${node.curve === 'up' ? 'mt-24' : '-mt-12'}`}
                                        style={index === 0 ? { marginTop: '0' } : {}}
                                        onClick={() => setActiveNodeId(node.id === activeNodeId ? null : node.id)}
                                    >
                                        {/* Text Bubble */}
                                        {/* Text Bubble - Always rendered for animation */}
                                        <div
                                            className={`absolute bottom-full left-1/2 -translate-x-1/2 z-50 w-64 transition-all duration-300 ease-out origin-bottom ${activeNodeId === node.id
                                                ? 'opacity-100 scale-100 translate-y-[-20px] mb-16'
                                                : 'opacity-0 scale-50 translate-y-4 mb-16 pointer-events-none'
                                                }`}
                                        >
                                            <div className="relative flex items-center justify-center">
                                                <img src={TextBubble} alt="Bubble" className="w-full drop-shadow-lg" />
                                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[75%] flex items-center gap-3">
                                                    {/* 3D Play Button */}
                                                    <div className="relative w-12 h-12 group/btn cursor-pointer transition-transform active:scale-95">
                                                        {/* Shadow Layer */}
                                                        <div
                                                            className="absolute inset-x-0 bottom-0 h-12 rounded-full"
                                                            style={{ backgroundColor: node.strokeColor, filter: 'brightness(0.6)' }}
                                                        ></div>
                                                        {/* Face Layer */}
                                                        <div
                                                            className="absolute inset-x-0 bottom-2 h-12 rounded-full flex items-center justify-center transition-all group-active/btn:bottom-0"
                                                            style={{ backgroundColor: node.strokeColor }}
                                                        >
                                                            <svg viewBox="0 0 24 24" className="w-6 h-6 text-white fill-current ml-1" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M8 5v14l11-7z" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                    <span className="text-gray-500 font-black font-display text-xl whitespace-nowrap">
                                                        Teste Başla !
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hover Ring Effect */}
                                        <div className={`absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-16 border-8 rounded-[100%] opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none z-0 ${node.ringColor}`}></div>

                                        {/* Shadow */}
                                        <div className="w-36 h-12 bg-black opacity-20 rounded-[100%] absolute top-14 left-2 blur-md"></div>

                                        {/* Button Sprite */}
                                        <img src={node.button} alt="Button" className="w-40 relative z-10" />

                                        {/* Icon/Number Container - Centered */}
                                        <div className={`absolute inset-0 flex items-center justify-center z-20 ${node.iconOffset || ''}`}>
                                            {node.icon ? (
                                                <img
                                                    src={node.icon}
                                                    alt={node.type}
                                                    className={`${node.iconSize} drop-shadow-xl`}
                                                />
                                            ) : (
                                                <div className="relative flex items-center justify-center">
                                                    {/* Shadow */}
                                                    <div className="absolute bottom-2 w-16 h-5 bg-gray-500/80 rounded-[100%] blur-[2px] animate-shadow-breathe"></div>

                                                    {/* Number */}
                                                    <span
                                                        className="text-6xl font-black select-none animate-float relative z-10 -translate-y-8"
                                                        style={{
                                                            fontFamily: "'Fredoka', sans-serif",
                                                            color: 'white',
                                                            WebkitTextStroke: `3px ${node.strokeColor}`,
                                                            paintOrder: 'stroke fill',
                                                            filter: `drop-shadow(0 0 8px ${node.pastelColor})`,
                                                            textShadow: `
                                                                2px 2px 0px ${node.strokeColor},
                                                                4px 4px 0px ${node.strokeColor}
                                                            `,
                                                        }}
                                                    >
                                                        {levelCounter}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Connector (if not last node) */}
                                    {index < nodes.length - 1 && (
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
                                            {/* Decorative Grass - Dense Terrain */}
                                            {/* Main Path Grass + Filler Grass below to create volume */}

                                            {/* 1. Main Path Grass (Follows the curve) */}
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

                                            {/* 2. Hill Filler (Only for 'up' curves) - Fills the space under the arch */}
                                            {node.curve !== 'down' && (
                                                <>
                                                    {/* Layer 1: Just below path */}
                                                    <img src={GrassIcon} alt="" className="absolute w-5 opacity-60 rotate-6" style={{ left: '20%', top: '55%' }} />
                                                    <img src={GrassIcon} alt="" className="absolute w-6 opacity-50 -rotate-3" style={{ left: '40%', top: '45%' }} />
                                                    <img src={GrassIcon} alt="" className="absolute w-5 opacity-60 rotate-12" style={{ left: '60%', top: '45%' }} />
                                                    <img src={GrassIcon} alt="" className="absolute w-4 opacity-50 -rotate-6" style={{ left: '80%', top: '55%' }} />

                                                    {/* Layer 2: Mid-depth */}
                                                    <img src={GrassIcon} alt="" className="absolute w-6 opacity-40 -rotate-12" style={{ left: '30%', top: '70%' }} />
                                                    <img src={GrassIcon} alt="" className="absolute w-7 opacity-30 rotate-3" style={{ left: '50%', top: '65%' }} />
                                                    <img src={GrassIcon} alt="" className="absolute w-5 opacity-40 rotate-12" style={{ left: '70%', top: '70%' }} />

                                                    {/* Layer 3: Bottom/Ground */}
                                                    <img src={GrassIcon} alt="" className="absolute w-6 opacity-30 rotate-6" style={{ left: '15%', top: '85%' }} />
                                                    <img src={GrassIcon} alt="" className="absolute w-8 opacity-20 -rotate-3" style={{ left: '45%', top: '90%' }} />
                                                    <img src={GrassIcon} alt="" className="absolute w-6 opacity-30 rotate-12" style={{ left: '85%', top: '85%' }} />
                                                </>
                                            )}

                                            {/* 3. Valley Filler (Only for 'down' curves) - Subtle ground cover */}
                                            {node.curve === 'down' && (
                                                <>
                                                    <img src={GrassIcon} alt="" className="absolute w-4 opacity-40 rotate-6" style={{ left: '10%', top: '70%' }} />
                                                    <img src={GrassIcon} alt="" className="absolute w-5 opacity-30 -rotate-12" style={{ left: '90%', top: '70%' }} />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        });
                    })()}

                </div>
            </div>
        </div>
    );
};

export default HomePage;
