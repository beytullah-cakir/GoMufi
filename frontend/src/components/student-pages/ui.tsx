import React, { useState } from 'react';
import MufiWave from '../../assets/sprites/mufi/wave.webp';
import MufiPeek from '../../assets/sprites/mufi/peek.webp';
import MufiSleep from '../../assets/sprites/mufi/sleep.webp';
import MufiBuild from '../../assets/sprites/mufi/build.webp';

/**
 * Öğrenci sayfalarının ortak parçaları — açılış sayfasındaki dil:
 * kalın alt kenarlı "basılabilir" kartlar ve butonlar, mor ana renk, her boş
 * ekranda Mufi. Eskiden her sayfa kendi renk geçişini ve buton stilini
 * seçiyordu; yeni bir öğrenci ekranı buradan başlamalı.
 *
 * Renk sözlüğü: mor = ana eylem, yeşil = başarı/ilerleme, sarı = XP,
 * turuncu = seri, gök mavisi = bilgi.
 */

export type MufiPose = 'wave' | 'peek' | 'sleep' | 'build';
const POSES: Record<MufiPose, string> = { wave: MufiWave, peek: MufiPeek, sleep: MufiSleep, build: MufiBuild };

export const Mufi: React.FC<{ pose?: MufiPose; className?: string }> = ({ pose = 'wave', className = 'w-24' }) => (
    <img src={POSES[pose]} alt="" aria-hidden="true" draggable={false} className={`select-none pointer-events-none ${className}`} />
);

/** Kart: beyaz, 2px kenar, 4px alt kenar. `tone` yalnızca vurgulu kartlar için. */
export const Card: React.FC<React.HTMLAttributes<HTMLElement> & { as?: 'section' | 'div' | 'aside' }> = ({
    as: Tag = 'section', className = '', children, ...rest
}) => (
    <Tag className={`bg-white rounded-3xl border-2 border-slate-200 border-b-4 ${className}`} {...rest}>{children}</Tag>
);

const TILE: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-600',
    green: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    orange: 'bg-orange-100 text-orange-600',
    sky: 'bg-sky-100 text-sky-600',
    rose: 'bg-rose-100 text-rose-600',
    slate: 'bg-slate-100 text-slate-500',
};
export type Tone = keyof typeof TILE;

/** Renkli ikon karesi (öğretmen panelindeki istatistik kartlarıyla aynı dil). */
export const IconTile: React.FC<{ icon: React.ElementType; tone?: Tone; size?: 'sm' | 'md' | 'lg' }> = ({
    icon: Icon, tone = 'violet', size = 'md',
}) => {
    const box = size === 'sm' ? 'w-8 h-8 rounded-xl' : size === 'lg' ? 'w-14 h-14 rounded-2xl' : 'w-10 h-10 rounded-xl';
    const px = size === 'sm' ? 16 : size === 'lg' ? 26 : 20;
    return <span className={`${box} ${TILE[tone]} flex items-center justify-center shrink-0`}><Icon size={px} strokeWidth={2.5} /></span>;
};

/** Kart başlığı: ikon karesi + başlık (+ sağda isteğe bağlı parça). Tümü aynı yazım: cümle düzeni. */
export const CardTitle: React.FC<{ icon: React.ElementType; tone?: Tone; children: React.ReactNode; hint?: React.ReactNode; right?: React.ReactNode }> = ({
    icon, tone, children, hint, right,
}) => (
    <div className="flex items-center gap-3 mb-4">
        <IconTile icon={icon} tone={tone} size="sm" />
        <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-slate-800 leading-tight">{children}</h3>
            {hint && <p className="text-xs font-bold text-slate-400 mt-0.5">{hint}</p>}
        </div>
        {right}
    </div>
);

const BTN: Record<string, string> = {
    primary: 'bg-violet-500 hover:bg-violet-600 text-white border-violet-700',
    green: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700',
    white: 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 border-2',
    amber: 'bg-amber-400 hover:bg-amber-300 text-amber-950 border-amber-600',
    ghost: 'bg-white/20 hover:bg-white/30 text-white border-black/10',
};

/** Basılabilir buton: alt kenar tıklayınca içeri göçer (açılış sayfasındaki gibi). */
export const ChunkyButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: keyof typeof BTN; size?: 'sm' | 'md' | 'lg';
}> = ({ variant = 'primary', size = 'md', className = '', children, ...rest }) => {
    const pad = size === 'sm' ? 'px-3 py-2 text-xs' : size === 'lg' ? 'px-6 py-4 text-base' : 'px-4 py-3 text-sm';
    return (
        <button
            type="button"
            className={`inline-flex items-center justify-center gap-2 rounded-2xl font-black border-b-4 active:border-b-0 active:translate-y-1 transition-all duration-75 disabled:opacity-50 disabled:pointer-events-none ${BTN[variant]} ${pad} ${className}`}
            {...rest}
        >
            {children}
        </button>
    );
};

/** Sayfa başlığı: büyük başlık, tek satırlık açıklama, isteğe bağlı Mufi ve sağ parça. */
export const PageHeader: React.FC<{ title: string; subtitle?: string; pose?: MufiPose; right?: React.ReactNode }> = ({
    title, subtitle, pose, right,
}) => (
    <header className="flex items-end justify-between gap-4 mb-6">
        <div className="flex items-end gap-3 min-w-0">
            {pose && <Mufi pose={pose} className="w-14 md:w-16 -mb-1 shrink-0" />}
            <div className="min-w-0">
                <h1 className="text-2xl md:text-3xl font-black font-display text-slate-800 tracking-tight">{title}</h1>
                {subtitle && <p className="text-sm font-bold text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        {right}
    </header>
);

/** Boş durum: Mufi + olumlu bir cümle + (varsa) tek bir sonraki adım. */
export const MufiEmpty: React.FC<{ pose?: MufiPose; title: string; text?: React.ReactNode; action?: React.ReactNode; compact?: boolean }> = ({
    pose = 'peek', title, text, action, compact,
}) => (
    <div className={`flex flex-col items-center text-center ${compact ? 'py-4 gap-2' : 'py-10 gap-3'}`}>
        <Mufi pose={pose} className={compact ? 'w-16' : 'w-28'} />
        <p className={`font-black text-slate-700 ${compact ? 'text-sm' : 'text-lg'}`}>{title}</p>
        {text && <p className="text-sm font-bold text-slate-400 max-w-sm">{text}</p>}
        {action && <div className="mt-1">{action}</div>}
    </div>
);

/** Noktalı arka plan (açılış sayfasındaki desen) — renkli kahraman kartlarının üstüne. */
export const DOTS_STYLE: React.CSSProperties = {
    backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 1.5px, transparent 1.5px)',
    backgroundSize: '18px 18px',
};

const TIPS = [
    'Hata mesajının son satırı genelde en önemlisidir. Önce onu oku!',
    'Kodun çalışmadıysa bir satırını yorum yapıp tekrar dene; sorunu daraltırsın.',
    'Takıldığında 10 dakikadan fazla bekleme: Soru Sor\'dan öğretmenine yaz.',
    'Her gün biraz çalışmak, haftada bir çok çalışmaktan daha kalıcıdır.',
    'Değişkenlere anlamlı isimler ver: x yerine yas, toplam_puan gibi.',
    'Bir görevi bitirince "Tekrar et" ile yıldızlarını 3\'e tamamlayabilirsin.',
    'print() en iyi dedektif arkadaşın: değerleri ekrana yazdırıp kontrol et.',
];

/** Sağ sütunun her zaman dolu olan kartı: günün ipucu (gün boyunca aynı kalır). */
export const MufiTipCard: React.FC = () => {
    const [tip] = useState(() => TIPS[Math.floor(Date.now() / 86_400_000) % TIPS.length]);
    return (
        <Card className="p-4 bg-gradient-to-br from-violet-50 to-white">
            <div className="flex items-start gap-3">
                <Mufi pose="peek" className="w-14 shrink-0" />
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-wider text-violet-500">Mufi'nin ipucu</p>
                    <p className="text-sm font-bold text-slate-600 mt-1">{tip}</p>
                </div>
            </div>
        </Card>
    );
};
