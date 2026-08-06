import type { Assignment, Course } from './types';

/**
 * Kurs verisinden ödevleri çıkarır.
 *
 * VERİ YAPISI (gerçek veriden doğrulandı):
 *   curriculum düğümü  { id: 'sec_ai_671844489', theme: 'homework', title, xp }
 *        ↓ AYNI id ile
 *   notes destesi      { id: 'sec_ai_671844489', slides: [...] }
 *        ↓
 *   ödev slaydı        { type: 'homework', id: 498466736, homeworkConfig: {...} }
 *
 * TESLİM ANAHTARI ödev SLAYDININ id'sidir, düğümün değil. Tarayıcı tarafı da
 * aynısını kullanıyor (StudentHomeworkView `slide.id` gönderiyor); farklı bir
 * anahtar seçilirse eklentiden gelen teslimler tarayıcıdakilerle eşleşmez ve
 * öğretmen ikisini ayrı ödev olarak görür.
 */

/** Kaçmış `\n` dizilerini gerçek satır sonuna çevirir (eski kayıtlar için). */
const normalizeText = (t: unknown): string =>
    String(t ?? '')
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');

export function findAssignments(courses: Course[]): Assignment[] {
    const out: Assignment[] = [];

    for (const course of courses) {
        const curriculum = Array.isArray(course.curriculum) ? course.curriculum : [];
        const notes = Array.isArray(course.notes) ? course.notes : [];
        if (!notes.length) continue;

        const decksById = new Map<string, any>();
        for (const deck of notes) {
            if (deck && deck.id !== undefined) decksById.set(String(deck.id), deck);
        }

        for (const node of curriculum) {
            if (!node || node.theme !== 'homework') continue;

            // Düğümle aynı id'li deste; bazı kurslarda ayrıca noteId de bulunur.
            const deck = decksById.get(String(node.id)) ??
                (node.noteId !== undefined && node.noteId !== null
                    ? decksById.get(String(node.noteId))
                    : undefined);
            if (!deck) continue;

            const slides = Array.isArray(deck.slides) ? deck.slides : [];
            for (const slide of slides) {
                if (slide?.type !== 'homework') continue;
                const cfg = slide.homeworkConfig ?? {};

                out.push({
                    courseId: course.id,
                    courseTitle: course.title,
                    nodeId: String(slide.id),
                    title: cfg.title || node.title || 'Ödev',
                    instructions: normalizeText(cfg.instructions),
                    submissionType: cfg.submissionType || 'text',
                    points: Number(cfg.points) || 100,
                    starterCode: cfg.starterCode ? normalizeText(cfg.starterCode) : undefined,
                });
            }
        }
    }

    return out;
}

/** Teslim türüne göre cevap dosyasının adı ve MIME'ı. */
export function answerFileFor(type: Assignment['submissionType']): { name: string; mime: string } {
    switch (type) {
        case 'code':
            return { name: 'cevap.py', mime: 'text/x-python' };
        case 'text':
            return { name: 'cevap.txt', mime: 'text/plain' };
        default:
            // image/file türlerinde öğrenci kendi dosyasını seçer; bu yalnızca varsayılan.
            return { name: 'cevap.txt', mime: 'text/plain' };
    }
}

/**
 * Dosya sisteminde guvenli klasor adi.
 *
 * Windows'ta yasak olanlar: < > : " / \ | ? * ve kontrol karakterleri.
 * BOSLUKLAR KORUNUR (yalnizca sadelestirilir) - silinirse kelimeler birbirine
 * yapisip klasor adi okunmaz hale gelir. Windows sondaki nokta ve boslugu da
 * kabul etmedigi icin ad sonu ayrica kirpilir.
 */
export function safeFolderName(text: string): string {
    const cleaned = (text || '')
        .replace(/[<>:"/\\|?*]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 60)
        .replace(/[. ]+$/, '');
    return cleaned || 'odev';
}
