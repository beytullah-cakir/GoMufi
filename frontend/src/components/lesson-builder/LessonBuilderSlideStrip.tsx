import React from 'react';
import { Trash2, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const scrollRef = React.useRef<HTMLDivElement>(null);
    const currentIndex = slides.findIndex((s) => s.id === currentSlideId);

    // Dikey tekerlek yatay kaydırmaya çevrilir. Native listener + passive:false
    // şart: React'in onWheel'i pasif bağlanabildiği için preventDefault orada
    // sessizce yok sayılır ve arkadaki tuval kayardı.
    React.useEffect(() => {
        const box = scrollRef.current;
        if (!box) return;

        const onWheel = (e: WheelEvent) => {
            if (e.ctrlKey) return; // Ctrl+tekerlek tuval yakınlaştırması, ona dokunma
            const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            if (!delta) return;
            const max = box.scrollWidth - box.clientWidth;
            if (max <= 0) return;
            e.preventDefault();
            box.scrollLeft = Math.min(max, Math.max(0, box.scrollLeft + delta));
        };

        box.addEventListener('wheel', onWheel, { passive: false });
        return () => box.removeEventListener('wheel', onWheel);
    }, []);

    // Seçili slayt şeridin dışında kalmışsa görünüre kaydır — AI 10 slayt ürettiğinde
    // ya da klavyeyle gezerken aktif slaytın kaybolmaması için.
    React.useEffect(() => {
        const box = scrollRef.current;
        const item = box?.querySelector<HTMLElement>(
            `[data-slide-id="${CSS.escape(String(currentSlideId))}"]`
        );
        if (!box || !item) return;

        const left = item.offsetLeft;
        const right = left + item.offsetWidth;
        if (left < box.scrollLeft) {
            box.scrollTo({ left: left - 16, behavior: 'smooth' });
        } else if (right > box.scrollLeft + box.clientWidth) {
            box.scrollTo({ left: right - box.clientWidth + 16, behavior: 'smooth' });
        }
    }, [currentSlideId, slides.length]);

    // Oklar şeridi kaydırmaz, SLAYT DEĞİŞTİRİR. Şeridin kendisi zaten tekerlek ve
    // kaydırma çubuğuyla geziliyor; yeni seçilen slaydı yukarıdaki efekt görünüre alır.
    const goToAdjacent = (dir: 1 | -1) => {
        const next = currentIndex + dir;
        if (currentIndex < 0 || next < 0 || next >= slides.length) return;
        setCurrentSlideId(slides[next].id);
    };

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
            className="absolute bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-0.5 p-1.5 bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl border border-white/20 max-w-[calc(100vw-3rem)]"
        >
            {slides.length > 1 && (
                <button
                    onClick={() => goToAdjacent(-1)}
                    disabled={currentIndex <= 0}
                    aria-label="Önceki slayt"
                    title="Önceki slayt"
                    className="shrink-0 p-1 rounded-md text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-gray-500"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
            )}

            {/* Kaydırma yalnızca bu iç katmanda. Dış sarmalayıcı taşmasız kalmalı,
                aksi halde seçili slaydın scale-105'i kutunun kenarında kırpılıyor.

                Genişlik AYNI ANDA 4 slayt gösterecek şekilde sabit:
                4 x w-28 (112px) + 3 x gap-3 (12px) + px-2 (2 x 8px) = 500px.
                Gerisi kaydırılır; şerit ekranı kaplayacak kadar uzamaz.
                Dar ekranda `max-w-full` ile sarmalayıcının içinde küçülür. */}
            <div
                ref={scrollRef}
                className="flex items-center gap-3 overflow-x-auto slide-strip-scroll py-1.5 px-2 w-[500px] max-w-full min-w-0"
            >
            {slides.map((s, idx) => (
                <div
                    key={s.id}
                    data-slide-id={s.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => setCurrentSlideId(s.id)}
                    className={`
                    w-28 h-[63px] rounded-lg border-2 cursor-pointer relative group transition-all shrink-0 overflow-hidden
                    ${currentSlideId === s.id ? 'border-indigo-500 ring-2 ring-indigo-500/25 scale-105 z-10' : 'border-gray-200 hover:border-indigo-300 hover:scale-102'}
                    ${draggedIndex === idx ? 'opacity-40 border-dashed border-indigo-400' : 'bg-white'}
                    flex items-center justify-center
                `}
                >
                    {/* 112x63 tam 16:9 — SlideThumbnail 1280 tabanlı ölçekler, oran bozulmasın. */}
                    <SlideThumbnail slide={s} width={112} height={63} />

                    {/* Index Badge */}
                    <div className={`absolute bottom-0.5 right-0.5 px-1 py-0 rounded text-[9px] font-black pointer-events-none transition-colors
                        ${currentSlideId === s.id ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}
                    `}>
                        {idx + 1}
                    </div>

                    {/* Delete Slide Button */}
                    <button
                        onClick={(e) => onDeleteSlide(e, s.id)}
                        className="absolute top-0.5 right-0.5 p-1 bg-red-50 text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white"
                        title="Delete Slide"
                    >
                        <Trash2 className="w-3 h-3" />
                    </button>

                    {/* Active Indicator Overlay */}
                    {currentSlideId === s.id && (
                        <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg pointer-events-none"></div>
                    )}
                </div>
            ))}
            <button
                onClick={onAddSlide}
                className="w-14 h-[63px] rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:text-indigo-500 hover:border-indigo-300 hover:bg-indigo-50 transition-all shrink-0"
            >
                <Plus className="w-4 h-4" />
                <span className="text-[9px] font-bold">New</span>
            </button>
            </div>

            {slides.length > 1 && (
                <button
                    onClick={() => goToAdjacent(1)}
                    disabled={currentIndex < 0 || currentIndex >= slides.length - 1}
                    aria-label="Sonraki slayt"
                    title="Sonraki slayt"
                    className="shrink-0 p-1 rounded-md text-gray-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-25 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-gray-500"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
};

export default LessonBuilderSlideStrip;
