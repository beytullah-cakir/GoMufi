import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import api from '../api';

/**
 * E-postadaki kurum daveti bağlantısı: /kurum/davet?token=…
 * Öğretmen giriş yapmışsa davet hemen kabul edilir. Yapmamışsa belirteç saklanır;
 * giriş yapınca Paketim sayfası daveti kendiliğinden kabul eder.
 */
export const PENDING_INVITE_KEY = 'gomufi:pending-org-invite';

const OrgInvitePage: React.FC = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const token = params.get('token') || '';
    const [state, setState] = useState<{ kind: 'loading' | 'ok' | 'login' | 'error'; text?: string }>(
        () => token ? { kind: 'loading' } : { kind: 'error', text: 'Davet bağlantısı eksik.' });
    const started = useRef(false);

    useEffect(() => {
        if (started.current || !token) return;
        started.current = true;
        api.post('/org/invites/accept-token', { token })
            .then((r) => setState({ kind: 'ok', text: `${r.data.organization.name} kurumuna katıldın.` }))
            .catch((e) => {
                const status = e?.response?.status;
                if (status === 401 || status === 403) {
                    try { sessionStorage.setItem(PENDING_INVITE_KEY, token); } catch { /* depolama kapalı */ }
                    setState({ kind: 'login' });
                } else {
                    setState({ kind: 'error', text: e?.response?.data?.detail || 'Davet kabul edilemedi.' });
                }
            });
    }, [token]);

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border-2 border-slate-100 shadow-sm p-8 w-full max-w-md text-center space-y-4">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center"><Building2 size={26} /></div>
                <h1 className="text-xl font-black text-slate-800">Kurum daveti</h1>
                {state.kind === 'loading' && <Loader2 className="mx-auto animate-spin text-indigo-500" />}
                {state.kind === 'ok' && (
                    <>
                        <p className="text-sm font-bold text-emerald-700">{state.text}</p>
                        <button onClick={() => navigate('/instructor/plan')} className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm">Paketime git</button>
                    </>
                )}
                {state.kind === 'login' && (
                    <>
                        <p className="text-sm font-bold text-slate-600">Daveti kabul etmek için öğretmen hesabınla giriş yap. Hesabın yoksa daveti aldığın e-postayla öğretmen hesabı aç; giriş yaptıktan sonra davet kendiliğinden kabul edilir.</p>
                        <button onClick={() => navigate('/auth')} className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm">Giriş yap / hesap aç</button>
                    </>
                )}
                {state.kind === 'error' && <p className="text-sm font-bold text-rose-600">{state.text}</p>}
            </div>
        </div>
    );
};

export default OrgInvitePage;
