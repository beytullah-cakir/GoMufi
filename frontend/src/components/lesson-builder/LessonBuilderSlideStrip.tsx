import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import SlideThumbnail from './SlideThumbnail';
import type { Slide } from './types';

interface LessonBuilderSlideStripProps {
    slides: Slide[];
    currentSlideId: number | string;
    setCurrentSlideId: (id: number | string) => void;
    onAddSlide: () => void;
    onDeleteSlide: (e: React.MouseEvent, id: number | string) => void;
    onReorderSlides: (slides: Slide[]) => void;
}

const LessonBuilderSlideStrip: React.FC<LessonBuilderSlideStripProps> = ({
    slides,
    currentSlideId,
    setCurrentSlideId,
    onAddSlide,
    onDeleteSlide,
    onReorderSlides
}) => {
    const [draggedIndex, setDraggedIndex] = React.useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Make the drag transparent/ghostly
        e.currentTarget.classList.add('opacity-50');
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedIndex(null);
        e.currentTarget.classList.remove('opacity-50');
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === dropIndex) return;

        const newSlides = [...slides];
        const [movedSlide] = newSlides.splice(draggedIndex, 1);
        newSlides.splice(dropIndex, 0, movedSlide);

        onReorderSlides(newSlides);
        setDraggedIndex(null);
    };

    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-4 p-3 bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-x-auto max-w-[70vw] items-center custom-scrollbar"
        >
            {slides.map((s, idx) => (
                <div
                    key={s.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => setCurrentSlideId(s.id)}
                    className={`
                    w-40 h-[5.5rem] rounded-xl border-2 cursor-pointer relative group transition-all shrink-0 overflow-hidden
                    ${currentSlideId === s.id ? 'border-indigo-500 ring-4 ring-indigo-500/20 scale-105 z-10' : 'border-gray-200 hover:border-indigo-300 hover:scale-102'}
                    ${draggedIndex === idx ? 'opacity-40 border-dashed border-indigo-400' : 'bg-white'}
                    flex items-center justify-center
                `}
                >
                    <SlideThumbnail slide={s} width={160} height={90} />

                    {/* Index Badge */}
                    <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md text-[10px] font-black pointer-events-none transition-colors
                        ${currentSlideId === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}
                    `}>
                        {idx + 1}
                    </div>

                    {/* Delete Slide Button */}
                    <button
                        onClick={(e) => onDeleteSlide(e, s.id)}
                        className="absolute top-1 right-1 p-1.5 bg-red-50 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        title="Delete Slide"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Active Indicator Overlay */}
                    {currentSlideId === s.id && (
                        <div className="absolute inset-0 border-[3px] border-indigo-500 rounded-xl pointer-events-none"></div>
                    )}
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
