"""
Okulun günlük işleri — gerçek veritabanıyla uçtan uca.

Senaryo: Selin Hoca'nın Python kursunda Ece (A şubesi, velisi bağlı) ve Can
(B şubesi) var. Selin dersi Zoom'dan veriyor, yoklama alıyor, A şubesine duyuru
yapıyor; Ece şifresini unutuyor; ödevin teslim tarihi yaklaşıyor.

Her testin sorusu: bilgi doğru kişiye ulaşıyor mu, başkasına sızıyor mu?
"""
import asyncio
import json
import re
from datetime import date, datetime, timedelta

import pytest

pytestmark = pytest.mark.db

TEACHER, OTHER_TEACHER = 998801, 998802
ECE, CAN, OUTSIDER = 998811, 998812, 998813
PARENT, OTHER_PARENT = 998821, 998822
COURSE, OTHER_COURSE = 998831, 998832
HOMEWORK_SOON, HOMEWORK_LATER = 99880001, 99880002
NODE = "sec_sd_hw"
CLASSES = [
    {"id": "c_a", "name": "A Şubesi", "student_ids": [ECE], "code": "SDA001", "schedule": []},
    {"id": "c_b", "name": "B Şubesi", "student_ids": [CAN], "code": "SDB001", "schedule": []},
]


def _homework(slide_id, title, due):
    return {"id": slide_id, "type": "homework", "elements": [], "homeworkConfig": {
        "title": title, "instructions": "Yaz.", "submissionType": "code", "points": 10, "dueDate": due}}


@pytest.fixture
def seeded(db_query):
    from core import mailer

    teachers, students, parents = (TEACHER, OTHER_TEACHER), (ECE, CAN, OUTSIDER), (PARENT, OTHER_PARENT)

    def cleanup():
        db_query("DELETE FROM notification_log WHERE key LIKE %s OR key LIKE %s",
                 (f"{COURSE}:%", f"{TEACHER}:%"), fetch=False)
        db_query("DELETE FROM password_reset_tokens WHERE user_id IN (%s, %s, %s, %s, %s)",
                 (*teachers, *students), fetch=False)
        db_query("DELETE FROM parent_reports WHERE teacher_id IN (%s, %s)", teachers, fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id IN (%s, %s)", (COURSE, OTHER_COURSE), fetch=False)
        db_query("DELETE FROM homework_submissions WHERE course_id IN (%s, %s)", (COURSE, OTHER_COURSE), fetch=False)
        db_query("DELETE FROM courses WHERE teacher_id IN (%s, %s)", teachers, fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s, %s)", students, fetch=False)
        db_query("DELETE FROM parents WHERE id IN (%s, %s)", parents, fetch=False)
        db_query("DELETE FROM teachers WHERE id IN (%s, %s)", teachers, fetch=False)

    cleanup()
    for tid, name in ((TEACHER, "Selin"), (OTHER_TEACHER, "Başka")):
        db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, %s, 'Hoca', %s)",
                 (tid, name, f"t{tid}@test.local"), fetch=False)
    for pid in parents:
        db_query("INSERT INTO parents (id, first_name, last_name, email) VALUES (%s, 'Veli', 'Test', %s)",
                 (pid, f"p{pid}@test.local"), fetch=False)
    for sid, name, parent in ((ECE, "Ece", PARENT), (CAN, "Can", None), (OUTSIDER, "Yabancı", None)):
        db_query("INSERT INTO students (id, first_name, last_name, email, parent_id, xp) "
                 "VALUES (%s, %s, 'Test', %s, %s, 0)", (sid, name, f"s{sid}@test.local", parent), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes) "
             "VALUES (%s, %s, 'Python Atölyesi', %s, '[]', %s)",
             (COURSE, TEACHER, json.dumps([{"id": NODE, "title": "Ödevler"}]), json.dumps(CLASSES)), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes) VALUES (%s, %s, 'Başka Kurs', '[]', '[]')",
             (OTHER_COURSE, OTHER_TEACHER), fetch=False)
    soon = (datetime.utcnow() + timedelta(hours=12)).strftime("%Y-%m-%dT%H:%M")
    later = (datetime.utcnow() + timedelta(days=5)).strftime("%Y-%m-%dT%H:%M")
    db_query("INSERT INTO lesson_contents (course_id, node_id, title, slides) VALUES (%s, %s, 'Ödevler', %s)",
             (COURSE, NODE, json.dumps([_homework(HOMEWORK_SOON, "Çarpım Tablosu", soon),
                                        _homework(HOMEWORK_LATER, "Hesap Makinesi", later)])), fetch=False)
    for sid in (ECE, CAN):
        db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (sid, COURSE), fetch=False)
    db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (OUTSIDER, OTHER_COURSE), fetch=False)
    import learning_store
    for cid in (COURSE, OTHER_COURSE):
        learning_store._CONTEXT_CACHE.pop(cid, None)
    mailer.outbox.clear()
    yield mailer.outbox
    cleanup()


def mails_to(outbox, address):
    return [m for m in outbox if m.to == address]


# --- Canlı ders görüşme linki -----------------------------------------------------------

def test_gorusme_linki_yalnizca_kurstakilere_gorunur(auth_as, seeded, db_query):
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.put(f"/courses/{COURSE}/meeting-link", json={"url": "javascript:alert(1)"}).status_code == 400
    saved = teacher.put(f"/courses/{COURSE}/meeting-link", json={"url": "zoom.us/j/123456"})
    assert saved.status_code == 200 and saved.json()["url"] == "https://zoom.us/j/123456"
    assert auth_as(OTHER_TEACHER, "teacher").put(f"/courses/{COURSE}/meeting-link",
                                                 json={"url": "https://evil.example/x"}).status_code == 404

    assert auth_as(ECE, "student").get(f"/courses/{COURSE}/meeting-link").json()["url"] == "https://zoom.us/j/123456"
    assert auth_as(OUTSIDER, "student").get(f"/courses/{COURSE}/meeting-link").status_code == 403

    # Ders canlıyken durum yoklaması linki kayıtlı öğrenciye verir, kimliksiz isteğe vermez.
    assert auth_as(TEACHER, "teacher").post(f"/start-session/{COURSE}").status_code == 200
    try:
        assert auth_as(ECE, "student").get(f"/session-status/{COURSE}").json()["meeting_url"] == "https://zoom.us/j/123456"
        assert auth_as(OUTSIDER, "student").get(f"/session-status/{COURSE}").json()["meeting_url"] is None
        anon = auth_as(ECE, "student")
        anon.cookies.clear()
        status = anon.get(f"/session-status/{COURSE}").json()
        assert status["is_live"] is True and status["meeting_url"] is None
    finally:
        db_query("DELETE FROM live_sessions WHERE course_id = %s", (COURSE,), fetch=False)

    teacher = auth_as(TEACHER, "teacher")
    assert teacher.put(f"/courses/{COURSE}/meeting-link", json={"url": ""}).json()["url"] is None


# --- Şifremi unuttum ---------------------------------------------------------------------

def test_sifremi_unuttum_linkle_yeni_sifre(client, seeded):
    unknown = client.post("/auth/forgot-password", json={"email": "yok@test.local"})
    known = client.post("/auth/forgot-password", json={"email": f"S{ECE}@TEST.local"})
    # Kayıtlı olup olmadığı cevaptan anlaşılmaz.
    assert unknown.status_code == known.status_code == 200 and unknown.json() == known.json()

    mails = mails_to(seeded, f"s{ECE}@test.local")
    assert len(mails) == 1 and "öğrenci hesabın" in mails[0].text
    token = re.search(r"reset-password\?token=([\w-]+)", mails[0].text).group(1)

    assert client.get("/auth/reset-password/check", params={"token": token}).json() == {"valid": True, "role": "student"}
    short = client.post("/auth/reset-password", json={"token": token, "password": "kisa"})
    assert short.status_code == 400
    ok = client.post("/auth/reset-password", json={"token": token, "password": "YeniSifre123"})
    assert ok.status_code == 200 and ok.json()["role"] == "student"

    assert client.post("/student/login", json={"email": f"s{ECE}@test.local", "password": "YeniSifre123"}).status_code == 200
    # Link tek kullanımlık.
    assert client.post("/auth/reset-password", json={"token": token, "password": "BaskaSifre123"}).status_code == 400
    assert client.get("/auth/reset-password/check", params={"token": token}).json()["valid"] is False
    assert client.post("/auth/reset-password", json={"token": "x" * 43, "password": "YeniSifre123"}).status_code == 400


def test_sifre_sifirlama_saatte_uc_link(client, seeded):
    for _ in range(5):
        assert client.post("/auth/forgot-password", json={"email": f"t{TEACHER}@test.local"}).status_code == 200
    mails = mails_to(seeded, f"t{TEACHER}@test.local")
    assert len(mails) == 3 and "öğretmen hesabın" in mails[0].text


def test_yeni_sifre_eski_linkleri_iptal_eder(client, seeded):
    for _ in range(2):
        client.post("/auth/forgot-password", json={"email": f"s{CAN}@test.local"})
    first, second = (re.search(r"token=([\w-]+)", m.text).group(1) for m in mails_to(seeded, f"s{CAN}@test.local"))
    assert client.post("/auth/reset-password", json={"token": second, "password": "YeniSifre123"}).status_code == 200
    assert client.post("/auth/reset-password", json={"token": first, "password": "BaskaSifre123"}).status_code == 400


# --- Yoklama -----------------------------------------------------------------------------

def test_yoklama_al_ozetle_ve_ogrenciye_goster(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    day1, day2 = date.today() - timedelta(days=2), date.today() - timedelta(days=1)

    sheet = teacher.get(f"/attendance/courses/{COURSE}", params={"date": day1.isoformat(), "class_id": "c_a"}).json()
    assert [s["id"] for s in sheet["students"]] == [ECE] and sheet["taken"] is False
    assert {c["id"] for c in sheet["classes"]} == {"c_a", "c_b"}

    save = teacher.put(f"/attendance/courses/{COURSE}", json={"date": day1.isoformat(), "records": [
        {"student_id": ECE, "status": "present"}, {"student_id": CAN, "status": "absent", "note": "Hasta"}]})
    assert save.status_code == 200 and save.json()["saved"] == 2
    # Aynı gün tekrar kaydedilince üzerine yazılır, yeni satır açılmaz.
    teacher.put(f"/attendance/courses/{COURSE}", json={"date": day1.isoformat(), "records": [
        {"student_id": CAN, "status": "excused", "note": "Rapor getirdi"}]})
    teacher.put(f"/attendance/courses/{COURSE}", json={"date": day2.isoformat(), "records": [
        {"student_id": ECE, "status": "late"}, {"student_id": CAN, "status": "absent"}]})

    summary = teacher.get(f"/attendance/courses/{COURSE}/summary").json()
    assert summary["days"] == [day1.isoformat(), day2.isoformat()]
    rows = {s["id"]: s for s in summary["students"]}
    assert rows[ECE]["present"] == 1 and rows[ECE]["late"] == 1 and rows[ECE]["rate"] == 100.0
    # İzinli gün devamsızlıktan sayılmaz: 1 yok / 1 sayılan gün.
    assert rows[CAN]["excused"] == 1 and rows[CAN]["absent"] == 1 and rows[CAN]["rate"] == 0.0
    assert rows[CAN]["by_date"][day1.isoformat()] == "excused"

    only_b = teacher.get(f"/attendance/courses/{COURSE}/summary", params={"class_id": "c_b"}).json()
    assert [s["id"] for s in only_b["students"]] == [CAN]

    mine = auth_as(CAN, "student").get("/attendance/me").json()["courses"][0]
    assert mine["absent"] == 1 and {r["status"] for r in mine["recent"]} == {"absent", "excused"}
    child = auth_as(PARENT, "parent").get(f"/attendance/children/{ECE}").json()["courses"][0]
    assert child["late"] == 1 and child["rate"] == 100.0
    assert auth_as(OTHER_PARENT, "parent").get(f"/attendance/children/{ECE}").status_code == 404

    # Durumu boş gönderince o günkü işaret geri alınır.
    teacher = auth_as(TEACHER, "teacher")
    cleared = teacher.put(f"/attendance/courses/{COURSE}", json={"date": day2.isoformat(), "records": [
        {"student_id": CAN, "status": None}]})
    assert cleared.json()["cleared"] == 1


def test_yoklama_yetki_ve_gecersiz_istekler(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    today = date.today().isoformat()
    tomorrow = (date.today() + timedelta(days=2)).isoformat()
    assert teacher.put(f"/attendance/courses/{COURSE}", json={"date": tomorrow, "records": []}).status_code == 400
    assert teacher.put(f"/attendance/courses/{COURSE}", json={"date": today, "records": [
        {"student_id": OUTSIDER, "status": "present"}]}).status_code == 400
    assert teacher.put(f"/attendance/courses/{COURSE}", json={"date": today, "records": [
        {"student_id": ECE, "status": "belki"}]}).status_code == 400
    assert auth_as(OTHER_TEACHER, "teacher").get(f"/attendance/courses/{COURSE}").status_code == 404
    assert auth_as(ECE, "student").get(f"/attendance/courses/{COURSE}").status_code == 403


# --- Duyurular ---------------------------------------------------------------------------

def test_subeye_duyuru_yalnizca_o_subeye_ve_velisine(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    to_a = teacher.post(f"/announcements/courses/{COURSE}", json={
        "title": "Yarın laboratuvar", "body": "A şubesi yarın 2. derste laboratuvarda.", "class_id": "c_a",
        "send_email": True})
    assert to_a.status_code == 200, to_a.text
    assert to_a.json()["recipients"] == 1 and to_a.json()["announcement"]["email_count"] == 2
    teacher.post(f"/announcements/courses/{COURSE}", json={"title": "Sınav tarihi", "body": "Sınav 10 Ekim'de."})

    ece_sees = [a["title"] for a in auth_as(ECE, "student").get("/announcements/me").json()["announcements"]]
    can_sees = [a["title"] for a in auth_as(CAN, "student").get("/announcements/me").json()["announcements"]]
    assert ece_sees == ["Sınav tarihi", "Yarın laboratuvar"]
    assert can_sees == ["Sınav tarihi"]
    assert auth_as(OUTSIDER, "student").get("/announcements/me").json()["announcements"] == []
    parent_sees = auth_as(PARENT, "parent").get("/announcements/me").json()["announcements"]
    assert {a["title"] for a in parent_sees} == {"Sınav tarihi", "Yarın laboratuvar"}
    assert parent_sees[1]["class_name"] == "A Şubesi" and parent_sees[1]["teacher"] == "Selin Hoca"

    # E-posta yalnızca A şubesindeki öğrenciye ve velisine gitti.
    assert {m.to for m in seeded} == {f"s{ECE}@test.local", f"p{PARENT}@test.local"}
    assert "A şubesi yarın" in seeded[0].text


def test_duyuru_yetkileri(auth_as, seeded):
    other = auth_as(OTHER_TEACHER, "teacher")
    assert other.post(f"/announcements/courses/{COURSE}", json={"title": "x", "body": "y"}).status_code == 404
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.post(f"/announcements/courses/{COURSE}",
                        json={"title": "x", "body": "y", "class_id": "yok"}).status_code == 400
    created = teacher.post(f"/announcements/courses/{COURSE}", json={"title": "Silinecek", "body": "y"}).json()
    aid = created["announcement"]["id"]
    auth_as(OTHER_TEACHER, "teacher").delete(f"/announcements/{aid}")
    assert len(auth_as(TEACHER, "teacher").get(f"/announcements/courses/{COURSE}").json()["announcements"]) == 1
    teacher = auth_as(TEACHER, "teacher")
    teacher.delete(f"/announcements/{aid}")
    assert teacher.get(f"/announcements/courses/{COURSE}").json()["announcements"] == []
    assert auth_as(ECE, "student").post(f"/announcements/courses/{COURSE}",
                                        json={"title": "x", "body": "y"}).status_code == 403


# --- Otomatik e-postalar -------------------------------------------------------------------

def run_notifications(now=None):
    import connect_db
    from core import notifications

    async def go():
        async with connect_db.SessionLocal() as db:
            return await notifications.run_once(db, now)
    return asyncio.run(go())


def test_odev_hatirlatma_teslim_etmeyene_bir_kez(db_query, seeded):
    db_query("INSERT INTO homework_submissions (course_id, node_id, student_id, file_name) VALUES (%s, %s, %s, 'odev.py')",
             (COURSE, str(HOMEWORK_SOON), ECE), fetch=False)

    first = run_notifications()
    reminders = [m for m in seeded if m.subject.startswith("Ödev hatırlatması")]
    # Ece teslim etti; Can etmedi. 5 gün sonraki ödev için henüz hatırlatma yok.
    assert [m.to for m in reminders] == [f"s{CAN}@test.local"]
    assert "Çarpım Tablosu" in reminders[0].text and first["homework_due"] == 1

    assert run_notifications()["homework_due"] == 0


def test_ogretmene_gunluk_teslim_ozeti(db_query, seeded):
    db_query("INSERT INTO homework_submissions (course_id, node_id, student_id, file_name) VALUES (%s, %s, %s, 'a.py'), "
             "(%s, %s, %s, 'b.py')", (COURSE, str(HOMEWORK_SOON), ECE, COURSE, str(HOMEWORK_LATER), CAN), fetch=False)
    assert run_notifications()["submission_digest"] == 1
    digest = mails_to(seeded, f"t{TEACHER}@test.local")
    assert len(digest) == 1 and "2 yeni ödev teslimi" in digest[0].subject
    assert "Çarpım Tablosu: 1 teslim" in digest[0].text and "Hesap Makinesi: 1 teslim" in digest[0].text

    # Aynı gün yeni teslim gelse de ikinci özet gitmez; ertesi gün yalnızca yenileri sayar.
    db_query("UPDATE homework_submissions SET submitted_at = now() + interval '1 minute' WHERE student_id = %s", (CAN,),
             fetch=False)
    assert run_notifications()["submission_digest"] == 0
    assert run_notifications(datetime.utcnow() + timedelta(hours=25))["submission_digest"] == 1
    assert "1 yeni ödev teslimi" in mails_to(seeded, f"t{TEACHER}@test.local")[-1].subject


def test_veli_raporu_veliye_eposta_gider(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    draft = teacher.post(f"/analytics/courses/{COURSE}/students/{ECE}/parent-reports",
                         json={"use_ai": False, "teacher_note": "Derse katılımı çok iyi."})
    assert draft.status_code == 200, draft.text
    rid = draft.json()["report"]["id"]
    assert teacher.post(f"/analytics/parent-reports/{rid}/send").status_code == 200
    mails = mails_to(seeded, f"p{PARENT}@test.local")
    assert len(mails) == 1 and "Derse katılımı çok iyi." in mails[0].text and "Python Atölyesi" in mails[0].subject
