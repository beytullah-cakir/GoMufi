import React from 'react';
import type { SlideElement } from './types';
import { Eye, EyeOff, Lock, Unlock, GripVertical } from 'lucide-react';

interface LayersPanelProps {
    elements: SlideElement[];
    selectedIds: string[];
    onSelect: (id: string, multi: boolean) => void;
    onReorder: (dragIndex: number, hoverIndex: number) => void;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ elements, selectedIds, onSelect }) => {
    // Reverse elements for display so Top layer is at Top of list
    const displayElements = [...elements].reverse();

    return (
        <div className="absolute right-0 top-[60px] bottom-0 w-64 bg-white dark:bg-[#1e1e1e] border-l border-gray-200 dark:border-gray-700 shadow-xl flex flex-col z-[50]">
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-200">
                Layers
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {displayElements.map((el, index) => {
                    // Note: index in displayElements is reversed. 
                    // Original index = elements.length - 1 - index

                    const isSelected = selectedIds.includes(el.id);
                    let icon = <div className="w-4 h-4 bg-gray-300 rounded" />;
                    if (el.type === 'text') icon = <span className="text-xs font-serif">T</span>;
                    if (el.type === 'image') icon = <span className="text-xs">IMG</span>;
                    if (el.type === 'shape') icon = <span className="text-xs">□</span>;

                    return (
                        <div
                            key={el.id}
                            onClick={(e) => onSelect(el.id, e.ctrlKey || e.metaKey)}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer select-none text-sm group ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'}`}
                        >
                            <GripVertical className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 cursor-grab" />
                            <div className="w-5 h-5 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded text-gray-500">
                                {icon}
                            </div>
                            <span className="flex-1 truncate">{el.content || el.type}</span>

                            <button className="opacity-0 group-hover:opacity-100 hover:text-gray-900 p-1">
                                <Lock className="w-3 h-3" />
                            </button>
                            <button className="opacity-0 group-hover:opacity-100 hover:text-gray-900 p-1">
                                <Eye className="w-3 h-3" />
                            </button>
                        </div>
                    );
                })}
                {displayElements.length === 0 && (
                    <div className="text-center text-gray-400 text-xs py-4">
                        No elements
                    </div>
                )}
            </div>
        </div>
    );
};

export default LayersPanel;
