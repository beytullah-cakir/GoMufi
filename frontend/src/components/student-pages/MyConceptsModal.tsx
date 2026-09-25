import React, { useEffect, useState } from 'react';
import { Brain, Loader2, Sparkles, X } from 'lucide-react';
import api from '../../api';

/**
 * Öğrencinin kendi kazanım haritası: neyi öğrendim, neye çalışmalıyım?
 *
 * Öğretmen sayfasındaki verinin öğrenciye uygun hâli: "zorlanıyor" yerine
 * "tekrar etmeye değer"; yanılgı etiketleri ve kod kökeni gösterilmez.
 */

interface ConceptView {
    course: string;
    concepts: Array<{ concept_id: string; label: string; description: string; status: string; status_label: string; modules: string[] }>;
    next_steps: Array<{ label: string; status: string; modules: string[] }>;
    counts: Record<string, number>;
}

const TONE: Record<string, string> = {
    hakim: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    gelisiyor: 'bg-amber-100 text-amber-700 border-amber-300',
    zorlaniyor: 'bg-sky-100 text-sky-700 border-sky-300',
    veri_az: 'bg-gray-100 text-gray-500 border-gray-200',
};

const MyConceptsModal: React.FC<{ courseId: string | number; onClose: () => void }> = ({ courseId, onClose }) => {
    const [data, setData] = useState<ConceptView | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let alive = true;
        api.get<ConceptView>(`/analytics/me/courses/${courseId}/concepts`)
            .then((r) => { if (alive) setData(r.data); })
            .catch((err) => { if (alive) setError(err?.response?.data?.detail || 'Kazanımların yüklenemedi.'); });
        return () => { alive = false; };
    }, [courseId]);

    const learned = data?.counts.hakim ?? 0;
    const total = data?.concepts.length ?? 0;

    return (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border-b-8 border-gray-200"
                 onClick={(e) => e.stopPropagation()}>
                <header className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white flex items-start justify-between gap-3">
                    <div>
                        <h2 className="text-2xl font-black font-display flex items-center gap-2"><Brain className="w-6 h-6" /> Kazanımlarım</h2>
                        <p className="text-indigo-100 text-sm font-bold">{data?.course ?? '…'}{total > 0 && ` · ${total} konudan ${learned} tanesini öğrendin`}</p>
                    </div>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full"><X size={18} /></button>
                </header>
                <div className="p-6 overflow-y-auto space-y-5">
                    {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
                    {!data && !error && <p className="flex items-center gap-2 text-gray-400 font-bold"><Loader2 className="w-4 h-4 animate-spin" /> Yükleniyor…</p>}
                    {data && total === 0 && (
                        <p className="text-sm font-bold text-gray-500">Bu kursta henüz ölçülen bir konu yok. Görevleri çözdükçe burası dolacak.</p>
                    )}
                    {data && data.next_steps.length > 0 && (
                        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4">
                            <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                <Sparkles className="w-4 h-4" /> Sıradaki adımın
                            </p>
                            <ul className="space-y-1 text-sm text-amber-900 font-medium">
                                {data.next_steps.map((s) => (
                                    <li key={s.label}>
                                        <b>{s.label}</b> konusuna bir kez daha bak{s.modules.length ? ` — “${s.modules[0]}” modülünde` : ''}.
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {data && total > 0 && (
                        <div className="grid sm:grid-cols-2 gap-3">
                            {data.concepts.map((c) => (
                                <div key={c.concept_id} className="p-4 rounded-2xl border-2 border-gray-100 bg-white">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-black text-gray-800">{c.label}</p>
                                        <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg border ${TONE[c.status] ?? TONE.veri_az}`}>
                                            {c.status_label}
                                        </span>
                                    </div>
                                    {c.description && <p className="text-xs text-gray-500 mt-1">{c.description}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MyConceptsModal;
