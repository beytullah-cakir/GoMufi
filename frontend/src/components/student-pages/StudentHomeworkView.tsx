import React, { useState, useEffect, useCallback } from 'react';
import { BookOpen, Star, X, BrainCircuit, FileText, Code2, Image as ImageIcon, File as FileIcon, Send, Clock, Award, Loader2, Lightbulb, ClipboardList } from 'lucide-react';
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

/**
 * Yönergedeki `**kalın**` ve `` `kod` `` işaretlerini gerçek biçime çevirir.
 *
 * AI yönergeyi markdown alışkanlığıyla yazıyor ve ekranda `**Giriş Kontrolü:**`
 * yıldızlarıyla birlikte görünüyordu. dangerouslySetInnerHTML KULLANILMAZ:
 * bu metin öğretmen/AI kaynaklıdır, React elemanı olarak üretmek daha güvenli.
 */
const renderInline = (text: string): React.ReactNode[] =>
    text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
            return <strong key={i} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
            return (
                <code key={i} className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.92em] text-indigo-700">
                    {part.slice(1, -1)}
                </code>
            );
        }
        return part;
    });

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

    // Konumlandırma BURADA yapılmaz: bileşen kabına yayılır, tam ekran mı yoksa
    // slayt çerçevesinin içinde mi duracağına çağıran karar verir (bkz. HomePage).
    return (
        <div className="h-full w-full overflow-y-auto bg-slate-50 select-none animate-in fade-in duration-200">
            <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">

                {/* ── ÜST ŞERİT ── */}
                <div className="mb-4 flex items-start justify-between gap-4 rounded-3xl border-2 border-b-4 border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-4 shadow-sm">
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                                <BadgeIcon size={11} /> {typeBadge.label}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-black text-amber-950">
                                <Star size={10} className="fill-amber-700 text-amber-700" /> +{config.points || 100} XP
                            </span>
                            {isSubmitted && !mySubmission?.graded_at && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">
                                    <Clock size={10} /> Değerlendirme bekliyor
                                </span>
                            )}
                        </div>
                        <h1 className="mt-2 font-display text-xl font-black leading-tight tracking-tight text-white drop-shadow-sm">
                            {config.title || 'Başlıksız Ödev'}
                        </h1>
                    </div>

                    <button
                        onClick={onClose}
                        className="shrink-0 rounded-2xl bg-white/15 p-2 text-white transition-colors hover:bg-white/25"
                        aria-label="Kapat"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── İKİ PANEL: solda ödev, sağda açıklamalar ── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

                    {/* ══ SOL: görev + cevap ══ */}
                    <div className="space-y-4 lg:col-span-7">

                        <section className="rounded-3xl border-2 border-b-4 border-gray-200 bg-white p-5 shadow-sm">
                            <h2 className="flex items-center gap-1.5 font-display text-[11px] font-black uppercase tracking-widest text-indigo-500">
                                <BookOpen size={14} /> Görev
                            </h2>
                            <div className="mt-2.5 space-y-1.5 text-[13.5px] font-medium leading-relaxed text-slate-700">
                                {instructionsText
                                    ? instructionsText.split('\n').map((line: string, i: number) =>
                                        line.trim() === ''
                                            ? <div key={i} className="h-2" />
                                            : <p key={i}>{renderInline(line)}</p>)
                                    : <p className="italic text-slate-400">Henüz soru eklenmemiş.</p>}
                            </div>
                        </section>

                        <section className="rounded-3xl border-2 border-b-4 border-gray-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <h2 className="flex items-center gap-1.5 font-display text-[11px] font-black uppercase tracking-widest text-indigo-500">
                                    <BadgeIcon size={14} /> Cevabın
                                </h2>
                                {isLoadingSubmission && !mySubmission && (
                                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                                        <Loader2 size={12} className="animate-spin" /> kontrol ediliyor
                                    </span>
                                )}
                            </div>

                            {(submissionType === 'text' || submissionType === 'code') && (
                                <textarea
                                    value={answerText}
                                    onChange={(e) => setAnswerText(e.target.value)}
                                    rows={submissionType === 'code' ? 16 : 10}
                                    spellCheck={submissionType !== 'code'}
                                    placeholder={submissionType === 'code' ? '# Kodunu buraya yaz' : 'Cevabını buraya yaz…'}
                                    className={`mt-2.5 w-full resize-y rounded-2xl border-2 p-4 text-[13px] outline-none transition-colors ${
                                        submissionType === 'code'
                                            ? 'border-slate-700 bg-slate-900 font-mono leading-relaxed text-emerald-300 focus:border-indigo-500'
                                            : 'border-gray-200 bg-slate-50 font-medium leading-relaxed text-slate-700 focus:border-indigo-400 focus:bg-white'
                                    }`}
                                />
                            )}

                            {(submissionType === 'image' || submissionType === 'file') && (
                                <label className="mt-2.5 flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-300 bg-slate-50 p-5 transition-colors hover:border-indigo-400 hover:bg-indigo-50/40">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept={submissionType === 'image' ? 'image/*' : '*'}
                                        onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                                    />
                                    {uploadedFile ? (
                                        <>
                                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                                                <BadgeIcon size={22} />
                                            </div>
                                            <span className="font-display text-[13px] font-black text-slate-700">{uploadedFile.name}</span>
                                            <span className="text-[11px] font-bold text-slate-400">
                                                {(uploadedFile.size / 1024).toFixed(1)} KB — değiştirmek için tıkla
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <BadgeIcon size={28} className="text-slate-300" />
                                            <span className="font-display text-[13px] font-black uppercase tracking-wide text-slate-500">
                                                {submissionType === 'image' ? 'Ekran görüntüsü seç' : 'Dosya seç'}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-400">
                                                {submissionType === 'image' ? 'PNG, JPG, WEBP' : 'PDF, ZIP, DOCX…'} — en fazla 5 MB
                                            </span>
                                        </>
                                    )}
                                </label>
                            )}

                            {/* Basılabilir buton — sistemdeki border-b-4 / active:translate deseni */}
                            <button
                                onClick={handleSubmit}
                                disabled={!canEvaluate || isSubmitting}
                                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-display text-[13px] font-black uppercase tracking-widest transition-all ${
                                    canEvaluate && !isSubmitting
                                        ? 'border-b-4 border-indigo-800 bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:translate-y-[3px] active:border-b-0'
                                        : 'cursor-not-allowed bg-gray-100 text-gray-400'
                                }`}
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={16} className="animate-spin" /> Gönderiliyor…</>
                                ) : isSubmitted ? (
                                    <><Send size={16} /> Cevabı Güncelle</>
                                ) : (
                                    <><Send size={16} /> Ödevi Teslim Et (+{config.points || 100} XP)</>
                                )}
                            </button>

                            {submitError && (
                                <div className="mt-2 rounded-2xl border-2 border-rose-200 bg-rose-50 px-4 py-2.5">
                                    <p className="text-[12px] font-bold text-rose-600">{submitError}</p>
                                </div>
                            )}
                        </section>
                    </div>

                    {/* ══ SAĞ: açıklamalar ══ */}
                    <aside className="space-y-4 lg:col-span-5 lg:sticky lg:top-6 lg:self-start">

                        {/* Öğretmen değerlendirmesi — graded_at tek doğruluk kaynağı:
                            0 geçerli bir nottur, grade dolu mu diye bakmak 0 alan
                            öğrenciyi "değerlendirilmemiş" gösterirdi. */}
                        {mySubmission?.graded_at ? (
                            <section className="rounded-3xl border-2 border-b-4 border-emerald-300 bg-emerald-50 p-5 shadow-sm">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <h2 className="flex items-center gap-1.5 font-display text-[11px] font-black uppercase tracking-widest text-emerald-700">
                                        <Award size={14} /> Öğretmen Notun
                                    </h2>
                                    {mySubmission.grade !== null && (
                                        <span className="rounded-2xl border-2 border-b-4 border-emerald-300 bg-white px-4 py-1 font-display text-xl font-black tabular-nums text-emerald-700">
                                            {mySubmission.grade}
                                            <span className="text-sm text-emerald-400">/100</span>
                                        </span>
                                    )}
                                </div>
                                {mySubmission.feedback && (
                                    <p className="mt-3 whitespace-pre-line rounded-2xl border-2 border-emerald-200 bg-white p-3.5 text-[13px] font-medium leading-relaxed text-emerald-900">
                                        {mySubmission.feedback}
                                    </p>
                                )}
                                <p className="mt-2.5 text-[11px] font-bold leading-relaxed text-emerald-600">
                                    Cevabını güncellersen bu not silinir, öğretmenin tekrar bakması gerekir.
                                </p>
                            </section>
                        ) : isSubmitted ? (
                            <section className="rounded-3xl border-2 border-b-4 border-sky-200 bg-sky-50 p-5 shadow-sm">
                                <h2 className="flex items-center gap-1.5 font-display text-[11px] font-black uppercase tracking-widest text-sky-700">
                                    <Clock size={14} /> Teslim Edildi
                                </h2>
                                <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-sky-800">
                                    Ödevin öğretmenine ulaştı. Notun ve geri bildirimin hazır olunca
                                    tam burada görünecek.
                                </p>
                            </section>
                        ) : (
                            <section className="rounded-3xl border-2 border-b-4 border-gray-200 bg-white p-5 shadow-sm">
                                <h2 className="flex items-center gap-1.5 font-display text-[11px] font-black uppercase tracking-widest text-slate-500">
                                    <ClipboardList size={14} /> Nasıl Değerlendirilir
                                </h2>
                                <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-slate-600">
                                    Cevabını teslim ettikten sonra <b className="text-slate-800">öğretmenin</b> inceleyip
                                    not ve geri bildirim yazar. Sonuç bu panelde çıkar.
                                </p>
                            </section>
                        )}

                        {/* İpucu */}
                        {config.hint && (
                            <section className="rounded-3xl border-2 border-b-4 border-amber-300 bg-amber-50 p-5 shadow-sm">
                                <button
                                    onClick={() => setShowHint((v) => !v)}
                                    className="flex w-full items-center justify-between gap-2 font-display text-[11px] font-black uppercase tracking-widest text-amber-700"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <Lightbulb size={14} /> İpucu
                                    </span>
                                    <span className="text-base leading-none">{showHint ? '−' : '+'}</span>
                                </button>
                                {showHint && (
                                    <p className="mt-2.5 whitespace-pre-line text-[12.5px] font-medium leading-relaxed text-amber-900">
                                        {config.hint}
                                    </p>
                                )}
                            </section>
                        )}

                        {/* AI yardımcısı — teslimin YERİNE geçmez, bu yüzden ayrı ve daha sakin */}
                        <section className="rounded-3xl border-2 border-b-4 border-violet-200 bg-white p-5 shadow-sm">
                            <h2 className="flex items-center gap-1.5 font-display text-[11px] font-black uppercase tracking-widest text-violet-600">
                                <BrainCircuit size={14} /> AI Yardımcısı
                            </h2>
                            <p className="mt-2 text-[12.5px] font-medium leading-relaxed text-slate-600">
                                Teslim etmeden önce cevabını AI'ya gösterip geri bildirim alabilirsin.
                                Bu <b className="text-slate-800">notunu etkilemez</b> — notu öğretmenin verir.
                            </p>
                            <button
                                onClick={handleEvaluate}
                                disabled={isEvaluating || !canEvaluate}
                                className={`mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-2.5 font-display text-[12px] font-black uppercase tracking-widest transition-all ${
                                    isEvaluating || !canEvaluate
                                        ? 'cursor-not-allowed bg-gray-100 text-gray-400'
                                        : 'border-b-4 border-violet-700 bg-violet-600 text-white hover:bg-violet-700 active:translate-y-[3px] active:border-b-0'
                                }`}
                            >
                                {isEvaluating ? (
                                    <><Loader2 size={14} className="animate-spin" /> İnceliyor…</>
                                ) : (
                                    <><BrainCircuit size={14} /> Geri Bildirim Al</>
                                )}
                            </button>
                            {!canEvaluate && (
                                <p className="mt-2 text-center text-[11px] font-bold text-slate-400">
                                    Önce bir cevap gir
                                </p>
                            )}
                            {aiError && (
                                <div className="mt-2 rounded-2xl border-2 border-rose-200 bg-rose-50 px-3 py-2">
                                    <p className="text-[12px] font-bold text-rose-600">{aiError}</p>
                                </div>
                            )}
                        </section>
                    </aside>
                </div>
            </div>
        </div>
    );
};

export default StudentHomeworkView;
