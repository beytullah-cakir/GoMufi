import React from 'react';
import { FileCode2, Rocket, Ruler, type LucideIcon } from 'lucide-react';

/** Öğrenci ana sayfasındaki kurs simgesi (kurs adından seçilir: StudentApp). */
const ICONS: Record<string, LucideIcon> = { python: FileCode2, math: Ruler, rocket: Rocket };

const CourseIcon: React.FC<{ name?: string; size?: number; className?: string }> = ({ name, size = 24, className = '' }) => {
    const Icon = ICONS[name || ''] || Rocket;
    return <Icon size={size} className={className} aria-hidden="true" />;
};

export default CourseIcon;
