import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Check, HelpCircle, ToggleLeft, PenTool, FileText, X } from 'lucide-react';
import type { Slide, MatchingGameConfig, QuizQuestion, QuizOption } from './types';

interface MatchingGameBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
}

const MatchingGameBuilder: React.FC<MatchingGameBuilderProps> = ({ slide, updateSlide }) => {
    // Modal states
    const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);

    // Initialize config if missing
    useEffect(() => {
        if (!slide.gameConfig || !slide.gameConfig.questions) {
            updateSlide({
                gameConfig: {
                    timeLimit: 100, // Percentage or seconds logic to be aligned
                    questions: []
                } as MatchingGameConfig
            });
        }
    }, []);

    const config: MatchingGameConfig = slide.gameConfig || { timeLimit: 100, questions: [] };

    const updateConfig = (updates: Partial<MatchingGameConfig>) => {
        updateSlide({
            gameConfig: { ...config, ...updates }
        });
    };

    const addQuestion = (type: 'multiple_choice' | 'true_false' | 'short_answer' | 'open_ended') => {
        let newQuestion: QuizQuestion = {
            id: Date.now().toString(),
            text: 'Yeni Soru',
            type: type,
            options: [],
            multipleCorrect: false,
            correctShortAnswer: '',
            explanation: '',
            timeLimit: 30
        };

        if (type === 'multiple_choice') {
            newQuestion.options = [
                { id: 'A', text: 'Seçenek A', isCorrect: true },
                { id: 'B', text: 'Seçenek B', isCorrect: false },
                { id: 'C', text: 'Seçenek C', isCorrect: false },
                { id: 'D', text: 'Seçenek D', isCorrect: false },
            ];
        } else if (type === 'true_false') {
            newQuestion.options = [
                { id: 'A', text: 'Doğru', isCorrect: true },
                { id: 'B', text: 'Yanlış', isCorrect: false }
            ];
        } else if (type === 'short_answer') {
            newQuestion.correctShortAnswer = 'Cevap';
        }

        updateConfig({
            questions: [...config.questions, newQuestion]
        });
        setIsTypeModalOpen(false);
    };

    const updateQuestion = (qId: string, updates: Partial<QuizQuestion>) => {
        updateConfig({
            questions: config.questions.map(q => q.id === qId ? { ...q, ...updates } : q)
        });
    };

    const updateOption = (qId: string, optId: string, updates: Partial<QuizOption>, multipleCorrectMode = false) => {
        updateConfig({
            questions: config.questions.map(q => {
                if (q.id === qId) {
                    const newOptions = q.options.map(o => {
                        if (o.id === optId) {
                            return { ...o, ...updates };
                        } else if (updates.isCorrect && !multipleCorrectMode) {
                            return { ...o, isCorrect: false };
                        }
                        return o;
                    });
                    return { ...q, options: newOptions };
                }
                return q;
            })
        });
    };

    const handleTypeChange = (qId: string, newType: 'multiple_choice' | 'true_false' | 'short_answer' | 'open_ended') => {
        updateConfig({
            questions: config.questions.map(q => {
                if (q.id === qId) {
                    let updatedOptions: QuizOption[] = [];
                    let correctShortAnswer = q.correctShortAnswer || '';
                    if (newType === 'multiple_choice') {
                        updatedOptions = [
                            { id: 'A', text: 'Seçenek A', isCorrect: true },
                            { id: 'B', text: 'Seçenek B', isCorrect: false },
                            { id: 'C', text: 'Seçenek C', isCorrect: false },
                            { id: 'D', text: 'Seçenek D', isCorrect: false },
                        ];
                    } else if (newType === 'true_false') {
                        updatedOptions = [
                            { id: 'A', text: 'Doğru', isCorrect: true },
                            { id: 'B', text: 'Yanlış', isCorrect: false }
                        ];
                    } else if (newType === 'short_answer') {
                        correctShortAnswer = correctShortAnswer || 'Cevap';
                    }

                    return {
                        ...q,
                        type: newType,
                        options: updatedOptions,
                        correctShortAnswer,
                        multipleCorrect: false
                    };
                }
                return q;
            })
        });
    };

    const deleteQuestion = (id: string) => {
        updateConfig({
            questions: config.questions.filter(q => q.id !== id)
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-40 relative">
            <div className="max-w-4xl mx-auto w-full p-8">

                {/* Header Info */}
                <div className="flex items-center justify-between mb-12 select-none">
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-black text-gray-800 font-display">Oyun Editörü</h2>
                        <span className="bg-indigo-100 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">{config.questions.length} Soru</span>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm font-bold text-gray-500">Süre Limiti:</span>
                        <input
                            type="number"
                            className="w-16 text-center font-bold text-gray-800 bg-gray-50 rounded-lg py-1 focus:outline-indigo-500"
                            value={config.timeLimit}
                            onChange={(e) => updateConfig({ timeLimit: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                </div>

                {/* Questions List */}
                <div className="flex flex-col gap-16">
                    {config.questions.map((q, qIdx) => {
                        const qType = q.type || 'multiple_choice';

                        return (
                            <React.Fragment key={q.id}>
                                <div className="relative group/card animate-in slide-in-from-bottom-4 duration-500 fade-in">

                                    {/* SLIDE CONTAINER */}
                                    <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden p-8 relative">

                                        {/* Header type selection badge & Delete Button */}
                                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4 relative z-10 select-none">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Soru {qIdx + 1} Tipi:</span>
                                                <select
                                                    value={qType}
                                                    onChange={(e) => handleTypeChange(q.id, e.target.value as any)}
                                                    className="bg-gray-100 text-gray-700 font-bold text-xs px-3 py-1.5 rounded-xl border-none focus:outline-indigo-500 cursor-pointer"
                                                >
                                                    <option value="multiple_choice">Çoktan Seçmeli</option>
                                                    <option value="true_false">Doğru / Yanlış</option>
                                                    <option value="short_answer">Kısa Cevap</option>
                                                    <option value="open_ended">Açık Uçlu</option>
                                                </select>

                                                <div className="flex items-center gap-1.5 ml-2 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-200">
                                                    <Clock className="w-3.5 h-3.5 text-gray-400 animate-pulse" />
                                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Süre:</span>
                                                    <input
                                                        type="number"
                                                        className="w-10 text-center font-bold text-xs text-gray-700 bg-transparent focus:outline-none"
                                                        value={q.timeLimit || 30}
                                                        onChange={(e) => {
                                                            const val = parseInt(e.target.value) || 0;
                                                            updateConfig({
                                                                questions: config.questions.map(item =>
                                                                    item.id === q.id ? { ...item, timeLimit: val } : item
                                                                )
                                                            });
                                                        }}
                                                    />
                                                    <span className="text-[10px] font-bold text-gray-400">sn</span>
                                                </div>

                                                {qType === 'multiple_choice' && (
                                                    <label className="flex items-center gap-2 ml-4 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!q.multipleCorrect}
                                                            onChange={(e) => {
                                                                const nextVal = e.target.checked;
                                                                let hasFoundCorrect = false;
                                                                const updatedOptions = q.options.map(o => {
                                                                    if (o.isCorrect) {
                                                                        if (!nextVal) {
                                                                            if (hasFoundCorrect) return { ...o, isCorrect: false };
                                                                            hasFoundCorrect = true;
                                                                        }
                                                                    }
                                                                    return o;
                                                                });
                                                                updateQuestion(q.id, {
                                                                    multipleCorrect: nextVal,
                                                                    options: updatedOptions
                                                                });
                                                            }}
                                                            className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                                        />
                                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Çoklu Doğru Desteği</span>
                                                    </label>
                                                )}
                                            </div>

                                            <button
                                                onClick={() => deleteQuestion(q.id)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Soruyu Sil"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>

                                        {/* Mock Timer Bar */}
                                        <div className="w-full flex justify-between items-center mb-8 px-4 relative z-10 select-none">
                                            <div className="w-12 h-4 bg-gray-100 rounded-full flex items-center justify-center opacity-50 text-[8px] font-bold text-gray-400">
                                                ÇIKIŞ
                                            </div>
                                            {/* Mock Timer Bar */}
                                            <div className="flex-1 mx-8 h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                                <div className="h-full bg-purple-500 w-full opacity-30"></div>
                                            </div>
                                            <div className="text-xl font-black text-gray-400 font-display w-12 text-right">
                                                {qIdx + 1}/{config.questions.length}
                                            </div>
                                        </div>

                                        {/* Question Area */}
                                        <div className="flex justify-center mb-10 w-full px-4">
                                            <div className="bg-white border-2 border-gray-200 border-b-4 rounded-3xl p-8 shadow-sm text-center w-full group-hover/card:border-indigo-200 transition-colors">
                                                <span className="text-gray-400 font-bold text-lg uppercase tracking-widest block mb-4">SORU METNİ</span>
                                                <input
                                                    type="text"
                                                    value={q.text}
                                                    onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                                    className="text-3xl font-black text-gray-700 font-display text-center w-full bg-transparent focus:outline-none focus:bg-gray-50 rounded-xl px-4 py-2 placeholder-gray-300"
                                                    placeholder="Soruyu buraya yazın..."
                                                />
                                            </div>
                                        </div>

                                        {/* Type Specific Options Editor */}
                                        <div className="w-full px-4 mb-8">
                                            {qType === 'multiple_choice' && (
                                                <div className="grid grid-cols-2 gap-4 w-full">
                                                    {q.options.map((opt, optIdx) => {
                                                        const colors = [
                                                            { bg: 'bg-rose-500', border: 'border-rose-700', box: 'bg-rose-700', text: 'text-white' },
                                                            { bg: 'bg-sky-500', border: 'border-sky-700', box: 'bg-sky-700', text: 'text-white' },
                                                            { bg: 'bg-amber-400', border: 'border-amber-600', box: 'bg-amber-600', text: 'text-white' },
                                                            { bg: 'bg-emerald-500', border: 'border-emerald-700', box: 'bg-emerald-700', text: 'text-white' }
                                                        ];
                                                        const color = colors[optIdx % 4];

                                                        return (
                                                            <div
                                                                key={opt.id}
                                                                className={`${color.bg} border-b-8 ${color.border} rounded-2xl flex items-center p-4 gap-4 transition-all relative group/opt overflow-hidden`}
                                                            >
                                                                <div className={`w-14 h-14 ${color.box} rounded-xl flex items-center justify-center shadow-inner text-2xl font-black text-white font-display shrink-0`}>
                                                                    {opt.id}
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={opt.text}
                                                                    onChange={(e) => updateOption(q.id, opt.id, { text: e.target.value })}
                                                                    className={`w-full bg-transparent text-xl font-black ${color.text} font-display focus:outline-none placeholder-white/50`}
                                                                    placeholder={`Seçenek ${optIdx + 1}`}
                                                                />

                                                                {/* Correct Answer Toggle */}
                                                                <button
                                                                    onClick={() => updateOption(q.id, opt.id, { isCorrect: !opt.isCorrect }, !!q.multipleCorrect)}
                                                                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${opt.isCorrect ? 'bg-white text-green-500 shadow-lg scale-110' : 'bg-black/10 text-white/50 hover:bg-black/20'}`}
                                                                    title="Doğru Cevap Olarak İşaretle"
                                                                >
                                                                    <Check className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {qType === 'true_false' && (
                                                <div className="grid grid-cols-2 gap-4 w-full">
                                                    {q.options.map((opt, optIdx) => {
                                                        const colors = [
                                                            { bg: 'bg-sky-500', border: 'border-sky-700', box: 'bg-sky-700', text: 'text-white' },
                                                            { bg: 'bg-rose-500', border: 'border-rose-700', box: 'bg-rose-700', text: 'text-white' }
                                                        ];
                                                        const color = colors[optIdx % 2];

                                                        return (
                                                            <div
                                                                key={opt.id}
                                                                className={`${color.bg} border-b-8 ${color.border} rounded-2xl flex items-center p-4 gap-4 transition-all relative group/opt overflow-hidden`}
                                                            >
                                                                <div className={`w-14 h-14 ${color.box} rounded-xl flex items-center justify-center shadow-inner text-2xl font-black text-white font-display shrink-0`}>
                                                                    {['T', 'F'][optIdx]}
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    value={opt.text}
                                                                    onChange={(e) => updateOption(q.id, opt.id, { text: e.target.value })}
                                                                    className={`w-full bg-transparent text-xl font-black ${color.text} font-display focus:outline-none placeholder-white/50`}
                                                                    placeholder={optIdx === 0 ? 'Doğru' : 'Yanlış'}
                                                                />

                                                                {/* Correct Answer Toggle */}
                                                                <button
                                                                    onClick={() => updateOption(q.id, opt.id, { isCorrect: !opt.isCorrect }, false)}
                                                                    className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${opt.isCorrect ? 'bg-white text-green-500 shadow-lg scale-110' : 'bg-black/10 text-white/50 hover:bg-black/20'}`}
                                                                    title="Doğru Cevap Olarak İşaretle"
                                                                >
                                                                    <Check className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {qType === 'short_answer' && (
                                                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-6 flex flex-col gap-3">
                                                    <span className="text-amber-700 text-xs font-black uppercase tracking-wider">Kısa Cevap Doğrulama:</span>
                                                    <input
                                                        type="text"
                                                        value={q.correctShortAnswer || ''}
                                                        onChange={(e) => updateQuestion(q.id, { correctShortAnswer: e.target.value })}
                                                        className="bg-white border border-amber-200 p-4 text-lg font-bold text-slate-800 rounded-2xl focus:outline-amber-500 shadow-inner w-full"
                                                        placeholder="Beklenen doğru cevabı yazın..."
                                                    />
                                                    <p className="text-[10px] text-amber-600/80 font-bold">Öğrenci bu metinle eşleşen bir kısa metin yazıp doğrulayacaktır (büyük-küçük harf duyarsızdır).</p>
                                                </div>
                                            )}

                                            {qType === 'open_ended' && (
                                                <div className="bg-slate-100 border-2 border-slate-200 rounded-3xl p-6 flex flex-col gap-3 opacity-80">
                                                    <span className="text-slate-700 text-xs font-black uppercase tracking-wider">Açık Uçlu Soru Alanı:</span>
                                                    <textarea
                                                        disabled
                                                        rows={2}
                                                        className="bg-white/50 border border-slate-200 p-4 text-sm font-semibold text-slate-400 rounded-2xl w-full resize-none select-none"
                                                        value="Öğrenci bu alana geniş açıklamasını yazacaktır. (Eğitmen tarafından manuel değerlendirme / Okuma amaçlı)"
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Explanation Box */}
                                        <div className="w-full px-4 border-t border-gray-100 pt-6">
                                            <span className="text-xs font-black text-gray-400 uppercase tracking-wider block mb-2">Soru Açıklaması / Geri Bildirim:</span>
                                            <textarea
                                                rows={2}
                                                value={q.explanation || ''}
                                                onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                                                placeholder="Öğrenci cevabı doğruladığında görüntülenecek detaylı açıklama metni..."
                                                className="bg-gray-50 border border-gray-200 p-3 text-sm text-gray-600 rounded-2xl focus:outline-indigo-500 w-full resize-none"
                                            />
                                        </div>

                                    </div>
                                </div>

                                {/* SEPARATOR */}
                                {
                                    qIdx < config.questions.length - 1 && (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-full max-w-lg h-0.5 border-t-2 border-dashed border-gray-200"></div>
                                        </div>
                                    )
                                }
                            </React.Fragment>
                        );
                    })}

                    {/* Add Question Button */}
                    <div className="flex justify-center pt-8">
                        <button
                            onClick={() => setIsTypeModalOpen(true)}
                            className="flex flex-col items-center gap-4 group cursor-pointer select-none"
                        >
                            <div className="w-20 h-20 rounded-full bg-white border-2 border-gray-200 border-dashed group-hover:border-indigo-500 group-hover:scale-110 shadow-sm flex items-center justify-center text-gray-300 group-hover:text-indigo-500 transition-all">
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-widest text-sm transition-colors">Yeni Soru Ekle</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Type Selection Modal */}
            {isTypeModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden p-8 flex flex-col relative animate-in zoom-in-95 duration-200">
                        {/* Close button */}
                        <button
                            onClick={() => setIsTypeModalOpen(false)}
                            className="absolute right-6 top-6 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <div className="mb-8 select-none">
                            <h3 className="text-2xl font-black text-gray-800 font-display">Soru Tipi Seçin</h3>
                            <p className="text-xs text-gray-400 mt-1">Eklemek istediğiniz etkinlik veya soru çeşidini seçin.</p>
                        </div>

                        {/* Types Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { id: 'multiple_choice', title: '1. Çoktan Seçmeli', desc: 'Tek doğru cevap veya çoklu doğru seçeneği desteği barındıran temel soru.', icon: HelpCircle, color: 'bg-purple-100 text-purple-600' },
                                { id: 'true_false', title: '2. Doğru / Yanlış', desc: 'Hızlı bilgi kontrolü için iki seçenek barındıran doğru-yanlış etkinliği.', icon: ToggleLeft, color: 'bg-sky-100 text-sky-600' },
                                { id: 'short_answer', title: '3. Kısa Cevap', desc: 'Öğrencinin kısa bir metin yazıp eşleşen kelimeyle kontrol ettiği soru.', icon: PenTool, color: 'bg-amber-100 text-amber-600' },
                                { id: 'open_ended', title: '4. Açık Uçlu', desc: 'Öğrencinin geniş bir paragraf halinde uzun açıklama yapacağı soru tipi.', icon: FileText, color: 'bg-emerald-100 text-emerald-600' }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    onClick={() => addQuestion(type.id as any)}
                                    className="text-left p-5 border-2 border-gray-100 hover:border-indigo-500 rounded-2xl hover:shadow-md transition-all flex items-start gap-4 group"
                                >
                                    <div className={`w-12 h-12 rounded-xl ${type.color} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform`}>
                                        <type.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-extrabold text-gray-800 group-hover:text-indigo-600 transition-colors text-sm">{type.title}</h4>
                                        <p className="text-[11px] text-gray-400 font-medium leading-relaxed mt-1">{type.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default MatchingGameBuilder;
