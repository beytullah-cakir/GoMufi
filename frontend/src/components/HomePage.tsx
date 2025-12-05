import React, { useState } from 'react';
import MufiSleep from '../assets/sprites/MufiSleep.png';
import FireIcon from '../assets/sprites/Fire.png';
import PawIcon from '../assets/sprites/Paw.png';
import ChestIcon from '../assets/sprites/Chest.png';
import HouseIcon from '../assets/sprites/House.png';
import ButtonCyan from '../assets/sprites/ButtonCyan.png';
import ButtonRed from '../assets/sprites/ButtonRed.png';
import ButtonPurple from '../assets/sprites/ButtonPurple.png';
import ButtonYellow from '../assets/sprites/ButtonYellow.png';
import ButtonGreen from '../assets/sprites/ButtonGreen.png';
import TextBubble from '../assets/sprites/TextBubble.png';

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
        glowColor: string; // Color for drop-shadow
        strokeColor: string; // Hex color for text stroke
    }

    const initialNodes: PathNode[] = [
        { id: 1, type: 'start', button: ButtonCyan, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-cyan-400 bg-cyan-400', numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400', glowColor: 'rgba(34,211,238,0.4)', strokeColor: '#0891b2' },
        { id: 2, type: 'chest', button: ButtonRed, icon: ChestIcon, curve: 'up', iconSize: 'w-24 h-24', iconOffset: '-mt-24', ringColor: 'border-red-400 bg-red-400', numberGradient: 'bg-gradient-to-b from-red-100 to-red-400', glowColor: 'rgba(248,113,113,0.4)', strokeColor: '#dc2626' },
        { id: 3, type: 'house', button: ButtonPurple, icon: HouseIcon, curve: 'down', iconSize: 'w-28 h-28', iconOffset: '-mt-28', ringColor: 'border-purple-400 bg-purple-400', numberGradient: 'bg-gradient-to-b from-purple-100 to-purple-400', glowColor: 'rgba(192,132,252,0.4)', strokeColor: '#9333ea' },
        { id: 4, type: 'paw', button: ButtonYellow, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-yellow-400 bg-yellow-400', numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400', glowColor: 'rgba(250,204,21,0.4)', strokeColor: '#ca8a04' },
        { id: 5, type: 'paw', button: ButtonGreen, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-green-400 bg-green-400', numberGradient: 'bg-gradient-to-b from-green-100 to-green-400', glowColor: 'rgba(74,222,128,0.4)', strokeColor: '#16a34a' },
    ];

    const getRandomNode = (id: number, prevCurve: CurveType): PathNode => {
        const types: { type: NodeType; button: string; icon?: string; iconSize: string; iconOffset?: string; ringColor: string; numberGradient: string; glowColor: string; strokeColor: string }[] = [
            { type: 'paw', button: ButtonCyan, iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-cyan-400 bg-cyan-400', numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400', glowColor: 'rgba(34,211,238,0.4)', strokeColor: '#0891b2' },
            { type: 'chest', button: ButtonRed, icon: ChestIcon, iconSize: 'w-24 h-24', iconOffset: '-mt-24', ringColor: 'border-red-400 bg-red-400', numberGradient: 'bg-gradient-to-b from-red-100 to-red-400', glowColor: 'rgba(248,113,113,0.4)', strokeColor: '#dc2626' },
            { type: 'house', button: ButtonPurple, icon: HouseIcon, iconSize: 'w-28 h-28', iconOffset: '-mt-28', ringColor: 'border-purple-400 bg-purple-400', numberGradient: 'bg-gradient-to-b from-purple-100 to-purple-400', glowColor: 'rgba(192,132,252,0.4)', strokeColor: '#9333ea' },
            { type: 'paw', button: ButtonYellow, iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-yellow-400 bg-yellow-400', numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400', glowColor: 'rgba(250,204,21,0.4)', strokeColor: '#ca8a04' },
            { type: 'paw', button: ButtonGreen, iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-green-400 bg-green-400', numberGradient: 'bg-gradient-to-b from-green-100 to-green-400', glowColor: 'rgba(74,222,128,0.4)', strokeColor: '#16a34a' },
        ];

        const randomType = types[Math.floor(Math.random() * types.length)];
        return {
            id,
            ...randomType,
            curve: prevCurve === 'up' ? 'down' : 'up',
        };
    };

    // Generate 10 random nodes
    const nodes = [...initialNodes];
    let lastCurve = nodes[nodes.length - 1].curve;
    for (let i = 0; i < 10; i++) {
        const newNode = getRandomNode(nodes.length + 1, lastCurve);
        nodes.push(newNode);
        lastCurve = newNode.curve;
    }

    return (
        <div className="relative w-full h-full bg-white overflow-hidden flex flex-col">
            {/* Header Section */}
            <div className="flex justify-between items-start p-8 z-10">
                {/* Sleeping Mufi */}
                <div className="relative">
                    <div className="w-64 h-32 bg-gray-600 rounded-[100%] absolute bottom-2 left-4 opacity-20 blur-xl transform scale-y-50"></div>
                    <img src={MufiSleep} alt="Sleeping Mufi" className="w-64 object-contain relative z-10" />
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
            <div className="flex-1 overflow-x-auto overflow-y-hidden flex items-center px-20 pb-20 no-scrollbar">
                <div className="flex items-center min-w-max pt-32 relative">

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
                                        {activeNodeId === node.id && (
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-50 w-40 animate-in fade-in zoom-in duration-300">
                                                <div className="relative flex items-center justify-center">
                                                    <img src={TextBubble} alt="Bubble" className="w-full drop-shadow-lg" />
                                                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] text-black font-bold font-display text-sm whitespace-nowrap">
                                                        Lorem Ipsum
                                                    </span>
                                                </div>
                                            </div>
                                        )}

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
                                                        className="text-6xl font-black font-display select-none text-white animate-float relative z-10 -translate-y-8"
                                                        style={{
                                                            WebkitTextStroke: `3px ${node.strokeColor}`,
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
