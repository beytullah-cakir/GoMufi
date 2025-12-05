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

    // Dynamic Header State
    const [headerColor, setHeaderColor] = useState<string>('#58cc02'); // Default Green
    const [headerTitle, setHeaderTitle] = useState<string>('İngilizce temellerini at');
    const [headerSubtitle, setHeaderSubtitle] = useState<string>('BÖLÜM 1, ÜNİTE 1');

    // --- Data Structures & Helpers ---

    type NodeType = 'start' | 'chest' | 'house' | 'paw';
    type CurveType = 'up' | 'down';

    interface PathNode {
        id: number;
        type: NodeType;
        button: string;
        icon?: string;
        curve: CurveType;
        iconSize: string;
        iconOffset?: string;
        ringColor: string;
        numberGradient: string;
        pastelColor: string;
        glowColor: string; // Used for icon/number shadows
        strokeColor: string; // Used for text stroke and button accents
        baseColor: string; // Used for dynamic header
        title: string; // Used for dynamic header
    }

    const nodes: PathNode[] = [
        { id: 1, type: 'start', button: ButtonCyan, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-cyan-400 bg-white', numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400', pastelColor: '#A5F3FC', glowColor: 'rgba(34,211,238,0.4)', strokeColor: '#0891b2', baseColor: '#06b6d4', title: 'Temel İfadeler' },
        { id: 2, type: 'chest', button: ButtonRed, icon: ChestIcon, curve: 'up', iconSize: 'w-24 h-24', iconOffset: '-mt-24', ringColor: 'border-red-400 bg-white', numberGradient: 'bg-gradient-to-b from-red-100 to-red-400', pastelColor: '#FECACA', glowColor: 'rgba(248,113,113,0.4)', strokeColor: '#dc2626', baseColor: '#ef4444', title: 'Hazine Sandığı' },
        { id: 3, type: 'house', button: ButtonPurple, icon: HouseIcon, curve: 'down', iconSize: 'w-28 h-28', iconOffset: '-mt-28', ringColor: 'border-purple-400 bg-white', numberGradient: 'bg-gradient-to-b from-purple-100 to-purple-400', pastelColor: '#E9D5FF', glowColor: 'rgba(192,132,252,0.4)', strokeColor: '#9333ea', baseColor: '#a855f7', title: 'Ev Eşyaları' },
        { id: 4, type: 'paw', button: ButtonYellow, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-yellow-400 bg-white', numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400', pastelColor: '#FEF08A', glowColor: 'rgba(250,204,21,0.4)', strokeColor: '#ca8a04', baseColor: '#eab308', title: 'Hayvanlar Alemi' },
        { id: 5, type: 'paw', button: ButtonGreen, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-green-400 bg-white', numberGradient: 'bg-gradient-to-b from-green-100 to-green-400', pastelColor: '#BBF7D0', glowColor: 'rgba(74,222,128,0.4)', strokeColor: '#16a34a', baseColor: '#22c55e', title: 'Doğa Gezisi' },
        { id: 6, type: 'paw', button: ButtonCyan, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-cyan-400 bg-white', numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400', pastelColor: '#A5F3FC', glowColor: 'rgba(34,211,238,0.4)', strokeColor: '#0891b2', baseColor: '#06b6d4', title: 'Seyahat' },
        { id: 7, type: 'chest', button: ButtonRed, icon: ChestIcon, curve: 'down', iconSize: 'w-24 h-24', iconOffset: '-mt-24', ringColor: 'border-red-400 bg-white', numberGradient: 'bg-gradient-to-b from-red-100 to-red-400', pastelColor: '#FECACA', glowColor: 'rgba(248,113,113,0.4)', strokeColor: '#dc2626', baseColor: '#ef4444', title: 'Sürpriz Ödül' },
        { id: 8, type: 'paw', button: ButtonPurple, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-purple-400 bg-white', numberGradient: 'bg-gradient-to-b from-purple-100 to-purple-400', pastelColor: '#E9D5FF', glowColor: 'rgba(192,132,252,0.4)', strokeColor: '#9333ea', baseColor: '#a855f7', title: 'Hobiler' },
        { id: 9, type: 'paw', button: ButtonYellow, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-yellow-400 bg-white', numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400', pastelColor: '#FEF08A', glowColor: 'rgba(250,204,21,0.4)', strokeColor: '#ca8a04', baseColor: '#eab308', title: 'Yiyecekler' },
        { id: 10, type: 'house', button: ButtonGreen, icon: HouseIcon, curve: 'up', iconSize: 'w-28 h-28', iconOffset: '-mt-28', ringColor: 'border-green-400 bg-white', numberGradient: 'bg-gradient-to-b from-green-100 to-green-400', pastelColor: '#BBF7D0', glowColor: 'rgba(74,222,128,0.4)', strokeColor: '#16a34a', baseColor: '#22c55e', title: 'Aile Üyeleri' },
        { id: 11, type: 'paw', button: ButtonCyan, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-cyan-400 bg-white', numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400', pastelColor: '#A5F3FC', glowColor: 'rgba(34,211,238,0.4)', strokeColor: '#0891b2', baseColor: '#06b6d4', title: 'Alışveriş' },
        { id: 12, type: 'chest', button: ButtonRed, icon: ChestIcon, curve: 'up', iconSize: 'w-24 h-24', iconOffset: '-mt-24', ringColor: 'border-red-400 bg-white', numberGradient: 'bg-gradient-to-b from-red-100 to-red-400', pastelColor: '#FECACA', glowColor: 'rgba(248,113,113,0.4)', strokeColor: '#dc2626', baseColor: '#ef4444', title: 'Bonus' },
        { id: 13, type: 'paw', button: ButtonPurple, curve: 'down', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-purple-400 bg-white', numberGradient: 'bg-gradient-to-b from-purple-100 to-purple-400', pastelColor: '#E9D5FF', glowColor: 'rgba(192,132,252,0.4)', strokeColor: '#9333ea', baseColor: '#a855f7', title: 'Okul' },
        { id: 14, type: 'paw', button: ButtonYellow, curve: 'up', iconSize: 'w-16 h-16', iconOffset: '-mt-12', ringColor: 'border-yellow-400 bg-white', numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400', pastelColor: '#FEF08A', glowColor: 'rgba(250,204,21,0.4)', strokeColor: '#ca8a04', baseColor: '#eab308', title: 'Meslekler' },
        { id: 15, type: 'house', button: ButtonGreen, icon: HouseIcon, curve: 'down', iconSize: 'w-28 h-28', iconOffset: '-mt-28', ringColor: 'border-green-400 bg-white', numberGradient: 'bg-gradient-to-b from-green-100 to-green-400', pastelColor: '#BBF7D0', glowColor: 'rgba(74,222,128,0.4)', strokeColor: '#16a34a', baseColor: '#22c55e', title: 'Bitiş' },
    ];

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

    // Calculate dynamic styles for the Course Box to match the header
    const courseBoxStyle = {
        borderColor: headerColor,
        color: headerColor
    };

    return (
        <div className="w-full h-screen bg-white flex flex-col items-center relative overflow-hidden">

            {/* Header Row: Course info + Unit Header + Stats + XP Bar */}
            {/* WIDENED CONTAINER: Removed max-w-7xl, increased px to push to edges but keep safe area */}
            <div className="w-full px-6 md:px-12 pt-6 flex justify-between items-start z-30 relative">
                {/* Left Side Container: Course Box + Unit Header + Instructor Widget */}
                <div className="flex items-center gap-4">
                    {/* Course Info Box (New) */}
                    <div className="w-24 h-24 rounded-2xl border-4 flex flex-col items-center justify-center bg-white shadow-sm shrink-0 transition-colors duration-500 hover:-translate-y-1 hover:shadow-md cursor-pointer"
                        style={courseBoxStyle}>
                        <span className="text-3xl mb-1">🐍</span>
                        <span className="font-black text-sm uppercase tracking-wider font-display">Python</span>
                    </div>

                    {/* Unit Header (Left) - DYNAMIC COLOR */}
                    <div
                        className="rounded-2xl p-4 md:p-5 text-white flex justify-between items-center shadow-md relative overflow-hidden group shrink-0 w-[450px] h-24 transition-colors duration-500 ease-in-out border-b-4 border-black/10"
                        style={{ backgroundColor: headerColor }}
                    >
                        {/* Status Bar Top Line */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/20"></div>

                        <div className="relative z-10">
                            <h2 className="text-xs font-black tracking-widest opacity-90 mb-1 uppercase font-display">{headerSubtitle}</h2>
                            <h1 className="text-xl md:text-2xl font-black font-display tracking-tight drop-shadow-sm">{headerTitle}</h1>
                        </div>

                        <button className="bg-white/20 hover:bg-white/30 text-white font-black px-4 py-2 rounded-xl text-xs transition-colors uppercase tracking-wider flex items-center gap-2 border-2 border-transparent">
                            <span className="text-lg">📖</span> REHBER
                        </button>
                    </div>

                    {/* Instructor Widget (Moved Inside Left Group) */}
                    <div className="hidden xl:flex h-24 px-6 bg-white border-2 border-gray-200 border-b-4 rounded-2xl items-center gap-4 shadow-sm ml-2">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-3xl">
                                👨‍🏫
                            </div>
                            {/* Online Status Dot */}
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-4 border-white rounded-full"></div>
                        </div>

                        {/* Info */}
                        <div className="flex flex-col justify-center">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Eğitmen</span>
                            <span className="text-lg font-black text-gray-800 font-display leading-none mb-1">Mufi Hoca</span>
                            <span className="text-xs font-bold text-green-500 flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full w-fit">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Çevrimiçi
                            </span>
                        </div>

                        {/* Chat Action */}
                        <button className="w-10 h-10 ml-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-sky-500 flex items-center justify-center transition-colors border-2 border-transparent hover:border-gray-200">
                            <span className="text-xl">💬</span>
                        </button>
                    </div>
                </div>

                {/* Right Column: Stats + Widgets (Grouped for Alignment) */}
                <div className="flex flex-col items-end relative z-50">
                    {/* User Stats Row - FIXED WIDTH w-80 to match sidebar */}
                    <div className="flex flex-col gap-3 w-80">

                        {/* REDESIGNED XP BAR (Ranked/Graded Style) */}
                        <div className="w-full bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-2 flex items-center justify-between shadow-sm relative overflow-hidden group hover:border-yellow-200 transition-colors">
                            {/* Background Progress Tint */}
                            <div className="absolute left-0 top-0 bottom-0 bg-yellow-50 w-[40%] z-0"></div>

                            <div className="flex items-center gap-3 relative z-10">
                                {/* Rank Icon / Badge */}
                                <div className="w-9 h-9 rounded-full bg-yellow-400 border-2 border-yellow-500 flex items-center justify-center shadow-[0_2px_0_#ca8a04] group-hover:scale-110 transition-transform">
                                    <span className="text-sm font-black text-white">III</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none">Bronz Lig</span>
                                    <span className="text-sm font-black text-gray-700 font-display">120 XP</span>
                                </div>
                            </div>

                            {/* Segmented Bar */}
                            <div className="flex gap-1 relative z-10">
                                <div className="w-2 h-6 rounded-sm bg-yellow-400"></div>
                                <div className="w-2 h-6 rounded-sm bg-yellow-400"></div>
                                <div className="w-2 h-6 rounded-sm bg-yellow-400"></div>
                                <div className="w-2 h-6 rounded-sm bg-gray-200"></div>
                                <div className="w-2 h-6 rounded-sm bg-gray-200"></div>
                            </div>
                        </div>

                        {/* UNIFIED STATS BAR: Single container like the XP bar */}
                        <div className="w-full bg-white border-2 border-gray-200 border-b-4 rounded-2xl px-3 py-2 flex items-center justify-between shadow-sm">
                            {/* Flags / Lang */}
                            <div className="w-9 h-9 rounded-xl hover:bg-gray-100 cursor-pointer flex items-center justify-center transition-all shrink-0">
                                <span className="text-xl">🇬🇧</span>
                            </div>

                            {/* Separator */}
                            <div className="w-0.5 h-6 bg-gray-200 rounded-full"></div>

                            {/* Icons Group */}
                            <div className="flex items-center gap-4">
                                {/* Fire */}
                                <div className="flex items-center gap-1 group cursor-pointer">
                                    <img src={FireIcon} alt="Streak" className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-black text-orange-500 font-display">8</span>
                                </div>

                                {/* Gems */}
                                <div className="flex items-center gap-1 group cursor-pointer">
                                    <span className="text-sm group-hover:scale-110 transition-transform block">💎</span>
                                    <span className="text-sm font-black text-sky-500 font-display">500</span>
                                </div>

                                {/* Hearts */}
                                <div className="flex items-center gap-1 group cursor-pointer">
                                    <span className="text-sm group-hover:scale-110 transition-transform block">❤️</span>
                                    <span className="text-sm font-black text-red-500 font-display">5</span>
                                </div>
                            </div>

                            {/* Profile Tab */}
                            <div className="w-9 h-9 rounded-xl hover:bg-gray-100 cursor-pointer flex items-center justify-center transition-all shrink-0 text-gray-400 hover:text-gray-600">
                                <span className="text-xl">👤</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Sidebar Widgets - Anchored directly below Stats */}
                    <div className="absolute top-full mt-6 right-0 hidden xl:flex flex-col gap-6 w-80">
                        {/* Daily Quest Widget (Redesigned - Premium Card) */}
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

            {/* Middle Section: Horizontal Path (Vertically Centered) */}
            <div className="w-full h-full flex items-center justify-center relative z-20">
                {/* Horizontal Gamified Path */}
                {/* Added 'no-scrollbar' class (make sure to have it in CSS or use inline styling for hiding scrollbar) */}
                <style>{`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>
                {/* INCREASED PADDING TOP (p-80) TO FIX CLIPPING - Extra space for bubbles */}
                <div className="w-full overflow-x-auto flex items-center px-24 no-scrollbar pt-80 pb-40 select-none">
                    <div className="flex items-center min-w-max relative pl-20 pr-20">
                        {(() => {
                            let levelCounter = 0;
                            return nodes.map((node, index) => {
                                const isLevel = node.type === 'start' || node.type === 'paw';
                                if (isLevel) levelCounter++;

                                return (
                                    <React.Fragment key={node.id}>
                                        {/* Node Container */}
                                        <div
                                            className={`relative z-10 group cursor-pointer transform hover:scale-105 transition-transform duration-200 ${node.curve === 'up' ? 'mt-32' : '-mt-12'}`}
                                            // style={index === 0 ? { marginTop: '0' } : {}}
                                            onClick={() => handleNodeClick(node)}
                                        >
                                            {/* Text Bubble - SQUASHED HEIGHT (scale-y-90) */}
                                            <div
                                                className={`absolute bottom-full left-1/2 -translate-x-1/2 z-[60] w-64 origin-bottom transition-all duration-300 ease-out ${activeNodeId === node.id
                                                    ? 'opacity-100 scale-100 scale-y-90 translate-y-[-20px] mb-12'
                                                    : 'opacity-0 scale-50 translate-y-4 mb-16 pointer-events-none'
                                                    }`}
                                            >
                                                <div className="relative flex items-center justify-center">
                                                    <img src={TextBubble} alt="Bubble" className="w-full drop-shadow-lg" />
                                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[75%] flex items-center gap-3">
                                                        {/* 3D Play Button */}
                                                        <div className="relative w-12 h-12 group/btn cursor-pointer transition-transform active:scale-95">
                                                            <div className="absolute inset-x-0 bottom-0 h-12 rounded-full" style={{ backgroundColor: node.strokeColor, filter: 'brightness(0.6)' }}></div>
                                                            <div className="absolute inset-x-0 bottom-2 h-12 rounded-full flex items-center justify-center transition-all group-active/btn:bottom-0" style={{ backgroundColor: node.strokeColor }}>
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

                                            {/* Icon/Number Container */}
                                            <div className={`absolute inset-0 flex items-center justify-center z-20 ${node.iconOffset || ''}`}>
                                                {node.icon ? (
                                                    <img src={node.icon} alt={node.type} className={`${node.iconSize} drop-shadow-xl`} />
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

                                                {/* Decorative Grass */}
                                                {/* Main Path Grass */}
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

                                                {/* Hill/Valley Fillers */}
                                                {node.curve !== 'down' ? (
                                                    <>
                                                        <img src={GrassIcon} alt="" className="absolute w-5 opacity-60 rotate-6" style={{ left: '20%', top: '55%' }} />
                                                        <img src={GrassIcon} alt="" className="absolute w-6 opacity-50 -rotate-3" style={{ left: '40%', top: '45%' }} />
                                                        <img src={GrassIcon} alt="" className="absolute w-5 opacity-60 rotate-12" style={{ left: '60%', top: '45%' }} />
                                                        <img src={GrassIcon} alt="" className="absolute w-4 opacity-50 -rotate-6" style={{ left: '80%', top: '55%' }} />
                                                    </>
                                                ) : (
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

            {/* Sleeping Cat (Absolute Bottom Right) - LOWERED POSITION (translate-y-4) */}
            <div className="fixed bottom-4 right-4 z-50 pointer-events-none md:block hidden">
                <div className="relative translate-y-4">
                    {/* Zzz Animation with Tailwind */}
                    <style>{`
                         @keyframes floatZ {
                             0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
                             25% { opacity: 1; }
                             100% { opacity: 0; transform: translate(20px, -40px) scale(1.2); }
                         }
                         .animate-zzz {
                             animation: floatZ 2.5s infinite ease-out;
                         }
                         .delay-1000 { animation-delay: 1s; }
                         .delay-2000 { animation-delay: 2s; }
                     `}</style>
                    <div className="absolute -top-8 right-8 z-10 flex flex-col">
                        <span className="text-3xl font-black text-sky-400 animate-zzz font-display">Z</span>
                        <span className="text-2xl font-black text-sky-400/80 animate-zzz delay-1000 font-display absolute -top-4 -right-4">z</span>
                        <span className="text-xl font-black text-sky-400/60 animate-zzz delay-2000 font-display absolute -top-8 -right-8">z</span>
                    </div>

                    <img src={MufiSleep} alt="Sleeping Mufi" className="w-56 animate-breathe drop-shadow-2xl relative z-10" />
                    {/* Cat Shadow - SOLID GRAY CIRCLE */}
                    <div className="absolute bottom-4 left-10 w-36 h-6 bg-gray-400/50 rounded-[100%] animate-shadow-breathe z-0"></div>
                </div>
            </div>

        </div>
    );
};

export default HomePage;
