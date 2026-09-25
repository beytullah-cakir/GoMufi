import { createContext, useContext } from 'react';

/**
 * Canlı dersin görev slaytlarına ilettiği durum.
 *
 * LessonSlide (öğretmen ya da canlı derse bağlı öğrenci) bunu sağlar; görev
 * iskeleti (TaskSlideShell) okur. Üç görev bileşeninin her birinden prop
 * geçirmek yerine bağlam: canlı ders dışında (tekrar modu, oluşturucu) boştur.
 */

export interface LiveTaskTimer {
    /** Hangi görev için — öğrenci başka slayttaysa gösterilmez. */
    taskKey: string;
    /** Bu tarayıcının saatine göre bitiş (ms). Sunucu/öğretmen saati farkı kalan süreyle aşılır. */
    endsAt: number;
    /** Öğretmen görevi kapattı (süre dolmadan "herkes dursun"). */
    closed: boolean;
}

export interface LiveLessonState {
    timer: LiveTaskTimer | null;
    /** Öğrenci canlı derse bağlı mı (tekrar modunda değil). */
    live: boolean;
}

export const LiveLessonContext = createContext<LiveLessonState>({ timer: null, live: false });

export const useLiveLesson = () => useContext(LiveLessonContext);

export const formatCountdown = (ms: number) => {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
};
