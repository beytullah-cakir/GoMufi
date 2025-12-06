import React, { useState, useEffect } from 'react';

interface MatchingGameProps {
    level: number;
    lessonTitle: string;
    onClose: () => void;
}

type GamePhase = 'intro' | 'countdown' | 'playing' | 'score';

const MatchingGame: React.FC<MatchingGameProps> = ({ level, lessonTitle, onClose }) => {
    const [phase, setPhase] = useState<GamePhase>('intro');
    const [countdown, setCountdown] = useState(3);
    const [timer, setTimer] = useState(100); // Percentage

    // Phase Management
    useEffect(() => {
        let timeout: ReturnType<typeof setTimeout>;

        if (phase === 'intro') {
            timeout = setTimeout(() => {
                setPhase('countdown');
            }, 2000); // 2s Intro
        } else if (phase === 'countdown') {
            if (countdown > 0) {
                timeout = setTimeout(() => setCountdown(prev => prev - 1), 1000);
            } else {
                setPhase('playing');
            }
        }

        return () => clearTimeout(timeout);
    }, [phase, countdown]);

    // Game Timer (Mock)
    useEffect(() => {
        if (phase === 'playing') {
            const interval = setInterval(() => {
                setTimer(prev => Math.max(0, prev - 0.2)); // Decrement timer
            }, 50);
            return () => clearInterval(interval);
        }
    }, [phase]);

    // --- RENDERERS ---

    if (phase === 'intro') {
        return (
            <div className="flex flex-col items-center animate-in zoom-in-50 duration-500">
                <span className="text-gray-400 font-black text-2xl uppercase tracking-widest mb-4">Seviye</span>
                <span className="text-9xl font-black text-gray-800 font-display drop-shadow-sm">
                    {level}
                </span>
                <span className="text-gray-400 font-bold text-3xl font-display mt-6 tracking-wide">
                    {lessonTitle}
                </span>
            </div>
        );
    }

    if (phase === 'countdown') {
        return (
            <div className="flex items-center justify-center">
                <span key={countdown} className="text-9xl font-black text-sky-500 font-display animate-ping-once drop-shadow-md">
                    {countdown > 0 ? countdown : 'GO!'}
                </span>
            </div>
        );
    }

    if (phase === 'playing') {
        return (
            <div className="w-full max-w-4xl flex flex-col items-center h-[90vh] py-8">
                {/* Header (Exit & Timer) */}
                <div className="w-full flex justify-between items-center mb-8 px-4">
                    <button
                        onClick={onClose}
                        className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center transition-colors group cursor-pointer"
                    >
                        <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Timer Bar */}
                    <div className="flex-1 mx-8 h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                        <div
                            className="h-full bg-purple-500 transition-all duration-100 ease-linear"
                            style={{ width: `${timer}%` }}
                        ></div>
                    </div>

                    <div className="w-12"></div> {/* Spacer for alignment */}
                </div>

                {/* Question Area */}
                <div className="flex-1 flex items-center justify-center mb-12 w-full">
                    <div className="bg-white border-2 border-gray-200 border-b-4 rounded-3xl p-12 shadow-sm text-center w-full mx-4">
                        <h2 className="text-4xl font-black text-gray-700 font-display">Metin 1</h2>
                    </div>
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-2 gap-4 w-full h-80 px-4">
                    {/* Option 1: Red Triangle */}
                    <button className="bg-red-500 hover:bg-red-600 active:translate-y-1 border-b-8 border-red-700 active:border-b-0 rounded-2xl flex items-center p-6 gap-6 transition-all group">
                        <div className="w-16 h-16 bg-red-700 rounded-xl flex items-center justify-center shadow-inner text-3xl font-black text-white font-display">
                            A
                        </div>
                        <span className="text-3xl font-black text-white font-display">Sık 1</span>
                    </button>

                    {/* Option 2: Blue Diamond */}
                    <button className="bg-blue-500 hover:bg-blue-600 active:translate-y-1 border-b-8 border-blue-700 active:border-b-0 rounded-2xl flex items-center p-6 gap-6 transition-all group">
                        <div className="w-16 h-16 bg-blue-700 rounded-xl flex items-center justify-center shadow-inner text-3xl font-black text-white font-display">
                            B
                        </div>
                        <span className="text-3xl font-black text-white font-display">Sık 2</span>
                    </button>

                    {/* Option 3: Yellow Circle */}
                    <button className="bg-yellow-400 hover:bg-yellow-500 active:translate-y-1 border-b-8 border-yellow-600 active:border-b-0 rounded-2xl flex items-center p-6 gap-6 transition-all group">
                        <div className="w-16 h-16 bg-yellow-600 rounded-xl flex items-center justify-center shadow-inner text-3xl font-black text-white font-display">
                            C
                        </div>
                        <span className="text-3xl font-black text-white font-display">Sık 3</span>
                    </button>

                    {/* Option 4: Green Square */}
                    <button className="bg-green-500 hover:bg-green-600 active:translate-y-1 border-b-8 border-green-700 active:border-b-0 rounded-2xl flex items-center p-6 gap-6 transition-all group">
                        <div className="w-16 h-16 bg-green-700 rounded-xl flex items-center justify-center shadow-inner text-3xl font-black text-white font-display">
                            D
                        </div>
                        <span className="text-3xl font-black text-white font-display">Sık 4</span>
                    </button>
                </div>
            </div>
        );
    }

    return null;
};

export default MatchingGame;
