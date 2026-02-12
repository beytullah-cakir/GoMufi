import React from 'react';
import type { Slide, SlideElement } from './types';
import { Image as ImageIcon, Video as VideoIcon, Check } from 'lucide-react';

interface SlideThumbnailProps {
    slide: Slide;
    width?: number;
    height?: number;
}

const SlideThumbnail: React.FC<SlideThumbnailProps> = ({ slide, width = 128, height = 72 }) => {
    // We assume a virtual canvas size of roughly 1920x1080 for scaling purposes
    // or calculate bounding box. For simplicity, let's use a fixed scale based on 1600x900.
    // 128px width / 1600px = 0.08 scale.

    const BASE_WIDTH = 1280;
    const scale = width / BASE_WIDTH;
    const baseHeight = height / scale; // Maintain aspect ratio of container

    return (
        <div
            className="relative bg-white overflow-hidden pointer-events-none select-none"
            style={{
                width: width,
                height: height,
            }}
        >
            <div
                className={`absolute top-0 left-0 origin-top-left ${slide.background === 'notebook' ? 'bg-notebook-pattern pl-16' : ''}`}
                style={{
                    width: BASE_WIDTH,
                    height: baseHeight,
                    transform: `scale(${scale})`,
                    backgroundColor: slide.backgroundColor || '#ffffff'
                }}
            >
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
                {slide.type === 'game' && slide.gameConfig?.questions?.[0] ? (
                    <div className="w-full h-full flex items-center justify-center p-8 relative overflow-hidden">
                        <div className="w-[850px] bg-white rounded-[32px] shadow-xl border border-gray-200 overflow-hidden p-8 relative">
                            {/* Header */}
                            <div className="w-full flex justify-between items-center mb-6 px-2 relative z-10 shrink-0">
                                <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center opacity-50">
                                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </div>
                                <div className="flex-1 mx-6 h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                    <div className="h-full bg-purple-500 w-full opacity-30"></div>
                                </div>
                                <div className="text-3xl font-black text-gray-400 font-display w-16 text-right">
                                    1/{slide.gameConfig.questions.length || 1}
                                </div>
                            </div>

                            {/* Question */}
                            <div className="flex justify-center mb-8 w-full px-2">
                                <div className="bg-white border-2 border-gray-200 border-b-4 rounded-3xl p-6 shadow-sm text-center w-full">
                                    <span className="text-gray-400 font-bold text-lg uppercase tracking-widest block mb-2">BÖLÜM 1</span>
                                    <h1 className="text-4xl font-black text-gray-700 font-display text-center line-clamp-2 leading-tight" dangerouslySetInnerHTML={{ __html: slide.gameConfig.questions[0].text || 'Yeni Soru' }}></h1>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="grid grid-cols-2 gap-4 w-full px-2">
                                {slide.gameConfig.questions[0].options?.map((opt: any, i: number) => {
                                    const colors = [
                                        { bg: 'bg-red-500', border: 'border-red-700', box: 'bg-red-700', text: 'text-white' },
                                        { bg: 'bg-blue-500', border: 'border-blue-700', box: 'bg-blue-700', text: 'text-white' },
                                        { bg: 'bg-yellow-400', border: 'border-yellow-600', box: 'bg-yellow-600', text: 'text-white' },
                                        { bg: 'bg-green-500', border: 'border-green-700', box: 'bg-green-700', text: 'text-white' }
                                    ];
                                    const color = colors[i % 4];

                                    return (
                                        <div key={i} className={`${color.bg} border-b-[8px] ${color.border} rounded-2xl flex items-center p-3 gap-3 overflow-hidden relative opacity-100 h-24`}>
                                            <div className={`w-14 h-14 ${color.box} rounded-xl flex items-center justify-center shadow-inner text-2xl font-black text-white font-display shrink-0`}>
                                                {['A', 'B', 'C', 'D'][i]}
                                            </div>
                                            <span className={`text-2xl font-black ${color.text} font-display truncate leading-tight flex-1`}>{opt.text || `Seçenek ${i + 1}`}</span>

                                            {opt.isCorrect && (
                                                <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white text-green-500 shadow-lg flex items-center justify-center">
                                                    <Check size={20} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) || (
                                        <>
                                            <div className="h-24 bg-red-500 border-b-[8px] border-red-700 rounded-2xl opacity-50"></div>
                                            <div className="h-24 bg-blue-500 border-b-[8px] border-blue-700 rounded-2xl opacity-50"></div>
                                            <div className="h-24 bg-yellow-400 border-b-[8px] border-yellow-600 rounded-2xl opacity-50"></div>
                                            <div className="h-24 bg-green-500 border-b-[8px] border-green-700 rounded-2xl opacity-50"></div>
                                        </>
                                    )}
                            </div>
                        </div>
                    </div>
                ) : slide.type === 'coding' ? (
                    <div className="w-full h-full flex p-8 gap-4 bg-[#f5f5f7]">
                        {/* Left: Code */}
                        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col gap-2">
                            <div className="w-16 h-2 bg-gray-100 rounded-full" />
                            <div className="w-24 h-2 bg-gray-100 rounded-full" />
                            <div className="w-20 h-2 bg-gray-100 rounded-full" />
                            <div className="w-32 h-2 bg-gray-100 rounded-full" />
                        </div>
                        {/* Right: Terminal */}
                        <div className="w-1/3 bg-[#1e1e1e] rounded-xl shadow-sm p-4 flex flex-col gap-2">
                            <div className="w-full h-2 bg-green-900/50 rounded-full" />
                            <div className="w-2/3 h-2 bg-green-900/50 rounded-full" />
                        </div>
                    </div>
                ) : (
                    slide.elements.map(el => (
                        <ThumbnailElement key={el.id} el={el} />
                    ))
                )}
            </div >
        </div >
    );
};

const ThumbnailElement: React.FC<{ el: SlideElement }> = ({ el }) => {
    const style: React.CSSProperties = {
        position: 'absolute',
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        transform: `rotate(${el.rotation || 0}deg)`,
        opacity: el.style?.opacity ?? 1,
        // Basic Styles
        backgroundColor: el.style?.backgroundColor || 'transparent',
        borderColor: el.style?.borderColor || 'transparent',
        borderWidth: el.style?.borderWidth ? `${el.style.borderWidth}px` : '0px',
        borderStyle: el.type === 'image' && !el.src ? 'dashed' : 'solid',
        borderRadius: el.style?.borderRadius ? `${el.style.borderRadius}px` : '0px',
        color: el.style?.color || 'black',
        // Text Styles (Simplified)
        fontSize: el.style?.fontSize,
        textAlign: el.style?.textAlign as any,
        display: 'flex',
        alignItems: el.style?.verticalAlign === 'top' ? 'flex-start' : el.style?.verticalAlign === 'bottom' ? 'flex-end' : 'center',
        justifyContent: el.style?.textAlign === 'center' ? 'center' : el.style?.textAlign === 'right' ? 'flex-end' : 'flex-start',
        overflow: 'hidden',
        whiteSpace: 'nowrap'
    };

    if (el.type === 'text') {
        return (
            <div style={style} className="overflow-hidden">
                <span dangerouslySetInnerHTML={{ __html: el.content }} style={{ transformOrigin: 'left top' }} />
            </div>
        );
    }

    if (el.type === 'sticky') {
        return (
            <div style={{ ...style, flexDirection: 'column', padding: '10px' }} className="shadow-sm">
                <span dangerouslySetInnerHTML={{ __html: el.content }} style={{ fontSize: '0.8em' }} />
            </div>
        );
    }

    if (el.type === 'shape') {
        return (
            <div style={{
                ...style,
                borderRadius: el.shapeType === 'circle' ? '50%' : style.borderRadius,
                borderWidth: el.style?.borderWidth || 4,
                borderColor: el.style?.borderColor || 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px'
            }}>
                <span dangerouslySetInnerHTML={{ __html: el.content }} style={{ fontSize: '0.8em', width: '100%', textAlign: 'center' }} />
            </div>
        );
    }

    if (el.type === 'image') {
        return (
            <div style={style}>
                {el.src ?
                    <img src={el.src} className="w-full h-full object-cover" /> :
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                        <ImageIcon size={48} />
                    </div>
                }
            </div>
        );
    }

    if (el.type === 'video') {
        return (
            <div style={style} className="bg-gray-900 flex items-center justify-center">
                <VideoIcon size={48} className="text-white/50" />
            </div>
        );
    }

    if (el.type === 'code') {
        return (
            <div style={{ ...style, backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '10px', fontFamily: 'monospace' }}>
                <div className="flex gap-1 mb-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-xs opacity-50">Code...</div>
            </div>
        );
    }

    if (el.type === 'draw') {
        return (
            <div style={{ ...style, pointerEvents: 'none' }}>
                <svg className="w-full h-full overflow-visible">
                    <path
                        d={el.content}
                        fill="none"
                        stroke={el.style?.borderColor || '#1f2937'}
                        strokeWidth={el.style?.borderWidth || 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>
        );
    }

    if (el.type === 'arrow' && el.arrowConfig) {
        // Simplified arrow for thumbnail
        const { start, end } = el.arrowConfig;
        return (
            <div style={{
                position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none',
                transform: `translate(${el.x}px, ${el.y}px)`
            }}>
                <svg className="overflow-visible">
                    <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} stroke={el.style?.color || '#374151'} strokeWidth={el.style?.borderWidth || 4} />
                </svg>
            </div>
        );
    }

    return null;
};

export default SlideThumbnail;
