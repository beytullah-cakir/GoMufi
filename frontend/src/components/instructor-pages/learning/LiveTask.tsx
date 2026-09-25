import React, { useEffect, useState } from 'react';
import {
    CheckCircle2, Flame, Hand, Hourglass, Loader2, MessageSquarePlus, Presentation, Radio, UserMinus, Users,
} from 'lucide-react';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { errorText, learningApi, type BoardPayload, type TaskDetail } from './learningApi';
import { OwnShare } from './learningUi';
import { NudgeBox } from './TeacherTools';

/**
 * Canlı ders: öğretmen bir görev slaydını anlatırken sınıfın durumu.
 *
 * İKİ YÜZ:
 *   - ClassProgressCard: tahtaya yansıyan ekran. İSİM YOK — yalnızca sayılar
 *     ve en çok düşen ölçüt. Kimin takıldığı sınıfa gösterilmez.
 *   - LiveTaskBoard: öğretmenin kendi çekmecesi. İsimler, kim takıldı, neden.
 *
 * Güncelleme: sunucu bu göreve bir olay geldiğinde YALNIZCA öğretmene haber
 * veriyor (WebSocket); kanca kısa bir gecikmeyle yeniden çekiyor. Bağlantı
 * koparsa 30 saniyelik yoklama yedekte.
 */

export const useLiveTask = (courseId: number | string | undefined, taskKey: string | undefined) => {
    const [data, setData] = useState<TaskDetail | null>(null);
    const [tick, setTick] = useState(0);
    const { lastMessage } = useWebSocket();
    const numericCourse = Number(courseId);

    useEffect(() => {
        if (!courseId || !taskKey || Number.isNaN(numericCourse)) return;
        let alive = true;
        learningApi.task(numericCourse, taskKey)
            .then((d) => { if (alive) setData(d); })
            .catch(() => undefined);
        return () => { alive = false; };
    }, [courseId, taskKey, numericCourse, tick]);

    useEffect(() => {
        if (lastMessage?.type !== 'task_event' || lastMessage.taskKey !== taskKey) return;
        const timer = setTimeout(() => setTick((t) => t + 1), 1500);
        return () => clearTimeout(timer);
    }, [lastMessage, taskKey]);

    useEffect(() => {
        const timer = setInterval(() => setTick((t) => t + 1), 30_000);
        return () => clearInterval(timer);
    }, []);

    // Başka bir görevin verisi yeni görevde gösterilmesin.
    return data && data.task_key === taskKey ? data : null;
};

const summarize = (d: TaskDetail) => {
    const stuck = d.students.filter((s) => s.stuck_now || s.stuck).length;
    const solved = d.students.filter((s) => s.solved || s.submitted).length;
    const working = d.students.length - stuck - solved;
    return { stuck, solved, working, notStarted: d.not_started.length };
};

/** Tahtaya yansıyan ekran için: isimsiz sınıf durumu. */
export const ClassProgressCard: React.FC<{ courseId?: number | string; taskKey?: string }> = ({ courseId, taskKey }) => {
    const data = useLiveTask(courseId, taskKey);
    if (!data) {
        return (
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 flex items-center gap-2 text-sm font-bold text-slate-400">
                <Loader2 size={16} className="animate-spin" /> Sınıfın durumu yükleniyor…
            </div>
        );
    }
    const s = summarize(data);
    const total = s.solved + s.working + s.stuck + s.notStarted || 1;
    const top = data.top_failures[0];
    return (
        <div className="bg-white border-2 border-slate-200 border-b-[6px] rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-700 flex items-center gap-2"><Users size={16} className="text-indigo-500" /> Sınıfın durumu</h3>
                <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600"><Radio size={12} className="animate-pulse" /> CANLI</span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
                {[
                    { label: 'Çözdü', value: s.solved, tone: 'text-emerald-600', icon: CheckCircle2 },
                    { label: 'Çalışıyor', value: s.working, tone: 'text-sky-600', icon: Hourglass },
                    { label: 'Yardım gerekebilir', value: s.stuck, tone: 'text-rose-600', icon: Flame },
                    { label: 'Başlamadı', value: s.notStarted, tone: 'text-slate-400', icon: UserMinus },
                ].map((item) => {
                    const Icon = item.icon;
                    return (
                        <div key={item.label}>
                            <Icon size={18} className={`mx-auto ${item.tone}`} />
                            <p className={`text-3xl font-black ${item.tone}`}>{item.value}</p>
                            <p className="text-[11px] font-bold text-slate-500">{item.label}</p>
                        </div>
                    );
                })}
            </div>
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                <div className="bg-emerald-400" style={{ width: `${(s.solved / total) * 100}%` }} />
                <div className="bg-sky-400" style={{ width: `${(s.working / total) * 100}%` }} />
                <div className="bg-rose-400" style={{ width: `${(s.stuck / total) * 100}%` }} />
            </div>
            {top && (
                <p className="text-sm font-bold text-slate-600 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
                    En sık takılınan yer: <span className="text-rose-700">{top.label}</span>
                </p>
            )}
        </div>
    );
};

/** Öğretmenin kendi çekmecesi: isimlerle canlı pano. */
export const LiveTaskBoard: React.FC<{
    courseId?: number | string;
    taskKey?: string;
    /** Seçilen çözümü öğretmenin (tahtaya yansıyan) ekranında İSİMSİZ göster. */
    onShowOnBoard?: (payload: BoardPayload) => void;
    /** Çözümü canlı derse bağlı öğrencilerin ekranına da gönder (çevrimiçi ders). */
    broadcastBoard?: boolean;
}> = ({ courseId, taskKey, onShowOnBoard, broadcastBoard }) => {
    const data = useLiveTask(courseId, taskKey);
    const [openFor, setOpenFor] = useState<number | null>(null);
    const [boardBusy, setBoardBusy] = useState<number | null>(null);
    const [boardError, setBoardError] = useState<string | null>(null);
    if (!taskKey) return null;
    if (!data) return <p className="text-xs font-bold text-gray-400">Yükleniyor…</p>;
    const s = summarize(data);
    const course = Number(courseId);
    const helpCount = data.students.filter((st) => st.help).length;
    const ordered = [...data.students].sort((a, b) =>
        Number(!!b.help) - Number(!!a.help) || Number(b.stuck_now) - Number(a.stuck_now)
        || Number(b.stuck) - Number(a.stuck) || Number(a.solved) - Number(b.solved));

    const showOnBoard = async (studentId: number) => {
        if (!taskKey) return;
        setBoardBusy(studentId);
        setBoardError(null);
        try {
            const payload = await learningApi.board(course, taskKey, studentId, !!broadcastBoard);
            onShowOnBoard?.(payload);
        } catch (err) {
            setBoardError(errorText(err, 'Kod alınamadı.'));
        } finally {
            setBoardBusy(null);
        }
    };

    return (
        <div className="space-y-3">
            <p className="text-xs font-black text-gray-700">{data.task}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-black">
                {helpCount > 0 && <span className="text-rose-600 flex items-center gap-1"><Hand size={11} /> {helpCount} yardım istiyor</span>}
                <span className="text-emerald-600">{s.solved} çözdü</span>
                <span className="text-sky-600">{s.working} çalışıyor</span>
                <span className="text-rose-600">{s.stuck} takılı</span>
                <span className="text-gray-400">{s.notStarted} başlamadı</span>
            </div>
            {data.top_failures.length > 0 && (
                <div className="text-[11px] bg-rose-50 border border-rose-100 rounded-xl p-2 space-y-0.5">
                    {data.top_failures.slice(0, 3).map((f) => (
                        <p key={f.label} className="text-rose-700"><b>{f.students}</b> öğrenci: {f.label}</p>
                    ))}
                </div>
            )}
            {data.top_misconceptions.length > 0 && (
                <p className="text-[11px] text-violet-700">Yanılgı: {data.top_misconceptions[0].label}</p>
            )}
            {boardError && <p className="text-[11px] font-bold text-rose-600">{boardError}</p>}
            <div className="space-y-1.5">
                {ordered.map((st) => (
                    <div key={st.student_id} className={`p-2 rounded-xl border text-[11px] ${
                        st.help ? 'bg-rose-50 border-rose-200' : st.stuck_now || st.stuck ? 'bg-rose-50/60 border-rose-100'
                            : st.solved ? 'bg-emerald-50/50 border-emerald-100' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-gray-800 truncate">
                                {st.help && <Hand size={11} className="inline text-rose-500 mr-1" />}
                                {st.stuck_now && !st.help && <Flame size={11} className="inline text-rose-500 mr-1" />}{st.student}
                            </span>
                            <span className="font-bold text-gray-500 shrink-0">{st.attempts} deneme</span>
                        </div>
                        {st.help && (
                            <p className="text-rose-700 font-bold">
                                Yardım istiyor · {Math.round(st.help.waiting_minutes)} dk{st.help.note ? ` — “${st.help.note}”` : ''}
                                {st.help.responded && <span className="text-emerald-700"> (cevapladın)</span>}
                            </p>
                        )}
                        {!st.solved && st.last_failure && <p className="text-rose-700 truncate" title={st.last_failure}>{st.last_failure}</p>}
                        {st.flags.length > 0 && st.review?.verdict !== 'accepted' && (
                            <p className="text-violet-700 font-bold">Kendi yazdığı <OwnShare value={st.own_share} /> · {st.flags[0].label}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-1">
                            {!st.solved && (
                                <button onClick={() => setOpenFor(openFor === st.student_id ? null : st.student_id)}
                                        className="flex items-center gap-1 font-black text-indigo-600 hover:underline">
                                    <MessageSquarePlus size={11} /> İpucu
                                </button>
                            )}
                            <button onClick={() => void showOnBoard(st.student_id)} disabled={boardBusy === st.student_id}
                                    title="Bu çözümü isimsiz olarak tahtaya al"
                                    className="flex items-center gap-1 font-black text-slate-600 hover:underline disabled:opacity-50">
                                {boardBusy === st.student_id ? <Loader2 size={11} className="animate-spin" /> : <Presentation size={11} />} Tahtada göster
                            </button>
                            {st.help && (
                                <button onClick={() => void learningApi.resolveHelp(course, st.help!.id)}
                                        className="flex items-center gap-1 font-black text-emerald-700 hover:underline">
                                    <CheckCircle2 size={11} /> İlgilendim
                                </button>
                            )}
                        </div>
                        {openFor === st.student_id && (
                            <div className="mt-1.5">
                                <NudgeBox courseId={course} studentId={st.student_id} taskKey={taskKey}
                                          suggestion={st.last_failure} compact onSent={() => setOpenFor(null)} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {data.not_started.length > 0 && (
                <p className="text-[10.5px] text-gray-400 font-bold">Başlamayan: {data.not_started.map((n) => n.student).join(', ')}</p>
            )}
        </div>
    );
};
