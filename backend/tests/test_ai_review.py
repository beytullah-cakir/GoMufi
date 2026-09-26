"""
YZ içeriği için öğretmen onayı: arka planda üretilen modül, öğretmen kontrol edip
onaylayana kadar öğrenciye kapalı. Eskiden YZ'nin yazdığı slaytlar doğrudan
öğrenciye gidiyordu.
"""
import json

import pytest

pytestmark = pytest.mark.db

TEACHER = 999201
ECE = 999211
COURSE = 999231

CURRICULUM = [
    {"id": "m1", "title": "Giriş", "theme": "purple"},
    {"id": "m2", "title": "Döngüler", "theme": "purple", "aiReview": "pending"},
    {"id": "m3", "title": "Listeler", "theme": "purple", "aiReview": "pending"},
]
NOTES = [
    {"id": "m1", "noteTitle": "Giriş", "slides": [{"id": 1, "type": "content", "elements": []}]},
    {"id": "m2", "noteTitle": "Döngüler", "slides": [{"id": 2, "type": "content", "elements": []}]},
]


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM module_progress WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM learning_events WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id = %s", (ECE,), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Selin', 'Hoca', 'air@test.local')",
             (TEACHER,), fetch=False)
    db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, 'Ece', 'T', 'air@s.local', 0)",
             (ECE,), fetch=False)
    classes = [{"id": "c_a", "name": "A", "student_ids": [ECE], "code": "AIRV01", "schedule": []}]
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes, progress) "
             "VALUES (%s, %s, 'Python', %s, %s, %s, 0)",
             (COURSE, TEACHER, json.dumps(CURRICULUM), json.dumps(NOTES), json.dumps(classes)), fetch=False)
    db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (ECE, COURSE), fetch=False)
    yield
    cleanup()


def slides_of(course, node_id):
    return next(n for n in course["notes"] if n["id"] == node_id)["slides"]


def test_onay_bekleyen_modul_ogrenciye_kapali(auth_as, seeded):
    ece = auth_as(ECE, "student")
    assert slides_of(ece.get(f"/courses/{COURSE}").json(), "m2") == []
    assert slides_of(ece.get("/my-content").json()[0], "m2") == []
    assert len(slides_of(ece.get(f"/courses/{COURSE}").json(), "m1")) == 1

    progress = ece.post(f"/progress/courses/{COURSE}/complete", json={"node_id": "m1", "stars": 3}).json()
    assert progress["open_until"] == 1 and progress["review_block"] == 2       # m1 bitti ama m2 onay bekliyor
    assert ece.post(f"/progress/courses/{COURSE}/complete", json={"node_id": "m2", "stars": 3}).status_code == 409

    # Öğretmen kendi kursunda içeriği görür.
    teacher = auth_as(TEACHER, "teacher")
    assert len(slides_of(teacher.get(f"/courses/{COURSE}").json(), "m2")) == 1


def test_kaydetmek_onay_yerine_gecmez_onay_ucu_acar(auth_as, seeded, db_query):
    teacher = auth_as(TEACHER, "teacher")
    # İstemci bayrağı düşürerek kaydetse de bayrak korunur.
    stripped = [{k: v for k, v in n.items() if k != "aiReview"} for n in CURRICULUM]
    assert teacher.put(f"/update_course/{COURSE}", json={"curriculum": stripped}).status_code == 200
    settings = teacher.get(f"/courses/{COURSE}/classroom-settings").json()
    assert [m["pending_review"] for m in settings["modules"]] == [False, True, True]

    r = teacher.post(f"/courses/{COURSE}/ai-review/approve", json={"node_ids": ["m2"]}).json()
    assert r == {"approved": ["m2"], "pending": ["m3"]}
    ece = auth_as(ECE, "student")
    assert len(slides_of(ece.get(f"/courses/{COURSE}").json(), "m2")) == 1
    assert ece.get(f"/progress/courses/{COURSE}").json()["review_block"] == 3

    assert auth_as(TEACHER, "teacher").post(f"/courses/{COURSE}/ai-review/approve", json={}).json()["pending"] == []
    assert auth_as(ECE, "student").post(f"/courses/{COURSE}/ai-review/approve", json={}).status_code in (401, 403)
