import React, { useCallback, useEffect, useState } from 'react';
import { Check, Hand, Hourglass, Lightbulb, Loader2, Lock, X } from 'lucide-react';
import api from '../../api';
import { useWebSocketEvent } from '../../hooks/useWebSocket';
import { formatCountdown, useLiveLesson } from './liveLessonContext';

/**
 * Görev ekranının canlı ders parçaları.
 *
 * - Geri sayım: öğretmen göreve süre koyduysa (ya da görevi kapattıysa).
 * - "Yardım istiyorum": öğretmenin canlı panosunda sıraya girer; öğretmen
 *   ipucu gönderdiğinde ya da "ilgilendim" dediğinde öğrenci görür.
 * - Öğretmenin ipuçları: WebSocket ile anında, bağlantı yoksa yoklamayla gelir.
 */

/** Geri sayım şeridi — öğrencide ince, tahtada (present) büyük. */
export const TaskTimerBanner: React.FC<{ taskKey?: string; big?: boolean }> = ({ taskKey, big }) => {
    const { timer } = useLiveLesson();
    const [now, setNow] = useState(() => Date.now());
    const active = !!timer && timer.taskKey === taskKey;
    useEffect(() => {
        if (!active || timer?.closed) return;
        const id = setInterval(() => setNow(Date.now()), 500);
        return () => clearInterval(id);
    }, [active, timer?.closed]);
    if (!active || !timer) return null;
    const left = timer.endsAt - now;
    const over = timer.closed || left <= 0;
    const tone = over ? 'bg-rose-600 border-rose-800 text-white'
        : left < 60_000 ? 'bg-amber-400 border-amber-600 text-amber-950'
        : 'bg-white border-slate-200 text-slate-700';
    return (
        <div className={`flex items-center justify-center gap-2 border-2 border-b-4 rounded-2xl font-black ${tone} ${big ? 'px-6 py-4 text-2xl' : 'px-3 py-2 text-sm'}`}>
            {over ? <Lock size={big ? 24 : 15} /> : <Hourglass size={big ? 24 : 15} className="animate-pulse" />}
            {timer.closed
                ? 'Öğretmen görevi kapattı'
                : over ? 'Süre doldu'
                : <>Kalan süre <span className="tabular-nums">{formatCountdown(left)}</span></>}
        </div>
    );
};

interface Nudge { id: number; text: string; at: string; task_key: string | null }

export const TaskLiveAssist: React.FC<{ courseId: number | string; taskKey: string; solved?: boolean }> = ({
    courseId, taskKey, solved,
}) => {
    const course = Number(courseId);
    const [help, setHelp] = useState<{ open: boolean; responded: boolean } | null>(null);
    const [composing, setComposing] = useState(false);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [info, setInfo] = useState<string | null>(null);
    const [nudges, setNudges] = useState<Nudge[]>([]);
    const [pollTick, setPollTick] = useState(0);

    useEffect(() => {
        let alive = true;
        api.get('/analytics/help/mine', { params: { course_id: course, task_key: taskKey } })
            .then((r) => { if (alive) setHelp({ open: !!r.data.open, responded: !!r.data.responded }); })
            .catch(() => undefined);
        return () => { alive = false; };
    }, [course, taskKey]);

    // İpuçları: açılışta ve yarım dakikada bir (VS Code panelinde WebSocket olmayabilir).
    useEffect(() => {
        let alive = true;
        api.get('/analytics/nudges', { params: { course_id: course, task_key: taskKey } })
            .then((r) => {
                if (!alive) return;
                const incoming: Nudge[] = r.data?.nudges || [];
                setNudges((prev) => [...prev, ...incoming.filter((n) => !prev.some((p) => p.id === n.id))]);
            })
            .catch(() => undefined);
        return () => { alive = false; };
    }, [course, taskKey, pollTick]);
    useEffect(() => {
        const id = setInterval(() => setPollTick((t) => t + 1), 30_000);
        return () => clearInterval(id);
    }, []);

    useWebSocketEvent(['teacher_nudge', 'help_resolved'], (msg) => {
        if (Number(msg.courseId) !== course) return;
        if (msg.type === 'teacher_nudge') {
            if (msg.taskKey && msg.taskKey !== taskKey) return;
            setNudges((prev) => (prev.some((n) => n.id === msg.id) ? prev
                : [...prev, { id: msg.id, text: msg.text, at: msg.at, task_key: msg.taskKey ?? null }]));
            setHelp((h) => (h?.open ? { ...h, responded: true } : h));
        } else if (msg.taskKey === taskKey) {
            setHelp({ open: false, responded: false });
            setInfo('Öğretmenin yardım isteğini kapattı.');
        }
    });

    const dismiss = useCallback((id: number) => {
        setNudges((prev) => prev.filter((n) => n.id !== id));
        void api.post(`/analytics/nudges/${id}/seen`).catch(() => undefined);
    }, []);

    const ask = async () => {
        setBusy(true);
        setInfo(null);
        try {
            await api.post('/analytics/help', { course_id: course, task_key: taskKey, note: note.trim() });
            setHelp({ open: true, responded: false });
            setComposing(false);
            setNote('');
        } catch (err: any) {
            setInfo(err?.response?.data?.detail || 'İstek gönderilemedi.');
        } finally {
            setBusy(false);
        }
    };

    const cancel = async () => {
        setBusy(true);
        try {
            await api.post('/analytics/help/cancel', { course_id: course, task_key: taskKey });
            setHelp({ open: false, responded: false });
            setInfo(null);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {nudges.map((n) => (
                <div key={n.id} className="flex items-start gap-2 bg-indigo-600 text-white rounded-2xl border-2 border-b-4 border-indigo-800 px-3.5 py-2.5 shadow-md">
                    <Lightbulb size={16} className="shrink-0 mt-0.5 text-amber-300" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-200">Öğretmeninden</p>
                        <p className="text-sm font-bold whitespace-pre-wrap">{n.text}</p>
                    </div>
                    <button onClick={() => dismiss(n.id)} className="p-1 rounded-lg hover:bg-white/15" title="Tamam">
                        <X size={14} />
                    </button>
                </div>
            ))}

            {!solved && help?.open && (
                <div className="flex items-center justify-between gap-2 bg-rose-50 border-2 border-rose-200 rounded-2xl px-3 py-2">
                    <span className="flex items-center gap-1.5 text-[12px] font-black text-rose-700">
                        <Hand size={14} />
                        {help.responded ? 'Öğretmenin cevap verdi — yukarıya bak.' : 'Yardım istedin; öğretmenin haberdar.'}
                    </span>
                    <button onClick={() => void cancel()} disabled={busy}
                            className="flex items-center gap-1 text-[11px] font-black text-emerald-700 hover:underline disabled:opacity-50">
                        <Check size={12} /> Çözdüm
                    </button>
                </div>
            )}

            {!solved && help && !help.open && !composing && (
                <button onClick={() => setComposing(true)}
                        className="self-start flex items-center gap-1.5 text-sm font-black h-10 px-4 rounded-2xl bg-white border-2 border-b-4 border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600 active:translate-y-0.5 active:border-b-2 transition-all duration-75">
                    <Hand size={15} /> Öğretmenden yardım iste
                </button>
            )}

            {composing && (
                <div className="bg-white border-2 border-rose-200 rounded-2xl p-3 flex flex-col gap-2">
                    <p className="text-[11px] font-black text-rose-700">Nerede takıldın? (isteğe bağlı)</p>
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') void ask(); }}
                        maxLength={300}
                        autoFocus
                        placeholder="ör. döngü 5'te durmuyor"
                        className="text-sm bg-slate-50 border-2 border-slate-200 rounded-xl px-3 py-1.5 outline-none focus:border-rose-300"
                    />
                    <div className="flex gap-2">
                        <button onClick={() => void ask()} disabled={busy}
                                className="flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-xl bg-rose-500 text-white disabled:opacity-60">
                            {busy ? <Loader2 size={12} className="animate-spin" /> : <Hand size={12} />} Öğretmene haber ver
                        </button>
                        <button onClick={() => setComposing(false)} className="text-[11px] font-bold text-slate-500">Vazgeç</button>
                    </div>
                </div>
            )}
            {info && <p className="text-[11px] font-bold text-slate-500">{info}</p>}
        </div>
    );
};
