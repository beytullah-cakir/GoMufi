import React from 'react';

/**
 * Baş harflerden avatar. Eskiden dicebear.com'dan resim çekiliyordu: okul ağında
 * engellenince kırık resim görünüyordu ve öğrencinin adı üçüncü bir hizmete
 * gidiyordu (KVKK). Renk addan türetilir, her seferinde aynı çıkar.
 */
const TONES = ['bg-sky-100 text-sky-700', 'bg-violet-100 text-violet-700', 'bg-emerald-100 text-emerald-700',
    'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-indigo-100 text-indigo-700'];

const InitialsAvatar: React.FC<{ name?: string | null; className?: string }> = ({ name, className = 'w-10 h-10 rounded-lg' }) => {
    const clean = (name || '?').trim();
    const initials = clean.split(/\s+/).slice(0, 2).map((p) => p.charAt(0).toLocaleUpperCase('tr-TR')).join('') || '?';
    let hash = 0;
    for (const ch of clean) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
    return (
        <span className={`inline-flex items-center justify-center font-black select-none shrink-0 ${TONES[hash % TONES.length]} ${className}`} aria-hidden="true">
            {initials}
        </span>
    );
};

export default InitialsAvatar;
