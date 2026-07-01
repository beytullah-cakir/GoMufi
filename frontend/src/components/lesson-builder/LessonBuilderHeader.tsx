import React from 'react';
import { Home, Undo, Redo, Copy, Clipboard, CheckCircle2, Loader2, Play, Rocket, Cloud, Sparkles, Circle, Triangle, Hexagon, Pencil, Save } from 'lucide-react';

interface LessonBuilderHeaderProps {
    onExit: () => void;
    projectName: string;
    setProjectName: (name: string) => void;
    saveStatus: 'saved' | 'saving';
    onSave: () => void;
    activeStage: 'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET' | 'QUIZ' | 'ÖDEV';
    setActiveStage: (stage: 'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET' | 'QUIZ' | 'ÖDEV') => void;
    onUndo: () => void;
    onRedo: () => void;
    onCopy: () => void;
    onPaste: () => void;
    isPreview: boolean;
    setIsPreview: (v: boolean) => void;
    previewRole?: 'student' | 'teacher';
    setPreviewRole?: (v: 'student' | 'teacher') => void;
    isStageLocked?: boolean;
}

const stages = [
    { id: 'ANLA', label: 'ANLA', color: 'rgb(217, 70, 239)', desc: 'Öğrenci konuyu ilk kez kavrar.' },
    { id: 'UYGULA', label: 'UYGULA', color: 'rgb(6, 182, 212)', desc: 'Öğrenci öğrendiklerini dener.' },
    { id: 'BİRLEŞTİR', label: 'BİRLEŞTİR', color: 'rgb(34, 197, 94)', desc: 'Önceki bilgilerle bağlantı kurar.' },
    { id: 'ÜRET', label: 'ÜRET', color: 'rgb(234, 179, 8)', desc: 'Öğrenci kendi çıktısını üretir.' },
    { id: 'QUIZ', label: 'QUİZ', color: 'rgb(249, 115, 22)', desc: 'Konu anlama değerlendirme sınavı.' },
    { id: 'ÖDEV', label: 'ÖDEV', color: 'rgb(37, 99, 235)', desc: 'Ders pekiştirme ödev teslimi.' }
] as const;

const LessonBuilderHeader: React.FC<LessonBuilderHeaderProps> = ({
    onExit,
    projectName,
    setProjectName,
    saveStatus,
    onSave,
    activeStage,
    setActiveStage,
    onUndo,
    onRedo,
    onCopy,
    onPaste,
    isPreview,
    setIsPreview,
    previewRole = 'student',
    setPreviewRole,
    isStageLocked = false
}) => {
    const getHeaderStyles = () => {
        if (activeStage === 'ANLA') return 'from-fuchsia-600 to-pink-600 border-fuchsia-800';
        if (activeStage === 'UYGULA') return 'from-cyan-500 to-blue-600 border-cyan-800';
        if (activeStage === 'BİRLEŞTİR') return 'from-emerald-500 to-green-600 border-emerald-700';
        if (activeStage === 'QUIZ') return 'from-orange-500 to-amber-600 border-orange-700';
        if (activeStage === 'ÖDEV') return 'from-blue-600 to-indigo-600 border-blue-800';
        return 'from-amber-500 to-yellow-600 border-amber-700';
    };

    const getStageTextColor = () => {
        if (activeStage === 'ANLA') return 'text-fuchsia-600';
        if (activeStage === 'UYGULA') return 'text-cyan-600';
        if (activeStage === 'BİRLEŞTİR') return 'text-emerald-600';
        if (activeStage === 'QUIZ') return 'text-orange-600';
        if (activeStage === 'ÖDEV') return 'text-blue-600';
        return 'text-amber-600';
    };

    return (
        <>
            {/* GLOBAL BUILDER BAR (Themed like ContentPage Box) */}
            <div className={`h-20 bg-gradient-to-r ${getHeaderStyles()} border-b-4 flex items-center justify-between px-6 z-50 shrink-0 shadow-2xl relative overflow-hidden`} onMouseDown={(e) => e.stopPropagation()}>

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
                        <button onClick={onUndo} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-indigo-100 hover:text-white transition-all" title="Geri Al">
                            <Undo className="w-4 h-4" />
                        </button>
                        <button onClick={onRedo} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-indigo-100 hover:text-white transition-all" title="İleri Al">
                            <Redo className="w-4 h-4" />
                        </button>
                        <div className="w-px h-5 bg-white/10 mx-1"></div>
                        <button onClick={onCopy} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-indigo-100 hover:text-white transition-all" title="Kopyala">
                            <Copy className="w-4 h-4" />
                        </button>
                        <button onClick={onPaste} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-indigo-100 hover:text-white transition-all" title="Yapıştır">
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

                    {isPreview && (
                        <button
                            onClick={() => setPreviewRole?.(previewRole === 'student' ? 'teacher' : 'student')}
                            className={`flex items-center gap-2 px-4 py-2 border font-extrabold rounded-xl transition-all hover:scale-105 active:scale-95 text-xs uppercase tracking-tight shadow-md mr-2 ${
                                previewRole === 'teacher'
                                    ? 'bg-amber-500 border-amber-600 text-white hover:bg-amber-600'
                                    : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                            }`}
                        >
                            <span>{previewRole === 'teacher' ? '👨‍🏫 ÖĞRETMEN ÖNİZLEMESİ' : '🎓 ÖĞRENCİ ÖNİZLEMESİ'}</span>
                        </button>
                    )}

                    <button
                        onClick={() => setIsPreview(!isPreview)}
                        className={`flex items-center gap-2 px-4 py-2 border font-bold rounded-xl transition-all hover:scale-105 active:scale-95 text-sm uppercase tracking-tight
                            ${isPreview
                                ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                                : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
                            }`}
                    >
                        {isPreview ? <Pencil className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                        <span>{isPreview ? 'Düzenle' : 'Önizle'}</span>
                    </button>

                    <button
                        onClick={onSave}
                        className={`flex items-center gap-2 px-5 py-2.5 bg-white ${getStageTextColor()} font-black rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.1)] hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] hover:translate-y-[2px] transition-all text-sm uppercase tracking-wide group`}
                    >
                        <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        <span>Kaydet</span>
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
                                onClick={() => !isStageLocked && setActiveStage(stage.id)}
                                style={{
                                    backgroundColor: isActive ? stage.color : 'transparent',
                                    color: isActive ? 'white' : '#64748b'
                                }}
                                className={`
                                    relative group flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all duration-300
                                    ${isActive ? 'shadow-md shadow-indigo-500/20 scale-[1.02] font-black' : isStageLocked ? 'opacity-40 cursor-not-allowed font-bold' : 'hover:bg-indigo-50/80 font-bold'}
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
