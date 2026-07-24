/**
 * homeworkAIService.ts
 * Öğrenci cevabını (metin, kod, resim veya dosya) eğitmenin sorusuyla karşılaştıran
 * AI değerlendirme servisi. 4 teslim türü: 'text' | 'code' | 'image' | 'file'
 *
 * NOT: Gemini çağrısı artık BACKEND üzerinden yapılır (POST /ai/evaluate-homework).
 * Daha önce API anahtarı VITE_GEMINI_API_KEY ile tarayıcı bundle'ına gömülüyordu;
 * anahtar artık yalnızca sunucuda durur ve her çağrı ai_usage_logs'a kaydedilir.
 */

import api from '../../api';

export interface AIWeakness {
    explanation: string;
    studentCode?: string;
    improvedCode?: string;
}

export interface AIReviewResult {
    overallScore: number;
    summary: string;
    weaknesses: AIWeakness[];
    rawResponse: string;
}

/** Değerlendirmenin hangi kurs/derse ait olduğu — backend yetki kontrolü için kullanır. */
export interface HomeworkContext {
    courseId?: string | number;
    nodeId?: string | number;
}

/**
 * 4 teslim türü için AI değerlendirmesi.
 * @param question   Eğitmenin sorusu / yönergesi
 * @param type       'text' | 'code' | 'image' | 'file'
 * @param textAnswer 'text' veya 'code' türü için öğrenci cevabı
 * @param file       'image' veya 'file' türü için yüklenen dosya
 * @param context    Kurs/ders bilgisi — öğrenciler için zorunlu (yetki kontrolü)
 */
export async function evaluateHomeworkByType(
    question: string,
    type: 'text' | 'code' | 'image' | 'file',
    textAnswer?: string,
    file?: File,
    context?: HomeworkContext
): Promise<AIReviewResult> {
    if (type === 'text' || type === 'code') {
        if (!textAnswer || !textAnswer.trim()) {
            throw new Error('Cevap metni boş olamaz.');
        }
    } else if (!file) {
        throw new Error(type === 'image' ? 'Resim dosyası gerekli.' : 'Dosya gerekli.');
    }

    const formData = new FormData();
    formData.append('question', question);
    formData.append('submission_type', type);
    if (textAnswer) formData.append('text_answer', textAnswer);
    if (file) formData.append('file', file);

    // Boş/'preview' gibi geçersiz değerleri göndermeyelim — backend bunları reddeder.
    const courseId = context?.courseId;
    if (courseId !== undefined && courseId !== null && String(courseId) !== 'preview') {
        formData.append('course_id', String(courseId));
    }
    if (context?.nodeId !== undefined && context?.nodeId !== null) {
        formData.append('node_id', String(context.nodeId));
    }

    try {
        const res = await api.post('/ai/evaluate-homework', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        const data = res.data || {};
        return {
            overallScore: Math.min(100, Math.max(0, Number(data.overallScore) || 0)),
            summary: data.summary || '',
            weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
            rawResponse: data.rawResponse || '',
        };
    } catch (err: any) {
        throw new Error(err?.response?.data?.detail || err?.message || 'Değerlendirme sırasında hata oluştu.');
    }
}

/**
 * Geriye dönük uyumluluk için eski API korunuyor.
 * @deprecated evaluateHomeworkByType kullanın
 */
export async function evaluateHomework(
    question: string,
    file: File,
    context?: HomeworkContext
): Promise<AIReviewResult> {
    return evaluateHomeworkByType(question, 'file', undefined, file, context);
}
