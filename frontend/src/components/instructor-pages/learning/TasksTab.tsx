import React, { useState } from 'react';
import { ArrowLeft, Bug, Brain, Flame, Hand, ListX, MessageSquarePlus } from 'lucide-react';
import { learningApi, scopeKey, type Counted, type Scope } from './learningApi';
import { Card, Empty, ErrorBox, FlagList, Loading, OwnShare, pct, Stat, StageBadge, useLoad } from './learningUi';
import { NudgeBox, ReviewControl } from './TeacherTools';

/** Görevler: hangi görev sınıfı zorluyor, neden (düşen ölçüt, hata, yanılgı), kim takıldı. */

const CountList: React.FC<{ items: Counted[]; empty: string; tone: string }> = ({ items, empty, tone }) => (
    items.length === 0 ? <Empty>{empty}</Empty> : (
        <div className="space-y-1.5">
            {items.map((i) => (
                <div key={i.label} className="flex items-start justify-between gap-2 text-xs">
                    <span className={`font-bold ${tone}`}>{i.label}</span>
                    <span className="font-black text-gray-500 shrink-0">{i.students} öğrenci</span>
                </div>
            ))}
        </div>
    )
);

export const TaskDetailView: React.FC<{
    courseId: number;
    taskKey: string;
    refreshKey: number;
    onBack: () => void;
    onOpenStudent: (id: number) => void;
    onReplay: (studentId: number, name: string, taskKey: string) => void;
    scope?: Scope;
}> = ({ courseId, taskKey, refreshKey, onBack, onOpenStudent, onReplay, scope }) => {
    const [tick, setTick] = useState(0);
    const [nudgeFor, setNudgeFor] = useState<number | null>(null);
    const { data, error, loading } = useLoad(() => learningApi.task(courseId, taskKey, scope), [courseId, taskKey, refreshKey, tick, scopeKey(scope)]);
    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-1 text-xs font-black text-gray-500 hover:text-indigo-600">
                <ArrowLeft size={14} /> Görevler
            </button>
            {loading && !data && <Loading />}
            {error && <ErrorBox message={error} />}
            {data && (
                <>
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-black text-gray-800">{data.task}</h2>
                        <StageBadge stage={data.stage} />
                        {data.node && <span className="text-xs font-bold text-gray-400">· {data.node}</span>}
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        <Stat label="Başlayan" value={data.started} />
                        <Stat label="Çözen" value={`${data.solved} (${pct(data.solve_rate)})`} tone="text-emerald-600" />
                        <Stat label="İlk denemede" value={pct(data.first_try_rate)} tone="text-teal-600" />
                        <Stat label="Medyan deneme" value={data.median_attempts ?? '—'} tone="text-gray-700" />
                        <Stat label="Takılı" value={data.stuck} tone={data.stuck ? 'text-rose-600' : 'text-emerald-600'} />
                    </div>
                    <div className="grid lg:grid-cols-3 gap-6">
                        <Card title="En çok düşen ölçütler" icon={<ListX size={15} className="text-rose-500" />}>
                            <CountList items={data.top_failures} empty="Düşen ölçüt yok." tone="text-rose-700" />
                        </Card>
                        <Card title="Hata türleri" icon={<Bug size={15} className="text-orange-500" />}>
                            <CountList items={data.top_errors} empty="Çalışma hatası yok." tone="text-orange-700" />
                        </Card>
                        <Card title="Koçun tespit ettiği yanılgılar" icon={<Brain size={15} className="text-violet-500" />}>
                            <CountList items={data.top_misconceptions} empty="Kayıtlı yanılgı yok." tone="text-violet-700" />
                        </Card>
                    </div>
                    <Card title="Öğrenciler">
                        {data.students.length === 0 ? <Empty>Bu göreve henüz kimse başlamadı.</Empty> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                            <th className="py-2 pr-3">Öğrenci</th>
                                            <th className="py-2 pr-3">Durum</th>
                                            <th className="py-2 pr-3">Deneme</th>
                                            <th className="py-2 pr-3">Son düşen</th>
                                            <th className="py-2 pr-3">İpucu / Koç</th>
                                            <th className="py-2 pr-3">Süre</th>
                                            <th className="py-2 pr-3">Kendi yazdığı</th>
                                            <th className="py-2" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.students.map((s) => (
                                            <React.Fragment key={s.student_id}>
                                            <tr className={`border-t border-gray-50 align-top ${s.help ? 'bg-rose-50/40' : ''}`}>
                                                <td className="py-2 pr-3">
                                                    <button onClick={() => onOpenStudent(s.student_id)} className="font-black text-gray-800 hover:text-indigo-600">{s.student}</button>
                                                </td>
                                                <td className="py-2 pr-3 font-bold">
                                                    {s.help && (
                                                        <span className="flex items-center gap-1 text-rose-600 mb-0.5" title={s.help.note || undefined}>
                                                            <Hand size={12} /> Yardım istiyor · {Math.round(s.help.waiting_minutes)} dk
                                                            {s.help.responded && <span className="text-emerald-600 font-bold">(cevapladın)</span>}
                                                        </span>
                                                    )}
                                                    {s.stuck_now ? <span className="flex items-center gap-1 text-rose-600"><Flame size={12} /> Şu an takılı</span>
                                                        : s.stuck ? <span className="text-rose-600">Takıldı</span>
                                                        : s.solved ? <span className="text-emerald-600">{s.first_try ? 'İlk denemede çözdü' : 'Çözdü'}</span>
                                                        : s.submitted ? <span className="text-sky-600">Teslim etti</span>
                                                        : <span className="text-gray-500">Çalışıyor</span>}
                                                </td>
                                                <td className="py-2 pr-3 font-bold text-gray-600">{s.attempts}</td>
                                                <td className="py-2 pr-3 text-rose-700 max-w-[220px]">{s.last_failure ?? '—'}</td>
                                                <td className="py-2 pr-3 text-gray-500">{s.hints_opened} / {s.coach_messages}</td>
                                                <td className="py-2 pr-3 text-gray-500">{s.minutes !== null ? `${s.minutes} dk` : '—'}</td>
                                                <td className="py-2 pr-3">
                                                    <OwnShare value={s.own_share} />
                                                    {s.flags.length > 0 && (
                                                        <div className="mt-1 max-w-[260px] space-y-1">
                                                            <FlagList flags={s.flags} />
                                                            <ReviewControl courseId={courseId} studentId={s.student_id} taskKey={taskKey}
                                                                           review={s.review} onChange={() => setTick((t) => t + 1)} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-2 space-y-1">
                                                    <button onClick={() => onReplay(s.student_id, s.student, taskKey)}
                                                            className="block text-[11px] font-black text-indigo-600 hover:underline whitespace-nowrap">
                                                        Kodu izle
                                                    </button>
                                                    {!s.solved && (
                                                        <button onClick={() => setNudgeFor(nudgeFor === s.student_id ? null : s.student_id)}
                                                                className="flex items-center gap-1 text-[11px] font-black text-rose-600 hover:underline whitespace-nowrap">
                                                            <MessageSquarePlus size={12} /> İpucu gönder
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                            {nudgeFor === s.student_id && (
                                                <tr>
                                                    <td colSpan={8} className="pb-3">
                                                        <div className="max-w-xl ml-2">
                                                            <NudgeBox courseId={courseId} studentId={s.student_id} taskKey={taskKey}
                                                                      suggestion={s.last_failure} onSent={() => setTick((t) => t + 1)} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        {data.not_started.length > 0 && (
                            <p className="text-[11px] font-bold text-gray-400 mt-3">
                                Başlamayanlar: {data.not_started.map((s) => s.student).join(', ')}
                            </p>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
};

const TasksTab: React.FC<{
    courseId: number;
    refreshKey: number;
    onOpenTask: (key: string) => void;
    scope?: Scope;
}> = ({ courseId, refreshKey, onOpenTask, scope }) => {
    const { data, error, loading } = useLoad(() => learningApi.tasks(courseId, scope), [courseId, refreshKey, scopeKey(scope)]);
    if (loading && !data) return <Loading />;
    if (error) return <ErrorBox message={error} />;
    if (!data?.length) return <Card><Empty>Bu kursta Uygula / Birleştir / Üret görevi yok.</Empty></Card>;

    return (
        <Card>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="py-2 pr-3">Görev</th>
                            <th className="py-2 pr-3">Başlayan</th>
                            <th className="py-2 pr-3">Çözen</th>
                            <th className="py-2 pr-3">İlk denemede</th>
                            <th className="py-2 pr-3">Medyan deneme</th>
                            <th className="py-2 pr-3">Takılı</th>
                            <th className="py-2">En çok düşen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((t, i) => {
                            // Modül değiştiğinde araya modül başlığı.
                            const header = i === 0 || data[i - 1].node !== t.node ? t.node : null;
                            return (
                                <React.Fragment key={t.task_key}>
                                    {header && (
                                        <tr><td colSpan={7} className="pt-4 pb-1 text-[10px] font-black text-gray-400 tracking-widest">{header}</td></tr>
                                    )}
                                    <tr onClick={() => onOpenTask(t.task_key)} className="border-t border-gray-50 cursor-pointer hover:bg-indigo-50/40">
                                        <td className="py-2 pr-3">
                                            <span className="font-black text-gray-800">{t.task}</span> <StageBadge stage={t.stage} />
                                        </td>
                                        <td className="py-2 pr-3 font-bold text-gray-600">{t.started}</td>
                                        <td className="py-2 pr-3 font-bold text-emerald-600">{t.started ? `${t.solved} (${pct(t.solve_rate)})` : '—'}</td>
                                        <td className="py-2 pr-3 font-bold text-teal-600">{t.started ? pct(t.first_try_rate) : '—'}</td>
                                        <td className="py-2 pr-3 font-bold text-gray-600">{t.median_attempts ?? '—'}</td>
                                        <td className={`py-2 pr-3 font-black ${t.stuck ? 'text-rose-600' : 'text-gray-300'}`}>{t.stuck}</td>
                                        <td className="py-2 text-rose-700">
                                            {t.top_failures[0] ? `${t.top_failures[0].label} (${t.top_failures[0].students})` : '—'}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Card>
    );
};

export default TasksTab;
