import React, { useState, useEffect } from 'react';
import { BookOpen, Star, X, BrainCircuit, Sparkles, FileText, Code, Image, File, CheckCircle2, Send, Play, Terminal, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import HomeworkAIReview from './HomeworkAIReview';
import { evaluateHomeworkByType, type AIReviewResult } from './homeworkAIService';
import { usePyodide } from '../../hooks/usePyodide';
import api from '../../api';

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
    const [liveSlide, setLiveSlide] = useState<any>(slide);

    useEffect(() => {
        setLiveSlide(slide);
    }, [slide]);

    // Always fetch fresh homework config from backend using the correct nodeId
    useEffect(() => {
        // The real backend node_id is stored as slide.nodeId (injected by getHomeworkSlide in HomePage)
        const targetNodeId = slide?.nodeId || slide?.node_id;
        console.log('[HomeworkView] slide prop:', slide);
        console.log('[HomeworkView] targetNodeId:', targetNodeId, '| courseId:', courseId);
        if (!targetNodeId || !courseId || isPreviewMode) return;

        api.get(`/courses/${courseId}/lessons/${targetNodeId}`)
            .then(res => {
                console.log('[HomeworkView] Fetched lesson data:', res.data);
                const fetchedSlides: any[] = res.data?.slides || [];
                const hw = fetchedSlides.find((s: any) => s.type === 'homework' || s.homeworkConfig);
                console.log('[HomeworkView] Found hw slide:', hw);
                if (hw) {
                    // Preserve nodeId so submit also works correctly
                    setLiveSlide({ ...hw, nodeId: targetNodeId });
                }
            })
            .catch((err) => { console.error('[HomeworkView] Fetch error:', err); });
    }, [courseId, slide?.nodeId, slide?.node_id, isPreviewMode]);



    const activeSlideData = liveSlide || slide;

    const parsedHwConfig = typeof activeSlideData?.homeworkConfig === 'string'
        ? (() => { try { return JSON.parse(activeSlideData.homeworkConfig); } catch { return {}; } })()
        : (activeSlideData?.homeworkConfig || {});

    const config = {
        title: parsedHwConfig.title || activeSlideData?.title || activeSlideData?.noteTitle || 'Ödev Görevi',
        instructions: parsedHwConfig.instructions || activeSlideData?.instructions || activeSlideData?.lessonTopic || activeSlideData?.description || 'Ödev talimatları henüz girilmemiş.',
        submissionType: parsedHwConfig.submissionType || activeSlideData?.submissionType || 'text',
        points: parsedHwConfig.points || activeSlideData?.points || 100,
        starterCode: parsedHwConfig.starterCode || activeSlideData?.starterCode || '# Kodunuzu buraya yazın\n'
    };

    const submissionType: 'text' | 'code' | 'image' | 'file' = config.submissionType || 'text';
    const storageKey = `homework_submitted_${courseId || 'preview'}_${activeSlideData?.id || slide?.id}`;
    const savedAnswerText = !isPreviewMode ? (localStorage.getItem(`${storageKey}_text`) || '') : '';
    const isAlreadySubmitted = !isPreviewMode && localStorage.getItem(storageKey) === 'true' && (
        (submissionType === 'text' || submissionType === 'code') ? savedAnswerText.trim().length > 0 : true
    );

    // ── State ─────────────────────────────────────────────────────
    const { runCode, output, isLoading: isRunningCode, error: pyodideError } = usePyodide();
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
    const [aiError, setAiError] = useState<string | null>(null);
    const [showReview, setShowReview] = useState(false);
    const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
    const [answerText, setAnswerText] = useState(savedAnswerText || config.starterCode || '');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(isAlreadySubmitted);
    const [submittedAnswerText, setSubmittedAnswerText] = useState(savedAnswerText);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [updateSuccessMsg, setUpdateSuccessMsg] = useState<string | null>(null);
    const [submissionStatus, setSubmissionStatus] = useState<string>('submitted');
    const [instructorFeedback, setInstructorFeedback] = useState<string | null>(null);

    useEffect(() => {
        if (!savedAnswerText && config.starterCode && (!answerText || answerText === '# Kodunuzu buraya yazın\n')) {
            setAnswerText(config.starterCode);
        }
    }, [config.starterCode, savedAnswerText]);

    // ── Submission type helpers ────────────────────────────────────
    const typeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
        text:  { label: 'Metin Yanıtı', icon: <FileText size={16} />, color: 'violet' },
        code:  { label: 'Kod Editörü',  icon: <Code    size={16} />, color: 'indigo' },
        image: { label: 'Resim Yükle',  icon: <Image   size={16} />, color: 'rose'   },
        file:  { label: 'Dosya Yükle',  icon: <File    size={16} />, color: 'amber'  },
    };
    const typeInfo = typeLabels[submissionType] || typeLabels['text'];

    const canEvaluate = (submissionType === 'text' || submissionType === 'code')
        ? answerText.trim().length > 0
        : uploadedFile !== null;

    // Fetch existing submission from DB if available
    // Use nodeId (real DB node_id) for the API call
    const hwNodeId = activeSlideData?.nodeId || slide?.nodeId || slide?.node_id || slide?.id;
    useEffect(() => {
        if (courseId && hwNodeId && !isPreviewMode) {
            api.get(`/courses/${courseId}/homework/${hwNodeId}/submission`)
                .then(res => {
                    if (res.data && res.data.submission) {
                        const sub = res.data.submission;
                        if (sub.student_note) {
                            setAnswerText(sub.student_note);
                            setSubmittedAnswerText(sub.student_note);
                            setIsSubmitted(true);
                        }
                        if (sub.status) {
                            setSubmissionStatus(sub.status);
                            localStorage.setItem(`homework_status_${courseId}_${hwNodeId}`, sub.status);
                        }
                        if (sub.feedback) {
                            setInstructorFeedback(sub.feedback);
                        }
                    }
                })
                .catch(() => {});
        }
    }, [courseId, hwNodeId, isPreviewMode]);

    // ── Submit & Update (teslim et ve güncelle) ──────────────────────
    const handleSubmit = async () => {
        if (!canEvaluate || isSubmitting) return;
        setIsSubmitting(true);
        setUpdateSuccessMsg(null);

        try {
            if (!isPreviewMode) {
                localStorage.setItem(storageKey, 'true');
                if (submissionType === 'text' || submissionType === 'code') {
                    localStorage.setItem(`${storageKey}_text`, answerText);
                }

                if (courseId && hwNodeId) {
                    const formData = new FormData();
                    formData.append('answer_text', answerText);
                    if (uploadedFile) {
                        formData.append('file', uploadedFile);
                    }
                    await api.post(`/courses/${courseId}/homework/${hwNodeId}/submit`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }
            setSubmittedAnswerText(answerText);
            setIsSubmitted(true);
            setUpdateSuccessMsg(isSubmitted ? "Cevabınız veritabanında başarıyla güncellendi!" : "Ödeviniz veritabanına başarıyla teslim edildi!");
            setTimeout(() => setUpdateSuccessMsg(null), 4000);
            if (onComplete) onComplete();
        } catch (err) {
            console.error("Database save error for homework:", err);
        } finally {
            setIsSubmitting(false);
        }
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
            className="fixed inset-0 z-[300] flex flex-col w-screen h-screen select-none overflow-y-auto pb-32 animate-in fade-in duration-300 custom-scrollbar"
            style={{
                backgroundColor: '#f8f7ff',
                backgroundImage: 'radial-gradient(#ddd6fe 1px, transparent 1px)',
                backgroundSize: '24px 24px',
            }}
        >
            {/* ── TOP: Clean Symmetrical Heading Area (No Navbar Wrapper) ──────────────────────────── */}
            <div className="w-full px-10 pt-8 pb-2 shrink-0 flex flex-col items-center relative z-50">
                
                {/* Floating Badges (Top-Left) */}
                <div className="absolute left-10 top-8 flex items-center gap-2">
                    {/* Status/Type Badge */}
                    {isSubmitted ? (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-4 py-2.5 rounded-2xl border border-emerald-250/60 flex items-center gap-1.5 shrink-0 shadow-sm">
                            <CheckCircle2 size={12} className="text-emerald-600" />
                            <span>Teslim Edildi</span>
                        </span>
                    ) : (
                        <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-2xl border border-indigo-100 flex items-center gap-1.5 shrink-0 shadow-sm">
                            <Code size={12} className="text-indigo-500" />
                            <span>{typeInfo.label}</span>
                        </span>
                    )}

                    {/* XP Points Badge (Repositioned to Sol Üst) */}
                    <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-100 text-yellow-800 px-4 py-2.5 rounded-2xl border border-yellow-200 flex items-center gap-1.5 shrink-0 shadow-sm">
                        <Star size={12} fill="currentColor" className="text-yellow-600" />
                        <span>+{config.points || 100} XP</span>
                    </span>
                </div>

                {/* Centered Heading Title (No Dropdown Toggles) */}
                <div className="flex items-center gap-3 py-3">
                    <h1 className="text-4xl font-black text-gray-1000 tracking-tight">
                        {config.title}
                    </h1>
                </div>

                {/* Floating/Exit Button (Top-Right) */}
                <div className="absolute right-10 top-8">
                    <button
                        onClick={onClose}
                        className="px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200/60 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-sm flex items-center gap-1.5"
                    >
                        <X size={14} />
                        <span>Kapat</span>
                    </button>
                </div>

                {/* Direct Instruction Container (No Dropdown - Stays open directly) */}
                <div className="w-full px-10 mt-4 shrink-0">
                    <div className="bg-white text-gray-800 p-6 rounded-[2rem] shadow-sm border border-gray-100/60 select-text">
                        <div className="flex justify-between items-center mb-2 pb-1.5 border-b border-gray-100">
                            <span className="font-black text-sm uppercase tracking-wider text-violet-600 flex items-center gap-1.5">
                                Ödev Yönergesi
                            </span>
                        </div>
                        <div className="text-base font-semibold text-gray-700 leading-relaxed whitespace-pre-line pr-2 select-text">
                            {config.instructions || 'Henüz ödev detayları girilmemiş.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Banners strip (Submitted/Feedback messages) */}
            {(isSubmitted || instructorFeedback) && (
                <div className="px-10 pt-4 flex flex-col gap-3 shrink-0">
                    {/* Submitted / Approved banner */}
                    {isSubmitted && (
                        <div className={`border rounded-2xl px-5 py-3.5 flex items-center gap-3 shrink-0 ${
                            submissionStatus === 'approved'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                : 'bg-amber-50 border-amber-200 text-amber-950'
                        }`}>
                            <CheckCircle2 size={20} className={submissionStatus === 'approved' ? 'text-emerald-600 shrink-0' : 'text-amber-505 shrink-0'} />
                            <div>
                                <p className="font-black text-xs uppercase tracking-wide">
                                    {submissionStatus === 'approved' ? '🏆 Eğitmeniniz Ödevinizi Onayladı!' : '⏳ Ödev Teslim Edildi (Eğitmen Onayı Bekleniyor)'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Instructor Feedback Card */}
                    {instructorFeedback && (
                        <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md space-y-2 border border-indigo-500/20 animate-in zoom-in-95 duration-200 shrink-0 flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                                👨‍🏫 Eğitmeninizin Yorumu & Geri Bildirimi
                            </span>
                            <p className="text-xs font-medium text-slate-200 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/10 whitespace-pre-wrap">
                                {instructorFeedback}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* ── MIDDLE: Split Workspace (Left: Editor, Right: Output Console) ──────────────────────────── */}
            <div className="h-[720px] shrink-0 flex flex-col md:flex-row px-10 py-6 gap-6 w-full overflow-hidden">
                
                {/* Check submission type */}
                {(submissionType === 'text' || submissionType === 'code') ? (
                    <>
                        {/* LEFT: Editor Area */}
                        <div className="flex-1 flex flex-col gap-2 h-full min-h-0">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                    <Code size={14} className="text-violet-500" />
                                    <span>{submissionType === 'code' ? 'Python Kod Editörü' : 'Cevap Metni'}</span>
                                </label>
                            </div>
                            <textarea
                                className={`flex-grow w-full px-6 py-5 border-2 border-gray-100 hover:border-violet-300 focus:border-violet-500 rounded-3xl font-medium text-gray-700 placeholder-gray-400 transition-all text-base outline-none resize-none h-full
                                    ${submissionType === 'code'
                                        ? 'bg-gray-900 text-green-400 placeholder-gray-650 border-gray-700 focus:border-indigo-500 font-mono leading-relaxed'
                                        : 'bg-white focus:bg-white leading-relaxed'
                                    }`}
                                placeholder={submissionType === 'code' ? '# Kodunuzu buraya yazın...' : 'Cevabınızı buraya yazın…'}
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                            />
                        </div>

                        {/* RIGHT: Terminal Console Output (Only in code mode) */}
                        {submissionType === 'code' && (
                            <div className="w-[40%] flex flex-col gap-2 h-full min-h-0">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                        <Terminal size={14} className="text-violet-500" />
                                        <span>Konsol Çıktısı</span>
                                    </label>
                                </div>
                                <div className="flex-grow bg-gray-950 text-green-400 font-mono text-xs rounded-3xl p-6 border border-gray-800 flex flex-col overflow-hidden select-text h-full">
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {isRunningCode && (
                                            <div className="flex items-center gap-2 text-yellow-500 animate-pulse mb-2">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                <span>Kod çalıştırılıyor...</span>
                                            </div>
                                        )}
                                        {output.length === 0 && !isRunningCode && (
                                            <span className="text-gray-600 italic block">Çıktı görmek için alt paneldeki "Kodu Çalıştır" butonuna basın.</span>
                                        )}
                                        {output.map((line, idx) => (
                                            <div key={idx} className="whitespace-pre-wrap leading-relaxed">{line}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    // For image/file submission types
                    <div className="flex-grow flex items-center justify-center max-w-4xl mx-auto w-full h-full min-h-0">
                        <label className="w-full h-64 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-violet-400 rounded-[2rem] cursor-pointer bg-white hover:bg-violet-50/20 transition-all group">
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
                    </div>
                )}
            </div>

            {/* ── BOTTOM: Fixed Footer (Action Buttons & Status) ──────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200/80 bg-white/90 backdrop-blur-md px-10 py-5 flex flex-col md:flex-row items-center justify-between gap-4 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
                <div className="flex flex-col items-start gap-1 flex-1">
                    {/* AI error */}
                    {aiError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 shrink-0">
                            <p className="text-xs text-red-600 font-bold">{aiError}</p>
                        </div>
                    )}
                    {/* Submit Success Message */}
                    {updateSuccessMsg && (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black animate-in fade-in flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <span>{updateSuccessMsg}</span>
                        </div>
                    )}
                </div>

                {/* Buttons controls */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Run Code button (Only visible in code submission mode) */}
                    {submissionType === 'code' && (
                        <button
                            onClick={() => runCode(answerText)}
                            disabled={isRunningCode || !answerText.trim()}
                            className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all min-w-[150px]
                                ${isRunningCode || !answerText.trim()
                                    ? 'bg-emerald-100 text-emerald-400 cursor-not-allowed shadow-none'
                                    : 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-600 hover:to-green-700 hover:translate-y-[1px] shadow-emerald-400/20'
                                }`}
                        >
                            {isRunningCode ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-emerald-700 rounded-full animate-spin" />
                                    <span>Çalışıyor...</span>
                                </>
                            ) : (
                                <>
                                    <Play size={14} fill="currentColor" />
                                    <span>Kodu Çalıştır</span>
                                </>
                            )}
                        </button>
                    )}

                    {/* AI Evaluate button (Only active AFTER student has submitted) */}
                    <button
                        onClick={handleEvaluate}
                        disabled={isEvaluating || !canEvaluate || !isSubmitted}
                        className={`px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all min-w-[180px]
                            ${isEvaluating || !canEvaluate || !isSubmitted
                                ? 'bg-indigo-100 text-indigo-400 cursor-not-allowed shadow-none'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700 hover:translate-y-[1px] shadow-indigo-400/20'
                            }`}
                    >
                        {isEvaluating ? (
                            <>
                                <div className="w-4 h-4 border-2 border-indigo-400 border-t-indigo-700 rounded-full animate-spin" />
                                <span>Değerlendiriliyor…</span>
                            </>
                        ) : (
                            <>
                                <BrainCircuit size={16} />
                                <span>AI ile Değerlendir</span>
                            </>
                        )}
                    </button>

                    {/* Submit / Update button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!canEvaluate || isSubmitting}
                        className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition-all min-w-[185px]
                            ${!canEvaluate || isSubmitting
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                : isSubmitted
                                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 hover:translate-y-[1px]'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:translate-y-[1px]'
                            }`}
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                <span>{isSubmitted ? 'Güncelleniyor...' : 'Gönderiliyor...'}</span>
                            </>
                        ) : (
                            <>
                                <Send size={14} />
                                <span>{isSubmitted ? 'CEVABI GÜNCELLE' : `ÖDEVİ GÖNDER +${config.points || 100} XP`}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StudentHomeworkView;

