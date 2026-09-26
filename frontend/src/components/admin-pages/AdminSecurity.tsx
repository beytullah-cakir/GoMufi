import React, { useCallback, useEffect, useState } from 'react';
import { History, Loader2, LockOpen, ShieldAlert, AlertTriangle } from 'lucide-react';
import api from '../../api';

/**
 * Güvenlik: son 24 saatin başarısız girişleri (e-posta ve IP'ye göre), kilitli
 * hesaplar ve yönetici işlem kaydı. Veri: backend/routers/admin_ops.py
 */

interface Security {
    failed_by_email: Array<{ email: string; count: number; last: string | null; locked: boolean }>;
    failed_by_ip: Array<{ ip: string; count: number; emails: number }>;
    limits: { per_email: number; per_email_ip?: number; per_ip: number; window_minutes: number };
}
interface AuditItem { id: number; action: string; summary: string | null; target: string | null; at: string | null }

const time = (iso: string | null) => iso ? new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).toLocaleString('tr-TR') : '—';

export const AdminSecurity: React.FC = () => {
    const [data, setData] = useState<Security | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(() => {
        api.get('/admin/security').then((r) => setData(r.data)).catch((e) => setError(e?.response?.data?.detail || 'Yüklenemedi.'));
    }, []);
    useEffect(load, [load]);

    const unlock = async (email: string) => {
        await api.delete('/admin/security/lock', { params: { email } });
        load();
    };

    if (error) return <p className="p-8 text-sm font-bold text-rose-600">{error}</p>;
    if (!data) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-sky-500" /></div>;

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto w-full space-y-5">
            <div>
                <h1 className="text-3xl font-black text-gray-800 font-display">Güvenlik</h1>
                <p className="text-gray-500 text-sm font-semibold">
                    Aynı e-posta aynı IP'den {data.limits.per_email_ip ?? 5} kez, bir e-posta toplamda {data.limits.per_email} kez ya da bir IP {data.limits.per_ip} kez hatalı denenirse giriş {data.limits.window_minutes} dakika kilitlenir.
                </p>
            </div>
            <div className="grid lg:grid-cols-2 gap-4">
                <section className="bg-white rounded-3xl border-2 border-gray-100 p-5">
                    <h2 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2"><ShieldAlert size={16} className="text-rose-500" /> Hatalı girişler · e-posta (24 saat)</h2>
                    {data.failed_by_email.length === 0 ? <p className="text-xs font-bold text-gray-400">Hatalı giriş yok.</p> : (
                        <ul className="divide-y divide-gray-50">
                            {data.failed_by_email.map((r) => (
                                <li key={r.email} className="flex items-center justify-between gap-3 py-2 text-sm">
                                    <span className="min-w-0">
                                        <span className="font-bold text-gray-700 break-all">{r.email}</span>
                                        <span className="block text-xs font-bold text-gray-400">{r.count} deneme · son {time(r.last)}</span>
                                    </span>
                                    {r.locked ? (
                                        <button onClick={() => void unlock(r.email)} className="shrink-0 flex items-center gap-1 text-xs font-black px-3 py-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100">
                                            <LockOpen size={13} /> Kilidi aç
                                        </button>
                                    ) : <span className="shrink-0 text-[11px] font-black text-gray-400">kilitli değil</span>}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
                <section className="bg-white rounded-3xl border-2 border-gray-100 p-5">
                    <h2 className="text-sm font-black text-gray-700 mb-3">Hatalı girişler · IP (24 saat)</h2>
                    {data.failed_by_ip.length === 0 ? <p className="text-xs font-bold text-gray-400">Hatalı giriş yok.</p> : (
                        <ul className="divide-y divide-gray-50">
                            {data.failed_by_ip.map((r) => (
                                <li key={r.ip} className="flex items-center justify-between py-2 text-sm">
                                    <span className="font-mono font-bold text-gray-700">{r.ip}</span>
                                    <span className="text-xs font-bold text-gray-500 inline-flex items-center gap-1">{r.count} deneme · {r.emails} farklı e-posta{r.emails >= 5 && <AlertTriangle size={13} className="text-amber-500" aria-label="Çok sayıda farklı e-posta" />}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    );
};

export const AdminAudit: React.FC = () => {
    const [page, setPage] = useState(1);
    const [data, setData] = useState<{ items: AuditItem[]; total: number; page_size: number } | null>(null);

    useEffect(() => {
        api.get('/admin/audit', { params: { page } }).then((r) => setData(r.data)).catch(() => setData({ items: [], total: 0, page_size: 50 }));
    }, [page]);

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-5">
            <div>
                <h1 className="text-3xl font-black text-gray-800 font-display flex items-center gap-2"><History size={26} className="text-sky-500" /> İşlem Kaydı</h1>
                <p className="text-gray-500 text-sm font-semibold">Yönetici panelinden yapılan her değişiklik: ne zaman, ne yapıldı, kime.</p>
            </div>
            <div className="bg-white rounded-3xl border-2 border-gray-100">
                {!data ? <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-sky-500" /></div>
                    : data.items.length === 0 ? <p className="p-8 text-center text-sm font-bold text-gray-400">Henüz kayıt yok.</p> : (
                        <ul className="divide-y divide-gray-50">
                            {data.items.map((a) => (
                                <li key={a.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-5 py-3 text-sm">
                                    <span className="font-bold text-gray-800">{a.summary || a.action} {a.target && <span className="font-mono text-xs text-gray-400 ml-1">{a.target}</span>}</span>
                                    <span className="text-xs font-bold text-gray-400">{time(a.at)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
            </div>
            {data && data.total > data.page_size && (
                <div className="flex justify-end gap-2">
                    <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 disabled:opacity-30">Daha yeni</button>
                    <button disabled={page * data.page_size >= data.total} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 rounded-xl text-sm font-bold hover:bg-gray-100 disabled:opacity-30">Daha eski</button>
                </div>
            )}
        </div>
    );
};
