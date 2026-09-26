"""
Modül ilerlemesi sunucuda + öğretmenin tempo sınırı + canlı ders.

Senaryo: 4 modüllü bir kurs; Ece A şubesinde, Can B şubesinde. Öğretmen A
şubesine "2. modüle kadar açık" diyor; bir canlı derste 3. modülü işliyor.
"""
import json

import pytest

pytestmark = pytest.mark.db

TEACHER, OTHER_TEACHER = 998951, 998952
ECE, CAN, OUTSIDER = 998961, 998962, 998963
COURSE = 998971
MODULES = ["m_anla", "m_uygula", "m_birlestir", "m_uret"]
CURRICULUM = [
    {"type": "live_sessions_config", "is_live": True, "sessions": []},
    {"id": "m_anla", "title": "Döngüler · ANLA", "theme": "purple", "xp": 100},
    {"id": "m_uygula", "title": "Döngüler · UYGULA", "theme": "cyan", "xp": 5000},
    {"id": "m_birlestir", "title": "Döngüler · BİRLEŞTİR", "theme": "green"},
    {"id": "m_uret", "title": "Döngüler · ÜRET", "theme": "yellow", "xp": 50},
]
CLASSES = [
    {"id": "c_a", "name": "A Şubesi", "student_ids": [ECE], "code": "CPA001", "schedule": []},
    {"id": "c_b", "name": "B Şubesi", "student_ids": [CAN], "code": "CPB001", "schedule": []},
]


@pytest.fixture
def seeded(db_query):
    students = (ECE, CAN, OUTSIDER)

    def cleanup():
        db_query("DELETE FROM module_progress WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM learning_events WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM concept_mastery WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM live_sessions WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM course_settings WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM homework_submissions WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s, %s)", students, fetch=False)
        db_query("DELETE FROM teachers WHERE id IN (%s, %s)", (TEACHER, OTHER_TEACHER), fetch=False)

    cleanup()
    for tid in (TEACHER, OTHER_TEACHER):
        db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Selin', 'Hoca', %s)",
                 (tid, f"cp{tid}@test.local"), fetch=False)
    for sid in students:
        db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, 'Öğrenci', 'Test', %s, 0)",
                 (sid, f"cp{sid}@test.local"), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes) VALUES (%s, %s, 'Python', %s, '[]', %s)",
             (COURSE, TEACHER, json.dumps(CURRICULUM), json.dumps(CLASSES)), fetch=False)
    for sid in (ECE, CAN):
        db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (sid, COURSE), fetch=False)
    import learning_store
    learning_store._CONTEXT_CACHE.pop(COURSE, None)
    yield
    cleanup()


def progress(client):
    return client.get(f"/progress/courses/{COURSE}")


def complete(client, node, **extra):
    return client.post(f"/progress/courses/{COURSE}/complete", json={"node_id": node, **extra})


def test_moduller_sirayla_acilir_ve_xp_bir_kez_verilir(auth_as, seeded, db_query):
    ece = auth_as(ECE, "student")
    start = progress(ece).json()
    assert start["order"] == MODULES and start["completed"] == {} and start["open_until"] == 1

    assert complete(ece, "m_uygula").status_code == 409             # 1. bitmeden 2. olmaz
    first = complete(ece, "m_anla", stars=2).json()
    assert first["xp_awarded"] == 100 and first["xp"] == 100 and first["open_until"] == 2
    again = complete(ece, "m_anla", stars=3).json()
    assert again["xp_awarded"] == 0 and again["xp"] == 100             # XP ikinci kez yok
    assert again["completed"]["m_anla"]["stars"] == 3                 # yıldız iyileşebilir

    # Öğretmenin koyduğu XP bile olsa modül başı en fazla 1000; belirtilmemişse 500.
    assert complete(ece, "m_uygula").json()["xp_awarded"] == 1000
    assert complete(ece, "m_birlestir").json()["xp_awarded"] == 500

    # İlerleme cihazdan bağımsız: yeni bir oturumda aynı.
    again = progress(auth_as(ECE, "student")).json()
    assert set(again["completed"]) == {"m_anla", "m_uygula", "m_birlestir"} and again["open_until"] == 4

    # Öğretmen analizleri için öğrenme kaydına yazıldı (her modül bir kez).
    rows = db_query("SELECT count(*) FROM learning_events WHERE course_id = %s AND student_id = %s "
                    "AND event_type = 'module_completed'", (COURSE, ECE))
    assert rows[0][0] == 3


def test_ogretmen_subeye_sinir_koyar(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    saved = teacher.put(f"/courses/{COURSE}/classroom-settings", json={"unlocked_until": {"c_a": 2}})
    assert saved.status_code == 200 and saved.json()["unlocked_until"] == {"c_a": 2}
    assert [m["id"] for m in saved.json()["modules"]] == MODULES

    ece = auth_as(ECE, "student")
    complete(ece, "m_anla")
    complete(ece, "m_uygula")
    assert progress(ece).json()["open_until"] == 2
    assert complete(ece, "m_birlestir").status_code == 409

    can = auth_as(CAN, "student")                                       # B şubesi sınırsız
    complete(can, "m_anla")
    complete(can, "m_uygula")
    assert complete(can, "m_birlestir").status_code == 200

    # Tüm şubeler için genel sınır; şubeye özel sınır geneli ezer.
    teacher = auth_as(TEACHER, "teacher")
    teacher.put(f"/courses/{COURSE}/classroom-settings", json={"unlocked_until": {"*": 1, "c_a": 3}})
    assert progress(auth_as(CAN, "student")).json()["unlocked_until"] == 1
    assert progress(auth_as(ECE, "student")).json()["open_until"] == 3

    # Sınırı kaldırmak
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.put(f"/courses/{COURSE}/classroom-settings", json={"unlocked_until": {}}).json()["unlocked_until"] == {}


def test_canli_derste_islenen_moduller_bitmis_sayilir(auth_as, seeded):
    # Canlı ders yokken "live" iddiası işe yaramaz.
    assert complete(auth_as(CAN, "student"), "m_uret", via="live").status_code == 409

    teacher = auth_as(TEACHER, "teacher")
    assert teacher.post(f"/start-session/{COURSE}", params={"title": "gomufi_session:3:Döngüler"}).status_code == 200

    # Canlıyken öğretmen dersi bitirdi: sırası gelmemiş olsa da işaretlenebilir.
    ece = auth_as(ECE, "student")
    assert complete(ece, "m_birlestir", via="live").status_code == 200
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.post(f"/stop-session/{COURSE}").status_code == 200

    can = progress(auth_as(CAN, "student")).json()                     # Can derse katılmasa da
    assert set(can["completed"]) == {"m_anla", "m_uygula", "m_birlestir"}
    assert all(v["source"] == "live" for v in can["completed"].values())
    assert can["open_until"] == 4


def test_teslim_edilen_odevler_sunucudan(auth_as, seeded, db_query):
    db_query("INSERT INTO homework_submissions (course_id, node_id, student_id, file_name) VALUES (%s, '777', %s, 'a.py')",
             (COURSE, ECE), fetch=False)
    assert progress(auth_as(ECE, "student")).json()["submitted_homework"] == ["777"]
    assert progress(auth_as(CAN, "student")).json()["submitted_homework"] == []


def test_yetkiler(auth_as, seeded, client):
    assert progress(auth_as(OUTSIDER, "student")).status_code == 404
    assert progress(auth_as(TEACHER, "teacher")).status_code == 403
    assert complete(auth_as(ECE, "student"), "yok").status_code == 404
    other = auth_as(OTHER_TEACHER, "teacher")
    assert other.get(f"/courses/{COURSE}/classroom-settings").status_code == 404
    assert other.put(f"/courses/{COURSE}/classroom-settings", json={"leaderboard_enabled": False}).status_code == 404
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.put(f"/courses/{COURSE}/classroom-settings", json={"unlocked_until": {"c_z": 1}}).status_code == 400
    assert teacher.put(f"/courses/{COURSE}/classroom-settings", json={"unlocked_until": {"c_a": 9}}).status_code == 400
    assert auth_as(ECE, "student").get(f"/courses/{COURSE}/classroom-settings").status_code == 403


def test_oyun_xpsi_istek_basina_sinirli(auth_as, seeded):
    ece = auth_as(ECE, "student")
    assert ece.post("/profile/student/stats", json={"xp_gain": 1_000_000}).json()["xp"] == 50
    assert ece.post("/profile/student/stats", json={"xp_gain": -500}).json()["xp"] == 50
