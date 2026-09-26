import React, { useState } from 'react';
import { Download, Loader2, ShieldCheck, Trash2, X } from 'lucide-react';
import api from '../../api';

/**
 * KVKK hakları: kişisel verilerimi indir, hesabımı sil (backend: routers/account.py).
 * Öğrenci, öğretmen ve veli profil sayfalarında aynı bileşen.
 */

interface Summary { needs_password: boolean; confirm_text: string; courses: Array<{ id: number; title: string }> }

const AccountPrivacyCard: React.FC = () => {
    const [downloading, setDownloading] = useState(false);
    const [summary, setSummary] = useState<Summary | null>(null);
    const [confirm, setConfirm] = useState('');
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const download = async () => {
        setDownloading(true);
        setError(null);
        try {
            const res = await api.get('/account/export', { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gomufi-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            setError('Veriler indirilemedi, tekrar dene.');
        } finally {
            setDownloading(false);
        }
    };

    const openDelete = async () => {
        setError(null);
        try {
            setSummary((await api.get('/account/summary')).data);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Hesap bilgisi alınamadı.');
        }
    };

    const remove = async () => {
        if (!summary) return;
        setBusy(true);
        setError(null);
        try {
            await api.post('/account/delete', { confirm, password: password || null });
            localStorage.clear();
            window.location.href = '/';
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Hesap silinemedi.');
            setBusy(false);
        }
    };

    return (
        <section className="bg-white rounded-3xl border-2 border-slate-100 p-6 space-y-3">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2"><ShieldCheck size={18} className="text-emerald-500" /> Gizlilik ve verilerim</h3>
            <p className="text-xs font-bold text-slate-500 leading-relaxed">
                KVKK kapsamında GoMufi'de hakkında tutulan tüm verileri indirebilir ya da hesabını ve verilerini kalıcı olarak silebilirsin.
            </p>
            <div className="flex flex-wrap gap-2">
                <button onClick={() => void download()} disabled={downloading}
                        className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                    {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} Verilerimi indir
                </button>
                <button onClick={() => void openDelete()}
                        className="flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100">
                    <Trash2 size={14} /> Hesabımı sil
                </button>
            </div>
            {error && !summary && <p className="text-xs font-bold text-rose-600">{error}</p>}

            {summary && (
                <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSummary(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="delete-title">
                        <div className="flex items-center justify-between">
                            <h2 id="delete-title" className="text-lg font-black text-rose-700">Hesabını kalıcı olarak sil</h2>
                            <button onClick={() => setSummary(null)} aria-label="Kapat" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500"><X size={18} /></button>
                        </div>
                        <p className="text-sm font-bold text-slate-600 leading-relaxed">
                            Hesabın, ilerlemen, mesajların ve yüklediğin dosyalar silinir. <b>Bu işlem geri alınamaz.</b> Önce verilerini indirmek isteyebilirsin.
                        </p>
                        {summary.courses.length > 0 && (
                            <div className="text-xs font-bold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
                                Sana ait {summary.courses.length} kurs da tüm içeriği ve öğrenci kayıtlarıyla silinecek:
                                <span className="block mt-1 text-rose-600">{summary.courses.map((c) => c.title).join(', ')}</span>
                            </div>
                        )}
                        {summary.needs_password && (
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Parolan" autoComplete="current-password"
                                   aria-label="Parola" className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:border-rose-300" />
                        )}
                        <label className="block text-xs font-bold text-slate-500">
                            Onaylamak için <b className="text-slate-700">{summary.confirm_text}</b> yaz
                            <input value={confirm} onChange={(e) => setConfirm(e.target.value)}
                                   className="mt-1 w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold focus:outline-none focus:border-rose-300" />
                        </label>
                        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
                        <button onClick={() => void remove()} disabled={busy || !confirm.trim() || (summary.needs_password && !password)}
                                className="w-full py-3 rounded-xl font-black text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-2">
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Hesabımı kalıcı olarak sil
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
};

export default AccountPrivacyCard;
