import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Check, Crown, Loader2, LogOut, Mail, Sparkles, Users, X } from 'lucide-react';
import api from '../../api';
import { PENDING_INVITE_KEY } from '../OrgInvitePage';

/**
 * Paketim: öğretmenin paketi, bu ayki YZ kredisi, öğrenci sınırı, kurumu ve
 * kendisine gelen kurum davetleri. Veri: GET /org/plan, GET /org/me (routers/organizations.py).
 */

interface Plan {
    plan: string; label: string; source: 'free' | 'teacher' | 'organization';
    credits: { total: number; used: number; mine: number; my_cap: number | null; left: number };
    students: { count: number; max: number | null };
    features: { parent_report_email: boolean };
    ends_at: string | null; note: string | null; period_start: string;
    organization: { id: number; name: string; role: string } | null;
    plans: Record<string, { label: string; credits: number; max_students: number | null; parent_report_email: boolean }>;
}
interface Invite { id: number; role: string; role_label: string; organization: { id: number; name: string; kind: string } }
interface MyOrg { organization: { id: number; name: string; kind: string; city: string | null } | null; role: string | null; invites: Invite[] }

const Bar: React.FC<{ value: number; max: number; tone: string }> = ({ value, max, tone }) => (
    <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, max ? (value / max) * 100 : 0)}%` }} />
    </div>
);

const InstructorPlan: React.FC<{ onOrgChange?: () => void }> = ({ onOrgChange }) => {
    const [plan, setPlan] = useState<Plan | null>(null);
    const [org, setOrg] = useState<MyOrg | null>(null);
    const [busy, setBusy] = useState<number | 'leave' | null>(null);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const orgChanged = useRef(onOrgChange);
    useEffect(() => { orgChanged.current = onOrgChange; }, [onOrgChange]);

    const load = useCallback(async () => {
        // Giriş yapmadan açılan davet bağlantısı: girişten sonra burada kabul edilir.
        let pending: string | null = null;
        try { pending = sessionStorage.getItem(PENDING_INVITE_KEY); sessionStorage.removeItem(PENDING_INVITE_KEY); } catch { /* depolama kapalı */ }
        if (pending) {
            try {
                const r = await api.post('/org/invites/accept-token', { token: pending });
                setMessage({ ok: true, text: `${r.data.organization.name} kurumuna katıldın.` });
                orgChanged.current?.();
            } catch (e: any) {
                setMessage({ ok: false, text: e?.response?.data?.detail || 'Davet kabul edilemedi.' });
            }
        }
        const [p, o] = await Promise.all([api.get('/org/plan'), api.get('/org/me')]);
        setPlan(p.data);
        setOrg(o.data);
    }, []);

    useEffect(() => { load().catch(() => setMessage({ ok: false, text: 'Paket bilgisi yüklenemedi.' })); }, [load]);

    const accept = async (invite: Invite) => {
        setBusy(invite.id);
        try {
            await api.post(`/org/invites/${invite.id}/accept`);
            setMessage({ ok: true, text: `${invite.organization.name} kurumuna katıldın.` });
            await load();
            orgChanged.current?.();
        } catch (e: any) {
            setMessage({ ok: false, text: e?.response?.data?.detail || 'Davet kabul edilemedi.' });
        } finally {
            setBusy(null);
        }
    };

    const leave = async () => {
        if (!org?.organization || !window.confirm(`${org.organization.name} kurumundan ayrılmak istiyor musun? Kursların sende kalır.`)) return;
        setBusy('leave');
        try {
            await api.post('/org/leave');
            setMessage({ ok: true, text: 'Kurumdan ayrıldın. Kursların sende kaldı.' });
            await load();
            orgChanged.current?.();
        } catch (e: any) {
            setMessage({ ok: false, text: e?.response?.data?.detail || 'Ayrılınamadı.' });
        } finally {
            setBusy(null);
        }
    };

    if (!plan || !org) {
        return <div className="p-10 flex justify-center">{message ? <p className="text-sm font-bold text-rose-600">{message.text}</p> : <Loader2 className="animate-spin text-sky-500" />}</div>;
    }

    const c = plan.credits;
    const usedPct = c.total ? c.used / c.total : 0;
    const renew = new Date(plan.period_start);
    renew.setMonth(renew.getMonth() + 1);

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-6">
            <div>
                <h1 className="text-3xl font-black text-slate-800 font-display">Paketim</h1>
                <p className="text-slate-500 text-sm font-semibold">YZ kredin, öğrenci sınırın ve kurumun.</p>
            </div>

            {message && (
                <div className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    {message.text}<button onClick={() => setMessage(null)} aria-label="Kapat"><X size={16} /></button>
                </div>
            )}

            {org.invites.map((inv) => (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-5">
                    <p className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                        <Mail size={18} className="shrink-0" />
                        <span><b>{inv.organization.name}</b> ({inv.organization.kind}) seni {inv.role_label.toLowerCase()} olarak davet etti.</span>
                    </p>
                    <button onClick={() => void accept(inv)} disabled={busy !== null}
                            className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 disabled:opacity-50">
                        {busy === inv.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Kabul et
                    </button>
                </div>
            ))}

            <section className="bg-white rounded-3xl border-2 border-slate-100 p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${plan.plan === 'free' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-500'}`}>
                            {plan.source === 'organization' ? <Building2 size={22} /> : plan.plan === 'free' ? <Sparkles size={22} /> : <Crown size={22} />}
                        </div>
                        <div>
                            <p className="text-xl font-black text-slate-800">{plan.label}</p>
                            <p className="text-xs font-bold text-slate-400">
                                {plan.source === 'organization' ? `${plan.organization?.name} kurum paketi` : plan.source === 'teacher' ? 'Kişisel paket' : 'Ücretsiz sürüm'}
                                {plan.ends_at && ` · ${new Date(plan.ends_at + 'Z').toLocaleDateString('tr-TR')} tarihine kadar`}
                                {plan.note && ` · ${plan.note}`}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm font-bold">
                        <span className="text-slate-700">YZ kredisi · bu ay {plan.source === 'organization' && '(kurum havuzu)'}</span>
                        <span className="text-slate-500"><b className="text-slate-800">{c.used}</b> / {c.total} kullanıldı</span>
                    </div>
                    <Bar value={c.used} max={c.total} tone={usedPct >= 0.9 ? 'bg-rose-500' : usedPct >= 0.7 ? 'bg-amber-400' : 'bg-emerald-500'} />
                    <p className="text-xs font-bold text-slate-400">
                        Kalan {c.left} kredi · {renew.toLocaleDateString('tr-TR')} tarihinde yenilenir.
                        {plan.source === 'organization' && ` Senin bu ayki kullanımın: ${c.mine} kredi${c.my_cap != null ? ` (kurumun sana ayırdığı sınır ${c.my_cap})` : ''}.`}
                    </p>
                    <p className="text-[11px] font-bold text-slate-400">
                        YZ ile ders ve kurs üretimi krediden düşer. Öğrencilerin YZ koçu ve görev değerlendirmesi de sayılır ama kredi bitse bile öğrencilerin için hiçbir zaman durmaz.
                    </p>
                </div>

                <div className="space-y-2">
                    <div className="flex items-baseline justify-between text-sm font-bold">
                        <span className="text-slate-700 flex items-center gap-1.5"><Users size={15} /> Öğrenci</span>
                        <span className="text-slate-500"><b className="text-slate-800">{plan.students.count}</b>{plan.students.max != null ? ` / ${plan.students.max}` : ' · sınırsız'}</span>
                    </div>
                    {plan.students.max != null && <Bar value={plan.students.count} max={plan.students.max} tone="bg-sky-500" />}
                </div>
            </section>

            <section className="bg-white rounded-3xl border-2 border-slate-100 p-6">
                <h2 className="text-sm font-black text-slate-700 mb-4">Paketler</h2>
                <div className="grid sm:grid-cols-3 gap-3">
                    {Object.entries(plan.plans).map(([key, p]) => (
                        <div key={key} className={`rounded-2xl border-2 p-4 space-y-2 ${key === plan.plan ? 'border-sky-400 bg-sky-50/50' : 'border-slate-100'}`}>
                            <p className="font-black text-slate-800">{p.label} {key === plan.plan && <span className="text-[10px] text-sky-600 ml-1">MEVCUT</span>}</p>
                            <ul className="text-xs font-bold text-slate-500 space-y-1">
                                <li>{key === 'kurum' ? `Öğretmen başına ${p.credits} kredi (ortak havuz)` : `Ayda ${p.credits} YZ kredisi`}</li>
                                <li>{p.max_students == null ? 'Sınırsız öğrenci' : `${p.max_students} öğrenciye kadar`}</li>
                                <li>{p.parent_report_email ? 'Veli raporu e-postayla da gider' : 'Veli raporu veli uygulamasına gider'}</li>
                                {key === 'kurum' && <li>Kurum yöneticisi paneli</li>}
                            </ul>
                        </div>
                    ))}
                </div>
                <p className="text-xs font-bold text-slate-400 mt-4">
                    Pro ya da kurum paketi için <a href="mailto:destek@gomufi.com" className="text-sky-600 underline">destek@gomufi.com</a> adresine yaz; okulun için pilot paket açabiliriz.
                </p>
            </section>

            {org.organization && (
                <section className="bg-white rounded-3xl border-2 border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <p className="text-sm font-black text-slate-800 flex items-center gap-2"><Building2 size={16} className="text-indigo-500" /> {org.organization.name}</p>
                        <p className="text-xs font-bold text-slate-400">{org.organization.kind}{org.organization.city ? ` · ${org.organization.city}` : ''} · {org.role === 'admin' ? 'Kurum yöneticisi' : 'Öğretmen'}</p>
                    </div>
                    <button onClick={() => void leave()} disabled={busy !== null}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-black text-rose-600 bg-rose-50 hover:bg-rose-100 disabled:opacity-50">
                        {busy === 'leave' ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />} Kurumdan ayrıl
                    </button>
                </section>
            )}
        </div>
    );
};

export default InstructorPlan;
