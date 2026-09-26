"""
MEB kazanım eşlemesi: öğretmen kendi öğretim programından kazanımları yapıştırır,
modüllerle eşler; rapor her kazanımda sınıfın durumunu gösterir.
Kazanım listesi yerleşik değil — uydurma kod öğretmeni resmî evrakta yanıltır.
"""
import json

import pytest

from core.meb import parse_outcomes

pytestmark = pytest.mark.db

TEACHER = 999301
ECE, CAN = 999311, 999312
COURSE = 999331
CURRICULUM = [
    {"id": "m1", "title": "Girdi", "theme": "purple", "conceptIds": ["tip_donusumu"], "primaryConceptId": "tip_donusumu",
     "conceptLanguage": "python"},
    {"id": "m2", "title": "Proje", "theme": "homework"},
]
PASTE = """
BT.7.2.1.1. Kullanıcıdan alınan veriyi uygun türe dönüştürür.
• BT.7.2.1.2 Basit bir program tasarlar.

Programı çalıştırıp hataları ayıklar.
BT.7.2.1.1. Yinelenen satır
"""


def test_yapistirilan_metin_ayristirilir():
    got = parse_outcomes(PASTE)
    assert got == [
        {"code": "BT.7.2.1.1", "text": "Kullanıcıdan alınan veriyi uygun türe dönüştürür."},
        {"code": "BT.7.2.1.2", "text": "Basit bir program tasarlar."},
        {"code": "K3", "text": "Programı çalıştırıp hataları ayıklar."},
    ]


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM course_settings WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM module_progress WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM concept_mastery WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s)", (ECE, CAN), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Selin', 'Hoca', 'meb@test.local')",
             (TEACHER,), fetch=False)
    for sid, name in ((ECE, "Ece"), (CAN, "Can")):
        db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, %s, 'T', %s, 0)",
                 (sid, name, f"meb{sid}@test.local"), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes, progress) "
             "VALUES (%s, %s, 'Python', %s, '[]', '[]', 0)", (COURSE, TEACHER, json.dumps(CURRICULUM)), fetch=False)
    for sid in (ECE, CAN):
        db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (sid, COURSE), fetch=False)
    db_query("INSERT INTO concept_mastery (course_id, student_id, concept_id, score, evidence_weight, successes, failures) "
             "VALUES (%s, %s, 'tip_donusumu', 0.9, 5, 5, 0)", (COURSE, ECE), fetch=False)
    db_query("INSERT INTO concept_mastery (course_id, student_id, concept_id, score, evidence_weight, successes, failures) "
             "VALUES (%s, %s, 'tip_donusumu', 0.2, 5, 1, 4)", (COURSE, CAN), fetch=False)
    import learning_store
    learning_store._CONTEXT_CACHE.pop(COURSE, None)
    yield
    cleanup()


def test_esleme_ve_rapor(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    outcomes = teacher.post("/meb-outcomes/parse", json={"text": PASTE}).json()["outcomes"]
    saved = teacher.put(f"/courses/{COURSE}/meb-outcomes", json={
        "outcomes": outcomes,
        "mapping": {"m1": ["BT.7.2.1.1", "UYDURMA"], "m2": ["BT.7.2.1.2"], "yok": ["BT.7.2.1.1"]},
    }).json()
    # Listede olmayan kod ve olmayan modül atılır.
    assert saved["mapping"] == {"m1": ["BT.7.2.1.1"], "m2": ["BT.7.2.1.2"]}
    assert teacher.get(f"/courses/{COURSE}/meb-outcomes").json()["mapping"] == saved["mapping"]

    report = teacher.get(f"/analytics/courses/{COURSE}/meb-report").json()
    first = report["outcomes"][0]
    assert first["code"] == "BT.7.2.1.1" and first["modules"] == ["Girdi"]
    assert first["counts"] == {"veri_az": 0, "zorlaniyor": 1, "gelisiyor": 0, "hakim": 1}
    assert {s["name"]: s["status"] for s in first["students"]} == {"Ece T": "hakim", "Can T": "zorlaniyor"}
    assert report["outcomes"][2]["modules"] == [] and report["unmapped_modules"] == []

    assert auth_as(ECE, "student").get(f"/courses/{COURSE}/meb-outcomes").status_code in (401, 403)
