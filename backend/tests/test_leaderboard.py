"""Liderlik tablosu — yalnızca şube içi, öğretmen kapatabilir.

Platform geneli sıralama kaldırıldı: farklı okullardaki çocukları birbirine
göstermenin öğrenmeye katkısı yok, gizlilik riski var.
"""
import json

import pytest

from core import gamification

pytestmark = pytest.mark.db

TEACHER = 998901
ECE, DENIZ, CAN, OUTSIDER = 998911, 998912, 998913, 998914
COURSE = 998931
CLASSES = [
    {"id": "c_a", "name": "A Şubesi", "student_ids": [ECE, DENIZ], "code": "LBA001", "schedule": []},
    {"id": "c_b", "name": "B Şubesi", "student_ids": [CAN], "code": "LBB001", "schedule": []},
]


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM course_settings WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s, %s, %s)", (ECE, DENIZ, CAN, OUTSIDER), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Selin', 'Hoca', 'lb@test.local')",
             (TEACHER,), fetch=False)
    for sid, name, nick, xp in ((ECE, "Ece", "ece_kod", 300), (DENIZ, "Deniz", None, 900),
                                (CAN, "Can", None, 5000), (OUTSIDER, "Yabancı", None, 10)):
        db_query("INSERT INTO students (id, first_name, last_name, email, nickname, xp) "
                 "VALUES (%s, %s, 'Yılmaz', %s, %s, %s)", (sid, name, f"lb{sid}@test.local", nick, xp), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes) "
             "VALUES (%s, %s, 'Python', '[]', '[]', %s)", (COURSE, TEACHER, json.dumps(CLASSES)), fetch=False)
    for sid in (ECE, DENIZ, CAN):
        db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (sid, COURSE), fetch=False)
    yield
    cleanup()


def board(client, **params):
    return client.get("/leaderboard", params={"course_id": COURSE, **params})


def test_kimliksiz_reddedilir(client):
    assert client.get("/leaderboard").status_code == 401


def test_egitmen_erisemez(auth_as, seeded):
    assert board(auth_as(TEACHER, "teacher")).status_code == 403


def test_platform_geneli_siralama_yok(auth_as, seeded):
    assert board(auth_as(ECE, "student"), scope="global").status_code == 400
    assert auth_as(ECE, "student").get("/leaderboard").status_code == 400      # course_id zorunlu


def test_kayitli_olmadigi_kurs_403(auth_as, seeded):
    assert board(auth_as(OUTSIDER, "student")).status_code == 403


def test_yalnizca_kendi_subesi_siralanir(auth_as, seeded):
    data = board(auth_as(ECE, "student")).json()
    assert data["class_name"] == "A Şubesi" and data["disabled"] is False
    # Can (B şubesi, 5000 XP) Ece'nin listesinde yok.
    assert [e["student_id"] for e in data["entries"]] == [DENIZ, ECE]
    assert data["total_players"] == 2 and data["me"]["rank"] == 2 and data["me"]["is_me"] is True

    for e in data["entries"]:
        assert e["level"] == gamification.level_for_xp(e["xp"])
        assert "email" not in e
    # Gizlilik: takma ad ya da "Ad S." — tam soyad görünmez.
    names = {e["student_id"]: e["display_name"] for e in data["entries"]}
    assert names == {ECE: "ece_kod", DENIZ: "Deniz Y."}

    only_b = board(auth_as(CAN, "student")).json()
    assert [e["student_id"] for e in only_b["entries"]] == [CAN]


def test_ogretmen_kapatinca_siralama_gorunmez(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.put(f"/courses/{COURSE}/classroom-settings", json={"leaderboard_enabled": False}).status_code == 200
    data = board(auth_as(ECE, "student")).json()
    assert data["disabled"] is True and data["entries"] == [] and data["me"] is None
