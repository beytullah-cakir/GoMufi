import React from 'react';
import { Brain, ChevronDown, Flame, Play, Radio } from 'lucide-react';
import type { CourseData, PathNode } from '../../types';
import CourseIcon from '../shared/CourseIcon';
import { LeagueIcon } from '../shared/LeagueBadge';
import type { Activity } from './DailyQuests';
import type { HomeworkItem } from './studentFeed';
import { dueLabel } from './studentFeed';
import { ChunkyButton, DOTS_STYLE, Mufi } from './ui';

/**
 * Ana sayfanın kahraman alanı: Mufi öğrenciyi adıyla karşılar ve DURUMA göre
 * konuşur (canlı ders, yaklaşan ödev, seri, sıradaki modül). Eskiden bu alanda
 * boyu ve rengi farklı dört kutu vardı; öğrenci "şimdi ne yapmalıyım" sorusunun
 * cevabını aramak zorundaydı. Artık tek cümle ve tek büyük buton.
 */

export interface MufiLine { title: string; text: string }

export const mufiLine = (opts: {
    name: string;
    live: boolean;
    nextNode?: PathNode;
    allDone: boolean;
    someLocked: boolean;
    activity: Activity | null;
    homework: HomeworkItem[];
    completedAny: boolean;
}): MufiLine => {
    const hi = `Merhaba ${opts.name}!`;
    if (opts.live) return { title: 'Ders başladı!', text: 'Öğretmenin canlı derste seni bekliyor. Hadi katıl!' };
    const urgent = opts.homework
        .filter((h) => !h.submitted && h.due && h.due.getTime() > Date.now() && h.due.getTime() - Date.now() < 2 * 86_400_000)
        .sort((a, b) => a.due!.getTime() - b.due!.getTime())[0];
    if (urgent) return { title: hi, text: `“${urgent.title}” ödevine ${dueLabel(urgent.due)?.text.replace(' kaldı', '')} kaldı. Unutmayalım!` };
    const streak = opts.activity?.streak ?? 0;
    if (opts.activity?.active_today) return { title: `Süpersin ${opts.name}!`, text: `Bugün çalıştın, ${streak} günlük serin güvende. İstersen bir modül daha?` };
    if (streak > 0) return { title: hi, text: `${streak} günlük serin var! Bugün bir modül bitirip koruyalım.` };
    if (opts.allDone) {
        return opts.someLocked
            ? { title: `Harika iş ${opts.name}!`, text: 'Açık modüllerin hepsini bitirdin. Öğretmenin yenisini açınca haber veririm.' }
            : { title: `Tebrikler ${opts.name}!`, text: 'Kursu bitirdin! İstediğin modülü tekrar edebilirsin.' };
    }
    if (!opts.completedAny) return { title: `Hoş geldin ${opts.name}!`, text: 'İlk modülünle maceraya başlayalım. Ben de yanındayım!' };
    return { title: hi, text: `Kaldığın yerden devam edelim${opts.nextNode ? `: ${opts.nextNode.title}` : ''}.` };
};

interface Props {
    line: MufiLine;
    course: CourseData;
    courses: Record<string, CourseData>;
    onPickCourse: (id: string) => void;
    userData: any;
    activity: Activity | null;
    nextNode?: PathNode;
    onContinue: () => void;
    live: boolean;
    onJoinLive: () => void;
    onOpenConcepts: () => void;
    /** Sağ üstteki araçlar: VS Code durumu ve bildirim zili. */
    tools: React.ReactNode;
}

const HomeHero: React.FC<Props> = ({
    line, course, courses, onPickCourse, userData, activity, nextNode, onContinue, live, onJoinLive, onOpenConcepts, tools,
}) => {
    const [pickerOpen, setPickerOpen] = React.useState(false);
    const pickerRef = React.useRef<HTMLDivElement>(null);
    React.useEffect(() => {
        if (!pickerOpen) return;
        const close = (e: MouseEvent) => { if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false); };
        document.addEventListener('mousedown', close);
        return () => document.removeEventListener('mousedown', close);
    }, [pickerOpen]);

    const courseList = Object.values(courses);
    const progression = userData?.progression;
    const streak = activity?.streak ?? userData?.streak ?? 0;

    return (
        <section className="relative rounded-[2rem] bg-gradient-to-br from-violet-500 via-violet-500 to-fuchsia-500 text-white border-b-8 border-violet-700/50 shadow-lg shadow-violet-200/60">
            <div className="absolute inset-0 rounded-[2rem] pointer-events-none" style={DOTS_STYLE} />
            <div className="relative p-4 md:p-6 flex flex-col gap-4">
                {/* Üst satır: kurs seçimi + araçlar */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative" ref={pickerRef}>
                        <button type="button" onClick={() => courseList.length > 1 && setPickerOpen((v) => !v)}
                                aria-haspopup="listbox" aria-expanded={pickerOpen}
                                className={`inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-white/15 border-2 border-white/20 text-sm font-black max-w-[52vw] sm:max-w-[70vw] ${courseList.length > 1 ? 'hover:bg-white/25' : 'cursor-default'}`}>
                            <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-violet-600 shrink-0"><CourseIcon name={course.icon} size={16} /></span>
                            <span className="truncate">{course.title}</span>
                            {courseList.length > 1 && <ChevronDown size={16} className="opacity-80 shrink-0" />}
                        </button>
                        {pickerOpen && (
                            <div role="listbox" className="absolute left-0 top-[calc(100%+6px)] z-[120] w-64 bg-white text-slate-700 rounded-2xl border-2 border-slate-200 border-b-4 shadow-xl overflow-hidden">
                                {courseList.map((c) => (
                                    <button key={c.id} type="button" role="option" aria-selected={c.id === course.id}
                                            onClick={() => { onPickCourse(c.id); setPickerOpen(false); }}
                                            className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm font-black hover:bg-violet-50 ${c.id === course.id ? 'bg-violet-50 text-violet-700' : ''}`}>
                                        <CourseIcon name={c.icon} size={18} className="text-violet-500" />
                                        <span className="truncate">{c.title}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="ml-auto flex items-center gap-2">{tools}</div>
                </div>

                {/* Mufi ve konuşma balonu */}
                <div className="flex items-end gap-3 md:gap-5">
                    <Mufi pose="wave" className="w-20 md:w-28 shrink-0 -mb-2 animate-bob drop-shadow-lg" />
                    <div className="relative bg-white text-slate-800 rounded-3xl rounded-bl-md px-4 py-3 md:px-5 md:py-4 shadow-md max-w-xl mb-3">
                        <span className="absolute -left-2 bottom-3 w-4 h-4 bg-white rotate-45 rounded-sm" aria-hidden="true" />
                        <p className="relative text-lg md:text-2xl font-black font-display leading-tight">{line.title}</p>
                        <p className="relative text-sm md:text-base font-bold text-slate-500 mt-0.5">{line.text}</p>
                    </div>
                </div>

                {/* Alt satır: seviye/XP, seri, kazanımlar · devam et */}
                <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-3 bg-white/15 border-2 border-white/20 rounded-2xl px-3 py-2 min-w-0 flex-1 sm:flex-none sm:min-w-[210px]">
                            <span className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 font-black flex items-center justify-center shrink-0 border-b-4 border-amber-600" title="Seviye">
                                {progression?.level ?? 1}
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2 text-xs font-black">
                                    <span>{(userData?.xp ?? 0).toLocaleString('tr-TR')} XP</span>
                                    <span className="flex items-center gap-1 text-white/80">
                                        <LeagueIcon icon={progression?.league?.icon} color="#fff" size={12} />{progression?.league?.name ?? 'Bronz'}
                                    </span>
                                </div>
                                <div className="h-2 mt-1 rounded-full bg-black/15 overflow-hidden">
                                    <div className="h-full rounded-full bg-amber-300" style={{ width: `${Math.max(4, Math.min(100, progression?.progress_pct ?? 0))}%` }} />
                                </div>
                            </div>
                        </div>
                        <div className={`shrink-0 flex items-center gap-1.5 rounded-2xl px-3 py-2 border-2 font-black text-sm ${activity?.active_today ? 'bg-orange-400 border-orange-500' : 'bg-white/15 border-white/20'}`}
                             title={activity?.active_today ? 'Bugün serini korudun' : 'Bugün bir modül bitir, seri devam etsin'}>
                            <Flame size={18} className={activity?.active_today ? 'fill-amber-200' : ''} /> {streak} gün
                        </div>
                        <button type="button" onClick={onOpenConcepts} aria-label="Kazanımlarım" title="Neyi öğrendin, neye çalışmalısın?"
                                className="shrink-0 flex items-center gap-1.5 rounded-2xl px-3 py-2 border-2 border-white/20 bg-white/15 hover:bg-white/25 font-black text-sm">
                            <Brain size={18} /> <span className="hidden sm:inline">Kazanımlarım</span>
                        </button>
                    </div>

                    <div className="lg:ml-auto">
                        {live ? (
                            <ChunkyButton variant="green" size="lg" onClick={onJoinLive} className="w-full lg:w-auto">
                                <Radio size={20} className="animate-pulse" /> Canlı derse katıl
                            </ChunkyButton>
                        ) : nextNode ? (
                            <button type="button" onClick={onContinue}
                                    className="w-full lg:w-auto flex items-center gap-3 bg-white text-violet-700 rounded-2xl pl-3 pr-5 py-2.5 border-b-4 border-violet-200 active:border-b-0 active:translate-y-1 transition-all duration-75 text-left">
                                <span className="w-10 h-10 rounded-xl bg-violet-500 text-white flex items-center justify-center shrink-0 border-b-4 border-violet-700"><Play size={18} className="fill-current ml-0.5" /></span>
                                <span className="min-w-0">
                                    <span className="block text-[11px] font-black uppercase tracking-wider text-violet-400">Devam et · {nextNode.stage || 'Modül'}</span>
                                    <span className="block font-black font-display text-base truncate max-w-[240px]">{nextNode.title}</span>
                                </span>
                            </button>
                        ) : null}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default HomeHero;
