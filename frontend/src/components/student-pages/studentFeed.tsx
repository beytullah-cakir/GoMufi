import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, CalendarClock, CheckCircle2, ChevronRight, ClipboardList, Megaphone, MessageCircle, Radio, Star, X } from 'lucide-react';
import { minutesUntil, startLabel, type UpcomingLive } from './liveReminder';
import api from '../../api';
import type { CourseData } from '../../types';
import type { AnnouncementView } from '../shared/SchoolNotices';
import { Card, CardTitle, MufiEmpty } from './ui';

/**
 * Öğrencinin "neyi kaçırmamalıyım" katmanı: ödevler (son tarihli) ve bildirimler.
 *
 * Ödevler eskiden yalnızca haritadaki düğümün içinde duruyordu; son tarih hiçbir
 * yerde görünmüyordu. Bildirimler de yoktu: hocanın cevabı yalnızca menüdeki
 * rozetten, notlanan ödev hiç fark edilmiyordu.
 */

// --- ödev durumu --------------------------------------------------------------------

export interface HomeworkStatus {
    course_id: number;
    node_id: string;
    submitted_at: string | null;
    grade: number | null;
    graded_at: string | null;
}

export const useHomeworkStatus = (reloadKey: unknown) => {
    const [items, setItems] = useState<HomeworkStatus[]>([]);
    useEffect(() => {
        let alive = true;
        api.get('/student/homework-status')
            .then((r) => { if (alive) setItems(r.data?.items || []); })
            .catch(() => { /* kart durum rozetsiz gösterilir */ });
        return () => { alive = false; };
    }, [reloadKey]);
    return items;
};

export interface HomeworkItem {
    key: string;
    courseId: string;
    courseTitle: string;
    lessonTitle: string;
    slide: any;
    title: string;
    points: number;
    due: Date | null;
    submitted: boolean;
    grade: number | null;
    gradedAt: string | null;
}

/** "2026-10-01T23:59" (yerel) ya da yalnızca gün → gün sonu. */
export const parseDue = (value: unknown): Date | null => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const text = value.trim();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(text) ? new Date(`${text}T23:59`) : new Date(text);
    return Number.isNaN(d.getTime()) ? null : d;
};

const DAY_MS = 86_400_000;

export const dueLabel = (due: Date | null, now = Date.now()): { text: string; tone: 'rose' | 'orange' | 'amber' | 'slate' } | null => {
    if (!due) return null;
    const diff = due.getTime() - now;
    if (diff < 0) return { text: 'Süresi geçti', tone: 'rose' };
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 24) return { text: hours < 1 ? 'Son 1 saat!' : `${hours} saat kaldı`, tone: 'rose' };
    const days = Math.ceil(diff / DAY_MS);
    if (days <= 2) return { text: `${days} gün kaldı`, tone: 'orange' };
    if (days <= 7) return { text: `${days} gün kaldı`, tone: 'amber' };
    return { text: due.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }), tone: 'slate' };
};

/** Açık modüllerdeki ödevler (tüm kurslar), durumlarıyla birlikte. */
export const collectHomework = (courses: Record<string, CourseData>, statuses: HomeworkStatus[]): HomeworkItem[] => {
    const byKey = new Map(statuses.map((s) => [`${s.course_id}:${s.node_id}`, s]));
    const out: HomeworkItem[] = [];
    for (const course of Object.values(courses)) {
        const submittedIds = new Set((course.progress?.submitted_homework || []).map(String));
        for (const node of course.nodes) {
            if (node.isLocked) continue;
            for (const slide of node.slides || []) {
                if (slide?.type !== 'homework') continue;
                const status = byKey.get(`${course.id}:${slide.id}`);
                out.push({
                    key: `${course.id}:${slide.id}`,
                    courseId: String(course.id),
                    courseTitle: course.title,
                    lessonTitle: node.title,
                    slide,
                    title: slide.homeworkConfig?.title || 'Ödev',
                    points: Number(slide.homeworkConfig?.points) || 100,
                    due: parseDue(slide.homeworkConfig?.dueDate),
                    submitted: !!status?.submitted_at || submittedIds.has(String(slide.id)),
                    grade: status?.grade ?? null,
                    gradedAt: status?.graded_at ?? null,
                });
            }
        }
    }
    return out;
};

const TONE_CHIP: Record<string, string> = {
    rose: 'bg-rose-100 text-rose-700',
    orange: 'bg-orange-100 text-orange-700',
    amber: 'bg-amber-100 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
};

/** Ana sayfadaki "Ödevlerim": önce yaklaşan son tarih, sonra teslim edilenler. */
export const HomeworkCard: React.FC<{ items: HomeworkItem[]; onOpen: (item: HomeworkItem) => void }> = ({ items, onOpen }) => {
    const pending = items.filter((i) => !i.submitted)
        .sort((a, b) => (a.due?.getTime() ?? Infinity) - (b.due?.getTime() ?? Infinity));
    const done = items.filter((i) => i.submitted)
        .sort((a, b) => (b.gradedAt ?? '').localeCompare(a.gradedAt ?? ''))
        .slice(0, 2);
    if (items.length === 0) return null;

    return (
        <Card className="p-4">
            <CardTitle icon={ClipboardList} tone="sky" hint={pending.length ? `${pending.length} ödev bekliyor` : 'Hepsi teslim edildi'}>Ödevlerim</CardTitle>
            {pending.length === 0 && <MufiEmpty compact pose="wave" title="Bekleyen ödevin yok!" />}
            <div className="space-y-2">
                {pending.map((hw) => {
                    const due = dueLabel(hw.due);
                    return (
                        <button key={hw.key} type="button" onClick={() => onOpen(hw)}
                                className="w-full text-left p-3 rounded-2xl border-2 border-slate-100 hover:border-sky-300 hover:bg-sky-50/40 transition-colors flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-black text-slate-800 text-sm truncate">{hw.title}</p>
                                <p className="text-[11px] font-bold text-slate-400 truncate">{hw.courseTitle} · {hw.lessonTitle}</p>
                                <div className="flex items-center gap-1.5 mt-1.5">
                                    {due && <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg inline-flex items-center gap-1 whitespace-nowrap ${TONE_CHIP[due.tone]}`}><CalendarClock size={12} /> {due.text}</span>}
                                    <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 inline-flex items-center gap-1 whitespace-nowrap"><Star size={11} className="fill-current" /> +{hw.points} XP</span>
                                </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300 shrink-0" />
                        </button>
                    );
                })}
                {done.map((hw) => (
                    <button key={hw.key} type="button" onClick={() => onOpen(hw)}
                            className="w-full text-left px-3 py-2 rounded-2xl hover:bg-slate-50 flex items-center gap-3">
                        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        <span className="text-sm font-bold text-slate-500 truncate flex-1">{hw.title}</span>
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${hw.grade !== null ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {hw.grade !== null ? `Not: ${hw.grade}` : 'Teslim edildi'}
                        </span>
                    </button>
                ))}
            </div>
        </Card>
    );
};

// --- bildirimler ------------------------------------------------------------------------

interface Notice {
    id: string;
    icon: React.ElementType;
    tone: string;
    title: string;
    text: string;
    at: number;
    /** Zaman satırı; verilmezse "… önce". */
    when?: string;
    onClick?: () => void;
}

const SEEN_KEY = 'gomufi.noticesSeenAt';
const WINDOW_MS = 14 * DAY_MS;
const readSeen = () => { try { return Number(localStorage.getItem(SEEN_KEY)) || 0; } catch { return 0; } };

const ago = (at: number) => {
    const min = Math.round((Date.now() - at) / 60_000);
    if (min < 1) return 'şimdi';
    if (min < 60) return `${min} dk önce`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h} sa önce`;
    return `${Math.round(h / 24)} gün önce`;
};

/**
 * Bildirim zili: notlanan ödev, yeni duyuru, yaklaşan son tarih ve okunmamış
 * hoca cevabı. Hepsi mevcut uçlardan türetiliyor; "okundu" yalnızca bu
 * tarayıcıda tutulur (kaybolması bir şey bozmaz, zil yeniden yanar).
 */
export const NotificationBell: React.FC<{
    homework: HomeworkItem[];
    unreadMessages: number;
    onOpenHomework: (item: HomeworkItem) => void;
    onOpenMessages: () => void;
    onDark?: boolean;
    /** Önümüzdeki canlı dersler: bir saat kala zilde görünür. */
    live?: UpcomingLive[];
}> = ({ homework, unreadMessages, onOpenHomework, onOpenMessages, onDark, live = [] }) => {
    const [open, setOpen] = useState(false);
    const [seenAt, setSeenAt] = useState(readSeen);
    // "Şimdi" render sırasında okunmaz; zil açıldıkça tazelenir.
    const [now, setNow] = useState(() => Date.now());
    const [announcements, setAnnouncements] = useState<AnnouncementView[]>([]);
    const ref = useRef<HTMLDivElement>(null);

    // Canlı ders geri sayımı zil kapalıyken de ilerlesin.
    useEffect(() => {
        if (!live.length) return;
        const timer = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(timer);
    }, [live.length]);

    useEffect(() => {
        api.get('/announcements/me').then((r) => setAnnouncements(r.data?.announcements || [])).catch(() => undefined);
    }, []);

    useEffect(() => {
        if (!open) return;
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [open]);

    const notices = useMemo<Notice[]>(() => {
        const list: Notice[] = [];
        if (unreadMessages > 0) {
            list.push({ id: 'msg', icon: MessageCircle, tone: 'bg-violet-100 text-violet-600', title: 'Öğretmenin cevap yazdı',
                        text: `${unreadMessages} okunmamış mesajın var.`, at: now, onClick: onOpenMessages });
        }
        for (const hw of homework) {
            if (hw.gradedAt) {
                const at = new Date(hw.gradedAt).getTime();
                if (now - at < WINDOW_MS) {
                    list.push({ id: `grade-${hw.key}`, icon: Star, tone: 'bg-emerald-100 text-emerald-600', title: 'Ödevin notlandı',
                                text: `${hw.title}: ${hw.grade ?? '—'} puan`, at, onClick: () => onOpenHomework(hw) });
                }
            } else if (!hw.submitted && hw.due) {
                const left = hw.due.getTime() - now;
                if (left > 0 && left < 2 * DAY_MS) {
                    list.push({ id: `due-${hw.key}`, icon: CalendarClock, tone: 'bg-orange-100 text-orange-600', title: 'Son tarih yaklaşıyor',
                                text: hw.title, when: `Son tarih: ${hw.due.toLocaleString('tr-TR', { weekday: 'long', hour: '2-digit', minute: '2-digit' })} · ${dueLabel(hw.due, now)?.text}`,
                                at: hw.due.getTime() - 2 * DAY_MS, onClick: () => onOpenHomework(hw) });
                }
            }
        }
        for (const item of live) {
            const left = minutesUntil(item, now);
            if (left > -60 && left <= 60) {
                list.push({ id: `live-${item.course_id}-${item.start}`, icon: Radio, tone: 'bg-rose-100 text-rose-600',
                            title: left > 0 ? `Canlı ders ${left} dk sonra` : 'Canlı ders başladı',
                            text: item.course_title + (item.class_name ? ` · ${item.class_name}` : ''),
                            when: `Başlangıç: ${startLabel(item)}`,
                            at: new Date(item.start).getTime() - 60 * 60_000 });
            }
        }
        for (const a of announcements) {
            const at = a.created_at ? new Date(a.created_at).getTime() : 0;
            if (now - at < WINDOW_MS) {
                list.push({ id: `ann-${a.id}`, icon: Megaphone, tone: 'bg-sky-100 text-sky-600', title: a.title, text: a.course_title || 'Duyuru', at });
            }
        }
        return list.sort((a, b) => b.at - a.at);
    }, [homework, unreadMessages, announcements, onOpenHomework, onOpenMessages, now, live]);

    const fresh = notices.filter((n) => n.id === 'msg' || n.at > seenAt).length;

    const toggle = () => {
        const next = !open;
        setOpen(next);
        if (next) {
            const openedAt = Date.now();
            setNow(openedAt);
            try { localStorage.setItem(SEEN_KEY, String(openedAt)); } catch { /* yalnızca bu oturum */ }
            // Liste açıkken "yeni" işaretleri görünsün; sayaç bir sonraki açılışta sıfırlanır.
            setTimeout(() => setSeenAt(openedAt), 4000);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button type="button" onClick={toggle} aria-label={`Bildirimler${fresh ? ` (${fresh} yeni)` : ''}`} aria-expanded={open}
                    className={`relative w-11 h-11 rounded-2xl border-2 border-b-4 flex items-center justify-center transition-colors ${
                        onDark ? 'bg-white/15 border-white/20 text-white hover:bg-white/25' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                <Bell size={20} className={fresh ? 'animate-wiggle' : ''} />
                {fresh > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[11px] font-black flex items-center justify-center border-2 border-white">{fresh}</span>
                )}
            </button>
            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[min(22rem,calc(100vw-2rem))] bg-white rounded-3xl border-2 border-slate-200 border-b-4 shadow-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 pt-4 pb-2">
                        <p className="font-black text-slate-800">Bildirimler</p>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Kapat" className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={16} /></button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto px-2 pb-2">
                        {notices.length === 0 ? (
                            <MufiEmpty compact pose="sleep" title="Her şey sakin" text="Yeni bir şey olunca burada göreceksin." />
                        ) : notices.map((n) => (
                            <button key={n.id} type="button" disabled={!n.onClick}
                                    onClick={() => { setOpen(false); n.onClick?.(); }}
                                    className="w-full text-left flex items-start gap-3 p-2.5 rounded-2xl hover:bg-slate-50 disabled:hover:bg-transparent">
                                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${n.tone}`}><n.icon size={18} /></span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5">
                                        <span className="font-black text-sm text-slate-800 truncate">{n.title}</span>
                                        {(n.id === 'msg' || n.at > seenAt) && <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />}
                                    </span>
                                    <span className="block text-xs font-bold text-slate-500 truncate">{n.text}</span>
                                    <span className="block text-[11px] font-bold text-slate-400 mt-0.5">{n.when ?? ago(n.at)}</span>
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
