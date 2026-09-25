import React, { useState } from 'react';
import {
    Check, CheckCircle2, ClipboardCheck, Loader2, NotebookPen, Send, ShieldCheck, Trash2, TrendingDown,
    TrendingUp, Minus, Hourglass, Undo2,
} from 'lucide-react';
import {
    errorText, learningApi, type ActionKind, type ActionVerdict, type MasteryStatus, type ProvenanceReview,
    type TeacherActionRow,
} from './learningApi';
import { Card, Empty, formatTime, STATUS_STYLE, useLoad } from './learningUi';

/**
 * Öğretmenin gördüğünü harekete çevirdiği küçük araçlar.
 *
 * Analiz sayfası "kim nerede takıldı" diyordu ama öğretmen oradan hiçbir şey
 * yapamıyordu; sistem yanıldığında düzeltemiyordu da. Buradaki her bileşen
 * bir sunucu kaydı bırakır (bkz. backend/routers/live_teaching.py).
 */

/* ------------------------------------------------------------------------- */
/*  Kod kökeni kararı                                                         */
/* ------------------------------------------------------------------------- */

/** "Yapıştırmasını ben söyledim" — işaret listelerden düşer; geri alınabilir. */
export const ReviewControl: React.FC<{
    courseId: number;
    studentId: number;
    taskKey: string;
    review: ProvenanceReview | null;
    onChange?: () => void;
}> = ({ courseId, studentId, taskKey, review, onChange }) => {
    const [current, setCurrent] = useState<ProvenanceReview | null>(review);
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);

    const save = async (verdict: 'accepted' | 'concern' | 'clear') => {
        setBusy(true);
        try {
            const res = await learningApi.review(courseId, studentId, taskKey, verdict, note);
            setCurrent(res.review);
            setOpen(false);
            setNote('');
            onChange?.();
        } finally {
            setBusy(false);
        }
    };

    if (current && !open) {
        return (
            <div className={`flex items-start gap-1.5 text-[10.5px] font-bold rounded-lg px-2 py-1 ${
                current.verdict === 'accepted' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                <ShieldCheck size={12} className="shrink-0 mt-0.5" />
                <span className="flex-1">
                    {current.verdict === 'accepted' ? 'Sen inceledin: sorun yok' : 'Sen inceledin: konuşuldu'}
                    {current.note && <span className="font-medium"> — {current.note}</span>}
                </span>
                <button onClick={() => void save('clear')} disabled={busy} title="Kararı geri al" className="opacity-60 hover:opacity-100">
                    <Undo2 size={12} />
                </button>
            </div>
        );
    }
    if (!open) {
        return (
            <button onClick={() => setOpen(true)} className="text-[10.5px] font-black text-violet-700 hover:underline">
                İncele / karar ver
            </button>
        );
    }
    return (
        <div className="space-y-1.5 bg-violet-50/60 border border-violet-100 rounded-xl p-2">
            <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="Not (isteğe bağlı): ör. hazır fonksiyonu ben verdim"
                className="w-full text-[11px] bg-white border border-violet-200 rounded-lg px-2 py-1 outline-none"
            />
            <div className="flex flex-wrap gap-1">
                <button onClick={() => void save('accepted')} disabled={busy}
                        className="text-[10.5px] font-black px-2 py-1 rounded-lg bg-emerald-600 text-white disabled:opacity-60">
                    Sorun yok
                </button>
                <button onClick={() => void save('concern')} disabled={busy}
                        className="text-[10.5px] font-black px-2 py-1 rounded-lg bg-amber-500 text-white disabled:opacity-60">
                    Konuştum, not al
                </button>
                <button onClick={() => setOpen(false)} className="text-[10.5px] font-bold px-2 py-1 text-gray-500">Vazgeç</button>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------------- */
/*  Öğretmen değerlendirmesi                                                  */
/* ------------------------------------------------------------------------- */

const ASSESS_OPTIONS: Array<Exclude<MasteryStatus, 'veri_az'>> = ['hakim', 'gelisiyor', 'zorlaniyor'];

/** "Sözlü sordum, biliyor": kavram durumunu öğretmen düzeltir; sonraki kanıtlar yine değiştirebilir. */
export const AssessControl: React.FC<{
    courseId: number;
    studentId: number;
    conceptId: string;
    onSaved?: () => void;
}> = ({ courseId, studentId, conceptId, onSaved }) => {
    const [status, setStatus] = useState<Exclude<MasteryStatus, 'veri_az'> | null>(null);
    const [note, setNote] = useState('');
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async () => {
        if (!status) return;
        setBusy(true);
        setError(null);
        try {
            await learningApi.assess(courseId, studentId, conceptId, status, note);
            setSaved(true);
            setStatus(null);
            setNote('');
            onSaved?.();
        } catch (err) {
            setError(errorText(err, 'Kaydedilemedi.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 space-y-2">
            <p className="text-[10.5px] font-black text-gray-500 flex items-center gap-1.5">
                <ClipboardCheck size={12} /> Sistem yanıldıysa düzelt
            </p>
            <div className="flex flex-wrap gap-1">
                {ASSESS_OPTIONS.map((s) => (
                    <button
                        key={s}
                        onClick={() => { setStatus(s); setSaved(false); }}
                        className={`text-[10.5px] font-black px-2 py-1 rounded-lg border ${
                            status === s ? STATUS_STYLE[s].pill + ' ring-2 ring-indigo-300' : 'bg-white border-gray-200 text-gray-500'}`}
                    >
                        {STATUS_STYLE[s].label}
                    </button>
                ))}
            </div>
            {status && (
                <>
                    <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={500}
                        placeholder="Dayanağın: ör. sözlü sordum, tahtada çözdü"
                        className="w-full text-[11px] bg-white border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-300"
                    />
                    <button onClick={() => void save()} disabled={busy}
                            className="flex items-center gap-1 text-[11px] font-black px-3 py-1.5 rounded-lg bg-indigo-600 text-white disabled:opacity-60">
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Kaydet
                    </button>
                </>
            )}
            {saved && <p className="text-[10.5px] font-bold text-emerald-700">Kaydedildi. Kanıtlar arasında notunla görünür.</p>}
            {error && <p className="text-[10.5px] font-bold text-rose-600">{error}</p>}
            <p className="text-[10px] text-gray-400">Kilit değil: öğrencinin sonraki denemeleri durumu yine değiştirir.</p>
        </div>
    );
};

/* ------------------------------------------------------------------------- */
/*  "Yaptım" ve yapılanların etkisi                                          */
/* ------------------------------------------------------------------------- */

/** Bir öneriyi uyguladığını kaydeder; o anki durum "önce" olarak saklanır. */
export const DoneButton: React.FC<{
    courseId: number;
    kind: ActionKind;
    title: string;
    conceptId?: string | null;
    studentId?: number | null;
    onDone?: () => void;
}> = ({ courseId, kind, title, conceptId, studentId, onDone }) => {
    const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
    const mark = async () => {
        setState('busy');
        try {
            await learningApi.createAction(courseId, { kind, title, concept_id: conceptId || null, student_id: studentId || null });
            setState('done');
            onDone?.();
        } catch {
            setState('idle');
        }
    };
    if (state === 'done') {
        return <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-700"><CheckCircle2 size={12} /> Kaydedildi, etkisi izleniyor</span>;
    }
    return (
        <button onClick={() => void mark()} disabled={state === 'busy'}
                title="Bunu yaptım: öncesi kaydedilir, sonraki veriler karşılaştırılır"
                className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-60">
            {state === 'busy' ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />} Yaptım
        </button>
    );
};

const VERDICT: Record<ActionVerdict, { label: string; tone: string; icon: React.ElementType }> = {
    iyilesti: { label: 'İyileşme var', tone: 'text-emerald-700 bg-emerald-50', icon: TrendingUp },
    degismedi: { label: 'Değişmedi', tone: 'text-gray-600 bg-gray-100', icon: Minus },
    kotulesti: { label: 'Kötüleşti', tone: 'text-rose-700 bg-rose-50', icon: TrendingDown },
    veri_bekleniyor: { label: 'Yeni veri bekleniyor', tone: 'text-sky-700 bg-sky-50', icon: Hourglass },
};

const KIND_LABEL: Record<ActionKind, string> = {
    reteach: 'Yeniden anlattı', practice_task: 'Tekrar görevi', talk: 'Öğrenciyle konuştu',
    check_code: 'Koda baktı', other: 'Diğer',
};

const snapshotText = (s: TeacherActionRow['before']) => {
    if (s.status) return STATUS_STYLE[s.status]?.label ?? s.status;
    const parts = [];
    if (s.struggling !== undefined) parts.push(`${s.struggling} zorlanıyor`);
    if (s.avg_score !== undefined && s.avg_score !== null) parts.push(`ort. ${Math.round(s.avg_score * 100)}`);
    return parts.join(' · ') || '—';
};

export const ActionsCard: React.FC<{
    courseId: number;
    studentId?: number;
    refreshKey: number;
}> = ({ courseId, studentId, refreshKey }) => {
    const [tick, setTick] = useState(0);
    const { data } = useLoad(() => learningApi.actions(courseId, studentId), [courseId, studentId, refreshKey, tick]);
    const remove = async (id: number) => {
        await learningApi.deleteAction(courseId, id).catch(() => undefined);
        setTick((t) => t + 1);
    };
    return (
        <Card title="Yapılanlar ve etkisi" icon={<TrendingUp size={16} className="text-emerald-600" />}>
            {!data ? <p className="text-xs text-gray-400 font-bold">Yükleniyor…</p> : data.length === 0 ? (
                <Empty>
                    Henüz kayıtlı müdahale yok. YZ önerilerindeki "Yaptım" düğmesiyle ya da tekrar görevi ekleyince
                    burada öncesi/sonrası karşılaştırması görünür.
                </Empty>
            ) : (
                <div className="space-y-2">
                    {data.map((a) => {
                        const v = a.verdict ? VERDICT[a.verdict] : null;
                        const Icon = v?.icon ?? Minus;
                        return (
                            <div key={a.id} className="p-3 rounded-xl border-2 border-gray-100">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-gray-800">{a.title}</p>
                                        <p className="text-[10.5px] font-bold text-gray-400">
                                            {KIND_LABEL[a.kind]}{a.concept ? ` · ${a.concept}` : ''}{a.student ? ` · ${a.student}` : ''} · {formatTime(a.at)}
                                        </p>
                                    </div>
                                    <button onClick={() => void remove(a.id)} className="text-gray-300 hover:text-rose-500 shrink-0" title="Sil">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                                {(a.concept_id || a.student_id) && (
                                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[10.5px] font-bold">
                                        <span className="text-gray-500">Önce: {snapshotText(a.before)}</span>
                                        <span className="text-gray-300">→</span>
                                        <span className="text-gray-700">Şimdi: {snapshotText(a.after)}</span>
                                        {v && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${v.tone}`}>
                                                <Icon size={11} /> {v.label}
                                            </span>
                                        )}
                                        <span className="text-gray-400">{a.new_evidence} yeni kanıt</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

/* ------------------------------------------------------------------------- */
/*  Öğretmen notları                                                          */
/* ------------------------------------------------------------------------- */

export const NotesCard: React.FC<{ courseId: number; studentId: number }> = ({ courseId, studentId }) => {
    const [tick, setTick] = useState(0);
    const { data } = useLoad(() => learningApi.notes(courseId, studentId), [courseId, studentId, tick]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const add = async () => {
        if (!text.trim()) return;
        setBusy(true);
        try {
            await learningApi.addNote(courseId, studentId, text.trim());
            setText('');
            setTick((t) => t + 1);
        } finally {
            setBusy(false);
        }
    };
    return (
        <Card title="Öğretmen notları" icon={<NotebookPen size={15} className="text-amber-600" />}
              actions={<span className="text-[10px] font-bold text-gray-400">Yalnızca sen görürsün</span>}>
            <div className="flex gap-2 mb-3">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                    maxLength={4000}
                    placeholder="ör. Sözlü olarak döngüleri anlattı; evde bilgisayar erişimi kısıtlı."
                    className="flex-1 text-xs bg-gray-50 border-2 border-gray-100 rounded-xl p-2 outline-none focus:border-amber-300 resize-none"
                />
                <button onClick={() => void add()} disabled={busy || !text.trim()}
                        className="self-end p-2.5 rounded-xl bg-amber-500 text-white disabled:opacity-50">
                    {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
            </div>
            {!data ? null : data.length === 0 ? <Empty>Not yok.</Empty> : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.map((n) => (
                        <div key={n.id} className="flex items-start gap-2 text-xs bg-amber-50/60 border border-amber-100 rounded-xl p-2.5">
                            <p className="flex-1 whitespace-pre-wrap text-gray-700">{n.text}</p>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                <span className="text-[10px] font-bold text-gray-400">{formatTime(n.at)}</span>
                                <button
                                    onClick={() => void learningApi.deleteNote(courseId, studentId, n.id).then(() => setTick((t) => t + 1))}
                                    className="text-gray-300 hover:text-rose-500"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
};

/* ------------------------------------------------------------------------- */
/*  İpucu / mesaj gönder                                                      */
/* ------------------------------------------------------------------------- */

/** Takılan öğrenciye ipucu: öğrencinin görev ekranında anında görünür. */
export const NudgeBox: React.FC<{
    courseId: number;
    studentId: number;
    taskKey?: string;
    suggestion?: string | null;
    onSent?: () => void;
    compact?: boolean;
}> = ({ courseId, studentId, taskKey, suggestion, onSent, compact }) => {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const send = async () => {
        if (!text.trim()) return;
        setBusy(true);
        setError(null);
        try {
            await learningApi.nudge(courseId, studentId, text.trim(), taskKey);
            setText('');
            setSent(true);
            onSent?.();
        } catch (err) {
            setError(errorText(err, 'Gönderilemedi.'));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-1">
            <div className="flex gap-1.5">
                <input
                    value={text}
                    onChange={(e) => { setText(e.target.value); setSent(false); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
                    maxLength={1000}
                    placeholder={suggestion ? `ör. "${suggestion}" ölçütüne tekrar bak` : 'İpucu ya da kısa mesaj…'}
                    className={`flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-2 outline-none focus:border-indigo-300 ${compact ? 'text-[11px] py-1' : 'text-xs py-1.5'}`}
                />
                <button onClick={() => void send()} disabled={busy || !text.trim()}
                        className="px-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50" title="Öğrenciye gönder">
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
            </div>
            {sent && <p className="text-[10px] font-bold text-emerald-700">Gönderildi — öğrencinin ekranında göründü.</p>}
            {error && <p className="text-[10px] font-bold text-rose-600">{error}</p>}
        </div>
    );
};
