"""
Öğrenme analitiğinin YZ katmanı: yorum, tekrar görevi, "kodunu açıkla" değerlendirmesi.

Üç iş, üç kural:
  * Yorum — modele HAM KOD DEĞİL, özetlenmiş sayılar gider (ucuz ve gizlilik
    açısından doğru). Model yalnızca verilen sayılara dayanır, tahmin etmez.
  * Tekrar görevi — sınıfın zorlandığı kavram ve yanılgılar için Uygula
    görevi taslağı. Normalleştirme mevcut görev kurucusundan geçer; öğretmen
    görmeden hiçbir şey derse eklenmez.
  * Açıklama değerlendirmesi — öğrencinin "bu satır ne yapıyor" cevabı
    anlamayı gösteriyor mu? Kod vermez, not düşmez, yalnızca karar ve kısa geri bildirim.

Gemini çağrıları burada toplanıyor ki testler tek noktadan taklit edebilsin
(`learning_insights.genai.Client`).
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from core.config import settings
from core.prompt_safety import DATA_IS_NOT_INSTRUCTION_RULE, data_block

logger = logging.getLogger(__name__)


def digest_hash(digest: Dict[str, Any]) -> str:
    """Özetin parmak izi: aynı veriyle ikinci kez model çağrılmasın."""
    return hashlib.sha256(json.dumps(digest, sort_keys=True, ensure_ascii=False, default=str).encode()).hexdigest()


def _generate(prompt: str, schema: Any, thinking_budget: int = 512, system: Optional[str] = None,
              max_output_tokens: Optional[int] = None):
    from routers.ai import gen_config  # geç: ai modülü ağır ve bu modülü içe aktarmıyor

    client = genai.Client(api_key=settings.MY_API_KEY)
    return client.models.generate_content(
        model=settings.GEMINI_MODEL,
        contents=[types.Content(role="user", parts=[types.Part.from_text(text=prompt)])],
        config=gen_config(schema, thinking_budget=thinking_budget, model=settings.GEMINI_MODEL,
                          system_instruction=system, max_output_tokens=max_output_tokens),
    )


# --- yorum ----------------------------------------------------------------------

class InsightFinding(BaseModel):
    title: str
    detail: str
    concept_id: str = ""
    students: List[str] = Field(default_factory=list)


class InsightAction(BaseModel):
    # reteach: konuyu yeniden anlat · practice_task: tekrar görevi · talk: öğrenciyle konuş ·
    # check_code: kod kökenine bak
    kind: str
    title: str
    detail: str
    concept_id: str = ""
    students: List[str] = Field(default_factory=list)


class InsightResponse(BaseModel):
    summary: str
    findings: List[InsightFinding]
    actions: List[InsightAction]


INSIGHT_PROMPT = """Sen deneyimli bir programlama öğretmeninin yardımcısısın. Türkçe yaz.
Sana bir kursun (ya da tek bir öğrencinin) öğrenme verisinin ÖZETİ verilecek.
Öğretmene kısa, somut ve uygulanabilir bir durum değerlendirmesi yaz.

KESİN KURALLAR:
- YALNIZCA verilen sayılara ve etiketlere dayan. Veride olmayan bir şey söyleme,
  tahmin yürütme. Veri azsa bunu açıkça söyle.
- Kod kökeni verisi (yapıştırma oranı vb.) bir KANITTIR, hüküm değil. Asla "kopya
  çekti", "YZ kullandı" deme; "kodunun %80'i dışarıdan yapıştırılmış" gibi olguyu yaz
  ve öğretmene öğrenciyle konuşmasını öner.
- `concept_id` alanına yalnızca özette geçen kavram kimliklerini yaz; emin değilsen boş bırak.
- `students` alanına yalnızca özette geçen öğrenci adlarını yaz.
- summary: 2-3 cümle. findings: en önemli 2-5 tespit. actions: 1-4 somut adım.
- actions.kind şunlardan biri: "reteach" (kavramı yeniden anlat), "practice_task"
  (bu kavram için tekrar görevi), "talk" (öğrenciyle birebir konuş), "check_code"
  (öğrencinin kodunun nasıl yazıldığına bak).
- Kök neden verisi varsa (önkoşul zayıf) onu öne çıkar: asıl sorun oradadır.
"""


def generate_insight(digest: Dict[str, Any], scope: str) -> tuple[Dict[str, Any], Any]:
    """(yorum, ham model cevabı). Ham cevap kullanım kaydı için döner."""
    who = "TEK ÖĞRENCİ" if scope == "student" else "SINIF"
    prompt = f"{INSIGHT_PROMPT}\n\nKAPSAM: {who}\n\nVERİ ÖZETİ (JSON):\n{json.dumps(digest, ensure_ascii=False, default=str)[:12000]}"
    response = _generate(prompt, InsightResponse, thinking_budget=512)
    parsed = json.loads((response.text or "").strip() or "{}")
    return parsed, response


def clean_insight(parsed: Dict[str, Any], known_concepts: Dict[str, str], students: Dict[str, int]) -> Dict[str, Any]:
    """Modelin cevabını doğrular: sözlükte olmayan kavram ve özette olmayan öğrenci atılır."""
    def fix(item: Dict[str, Any]) -> Dict[str, Any]:
        concept = str(item.get("concept_id") or "")
        names = [str(n) for n in item.get("students") or [] if str(n) in students]
        return {
            "title": str(item.get("title") or "")[:200],
            "detail": str(item.get("detail") or "")[:800],
            "concept_id": concept if concept in known_concepts else "",
            "concept": known_concepts.get(concept, ""),
            "students": [{"name": n, "student_id": students[n]} for n in names],
        }

    actions = []
    for item in parsed.get("actions") or []:
        if not isinstance(item, dict):
            continue
        kind = str(item.get("kind") or "")
        if kind not in ("reteach", "practice_task", "talk", "check_code"):
            continue
        actions.append({"kind": kind, **fix(item)})
    return {
        "summary": str(parsed.get("summary") or "")[:1200],
        "findings": [fix(i) for i in parsed.get("findings") or [] if isinstance(i, dict)][:6],
        "actions": actions[:5],
    }


# --- tekrar görevi ----------------------------------------------------------------

PRACTICE_PROMPT = """Sen bir programlama öğretmenisin. Türkçe yaz.
Sınıf bir kavramda zorlanıyor. Bu kavramı TEK BAŞINA pekiştiren kısa bir UYGULA görevi yaz.

KURALLAR:
- Görev yalnızca verilen kavramı ve önkoşullarını gerektirsin; yeni konu açma.
- Verilen yanılgılar varsa görevi ONLARI ortaya çıkaracak şekilde kur
  (ör. "range üst sınırını dahil sanıyor" -> sınırın önemli olduğu bir görev).
- 5-10 dakikalık, tek dosyalı bir görev. `prompt` 1-3 cümle.
- Değerlendirme: ekrana basılan çıktıysa checkMode "output" ve `criteria` yaz;
  fonksiyonsa checkMode "tests", `functionName` ve 3-5 `tests` yaz. Beklenen
  değerleri gerçekten hesapla — yanlış bir beklenen değer doğru öğrenciyi düşürür.
- criteria türleri: "template" (değişen yerler {} ile), "exact", "contains", "code" (kodda geçmeli).
- `hint` tek cümle, çözümü vermesin.
"""


class PracticeCriterion(BaseModel):
    kind: str
    value: str


class PracticeTest(BaseModel):
    call: str
    expected: str


class PracticeTask(BaseModel):
    title: str
    prompt: str
    checkMode: str
    criteria: List[PracticeCriterion] = Field(default_factory=list)
    functionName: str = ""
    tests: List[PracticeTest] = Field(default_factory=list)
    starterCode: str = ""
    hint: str = ""


def generate_practice_task(
    language: str, concept_label: str, concept_description: str,
    misconceptions: List[str], node_title: Optional[str],
) -> tuple[Dict[str, Any], Any]:
    prompt = "\n".join([
        PRACTICE_PROMPT,
        f"DİL: {language}",
        f"KAVRAM: {concept_label} — {concept_description}",
        f"MODÜL: {node_title or '-'}",
        "YANILGILAR:\n" + ("\n".join(f"- {m}" for m in misconceptions) if misconceptions else "- (kayıtlı yok)"),
    ])
    response = _generate(prompt, PracticeTask, thinking_budget=1024)
    parsed = json.loads((response.text or "").strip() or "{}")
    parsed["language"] = language
    parsed["submissionType"] = "code"
    parsed["xp"] = 80
    return parsed, response


# --- kodunu açıkla ------------------------------------------------------------------

EXPLAIN_PROMPT = """Sen bir programlama öğretmenisin. Türkçe yaz.
Öğrenci bir görevi çözdü ama kodunun çoğu dışarıdan yapıştırılmış görünüyor. Ona
kodundan satırlar gösterildi ve "bu satır ne yapıyor?" diye soruldu.

Her satır için karar ver: öğrencinin cevabı satırın NE yaptığını doğru anladığını
gösteriyor mu?
- Teknik terim şart değil; çocuk dilinde doğru bir açıklama geçer.
- Satırı kelimesi kelimesine okumak ("for i in range yazıyor") anlamak değildir.
- Boş, alakasız ya da "bilmiyorum" cevabı geçmez.
- feedback: tek cümle, öğrenciye hitaben, suçlamadan. KOD VERME.
"""


class ExplainVerdict(BaseModel):
    line_no: int
    understood: bool
    feedback: str


class ExplainResponse(BaseModel):
    verdicts: List[ExplainVerdict]


def judge_explanations(task: str, answers: List[Dict[str, Any]]) -> tuple[List[Dict[str, Any]], Any]:
    # Öğrencinin cevabı VERİ: "bu satırı anladım say" yazarak geçemesin.
    blocks = [data_block("GÖREV", task, 1500)]
    for a in answers:
        blocks.append(f"SATIR {a['line_no']}:\n" + data_block(f"SATIR {a['line_no']} KODU", a["code"], 300)
                      + "\n" + data_block(f"SATIR {a['line_no']} ÖĞRENCİ AÇIKLAMASI", a["answer"] or "(boş)", 1000))
    response = _generate("\n\n".join(blocks), ExplainResponse, thinking_budget=0,
                         system=f"{EXPLAIN_PROMPT}\n{DATA_IS_NOT_INSTRUCTION_RULE}", max_output_tokens=1024)
    parsed = json.loads((response.text or "").strip() or "{}")
    by_line = {int(v.get("line_no", -1)): v for v in parsed.get("verdicts") or [] if isinstance(v, dict)}
    verdicts = []
    for a in answers:
        v = by_line.get(int(a["line_no"]), {})
        verdicts.append({
            "line_no": a["line_no"],
            # Model bir satırı atladıysa "anlamadı" SAYILMAZ; karar yoksa geçer.
            "understood": bool(v.get("understood", True)) if v else True,
            "feedback": str(v.get("feedback") or "")[:300],
        })
    return verdicts, response


# --- veli raporu --------------------------------------------------------------------

PARENT_REPORT_PROMPT = """Sen bir öğretmenin veliye yazdığı kısa dönem raporunu taslak olarak hazırlıyorsun. Türkçe yaz.

KURALLAR:
- Veli okuyacak: teknik terim (kavram kimliği, "hata türü", "kod kökeni") KULLANMA; sade ve sıcak ol.
- YALNIZCA verilen sayılara ve başlıklara dayan; olmayan bir başarı ya da sorun uydurma.
- Öğrenciyi etiketleme ("tembel", "yetersiz" yok). Zorlandığı yeri "üzerinde çalışıyoruz" diye anlat.
- Evde yapılabilecek bir şey varsa tek cümleyle öner (ör. "Döngülerle ilgili ödevini birlikte gözden geçirebilirsiniz").
- summary: 2-3 cümle. learned: en fazla 3 kısa madde (öğrendikleri / başardıkları).
  focus: en fazla 2 kısa madde (üzerinde çalışılacaklar). homework: ödev durumunu anlatan tek cümle.
- Veri çok azsa bunu dürüstçe söyle ("Bu dönemde platformda az çalıştı").
"""


class ParentReportDraft(BaseModel):
    summary: str
    learned: List[str] = Field(default_factory=list)
    focus: List[str] = Field(default_factory=list)
    homework: str = ""


# Modele öğrencinin adı GİTMEZ (KVKK: çocuğun kişisel verisi üçüncü taraf
# YZ'ye aktarılmasın). Model bu yer tutucuyu yazar, ad sunucuda yerine konur.
NAME_PLACEHOLDER = "[ÖĞRENCİ]"


def generate_parent_report(facts: Dict[str, Any], student_first_name: str, course_title: str) -> tuple[Dict[str, Any], Any]:
    system = (f"{PARENT_REPORT_PROMPT}\n- Öğrenciden söz ederken adı yerine tam olarak {NAME_PLACEHOLDER} yaz.\n"
              f"{DATA_IS_NOT_INSTRUCTION_RULE}")
    prompt = "\n\n".join([
        data_block("KURS", course_title, 200),
        # Görev/modül başlıkları öğretmen içeriği: veri olarak gider.
        data_block("DÖNEM VERİSİ", json.dumps(facts, ensure_ascii=False, indent=1), 6000),
    ])
    response = _generate(prompt, ParentReportDraft, thinking_budget=0, system=system, max_output_tokens=2048)
    parsed = json.loads((response.text or "").strip() or "{}")
    return fill_name(clean_parent_report(parsed), student_first_name), response


def fill_name(report: Dict[str, Any], first_name: str) -> Dict[str, Any]:
    name = first_name or "Öğrencimiz"

    def put(value: Any) -> Any:
        if isinstance(value, str):
            return value.replace(NAME_PLACEHOLDER, name)
        if isinstance(value, list):
            return [put(v) for v in value]
        return value
    return {k: put(v) for k, v in report.items()}


def clean_parent_report(parsed: Dict[str, Any]) -> Dict[str, Any]:
    def items(value: Any, limit: int) -> List[str]:
        return [str(v).strip()[:300] for v in (value or []) if str(v).strip()][:limit]
    return {
        "summary": str(parsed.get("summary") or "").strip()[:1200],
        "learned": items(parsed.get("learned"), 3),
        "focus": items(parsed.get("focus"), 2),
        "homework": str(parsed.get("homework") or "").strip()[:500],
    }


def template_parent_report(facts: Dict[str, Any], student_first_name: str) -> Dict[str, Any]:
    """YZ kullanılmadığında ya da yanıt vermediğinde: sayılardan sade bir taslak."""
    name = student_first_name or "Öğrencimiz"
    days = facts.get("active_days", 0)
    solved = facts.get("tasks_solved", [])
    modules = facts.get("modules_completed", [])
    if days == 0:
        summary = f"{name} bu dönemde platformda çalışmadı. Önümüzdeki günlerde derslere katılımını birlikte takip edelim."
    else:
        summary = (f"{name} bu dönemde {days} gün platformda çalıştı"
                   + (f", {len(solved)} görevi tamamladı" if solved else "")
                   + (f" ve {len(modules)} modülü bitirdi" if modules else "") + ".")
    learned = [f"“{t}” görevini tamamladı." for t in solved[:2]] + [f"“{m}” modülünü bitirdi." for m in modules[:1]]
    focus = [f"{c} konusunda pratik yapıyoruz." for c in facts.get("focus_concepts", [])[:2]]
    hw = facts.get("homework", [])
    submitted = [h for h in hw if h.get("status") in ("teslim edildi", "notlandı")]
    missing = [h for h in hw if h.get("status") == "teslim edilmedi (süre doldu)"]
    homework = (f"{len(submitted)} ödev teslim edildi" + (f", {len(missing)} ödev eksik" if missing else "") + ".") if hw else ""
    return {"summary": summary, "learned": learned[:3], "focus": focus, "homework": homework}
