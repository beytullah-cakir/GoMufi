"""
KVKK: kullanıcı kendi verisini indirebilir ve hesabını silebilir.
Eskiden bunu yalnızca yönetici yapabiliyordu.
"""
import json

import pytest

from core.security import hash_password

pytestmark = pytest.mark.db

TEACHER, STUDENT, PARENT = 999601, 999611, 999621
COURSE = 999631
CLASSES = [{"id": "c1", "name": "A", "student_ids": [STUDENT], "code": "KVKK01", "schedule": []}]


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM conversations WHERE teacher_id = %s", (TEACHER,), fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM stored_files WHERE owner_id IN (%s, %s)", (TEACHER, STUDENT), fetch=False)
        db_query("DELETE FROM students WHERE id = %s", (STUDENT,), fetch=False)
        db_query("DELETE FROM parents WHERE id = %s", (PARENT,), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email, password) VALUES (%s, 'Selin', 'H', 'kvkk-t@test.local', %s)",
             (TEACHER, hash_password("ogretmen-sifre")), fetch=False)
    db_query("INSERT INTO parents (id, first_name, last_name, email, hashed_password, is_active) "
             "VALUES (%s, 'Veli', 'T', 'kvkk-p@test.local', '', true)", (PARENT,), fetch=False)
    db_query("INSERT INTO students (id, first_name, last_name, email, xp, password, parent_id) "
             "VALUES (%s, 'Ece', 'T', 'kvkk-s@test.local', 0, %s, %s)",
             (STUDENT, hash_password("ogrenci-sifre"), PARENT), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes, progress) "
             "VALUES (%s, %s, 'Python', '[]', '[]', %s, 0)", (COURSE, TEACHER, json.dumps(CLASSES)), fetch=False)
    db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (STUDENT, COURSE), fetch=False)
    db_query("INSERT INTO module_progress (course_id, student_id, node_id, stars, xp_awarded, source) "
             "VALUES (%s, %s, 'm1', 3, 500, 'self')", (COURSE, STUDENT), fetch=False)
    conv = db_query("INSERT INTO conversations (teacher_id, member_role, member_id, student_id, teacher_unread, member_unread, "
                    "teacher_archived, member_archived) VALUES (%s, 'student', %s, %s, 0, 0, false, false) RETURNING id",
                    (TEACHER, STUDENT, STUDENT))[0][0]
    db_query("INSERT INTO messages (conversation_id, sender_role, sender_id, body, kind) VALUES (%s, 'student', %s, 'Hocam merhaba', 'text')",
             (conv, STUDENT), fetch=False)
    yield
    cleanup()


def test_verilerimi_indir(auth_as, seeded):
    r = auth_as(STUDENT, "student").get("/account/export")
    assert r.status_code == 200 and "attachment" in r.headers["content-disposition"]
    data = r.json()
    assert data["profile"]["email"] == "kvkk-s@test.local" and "password" not in data["profile"]
    assert data["records"]["module_progress"][0]["node_id"] == "m1"
    assert data["records"]["conversations"][0]["messages"][0]["body"] == "Hocam merhaba"
    assert auth_as(1, "admin").get("/account/export").status_code in (400, 401)


def test_ogrenci_hesabini_siler(auth_as, seeded, db_query):
    student = auth_as(STUDENT, "student")
    assert student.post("/account/delete", json={"confirm": "evet", "password": "ogrenci-sifre"}).status_code == 400
    assert student.post("/account/delete", json={"confirm": "hesabımı sil", "password": "yanlis"}).status_code == 403
    r = student.post("/account/delete", json={"confirm": "hesabımı sil", "password": "ogrenci-sifre"})
    assert r.status_code == 200
    assert db_query("SELECT count(*) FROM students WHERE id = %s", (STUDENT,))[0][0] == 0
    assert db_query("SELECT count(*) FROM module_progress WHERE student_id = %s", (STUDENT,))[0][0] == 0
    assert db_query("SELECT count(*) FROM conversations WHERE member_id = %s", (STUDENT,))[0][0] == 0
    classes = db_query("SELECT classes FROM courses WHERE id = %s", (COURSE,))[0][0]
    assert classes[0]["student_ids"] == []                      # şubeden de çıkarıldı


def test_ogretmen_silinince_kurslari_da_silinir(auth_as, seeded, db_query):
    teacher = auth_as(TEACHER, "teacher")
    summary = teacher.get("/account/summary").json()
    assert summary["needs_password"] and summary["courses"] == [{"id": COURSE, "title": "Python"}]
    r = teacher.post("/account/delete", json={"confirm": "HESABIMI SİL", "password": "ogretmen-sifre"})
    assert r.status_code == 200 and r.json()["courses_deleted"] == 1
    assert db_query("SELECT count(*) FROM courses WHERE id = %s", (COURSE,))[0][0] == 0
    assert db_query("SELECT count(*) FROM students WHERE id = %s", (STUDENT,))[0][0] == 1


def test_parolasiz_veli_onay_metniyle_siler(auth_as, seeded, db_query):
    parent = auth_as(PARENT, "parent")
    assert parent.get("/account/summary").json()["needs_password"] is False
    assert parent.post("/account/delete", json={"confirm": "HESABIMI SİL"}).status_code == 200
    assert db_query("SELECT parent_id FROM students WHERE id = %s", (STUDENT,))[0][0] is None
