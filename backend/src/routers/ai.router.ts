import { Router, Request, Response } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { authMiddleware } from '../middleware/auth.middleware';
import { aiRateLimiter } from '../middleware/rate-limit.middleware';
import prisma from '../db/prisma';
import { config } from '../config';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

async function recordAiUsage(params: {
  teacherId?: number | null;
  courseId?: number | null;
  courseTitle?: string | null;
  action: string;
  modelName: string;
  response: any;
  details?: string | null;
}): Promise<void> {
  try {
    const usage = params.response.usageMetadata;
    const promptTokens = usage?.promptTokenCount ?? 0;
    const candidatesTokens = usage?.candidatesTokenCount ?? 0;
    const totalTokens = usage?.totalTokenCount ?? (promptTokens + candidatesTokens);
    const rateInput = 0.30 / 1_000_000;
    const rateOutput = 2.50 / 1_000_000;
    const costUsd = (promptTokens * rateInput) + (candidatesTokens * rateOutput);
    await prisma.aIUsageLog.create({ 
      data: {
        teacher_id: params.teacherId,
        course_id: params.courseId,
        course_title: params.courseTitle,
        action: params.action,
        model_name: params.modelName,
        prompt_tokens: promptTokens,
        candidates_tokens: candidatesTokens,
        total_tokens: totalTokens,
        cost_usd: costUsd,
        details: params.details
      } 
    });
  } catch (err) {
    console.warn('Failed to record AI usage log:', err);
  }
}

function parseJsonFromText(text: string): any {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) return JSON.parse(match[1].trim());
  return JSON.parse(text.trim());
}

function formatTemplatesSummary(catList: any[]): string {
  const lines = [];
  for (const t of catList) {
    const els = [];
    for (const el of (t.elements || [])) {
      const mChar = el.maxChars ? `, maxChars:${el.maxChars}` : "";
      els.push(`${el.id} (${el.type}${mChar})`);
    }
    lines.push(`- Template ID: "${t.id}" | Title: "${t.title}" | Elements: [${els.join(', ')}]`);
  }
  return lines.join('\n');
}

function getWebImage(query: string, isFallback: boolean = false): string {
  const translationDict: Record<string, string> = {
    "giris": "introduction",
    "nedir": "about",
    "kurulum": "setup",
    "ortami": "workspace",
    "tarih": "history",
    "cografya": "geography",
    "matematik": "mathematics",
    "fizik": "physics",
    "kimya": "chemistry",
    "biyoloji": "biology",
    "operatorler": "operators",
    "degiskenler": "variables",
  };
  
  const trMap: Record<string, string> = {
    'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
    'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
  };
  
  let queryClean = query.replace(/[çğıöşüÇĞİÖŞÜ]/g, m => trMap[m]).toLowerCase();
  const words = queryClean.split(/[^a-zA-Z0-9]/).map(w => w.trim()).filter(Boolean);
  
  let engKeywords: string[] = [];
  for (const w of words) {
    if (translationDict[w]) {
      engKeywords.push(translationDict[w]);
    } else if (!isFallback && /^[a-zA-Z0-9]+$/.test(w)) {
      engKeywords.push(w);
    }
  }
  
  if (engKeywords.length === 0) {
    engKeywords = ["education"];
  }
  
  const uniqueKeywords = Array.from(new Set(engKeywords));
  const keywordsStr = uniqueKeywords.join(",");
  return `https://loremflickr.com/640/480/${encodeURIComponent(keywordsStr)}`;
}

function getModuleTypeFromTheme(theme: string): string {
  if (!theme) return "UNDERSTAND";
  const t = theme.toLowerCase();
  if (t === "purple") return "UNDERSTAND";
  if (t === "cyan") return "APPLY";
  if (t === "green") return "CONNECT";
  if (t === "yellow") return "CREATE";
  if (t === "quiz") return "QUIZ";
  if (t === "homework") return "HOMEWORK";
  return "UNDERSTAND";
}

// ─── Rate Limiting — Tüm AI endpoint'lerine uygulanır ───────────────────────
router.use(authMiddleware, aiRateLimiter);

router.post('/courses/generate_roadmap', async (req: Request, res: Response): Promise<void> => {

  try {
    const teacherId = req.user ? parseInt(req.user.sub) : undefined;
    const { topic, difficulty, lessons_count, audience, pdf_content, custom_lessons } = req.body;
    
    let templates: any[] = [];
    const templatesPath = path.join(process.cwd(), 'slide_templates.json');
    if (fs.existsSync(templatesPath)) {
      templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
    }
    
    const templatesByCategory: Record<string, any[]> = { "ANLA": [], "UYGULA": [], "BİRLEŞTİR": [], "ÜRET": [] };
    for (const t of templates) {
      const cat = (t.category || "").toUpperCase();
      if (templatesByCategory[cat]) {
        const elementsInfo = [];
        for (const el of (t.elements || [])) {
          if (["text", "code", "sticky", "challenge", "code_editor", "connection_task", "production_task", "image"].includes(el.type)) {
            elementsInfo.push({
              id: el.id,
              type: el.type,
              placeholder: el.content,
              maxChars: el.maxChars
            });
          }
        }
        templatesByCategory[cat].push({
          id: t.id,
          title: t.title,
          description: t.description,
          elements: elementsInfo
        });
      }
    }
    
    const genai = new GoogleGenerativeAI(config.MY_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const promptStep1 = `Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is only to design the structure of a learning roadmap (lessons and modules sequence).
Goal: Given the course topic, difficulty, desired lesson count, and target audience, generate the sequence of lessons and modules.
Requirements:
- The roadmap consists of lessons.
- Each lesson contains a list of modules representing levels.
- Modules are selected from: UNDERSTAND, APPLY, CONNECT, CREATE, QUIZ, HOMEWORK.
- FLEXIBLE PEDAGOGICAL FLOW & MODULE RULES:
  - A lesson can cover 1 or MULTIPLE sub-topics.
  - For EACH distinct sub-topic taught in the lesson, generate a pair of UNDERSTAND (Anla) followed immediately by APPLY (Uygula).
  - After all sub-topic theory & practice pairs in the lesson, you MUST include:
    1. At least one CONNECT module
    2. At least one CREATE module
    3. Exactly one QUIZ or HOMEWORK module
- CRITICAL TITLE LENGTH CONSTRAINT: Every lesson title (title) and module topic string (topic) MUST be concise and MUST NOT exceed 30 characters in total length.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{
  "courseTitle": "...",
  "lessons": [
    {
      "lessonNumber": 1,
      "title": "Lesson title (Türkçe)",
      "objective": "Lesson learning objective (Türkçe)",
      "modules": [
        { "type": "UNDERSTAND", "topic": "1. Konu Anlatımı (Türkçe)" },
        { "type": "APPLY", "topic": "1. Konu Pratiği (Türkçe)" },
        { "type": "CONNECT", "topic": "Kavramları Birleştirme (Türkçe)" },
        { "type": "CREATE", "topic": "Mini Proje (Türkçe)" },
        { "type": "QUIZ", "topic": "Ders Testi (Türkçe)" }
      ]
    }
  ]
}

Input:
Topic: ${topic}
Difficulty: ${difficulty}
Lessons Count: ${lessons_count}
Audience: ${audience}`;
    
    const responseStep1 = await model.generateContent(promptStep1);
    await recordAiUsage({
      teacherId,
      action: "generate_roadmap_structure",
      modelName: "gemini-2.5-flash",
      response: responseStep1.response
    });
    
    const roadmapStructure = parseJsonFromText(responseStep1.response.text());
    
    const promptStep2 = `Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is to write detailed educational slide contents for the UNDERSTAND, APPLY, CONNECT, and CREATE modules in the provided curriculum.

Course:
Topic: ${topic}
Difficulty: ${difficulty}
Audience: ${audience}

Curriculum Structure to populate:
${JSON.stringify(roadmapStructure, null, 2)}

Available Templates for each category:
- UNDERSTAND (ANLA) templates:
${formatTemplatesSummary(templatesByCategory["ANLA"])}

- APPLY (UYGULA) templates:
${formatTemplatesSummary(templatesByCategory["UYGULA"])}

- CONNECT (BİRLEŞTİR) templates:
${formatTemplatesSummary(templatesByCategory["BİRLEŞTİR"])}

- CREATE (ÜRET) templates:
${formatTemplatesSummary(templatesByCategory["ÜRET"])}

Requirements:
- For each module in the curriculum of type UNDERSTAND, APPLY, CONNECT, and CREATE, generate slide contents.
- Return ONLY valid JSON matching the structure below.

Expected JSON Structure:
{
  "levelContents": [
    {
      "lessonNumber": 1,
      "moduleIndex": 0,
      "slides": [
        {
          "selectedTemplateId": "template_id_here",
          "elementContents": [
             { "elementId": "element_id_1", "content": "Generated text explanation in Turkish" }
          ]
        }
      ]
    }
  ]
}`;
    
    const responseStep2 = await model.generateContent(promptStep2);
    await recordAiUsage({
      teacherId,
      action: "generate_roadmap_content",
      modelName: "gemini-2.5-flash",
      response: responseStep2.response
    });
    
    const slideContentsData = parseJsonFromText(responseStep2.response.text());
    const levelContentsList = slideContentsData.levelContents || [];
    
    const generatedLessons = roadmapStructure.lessons || [];
    const curriculum = [];
    const notes = [];
    let overallIdx = 1;
    
    const themeMap: Record<string, string> = {
      "UNDERSTAND": "purple", "APPLY": "cyan", "CONNECT": "green", "CREATE": "yellow", "QUIZ": "quiz", "HOMEWORK": "homework"
    };
    
    const allTemplatesMap: Record<string, any[]> = {
      "UNDERSTAND": templatesByCategory["ANLA"],
      "APPLY": templatesByCategory["UYGULA"],
      "CONNECT": templatesByCategory["BİRLEŞTİR"],
      "CREATE": templatesByCategory["ÜRET"]
    };
    
    for (let lIdx = 0; lIdx < generatedLessons.length; lIdx++) {
      const les = generatedLessons[lIdx];
      const lessonNum = les.lessonNumber || (lIdx + 1);
      const modules = les.modules || [];
      
      for (let mIdx = 0; mIdx < modules.length; mIdx++) {
        const mod = modules[mIdx];
        const modType = (mod.type || "UNDERSTAND").toUpperCase();
        const mappedTheme = themeMap[modType] || "purple";
        const levelId = `sec_ai_${Math.floor(Math.random() * 1000000000)}`;
        
        let rawTopic = (mod.topic || "").trim();
        let cleanTopic = rawTopic.replace(/^(?:Ders\s+\d+[:\s\-]*|\d+[\.\)\s\-]*)/i, "").trim();
        if (!cleanTopic) {
          cleanTopic = (les.title || "Ders Konusu").trim().replace(/^(?:Ders\s+\d+[:\s\-]*|\d+[\.\)\s\-]*)/i, "").trim();
        }
        
        const finalNodeTitle = ["QUIZ", "HOMEWORK"].includes(modType) ? (modType === "QUIZ" ? "Konu Testi" : "Ödev Görevi") : cleanTopic.substring(0, 30);
        
        const node: any = {
          id: levelId,
          title: finalNodeTitle,
          theme: mappedTheme,
          lectures: []
        };
        
        if (mIdx === 0) {
          node.lessonTopic = les.title || `Ders Konusu ${lessonNum}`;
          node.lessonNumber = lessonNum;
        }
        
        curriculum.push(node);
        overallIdx++;
        
        if (["UNDERSTAND", "APPLY", "CONNECT", "CREATE"].includes(modType)) {
          let matchedContent = levelContentsList.find((lc: any) => String(lc.lessonNumber) === String(lessonNum) && String(lc.moduleIndex) === String(mIdx));
          if (!matchedContent) {
            matchedContent = levelContentsList.find((lc: any) => String(lc.lessonNumber) === String(lessonNum) && (lc.moduleType || "").toUpperCase() === modType);
          }
          
          const catTemplates = allTemplatesMap[modType] || [];
          let aiSlides = matchedContent ? (matchedContent.slides || []) : [];
          
          if (aiSlides.length === 0 && catTemplates.length > 0) {
            aiSlides = [{ selectedTemplateId: catTemplates[0].id, elementContents: {} }];
          }
          if (!Array.isArray(aiSlides)) aiSlides = [aiSlides];
          
          const slidesToAdd = [];
          for (const aiSlide of aiSlides) {
            const selTemplateId = aiSlide.selectedTemplateId;
            const rawContents = aiSlide.elementContents || [];
            const elemContents: Record<string, string> = {};
            if (Array.isArray(rawContents)) {
              for (const pair of rawContents) {
                if (pair.elementId) elemContents[pair.elementId] = pair.content || "";
              }
            } else {
              Object.assign(elemContents, rawContents);
            }
            
            let selectedT = templates.find(t => t.id === selTemplateId);
            if (!selectedT && catTemplates.length > 0) {
              selectedT = templates.find(t => t.id === catTemplates[0].id);
            }
            
            if (selectedT) {
              const copiedElements = [];
              for (const el of (selectedT.elements || [])) {
                const elCopy = JSON.parse(JSON.stringify(el));
                const val = elemContents[elCopy.id] || "";
                
                if (elCopy.type === "image") {
                  const query = val || mod.topic || les.title || "coding";
                  const imgUrl = getWebImage(query, !val);
                  elCopy.content = imgUrl;
                  elCopy.imageUrl = imgUrl;
                  elCopy.src = imgUrl;
                } else if (elemContents[elCopy.id] !== undefined) {
                  if (elCopy.type === "connection_task" || elCopy.type === "production_task") {
                    try {
                      const parsed = JSON.parse(val);
                      elCopy.content = parsed.taskText || val;
                      elCopy.extra = elCopy.extra || {};
                      if (elCopy.type === "connection_task") {
                        elCopy.extra.previousTopic = parsed.previousTopic || "Önceki Konu";
                        elCopy.extra.currentTopic = parsed.currentTopic || "Şimdiki Konu";
                      } else {
                        elCopy.extra.projectTitle = parsed.projectTitle || "Proje Başlığı";
                        elCopy.extra.expectedOutput = parsed.expectedOutput || "";
                        elCopy.extra.estimatedTime = parsed.estimatedTime || "10 Dakika";
                        elCopy.extra.hints = parsed.hints || "";
                      }
                    } catch (e) {
                      elCopy.content = val;
                    }
                  } else {
                    elCopy.content = val;
                  }
                }
                copiedElements.push(elCopy);
              }
              slidesToAdd.push({
                id: Math.floor(Math.random() * 1000000000),
                elements: copiedElements,
                background: selectedT.background || "default"
              });
            }
          }
          if (slidesToAdd.length > 0) {
            notes.push({ id: levelId, noteTitle: node.title, slides: slidesToAdd });
          }
        }
      }
    }
    
    res.json({ success: true, curriculum, notes, roadmap: roadmapStructure });
    return;
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ detail: err.message });
  }
});

router.post('/courses/suggest_raw_topics', upload.single('pdf_file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : undefined;
    const { topic, difficulty, audience } = req.body;
    let pdfText = "";
    if (req.file) {
      // PDF content extracted from buffer if pdf-parse is available
      // For now, return error if PDF is uploaded (add pdf-parse package if needed)
      res.status(400).json({ detail: 'PDF parsing not configured. Please send topic text directly.' });
      return;
    }
    
    const genai = new GoogleGenerativeAI(config.MY_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const pdfContext = pdfText ? `\n\nSource Material:\n${pdfText.substring(0, 40000)}\n\nInstruction: Base your suggestions strictly on the PDF.` : "";
    
    const prompt = `Role: You are an expert computer science curriculum architect. Türkçe cevap ver.
Your task is to analyze the course topic, difficulty, audience, and optional PDF content, and suggest:
- A flat sequence of substantive, practical coding topics (subject headings) that must be covered in this course (typically between 5 and 15 topics).
- Strictly Ban Trivial/Fluff Headings.
${pdfContext}

Course Parameters:
Topic: ${topic}
Difficulty: ${difficulty}
Audience: ${audience}

Expected JSON Structure:
{
  "suggested_topics": [
    "Topic 1", "Topic 2"
  ]
}`;

    const response = await model.generateContent(prompt);
    await recordAiUsage({ teacherId, action: "suggest_raw_topics", modelName: "gemini-2.5-flash", response: response.response });
    const data = parseJsonFromText(response.response.text());
    
    res.json({ success: true, suggested_topics: data.suggested_topics || [], pdf_text: pdfText });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/courses/distribute_topics_into_lessons', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : undefined;
    const { topics, lesson_duration, lessons_count } = req.body;
    
    const genai = new GoogleGenerativeAI(config.MY_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Role: You are an expert computer science curriculum architect. Türkçe cevap ver.
Distribute the topics across lessons logically.

Topics: ${JSON.stringify(topics)}
Lesson Duration: ${lesson_duration} minutes per lesson.
Target Lessons Count: ${lessons_count > 0 ? lessons_count : 'AI to determine'}

Expected JSON Structure:
{
  "suggested_lessons": [
    {
      "lesson_number": 1,
      "title": "Suggested Lesson 1 Title",
      "topics": ["Topic A"]
    }
  ],
  "suggested_lessons_count": 1
}`;
    
    const response = await model.generateContent(prompt);
    await recordAiUsage({ teacherId, action: "distribute_topics", modelName: "gemini-2.5-flash", response: response.response });
    const data = parseJsonFromText(response.response.text());
    
    res.json({ success: true, suggested_lessons: data.suggested_lessons || [], suggested_lessons_count: data.suggested_lessons_count || 6 });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/courses/expand_topics', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : undefined;
    const { topics, course_topic, difficulty, audience, target_count } = req.body;
    
    const genai = new GoogleGenerativeAI(config.MY_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const countInstruction = target_count > 0 ? `You MUST generate exactly ${target_count} total sub-topic strings.` : "Suggest around 3 to 5 sub-topics per high-level topic.";
    
    const prompt = `Role: You are an expert computer science curriculum architect. Türkçe cevap ver.
Expand the topics. ${countInstruction}
Course Context: ${course_topic}
Current Topics: ${JSON.stringify(topics)}

Expected JSON Structure:
{
  "expanded_topics": ["Expanded 1", "Expanded 2"]
}`;
    
    const response = await model.generateContent(prompt);
    await recordAiUsage({ teacherId, action: "expand_topics", modelName: "gemini-2.5-flash", response: response.response, details: `Kurs: '${course_topic}'` });
    const data = parseJsonFromText(response.response.text());
    
    res.json({ success: true, expanded_topics: data.expanded_topics || [] });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/courses/generate_roadmap_structure', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : undefined;
    const { topic, difficulty, lessons_count, audience, pdf_content, custom_lessons } = req.body;
    
    const genai = new GoogleGenerativeAI(config.MY_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let pdfContext = "";
    if (pdf_content) {
      pdfContext = `\n\nSource Material (PDF Content):\n${pdf_content.substring(0, 40000)}\n\nInstruction: Base the curriculum strictly on the PDF.`;
    }
    
    let customLessonsInstruction = "";
    if (custom_lessons) {
      customLessonsInstruction = `\n\nTarget Lessons Structure:\nThe teacher requested exactly ${custom_lessons.length} lessons:\n` + custom_lessons.map((l: any, i: number) => `- Lesson ${i+1}: "${l.title}" (Topics: ${l.topics.join(', ')})`).join('\n');
    }
    
    const countInstruction = lessons_count > 0 ? `Lessons Count: ${lessons_count}` : "Lessons Count: AI determined";
    
    const prompt = `Role: You are an expert instructional designer. Türkçe cevap ver.
Design the roadmap structure.
${pdfContext}
${customLessonsInstruction}
Input:
Topic: ${topic}
Difficulty: ${difficulty}
${countInstruction}
Audience: ${audience}

Expected JSON Structure:
{
  "courseTitle": "...",
  "lessons": [
    {
      "lessonNumber": 1,
      "title": "Lesson title",
      "objective": "Objective",
      "modules": [
        { "type": "UNDERSTAND", "topic": "Theory" },
        { "type": "APPLY", "topic": "Practice" },
        { "type": "CONNECT", "topic": "Connect" },
        { "type": "CREATE", "topic": "Project" },
        { "type": "QUIZ", "topic": "Quiz" }
      ]
    }
  ]
}`;

    const response = await model.generateContent(prompt);
    await recordAiUsage({ teacherId, action: "generate_roadmap_structure", modelName: "gemini-2.5-flash", response: response.response, details: `Kurs: '${topic}'` });
    
    const data = parseJsonFromText(response.response.text());
    res.json({ success: true, roadmap: data });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/courses/suggest_lesson_modules', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : undefined;
    const { lesson_title, course_topic, difficulty, audience, pdf_content } = req.body;
    
    const genai = new GoogleGenerativeAI(config.MY_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    let pdfContext = pdf_content ? `\n\nSource:\n${pdf_content.substring(0, 30000)}` : "";
    
    const prompt = `Role: You are an expert instructional designer. Türkçe cevap ver.
Design sub-modules for the lesson.
${pdfContext}
Course: ${course_topic}
Lesson Title: ${lesson_title}

Expected JSON Structure:
{
  "objective": "Objective",
  "modules": [
    { "type": "UNDERSTAND", "topic": "Theory" },
    { "type": "APPLY", "topic": "Practice" },
    { "type": "CONNECT", "topic": "Connect" },
    { "type": "CREATE", "topic": "Project" },
    { "type": "QUIZ", "topic": "Quiz" }
  ]
}`;
    const response = await model.generateContent(prompt);
    await recordAiUsage({ teacherId, action: "suggest_lesson_modules", modelName: "gemini-2.5-flash", response: response.response, details: `Kurs: '${course_topic}' | Ders: '${lesson_title}'` });
    const data = parseJsonFromText(response.response.text());
    res.json({ success: true, objective: data.objective, modules: data.modules || [] });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/courses/suggest_lesson_title', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : undefined;
    const { course_topic, difficulty, audience, lesson_number, existing_lessons, pdf_content } = req.body;
    
    const genai = new GoogleGenerativeAI(config.MY_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Role: You are an expert instructional designer. Türkçe cevap ver.
Suggest 5 alternative relevant lesson titles for lesson number ${lesson_number}.
Course Context: ${course_topic}
Existing Lessons: ${JSON.stringify(existing_lessons)}

Expected JSON Structure:
{
  "titles": ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]
}`;
    const response = await model.generateContent(prompt);
    await recordAiUsage({ teacherId, action: "suggest_lesson_title", modelName: "gemini-2.5-flash", response: response.response });
    const data = parseJsonFromText(response.response.text());
    res.json({ success: true, titles: data.titles || [] });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.post('/courses/suggest_level_details', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : undefined;
    const { course_topic, difficulty, audience, lesson_title, module_type, sibling_modules, pdf_content } = req.body;
    
    const genai = new GoogleGenerativeAI(config.MY_API_KEY);
    const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    const prompt = `Role: You are an expert instructional designer. Türkçe cevap ver.
Suggest title and detailed topic content for a module.
Course: ${course_topic}
Lesson: ${lesson_title}
Module Type: ${module_type}
Siblings: ${JSON.stringify(sibling_modules)}

Expected JSON Structure:
{
  "title": "Short title",
  "topic": "Detailed description"
}`;
    const response = await model.generateContent(prompt);
    await recordAiUsage({ teacherId, action: "suggest_level_details", modelName: "gemini-2.5-flash", response: response.response });
    const data = parseJsonFromText(response.response.text());
    res.json({ success: true, title: data.title, topic: data.topic });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

async function generateLessonSlides(reqObj: any, teacherId: number) {
  const templatesPath = path.join(process.cwd(), 'slide_templates.json');
  let templates: any[] = [];
  if (fs.existsSync(templatesPath)) templates = JSON.parse(fs.readFileSync(templatesPath, 'utf8'));
  
  const templatesByCategory: Record<string, any[]> = { "ANLA": [], "UYGULA": [], "BİRLEŞTİR": [], "ÜRET": [] };
  for (const t of templates) {
    const cat = (t.category || "").toUpperCase();
    if (templatesByCategory[cat]) {
      const elementsInfo = [];
      for (const el of (t.elements || [])) {
        if (["text", "code", "sticky", "challenge", "code_editor", "connection_task", "production_task", "image"].includes(el.type)) {
          elementsInfo.push({ id: el.id, type: el.type, placeholder: el.content, maxChars: el.maxChars });
        }
      }
      templatesByCategory[cat].push({ id: t.id, title: t.title, description: t.description, elements: elementsInfo });
    }
  }

  const genai = new GoogleGenerativeAI(config.MY_API_KEY);
  const model = genai.getGenerativeModel({ model: 'gemini-2.5-flash' });
  
  const pdfContext = reqObj.pdf_content ? `\n\nSource Material:\n${reqObj.pdf_content.substring(0, 30000)}` : "";

  const prompt = `Role: You are an expert instructional designer. Türkçe cevap ver.
Generate slides for modules in a lesson.
${pdfContext}
Topic: ${reqObj.topic}
Lesson: ${reqObj.lesson_number} - ${reqObj.lesson_title}
Modules: ${JSON.stringify(reqObj.modules)}

Expected JSON Structure:
{
  "modules_content": [
    {
      "lessonNumber": ${reqObj.lesson_number},
      "moduleIndex": 0,
      "slides": [
        {
          "selectedTemplateId": "template_id",
          "elementContents": [ { "elementId": "el1", "content": "text" } ]
        }
      ]
    }
  ],
  "quiz_map": [ { "questionText": "Q?", "options": [ { "text": "Opt", "isCorrect": true } ] } ],
  "homework_map": { "title": "HW", "instructions": "Inst", "submissionType": "code", "points": 100, "starterCode": "# code" }
}`;

  const response = await model.generateContent(prompt);
  await recordAiUsage({ teacherId, action: "generate_lesson_slides", modelName: "gemini-2.5-flash", response: response.response });
  const data = parseJsonFromText(response.response.text());
  
  const modules_content = data.modules_content || [];
  const themeMap: Record<string, string> = { "UNDERSTAND": "purple", "APPLY": "cyan", "CONNECT": "green", "CREATE": "yellow", "QUIZ": "quiz", "HOMEWORK": "homework" };
  const allTemplatesMap: Record<string, any[]> = { "UNDERSTAND": templatesByCategory["ANLA"], "APPLY": templatesByCategory["UYGULA"], "CONNECT": templatesByCategory["BİRLEŞTİR"], "CREATE": templatesByCategory["ÜRET"] };
  
  const generated_modules = [];
  const generated_notes = [];
  
  for (let mIdx = 0; mIdx < reqObj.modules.length; mIdx++) {
    const mod = reqObj.modules[mIdx];
    const modType = (mod.type || "UNDERSTAND").toUpperCase();
    const mappedTheme = themeMap[modType] || "purple";
    const levelId = `sec_ai_${Math.floor(Math.random() * 1000000000)}`;
    
    const node: any = {
      id: levelId,
      title: ["QUIZ", "HOMEWORK"].includes(modType) ? (modType === "QUIZ" ? "Konu Testi" : "Ödev Görevi") : (mod.topic || ""),
      theme: mappedTheme,
      lectures: []
    };
    
    if (mIdx === 0) {
      node.lessonTopic = reqObj.lesson_title;
      node.lessonNumber = reqObj.lesson_number;
    }
    generated_modules.push(node);
    
    if (["UNDERSTAND", "APPLY", "CONNECT", "CREATE"].includes(modType)) {
      const matched = modules_content.find((mc: any) => String(mc.moduleIndex) === String(mIdx));
      let aiSlides = matched ? (matched.slides || []) : [];
      const catTemplates = allTemplatesMap[modType] || [];
      if (aiSlides.length === 0 && catTemplates.length > 0) aiSlides = [{ selectedTemplateId: catTemplates[0].id, elementContents: {} }];
      if (!Array.isArray(aiSlides)) aiSlides = [aiSlides];
      
      const slidesToAdd = [];
      for (const aiSlide of aiSlides) {
        const rawContents = aiSlide.elementContents || [];
        const elemContents: Record<string, string> = {};
        if (Array.isArray(rawContents)) {
          for (const pair of rawContents) if (pair.elementId) elemContents[pair.elementId] = pair.content || "";
        } else {
          Object.assign(elemContents, rawContents);
        }
        
        let selectedT = templates.find(t => t.id === aiSlide.selectedTemplateId);
        if (!selectedT && catTemplates.length > 0) selectedT = templates.find(t => t.id === catTemplates[0].id);
        
        if (selectedT) {
          const copiedElements = [];
          for (const el of (selectedT.elements || [])) {
            const elCopy = JSON.parse(JSON.stringify(el));
            const val = elemContents[elCopy.id] || "";
            if (elCopy.type === "image") {
              const imgUrl = getWebImage(val || mod.topic || reqObj.lesson_title || "coding", !val);
              elCopy.content = imgUrl; elCopy.imageUrl = imgUrl; elCopy.src = imgUrl;
            } else if (elemContents[elCopy.id] !== undefined) {
              if (elCopy.type === "connection_task" || elCopy.type === "production_task") {
                try {
                  const parsed = JSON.parse(val);
                  elCopy.content = parsed.taskText || val;
                  elCopy.extra = elCopy.extra || {};
                  if (elCopy.type === "connection_task") { elCopy.extra.previousTopic = parsed.previousTopic || ""; elCopy.extra.currentTopic = parsed.currentTopic || ""; }
                  else { elCopy.extra.projectTitle = parsed.projectTitle || ""; elCopy.extra.expectedOutput = parsed.expectedOutput || ""; elCopy.extra.estimatedTime = parsed.estimatedTime || ""; }
                } catch (e) { elCopy.content = val; }
              } else elCopy.content = val;
            }
            copiedElements.push(elCopy);
          }
          slidesToAdd.push({ id: Math.floor(Math.random() * 1000000000), elements: copiedElements, background: selectedT.background || "default" });
        }
      }
      if (slidesToAdd.length > 0) generated_notes.push({ id: levelId, noteTitle: "", slides: slidesToAdd });
    } else if (modType === "QUIZ") {
      const quizQuestions = data.quiz_map || [];
      const questionsList = quizQuestions.map((qq: any, idx: number) => ({
        id: `q-${idx + 1}-${Math.floor(Math.random() * 100000)}`,
        text: qq.questionText || "Soru",
        options: (qq.options || []).map((opt: any, optIdx: number) => ({ id: String(optIdx + 1), text: opt.text || "", isCorrect: opt.isCorrect || false }))
      }));
      if (questionsList.length === 0) questionsList.push({ id: "mock", text: "Mock Q", options: [] });
      
      const quizSlide = { id: Math.floor(Math.random() * 1000000000), type: "game", gameType: "matching", gameConfig: { timeLimit: 60, questions: questionsList }, elements: [] };
      generated_notes.push({ id: levelId, noteTitle: "", slides: [quizSlide] });
    } else if (modType === "HOMEWORK") {
      const hwData = data.homework_map || {};
      const homeworkSlide = {
        id: Math.floor(Math.random() * 1000000000), type: "homework", background: "default",
        homeworkConfig: {
          title: hwData.title || "Ödev", instructions: hwData.instructions || "", submissionType: hwData.submissionType || "text", points: hwData.points || 100, starterCode: hwData.starterCode || ""
        }, elements: []
      };
      generated_notes.push({ id: levelId, noteTitle: "", slides: [homeworkSlide] });
    }
  }
  
  return { modules: generated_modules, notes: generated_notes };
}

router.post('/courses/generate_lesson_slides', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : 0;
    const result = await generateLessonSlides(req.body, teacherId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.get(['/ai/metrics', '/courses/metrics'], authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !["admin", "teacher"].includes(req.user.role)) { res.status(403).json({ detail: "Forbidden" }); return; }
    const logs = await prisma.aIUsageLog.findMany({ orderBy: { created_at: 'desc' } });
    res.json({ success: true, metrics: { total_requests: logs.length, logs: logs.slice(0, 100) } });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

router.delete(['/ai/metrics', '/courses/metrics'], authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !["admin", "teacher"].includes(req.user.role)) { res.status(403).json({ detail: "Forbidden" }); return; }
    await prisma.aIUsageLog.deleteMany({});
    res.json({ success: true, message: "Cleared" });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

async function runBackgroundSlideGeneration(courseId: number, teacherId: number, topic: string, difficulty: string, audience: string, chapters: any[], pdfContent?: string) {
  try {
    let course = await prisma.course.findFirst({ where: { id: courseId, teacher_id: teacherId } });
    if (!course) return;

    let curriculum = (course.curriculum as any[]) || [];
    let allNotes = (course.notes as any[]) || [];
    const totalChapters = chapters.length;
    let overallIdx = 1;

    for (let i = 0; i < totalChapters; i++) {
      const chapter = chapters[i];
      const statusItem = { type: "ai_generation_status", status: "processing", current: i + 1, total: totalChapters, message: `Ders ${i + 1}/${totalChapters}: '${chapter.topic}' hazırlanıyor...` };
      
      curriculum = curriculum.filter(c => c.type !== "ai_generation_status");
      curriculum.push(statusItem);
      
      await prisma.course.update({ where: { id: courseId }, data: { curriculum } });
      
      const modulesInput = (chapter.levels || []).map((lvl: any) => ({ type: getModuleTypeFromTheme(lvl.theme), topic: lvl.title }));
      const objective = (chapter.levels && chapter.levels[0]?.aiLessonObjective) || `Bu derste ${chapter.topic} konusu öğrenilecektir.`;
      
      const reqObj = {
        topic, difficulty, audience, lesson_number: chapter.number || (i + 1), lesson_title: chapter.topic || `Ders ${i+1}`, lesson_objective: objective, modules: modulesInput, pdf_content: pdfContent
      };
      
      const slideRes = await generateLessonSlides(reqObj, teacherId);
      const returnedModules = slideRes.modules;
      const returnedNotes = slideRes.notes;
      
      const origLevels = chapter.levels || [];
      for (let nIdx = 0; nIdx < returnedModules.length; nIdx++) {
        const node = returnedModules[nIdx];
        const origLevel = origLevels[nIdx] || {};
        const realTitle = origLevel.title || origLevel.aiModuleTopic || node.topic || node.title;
        const cleanT = (String(realTitle).replace(/^(?:Ders\s+\d+[:\s\-]*|\d+[\.\)\s\-]*)/i, "").trim());
        node.title = cleanT ? cleanT.substring(0, 30) : `Modül ${overallIdx}`;
        overallIdx++;
        delete node.isAIDraft; delete node.isAILoading;
      }
      
      for (const note of returnedNotes) {
        const matchedNode = returnedModules.find(nm => nm.id === note.id);
        if (matchedNode) note.noteTitle = matchedNode.title;
      }
      
      allNotes.push(...returnedNotes);
      
      const chapterLevelIds = origLevels.map((l: any) => l.id);
      const cleanCurr = curriculum.filter(c => c.type !== "ai_generation_status");
      const firstIdx = cleanCurr.findIndex(s => chapterLevelIds.includes(s.id));
      if (firstIdx !== -1) cleanCurr.splice(firstIdx, chapterLevelIds.length, ...returnedModules);
      
      curriculum = cleanCurr;
      await prisma.course.update({ where: { id: courseId }, data: { curriculum, notes: allNotes } });
    }

    curriculum = curriculum.filter(c => c.type !== "ai_generation_status");
    curriculum.push({ type: "ai_generation_status", status: "completed", current: totalChapters, total: totalChapters, message: "Tüm ders slaytları başarıyla oluşturuldu!" });
    await prisma.course.update({ where: { id: courseId }, data: { curriculum, notes: allNotes } });

  } catch (err: any) {
    console.error(`Error in background slide generation:`, err);
    try {
      const course = await prisma.course.findUnique({ where: { id: courseId } });
      if (course) {
        let curr = (course.curriculum as any[]) || [];
        curr = curr.filter(c => c.type !== "ai_generation_status");
        curr.push({ type: "ai_generation_status", status: "failed", message: `Slayt üretilirken hata oluştu: ${err.message}` });
        await prisma.course.update({ where: { id: courseId }, data: { curriculum: curr } });
      }
    } catch (e) {}
  }
}

router.post('/courses/:course_id/start_background_generation', async (req: Request, res: Response): Promise<void> => {
  try {
    const teacherId = req.user ? parseInt(req.user.sub) : 0;
    const courseId = parseInt(req.params['course_id']);
    const { topic, difficulty = "Beginner", audience = "Hiç kodlama deneyimi olmayan öğrenciler.", chapters, pdf_content } = req.body;
    
    const course = await prisma.course.findFirst({ where: { id: courseId, teacher_id: teacherId } });
    if (!course) { res.status(404).json({ detail: 'Kurs bulunamadı.' }); return; }
    
    let curriculum = (course.curriculum as any[]) || [];
    curriculum = curriculum.filter(c => c.type !== "ai_generation_status");
    curriculum.push({ type: "ai_generation_status", status: "processing", current: 0, total: chapters.length, message: "Arka planda AI slayt üretimi başlatılıyor..." });
    
    await prisma.course.update({ where: { id: courseId }, data: { curriculum } });
    
    // Fire and forget
    runBackgroundSlideGeneration(courseId, teacherId, topic, difficulty, audience, chapters, pdf_content).catch(console.error);
    
    res.json({ success: true, message: "Arka planda slayt üretimi başlatıldı." });
  } catch (err: any) {
    res.status(500).json({ detail: err.message });
  }
});

export default router;
