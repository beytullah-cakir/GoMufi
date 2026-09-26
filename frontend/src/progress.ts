import api from './api';
import type { PathNode } from './types';

/**
 * Öğrencinin modül ilerlemesi — sunucuda, hesaba bağlı.
 *
 * Eskiden `localStorage` (progress_<kurs>) içindeydi: okulda ve evde farklı
 * görünüyor, ortak laboratuvar bilgisayarında başka öğrenciye geçiyordu ve
 * öğretmen göremiyordu. Modüller sırayla açılır; öğretmen şube için "buraya
 * kadar açık" sınırı koyabilir (open_until bunu içerir). XP sunucuda, modül
 * başına bir kez verilir.
 */
export interface CourseProgress {
    order: string[];
    completed: Record<string, { stars: number; source: 'self' | 'live' }>;
    unlocked_until: number | null;
    open_until: number;
    submitted_homework: string[];
    leaderboard_enabled: boolean;
}

export interface CompleteResult extends CourseProgress {
    xp_awarded: number;
    xp: number;
}

export const fetchProgress = async (courseId: number | string): Promise<CourseProgress | null> => {
    try {
        const res = await api.get(`/progress/courses/${courseId}`);
        return res.data;
    } catch {
        return null;
    }
};

export const completeModule = async (
    courseId: number | string,
    nodeId: string,
    stars = 3,
    via: 'self' | 'live' = 'self',
): Promise<CompleteResult | null> => {
    try {
        const res = await api.post(`/progress/courses/${courseId}/complete`, { node_id: nodeId, stars, via });
        return res.data;
    } catch (err) {
        console.error('Modül tamamlanamadı:', err);
        return null;
    }
};

/** Yol haritası düğümlerine sunucudaki ilerlemeyi uygular (kilit ve yıldız). */
export const applyProgress = (nodes: PathNode[], progress: CourseProgress | null | undefined): PathNode[] => {
    if (!progress) {
        // İlerleme okunamadıysa yalnızca ilk modül açık: yanlışlıkla her şeyi açmaktansa.
        return nodes.map((node) => ({ ...node, isLocked: node.id > 1 }));
    }
    return nodes.map((node) => {
        const done = node.sectionId ? progress.completed[String(node.sectionId)] : undefined;
        return {
            ...node,
            isLocked: node.id > progress.open_until,
            stars: done ? done.stars : node.stars !== undefined ? 0 : undefined,
        };
    });
};

/** Sırayla bitirilmiş modül sayısı (takvimde "işlenen dersler" için). */
export const completedCount = (progress: CourseProgress | null | undefined): number => {
    if (!progress) return 0;
    let count = 0;
    for (const id of progress.order) {
        if (!progress.completed[id]) break;
        count += 1;
    }
    return count;
};
