import React from 'react';
import { Database } from 'lucide-react';

/**
 * Programlama dili / teknoloji logosu. SVG'ler devicon projesinden
 * (MIT, src/assets/tech/LICENSE-devicon); yalnızca kullanılanlar kopyalandı —
 * paketin tamamı 136 MB. Logosu olmayan (ör. SQL, marka değil) genel ikonla gösterilir.
 */
const LOGOS = import.meta.glob('../../assets/tech/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

const logoFor = (slug: string) => LOGOS[`../../assets/tech/${slug}.svg`];

const TechIcon: React.FC<{ slug?: string | null; label: string; size?: number; className?: string }> = ({ slug, label, size = 16, className = '' }) => {
    const src = slug ? logoFor(slug) : undefined;
    if (!src) return <Database size={size} className={`text-slate-500 ${className}`} aria-hidden="true" />;
    // Adı hemen yanında yazıyor: logo süsleme (ekran okuyucu adı iki kez okumasın).
    return <img src={src} alt="" title={label} width={size} height={size} className={`inline-block shrink-0 ${className}`} loading="lazy" />;
};

export default TechIcon;
