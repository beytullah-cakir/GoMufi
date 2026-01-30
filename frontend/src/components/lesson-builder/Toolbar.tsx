import React from 'react';
import {
    MousePointer2, Pencil, Type, FileText, Square, Circle, Code, Image as ImageIcon, Video, Upload,
    PenTool, Highlighter, Eraser, StickyNote, Circle as CircleIcon
} from 'lucide-react';

interface ToolbarProps {
    activeTool: 'select' | 'draw';
    setTool: (t: 'select' | 'draw') => void;
    onDragStart: (e: React.DragEvent, type: string, extraData?: any) => void;
    brushColor: string;
    setBrushColor: (c: string) => void;
    brushSize: number;
    setBrushSize: (s: number) => void;
    brushType: 'pen' | 'highlighter' | 'eraser';
    setBrushType: (t: 'pen' | 'highlighter' | 'eraser') => void;
}

const COLORS = ['#1f2937', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

const Toolbar: React.FC<ToolbarProps> = ({
    activeTool, setTool, onDragStart,
    brushColor, setBrushColor, brushSize, setBrushSize,
    brushType, setBrushType
}) => {
    return (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 bg-white p-3 rounded-3xl shadow-xl border-2 border-gray-100">
            {/* Tools */}
            <div className="flex flex-col gap-2 mb-2 pb-2 border-b-2 border-gray-100">
                <button
                    onClick={() => setTool('select')}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${activeTool === 'select' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}`}
                >
                    <MousePointer2 className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setTool('draw')}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${activeTool === 'draw' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <Pencil className="w-6 h-6" />
                </button>
            </div>

            {/* Draggables */}
            {[
                { id: 'text', icon: Type }, { id: 'sticky', icon: StickyNote },
                { id: 'shape', icon: Square, extra: { shapeType: 'rectangle' } }, { id: 'circle', icon: CircleIcon, typeOverride: 'shape', extra: { shapeType: 'circle' } },
                { id: 'code', icon: Code }, { id: 'image', icon: ImageIcon }, { id: 'video', icon: Video }
            ].map(tool => (
                <div key={tool.id} draggable onDragStart={(e) => onDragStart(e, tool.typeOverride || tool.id, tool.extra)} className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-b-4 cursor-grab active:cursor-grabbing hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-gray-600 border-gray-200 bg-white">
                    <tool.icon className="w-6 h-6" />
                </div>
            ))}
            {/* Brush Settings Menu (Floating) */}
            {activeTool === 'draw' && (
                <div className="absolute left-[calc(100%+16px)] top-0 bg-white p-4 rounded-3xl shadow-xl border-2 border-gray-100 flex flex-col gap-4 w-48 animate-in slide-in-from-left-2 fade-in duration-200 z-50">

                    {/* Brush Types */}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        {[
                            { id: 'pen', icon: PenTool },
                            { id: 'highlighter', icon: Highlighter },
                            { id: 'eraser', icon: Eraser }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setBrushType(t.id as any)}
                                className={`flex-1 h-8 flex items-center justify-center rounded-lg transition-all ${brushType === t.id ? 'bg-white shadow text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <t.icon className="w-4 h-4" />
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 font-bold ml-1 mb-2 block tracking-wider">THICKNESS</label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 h-8 bg-gray-100 rounded-lg relative flex items-center px-2">
                                <input
                                    type="range"
                                    min="2"
                                    max="20"
                                    value={brushSize}
                                    onChange={(e) => setBrushSize(parseInt(e.target.value))}
                                    className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                />
                            </div>
                            <div className="w-8 h-8 rounded-full bg-gray-100/50 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                                {brushSize}
                            </div>
                        </div>
                    </div>

                    <div className="h-[1px] bg-gray-100 w-full" />

                    <div>
                        <label className="text-xs text-gray-400 font-bold ml-1 mb-2 block tracking-wider">COLOR</label>
                        <div className="grid grid-cols-4 gap-2">
                            {COLORS.map(c => (
                                <button
                                    key={c}
                                    onClick={() => setBrushColor(c)}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${brushColor === c ? 'border-indigo-500 scale-110 shadow-md' : 'border-transparent hover:scale-105'} flex items-center justify-center`}
                                    style={{ backgroundColor: c }}
                                >
                                    {c === '#ffffff' && <div className="w-full h-full border border-gray-200 rounded-full" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Toolbar;
