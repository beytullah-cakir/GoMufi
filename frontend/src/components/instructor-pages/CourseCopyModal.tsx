import React, { useState } from 'react';
import { Check, Copy, Layers, Loader2, X } from 'lucide-react';
import api from '../../api';

/**
 * Kursu ya da modüllerini kopyalamak: yeni dönem ya da ikinci şube için dersi
 * baştan kurmamak.
 *
 *  - Kursun kopyası: müfredat, ders içerikleri ve quizler. Öğrenciler, şubeler,
 *    teslimler ve canlı ders tarihleri kopyalanmaz.
 *  - Modülleri kopyala: seçilen modüller (slaytları ve quizleriyle) başka bir
 *    kursun sonuna eklenir.
 */

interface CourseRef {
    id: number;
    title: string;
    curriculum?: any[];
}

const moduleTitle = (node: any, i: number) =>
    node?.title || node?.aiModuleTopic || node?.lessonTopic || `Modül ${i + 1}`;

const CourseCopyModal: React.FC<{
    source: CourseRef;
    courses: CourseRef[];
    onClose: () => void;
    onDone: () => void;
}> = ({ source, courses, onClose, onDone }) => {
    const [mode, setMode] = useState<'course' | 'modules'>('course');
    const [title, setTitle] = useState(`${source.title} (kopya)`);
    const modules = (source.curriculum || []).filter((n: any) => n && n.type !== 'live_sessions_config');
    const [selected, setSelected] = useState<string[]>([]);
    const targets = courses.filter((c) => c.id !== source.id);
    const [targetId, setTargetId] = useState<number | null>(targets[0]?.id ?? null);
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async () => {
        setBusy(true);
        setError(null);
        try {
            if (mode === 'course') {
                const res = await api.post(`/courses/${source.id}/duplicate`, { title });
                setResult(`“${res.data.title}” oluşturuldu. Yeni katılım kodu: ${res.data.enrollment_code}`);
            } else {
                const res = await api.post(`/courses/${source.id}/copy-modules`, { target_course_id: targetId, node_ids: selected });
                const target = courses.find((c) => c.id === targetId);
                setResult(`${res.data.copied.length} modül “${target?.title}” kursunun sonuna eklendi.`);
            }
            onDone();
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Kopyalanamadı.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Copy className="w-5 h-5 text-sky-500" /> Kopyala · {source.title}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </header>
                <div className="p-6 space-y-4">
                    <div className="flex p-1 bg-slate-100 rounded-xl">
                        {([['course', 'Kursun kopyası'], ['modules', 'Modülleri başka kursa']] as const).map(([id, label]) => (
                            <button key={id} onClick={() => { setMode(id); setResult(null); setError(null); }}
                                    className={`flex-1 py-2 text-xs font-black rounded-lg ${mode === id ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {mode === 'course' ? (
                        <>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Yeni kursun adı</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
                                   className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-400" />
                            <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                                Müfredat, ders içerikleri, görevler ve quizler kopyalanır. Öğrenciler, şubeler, teslimler ve
                                canlı ders tarihleri yeni kursa taşınmaz; kurs yeni bir katılım koduyla başlar.
                            </p>
                        </>
                    ) : (
                        <>
                            {targets.length === 0 ? (
                                <p className="text-sm font-bold text-slate-500">Modül kopyalamak için başka bir kursun olmalı.</p>
                            ) : (
                                <>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Hedef kurs</label>
                                    <select value={targetId ?? ''} onChange={(e) => setTargetId(Number(e.target.value))}
                                            className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold">
                                        {targets.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                                    </select>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Modüller</label>
                                    <div className="max-h-60 overflow-y-auto space-y-1 border-2 border-slate-100 rounded-xl p-2">
                                        {modules.map((node: any, i: number) => {
                                            const id = String(node.id);
                                            const on = selected.includes(id);
                                            return (
                                                <label key={id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer ${on ? 'bg-sky-50' : 'hover:bg-slate-50'}`}>
                                                    <input type="checkbox" checked={on}
                                                           onChange={() => setSelected(on ? selected.filter((x) => x !== id) : [...selected, id])} />
                                                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-sm font-bold text-slate-700">{moduleTitle(node, i)}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </>
                    )}

                    {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                    {result && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-1.5"><Check size={14} /> {result}</p>}

                    <button
                        onClick={() => void run()}
                        disabled={busy || (mode === 'course' ? !title.trim() : !targetId || selected.length === 0)}
                        className="w-full py-3 rounded-xl font-black text-sm bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Copy size={16} />}
                        {mode === 'course' ? 'Kopyasını oluştur' : `${selected.length} modülü kopyala`}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CourseCopyModal;
