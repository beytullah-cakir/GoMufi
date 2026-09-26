import React from 'react';
import {
    BarChart3, Bot, Briefcase, Code2, Database, Gamepad2, Globe, Languages, Palette, ShieldCheck, Smartphone,
    TrendingUp, type LucideIcon,
} from 'lucide-react';

/**
 * Kurs kategorilerinin (src/data/categories.json) ikon adlarını ikonlara eşler.
 * Programlama dillerinin gerçek logoları için: TechIcon.
 */
const ICONS: Record<string, LucideIcon> = {
    code: Code2, globe: Globe, smartphone: Smartphone, chart: BarChart3, bot: Bot, gamepad: Gamepad2,
    database: Database, palette: Palette, shield: ShieldCheck, trending: TrendingUp, briefcase: Briefcase,
    languages: Languages,
};

const NamedIcon: React.FC<{ name?: string | null; size?: number; className?: string }> = ({ name, size = 16, className = '' }) => {
    const Icon = ICONS[name || ''] || Code2;
    return <Icon size={size} className={className} aria-hidden="true" />;
};

export default NamedIcon;
