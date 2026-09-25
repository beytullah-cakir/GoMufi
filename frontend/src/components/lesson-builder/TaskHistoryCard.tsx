import React, { useEffect, useState } from 'react';
import { BarChart3, ExternalLink } from 'lucide-react';
import { learningApi, type TaskDetail } from '../instructor-pages/learning/learningApi';

/**
 * Ders oluşturucuda: bu görev sınıfta nasıl gitti?
 *
 * Öğretmen görevi düzenlerken önceki uygulamanın sonucunu görür: kaç kişi
 * başladı, kaçı çözdü, en çok hangi ölçüt düştü. Görevi veriye bakarak
 * iyileştirmek için (ör. yönergeyi netleştirmek, ipucu eklemek).
 * Görev henüz kaydedilmediyse ya da kimse denemediyse hiçbir şey göstermez.
 */
const TaskHistoryCard: React.FC<{ courseId?: number | string; taskKey?: string }> = ({ courseId, taskKey }) => {
    const [data, setData] = useState<TaskDetail | null>(null);

    useEffect(() => {
        if (!courseId || !taskKey) return;
        let alive = true;
        learningApi.task(Number(courseId), taskKey)
            .then((d) => { if (alive) setData(d); })
            .catch(() => { if (alive) setData(null); });
        return () => { alive = false; };
    }, [courseId, taskKey]);

    if (!data || data.task_key !== taskKey || data.started === 0) return null;
    const pct = (v: number) => `%${Math.round(v * 100)}`;
    const top = data.top_failures[0];

    return (
        <div className="bg-white border-2 border-indigo-100 border-b-[5px] rounded-2xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                    <BarChart3 size={13} /> Sınıfta nasıl gitti?
                </span>
                <a href={`/instructor/learning?course=${courseId}&task=${encodeURIComponent(taskKey || '')}`} target="_blank" rel="noreferrer"
                   className="text-[10.5px] font-black text-indigo-500 hover:underline flex items-center gap-0.5">
                    Ayrıntı <ExternalLink size={10} />
                </a>
            </div>
            <p className="text-xs font-bold text-slate-600">
                {data.started} öğrenci başladı · {data.solved} çözdü ({pct(data.solve_rate)}) · ilk denemede {pct(data.first_try_rate)}
                {data.median_attempts !== null && ` · medyan ${data.median_attempts} deneme`}
                {data.stuck > 0 && <span className="text-rose-600"> · {data.stuck} takıldı</span>}
            </p>
            {top && (
                <p className="text-xs text-rose-700">
                    En çok düşen: <b>{top.label}</b> ({top.students} öğrenci)
                </p>
            )}
            {data.top_misconceptions[0] && (
                <p className="text-xs text-violet-700">Sık yanılgı: {data.top_misconceptions[0].label}</p>
            )}
            {(data.solve_rate < 0.5 || (top && top.students >= Math.max(2, data.started / 3))) && (
                <p className="text-[10.5px] font-bold text-slate-500">
                    Öneri: bu ölçütü yönergede daha açık yaz ya da bir ipucu ekle.
                </p>
            )}
        </div>
    );
};

export default TaskHistoryCard;
