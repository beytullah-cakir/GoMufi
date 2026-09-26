import React from 'react';
import { Crown, Gem, Medal, Shield, type LucideIcon } from 'lucide-react';

/** Lig ikonu: sunucu ikon adını ve rengi gönderir (backend/core/gamification.py LEAGUES). */
const ICONS: Record<string, LucideIcon> = { medal: Medal, shield: Shield, gem: Gem, crown: Crown };

export const LeagueIcon: React.FC<{ icon?: string | null; color?: string | null; size?: number; className?: string }> = ({
    icon, color, size = 14, className = '',
}) => {
    const Icon = ICONS[icon || ''] || Medal;
    return <Icon size={size} className={className} style={{ color: color || '#cd7f32' }} aria-hidden="true" />;
};
