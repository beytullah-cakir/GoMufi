import React, { useState } from 'react';
import { Gamepad2, LayoutTemplate, X, ChevronRight } from 'lucide-react';
import SlideThumbnail from './SlideThumbnail';
import type { Slide } from './types';

interface AddSlideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSlide: (type: 'normal' | 'game' | 'notebook') => void;
}

const MOCK_GAME_SLIDE: Slide = {
    id: 999,
    type: 'game',
    gameType: 'matching',
    elements: [],
    gameConfig: {
        timeLimit: 60,
        questions: [{
            id: 'mock-q-1',
            text: 'Eşleştirme Oyunu',
            options: [
                { id: '1', text: 'Elma', isCorrect: true },
                { id: '2', text: 'Armut', isCorrect: false },
                { id: '3', text: 'Muz', isCorrect: false },
                { id: '4', text: 'Çilek', isCorrect: false },
            ]
        }]
    }
};

const AddSlideModal: React.FC<AddSlideModalProps> = ({ isOpen, onClose, onAddSlide }) => {
    const [activeTab, setActiveTab] = useState<'slide' | 'game'>('slide');

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[650px] overflow-hidden flex animate-in zoom-in-95 duration-200">
                {/* SIDEBAR */}
                <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col flex-shrink-0">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-black text-gray-800 font-display">Yeni Slayt</h2>
                        <p className="text-xs text-gray-400 mt-1">İçerik türünü seç</p>
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto">
                        <button
                            onClick={() => setActiveTab('slide')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors mb-1 ${activeTab === 'slide' ? 'bg-white shadow-sm ring-1 ring-black/5 text-indigo-600' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}`}
                        >
                            <div className="flex items-center gap-3">
                                <LayoutTemplate className="w-5 h-5" />
                                <span className="font-medium text-sm">Slayt Şablonları</span>
                            </div>
                            {activeTab === 'slide' && <ChevronRight className="w-4 h-4 text-indigo-500" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('game')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'game' ? 'bg-white shadow-sm ring-1 ring-black/5 text-purple-600' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Gamepad2 className="w-5 h-5" />
                                <span className="font-medium text-sm">Oyun Şablonları</span>
                            </div>
                            {activeTab === 'game' && <ChevronRight className="w-4 h-4 text-purple-500" />}
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 bg-white p-8 overflow-y-auto flex flex-col">
                    <div className="flex items-center justify-between mb-8 flex-shrink-0">
                        <h3 className="text-xl font-bold text-gray-800 font-display">
                            {activeTab === 'slide' ? 'Slayt Şablonları' : 'Oyun Şablonları'}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-6 auto-rows-max">

                        {activeTab === 'slide' && (
                            <>
                                <button
                                    onClick={() => onAddSlide('normal')}
                                    className="text-left group"
                                >
                                    {/* Preview Container */}
                                    <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative">
                                        {/* White Rectangle representation */}
                                        <div className="absolute inset-4 bg-white shadow-sm rounded-lg flex items-center justify-center">
                                            <LayoutTemplate className="w-8 h-8 text-gray-200" />
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Boş Slayt Sayfası</h4>
                                        <p className="text-xs text-gray-400 mt-1">Tamamen boş bir tuval ile başla.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => onAddSlide('notebook' as any)}
                                    className="text-left group"
                                >
                                    {/* Preview Container */}
                                    <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative">
                                        {/* Notebook Pattern representation */}
                                        <div className="absolute inset-4 bg-[#fdfbf7] shadow-sm rounded-lg flex items-center overflow-hidden">
                                            {/* Spine */}
                                            <div className="w-4 h-full bg-gray-700 relative border-r border-gray-900/10 flex flex-col justify-around py-2">
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <div key={i} className="w-6 h-1 bg-gray-300 rounded-full -ml-1 shadow-sm opacity-80" />
                                                ))}
                                            </div>
                                            {/* Lines */}
                                            <div className="flex-1 h-full opacity-50" style={{
                                                backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                                                backgroundSize: '100% 12px'
                                            }} />
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Defter Slayt Sayfası</h4>
                                        <p className="text-xs text-gray-400 mt-1">Çizgili defter görünümü.</p>
                                    </div>
                                </button>
                            </>
                        )}

                        {activeTab === 'game' && (
                            <button
                                onClick={() => onAddSlide('game')}
                                className="text-left group"
                            >
                                {/* Preview Container */}
                                <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-purple-500 group-hover:shadow-md transition-all relative">
                                    {/* Thumbnail */}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="scale-[0.25] origin-center transform-gpu">
                                            <SlideThumbnail slide={MOCK_GAME_SLIDE} width={1000} height={562} />
                                        </div>
                                    </div>
                                    {/* Hosting overlay just in case thumbnail doesn't look like a button */}
                                    <div className="absolute inset-0 bg-transparent" />
                                </div>
                                <div className="px-1">
                                    <h4 className="font-bold text-gray-700 group-hover:text-purple-600 transition-colors">Eşleştirme Oyunu</h4>
                                    <p className="text-xs text-gray-400 mt-1">İnteraktif soru cevap oyunu.</p>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddSlideModal;
