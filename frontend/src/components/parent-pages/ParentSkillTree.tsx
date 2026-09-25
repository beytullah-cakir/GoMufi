import React, { useEffect, useState } from 'react';
import { Brain, Loader2, Target } from 'lucide-react';
import { parentApi, STATUS_TONE, type ConceptView } from './parentApi';

/**
 * Gelişim: çocuğun kurslarda ölçülen kazanımları.
 *
 * Eskiden bu sayfada sabit bir "matematik / mantık" beceri ağacı vardı (her
 * veliye aynı). Artık öğretmenin kazanım haritasındaki veri, veli için
 * yumuşatılmış dille: "Öğrendi", "Gelişiyor", "Tekrar etmeye değer".
 */

interface ChildRef { id: number; first_name?: string; last_name?: string }

const ParentSkillTree: React.FC<{ children: ChildRef[] }> = ({ children }) => {
    const [childId, setChildId] = useState<number | null>(children[0]?.id ?? null);
    const [loaded, setLoaded] = useState<{ id: number; views: ConceptView[] } | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!childId) return;
        let alive = true;
        parentApi.concepts(childId)
            .then((views) => { if (alive) { setLoaded({ id: childId, views }); setError(null); } })
            .catch(() => { if (alive) setError('Gelişim bilgisi yüklenemedi.'); });
        return () => { alive = false; };
    }, [childId]);

    const views = loaded && loaded.id === childId ? loaded.views : null;

    if (!children.length) {
        return <p className="p-8 text-center text-gray-500 font-bold">Önce "Öğrencilerim" sayfasından çocuğunuzu ekleyin.</p>;
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2"><Brain className="w-6 h-6 text-purple-500" /> Gelişim</h2>
                    <p className="text-gray-500 font-medium">Kurslarda ölçülen kazanımlar ve sıradaki adımlar</p>
                </div>
                {children.length > 1 && (
                    <select value={childId ?? ''} onChange={(e) => setChildId(Number(e.target.value))}
                            className="text-sm font-bold bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2">
                        {children.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
                    </select>
                )}
            </div>

            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}
            {!views && !error && <div className="flex items-center gap-2 text-gray-400 font-bold"><Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor…</div>}
            {views?.length === 0 && <p className="text-gray-500 font-bold">Kayıtlı olduğu bir kurs yok.</p>}

            {views?.map((v) => (
                <section key={v.course_id} className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-xl font-black text-gray-800">{v.course}</h3>
                        <div className="flex gap-2 text-xs font-black">
                            <span className={`px-2.5 py-1 rounded-lg border ${STATUS_TONE.hakim}`}>{v.counts.hakim ?? 0} öğrendi</span>
                            <span className={`px-2.5 py-1 rounded-lg border ${STATUS_TONE.gelisiyor}`}>{v.counts.gelisiyor ?? 0} gelişiyor</span>
                            <span className={`px-2.5 py-1 rounded-lg border ${STATUS_TONE.zorlaniyor}`}>{v.counts.zorlaniyor ?? 0} tekrar</span>
                        </div>
                    </div>
                    {v.next_steps.length > 0 && (
                        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                            <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <Target className="w-4 h-4" /> Birlikte tekrar edilebilir
                            </p>
                            <ul className="space-y-1 text-sm text-amber-900">
                                {v.next_steps.map((s) => (
                                    <li key={s.label}><b>{s.label}</b>{s.modules.length ? ` — ${s.modules.join(', ')} modülü` : ''}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {v.concepts.length === 0 ? (
                        <p className="text-sm text-gray-400 font-bold">Bu kursta henüz ölçülen bir kazanım yok.</p>
                    ) : (
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {v.concepts.map((c) => (
                                <div key={c.concept_id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="font-black text-gray-800 text-sm">{c.label}</p>
                                        <span className={`shrink-0 text-[10px] font-black px-2 py-0.5 rounded-lg border ${STATUS_TONE[c.status] ?? STATUS_TONE.veri_az}`}>
                                            {c.status_label}
                                        </span>
                                    </div>
                                    {c.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
};

export default ParentSkillTree;
