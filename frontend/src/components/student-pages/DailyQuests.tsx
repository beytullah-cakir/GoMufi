import React, { useEffect, useState } from 'react';
import { CheckCircle2, Star, Target, Zap, BookOpen } from 'lucide-react';
import api from '../../api';
import FireIcon from '../../assets/sprites/mufi/fire.webp';
import { Card } from './ui';

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

    const todayKey = data.week[data.week.length - 1]?.day;
    const headline = data.active_today
        ? `${data.streak} günlük seri!`
        : data.streak > 0 ? `${data.streak} günlük seri` : 'İlk alevini yak!';
    const hint = data.active_today
        ? 'Bugün çalıştın, serin güvende.'
        : data.streak > 0 ? 'Bugün bir modül bitir, alev sönmesin.' : 'Bugün bir modül bitir, serin başlasın.';

    return (
        <Card className="p-4 space-y-4">
            <div className="flex items-center gap-3">
                <span className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${data.active_today ? 'bg-orange-100' : 'bg-amber-50'}`}>
                    <img src={FireIcon} alt="" className={`w-9 h-9 ${data.active_today ? 'animate-bob' : 'opacity-80'}`} />
                </span>
                <div className="min-w-0">
                    <p className="text-lg font-black text-slate-800 leading-tight font-display">{headline}</p>
                    <p className="text-xs font-bold text-slate-500">{hint}</p>
                </div>
            </div>
            <div className="flex justify-between" aria-label="Son 7 gün">
                {data.week.map((d) => {
                    const isToday = d.day === todayKey;
                    return (
                        <div key={d.day} className="flex flex-col items-center gap-1">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                d.active ? 'bg-orange-400 text-white border-b-2 border-orange-600'
                                    : isToday ? 'bg-white border-2 border-dashed border-orange-300 text-orange-300'
                                        : 'bg-slate-100 text-slate-300'}`}>
                                {d.active ? <CheckCircle2 size={16} /> : <span className="w-2 h-2 rounded-full bg-current" />}
                            </span>
                            <span className={`text-[11px] font-black ${isToday ? 'text-orange-500' : 'text-slate-400'}`}>{isToday ? 'Bugün' : DAY[new Date(d.day + 'T12:00:00').getDay()]}</span>
                        </div>
                    );
                })}
            </div>

            <div className="pt-3 border-t-2 border-slate-100 space-y-3">
                <h3 className="text-sm font-black text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Target size={16} className="text-emerald-500" /> Günlük görevler</span>
                    <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${doneCount === data.quests.length ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{doneCount}/{data.quests.length}</span>
                </h3>
                {data.quests.map((q) => {
                    const Icon = QUEST_ICON[q.key] || Target;
                    const done = q.progress >= q.goal;
                    return (
                        <div key={q.key} className="flex items-center gap-3">
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${done ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                                {done ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline gap-2 mb-1">
                                    <span className={`text-sm font-bold leading-tight ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{q.title}</span>
                                    <span className="text-xs font-bold text-slate-400 shrink-0">{q.progress}/{q.goal}</span>
                                </div>
                                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.max(q.progress > 0 ? 6 : 0, Math.min(100, (q.progress / q.goal) * 100))}%` }} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};

export default DailyQuests;
