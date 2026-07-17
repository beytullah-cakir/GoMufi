import React, { useState } from 'react';
import { BookOpen, Star, X, BrainCircuit, Sparkles } from 'lucide-react';
import HomeworkAIReview from './HomeworkAIReview';
import { evaluateHomework, type AIReviewResult } from './homeworkAIService';

interface StudentHomeworkViewProps {
    slide: any;
    courseId?: string | number;
    isPreviewMode?: boolean;
    onComplete?: () => void;
    onClose?: () => void;
}

const StudentHomeworkView: React.FC<StudentHomeworkViewProps> = ({
    slide,
    isPreviewMode = false,
    onClose
}) => {
    const config = slide?.homeworkConfig || {
        title: 'Başlıksız Ödev',
        instructions: 'Ödev sorusu girilmemiş.',
        submissionType: 'file',
        points: 100,
    };

    // ── AI Review states ──────────────────────────────────────────
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showReview, setShowReview] = useState(false);
    const [answerText, setAnswerText] = useState('');

    /* ── AI Evaluate ── */
    const handleEvaluate = async () => {
        if (!answerText.trim()) return;
        setIsEvaluating(true);
        setAiError(null);

        try {
            // Cevap metnini Blob/File olarak sarmalayıp servise gönder
            const blob = new Blob([answerText], { type: 'text/plain' });
            const file = new File([blob], 'cevap.txt', { type: 'text/plain' });
            const result = await evaluateHomework(config.instructions || config.title, file);
            setAiResult(result);
            setShowReview(true);
        } catch (err: any) {
            console.error('AI evaluation error:', err);
            setAiError(err?.message || 'Değerlendirme sırasında hata oluştu.');
        } finally {
            setIsEvaluating(false);
        }
    };

    // ── Show AI review overlay ────────────────────────────────────
    if (showReview && aiResult) {
        return (
            <HomeworkAIReview
                result={aiResult}
                fileName="cevap.txt"
                homeworkTitle={config.title || 'Ödev'}
                onBack={() => setShowReview(false)}
                onClose={() => {
                    setShowReview(false);
                    if (onClose) onClose();
                }}
            />
        );
    }

    return (
        <div
            className="fixed inset-0 z-[300] flex items-center justify-center animate-in fade-in duration-300 select-none overflow-hidden"
            style={{
                backgroundColor: '#f8f7ff',
                backgroundImage: 'radial-gradient(#ddd6fe 1px, transparent 1px)',
                backgroundSize: '24px 24px',
            }}
        >
            {/* Card */}
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-[92%] max-w-4xl border-4 border-gray-100 overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200 max-h-[88vh]">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors bg-white shadow-sm"
                >
                    <X size={20} />
                </button>

                {/* ── LEFT: Question panel ──────────────────────────── */}
                <div className="md:w-[44%] bg-gradient-to-b from-violet-600 to-indigo-700 p-8 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-3xl" />

                    <div className="relative z-10 space-y-6 overflow-y-auto">
                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full border border-white/10">
                                DERS ÖDEVİ
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-yellow-950 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Star size={10} fill="currentColor" /> +{config.points || 100} XP
                            </span>
                        </div>

                        {/* Title */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <BookOpen size={18} className="text-white/60 shrink-0" />
                                <span className="text-[10px] font-black text-violet-200 uppercase tracking-widest">Ödev Sorusu</span>
                            </div>
                            <h3 className="text-xl font-black tracking-tight text-white leading-snug">
                                {config.title || 'Başlıksız Ödev'}
                            </h3>
                            <div className="w-10 h-1 bg-white/30 rounded-full mt-3" />
                        </div>

                        {/* Instructions */}
                        <div className="text-sm text-violet-50 font-medium leading-relaxed whitespace-pre-line bg-black/10 p-4 rounded-2xl border border-white/5 max-h-64 overflow-y-auto">
                            {config.instructions || 'Henüz soru eklenmemiş.'}
                        </div>
                    </div>

                    <div className="relative z-10 text-[10px] text-violet-300 font-bold uppercase tracking-wider mt-6 shrink-0">
                        GoMufi Akademi
                    </div>
                </div>

                {/* ── RIGHT: AI Analysis panel ─────────────────────── */}
                <div className="flex-1 bg-white p-8 flex flex-col gap-5 overflow-y-auto relative">

                    <div>
                        <h4 className="font-black text-gray-800 text-base tracking-tight flex items-center gap-2">
                            <Sparkles size={18} className="text-violet-500" />
                            Yapay Zeka ile Analiz
                        </h4>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                            Cevabınızı yazın, AI ödevinizi analiz edip geri bildirim versin.
                        </p>
                    </div>

                    {/* Answer textarea */}
                    <textarea
                        className="flex-1 min-h-[200px] w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 hover:border-violet-300 focus:border-violet-500 focus:bg-white rounded-2xl font-medium text-gray-700 placeholder-gray-400 transition-all text-sm outline-none resize-none"
                        placeholder="Cevabınızı buraya yazın…"
                        value={answerText}
                        onChange={(e) => setAnswerText(e.target.value)}
                    />

                    {/* AI Evaluate button */}
                    <button
                        onClick={handleEvaluate}
                        disabled={isEvaluating || !answerText.trim()}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all
                            ${isEvaluating || !answerText.trim()
                                ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:translate-y-[1px] shadow-indigo-400/30'
                            }`}
                    >
                        {isEvaluating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-indigo-400 border-t-indigo-700 rounded-full animate-spin" />
                                <span>AI Değerlendiriyor…</span>
                            </>
                        ) : (
                            <>
                                <BrainCircuit size={18} />
                                <span>AI ile Değerlendir</span>
                            </>
                        )}
                    </button>

                    {/* AI error */}
                    {aiError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                            <p className="text-xs text-red-600 font-bold">{aiError}</p>
                        </div>
                    )}

                    <p className="text-[10px] text-gray-400 font-medium text-center">
                        Yapay zeka cevabınızı analiz edecek ve detaylı geri bildirim verecektir.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudentHomeworkView;
