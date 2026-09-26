import React, { useEffect, useState } from 'react';
import { Building2, Crown, Loader2, Plus, Send, Trash2, X } from 'lucide-react';
import api from '../../api';

/**
 * Kurumlar ve paketler (GoMufi yöneticisi). Ödeme entegrasyonu yok: kurum ve
 * pilot paketleri buradan elle verilir. Veri: backend/routers/admin_ops.py
 */

interface Sub { id: number; owner_type: 'teacher' | 'organization'; owner_id: number; owner_name?: string; plan: string; plan_label: string;
    starts_at: string; ends_at: string | null; pool_credits: number | null; note: string | null; active: boolean }
interface Org { id: number; name: string; kind: string; city: string | null; created_at: string; teachers: number; students: number;
    admins: Array<{ id: number; name: string; email: string }>; subscription: Sub | null; credits_used: number }

const KIND: Record<string, string> = { okul: 'Okul', dershane: 'Dershane', kurs: 'Kurs merkezi' };
const day = (iso: string | null) => iso ? new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleDateString('tr-TR') : 'süresiz';

const AdminOrganizations: React.FC = () => {
    const [orgs, setOrgs] = useState<Org[] | null>(null);
    const [subs, setSubs] = useState<Sub[]>([]);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: '', kind: 'okul', city: '', admin_email: '' });
    const [grant, setGrant] = useState<{ owner_type: 'teacher' | 'organization'; owner_id?: number; owner_name?: string } | null>(null);
    const [grantForm, setGrantForm] = useState({ teacher_email: '', plan: 'pro', months: '3', pool_credits: '', note: '' });
    const [inviteFor, setInviteFor] = useState<Org | null>(null);
    const [inviteEmail, setInviteEmail] = useState('');

    const fail = (e: any, fallback: string) => setNotice({ ok: false, text: e?.response?.data?.detail || fallback });

    // Yenileme sayacı: her işlemden sonra liste yeniden çekilir.
    const [tick, setTick] = useState(0);
    const load = () => setTick((t) => t + 1);
    useEffect(() => {
        Promise.all([api.get('/admin/organizations'), api.get('/admin/subscriptions')])
            .then(([o, s]) => { setOrgs(o.data.organizations); setSubs(s.data.subscriptions); })
            .catch((e) => setNotice({ ok: false, text: e?.response?.data?.detail || 'Yüklenemedi.' }));
    }, [tick]);

    const create = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const r = await api.post('/admin/organizations', { ...form, city: form.city || null, admin_email: form.admin_email || null });
            setNotice({ ok: true, text: `${r.data.name} oluşturuldu${r.data.admin_invited ? `; ${r.data.admin_invited} yönetici olarak davet edildi` : ''}.` });
            setCreating(false);
            setForm({ name: '', kind: 'okul', city: '', admin_email: '' });
            load();
        } catch (err) { fail(err, 'Kurum oluşturulamadı.'); }
    };

    const saveGrant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!grant) return;
        try {
            await api.post('/admin/subscriptions', {
                owner_type: grant.owner_type, owner_id: grant.owner_id,
                teacher_email: grant.owner_type === 'teacher' ? grantForm.teacher_email : undefined,
                plan: grant.owner_type === 'organization' ? 'kurum' : grantForm.plan,
                months: grantForm.months ? Number(grantForm.months) : null,
                pool_credits: grant.owner_type === 'organization' && grantForm.pool_credits ? Number(grantForm.pool_credits) : null,
                note: grantForm.note || null,
            });
            setNotice({ ok: true, text: 'Paket verildi.' });
            setGrant(null);
            load();
        } catch (err) { fail(err, 'Paket verilemedi.'); }
    };

    const endSub = async (s: Sub) => {
        if (!window.confirm(`${s.owner_name || ''} · ${s.plan_label} paketi şimdi sonlandırılsın mı?`)) return;
        try { await api.delete(`/admin/subscriptions/${s.id}`); load(); } catch (e) { fail(e, 'Sonlandırılamadı.'); }
    };

    const removeOrg = async (o: Org) => {
        if (!window.confirm(`${o.name} silinsin mi? Öğretmen hesapları ve kurslar kalır; kurum bağı ve kurum paketi silinir.`)) return;
        try { await api.delete(`/admin/organizations/${o.id}`); load(); } catch (e) { fail(e, 'Silinemedi.'); }
    };

    const sendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteFor) return;
        try {
            await api.post(`/admin/organizations/${inviteFor.id}/invites`, { email: inviteEmail, role: 'admin' });
            setNotice({ ok: true, text: `${inviteEmail} adresine yönetici daveti gönderildi.` });
            setInviteFor(null);
            setInviteEmail('');
        } catch (err) { fail(err, 'Davet gönderilemedi.'); }
    };

    const input = 'w-full px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 font-bold text-sm';

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 font-display">Kurumlar ve Paketler</h1>
                    <p className="text-gray-500 text-sm font-semibold">Kurum aç, ilk yöneticisini davet et, kuruma ya da öğretmene paket ver. Ödeme entegrasyonu yok; pilotlar buradan.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => { setGrant({ owner_type: 'teacher' }); setGrantForm({ teacher_email: '', plan: 'pro', months: '3', pool_credits: '', note: '' }); }}
                            className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-amber-500 text-white font-black text-sm hover:bg-amber-600"><Crown size={16} /> Öğretmene paket</button>
                    <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-sky-500 text-white font-black text-sm hover:bg-sky-600"><Plus size={16} /> Kurum oluştur</button>
                </div>
            </div>

            {notice && (
                <div className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    {notice.text}<button onClick={() => setNotice(null)} aria-label="Kapat"><X size={16} /></button>
                </div>
            )}

            <section className="bg-white rounded-3xl border-2 border-gray-100 overflow-x-auto">
                {!orgs ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-sky-500" /></div>
                    : orgs.length === 0 ? <p className="p-8 text-center text-sm font-bold text-gray-400">Henüz kurum yok.</p> : (
                        <table className="w-full text-left text-sm min-w-[860px]">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                    <th className="px-5 py-3">Kurum</th><th className="px-3 py-3">Yönetici</th><th className="px-3 py-3">Öğretmen</th>
                                    <th className="px-3 py-3">Öğrenci</th><th className="px-3 py-3">Paket</th><th className="px-3 py-3">Kredi (bu ay)</th><th className="px-5 py-3 text-right">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orgs.map((o) => (
                                    <tr key={o.id}>
                                        <td className="px-5 py-3"><p className="font-black text-gray-800 flex items-center gap-1.5"><Building2 size={14} className="text-indigo-500" /> {o.name}</p>
                                            <p className="text-xs font-bold text-gray-400">{KIND[o.kind] || o.kind}{o.city ? ` · ${o.city}` : ''}</p></td>
                                        <td className="px-3 py-3 text-xs font-bold text-gray-600">{o.admins.length ? o.admins.map((a) => a.name || a.email).join(', ') : <span className="text-amber-600">Davet bekliyor</span>}</td>
                                        <td className="px-3 py-3 font-bold text-gray-600">{o.teachers}</td>
                                        <td className="px-3 py-3 font-bold text-gray-600">{o.students}</td>
                                        <td className="px-3 py-3 text-xs font-bold">
                                            {o.subscription ? <span className="text-emerald-700">{o.subscription.plan_label} · {day(o.subscription.ends_at)}</span> : <span className="text-gray-400">Yok</span>}
                                        </td>
                                        <td className="px-3 py-3 font-bold text-gray-600">{o.credits_used}{o.subscription?.pool_credits != null ? ` / ${o.subscription.pool_credits}` : ''}</td>
                                        <td className="px-5 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button onClick={() => { setGrant({ owner_type: 'organization', owner_id: o.id, owner_name: o.name }); setGrantForm({ teacher_email: '', plan: 'kurum', months: '12', pool_credits: '', note: '' }); }}
                                                        className="px-3 py-1.5 rounded-xl text-xs font-black text-amber-700 bg-amber-50 hover:bg-amber-100">Paket ver</button>
                                                <button onClick={() => { setInviteFor(o); setInviteEmail(''); }} title="Yönetici davet et" aria-label={`${o.name} yönetici davet et`}
                                                        className="p-2 rounded-xl text-sky-600 hover:bg-sky-50"><Send size={15} /></button>
                                                <button onClick={() => void removeOrg(o)} title="Kurumu sil" aria-label={`${o.name} sil`} className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"><Trash2 size={15} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
            </section>

            <section className="bg-white rounded-3xl border-2 border-gray-100">
                <h2 className="px-5 pt-4 pb-2 text-sm font-black text-gray-700">Paket geçmişi</h2>
                {subs.length === 0 ? <p className="px-5 pb-5 text-sm font-bold text-gray-400">Henüz paket verilmedi.</p> : (
                    <ul className="divide-y divide-gray-50">
                        {subs.map((s) => (
                            <li key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 text-sm">
                                <span>
                                    <b className="text-gray-800">{s.owner_name || `#${s.owner_id}`}</b>
                                    <span className="text-xs font-bold text-gray-400"> · {s.owner_type === 'organization' ? 'Kurum' : 'Öğretmen'} · {s.plan_label} · {day(s.starts_at)} → {day(s.ends_at)}{s.note ? ` · ${s.note}` : ''}</span>
                                </span>
                                {s.active ? <button onClick={() => void endSub(s)} className="self-start sm:self-auto text-xs font-black text-rose-600 hover:underline">Sonlandır</button>
                                    : <span className="text-xs font-bold text-gray-400">Bitti</span>}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {creating && (
                <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setCreating(false)}>
                    <form onSubmit={(e) => void create(e)} className="bg-white rounded-3xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-black text-gray-800">Kurum oluştur</h2>
                        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Kurum adı" aria-label="Kurum adı" className={input} />
                        <div className="flex gap-2">
                            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} aria-label="Tür" className={input}>
                                <option value="okul">Okul</option><option value="dershane">Dershane</option><option value="kurs">Kurs merkezi</option>
                            </select>
                            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Şehir" aria-label="Şehir" className={input} />
                        </div>
                        <input type="email" value={form.admin_email} onChange={(e) => setForm({ ...form, admin_email: e.target.value })} placeholder="Kurum yöneticisinin e-postası (davet gider)" aria-label="Yönetici e-postası" className={input} />
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setCreating(false)} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Vazgeç</button>
                            <button type="submit" className="px-4 py-2 rounded-xl font-black bg-sky-500 text-white hover:bg-sky-600">Oluştur</button>
                        </div>
                    </form>
                </div>
            )}

            {grant && (
                <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setGrant(null)}>
                    <form onSubmit={(e) => void saveGrant(e)} className="bg-white rounded-3xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-black text-gray-800">{grant.owner_type === 'organization' ? `${grant.owner_name} · Kurum paketi` : 'Öğretmene paket ver'}</h2>
                        {grant.owner_type === 'teacher' && (
                            <input required type="email" value={grantForm.teacher_email} onChange={(e) => setGrantForm({ ...grantForm, teacher_email: e.target.value })}
                                   placeholder="Öğretmenin e-postası" aria-label="Öğretmen e-postası" className={input} />
                        )}
                        <label className="block text-xs font-bold text-gray-500">Süre (ay; boş = süresiz)
                            <input value={grantForm.months} onChange={(e) => setGrantForm({ ...grantForm, months: e.target.value.replace(/\D/g, '') })} className={`${input} mt-1`} />
                        </label>
                        {grant.owner_type === 'organization' && (
                            <label className="block text-xs font-bold text-gray-500">Aylık kredi havuzu (boş = öğretmen başına 5000)
                                <input value={grantForm.pool_credits} onChange={(e) => setGrantForm({ ...grantForm, pool_credits: e.target.value.replace(/\D/g, '') })} className={`${input} mt-1`} />
                            </label>
                        )}
                        <input value={grantForm.note} onChange={(e) => setGrantForm({ ...grantForm, note: e.target.value })} placeholder="Not (ör. Pilot — Ekim 2026)" aria-label="Not" className={input} />
                        <p className="text-xs font-bold text-gray-400">Aynı sahibin etkin paketi varsa yenisiyle değiştirilir.</p>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setGrant(null)} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Vazgeç</button>
                            <button type="submit" className="px-4 py-2 rounded-xl font-black bg-amber-500 text-white hover:bg-amber-600">Paketi ver</button>
                        </div>
                    </form>
                </div>
            )}

            {inviteFor && (
                <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setInviteFor(null)}>
                    <form onSubmit={(e) => void sendInvite(e)} className="bg-white rounded-3xl p-6 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-lg font-black text-gray-800">{inviteFor.name} · yönetici davet et</h2>
                        <input required type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="mudur@okul.k12.tr" aria-label="E-posta" className={input} />
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setInviteFor(null)} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Vazgeç</button>
                            <button type="submit" className="px-4 py-2 rounded-xl font-black bg-sky-500 text-white hover:bg-sky-600">Davet et</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default AdminOrganizations;
