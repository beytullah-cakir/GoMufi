"""
GoMufi — Gemini Yapay Zeka (AI) İçerik Üretim Router'ı.
"""
import json
import os
import random
import copy
from typing import List, Optional, Any, Dict
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from google import genai
from google.genai import types
from core.config import settings
from auth.dependencies import get_current_teacher_id

router = APIRouter()


class GenerateRoadmapRequest(BaseModel):
    topic: str
    difficulty: str
    lessons_count: int
    audience: str


class GenerateLessonSlidesRequest(BaseModel):
    topic: str
    difficulty: str
    audience: str
    lesson_number: int
    lesson_title: str
    lesson_objective: str
    modules: List[Any]


# --- GEMINI STRUCTURED OUTPUT SCHEMAS ---

class RoadmapModuleStructure(BaseModel):
    type: str  # e.g. "UNDERSTAND", "APPLY", "CONNECT", "CREATE", "QUIZ", "HOMEWORK"
    topic: str  # Specific sub-topic or task title

class RoadmapLessonStructure(BaseModel):
    lessonNumber: int
    title: str
    objective: str
    modules: List[RoadmapModuleStructure]

class RoadmapStructureResponse(BaseModel):
    courseTitle: str
    lessons: List[RoadmapLessonStructure]


class ElementContentPair(BaseModel):
    elementId: str
    content: str


class AILevelSlide(BaseModel):
    selectedTemplateId: str
    elementContents: List[ElementContentPair]

class AILevelContent(BaseModel):
    lessonNumber: int
    moduleIndex: int
    slides: List[AILevelSlide]

class AILevelContentsResponse(BaseModel):
    levelContents: List[AILevelContent]


class QuizOption(BaseModel):
    text: str
    isCorrect: bool

class QuizQuestion(BaseModel):
    questionText: str
    options: List[QuizOption]

class HomeworkData(BaseModel):
    title: str
    instructions: str
    submissionType: str
    points: int
    starterCode: str

class LessonSlidesResponse(BaseModel):
    modules_content: List[AILevelContent]
    quiz_map: List[QuizQuestion]
    homework_map: HomeworkData


@router.post("/courses/generate_roadmap")
async def generate_roadmap_api(
    req: GenerateRoadmapRequest,
    teacher_id: int = Depends(get_current_teacher_id)
):
    TEMPLATES_PATH = "slide_templates.json"
    try:
        # Load templates
        templates = []
        if os.path.exists(TEMPLATES_PATH):
            with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
                templates = json.load(f)
                
        # Group templates by category
        templates_by_category = {
            "ANLA": [],
            "UYGULA": [],
            "BİRLEŞTİR": [],
            "ÜRET": []
        }
        for t in templates:
            cat = t.get("category", "").upper()
            if cat in templates_by_category:
                elements_info = []
                for el in t.get("elements", []):
                    if el.get("type") in ["text", "code", "sticky", "challenge", "code_editor", "connection_task", "production_task"]:
                        elements_info.append({
                            "id": el.get("id"),
                            "type": el.get("type"),
                            "placeholder": el.get("content"),
                            "maxChars": el.get("maxChars")
                        })
                templates_by_category[cat].append({
                    "id": t.get("id"),
                    "title": t.get("title"),
                    "description": t.get("description"),
                    "elements": elements_info
                })
                
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        # --- PHASE 1: GENERATE ROADMAP STRUCTURE ---
        prompt_step1 = f"""
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is only to design the structure of a learning roadmap (lessons and modules sequence).

Goal: Given the course topic, difficulty, desired lesson count, and target audience, generate the sequence of lessons and modules.

Requirements:
- The roadmap consists of lessons.
- Each lesson contains a list of modules.
- Modules are selected from: UNDERSTAND, APPLY, CONNECT, CREATE, QUIZ, HOMEWORK.
- For each lesson, you should follow a strict pedagogical flow: start with exactly one UNDERSTAND module, then exactly one APPLY module, then optionally you can add a CONNECT module, optionally a CREATE module (you can add BOTH CONNECT and CREATE in the same lesson if it benefits the learning path), and end with exactly one QUIZ or HOMEWORK module. Do NOT duplicate UNDERSTAND, APPLY, QUIZ or HOMEWORK module types within a single lesson.
- Each module in the lessons modules list MUST have a specific, distinct `"topic"` string explaining what specific sub-topic or task this module covers. This is critical for generating unique slide contents later.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "courseTitle": "...",
  "lessons": [
    {{
      "lessonNumber": 1,
      "title": "Lesson title (Türkçe)",
      "objective": "Lesson learning objective (Türkçe)",
      "modules": [
        {{ "type": "UNDERSTAND", "topic": "Brief topic title for this module (Türkçe)" }},
        {{ "type": "APPLY", "topic": "Brief topic of the coding challenge (Türkçe)" }},
        {{ "type": "QUIZ", "topic": "Quiz topic (Türkçe)" }}
      ]
    }}
  ]
}}

Input:
Topic: {req.topic}
Difficulty: {req.difficulty}
Lessons Count: {req.lessons_count}
Audience: {req.audience}
"""
        response_step1 = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt_step1,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RoadmapStructureResponse
            )
        )
        
        roadmap_structure = json.loads(response_step1.text.strip())
        
        # --- PHASE 2: GENERATE SLIDES CONTENT FOR ALL MODULES ---
        prompt_step2 = f"""
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is to write detailed educational slide contents for the UNDERSTAND, APPLY, CONNECT, and CREATE modules in the provided curriculum.

Course:
Topic: {req.topic}
Difficulty: {req.difficulty}
Audience: {req.audience}

Curriculum Structure to populate:
{json.dumps(roadmap_structure, ensure_ascii=False, indent=2)}

Available Templates for each category:
- UNDERSTAND (ANLA) templates:
{json.dumps(templates_by_category["ANLA"], ensure_ascii=False, indent=2)}

- APPLY (UYGULA) templates:
{json.dumps(templates_by_category["UYGULA"], ensure_ascii=False, indent=2)}

- CONNECT (BİRLEŞTİR) templates:
{json.dumps(templates_by_category["BİRLEŞTİR"], ensure_ascii=False, indent=2)}

- CREATE (ÜRET) templates:
{json.dumps(templates_by_category["ÜRET"], ensure_ascii=False, indent=2)}

Requirements:
- For each module in the curriculum of type UNDERSTAND, APPLY, CONNECT, and CREATE, you MUST generate slide contents.
- For each module, choose the most suitable template from the available templates of its category.
- For UNDERSTAND: generate 2 to 4 slides explaining the lesson topic concepts.
- For APPLY: generate 1 to 2 slides with task instructions, code boilerplate or challenges.
- For CONNECT (BİRLEŞTİR): This module MUST NOT teach new theory, MUST NOT use daily life analogies, and MUST NOT provide concept definitions. Its ONLY goal is to make the student combine and use two or more previously learned concepts together in a single coding challenge. 
  * In the Connection Task template, the `connection_task` element content MUST be a JSON-serialized string formatted exactly like this to populate the connection task widget:
    {{"previousTopic": "Name of previous topic (e.g. Değişken Tanımlama)", "currentTopic": "Name of current topic (e.g. Koşullu İfadeler)", "taskText": "Detailed connection coding challenge instructions asking the student to combine both topics."}}
- For CREATE (ÜRET): This module is for building a small mini-project.
  * In the Produce Task template, the `production_task` element content MUST be a JSON-serialized string formatted exactly like this to populate the production task widget:
    {{"projectTitle": "Title of the project (e.g. Hesap Makinesi)", "taskText": "Detailed instructions on what to build", "expectedOutput": "Example console output showing what the running code should display", "estimatedTime": "Estimated completion time (e.g. 15 Dakika)", "hints": "Useful coding hint or tip"}}
  * Note: The JSON string for `connection_task` or `production_task` must be escaped properly so that it is a valid JSON string inside the outer JSON response. Escape double quotes with `\"` and use `\n` for line breaks. Do not write raw newlines inside the string values.
- For each element you populate in `elementContents`, you MUST strictly respect the `maxChars` limit defined in the template. The number of characters of your generated text (including spaces) for that element ID MUST NOT exceed its `maxChars` value to prevent UI text overflow. This is a critical visual layout constraint.
- Populate `elementContents` mapping the template element IDs to your generated educational contents in Turkish.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "levelContents": [
    {{
      "lessonNumber": 1,
      "moduleIndex": 0, // 0-based index of the module inside the lesson's modules list
      "slides": [
        {{
          "selectedTemplateId": "template_id_here",
          "elementContents": [
             {{ "elementId": "element_id_1", "content": "Generated text explanation in Turkish" }},
             {{ "elementId": "element_id_2", "content": "Generated python code or note in Turkish..." }}
          ]
        }}
      ]
    }}
  ]
}}
"""
        response_step2 = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt_step2,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=AILevelContentsResponse
            )
        )
        
        slide_contents_data = json.loads(response_step2.text.strip())
        level_contents_list = slide_contents_data.get("levelContents", [])
        
        # --- PHASE 3: MAP AND CONSTRUCT THE VISUAL CURRICULUM AND NOTES ---
        generated_lessons = roadmap_structure.get("lessons", [])
        
        curriculum = []
        notes = []
        overall_idx = 1
        
        theme_map = {
          "UNDERSTAND": "purple",
          "APPLY": "cyan",
          "CONNECT": "green",
          "CREATE": "yellow",
          "QUIZ": "quiz",
          "HOMEWORK": "homework"
        }
        
        all_templates_map = {
            "UNDERSTAND": templates_by_category["ANLA"],
            "APPLY": templates_by_category["UYGULA"],
            "CONNECT": templates_by_category["BİRLEŞTİR"],
            "CREATE": templates_by_category["ÜRET"]
        }
        
        for l_idx, les in enumerate(generated_lessons):
            lesson_num = les.get("lessonNumber") or (l_idx + 1)
            modules = les.get("modules", [])
            for m_idx, mod in enumerate(modules):
                mod_type = mod.get("type", "UNDERSTAND").upper()
                mapped_theme = theme_map.get(mod_type, "purple")
                
                level_id = f"sec_ai_{int(random.random() * 1000000000)}"
                
                node = {
                  "id": level_id,
                  "title": mod.get("topic") or f"Ders {overall_idx}" if mod_type not in ["QUIZ", "HOMEWORK"] else ("Konu Testi" if mod_type == "QUIZ" else "Ödev Görevi"),
                  "theme": mapped_theme,
                  "lectures": []
                }
                
                if m_idx == 0:
                  node["lessonTopic"] = les.get("title") or f"Ders Konusu {lesson_num}"
                  node["lessonNumber"] = lesson_num
                  
                curriculum.append(node)
                overall_idx += 1
                
                # Check if we should build slide content for this module type
                if mod_type in ["UNDERSTAND", "APPLY", "CONNECT", "CREATE"]:
                    # Find matching generated slide contents
                    matched_content = next((
                        lc for lc in level_contents_list 
                        if str(lc.get("lessonNumber")) == str(lesson_num) and str(lc.get("moduleIndex")) == str(m_idx)
                    ), None)
                    if not matched_content:
                        matched_content = next((
                            lc for lc in level_contents_list 
                            if str(lc.get("lessonNumber")) == str(lesson_num) and lc.get("moduleType", "").upper() == mod_type
                        ), None)
                    
                    
                    cat_templates = all_templates_map.get(mod_type, [])
                    
                    slides_to_add = []
                    ai_slides = []
                    if matched_content:
                        ai_slides = matched_content.get("slides") or []
                    
                    # Fallback if empty but templates exist (create at least 1 placeholder slide)
                    if not ai_slides and cat_templates:
                        ai_slides = [{"selectedTemplateId": cat_templates[0]["id"], "elementContents": {}}]
                        
                    if isinstance(ai_slides, dict):
                        ai_slides = [ai_slides]
                    elif not isinstance(ai_slides, list):
                        ai_slides = []
                        
                    for ai_slide in ai_slides:
                        sel_template_id = ai_slide.get("selectedTemplateId")
                        raw_contents = ai_slide.get("elementContents") or []
                        elem_contents = {}
                        if isinstance(raw_contents, list):
                            for pair in raw_contents:
                                if isinstance(pair, dict) and "elementId" in pair:
                                    elem_contents[pair["elementId"]] = pair.get("content") or ""
                        elif isinstance(raw_contents, dict):
                            elem_contents = raw_contents
                        
                        # Find original template elements
                        selected_t = next((t for t in templates if t.get("id") == sel_template_id), None)
                        # Fallback to category template if not found
                        if not selected_t and cat_templates:
                            selected_t = next((t for t in templates if t.get("id") == cat_templates[0]["id"]), None)
                            
                        if selected_t:
                            copied_elements = []
                            for el in selected_t.get("elements", []):
                                el_copy = copy.deepcopy(el)
                                el_id = el_copy.get("id")
                                if el_id in elem_contents:
                                    val = elem_contents[el_id]
                                    el_type = el_copy.get("type")
                                    if el_type == "connection_task":
                                        import json as pyjson
                                        try:
                                            parsed = pyjson.loads(val)
                                            el_copy["content"] = parsed.get("taskText") or val
                                            if "extra" not in el_copy or not el_copy["extra"]:
                                                el_copy["extra"] = {}
                                            el_copy["extra"]["previousTopic"] = parsed.get("previousTopic") or "Önceki Konu"
                                            el_copy["extra"]["currentTopic"] = parsed.get("currentTopic") or "Şimdiki Konu"
                                        except Exception:
                                            el_copy["content"] = val
                                    elif el_type == "production_task":
                                        import json as pyjson
                                        try:
                                            parsed = pyjson.loads(val)
                                            el_copy["content"] = parsed.get("taskText") or val
                                            if "extra" not in el_copy or not el_copy["extra"]:
                                                el_copy["extra"] = {}
                                            el_copy["extra"]["projectTitle"] = parsed.get("projectTitle") or "Proje Başlığı"
                                            el_copy["extra"]["expectedOutput"] = parsed.get("expectedOutput") or ""
                                            el_copy["extra"]["estimatedTime"] = parsed.get("estimatedTime") or "10 Dakika"
                                            el_copy["extra"]["hints"] = parsed.get("hints") or ""
                                        except Exception:
                                            el_copy["content"] = val
                                    else:
                                        el_copy["content"] = val
                                copied_elements.append(el_copy)
                                
                            slide = {
                                "id": int(random.random() * 1000000000),
                                "elements": copied_elements,
                                "background": selected_t.get("background", "default")
                            }
                            slides_to_add.append(slide)
                            
                    if slides_to_add:
                        note = {
                            "id": level_id,
                            "noteTitle": node["title"],
                            "slides": slides_to_add
                        }
                        notes.append(note)
                        
        return {"success": True, "curriculum": curriculum, "notes": notes, "roadmap": roadmap_structure}
        
    except Exception as e:
        print(f"Error generating roadmap: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/generate_roadmap_structure")
async def generate_roadmap_structure_api(
    req: GenerateRoadmapRequest,
    teacher_id: int = Depends(get_current_teacher_id)
):
    try:
        client = genai.Client(api_key=settings.MY_API_KEY)
        prompt = f"""
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is only to design the structure of a learning roadmap (lessons and modules sequence).

Goal: Given the course topic, difficulty, desired lesson count, and target audience, generate the sequence of lessons and modules.

Requirements:
- The roadmap consists of lessons.
- Each lesson contains a list of modules.
- Modules are selected from: UNDERSTAND, APPLY, CONNECT, CREATE, QUIZ, HOMEWORK.
- For each lesson, you should follow a strict pedagogical flow: start with exactly one UNDERSTAND module, then exactly one APPLY module, then optionally you can add a CONNECT module, optionally a CREATE module (you can add BOTH CONNECT and CREATE in the same lesson if it benefits the learning path), and end with exactly one QUIZ or HOMEWORK module. Do NOT duplicate UNDERSTAND, APPLY, QUIZ or HOMEWORK module types within a single lesson.
- Each module in the lessons modules list MUST have a specific, distinct `"topic"` string explaining what specific sub-topic or task this module covers. This is critical for generating unique slide contents later.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.


Expected JSON Structure:
{{
  "courseTitle": "...",
  "lessons": [
    {{
      "lessonNumber": 1,
      "title": "Lesson title (Türkçe)",
      "objective": "Lesson learning objective (Türkçe)",
      "modules": [
        {{ "type": "UNDERSTAND", "topic": "Brief topic title for this module (Türkçe)" }},
        {{ "type": "APPLY", "topic": "Brief topic of the coding challenge (Türkçe)" }},
        {{ "type": "QUIZ", "topic": "Quiz topic (Türkçe)" }}
      ]
    }}
  ]
}}

Input:
Topic: {req.topic}
Difficulty: {req.difficulty}
Lessons Count: {req.lessons_count}
Audience: {req.audience}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RoadmapStructureResponse
            )
        )
        
        data = json.loads(response.text.strip())
        return {"success": True, "roadmap": data}
    except Exception as e:
        print(f"Error planning roadmap structure: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/courses/generate_lesson_slides")
async def generate_lesson_slides_api(
    req: GenerateLessonSlidesRequest,
    teacher_id: int = Depends(get_current_teacher_id)
):
    TEMPLATES_PATH = "slide_templates.json"
    
    try:
        # Load templates
        templates = []
        if os.path.exists(TEMPLATES_PATH):
            with open(TEMPLATES_PATH, "r", encoding="utf-8") as f:
                templates = json.load(f)
                
        # Group templates by category
        templates_by_category = {
            "ANLA": [],
            "UYGULA": [],
            "BİRLEŞTİR": [],
            "ÜRET": []
        }
        for t in templates:
            cat = t.get("category", "").upper()
            if cat in templates_by_category:
                elements_info = []
                for el in t.get("elements", []):
                    if el.get("type") in ["text", "code", "sticky", "challenge", "code_editor", "connection_task", "production_task"]:
                        elements_info.append({
                            "id": el.get("id"),
                            "type": el.get("type"),
                            "placeholder": el.get("content"),
                            "maxChars": el.get("maxChars")
                        })
                templates_by_category[cat].append({
                    "id": t.get("id"),
                    "title": t.get("title"),
                    "description": t.get("description"),
                    "elements": elements_info
                })
                
        client = genai.Client(api_key=settings.MY_API_KEY)
        
        prompt = f"""
Role: You are an expert instructional designer and curriculum planner. Türkçe cevap ver.
Your task is to write detailed educational slide, quiz, and homework contents for the UNDERSTAND, APPLY, CONNECT, CREATE, QUIZ, and HOMEWORK modules in the provided single lesson.

Course context:
Topic: {req.topic}
Difficulty: {req.difficulty}
Audience: {req.audience}

Lesson to populate:
Lesson Number: {req.lesson_number}
Lesson Title: {req.lesson_title}
Lesson Objective: {req.lesson_objective}
Modules list: {json.dumps(req.modules, ensure_ascii=False)}

Available Templates for each category:
- UNDERSTAND (ANLA) templates:
{json.dumps(templates_by_category["ANLA"], ensure_ascii=False, indent=2)}

- APPLY (UYGULA) templates:
{json.dumps(templates_by_category["UYGULA"], ensure_ascii=False, indent=2)}

- CONNECT (BİRLEŞTİR) templates:
{json.dumps(templates_by_category["BİRLEŞTİR"], ensure_ascii=False, indent=2)}

- CREATE (ÜRET) templates:
{json.dumps(templates_by_category["ÜRET"], ensure_ascii=False, indent=2)}

Requirements:
- For each module in the lesson of type UNDERSTAND, APPLY, CONNECT, and CREATE, you MUST generate slide contents.
- For each module, choose the most suitable template from the available templates of its category.
- For UNDERSTAND: generate 2 to 4 slides explaining the lesson topic concepts.
- For APPLY: generate 1 to 2 slides with task instructions, code boilerplate or challenges.
- For CONNECT (BİRLEŞTİR): This module MUST NOT teach new theory, MUST NOT use daily life analogies, and MUST NOT provide concept definitions. Its ONLY goal is to make the student combine and use two or more previously learned concepts together in a single coding challenge. 
  * In the Connection Task template, the `connection_task` element content MUST be a JSON-serialized string formatted exactly like this to populate the connection task widget:
    {{"previousTopic": "Name of previous topic (e.g. Değişken Tanımlama)", "currentTopic": "Name of current topic (e.g. Koşullu İfadeler)", "taskText": "Detailed connection coding challenge instructions asking the student to combine both topics."}}
- For CREATE (ÜRET): This module is for building a small mini-project.
  * In the Produce Task template, the `production_task` element content MUST be a JSON-serialized string formatted exactly like this to populate the production task widget:
    {{"projectTitle": "Title of the project (e.g. Hesap Makinesi)", "taskText": "Detailed instructions on what to build", "expectedOutput": "Example console output showing what the running code should display", "estimatedTime": "Estimated completion time (e.g. 15 Dakika)", "hints": "Useful coding hint or tip"}}
  * Note: The JSON string for `connection_task` or `production_task` must be escaped properly so that it is a valid JSON string inside the outer JSON response. Escape double quotes with `\"` and use `\n` for line breaks. Do not write raw newlines inside the string values.
- For QUIZ: generate 3 multiple-choice questions about the lesson topic. Each question must have 1 correct option and 3 incorrect options.
- For HOMEWORK: generate 1 practical homework task. Decide if the student should submit code, text, image, or file.
  * For programming topics, use "code" submissionType. For conceptual tasks, use "text".
  * For "code" type: provide a small starterCode template.
- For each element you populate in `elementContents`, you MUST strictly respect the `maxChars` limit defined in the template. The number of characters of your generated text (including spaces) for that element ID MUST NOT exceed its `maxChars` value to prevent UI text overflow. This is a critical visual layout constraint.
- Populate `elementContents` mapping the template element IDs to your generated educational contents in Turkish.
- Return ONLY valid JSON matching the structure below. No markdown formatting, no text before or after the JSON.

Expected JSON Structure:
{{
  "modules_content": [
    {{
      "lessonNumber": {req.lesson_number},
      "moduleIndex": 0, // 0-based index of the module in the lesson's modules list
      "slides": [
        {{
          "selectedTemplateId": "template_id_here",
          "elementContents": [
             {{ "elementId": "element_id_1", "content": "Generated text explanation in Turkish" }},
             {{ "elementId": "element_id_2", "content": "Generated python code or note..." }}
          ]
        }}
      ]
    }}
  ],
  "quiz_map": [
    {{
      "questionText": "Question text in Turkish?",
      "options": [
        {{ "text": "Correct Option text in Turkish", "isCorrect": true }},
        {{ "text": "Incorrect Option text in Turkish", "isCorrect": false }},
        {{ "text": "Another Incorrect Option", "isCorrect": false }},
        {{ "text": "Another Incorrect Option", "isCorrect": false }}
      ]
    }}
  ],
  "homework_map": {{
    "title": "Homework Title in Turkish",
    "instructions": "Step-by-step homework instructions/questions in Turkish",
    "submissionType": "code",
    "points": 100,
    "starterCode": "# Write starter code or comment template here in Turkish"
  }}
}}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=LessonSlidesResponse
            )
        )
        
        slide_contents_data = json.loads(response.text.strip())
        modules_content = slide_contents_data.get("modules_content") or []
        
        # Build slides and notes
        theme_map = {
          "UNDERSTAND": "purple",
          "APPLY": "cyan",
          "CONNECT": "green",
          "CREATE": "yellow",
          "QUIZ": "quiz",
          "HOMEWORK": "homework"
        }
        
        all_templates_map = {
            "UNDERSTAND": templates_by_category["ANLA"],
            "APPLY": templates_by_category["UYGULA"],
            "CONNECT": templates_by_category["BİRLEŞTİR"],
            "CREATE": templates_by_category["ÜRET"]
        }
        
        generated_modules = []
        generated_notes = []
        
        for m_idx, mod in enumerate(req.modules):
            mod_type = mod.get("type", "UNDERSTAND").upper()
            mapped_theme = theme_map.get(mod_type, "purple")
            level_id = f"sec_ai_{int(random.random() * 1000000000)}"
            
            node = {
              "id": level_id,
              "title": mod.get("topic") or "" if mod_type not in ["QUIZ", "HOMEWORK"] else ("Konu Testi" if mod_type == "QUIZ" else "Ödev Görevi"),
              "theme": mapped_theme,
              "lectures": []
            }
            
            if m_idx == 0:
              node["lessonTopic"] = req.lesson_title
              node["lessonNumber"] = req.lesson_number
              
            generated_modules.append(node)
            
            if mod_type in ["UNDERSTAND", "APPLY", "CONNECT", "CREATE"]:
                # Find matching generated slides by moduleIndex
                matched = next((
                    mc for mc in modules_content 
                    if str(mc.get("moduleIndex")) == str(m_idx)
                ), None)
                
                ai_slides = []
                if matched:
                    ai_slides = matched.get("slides") or []
                    
                cat_templates = all_templates_map.get(mod_type, [])
                
                # Fallback if empty but templates exist
                if not ai_slides and cat_templates:
                    ai_slides = [{"selectedTemplateId": cat_templates[0]["id"], "elementContents": {}}]
                    
                if isinstance(ai_slides, dict):
                    ai_slides = [ai_slides]
                elif not isinstance(ai_slides, list):
                    ai_slides = []
                    
                slides_to_add = []
                for ai_slide in ai_slides:
                    sel_template_id = ai_slide.get("selectedTemplateId")
                    raw_contents = ai_slide.get("elementContents") or []
                    elem_contents = {}
                    if isinstance(raw_contents, list):
                        for pair in raw_contents:
                            if isinstance(pair, dict) and "elementId" in pair:
                                elem_contents[pair["elementId"]] = pair.get("content") or ""
                    elif isinstance(raw_contents, dict):
                        elem_contents = raw_contents
                    
                    # Find original template elements
                    selected_t = next((t for t in templates if t.get("id") == sel_template_id), None)
                    # Fallback to category template if not found
                    if not selected_t and cat_templates:
                        selected_t = next((t for t in templates if t.get("id") == cat_templates[0]["id"]), None)
                        
                    if selected_t:
                        copied_elements = []
                        for el in selected_t.get("elements", []):
                            el_copy = copy.deepcopy(el)
                            el_id = el_copy.get("id")
                            if el_id in elem_contents:
                                val = elem_contents[el_id]
                                el_type = el_copy.get("type")
                                if el_type == "connection_task":
                                    import json as pyjson
                                    try:
                                        parsed = pyjson.loads(val)
                                        el_copy["content"] = parsed.get("taskText") or val
                                        if "extra" not in el_copy or not el_copy["extra"]:
                                            el_copy["extra"] = {}
                                        el_copy["extra"]["previousTopic"] = parsed.get("previousTopic") or "Önceki Konu"
                                        el_copy["extra"]["currentTopic"] = parsed.get("currentTopic") or "Şimdiki Konu"
                                    except Exception:
                                        el_copy["content"] = val
                                elif el_type == "production_task":
                                    import json as pyjson
                                    try:
                                        parsed = pyjson.loads(val)
                                        el_copy["content"] = parsed.get("taskText") or val
                                        if "extra" not in el_copy or not el_copy["extra"]:
                                            el_copy["extra"] = {}
                                        el_copy["extra"]["projectTitle"] = parsed.get("projectTitle") or "Proje Başlığı"
                                        el_copy["extra"]["expectedOutput"] = parsed.get("expectedOutput") or ""
                                        el_copy["extra"]["estimatedTime"] = parsed.get("estimatedTime") or "10 Dakika"
                                        el_copy["extra"]["hints"] = parsed.get("hints") or ""
                                    except Exception:
                                        el_copy["content"] = val
                                else:
                                    el_copy["content"] = val
                            copied_elements.append(el_copy)
                            
                        slide = {
                            "id": int(random.random() * 1000000000),
                            "elements": copied_elements,
                            "background": selected_t.get("background", "default")
                        }
                        slides_to_add.append(slide)
                        
                if slides_to_add:
                    note = {
                        "id": level_id,
                        "noteTitle": "",
                        "slides": slides_to_add
                    }
                    generated_notes.append(note)
            
            elif mod_type == "QUIZ":
                quiz_questions = slide_contents_data.get("quiz_map") or []
                questions_list = []
                
                if quiz_questions:
                    for idx, qq in enumerate(quiz_questions):
                        options_list = []
                        for opt_idx, opt in enumerate(qq.get("options", [])):
                            options_list.append({
                                "id": str(opt_idx + 1),
                                "text": opt.get("text", ""),
                                "isCorrect": opt.get("isCorrect", False)
                            })
                        questions_list.append({
                            "id": f"q-{idx + 1}-{int(random.random() * 100000)}",
                            "text": qq.get("questionText", "Soru"),
                            "options": options_list
                        })
                
                # Fallback if empty
                if not questions_list:
                    questions_list = [{
                        "id": "mock-q-1",
                        "text": f"{req.lesson_title} Konu Değerlendirme Sorusu",
                        "options": [
                            { "id": "1", "text": "Doğru Seçenek", "isCorrect": true },
                            { "id": "2", "text": "Yanlış Seçenek 1", "isCorrect": false },
                            { "id": "3", "text": "Yanlış Seçenek 2", "isCorrect": false },
                            { "id": "4", "text": "Yanlış Seçenek 3", "isCorrect": false }
                        ]
                    }]
                
                quiz_slide = {
                    "id": int(random.random() * 1000000000),
                    "type": "game",
                    "gameType": "matching",
                    "gameConfig": {
                        "timeLimit": 60,
                        "questions": questions_list
                    },
                    "elements": []
                }
                
                note = {
                    "id": level_id,
                    "noteTitle": "",
                    "slides": [quiz_slide]
                }
                generated_notes.append(note)
            
            elif mod_type == "HOMEWORK":
                hw_data = slide_contents_data.get("homework_map") or {}
                hw_title = hw_data.get("title") or f"{req.lesson_title} Ödev Görevi"
                hw_instructions = hw_data.get("instructions") or "Lütfen bu konuyla ilgili ödevinizi tamamlayıp yükleyin."
                hw_sub_type = hw_data.get("submissionType") or "text"
                hw_points = hw_data.get("points") or 100
                hw_starter = hw_data.get("starterCode") or "# Kodunuzu buraya yazın\n"
                
                homework_slide = {
                    "id": int(random.random() * 1000000000),
                    "type": "homework",
                    "background": "default",
                    "homeworkConfig": {
                        "title": hw_title,
                        "instructions": hw_instructions,
                        "submissionType": hw_sub_type,
                        "points": hw_points,
                        "starterCode": hw_starter
                    },
                    "elements": []
                }
                
                note = {
                    "id": level_id,
                    "noteTitle": "",
                    "slides": [homework_slide]
                }
                generated_notes.append(note)
                    
        return {"success": True, "modules": generated_modules, "notes": generated_notes}
    except Exception as e:
        print(f"Error generating lesson slides: {e}")
        raise HTTPException(status_code=500, detail=str(e))
