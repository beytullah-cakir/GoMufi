/**
 * HomeworkAIReview.tsx
 * Gemini'nin ödev değerlendirme sonuçlarını gösteren güzel, detaylı UI.
 */

import React from 'react';
import { CheckCircle2, XCircle, Lightbulb, Star, BarChart3, ArrowLeft, Sparkles, Code } from 'lucide-react';
import type { AIReviewResult } from './homeworkAIService';

interface HomeworkAIReviewProps {
    result: AIReviewResult;
    fileName: string;
    homeworkTitle: string;
    onBack: () => void;   // "Geri Dön" → success screen'e döner
    onClose: () => void;
}

const ScoreRing: React.FC<{ score: number }> = ({ score }) => {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    const color =
        score >= 80 ? '#22c55e'  // green-500
        : score >= 60 ? '#f59e0b' // amber-500
        : '#ef4444';              // red-500

    const bgColor =
        score >= 80 ? '#dcfce7'
        : score >= 60 ? '#fef3c7'
        : '#fee2e2';

    return (
        <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
            <svg width="144" height="144" className="-rotate-90">
                {/* Background circle */}
                <circle cx="72" cy="72" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="10" />
                {/* Score arc */}
                <circle
                    cx="72" cy="72" r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: 'transparent' }}>
                <span className="text-3xl font-black" style={{ color }}>{score}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">/ 100</span>
            </div>
        </div>
    );
};

const HomeworkAIReview: React.FC<HomeworkAIReviewProps> = ({
    result,
    fileName,
    homeworkTitle,
    onBack,
    onClose
}) => {
    const scoreLabel =
        result.overallScore >= 80 ? 'Harika!'
        : result.overallScore >= 60 ? 'İyi'
        : result.overallScore >= 40 ? 'Geliştirilmeli'
        : 'Yetersiz';

    const scoreColor =
        result.overallScore >= 80 ? 'text-green-600'
        : result.overallScore >= 60 ? 'text-amber-600'
        : 'text-red-500';

    return (
        <div
            className="fixed inset-0 z-[400] flex items-center justify-center overflow-hidden"
            style={{
                backgroundColor: '#f0f4ff',
                backgroundImage: 'radial-gradient(#c7d2fe 1px, transparent 1px)',
                backgroundSize: '22px 22px',
            }}
        >
            {/* Outer card */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-[94%] max-w-5xl max-h-[92vh] border-4 border-indigo-50 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* ── Top bar ──────────────────────────────────────────── */}
                <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-8 py-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                            <Sparkles size={18} className="text-white" />
                        </div>
                        <div>
                            <p className="text-white font-black text-base leading-tight">AI Değerlendirme Raporu</p>
                            <p className="text-indigo-200 text-[11px] font-bold truncate max-w-xs">{homeworkTitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/60 hover:text-white text-[11px] font-black uppercase tracking-wider transition-colors"
                    >
                        Kapat ✕
                    </button>
                </div>

                {/* ── Body (scrollable) ────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                        {/* ── LEFT column: Score + Summary (4/12) ── */}
                        <div className="md:col-span-4 flex flex-col gap-5">

                            {/* Score card */}
                            <div className="bg-gray-50 rounded-3xl border-2 border-gray-100 p-6 text-center">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-1">
                                    <BarChart3 size={12} /> Genel Puan
                                </p>
                                <ScoreRing score={result.overallScore} />
                                <p className={`text-lg font-black mt-3 ${scoreColor}`}>{scoreLabel}</p>
                                <p className="text-[11px] text-gray-400 font-bold mt-1 truncate">{fileName}</p>
                            </div>

                            {/* Summary */}
                            <div className="bg-indigo-50 rounded-3xl border-2 border-indigo-100 p-5">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">
                                    Genel Değerlendirme
                                </p>
                                <p className="text-sm text-indigo-900 font-medium leading-relaxed">
                                    {result.summary || 'Değerlendirme özeti bulunamadı.'}
                                </p>
                            </div>

                            {/* Back button */}
                            <button
                                onClick={onBack}
                                className="flex items-center justify-center gap-2 text-xs font-black text-gray-400 hover:text-gray-600 transition-colors py-2"
                            >
                                <ArrowLeft size={14} /> Geri Dön
                            </button>
                        </div>

                        {/* ── RIGHT column: Details (8/12) ── */}
                        <div className="md:col-span-8 flex flex-col gap-5">

                             {/* Weaknesses & Fixes */}
                             {result.weaknesses.length > 0 ? (
                                 <div className="bg-red-50 rounded-3xl border-2 border-red-100 p-6 space-y-6">
                                     <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1.5 border-b border-red-100/50 pb-3">
                                         <XCircle size={14} /> Eksik / Hatalı Noktalar ve Çözümleri
                                     </p>
                                     <div className="space-y-6">
                                         {result.weaknesses.map((w, i) => (
                                             <div key={i} className="bg-white rounded-2xl border border-red-100/50 p-5 shadow-sm space-y-4">
                                                 {/* Explanation */}
                                                 <div className="flex items-start gap-2.5">
                                                     <span className="mt-0.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 text-xs font-black">
                                                         {i + 1}
                                                     </span>
                                                     <span className="text-sm text-red-950 font-bold leading-relaxed">{w.explanation}</span>
                                                 </div>

                                                 {/* Code comparison stacks */}
                                                 {(w.studentCode || w.improvedCode) && (
                                                     <div className="flex flex-col gap-3 pl-8.5">
                                                         {/* Student Code */}
                                                         {w.studentCode && (
                                                             <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 font-mono text-[11.5px] text-red-300 relative">
                                                                 <div className="text-[9px] font-black text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                     <span>⚠️ Senin Kodun</span>
                                                                 </div>
                                                                 <pre className="whitespace-pre-wrap overflow-x-auto">{w.studentCode}</pre>
                                                             </div>
                                                         )}

                                                         {/* Improved Code */}
                                                         {w.improvedCode && (
                                                             <div className="bg-emerald-950 border border-emerald-900 rounded-xl p-4 font-mono text-[11.5px] text-emerald-300 relative">
                                                                 <div className="text-[9px] font-black text-emerald-450 uppercase tracking-wider mb-2 flex items-center gap-1">
                                                                     <span>✨ Önerilen İyileştirme</span>
                                                                 </div>
                                                                 <pre className="whitespace-pre-wrap overflow-x-auto">{w.improvedCode}</pre>
                                                             </div>
                                                         )}
                                                     </div>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                 </div>
                             ) : (
                                 <div className="flex flex-col items-center justify-center py-20 text-gray-300 bg-white border-2 border-dashed border-gray-150 rounded-3xl">
                                     <Star size={48} className="animate-spin duration-1000" />
                                     <p className="text-sm font-black mt-4">Harika! Hiçbir eksik veya hata bulunamadı.</p>
                                 </div>
                             )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeworkAIReview;
