import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Building2, Loader2, Mail, Send, Sparkles, Trash2, UserMinus, Users, X } from 'lucide-react';
import api from '../../api';

/**
 * Kurumum — kurum yöneticisi (müdür, BT koordinatörü) sayfası.
 *
 *  Genel Bakış  öğretmenler, kredi havuzu, öğretmen başına kullanım ve sınır
 *  Sınıflar     kurs/şube özeti: etkinlik, zorlanan öğrenci sayısı, sık yanılgılar
 *               (öğrenci adı yok — ayrıntı öğretmenin Öğrenme Analizi sayfasında)
 *  Davetler     öğretmen davet et, bekleyen davetler
 * Veri: backend/routers/organizations.py
 */

interface Teacher {
    teacher_id: number; name: string; email: string; role: 'admin' | 'teacher'; role_label: string;
    courses: number; students: number; active_students_7d: number; last_student_activity: string | null;
    credits_used: number; ai_cap_credits: number | null;
}
interface Overview {
    organization: { id: number; name: string; kind: string; city: string | null };
    plan: { label: string; credits: { total: number; used: number; left: number }; ends_at: string | null; note: string | null } | null;
    totals: { teachers: number; courses: number; students: number; active_students_7d: number; pending_invites: number };
    teachers: Teacher[];
}
interface CourseRow {
    course_id: number; title: string; teacher: string; classes: Array<{ name: string; students: number }>;
    students: number; active_students_7d: number; active_rate: number | null; modules_completed_30d: number;
    struggling_students: number; top_misconceptions: Array<{ label: string; students: number }>;
}
interface InviteRow { id: number; email: string; role_label: string; expires_at: string; expired: boolean }

type Tab = 'overview' | 'classes' | 'invites';
const when = (iso: string | null) => iso ? new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleDateString('tr-TR') : '—';

const Stat: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({ label, value, hint }) => (
    <div className="bg-white rounded-3xl border-2 border-slate-100 p-5">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{label}</p>
        <p className="text-2xl font-black text-slate-800">{value}</p>
        {hint && <p className="text-xs font-bold text-slate-400">{hint}</p>}
    </div>
);

const InstructorOrganization: React.FC = () => {
    const [tab, setTab] = useState<Tab>('overview');
    const [data, setData] = useState<Overview | null>(null);
    const [courses, setCourses] = useState<CourseRow[] | null>(null);
    const [invites, setInvites] = useState<InviteRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
    const [capEdit, setCapEdit] = useState<{ id: number; value: string } | null>(null);
    const [removing, setRemoving] = useState<Teacher | null>(null);
    const [copyTo, setCopyTo] = useState<string>('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'teacher' | 'admin'>('teacher');
    const [busy, setBusy] = useState(false);

    const fail = (e: any, fallback: string) => setNotice({ ok: false, text: e?.response?.data?.detail || fallback });

    const loadOverview = useCallback(() => {
        api.get('/org/overview').then((r) => setData(r.data)).catch((e) => setError(e?.response?.data?.detail || 'Kurum bilgisi yüklenemedi.'));
    }, []);
    useEffect(loadOverview, [loadOverview]);
    useEffect(() => {
        if (tab === 'classes' && !courses) api.get('/org/classes').then((r) => setCourses(r.data.courses)).catch((e) => fail(e, 'Sınıflar yüklenemedi.'));
        if (tab === 'invites' && !invites) api.get('/org/invites').then((r) => setInvites(r.data.invites)).catch((e) => fail(e, 'Davetler yüklenemedi.'));
    }, [tab, courses, invites]);

    const saveCap = async () => {
        if (!capEdit) return;
        const value = capEdit.value.trim();
        try {
            await api.put(`/org/members/${capEdit.id}`, value === '' ? { clear_cap: true } : { ai_cap_credits: Number(value) });
            setCapEdit(null);
            loadOverview();
        } catch (e) { fail(e, 'Sınır kaydedilemedi.'); }
    };

    const setRole = async (t: Teacher, role: 'admin' | 'teacher') => {
        try {
            await api.put(`/org/members/${t.teacher_id}`, { role });
            loadOverview();
        } catch (e) { fail(e, 'Rol değiştirilemedi.'); }
    };

    const remove = async () => {
        if (!removing) return;
        setBusy(true);
        try {
            const r = await api.delete(`/org/members/${removing.teacher_id}`, { params: copyTo ? { copy_to: Number(copyTo) } : {} });
            setNotice({ ok: true, text: `${removing.name} kurumdan çıkarıldı.${r.data.courses_copied ? ` ${r.data.courses_copied} kursunun kopyası kurumda kaldı.` : ''}` });
            setRemoving(null);
            setCopyTo('');
            setCourses(null);
            loadOverview();
        } catch (e) { fail(e, 'Çıkarılamadı.'); } finally { setBusy(false); }
    };

    const sendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteEmail.trim()) return;
        setBusy(true);
        try {
            const r = await api.post('/org/invites', { email: inviteEmail.trim(), role: inviteRole });
            setNotice({ ok: true, text: r.data.email_sent ? `${inviteEmail} adresine davet gönderildi.` : `Davet oluşturuldu; e-posta sağlayıcısı kapalı olduğu için e-posta gitmedi. Öğretmen giriş yapınca Paketim sayfasında daveti görür.` });
            setInviteEmail('');
            setInvites(null);
            loadOverview();
        } catch (err) { fail(err, 'Davet gönderilemedi.'); } finally { setBusy(false); }
    };

    const cancelInvite = async (id: number) => {
        try {
            await api.delete(`/org/invites/${id}`);
            setInvites((prev) => prev?.filter((i) => i.id !== id) ?? null);
        } catch (e) { fail(e, 'Davet iptal edilemedi.'); }
    };

    if (error) return <p className="p-8 text-sm font-bold text-rose-600">{error}</p>;
    if (!data) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-sky-500" /></div>;

    const c = data.plan?.credits;
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 font-display flex items-center gap-2"><Building2 className="text-indigo-500" /> {data.organization.name}</h1>
                    <p className="text-slate-500 text-sm font-semibold">{data.organization.kind}{data.organization.city ? ` · ${data.organization.city}` : ''} · Kurum yönetimi</p>
                </div>
                <div className="flex gap-1.5 bg-white border-2 border-slate-100 rounded-2xl p-1.5 w-fit">
                    {([['overview', 'Genel Bakış', Users], ['classes', 'Sınıflar', BookOpen], ['invites', 'Davetler', Mail]] as const).map(([id, label, Icon]) => (
                        <button key={id} onClick={() => setTab(id)}
                                className={`flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl ${tab === id ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                            <Icon size={14} /> {label}
                        </button>
                    ))}
                </div>
            </div>

            {notice && (
                <div className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    {notice.text}<button onClick={() => setNotice(null)} aria-label="Kapat"><X size={16} /></button>
                </div>
            )}

            {tab === 'overview' && (
                <>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <Stat label="Öğretmen" value={data.totals.teachers} hint={data.totals.pending_invites ? `${data.totals.pending_invites} bekleyen davet` : undefined} />
                        <Stat label="Kurs" value={data.totals.courses} />
                        <Stat label="Öğrenci" value={data.totals.students} />
                        <Stat label="Aktif öğrenci (7 gün)" value={data.totals.active_students_7d}
                              hint={data.totals.students ? `%${Math.round((data.totals.active_students_7d / data.totals.students) * 100)}` : undefined} />
                        <Stat label="YZ kredisi (bu ay)" value={c ? `${c.used} / ${c.total}` : '—'}
                              hint={data.plan ? `${data.plan.label}${data.plan.ends_at ? ` · ${when(data.plan.ends_at)} bitiş` : ''}` : 'Kurum paketi yok — öğretmenler kendi paketlerini kullanıyor'} />
                    </div>

                    <section className="bg-white rounded-3xl border-2 border-slate-100 overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[820px]">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                    <th className="px-5 py-3">Öğretmen</th><th className="px-3 py-3">Rol</th><th className="px-3 py-3">Kurs</th>
                                    <th className="px-3 py-3">Öğrenci</th><th className="px-3 py-3">Aktif (7 gün)</th><th className="px-3 py-3">Son etkinlik</th>
                                    <th className="px-3 py-3">YZ kredisi</th><th className="px-5 py-3 text-right">İşlem</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {data.teachers.map((t) => (
                                    <tr key={t.teacher_id}>
                                        <td className="px-5 py-3"><p className="font-black text-slate-800">{t.name}</p><p className="text-xs font-bold text-slate-400">{t.email}</p></td>
                                        <td className="px-3 py-3">
                                            <select value={t.role} onChange={(e) => void setRole(t, e.target.value as 'admin' | 'teacher')} aria-label={`${t.name} rolü`}
                                                    className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                                                <option value="teacher">Öğretmen</option><option value="admin">Yönetici</option>
                                            </select>
                                        </td>
                                        <td className="px-3 py-3 font-bold text-slate-600">{t.courses}</td>
                                        <td className="px-3 py-3 font-bold text-slate-600">{t.students}</td>
                                        <td className="px-3 py-3 font-bold text-slate-600">{t.active_students_7d}</td>
                                        <td className="px-3 py-3 font-bold text-slate-500">{when(t.last_student_activity)}</td>
                                        <td className="px-3 py-3">
                                            {capEdit?.id === t.teacher_id ? (
                                                <span className="flex items-center gap-1">
                                                    <input value={capEdit.value} onChange={(e) => setCapEdit({ id: t.teacher_id, value: e.target.value.replace(/\D/g, '') })}
                                                           placeholder="sınırsız" aria-label="Aylık kredi sınırı" className="w-20 text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1" />
                                                    <button onClick={() => void saveCap()} className="text-xs font-black text-indigo-600">Kaydet</button>
                                                </span>
                                            ) : (
                                                <button onClick={() => setCapEdit({ id: t.teacher_id, value: t.ai_cap_credits?.toString() ?? '' })} title="Aylık üst sınır koy"
                                                        className="text-xs font-bold text-slate-600 hover:text-indigo-600">
                                                    {t.credits_used}{t.ai_cap_credits != null ? ` / ${t.ai_cap_credits}` : ''} <span className="text-slate-300">✎</span>
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-5 py-3 text-right">
                                            <button onClick={() => { setRemoving(t); setCopyTo(''); }} title="Kurumdan çıkar" aria-label={`${t.name} kurumdan çıkar`}
                                                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"><UserMinus size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                    <p className="text-xs font-bold text-slate-400">
                        Öğrencilerin YZ kullanımı (koç, görev değerlendirme) öğretmenin kredisine sayılır ama kredi bitse de öğrenciler için durmaz; kredi bitince yalnızca öğretmenin YZ ile içerik üretimi durur.
                    </p>
                </>
            )}

            {tab === 'classes' && (
                !courses ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-sky-500" /></div> : (
                    <section className="bg-white rounded-3xl border-2 border-slate-100 overflow-x-auto">
                        {courses.length === 0 ? <p className="p-8 text-center text-sm font-bold text-slate-400">Kurumun öğretmenlerinin henüz kursu yok.</p> : (
                            <table className="w-full text-left text-sm min-w-[860px]">
                                <thead>
                                    <tr className="text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                                        <th className="px-5 py-3">Kurs</th><th className="px-3 py-3">Şubeler</th><th className="px-3 py-3">Öğrenci</th>
                                        <th className="px-3 py-3">Aktif (7 gün)</th><th className="px-3 py-3">Modül (30 gün)</th><th className="px-3 py-3">Zorlanan</th>
                                        <th className="px-5 py-3">Sık yanılgılar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {courses.map((c) => (
                                        <tr key={c.course_id} className="align-top">
                                            <td className="px-5 py-3"><p className="font-black text-slate-800">{c.title}</p><p className="text-xs font-bold text-slate-400">{c.teacher}</p></td>
                                            <td className="px-3 py-3 text-xs font-bold text-slate-600">{c.classes.map((cl) => `${cl.name} (${cl.students})`).join(', ') || '—'}</td>
                                            <td className="px-3 py-3 font-bold text-slate-600">{c.students}</td>
                                            <td className="px-3 py-3 font-bold">
                                                <span className={c.active_rate == null ? 'text-slate-400' : c.active_rate >= 0.6 ? 'text-emerald-600' : c.active_rate >= 0.3 ? 'text-amber-600' : 'text-rose-600'}>
                                                    {c.active_students_7d}{c.active_rate != null && ` · %${Math.round(c.active_rate * 100)}`}
                                                </span>
                                            </td>
                                            <td className="px-3 py-3 font-bold text-slate-600">{c.modules_completed_30d}</td>
                                            <td className="px-3 py-3 font-bold text-rose-600">{c.struggling_students || '—'}</td>
                                            <td className="px-5 py-3 text-xs font-bold text-slate-600 space-y-0.5">
                                                {c.top_misconceptions.length === 0 ? <span className="text-slate-300">—</span>
                                                    : c.top_misconceptions.map((m) => <p key={m.label}>{m.label} <span className="text-slate-400">· {m.students} öğrenci</span></p>)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                        <p className="px-5 py-3 text-[11px] font-bold text-slate-400 border-t border-slate-50">
                            Öğrenci adları bu sayfada gösterilmez; öğrenci ayrıntısını kursun öğretmeni kendi Öğrenme Analizi sayfasında görür.
                        </p>
                    </section>
                )
            )}

            {tab === 'invites' && (
                <div className="space-y-4">
                    <form onSubmit={(e) => void sendInvite(e)} className="bg-white rounded-3xl border-2 border-slate-100 p-5 flex flex-col md:flex-row gap-3">
                        <input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="ogretmen@okul.k12.tr" aria-label="Davet edilecek e-posta"
                               className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm" required />
                        <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'teacher' | 'admin')} aria-label="Rol"
                                className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 font-bold text-sm">
                            <option value="teacher">Öğretmen</option><option value="admin">Kurum yöneticisi</option>
                        </select>
                        <button type="submit" disabled={busy} className="flex items-center justify-center gap-1.5 px-5 py-3 rounded-2xl bg-indigo-600 text-white font-black text-sm hover:bg-indigo-700 disabled:opacity-50">
                            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Davet et
                        </button>
                    </form>
                    <section className="bg-white rounded-3xl border-2 border-slate-100">
                        {!invites ? <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-sky-500" /></div>
                            : invites.length === 0 ? <p className="p-8 text-center text-sm font-bold text-slate-400">Bekleyen davet yok.</p> : (
                                <ul className="divide-y divide-slate-50">
                                    {invites.map((i) => (
                                        <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                                            <span><b className="text-slate-800">{i.email}</b> <span className="text-xs font-bold text-slate-400">· {i.role_label} · {i.expired ? 'süresi doldu' : `${when(i.expires_at)} tarihine kadar geçerli`}</span></span>
                                            <button onClick={() => void cancelInvite(i.id)} aria-label={`${i.email} davetini iptal et`} className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50"><Trash2 size={16} /></button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                    </section>
                    <p className="text-xs font-bold text-slate-400 flex items-start gap-1.5"><Sparkles size={14} className="shrink-0 mt-0.5" />
                        Öğretmen daveti e-postadaki bağlantıyla ya da aynı e-postayla giriş yapıp Paketim sayfasından kabul eder. Hesabı yoksa aynı e-postayla öğretmen hesabı açması yeterli.
                    </p>
                </div>
            )}

            {removing && (
                <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setRemoving(null)}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <h2 className="text-lg font-black text-slate-800">{removing.name} kurumdan çıkarılsın mı?</h2>
                        <p className="text-sm font-bold text-slate-500">Öğretmenin hesabı ve kursları kendisinde kalır; kurum paketinden yararlanması sona erer.</p>
                        {removing.courses > 0 && (
                            <label className="block text-sm font-bold text-slate-600">
                                {removing.courses} kursunun içerik kopyası kurumda kalsın mı? (öğrenciler kopyalanmaz)
                                <select value={copyTo} onChange={(e) => setCopyTo(e.target.value)}
                                        className="mt-2 w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm">
                                    <option value="">Hayır, kopyalama</option>
                                    {data.teachers.filter((t) => t.teacher_id !== removing.teacher_id).map((t) => (
                                        <option key={t.teacher_id} value={t.teacher_id}>Kopyası {t.name} öğretmene verilsin</option>
                                    ))}
                                </select>
                            </label>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setRemoving(null)} className="px-4 py-2 rounded-xl font-bold text-slate-500 hover:bg-slate-100">Vazgeç</button>
                            <button onClick={() => void remove()} disabled={busy} className="px-4 py-2 rounded-xl font-black bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50">Kurumdan çıkar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorOrganization;
