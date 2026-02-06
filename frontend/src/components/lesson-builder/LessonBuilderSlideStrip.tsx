import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { Slide } from './types';

interface LessonBuilderSlideStripProps {
    slides: Slide[];
    currentSlideId: number;
    setCurrentSlideId: (id: number) => void;
    onAddSlide: () => void;
    onDeleteSlide: (e: React.MouseEvent, id: number) => void;
}

const LessonBuilderSlideStrip: React.FC<LessonBuilderSlideStripProps> = ({
    slides,
    currentSlideId,
    setCurrentSlideId,
    onAddSlide,
    onDeleteSlide
}) => {
    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 p-2 bg-white/90 backdrop-blur rounded-2xl shadow-2xl border border-gray-200 overflow-x-auto max-w-[60vw]"
        >
            {slides.map((s, idx) => (
                <div
                    key={s.id}
                    onClick={() => setCurrentSlideId(s.id)}
                    className={`
                    w-32 h-20 rounded-xl border-2 cursor-pointer relative group transition-all shrink-0
                    ${currentSlideId === s.id ? 'border-indigo-500 shadow-indigo-200 shadow-lg scale-105 z-10' : 'border-gray-200 hover:border-gray-300 hover:scale-102'}
                    bg-white flex items-center justify-center overflow-hidden
                `}
                >
                    <span className={`text-2xl font-black ${currentSlideId === s.id ? 'text-indigo-100' : 'text-gray-100'}`}>{idx + 1}</span>
                    {/* Mini Preview (Simulated with element count) */}
                    <div className="absolute inset-0 flex flex-wrap gap-0.5 p-1 content-start opacity-30">
                        {s.elements.slice(0, 5).map(e => (
                            <div key={e.id} className="w-2 h-2 rounded-full bg-gray-400" />
                        ))}
                    </div>

                    {/* Delete Slide Button */}
                    <button
                        onClick={(e) => onDeleteSlide(e, s.id)}
                        className="absolute top-1 right-1 p-1 bg-red-100 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>
                </div>
            ))}
            <button
                onClick={onAddSlide}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 transition-all shrink-0"
            >
                <Plus className="w-6 h-6" />
                <span className="text-xs font-bold">New</span>
            </button>
        </div>
    );
};

export default LessonBuilderSlideStrip;
