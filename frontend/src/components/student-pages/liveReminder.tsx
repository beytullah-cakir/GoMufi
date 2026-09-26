import React, { useEffect, useState } from 'react';
import { Radio, Video } from 'lucide-react';
import api from '../../api';
import { ChunkyButton } from './ui';

/**
 * Canlı ders hatırlatması (site tarafı): 10 dakika kala ana sayfada şerit ve
 * zilde bildirim. E-posta sunucudan gider (core/notifications.live_reminders).
 */

export interface UpcomingLive {
    course_id: number;
    course_title: string;
    class_name: string | null;
    start: string;
    minutes_left: number;
}

const POLL_MS = 60_000;
export const LIVE_SOON_MINUTES = 10;

/** Önümüzdeki 24 saatin canlı dersleri; dakikada bir tazelenir. */
export const useUpcomingLive = () => {
    const [items, setItems] = useState<UpcomingLive[]>([]);
    useEffect(() => {
        let alive = true;
        const load = () => api.get('/student/upcoming-live')
            .then((r) => { if (alive) setItems(r.data?.items || []); })
            .catch(() => { /* hatırlatma olmadan devam */ });
        void load();
        const timer = setInterval(load, POLL_MS);
        return () => { alive = false; clearInterval(timer); };
    }, []);
    return items;
};

export const minutesUntil = (item: UpcomingLive, now: number) => Math.ceil((new Date(item.start).getTime() - now) / 60_000);

export const startLabel = (item: UpcomingLive) =>
    new Date(item.start).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/** Ana sayfa şeridi: ders 10 dakika içinde başlıyorsa ya da şu an sürüyorsa. */
export const LiveSoonBanner: React.FC<{
    items: UpcomingLive[];
    live: boolean;
    onJoin: () => void;
    className?: string;
}> = ({ items, live, onJoin, className = '' }) => {
    // Geri sayım dakikada bir ilerlesin (liste de dakikada bir tazeleniyor).
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 20_000);
        return () => clearInterval(timer);
    }, []);
    const soon = items.find((i) => minutesUntil(i, now) <= LIVE_SOON_MINUTES && minutesUntil(i, now) > -60);
    if (!soon) return null;
    const left = minutesUntil(soon, now);
    return (
        <div role="status" className={`rounded-3xl bg-rose-500 text-white border-b-4 border-rose-700 px-4 py-3 flex items-center gap-3 ${className}`}>
            <span className="relative w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
                <Radio size={20} />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-300 animate-ping" />
            </span>
            <div className="min-w-0 flex-1">
                <p className="font-black leading-tight">
                    {left > 0 ? `Canlı ders ${left} dakika sonra başlıyor!` : 'Canlı ders başladı!'}
                </p>
                <p className="text-xs font-bold text-rose-100 truncate">
                    {soon.course_title}{soon.class_name ? ` · ${soon.class_name}` : ''} · {startLabel(soon)}
                    {!live && left <= 0 && ' · Öğretmenin dersi açınca katılabilirsin'}
                </p>
            </div>
            {live ? (
                <ChunkyButton variant="white" size="sm" onClick={onJoin}><Video size={15} /> Derse katıl</ChunkyButton>
            ) : left > 0 ? (
                <span className="shrink-0 px-3 py-1.5 rounded-xl bg-white/20 font-black text-sm tabular-nums">{left} dk</span>
            ) : null}
        </div>
    );
};
