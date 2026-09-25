import React, { useEffect, useState } from 'react';
import { ArrowLeft, Check, KeyRound, Loader2, Mail } from 'lucide-react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';

/**
 * Şifremi unuttum.
 *
 *  /forgot-password           e-posta adresi → sıfırlama linki gönderilir
 *  /reset-password?token=...  e-postadaki link → yeni şifre
 *
 * Öğrenci ve öğretmen hesapları içindir; veliler Google ile giriş yapıyor.
 */
const MIN_LENGTH = 8;

const Shell: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 w-full max-w-md p-8 relative">
                <button onClick={() => navigate('/auth')} title="Girişe dön"
                        className="absolute top-5 left-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center mb-6 pt-2">
                    <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto mb-3">{icon}</div>
                    <h1 className="text-2xl font-black text-slate-800">{title}</h1>
                </div>
                {children}
            </div>
        </div>
    );
};

const inputClass = 'w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 font-bold outline-none focus:bg-white focus:ring-4 focus:ring-sky-100';
const buttonClass = 'w-full py-4 rounded-2xl font-black text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-60 flex items-center justify-center gap-2';

export const ForgotPasswordPage: React.FC = () => {
    const location = useLocation();
    const [email, setEmail] = useState<string>((location.state as any)?.email || '');
    const [busy, setBusy] = useState(false);
    const [sent, setSent] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
            const res = await api.post('/auth/forgot-password', { email: email.trim() });
            setSent(res.data.message);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'İstek gönderilemedi. Biraz sonra tekrar dene.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Shell title="Şifremi unuttum" icon={<Mail size={26} />}>
            {sent ? (
                <p className="text-sm font-bold text-emerald-700 bg-emerald-50 rounded-2xl px-4 py-3 flex gap-2"><Check size={18} className="shrink-0" /> {sent}</p>
            ) : (
                <form onSubmit={submit} className="space-y-4">
                    <p className="text-sm font-bold text-slate-500 text-center">
                        Hesabının e-posta adresini yaz; şifreni sıfırlaman için bir link gönderelim.
                    </p>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                           placeholder="E-Posta" autoComplete="username" className={inputClass} />
                    {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                    <button type="submit" disabled={busy} className={buttonClass}>
                        {busy ? <Loader2 size={18} className="animate-spin" /> : <Mail size={18} />} Link gönder
                    </button>
                </form>
            )}
        </Shell>
    );
};

export const ResetPasswordPage: React.FC = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token') || '';
    const [valid, setValid] = useState<boolean | null>(null);
    const [password, setPassword] = useState('');
    const [repeat, setRepeat] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setValid(false);
            return;
        }
        api.get('/auth/reset-password/check', { params: { token } })
            .then((res) => setValid(Boolean(res.data.valid)))
            .catch(() => setValid(false));
    }, [token]);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < MIN_LENGTH) {
            setError(`Şifre en az ${MIN_LENGTH} karakter olmalı.`);
            return;
        }
        if (password !== repeat) {
            setError('Şifreler aynı değil.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const res = await api.post('/auth/reset-password', { token, password });
            setDone(res.data.role);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Şifre değiştirilemedi.');
        } finally {
            setBusy(false);
        }
    };

    if (valid === null) {
        return <Shell title="Yeni şifre" icon={<KeyRound size={26} />}><Loader2 className="animate-spin mx-auto text-sky-500" /></Shell>;
    }
    if (done) {
        return (
            <Shell title="Şifren değişti" icon={<Check size={26} />}>
                <p className="text-sm font-bold text-slate-500 text-center mb-5">Yeni şifrenle giriş yapabilirsin.</p>
                <button onClick={() => navigate('/auth', { state: { role: done } })} className={buttonClass}>Giriş yap</button>
            </Shell>
        );
    }
    if (!valid) {
        return (
            <Shell title="Link geçersiz" icon={<KeyRound size={26} />}>
                <p className="text-sm font-bold text-slate-500 text-center mb-5">
                    Bu linkin süresi dolmuş ya da daha önce kullanılmış. Linkler 1 saat geçerlidir.
                </p>
                <button onClick={() => navigate('/forgot-password')} className={buttonClass}>Yeni link iste</button>
            </Shell>
        );
    }
    return (
        <Shell title="Yeni şifre" icon={<KeyRound size={26} />}>
            <form onSubmit={submit} className="space-y-4">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                       placeholder={`Yeni şifre (en az ${MIN_LENGTH} karakter)`} autoComplete="new-password" className={inputClass} />
                <input type="password" required value={repeat} onChange={(e) => setRepeat(e.target.value)}
                       placeholder="Yeni şifre (tekrar)" autoComplete="new-password" className={inputClass} />
                {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                <button type="submit" disabled={busy} className={buttonClass}>
                    {busy ? <Loader2 size={18} className="animate-spin" /> : <KeyRound size={18} />} Şifreyi kaydet
                </button>
            </form>
        </Shell>
    );
};
