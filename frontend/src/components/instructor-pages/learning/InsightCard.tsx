import React, { useState } from 'react';
import { Check, Lightbulb, Loader2, MessageCircle, RefreshCw, Sparkles, Wand2, X, Code2, GraduationCap } from 'lucide-react';
import { errorText, learningApi, type Insight, type PracticeDraft } from './learningApi';
import { Card, ErrorBox, formatTime, useLoad } from './learningUi';
import { DoneButton } from './TeacherTools';

/**
 * YZ yorumu kartı (sınıf ya da tek öğrenci).
 *
 * Yorum İSTEK ÜZERİNE üretilir ve saklanır: sayfayı her açışta model
 * çağrılmaz. Veri değiştiyse kart "güncel değil" der; öğretmen isterse yeniler.
 */

const ACTION_META: Record<string, { label: string; icon: React.ElementType }> = {
    reteach: { label: 'Yeniden anlat', icon: GraduationCap },
    practice_task: { label: 'Tekrar görevi', icon: Wand2 },
    talk: { label: 'Öğrenciyle konuş', icon: MessageCircle },
    check_code: { label: 'Koda bak', icon: Code2 },
};

const InsightCard: React.FC<{
    courseId: number;
    studentId?: number;
    onOpenStudent?: (studentId: number) => void;
    onPractice?: (conceptId: string) => void;
}> = ({ courseId, studentId, onOpenStudent, onPractice }) => {
    const { data, error, loading, reload } = useLoad(() => learningApi.insight(courseId, studentId), [courseId, studentId]);
    const [generating, setGenerating] = useState(false);
    const [genError, setGenError] = useState<string | null>(null);
    const [fresh, setFresh] = useState<{ insight: Insight; created_at?: string } | null>(null);

    const insight = fresh?.insight ?? data?.insight ?? null;
    const stale = fresh ? false : (data?.stale ?? true);

    const generate = async (force: boolean) => {
        setGenerating(true);
        setGenError(null);
        try {
            const res = await learningApi.createInsight(courseId, studentId, force);
            if (res.insight) setFresh({ insight: res.insight, created_at: res.created_at });
            reload();
        } catch (err) {
            setGenError(errorText(err, 'Yorum üretilemedi.'));
        } finally {
            setGenerating(false);
        }
    };

    const studentChips = (students: Insight['findings'][number]['students']) => students.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
            {students.map((s) => (
                <button
                    key={s.student_id}
                    onClick={() => onOpenStudent?.(s.student_id)}
                    className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                >
                    {s.name}
                </button>
            ))}
        </div>
    );

    return (
        <Card
            title={studentId ? 'YZ Öğrenci Yorumu' : 'YZ Sınıf Yorumu'}
            icon={<Sparkles size={16} className="text-violet-500" />}
            actions={(
                <button
                    onClick={() => generate(!!insight)}
                    disabled={generating}
                    className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-60"
                >
                    {generating ? <Loader2 size={13} className="animate-spin" /> : insight ? <RefreshCw size={13} /> : <Sparkles size={13} />}
                    {insight ? 'Yenile' : 'Yorum oluştur'}
                </button>
            )}
        >
            {loading && !insight && <p className="text-xs text-gray-400 font-bold">Yükleniyor…</p>}
            {error && <ErrorBox message={error} />}
            {genError && <ErrorBox message={genError} />}
            {!loading && !insight && !genError && (
                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    Veriye dayalı kısa bir değerlendirme ve önerilen adımlar. Model ham kodu değil, bu sayfadaki
                    özet sayıları görür. İstek üzerine üretilir ve saklanır.
                </p>
            )}
            {insight && (
                <div className="space-y-4">
                    {stale && (
                        <p className="text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                            Bu yorum üretildiğinden beri veri değişti — güncel değil.
                        </p>
                    )}
                    <p className="text-sm font-medium text-gray-700 leading-relaxed">{insight.summary}</p>

                    {insight.findings.length > 0 && (
                        <div className="space-y-2">
                            {insight.findings.map((f, i) => (
                                <div key={i} className="flex gap-2">
                                    <Lightbulb size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-gray-800">
                                            {f.title}
                                            {f.concept && <span className="ml-1.5 text-[10px] font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-md">{f.concept}</span>}
                                        </p>
                                        <p className="text-xs text-gray-600 leading-relaxed">{f.detail}</p>
                                        {studentChips(f.students)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {insight.actions.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">ÖNERİLEN ADIMLAR</p>
                            <div className="grid sm:grid-cols-2 gap-2">
                                {insight.actions.map((a, i) => {
                                    const Icon = ACTION_META[a.kind]?.icon ?? Lightbulb;
                                    return (
                                        <div key={i} className="border-2 border-gray-100 rounded-xl p-3">
                                            <p className="flex items-center gap-1.5 text-xs font-black text-gray-800">
                                                <Icon size={13} className="text-indigo-500" /> {a.title}
                                            </p>
                                            <p className="text-[11.5px] text-gray-600 mt-1 leading-relaxed">{a.detail}</p>
                                            {studentChips(a.students)}
                                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                                {a.kind === 'practice_task' && a.concept_id && onPractice && (
                                                    <button
                                                        onClick={() => onPractice(a.concept_id)}
                                                        className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                                                    >
                                                        <Wand2 size={12} /> {a.concept || 'Kavram'} için görev üret
                                                    </button>
                                                )}
                                                {a.kind !== 'practice_task' && (
                                                    <DoneButton
                                                        courseId={courseId}
                                                        kind={a.kind}
                                                        title={a.title}
                                                        conceptId={a.concept_id || null}
                                                        studentId={studentId ?? (a.students.length === 1 ? a.students[0].student_id : null)}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    <p className="text-[10px] font-bold text-gray-300">
                        {formatTime(fresh?.created_at ?? data?.created_at)} · YZ yorumu; kararı sen verirsin.
                    </p>
                </div>
            )}
        </Card>
    );
};

export default InsightCard;

/**
 * Tekrar görevi: sınıfın zorlandığı kavram için Uygula görevi TASLAĞI üretir.
 * Öğretmen görmeden derse hiçbir şey eklenmez; modülü öğretmen seçer.
 */
export const PracticeTaskModal: React.FC<{
    courseId: number;
    conceptId: string;
    onClose: () => void;
}> = ({ courseId, conceptId, onClose }) => {
    const [attempt, setAttempt] = useState(0);
    const { data, error, loading } = useLoad<PracticeDraft>(
        () => learningApi.practiceTask(courseId, conceptId), [courseId, conceptId, attempt],
    );
    const [nodeId, setNodeId] = useState<string>('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const cfg = data?.slide.challengeConfig ?? {};
    const target = nodeId || data?.nodes[0]?.node_id || '';

    const apply = async () => {
        if (!data || !target) return;
        setSaving(true);
        setSaveError(null);
        try {
            const res = await learningApi.applyPracticeTask(courseId, target, data.slide, conceptId);
            setSaved(res.node);
        } catch (err) {
            setSaveError(errorText(err, 'Görev eklenemedi.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-black text-gray-800 flex items-center gap-2">
                        <Wand2 size={17} className="text-indigo-500" /> Tekrar görevi {data ? `· ${data.concept}` : ''}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><X size={18} /></button>
                </header>
                <div className="p-6 space-y-4">
                    {loading && (
                        <p className="flex items-center gap-2 text-sm font-bold text-gray-500">
                            <Loader2 size={16} className="animate-spin" /> Sınıfın yanılgılarına göre görev hazırlanıyor…
                        </p>
                    )}
                    {error && <ErrorBox message={error} />}
                    {data && (
                        <>
                            {data.misconceptions.length > 0 && (
                                <div className="text-[11px] font-bold text-gray-500">
                                    Hedeflenen yanılgılar: {data.misconceptions.join(' · ')}
                                </div>
                            )}
                            <div className="border-2 border-cyan-200 rounded-2xl p-4 space-y-2 bg-cyan-50/30">
                                <p className="text-sm font-black text-gray-800">{cfg.title}</p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{cfg.prompt}</p>
                                {(cfg.criteria ?? []).length > 0 && (
                                    <div className="text-[11px] font-mono text-gray-600 space-y-0.5">
                                        {(cfg.criteria as Array<{ kind: string; value: string }>).map((c, i) => (
                                            <p key={i}><b>{c.kind}</b>: {c.value}</p>
                                        ))}
                                    </div>
                                )}
                                {(cfg.tests ?? []).length > 0 && (
                                    <div className="text-[11px] font-mono text-gray-600 space-y-0.5">
                                        {(cfg.tests as Array<{ call: string; expected: string }>).map((t, i) => (
                                            <p key={i}>{t.call} → {t.expected}</p>
                                        ))}
                                    </div>
                                )}
                                {cfg.hint && <p className="text-[11px] text-cyan-800">İpucu: {cfg.hint}</p>}
                            </div>
                            <p className="text-[10.5px] font-bold text-gray-400">
                                Ekledikten sonra ders oluşturucuda açıp düzenleyebilir, beklenen çıktıyı çözümünle doğrulayabilirsin.
                            </p>
                            {saved ? (
                                <p className="flex items-center gap-2 text-sm font-black text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">
                                    <Check size={16} /> "{saved}" modülünün sonuna eklendi. Etkisi "Yapılanlar" kartında izlenir.
                                </p>
                            ) : (
                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={target}
                                        onChange={(e) => setNodeId(e.target.value)}
                                        className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-100 rounded-xl px-3 py-2"
                                    >
                                        {data.nodes.map((n) => <option key={n.node_id} value={n.node_id}>{n.title} ({n.stage})</option>)}
                                    </select>
                                    <button
                                        onClick={apply}
                                        disabled={saving || !target}
                                        className="flex items-center gap-1.5 text-sm font-black px-4 py-2 rounded-xl bg-indigo-600 text-white disabled:opacity-60"
                                    >
                                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Modüle ekle
                                    </button>
                                    <button
                                        onClick={() => setAttempt((a) => a + 1)}
                                        className="flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-xl border-2 border-gray-100 text-gray-600"
                                    >
                                        <RefreshCw size={14} /> Başka görev
                                    </button>
                                </div>
                            )}
                            {saveError && <ErrorBox message={saveError} />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
