import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Flame, Mail, Microscope, Search, TrendingUp, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

/**
 * Öğrenci yönetimi: kurs başına bir satır.
 *
 * Durum ve ilerleme sunucuda öğrenme kaydından hesaplanıyor (bkz.
 * backend/teacher_summary.py). Eskiden herkes "Aktif" görünüyor, arama ve
 * süzgeç düğmeleri bir şey yapmıyor, alttaki "15 riskli / 892 tamamlayan"
 * kartları sabit sayılardı.
 */

export interface TeacherStudentRow {
    student_id: number;
    first_name: string;
    last_name: string;
    email: string;
    course_id: number | null;
    course_title: string;
    progress: number;
    modules_done: number;
    modules_total: number;
    enrolled_at: string | null;
    status: 'active' | 'struggling' | 'completed' | 'inactive';
    class_id: string | null;
    class_name: string | null;
    last_activity_at: string | null;
    struggling_concepts: number;
    stuck_now: number;
    tasks_solved: number;
    tasks_started: number;
    has_parent: boolean;
}

type StatusFilter = 'all' | TeacherStudentRow['status'];

const STATUS: Record<TeacherStudentRow['status'], { label: string; badge: string; hint: string }> = {
    active: { label: 'Aktif', badge: 'bg-green-100 text-green-700', hint: 'Son iki haftada çalıştı' },
    struggling: {
        label: 'Destek gerekiyor', badge: 'bg-orange-100 text-orange-700',
        hint: 'Şu an takılı, ya da en az 2 kavramda zorlanıyor / 2 görevde takıldı',
    },
    completed: { label: 'Tamamladı', badge: 'bg-blue-100 text-blue-700', hint: 'Tüm modülleri bitirdi' },
    inactive: { label: 'Pasif', badge: 'bg-gray-100 text-gray-500', hint: '14 gündür etkinlik yok' },
};

const lastSeen = (iso: string | null) => {
    if (!iso) return 'Hiç';
    const date = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
    const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
    if (days <= 0) return 'Bugün';
    if (days === 1) return 'Dün';
    return `${days} gün önce`;
};

const InstructorStudents: React.FC<{ studentsData?: TeacherStudentRow[] }> = ({ studentsData }) => {
    const navigate = useNavigate();
    const [fetched, setFetched] = useState<TeacherStudentRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [courseFilter, setCourseFilter] = useState<string>('all');
    const [classFilter, setClassFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [openedAt] = useState(() => Date.now());

    // Sayfa her açıldığında taze liste: durumlar dakikalar içinde değişir.
    useEffect(() => {
        let alive = true;
        api.get<TeacherStudentRow[]>('/teacher/students')
            .then((r) => { if (alive) setFetched(r.data); })
            .catch(() => { if (alive) setError('Öğrenciler yüklenemedi.'); });
        return () => { alive = false; };
    }, []);

    const students = fetched ?? studentsData ?? null;
    const rows = students ?? [];

    const courses = useMemo(() => {
        const map = new Map<string, string>();
        rows.forEach((r) => map.set(String(r.course_id), r.course_title));
        return [...map.entries()];
    }, [rows]);
    const classes = useMemo(() => {
        const map = new Map<string, string>();
        rows.filter((r) => courseFilter === 'all' || String(r.course_id) === courseFilter)
            .forEach((r) => { if (r.class_id && r.class_name) map.set(r.class_id, r.class_name); });
        return [...map.entries()];
    }, [rows, courseFilter]);

    const q = query.trim().toLocaleLowerCase('tr');
    const visible = rows.filter((r) =>
        (courseFilter === 'all' || String(r.course_id) === courseFilter)
        && (classFilter === 'all' || r.class_id === classFilter)
        && (statusFilter === 'all' || r.status === statusFilter)
        && (!q || `${r.first_name} ${r.last_name} ${r.email}`.toLocaleLowerCase('tr').includes(q)),
    );
    const scoped = rows.filter((r) => courseFilter === 'all' || String(r.course_id) === courseFilter);
    const uniqueStudents = new Set(rows.map((r) => r.student_id)).size;
    const weekAgo = openedAt - 7 * 86_400_000;
    const activeWeek = new Set(scoped.filter((r) => r.last_activity_at
        && new Date(r.last_activity_at.endsWith('Z') ? r.last_activity_at : `${r.last_activity_at}Z`).getTime() >= weekAgo)
        .map((r) => r.student_id)).size;

    const openProfile = (r: TeacherStudentRow) =>
        navigate(`/instructor/learning?course=${r.course_id}&student=${r.student_id}`);
    const openMessages = (r: TeacherStudentRow) =>
        navigate(`/instructor/messages?student=${r.student_id}&course=${r.course_id}`);

    return (
        <div className="space-y-6 animate-fade-in-down">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-800">Öğrenci Yönetimi</h2>
                    <p className="text-sm font-bold text-gray-400">
                        {students ? `${uniqueStudents} öğrenci · ${rows.length} kayıt` : 'Yükleniyor…'}
                    </p>
                </div>
                <div className="relative md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Ad, soyad ya da e-posta…"
                        className="w-full pl-10 pr-9 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <X size={14} />
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { label: 'Destek gerekiyor', value: scoped.filter((r) => r.status === 'struggling').length, icon: AlertCircle, tone: 'bg-orange-50 text-orange-500', filter: 'struggling' as StatusFilter },
                    { label: 'Bu hafta çalışan', value: activeWeek, icon: TrendingUp, tone: 'bg-green-50 text-green-500', filter: 'active' as StatusFilter },
                    { label: 'Kursu tamamlayan', value: scoped.filter((r) => r.status === 'completed').length, icon: CheckCircle, tone: 'bg-blue-50 text-blue-500', filter: 'completed' as StatusFilter },
                ].map((card) => {
                    const Icon = card.icon;
                    return (
                        <button
                            key={card.label}
                            onClick={() => setStatusFilter(statusFilter === card.filter ? 'all' : card.filter)}
                            className={`bg-white p-5 rounded-2xl border-2 shadow-sm flex items-center gap-4 text-left transition-colors ${
                                statusFilter === card.filter ? 'border-indigo-300' : 'border-gray-100 hover:border-gray-200'}`}
                        >
                            <div className={`p-3 rounded-xl ${card.tone}`}><Icon size={24} /></div>
                            <div>
                                <h4 className="font-black text-gray-800 text-lg">{students ? card.value : '…'}</h4>
                                <p className="text-xs font-bold text-gray-400">{card.label}</p>
                            </div>
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-2">
                <select value={courseFilter} onChange={(e) => { setCourseFilter(e.target.value); setClassFilter('all'); }}
                        className="text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2">
                    <option value="all">Tüm kurslar</option>
                    {courses.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
                </select>
                <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} disabled={!classes.length}
                        className="text-xs font-bold text-gray-700 bg-white border border-gray-200 rounded-xl px-3 py-2 disabled:opacity-50">
                    <option value="all">Tüm şubeler</option>
                    {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                </select>
                <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
                    {(['all', 'struggling', 'active', 'inactive', 'completed'] as StatusFilter[]).map((s) => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                                className={`text-[11px] font-black px-2.5 py-1 rounded-lg ${statusFilter === s ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                            {s === 'all' ? 'Tümü' : STATUS[s].label}
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}

            <div className="bg-white border border-gray-200 rounded-3xl overflow-x-auto shadow-sm">
                <table className="w-full min-w-[760px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr className="text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                            <th className="py-4 px-5">Öğrenci</th>
                            <th className="py-4 px-4">Kurs / Şube</th>
                            <th className="py-4 px-4">İlerleme</th>
                            <th className="py-4 px-4">Durum</th>
                            <th className="py-4 px-4">Son etkinlik</th>
                            <th className="py-4 px-4 text-right">Eylem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {!students ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400 font-bold">Öğrenciler yükleniyor…</td></tr>
                        ) : visible.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400 font-bold">
                                {rows.length ? 'Süzgece uyan öğrenci yok.' : 'Henüz kurslarınıza kayıtlı bir öğrenci bulunmuyor.'}
                            </td></tr>
                        ) : visible.map((r) => (
                            <tr key={`${r.student_id}-${r.course_id}`} onClick={() => openProfile(r)}
                                className="group hover:bg-sky-50 transition-colors cursor-pointer">
                                <td className="py-3.5 px-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm shrink-0">
                                            {r.first_name?.[0]}{r.last_name?.[0]}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-gray-800 text-sm flex items-center gap-1">
                                                {r.stuck_now > 0 && <Flame size={13} className="text-rose-500" />}
                                                {r.first_name} {r.last_name}
                                            </p>
                                            <p className="text-xs text-gray-400 truncate">{r.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3.5 px-4">
                                    <p className="text-sm font-semibold text-gray-600">{r.course_title}</p>
                                    <p className="text-[11px] font-bold text-gray-400">{r.class_name || 'Şube yok'}</p>
                                </td>
                                <td className="py-3.5 px-4 w-40">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${r.progress}%` }} />
                                        </div>
                                        <span className="text-xs font-black text-gray-600 w-9 text-right">%{r.progress}</span>
                                    </div>
                                    <p className="text-[10.5px] font-bold text-gray-400 mt-0.5">
                                        {r.modules_done}/{r.modules_total} modül · {r.tasks_solved}/{r.tasks_started} görev
                                    </p>
                                </td>
                                <td className="py-3.5 px-4">
                                    <span title={STATUS[r.status].hint} className={`px-2 py-1 rounded-md text-xs font-bold ${STATUS[r.status].badge}`}>
                                        {STATUS[r.status].label}
                                    </span>
                                    {r.struggling_concepts > 0 && (
                                        <p className="text-[10.5px] font-bold text-orange-600 mt-1">{r.struggling_concepts} kavramda zorlanıyor</p>
                                    )}
                                </td>
                                <td className="py-3.5 px-4 text-xs font-bold text-gray-500">{lastSeen(r.last_activity_at)}</td>
                                <td className="py-3.5 px-4">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={(e) => { e.stopPropagation(); openProfile(r); }} title="Öğrenme profili"
                                                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <Microscope size={17} />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); openMessages(r); }} title="Mesaj gönder"
                                                className="p-2 text-gray-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors">
                                            <Mail size={17} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                <Users size={12} /> İlerleme, öğrencinin bitirdiği modüllerin kurstaki toplam modüle oranıdır.
            </p>
        </div>
    );
};

export default InstructorStudents;
