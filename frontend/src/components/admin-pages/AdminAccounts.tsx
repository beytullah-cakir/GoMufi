import React, { useCallback, useEffect, useState } from 'react';
import { Ban, ChevronLeft, ChevronRight, Download, Edit, Loader2, Search, ShieldCheck, Trash2, X } from 'lucide-react';
import api from '../../api';

/**
 * Hesaplar: öğrenci, öğretmen ve veli hesaplarında arama; askıya alma, KVKK veri
 * talebi (indir), silme. Kullanıcı ekleme/düzenleme ve kursa kaydetme "Düzenle"
 * ile açılan düzenleme ekranında (AdminPanel).
 * Veri: backend/routers/admin_ops.py
 */

type Role = 'student' | 'teacher' | 'parent';
interface Account {
    role: Role; id: number; first_name: string | null; last_name: string | null; email: string;
    created_at: string | null; last_login: string | null; courses: number | null;
    suspended: boolean; suspension_reason: string | null; is_admin: boolean;
}

const ROLE_LABEL: Record<Role, string> = { student: 'Öğrenci', teacher: 'Öğretmen', parent: 'Veli' };
const ROLE_TONE: Record<Role, string> = {
    student: 'bg-emerald-50 text-emerald-700', teacher: 'bg-indigo-50 text-indigo-700', parent: 'bg-purple-50 text-purple-700',
};
const fmt = (iso: string | null) => iso ? new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleDateString('tr-TR') : '—';

const AdminAccounts: React.FC<{ onEdit: (email: string) => void }> = ({ onEdit }) => {
    const [q, setQ] = useState('');
    const [query, setQuery] = useState('');
    const [role, setRole] = useState<'' | Role>('');
    const [status, setStatus] = useState<'' | 'active' | 'suspended'>('');
    const [page, setPage] = useState(1);
    const [data, setData] = useState<{ items: Account[]; total: number; page_size: number } | null>(null);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
    const [suspendTarget, setSuspendTarget] = useState<Account | null>(null);
    const [reason, setReason] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<{ account: Account; courses?: Array<{ id: number; title: string }> } | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/accounts', { params: { q: query, role: role || undefined, status: status || undefined, page } });
            setData(res.data);
        } catch (e: any) {
            setNotice({ ok: false, text: e?.response?.data?.detail || 'Hesaplar yüklenemedi.' });
        } finally {
            setLoading(false);
        }
    }, [query, role, status, page]);

    useEffect(() => { void load(); }, [load]);

    // Yazarken her tuşta istek atma: 300 ms bekle
    useEffect(() => {
        const t = setTimeout(() => { setPage(1); setQuery(q.trim()); }, 300);
        return () => clearTimeout(t);
    }, [q]);

    const name = (a: Account) => `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email;

    const suspend = async () => {
        if (!suspendTarget) return;
        try {
            await api.post(`/admin/users/${suspendTarget.role}/${suspendTarget.id}/suspend`, { reason });
            setNotice({ ok: true, text: `${name(suspendTarget)} askıya alındı; açık oturumları da kapandı.` });
            setSuspendTarget(null);
            setReason('');
            void load();
        } catch (e: any) {
            setNotice({ ok: false, text: e?.response?.data?.detail || 'Askıya alınamadı.' });
        }
    };

    const unsuspend = async (a: Account) => {
        try {
            await api.delete(`/admin/users/${a.role}/${a.id}/suspend`);
            setNotice({ ok: true, text: `${name(a)} yeniden açıldı.` });
            void load();
        } catch (e: any) {
            setNotice({ ok: false, text: e?.response?.data?.detail || 'İşlem yapılamadı.' });
        }
    };

    const exportData = async (a: Account) => {
        try {
            const res = await api.get(`/admin/users/${a.role}/${a.id}/export`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const link = document.createElement('a');
            link.href = url;
            link.download = `gomufi-${a.role}-${a.id}.json`;
            link.click();
            URL.revokeObjectURL(url);
        } catch {
            setNotice({ ok: false, text: 'Veri indirilemedi.' });
        }
    };

    const remove = async (withCourses: boolean) => {
        if (!deleteTarget) return;
        const a = deleteTarget.account;
        try {
            await api.delete(`/admin/users/${a.role}/${a.id}`, { params: withCourses ? { with_courses: true } : {} });
            setNotice({ ok: true, text: `${name(a)} ve kişisel verileri silindi.` });
            setDeleteTarget(null);
            void load();
        } catch (e: any) {
            const detail = e?.response?.data?.detail;
            if (e?.response?.status === 409 && detail?.courses) {
                setDeleteTarget({ account: a, courses: detail.courses });
            } else {
                setNotice({ ok: false, text: (typeof detail === 'string' && detail) || 'Silinemedi.' });
                setDeleteTarget(null);
            }
        }
    };

    const pages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-5">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-black text-gray-800 font-display">Hesaplar</h1>
                    <p className="text-gray-500 text-sm font-semibold">Öğrenci, öğretmen ve veli hesapları. Yeni kullanıcı ve kurs kaydı için "Düzenle".</p>
                </div>
                <button onClick={() => onEdit('')} className="self-start md:self-auto bg-sky-500 hover:bg-sky-600 text-white font-black px-5 py-3 rounded-2xl text-sm">Kullanıcı ekle / düzenle</button>
            </div>

            <div className="flex flex-col md:flex-row gap-3 bg-white p-4 rounded-3xl border-2 border-gray-100">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad, soyad ya da e-posta ara…" aria-label="Hesap ara"
                           className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-sky-400 font-semibold text-sm" />
                </div>
                <select value={role} onChange={(e) => { setPage(1); setRole(e.target.value as '' | Role); }} aria-label="Rol"
                        className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 font-bold text-sm">
                    <option value="">Tüm roller</option>
                    <option value="student">Öğrenci</option>
                    <option value="teacher">Öğretmen</option>
                    <option value="parent">Veli</option>
                </select>
                <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value as '' | 'active' | 'suspended'); }} aria-label="Durum"
                        className="px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 font-bold text-sm">
                    <option value="">Tüm durumlar</option>
                    <option value="active">Aktif</option>
                    <option value="suspended">Askıda</option>
                </select>
            </div>

            {notice && (
                <div className={`flex items-center justify-between gap-3 rounded-2xl px-4 py-3 text-sm font-bold ${notice.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>
                    {notice.text}
                    <button onClick={() => setNotice(null)} aria-label="Kapat"><X size={16} /></button>
                </div>
            )}

            <div className="bg-white rounded-3xl border-2 border-gray-100 overflow-x-auto">
                <table className="w-full text-left text-sm min-w-[760px]">
                    <thead>
                        <tr className="text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                            <th className="px-5 py-3">Kişi</th>
                            <th className="px-3 py-3">Rol</th>
                            <th className="px-3 py-3">Kurs</th>
                            <th className="px-3 py-3">Kayıt</th>
                            <th className="px-3 py-3">Son giriş</th>
                            <th className="px-3 py-3">Durum</th>
                            <th className="px-5 py-3 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading && !data && (
                            <tr><td colSpan={7} className="py-10 text-center"><Loader2 className="inline animate-spin text-sky-500" /></td></tr>
                        )}
                        {data && data.items.length === 0 && (
                            <tr><td colSpan={7} className="py-10 text-center text-sm font-bold text-gray-400">Eşleşen hesap yok.</td></tr>
                        )}
                        {data?.items.map((a) => (
                            <tr key={`${a.role}-${a.id}`} className={a.suspended ? 'bg-rose-50/40' : ''}>
                                <td className="px-5 py-3">
                                    <p className="font-black text-gray-800">{name(a)} {a.is_admin && <span className="text-[10px] font-black text-rose-600 ml-1">YÖNETİCİ</span>}</p>
                                    <p className="text-xs font-bold text-gray-400">{a.email}</p>
                                </td>
                                <td className="px-3 py-3"><span className={`text-[11px] font-black px-2 py-1 rounded-lg ${ROLE_TONE[a.role]}`}>{ROLE_LABEL[a.role]}</span></td>
                                <td className="px-3 py-3 font-bold text-gray-600">{a.courses ?? '—'}</td>
                                <td className="px-3 py-3 font-bold text-gray-500">{fmt(a.created_at)}</td>
                                <td className="px-3 py-3 font-bold text-gray-500">{fmt(a.last_login)}</td>
                                <td className="px-3 py-3">
                                    {a.suspended
                                        ? <span className="text-[11px] font-black text-rose-700" title={a.suspension_reason || undefined}>Askıda{a.suspension_reason ? ' ⓘ' : ''}</span>
                                        : <span className="text-[11px] font-black text-emerald-700">Aktif</span>}
                                </td>
                                <td className="px-5 py-3">
                                    <div className="flex justify-end gap-1">
                                        {a.role !== 'parent' && (
                                            <button onClick={() => onEdit(a.email)} title="Düzenle / kursa kaydet" aria-label={`${name(a)} düzenle`}
                                                    className="p-2 rounded-xl text-sky-600 hover:bg-sky-50"><Edit size={16} /></button>
                                        )}
                                        <button onClick={() => void exportData(a)} title="KVKK veri talebi: verisini indir" aria-label={`${name(a)} verisini indir`}
                                                className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50"><Download size={16} /></button>
                                        {!a.is_admin && (a.suspended ? (
                                            <button onClick={() => void unsuspend(a)} title="Hesabı yeniden aç" aria-label={`${name(a)} hesabını aç`}
                                                    className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50"><ShieldCheck size={16} /></button>
                                        ) : (
                                            <button onClick={() => { setSuspendTarget(a); setReason(''); }} title="Askıya al" aria-label={`${name(a)} askıya al`}
                                                    className="p-2 rounded-xl text-amber-600 hover:bg-amber-50"><Ban size={16} /></button>
                                        ))}
                                        {!a.is_admin && (
                                            <button onClick={() => setDeleteTarget({ account: a })} title="Sil" aria-label={`${name(a)} sil`}
                                                    className="p-2 rounded-xl text-rose-600 hover:bg-rose-50"><Trash2 size={16} /></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {data && data.total > data.page_size && (
                <div className="flex items-center justify-end gap-2 text-sm font-bold text-gray-500">
                    <span>{data.total} hesap · sayfa {page}/{pages}</span>
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Önceki sayfa" className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30"><ChevronLeft size={16} /></button>
                    <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Sonraki sayfa" className="p-2 rounded-xl hover:bg-gray-100 disabled:opacity-30"><ChevronRight size={16} /></button>
                </div>
            )}

            {suspendTarget && (
                <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setSuspendTarget(null)}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <h2 className="text-lg font-black text-gray-800">{name(suspendTarget)} askıya alınsın mı?</h2>
                        <p className="text-sm font-bold text-gray-500">Giriş yapamaz, açık oturumları da kapanır. Verisi silinmez; istediğin zaman yeniden açabilirsin.</p>
                        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="Neden (yalnızca yöneticiler görür)"
                                  className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setSuspendTarget(null)} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Vazgeç</button>
                            <button onClick={() => void suspend()} className="px-4 py-2 rounded-xl font-black bg-amber-500 text-white hover:bg-amber-600">Askıya al</button>
                        </div>
                    </div>
                </div>
            )}

            {deleteTarget && (
                <div className="fixed inset-0 z-[300] bg-black/40 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
                    <div className="bg-white rounded-3xl p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <h2 className="text-lg font-black text-rose-700">{name(deleteTarget.account)} kalıcı olarak silinsin mi?</h2>
                        <p className="text-sm font-bold text-gray-500">Hesap, ilerleme, mesajlar ve yüklediği dosyalar silinir. Bu işlem geri alınamaz; gerekirse önce verisini indir.</p>
                        {deleteTarget.courses && (
                            <p className="text-xs font-bold text-rose-700 bg-rose-50 rounded-xl px-3 py-2">
                                Bu öğretmenin {deleteTarget.courses.length} kursu da tüm içeriği ve öğrenci kayıtlarıyla silinecek: {deleteTarget.courses.map((c) => c.title).join(', ')}
                            </p>
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 rounded-xl font-bold text-gray-500 hover:bg-gray-100">Vazgeç</button>
                            <button onClick={() => void remove(Boolean(deleteTarget.courses))} className="px-4 py-2 rounded-xl font-black bg-rose-600 text-white hover:bg-rose-700">
                                {deleteTarget.courses ? 'Kurslarla birlikte sil' : 'Sil'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAccounts;
