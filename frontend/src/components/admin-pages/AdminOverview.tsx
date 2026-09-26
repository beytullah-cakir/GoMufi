import React, { useEffect, useState } from 'react';
import { AlertTriangle, BookOpen, Bot, GraduationCap, HardDrive, Info, Loader2, Mail, ShieldAlert, Sparkles, Users, UserRound } from 'lucide-react';
import api from '../../api';

/**
 * Yönetici genel bakış: platform ne durumda, dikkat edilmesi gereken bir şey var mı?
 * Veri: GET /admin/overview (backend/routers/admin_ops.py).
 */

interface Overview {
    users: Record<'student' | 'teacher' | 'parent', { total: number; new_7d: number; new_30d: number }>;
    courses: { total: number; new_30d: number; enrollments: number; modules_pending_review: number };
    activity: { active_students_7d: number; modules_completed_7d: number };
    ai: {
        this_month: { cost_usd: number; calls: number };
        last_30d: { cost_usd: number; calls: number };
        top_teachers: Array<{ teacher_id: number; name: string; cost_usd: number; calls: number }>;
    };
    storage: { files: number; bytes: number };
    security: { failed_logins_24h: number; suspended: number };
    email_provider: string;
    warnings: Array<{ level: 'high' | 'info'; text: string }>;
}

const formatBytes = (n: number) => n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
const usd = (n: number) => `$${n.toFixed(2)}`;

const Tile: React.FC<{ icon: React.ElementType; label: string; value: React.ReactNode; hint?: string; tone?: string }> = ({ icon: Icon, label, value, hint, tone = 'text-sky-600 bg-sky-50' }) => (
    <div className="bg-white rounded-3xl border-2 border-gray-100 p-5 flex items-start gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${tone}`}><Icon size={20} /></div>
        <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-gray-400">{label}</p>
            <p className="text-2xl font-black text-gray-800 leading-tight">{value}</p>
            {hint && <p className="text-xs font-bold text-gray-400 mt-0.5">{hint}</p>}
        </div>
    </div>
);

const AdminOverview: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
    const [data, setData] = useState<Overview | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        api.get('/admin/overview').then((r) => setData(r.data)).catch((e) => setError(e?.response?.data?.detail || 'Veriler yüklenemedi.'));
    }, []);

    if (error) return <p className="p-8 text-sm font-bold text-rose-600">{error}</p>;
    if (!data) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-sky-500" /></div>;

    const { users } = data;
    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
            <div>
                <h1 className="text-3xl font-black text-gray-800 font-display">Genel Bakış</h1>
                <p className="text-gray-500 text-sm font-semibold">Platformun durumu ve dikkat isteyen konular.</p>
            </div>

            {data.warnings.length > 0 && (
                <div className="space-y-2">
                    {data.warnings.map((w) => (
                        <div key={w.text} className={`flex items-start gap-3 rounded-2xl px-4 py-3 text-sm font-bold border-2 ${w.level === 'high' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-sky-50 border-sky-100 text-sky-800'}`}>
                            {w.level === 'high' ? <AlertTriangle size={18} className="shrink-0 mt-0.5" /> : <Info size={18} className="shrink-0 mt-0.5" />}
                            {w.text}
                        </div>
                    ))}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <Tile icon={GraduationCap} label="Öğrenci" value={users.student.total} hint={`Son 7 gün +${users.student.new_7d} · 30 gün +${users.student.new_30d}`} />
                <Tile icon={Users} label="Öğretmen" value={users.teacher.total} hint={`Son 7 gün +${users.teacher.new_7d} · 30 gün +${users.teacher.new_30d}`} tone="text-indigo-600 bg-indigo-50" />
                <Tile icon={UserRound} label="Veli" value={users.parent.total} hint={`Son 30 gün +${users.parent.new_30d}`} tone="text-purple-600 bg-purple-50" />
                <Tile icon={BookOpen} label="Kurs" value={data.courses.total} hint={`${data.courses.enrollments} kayıt · son 30 gün +${data.courses.new_30d}`} tone="text-emerald-600 bg-emerald-50" />
                <Tile icon={Sparkles} label="Aktif öğrenci (7 gün)" value={data.activity.active_students_7d} hint={`${data.activity.modules_completed_7d} modül tamamlandı`} tone="text-amber-600 bg-amber-50" />
                <Tile icon={Bot} label="YZ maliyeti (bu ay)" value={usd(data.ai.this_month.cost_usd)} hint={`${data.ai.this_month.calls} çağrı · son 30 gün ${usd(data.ai.last_30d.cost_usd)}`} tone="text-fuchsia-600 bg-fuchsia-50" />
                <Tile icon={HardDrive} label="Dosya deposu" value={formatBytes(data.storage.bytes)} hint={`${data.storage.files} dosya (veritabanında)`} tone="text-slate-600 bg-slate-100" />
                <Tile icon={Mail} label="E-posta" value={data.email_provider === 'log' ? 'Kapalı' : data.email_provider.toUpperCase()} hint={data.email_provider === 'log' ? 'E-postalar gönderilmiyor' : 'Gönderim açık'} tone={data.email_provider === 'log' ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'} />
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
                <section className="bg-white rounded-3xl border-2 border-gray-100 p-5">
                    <h2 className="text-sm font-black text-gray-700 mb-3 flex items-center gap-2"><Bot size={16} className="text-fuchsia-500" /> Bu ay en çok YZ kullanan öğretmenler</h2>
                    {data.ai.top_teachers.length === 0 ? (
                        <p className="text-xs font-bold text-gray-400">Bu ay YZ kullanımı yok.</p>
                    ) : (
                        <ul className="divide-y divide-gray-50">
                            {data.ai.top_teachers.map((t) => (
                                <li key={t.teacher_id} className="flex items-center justify-between py-2 text-sm">
                                    <span className="font-bold text-gray-700">{t.name}</span>
                                    <span className="font-black text-gray-800">{usd(t.cost_usd)} <span className="text-xs font-bold text-gray-400">· {t.calls} çağrı</span></span>
                                </li>
                            ))}
                        </ul>
                    )}
                    <button onClick={() => onNavigate('AI')} className="mt-3 text-xs font-black text-fuchsia-600 hover:underline">Ayrıntılı YZ maliyeti →</button>
                </section>

                <section className="bg-white rounded-3xl border-2 border-gray-100 p-5 space-y-3">
                    <h2 className="text-sm font-black text-gray-700 flex items-center gap-2"><ShieldAlert size={16} className="text-rose-500" /> Dikkat isteyenler</h2>
                    <button onClick={() => onNavigate('Security')} className="w-full flex items-center justify-between text-left text-sm font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-2xl px-4 py-3">
                        Son 24 saatte hatalı giriş denemesi <span className="font-black">{data.security.failed_logins_24h}</span>
                    </button>
                    <button onClick={() => onNavigate('Accounts')} className="w-full flex items-center justify-between text-left text-sm font-bold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-2xl px-4 py-3">
                        Askıya alınmış hesap <span className="font-black">{data.security.suspended}</span>
                    </button>
                    <div className="flex items-center justify-between text-sm font-bold text-gray-700 bg-gray-50 rounded-2xl px-4 py-3">
                        Öğretmen onayı bekleyen YZ modülü <span className="font-black">{data.courses.modules_pending_review}</span>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AdminOverview;
