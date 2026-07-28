"""
AI birim ekonomisi — kullanım loglarından türetilen ortalama maliyet metrikleri.

Amaç: "ortalama bir modül şu kadar yakıyor", "8 derslik bir kurs şu kadara mal
oluyor" gibi birim maliyet sorularını yanıtlamak.

ÖNEMLİ ÖLÇÜM SINIRI: Bir ders slayt üretimi TEK Gemini çağrısında dersin TÜM
modüllerini (Anla, Uygula, Birleştir, Üret, Quiz...) birlikte üretir — bu, maliyet
optimizasyonunun temeliydi. Bu yüzden tek bir modül tipinin (örn. yalnız "Anla")
maliyeti doğrudan ÖLÇÜLEMEZ. Aşağıda iki tür değer üretilir:
  * ÖLÇÜLEN: ders başına, modül başına (ders maliyeti / modül sayısı) ve kurs başına
    gerçek ortalamalar.
  * TAHMİNİ: ölçülen ders maliyetini modül tiplerine, ürettikleri ortalama slayt
    sayısına (ağırlık) göre dağıtan kestirim. `estimated_*` alanları buna aittir.
"""
import re
from typing import List, Dict, Any, Optional

# Bir slayt-üreten çağrı = tek bir ders (içindeki tüm modüller birlikte üretilir).
LESSON_GEN_ACTIONS = ("generate_lesson_slides",)

# details alanından modül sayısı: "... | Modül Sayısı: 7"
_MODULE_COUNT_RE = re.compile(r"Modül Sayısı:\s*(\d+)")

# Modül tiplerinin bir derste ürettiği ORTALAMA slayt ağırlığı (prompt kurallarından:
# Anla 2-4 slayt, Uygula 1-2, Birleştir/Üret 1'er, Quiz/Ödev yapısal tek çıktı).
# Ölçülen ders maliyetini tiplere dağıtmak için kullanılır (TAHMİN).
MODULE_TYPE_WEIGHTS: Dict[str, float] = {
    "UNDERSTAND": 3.0,
    "APPLY": 1.5,
    "CONNECT": 1.0,
    "CREATE": 1.0,
    "QUIZ": 0.6,
    "HOMEWORK": 0.5,
}
MODULE_TYPE_LABELS: Dict[str, str] = {
    "UNDERSTAND": "Anla",
    "APPLY": "Uygula",
    "CONNECT": "Birleştir",
    "CREATE": "Üret",
    "QUIZ": "Quiz",
    "HOMEWORK": "Ödev",
}
# Tipik bir dersin modül dizilimi (prompt kuralı): 2×(Anla→Uygula) + Birleştir + Üret + Quiz
TYPICAL_LESSON_COMPOSITION = ["UNDERSTAND", "APPLY", "UNDERSTAND", "APPLY", "CONNECT", "CREATE", "QUIZ"]

# Tam kurs projeksiyonunda varsayılan ders sayısı.
PROJECTION_LESSONS = 8

# İşlem kategorileri → hangi action'ları kapsadığı (kategori bazlı maliyet tablosu için).
# Sıra, panelde gösterilecek satır sırasıdır. "Görsel üretimi" ayrı ele alınır (AI yok).
OPERATION_CATEGORIES = [
    ("Müfredat/yol haritası", ("generate_roadmap_structure", "generate_roadmap_content")),
    ("Ders planı", ("suggest_lesson_modules", "suggest_lesson_title", "suggest_level_details",
                    "distribute_topics", "suggest_raw_topics")),
    ("Slayt/içerik üretimi", ("generate_lesson_slides",)),
    # Canvas Builder'daki "AI ile Tekrar Oluştur" — tek modül yeniden üretimi, ilk
    # üretimden AYRI bir kalem (öğretmenin iterasyon/deneme maliyetini görünür kılar).
    ("Modül Tekrar Oluşturma", ("regenerate_lesson_module",)),
    ("Quiz/soru üretimi", ("generate_quiz",)),
    # Kutusuna sığmayan slayt metinlerini modele yeniden yazdırma (kesme yerine).
    # Ucuz model + thinking kapalı; yalnızca gerçekten taşma olduğunda çağrılır.
    ("Metin sığdırma (düzeltme)", ("shrink_slide_texts",)),
    ("Diğer AI işlemi", ("expand_topics", "evaluate_homework")),
]
_FALLBACK_CATEGORY = "Diğer AI işlemi"
# Panelde gösterim sırası (Görsel, Diğer'den önce)
_OPERATION_ORDER = [
    "Müfredat/yol haritası", "Ders planı", "Slayt/içerik üretimi", "Modül Tekrar Oluşturma",
    "Quiz/soru üretimi", "Metin sığdırma (düzeltme)", "Görsel üretimi", "Diğer AI işlemi",
]


def compute_operation_breakdown(
    log_rows: List[Dict[str, Any]],
    lessons_generated: int,
    usd_to_try: float,
    lessons_per_month: int,
) -> Dict[str, Any]:
    """
    İşlem kategorisi başına birim maliyet + ders başı + öğretmen/ay projeksiyonu.

    log_rows: her log için {"action", "model", "cost_usd", "created_at"(datetime|None)}
    lessons_generated: ölçülen toplam ders üretim sayısı (amortisman paydası)
    lessons_per_month: bir öğretmenin ayda ürettiği varsayılan ders sayısı (PROJEKSİYON)

    "Ders başı" ve "aylık" kolonları, kategorinin toplam maliyetinin üretilen ders
    sayısına bölünmesiyle bulunur (amortisman) — yani müfredat gibi kurs-başı işlemler
    de ders başına düşen paylarıyla görünür.
    """
    action_to_cat = {a: cat for cat, actions in OPERATION_CATEGORIES for a in actions}

    agg: Dict[str, Dict[str, Any]] = {
        cat: {"count": 0, "cost": 0.0, "models": {}, "actions": set(), "last": None}
        for cat, _ in OPERATION_CATEGORIES
    }

    for row in log_rows:
        cat = action_to_cat.get(row["action"], _FALLBACK_CATEGORY)
        g = agg[cat]
        g["count"] += 1
        g["cost"] += row["cost_usd"]
        model = row.get("model") or "—"
        g["models"][model] = g["models"].get(model, 0) + 1
        g["actions"].add(row["action"])
        d = row.get("created_at")
        if d is not None and (g["last"] is None or d > g["last"]):
            g["last"] = d

    def row_for(cat: str) -> Dict[str, Any]:
        g = agg[cat]
        n = g["count"]
        model = max(g["models"], key=g["models"].get) if g["models"] else "—"
        unit_cost = (g["cost"] / n) if n else 0.0
        calls_per_lesson = (n / lessons_generated) if lessons_generated else 0.0
        cost_per_lesson = (g["cost"] / lessons_generated) if lessons_generated else 0.0
        last = g["last"]
        return {
            "operation": cat,
            "model": model,
            "unit": "1 çağrı",
            "unit_cost_usd": round(unit_cost, 6),
            "unit_cost_tl": round(unit_cost * usd_to_try, 4),
            "usage_per_lesson": round(calls_per_lesson, 2),
            "cost_per_lesson_usd": round(cost_per_lesson, 6),
            "cost_per_lesson_tl": round(cost_per_lesson * usd_to_try, 4),
            "usage_per_month": round(calls_per_lesson * lessons_per_month, 1),
            "cost_per_month_usd": round(cost_per_lesson * lessons_per_month, 6),
            "cost_per_month_tl": round(cost_per_lesson * usd_to_try * lessons_per_month, 2),
            "samples": n,
            "source": ", ".join(sorted(g["actions"])) if g["actions"] else "—",
            "last_date": last.isoformat() if last is not None else None,
        }

    image_row = {
        "operation": "Görsel üretimi",
        "model": "Wikipedia + Openverse (ücretsiz)",
        "unit": "1 görsel",
        "unit_cost_usd": 0.0, "unit_cost_tl": 0.0,
        "usage_per_lesson": 0.0, "cost_per_lesson_usd": 0.0, "cost_per_lesson_tl": 0.0,
        "usage_per_month": 0.0, "cost_per_month_usd": 0.0, "cost_per_month_tl": 0.0,
        "samples": 0,
        "source": "Ücretsiz görsel arama (anahtarsız) — AI görsel üretimi kullanılmıyor: "
                  "görsel başına ~$0.02-0.04 ile dersin tüm metin maliyetinin katbekat üstüne çıkardı",
        "last_date": None,
    }

    by_op = {cat: row_for(cat) for cat, _ in OPERATION_CATEGORIES}
    by_op["Görsel üretimi"] = image_row
    rows = [by_op[name] for name in _OPERATION_ORDER]

    return {
        "lessons_per_teacher_month": lessons_per_month,
        "lessons_generated": lessons_generated,
        "rows": rows,
    }


def parse_module_count(details: Optional[str]) -> Optional[int]:
    """generate_lesson_slides log details'inden modül sayısını çıkarır."""
    if not details:
        return None
    m = _MODULE_COUNT_RE.search(details)
    return int(m.group(1)) if m else None


def _pack(usd: float, usd_to_try: float) -> Dict[str, float]:
    return {"usd": round(usd, 6), "tl": round(usd * usd_to_try, 4)}


def compute_unit_economics(
    lesson_entries: List[Dict[str, Any]],
    course_costs: List[float],
    usd_to_try: float,
    projection_lessons: int = PROJECTION_LESSONS,
) -> Dict[str, Any]:
    """
    lesson_entries: her ders-üretim çağrısı için {"cost_usd": float, "modules": int|None}
    course_costs:  gerçek kursların toplam maliyet listesi (USD)
    usd_to_try:    güncel kur

    Döndürür: ders/modül/kurs ortalamaları + modül tipine göre tahmini dağılım.
    """
    lessons_n = len(lesson_entries)
    lesson_cost_total = sum(e["cost_usd"] for e in lesson_entries)
    avg_lesson = lesson_cost_total / lessons_n if lessons_n else 0.0

    # Modül başı maliyet: modül sayısı BİLİNEN dersler üzerinden (adil ortalama)
    known = [e for e in lesson_entries if e.get("modules")]
    total_modules = sum(e["modules"] for e in known)
    known_cost = sum(e["cost_usd"] for e in known)
    avg_modules = (total_modules / len(known)) if known else 0.0
    if total_modules:
        avg_module = known_cost / total_modules
    elif avg_lesson:
        # Modül sayısı hiç loglanmamışsa tipik dizilim uzunluğuna böl
        avg_module = avg_lesson / len(TYPICAL_LESSON_COMPOSITION)
    else:
        avg_module = 0.0

    courses_n = len(course_costs)
    avg_course = (sum(course_costs) / courses_n) if courses_n else 0.0

    projected_course = avg_lesson * projection_lessons

    # Modül tipine göre TAHMİNİ maliyet: ölçülen ders maliyetini ağırlıklara göre dağıt.
    typical_weight_sum = sum(MODULE_TYPE_WEIGHTS[t] for t in TYPICAL_LESSON_COMPOSITION)
    cost_per_weight = (avg_lesson / typical_weight_sum) if typical_weight_sum else 0.0
    by_type = [
        {
            "type": t,
            "label": MODULE_TYPE_LABELS[t],
            "weight": w,
            **{f"est_cost_{k}": v for k, v in _pack(cost_per_weight * w, usd_to_try).items()},
        }
        for t, w in MODULE_TYPE_WEIGHTS.items()
    ]

    return {
        "lessons_generated": lessons_n,
        "courses_measured": courses_n,
        "projection_lessons": projection_lessons,
        "avg_modules_per_lesson": round(avg_modules, 1),
        "avg_cost_per_lesson": _pack(avg_lesson, usd_to_try),
        "avg_cost_per_module": _pack(avg_module, usd_to_try),
        "avg_cost_per_course": _pack(avg_course, usd_to_try),
        "projected_course": _pack(projected_course, usd_to_try),
        "estimated_cost_by_module_type": by_type,
    }


# --- KAYNAK PDF MALİYETİ -------------------------------------------------------
#
# Öğretmenin yüklediği PDF, prompt'un içine gömülü gider; maliyeti bu yüzden
# `cost_usd` içinde zaten VARDIR. Aşağıdaki hesap onu ayrıştırıp görünür kılar —
# toplam maliyete EKLEMEZ. "Kaynak yüklemek bana ne kadara mal oluyor?" sorusunun
# yanıtı budur.

# İnsan okuru için: kaynak metnin action'a göre etiketi.
SOURCE_ACTION_LABELS: Dict[str, str] = {
    "generate_lesson_slides": "Ders slaytları",
    "regenerate_lesson_module": "Modül tekrar oluşturma",
    "generate_roadmap_structure": "Müfredat yapısı",
    "generate_roadmap_content": "Tüm ders içeriği",
    "suggest_raw_topics": "Konu önerileri",
    "suggest_lesson_modules": "Ders modülleri",
    "suggest_lesson_title": "Ders başlığı",
    "suggest_level_details": "Modül detayı",
}


def compute_source_material_breakdown(
    log_rows: List[Dict[str, Any]],
    lessons_generated: int,
    usd_to_try: float,
) -> Dict[str, Any]:
    """
    Yüklenen kaynak PDF'in AI maliyetindeki payı.

    log_rows: {"action", "cost_usd", "source_chars", "source_tokens", "source_cost_usd"}

    ÖLÇÜM SINIRI: `source_tokens`, kaydın kendi ölçülen prompt token sayısının
    karakter oranıyla paylaştırılmasıdır (bkz. record_ai_usage). Token yoğunluğu
    metin boyunca birebir düzgün dağılmadığı için bu bir YAKLAŞIKTIR; toplam
    prompt token'ı ise ölçülmüştür. Kaynak kolonları eklenmeden ÖNCEKİ kayıtlarda
    bu alanlar 0'dır, yani geçmiş üretimler "kaynaksız" görünür.
    """
    toplam_maliyet = 0.0
    kaynak_maliyet = 0.0
    kaynak_karakter = 0
    kaynak_token = 0
    kaynakli_cagri = 0
    by_action: Dict[str, Dict[str, Any]] = {}

    for row in log_rows:
        toplam_maliyet += row.get("cost_usd") or 0.0
        s_chars = row.get("source_chars") or 0
        if s_chars <= 0:
            continue

        s_cost = row.get("source_cost_usd") or 0.0
        s_tok = row.get("source_tokens") or 0
        kaynakli_cagri += 1
        kaynak_maliyet += s_cost
        kaynak_karakter += s_chars
        kaynak_token += s_tok

        act = row.get("action") or "diğer"
        g = by_action.setdefault(act, {"calls": 0, "chars": 0, "tokens": 0, "cost_usd": 0.0})
        g["calls"] += 1
        g["chars"] += s_chars
        g["tokens"] += s_tok
        g["cost_usd"] += s_cost

    satirlar = [
        {
            "action": act,
            "label": SOURCE_ACTION_LABELS.get(act, act),
            "calls": g["calls"],
            "source_chars": g["chars"],
            "source_tokens": g["tokens"],
            "avg_chars_per_call": round(g["chars"] / g["calls"]) if g["calls"] else 0,
            **{f"cost_{k}": v for k, v in _pack(g["cost_usd"], usd_to_try).items()},
        }
        for act, g in sorted(by_action.items(), key=lambda kv: -kv[1]["cost_usd"])
    ]

    return {
        "calls_with_source": kaynakli_cagri,
        "calls_total": len(log_rows),
        "total_source_chars": kaynak_karakter,
        "total_source_tokens": kaynak_token,
        "avg_source_chars_per_call": (
            round(kaynak_karakter / kaynakli_cagri) if kaynakli_cagri else 0
        ),
        # Kaynağın TOPLAM AI maliyetindeki payı (ek maliyet değil, içindeki pay).
        "share_of_total_pct": (
            round(100 * kaynak_maliyet / toplam_maliyet, 2) if toplam_maliyet else 0.0
        ),
        "total_source_cost": _pack(kaynak_maliyet, usd_to_try),
        "source_cost_per_lesson": _pack(
            (kaynak_maliyet / lessons_generated) if lessons_generated else 0.0, usd_to_try
        ),
        "by_action": satirlar,
    }
