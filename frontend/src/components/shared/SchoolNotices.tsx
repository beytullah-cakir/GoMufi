import React, { useCallback, useEffect, useState } from 'react';
import { Megaphone, UserCheck, X } from 'lucide-react';
import api from '../../api';
import { useWebSocketEvent } from '../../hooks/useWebSocket';

/**
 * Öğrenci ve veli panelinde öğretmenden gelenler: duyurular ve yoklama özeti.
 * Veri /announcements/me ve /attendance/me (veli: /attendance/children/{id}).
 */

export interface AnnouncementView {
    id: number;
    course_id: number;
    course_title: string | null;
    class_name: string | null;
    teacher: string | null;
    title: string;
    body: string;
    created_at: string | null;
}

interface AttendanceCourse {
    course_id: number;
    title: string;
    present: number;
    absent: number;
    late: number;
    excused: number;
    total: number;
    rate: number | null;
    recent: Array<{ date: string; status: string; label: string; note: string | null }>;
}

const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long' }) : '';
const SEEN_KEY = 'gomufi_seen_announcement';

function useAnnouncements(courseIds?: number[]) {
    const [items, setItems] = useState<AnnouncementView[] | null>(null);
    const load = useCallback(() => {
        api.get('/announcements/me')
            .then((res) => setItems(res.data.announcements || []))
            .catch(() => setItems([]));
    }, []);
    useEffect(() => { load(); }, [load]);
    // Öğretmen duyuru yayınlayınca çevrimiçi öğrenciye anında gelir.
    useWebSocketEvent('announcement', load);
    const key = (courseIds || []).join(',');
    const filtered = items && key ? items.filter((a) => key.split(',').includes(String(a.course_id))) : items;
    return filtered;
}

export const AnnouncementFeed: React.FC<{ courseIds?: number[]; limit?: number; className?: string }> = ({ courseIds, limit = 3, className = '' }) => {
    const items = useAnnouncements(courseIds);
    const [expanded, setExpanded] = useState(false);
    if (!items || items.length === 0) return null;
    const shown = expanded ? items : items.slice(0, limit);
    return (
        <section className={`bg-white rounded-3xl border-2 border-gray-200 border-b-4 p-4 shadow-sm ${className}`}>
            <h3 className="text-gray-700 font-black text-sm tracking-tight uppercase flex items-center gap-1.5 mb-3">
                <Megaphone size={16} className="text-orange-500" /> Duyurular
            </h3>
            <ul className="space-y-3">
                {shown.map((a) => (
                    <li key={a.id} className="p-3 bg-orange-50/60 border border-orange-100 rounded-2xl">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-tight">
                            {a.course_title}{a.class_name ? ` · ${a.class_name}` : ''} · {when(a.created_at)}
                        </p>
                        <h4 className="font-black text-gray-800 text-sm mt-1">{a.title}</h4>
                        <p className="text-xs font-medium text-gray-600 whitespace-pre-line mt-1">{a.body}</p>
                        {a.teacher && <p className="text-[10px] font-bold text-gray-400 mt-1">— {a.teacher}</p>}
                    </li>
                ))}
            </ul>
            {items.length > limit && (
                <button onClick={() => setExpanded(!expanded)} className="mt-3 text-xs font-black text-orange-600 hover:underline">
                    {expanded ? 'Daha az göster' : `Tümünü göster (${items.length})`}
                </button>
            )}
        </section>
    );
};

/** Küçük ekranlarda: son 7 günün en yeni duyurusu, kapatılana kadar üstte. */
export const LatestAnnouncementBanner: React.FC<{ className?: string }> = ({ className = '' }) => {
    const items = useAnnouncements();
    const [seen, setSeen] = useState<string | null>(() => {
        try { return localStorage.getItem(SEEN_KEY); } catch { return null; }
    });
    const [cutoff] = useState(() => Date.now() - 7 * 86400000);
    const latest = items?.[0];
    if (!latest || String(latest.id) === seen) return null;
    if (latest.created_at && new Date(latest.created_at).getTime() < cutoff) return null;
    const dismiss = () => {
        setSeen(String(latest.id));
        try { localStorage.setItem(SEEN_KEY, String(latest.id)); } catch { /* yoksay */ }
    };
    return (
        <div className={`bg-orange-50 border-2 border-orange-200 rounded-2xl p-3 flex gap-3 items-start ${className}`} role="status">
            <Megaphone size={18} className="text-orange-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
                <p className="font-black text-gray-800 text-sm">{latest.title}</p>
                <p className="text-xs font-medium text-gray-600 whitespace-pre-line line-clamp-3">{latest.body}</p>
                <p className="text-[10px] font-bold text-orange-600 mt-1">{latest.course_title} · {when(latest.created_at)}</p>
            </div>
            <button onClick={dismiss} aria-label="Duyuruyu kapat" className="p-1 text-gray-400 hover:text-gray-700"><X size={16} /></button>
        </div>
    );
};

/** Devam özeti. `studentId` verilirse veli görünümü (çocuğunun kayıtları). */
export const AttendanceCard: React.FC<{ studentId?: number; courseId?: number | string | null; className?: string }> = ({ studentId, courseId, className = '' }) => {
    const [courses, setCourses] = useState<AttendanceCourse[] | null>(null);
    useEffect(() => {
        const url = studentId ? `/attendance/children/${studentId}` : '/attendance/me';
        api.get(url).then((res) => setCourses(res.data.courses || [])).catch(() => setCourses([]));
    }, [studentId]);
    const rows = (courses || []).filter((c) => c.total > 0 && (courseId == null || String(c.course_id) === String(courseId)));
    if (rows.length === 0) return null;
    return (
        <section className={`bg-white rounded-3xl border-2 border-gray-200 border-b-4 p-4 shadow-sm ${className}`}>
            <h3 className="text-gray-700 font-black text-sm tracking-tight uppercase flex items-center gap-1.5 mb-3">
                <UserCheck size={16} className="text-emerald-500" /> Devam durumu
            </h3>
            <ul className="space-y-3">
                {rows.map((c) => (
                    <li key={c.course_id}>
                        <div className="flex justify-between items-baseline">
                            <span className="text-xs font-black text-gray-700 truncate">{c.title}</span>
                            <span className={`text-sm font-black ${c.rate !== null && c.rate < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {c.rate === null ? '—' : `%${c.rate}`}
                            </span>
                        </div>
                        <p className="text-[11px] font-bold text-gray-400">
                            {c.total} ders · {c.absent} yok · {c.late} geç · {c.excused} izinli
                        </p>
                        {c.recent.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                                {c.recent.slice(0, 3).map((r) => (
                                    <li key={r.date} className="text-[11px] font-medium text-gray-500">
                                        {new Date(`${r.date}T12:00:00`).toLocaleDateString('tr-TR')}: <b>{r.label}</b>{r.note ? ` — ${r.note}` : ''}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
};
