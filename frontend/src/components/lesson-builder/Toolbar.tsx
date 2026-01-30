import React from 'react';
import { MousePointer2, Type, StickyNote, Square, Circle as CircleIcon, Code, Image as ImageIcon, Video } from 'lucide-react';

interface ToolbarProps {
    onDragStart: (e: React.DragEvent, type: string, extraData?: any) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onDragStart }) => {
    return (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 bg-white p-3 rounded-3xl shadow-xl border-2 border-gray-100">
            <div className="p-3 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-400 flex justify-center mb-2"><MousePointer2 className="w-6 h-6" /></div>
            {[
                { id: 'text', icon: Type }, { id: 'sticky', icon: StickyNote },
                { id: 'shape', icon: Square, extra: { shapeType: 'rectangle' } }, { id: 'circle', icon: CircleIcon, typeOverride: 'shape', extra: { shapeType: 'circle' } },
                { id: 'code', icon: Code }, { id: 'image', icon: ImageIcon }, { id: 'video', icon: Video }
            ].map(tool => (
                <div key={tool.id} draggable onDragStart={(e) => onDragStart(e, tool.typeOverride || tool.id, tool.extra)} className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-b-4 cursor-grab active:cursor-grabbing hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-gray-600 border-gray-200 bg-white">
                    <tool.icon className="w-6 h-6" />
                </div>
            ))}
        </div>
    );
};

export default Toolbar;
