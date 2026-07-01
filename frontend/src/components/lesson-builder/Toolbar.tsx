import React, { useState } from 'react';
import {
    MousePointer2, Pencil, Type, Square, Code, Image as ImageIcon, Video,
    PenTool, Highlighter, Eraser, StickyNote, CircleIcon, Link as LinkIcon, ArrowRight, Eye,
    Blocks, X, BookOpen, Layers, Film, GitMerge, Puzzle as LucidePuzzle, Trophy as LucideTrophy, HelpCircle, FolderOpen, Globe, Mic, Laptop
} from 'lucide-react';

interface ToolbarProps {
    activeTool: 'select' | 'draw' | 'connect' | 'code';
    setTool: (t: 'select' | 'draw' | 'connect' | 'code') => void;
    onDragStart: (e: React.DragEvent, type: string, extraData?: any) => void;
    brushColor: string;
    setBrushColor: (c: string) => void;
    brushSize: number;
    setBrushSize: (s: number) => void;
    brushType: 'pen' | 'highlighter' | 'eraser';
    setBrushType: (t: 'pen' | 'highlighter' | 'eraser') => void;
    activeStage: 'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET' | 'QUIZ' | 'ÖDEV';
}

const COLORS = ['#1f2937', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#ffffff'];

const Toolbar: React.FC<ToolbarProps> = ({
    activeTool, setTool, onDragStart,
    brushColor, setBrushColor, brushSize, setBrushSize,
    brushType, setBrushType, activeStage
}) => {
    const [showToolbox, setShowToolbox] = useState(false);

    const getStageColor = () => {
        if (activeStage === 'ANLA') return 'rgb(217, 70, 239)';
        if (activeStage === 'UYGULA') return 'rgb(6, 182, 212)';
        if (activeStage === 'BİRLEŞTİR') return 'rgb(34, 197, 94)';
        if (activeStage === 'QUIZ') return 'rgb(249, 115, 22)';
        if (activeStage === 'ÖDEV') return 'rgb(37, 99, 235)';
        return 'rgb(234, 179, 8)';
    };

    const getGradientClass = () => {
        if (activeStage === 'ANLA') return 'bg-gradient-to-br from-fuchsia-400 to-pink-600 hover:from-fuchsia-500 hover:to-pink-700';
        if (activeStage === 'UYGULA') return 'bg-gradient-to-br from-cyan-400 to-blue-600 hover:from-cyan-500 hover:to-blue-700';
        if (activeStage === 'BİRLEŞTİR') return 'bg-gradient-to-br from-emerald-400 to-green-600 hover:from-emerald-500 hover:to-green-700';
        if (activeStage === 'QUIZ') return 'bg-gradient-to-br from-orange-400 to-amber-600 hover:from-orange-500 hover:to-amber-700';
        if (activeStage === 'ÖDEV') return 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700';
        return 'bg-gradient-to-br from-amber-400 to-yellow-600 hover:from-amber-500 hover:to-yellow-700';
    };

    const stageColor = getStageColor();

    return (
        <div
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-3 bg-white p-3 rounded-3xl shadow-xl border-2 border-gray-100"
        >
            {/* Tools */}
            <div className="flex flex-col gap-2 mb-2 pb-2 border-b-2 border-gray-100">
                <button
                    onClick={() => setTool('select')}
                    title="Select"
                    className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${activeTool === 'select' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'}`}
                >
                    <MousePointer2 className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setTool('draw')}
                    title="Draw"
                    className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${activeTool === 'draw' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <Pencil className="w-6 h-6" />
                </button>

                <button
                    onClick={() => setTool('connect')}
                    title="Connect Objects"
                    className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${activeTool === 'connect' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <LinkIcon className="w-6 h-6" />
                </button>
                <button
                    onClick={() => setTool('code')}
                    title="Code Tool"
                    className={`w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${activeTool === 'code' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                    <Code className="w-6 h-6" />
                </button>

                <button
                    type="button"
                    onClick={() => setShowToolbox(!showToolbox)}
                    title={`${activeStage} Araç Kutusu`}
                    className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 shadow-md hover:scale-105 active:scale-95 border-b-[3px] border-black/15 ${getGradientClass()} ${showToolbox ? 'ring-4 ring-white/40 scale-105 border border-white' : ''}`}
                >
                    <Blocks className="w-6 h-6 text-white drop-shadow-sm" />
                </button>
            </div>

            {/* Draggables */}
            {[
                { id: 'text', icon: Type }, { id: 'sticky', icon: StickyNote },
                { id: 'shape', icon: Square, extra: { shapeType: 'rectangle' } }, { id: 'circle', icon: CircleIcon, typeOverride: 'shape', extra: { shapeType: 'circle' } },
                { id: 'arrow', icon: ArrowRight },
                { id: 'image', icon: ImageIcon }, { id: 'video', icon: Video }
            ].map(tool => (
                <div key={tool.id} draggable onDragStart={(e) => onDragStart(e, tool.typeOverride || tool.id, tool.extra)} className="w-12 h-12 flex items-center justify-center rounded-xl border-2 border-b-4 cursor-grab active:cursor-grabbing hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all text-gray-600 border-gray-200 bg-white">
                    <tool.icon className="w-6 h-6" />
                </div>
            ))}

            {/* Stage-Specific Toolbox (Floating Side Panel) */}
            {showToolbox && (
                <div className="absolute left-[calc(100%+20px)] top-[60px] bg-white/95 backdrop-blur-xl p-5 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.12)] border border-gray-100 flex flex-col gap-4 w-[350px] animate-in slide-in-from-left-4 fade-in duration-200 z-50 cursor-default" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">SEVİYE ELEMANLARI</span>
                            <h3 className="text-base font-black tracking-tight" style={{ color: stageColor }}>
                                {activeStage} Araçları
                            </h3>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowToolbox(false)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 overflow-y-auto max-h-[380px] pr-1">
                        {/* Widgets list based on activeStage */}
                        {activeStage === 'ANLA' && [
                            { id: 'code_inspect', name: 'Kod İncele', desc: 'Öğrencinin inceleyebileceği hazır kod örneği.', type: 'code', icon: Eye, extra: { codeConfig: { language: 'python' }, content: '# Kod İnceleme\n# Bu kodu inceleyip çalıştırabilirsiniz.\n\ndef hello():\n    print("Merhaba GoMufi!")\n\nhello()' } },
                            { id: 'whiteboard', name: 'Beyaz Tahta', desc: 'Formül, çizim ve şekillerle anlatım tahtası.', type: 'whiteboard', icon: Pencil, extra: { content: '' } },
                            { id: 'file', name: 'Dosya', desc: 'Öğrencinin indirebileceği PDF, sunum veya kaynak doküman.', type: 'file', icon: FolderOpen, extra: { content: 'Ders_Kaynak_Dokumani.pdf', src: '' } },
                            { id: 'link', name: 'Link', desc: 'Dış bağlantı, Github veya dokümantasyon linki.', type: 'link', icon: Globe, extra: { content: 'Faydalı Kaynak Bağlantısı', src: 'https://github.com' } },
                            { id: 'speaking_note', name: 'Anlatım Noktası', desc: 'Sadece eğitmenin görebileceği canlı konuşma notu.', type: 'speaking_note', icon: Mic, extra: { content: 'Konuşma Notu\n"Burada konuyu günlük hayattan bir örnekle açıkla."' } }
                        ].map(widget => (
                            <div
                                key={widget.id}
                                draggable
                                onDragStart={(e) => {
                                    onDragStart(e, widget.type, widget.extra);
                                }}
                                className="bg-gray-50/70 hover:bg-white p-3.5 rounded-2xl border border-gray-100 hover:border-fuchsia-200 hover:ring-4 hover:ring-fuchsia-500/5 cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] hover:shadow-md flex flex-col gap-2.5 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-fuchsia-100/70 text-fuchsia-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                        <widget.icon className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-extrabold text-gray-800 text-xs tracking-tight group-hover:text-fuchsia-700 transition-colors">{widget.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{widget.desc}</div>
                                    </div>
                                </div>

                                {/* Conditionally Render Preview based on widget type */}
                                {widget.type === 'code' && (
                                    <div className="bg-[#0f0f0f] border border-black/20 p-3 rounded-xl text-[9px] font-mono leading-relaxed text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner">
                                        <div className="text-gray-500 font-bold mb-0.5"># Read Only</div>
                                        <div><span className="text-pink-400">def</span> <span className="text-blue-400 font-bold">example</span>():</div>
                                        <div className="pl-3.5"><span className="text-emerald-400">pass</span></div>
                                        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
                                    </div>
                                )}
                                {widget.type === 'whiteboard' && (
                                    <div className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-[9px] font-sans text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner flex flex-col justify-between">
                                        <div className="flex items-center justify-between border-b border-slate-200/60 pb-1 mb-1">
                                            <span className="text-[8px] font-bold text-slate-400">TAHTA</span>
                                            <div className="flex gap-1">
                                                <span className="w-1 h-1 rounded-full bg-red-500" />
                                                <span className="w-1 h-1 rounded-full bg-blue-500" />
                                                <span className="w-1 h-1 rounded-full bg-emerald-500" />
                                            </div>
                                        </div>
                                        <div className="flex-1 flex items-center justify-center relative">
                                            <svg className="w-full h-full text-indigo-500/30 overflow-visible" viewBox="0 0 100 25">
                                                <path d="M 10 12 Q 25 2, 40 12 T 70 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                                <text x="75" y="15" className="text-[7px] font-bold fill-indigo-600/40">x + y</text>
                                            </svg>
                                        </div>
                                    </div>
                                )}
                                {widget.type === 'file' && (
                                    <div className="bg-amber-50/70 border border-amber-200 p-2.5 rounded-xl text-[9px] font-sans text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                            <FolderOpen className="w-4.5 h-4.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-extrabold text-slate-800 text-[10px] truncate">Ders_Ozeti.pdf</div>
                                            <div className="text-[8px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">Dosyayı İndir</div>
                                        </div>
                                    </div>
                                )}
                                {widget.type === 'link' && (
                                    <div className="bg-blue-50/70 border border-blue-200 p-2.5 rounded-xl text-[9px] font-sans text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                            <Globe className="w-4.5 h-4.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-extrabold text-slate-800 text-[10px] truncate">Python Kaynakları</div>
                                            <div className="text-[8px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">Bağlantıyı Aç</div>
                                        </div>
                                    </div>
                                )}
                                {widget.type === 'speaking_note' && (
                                    <div className="bg-[#1e1b4b]/5 border border-indigo-200 p-2.5 rounded-xl text-[9px] font-sans text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner flex flex-col justify-between">
                                        <div className="flex items-center gap-1.5 text-indigo-600 border-b border-indigo-100/60 pb-1 mb-1">
                                            <Mic className="w-3.5 h-3.5" />
                                            <span className="text-[8px] font-black uppercase tracking-wider">Konuşma Notu</span>
                                        </div>
                                        <div className="text-[7.5px] font-semibold text-slate-500 truncate leading-normal">"Burada konuyu günlük hayattan bir örnekle açıkla..."</div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {activeStage === 'UYGULA' && [
                            { id: 'code_editor', name: 'Kod Editörü', desc: 'Öğrencinin kod yazıp çalıştırabileceği etkileşimli editör.', type: 'code_editor', icon: Laptop, extra: { content: '# Kodunuzu buraya yazın\nprint("Merhaba Dunya")\n', style: { fontSize: 14, fontFamily: 'Fira Code' } } },
                            { id: 'answer_box', name: 'Cevap Kutusu', desc: 'Öğrencinin kısa cevap, çözüm veya yorum yazabileceği alan.', type: 'answer_box', icon: PenTool, extra: { content: 'Soru: Python\'da listeler ile demetler (tuples) arasındaki fark nedir?', src: '' } },
                            { 
                                id: 'challenge', 
                                name: 'Challenge (Mini Görev)', 
                                desc: 'Öğrencinin metin, kod veya dosya yükleyerek tamamlayabileceği teslim görevi.', 
                                type: 'challenge', 
                                icon: LucideTrophy, 
                                extra: { 
                                    content: '5 dakikada bu fonksiyonu yaz.', 
                                    extra: { 
                                        title: '🎯 Challenge (Mini Görev)', 
                                        submittedText: '', 
                                        submittedCode: '# Çözüm kodunuzu buraya yazın\n', 
                                        submittedFile: '', 
                                        isSubmitted: false 
                                    } 
                                } 
                            }
                        ].map(widget => (
                            <div
                                key={widget.id}
                                draggable
                                onDragStart={(e) => {
                                    onDragStart(e, widget.type, widget.extra);
                                }}
                                className="bg-gray-50/70 hover:bg-white p-3.5 rounded-2xl border border-gray-100 hover:border-cyan-200 hover:ring-4 hover:ring-cyan-500/5 cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col gap-2.5 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-cyan-100/70 text-cyan-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                        <widget.icon className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-extrabold text-gray-800 text-xs tracking-tight group-hover:text-cyan-700 transition-colors">{widget.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{widget.desc}</div>
                                    </div>
                                </div>

                                {/* Conditionally Render Preview based on widget type */}
                                {widget.type === 'code_editor' && (
                                    <div className="bg-[#0f0f0f] border border-black/20 p-3 rounded-xl text-[9px] font-mono leading-relaxed text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner">
                                        <div className="text-gray-500 font-bold mb-0.5"># Etkileşimli</div>
                                        <div><span className="text-pink-400">def</span> <span className="text-blue-400 font-bold">solve</span>():</div>
                                        <div className="pl-3.5"><span className="text-yellow-400">print</span>(<span className="text-green-400">"Uygulama"</span>)</div>
                                        <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-[#0f0f0f] to-transparent" />
                                    </div>
                                )}
                                {widget.type === 'answer_box' && (
                                    <div className="bg-cyan-50/40 border border-cyan-200 p-2.5 rounded-xl text-[9px] font-sans text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner flex flex-col justify-between">
                                        <div className="flex items-center gap-1.5 text-cyan-600 border-b border-cyan-100/50 pb-1 mb-1">
                                            <PenTool className="w-3.5 h-3.5" />
                                            <span className="text-[8px] font-black uppercase tracking-wider">Cevap Kutusu</span>
                                        </div>
                                        <div className="text-[7.5px] font-bold text-slate-700 truncate leading-normal">Soru: Python'da listeler...</div>
                                        <div className="text-[7px] text-slate-400 border border-slate-200 bg-white rounded-md p-1 truncate">Yanıt yazın...</div>
                                    </div>
                                )}
                                {widget.type === 'challenge' && (
                                    <div className="bg-rose-50/40 border border-rose-200 p-2.5 rounded-xl text-[9px] font-sans text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner flex flex-col justify-between">
                                        <div className="flex items-center gap-1.5 text-rose-600 border-b border-rose-100/50 pb-1 mb-1">
                                            <LucideTrophy className="w-3.5 h-3.5" />
                                            <span className="text-[8px] font-black uppercase tracking-wider">Mini Görev</span>
                                        </div>
                                        <div className="text-[7.5px] font-bold text-slate-700 truncate leading-normal">Görev: 5 dakikada...</div>
                                        <div className="text-[7px] text-slate-400 border border-slate-200 bg-white rounded-md p-1 truncate">Metin, Kod veya Dosya</div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {activeStage === 'BİRLEŞTİR' && [
                            { 
                                id: 'connection_task', 
                                name: 'Bağlantı Görevi', 
                                desc: 'Önceki ders konusunu şimdiki konu ile harmanlayan bir bağlantı kurun.', 
                                type: 'connection_task', 
                                icon: GitMerge, 
                                extra: { 
                                    content: 'Function bilgisini kullanarak bir Student Class oluştur.', 
                                    extra: { 
                                        title: 'Bağlantı Görevi (Connection Task)',
                                        previousTopic: 'Function',
                                        currentTopic: 'Class',
                                        submittedAnswer: '',
                                        isSubmitted: false
                                    } 
                                } 
                            }
                        ].map(widget => (
                            <div
                                key={widget.id}
                                draggable
                                onDragStart={(e) => {
                                    onDragStart(e, widget.type, widget.extra);
                                }}
                                className="bg-gray-50/70 hover:bg-white p-3.5 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:ring-4 hover:ring-emerald-500/5 cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col gap-2.5 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                        <widget.icon className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-extrabold text-gray-800 text-xs tracking-tight group-hover:text-emerald-700 transition-colors">{widget.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{widget.desc}</div>
                                    </div>
                                </div>

                                {widget.type === 'connection_task' && (
                                    <div className="bg-emerald-50/40 border border-emerald-200 p-2.5 rounded-xl text-[9px] font-sans text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner flex flex-col justify-between">
                                        <div className="flex items-center gap-1.5 text-emerald-600 border-b border-emerald-100/50 pb-1 mb-1">
                                            <GitMerge className="w-3.5 h-3.5" />
                                            <span className="text-[8px] font-black uppercase tracking-wider">Bağlantı Görevi</span>
                                        </div>
                                        <div className="text-[7.5px] font-bold text-slate-700 truncate leading-normal">Önceki: Function ➔ Şimdiki: Class</div>
                                        <div className="text-[7px] text-slate-400 border border-slate-200 bg-white rounded-md p-1 truncate">Çözümünüzü yazın...</div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {activeStage === 'ÜRET' && [
                            { 
                                id: 'production_task', 
                                name: 'Proje Görevi (Üret)', 
                                desc: 'Öğrencinin belirlenen yönergelere göre özgün bir proje üretmesini isteyin.', 
                                type: 'production_task', 
                                icon: PenTool, 
                                extra: { 
                                    content: 'Student Management System oluştur. İçinde en az 2 Class ve 3 Method bulunmalı.', 
                                    extra: { 
                                        title: 'Proje Görevi (Produce Task)',
                                        projectTitle: 'Student Management System',
                                        expectedOutput: 'İçinde en az 2 Class ve 3 Method bulunmalı.',
                                        estimatedTime: '20 dk',
                                        hints: 'İpucu: Sınıf yapısını kurarken inheritances yapısına dikkat et.',
                                        isSubmitted: false
                                    } 
                                } 
                            }
                        ].map(widget => (
                            <div
                                key={widget.id}
                                draggable
                                onDragStart={(e) => {
                                    onDragStart(e, widget.type, widget.extra);
                                }}
                                className="bg-gray-50/70 hover:bg-white p-3.5 rounded-2xl border border-gray-100 hover:border-amber-200 hover:ring-4 hover:ring-amber-500/5 cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-[1.01] hover:shadow-md flex flex-col gap-2.5 group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-amber-100/70 text-amber-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                                        <widget.icon className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-extrabold text-gray-800 text-xs tracking-tight group-hover:text-amber-700 transition-colors">{widget.name}</div>
                                        <div className="text-[10px] text-gray-400 font-medium leading-tight mt-0.5">{widget.desc}</div>
                                    </div>
                                </div>

                                {widget.type === 'production_task' && (
                                    <div className="bg-amber-50/40 border border-amber-200 p-2.5 rounded-xl text-[9px] font-sans text-left overflow-hidden h-[60px] select-none pointer-events-none relative shadow-inner flex flex-col justify-between">
                                        <div className="flex items-center gap-1.5 text-amber-600 border-b border-amber-100/50 pb-1 mb-1">
                                            <PenTool className="w-3.5 h-3.5" />
                                            <span className="text-[8px] font-black uppercase tracking-wider">Proje Görevi (Üret)</span>
                                        </div>
                                        <div className="text-[7.5px] font-bold text-slate-700 truncate leading-normal">SMS Projesi / 20 dk</div>
                                        <div className="text-[7px] text-slate-400 border border-slate-200 bg-white rounded-md p-1 truncate">Metin, Kod veya Dosya</div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {activeStage !== 'ANLA' && activeStage !== 'UYGULA' && activeStage !== 'BİRLEŞTİR' && activeStage !== 'ÜRET' && (
                            <div className="flex flex-col items-center justify-center py-12 px-5 border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/40 text-center animate-in fade-in duration-300">
                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 shadow-inner transition-colors duration-300" style={{ backgroundColor: `${stageColor}15`, color: stageColor }}>
                                    <Blocks className="w-6 h-6 animate-pulse" />
                                </div>
                                <h4 className="font-extrabold text-gray-800 text-sm tracking-tight">Araç Kutusu Hazır</h4>
                                <p className="text-[10px] text-gray-400 font-medium leading-relaxed mt-1 max-w-[200px]">
                                    {activeStage} aşamasına özel araçlarınızı buraya sırasıyla ekleyebilirsiniz.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
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

            {/* Code Tool Menu (Floating) */}
            {activeTool === 'code' && (
                <div className="absolute left-[calc(100%+16px)] top-0 bg-white p-4 rounded-3xl shadow-xl border-2 border-gray-100 flex flex-col gap-4 w-64 animate-in slide-in-from-left-2 fade-in duration-200 z-50">
                    <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Code Widgets</h3>
                    <div className="flex flex-col gap-2">
                        <div
                            draggable
                            onDragStart={(e) => onDragStart(e, 'code')}
                            className="bg-gray-50 p-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 cursor-grab active:cursor-grabbing transition-all group"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-indigo-600 shadow-sm">
                                    <Code className="w-4 h-4" />
                                </div>
                                <span className="font-semibold text-gray-700 text-sm group-hover:text-indigo-700">Basit Kod Parçası</span>
                            </div>
                            <div className="bg-white border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-400 overflow-hidden h-12 relative">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white/50" />
                                print("Hello World")<br />
                                if True:<br />
                                &nbsp;&nbsp;print("Yes")
                            </div>
                        </div>

                        {/* Kod İncele Widget */}
                        <div
                            draggable
                            onDragStart={(e) => onDragStart(e, 'code', { codeConfig: { language: 'python', theme: 'dark' }, content: '# Kod İncele\n# Öğrenci bu kodu değiştiremez\n\ndef incele():\n    print("Bu kod sadece okunabilir")\n    return True\n\nincele()' })}
                            className="bg-gray-50 p-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 hover:bg-indigo-50 cursor-grab active:cursor-grabbing transition-all group"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-indigo-600 shadow-sm">
                                    <Eye className="w-4 h-4" />
                                </div>
                                <span className="font-semibold text-gray-700 text-sm group-hover:text-indigo-700">Kod İncele</span>
                            </div>
                            <div className="bg-gray-900 border border-gray-800 rounded p-2 text-[10px] font-mono text-green-400 overflow-hidden h-12 relative">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/50" />
                                # Read Only<br />
                                def example():<br />
                                &nbsp;&nbsp;pass
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Toolbar;
