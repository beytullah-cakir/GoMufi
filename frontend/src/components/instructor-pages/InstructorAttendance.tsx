import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarCheck, Check, ClipboardList, Download, Loader2, Save, Table2, UserCheck } from 'lucide-react';
import api from '../../api';

/**
 * Yoklama: ders günü için her öğrenciyi Var / Yok / Geç / İzinli işaretle,
 * dönem boyunca devam oranlarını gör ve Excel'e (CSV) aktar.
 *
 * Canlı ders görüşmesi GoMufi'nin dışında (Zoom, Meet, sınıf) olduğu için
 * yoklama otomatik alınamıyor; öğretmen işaretliyor.
 */

type Status = 'present' | 'absent' | 'late' | 'excused';

interface Row {
    id: number;
    name: string;
    class_id: string | null;
    class_name: string | null;
    status: Status | null;
    note: string | null;
}

interface SummaryRow extends Row {
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number | null;
    by_date: Record<string, Status>;
}

const STATUSES: Array<{ id: Status; label: string; short: string; on: string }> = [
    { id: 'present', label: 'Var', short: 'V', on: 'bg-emerald-500 text-white border-emerald-500' },
    { id: 'absent', label: 'Yok', short: 'Y', on: 'bg-rose-500 text-white border-rose-500' },
    { id: 'late', label: 'Geç', short: 'G', on: 'bg-amber-400 text-white border-amber-400' },
    { id: 'excused', label: 'İzinli', short: 'İ', on: 'bg-sky-500 text-white border-sky-500' },
];
const LABEL: Record<Status, string> = { present: 'Var', absent: 'Yok', late: 'Geç', excused: 'İzinli' };
/** Devam oranı bu değerin altındaysa vurgulanır. */
const LOW_RATE = 80;

const todayLocal = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const trDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
const csvCell = (text: string) => (/[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

const InstructorAttendance: React.FC<{ coursesData?: any[] }> = ({ coursesData = [] }) => {
    const courses = useMemo(() => (coursesData || []).map((c: any) => ({ id: Number(c.id), title: String(c.title) })), [coursesData]);
    const [courseId, setCourseId] = useState<number | null>(null);
    const [classId, setClassId] = useState('');
    const [day, setDay] = useState(todayLocal());
    const [tab, setTab] = useState<'take' | 'summary'>('take');

    const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
    const [rows, setRows] = useState<Row[]>([]);
    const [dirty, setDirty] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

    const [summary, setSummary] = useState<{ days: string[]; students: SummaryRow[] } | null>(null);

    useEffect(() => {
        if (courseId === null && courses.length) setCourseId(courses[0].id);
    }, [courses, courseId]);

    const loadSheet = useCallback(async () => {
        if (!courseId) return;
        setLoading(true);
        setMessage(null);
        try {
            const res = await api.get(`/attendance/courses/${courseId}`, { params: { date: day, class_id: classId || undefined } });
            setClasses(res.data.classes || []);
            setRows(res.data.students || []);
            setDirty(false);
        } catch (err: any) {
            setMessage({ ok: false, text: err?.response?.data?.detail || 'Liste yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    }, [courseId, day, classId]);

    const loadSummary = useCallback(async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const res = await api.get(`/attendance/courses/${courseId}/summary`, { params: { class_id: classId || undefined } });
            setSummary(res.data);
        } catch (err: any) {
            setMessage({ ok: false, text: err?.response?.data?.detail || 'Özet yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    }, [courseId, classId]);

    useEffect(() => {
        if (tab === 'take') void loadSheet();
        else void loadSummary();
    }, [tab, loadSheet, loadSummary]);

    const mark = (id: number, status: Status | null) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: r.status === status ? null : status } : r)));
        setDirty(true);
        setMessage(null);
    };
    const setNote = (id: number, note: string) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, note } : r)));
        setDirty(true);
    };
    const markRest = () => {
        setRows((prev) => prev.map((r) => (r.status ? r : { ...r, status: 'present' })));
        setDirty(true);
    };

    const save = async () => {
        if (!courseId) return;
        setSaving(true);
        setMessage(null);
        try {
            const res = await api.put(`/attendance/courses/${courseId}`, {
                date: day,
                records: rows.map((r) => ({ student_id: r.id, status: r.status, note: r.note || null })),
            });
            setDirty(false);
            setMessage({ ok: true, text: `Yoklama kaydedildi (${res.data.saved} öğrenci).` });
        } catch (err: any) {
            setMessage({ ok: false, text: err?.response?.data?.detail || 'Yoklama kaydedilemedi.' });
        } finally {
            setSaving(false);
        }
    };

    const download = () => {
        if (!summary) return;
        const title = courses.find((c) => c.id === courseId)?.title || 'Kurs';
        const header = ['Öğrenci', 'Şube', ...summary.days.map(trDate), 'Var', 'Yok', 'Geç', 'İzinli', 'Devam %'];
        const lines = summary.students.map((s) => [
            s.name, s.class_name ?? '', ...summary.days.map((d) => (s.by_date[d] ? LABEL[s.by_date[d]] : '')),
            s.present, s.absent, s.late, s.excused, s.rate === null ? '' : String(s.rate).replace('.', ','),
        ]);
        const csv = '﻿' + [[`${title} — yoklama (${new Date().toLocaleDateString('tr-TR')})`], header, ...lines]
            .map((r) => r.map((c) => csvCell(String(c))).join(';')).join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        a.download = `${title.replace(/[^\p{L}\p{N}]+/gu, '_')}_yoklama.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    /** Kaydedilmemiş işaretler varken kurs/şube/gün/sekme değişirse önce sor. */
    const guard = (change: () => void) => {
        if (dirty && !window.confirm('Kaydedilmemiş yoklama var. Kaydetmeden devam edilsin mi?')) return;
        change();
    };

    const counts = STATUSES.map((s) => ({ ...s, n: rows.filter((r) => r.status === s.id).length }));
    const unmarked = rows.filter((r) => !r.status).length;

    if (!courses.length) {
        return (
            <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-3xl border border-dashed border-slate-200">
                Yoklama almak için önce bir kurs oluştur.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3"><UserCheck className="text-emerald-500" /> Yoklama</h1>
                    <p className="text-slate-500 font-bold mt-1">Ders günü için devam durumunu işaretle; öğrenci ve veli kendi panelinde görür.</p>
                </div>
                <div className="flex p-1 bg-slate-100 rounded-xl self-start">
                    {([['take', 'Yoklama al', ClipboardList], ['summary', 'Devam özeti', Table2]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => guard(() => setTab(id))}
                                className={`px-4 py-2 text-xs font-black rounded-lg flex items-center gap-1.5 ${tab === id ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`}>
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-3xl border-2 border-slate-100 p-4 flex flex-wrap gap-3 items-end">
                <label className="flex flex-col gap-1 min-w-[200px] flex-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kurs</span>
                    <select value={courseId ?? ''} onChange={(e) => { const v = Number(e.target.value); guard(() => { setCourseId(v); setClassId(''); }); }}
                            className="p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold">
                        {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                </label>
                <label className="flex flex-col gap-1 min-w-[160px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Şube</span>
                    <select value={classId} onChange={(e) => { const v = e.target.value; guard(() => setClassId(v)); }}
                            className="p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold">
                        <option value="">Tüm şubeler</option>
                        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </label>
                {tab === 'take' && (
                    <label className="flex flex-col gap-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ders günü</span>
                        <input type="date" value={day} max={todayLocal()} onChange={(e) => { const v = e.target.value; if (v) guard(() => setDay(v)); }}
                               className="p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold" />
                    </label>
                )}
            </div>

            {message && (
                <p className={`text-sm font-bold rounded-2xl px-4 py-3 flex items-center gap-2 ${message.ok ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                    {message.ok && <Check size={16} />} {message.text}
                </p>
            )}

            {loading ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-emerald-500" size={32} /></div>
            ) : tab === 'take' ? (
                rows.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-3xl border border-dashed border-slate-200">
                        Bu kursta (ya da şubede) kayıtlı öğrenci yok.
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden">
                        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                            <div className="flex flex-wrap gap-2 text-xs font-black">
                                {counts.map((c) => <span key={c.id} className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-600">{c.label}: {c.n}</span>)}
                                {unmarked > 0 && <span className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700">İşaretlenmedi: {unmarked}</span>}
                            </div>
                            {unmarked > 0 && (
                                <button onClick={markRest} className="text-xs font-black text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl flex items-center gap-1.5">
                                    <CalendarCheck size={14} /> Kalanları "Var" işaretle
                                </button>
                            )}
                        </div>
                        <ul className="divide-y divide-slate-100">
                            {rows.map((r) => (
                                <li key={r.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-black text-slate-800 truncate">{r.name}</p>
                                        {r.class_name && <p className="text-[11px] font-bold text-slate-400">{r.class_name}</p>}
                                    </div>
                                    <div className="flex gap-1.5" role="radiogroup" aria-label={`${r.name} yoklama durumu`}>
                                        {STATUSES.map((s) => (
                                            <button key={s.id} role="radio" aria-checked={r.status === s.id} onClick={() => mark(r.id, s.id)}
                                                    className={`w-16 py-2 rounded-xl border-2 text-xs font-black transition-colors ${r.status === s.id ? s.on : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                                {s.label}
                                            </button>
                                        ))}
                                    </div>
                                    {(r.status === 'absent' || r.status === 'late' || r.status === 'excused' || r.note) && (
                                        <input value={r.note || ''} onChange={(e) => setNote(r.id, e.target.value)} maxLength={200}
                                               placeholder="Not (isteğe bağlı)" aria-label={`${r.name} notu`}
                                               className="sm:w-44 p-2 bg-slate-50 border-2 border-slate-100 rounded-xl text-xs font-bold outline-none focus:border-emerald-300" />
                                    )}
                                </li>
                            ))}
                        </ul>
                        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
                            {dirty && <span className="text-xs font-bold text-amber-600">Kaydedilmemiş değişiklik var</span>}
                            <button onClick={() => void save()} disabled={saving || !dirty}
                                    className="px-6 py-3 rounded-xl font-black text-sm bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Kaydet
                            </button>
                        </div>
                    </div>
                )
            ) : summary && (
                summary.days.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-3xl border border-dashed border-slate-200">
                        Henüz yoklama alınmamış.
                    </div>
                ) : (
                    <div className="bg-white rounded-3xl border-2 border-slate-100 overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-500">
                                {summary.days.length} ders günü · Devam oranı = (Var + Geç) / (Var + Geç + Yok); izinli günler sayılmaz.
                            </p>
                            <button onClick={download} title="Excel'de açılır (CSV)"
                                    className="text-xs font-black text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl flex items-center gap-1.5">
                                <Download size={14} /> Excel
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                                        <th className="px-5 py-3">Öğrenci</th>
                                        {summary.days.map((d) => <th key={d} className="px-2 py-3 text-center">{trDate(d)}</th>)}
                                        <th className="px-3 py-3 text-center">Var</th>
                                        <th className="px-3 py-3 text-center">Yok</th>
                                        <th className="px-3 py-3 text-center">Geç</th>
                                        <th className="px-3 py-3 text-center">İzinli</th>
                                        <th className="px-5 py-3 text-right">Devam</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {summary.students.map((s) => (
                                        <tr key={s.id}>
                                            <td className="px-5 py-3">
                                                <p className="font-black text-slate-800">{s.name}</p>
                                                {s.class_name && <p className="text-[11px] font-bold text-slate-400">{s.class_name}</p>}
                                            </td>
                                            {summary.days.map((d) => {
                                                const st = s.by_date[d];
                                                const meta = STATUSES.find((x) => x.id === st);
                                                return (
                                                    <td key={d} className="px-2 py-3 text-center">
                                                        {meta ? <span title={meta.label} className={`inline-flex w-7 h-7 items-center justify-center rounded-lg text-[11px] font-black ${meta.on}`}>{meta.short}</span>
                                                              : <span className="text-slate-300">·</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="px-3 py-3 text-center font-bold text-slate-600">{s.present}</td>
                                            <td className="px-3 py-3 text-center font-bold text-slate-600">{s.absent}</td>
                                            <td className="px-3 py-3 text-center font-bold text-slate-600">{s.late}</td>
                                            <td className="px-3 py-3 text-center font-bold text-slate-600">{s.excused}</td>
                                            <td className={`px-5 py-3 text-right font-black ${s.rate !== null && s.rate < LOW_RATE ? 'text-rose-600' : 'text-slate-800'}`}>
                                                {s.rate === null ? '—' : `%${s.rate}`}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}
        </div>
    );
};

export default InstructorAttendance;
