import React from 'react';
import { Medal } from 'lucide-react';

/** Sıralamada ilk üç için madalya ikonu (altın, gümüş, bronz); diğer sıralarda hiçbir şey. */
const COLORS: Record<number, string> = { 1: 'text-amber-400', 2: 'text-slate-400', 3: 'text-orange-600' };

const RankMedal: React.FC<{ rank: number; size?: number; className?: string }> = ({ rank, size = 18, className = '' }) => {
    const color = COLORS[rank];
    if (!color) return null;
    return <Medal size={size} className={`${color} ${className}`} aria-label={`${rank}. sıra`} />;
};

export default RankMedal;
