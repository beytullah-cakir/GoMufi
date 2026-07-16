import React, { useState, useEffect } from 'react';
import { Gamepad2, LayoutTemplate, X, ChevronRight, Puzzle, Code, PenTool, Layers, Trophy, Trash2, Sparkles, Pencil } from 'lucide-react';
import SlideThumbnail from './SlideThumbnail';
import type { Slide } from './types';
import api from '../../api';

interface AddSlideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSlide: (type: 'normal' | 'game' | 'notebook' | 'coding' | 'template' | 'homework', config?: { gameType?: string; elements?: any[]; background?: string }) => void;
    activeStage: 'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET' | 'QUIZ' | 'ÖDEV';
    stageColor: string;
    isAdmin?: boolean;
}

const MOCK_GAME_SLIDE: Slide = {
    id: 999,
    type: 'game',
    gameType: 'matching',
    elements: [],
    gameConfig: {
        timeLimit: 60,
        questions: [{
            id: 'mock-q-1',
            text: 'Eşleştirme Oyunu',
            options: [
                { id: '1', text: 'Elma', isCorrect: true },
                { id: '2', text: 'Armut', isCorrect: false },
                { id: '3', text: 'Muz', isCorrect: false },
                { id: '4', text: 'Çilek', isCorrect: false },
            ]
        }]
    }
};

const AddSlideModal: React.FC<AddSlideModalProps> = ({ isOpen, onClose, onAddSlide, activeStage, stageColor, isAdmin = false }) => {
    const [activeTab, setActiveTab] = useState<'slide' | 'game' | 'custom_stage' | 'custom_ai' | 'homework'>('slide');
    const [customTemplates, setCustomTemplates] = useState<any[]>([]);

    // Edit Template State
    const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [isSavingEdit, setIsSavingEdit] = useState(false);

    useEffect(() => {
        if (isOpen) {
            api.get('/builder/templates')
                .then(res => {
                    setCustomTemplates(res.data || []);
                })
                .catch(err => {
                    console.error("Failed to load templates", err);
                });
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[650px] overflow-hidden flex animate-in zoom-in-95 duration-200">
                {/* SIDEBAR */}
                <div className="w-64 bg-gray-50 border-r border-gray-100 flex flex-col flex-shrink-0">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-black text-gray-800 font-display">Yeni Slayt</h2>
                        <p className="text-xs text-gray-400 mt-1">İçerik türünü seç</p>
                    </div>
                    <div className="p-2 flex-1 overflow-y-auto flex flex-col gap-1">
                        <button
                            onClick={() => setActiveTab('slide')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors mb-1 ${activeTab === 'slide' ? 'bg-white shadow-sm ring-1 ring-black/5 text-indigo-600 font-bold' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700 font-medium'}`}
                        >
                            <div className="flex items-center gap-3">
                                <LayoutTemplate className="w-5 h-5" />
                                <span className="font-bold text-sm">Slayt Şablonları</span>
                            </div>
                            {activeTab === 'slide' && <ChevronRight className="w-4 h-4 text-indigo-500" />}
                        </button>

                        <button
                            onClick={() => setActiveTab('custom_stage')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 ${activeTab === 'custom_stage' ? 'shadow-md text-white font-bold bg-indigo-600' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700 font-medium'}`}
                            style={{
                                backgroundColor: activeTab === 'custom_stage' ? stageColor : undefined
                            }}
                        >
                            <div className="flex items-center gap-3">
                                <Layers className="w-5 h-5" />
                                <span className="text-sm">{activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Şablonları</span>
                            </div>
                            {activeTab === 'custom_stage' && <ChevronRight className="w-4 h-4 text-white" />}
                        </button>

                        <button
                            onClick={() => setActiveTab('custom_ai')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 ${activeTab === 'custom_ai' ? 'shadow-md text-white font-bold bg-gradient-to-r from-purple-500 to-indigo-500' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700 font-medium'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Sparkles className="w-5 h-5" />
                                <span className="text-sm">{activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} AI Şablonları</span>
                            </div>
                            {activeTab === 'custom_ai' && <ChevronRight className="w-4 h-4 text-white" />}
                        </button>

                        <button
                            onClick={() => setActiveTab('game')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'game' ? 'bg-white shadow-sm ring-1 ring-black/5 text-purple-600 font-bold' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700 font-medium'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Gamepad2 className="w-5 h-5" />
                                <span className="text-sm">Oyun Şablonları</span>
                            </div>
                            {activeTab === 'game' && <ChevronRight className="w-4 h-4 text-purple-500" />}
                        </button>

                        {activeStage === 'ÖDEV' && (
                            <button
                                onClick={() => setActiveTab('homework')}
                                className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'homework' ? 'bg-white shadow-sm ring-1 ring-black/5 text-blue-600 font-bold' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700 font-medium'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <PenTool className="w-5 h-5" />
                                    <span className="text-sm font-bold text-sm">Ödev Şablonları</span>
                                </div>
                                {activeTab === 'homework' && <ChevronRight className="w-4 h-4 text-blue-500" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 bg-white p-8 overflow-y-auto flex flex-col">
                    <div className="flex items-center justify-between mb-8 flex-shrink-0">
                        <h3 className="text-xl font-bold text-gray-800 font-display">
                            {activeTab === 'slide' && 'Genel Slayt Şablonları'}
                            {activeTab === 'custom_stage' && `${activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Seviyesi Şablonları`}
                            {activeTab === 'custom_ai' && `${activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} AI Şablonları`}
                            {activeTab === 'game' && 'Oyun Şablonları'}
                            {activeTab === 'homework' && 'Ödev Şablonları'}
                        </h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-6 auto-rows-max">

                        {/* GENEL SLAYT ŞABLONLARI */}
                        {activeTab === 'slide' && (
                            <>
                                <button
                                    onClick={() => onAddSlide('normal')}
                                    className="text-left group"
                                >
                                    <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative">
                                        <div className="absolute inset-4 bg-white shadow-sm rounded-lg flex items-center justify-center">
                                            <LayoutTemplate className="w-8 h-8 text-gray-200" />
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Boş Slayt Sayfası</h4>
                                        <p className="text-xs text-gray-400 mt-1">Tamamen boş bir tuval ile başla.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => onAddSlide('notebook')}
                                    className="text-left group"
                                >
                                    <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative">
                                        <div className="absolute inset-4 bg-[#fdfbf7] shadow-sm rounded-lg flex items-center overflow-hidden">
                                            <div className="w-4 h-full bg-gray-700 relative border-r border-gray-900/10 flex flex-col justify-around py-2">
                                                {Array.from({ length: 6 }).map((_, i) => (
                                                    <div key={i} className="w-6 h-1 bg-gray-300 rounded-full -ml-1 shadow-sm opacity-80" />
                                                ))}
                                            </div>
                                            <div className="flex-1 h-full opacity-50" style={{
                                                backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px)',
                                                backgroundSize: '100% 12px'
                                            }} />
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Defter Slayt Sayfası</h4>
                                        <p className="text-xs text-gray-400 mt-1">Çizgili defter görünümü.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => onAddSlide('coding')}
                                    className="text-left group"
                                >
                                    <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative">
                                        <div className="absolute inset-4 flex gap-2">
                                            <div className="flex-1 bg-white rounded shadow-sm border border-gray-200 p-2 flex flex-col gap-1">
                                                <div className="w-8 h-1 bg-gray-200 rounded-full" />
                                                <div className="w-12 h-1 bg-gray-200 rounded-full" />
                                                <div className="w-10 h-1 bg-gray-200 rounded-full" />
                                            </div>
                                            <div className="w-1/3 bg-[#1e1e1e] rounded shadow-sm p-2 flex flex-col gap-1">
                                                <div className="w-full h-1 bg-green-900 rounded-full" />
                                                <div className="w-2/3 h-1 bg-green-900 rounded-full" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Kodlama Slaytı</h4>
                                        <p className="text-xs text-gray-400 mt-1">Kod editörü ve terminal çıktısı.</p>
                                    </div>
                                </button>
                            </>
                        )}

                        {/* SEVİYEYE ÖZEL ŞABLONLAR */}
                        {activeTab === 'custom_stage' && (
                            <>
                                {/* ANLA ŞABLONLARI */}
                                {activeStage === 'ANLA' && (
                                    <>
                                        <button
                                            onClick={() => onAddSlide('template', {
                                                elements: [
                                                    { type: 'text', x: 50, y: 40, width: 900, height: 60, content: 'Konu Anlatımı ve Uygulama Tahtası', style: { fontSize: 32, fontFamily: 'Fredoka', bold: true } },
                                                    { type: 'text', x: 50, y: 150, width: 400, height: 350, content: 'Soldaki alanda yer alan teorik bilgileri inceleyin. Sağdaki tahta üzerinde formülleri çizerek pratik yapabilirsiniz.', style: { fontSize: 18, fontFamily: 'Fredoka' } },
                                                    { type: 'whiteboard', x: 480, y: 130, width: 470, height: 380, content: '' }
                                                ]
                                            })}
                                            className="text-left group"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex items-center justify-center p-3">
                                                <div className="w-full h-full bg-white shadow-sm border border-slate-100 rounded-lg flex gap-2 p-2">
                                                    <div className="w-1/3 bg-slate-50 rounded flex flex-col gap-1 p-1">
                                                        <div className="w-8 h-1 bg-slate-200 rounded-full" />
                                                        <div className="w-12 h-1 bg-slate-200 rounded-full" />
                                                    </div>
                                                    <div className="flex-1 border-2 border-dashed border-slate-200 rounded flex items-center justify-center">
                                                        <PenTool className="w-4 h-4 text-slate-300" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="px-1">
                                                <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Teori & Çizim Tahtası</h4>
                                                <p className="text-xs text-gray-400 mt-1">Sol tarafta metin, sağ tarafta beyaz tahta.</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => onAddSlide('template', {
                                                elements: [
                                                    { type: 'text', x: 50, y: 40, width: 900, height: 60, content: 'Örnek Kod Analizi', style: { fontSize: 32, fontFamily: 'Fredoka', bold: true } },
                                                    { type: 'code', x: 50, y: 130, width: 900, height: 380, content: '# Örnek Kod İnceleme\n# Bu kodu çalıştırıp çıktısını inceleyin.\n\ndef hello():\n    print("Merhaba GoMufi!")\n\nhello()\n', codeConfig: { language: 'python' } }
                                                ]
                                            })}
                                            className="text-left group"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex items-center justify-center p-3">
                                                <div className="w-full h-full bg-[#1e1e1e] rounded-lg p-3 flex flex-col gap-2">
                                                    <div className="flex items-center gap-1.5 pb-1.5 border-b border-zinc-800">
                                                        <span className="w-2 h-2 rounded-full bg-red-500" />
                                                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                                    </div>
                                                    <div className="w-12 h-1 bg-zinc-700 rounded-full" />
                                                    <div className="w-24 h-1 bg-zinc-700 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="px-1">
                                                <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Kod Analiz Şablonu</h4>
                                                <p className="text-xs text-gray-400 mt-1">Öğrenci için hazır kod inceleme alanı.</p>
                                            </div>
                                        </button>
                                    </>
                                )}

                                {/* UYGULA ŞABLONLARI */}
                                {activeStage === 'UYGULA' && (
                                    <>
                                        <button
                                            onClick={() => onAddSlide('template', {
                                                elements: [
                                                    { type: 'text', x: 50, y: 40, width: 900, height: 60, content: 'Kodlama Uygulaması', style: { fontSize: 32, fontFamily: 'Fredoka', bold: true } },
                                                    { type: 'code_editor', x: 50, y: 130, width: 900, height: 380, content: '# Kodlama Görevi\n# Problemi çözmek için kodunuzu buraya yazın ve çalıştırın.\n\ndef solve():\n    # Çözümünüzü buraya yazın\n    pass\n', style: { fontSize: 14, fontFamily: 'Fira Code' } }
                                                ]
                                            })}
                                            className="text-left group"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex items-center justify-center p-3">
                                                <div className="w-full h-full bg-[#0f0f0f] border border-zinc-800 rounded-lg p-3 flex flex-col gap-2">
                                                    <div className="flex items-center justify-between border-b border-zinc-800 pb-1">
                                                        <div className="flex items-center gap-1">
                                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                                            <span className="w-2 h-2 rounded-full bg-yellow-500" />
                                                            <span className="w-2 h-2 rounded-full bg-green-500" />
                                                        </div>
                                                        <span className="text-[7px] text-cyan-400 font-extrabold uppercase">ETKİLEŞİMLİ</span>
                                                    </div>
                                                    <div className="w-16 h-1 bg-zinc-800 rounded-full" />
                                                    <div className="w-24 h-1 bg-zinc-800 rounded-full" />
                                                </div>
                                            </div>
                                            <div className="px-1">
                                                <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Kod Editörü Slaytı</h4>
                                                <p className="text-xs text-gray-400 mt-1">Önizlemede yazılabilen Python editörü.</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => onAddSlide('template', {
                                                elements: [
                                                    { type: 'text', x: 50, y: 40, width: 900, height: 60, content: 'Challenge: Mini Görev', style: { fontSize: 32, fontFamily: 'Fredoka', bold: true } },
                                                    { 
                                                        type: 'challenge', 
                                                        x: 100, 
                                                        y: 130, 
                                                        width: 800, 
                                                        height: 380, 
                                                        content: '5 dakikada bu fonksiyonu yaz.', 
                                                        extra: { 
                                                            title: '🎯 Challenge (Mini Görev)', 
                                                            submittedText: '', 
                                                            submittedCode: '# Çözüm kodunuzu buraya yazın\n', 
                                                            submittedFile: '', 
                                                            isSubmitted: false 
                                                        } 
                                                    }
                                                ]
                                            })}
                                            className="text-left group"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex items-center justify-center p-3">
                                                <div className="w-full h-full bg-rose-50/10 border-2 border-dashed border-rose-200 rounded-lg p-3 flex flex-col gap-2 justify-center">
                                                    <div className="flex items-center gap-1 text-rose-500 font-extrabold text-[9px] uppercase"><Trophy className="w-3.5 h-3.5 animate-pulse" /> MINI GÖREV</div>
                                                    <div className="w-2/3 h-2.5 bg-rose-500/10 rounded-full" />
                                                    <div className="w-full h-8 bg-white border border-slate-200 rounded-md" />
                                                </div>
                                            </div>
                                            <div className="px-1">
                                                <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Challenge (Mini Görev)</h4>
                                                <p className="text-xs text-gray-400 mt-1">Öğrencilerin metin, kod veya dosya yükleyebileceği teslimat aracı.</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => onAddSlide('template', {
                                                elements: [
                                                    { type: 'text', x: 50, y: 40, width: 900, height: 60, content: 'Kısa Cevap Etkinliği', style: { fontSize: 32, fontFamily: 'Fredoka', bold: true } },
                                                    { type: 'answer_box', x: 100, y: 140, width: 800, height: 320, content: 'Soru: Nesne Yönelimli Programlama (OOP) kavramındaki "Kalıtım (Inheritance)" nedir? Günlük hayattan bir örnekle açıklayınız.', src: '' }
                                                ]
                                            })}
                                            className="text-left group"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex items-center justify-center p-3">
                                                <div className="w-full h-full bg-cyan-50/10 border-2 border-dashed border-cyan-200 rounded-lg p-3 flex flex-col gap-2 justify-center">
                                                    <div className="w-2/3 h-2.5 bg-cyan-500/10 rounded-full" />
                                                    <div className="w-full h-8 bg-white border border-slate-200 rounded-md" />
                                                </div>
                                            </div>
                                            <div className="px-1">
                                                <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Soru & Cevap Şablonu</h4>
                                                <p className="text-xs text-gray-400 mt-1">Önizlemede öğrencilerin doldurabileceği cevap kutusu.</p>
                                            </div>
                                        </button>
                                    </>
                                )}

                                {/* BİRLEŞTİR ŞABLONLARI */}
                                {activeStage === 'BİRLEŞTİR' && (
                                    <>
                                        <button
                                            onClick={() => onAddSlide('template', {
                                                elements: [
                                                    { type: 'text', x: 50, y: 40, width: 900, height: 60, content: 'Bağlantı Kurma & Birleştirme', style: { fontSize: 32, fontFamily: 'Fredoka', bold: true } },
                                                    { 
                                                        type: 'connection_task', 
                                                        x: 225, 
                                                        y: 130, 
                                                        width: 550, 
                                                        height: 380, 
                                                        rotation: 0,
                                                        content: 'Function bilgisini kullanarak bir Student Class oluştur.', 
                                                        extra: { 
                                                            title: 'Bağlantı Görevi (Connection Task)',
                                                            previousTopic: 'Function',
                                                            currentTopic: 'Class',
                                                            submittedAnswer: '',
                                                            isSubmitted: false
                                                        } 
                                                    }
                                                ]
                                            })}
                                            className="text-left group"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex flex-col items-center justify-center p-4">
                                                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 shadow-sm mb-2 scale-75">
                                                    <div className="bg-white border border-slate-200 rounded p-1 text-[6px] font-black">Function</div>
                                                    <span className="text-[6px] text-emerald-600 font-bold">➔</span>
                                                    <div className="bg-white border border-emerald-300 rounded p-1 text-[6px] font-black text-emerald-600">Class</div>
                                                </div>
                                                <div className="h-6 w-24 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[6px] text-slate-400 font-bold">Çözümünüz...</div>
                                            </div>
                                            <div className="px-1">
                                                <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Bağlantı Görevi Şablonu</h4>
                                                <p className="text-xs text-gray-400 mt-1">Öğrencinin önceki dersle bağ kurmasını sağlayan şablon.</p>
                                            </div>
                                        </button>
                                    </>
                                )}

                                {/* ÜRET ŞABLONLARI */}
                                {activeStage === 'ÜRET' && (
                                    <>
                                        <button
                                            onClick={() => onAddSlide('template', {
                                                elements: [
                                                    { type: 'text', x: 50, y: 30, width: 900, height: 60, content: 'Proje Zamanı & Üretim', style: { fontSize: 32, fontFamily: 'Fredoka', bold: true } },
                                                    { 
                                                        type: 'production_task', 
                                                        x: 210, 
                                                        y: 110, 
                                                        width: 580, 
                                                        height: 420, 
                                                        rotation: 0,
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
                                                ]
                                            })}
                                            className="text-left group"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex flex-col items-center justify-center p-4">
                                                <div className="h-4 w-28 bg-amber-500/10 border border-amber-500/20 rounded flex items-center justify-center text-[5px] text-amber-600 font-extrabold mb-1">Student Management System</div>
                                                <div className="h-6 w-24 bg-slate-100 border border-slate-200 rounded flex items-center justify-center text-[5px] text-slate-400 font-bold">Proje Teslimi...</div>
                                            </div>
                                            <div className="px-1">
                                                <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">Proje Görevi Şablonu</h4>
                                                <p className="text-xs text-gray-400 mt-1">Öğrencinin özgün bir proje üretebileceği ÜRET şablonu.</p>
                                            </div>
                                        </button>
                                    </>
                                )}

                                {/* QUIZ ŞABLONLARI */}
                                {activeStage === 'QUIZ' && (
                                    <>
                                        <button
                                            onClick={() => onAddSlide('template', {
                                                elements: [
                                                    { type: 'text', x: 50, y: 25, width: 900, height: 50, content: 'Quiz Sorusu & Değerlendirme', style: { fontSize: 24, fontFamily: 'Fredoka', bold: true } },
                                                    { 
                                                        type: 'multiple_choice', 
                                                        x: 180, 
                                                        y: 85, 
                                                        width: 640, 
                                                        height: 440, 
                                                        rotation: 0,
                                                        content: 'Python\'da listeler hangi parantez ile gösterilir?', 
                                                        extra: { 
                                                            title: 'Çoktan Seçmeli Soru',
                                                            multipleCorrect: false,
                                                            explanation: 'Listeler köşeli parantez [] kullanılarak tanımlanır.',
                                                            options: [
                                                                { id: 'A', text: '[]', isCorrect: true, imageUrl: '' },
                                                                { id: 'B', text: '()', isCorrect: false, imageUrl: '' },
                                                                { id: 'C', text: '{}', isCorrect: false, imageUrl: '' },
                                                                { id: 'D', text: '<>', isCorrect: false, imageUrl: '' },
                                                            ],
                                                            submittedAnswers: [],
                                                            isChecked: false
                                                        } 
                                                    }
                                                ]
                                            })}
                                            className="text-left group"
                                        >
                                            <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-purple-500 group-hover:shadow-md transition-all relative flex flex-col items-center justify-center p-4">
                                                <div className="h-5 w-28 bg-purple-500/10 border border-purple-500/20 rounded flex items-center justify-center text-[5px] text-purple-600 font-extrabold mb-2">Çoktan Seçmeli (Quiz)</div>
                                                <div className="grid grid-cols-2 gap-1 w-20">
                                                    <div className="h-3 bg-rose-500 rounded text-[3px] text-white flex items-center justify-center font-bold">A</div>
                                                    <div className="h-3 bg-sky-500 rounded text-[3px] text-white flex items-center justify-center font-bold">B</div>
                                                    <div className="h-3 bg-amber-400 rounded text-[3px] text-white flex items-center justify-center font-bold">C</div>
                                                    <div className="h-3 bg-emerald-500 rounded text-[3px] text-white flex items-center justify-center font-bold">D</div>
                                                </div>
                                            </div>
                                            <div className="px-1">
                                                <h4 className="font-bold text-gray-700 group-hover:text-purple-600 transition-colors">Çoktan Seçmeli Quiz Şablonu</h4>
                                                <p className="text-xs text-gray-400 mt-1">Soru ve 4 seçenekli şık kartlarından oluşan Duolingo stili quiz şablonu.</p>
                                            </div>
                                        </button>
                                    </>
                                )}

                                {/* OTHER STAGES: GENERIC TEMPLATE */}
                                {activeStage !== 'ANLA' && activeStage !== 'UYGULA' && activeStage !== 'BİRLEŞTİR' && activeStage !== 'ÜRET' && activeStage !== 'QUIZ' && (
                                    <button
                                        onClick={() => onAddSlide('template', {
                                            elements: [
                                                { type: 'shape', x: 0, y: 0, width: 1000, height: 80, shapeType: 'rectangle', style: { backgroundColor: stageColor, borderWidth: 0 } },
                                                { type: 'text', x: 40, y: 15, width: 920, height: 50, content: `${activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Aşaması`, style: { fontSize: 28, fontFamily: 'Fredoka', bold: true, color: '#ffffff' } }
                                            ]
                                        })}
                                        className="text-left group"
                                    >
                                        <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex items-center justify-center p-3">
                                            <div className="w-full h-full bg-white shadow-sm border border-slate-100 rounded-lg flex flex-col overflow-hidden">
                                                <div className="h-4 w-full" style={{ backgroundColor: stageColor }} />
                                                <div className="p-2">
                                                    <div className="w-12 h-1 bg-slate-200 rounded-full" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-1">
                                            <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Tema Şablonu</h4>
                                            <p className="text-xs text-gray-400 mt-1">Aşama rengiyle uyumlu başlık bantlı şablon.</p>
                                        </div>
                                    </button>
                                )}

                                 {/* Custom templates moved to custom_ai tab */}
                            </>
                        )}

                        {/* CUSTOM AI PERSISTED TEMPLATES TAB */}
                        {activeTab === 'custom_ai' && (
                            <>
                                {customTemplates.filter(t => t.category?.toUpperCase() === activeStage.toUpperCase()).length === 0 ? (
                                    <div className="col-span-3 py-16 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                                        <Sparkles className="w-12 h-12 text-gray-300 animate-pulse mb-3" />
                                        <p className="font-bold text-sm">Henüz bu kategori için özel AI şablonu oluşturulmamış.</p>
                                        <p className="text-xs text-gray-400 mt-1 font-medium">Ders oluştururken slaytı tasarlayıp sağ üstteki "Şablon Kaydet" butonu ile ekleyebilirsiniz.</p>
                                    </div>
                                ) : (
                                    customTemplates
                                        .filter(t => t.category?.toUpperCase() === activeStage.toUpperCase())
                                        .map((t) => (
                                            <div key={t.id} className="relative group/card">
                                                <button
                                                    onClick={() => onAddSlide('template', {
                                                        elements: t.elements,
                                                        background: t.background
                                                    })}
                                                    className="w-full text-left group"
                                                >
                                                    <div className="w-full aspect-video bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border-2 border-indigo-100 rounded-2xl mb-3 overflow-hidden group-hover:border-indigo-500 group-hover:shadow-md transition-all relative flex flex-col items-center justify-center p-3">
                                                        <div className="bg-white/80 backdrop-blur border border-indigo-100 rounded-xl p-3 shadow-sm text-center">
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                                                                Özel Şablon
                                                            </span>
                                                            <div className="text-[9px] font-bold text-gray-400 mt-2 font-medium">
                                                                {t.elements?.length || 0} Eleman
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="px-1">
                                                        <h4 className="font-bold text-gray-700 group-hover:text-indigo-600 transition-colors">{t.title || 'Başlıksız Şablon'}</h4>
                                                        <p className="text-xs text-gray-400 mt-1 line-clamp-2">{t.description || 'Açıklama girilmedi.'}</p>
                                                    </div>
                                                </button>
                                                
                                                {isAdmin && (
                                                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity z-10">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTemplate(t);
                                                                setEditTitle(t.title || '');
                                                                setEditDesc(t.description || '');
                                                            }}
                                                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 rounded-lg shadow-sm"
                                                            title="Şablonu Düzenle"
                                                        >
                                                            <Pencil className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("Bu özel şablonu silmek istediğinize emin misiniz?")) {
                                                                    api.delete(`/builder/templates/${t.id}`)
                                                                        .then(() => {
                                                                            setCustomTemplates(prev => prev.filter(item => item.id !== t.id));
                                                                        })
                                                                        .catch(err => {
                                                                            alert("Şablon silinirken hata oluştu.");
                                                                            console.error(err);
                                                                        });
                                                                }
                                                            }}
                                                            className="p-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 rounded-lg shadow-sm"
                                                            title="Şablonu Sil"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                )}
                            </>
                        )}

                        {/* OYUN ŞABLONLARI */}
                        {activeTab === 'game' && (
                            <>
                                <button
                                    onClick={() => onAddSlide('game')}
                                    className="text-left group"
                                  >
                                    <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-purple-500 group-hover:shadow-md transition-all relative">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="scale-[0.25] origin-center transform-gpu">
                                                <SlideThumbnail slide={MOCK_GAME_SLIDE} width={1000} height={562} />
                                            </div>
                                        </div>
                                        <div className="absolute inset-0 bg-transparent" />
                                    </div>
                                    <div className="px-1">
                                        <h4 className="font-bold text-gray-700 group-hover:text-purple-600 transition-colors">Eşleştirme Oyunu</h4>
                                        <p className="text-xs text-gray-400 mt-1">İnteraktif soru cevap oyunu.</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => onAddSlide('game', { gameType: 'monster' })}
                                    className="text-left group"
                                >
                                    <div className="w-full aspect-video bg-gray-50 border-2 border-gray-100 rounded-2xl mb-3 overflow-hidden group-hover:border-purple-500 group-hover:shadow-md transition-all relative flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-2">
                                            <Puzzle className="w-10 h-10 text-purple-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">SÜRÜKLE BIRAK</span>
                                        </div>
                                    </div>
                                    <div className="px-1">
                                        <h4 className="font-bold text-gray-700 group-hover:text-purple-600 transition-colors">Sürükle-Bırak Oyunu</h4>
                                        <p className="text-xs text-gray-400 mt-1">Öğeleri doğru yerlere sürükleme etkinliği.</p>
                                    </div>
                                </button>
                            </>
                        )}

                        {/* ÖDEV ŞABLONLARI */}
                        {activeTab === 'homework' && (
                            <button
                                onClick={() => onAddSlide('homework')}
                                className="text-left group animate-in zoom-in-95 duration-200"
                            >
                                <div className="w-full aspect-video bg-blue-50 border-2 border-blue-100 rounded-2xl mb-3 overflow-hidden group-hover:border-blue-500 group-hover:shadow-md transition-all relative flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <PenTool className="w-10 h-10 text-blue-500 animate-bounce" />
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">ÖDEV TESLİMİ</span>
                                    </div>
                                </div>
                                <div className="px-1">
                                    <h4 className="font-bold text-gray-700 group-hover:text-blue-600 transition-colors">Ödev Şablonu</h4>
                                    <p className="text-xs text-gray-400 mt-1">Öğrencilerin metin, kod veya dosya yükleyebileceği ödev teslim sayfası.</p>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* EDIT TEMPLATE MODAL */}
            {editingTemplate && (
                <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={(e) => e.stopPropagation()}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-indigo-700 flex items-center justify-between text-white">
                            <div className="flex items-center gap-2.5">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                                <h3 className="text-lg font-black tracking-wide font-display">Şablonu Düzenle</h3>
                            </div>
                            <button
                                onClick={() => setEditingTemplate(null)}
                                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Şablon Adı</label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                                    placeholder="Şablon adı girin..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Şablon Açıklaması</label>
                                <textarea
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm resize-none h-24"
                                    placeholder="Şablon açıklaması girin..."
                                />
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button
                                onClick={() => setEditingTemplate(null)}
                                className="px-4 py-2 border-2 border-gray-250 text-gray-500 font-black rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-xs uppercase"
                            >
                                Vazgeç
                            </button>
                            <button
                                onClick={async () => {
                                    setIsSavingEdit(true);
                                    try {
                                        await api.put(`/builder/templates/${editingTemplate.id}`, {
                                            title: editTitle,
                                            description: editDesc,
                                            category: editingTemplate.category
                                        });
                                        
                                        // Update local state
                                        setCustomTemplates(prev => prev.map(t => {
                                            if (t.id === editingTemplate.id) {
                                                return { ...t, title: editTitle, description: editDesc };
                                            }
                                            return t;
                                        }));
                                        
                                        setEditingTemplate(null);
                                    } catch (err: any) {
                                        console.error(err);
                                        alert(err.response?.data?.detail || "Şablon güncellenirken bir hata oluştu.");
                                    } finally {
                                        setIsSavingEdit(false);
                                    }
                                }}
                                disabled={isSavingEdit}
                                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-xl shadow-[0_4px_0_rgba(124,58,237,0.3)] hover:shadow-[0_2px_0_rgba(124,58,237,0.3)] hover:translate-y-[2px] transition-all text-xs uppercase disabled:opacity-50"
                            >
                                {isSavingEdit ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddSlideModal;
