"""
Öğrenme analitiğinin hesaplama çekirdeği — veritabanından bağımsız, saf kurallar.

Üç soru:
  * Bu olay hangi kavram için NE KADAR kanıt? (evidences_for_event)
  * Öğrenci bu kavramda nerede?               (update_mastery, mastery_status)
  * Öğrenci bu görevde takıldı mı?             (apply_event_to_progress, is_stuck)

Kurallar bilinçli olarak basit ve açıklanabilir: öğretmen "neden zorlanıyor
diyor?" diye sorduğunda cevap "son 5 kanıttan 4'ü başarısız" olabilmeli, bir
modelin iç ağırlıkları değil.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from statistics import median
from typing import Any, Dict, Iterable, List, Optional

from learning_concepts import construct_concept

# --- hakimiyet ----------------------------------------------------------------

PRIMARY_WEIGHT = 1.0
SECONDARY_WEIGHT = 0.5
# Bir kanıtın puanı en fazla bu oranda çekebilmesi: tek bir kötü gün
# öğrenciyi "hakim"den "zorlanıyor"a düşürmesin.
BASE_ALPHA = 0.35
MAX_ALPHA = 0.6
MIN_EVIDENCE_WEIGHT = 1.0

STATUS_LABELS = {
    "veri_az": "Veri az",
    "zorlaniyor": "Zorlanıyor",
    "gelisiyor": "Gelişiyor",
    "hakim": "Hakim",
}


@dataclass
class Evidence:
    concept_id: str
    value: float                 # 0 = başarısız, 1 = başarılı; ara değerler not gibi
    weight: float                # 0 ise puanı değiştirmez (yalnızca yanılgı notu)
    misconception: Optional[str] = None
    # Öğretmenin doğrudan verdiği durum ("sözlü sordum, biliyor"): puan o
    # durumun aralığına çekilir. Sonraki kanıtlar puanı yine değiştirebilir —
    # öğretmen kararı kalıcı bir kilit değil, en güçlü tek kanıt.
    target: Optional[str] = None


# Öğretmen değerlendirmesinde puanın çekileceği aralık (mastery_status sınırlarıyla uyumlu).
TARGET_RANGES = {"hakim": (0.8, 1.0), "gelisiyor": (0.55, 0.7), "zorlaniyor": (0.0, 0.35)}
TEACHER_ASSESSMENT_WEIGHT = 1.5


def update_mastery(row: Dict[str, Any], ev: Evidence, now: datetime) -> Dict[str, Any]:
    """Üstel ağırlıklı ortalama: yakın tarihli kanıt daha ağır basar."""
    if ev.target in TARGET_RANGES:
        low, high = TARGET_RANGES[ev.target]
        score = float(row.get("score", 0.5))
        row["score"] = round(min(high, max(low, score)), 4)
        row["evidence_weight"] = round(float(row.get("evidence_weight", 0.0)) + ev.weight, 3)
        key = "successes" if ev.target == "hakim" else "failures" if ev.target == "zorlaniyor" else None
        if key:
            row[key] = int(row.get(key, 0)) + 1
        row["last_evidence_at"] = now
        if ev.target == "hakim":
            row["last_misconception"] = None
        return row
    if ev.weight > 0:
        alpha = min(MAX_ALPHA, BASE_ALPHA * ev.weight)
        score = float(row.get("score", 0.5))
        row["score"] = round(score + alpha * (ev.value - score), 4)
        row["evidence_weight"] = round(float(row.get("evidence_weight", 0.0)) + ev.weight, 3)
        if ev.value >= 0.5:
            row["successes"] = int(row.get("successes", 0)) + 1
        else:
            row["failures"] = int(row.get("failures", 0)) + 1
        row["last_evidence_at"] = now
    if ev.misconception:
        row["last_misconception"] = ev.misconception[:200]
    return row


def mastery_status(score: float, evidence_weight: float) -> str:
    if evidence_weight < MIN_EVIDENCE_WEIGHT:
        return "veri_az"
    if score < 0.45:
        return "zorlaniyor"
    if score < 0.75:
        return "gelisiyor"
    return "hakim"


# --- olaydan kanıta -----------------------------------------------------------

def _node_weights(node_concepts: List[str], primary: Optional[str]) -> Dict[str, float]:
    return {c: (PRIMARY_WEIGHT if c == primary else SECONDARY_WEIGHT) for c in node_concepts}


def _check_concept(check: Dict[str, Any], primary: Optional[str], language: str,
                   known: Optional[Iterable[str]]) -> Optional[str]:
    """Düşen bir ölçütün kavramı: öğretmenin/YZ'nin verdiği, yapıdan türeyen ya da birincil."""
    explicit = check.get("conceptId")
    if explicit and (known is None or explicit in set(known)):
        return explicit
    if check.get("kind") == "code":
        mapped = construct_concept(str(check.get("value") or ""), language, known)
        if mapped:
            return mapped
    return primary


def evidences_for_event(
    event: Dict[str, Any],
    node_concepts: List[str],
    primary: Optional[str],
    language: str = "python",
    known: Optional[Iterable[str]] = None,
    own_share: Optional[float] = None,
) -> List[Evidence]:
    """Bir olayın kavram kanıtları.

    `own_share`: çözümün ne kadarının öğrencinin elinden çıktığı (kod kökeni).
    Dışarıdan yapıştırılmış bir çözüm "kavramı biliyor" kanıtı sayılmaz —
    sayılsaydı kazanım haritası yanlış yeşil gösterirdi.
    """
    kind = event.get("type")
    out: Dict[str, Evidence] = {}

    def add(concept: Optional[str], value: float, weight: float, misconception: Optional[str] = None):
        if not concept:
            return
        prev = out.get(concept)
        # Aynı olayda aynı kavrama tek kanıt: en ağırı kalır.
        if prev is None or weight > prev.weight:
            out[concept] = Evidence(concept, value, weight, misconception or (prev.misconception if prev else None))
        elif misconception and not prev.misconception:
            prev.misconception = misconception

    weights = _node_weights(node_concepts, primary)

    if kind == "check":
        attempt = max(1, int(event.get("attempt") or 1))
        outcome = event.get("outcome")
        # Aynı görevde art arda gelen hatalar giderek daha az sayılır: on yazım
        # hatası yapan öğrenci, kavramı on kez bilmiyor değildir.
        decay = 1.0 / attempt
        failed = [c for c in (event.get("checks") or []) if c.get("status") == "fail"]
        for check in failed:
            concept = _check_concept(check, primary, language, known)
            base = PRIMARY_WEIGHT if concept != primary or check.get("kind") == "code" else 0.6
            add(concept, 0.0, base * decay)
        error_concept = event.get("error_concept")
        if outcome == "error":
            add(error_concept or primary, 0.0, (PRIMARY_WEIGHT if error_concept else 0.6) * decay)
        if outcome == "pass":
            value = 1.0 if attempt == 1 else max(0.6, 1.0 - 0.1 * (attempt - 1))
            trust = 1.0 if own_share is None else max(0.2, min(1.0, own_share))
            for concept, weight in weights.items():
                add(concept, value, weight * trust)
            # Geçen yapı ölçütleri kendi kavramlarına da başarı yazar.
            for check in event.get("checks") or []:
                if check.get("kind") == "code" and check.get("status") in ("pass", "near"):
                    add(_check_concept(check, primary, language, known), value, SECONDARY_WEIGHT * trust)

    elif kind == "quiz_answer":
        value = 1.0 if event.get("correct") else 0.0
        for concept, weight in weights.items():
            add(concept, value, weight * 0.8)

    elif kind == "homework_review":
        score = event.get("score")
        if isinstance(score, (int, float)):
            for concept, weight in weights.items():
                add(concept, max(0.0, min(1.0, score / 100)), weight * 0.8)
        for weakness in event.get("weaknesses") or []:
            concept = weakness.get("conceptId")
            if concept and (known is None or concept in set(known)):
                add(concept, 0.0, 0.6, weakness.get("misconception"))

    elif kind == "homework_graded":
        grade = event.get("grade")
        if isinstance(grade, (int, float)):
            for concept, weight in weights.items():
                add(concept, max(0.0, min(1.0, grade / 100)), weight * 1.2)

    elif kind == "explain":
        # "Kodunu açıkla": yapıştırılmış çözümü açıklayabilen öğrenci kodun
        # sahibi olabilir (yapıştırma cezası kısmen geri gelir); açıklayamayan
        # kavramı bilmiyor olabilir.
        understood = event.get("outcome") == "pass"
        for concept, weight in weights.items():
            add(concept, 1.0 if understood else 0.0, weight * (0.5 if understood else 0.8))

    elif kind == "teacher_assessment":
        # Öğretmen bir kavramda durumu doğrudan belirledi (sınıfta sordu, konuştu).
        concept = event.get("concept_id")
        status = event.get("status")
        if concept and status in TARGET_RANGES and (known is None or concept in set(known)):
            value = {"hakim": 1.0, "gelisiyor": 0.6, "zorlaniyor": 0.0}[status]
            out[concept] = Evidence(concept, value, TEACHER_ASSESSMENT_WEIGHT, target=status)

    elif kind == "coach":
        # Koç puan değiştirmez — hatanın kendisi zaten kontrol olayında sayıldı.
        # Katkısı "neresinde" sorusu: yanılgı etiketi.
        concept = event.get("concept_id")
        if concept and event.get("misconception"):
            add(concept, 0.0, 0.0, event.get("misconception"))

    return list(out.values())


# --- görev ilerlemesi ---------------------------------------------------------

STUCK_SAME_FAILURE = 3
STUCK_FAILED_ATTEMPTS = 5
STUCK_MINUTES = 15
STUCK_NOW_MINUTES = 10


def apply_event_to_progress(p: Dict[str, Any], event: Dict[str, Any], now: datetime) -> Dict[str, Any]:
    p["first_seen_at"] = p.get("first_seen_at") or now
    p["last_activity_at"] = now
    kind = event.get("type")

    if kind == "check":
        p["attempts"] = int(p.get("attempts") or 0) + 1
        outcome = event.get("outcome")
        p["last_outcome"] = outcome
        if outcome == "pass":
            if not p.get("solved_at"):
                p["solved_at"] = now
            if p.get("first_try_pass") is None:
                p["first_try_pass"] = p["attempts"] == 1
            p["same_failure_streak"] = 0
        elif outcome in ("fail", "error"):
            if p.get("first_try_pass") is None and not p.get("solved_at"):
                p["first_try_pass"] = False
            label = failure_label(event)
            if label and label == p.get("last_failure"):
                p["same_failure_streak"] = int(p.get("same_failure_streak") or 0) + 1
            else:
                p["same_failure_streak"] = 1
            p["last_failure"] = (label or "")[:300] or None
            p["last_error_type"] = event.get("error_type")
    elif kind == "submitted":
        p["submitted_at"] = now
    elif kind == "hint_opened":
        p["hints_opened"] = int(p.get("hints_opened") or 0) + 1
    elif kind == "coach":
        p["coach_messages"] = int(p.get("coach_messages") or 0) + 1
    return p


def failure_label(event: Dict[str, Any]) -> Optional[str]:
    """Denemenin neden düştüğünün tek satırlık adı: öğretmen listede bunu görür."""
    for check in event.get("checks") or []:
        if check.get("status") == "fail":
            return str(check.get("label") or "")[:300] or None
    if event.get("error_type"):
        return f"Hata: {event['error_type']}"
    return None


def is_stuck(p: Dict[str, Any]) -> bool:
    if p.get("solved_at") or p.get("submitted_at"):
        return False
    failing = p.get("last_outcome") in ("fail", "error")
    if failing and int(p.get("same_failure_streak") or 0) >= STUCK_SAME_FAILURE:
        return True
    if failing and int(p.get("attempts") or 0) >= STUCK_FAILED_ATTEMPTS:
        return True
    first, last = p.get("first_seen_at"), p.get("last_activity_at")
    if first and last and last - first >= timedelta(minutes=STUCK_MINUTES) and int(p.get("attempts") or 0) >= 2:
        return True
    return False


def is_stuck_now(p: Dict[str, Any], now: datetime) -> bool:
    last = p.get("last_activity_at")
    return is_stuck(p) and bool(last) and now - last <= timedelta(minutes=STUCK_NOW_MINUTES)


# --- toplulaştırma ------------------------------------------------------------

def task_stats(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Bir görevin sınıf düzeyindeki özeti (task_progress satırlarından)."""
    started = len(rows)
    solved = [r for r in rows if r.get("solved_at")]
    submitted = [r for r in rows if r.get("submitted_at") or r.get("solved_at")]
    first_try = [r for r in rows if r.get("first_try_pass")]
    solve_minutes = [
        (r["solved_at"] - r["first_seen_at"]).total_seconds() / 60
        for r in solved if r.get("first_seen_at")
    ]
    return {
        "started": started,
        "solved": len(solved),
        "completed": len(submitted),
        "solve_rate": round(len(solved) / started, 3) if started else 0.0,
        "first_try_rate": round(len(first_try) / started, 3) if started else 0.0,
        "median_attempts": median([int(r.get("attempts") or 0) for r in solved]) if solved else None,
        "median_solve_minutes": round(median(solve_minutes), 1) if solve_minutes else None,
        "stuck": sum(1 for r in rows if is_stuck(r)),
    }


def root_causes(status_by_concept: Dict[str, str], prerequisites: Dict[str, List[str]]) -> List[Dict[str, Any]]:
    """Zorlanılan kavramın önkoşulu da zayıfsa asıl sorun orada olabilir.

    Örnek: fonksiyon_parametre'de zorlanan öğrenci degisken_atama'da da
    gelişiyor durumundaysa, öğretmene önce değişkenlere dönmesi önerilir.
    """
    out = []
    for concept, status in status_by_concept.items():
        if status != "zorlaniyor":
            continue
        weak = [p for p in prerequisites.get(concept, [])
                if status_by_concept.get(p) in ("zorlaniyor", "gelisiyor")]
        if weak:
            out.append({"concept_id": concept, "weak_prerequisites": weak})
    return out
