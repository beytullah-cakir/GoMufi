"""
Öğretmenin sınıf yönetimi ayarları — course_settings.settings["classroom"].

  leaderboard_enabled   öğrencilere şube sıralaması gösterilsin mi (varsayılan açık)
  unlocked_until        şube kimliği → öğrencinin açabileceği son modül sırası (1'den başlar);
                        "*" tüm şubeler için; yoksa sınır yok, modüller sırayla açılır

Şube bilgisi course.classes JSON'unda; öğrenci en fazla bir şubede olur.
"""
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from models.course import Course
from models.teaching import CourseSettings

DEFAULTS: Dict[str, Any] = {"leaderboard_enabled": True, "unlocked_until": {}}


def student_class(course: Course, student_id: int) -> Optional[Dict[str, Any]]:
    for cls in course.classes or []:
        if not isinstance(cls, dict):
            continue
        for sid in cls.get("student_ids") or []:
            try:
                if int(sid) == student_id:
                    return cls
            except (TypeError, ValueError):
                continue
    return None


def class_student_ids(cls: Dict[str, Any]) -> List[int]:
    out = []
    for sid in cls.get("student_ids") or []:
        try:
            out.append(int(sid))
        except (TypeError, ValueError):
            continue
    return out


async def load(db: AsyncSession, course_id: int) -> Dict[str, Any]:
    row = (await db.execute(select(CourseSettings).where(CourseSettings.course_id == course_id))).scalar_one_or_none()
    stored = ((row.settings or {}) if row else {}).get("classroom") or {}
    return {
        "leaderboard_enabled": stored.get("leaderboard_enabled", True) is not False,
        "unlocked_until": {str(k): int(v) for k, v in (stored.get("unlocked_until") or {}).items()
                           if isinstance(v, int) and v >= 0},
    }


async def save(db: AsyncSession, course_id: int, values: Dict[str, Any]) -> Dict[str, Any]:
    row = (await db.execute(select(CourseSettings).where(CourseSettings.course_id == course_id))).scalar_one_or_none()
    if not row:
        row = CourseSettings(course_id=course_id, settings={})
        db.add(row)
    current = {**DEFAULTS, **((row.settings or {}).get("classroom") or {})}
    current.update(values)
    row.settings = {**(row.settings or {}), "classroom": current}
    flag_modified(row, "settings")
    await db.commit()
    return await load(db, course_id)


def unlock_limit(settings: Dict[str, Any], class_id: Optional[str]) -> Optional[int]:
    """Öğrencinin şubesi için öğretmenin koyduğu sınır; şubeye özel sınır geneli ezer."""
    limits = settings.get("unlocked_until") or {}
    if class_id is not None and str(class_id) in limits:
        return limits[str(class_id)]
    return limits.get("*")


# --- şubeler ve katılım kodu ------------------------------------------------------
# Tek katılım yolu: öğrenci her zaman bir ŞUBEYE katılır. Her kursun en az bir şubesi
# vardır (öğretmen tanımlamazsa "Genel"). Kodlar sunucuda, tüm kurslarda tekil üretilir
# — eskiden tarayıcıda Math.random() ile üretiliyor, çakışma kontrol edilmiyordu.

CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # karışabilecek 0/O, 1/I hariç
DEFAULT_CLASS_NAME = "Genel"


async def used_codes(db: AsyncSession, course_id: Optional[int] = None) -> set:
    """Bu kursun KULLANAMAYACAĞI kodlar.

    Çakışmada kod eski kursta (küçük kimlik) kalır, yenisi değişir: öğretmenin
    öğrencilere çoktan dağıttığı bir kodu geçersiz kılmamak için. Kursların
    kendi (eski) katılım kodları da şube koduyla karışmasın diye dolu sayılır.
    """
    codes = set()
    for other_id, enrollment_code, classes in (await db.execute(
        select(Course.id, Course.enrollment_code, Course.classes)
    )).all():
        if enrollment_code:
            codes.add(enrollment_code.upper())
        if other_id == course_id or (course_id is not None and other_id > course_id):
            continue
        for cls in classes or []:
            if isinstance(cls, dict) and cls.get("code"):
                codes.add(str(cls["code"]).strip().upper())
    return codes


def new_code(taken: set) -> str:
    import random

    for _ in range(50):
        code = "".join(random.choices(CODE_ALPHABET, k=6))
        if code not in taken:
            taken.add(code)
            return code
    raise RuntimeError("Katılım kodu üretilemedi")


async def ensure_classes(db: AsyncSession, course: Course, enrolled_ids: Optional[List[int]] = None) -> bool:
    """Kursun şubelerini tutarlı hale getirir; bir şey değiştiyse True (çağıran commit eder).

    - Şube yoksa "Genel" şubesi açılır.
    - Kodu olmayan ya da başka bir şubeyle çakışan şubeye yeni tekil kod verilir.
    - Tek şubeli kursta şubesiz kalmış kayıtlı öğrenciler o şubeye alınır (eskiden
      kurs koduyla katılan öğrenci hiçbir şubeye düşmüyordu).
    """
    import uuid

    changed = False
    classes = [dict(c) for c in (course.classes or []) if isinstance(c, dict)]
    if not classes:
        classes = [{"id": "c_genel", "name": DEFAULT_CLASS_NAME, "student_ids": [], "schedule": []}]
        changed = True
    taken = await used_codes(db, course.id)
    seen: set = set()
    for cls in classes:
        if cls.get("id") is None:
            cls["id"] = f"c_{uuid.uuid4().hex[:8]}"
            changed = True
        code = str(cls.get("code") or "").strip().upper()
        if not code or code in taken or code in seen:
            code = new_code(taken | seen)
            changed = True
        if cls.get("code") != code:
            cls["code"] = code
            changed = True
        seen.add(code)
        cls.setdefault("student_ids", [])
        cls.setdefault("schedule", [])
    if enrolled_ids and len(classes) == 1:
        placed = {sid for c in classes for sid in class_student_ids(c)}
        missing = [sid for sid in enrolled_ids if sid not in placed]
        if missing:
            classes[0]["student_ids"] = list(classes[0].get("student_ids") or []) + missing
            changed = True
    if changed:
        course.classes = classes
        flag_modified(course, "classes")
    return changed


async def find_by_code(db: AsyncSession, code: str):
    """Kod → (kurs, şube). Şube kodu önceliklidir; eski kurs kodu tek şubeli kursta o şubeye gider."""
    code = (code or "").strip().upper()
    if not code:
        return None, None, "Kod boş olamaz."
    for course in (await db.execute(select(Course))).scalars().all():
        for cls in course.classes or []:
            if isinstance(cls, dict) and str(cls.get("code") or "").strip().upper() == code:
                return course, cls, None
    course = (await db.execute(select(Course).where(Course.enrollment_code == code))).scalar_one_or_none()
    if not course:
        return None, None, "Kod bulunamadı. Öğretmeninden sınıfının katılım kodunu iste."
    await ensure_classes(db, course)
    classes = [c for c in course.classes or [] if isinstance(c, dict)]
    if len(classes) == 1:
        return course, classes[0], None
    return None, None, "Bu kursun birden fazla şubesi var; öğretmeninden kendi şubenin kodunu iste."


def place_student(course: Course, target: Dict[str, Any], student_id: int) -> None:
    """Öğrenciyi şubeye alır, diğer şubelerden çıkarır (öğrenci tek şubede olur)."""
    classes = [dict(c) for c in course.classes or [] if isinstance(c, dict)]
    for cls in classes:
        ids = [sid for sid in cls.get("student_ids") or [] if str(sid) != str(student_id)]
        if str(cls.get("id")) == str(target.get("id")):
            ids.append(student_id)
        cls["student_ids"] = ids
    course.classes = classes
    flag_modified(course, "classes")


# --- YZ içeriği için öğretmen onayı --------------------------------------------------
# Arka planda YZ ile üretilen modüller "onay bekliyor" olarak işaretlenir
# (curriculum düğümünde aiReview="pending"). Öğretmen onaylayana kadar öğrenci
# o modülü ve sonrasını açamaz, slaytlarını da alamaz. Bayrak sunucunun
# sorumluluğunda: kurs kaydedilirken istemci bayrağı düşürse de korunur, yalnızca
# onay ucu kaldırır.

AI_REVIEW_KEY = "aiReview"
AI_REVIEW_PENDING = "pending"


def pending_review_ids(course: Course) -> set:
    return {str(n.get("id")) for n in course.curriculum or []
            if isinstance(n, dict) and n.get(AI_REVIEW_KEY) == AI_REVIEW_PENDING}


def keep_review_flags(old_curriculum: Optional[List[Any]], new_curriculum: List[Any]) -> List[Any]:
    """Kaydedilen müfredatta onay bayraklarını eski halinden alır (istemci değiştiremez)."""
    pending = {str(n.get("id")) for n in old_curriculum or []
               if isinstance(n, dict) and n.get(AI_REVIEW_KEY) == AI_REVIEW_PENDING}
    out = []
    for node in new_curriculum:
        if isinstance(node, dict):
            node = {k: v for k, v in node.items() if k != AI_REVIEW_KEY}
            if str(node.get("id")) in pending:
                node[AI_REVIEW_KEY] = AI_REVIEW_PENDING
        out.append(node)
    return out


def student_notes(notes: List[Any], student_id: int, pending_ids: set) -> List[Any]:
    """Öğrenciye giden ders içeriği: onay bekleyen modülün slaytları yok,
    belirli öğrencilere atanmış tekrar görevleri yalnızca onlara."""
    out = []
    for note in notes or []:
        if isinstance(note, dict) and isinstance(note.get("slides"), list):
            if str(note.get("id")) in pending_ids:
                note = {**note, "slides": []}
            else:
                note = {**note, "slides": [
                    s for s in note["slides"]
                    if not (isinstance(s, dict) and s.get("assignedTo")) or student_id in s["assignedTo"]
                ]}
        out.append(note)
    return out
