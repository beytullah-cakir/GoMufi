import React, { useState, useEffect } from 'react';
import { Check, X, Settings, Image as ImageIcon, HelpCircle, RefreshCw, Trash2 } from 'lucide-react';
import type { SlideElement } from './types';

interface MultipleChoiceWidgetProps {
    el: SlideElement;
    isPreview?: boolean;
    previewRole?: 'student' | 'teacher';
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    deleteElement?: (id: string) => void;
}

const MultipleChoiceWidget: React.FC<MultipleChoiceWidgetProps> = ({
    el,
    isPreview,
    previewRole,
    updateElement,
    deleteElement
}) => {
    // Initialize extra fields if undefined
    useEffect(() => {
        if (!el.extra || !el.extra.options) {
            updateElement(el.id, {
                content: el.content || 'Yeni Çoktan Seçmeli Soru?',
                extra: {
                    title: el.extra?.title || 'Çoktan Seçmeli Soru',
                    multipleCorrect: el.extra?.multipleCorrect || false,
                    explanation: el.extra?.explanation || '',
                    options: el.extra?.options || [
                        { id: 'A', text: 'Seçenek A', isCorrect: true, imageUrl: '' },
                        { id: 'B', text: 'Seçenek B', isCorrect: false, imageUrl: '' },
                        { id: 'C', text: 'Seçenek C', isCorrect: false, imageUrl: '' },
                        { id: 'D', text: 'Seçenek D', isCorrect: false, imageUrl: '' },
                    ],
                    submittedAnswers: el.extra?.submittedAnswers || [],
                    isChecked: el.extra?.isChecked || false
                }
            });
        }
    }, []);

    const extra = el.extra || {
        title: 'Çoktan Seçmeli Soru',
        multipleCorrect: false,
        explanation: '',
        options: [
            { id: 'A', text: 'Seçenek A', isCorrect: true, imageUrl: '' },
            { id: 'B', text: 'Seçenek B', isCorrect: false, imageUrl: '' },
            { id: 'C', text: 'Seçenek C', isCorrect: false, imageUrl: '' },
            { id: 'D', text: 'Seçenek D', isCorrect: false, imageUrl: '' },
        ],
        submittedAnswers: [],
        isChecked: false
    };

    const options = extra.options || [];
    const submittedAnswers = extra.submittedAnswers || [];
    const isChecked = extra.isChecked || false;
    const multipleCorrect = extra.multipleCorrect || false;

    // Local state for image url input popover
    const [editingImageOptId, setEditingImageOptId] = useState<string | null>(null);
    const [tempImageUrl, setTempImageUrl] = useState('');

    const handleUpdateExtra = (updates: Partial<typeof extra>) => {
        updateElement(el.id, {
            extra: {
                ...extra,
                ...updates
            }
        });
    };

    const handleOptionTextChange = (optId: string, text: string) => {
        const updatedOptions = options.map((opt: any) =>
            opt.id === optId ? { ...opt, text } : opt
        );
        handleUpdateExtra({ options: updatedOptions });
    };

    const handleToggleCorrect = (optId: string) => {
        const updatedOptions = options.map((opt: any) => {
            if (opt.id === optId) {
                return { ...opt, isCorrect: !opt.isCorrect };
            }
            if (!multipleCorrect) {
                // If not multiple correct, ensure others are false when this is toggled to true
                return { ...opt, isCorrect: false };
            }
            return opt;
        });
        handleUpdateExtra({ options: updatedOptions });
    };

    const handleOpenImagePopover = (optId: string, currentUrl: string) => {
        setEditingImageOptId(optId);
        setTempImageUrl(currentUrl || '');
    };

    const handleSaveImageUrl = () => {
        if (!editingImageOptId) return;
        const updatedOptions = options.map((opt: any) =>
            opt.id === editingImageOptId ? { ...opt, imageUrl: tempImageUrl } : opt
        );
        handleUpdateExtra({ options: updatedOptions });
        setEditingImageOptId(null);
    };

    // Student Interaction Logic
    const handleSelectOption = (optId: string) => {
        if (isChecked) return; // Answer locked

        let newSelected: string[] = [];
        if (multipleCorrect) {
            if (submittedAnswers.includes(optId)) {
                newSelected = submittedAnswers.filter((id: string) => id !== optId);
            } else {
                newSelected = [...submittedAnswers, optId];
            }
        } else {
            newSelected = [optId];
        }

        handleUpdateExtra({ submittedAnswers: newSelected });
    };

    const handleCheckAnswer = () => {
        if (submittedAnswers.length === 0) return;
        handleUpdateExtra({ isChecked: true });
    };

    const handleReset = () => {
        handleUpdateExtra({
            submittedAnswers: [],
            isChecked: false
        });
    };

    // Calculate correctness
    const correctOptionIds = options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
    const isAnswerCorrect =
        submittedAnswers.length === correctOptionIds.length &&
        submittedAnswers.every((id: string) => correctOptionIds.includes(id));

    // Option Colors matching the requested matching game aesthetics
    const optionStyles = [
        { bg: 'bg-rose-500', border: 'border-rose-700', box: 'bg-rose-700', text: 'text-white' },
        { bg: 'bg-sky-500', border: 'border-sky-700', box: 'bg-sky-700', text: 'text-white' },
        { bg: 'bg-amber-400', border: 'border-amber-600', box: 'bg-amber-600', text: 'text-white' },
        { bg: 'bg-emerald-500', border: 'border-emerald-700', box: 'bg-emerald-700', text: 'text-white' }
    ];

    return (
        <div className="w-full h-full bg-slate-900 border-4 border-slate-800 rounded-[2.5rem] shadow-2xl flex flex-col p-6 overflow-y-auto relative text-white select-none">
            {/* Header / Config Bar for Instructors */}
            {!isPreview && (
                <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4 select-none">
                    <div className="flex items-center gap-3">
                        <HelpCircle className="w-6 h-6 text-purple-400" />
                        <span className="text-xs font-black tracking-widest uppercase text-purple-400">Çoktan Seçmeli Soru Editörü</span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Multiple correct answers toggle */}
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={multipleCorrect}
                                onChange={(e) => {
                                    const nextMultiple = e.target.checked;
                                    // If switching to single, keep only the first correct answer
                                    let hasFoundCorrect = false;
                                    const updated = options.map((opt: any) => {
                                        if (opt.isCorrect) {
                                            if (!nextMultiple) {
                                                if (hasFoundCorrect) {
                                                    return { ...opt, isCorrect: false };
                                                }
                                                hasFoundCorrect = true;
                                            }
                                        }
                                        return opt;
                                    });
                                    handleUpdateExtra({
                                        multipleCorrect: nextMultiple,
                                        options: updated
                                    });
                                }}
                                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                            />
                            <span className="text-xs font-bold text-gray-300">Çoklu Doğru Cevap</span>
                        </label>

                        {/* Delete Widget */}
                        {deleteElement && (
                            <button
                                onClick={() => deleteElement(el.id)}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/25 hover:border-red-500/50 rounded-xl text-red-400 transition-colors"
                                title="Kutuyu Sil"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Main Question Box */}
            <div className="flex flex-col gap-3 mb-6 relative">
                <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase">SORU METNİ</span>
                {isPreview ? (
                    <h3 className="text-2xl font-black font-display tracking-tight leading-relaxed">{el.content}</h3>
                ) : (
                    <input
                        type="text"
                        value={el.content || ''}
                        onChange={(e) => updateElement(el.id, { content: e.target.value })}
                        className="bg-white/5 border border-white/10 hover:border-purple-500/50 focus:border-purple-500 text-xl font-black font-display p-3 rounded-2xl outline-none transition-colors w-full"
                        placeholder="Soruyu buraya yazın..."
                    />
                )}
            </div>

            {/* Options Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {options.map((opt: any, idx: number) => {
                    const style = optionStyles[idx % optionStyles.length];
                    const isSelected = submittedAnswers.includes(opt.id);

                    // Check results calculations
                    let cardBorderClass = 'border-black/25';
                    let cardBgClass = style.bg;
                    let opacityClass = '';

                    if (isPreview && isChecked) {
                        if (opt.isCorrect) {
                            // Highlight correct answer in green
                            cardBgClass = 'bg-emerald-500';
                            cardBorderClass = 'border-emerald-700';
                        } else if (isSelected) {
                            // Highlight selected wrong answer in red
                            cardBgClass = 'bg-rose-500';
                            cardBorderClass = 'border-rose-700';
                        } else {
                            opacityClass = 'opacity-40';
                        }
                    } else if (isPreview && isSelected) {
                        // Selected look
                        cardBorderClass = 'border-white ring-4 ring-white/20';
                    }

                    return (
                        <div
                            key={opt.id}
                            onClick={() => isPreview && handleSelectOption(opt.id)}
                            className={`border-b-8 ${cardBorderClass} ${cardBgClass} ${opacityClass} rounded-3xl flex items-center p-4 gap-4 transition-all relative overflow-hidden ${
                                isPreview && !isChecked ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''
                            }`}
                        >
                            {/* Option Letter Icon */}
                            <div className={`w-14 h-14 ${style.box} rounded-2xl flex items-center justify-center shadow-inner text-2xl font-black text-white font-display shrink-0`}>
                                {opt.id}
                            </div>

                            {/* Option Text Input / Label */}
                            <div className="flex-1 flex flex-col min-w-0">
                                {isPreview ? (
                                    <span className="text-lg font-black text-white font-display leading-tight">{opt.text}</span>
                                ) : (
                                    <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) => handleOptionTextChange(opt.id, e.target.value)}
                                        className="bg-transparent border-none outline-none text-lg font-black text-white font-display leading-tight focus:bg-white/10 rounded px-1.5 py-0.5"
                                        placeholder={`Seçenek ${opt.id}`}
                                    />
                                )}
                            </div>

                            {/* Image Thumbnail inside option card */}
                            {opt.imageUrl && (
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 bg-black/20 shrink-0">
                                    <img src={opt.imageUrl} alt="" className="w-full h-full object-cover" />
                                </div>
                            )}

                            {/* Action Buttons for Instructor */}
                            {!isPreview && (
                                <div className="absolute top-2 right-2 flex gap-1.5 z-20">
                                    {/* Image Upload Button */}
                                    <button
                                        onClick={() => handleOpenImagePopover(opt.id, opt.imageUrl)}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                            opt.imageUrl ? 'bg-white text-purple-600' : 'bg-black/20 hover:bg-black/40 text-white/75'
                                        }`}
                                        title="Resim Ekle"
                                    >
                                        <ImageIcon size={13} />
                                    </button>

                                    {/* Correct Answer Toggle */}
                                    <button
                                        onClick={() => handleToggleCorrect(opt.id)}
                                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                                            opt.isCorrect ? 'bg-white text-green-500 shadow-md scale-105' : 'bg-black/20 hover:bg-black/40 text-white/50'
                                        }`}
                                        title="Doğru Cevap Olarak Belirle"
                                    >
                                        <Check size={14} strokeWidth={3} />
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Image URL Input Popover */}
            {editingImageOptId && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 z-50 rounded-[2.5rem]">
                    <div className="bg-slate-900 border-2 border-slate-700 p-6 rounded-3xl w-full max-w-md flex flex-col gap-4 shadow-2xl animate-in zoom-in-95 duration-150">
                        <div>
                            <h4 className="font-black text-base text-white">Seçeneğe Resim Ekle</h4>
                            <p className="text-xs text-slate-400 mt-0.5">Seçenek {editingImageOptId} için görsel URL adresini girin.</p>
                        </div>
                        <input
                            type="text"
                            value={tempImageUrl}
                            onChange={(e) => setTempImageUrl(e.target.value)}
                            placeholder="https://example.com/image.png"
                            className="bg-slate-800 border border-slate-700 p-3 rounded-xl focus:border-purple-500 focus:outline-none text-sm text-white"
                        />
                        <div className="flex gap-2.5 justify-end">
                            <button
                                onClick={() => setEditingImageOptId(null)}
                                className="px-4 py-2 border border-slate-700 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-400 transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSaveImageUrl}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors"
                            >
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Explanation Field for Instructors */}
            {!isPreview && (
                <div className="flex flex-col gap-2 mt-auto">
                    <span className="text-[10px] font-black text-purple-400 tracking-widest uppercase">SORU AÇIKLAMASI (GERİ BİLDİRİM)</span>
                    <textarea
                        rows={2}
                        value={extra.explanation || ''}
                        onChange={(e) => handleUpdateExtra({ explanation: e.target.value })}
                        placeholder="Öğrenci cevabı kontrol ettiğinde görüntülenecek açıklama yazısı..."
                        className="bg-white/5 border border-white/10 hover:border-purple-500/50 focus:border-purple-500 text-sm p-3 rounded-2xl outline-none transition-colors w-full resize-none"
                    />
                </div>
            )}

            {/* Student Preview Actions / Results Area */}
            {isPreview && (
                <div className="mt-auto flex flex-col gap-4 w-full">
                    {/* Feedback box when checked */}
                    {isChecked && (
                        <div className={`p-5 rounded-3xl border flex gap-4 animate-in slide-in-from-bottom-2 duration-300 ${
                            isAnswerCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                        }`}>
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 border-2 ${
                                isAnswerCorrect ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-red-500/20 border-red-500 text-red-400'
                            }`}>
                                {isAnswerCorrect ? <Check size={28} strokeWidth={3.5} /> : <X size={28} strokeWidth={3.5} />}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                                <h4 className={`font-black font-display text-xl ${isAnswerCorrect ? 'text-green-400' : 'text-red-400'}`}>
                                    {isAnswerCorrect ? 'DOĞRU CEVAP!' : 'YANLIŞ CEVAP!'}
                                </h4>
                                <p className={`text-xs font-bold ${isAnswerCorrect ? 'text-green-500/80' : 'text-red-500/80'} mt-0.5`}>
                                    {isAnswerCorrect ? '+20 Puan kazandınız!' : `Doğru cevaplar: ${options.filter((o: any) => o.isCorrect).map((o: any) => o.id).join(', ')}`}
                                </p>
                                {extra.explanation && (
                                    <div className="mt-2.5 pt-2.5 border-t border-white/5 text-sm text-slate-300 leading-relaxed">
                                        {extra.explanation}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Bottom Action buttons */}
                    <div className="flex gap-3 justify-end items-center">
                        {isChecked ? (
                            <button
                                onClick={handleReset}
                                className="flex items-center gap-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 text-slate-300 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg active:translate-y-[2px] transition-all"
                            >
                                <RefreshCw size={14} className="animate-spin-once" />
                                <span>Yeniden Dene</span>
                            </button>
                        ) : (
                            <button
                                onClick={handleCheckAnswer}
                                disabled={submittedAnswers.length === 0}
                                className={`px-8 py-4 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg border-b-[4px] border-black/20 active:border-b-0 active:translate-y-[4px] transition-all ${
                                    submittedAnswers.length === 0
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border-none shadow-none'
                                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white'
                                }`}
                            >
                                Kontrol Et
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultipleChoiceWidget;
