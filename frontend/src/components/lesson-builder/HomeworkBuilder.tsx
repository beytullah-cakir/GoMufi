import React from 'react';
import { BookOpen, Star, Upload, FileText, Eye } from 'lucide-react';
import type { Slide, HomeworkConfig } from './types';

interface HomeworkBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
}

const HomeworkBuilder: React.FC<HomeworkBuilderProps> = ({ slide, updateSlide }) => {
    const config: HomeworkConfig = slide.homeworkConfig || {
        title: '',
        instructions: '',
        submissionType: 'file',
        points: 100,
    };

    const updateConfig = (updates: Partial<HomeworkConfig>) => {
        updateSlide({
            homeworkConfig: { ...config, ...updates, submissionType: 'file' }
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto select-none">
            <div className="max-w-5xl mx-auto w-full p-8 flex flex-col gap-8">

                {/* ── Header ─────────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center shadow-md">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800">Ödev Editörü</h2>
                            <p className="text-xs text-gray-400 font-bold mt-0.5">
                                Öğrencinin dosya yükleyeceği ödev sayfasını düzenleyin
                            </p>
                        </div>
                    </div>

                    {/* XP Badge */}
                    <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border-2 border-gray-100 shadow-sm">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-black text-gray-500 uppercase">Ödül:</span>
                        <input
                            type="number"
                            className="w-16 text-center font-black text-gray-800 bg-gray-50 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-violet-500 text-xs"
                            value={config.points ?? 100}
                            onChange={(e) => updateConfig({ points: parseInt(e.target.value) || 0 })}
                        />
                        <span className="text-xs font-black text-gray-400">XP</span>
                    </div>
                </div>

                {/* ── Two-column layout ──────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* LEFT — Instructor input (7 cols) */}
                    <div className="lg:col-span-7 flex flex-col gap-6">

                        {/* Homework Title */}
                        <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">
                                    Ödev Başlığı
                                </label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 hover:border-gray-200 focus:border-violet-500 focus:bg-white rounded-xl font-bold text-gray-800 placeholder-gray-400 transition-all text-sm outline-none"
                                    value={config.title}
                                    placeholder="Ör: Değişkenler Ödevi"
                                    onChange={(e) => updateConfig({ title: e.target.value })}
                                />
                            </div>

                            {/* Question / Instructions */}
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <FileText size={12} />
                                    Soru / Yönerge
                                </label>
                                <textarea
                                    className="w-full h-72 px-4 py-3 bg-gray-50 border-2 border-gray-100 hover:border-gray-200 focus:border-violet-500 focus:bg-white rounded-xl font-medium text-gray-700 placeholder-gray-400 transition-all text-sm outline-none resize-none"
                                    value={config.instructions}
                                    placeholder="Öğrenciye yönelik soruyu veya görevi buraya yazın…"
                                    onChange={(e) => updateConfig({ instructions: e.target.value })}
                                />
                                <p className="text-[10px] text-gray-400 font-bold mt-1.5 text-right">
                                    {config.instructions?.length ?? 0} karakter
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT — Preview & info (5 cols) */}
                    <div className="lg:col-span-5 flex flex-col gap-6">

                        {/* File upload info card */}
                        <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm p-6">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                                <Upload size={12} />
                                Teslim Türü
                            </p>
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-violet-50 border-2 border-violet-200">
                                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0">
                                    <Upload size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-violet-800">Dosya Yükleme</p>
                                    <p className="text-[10px] font-bold text-violet-500 mt-0.5">
                                        PDF, DOCX, ZIP, PNG vb. her türlü dosya
                                    </p>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium mt-3 leading-relaxed">
                                Öğrenci bu ödeve herhangi bir dosya yükleyerek teslim eder. Teslim sonrası XP ve elmas kazanır.
                            </p>
                        </div>

                        {/* Live preview card */}
                        <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                            <h4 className="font-black text-sm uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                <Eye size={14} /> Öğrenci Önizlemesi
                            </h4>
                            <p className="text-[10px] text-violet-200 font-bold mb-4">
                                Öğrencinin göreceği ödev kartı
                            </p>

                            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-violet-200">Ödev</span>
                                    <span className="bg-yellow-400 text-yellow-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        AKTİF
                                    </span>
                                </div>
                                <p className="font-black text-sm text-white truncate">
                                    {config.title || 'Başlıksız Ödev'}
                                </p>
                                <p className="text-[11px] text-violet-100 line-clamp-2 leading-relaxed">
                                    {config.instructions || 'Henüz soru girilmedi…'}
                                </p>
                                <div className="flex justify-between items-center text-[10px] text-violet-200 font-bold pt-2 border-t border-white/10">
                                    <span className="flex items-center gap-1">
                                        <Upload size={10} /> Dosya Yükle
                                    </span>
                                    <span>+{config.points ?? 100} XP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeworkBuilder;
