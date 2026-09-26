import React, { useEffect, useState } from 'react';
import { Check, ClipboardPaste, Landmark, Loader2, Trash2, X } from 'lucide-react';
import api from '../../api';

/**
 * MEB kazanım eşlemesi: öğretmen kendi öğretim programındaki kazanımları
 * yapıştırır, her modülün hangi kazanımları karşıladığını işaretler. Rapor
 * Öğrenme Analizi → Kazanım Haritası'nda.
 *
 * Kazanım listesi bilerek yerleşik değil: programlar sınıfa ve yıla göre değişiyor,
 * yanlış bir kod öğretmeni resmî evrakta yanıltır.
 */

interface Outcome { code: string; text: string }
interface ModuleInfo { id: string; index: number; title: string }

const MebOutcomesModal: React.FC<{ course: { id: number; title: string }; onClose: () => void }> = ({ course, onClose }) => {
    const [outcomes, setOutcomes] = useState<Outcome[]>([]);
    const [mapping, setMapping] = useState<Record<string, string[]>>({});
    const [modules, setModules] = useState<ModuleInfo[] | null>(null);
    const [paste, setPaste] = useState('');
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get(`/courses/${course.id}/meb-outcomes`)
            .then((res) => { setOutcomes(res.data.outcomes); setMapping(res.data.mapping); setModules(res.data.modules); })
            .catch((err) => setError(err?.response?.data?.detail || 'Kazanımlar yüklenemedi.'));
    }, [course.id]);

    const addFromPaste = async () => {
        if (!paste.trim()) return;
        setError(null);
        try {
            const res = await api.post('/meb-outcomes/parse', { text: paste });
            const known = new Set(outcomes.map((o) => o.code.toUpperCase()));
            const fresh = (res.data.outcomes as Outcome[]).filter((o) => !known.has(o.code.toUpperCase()));
            setOutcomes((prev) => [...prev, ...fresh]);
            setPaste('');
            setSaved(false);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Metin ayrıştırılamadı.');
        }
    };

    const removeOutcome = (code: string) => {
        setOutcomes((prev) => prev.filter((o) => o.code !== code));
        setMapping((prev) => Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v.filter((c) => c !== code)])));
        setSaved(false);
    };

    const toggle = (moduleId: string, code: string) => {
        setMapping((prev) => {
            const current = prev[moduleId] || [];
            return { ...prev, [moduleId]: current.includes(code) ? current.filter((c) => c !== code) : [...current, code] };
        });
        setSaved(false);
    };

    const save = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await api.put(`/courses/${course.id}/meb-outcomes`, { outcomes, mapping });
            setOutcomes(res.data.outcomes);
            setMapping(res.data.mapping);
            setSaved(true);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Kaydedilemedi.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Landmark className="w-5 h-5 text-indigo-500" /> MEB kazanımları · {course.title}</h2>
                    <button onClick={onClose} aria-label="Kapat" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </header>

                {!modules ? (
                    <div className="p-10 flex justify-center">
                        {error ? <p className="text-sm font-bold text-rose-600">{error}</p> : <Loader2 className="animate-spin text-indigo-500" />}
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <section className="space-y-2">
                            <h3 className="text-sm font-black text-slate-700">1. Kazanımları ekle</h3>
                            <p className="text-xs font-bold text-slate-500 leading-relaxed">
                                Dersinin öğretim programından (ör. MEB müfredat sayfası ya da yıllık plan) kazanımları kopyalayıp yapıştır.
                                Her satır bir kazanım; satır başındaki kod ("BT.7.2.1.1.") otomatik ayrılır.
                            </p>
                            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4}
                                      placeholder={'BT.7.2.1.1. ...\nBT.7.2.1.2. ...'}
                                      className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-300" />
                            <button onClick={() => void addFromPaste()} disabled={!paste.trim()}
                                    className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50">
                                <ClipboardPaste size={14} /> Listeye ekle
                            </button>
                            {outcomes.length > 0 && (
                                <ul className="divide-y divide-slate-50 border-2 border-slate-100 rounded-xl">
                                    {outcomes.map((o) => (
                                        <li key={o.code} className="flex items-start gap-3 px-3 py-2">
                                            <span className="shrink-0 text-[11px] font-black text-indigo-600 font-mono mt-0.5">{o.code}</span>
                                            <span className="flex-1 text-xs font-bold text-slate-700">{o.text}</span>
                                            <button onClick={() => removeOutcome(o.code)} aria-label={`${o.code} kazanımını sil`}
                                                    className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50"><Trash2 size={14} /></button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>

                        {outcomes.length > 0 && (
                            <section className="space-y-2 border-t border-slate-100 pt-5">
                                <h3 className="text-sm font-black text-slate-700">2. Modülleri eşle</h3>
                                <p className="text-xs font-bold text-slate-500">Her modülün karşıladığı kazanımları işaretle.</p>
                                {modules.length === 0 ? (
                                    <p className="text-xs font-bold text-slate-400">Bu kursta henüz modül yok.</p>
                                ) : modules.map((m) => (
                                    <div key={m.id} className="flex flex-col sm:flex-row sm:items-start gap-2 py-2 border-b border-slate-50">
                                        <span className="sm:w-44 shrink-0 text-sm font-black text-slate-700">{m.index}. {m.title}</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {outcomes.map((o) => {
                                                const on = (mapping[m.id] || []).includes(o.code);
                                                return (
                                                    <button key={o.code} onClick={() => toggle(m.id, o.code)} title={o.text} aria-pressed={on}
                                                            className={`text-[11px] font-black font-mono px-2 py-1 rounded-lg border-2 transition-colors ${
                                                                on ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200'}`}>
                                                        {o.code}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}

                        {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                        {saved && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-1.5"><Check size={14} /> Kaydedildi. Rapor: Öğrenme Analizi → Kazanım Haritası.</p>}

                        <button onClick={() => void save()} disabled={busy}
                                className="w-full py-3 rounded-xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Kaydet
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MebOutcomesModal;
