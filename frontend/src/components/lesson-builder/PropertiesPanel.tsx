import React from 'react';
import { X } from 'lucide-react';
import type { SlideElement } from './types';
import CodeSettingsPanel from './CodeSettingsPanel';

interface PropertiesPanelProps {
    selectedElementIds: string[];
    elements: SlideElement[];
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    onClose: () => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
    selectedElementIds,
    elements,
    updateElement,
    onClose
}) => {
    // Determine what to show based on selection
    if (selectedElementIds.length === 0) return null;

    // For now, only handle single selection for detailed properties
    const selectedId = selectedElementIds[0];
    const element = elements.find(el => el.id === selectedId);

    if (!element || element.type !== 'code') return null;

    return (
        <div className="absolute right-0 top-0 h-full w-72 bg-white border-l border-gray-200 shadow-2xl z-[50] animate-slide-in-right">
            {/* Header */}
            <div className="h-12 border-b border-gray-100 flex items-center justify-between px-4 bg-white">
                <span className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                    Kod Özellikleri
                </span>
                <button
                    onClick={onClose}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <CodeSettingsPanel element={element} updateElement={updateElement} />
            </div>
        </div>
    );
};

export default PropertiesPanel;
