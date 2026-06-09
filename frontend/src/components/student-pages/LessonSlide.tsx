import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Play, Terminal, BookOpen, X } from 'lucide-react';

interface LessonSlideProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    lessonTitle?: string;
}

const LessonSlide: React.FC<LessonSlideProps> = ({ isOpen, onClose, onComplete, lessonTitle }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [code, setCode] = useState<string>('print("Merhaba Mufi!")');
    const [output, setOutput] = useState<string[]>([]);
    const [isRunning, setIsRunning] = useState(false);

    if (!isOpen) return null;

    const slides = [
        {
            type: 'intro',
            title: lessonTitle || 'Ders Başlıyor',
            content: 'Merhaba! Bugün Python dünyasına adım atıyoruz. Hazırsan başlayalım!',
            icon: <BookOpen className="w-16 h-16 text-indigo-500" />
        },
        {
            type: 'content',
            title: 'Değişkenler',
            content: 'Değişkenler, bilgisayarın hafızasında veri saklamak için kullandığımız kutulardır. İstediğimiz ismi verip içine değer atayabiliriz.',
            subContent: 'isim = "Mufi"\nyas = 5',
            icon: <div className="text-6xl">📝</div>
        },
        {
            type: 'ide',
            title: 'Sıra Sende!',
            content: 'Hadi öğrendiklerini deneyelim. Kodu çalıştır!',
        }
    ];

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const runCode = () => {
        setIsRunning(true);
        setOutput([]);

        setTimeout(() => {
            setIsRunning(false);
            setOutput(['> Merhaba Mufi!', '> Program başarıyla çalıştırıldı.']);
        }, 800);
    };

    const renderSlideContent = () => {
        const slide = slides[currentSlide];

        if (slide.type === 'ide') {
            return (
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-4 text-center">
                        <h2 className="text-4xl font-black font-handwriting text-gray-800 mb-2 transform -rotate-1">{slide.title}</h2>
                        <p className="text-gray-600 font-handwriting text-2xl">{slide.content}</p>
                    </div>

                    {/* IDE Tablet Overlay - Full Height Adjustment */}
                    <div className="flex-1 bg-gray-800 rounded-xl overflow-hidden shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] border-4 border-gray-700 flex flex-col transform rotate-1 relative max-h-[60vh] mx-auto w-full max-w-4xl">
                        {/* Sticker Effect */}
                        <div className="absolute -top-3 -right-3 w-12 h-12 bg-yellow-200 rounded-full shadow-md flex items-center justify-center transform rotate-12 z-20 border-2 border-white/20">
                            <span className="text-xl">🐍</span>
                        </div>

                        {/* IDE Header */}
                        <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-700">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <span className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <span className="ml-3 text-gray-400 text-xs font-mono tracking-wider">CODE_EDITOR.py</span>
                            </div>
                            <button
                                onClick={runCode}
                                disabled={isRunning}
                                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white px-5 py-1.5 rounded-lg font-bold text-sm transition-all shadow-lg shadow-green-900/20 active:scale-95"
                            >
                                {isRunning ? (
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Play className="w-4 h-4 fill-current" />
                                )}
                                ÇALIŞTIR
                            </button>
                        </div>

                        <div className="flex flex-1 overflow-hidden">
                            {/* Editor Area */}
                            <div className="w-3/5 bg-[#1e1e1e] p-6 font-mono text-base text-gray-300 relative leading-relaxed">
                                <div className="absolute left-0 top-6 bottom-0 w-10 text-right pr-4 text-gray-600 select-none border-r border-gray-800">
                                    1
                                </div>
                                <textarea
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="w-full h-full bg-transparent border-none outline-none resize-none pl-6 text-green-400 font-mono focus:ring-0"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Divider */}
                            <div className="w-[1px] bg-gray-700 shadow-xl" />

                            {/* Console Output */}
                            <div className="w-2/5 bg-[#1e1e1e] p-4 font-mono text-sm text-white overflow-y-auto relative">
                                <div className="absolute top-0 right-0 p-4 opacity-50 pointer-events-none">
                                    <Terminal className="w-24 h-24 text-white/5 rotate-12" />
                                </div>
                                <div className="flex items-center gap-2 text-gray-500 mb-4 pb-2 border-b border-gray-800">
                                    <Terminal className="w-4 h-4" />
                                    <span className="text-xs uppercase tracking-widest">Terminal Çıktısı</span>
                                </div>
                                <div className="space-y-2 relative z-10">
                                    {output.length === 0 ? (
                                        <span className="text-gray-600 italic text-sm">...</span>
                                    ) : (
                                        output.map((line, i) => (
                                            <div key={i} className="animate-in fade-in slide-in-from-left-2 duration-200 text-green-400">
                                                {line}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        // Standard Slide (Intro/Content)
        return (
            <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                    <div className="mb-6 p-6 rounded-full border-4 border-dashed border-gray-300 transform -rotate-2">
                        {slide.icon}
                    </div>

                    <h2 className="text-6xl font-black font-handwriting text-gray-800 mb-8 transform -rotate-1 relative inline-block">
                        {slide.title}
                        {/* Highlighter Effect */}
                        <div className="absolute -bottom-2 left-0 w-full h-4 bg-yellow-200/50 -z-10 rounded-sm transform -rotate-1 skew-x-12"></div>
                    </h2>

                    <p className="text-3xl text-gray-700 font-handwriting leading-relaxed max-w-3xl transform rotate-1">
                        {slide.content}
                    </p>

                    {slide.subContent && (
                        <div className="mt-12 p-8 bg-white shadow-sm border border-gray-200 rounded-sm transform -rotate-2 w-full max-w-xl relative group">
                            {/* Tape Effect */}
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-8 bg-white/40 border-l border-r border-white/60 shadow-sm opacity-80 backdrop-blur-sm transform rotate-1"></div>

                            <pre className="font-mono text-xl text-gray-600 whitespace-pre-wrap">
                                {slide.subContent}
                            </pre>

                            {/* Doodle */}
                            <div className="absolute -bottom-6 -right-6 text-4xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform rotate-12">
                                ✨
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] bg-[#fdfbf7] animate-in fade-in duration-300">
            {/* Main Notebook Container - Full Screen */}
            <div className="w-full h-full flex relative overflow-hidden">

                {/* Close Button (Sticky Note Style) */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-8 z-50 w-14 h-14 bg-red-100 text-red-500 hover:bg-red-200 hover:scale-110 flex items-center justify-center rounded-sm shadow-md transition-all duration-300 transform rotate-3"
                    title="Kapat"
                >
                    <X className="w-8 h-8 font-bold" />
                </button>

                {/* Left Spine / Binding Area */}
                <div className="w-12 md:w-16 h-full bg-[#3e3e3e] relative flex flex-col items-center py-8 shadow-2xl z-20 shrink-0">
                    <div className="absolute inset-y-0 right-0 w-2 bg-gradient-to-l from-black/20 to-transparent"></div>

                    {/* Spiral Rings - Repeating Pattern */}
                    <div className="w-full h-full flex flex-col justify-evenly overflow-hidden pb-4">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div key={i} className="relative w-full h-10 flex items-center justify-center shrink-0">
                                {/* The Ring */}
                                <div className="w-16 md:w-20 h-3 md:h-4 bg-gradient-to-b from-gray-300 via-gray-100 to-gray-400 rounded-full shadow-lg transform -rotate-2 z-20"></div>
                                {/* Hole Shadow on Paper */}
                                <div className="absolute right-[-4px] w-3 h-3 bg-black/20 rounded-full blur-[1px]"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Page Content */}
                <div className="flex-1 bg-notebook-pattern relative flex flex-col shadow-inner h-full">
                    {/* Page Overlay Shadows (Depth) */}
                    <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/10 to-transparent pointer-events-none z-10"></div>

                    {/* Content */}
                    <div className="flex-1 p-12 pl-20 overflow-y-auto custom-scrollbar flex flex-col justify-center">
                        <div className="max-w-7xl mx-auto w-full">
                            {renderSlideContent()}
                        </div>
                    </div>

                    {/* Bottom Toolbar (Handwritten Controls) */}
                    <div className="h-32 px-12 pl-24 flex items-center justify-between relative shrink-0 pb-8">
                        {/* Doodle Arrow Left */}
                        <button
                            onClick={handlePrev}
                            disabled={currentSlide === 0}
                            className={`group flex items-center gap-2 transition-transform hover:-translate-x-1 ${currentSlide === 0 ? 'opacity-30 cursor-default' : 'cursor-pointer'
                                }`}
                        >
                            <span className="font-handwriting text-3xl font-bold text-gray-500 group-hover:text-gray-800">
                                {'<'} Geri
                            </span>
                        </button>

                        {/* Page Numbers */}
                        <div className="flex gap-4">
                            {slides.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`w-5 h-5 rounded-full border-2 border-gray-400 transition-all ${idx === currentSlide ? 'bg-gray-600 scale-110' : 'bg-transparent'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Doodle Arrow Right */}
                        <button
                            onClick={handleNext}
                            className="group flex items-center gap-3 cursor-pointer transition-transform hover:translate-x-1"
                        >
                            <span className="font-handwriting text-4xl font-black text-indigo-600 group-hover:text-indigo-700 underline decoration-wavy decoration-indigo-300 underline-offset-4">
                                {currentSlide === slides.length - 1 ? 'Oyuna Başla!' : 'Devam Et >'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LessonSlide;
