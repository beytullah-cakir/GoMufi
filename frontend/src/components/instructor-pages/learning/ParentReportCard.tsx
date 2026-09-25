import React, { useState } from 'react';
import { Check, FileText, Loader2, Send, Sparkles, Trash2 } from 'lucide-react';
import api from '../../../api';
import { errorText } from './learningApi';
import { Card, Empty, ErrorBox, formatTime, useLoad } from './learningUi';

/**
 * Veli raporu: sistem dönemin sayılarını toplar, YZ (ya da şablon) sade bir
 * taslak yazar, öğretmen düzenleyip gönderir. Veli yalnızca gönderileni görür;
 * kod kökeni, yanılgı etiketleri ve öğretmen notları veliye gitmez.
 */

interface ReportContent {
    summary: string;
    learned: string[];
    focus: string[];
    homework: string;
    teacher_note: string;
}

interface ParentReport {
    id: number;
    status: 'draft' | 'sent';
    content: ReportContent;
    facts: { period?: string; active_days?: number; tasks_solved?: string[] };
    ai_generated: boolean;
    created_at: string;
    sent_at: string | null;
    parent_seen_at: string | null;
}

const base = (courseId: number, studentId: number) => `/analytics/courses/${courseId}/students/${studentId}/parent-reports`;

const lines = (items: string[]) => items.join('\n');
const toItems = (text: string) => text.split('\n').map((t) => t.trim()).filter(Boolean);

const ReportEditor: React.FC<{ report: ParentReport; onChanged: () => void }> = ({ report, onChanged }) => {
    const [content, setContent] = useState<ReportContent>(report.content);
    const [busy, setBusy] = useState<'save' | 'send' | 'delete' | null>(null);
    const [error, setError] = useState<string | null>(null);
    const dirty = JSON.stringify(content) !== JSON.stringify(report.content);

    const run = async (kind: 'save' | 'send' | 'delete') => {
        setBusy(kind);
        setError(null);
        try {
            if (kind === 'delete') {
                await api.delete(`/analytics/parent-reports/${report.id}`);
            } else {
                if (dirty) await api.put(`/analytics/parent-reports/${report.id}`, { content });
                if (kind === 'send') await api.post(`/analytics/parent-reports/${report.id}/send`);
            }
            onChanged();
        } catch (err) {
            setError(errorText(err, 'İşlem yapılamadı.'));
        } finally {
            setBusy(null);
        }
    };

    const field = 'w-full text-xs bg-white border-2 border-gray-100 rounded-xl p-2 outline-none focus:border-indigo-300 resize-none';
    return (
        <div className="space-y-2 border-2 border-indigo-100 rounded-2xl p-3 bg-indigo-50/30">
            <p className="text-[10.5px] font-bold text-gray-500">
                Taslak · {report.facts.period} · {report.facts.active_days ?? 0} aktif gün
                {report.ai_generated && <span className="text-violet-600"> · YZ taslağı, gözden geçir</span>}
            </p>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Özet</label>
            <textarea rows={3} value={content.summary} onChange={(e) => setContent({ ...content, summary: e.target.value })} className={field} />
            <div className="grid md:grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Öğrendikleri (her satır bir madde)</label>
                    <textarea rows={3} value={lines(content.learned)} onChange={(e) => setContent({ ...content, learned: toItems(e.target.value) })} className={field} />
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Üzerinde çalışılacaklar</label>
                    <textarea rows={3} value={lines(content.focus)} onChange={(e) => setContent({ ...content, focus: toItems(e.target.value) })} className={field} />
                </div>
            </div>
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Ödevler</label>
            <input value={content.homework} onChange={(e) => setContent({ ...content, homework: e.target.value })} className={field} />
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Öğretmenin notu</label>
            <textarea rows={2} value={content.teacher_note} onChange={(e) => setContent({ ...content, teacher_note: e.target.value })} className={field} />
            {error && <ErrorBox message={error} />}
            <div className="flex flex-wrap gap-2">
                <button onClick={() => void run('send')} disabled={!!busy || !content.summary.trim()}
                        className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-indigo-600 text-white disabled:opacity-50">
                    {busy === 'send' ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} Veliye gönder
                </button>
                {dirty && (
                    <button onClick={() => void run('save')} disabled={!!busy}
                            className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl border-2 border-gray-200 text-gray-600">
                        <Check size={13} /> Taslağı kaydet
                    </button>
                )}
                <button onClick={() => void run('delete')} disabled={!!busy}
                        className="flex items-center gap-1 text-xs font-bold px-2 py-1.5 text-rose-600">
                    <Trash2 size={13} /> Sil
                </button>
            </div>
        </div>
    );
};

const ParentReportCard: React.FC<{ courseId: number; studentId: number }> = ({ courseId, studentId }) => {
    const [tick, setTick] = useState(0);
    const { data } = useLoad(
        () => api.get<{ reports: ParentReport[]; has_parent: boolean }>(base(courseId, studentId)).then((r) => r.data),
        [courseId, studentId, tick],
    );
    const [days, setDays] = useState(7);
    const [useAi, setUseAi] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const create = async () => {
        setCreating(true);
        setError(null);
        try {
            await api.post(base(courseId, studentId), { days, use_ai: useAi });
            setTick((t) => t + 1);
        } catch (err) {
            setError(errorText(err, 'Taslak oluşturulamadı.'));
        } finally {
            setCreating(false);
        }
    };

    const drafts = data?.reports.filter((r) => r.status === 'draft') ?? [];
    const sent = data?.reports.filter((r) => r.status === 'sent') ?? [];

    return (
        <Card title="Veli raporu" icon={<FileText size={15} className="text-indigo-500" />}
              actions={data && !data.has_parent ? <span className="text-[10px] font-bold text-amber-600">Veli hesabı bağlı değil</span> : undefined}>
            <div className="flex flex-wrap items-center gap-2 mb-3">
                <select value={days} onChange={(e) => setDays(Number(e.target.value))}
                        className="text-xs font-bold bg-white border-2 border-gray-100 rounded-xl px-2 py-1.5">
                    <option value={7}>Son 1 hafta</option>
                    <option value={14}>Son 2 hafta</option>
                    <option value={30}>Son 1 ay</option>
                </select>
                <label className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
                    YZ taslak yazsın
                </label>
                <button onClick={() => void create()} disabled={creating}
                        className="flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-xl bg-violet-600 text-white disabled:opacity-60">
                    {creating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Taslak hazırla
                </button>
            </div>
            <p className="text-[10.5px] font-bold text-gray-400 mb-3">
                Taslak yalnızca dönemin sayılarına dayanır; düzenleyip onaylamadan veliye gitmez. Kod kökeni ve özel notların veliye gönderilmez.
            </p>
            {error && <ErrorBox message={error} />}
            <div className="space-y-3">
                {drafts.map((r) => <ReportEditor key={r.id} report={r} onChanged={() => setTick((t) => t + 1)} />)}
                {data && drafts.length === 0 && sent.length === 0 && <Empty>Henüz rapor yok.</Empty>}
                {sent.map((r) => (
                    <details key={r.id} className="rounded-xl border-2 border-gray-100 p-3">
                        <summary className="cursor-pointer text-xs font-bold text-gray-700">
                            Gönderildi · {formatTime(r.sent_at)} · {r.facts.period}
                            <span className={r.parent_seen_at ? 'text-emerald-600' : 'text-gray-400'}>
                                {r.parent_seen_at ? ' · veli okudu' : ' · henüz okunmadı'}
                            </span>
                        </summary>
                        <p className="text-xs text-gray-700 mt-2 whitespace-pre-wrap">{r.content.summary}</p>
                        {r.content.teacher_note && <p className="text-xs text-indigo-700 mt-1 italic">“{r.content.teacher_note}”</p>}
                    </details>
                ))}
            </div>
        </Card>
    );
};

export default ParentReportCard;
