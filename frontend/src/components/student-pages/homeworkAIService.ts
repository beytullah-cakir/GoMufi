/**
 * homeworkAIService.ts
 * Gemini API kullanarak öğrenci cevabını (metin, kod, resim veya dosya)
 * eğitmenin sorusuyla karşılaştıran AI değerlendirme servisi.
 * 4 teslim türü: 'text' | 'code' | 'image' | 'file'
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

/** Desteklenen metin uzantıları */
const TEXT_EXTENSIONS = ['.txt', '.md', '.py', '.js', '.ts', '.java', '.c', '.cpp', '.cs', '.json', '.xml', '.csv', '.html', '.css'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];

function getFileExtension(fileName: string): string {
    return fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
}

function readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file, 'utf-8');
    });
}

function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export interface AIReviewResult {
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    suggestions: string[];
    summary: string;
    rawResponse: string;
}

/** Ortak sistem prompt'u */
const buildSystemPrompt = () => `Sen bir eğitim değerlendirme asistanısın.
Görevin: Bir öğrencinin ödevini eğitmenin sorusuna göre değerlendirmek.

Değerlendirmeni aşağıdaki JSON formatında döndür (başka hiçbir şey yazma):
{
  "overallScore": <0-100 arası puan>,
  "strengths": ["<Doğru yapılan 1>", "<Doğru yapılan 2>", ...],
  "weaknesses": ["<Eksik/hatalı 1>", "<Eksik/hatalı 2>", ...],
  "suggestions": ["<Öneri 1>", "<Öneri 2>", ...],
  "summary": "<2-3 cümlelik genel değerlendirme>"
}

KURALLAR:
- Türkçe yaz.
- strengths listesi en az 1, en fazla 5 madde içersin.
- weaknesses listesi 0 ile 5 madde arasında olsun.
- suggestions listesi weaknesses ile örtüşsün, her eksiklik için pratik öneri ver.
- Puan verirken adil ve yapıcı ol.
- Eğer içerik soruyla alakasızsa weaknesses'e ekle.`;

function parseAIResponse(rawText: string): AIReviewResult {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
        throw new Error('Gemini geçerli bir JSON yanıtı döndürmedi.');
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return {
        overallScore: Math.min(100, Math.max(0, Number(parsed.overallScore) || 0)),
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        summary: parsed.summary || '',
        rawResponse: rawText,
    };
}

/**
 * 4 teslim türü için AI değerlendirmesi.
 * @param question   Eğitmenin sorusu / yönergesi
 * @param type       'text' | 'code' | 'image' | 'file'
 * @param textAnswer 'text' veya 'code' türü için öğrenci cevabı
 * @param file       'image' veya 'file' türü için yüklenen dosya
 */
export async function evaluateHomeworkByType(
    question: string,
    type: 'text' | 'code' | 'image' | 'file',
    textAnswer?: string,
    file?: File
): Promise<AIReviewResult> {   

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const systemPrompt = buildSystemPrompt();
    const questionBlock = `EĞİTMENİN SORUSU:\n${question}`;

    let parts: any[];

    switch (type) {
        case 'text': {
            const answer = textAnswer || '';
            parts = [{
                text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN METİN CEVABI:\n${answer}`
            }];
            break;
        }

        case 'code': {
            const code = textAnswer || '';
            parts = [{
                text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN KOD CEVABI (kaynak kod):\n\`\`\`\n${code}\n\`\`\`\n\nKod kalitesi, doğruluğu, okunabilirliği ve soruyla uyumunu değerlendir. Varsa sözdizimi hatalarını belirt.`
            }];
            break;
        }

        case 'image': {
            if (!file) throw new Error('Resim dosyası gerekli.');
            const base64 = await readAsBase64(file);
            const mimeType = file.type as any;
            parts = [
                { text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN CEVABI: Aşağıdaki görseli değerlendir. Görselin soruyla ilgisini, içeriğini ve kalitesini değerlendir.` },
                { inlineData: { mimeType, data: base64 } }
            ];
            break;
        }

        case 'file': {
            if (!file) throw new Error('Dosya gerekli.');
            const ext = getFileExtension(file.name);

            if (TEXT_EXTENSIONS.includes(ext)) {
                const text = await readAsText(file);
                parts = [{
                    text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN DOSYA CEVABI (${file.name}):\n${text}`
                }];
            } else if (IMAGE_EXTENSIONS.includes(ext)) {
                const base64 = await readAsBase64(file);
                parts = [
                    { text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN DOSYA CEVABI: Aşağıdaki görseli değerlendir.` },
                    { inlineData: { mimeType: file.type as any, data: base64 } }
                ];
            } else if (ext === '.pdf') {
                const base64 = await readAsBase64(file);
                parts = [
                    { text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN DOSYA CEVABI (PDF): Aşağıdaki PDF'i değerlendir.` },
                    { inlineData: { mimeType: 'application/pdf', data: base64 } }
                ];
            } else {
                parts = [{
                    text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN CEVABI: Öğrenci "${file.name}" adlı bir dosya yükledi (içerik okunamıyor). Bu bilgiyle mümkün olan değerlendirmeyi yap.`
                }];
            }
            break;
        }

        default:
            throw new Error(`Desteklenmeyen teslim türü: ${type}`);
    }

    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const rawText = result.response.text().trim();
    return parseAIResponse(rawText);
}

/**
 * Geriye dönük uyumluluk için eski API korunuyor.
 * @deprecated evaluateHomeworkByType kullanın
 */
export async function evaluateHomework(question: string, file: File): Promise<AIReviewResult> {
    return evaluateHomeworkByType(question, 'file', undefined, file);
}
