/**
 * homeworkAIService.ts
 * Gemini API'sini kullanarak öğrencinin yüklediği dosyayı okuyup
 * eğitmenin sorusuyla karşılaştıran AI değerlendirme servisi.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;

/** Desteklenen dosya türleri */
const TEXT_EXTENSIONS = ['.txt', '.md', '.py', '.js', '.ts', '.java', '.c', '.cpp', '.cs', '.json', '.xml', '.csv', '.html', '.css'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
// PDF ve DOCX: Gemini inline data olarak gönderilebilir

function getFileExtension(fileName: string): string {
    return fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
}

/** Dosyayı metin olarak okur */
function readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(file, 'utf-8');
    });
}

/** Dosyayı Base64 olarak okur */
function readAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // "data:...;base64,XXXX" → sadece base64 kısmı
            resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export interface AIReviewResult {
    overallScore: number;       // 0-100
    strengths: string[];        // Doğru yapılanlar
    weaknesses: string[];       // Eksik / hatalı noktalar
    suggestions: string[];      // Nasıl düzelteceğine dair öneriler
    summary: string;            // Genel özet paragrafı
    rawResponse: string;        // Ham AI yanıtı (debug için)
}

/**
 * Öğrencinin dosyasını Gemini ile değerlendirir.
 * @param question  Eğitmenin sorusu / yönergesi
 * @param file      Öğrencinin yüklediği dosya
 */
export async function evaluateHomework(
    question: string,
    file: File
): Promise<AIReviewResult> {
    if (!API_KEY || API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
        throw new Error('VITE_GEMINI_API_KEY tanımlı değil. Lütfen .env.local dosyasına ekleyin.');
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const ext = getFileExtension(file.name);

    // ── Prompt şablonu ──────────────────────────────────────────────────────
    const systemPrompt = `Sen bir eğitim değerlendirme asistanısın. 
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
- Eğer dosya içeriği soruyla alakasızsa weaknesses'e ekle.`;

    const questionBlock = `EĞITMENIN SORUSU:\n${question}`;

    // ── Dosya içeriğini Gemini'ye gönder ────────────────────────────────────
    let parts: any[];

    if (TEXT_EXTENSIONS.includes(ext)) {
        // Düz metin dosyaları
        const text = await readAsText(file);
        parts = [
            { text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN CEVABI (${file.name}):\n${text}` }
        ];

    } else if (IMAGE_EXTENSIONS.includes(ext)) {
        // Görsel dosyalar → Gemini Vision
        const base64 = await readAsBase64(file);
        const mimeType = file.type as any;
        parts = [
            { text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN CEVABI: Aşağıdaki görseli değerlendir.` },
            { inlineData: { mimeType, data: base64 } }
        ];

    } else if (ext === '.pdf') {
        // PDF → inline data olarak gönder
        const base64 = await readAsBase64(file);
        parts = [
            { text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN CEVABI (PDF dosyası): Aşağıdaki PDF'i değerlendir.` },
            { inlineData: { mimeType: 'application/pdf', data: base64 } }
        ];

    } else {
        // Desteklenmeyen format → sadece dosya adıyla değerlendir
        parts = [
            {
                text: `${systemPrompt}\n\n${questionBlock}\n\nÖĞRENCİNİN CEVABI: Öğrenci "${file.name}" adlı bir dosya yükledi (içerik okunamıyor). Bu bilgiyle mümkün olan değerlendirmeyi yap.`
            }
        ];
    }

    // ── API çağrısı ──────────────────────────────────────────────────────────
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    const rawText = result.response.text().trim();

    // JSON bloğunu temizle (bazen ```json ... ``` içinde gelir)
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
