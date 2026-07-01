import React from 'react';
import { Minus, Plus as PlusIcon } from 'lucide-react';

interface LessonBuilderZoomControlsProps {
    scale: number;
    setScale: React.Dispatch<React.SetStateAction<number>>;
}

const LessonBuilderZoomControls: React.FC<LessonBuilderZoomControlsProps> = ({ scale, setScale }) => {
    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 z-50 flex items-center bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-2 gap-2"
        >
            <button onClick={() => setScale(s => Math.max(0.2, s - 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <Minus className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 px-2">
                <input
                    type="range"
                    min="20"
                    max="220"
                    value={Math.round((scale / 0.9) * 100)}
                    onChange={(e) => setScale((parseInt(e.target.value) / 100) * 0.9)}
                    className="w-24 h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <span className="text-xs font-black w-10 text-right text-gray-800 tabular-nums">{Math.round((scale / 0.9) * 100)}%</span>
            </div>

            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-lg text-gray-600 transition-colors">
                <PlusIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export default LessonBuilderZoomControls;
