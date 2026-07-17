import React, { useState } from 'react';
import { BookOpen, Star, X, BrainCircuit, Sparkles, FileText, Code, Image, File, CheckCircle2, Send } from 'lucide-react';
import HomeworkAIReview from './HomeworkAIReview';
import { evaluateHomeworkByType, type AIReviewResult } from './homeworkAIService';

interface StudentHomeworkViewProps {
    slide: any;
    courseId?: string | number;
    isPreviewMode?: boolean;
    onComplete?: () => void;
    onClose?: () => void;
}

const StudentHomeworkView: React.FC<StudentHomeworkViewProps> = ({
    slide,
    courseId,
    isPreviewMode = false,
    onClose
}) => {
    const config = slide?.homeworkConfig || {
        title: 'Başlıksız Ödev',
        instructions: 'Ödev sorusu girilmemiş.',
        submissionType: 'text',
        points: 100,
    };

    const submissionType: 'text' | 'code' | 'image' | 'file' = config.submissionType || 'text';
    const storageKey = `homework_submitted_${courseId || 'preview'}_${slide?.id}`;
    const isAlreadySubmitted = !isPreviewMode && localStorage.getItem(storageKey) === 'true';

    // ── State ─────────────────────────────────────────────────────
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showReview, setShowReview] = useState(false);
    const [answerText, setAnswerText] = useState(config.starterCode || '');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(isAlreadySubmitted);

    // ── Submission type helpers ────────────────────────────────────
    const typeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
        text:  { label: 'Metin Yanıtı', icon: <FileText size={16} />, color: 'violet' },
        code:  { label: 'Kod Editörü',  icon: <Code    size={16} />, color: 'indigo' },
        image: { label: 'Resim Yükle',  icon: <Image   size={16} />, color: 'rose'   },
        file:  { label: 'Dosya Yükle',  icon: <File    size={16} />, color: 'amber'  },
    };
    const typeInfo = typeLabels[submissionType] || typeLabels['text'];

    // ── Submit (teslim et) ─────────────────────────────────────────
    const handleSubmit = () => {
        if (!isPreviewMode) {
            localStorage.setItem(storageKey, 'true');
        }
        setIsSubmitted(true);
    };

    // ── AI Evaluate ───────────────────────────────────────────────
    const handleEvaluate = async () => {
        const question = config.instructions || config.title;

        if (submissionType === 'text' || submissionType === 'code') {
            if (!answerText.trim()) return;
        } else {
            if (!uploadedFile) return;
        }

        setIsEvaluating(true);
        setAiError(null);

        try {
            let result: AIReviewResult;
            if (submissionType === 'text' || submissionType === 'code') {
                result = await evaluateHomeworkByType(question, submissionType, answerText);
            } else {
                result = await evaluateHomeworkByType(question, submissionType, undefined, uploadedFile || undefined);
            }
            setAiResult(result);
            setShowReview(true);
        } catch (err: any) {
            console.error('AI evaluation error:', err);
            setAiError(err?.message || 'Değerlendirme sırasında hata oluştu.');
        } finally {
            setIsEvaluating(false);
        }
    };

    const canEvaluate = (submissionType === 'text' || submissionType === 'code')
        ? answerText.trim().length > 0
        : uploadedFile !== null;

    // ── Show AI review overlay ────────────────────────────────────
    if (showReview && aiResult) {
        return (
            <HomeworkAIReview
                result={aiResult}
                fileName={uploadedFile?.name || 'cevap.txt'}
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
                            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full border border-white/10 flex items-center gap-1">
                                {typeInfo.icon} {typeInfo.label}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-yellow-950 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Star size={10} fill="currentColor" /> +{config.points || 100} XP
                            </span>
                            {isSubmitted && (
                                <span className="text-[10px] font-black uppercase tracking-wider bg-green-400 text-green-950 px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <CheckCircle2 size={10} /> Teslim Edildi
                                </span>
                            )}
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

                {/* ── RIGHT: Answer + AI panel ─────────────────────── */}
                <div className="flex-1 bg-white p-8 flex flex-col gap-5 overflow-y-auto relative">

                    {/* Submitted banner */}
                    {isSubmitted && (
                        <div className="bg-green-50 border-2 border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
                            <CheckCircle2 size={20} className="text-green-500 shrink-0" />
                            <div>
                                <p className="font-black text-green-700 text-sm">Ödev Teslim Edildi!</p>
                                <p className="text-xs text-green-500 font-medium mt-0.5">Cevabınızı güncelleyebilir veya AI ile analiz ettirebilirsiniz.</p>
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="font-black text-gray-800 text-base tracking-tight flex items-center gap-2">
                            <Sparkles size={18} className="text-violet-500" />
                            {submissionType === 'code' ? 'Kod Editörü' : submissionType === 'image' ? 'Resim Yükle' : submissionType === 'file' ? 'Dosya Yükle' : 'Cevabınızı Yazın'}
                        </h4>
                        <p className="text-xs text-gray-400 font-medium mt-0.5">
                            {submissionType === 'code'
                                ? 'Kodunuzu yazın, AI analiz edip geri bildirim versin.'
                                : submissionType === 'image'
                                ? 'Ekran görüntüsü veya resim yükleyin.'
                                : submissionType === 'file'
                                ? 'Dosyanızı yükleyin (PDF, ZIP, DOCX vb.).'
                                : 'Cevabınızı yazın, AI ödevinizi analiz edip geri bildirim versin.'}
                        </p>
                    </div>

                    {/* ── Text / Code answer area ── */}
                    {(submissionType === 'text' || submissionType === 'code') && (
                        <textarea
                            className={`flex-1 min-h-[200px] w-full px-4 py-3 border-2 border-gray-100 hover:border-violet-300 focus:border-violet-500 rounded-2xl font-medium text-gray-700 placeholder-gray-400 transition-all text-sm outline-none resize-none
                                ${submissionType === 'code'
                                    ? 'bg-gray-900 text-green-400 placeholder-gray-600 border-gray-700 focus:border-indigo-500 font-mono'
                                    : 'bg-gray-50 focus:bg-white'
                                }`}
                            placeholder={submissionType === 'code' ? '# Kodunuzu buraya yazın...' : 'Cevabınızı buraya yazın…'}
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                        />
                    )}

                    {/* ── Image / File upload area ── */}
                    {(submissionType === 'image' || submissionType === 'file') && (
                        <label className="flex-1 min-h-[180px] w-full flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-violet-400 rounded-2xl cursor-pointer bg-gray-50 hover:bg-violet-50/30 transition-all group">
                            <input
                                type="file"
                                className="hidden"
                                accept={submissionType === 'image' ? 'image/*' : '*'}
                                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                            />
                            {uploadedFile ? (
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
                                        {submissionType === 'image' ? <Image size={24} /> : <File size={24} />}
                                    </div>
                                    <p className="font-black text-gray-700 text-sm">{uploadedFile.name}</p>
                                    <p className="text-xs text-gray-400">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                                    <span className="text-xs text-violet-500 font-bold">Değiştirmek için tıklayın</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-400 group-hover:text-violet-500 transition-colors">
                                    {submissionType === 'image' ? <Image size={32} /> : <File size={32} />}
                                    <p className="font-bold text-sm">
                                        {submissionType === 'image' ? 'Resim yüklemek için tıklayın' : 'Dosya yüklemek için tıklayın'}
                                    </p>
                                    <p className="text-xs">{submissionType === 'image' ? 'PNG, JPG, WEBP' : 'PDF, ZIP, DOCX...'}</p>
                                </div>
                            )}
                        </label>
                    )}

                    {/* ── Submit button ── */}
                    {!isSubmitted && (
                        <button
                            onClick={handleSubmit}
                            disabled={!canEvaluate}
                            className={`w-full py-3.5 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all
                                ${canEvaluate
                                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:translate-y-[1px]'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                }`}
                        >
                            <Send size={16} />
                            ÖDEVİ TESLİM ET (+{config.points || 100} XP)
                        </button>
                    )}

                    {/* ── AI Evaluate button ── */}
                    <button
                        onClick={handleEvaluate}
                        disabled={isEvaluating || !canEvaluate}
                        className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all
                            ${isEvaluating || !canEvaluate
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
