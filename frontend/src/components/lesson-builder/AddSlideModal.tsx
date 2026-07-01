import React, { useState } from 'react';
import { Gamepad2, LayoutTemplate, X, ChevronRight, Puzzle, Code, PenTool, Layers, Trophy } from 'lucide-react';
import SlideThumbnail from './SlideThumbnail';
import type { Slide } from './types';

interface AddSlideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSlide: (type: 'normal' | 'game' | 'notebook' | 'coding' | 'template', config?: { gameType?: string; elements?: any[] }) => void;
    activeStage: 'ANLA' | 'UYGULA' | 'BİRLEŞTİR' | 'ÜRET' | 'QUIZ' | 'ÖDEV';
    stageColor: string;
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

const AddSlideModal: React.FC<AddSlideModalProps> = ({ isOpen, onClose, onAddSlide, activeStage, stageColor }) => {
    const [activeTab, setActiveTab] = useState<'slide' | 'game' | 'custom_stage'>('slide');

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
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-all duration-200 ${activeTab === 'custom_stage' ? 'shadow-md text-white font-bold' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700 font-medium'}`}
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
                            onClick={() => setActiveTab('game')}
                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between transition-colors ${activeTab === 'game' ? 'bg-white shadow-sm ring-1 ring-black/5 text-purple-600 font-bold' : 'text-gray-500 hover:bg-white/50 hover:text-gray-700 font-medium'}`}
                        >
                            <div className="flex items-center gap-3">
                                <Gamepad2 className="w-5 h-5" />
                                <span className="text-sm">Oyun Şablonları</span>
                            </div>
                            {activeTab === 'game' && <ChevronRight className="w-4 h-4 text-purple-500" />}
                        </button>
                    </div>
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 bg-white p-8 overflow-y-auto flex flex-col">
                    <div className="flex items-center justify-between mb-8 flex-shrink-0">
                        <h3 className="text-xl font-bold text-gray-800 font-display">
                            {activeTab === 'slide' && 'Genel Slayt Şablonları'}
                            {activeTab === 'custom_stage' && `${activeStage.charAt(0) + activeStage.slice(1).toLowerCase()} Seviyesi Şablonları`}
                            {activeTab === 'game' && 'Oyun Şablonları'}
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

                                {/* OTHER STAGES: GENERIC TEMPLATE */}
                                {activeStage !== 'ANLA' && activeStage !== 'UYGULA' && activeStage !== 'BİRLEŞTİR' && (
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddSlideModal;
