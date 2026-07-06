import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import CanvasElement from '../lesson-builder/CanvasElement';
import ConnectorRenderer from '../lesson-builder/ConnectorRenderer';
import GameBuilder from '../lesson-builder/GameBuilder';

interface LessonSlideProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    lessonTitle?: string;
    slides?: any[];
}

const LessonSlide: React.FC<LessonSlideProps> = ({ isOpen, onClose, onComplete, lessonTitle, slides = [] }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [localSlides, setLocalSlides] = useState<any[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Deep copy slides on open/load
    useEffect(() => {
        if (isOpen) {
            setCurrentSlide(0);
            if (slides && slides.length > 0) {
                setLocalSlides(JSON.parse(JSON.stringify(slides)));
            } else {
                setLocalSlides([]);
            }
        }
    }, [isOpen, slides]);

    // Measure container size factor relative to 1280x720 base width/height
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                const scaleX = rect.width / 1280;
                const scaleY = rect.height / 720;
                const idealScale = Math.max(0.1, Math.min(scaleX, scaleY, 1));
                setScale(parseFloat(idealScale.toFixed(3)));
            }
        };
        if (isOpen) {
            setTimeout(updateScale, 100); // Wait for transition
        }
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [isOpen, currentSlide, localSlides]);

    if (!isOpen) return null;

    const handleNext = () => {
        if (currentSlide < localSlides.length - 1) {
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

    const updateElement = (id: string, updates: any) => {
        setLocalSlides(prev => prev.map((s, idx) => {
            if (idx === currentSlide) {
                return {
                    ...s,
                    elements: s.elements.map((el: any) => el.id === id ? { ...el, ...updates } : el)
                };
            }
            return s;
        }));
    };

    const spawnCodeEditorForChallenge = (challengeId: string, x: number, y: number, height: number) => {
        const codeEditorId = Date.now().toString() + Math.random().toString().slice(2, 5);
        const newCodeEditor = {
            id: codeEditorId,
            type: 'code_editor' as const,
            x: x,
            y: y,
            width: 450,
            height: height,
            rotation: 0,
            content: '# Kodlama Görevi\n# Çözümünüzü buraya yazın\n',
            style: { fontSize: 14, fontFamily: 'Fira Code' }
        };

        setLocalSlides(prev => prev.map((s, idx) => {
            if (idx === currentSlide) {
                const updatedElements = s.elements.map((el: any) => {
                    if (el.id === challengeId) {
                        return {
                            ...el,
                            extra: {
                                ...el.extra,
                                linkedCodeEditorId: codeEditorId,
                                activeTab: 'code'
                            }
                        };
                    }
                    return el;
                });
                return { ...s, elements: [...updatedElements, newCodeEditor] };
            }
            return s;
        }));
    };

    const renderSlideContent = () => {
        if (!localSlides || localSlides.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-8 select-text">
                    <BookOpen className="w-16 h-16 text-indigo-500 mb-4 animate-bounce" />
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Ders İçeriği Boş</h2>
                    <p className="text-gray-600">Bu ders için henüz slayt eklenmemiş.</p>
                </div>
            );
        }

        const slide = localSlides[currentSlide];

        if (slide.type === 'game') {
            return (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden bg-gray-50 rounded-2xl border-2 border-gray-100 shadow-md p-6">
                    <GameBuilder
                        slide={slide}
                        updateSlide={(updates) => {
                            setLocalSlides(prev => prev.map(s => s.id === slide.id ? { ...s, ...updates } : s));
                        }}
                        isPreview={true}
                        previewRole="student"
                        onExitPreview={handleNext}
                    />
                </div>
            );
        }

        return (
            <div 
                ref={containerRef}
                className="w-full h-full flex items-center justify-center relative overflow-hidden select-text bg-transparent"
                style={{ 
                    aspectRatio: '16/9'
                }}
            >
                {/* Scaled Canvas Wrapper matching builder */}
                <div
                    className={`shadow-2xl relative transition-transform duration-200 origin-center select-none rounded-sm ${slide.background === 'notebook' ? 'bg-notebook-pattern pl-16' : ''}`}
                    style={{
                        width: '1280px',
                        height: '720px',
                        transform: `scale(${scale})`,
                        backgroundColor: slide.backgroundColor || '#ffffff'
                    }}
                >
                    {slide.background !== 'notebook' && (
                        <div className="absolute inset-0 opacity-[0.1] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#94a3b8 2px, transparent 2px)', backgroundSize: '24px 24px' }} />
                    )}

                    {slide.background === 'notebook' && (
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-[#3e3e3e] border-r border-gray-900/10 flex flex-col justify-evenly py-4 z-0 shadow-xl">
                            <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-l from-black/20 to-transparent"></div>
                            {Array.from({ length: 12 }).map((_, i) => (
                                <div key={i} className="relative w-full h-8 flex items-center justify-center shrink-0">
                                    <div className="w-16 h-3 bg-gradient-to-b from-gray-300 via-gray-100 to-gray-400 rounded-full shadow-lg transform -rotate-2 z-20 -ml-8"></div>
                                    <div className="absolute right-[-4px] w-2 h-2 bg-black/30 rounded-full blur-[1px]"></div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* CONNECTOR LAYER */}
                    <ConnectorRenderer
                        connections={slide.connections || []}
                        elements={slide.elements}
                    />

                    {/* ELEMENTS */}
                    {slide.elements?.map((el: any) => (
                        <CanvasElement
                            key={el.id}
                            el={el}
                            isEditing={false}
                            setEditingElementId={() => {}}
                            updateElement={updateElement}
                            updateElementStyle={() => {}}
                            deleteElement={() => {}}
                            handleMouseDown={() => {}}
                            isPreview={true}
                            previewRole="student"
                            elements={slide.elements}
                            onSpawnCodeEditor={spawnCodeEditorForChallenge}
                            allLessons={[]}
                        />
                    ))}
                </div>
            </div>
        );
    };

    const slide = localSlides && localSlides.length > 0 ? localSlides[currentSlide] : null;
    const isDark = slide?.background === 'dark';
    const isGameSlide = slide?.type === 'game';

    return (
        <div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center animate-in fade-in duration-300 select-none overflow-hidden"
            style={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                backgroundImage: isDark ? 'radial-gradient(#374151 1px, transparent 1px)' : 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '20px 20px',
            }}
        >
            {/* Close Button */}
            <button
                onClick={onClose}
                className="absolute top-6 right-8 z-50 w-12 h-12 bg-white/80 hover:bg-white border-2 border-gray-150 text-gray-500 hover:text-gray-800 flex items-center justify-center rounded-full shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                title="Kapat"
            >
                <X className="w-6 h-6 stroke-[3]" />
            </button>

            {/* Full Screen Slide Content */}
            <div className="absolute inset-0 flex items-center justify-center p-6 pb-24 z-10">
                {renderSlideContent()}
            </div>

            {/* Small Floating Bottom Navigation Overlay (Floating Island) */}
            {!isGameSlide && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-5 bg-white/70 backdrop-blur-md border border-gray-200/40 rounded-full px-4 py-2 shadow-xl select-none pointer-events-auto">
                    <button
                        onClick={handlePrev}
                        disabled={currentSlide === 0}
                        className={`group flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-full font-black text-[10px] uppercase tracking-wider text-gray-500 bg-white shadow-sm hover:border-gray-300 hover:text-gray-800 active:translate-y-[1px] transition-all duration-75 ${
                            currentSlide === 0 ? 'opacity-30 pointer-events-none' : 'cursor-pointer'
                        }`}
                    >
                        <ChevronLeft className="w-3.5 h-3.5 stroke-[3] group-hover:-translate-x-0.5 transition-transform" />
                        <span>Geri</span>
                    </button>

                    <div className="flex gap-2 items-center">
                        {localSlides?.map((_, idx) => {
                            const isActive = idx === currentSlide;
                            return (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentSlide(idx)}
                                    className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                                        isActive 
                                            ? 'w-6 bg-indigo-600 shadow-sm shadow-indigo-150' 
                                            : 'w-2 bg-gray-200 hover:bg-gray-400'
                                    }`}
                                />
                            );
                        })}
                    </div>

                    <button
                        onClick={handleNext}
                        className={`group flex items-center gap-1.5 px-4 py-2 text-white rounded-full font-black text-[10px] uppercase tracking-wider transition-all duration-75 cursor-pointer border-b-[3px] active:border-b-[1px] active:translate-y-[2px] shadow-md ${
                            currentSlide === (localSlides?.length || 1) - 1
                                ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-400 hover:border-emerald-500 shadow-emerald-100'
                                : 'bg-indigo-600 border-indigo-700 hover:bg-indigo-500 hover:border-indigo-600 shadow-indigo-100'
                        }`}
                    >
                        {currentSlide === (localSlides?.length || 1) - 1 ? (
                            <>
                                <span>Dersi Bitir</span>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </>
                        ) : (
                            <>
                                <span>Devam Et</span>
                                <ChevronRight className="w-3.5 h-3.5 stroke-[3] group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default LessonSlide;
