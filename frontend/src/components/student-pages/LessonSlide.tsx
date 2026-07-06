import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, Play, Terminal, BookOpen, X, Check } from 'lucide-react';
import CodeWidget from '../lesson-builder/CodeWidget';

interface LessonSlideProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    lessonTitle?: string;
    slides?: any[];
}

const getElementStyle = (el: any, scale: number): React.CSSProperties => {
    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${(el.x / 1280) * 100}%`,
        top: `${(el.y / 720) * 100}%`,
        width: `${(el.width / 1280) * 100}%`,
        height: `${(el.height / 720) * 100}%`,
        transform: `rotate(${el.rotation || 0}deg)`,
        backgroundColor: el.style?.backgroundColor || 'transparent',
        borderColor: el.style?.borderColor || 'transparent',
        borderWidth: el.style?.borderWidth ? `${el.style.borderWidth * scale}px` : '0px',
        borderStyle: el.style?.borderWidth ? 'solid' : 'none',
        borderRadius: el.style?.borderRadius ? `${el.style.borderRadius * scale}px` : '0px',
        color: el.style?.color || '#000000',
        fontSize: el.style?.fontSize ? `${el.style.fontSize * scale}px` : undefined,
        fontFamily: el.style?.fontFamily || 'Inter, sans-serif',
        fontWeight: el.style?.bold ? 'bold' : 'normal',
        fontStyle: el.style?.italic ? 'italic' : 'normal',
        textDecoration: el.style?.underline ? 'underline' : 'none',
        opacity: el.style?.opacity !== undefined ? el.style.opacity : 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: el.type === 'text' ? '0px' : '8px',
        boxSizing: 'border-box',
    };
    return style;
};

const LessonSlide: React.FC<LessonSlideProps> = ({ isOpen, onClose, onComplete, lessonTitle, slides = [] }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
    const [codeOutputs, setCodeOutputs] = useState<Record<string, string[]>>({});
    const [isRunningCode, setIsRunningCode] = useState<Record<string, boolean>>({});
    const [selectedChoices, setSelectedChoices] = useState<Record<string, string[]>>({});
    const [submittedQuizzes, setSubmittedQuizzes] = useState<Record<string, boolean>>({});

    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    // Reset slide navigation when loading a new lesson
    useEffect(() => {
        if (isOpen) {
            setCurrentSlide(0);
            setCodeInputs({});
            setCodeOutputs({});
            setIsRunningCode({});
            setSelectedChoices({});
            setSubmittedQuizzes({});
        }
    }, [isOpen]);

    // Measure screen scale factor relative to 1280 base width
    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setScale(rect.width / 1280);
            }
        };
        if (isOpen) {
            setTimeout(updateScale, 100); // Wait for open transition
        }
        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [isOpen, currentSlide]);

    if (!isOpen) return null;

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

    const runCode = (widgetId: string, codeString: string) => {
        setIsRunningCode(prev => ({ ...prev, [widgetId]: true }));
        setCodeOutputs(prev => ({ ...prev, [widgetId]: [] }));

        setTimeout(() => {
            setIsRunningCode(prev => ({ ...prev, [widgetId]: false }));
            let mockOutput = ['> Program başarıyla çalıştırıldı.'];
            
            // Basic print statement mock executor
            if (codeString.includes('print(')) {
                const match = codeString.match(/print\((['"])(.*?)\1\)/);
                if (match && match[2]) {
                    mockOutput = [`> ${match[2]}`];
                }
            }
            setCodeOutputs(prev => ({ ...prev, [widgetId]: mockOutput }));
        }, 1000);
    };

    const handleSelectOption = (widgetId: string, optionId: string, multipleCorrect: boolean) => {
        setSelectedChoices(prev => {
            const current = prev[widgetId] || [];
            if (multipleCorrect) {
                if (current.includes(optionId)) {
                    return { ...prev, [widgetId]: current.filter(id => id !== optionId) };
                } else {
                    return { ...prev, [widgetId]: [...current, optionId] };
                }
            } else {
                return { ...prev, [widgetId]: [optionId] };
            }
        });
    };

    const handleCheckQuiz = (widgetId: string) => {
        setSubmittedQuizzes(prev => ({ ...prev, [widgetId]: true }));
    };

    const renderWidget = (el: any) => {
        switch (el.type) {
            case 'text':
                return (
                    <div 
                        className="w-full h-full select-text overflow-hidden" 
                        dangerouslySetInnerHTML={{ __html: el.content || '' }} 
                    />
                );
            case 'image':
                return (
                    <img 
                        src={el.src || el.imageUrl} 
                        alt="Slide Image" 
                        className="w-full h-full object-contain pointer-events-none" 
                    />
                );
            case 'video':
                return (
                    <div className="w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden">
                        <iframe
                            src={el.videoUrl?.replace("watch?v=", "embed/")}
                            className="w-full h-full border-none"
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                            title="Video widget"
                        />
                    </div>
                );
            case 'shape':
                return (
                    <div 
                        className="w-full h-full" 
                        style={{ 
                            borderRadius: el.shapeType === 'circle' ? '50%' : undefined,
                            border: el.style?.borderWidth ? `${el.style.borderWidth * scale}px solid ${el.style.borderColor || '#000'}` : 'none',
                            backgroundColor: el.style?.backgroundColor || 'transparent'
                        }} 
                    />
                );
            case 'sticky':
                return (
                    <div 
                        className="w-full h-full p-4 shadow-md text-gray-800 leading-relaxed font-handwriting select-text"
                        style={{
                            backgroundColor: el.style?.backgroundColor || '#fef08a',
                            borderRadius: '4px',
                            fontSize: el.style?.fontSize ? `${el.style.fontSize * scale}px` : `${18 * scale}px`,
                            border: '1px solid rgba(0,0,0,0.05)'
                        }}
                    >
                        {el.content}
                    </div>
                );
            case 'code':
            case 'code_editor':
                return (
                    <CodeWidget
                        el={{
                            ...el,
                            style: {
                                ...el.style,
                                fontSize: (el.style?.fontSize || 14) * scale
                            },
                            content: codeInputs[el.id] !== undefined ? codeInputs[el.id] : (el.content || '')
                        }}
                        isEditing={false}
                        updateElement={(id, updates) => {
                            if (updates.content !== undefined) {
                                setCodeInputs(prev => ({ ...prev, [id]: updates.content }));
                            }
                        }}
                        setEditingElementId={() => {}}
                        handleMouseDown={() => {}}
                        readOnly={el.type === 'code'}
                        isPreview={true}
                    />
                );
            case 'multiple_choice': {
                const opts = el.extra?.options || [];
                const submitted = submittedQuizzes[el.id] || false;
                const selected = selectedChoices[el.id] || [];
                const multipleCorrect = el.extra?.multipleCorrect || false;
                
                const correctOptionIds = opts.filter((o: any) => o.isCorrect).map((o: any) => o.id);
                const isAnswerCorrect = selected.length === correctOptionIds.length && selected.every(id => correctOptionIds.includes(id));
                
                return (
                    <div 
                        className="w-full h-full p-4 rounded-xl flex flex-col justify-between border-2 select-none"
                        style={{
                            backgroundColor: el.style?.backgroundColor || 'rgba(255,255,255,0.9)',
                            borderColor: el.style?.borderColor || '#e5e7eb',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
                        }}
                    >
                        <div className="text-left font-bold text-gray-800 mb-2 leading-snug" style={{ fontSize: `${16 * scale}px` }}>
                            {el.content || 'Soru?'}
                        </div>
                        <div className="flex-1 flex flex-col gap-2 justify-center">
                            {opts.map((opt: any) => {
                                const isSelected = selected.includes(opt.id);
                                const showCorrect = submitted && opt.isCorrect;
                                const showWrong = submitted && isSelected && !opt.isCorrect;
                                
                                return (
                                    <button
                                        key={opt.id}
                                        disabled={submitted}
                                        onClick={() => handleSelectOption(el.id, opt.id, multipleCorrect)}
                                        className={`w-full py-2 px-3 rounded-lg border-2 text-left transition-all flex items-center justify-between gap-2
                                            ${showCorrect ? 'bg-green-100 border-green-500 text-green-800' :
                                              showWrong ? 'bg-red-100 border-red-500 text-red-800' :
                                              isSelected ? 'bg-indigo-50 border-indigo-500 text-indigo-800 font-semibold' :
                                              'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                                            }`}
                                        style={{ fontSize: `${12 * scale}px` }}
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-black text-gray-400 mr-1">{opt.id}.</span>
                                            <span>{opt.text}</span>
                                        </div>
                                        {showCorrect && <Check className="w-4 h-4 text-green-600 shrink-0" />}
                                        {showWrong && <X className="w-4 h-4 text-red-600 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                        {!submitted ? (
                            <button
                                onClick={() => handleCheckQuiz(el.id)}
                                disabled={selected.length === 0}
                                className={`w-full py-2 rounded-lg font-black text-xs uppercase tracking-wider text-center transition-all mt-2
                                    ${selected.length > 0 
                                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md active:translate-y-0.5' 
                                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                            >
                                Cevabı Kontrol Et
                            </button>
                        ) : (
                            <div className="flex items-center gap-1 justify-center mt-2 font-black text-[11px] uppercase tracking-wide">
                                {isAnswerCorrect ? (
                                    <span className="text-green-600">✓ Harika! Doğru Cevap</span>
                                ) : (
                                    <span className="text-red-600">✗ Yanlış Cevap, Tekrar Dene</span>
                                )}
                            </div>
                        )}
                    </div>
                );
            }
            default:
                return null;
        }
    };

    const renderSlideContent = () => {
        if (!slides || slides.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center text-center p-8">
                    <BookOpen className="w-16 h-16 text-indigo-500 mb-4 animate-bounce" />
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Ders İçeriği Boş</h2>
                    <p className="text-gray-600">Bu ders için henüz slayt eklenmemiş.</p>
                </div>
            );
        }

        const slide = slides[currentSlide];

        return (
            <div 
                ref={containerRef}
                className="relative w-full h-full max-w-full max-h-full overflow-hidden select-text bg-transparent"
                style={{ 
                    aspectRatio: '16/9'
                }}
            >
                {/* SVG Connections Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                    <defs>
                        <marker id="arrow-head" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                            <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
                        </marker>
                    </defs>
                    {slide.elements?.filter((el: any) => el.type === 'arrow' && el.arrowConfig).map((el: any) => {
                        const start = el.arrowConfig.start || { x: 0, y: 0 };
                        const end = el.arrowConfig.end || { x: 0, y: 0 };
                        return (
                            <line
                                key={el.id}
                                x1={`${(start.x / 1280) * 100}%`}
                                y1={`${(start.y / 720) * 100}%`}
                                x2={`${(end.x / 1280) * 100}%`}
                                y2={`${(end.y / 720) * 100}%`}
                                stroke={el.style?.color || '#4b5563'}
                                strokeWidth={(el.style?.borderWidth || 3) * scale}
                                markerEnd="url(#arrow-head)"
                            />
                        );
                    })}
                </svg>

                {/* Elements */}
                {slide.elements?.filter((el: any) => el.type !== 'arrow').map((el: any) => (
                    <div
                        key={el.id}
                        style={getElementStyle(el, scale)}
                    >
                        {renderWidget(el)}
                    </div>
                ))}
            </div>
        );
    };

    const slide = slides && slides.length > 0 ? slides[currentSlide] : null;
    const isDark = slide?.background === 'dark';

    return (
        <div 
            className="fixed inset-0 z-[100] flex flex-col animate-in fade-in duration-300 select-none"
            style={{ 
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                backgroundImage: isDark ? 'radial-gradient(#374151 1px, transparent 1px)' : 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '20px 20px',
            }}
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-8 z-50 w-14 h-14 bg-red-100 text-red-500 hover:bg-red-200 hover:scale-110 flex items-center justify-center rounded-sm shadow-md transition-all duration-300 transform rotate-3"
                title="Kapat"
            >
                <X className="w-8 h-8 font-bold" />
            </button>

            <div className="flex-1 flex items-center justify-center p-8 md:p-16 relative overflow-hidden">
                <div className="w-full max-w-7xl mx-auto h-full flex items-center justify-center">
                    {renderSlideContent()}
                </div>
            </div>

            <div className="h-20 px-12 flex items-center justify-between relative shrink-0 pb-6 select-none bg-transparent">
                <button
                    onClick={handlePrev}
                    disabled={currentSlide === 0}
                    className={`group flex items-center gap-2 transition-transform hover:-translate-x-1 ${currentSlide === 0 ? 'opacity-30 cursor-default' : 'cursor-pointer'}`}
                >
                    <span className="font-handwriting text-3xl font-bold text-gray-500 group-hover:text-gray-800">
                        {'<'} Geri
                    </span>
                </button>

                <div className="flex gap-3">
                    {slides?.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentSlide(idx)}
                            className={`w-3.5 h-3.5 rounded-full border-2 border-gray-400 transition-all ${idx === currentSlide ? 'bg-gray-600 scale-110' : 'bg-transparent'}`}
                        />
                    ))}
                </div>

                <button
                    onClick={handleNext}
                    className="group flex items-center gap-3 cursor-pointer transition-transform hover:translate-x-1"
                >
                    <span className="font-handwriting text-4xl font-black text-indigo-600 group-hover:text-indigo-700 underline decoration-wavy decoration-indigo-300 underline-offset-4">
                        {currentSlide === (slides?.length || 1) - 1 ? 'Dersi Bitir!' : 'Devam Et >'}
                    </span>
                </button>
            </div>
        </div>
    );
};

export default LessonSlide;
