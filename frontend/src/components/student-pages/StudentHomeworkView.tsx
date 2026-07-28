import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Star, X, BrainCircuit, FileText, Code2, Image as ImageIcon, File as FileIcon, Send, Clock, Award, Loader2, Lightbulb } from 'lucide-react';
import HomeworkAIReview from './HomeworkAIReview';
import { evaluateHomeworkByType, type AIReviewResult } from './homeworkAIService';
import api from '../../api';

/** Teslim türü rozetleri — ödev editöründeki (HomeworkBuilder) ile aynı sözlük. */
const SUBMISSION_BADGE: Record<string, { label: string; icon: React.ElementType }> = {
    text:  { label: 'Metin',           icon: FileText  },
    code:  { label: 'Kod',             icon: Code2     },
    image: { label: 'Ekran Görüntüsü', icon: ImageIcon },
    file:  { label: 'Dosya',           icon: FileIcon  },
};

/** Sunucudaki teslim kaydı — öğretmenin verdiği not dahil. */
interface MySubmission {
    id: number;
    file_name: string;
    submitted_at: string | null;
    grade: number | null;
    feedback: string | null;
    graded_at: string | null;
}

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
    const [showHint, setShowHint] = useState(false);

    // Sunucudaki gerçek kayıt. localStorage yalnızca ilk boyama için hızlı bir
    // tahmindi; teslimin gerçekten ulaşıp ulaşmadığını ve notu ancak sunucu bilir.
    const [mySubmission, setMySubmission] = useState<MySubmission | null>(null);
    const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const loadMySubmission = useCallback(async () => {
        if (isPreviewMode || !courseId || !slide?.id) return;
        setIsLoadingSubmission(true);
        try {
            const res = await api.get(`/courses/${courseId}/homework/${slide.id}/submission`);
            if (res.data?.submitted && res.data.submission) {
                setMySubmission(res.data.submission);
                setIsSubmitted(true);
                localStorage.setItem(storageKey, 'true');
            } else {
                // Sunucuda kayıt yok: localStorage yanlış hatırlıyor olabilir
                // (eskiden teslim sunucuya hiç gitmiyordu). Doğrusu sunucudur.
                setMySubmission(null);
                setIsSubmitted(false);
                localStorage.removeItem(storageKey);
            }
        } catch {
            // Ağ hatası: yerel tahmini bozma, sessiz geç.
        } finally {
            setIsLoadingSubmission(false);
        }
    }, [courseId, slide?.id, isPreviewMode, storageKey]);

    useEffect(() => { loadMySubmission(); }, [loadMySubmission]);

    // ── Submission type helpers ────────────────────────────────────
    const typeBadge = SUBMISSION_BADGE[submissionType] || SUBMISSION_BADGE.text;
    const BadgeIcon = typeBadge.icon;

    // Kaçmış `\n` dizileri ekranda ters bölü + n olarak görünüyordu.
    // Kaynağı üretimde düzeltildi; bu, kaydedilmiş eski ödevler için savunma.
    const instructionsText = (config.instructions || '')
        .replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');

    // ── Submit (teslim et) ─────────────────────────────────────────
    // Eskiden yalnızca localStorage'a yazıyordu: öğrenci "teslim edildi" görüyor
    // ama ödev sunucuya HİÇ gitmiyor, öğretmen hiçbir şey göremiyordu.
    const handleSubmit = async () => {
        if (isPreviewMode) {
            setIsSubmitted(true);
            return;
        }
        if (!courseId || !slide?.id) {
            setSubmitError('Ders bilgisi bulunamadı, ödev gönderilemiyor.');
            return;
        }

        // Metin/kod cevabı da dosya olarak gider — teslim ucu multipart bekliyor
        // ve öğretmen tarafı tüm teslimleri tek biçimde (dosya) gösteriyor.
        let payload: File | null = uploadedFile;
        if (submissionType === 'text' || submissionType === 'code') {
            const ext = submissionType === 'code' ? 'py' : 'txt';
            const mime = submissionType === 'code' ? 'text/x-python' : 'text/plain';
            payload = new File([answerText], `cevap.${ext}`, { type: mime });
        }
        if (!payload) {
            setSubmitError('Gönderilecek bir cevap yok.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const form = new FormData();
            form.append('file', payload);
            await api.post(`/courses/${courseId}/homework/${slide.id}/submit`, form, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            localStorage.setItem(storageKey, 'true');
            setIsSubmitted(true);
            // Yeni teslim değerlendirmeyi sıfırlar (sunucu da öyle yapıyor);
            // güncel durumu sunucudan yeniden oku.
            await loadMySubmission();
        } catch (e: any) {
            setSubmitError(e?.response?.data?.detail || 'Ödev gönderilemedi. Tekrar deneyin.');
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
            // Backend, kursa erişim yetkisini bu bağlamla doğrular
            const context = { courseId, nodeId: slide?.id };
            let result: AIReviewResult;
            if (submissionType === 'text' || submissionType === 'code') {
                result = await evaluateHomeworkByType(question, submissionType, answerText, undefined, context);
            } else {
                result = await evaluateHomeworkByType(question, submissionType, undefined, uploadedFile || undefined, context);
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
        // Konumlandırma BURADA yapılmaz: bileşen kabına yayılır, tam ekran mı yoksa
        // slayt çerçevesinin içinde mi duracağına çağıran karar verir. Eskiden burada
        // `fixed inset-0` vardı ve ödev, diğer slaytların çizildiği çerçeveden kaçıp
        // tüm ekranı kaplıyordu — kullanıcının "diğer kısımlar gibi gözükmüyor"
        // dediği fark buydu.
        <div className="h-full w-full overflow-y-auto bg-slate-50 p-4 select-none animate-in fade-in duration-200 sm:p-6">
            <div className="mx-auto w-full max-w-3xl space-y-4 animate-in slide-in-from-bottom-2 duration-200">

                {/* ── Başlık şeridi — UYGULA slaydıyla aynı kart dili ── */}
                <div className="flex items-start justify-between gap-4 rounded-2xl border-2 border-b-[5px] border-blue-200 bg-white px-5 py-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-black tracking-wider text-blue-700">
                                <BadgeIcon size={11} /> {typeBadge.label}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                                <Star size={10} className="fill-amber-500 text-amber-500" /> +{config.points || 100} XP
                            </span>
                            {isSubmitted && !mySubmission?.graded_at && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-600">
                                    <Clock size={10} /> Değerlendirme bekliyor
                                </span>
                            )}
                        </div>
                        <h2 className="mt-2 text-lg font-black leading-tight tracking-tight text-slate-800">
                            {config.title || 'Başlıksız Ödev'}
                        </h2>
                    </div>

                    <button
                        onClick={onClose}
                        className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Kapat"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Öğretmen değerlendirmesi ──
                    graded_at tek doğruluk kaynağı: 0 geçerli bir nottur, grade'in
                    dolu olmasına bakmak 0 alan öğrenciyi "değerlendirilmemiş" gösterirdi. */}
                {mySubmission?.graded_at && (
                    <div className="rounded-2xl border-2 border-b-[5px] border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <span className="flex items-center gap-2 text-[10px] font-black tracking-widest text-emerald-700">
                                <Award size={13} /> ÖĞRETMEN DEĞERLENDİRMESİ
                            </span>
                            {mySubmission.grade !== null && (
                                <span className="rounded-xl border-2 border-emerald-200 bg-white px-4 py-1 text-lg font-black tabular-nums text-emerald-700">
                                    {mySubmission.grade} / 100
                                </span>
                            )}
                        </div>
                        {mySubmission.feedback && (
                            <p className="mt-2.5 whitespace-pre-line rounded-xl border-2 border-emerald-200 bg-white p-3 text-[13px] font-medium leading-relaxed text-emerald-900">
                                {mySubmission.feedback}
                            </p>
                        )}
                        <p className="mt-2 text-[10.5px] font-bold text-emerald-600">
                            Cevabını güncellersen bu değerlendirme silinir, öğretmenin tekrar bakması gerekir.
                        </p>
                    </div>
                )}

                {/* ── Görev metni ── */}
                <div className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white p-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-slate-500">
                        <BookOpen size={13} /> GÖREV
                    </span>
                    <p className="mt-2 whitespace-pre-line text-[13.5px] font-medium leading-relaxed text-slate-700">
                        {instructionsText || 'Henüz soru eklenmemiş.'}
                    </p>
                </div>

                {/* ── İpucu ── */}
                {config.hint && (
                    <div className="rounded-2xl border-2 border-b-[5px] border-amber-200 bg-amber-50 p-4">
                        <button
                            onClick={() => setShowHint((v) => !v)}
                            className="flex items-center gap-2 text-[10px] font-black tracking-widest text-amber-700"
                        >
                            <Lightbulb size={13} /> İPUCU {showHint ? '−' : '+'}
                        </button>
                        {showHint && (
                            <p className="mt-2 whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-amber-900">
                                {config.hint}
                            </p>
                        )}
                    </div>
                )}

                {/* ── Cevap alanı ── */}
                <div className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white p-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-slate-500">
                        <BadgeIcon size={13} /> CEVABIN
                    </span>

                    {(submissionType === 'text' || submissionType === 'code') && (
                        <textarea
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            rows={submissionType === 'code' ? 12 : 8}
                            spellCheck={submissionType !== 'code'}
                            placeholder={submissionType === 'code' ? '# Kodunu buraya yaz' : 'Cevabını buraya yaz…'}
                            className={`mt-1.5 w-full resize-y rounded-xl border-2 p-3 text-[13px] outline-none transition-colors ${
                                submissionType === 'code'
                                    ? 'border-slate-700 bg-slate-900 font-mono leading-relaxed text-emerald-300'
                                    : 'border-slate-200 bg-slate-50 font-medium leading-relaxed text-slate-700 focus:border-blue-400 focus:bg-white'
                            }`}
                        />
                    )}

                    {(submissionType === 'image' || submissionType === 'file') && (
                        <label className="mt-1.5 flex min-h-[150px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50/40">
                            <input
                                type="file"
                                className="hidden"
                                accept={submissionType === 'image' ? 'image/*' : '*'}
                                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                            />
                            {uploadedFile ? (
                                <>
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                        <BadgeIcon size={20} />
                                    </div>
                                    <span className="text-[13px] font-black text-slate-700">{uploadedFile.name}</span>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {(uploadedFile.size / 1024).toFixed(1)} KB — değiştirmek için tıkla
                                    </span>
                                </>
                            ) : (
                                <>
                                    <BadgeIcon size={26} className="text-slate-400" />
                                    <span className="text-[13px] font-bold text-slate-500">
                                        {submissionType === 'image' ? 'Ekran görüntüsü seç' : 'Dosya seç'}
                                    </span>
                                    <span className="text-[11px] font-bold text-slate-400">
                                        {submissionType === 'image' ? 'PNG, JPG, WEBP' : 'PDF, ZIP, DOCX…'} — en fazla 5 MB
                                    </span>
                                </>
                            )}
                        </label>
                    )}

                    {isLoadingSubmission && !mySubmission && (
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                            <Loader2 size={12} className="animate-spin" /> Teslim durumu kontrol ediliyor…
                        </p>
                    )}
                </div>

                {/* ── Eylemler ── */}
                <div className="space-y-2 pb-4">
                    <button
                        onClick={handleSubmit}
                        disabled={!canEvaluate || isSubmitting}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-3 text-[13px] font-black tracking-wide transition-all ${
                            canEvaluate && !isSubmitting
                                ? 'border-b-[5px] border-blue-700 bg-blue-600 text-white hover:bg-blue-700 active:translate-y-[2px] active:border-b-2'
                                : 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                        }`}
                    >
                        {isSubmitting ? (
                            <><Loader2 size={15} className="animate-spin" /> GÖNDERİLİYOR…</>
                        ) : isSubmitted ? (
                            <><Send size={15} /> CEVABI GÜNCELLE</>
                        ) : (
                            <><Send size={15} /> ÖDEVİ TESLİM ET (+{config.points || 100} XP)</>
                        )}
                    </button>

                    {submitError && (
                        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3 py-2">
                            <p className="text-[12px] font-bold text-rose-600">{submitError}</p>
                        </div>
                    )}

                    <button
                        onClick={handleEvaluate}
                        disabled={isEvaluating || !canEvaluate}
                        className={`flex w-full items-center justify-center gap-2 rounded-2xl border-2 py-2.5 text-[12px] font-black tracking-wide transition-all ${
                            isEvaluating || !canEvaluate
                                ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                                : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                        }`}
                    >
                        {isEvaluating ? (
                            <><Loader2 size={14} className="animate-spin" /> AI DEĞERLENDİRİYOR…</>
                        ) : (
                            <><BrainCircuit size={14} /> TESLİM ETMEDEN AI GERİ BİLDİRİMİ AL</>
                        )}
                    </button>

                    {aiError && (
                        <div className="rounded-xl border-2 border-rose-200 bg-rose-50 px-3 py-2">
                            <p className="text-[12px] font-bold text-rose-600">{aiError}</p>
                        </div>
                    )}

                    <p className="text-center text-[10.5px] font-medium text-slate-400">
                        AI geri bildirimi denemen içindir; notunu öğretmenin verir.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudentHomeworkView;
