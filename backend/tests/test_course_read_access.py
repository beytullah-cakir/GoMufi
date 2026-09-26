"""Kurs içeriği yalnızca öğretmenine, kayıtlı öğrencisine ve yöneticiye açık."""
import json

import pytest

pytestmark = pytest.mark.db

TEACHER, OTHER_TEACHER = 997201, 997202
ECE, CAN, OUTSIDER = 997211, 997212, 997213
PARENT = 997221
COURSE = 997231
CLASSES = [{"id": "c1", "name": "A", "code": "GIZLI1", "student_ids": [ECE, CAN], "schedule": []}]


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s, %s)", (ECE, CAN, OUTSIDER), fetch=False)
        db_query("DELETE FROM teachers WHERE id IN (%s, %s)", (TEACHER, OTHER_TEACHER), fetch=False)
        db_query("DELETE FROM parents WHERE id = %s", (PARENT,), fetch=False)
    cleanup()
    for tid in (TEACHER, OTHER_TEACHER):
        db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'T', 'T', %s)",
                 (tid, f"t{tid}@test.local"), fetch=False)
    for sid in (ECE, CAN, OUTSIDER):
        db_query("INSERT INTO students (id, first_name, last_name, email) VALUES (%s, 'S', 'S', %s)",
                 (sid, f"s{sid}@test.local"), fetch=False)
    db_query("INSERT INTO parents (id, first_name, last_name, email) VALUES (%s, 'V', 'V', %s)",
             (PARENT, f"p{PARENT}@test.local"), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes, progress) VALUES (%s, %s, 'Gizli', '[]', '[]', %s, 0)",
             (COURSE, TEACHER, json.dumps(CLASSES)), fetch=False)
    for sid in (ECE, CAN):
        db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (sid, COURSE), fetch=False)
    yield
    cleanup()


def test_yabancilar_kursu_okuyamaz(auth_as, seeded):
    for uid, role in ((OUTSIDER, "student"), (OTHER_TEACHER, "teacher"), (PARENT, "parent")):
        assert auth_as(uid, role).get(f"/courses/{COURSE}").status_code in (403, 404), role


def test_ogretmen_her_seyi_ogrenci_yalniz_kendini_gorur(auth_as, seeded):
    own = auth_as(TEACHER, "teacher").get(f"/courses/{COURSE}").json()
    assert own["classes"][0]["code"] == "GIZLI1" and own["classes"][0]["student_ids"] == [ECE, CAN]

    mine = auth_as(ECE, "student").get(f"/courses/{COURSE}").json()
    cls = mine["classes"][0]
    assert "code" not in cls and cls["student_ids"] == [ECE] and mine["enrollment_code"] is None

    listed = auth_as(CAN, "student").get("/my-content").json()
    cls = next(c for c in listed if c["id"] == COURSE)["classes"][0]
    assert cls["student_ids"] == [CAN] and "code" not in cls
