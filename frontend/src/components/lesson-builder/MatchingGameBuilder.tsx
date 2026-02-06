import React, { useEffect } from 'react';
import { Plus, Trash2, Clock, Check } from 'lucide-react';
import type { Slide, MatchingGameConfig, QuizQuestion, QuizOption } from './types';

interface MatchingGameBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
}

const MatchingGameBuilder: React.FC<MatchingGameBuilderProps> = ({ slide, updateSlide }) => {
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

    const addQuestion = () => {
        const newQuestion: QuizQuestion = {
            id: Date.now().toString(),
            text: 'Yeni Soru',
            options: [
                { id: 'A', text: 'Seçenek A', isCorrect: true },
                { id: 'B', text: 'Seçenek B', isCorrect: false },
                { id: 'C', text: 'Seçenek C', isCorrect: false },
                { id: 'D', text: 'Seçenek D', isCorrect: false },
            ]
        };
        updateConfig({
            questions: [...config.questions, newQuestion]
        });
    };

    const updateQuestion = (qId: string, updates: Partial<QuizQuestion>) => {
        updateConfig({
            questions: config.questions.map(q => q.id === qId ? { ...q, ...updates } : q)
        });
    };

    const updateOption = (qId: string, optId: string, updates: Partial<QuizOption>) => {
        updateConfig({
            questions: config.questions.map(q => {
                if (q.id === qId) {
                    // If setting isCorrect to true, ensure others are false
                    const newOptions = q.options.map(o => {
                        if (o.id === optId) {
                            return { ...o, ...updates };
                        } else if (updates.isCorrect) {
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

    const deleteQuestion = (id: string) => {
        updateConfig({
            questions: config.questions.filter(q => q.id !== id)
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-40">
            <div className="max-w-4xl mx-auto w-full p-8">

                {/* Header Info */}
                <div className="flex items-center justify-between mb-12">
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
                    {config.questions.map((q, qIdx) => (
                        <React.Fragment key={q.id}>
                            <div className="relative group/card animate-in slide-in-from-bottom-4 duration-500 fade-in">

                                {/* SLIDE CONTAINER */}
                                <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden p-8 relative">

                                    {/* Delete Button */}
                                    <button
                                        onClick={() => deleteQuestion(q.id)}
                                        className="absolute right-4 top-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all z-20"
                                        title="Soruyu Sil"
                                    >
                                        <Trash2 className="w-6 h-6" />
                                    </button>

                                    {/* MOCK GAME UI - EXACT MATCH */}
                                    <div className="w-full flex justify-between items-center mb-8 px-4 relative z-10">
                                        <button className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center cursor-default opacity-50">
                                            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                        {/* Mock Timer Bar */}
                                        <div className="flex-1 mx-8 h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                            <div className="h-full bg-purple-500 w-full opacity-30"></div>
                                        </div>
                                        <div className="text-xl font-black text-gray-400 font-display w-12 text-right">
                                            {qIdx + 1}/{config.questions.length}
                                        </div>
                                    </div>

                                    {/* Question Area */}
                                    <div className="flex justify-center mb-12 w-full px-4">
                                        <div className="bg-white border-2 border-gray-200 border-b-4 rounded-3xl p-8 shadow-sm text-center w-full group-hover/card:border-indigo-200 transition-colors">
                                            <span className="text-gray-400 font-bold text-lg uppercase tracking-widest block mb-4">BÖLÜM {qIdx + 1}</span>
                                            <input
                                                type="text"
                                                value={q.text}
                                                onChange={(e) => updateQuestion(q.id, { text: e.target.value })}
                                                className="text-4xl font-black text-gray-700 font-display text-center w-full bg-transparent focus:outline-none focus:bg-gray-50 rounded-xl px-4 py-2 placeholder-gray-300"
                                                placeholder="Soruyu buraya yazın..."
                                            />
                                        </div>
                                    </div>

                                    {/* Options Grid */}
                                    <div className="grid grid-cols-2 gap-4 w-full px-4">
                                        {q.options.map((opt, optIdx) => {
                                            const colors = [
                                                { bg: 'bg-red-500', border: 'border-red-700', box: 'bg-red-700', text: 'text-white' },
                                                { bg: 'bg-blue-500', border: 'border-blue-700', box: 'bg-blue-700', text: 'text-white' },
                                                { bg: 'bg-yellow-400', border: 'border-yellow-600', box: 'bg-yellow-600', text: 'text-white' },
                                                { bg: 'bg-green-500', border: 'border-green-700', box: 'bg-green-700', text: 'text-white' }
                                            ];
                                            const color = colors[optIdx % 4];

                                            return (
                                                <div
                                                    key={opt.id}
                                                    className={`${color.bg} border-b-8 ${color.border} rounded-2xl flex items-center p-4 gap-4 transition-all relative group/opt overflow-hidden`}
                                                >
                                                    <div className={`w-14 h-14 ${color.box} rounded-xl flex items-center justify-center shadow-inner text-2xl font-black text-white font-display shrink-0`}>
                                                        {['A', 'B', 'C', 'D'][optIdx]}
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
                                                        onClick={() => updateOption(q.id, opt.id, { isCorrect: true })}
                                                        className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${opt.isCorrect ? 'bg-white text-green-500 shadow-lg scale-110' : 'bg-black/10 text-white/50 hover:bg-black/20'}`}
                                                        title="Doğru Cevap Olarak İşaretle"
                                                    >
                                                        <Check className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            );
                                        })}
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
                    ))}

                    <div className="flex justify-center pt-8">
                        <button
                            onClick={addQuestion}
                            className="flex flex-col items-center gap-4 group cursor-pointer"
                        >
                            <div className="w-20 h-20 rounded-full bg-white border-2 border-gray-200 border-dashed group-hover:border-indigo-500 group-hover:scale-110 shadow-sm flex items-center justify-center text-gray-300 group-hover:text-indigo-500 transition-all">
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="font-bold text-gray-400 group-hover:text-indigo-600 uppercase tracking-widest text-sm transition-colors">Yeni Soru Ekle</span>
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default MatchingGameBuilder;
