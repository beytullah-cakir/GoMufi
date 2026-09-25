import React, { useState } from 'react';
import { Check, Loader2, Video, X } from 'lucide-react';
import api from '../../api';

/**
 * Canlı dersin görüşme linki: öğretmen dersi Zoom, Meet ya da okulun
 * sistemiyle kendisi açar ve linkini buraya yapıştırır. Ders başladığında
 * "Derse katıl" diyen öğrenci bu linke yönlenir. Ders sınıfta işleniyorsa
 * link boş bırakılır.
 */
const MeetingLinkModal: React.FC<{
    course: { id: number; title: string; meeting_url?: string | null };
    onClose: () => void;
    onSaved: (url: string | null) => void;
}> = ({ course, onClose, onSaved }) => {
    const [url, setUrl] = useState(course.meeting_url || '');
    const [savedUrl, setSavedUrl] = useState(course.meeting_url || '');
    const [busy, setBusy] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const save = async (value: string) => {
        setBusy(true);
        setError(null);
        setSaved(false);
        try {
            const res = await api.put(`/courses/${course.id}/meeting-link`, { url: value.trim() || null });
            setUrl(res.data.url || '');
            setSavedUrl(res.data.url || '');
            setSaved(true);
            onSaved(res.data.url || null);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Link kaydedilemedi.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Video className="w-5 h-5 text-sky-500" /> Görüşme linki · {course.title}</h2>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                </header>
                <form className="p-6 space-y-4" onSubmit={(e) => { e.preventDefault(); void save(url); }}>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest" htmlFor="meeting-url">Zoom, Meet ya da okulun görüşme linki</label>
                    <input id="meeting-url" value={url} onChange={(e) => { setUrl(e.target.value); setSaved(false); }} maxLength={500}
                           placeholder="https://zoom.us/j/..." inputMode="url" autoComplete="off"
                           className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-sky-400" />
                    <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                        Dersi başlattığında bu link senin için açılır; "Derse katıl" diyen öğrenciler de buraya yönlenir.
                        Ders sınıfta işleniyorsa boş bırak.
                    </p>

                    {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                    {saved && <p className="text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2 flex items-center gap-1.5"><Check size={14} /> {url ? 'Link kaydedildi.' : 'Link kaldırıldı.'}</p>}

                    <div className="flex gap-2">
                        {savedUrl && (
                            <button type="button" onClick={() => void save('')} disabled={busy}
                                    className="px-4 py-3 rounded-xl font-black text-sm text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-50">
                                Linki kaldır
                            </button>
                        )}
                        <button type="submit" disabled={busy}
                                className="flex-1 py-3 rounded-xl font-black text-sm bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                            Kaydet
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MeetingLinkModal;
