import React from 'react';
import { Home, Undo, Redo, Copy, Clipboard, CheckCircle2, Loader2, Play, Rocket, Cloud, Sparkles, Circle, Triangle, Hexagon } from 'lucide-react';

interface LessonBuilderHeaderProps {
    onExit: () => void;
    projectName: string;
    setProjectName: (name: string) => void;
    saveStatus: 'saved' | 'saving';
    onSave: () => void;
    activeStage: 'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET';
    setActiveStage: (stage: 'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET') => void;
}

const stages = [
    { id: 'ANLA', label: 'ANLA', color: 'rgb(217, 70, 239)', desc: 'Öğrenci konuyu ilk kez kavrar.' },
    { id: 'UYGULA', label: 'UYGULA', color: 'rgb(6, 182, 212)', desc: 'Öğrenci öğrendiklerini dener.' },
    { id: 'BİRLEŞTİR', label: 'BİRLEŞTİR', color: 'rgb(34, 197, 94)', desc: 'Önceki bilgilerle bağlantı kurar.' },
    { id: 'ÜRET', label: 'ÜRET', color: 'rgb(234, 179, 8)', desc: 'Öğrenci kendi çıktısını üretir.' }
] as const;

const LessonBuilderHeader: React.FC<LessonBuilderHeaderProps> = ({
    onExit,
    projectName,
    setProjectName,
    saveStatus,
    onSave,
    activeStage,
    setActiveStage
}) => {
    return (
        <>
            {/* GLOBAL BUILDER BAR (Themed like ContentPage Box) */}
            <div className="h-20 bg-gradient-to-r from-indigo-600 to-violet-600 border-b-4 border-indigo-800 flex items-center justify-between px-6 z-50 shrink-0 shadow-2xl relative overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>

                {/* Decorative Background Elements */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <Cloud className="absolute top-[-10px] left-96 text-white/10 transform -rotate-12" size={80} />
                    <Cloud className="absolute -bottom-8 right-1/4 text-white/5 transform rotate-12" size={60} />
                    <Sparkles className="absolute top-4 right-1/3 text-yellow-300/20 animate-pulse" size={24} />
                    <Circle className="absolute top-1/2 left-1/4 text-white/5" size={16} />
                    <Triangle className="absolute bottom-2 left-32 text-white/10 transform rotate-45" size={20} />
                    <Hexagon className="absolute top-2 right-10 text-white/10" size={40} />

                    {/* Decorative Dots */}
                    <div className="absolute top-10 left-1/3 w-1.5 h-1.5 bg-white/30 rounded-full"></div>
                    <div className="absolute bottom-4 right-1/2 w-2 h-2 bg-white/10 rounded-full"></div>
                </div>

                {/* LEFT: Back & Project Info */}
                <div className="flex items-center gap-4 relative z-10">
                    <button onClick={onExit} className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white hover:scale-105 transition-all shadow-sm">
                        <Home className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-px bg-indigo-400/50"></div>
                    <div className="flex flex-col">
                        <input
                            type="text"
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="font-black text-white text-xl leading-none bg-transparent hover:bg-white/10 focus:bg-white/20 transition-colors rounded px-2 -ml-2 focus:outline-none focus:ring-2 focus:ring-white/30 w-64 placeholder-indigo-200"
                        />
                        <span className="text-xs font-bold text-indigo-200 px-0.5 mt-1 tracking-wide uppercase opacity-80">Ders Oluşturucu</span>
                    </div>
                </div>

                {/* RIGHT: Actions (Undo/Redo/Clipboard) + Save/Publish */}
                <div className="flex items-center gap-4 relative z-10">
                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-1 bg-black/20 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-lg mr-4">
                        <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-indigo-100 hover:text-white transition-all" title="Geri Al">
                            <Undo className="w-4 h-4" />
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-indigo-100 hover:text-white transition-all" title="İleri Al">
                            <Redo className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-white/10 mx-1"></div>
                        <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-indigo-100 hover:text-white transition-all" title="Kopyala">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-indigo-100 hover:text-white transition-all" title="Yapıştır">
                            <Clipboard className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Auto Save Status */}
                    <div className="flex items-center gap-2 text-indigo-200 pr-4 border-r border-indigo-500/30">
                        {saveStatus === 'saved' ? (
                            <>
                                <CheckCircle2 className="w-4 h-4 text-green-400" />
                                <span className="text-xs font-bold text-green-100">Kaydedildi</span>
                            </>
                        ) : (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin text-white" />
                                <span className="text-xs font-bold text-white">Kaydediliyor...</span>
                            </>
                        )}
                    </div>

                    <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 text-white font-bold rounded-xl transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-tight">
                        <Play className="w-4 h-4 fill-current" />
                        <span>Önizle</span>
                    </button>

                    <button
                        onClick={onSave}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 font-black rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.1)] hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] hover:translate-y-[2px] transition-all text-sm uppercase tracking-wide group"
                    >
                        <Rocket className="w-4 h-4 group-hover:animate-bounce" />
                        <span>Yayınla</span>
                    </button>
                </div>
            </div>

            {/* STAGE INDICATOR (Unified Sub-menu Design) */}
            <div className="absolute left-0 right-0 top-20 z-40 flex justify-start pl-8 pointer-events-none">
                <div className="pointer-events-auto bg-white/90 backdrop-blur-xl px-1.5 py-1.5 rounded-b-xl shadow-lg border-b border-x border-indigo-50/50 flex items-center gap-1.5 -mt-[1px] animate-in slide-in-from-top-2 duration-300">
                    {stages.map((stage) => {
                        const isActive = activeStage === stage.id;
                        return (
                            <button
                                key={stage.id}
                                onClick={() => setActiveStage(stage.id)}
                                style={{
                                    backgroundColor: isActive ? stage.color : 'transparent',
                                    color: isActive ? 'white' : '#64748b'
                                }}
                                className={`
                                    relative group flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-300
                                    ${isActive ? 'shadow-md shadow-indigo-500/20 scale-[1.02] font-black' : 'hover:bg-indigo-50/80 font-bold'}
                                `}
                            >
                                {/* Indicator Dot */}
                                <div
                                    className={`w-2 h-2 rounded-full border-[2px] transition-colors duration-300`}
                                    style={{
                                        backgroundColor: isActive ? 'white' : 'transparent',
                                        borderColor: isActive ? 'white' : '#cbd5e1'
                                    }}
                                ></div>

                                <span className="text-xs tracking-wider leading-none uppercase">{stage.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
};

export default LessonBuilderHeader;
