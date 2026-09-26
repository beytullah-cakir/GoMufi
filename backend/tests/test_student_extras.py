"""
Harita sandıkları, rozetler, "Zorlandığım konular" tekrarı ve canlı ders hatırlatması.
"""
import json
from datetime import datetime, timedelta

import pytest

from core import badges, live_schedule

TEACHER = 998851
ECE, CAN = 998861, 998862
COURSE = 998871
MODULES = [f"m{i}" for i in range(1, 8)]          # 7 modül → 2 sandık (3. ve 6. modülden sonra)
CURRICULUM = [{"id": m, "title": f"Modül {i}", "theme": "purple", "xp": 10} for i, m in enumerate(MODULES, start=1)]
QUESTION = {
    "id": "q1", "type": "multiple_choice", "content": "print(2 + 3) ne yazar?",
    "extra": {"options": [
        {"id": "a", "text": "5", "isCorrect": True},
        {"id": "b", "text": "23", "isCorrect": False, "misconception": "Sayıları metin gibi birleştirmek"},
    ]},
}
NOTES = [{"id": m, "slides": [{"id": f"{m}_s1", "type": "text", "elements": [QUESTION] if m == "m1" else []}]}
         for m in MODULES]


@pytest.fixture
def seeded(db_query):
    def cleanup():
        for table in ("module_progress", "learning_events", "concept_mastery", "enrollments"):
            db_query(f"DELETE FROM {table} WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM reward_claims WHERE student_id IN (%s, %s)", (ECE, CAN), fetch=False)
        db_query("DELETE FROM notification_log WHERE kind = 'live_soon' AND key LIKE %s", (f"{COURSE}:%",), fetch=False)
        db_query("DELETE FROM student_activity_days WHERE student_id IN (%s, %s)", (ECE, CAN), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s)", (ECE, CAN), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Selin', 'Hoca', 'se@test.local')",
             (TEACHER,), fetch=False)
    for sid in (ECE, CAN):
        db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, 'Öğrenci', 'Test', %s, 0)",
                 (sid, f"se{sid}@test.local"), fetch=False)
    classes = [{"id": "c_a", "name": "A", "student_ids": [ECE, CAN], "code": "SEA001",
                "schedule": [{"day": "Pazartesi", "time": "18:00"}]}]
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes) VALUES (%s, %s, 'Python', %s, %s, %s)",
             (COURSE, TEACHER, json.dumps(CURRICULUM), json.dumps(NOTES), json.dumps(classes)), fetch=False)
    for sid in (ECE, CAN):
        db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (sid, COURSE), fetch=False)
    import learning_store
    learning_store._CONTEXT_CACHE.pop(COURSE, None)
    yield
    cleanup()


def _complete(client, node):
    return client.post(f"/progress/courses/{COURSE}/complete", json={"node_id": node})


@pytest.mark.db
def test_sandik_onundeki_moduller_bitince_bir_kez_acilir(auth_as, seeded):
    ece = auth_as(ECE, "student")
    chests = ece.get(f"/progress/courses/{COURSE}").json()["chests"]
    assert [(c["index"], c["after"], c["ready"], c["opened"]) for c in chests] == [(1, "m3", False, False), (2, "m6", False, False)]
    assert ece.post(f"/progress/courses/{COURSE}/chests/1/open").status_code == 409     # henüz hazır değil

    for m in MODULES[:3]:
        assert _complete(ece, m).status_code == 200
    opened = ece.post(f"/progress/courses/{COURSE}/chests/1/open")
    assert opened.status_code == 200
    body = opened.json()
    assert body["xp_awarded"] in (30, 50, 80) and body["xp"] == 30 + body["xp_awarded"]
    assert body["chests"][0]["opened"] and body["chests"][0]["xp"] == body["xp_awarded"]
    assert ece.post(f"/progress/courses/{COURSE}/chests/1/open").status_code == 409     # ikinci kez yok
    assert ece.post(f"/progress/courses/{COURSE}/chests/2/open").status_code == 409
    assert ece.post(f"/progress/courses/{COURSE}/chests/9/open").status_code == 404

    # Rozetler gerçek kayıttan: ilk modül ve ilk sandık kazanıldı.
    got = {b["key"]: b for b in ece.get("/progress/badges").json()["badges"]}
    assert got["ilk_adim"]["earned"] and got["hazine_avcisi"]["earned"]
    assert not got["kasif"]["earned"] and got["kasif"]["progress"] == 3


@pytest.mark.db
def test_tekrar_yanlis_cevaplanan_soruyu_getirir_dogru_sikki_gostermez(auth_as, seeded, db_query):
    ece = auth_as(ECE, "student")
    assert ece.get(f"/progress/courses/{COURSE}/review").json()["questions"] == []

    details = {"kind": "mcq", "slide_id": "m1_s1", "element_id": "q1", "selected": ["b"], "correct": False}
    db_query("INSERT INTO learning_events (course_id, student_id, node_id, event_type, outcome, details) "
             "VALUES (%s, %s, 'm1', 'slide_answer', 'fail', %s)", (COURSE, ECE, json.dumps(details)), fetch=False)
    review = ece.get(f"/progress/courses/{COURSE}/review").json()
    assert [q["key"] for q in review["questions"]] == ["m1_s1:q1"]
    assert "isCorrect" not in json.dumps(review) and "correct" not in review["questions"][0]["options"][0]
    assert review["min_answered"] == 1 and review["done_today"] is False

    wrong = ece.post(f"/progress/courses/{COURSE}/review/answer", json={"key": "m1_s1:q1", "selected": ["b"]}).json()
    assert wrong == {"key": "m1_s1:q1", "correct": False, "correct_ids": ["a"],
                     "explanation": "Sayıları metin gibi birleştirmek"}

    assert ece.post(f"/progress/courses/{COURSE}/review/complete", json={"answers": []}).status_code == 400
    done = ece.post(f"/progress/courses/{COURSE}/review/complete",
                    json={"answers": [{"key": "m1_s1:q1", "selected": ["a"]}]}).json()
    assert done == {"answered": 1, "correct": 1, "xp_awarded": 20}
    again = ece.post(f"/progress/courses/{COURSE}/review/complete",
                     json={"answers": [{"key": "m1_s1:q1", "selected": ["a"]}]}).json()
    assert again["xp_awarded"] == 0                                                   # günde bir kez
    assert ece.get(f"/progress/courses/{COURSE}/review").json()["done_today"] is True

    # Başka öğrencinin cevabı Can'in tekrarına girmez; kayıtlı olmayan kurs 404.
    assert auth_as(CAN, "student").get(f"/progress/courses/{COURSE}/review").json()["questions"] == []
    assert auth_as(CAN, "student").get("/progress/courses/1/review").status_code == 404


def test_canli_ders_saati_turkiye_saatinden_utc():
    # 2026-09-28 Pazartesi. 18:00 TSİ = 15:00 UTC.
    now = datetime(2026, 9, 28, 14, 55)
    assert live_schedule.next_start({"day": "Pazartesi", "time": "18:00"}, now) == datetime(2026, 9, 28, 15, 0)
    # Ders sürerken hâlâ bu ders; bitince bir sonraki hafta.
    assert live_schedule.next_start({"day": "Pazartesi", "time": "18:00"}, datetime(2026, 9, 28, 15, 30)) == datetime(2026, 9, 28, 15, 0)
    assert live_schedule.next_start({"day": "Pazartesi", "time": "18:00"}, datetime(2026, 9, 28, 16, 5)) == datetime(2026, 10, 5, 15, 0)
    assert live_schedule.next_start({"day": "Funday", "time": "18:00"}, now) is None
    assert live_schedule.next_start({"day": "Salı", "time": "25:00"}, now) is None


@pytest.mark.db
def test_canli_ders_hatirlatmasi_bir_kez(auth_as, seeded, monkeypatch):
    import asyncio

    import connect_db
    from core import mailer, notifications

    sent = []

    async def fake_send(to, subject, text, html):
        sent.append((to, subject))
        return True

    monkeypatch.setattr(mailer, "send_email", fake_send)
    now = datetime(2026, 9, 28, 14, 52)                                  # ders 15:00 UTC → 8 dk kaldı

    async def run(at):
        async with connect_db.SessionLocal() as db:
            return await notifications.live_reminders(db, at)

    assert asyncio.run(run(now)) == 2
    assert asyncio.run(run(now + timedelta(minutes=1))) == 0             # aynı ders için ikinci kez yok
    assert {to for to, _ in sent} == {f"se{ECE}@test.local", f"se{CAN}@test.local"}
    assert asyncio.run(run(datetime(2026, 9, 28, 14, 30))) == 0          # 30 dk kala henüz değil

    res = auth_as(ECE, "student").get("/student/upcoming-live")
    assert res.status_code == 200 and isinstance(res.json()["items"], list)
    assert auth_as(TEACHER, "teacher").get("/student/upcoming-live").status_code == 403


def test_rozet_hedefleri():
    values = {"modules": 12, "longest_streak": 7, "level": 4}
    got = {b["key"]: b for b in badges.evaluate(values)}
    assert got["kasif"]["earned"] and got["alev_alev"]["earned"] and not got["durdurulamaz"]["earned"]
    assert got["seviye_5"]["progress"] == 4 and not got["seviye_5"]["earned"]
