import React, { useState } from 'react';
import { Check, Download, Info, Loader2, Printer, Scale } from 'lucide-react';
import { errorText, learningApi, type GradeCell, type GradeComponent, type Gradebook, type Scope } from './learningApi';
import { Card, Empty, ErrorBox, formatTime, Loading, useLoad } from './learningUi';

/**
 * Not defteri: ödev notları, görev tamamlama, proje notları ve quiz başarısı
 * tek tabloda; öğretmenin ağırlıklarıyla bir performans notu ÖNERİSİ.
 *
 * Öğretmen e-Okul'a girerken bu ortalamayı elle hesaplıyordu. Excel (CSV) ve
 * yazdırma (PDF olarak kaydet) ile dışa aktarılır.
 */

const COMPONENTS: Array<{ key: GradeComponent; label: string; hint: string }> = [
    { key: 'homework', label: 'Ödevler', hint: 'Notlanan ödevlerin ortalaması' },
    { key: 'tasks', label: 'Görevler', hint: 'Uygula / Birleştir görevlerinin tamamlanma oranı' },
    { key: 'projects', label: 'Projeler', hint: 'Üret projelerinin notları' },
    { key: 'quiz', label: 'Quiz', hint: 'Quiz sorularında doğru oranı' },
    { key: 'mastery', label: 'Kazanım', hint: 'Ölçülen kavramlarda ortalama hakimiyet' },
];

const CELL_LABEL: Record<GradeCell['status'], string> = {
    graded: '', pending: 'bekliyor', missing: 'teslim yok (0)', overdue: 'teslim yok', open: '—',
};

const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(1));
/** Türkçe Excel: ondalık virgül. */
const csvNum = (v: number | null | undefined) => (v === null || v === undefined ? '' : String(Math.round(v * 10) / 10).replace('.', ','));
const csvCell = (text: string) => (/[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);

const cellText = (cell: GradeCell | undefined) =>
    !cell ? '' : cell.grade !== null ? String(cell.grade) : CELL_LABEL[cell.status];

function toCsv(book: Gradebook, courseTitle: string): string {
    const header = [
        'Öğrenci', 'Şube',
        ...book.homeworks.map((h) => `Ödev: ${h.title}`),
        ...book.projects.map((p) => `Proje: ${p.title}`),
        ...COMPONENTS.map((c) => `${c.label} (%${book.weights[c.key]})`),
        'Önerilen not',
    ];
    const rows = book.students.map((s) => [
        s.student, s.class_name ?? '',
        ...book.homeworks.map((h) => cellText(s.homework[h.task_key])),
        ...book.projects.map((p) => cellText(s.projects[p.task_key])),
        ...COMPONENTS.map((c) => csvNum(s.components[c.key])),
        csvNum(s.total),
    ]);
    const title = [`${courseTitle} — not defteri (${new Date().toLocaleDateString('tr-TR')})`];
    return '﻿' + [title, header, ...rows].map((r) => r.map((c) => csvCell(String(c))).join(';')).join('\r\n');
}

function printBook(book: Gradebook, courseTitle: string) {
    const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch] as string));
    const head = ['Öğrenci', 'Şube', ...COMPONENTS.filter((c) => book.weights[c.key] > 0).map((c) => `${c.label} (%${book.weights[c.key]})`), 'Önerilen']
        .map((h) => `<th>${esc(h)}</th>`).join('');
    const body = book.students.map((s) => `<tr><td>${esc(s.student)}</td><td>${esc(s.class_name ?? '')}</td>${
        COMPONENTS.filter((c) => book.weights[c.key] > 0).map((c) => `<td>${fmt(s.components[c.key])}</td>`).join('')
    }<td><b>${fmt(s.total)}</b></td></tr>`).join('');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(courseTitle)} — Not defteri</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:18px}p{font-size:12px;color:#555}
table{border-collapse:collapse;width:100%;font-size:12px}th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f3f4f6}</style>
</head><body><h1>${esc(courseTitle)} — Not defteri</h1>
<p>${new Date().toLocaleString('tr-TR')} · Önerilen not, ağırlıklı ortalamadır; veri olmayan bileşen ortalamaya girmez.
${book.missing_as_zero ? 'Süresi dolmuş ve teslim edilmemiş ödevler 0 sayıldı.' : ''}</p>
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`);
    win.document.close();
}

const GradebookTab: React.FC<{ courseId: number; courseTitle: string; refreshKey: number; scope: Scope; onOpenStudent: (id: number) => void }> = ({
    courseId, courseTitle, refreshKey, scope, onOpenStudent,
}) => {
    const [tick, setTick] = useState(0);
    const { data, error, loading } = useLoad(() => learningApi.gradebook(courseId, scope), [courseId, refreshKey, scope.classId, tick]);
    const [draft, setDraft] = useState<{ weights: Record<GradeComponent, number>; missing: boolean } | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [detail, setDetail] = useState(false);

    if (loading && !data) return <Loading />;
    if (error) return <ErrorBox message={error} />;
    if (!data) return null;

    const weights = draft?.weights ?? data.weights;
    const missing = draft?.missing ?? data.missing_as_zero;
    const weightSum = Object.values(weights).reduce((a, b) => a + b, 0);

    const save = async () => {
        setSaving(true);
        setSaveError(null);
        try {
            await learningApi.saveGradebookSettings(courseId, weights, missing);
            setDraft(null);
            setTick((t) => t + 1);
        } catch (err) {
            setSaveError(errorText(err, 'Kaydedilemedi.'));
        } finally {
            setSaving(false);
        }
    };

    const download = () => {
        const blob = new Blob([toCsv(data, courseTitle)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${courseTitle.replace(/[^\p{L}\p{N}]+/gu, '_')}_not_defteri.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <Card
                title="Ağırlıklar"
                icon={<Scale size={16} className="text-indigo-500" />}
                actions={draft && (
                    <button onClick={() => void save()} disabled={saving || weightSum === 0}
                            className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-indigo-600 text-white disabled:opacity-50">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Kaydet
                    </button>
                )}
            >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {COMPONENTS.map((c) => (
                        <label key={c.key} className="block" title={c.hint}>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.label}</span>
                            <div className="flex items-center gap-1 mt-1">
                                <span className="text-sm font-black text-gray-400">%</span>
                                <input
                                    type="number" min={0} max={100}
                                    value={weights[c.key]}
                                    onChange={(e) => setDraft({ weights: { ...weights, [c.key]: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }, missing })}
                                    className="w-full text-sm font-black bg-gray-50 border-2 border-gray-100 rounded-xl px-2 py-1.5 outline-none focus:border-indigo-300"
                                />
                            </div>
                        </label>
                    ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                        <input type="checkbox" checked={missing} onChange={(e) => setDraft({ weights, missing: e.target.checked })} />
                        Süresi dolmuş, teslim edilmemiş ödev 0 sayılsın
                    </label>
                    <span className={`text-[11px] font-black ${weightSum === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        Toplam %{weightSum}{weightSum !== 100 && ' — oranlanarak kullanılır'}
                    </span>
                </div>
                {saveError && <ErrorBox message={saveError} />}
                <p className="text-[10.5px] font-bold text-gray-400 mt-2 flex items-start gap-1">
                    <Info size={12} className="shrink-0 mt-0.5" />
                    Veri olmayan bileşen (ör. hiç quiz yoksa) öğrencinin ortalamasına girmez. Önerilen not bir öneridir; karar senin.
                </p>
            </Card>

            <Card
                title={`Not defteri · ${data.students.length} öğrenci${data.class_average !== null ? ` · sınıf ortalaması ${fmt(data.class_average)}` : ''}`}
                actions={(
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => setDetail(!detail)}
                                className="text-[11px] font-black px-2.5 py-1.5 rounded-lg border-2 border-gray-100 text-gray-600">
                            {detail ? 'Özet' : 'Ödev ayrıntısı'}
                        </button>
                        <button onClick={download} title="Excel'de açılır (CSV)"
                                className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white">
                            <Download size={12} /> Excel
                        </button>
                        <button onClick={() => printBook(data, courseTitle)} title="Yazdır ya da PDF olarak kaydet"
                                className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-slate-800 text-white">
                            <Printer size={12} /> Yazdır / PDF
                        </button>
                    </div>
                )}
            >
                {data.students.length === 0 ? <Empty>Bu kapsamda öğrenci yok.</Empty> : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                    <th className="py-2 pr-3 sticky left-0 bg-white">Öğrenci</th>
                                    {detail ? (
                                        <>
                                            {data.homeworks.map((h) => (
                                                <th key={h.task_key} className="py-2 pr-3 max-w-[140px]" title={h.due_at ? `Son teslim ${formatTime(h.due_at)}` : undefined}>
                                                    {h.title}
                                                </th>
                                            ))}
                                            {data.projects.map((p) => <th key={p.task_key} className="py-2 pr-3">Proje: {p.title}</th>)}
                                        </>
                                    ) : COMPONENTS.map((c) => (
                                        <th key={c.key} className={`py-2 pr-3 ${weights[c.key] === 0 ? 'opacity-40' : ''}`} title={c.hint}>
                                            {c.label} <span className="text-gray-300">%{data.weights[c.key]}</span>
                                        </th>
                                    ))}
                                    <th className="py-2 text-right">Önerilen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.students.map((s) => (
                                    <tr key={s.student_id} className="border-t border-gray-50">
                                        <td className="py-2 pr-3 sticky left-0 bg-white">
                                            <button onClick={() => onOpenStudent(s.student_id)} className="font-black text-gray-800 hover:text-indigo-600 text-left">
                                                {s.student}
                                            </button>
                                            {s.class_name && <span className="block text-[10px] font-bold text-gray-400">{s.class_name}</span>}
                                        </td>
                                        {detail ? (
                                            <>
                                                {data.homeworks.map((h) => {
                                                    const cell = s.homework[h.task_key];
                                                    return (
                                                        <td key={h.task_key} className={`py-2 pr-3 font-bold ${cell?.status === 'missing' ? 'text-rose-600' : cell?.status === 'pending' ? 'text-amber-600' : 'text-gray-700'}`}>
                                                            {cellText(cell) || '—'}
                                                        </td>
                                                    );
                                                })}
                                                {data.projects.map((p) => (
                                                    <td key={p.task_key} className="py-2 pr-3 font-bold text-gray-700">{cellText(s.projects[p.task_key]) || '—'}</td>
                                                ))}
                                            </>
                                        ) : COMPONENTS.map((c) => (
                                            <td key={c.key} className={`py-2 pr-3 font-bold text-gray-700 ${weights[c.key] === 0 ? 'opacity-40' : ''}`}>
                                                {fmt(s.components[c.key])}
                                                {c.key === 'tasks' && data.task_count > 0 && (
                                                    <span className="text-[10px] text-gray-400"> ({s.tasks_done}/{data.task_count})</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="py-2 text-right font-black text-indigo-700">{fmt(s.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default GradebookTab;
