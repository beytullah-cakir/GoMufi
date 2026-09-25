import api from '../api';
import type { Rubric, RubricCriterion } from '../components/lesson-builder/types';

/**
 * Dereceli puanlama anahtarı: hesaplama ve öğretmen kütüphanesi.
 * Not hesabı sunucudakiyle aynı (backend/homework_rules.py: rubric_grade).
 */

export type RubricScores = Record<string, number>;

export interface RubricTemplate {
    id: number;
    title: string;
    criteria: RubricCriterion[];
    created_at: string | null;
}

/** Seçilen seviyelerden 100 üzerinden not; eksik ölçüt varsa null. */
export const rubricGrade = (rubric: Rubric | null | undefined, scores: RubricScores | null | undefined): number | null => {
    if (!rubric?.criteria.length || !scores) return null;
    let earned = 0;
    let max = 0;
    for (const c of rubric.criteria) {
        const top = Math.max(...c.levels.map((l) => l.points));
        max += top;
        const index = scores[c.id];
        if (index === undefined || index < 0 || index >= c.levels.length) return null;
        earned += c.levels[index].points;
    }
    return max > 0 ? Math.round((100 * earned) / max) : null;
};

export const newCriterionId = () => `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const LEVELS = [
    { label: 'Başlangıç', points: 1 },
    { label: 'Gelişmekte', points: 2 },
    { label: 'Yeterli', points: 3 },
    { label: 'İleri', points: 4 },
];

/** Boş bir anahtar yerine makul bir başlangıç: öğretmen düzenler. */
export const starterRubric = (kind: 'code' | 'text' | 'file' | 'image' = 'code'): Rubric => {
    const rows: Array<[string, string]> = kind === 'code'
        ? [
            ['Doğruluk', 'Program istenen sonucu üretiyor, hatasız çalışıyor.'],
            ['Yönergeye uygunluk', 'İstenen yapıları ve adımları kullanıyor.'],
            ['Okunabilirlik', 'Değişken adları anlamlı, kod düzenli.'],
        ]
        : [
            ['İçerik', 'Konuyu doğru ve eksiksiz ele alıyor.'],
            ['Açıklık', 'Anlatım anlaşılır ve düzenli.'],
            ['Yönergeye uygunluk', 'İstenen bütün maddeleri karşılıyor.'],
        ];
    return {
        criteria: rows.map(([title, description], i) => ({
            id: `k${i + 1}`, title, description, levels: LEVELS.map((l) => ({ ...l })),
        })),
    };
};

export const rubricApi = {
    list: () => api.get<{ rubrics: RubricTemplate[] }>('/rubrics').then((r) => r.data.rubrics),
    save: (title: string, rubric: Rubric) =>
        api.post<{ rubric: RubricTemplate }>('/rubrics', { title, criteria: rubric.criteria }).then((r) => r.data.rubric),
    remove: (id: number) => api.delete(`/rubrics/${id}`).then((r) => r.data),
};
