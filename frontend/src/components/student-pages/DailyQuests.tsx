import React, { useEffect, useState } from 'react';
import { CheckCircle2, Star, Target, Zap, BookOpen } from 'lucide-react';
import api from '../../api';
import FireIcon from '../../assets/sprites/Fire.png';

/**
 * Günlük seri ve günlük görevler — sunucudaki gerçek etkinlikten
 * (GET /progress/activity, backend/core/streak.py). Eskiden görevler XP'nin
 * 10'a bölümünden kalanla uydurulmuş çubuklardı, seri de hiç artmıyordu.
 */

export interface Activity {
    streak: number;
    longest: number;
    active_today: boolean;
    week: { day: string; active: boolean }[];
    quests: { key: string; title: string; progress: number; goal: number }[];
}

const QUEST_ICON: Record<string, React.ElementType> = { module: BookOpen, perfect: Star, xp: Zap };
const DAY = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

export const useActivity = (reloadKey: unknown) => {
    const [data, setData] = useState<Activity | null>(null);
    useEffect(() => {
        let alive = true;
        api.get('/progress/activity').then((r) => { if (alive) setData(r.data); }).catch(() => { /* seri gösterilmez */ });
        return () => { alive = false; };
    }, [reloadKey]);
    return data;
};

const DailyQuests: React.FC<{ data: Activity | null }> = ({ data }) => {
    if (!data) return null;
    const doneCount = data.quests.filter((q) => q.progress >= q.goal).length;

    return (
        <section className="bg-white rounded-3xl border-2 border-gray-200 border-b-4 p-4 space-y-4">
            <div className="flex items-center gap-3">
                <img src={FireIcon} alt="" className={`w-10 h-10 ${data.active_today ? '' : 'grayscale opacity-60'}`} />
                <div className="min-w-0">
                    <p className="text-lg font-black text-gray-800 leading-tight">{data.streak} günlük seri</p>
                    <p className="text-xs font-bold text-gray-500">
                        {data.active_today ? 'Bugün çalıştın, seri güvende.' : data.streak > 0 ? 'Seriyi korumak için bugün bir modül bitir.' : 'Bugün bir modül bitir, serin başlasın.'}
                    </p>
                </div>
            </div>
            <div className="flex justify-between" aria-label="Son 7 gün">
                {data.week.map((d) => (
                    <div key={d.day} className="flex flex-col items-center gap-1">
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center ${d.active ? 'bg-orange-400 text-white' : 'bg-gray-100 text-gray-300'}`}>
                            {d.active ? <CheckCircle2 size={16} /> : <span className="w-2 h-2 rounded-full bg-current" />}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">{DAY[new Date(d.day + 'T12:00:00').getDay()]}</span>
                    </div>
                ))}
            </div>

            <div className="pt-3 border-t border-gray-100 space-y-3">
                <h3 className="text-sm font-black text-gray-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Target size={16} className="text-green-500" /> Günlük görevler</span>
                    <span className="text-xs font-bold text-gray-400">{doneCount}/{data.quests.length}</span>
                </h3>
                {data.quests.map((q) => {
                    const Icon = QUEST_ICON[q.key] || Target;
                    const done = q.progress >= q.goal;
                    return (
                        <div key={q.key} className="flex items-center gap-3">
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline gap-2 mb-1">
                                    <span className={`text-sm font-bold leading-tight ${done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{q.title}</span>
                                    <span className="text-xs font-bold text-gray-400 shrink-0">{q.progress}/{q.goal}</span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(100, (q.progress / q.goal) * 100)}%` }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default DailyQuests;
