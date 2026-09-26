import React, { useEffect, useState } from 'react';
import { Check, Loader2, Lock, Settings2, Trophy, X } from 'lucide-react';
import api from '../../api';

/**
 * Sınıf ayarları: dersin temposu ve liderlik tablosu.
 *
 *  - Modül temposu: öğretmen her şube için "şu modüle kadar açık" der; öğrenci
 *    o sınırın ötesine geçemez. Sınır yoksa modüller öğrenci bitirdikçe sırayla açılır.
 *  - Liderlik tablosu: öğrenci yalnızca kendi şubesiyle sıralanır; öğretmen kapatabilir.
 */

interface ModuleInfo { id: string; index: number; title: string; lesson_topic?: string | null }
interface Settings {
    leaderboard_enabled: boolean;
    unlocked_until: Record<string, number>;
    classes: Array<{ id: string; name: string }>;
    modules: ModuleInfo[];
}

const ALL = '*';

const ClassroomSettingsModal: React.FC<{ course: { id: number; title: string }; onClose: () => void }> = ({ course, onClose }) => {
    const [settings, setSettings] = useState<Settings | null>(null);
    const [limits, setLimits] = useState<Record<string, number | null>>({});
    const [leaderboard, setLeaderboard] = useState(true);
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get(`/courses/${course.id}/classroom-settings`)
            .then((res) => {
                setSettings(res.data);
                setLeaderboard(res.data.leaderboard_enabled);
                setLimits(res.data.unlocked_until || {});
            })
            .catch((err) => setError(err?.response?.data?.detail || 'Ayarlar yüklenemedi.'));
    }, [course.id]);

    const setLimit = (key: string, value: string) => {
        setSaved(false);
        setLimits((prev) => ({ ...prev, [key]: value === '' ? null : Number(value) }));
    };

    const save = async () => {
        setBusy(true);
        setError(null);
        try {
            const res = await api.put(`/courses/${course.id}/classroom-settings`, {
                leaderboard_enabled: leaderboard,
                unlocked_until: limits,
            });
            setSettings(res.data);
            setLimits(res.data.unlocked_until || {});
            setSaved(true);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Ayarlar kaydedilemedi.');
        } finally {
            setBusy(false);
        }
    };

    const rows = settings ? [{ id: ALL, name: 'Tüm şubeler' }, ...settings.classes] : [];
    const moduleLabel = (m: ModuleInfo) => `${m.index}. ${m.title}`;

    return (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Settings2 className="w-5 h-5 text-indigo-500" /> Sınıf ayarları · {course.title}</h2>
                    <button onClick={onClose} aria-label="Kapat" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </header>

                {!settings ? (
                    <div className="p-10 flex justify-center">
                        {error ? <p className="text-sm font-bold text-rose-600">{error}</p> : <Loader2 className="animate-spin text-indigo-500" />}
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <section className="space-y-3">
                            <h3 className="text-sm font-black text-slate-700 flex items-center gap-2"><Lock size={16} className="text-indigo-500" /> Modül temposu</h3>
                            <p className="text-xs font-bold text-slate-500 leading-relaxed">
                                Öğrenciler modülleri bitirdikçe sıradaki açılır. Sınıfın önüne geçmesini istemiyorsan
                                şube için son açık modülü seç; şubeye özel sınır "Tüm şubeler" ayarını geçersiz kılar.
                            </p>
                            {settings.modules.length === 0 ? (
                                <p className="text-xs font-bold text-slate-400">Bu kursta henüz modül yok.</p>
                            ) : rows.map((row) => (
                                <label key={row.id} className="flex items-center gap-3">
                                    <span className={`w-32 shrink-0 text-sm font-black ${row.id === ALL ? 'text-slate-500' : 'text-slate-700'}`}>{row.name}</span>
                                    <select value={limits[row.id] ?? ''} onChange={(e) => setLimit(row.id, e.target.value)}
                                            aria-label={`${row.name} için açık modül sınırı`}
                                            className="flex-1 min-w-0 p-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold">
                                        <option value="">{row.id === ALL ? 'Sınır yok' : 'Tüm şubeler ayarını kullan'}</option>
                                        {settings.modules.map((m) => <option key={m.id} value={m.index}>Son açık: {moduleLabel(m)}</option>)}
                                    </select>
                                </label>
                            ))}
                        </section>

                        <section className="space-y-2 border-t border-slate-100 pt-5">
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input type="checkbox" checked={leaderboard} onChange={(e) => { setLeaderboard(e.target.checked); setSaved(false); }} className="mt-1 w-4 h-4" />
                                <span>
                                    <span className="text-sm font-black text-slate-700 flex items-center gap-2"><Trophy size={16} className="text-amber-500" /> Liderlik tablosu</span>
                                    <span className="block text-xs font-bold text-slate-500 mt-1">
                                        Öğrenciler yalnızca kendi şubeleriyle XP'ye göre sıralanır; tam soyadları görünmez.
                                        Kapatırsan öğrenciler sıralamayı görmez.
                                    </span>
                                </span>
                            </label>
                        </section>

                        {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                        {saved && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-1.5"><Check size={14} /> Kaydedildi; öğrenciler bir sonraki açılışta görür.</p>}

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

export default ClassroomSettingsModal;
