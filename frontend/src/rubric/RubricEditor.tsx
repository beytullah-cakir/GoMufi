import React, { useEffect, useState } from 'react';
import { BookmarkPlus, ChevronDown, Library, Loader2, Plus, Trash2, X } from 'lucide-react';
import type { Rubric, RubricCriterion } from '../components/lesson-builder/types';
import { newCriterionId, rubricApi, starterRubric, type RubricTemplate } from './rubric';

/**
 * Dereceli puanlama anahtarı düzenleyicisi (ders oluşturucu).
 *
 * Öğretmen ölçütleri ve seviyeleri bir kez tanımlar; "Kütüphaneye kaydet" ile
 * başka ödevlerde tekrar kullanır. Slayta eklenen, kütüphanedekinin kopyasıdır.
 */
const RubricEditor: React.FC<{
    rubric: Rubric | undefined;
    onChange: (rubric: Rubric | undefined) => void;
    submissionType?: 'code' | 'text' | 'file' | 'image';
}> = ({ rubric, onChange, submissionType = 'code' }) => {
    const [open, setOpen] = useState(!!rubric);
    const [library, setLibrary] = useState<RubricTemplate[] | null>(null);
    const [showLibrary, setShowLibrary] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [saving, setSaving] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (!showLibrary || library) return;
        rubricApi.list().then(setLibrary).catch(() => setLibrary([]));
    }, [showLibrary, library]);

    const criteria = rubric?.criteria ?? [];
    const setCriteria = (next: RubricCriterion[]) => onChange(next.length ? { criteria: next } : undefined);
    const patchCriterion = (i: number, updates: Partial<RubricCriterion>) =>
        setCriteria(criteria.map((c, j) => (j === i ? { ...c, ...updates } : c)));

    const saveToLibrary = async () => {
        if (!rubric || !saveTitle.trim()) return;
        setSaving(true);
        setNotice(null);
        try {
            const saved = await rubricApi.save(saveTitle.trim(), rubric);
            setLibrary((prev) => (prev ? [saved, ...prev] : prev));
            setSaveTitle('');
            setNotice('Kütüphaneye kaydedildi.');
        } catch (err: any) {
            setNotice(err?.response?.data?.detail || 'Kaydedilemedi.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white p-4">
            <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between text-left">
                <span className="text-[10px] font-black tracking-widest text-slate-500">
                    DERECELİ PUANLAMA ANAHTARI {rubric ? `· ${criteria.length} ölçüt` : '(isteğe bağlı)'}
                </span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="mt-3 space-y-3">
                    <p className="text-[10.5px] font-medium text-slate-500 leading-snug">
                        Her ölçüt için seviyeler düşükten yükseğe. Değerlendirirken seviyeyi seçersin, not 100 üzerinden
                        hesaplanır. YZ taslağı da aynı anahtarla puanlar; öğrenci ölçütleri teslimden önce görür.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {!rubric && (
                            <button onClick={() => onChange(starterRubric(submissionType))}
                                    className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg bg-blue-600 text-white">
                                <Plus size={12} /> Hazır şablonla başla
                            </button>
                        )}
                        <button onClick={() => setShowLibrary(!showLibrary)}
                                className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg border-2 border-slate-200 text-slate-600">
                            <Library size={12} /> Kütüphanemden seç
                        </button>
                        {rubric && (
                            <button onClick={() => onChange(undefined)}
                                    className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1.5 rounded-lg text-rose-600">
                                <X size={12} /> Anahtarı kaldır
                            </button>
                        )}
                    </div>

                    {showLibrary && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1">
                            {library === null && <p className="text-[11px] text-slate-400 flex items-center gap-1"><Loader2 size={11} className="animate-spin" /> Yükleniyor…</p>}
                            {library?.length === 0 && <p className="text-[11px] text-slate-400">Kütüphanen boş. Bir anahtarı kaydettiğinde burada görünür.</p>}
                            {library?.map((t) => (
                                <div key={t.id} className="flex items-center justify-between gap-2 bg-white rounded-lg px-2 py-1.5">
                                    <button onClick={() => { onChange({ criteria: t.criteria.map((c) => ({ ...c, levels: c.levels.map((l) => ({ ...l })) })) }); setShowLibrary(false); setOpen(true); }}
                                            className="text-[11.5px] font-bold text-slate-700 hover:text-blue-600 text-left flex-1">
                                        {t.title} <span className="text-slate-400">· {t.criteria.length} ölçüt</span>
                                    </button>
                                    <button onClick={() => void rubricApi.remove(t.id).then(() => setLibrary((prev) => prev?.filter((x) => x.id !== t.id) ?? prev))}
                                            className="text-slate-300 hover:text-rose-500" title="Kütüphaneden sil">
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {criteria.map((c, i) => (
                        <div key={c.id} className="rounded-xl border-2 border-slate-100 p-3 space-y-2">
                            <div className="flex items-start gap-2">
                                <div className="flex-1 space-y-1">
                                    <input value={c.title} onChange={(e) => patchCriterion(i, { title: e.target.value })}
                                           placeholder="Ölçüt (ör. Doğruluk)"
                                           className="w-full text-sm font-black text-slate-800 border-2 border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400" />
                                    <input value={c.description || ''} onChange={(e) => patchCriterion(i, { description: e.target.value })}
                                           placeholder="Kısa açıklama (isteğe bağlı)"
                                           className="w-full text-[11px] text-slate-600 border border-slate-200 rounded-lg px-2 py-1 outline-none" />
                                </div>
                                <button onClick={() => setCriteria(criteria.filter((_, j) => j !== i))} className="p-1 text-slate-300 hover:text-rose-500">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
                                {c.levels.map((level, li) => (
                                    <div key={li} className="rounded-lg bg-slate-50 border border-slate-200 p-1.5 space-y-1">
                                        <div className="flex gap-1">
                                            <input value={level.label}
                                                   onChange={(e) => patchCriterion(i, { levels: c.levels.map((l, k) => (k === li ? { ...l, label: e.target.value } : l)) })}
                                                   className="flex-1 min-w-0 text-[11px] font-bold border border-slate-200 rounded px-1.5 py-0.5 outline-none" />
                                            <input type="number" min={0} max={100} value={level.points}
                                                   onChange={(e) => patchCriterion(i, { levels: c.levels.map((l, k) => (k === li ? { ...l, points: Math.max(0, Math.min(100, Number(e.target.value) || 0)) } : l)) })}
                                                   className="w-12 text-[11px] font-bold border border-slate-200 rounded px-1 py-0.5 outline-none" title="Puan" />
                                        </div>
                                        <input value={level.description || ''}
                                               onChange={(e) => patchCriterion(i, { levels: c.levels.map((l, k) => (k === li ? { ...l, description: e.target.value } : l)) })}
                                               placeholder="Bu seviyede ne görülür?"
                                               className="w-full text-[10px] border border-slate-200 rounded px-1.5 py-0.5 outline-none" />
                                        {c.levels.length > 2 && (
                                            <button onClick={() => patchCriterion(i, { levels: c.levels.filter((_, k) => k !== li) })}
                                                    className="text-[10px] text-slate-400 hover:text-rose-500">seviyeyi sil</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {c.levels.length < 6 && (
                                <button onClick={() => patchCriterion(i, { levels: [...c.levels, { label: 'Yeni seviye', points: (c.levels[c.levels.length - 1]?.points ?? 0) + 1 }] })}
                                        className="text-[10.5px] font-black text-blue-600">+ seviye</button>
                            )}
                        </div>
                    ))}

                    {rubric && criteria.length < 10 && (
                        <button onClick={() => setCriteria([...criteria, {
                            id: newCriterionId(), title: '', levels: [{ label: 'Başlangıç', points: 1 }, { label: 'Yeterli', points: 3 }],
                        }])} className="flex items-center gap-1 text-[11px] font-black text-blue-600">
                            <Plus size={12} /> Ölçüt ekle
                        </button>
                    )}

                    {rubric && (
                        <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                            <input value={saveTitle} onChange={(e) => setSaveTitle(e.target.value)} maxLength={150}
                                   placeholder="Kütüphane adı (ör. Kod projesi anahtarı)"
                                   className="flex-1 text-[11px] border-2 border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-blue-400" />
                            <button onClick={() => void saveToLibrary()} disabled={saving || !saveTitle.trim()}
                                    className="flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg bg-slate-800 text-white disabled:opacity-50">
                                {saving ? <Loader2 size={11} className="animate-spin" /> : <BookmarkPlus size={12} />} Kütüphaneye kaydet
                            </button>
                        </div>
                    )}
                    {notice && <p className="text-[10.5px] font-bold text-slate-500">{notice}</p>}
                </div>
            )}
        </div>
    );
};

export default RubricEditor;
