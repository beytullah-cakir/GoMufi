import React from 'react';
import {
    Atom, BarChart3, Bird, Bot, Braces, Briefcase, Code2, Coffee, Cog, Cpu, Database, FileCode2, FileType,
    Gamepad2, Gem, Globe, Hash, Hexagon, Languages, Palette, Server, ShieldCheck, Smartphone, TrendingUp, Zap,
    type LucideIcon,
} from 'lucide-react';

/**
 * Veri dosyalarındaki (src/data/*.json) ikon adlarını ikonlara eşler.
 * Eskiden bu listeler emoji taşıyordu; emoji her cihazda farklı görünüyor ve
 * arayüzün geri kalanıyla uyuşmuyordu.
 */
const ICONS: Record<string, LucideIcon> = {
    code: Code2, 'file-code': FileCode2, braces: Braces, 'file-type': FileType, coffee: Coffee, hash: Hash,
    cpu: Cpu, zap: Zap, gem: Gem, bird: Bird, smartphone: Smartphone, server: Server, cog: Cog, atom: Atom,
    hexagon: Hexagon, database: Database, globe: Globe, chart: BarChart3, bot: Bot, gamepad: Gamepad2,
    palette: Palette, shield: ShieldCheck, trending: TrendingUp, briefcase: Briefcase, languages: Languages,
};

const NamedIcon: React.FC<{ name?: string | null; size?: number; className?: string }> = ({ name, size = 16, className = '' }) => {
    const Icon = ICONS[name || ''] || Code2;
    return <Icon size={size} className={className} aria-hidden="true" />;
};

export default NamedIcon;
