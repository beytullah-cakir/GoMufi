import React, { useEffect, useMemo, useState } from 'react';
import {
    Backpack, Brain, Check, Compass, Crosshair, Crown, Flame, Footprints, Gift, Lock, Mountain, Star, Target, Trophy, X,
} from 'lucide-react';
import api from '../../api';
import ChestImg from '../../assets/sprites/mufi/chest.webp';
import { LeagueIcon } from '../shared/LeagueBadge';
import { ChunkyButton, Mufi } from './ui';

/**
 * Ödül anları: seviye atlama, harita sandığı ve rozetler.
 *
 * XP sessizce artıyordu: öğrenci seviye atladığını ancak kahraman kartındaki
 * sayıya bakınca fark ediyordu. Artık her kazanım kendi anını yaşıyor; hepsi
 * sunucudaki gerçek veriden (seviye XP'den, rozet kayıtlardan, sandık ilerlemeden).
 */

// --- konfeti -----------------------------------------------------------------------

const CONFETTI_COLORS = ['#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#0ea5e9', '#facc15'];

export const Confetti: React.FC<{ count?: number }> = ({ count = 60 }) => {
    // Parçalar bir kez üretilir; her render'da yeniden karışmasın.
    const [pieces] = useState(() => Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        delay: Math.random() * 0.6,
        fall: 2.2 + Math.random() * 1.6,
        drift: (Math.random() - 0.5) * 240,
        spin: 360 + Math.random() * 540,
        round: i % 3 === 0,
    })));
    return (
        <div className="pointer-events-none fixed inset-0 overflow-hidden z-[1]" aria-hidden="true">
            {pieces.map((p, i) => (
                <span key={i} className="confetti-piece"
                      style={{
                          left: `${p.left}%`, background: p.color, borderRadius: p.round ? '999px' : undefined,
                          ['--delay' as string]: `${p.delay}s`, ['--fall' as string]: `${p.fall}s`,
                          ['--drift' as string]: `${p.drift}px`, ['--spin' as string]: `${p.spin}deg`,
                      }} />
            ))}
        </div>
    );
};

/** Arkada dönen ışık hüzmeleri (sandık ve seviye kutlamasında). */
const Rays: React.FC<{ color?: string }> = ({ color = 'rgba(250, 204, 21, 0.35)' }) => (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <div className="w-[26rem] h-[26rem] rounded-full animate-rays"
             style={{ background: `repeating-conic-gradient(${color} 0deg 12deg, transparent 12deg 30deg)`,
                      maskImage: 'radial-gradient(circle, black 30%, transparent 70%)',
                      WebkitMaskImage: 'radial-gradient(circle, black 30%, transparent 70%)' }} />
    </div>
);

const Overlay: React.FC<{ children: React.ReactNode; onClose: () => void; label: string }> = ({ children, onClose, label }) => {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);
    return (
        <div role="dialog" aria-modal="true" aria-label={label}
             className="fixed inset-0 z-[500] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            {children}
        </div>
    );
};

// --- seviye atlama -----------------------------------------------------------------

interface Progression {
    level: number;
    league?: { name: string; icon?: string; color?: string; tier_start_level?: number };
}

const readNumber = (key: string): number | null => {
    try {
        const raw = localStorage.getItem(key);
        return raw === null ? null : Number(raw);
    } catch { return null; }
};
const writeValue = (key: string, value: string) => {
    try { localStorage.setItem(key, value); } catch { /* yalnızca bu oturum */ }
};

/**
 * Seviye yükseldi mi? Son görülen seviye tarayıcıda, kullanıcıya özel tutulur.
 * İlk açılışta (kayıt yok) yalnızca not edilir: yeni cihazda eski seviyeler kutlanmaz.
 */
export const useLevelUp = (userId: unknown, progression: Progression | undefined) => {
    const [pending, setPending] = useState<Progression | null>(null);
    const level = progression?.level;
    useEffect(() => {
        if (userId == null || !level) return;
        const key = `gomufi.seenLevel.${userId}`;
        const seen = readNumber(key);
        if (seen === null || Number.isNaN(seen) || level < seen) {
            writeValue(key, String(level));
            return;
        }
        if (level > seen) {
            // Durum bir sonraki karede kurulur (effect içinde zincirleme render olmasın).
            const timer = setTimeout(() => setPending(progression ?? null), 0);
            return () => clearTimeout(timer);
        }
    }, [userId, level, progression]);
    const dismiss = () => {
        if (pending && userId != null) writeValue(`gomufi.seenLevel.${userId}`, String(pending.level));
        setPending(null);
    };
    return { levelUp: pending, dismiss };
};

export const LevelUpModal: React.FC<{ progression: Progression; onClose: () => void }> = ({ progression, onClose }) => {
    const league = progression.league;
    const newLeague = league?.tier_start_level === progression.level && progression.level > 1;
    return (
        <Overlay onClose={onClose} label="Seviye atladın">
            <Confetti />
            <div className="relative w-full max-w-sm animate-pop-in">
                <div className="relative bg-white rounded-[2rem] border-2 border-violet-200 border-b-[8px] px-6 pt-24 pb-6 text-center">
                    <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-56 h-44 flex items-center justify-center">
                        <Rays color="rgba(139, 92, 246, 0.28)" />
                        <div className="relative">
                            <Mufi pose="wave" className="w-36 animate-bob" />
                            <span className="absolute -right-3 bottom-2 w-14 h-14 rounded-2xl bg-amber-400 text-amber-950 border-b-4 border-amber-600 flex items-center justify-center text-2xl font-black font-display animate-pop-in">
                                {progression.level}
                            </span>
                        </div>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-violet-500">Seviye atladın!</p>
                    <h2 className="text-3xl font-black font-display text-slate-800 mt-1">Seviye {progression.level}</h2>
                    <p className="text-sm font-bold text-slate-500 mt-2">
                        Harika gidiyorsun! Her modül, her görev seni bir adım daha ileri taşıyor.
                    </p>
                    {league && (
                        <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-2xl border-2 font-black text-sm ${newLeague ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                            <LeagueIcon icon={league.icon} color={league.color} size={18} />
                            {newLeague ? `Yeni lig: ${league.name}!` : `${league.name} Lig`}
                        </div>
                    )}
                    <ChunkyButton size="lg" className="w-full mt-6" onClick={onClose}>Devam et</ChunkyButton>
                </div>
            </div>
        </Overlay>
    );
};

// --- harita sandıkları ---------------------------------------------------------------

export interface Chest {
    index: number;
    /** Sandıktan önceki son modülün kimliği (müfredat id'si) */
    after: string;
    ready: boolean;
    opened: boolean;
    xp: number | null;
}

/** Yoldaki sandık: kilitli (gri), hazır (sallanır, "Aç!") ya da açılmış (+XP). */
export const ChestMarker: React.FC<{ chest: Chest; onClick: () => void; className?: string }> = ({ chest, onClick, className = '' }) => {
    const label = chest.opened ? `Sandık açıldı: +${chest.xp ?? 0} XP` : chest.ready ? 'Ödül sandığı hazır, açmak için tıkla' : 'Ödül sandığı: önündeki modülleri bitirince açılır';
    return (
        <button type="button" onClick={onClick} aria-label={label} title={label}
                className={`group relative flex flex-col items-center ${className}`}>
            {chest.ready && !chest.opened && (
                <span className="absolute -top-7 px-2 py-0.5 rounded-lg bg-amber-400 text-amber-950 text-[11px] font-black border-b-2 border-amber-600 whitespace-nowrap animate-bob">Aç!</span>
            )}
            <span className="relative">
                {chest.ready && !chest.opened && <span className="absolute inset-0 -m-3 rounded-full bg-amber-300/50 blur-xl animate-pulse" />}
                <img src={ChestImg} alt="" draggable={false}
                     className={`relative w-16 drop-shadow-md transition-transform group-hover:scale-110 ${
                         chest.opened ? 'opacity-60 grayscale-[40%]' : chest.ready ? 'animate-chest-shake' : 'grayscale opacity-70'}`} />
                {!chest.ready && !chest.opened && (
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-500 text-white flex items-center justify-center border-2 border-white"><Lock size={12} /></span>
                )}
                {chest.opened && (
                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white"><Check size={13} strokeWidth={3} /></span>
                )}
            </span>
            {chest.opened && <span className="mt-1 text-[11px] font-black text-amber-600">+{chest.xp} XP</span>}
        </button>
    );
};

interface ChestResult { xp_awarded: number; xp: number }

/**
 * Sandığı açma anı. Hazır değilse ne gerektiğini, açıldıysa ne çıktığını söyler.
 * `onOpened` ilerlemeyi günceller; XP/seviye yenilemesi pencere kapanınca (`onClose`)
 * yapılır ki seviye kutlaması sandığın üstüne binmesin.
 */
export const ChestModal: React.FC<{
    courseId: string | number;
    chest: Chest;
    remaining: number;
    onOpened: (result: any) => void;
    onClose: (opened: boolean) => void;
}> = ({ courseId, chest, remaining, onOpened, onClose }) => {
    const [phase, setPhase] = useState<'idle' | 'opening' | 'open' | 'error'>(chest.opened ? 'open' : 'idle');
    const [xp, setXp] = useState<number | null>(chest.xp);
    const [error, setError] = useState<string | null>(null);

    const open = async () => {
        setPhase('opening');
        const started = Date.now();
        try {
            const res = await api.post<ChestResult>(`/progress/courses/${courseId}/chests/${chest.index}/open`);
            // Sallanma animasyonu görünsün: en az ~1 sn.
            await new Promise((r) => setTimeout(r, Math.max(0, 1000 - (Date.now() - started))));
            setXp(res.data.xp_awarded);
            setPhase('open');
            onOpened(res.data);
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Sandık açılamadı, tekrar dene.');
            setPhase('error');
        }
    };

    const close = () => onClose(phase === 'open' && !chest.opened);

    return (
        <Overlay onClose={close} label="Ödül sandığı">
            {phase === 'open' && !chest.opened && <Confetti />}
            <div className="relative w-full max-w-sm bg-white rounded-[2rem] border-2 border-amber-200 border-b-[8px] px-6 pb-6 pt-4 text-center animate-pop-in">
                <button type="button" onClick={close} aria-label="Kapat" className="absolute top-3 right-3 p-2 rounded-xl text-slate-400 hover:bg-slate-100"><X size={18} /></button>
                <div className="relative h-44 -mx-6 flex items-center justify-center overflow-hidden">
                    {(phase === 'open' || (chest.ready && phase !== 'error')) && <Rays />}
                    <img src={ChestImg} alt="" className={`relative w-36 drop-shadow-lg ${
                        phase === 'opening' ? 'animate-chest-shake' : phase === 'open' ? 'animate-pop-in' : !chest.ready ? 'grayscale opacity-70' : 'animate-bob'}`} />
                    {phase === 'open' && (
                        <span className="absolute top-2 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-amber-400 text-amber-950 border-b-4 border-amber-600 font-black text-2xl font-display animate-pop-in whitespace-nowrap">
                            +{xp ?? 0} XP
                        </span>
                    )}
                </div>
                {phase === 'open' ? (
                    <>
                        <h2 className="text-2xl font-black font-display text-slate-800">{chest.opened ? 'Bu sandığı açtın' : 'Hazine senin!'}</h2>
                        <p className="text-sm font-bold text-slate-500 mt-1">
                            {chest.opened ? `İçinden ${xp ?? 0} XP çıkmıştı. Sıradaki sandık seni bekliyor!` : 'Emeğinin karşılığı. Yolun devamında yeni sandıklar var!'}
                        </p>
                        <ChunkyButton size="lg" variant="amber" className="w-full mt-5" onClick={close}>Harika!</ChunkyButton>
                    </>
                ) : chest.ready ? (
                    <>
                        <h2 className="text-2xl font-black font-display text-slate-800">Ödül sandığı</h2>
                        <p className="text-sm font-bold text-slate-500 mt-1">Önündeki modüllerin hepsini bitirdin. İçinde ne var bakalım?</p>
                        {error && <p className="text-sm font-bold text-rose-600 mt-3">{error}</p>}
                        <ChunkyButton size="lg" variant="amber" className="w-full mt-5" disabled={phase === 'opening'} onClick={() => void open()}>
                            <Gift size={18} /> {phase === 'opening' ? 'Açılıyor…' : 'Sandığı aç'}
                        </ChunkyButton>
                    </>
                ) : (
                    <>
                        <h2 className="text-2xl font-black font-display text-slate-800">Kilitli sandık</h2>
                        <p className="text-sm font-bold text-slate-500 mt-1">
                            {remaining > 0 ? `${remaining} modül daha bitir, bu sandık açılsın.` : 'Önündeki modülleri bitirince açılır.'}
                        </p>
                        <ChunkyButton size="lg" variant="white" className="w-full mt-5" onClick={close}>Tamam</ChunkyButton>
                    </>
                )}
            </div>
        </Overlay>
    );
};

// --- rozetler ----------------------------------------------------------------------

export interface Badge {
    key: string;
    name: string;
    description: string;
    icon: string;
    tone: string;
    progress: number;
    goal: number;
    earned: boolean;
}

const BADGE_ICONS: Record<string, React.ElementType> = {
    footprints: Footprints, compass: Compass, star: Star, target: Target, crosshair: Crosshair, mountain: Mountain,
    flame: Flame, backpack: Backpack, gift: Gift, brain: Brain, trophy: Trophy, crown: Crown,
};
const BADGE_TONES: Record<string, string> = {
    violet: 'bg-violet-500 border-violet-700', amber: 'bg-amber-400 border-amber-600', green: 'bg-emerald-500 border-emerald-700',
    sky: 'bg-sky-500 border-sky-700', orange: 'bg-orange-500 border-orange-700', rose: 'bg-rose-500 border-rose-700',
};

export const useBadges = (reloadKey: unknown) => {
    const [badges, setBadges] = useState<Badge[] | null>(null);
    useEffect(() => {
        let alive = true;
        api.get('/progress/badges')
            .then((r) => { if (alive) setBadges(r.data?.badges || []); })
            .catch(() => { if (alive) setBadges([]); });
        return () => { alive = false; };
    }, [reloadKey]);
    return badges;
};

export const BadgeMedal: React.FC<{ badge: Badge; size?: 'md' | 'lg' }> = ({ badge, size = 'md' }) => {
    const Icon = BADGE_ICONS[badge.icon] || Trophy;
    const box = size === 'lg' ? 'w-20 h-20 rounded-[1.6rem]' : 'w-14 h-14 rounded-2xl';
    return (
        <span className={`${box} flex items-center justify-center border-b-4 shrink-0 ${
            badge.earned ? `${BADGE_TONES[badge.tone] || BADGE_TONES.violet} text-white` : 'bg-slate-100 border-slate-200 text-slate-300'}`}>
            {badge.earned ? <Icon size={size === 'lg' ? 36 : 26} strokeWidth={2.5} /> : <Lock size={size === 'lg' ? 28 : 20} />}
        </span>
    );
};

/** Profildeki rozet vitrini: kazanılanlar önde, kazanılmayanlarda ilerleme. */
export const BadgeGrid: React.FC<{ badges: Badge[] }> = ({ badges }) => {
    const sorted = useMemo(() => [...badges].sort((a, b) => Number(b.earned) - Number(a.earned)), [badges]);
    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sorted.map((b) => (
                <div key={b.key} title={b.description}
                     className={`rounded-2xl border-2 border-b-4 p-3 flex flex-col items-center text-center gap-2 ${b.earned ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'}`}>
                    <BadgeMedal badge={b} />
                    <div className="min-w-0 w-full">
                        <p className={`text-sm font-black leading-tight ${b.earned ? 'text-slate-800' : 'text-slate-400'}`}>{b.name}</p>
                        <p className="text-[11px] font-bold text-slate-400 leading-snug mt-0.5">{b.description}</p>
                    </div>
                    {!b.earned && b.goal > 1 && (
                        <div className="w-full">
                            <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                <div className="h-full rounded-full bg-violet-400" style={{ width: `${(b.progress / b.goal) * 100}%` }} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 mt-1">{b.progress}/{b.goal}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

/**
 * Yeni kazanılan rozetler. Görülenler tarayıcıda, kullanıcıya özel tutulur; ilk
 * açılışta (kayıt yok) kazanılmış olanlar yalnızca not edilir.
 */
export const useNewBadges = (userId: unknown, reloadKey: unknown) => {
    const badges = useBadges(reloadKey);
    const [queue, setQueue] = useState<Badge[]>([]);
    useEffect(() => {
        if (!badges || userId == null) return;
        const key = `gomufi.seenBadges.${userId}`;
        let seen: string[] | null = null;
        try { seen = JSON.parse(localStorage.getItem(key) || 'null'); } catch { seen = null; }
        const earned = badges.filter((b) => b.earned);
        if (!Array.isArray(seen)) {
            writeValue(key, JSON.stringify(earned.map((b) => b.key)));
            return;
        }
        const known = new Set(seen);
        const fresh = earned.filter((b) => !known.has(b.key));
        if (!fresh.length) return;
        writeValue(key, JSON.stringify([...known, ...fresh.map((b) => b.key)]));
        const timer = setTimeout(() => setQueue((q) => [...q, ...fresh.filter((b) => !q.some((x) => x.key === b.key))]), 0);
        return () => clearTimeout(timer);
    }, [badges, userId]);
    return { badge: queue[0] ?? null, next: () => setQueue((q) => q.slice(1)) };
};

export const NewBadgeModal: React.FC<{ badge: Badge; onClose: () => void; onSeeAll?: () => void }> = ({ badge, onClose, onSeeAll }) => (
    <Overlay onClose={onClose} label="Yeni rozet">
        <Confetti count={40} />
        <div className="relative w-full max-w-xs bg-white rounded-[2rem] border-2 border-slate-200 border-b-[8px] px-6 pb-6 pt-8 text-center animate-pop-in">
            <div className="relative h-28 -mx-6 flex items-center justify-center overflow-hidden">
                <Rays color="rgba(250, 204, 21, 0.3)" />
                <span className="relative animate-pop-in"><BadgeMedal badge={badge} size="lg" /></span>
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-amber-500 mt-2">Yeni rozet!</p>
            <h2 className="text-2xl font-black font-display text-slate-800">{badge.name}</h2>
            <p className="text-sm font-bold text-slate-500 mt-1">{badge.description}</p>
            <div className="flex gap-2 mt-5">
                {onSeeAll && <ChunkyButton variant="white" className="flex-1" onClick={() => { onClose(); onSeeAll(); }}>Rozetlerim</ChunkyButton>}
                <ChunkyButton className="flex-1" onClick={onClose}>Süper!</ChunkyButton>
            </div>
        </div>
    </Overlay>
);

/**
 * Öğrenci panelinin kutlama katmanı: seviye atlama ve yeni rozet.
 * `userData` her yenilendiğinde (XP değişince) iki şey de yeniden bakılır.
 */
export const StudentCelebrations: React.FC<{ userData: any; onSeeBadges?: () => void; paused?: boolean }> = ({ userData, onSeeBadges, paused }) => {
    const userId = userData?.user_id;
    const { levelUp, dismiss } = useLevelUp(userId, userData?.progression);
    const { badge, next } = useNewBadges(userId, userData?.xp);
    if (paused) return null;
    if (levelUp) return <LevelUpModal progression={levelUp} onClose={dismiss} />;
    if (badge) return <NewBadgeModal badge={badge} onClose={next} onSeeAll={onSeeBadges} />;
    return null;
};
