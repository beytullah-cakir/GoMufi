import React, { useEffect, useState } from 'react';
import { ArrowRight, Brain, Check, CheckCircle2, Lightbulb, Loader2, RotateCcw, X, Zap } from 'lucide-react';
import api from '../../api';
import { Card, CardTitle, ChunkyButton, Mufi } from './ui';
import { Confetti } from './rewards';

/**
 * "Zorlandığım konular" — 3 dakikalık kişisel tekrar.
 *
 * Kavram hakimiyeti zaten ölçülüyordu (öğretmen sayfası ve Kazanımlarım) ama
 * öğrenci onunla bir şey YAPAMIYORDU. Burada en zayıf kavramlar kısa bir
 * açıklamayla gelir, ardından öğrencinin daha önce gördüğü modüllerden birkaç
 * soru (önce yanlış cevapladıkları). Doğru şık sunucuda kalır; cevap orada
 * değerlendirilir ve yanlış şıkkın yanılgısı açıklama olarak döner.
 */

interface ReviewConcept { concept_id: string; label: string; description: string; modules: string[] }
interface ReviewQuestion { key: string; question: string; multiple: boolean; options: { id: string; text: string }[]; concept: string | null }
export interface ReviewPlan {
    concepts: ReviewConcept[];
    questions: ReviewQuestion[];
    xp_reward: number;
    min_answered: number;
    done_today: boolean;
}
interface Graded { key: string; correct: boolean; correct_ids: string[]; explanation: string | null }

export const useReviewPlan = (courseId: string | number | undefined, reloadKey: unknown) => {
    const [plan, setPlan] = useState<ReviewPlan | null>(null);
    useEffect(() => {
        if (!courseId) return;
        let alive = true;
        api.get<ReviewPlan>(`/progress/courses/${courseId}/review`)
            .then((r) => { if (alive) setPlan(r.data); })
            .catch(() => { if (alive) setPlan(null); });
        return () => { alive = false; };
    }, [courseId, reloadKey]);
    return plan;
};

/** Ana sayfadaki giriş kartı. Tekrar edilecek bir şey yoksa hiç görünmez. */
export const ReviewCard: React.FC<{ plan: ReviewPlan | null; onStart: () => void }> = ({ plan, onStart }) => {
    if (!plan || plan.questions.length === 0) return null;
    const topics = plan.concepts.map((c) => c.label);
    return (
        <Card className="p-4">
            <CardTitle icon={Brain} tone="violet" hint={plan.done_today ? 'Bugünkü tekrarını yaptın ✓' : `≈3 dakika · +${plan.xp_reward} XP`}>
                Zorlandığım konular
            </CardTitle>
            <p className="text-sm font-bold text-slate-500 -mt-1">
                {topics.length
                    ? <>Şunları biraz tekrar edelim: <span className="text-slate-700">{topics.join(', ')}</span></>
                    : 'Daha önce takıldığın birkaç soruya tekrar bakalım.'}
            </p>
            <ChunkyButton variant={plan.done_today ? 'white' : 'primary'} className="w-full mt-3" onClick={onStart}>
                {plan.done_today ? <><RotateCcw size={16} /> Yine de tekrar et</> : <><Zap size={16} /> Tekrara başla</>}
            </ChunkyButton>
        </Card>
    );
};

type Step = { kind: 'intro' } | { kind: 'question'; index: number } | { kind: 'done'; correct: number; answered: number; xp: number };

export const ReviewModal: React.FC<{
    courseId: string | number;
    plan: ReviewPlan;
    onClose: (xpAwarded: number) => void;
}> = ({ courseId, plan, onClose }) => {
    const [step, setStep] = useState<Step>({ kind: 'intro' });
    const [selected, setSelected] = useState<string[]>([]);
    const [graded, setGraded] = useState<Graded | null>(null);
    const [answers, setAnswers] = useState<{ key: string; selected: string[] }[]>([]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const total = plan.questions.length;
    const xpAwarded = step.kind === 'done' ? step.xp : 0;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(xpAwarded); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, xpAwarded]);

    const q = step.kind === 'question' ? plan.questions[step.index] : null;

    const toggle = (id: string) => {
        if (graded || !q) return;
        setSelected((prev) => q.multiple ? (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]) : [id]);
    };

    const check = async () => {
        if (!q || !selected.length) return;
        setBusy(true);
        setError(null);
        try {
            const res = await api.post<Graded>(`/progress/courses/${courseId}/review/answer`, { key: q.key, selected });
            setGraded(res.data);
            setAnswers((prev) => [...prev.filter((a) => a.key !== q.key), { key: q.key, selected }]);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Cevap kontrol edilemedi, tekrar dene.');
        } finally {
            setBusy(false);
        }
    };

    const finish = async (all: { key: string; selected: string[] }[]) => {
        setBusy(true);
        setError(null);
        try {
            const res = await api.post(`/progress/courses/${courseId}/review/complete`, { answers: all });
            setStep({ kind: 'done', correct: res.data.correct, answered: res.data.answered, xp: res.data.xp_awarded });
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Tekrar kaydedilemedi.');
        } finally {
            setBusy(false);
        }
    };

    const next = () => {
        if (step.kind !== 'question') return;
        setGraded(null);
        setSelected([]);
        if (step.index + 1 < total) setStep({ kind: 'question', index: step.index + 1 });
        else void finish(answers);
    };

    const optionTone = (id: string) => {
        if (!graded) return selected.includes(id) ? 'bg-violet-50 border-violet-400 text-violet-800' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50';
        if (graded.correct_ids.includes(id)) return 'bg-emerald-50 border-emerald-400 text-emerald-800';
        if (selected.includes(id)) return 'bg-rose-50 border-rose-300 text-rose-700';
        return 'bg-white border-slate-200 text-slate-400';
    };

    return (
        <div role="dialog" aria-modal="true" aria-label="Zorlandığım konular"
             className="fixed inset-0 z-[450] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
            {step.kind === 'done' && step.xp > 0 && <Confetti count={40} />}
            <div className="relative w-full sm:max-w-lg max-h-[92dvh] flex flex-col bg-white rounded-t-[2rem] sm:rounded-[2rem] border-2 border-slate-200 border-b-[8px] animate-pop-in">
                {/* Üst: ilerleme */}
                <div className="flex items-center gap-3 px-5 pt-4 pb-3">
                    <button type="button" onClick={() => onClose(xpAwarded)} aria-label="Kapat" className="p-2 -ml-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={20} /></button>
                    <div className="flex-1 flex gap-1.5">
                        {plan.questions.map((item, i) => {
                            const doneIdx = step.kind === 'done' ? total : step.kind === 'question' ? step.index + (graded ? 1 : 0) : 0;
                            return <span key={item.key} className={`h-2.5 flex-1 rounded-full ${i < doneIdx ? 'bg-violet-500' : 'bg-slate-100'}`} />;
                        })}
                    </div>
                    <span className="text-xs font-black text-slate-400 shrink-0">{step.kind === 'question' ? `${step.index + 1}/${total}` : '≈3 dk'}</span>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5">
                    {step.kind === 'intro' && (
                        <div>
                            <div className="flex items-end gap-3">
                                <Mufi pose="peek" className="w-20 shrink-0" />
                                <div className="relative bg-violet-50 border-2 border-violet-100 rounded-2xl rounded-bl-md px-4 py-3 mb-2">
                                    <p className="text-sm font-black text-slate-700">
                                        {plan.concepts.length
                                            ? 'Bu konularda biraz zorlanmışsın. Hadi kısa bir tekrarla sağlamlaştıralım!'
                                            : 'Daha önce takıldığın sorulara bir daha bakalım. Bu sefer olacak!'}
                                    </p>
                                </div>
                            </div>
                            {plan.concepts.length > 0 && (
                                <ul className="mt-4 space-y-2">
                                    {plan.concepts.map((c) => (
                                        <li key={c.concept_id} className="rounded-2xl border-2 border-slate-100 p-3">
                                            <p className="font-black text-slate-800 flex items-center gap-2"><Lightbulb size={16} className="text-amber-500" /> {c.label}</p>
                                            {c.description && <p className="text-sm font-bold text-slate-500 mt-1">{c.description}</p>}
                                            {c.modules.length > 0 && <p className="text-[11px] font-black text-slate-400 mt-1">Geçtiği yer: {c.modules.join(' · ')}</p>}
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <ChunkyButton size="lg" className="w-full mt-5" onClick={() => setStep({ kind: 'question', index: 0 })}>
                                {total} soruyla başla <ArrowRight size={18} />
                            </ChunkyButton>
                        </div>
                    )}

                    {q && (
                        <div>
                            {q.concept && <span className="inline-block px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700 text-[11px] font-black mb-2">{q.concept}</span>}
                            <p className="text-lg font-black text-slate-800 whitespace-pre-wrap leading-snug">{q.question}</p>
                            {q.multiple && <p className="text-xs font-bold text-slate-400 mt-1">Birden fazla doğru cevap var.</p>}
                            <div className="mt-4 space-y-2">
                                {q.options.map((o) => (
                                    <button key={o.id} type="button" onClick={() => toggle(o.id)} disabled={!!graded}
                                            className={`w-full text-left rounded-2xl border-2 border-b-4 px-4 py-3 font-bold text-sm whitespace-pre-wrap transition-colors flex items-center gap-3 ${optionTone(o.id)}`}>
                                        <span className="flex-1">{o.text}</span>
                                        {graded && graded.correct_ids.includes(o.id) && <Check size={18} className="text-emerald-600 shrink-0" strokeWidth={3} />}
                                        {graded && selected.includes(o.id) && !graded.correct_ids.includes(o.id) && <X size={18} className="text-rose-500 shrink-0" strokeWidth={3} />}
                                    </button>
                                ))}
                            </div>
                            {graded && (
                                <div className={`mt-4 rounded-2xl border-2 p-3 flex gap-3 ${graded.correct ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <Mufi pose={graded.correct ? 'wave' : 'peek'} className="w-12 shrink-0" />
                                    <div className="min-w-0">
                                        <p className={`font-black ${graded.correct ? 'text-emerald-700' : 'text-amber-800'}`}>{graded.correct ? 'Doğru, işte bu!' : 'Olsun, şimdi öğrendin.'}</p>
                                        {!graded.correct && (
                                            <p className="text-sm font-bold text-slate-600 mt-0.5">
                                                {graded.explanation ? <>Dikkat: {graded.explanation}.</> : 'Yeşil olan seçenek doğru cevap.'}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {step.kind === 'done' && (
                        <div className="text-center py-4">
                            <Mufi pose="wave" className="w-28 mx-auto animate-bob" />
                            <h2 className="text-2xl font-black font-display text-slate-800 mt-2">Tekrar tamam!</h2>
                            <p className="text-sm font-bold text-slate-500 mt-1">{step.answered} sorudan {step.correct} tanesini doğru yaptın.</p>
                            {step.xp > 0 ? (
                                <span className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-2xl bg-amber-400 text-amber-950 border-b-4 border-amber-600 font-black"><Zap size={16} /> +{step.xp} XP</span>
                            ) : (
                                <p className="inline-flex items-center gap-1.5 mt-4 text-sm font-black text-emerald-600"><CheckCircle2 size={16} /> Bugünün tekrar XP'sini zaten almıştın</p>
                            )}
                        </div>
                    )}

                    {error && <p className="text-sm font-bold text-rose-600 mt-3">{error}</p>}
                </div>

                {(q || step.kind === 'done') && (
                    <div className="px-5 pb-5">
                        {step.kind === 'done' ? (
                            <ChunkyButton size="lg" variant="green" className="w-full" onClick={() => onClose(xpAwarded)}>Bitir</ChunkyButton>
                        ) : graded ? (
                            <ChunkyButton size="lg" variant={graded.correct ? 'green' : 'primary'} className="w-full" disabled={busy} onClick={next}>
                                {busy ? <Loader2 size={18} className="animate-spin" /> : step.kind === 'question' && step.index + 1 === total ? 'Tekrarı bitir' : 'Devam'}
                            </ChunkyButton>
                        ) : (
                            <ChunkyButton size="lg" className="w-full" disabled={!selected.length || busy} onClick={() => void check()}>
                                {busy ? <Loader2 size={18} className="animate-spin" /> : 'Kontrol et'}
                            </ChunkyButton>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
