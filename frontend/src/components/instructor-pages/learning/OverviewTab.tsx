import React, { useState } from 'react';
import { AlertTriangle, Brain, Check, ClipboardList, Flame, Hand, ShieldAlert, UserX } from 'lucide-react';
import { learningApi, scopeKey, type Scope } from './learningApi';
import InsightCard from './InsightCard';
import { Card, Empty, ErrorBox, FlagList, Loading, OwnShare, pct, Stat, StageBadge, useLoad } from './learningUi';
import { ActionsCard, NudgeBox, ReviewControl } from './TeacherTools';

/**
 * Genel bakış: öğretmenin derse girmeden önce bakacağı tek ekran.
 * Şu an takılanlar, sınıfın zorlandığı kavramlar, en zor görevler, risk
 * altındaki öğrenciler ve kod kökeni işaretleri.
 */
const OverviewTab: React.FC<{
    courseId: number;
    onOpenStudent: (id: number) => void;
    onOpenTask: (key: string) => void;
    onPractice: (conceptId: string) => void;
    onReplay: (studentId: number, name: string, taskKey: string) => void;
    refreshKey: number;
    scope?: Scope;
}> = ({ courseId, onOpenStudent, onOpenTask, onPractice, onReplay, refreshKey, scope }) => {
    const [tick, setTick] = useState(0);
    const { data, error, loading } = useLoad(() => learningApi.overview(courseId, scope), [courseId, refreshKey, tick, scopeKey(scope)]);
    if (loading && !data) return <Loading />;
    if (error) return <ErrorBox message={error} />;
    if (!data) return null;

    const struggling = data.concepts.filter((c) => c.struggling > 0);
    const resolveHelp = async (id: number) => {
        await learningApi.resolveHelp(courseId, id).catch(() => undefined);
        setTick((t) => t + 1);
    };

    return (
        <div className="space-y-6">
            {data.help_open.length > 0 && (
                <Card title={`Yardım isteyenler (${data.help_open.length})`} icon={<Hand size={16} className="text-rose-500" />}>
                    <div className="grid md:grid-cols-2 gap-3">
                        {data.help_open.map((h) => (
                            <div key={h.id} className="p-3 rounded-xl bg-rose-50/60 border border-rose-100 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <button onClick={() => onOpenStudent(h.student_id)} className="text-sm font-black text-gray-800 hover:text-indigo-600">{h.student}</button>
                                        <button onClick={() => onOpenTask(h.task_key)} className="block text-xs font-bold text-gray-500 hover:text-indigo-600 truncate">{h.task}</button>
                                        {h.note && <p className="text-[11px] text-rose-800 mt-1">“{h.note}”</p>}
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className="text-[11px] font-black text-rose-600">{Math.round(h.waiting_minutes)} dk</p>
                                        {h.responded && <p className="text-[10px] font-bold text-emerald-600">cevaplandı</p>}
                                    </div>
                                </div>
                                <NudgeBox courseId={courseId} studentId={h.student_id} taskKey={h.task_key} compact onSent={() => setTick((t) => t + 1)} />
                                <button onClick={() => void resolveHelp(h.id)} className="flex items-center gap-1 text-[10.5px] font-black text-emerald-700 hover:underline">
                                    <Check size={11} /> İlgilendim, kapat
                                </button>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Öğrenci" value={data.student_count} />
                <Stat label="Şu an takılı" value={data.stuck_now.length} tone={data.stuck_now.length ? 'text-rose-600' : 'text-emerald-600'} />
                <Stat label="Risk altında" value={data.at_risk.length} tone={data.at_risk.length ? 'text-amber-600' : 'text-emerald-600'}
                      hint="En az 2 kavramda zorlanan ya da en az 2 görevde takılan öğrenciler" />
                <Stat label="Kod kökeni işareti" value={data.integrity.length} tone={data.integrity.length ? 'text-violet-600' : 'text-emerald-600'}
                      hint={data.integrity_accepted ? `${data.integrity_accepted} işareti inceleyip "sorun yok" dedin` : undefined} />
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card title="Şu an takılı olanlar" icon={<Flame size={16} className="text-rose-500" />}>
                    {data.stuck_now.length === 0 ? <Empty>Son 10 dakikada takılan öğrenci yok.</Empty> : (
                        <div className="space-y-2">
                            {data.stuck_now.map((s) => (
                                <div key={`${s.student_id}-${s.task_key}`} className="flex items-start justify-between gap-2 p-3 rounded-xl bg-rose-50/60 border border-rose-100">
                                    <div className="min-w-0">
                                        <button onClick={() => onOpenStudent(s.student_id)} className="text-sm font-black text-gray-800 hover:text-indigo-600">{s.student}</button>
                                        <button onClick={() => onOpenTask(s.task_key)} className="block text-xs font-bold text-gray-500 hover:text-indigo-600 truncate">{s.task}</button>
                                        {s.last_failure && <p className="text-[11px] text-rose-700 mt-1">Düşen: {s.last_failure}</p>}
                                    </div>
                                    <div className="text-right shrink-0 text-[11px] font-bold text-gray-500">
                                        <p>{s.attempts} deneme</p>
                                        {s.minutes_on_task !== null && <p>{s.minutes_on_task} dk</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <InsightCard courseId={courseId} onOpenStudent={onOpenStudent} onPractice={onPractice} />
            </div>

            <Card title="Sınıfın zorlandığı kavramlar" icon={<Brain size={16} className="text-indigo-500" />}>
                {data.course.tagged_nodes === 0 && (
                    <p className="text-xs font-bold text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
                        Modüllerde kavram etiketi yok; olaylar kavramlara bağlanamıyor. Üstteki "Kavramları etiketle" düğmesini kullan.
                    </p>
                )}
                {struggling.length === 0 ? <Empty>Zorlanılan bir kavram görünmüyor (ya da henüz yeterli veri yok).</Empty> : (
                    <div className="space-y-3">
                        {struggling.map((c) => {
                            const total = c.struggling + c.developing + c.mastered || 1;
                            return (
                                <div key={c.concept_id} className="grid md:grid-cols-[220px_1fr_auto] gap-3 items-center">
                                    <div className="min-w-0">
                                        <p className="text-sm font-black text-gray-800 truncate">{c.label}</p>
                                        {c.misconceptions.length > 0 && (
                                            <p className="text-[11px] text-gray-500 truncate" title={c.misconceptions.join(' · ')}>
                                                “{c.misconceptions[0]}”
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-100" title="Zorlanıyor / Gelişiyor / Hakim">
                                        <div className="bg-rose-400" style={{ width: `${(c.struggling / total) * 100}%` }} />
                                        <div className="bg-amber-300" style={{ width: `${(c.developing / total) * 100}%` }} />
                                        <div className="bg-emerald-400" style={{ width: `${(c.mastered / total) * 100}%` }} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-black text-rose-600">{c.struggling} öğrenci</span>
                                        <button
                                            onClick={() => onPractice(c.concept_id)}
                                            className="text-[11px] font-black px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                                        >
                                            Tekrar görevi
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card title="En zor görevler" icon={<ClipboardList size={16} className="text-cyan-600" />}>
                    {data.hard_tasks.length === 0 ? <Empty>Henüz görev denemesi yok.</Empty> : (
                        <div className="space-y-2">
                            {data.hard_tasks.map((t) => (
                                <button key={t.task_key} onClick={() => onOpenTask(t.task_key)}
                                        className="w-full text-left p-3 rounded-xl border-2 border-gray-100 hover:border-indigo-200">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-sm font-black text-gray-800 truncate">{t.task}</span>
                                        <StageBadge stage={t.stage} />
                                    </div>
                                    <p className="text-[11px] font-bold text-gray-500 mt-1">
                                        Çözen {t.solved}/{t.started} ({pct(t.solve_rate)}) · ilk denemede {pct(t.first_try_rate)}
                                        {t.stuck > 0 && <span className="text-rose-600"> · {t.stuck} takılı</span>}
                                    </p>
                                    {t.top_failures[0] && (
                                        <p className="text-[11px] text-rose-700 mt-0.5">
                                            En çok düşen: {t.top_failures[0].label} ({t.top_failures[0].students} öğrenci)
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </Card>

                <Card title="Risk altındaki öğrenciler" icon={<UserX size={16} className="text-amber-500" />}>
                    {data.at_risk.length === 0 ? <Empty>Risk altında öğrenci yok.</Empty> : (
                        <div className="space-y-2">
                            {data.at_risk.map((s) => (
                                <button key={s.student_id} onClick={() => onOpenStudent(s.student_id)}
                                        className="w-full text-left p-3 rounded-xl border-2 border-gray-100 hover:border-indigo-200">
                                    <p className="text-sm font-black text-gray-800">{s.student}</p>
                                    <p className="text-[11px] text-gray-500 mt-0.5">
                                        {s.struggling_concepts.map((c) => c.label).join(', ') || '—'}
                                        {s.stuck_tasks > 0 && <span className="text-rose-600"> · {s.stuck_tasks} görevde takılı</span>}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>
            </div>

            <Card title="Kod kökeni işaretleri" icon={<ShieldAlert size={16} className="text-violet-500" />}>
                <p className="text-[11px] font-bold text-gray-400 mb-3 flex items-center gap-1">
                    <AlertTriangle size={12} /> Bunlar kanıttır, hüküm değil. Önce kodun nasıl yazıldığını izle, sonra öğrenciyle konuş.
                </p>
                {data.integrity_accepted > 0 && (
                    <p className="text-[11px] font-bold text-emerald-700 mb-3">
                        {data.integrity_accepted} işareti inceleyip “sorun yok” dedin; listede gösterilmiyor.
                    </p>
                )}
                {data.integrity.length === 0 ? <Empty>İşaretli bir teslim yok.</Empty> : (
                    <div className="space-y-3">
                        {data.integrity.map((i) => (
                            <div key={`${i.student_id}-${i.task_key}`} className="grid md:grid-cols-[200px_1fr_auto] gap-3 items-start">
                                <div className="min-w-0">
                                    <button onClick={() => onOpenStudent(i.student_id)} className="text-sm font-black text-gray-800 hover:text-indigo-600">{i.student}</button>
                                    <p className="text-[11px] font-bold text-gray-500 truncate">{i.task}</p>
                                    <p className="text-[11px] font-bold text-gray-500">Kendi yazdığı: <OwnShare value={i.own_share} /></p>
                                </div>
                                <div className="space-y-1.5">
                                    <FlagList flags={i.flags} />
                                    <ReviewControl key={`${i.student_id}-${i.task_key}`} courseId={courseId} studentId={i.student_id}
                                                   taskKey={i.task_key} review={i.review} onChange={() => setTick((t) => t + 1)} />
                                </div>
                                <button onClick={() => onReplay(i.student_id, i.student, i.task_key)}
                                        className="text-[11px] font-black px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100">
                                    Kodu izle
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <ActionsCard courseId={courseId} refreshKey={refreshKey} />
        </div>
    );
};

export default OverviewTab;
