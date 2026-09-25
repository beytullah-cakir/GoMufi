import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookCheck, Brain, ClipboardList, Flame, Hand, History, Link2, Mail, Search } from 'lucide-react';
import { learningApi, scopeKey, type Scope } from './learningApi';
import EventRow from './EventRow';
import InsightCard from './InsightCard';
import { ActionsCard, NotesCard, ReviewControl } from './TeacherTools';
import ParentReportCard from './ParentReportCard';
import {
    Card, Empty, ErrorBox, FlagList, formatTime, Loading, OwnShare, StageBadge, StatusPill, useLoad,
} from './learningUi';

/** Öğrenciler: sınıf listesi ve tek öğrencinin tam profili. */

export const StudentProfileView: React.FC<{
    courseId: number;
    studentId: number;
    refreshKey: number;
    onBack: () => void;
    onOpenTask: (key: string) => void;
    onReplay: (studentId: number, name: string, taskKey: string) => void;
    onPractice: (conceptId: string) => void;
}> = ({ courseId, studentId, refreshKey, onBack, onOpenTask, onReplay, onPractice }) => {
    const navigate = useNavigate();
    const { data, error, loading } = useLoad(() => learningApi.student(courseId, studentId), [courseId, studentId, refreshKey]);
    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-1 text-xs font-black text-gray-500 hover:text-indigo-600">
                <ArrowLeft size={14} /> Öğrenciler
            </button>
            {loading && !data && <Loading />}
            {error && <ErrorBox message={error} />}
            {data && (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h2 className="text-lg font-black text-gray-800">{data.student}</h2>
                        <button
                            onClick={() => navigate(`/instructor/messages?student=${studentId}&course=${courseId}`)}
                            className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-white border-2 border-gray-100 text-gray-600 hover:border-indigo-200 hover:text-indigo-600"
                        >
                            <Mail size={14} /> Mesaj gönder
                        </button>
                    </div>

                    {data.recording === 'denied' && (
                        <p className="text-[11px] font-bold text-slate-600 bg-slate-100 rounded-xl px-3 py-2">
                            Velisi yazım kaydını kapattı: bu öğrencinin kod kökeni (yazma/yapıştırma) verisi toplanmıyor.
                        </p>
                    )}
                    {data.root_causes.length > 0 && (
                        <div className="bg-amber-50 border-2 border-amber-100 rounded-2xl p-4 space-y-1">
                            <p className="text-xs font-black text-amber-800 flex items-center gap-1.5"><Link2 size={14} /> Olası kök neden</p>
                            {data.root_causes.map((rc) => (
                                <p key={rc.concept_id} className="text-xs text-amber-900">
                                    <b>{rc.label}</b> konusunda zorlanıyor; önkoşulu{' '}
                                    <b>{rc.weak_prerequisites.map((p) => p.label).join(', ')}</b> da zayıf. Önce oraya dönmek işe yarayabilir.
                                </p>
                            ))}
                        </div>
                    )}

                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card title="Kavramlar" icon={<Brain size={15} className="text-indigo-500" />}>
                            {data.concepts.length === 0 ? <Empty>Henüz kavram kanıtı yok.</Empty> : (
                                <div className="space-y-2">
                                    {data.concepts.map((c) => (
                                        <div key={c.concept_id} className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-gray-800">{c.label}</p>
                                                {c.misconception && <p className="text-[11px] text-violet-700">Yanılgı: {c.misconception}</p>}
                                                <p className="text-[10.5px] text-gray-400">{c.successes} başarı · {c.failures} başarısız</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <StatusPill status={c.status} />
                                                {c.status === 'zorlaniyor' && (
                                                    <button onClick={() => onPractice(c.concept_id)} className="text-[10px] font-black text-indigo-600 hover:underline">
                                                        tekrar görevi
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                        <InsightCard courseId={courseId} studentId={studentId} onPractice={onPractice} />
                    </div>

                    <Card title="Görevler" icon={<ClipboardList size={15} className="text-cyan-600" />}>
                        {data.tasks.length === 0 ? <Empty>Henüz görev denemesi yok.</Empty> : (
                            <div className="space-y-2">
                                {data.tasks.map((t) => (
                                    <div key={t.task_key} className="grid md:grid-cols-[1fr_140px_120px_auto] gap-3 items-start p-3 rounded-xl border-2 border-gray-100">
                                        <div className="min-w-0">
                                            <button onClick={() => onOpenTask(t.task_key)} className="text-sm font-black text-gray-800 hover:text-indigo-600 text-left">
                                                {t.task}
                                            </button>{' '}
                                            <StageBadge stage={t.stage} />
                                            {t.last_failure && !t.solved && <p className="text-[11px] text-rose-700 mt-1">Son düşen: {t.last_failure}</p>}
                                            {t.flags.length > 0 && (
                                                <div className="mt-1.5 space-y-1">
                                                    <FlagList flags={t.flags} />
                                                    <ReviewControl courseId={courseId} studentId={studentId} taskKey={t.task_key} review={t.review} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-[11px] font-bold">
                                            {t.stuck_now ? <span className="flex items-center gap-1 text-rose-600"><Flame size={12} /> Şu an takılı</span>
                                                : t.stuck ? <span className="text-rose-600">Takıldı</span>
                                                : t.solved ? <span className="text-emerald-600">{t.first_try ? 'İlk denemede çözdü' : 'Çözdü'}</span>
                                                : t.submitted ? <span className="text-sky-600">Teslim etti</span>
                                                : <span className="text-gray-500">Devam ediyor</span>}
                                            <p className="text-gray-400 font-medium">{t.attempts} deneme · {t.hints_opened} ipucu</p>
                                        </div>
                                        <div className="text-[11px] font-bold text-gray-500">
                                            Kendi yazdığı: <OwnShare value={t.own_share} />
                                        </div>
                                        <button onClick={() => onReplay(studentId, data.student, t.task_key)}
                                                className="text-[11px] font-black text-indigo-600 hover:underline whitespace-nowrap">
                                            Kodu izle
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <div className="grid lg:grid-cols-2 gap-6">
                        <Card title="Ödevler" icon={<BookCheck size={15} className="text-blue-500" />}>
                            {data.homework.length === 0 ? <Empty>Bu kursta ödev yok.</Empty> : (
                                <div className="space-y-2">
                                    {data.homework.map((h) => (
                                        <div key={h.task_key} className="p-3 rounded-xl border-2 border-gray-100">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-xs font-black text-gray-800">{h.title}</span>
                                                <span className={`text-[11px] font-black ${h.submitted ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {h.submitted ? (h.grade !== null ? `${h.grade}/100` : 'Teslim edildi') : h.overdue ? 'Süre doldu, teslim yok' : 'Teslim yok'}
                                                    {h.late && <span className="text-rose-600"> · geç</span>}
                                                </span>
                                            </div>
                                            {h.ai_score !== null && <p className="text-[10.5px] text-gray-400">YZ puanı: {h.ai_score}</p>}
                                            {h.weaknesses.slice(0, 3).map((w, i) => (
                                                <p key={i} className="text-[11px] text-violet-700">• {w.misconception || w.explanation}</p>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                        <Card title="Zaman çizelgesi" icon={<History size={15} className="text-gray-500" />}>
                            <div className="max-h-[520px] overflow-y-auto">
                                {data.timeline.length === 0 ? <Empty>Kayıt yok.</Empty>
                                    : data.timeline.map((e) => <EventRow key={e.event_id} courseId={courseId} event={e} />)}
                            </div>
                        </Card>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-6">
                        <NotesCard courseId={courseId} studentId={studentId} />
                        <ActionsCard courseId={courseId} studentId={studentId} refreshKey={refreshKey} />
                    </div>

                    <ParentReportCard courseId={courseId} studentId={studentId} />
                </>
            )}
        </div>
    );
};

const StudentsTab: React.FC<{
    courseId: number;
    refreshKey: number;
    onOpenStudent: (id: number) => void;
    scope?: Scope;
}> = ({ courseId, refreshKey, onOpenStudent, scope }) => {
    const { data, error, loading } = useLoad(() => learningApi.students(courseId, scope), [courseId, refreshKey, scopeKey(scope)]);
    const [query, setQuery] = useState('');
    if (loading && !data) return <Loading />;
    if (error) return <ErrorBox message={error} />;
    if (!data?.length) return <Card><Empty>Bu kursa kayıtlı öğrenci yok.</Empty></Card>;
    const rows = data.filter((s) => s.student.toLocaleLowerCase('tr').includes(query.toLocaleLowerCase('tr')));

    return (
        <Card>
            <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Öğrenci ara…"
                       className="w-full pl-9 pr-3 py-2 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-300" />
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-xs">
                    <thead>
                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">
                            <th className="py-2 pr-3">Öğrenci</th>
                            <th className="py-2 pr-3">Kavramlar</th>
                            <th className="py-2 pr-3">Görevler</th>
                            <th className="py-2 pr-3">Takılı</th>
                            <th className="py-2 pr-3">Ödev</th>
                            <th className="py-2 pr-3">Kod işareti</th>
                            <th className="py-2">Son etkinlik</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((s) => (
                            <tr key={s.student_id} onClick={() => onOpenStudent(s.student_id)} className="border-t border-gray-50 cursor-pointer hover:bg-indigo-50/40">
                                <td className="py-2 pr-3 font-black text-gray-800">
                                    {s.help_open > 0 && <Hand size={12} className="inline text-rose-500 mr-1" aria-label="Yardım istiyor" />}
                                    {s.stuck_now > 0 && <Flame size={12} className="inline text-rose-500 mr-1" />}{s.student}
                                </td>
                                <td className="py-2 pr-3">
                                    <span className="font-black text-rose-600">{s.struggling}</span>
                                    <span className="text-gray-300"> / </span>
                                    <span className="font-black text-amber-600">{s.developing}</span>
                                    <span className="text-gray-300"> / </span>
                                    <span className="font-black text-emerald-600">{s.mastered}</span>
                                </td>
                                <td className="py-2 pr-3 font-bold text-gray-600">{s.tasks_solved}/{s.tasks_attempted}</td>
                                <td className={`py-2 pr-3 font-black ${s.stuck_tasks ? 'text-rose-600' : 'text-gray-300'}`}>{s.stuck_tasks}</td>
                                <td className="py-2 pr-3 font-bold text-gray-600">{s.homework_submitted}/{s.homework_total}</td>
                                <td className={`py-2 pr-3 font-black ${s.code_flags ? 'text-violet-600' : 'text-gray-300'}`}>{s.code_flags}</td>
                                <td className="py-2 text-gray-400 font-bold">{formatTime(s.last_activity_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[10.5px] font-bold text-gray-400 mt-3">Kavramlar: zorlanıyor / gelişiyor / hakim.</p>
        </Card>
    );
};

export default StudentsTab;
