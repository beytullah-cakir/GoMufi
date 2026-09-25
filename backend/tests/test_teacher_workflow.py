"""
Öğretmen iş akışı — gerçek veritabanıyla uçtan uca.

Senaryo: bir Python kursunda iki öğrenci (Ece A şubesinde, Can B şubesinde),
Ece'nin velisi bağlı. Kursta bir Uygula görevi ve son tarihli, puanlama
anahtarlı bir ödev var. Ece görevde takılıyor, yardım istiyor, öğretmen
ipucu gönderiyor, mesajlaşıyorlar...

Her testin sorusu aynı: öğretmen gördüğü sayıya güvenebilir mi, ve bu
bilgi yalnızca görmesi gerekenlere mi ulaşıyor?
"""
import json
from datetime import datetime, timedelta

import pytest

pytestmark = pytest.mark.db

TEACHER, OTHER_TEACHER = 997701, 997702
ECE, CAN, OUTSIDER = 997711, 997712, 997713
PARENT, OTHER_PARENT = 997721, 997722
COURSE, OTHER_COURSE = 997731, 997732
NODE_A, NODE_B = "sec_twf_a", "sec_twf_b"
TASK_SLIDE, HOMEWORK_SLIDE = 99770001, 99770002
TASK_KEY = f"challenge:{TASK_SLIDE}"
HOMEWORK_KEY = str(HOMEWORK_SLIDE)
STARTER = "# Kodunu buraya yaz\n"

RUBRIC = {"criteria": [
    {"id": "dogruluk", "title": "Doğruluk", "levels": [
        {"label": "Başlangıç", "points": 1}, {"label": "Gelişmekte", "points": 2},
        {"label": "Yeterli", "points": 3}, {"label": "İleri", "points": 4}]},
    {"id": "okunabilirlik", "title": "Okunabilirlik", "levels": [
        {"label": "Zayıf", "points": 0}, {"label": "İyi", "points": 2}]},
]}

CURRICULUM = [
    {"id": NODE_A, "title": "Döngüler", "theme": "cyan", "conceptLanguage": "python",
     "conceptIds": ["for_dongusu", "range_kullanimi"], "primaryConceptId": "for_dongusu"},
    {"id": NODE_B, "title": "Döngü Ödevi", "theme": "homework", "conceptLanguage": "python",
     "conceptIds": ["for_dongusu"], "primaryConceptId": "for_dongusu"},
]
CLASSES = [
    {"id": "c_a", "name": "A Şubesi", "student_ids": [ECE], "code": "TWFA01", "schedule": []},
    {"id": "c_b", "name": "B Şubesi", "student_ids": [CAN], "code": "TWFB01", "schedule": []},
]


def slides(due: str):
    return {
        NODE_A: [{"id": TASK_SLIDE, "type": "challenge", "elements": [], "challengeConfig": {
            "title": "Sayaç", "prompt": "1'den 5'e kadar yazdır.", "starterCode": STARTER, "xp": 40,
            "files": [{"name": "gorev.py", "content": STARTER, "entry": True}],
        }}],
        NODE_B: [{"id": HOMEWORK_SLIDE, "type": "homework", "elements": [], "homeworkConfig": {
            "title": "Çarpım Tablosu", "instructions": "5'in çarpım tablosunu yazdır.",
            "submissionType": "code", "points": 30, "dueDate": due, "allowLate": False, "rubric": RUBRIC,
        }}],
    }


@pytest.fixture
def seeded(db_query):
    def cleanup():
        for table in ("messages",):
            db_query(f"DELETE FROM {table} WHERE conversation_id IN "
                     f"(SELECT id FROM conversations WHERE teacher_id IN (%s, %s))",
                     (TEACHER, OTHER_TEACHER), fetch=False)
        db_query("DELETE FROM conversations WHERE teacher_id IN (%s, %s)", (TEACHER, OTHER_TEACHER), fetch=False)
        db_query("DELETE FROM rubric_templates WHERE teacher_id IN (%s, %s)", (TEACHER, OTHER_TEACHER), fetch=False)
        db_query("DELETE FROM recording_consents WHERE student_id IN (%s, %s, %s)", (ECE, CAN, OUTSIDER), fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id IN (%s, %s)", (COURSE, OTHER_COURSE), fetch=False)
        db_query("DELETE FROM homework_submissions WHERE course_id IN (%s, %s)", (COURSE, OTHER_COURSE), fetch=False)
        db_query("DELETE FROM ai_usage_logs WHERE course_id IN (%s, %s)", (COURSE, OTHER_COURSE), fetch=False)
        db_query("DELETE FROM quizzes WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN (%s, %s))",
                 (TEACHER, OTHER_TEACHER), fetch=False)
        db_query("DELETE FROM courses WHERE teacher_id IN (%s, %s)", (TEACHER, OTHER_TEACHER), fetch=False)
        db_query("DELETE FROM students WHERE id IN (%s, %s, %s)", (ECE, CAN, OUTSIDER), fetch=False)
        db_query("DELETE FROM parents WHERE id IN (%s, %s)", (PARENT, OTHER_PARENT), fetch=False)
        db_query("DELETE FROM teachers WHERE id IN (%s, %s)", (TEACHER, OTHER_TEACHER), fetch=False)

    cleanup()
    for tid, name in ((TEACHER, "Selin"), (OTHER_TEACHER, "Başka")):
        db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, %s, 'Hoca', %s)",
                 (tid, name, f"t{tid}@test.local"), fetch=False)
    for pid in (PARENT, OTHER_PARENT):
        db_query("INSERT INTO parents (id, first_name, last_name, email) VALUES (%s, 'Veli', 'Test', %s)",
                 (pid, f"p{pid}@test.local"), fetch=False)
    for sid, name, parent in ((ECE, "Ece", PARENT), (CAN, "Can", None), (OUTSIDER, "Yabancı", None)):
        db_query("INSERT INTO students (id, first_name, last_name, email, parent_id, xp) "
                 "VALUES (%s, %s, 'Test', %s, %s, 0)", (sid, name, f"s{sid}@test.local", parent), fetch=False)
    due = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M")
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes) "
             "VALUES (%s, %s, 'Python Atölyesi', %s, '[]', %s)",
             (COURSE, TEACHER, json.dumps(CURRICULUM), json.dumps(CLASSES)), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes) VALUES (%s, %s, 'Başka Kurs', '[]', '[]')",
             (OTHER_COURSE, OTHER_TEACHER), fetch=False)
    for node_id, node_slides in slides(due).items():
        db_query("INSERT INTO lesson_contents (course_id, node_id, title, slides) VALUES (%s, %s, %s, %s)",
                 (COURSE, node_id, node_id, json.dumps(node_slides)), fetch=False)
    for sid in (ECE, CAN):
        db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (sid, COURSE), fetch=False)
    db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (OUTSIDER, OTHER_COURSE), fetch=False)
    import learning_store
    for cid in (COURSE, OTHER_COURSE):
        learning_store._CONTEXT_CACHE.pop(cid, None)
    yield
    cleanup()


def fail(attempt, label="Çıktı 1..5 olmalı"):
    return {"type": "check", "task_key": TASK_KEY, "outcome": "fail", "attempt": attempt, "client": "lab",
            "code": "for i in range(5): print(i)",
            "checks": [{"id": "out:0", "kind": "exact", "value": "1..5", "status": "fail", "label": label}]}


def events(client, *evs):
    resp = client.post("/analytics/events", json={"course_id": COURSE, "events": list(evs)})
    assert resp.status_code == 200, resp.text
    return resp.json()


# --- Adım 1: ana panel ve öğrenci listesi ---------------------------------------------

def test_ana_panel_gercek_sayilari_gosterir(auth_as, seeded):
    ece = auth_as(ECE, "student")
    events(ece, fail(1), fail(2), fail(3), {"type": "module_completed", "node_id": NODE_A})

    home = auth_as(TEACHER, "teacher").get("/teacher/home")
    assert home.status_code == 200, home.text
    data = home.json()
    assert data["student_count"] == 2
    assert data["course_count"] == 1
    assert data["active_today"] == 1                     # yalnızca Ece çalıştı
    assert data["solve_rate"] == 0                       # 1 görev başladı, çözülmedi
    assert [s["student"] for s in data["stuck_now"]] == ["Ece Test"]
    assert any(t["kind"] == "stuck" for t in data["todos"])
    course = data["courses"][0]
    assert course["completion_rate"] == 25               # Ece 1/2, Can 0/2 → ortalama %25
    assert course["stuck_now"] == 1
    assert any(a["kind"] == "module" and a["student"] == "Ece Test" for a in data["activity"])


def test_ana_panel_baska_ogretmenin_verisini_gostermez(auth_as, seeded):
    events(auth_as(ECE, "student"), fail(1))
    data = auth_as(OTHER_TEACHER, "teacher").get("/teacher/home").json()
    assert data["student_count"] == 1                     # yalnızca kendi kursundaki Yabancı
    assert data["stuck_now"] == []
    assert all(a["student"] != "Ece Test" for a in data["activity"])


def test_ogrenci_listesi_durum_ilerleme_ve_sube_verir(auth_as, seeded):
    events(auth_as(ECE, "student"), fail(1), fail(2), fail(3), {"type": "module_completed", "node_id": NODE_A})
    rows = auth_as(TEACHER, "teacher").get("/teacher/students").json()
    by_name = {r["first_name"]: r for r in rows}
    assert set(by_name) == {"Ece", "Can"}
    ece, can = by_name["Ece"], by_name["Can"]
    assert ece["course_id"] == COURSE
    assert ece["progress"] == 50 and ece["modules_total"] == 2
    assert ece["status"] == "struggling"                  # şu an takılı
    assert ece["class_name"] == "A Şubesi" and can["class_name"] == "B Şubesi"
    assert ece["has_parent"] is True and can["has_parent"] is False
    assert can["status"] == "active"                      # yeni kayıt, henüz etkinlik yok


# --- Adım 2: mesajlaşma ----------------------------------------------------------------

def start(client, **body):
    return client.post("/messages/conversations", json={"course_id": COURSE, "topic": "Döngü", **body})


def test_ogrenci_sorusu_veritabaninda_ve_yalnizca_ogretmende(auth_as, seeded):
    resp = start(auth_as(ECE, "student"), body="range(1, 6) neden 6'ya kadar?")
    assert resp.status_code == 200, resp.text
    conv_id = resp.json()["conversation"]["id"]

    teacher = auth_as(TEACHER, "teacher")
    listed = teacher.get("/messages/conversations").json()["conversations"]
    assert [c["id"] for c in listed] == [conv_id]
    assert listed[0]["unread"] == 1 and listed[0]["counterpart"]["name"] == "Ece Test"
    assert teacher.get("/messages/unread").json()["count"] == 1

    # Okuyunca okunmamış sıfırlanır; öğretmen cevap yazar, bu kez öğrencide okunmamış var.
    thread = teacher.get(f"/messages/conversations/{conv_id}").json()
    assert [m["body"] for m in thread["messages"]] == ["range(1, 6) neden 6'ya kadar?"]
    assert teacher.get("/messages/unread").json()["count"] == 0
    assert teacher.post(f"/messages/conversations/{conv_id}/messages", json={"body": "Bitiş dahil değil."}).status_code == 200
    assert auth_as(ECE, "student").get("/messages/unread").json()["count"] == 1

    # Başka öğrenci ve başka öğretmen bu yazışmayı ne listede görür ne açabilir.
    assert auth_as(CAN, "student").get("/messages/conversations").json()["conversations"] == []
    assert auth_as(CAN, "student").get(f"/messages/conversations/{conv_id}").status_code == 404
    assert auth_as(OTHER_TEACHER, "teacher").get(f"/messages/conversations/{conv_id}").status_code == 404


def test_kim_kime_yazabilir(auth_as, seeded):
    # Öğrenci kayıtlı olmadığı kursun öğretmenine yazamaz.
    assert start(auth_as(ECE, "student"), course_id=OTHER_COURSE, body="merhaba").status_code == 403
    # Veli yalnızca kendi çocuğu için yazar.
    assert start(auth_as(PARENT, "parent"), student_id=ECE, body="Ece nasıl?").status_code == 200
    assert start(auth_as(OTHER_PARENT, "parent"), student_id=ECE, body="Ece nasıl?").status_code == 403
    # Öğretmen kursundaki öğrenciye ve onun velisine yazar; kurs dışı öğrenciye yazamaz.
    teacher = auth_as(TEACHER, "teacher")
    assert start(teacher, student_id=CAN, body="Ödevini gördüm").status_code == 200
    assert start(teacher, student_id=ECE, parent_id=PARENT, body="Ece bu hafta çok iyiydi").status_code == 200
    assert start(teacher, student_id=CAN, parent_id=PARENT, body="yanlış veli").status_code == 403
    assert start(teacher, student_id=OUTSIDER, body="?").status_code == 403
    # Başka öğretmenin kursunda yazışma açılamaz.
    assert start(auth_as(OTHER_TEACHER, "teacher"), student_id=ECE, body="?").status_code == 404


def test_ayni_kisiyle_yazisma_tekrar_kullanilir_ve_dosya_adresi_dogrulanir(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    first = start(teacher, student_id=CAN, body="bir", reuse=True).json()["conversation"]["id"]
    second = start(teacher, student_id=CAN, body="iki", reuse=True).json()["conversation"]["id"]
    assert first == second
    bad = teacher.post(f"/messages/conversations/{first}/messages",
                       json={"kind": "image", "file_url": "javascript:alert(1)"})
    assert bad.status_code == 400
    ok = teacher.post(f"/messages/conversations/{first}/messages",
                      json={"kind": "file", "file_url": "http://localhost:8000/static/uploads/abc-1.pdf", "file_name": "not.pdf"})
    assert ok.status_code == 200


def test_yeni_mesaj_bildirimi_yalnizca_karsi_tarafa_gider(client, auth_as, seeded):
    from core.security import create_access_token
    client.cookies.set("access_token", create_access_token(str(TEACHER), role="teacher"))
    with client.websocket_connect("/ws") as teacher_ws:
        client.cookies.set("access_token", create_access_token(str(CAN), role="student"))
        with client.websocket_connect("/ws") as can_ws:
            resp = start(auth_as(ECE, "student"), body="yardım")
            assert resp.status_code == 200
            got = teacher_ws.receive_json()
            assert got["type"] == "message_new" and got["message"]["body"] == "yardım"
            assert got["conversation"]["unread"] == 1
            # Can'a hiçbir şey gitmedi: ilk aldığı şey kendi ping'inin cevabı.
            can_ws.send_json({"type": "ping"})
            assert can_ws.receive_json() == {"type": "pong"}


def flush(ws):
    """Bu bağlantının gönderdikleri sunucuda işlendi mi? Ping'in cevabı gelince evet.

    Test istemcisi her WebSocket'i ayrı bir olay döngüsünde çalıştırıyor; alıcı
    beklemeye başladıktan sonra başka döngüden gelen mesaj onu uyandıramıyor.
    Üretimde bağlantılar tek döngüde; testte önce göndereni boşaltıyoruz.
    """
    ws.send_json({"type": "ping"})
    assert ws.receive_json() == {"type": "pong"}


def test_canli_ders_mesajlari_kurs_uyelerine_yonlendirilir(client, seeded):
    from core import live_routes
    from core.security import create_access_token
    live_routes.forget_course(COURSE)
    client.cookies.set("access_token", create_access_token(str(TEACHER), role="teacher"))
    with client.websocket_connect("/ws") as teacher_ws:
        client.cookies.set("access_token", create_access_token(str(ECE), role="student"))
        with client.websocket_connect("/ws") as ece_ws:
            client.cookies.set("access_token", create_access_token(str(OUTSIDER), role="student"))
            with client.websocket_connect("/ws") as outsider_ws:
                # Kursa kayıtlı olmayan öğrencinin durumu öğretmene ulaşmaz.
                outsider_ws.send_json({"type": "student_status", "courseId": COURSE, "name": "Sızma"})
                flush(outsider_ws)
                ece_ws.send_json({"type": "student_status", "courseId": COURSE, "name": "Ece", "currentSlide": 2})
                flush(ece_ws)
                got = teacher_ws.receive_json()
                assert got["type"] == "student_status" and got["name"] == "Ece"
                assert got["sender_id"] == f"student:{ECE}"
                # Öğretmenin slayt senkronu kayıtlı öğrenciye gider, yabancıya gitmez.
                teacher_ws.send_json({"type": "slide_status", "courseId": COURSE, "currentSlide": 3, "mode": "follow"})
                flush(teacher_ws)
                assert ece_ws.receive_json()["currentSlide"] == 3
                flush(outsider_ws)
                # Öğrenci öğretmen mesajı taklit edemez: kendi slayt senkronu kimseye gitmez.
                ece_ws.send_json({"type": "slide_status", "courseId": COURSE, "currentSlide": 9})
                flush(ece_ws)
                flush(teacher_ws)


# --- Adım 3: canlı ders ve öğretmen müdahaleleri ---------------------------------------

BASE = f"/analytics/courses/{COURSE}"
PASTED = "def sayac(n):\n    for i in range(1, n + 1):\n        print(i)\n\nsayac(5)\n"


def paste_solution(client):
    body = {"course_id": COURSE, "task_key": TASK_KEY, "client": "vscode", "chunks": [{
        "file": "gorev.py", "session": "s1", "seq": 0, "started_at_ms": 1_000, "base_text": STARTER,
        "ops": [[0, len(STARTER), 0, "x = 1\n", "t"], [900, len(STARTER) + 6, 0, PASTED, "p"]],
    }]}
    assert client.post("/analytics/edits", json=body).json() == {"applied": 1}


def test_yardim_istegi_panoda_sirada_ve_ana_panelde(auth_as, seeded):
    ece = auth_as(ECE, "student")
    events(ece, fail(1))
    resp = ece.post("/analytics/help", json={"course_id": COURSE, "task_key": TASK_KEY, "note": "range'i anlamadım"})
    assert resp.status_code == 200, resp.text
    assert ece.get("/analytics/help/mine", params={"course_id": COURSE, "task_key": TASK_KEY}).json()["open"] is True

    teacher = auth_as(TEACHER, "teacher")
    queue = teacher.get(f"{BASE}/help").json()["requests"]
    assert [(r["student"], r["note"]) for r in queue] == [("Ece Test", "range'i anlamadım")]
    detail = teacher.get(f"{BASE}/tasks/{TASK_KEY}").json()
    assert detail["help_open"] == 1 and detail["students"][0]["help"]["note"] == "range'i anlamadım"
    assert len(teacher.get(f"{BASE}/overview").json()["help_open"]) == 1
    home = teacher.get("/teacher/home").json()
    assert home["todos"][0]["kind"] == "help"

    # Kayıtsız öğrenci yardım isteyemez; öğrenci "çözdüm" deyince istek kapanır.
    assert auth_as(OUTSIDER, "student").post("/analytics/help", json={"course_id": COURSE, "task_key": TASK_KEY}).status_code == 403
    assert auth_as(ECE, "student").post("/analytics/help/cancel", json={"course_id": COURSE, "task_key": TASK_KEY}).json()["closed"] == 1
    assert auth_as(TEACHER, "teacher").get(f"{BASE}/help").json()["requests"] == []


def test_ogretmen_ipucu_ogrenciye_ulasir_ve_etkinlik_sayilmaz(auth_as, seeded, db_query):
    ece = auth_as(ECE, "student")
    events(ece, fail(1))
    ece.post("/analytics/help", json={"course_id": COURSE, "task_key": TASK_KEY})
    before = db_query("SELECT last_activity_at FROM task_progress WHERE course_id=%s AND student_id=%s", (COURSE, ECE))

    teacher = auth_as(TEACHER, "teacher")
    sent = teacher.post(f"{BASE}/nudges", json={"student_id": ECE, "task_key": TASK_KEY, "text": "range(1, 6) dene"})
    assert sent.status_code == 200, sent.text
    assert teacher.post(f"{BASE}/nudges", json={"student_id": OUTSIDER, "text": "?"}).status_code == 404
    assert teacher.get(f"{BASE}/help").json()["requests"][0]["responded"] is True
    # Öğretmenin ipucu öğrencinin "son etkinlik" zamanını değiştirmez (takılma hesabı bozulmasın).
    after = db_query("SELECT last_activity_at FROM task_progress WHERE course_id=%s AND student_id=%s", (COURSE, ECE))
    assert before == after

    ece = auth_as(ECE, "student")
    nudges = ece.get("/analytics/nudges", params={"course_id": COURSE, "task_key": TASK_KEY}).json()["nudges"]
    assert [n["text"] for n in nudges] == ["range(1, 6) dene"]
    assert auth_as(CAN, "student").post(f"/analytics/nudges/{nudges[0]['id']}/seen").status_code == 404
    ece = auth_as(ECE, "student")  # auth_as tek istemcinin çerezini değiştiriyor
    assert ece.post(f"/analytics/nudges/{nudges[0]['id']}/seen").status_code == 200
    assert ece.get("/analytics/nudges", params={"course_id": COURSE, "task_key": TASK_KEY}).json()["nudges"] == []


def test_tahtaya_alinan_cozum_isimsizdir(auth_as, seeded):
    events(auth_as(ECE, "student"), fail(1))
    teacher = auth_as(TEACHER, "teacher")
    board = teacher.post(f"{BASE}/board", json={"task_key": TASK_KEY, "student_id": ECE}).json()
    assert board["code"] == "for i in range(5): print(i)"
    assert board["failed"] == ["Çıktı 1..5 olmalı"]
    assert "Ece" not in str(board)
    assert auth_as(OTHER_TEACHER, "teacher").post(f"{BASE}/board", json={"task_key": TASK_KEY, "student_id": ECE}).status_code == 404
    assert teacher.post(f"{BASE}/board", json={"task_key": TASK_KEY, "student_id": CAN}).status_code == 404


def test_mudahale_oncesi_sonrasi_karsilastirilir(auth_as, seeded):
    ece = auth_as(ECE, "student")
    events(ece, fail(1), fail(2), fail(3))
    teacher = auth_as(TEACHER, "teacher")
    created = teacher.post(f"{BASE}/actions", json={
        "kind": "reteach", "title": "for döngüsünü tahtada tekrar anlattım", "concept_id": "for_dongusu"})
    assert created.status_code == 200, created.text
    action = teacher.get(f"{BASE}/actions").json()["actions"][0]
    assert action["concept"] and action["verdict"] == "veri_bekleniyor"
    before = action["before"]

    events(auth_as(ECE, "student"),
           {"type": "check", "task_key": TASK_KEY, "outcome": "pass", "attempt": 4, "client": "lab",
            "code": "for i in range(1, 6): print(i)", "checks": []},
           {"type": "check", "task_key": TASK_KEY, "outcome": "pass", "attempt": 5, "client": "lab",
            "code": "for i in range(1, 6): print(i)", "checks": []},
           {"type": "hint_opened", "task_key": TASK_KEY})  # ipucu kanıt sayılmaz
    action = auth_as(TEACHER, "teacher").get(f"{BASE}/actions").json()["actions"][0]
    assert action["new_evidence"] == 2
    assert action["after"]["avg_score"] >= (before["avg_score"] or 0)
    assert action["verdict"] in ("iyilesti", "degismedi")
    assert teacher.post(f"{BASE}/actions", json={"title": "x", "concept_id": "uydurma_kavram"}).status_code == 400


def test_ogretmen_degerlendirmesi_durumu_duzeltir(auth_as, seeded):
    events(auth_as(ECE, "student"), fail(1), fail(2), fail(3))
    teacher = auth_as(TEACHER, "teacher")
    url = f"{BASE}/students/{ECE}/concepts/for_dongusu/assess"
    assert teacher.post(url, json={"status": "belki"}).status_code == 400
    resp = teacher.post(url, json={"status": "hakim", "note": "Sözlü sordum, biliyor."})
    assert resp.status_code == 200 and resp.json()["status"] == "hakim"
    cell = teacher.get(f"{BASE}/concepts").json()
    ece_row = next(s for s in cell["students"] if s["student_id"] == ECE)
    assert ece_row["cells"]["for_dongusu"]["status"] == "hakim"
    evidence = teacher.get(f"{BASE}/students/{ECE}/concepts/for_dongusu").json()["evidence"]
    assert evidence[0]["type"] == "teacher_assessment" and evidence[0]["note"] == "Sözlü sordum, biliyor."
    assert auth_as(OTHER_TEACHER, "teacher").post(url, json={"status": "hakim"}).status_code == 404


def test_kod_kokeni_karari_isareti_listeden_dusurur(auth_as, seeded):
    paste_solution(auth_as(ECE, "student"))
    teacher = auth_as(TEACHER, "teacher")
    overview = teacher.get(f"{BASE}/overview").json()
    assert [i["student_id"] for i in overview["integrity"]] == [ECE]
    url = f"{BASE}/students/{ECE}/code/{TASK_KEY}/review"
    assert teacher.put(url, json={"verdict": "accepted", "note": "Hazır fonksiyonu ben verdim."}).status_code == 200
    overview = teacher.get(f"{BASE}/overview").json()
    assert overview["integrity"] == [] and overview["integrity_accepted"] == 1
    rows = teacher.get(f"{BASE}/students").json()["students"]
    assert next(r for r in rows if r["student_id"] == ECE)["code_flags"] == 0
    detail = teacher.get(f"{BASE}/tasks/{TASK_KEY}").json()
    assert detail["students"][0]["review"]["verdict"] == "accepted"
    # Karar geri alınınca işaret geri gelir.
    assert teacher.put(url, json={"verdict": "clear"}).status_code == 200
    assert len(teacher.get(f"{BASE}/overview").json()["integrity"]) == 1


def test_ogretmen_notlari_yalnizca_ogretmende(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    url = f"{BASE}/students/{ECE}/notes"
    created = teacher.post(url, json={"text": "Annesiyle görüştüm, evde bilgisayar yok."})
    assert created.status_code == 200
    assert [n["text"] for n in teacher.get(url).json()["notes"]] == ["Annesiyle görüştüm, evde bilgisayar yok."]
    assert auth_as(OTHER_TEACHER, "teacher").get(url).status_code == 404
    assert auth_as(ECE, "student").get(url).status_code == 403
    note_id = created.json()["note"]["id"]
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.delete(f"{url}/{note_id}").status_code == 200
    assert teacher.get(url).json()["notes"] == []


# --- Adım 4: ödev — son tarih, geçmiş, puanlama anahtarı, XP -----------------------------

HW = f"/courses/{COURSE}/homework/{HOMEWORK_KEY}"


def submit_hw(client, text="for i in range(1, 11): print(5 * i)"):
    return client.post(f"{HW}/submit", files={"file": ("cevap.py", text.encode(), "text/x-python")})


def set_homework_due(db_query, due: str, allow_late: bool):
    rows = db_query("SELECT slides FROM lesson_contents WHERE course_id=%s AND node_id=%s", (COURSE, NODE_B))
    slides_json = rows[0][0]
    slides_json = slides_json if isinstance(slides_json, list) else json.loads(slides_json)
    slides_json[0]["homeworkConfig"].update(dueDate=due, allowLate=allow_late)
    db_query("UPDATE lesson_contents SET slides=%s WHERE course_id=%s AND node_id=%s",
             (json.dumps(slides_json), COURSE, NODE_B), fetch=False)
    import learning_store
    learning_store._CONTEXT_CACHE.pop(COURSE, None)


def grade(client, sub_id, **body):
    return client.put(f"/courses/{COURSE}/homework/submissions/{sub_id}/grade", json=body)


def my_submission(client):
    return client.get(f"{HW}/submission").json()


def test_son_tarih_gec_teslim_ve_kural(auth_as, seeded, db_query):
    ece = auth_as(ECE, "student")
    info = my_submission(ece)
    assert info["submitted"] is False and info["due_at"].endswith("Z") and info["rubric"]["criteria"]
    assert submit_hw(ece).json()["late"] is False

    set_homework_due(db_query, "2020-01-01T10:00", allow_late=False)
    resp = submit_hw(auth_as(CAN, "student"))
    assert resp.status_code == 403 and "Son teslim" in resp.json()["detail"]

    set_homework_due(db_query, "2020-01-01T10:00", allow_late=True)
    assert submit_hw(auth_as(CAN, "student")).json()["late"] is True
    listing = auth_as(TEACHER, "teacher").get(f"/courses/{COURSE}/homework/all-submissions").json()
    late = {s["student_name"]: s["late"] for s in listing["submissions"]}
    assert late == {"Ece Test": True, "Can Test": True}   # son tarih geriye alındı: ikisi de geç
    assert listing["tasks"][HOMEWORK_KEY]["rubric"]["criteria"][0]["id"] == "dogruluk"
    hw = auth_as(TEACHER, "teacher").get(f"/analytics/courses/{COURSE}/homework").json()["homeworks"][0]
    assert hw["late"] == 2 and hw["overdue"] is True


def test_puanlama_anahtariyla_not_ve_yeniden_teslim_gecmisi(auth_as, seeded):
    submit_hw(auth_as(ECE, "student"), "print('ilk')")
    teacher = auth_as(TEACHER, "teacher")
    sub_id = teacher.get(f"/courses/{COURSE}/homework/all-submissions").json()["submissions"][0]["id"]

    # Eksik ölçüt: not hesaplanmaz, geri bildirim de yoksa reddedilir.
    assert grade(teacher, sub_id, rubric_scores={"dogruluk": 1}).status_code == 400
    # Doğruluk "Yeterli" (3/4), okunabilirlik "İyi" (2/2) → 5/6 → 83.
    saved = grade(teacher, sub_id, rubric_scores={"dogruluk": 2, "okunabilirlik": 1, "uydurma": 0}, feedback="Güzel")
    assert saved.status_code == 200, saved.text
    assert saved.json()["submission"]["grade"] == 83
    assert saved.json()["submission"]["rubric_scores"] == {"dogruluk": 2, "okunabilirlik": 1}

    # Öğrenci yeniden teslim edince eski not geçmişte kalır, yeni cevap değerlendirilmemiş başlar.
    ece = auth_as(ECE, "student")
    submit_hw(ece, "print('düzeltilmiş')")
    mine = my_submission(ece)
    assert mine["submission"]["grade"] is None
    assert [(h["version"], h["grade"], h["feedback"]) for h in mine["history"]] == [(1, 83, "Güzel")]
    versions = auth_as(TEACHER, "teacher").get(f"/courses/{COURSE}/homework/submissions/{sub_id}/versions").json()["versions"]
    assert versions[0]["grade"] == 83 and versions[0]["reason"] == "resubmitted"
    assert versions[0]["rubric_scores"] == {"dogruluk": 2, "okunabilirlik": 1}
    assert auth_as(OTHER_TEACHER, "teacher").get(f"/courses/{COURSE}/homework/submissions/{sub_id}/versions").status_code == 404

    # Teslimi silmek notu yok etmez: geçmişe "geri çekildi" olarak yazılır.
    assert auth_as(ECE, "student").delete(f"{HW}/delete").status_code == 200
    mine = my_submission(auth_as(ECE, "student"))
    assert mine["submitted"] is False and [h["reason"] for h in mine["history"]] == ["withdrawn", "resubmitted"]


def test_gorev_xp_si_bir_kez_verilir(auth_as, seeded, db_query):
    ece = auth_as(ECE, "student")
    passing = {"type": "check", "task_key": TASK_KEY, "outcome": "pass", "attempt": 1, "client": "lab",
               "code": "for i in range(1, 6): print(i)", "checks": []}
    events(ece, passing)
    assert db_query("SELECT xp FROM students WHERE id=%s", (ECE,)) == [(40,)]
    events(ece, {**passing, "attempt": 2})                 # tekrar çözmek XP vermez
    submit_hw(ece)
    submit_hw(ece)                                         # yeniden teslim XP vermez
    assert db_query("SELECT xp FROM students WHERE id=%s", (ECE,)) == [(70,)]


def test_puanlama_anahtari_kutuphanesi(auth_as, seeded):
    teacher = auth_as(TEACHER, "teacher")
    bad = teacher.post("/rubrics", json={"title": "Eksik", "criteria": [
        {"id": "a", "title": "Tek seviye", "levels": [{"label": "Var", "points": 1}]}]})
    assert bad.status_code == 400
    ok = teacher.post("/rubrics", json={"title": "Kod projesi", "criteria": RUBRIC["criteria"]})
    assert ok.status_code == 200, ok.text
    assert [r["title"] for r in teacher.get("/rubrics").json()["rubrics"]] == ["Kod projesi"]
    assert auth_as(OTHER_TEACHER, "teacher").get("/rubrics").json()["rubrics"] == []
    teacher = auth_as(TEACHER, "teacher")
    assert teacher.delete(f"/rubrics/{ok.json()['rubric']['id']}").status_code == 200
    assert teacher.get("/rubrics").json()["rubrics"] == []


def test_yz_degerlendirmesi_odevin_kendisini_ve_anahtari_kullanir(auth_as, seeded, monkeypatch):
    from types import SimpleNamespace
    import routers.ai as ai_router
    seen = {}

    def generate_content(**kwargs):
        seen["prompt"] = kwargs["contents"][0].parts[0].text
        payload = {"overallScore": 12, "summary": "İyi", "weaknesses": [],
                   "rubricScores": [{"criterionId": "dogruluk", "level": 3, "reason": "Doğru"},
                                    {"criterionId": "okunabilirlik", "level": 0, "reason": "Adlar belirsiz"},
                                    {"criterionId": "uydurma", "level": 1, "reason": "?"}]}
        return SimpleNamespace(text=json.dumps(payload), usage_metadata=None)

    monkeypatch.setattr(ai_router.genai, "Client",
                        lambda **_k: SimpleNamespace(models=SimpleNamespace(generate_content=generate_content)))
    resp = auth_as(ECE, "student").post("/ai/evaluate-homework", data={
        "question": "Genel değerlendirme yap", "submission_type": "code", "text_answer": "print(5)",
        "course_id": str(COURSE), "node_id": HOMEWORK_KEY,
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "5'in çarpım tablosunu yazdır" in seen["prompt"]       # ödevin gerçek yönergesi
    assert "DERECELİ PUANLAMA ANAHTARI" in seen["prompt"]
    assert body["overallScore"] == 67                              # (4 + 0) / 6 — modelin 12'si değil
    assert {s["criterionId"] for s in body["rubricScores"]} == {"dogruluk", "okunabilirlik"}


# --- Adım 5: şube ve tarih süzgeci, not defteri ----------------------------------------

def test_sube_ve_tarih_suzgeci(auth_as, seeded):
    events(auth_as(ECE, "student"), fail(1), fail(2), fail(3))
    teacher = auth_as(TEACHER, "teacher")
    whole = teacher.get(f"{BASE}/overview").json()
    assert whole["student_count"] == 2 and len(whole["stuck_now"]) == 1
    assert {c["name"] for c in whole["classes"]} == {"A Şubesi", "B Şubesi"}

    b = teacher.get(f"{BASE}/overview", params={"class_id": "c_b"}).json()
    assert b["student_count"] == 1 and b["stuck_now"] == [] and b["hard_tasks"] == []
    assert [s["student"] for s in teacher.get(f"{BASE}/students", params={"class_id": "c_a"}).json()["students"]] == ["Ece Test"]
    assert teacher.get(f"{BASE}/concepts", params={"class_id": "c_b"}).json()["students"][0]["student"] == "Can Test"
    assert teacher.get(f"{BASE}/overview", params={"class_id": "yok"}).status_code == 404

    # Yarından sonrası: henüz etkinlik yok.
    tomorrow = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%d")
    later = teacher.get(f"{BASE}/tasks", params={"since": tomorrow}).json()["tasks"]
    assert all(t["started"] == 0 for t in later)
    detail = teacher.get(f"{BASE}/tasks/{TASK_KEY}", params={"since": tomorrow}).json()
    assert detail["students"] == [] and detail["top_failures"] == []
    assert teacher.get(f"{BASE}/tasks", params={"since": "dün"}).status_code == 400


def test_not_defteri_bilesenler_ve_agirliklar(auth_as, seeded):
    ece = auth_as(ECE, "student")
    events(ece, {"type": "check", "task_key": TASK_KEY, "outcome": "pass", "attempt": 1, "client": "lab",
                 "code": "for i in range(1, 6): print(i)", "checks": []})
    submit_hw(ece)
    teacher = auth_as(TEACHER, "teacher")
    sub_id = teacher.get(f"/courses/{COURSE}/homework/all-submissions").json()["submissions"][0]["id"]
    grade(teacher, sub_id, rubric_scores={"dogruluk": 2, "okunabilirlik": 1})   # 83

    book = teacher.get(f"{BASE}/gradebook").json()
    assert book["weights"]["homework"] == 40 and book["missing_as_zero"] is True
    rows = {r["student"]: r for r in book["students"]}
    ece_row, can_row = rows["Ece Test"], rows["Can Test"]
    assert ece_row["components"]["homework"] == 83 and ece_row["components"]["tasks"] == 100
    assert ece_row["homework"][HOMEWORK_KEY] == {"grade": 83, "status": "graded"}
    assert ece_row["total"] == round((40 * 83 + 25 * 100) / 65, 1)   # quiz/proje verisi yok: ortalamaya girmez
    # Can hiçbir görevi yapmadı: görev bileşeni 0 (veri var, sonuç sıfır); ödev henüz açık, sayılmaz.
    assert can_row["components"]["tasks"] == 0 and can_row["components"]["homework"] is None
    assert can_row["total"] == 0 and can_row["homework"][HOMEWORK_KEY]["status"] == "open"
    assert ece_row["class_name"] == "A Şubesi"

    # Ağırlıklar değişince öneri de değişir; geçersiz ağırlık reddedilir.
    assert teacher.put(f"{BASE}/gradebook/settings", json={"weights": {"homework": 0, "tasks": 0}}).status_code == 400
    saved = teacher.put(f"{BASE}/gradebook/settings", json={"weights": {"homework": 100, "tasks": 0}, "missing_as_zero": False})
    assert saved.status_code == 200
    book = teacher.get(f"{BASE}/gradebook", params={"class_id": "c_a"}).json()
    assert [r["student"] for r in book["students"]] == ["Ece Test"]
    assert book["students"][0]["total"] == 83 and book["missing_as_zero"] is False
    assert auth_as(OTHER_TEACHER, "teacher").get(f"{BASE}/gradebook").status_code == 404


# --- Adım 6: veli raporu, veli portalı, yazım kaydı izni, öğrenci görünümü, kopyalama ---

def test_veli_raporu_taslak_duzenle_gonder(auth_as, seeded):
    events(auth_as(ECE, "student"),
           {"type": "check", "task_key": TASK_KEY, "outcome": "pass", "attempt": 1, "client": "lab",
            "code": "for i in range(1, 6): print(i)", "checks": []},
           {"type": "module_completed", "node_id": NODE_A})
    teacher = auth_as(TEACHER, "teacher")
    url = f"{BASE}/students/{ECE}/parent-reports"
    draft = teacher.post(url, json={"days": 7, "use_ai": False, "teacher_note": "Derse katılımı çok iyi."})
    assert draft.status_code == 200, draft.text
    report = draft.json()["report"]
    assert report["status"] == "draft" and report["ai_generated"] is False
    assert report["facts"]["active_days"] == 1 and report["facts"]["tasks_solved"] == ["Sayaç"]
    assert "Ece" in report["content"]["summary"] and report["content"]["teacher_note"] == "Derse katılımı çok iyi."
    # Veli taslağı GÖRMEZ.
    assert auth_as(PARENT, "parent").get(f"/parent/students/{ECE}/reports").json()["reports"] == []

    teacher = auth_as(TEACHER, "teacher")
    edited = teacher.put(f"/analytics/parent-reports/{report['id']}",
                         json={"content": {**report["content"], "summary": "Ece bu hafta harika çalıştı."}})
    assert edited.status_code == 200
    assert teacher.post(f"/analytics/parent-reports/{report['id']}/send").json()["report"]["status"] == "sent"
    assert teacher.put(f"/analytics/parent-reports/{report['id']}", json={"content": {"summary": "x"}}).status_code == 409

    parent = auth_as(PARENT, "parent")
    seen = parent.get(f"/parent/students/{ECE}/reports").json()["reports"]
    assert [r["content"]["summary"] for r in seen] == ["Ece bu hafta harika çalıştı."]
    assert "tasks_in_progress" not in seen[0]["facts"]          # veliye yalnızca sade özet sayılar
    assert auth_as(OTHER_PARENT, "parent").get(f"/parent/students/{ECE}/reports").status_code == 404

    # Velisi olmayan öğrencinin raporu gönderilemez.
    teacher = auth_as(TEACHER, "teacher")
    can_draft = teacher.post(f"{BASE}/students/{CAN}/parent-reports", json={"use_ai": False}).json()["report"]
    assert teacher.post(f"/analytics/parent-reports/{can_draft['id']}/send").status_code == 409
    assert auth_as(OTHER_TEACHER, "teacher").get(url).status_code == 404


def test_veli_raporu_yz_taslagi(auth_as, seeded, monkeypatch):
    from types import SimpleNamespace
    import learning_insights
    payload = {"summary": "Ece döngüleri öğrenmeye başladı.", "learned": ["Sayaç görevini çözdü"],
               "focus": ["range kullanımı"], "homework": "Ödevi henüz teslim etmedi."}
    monkeypatch.setattr(learning_insights.genai, "Client", lambda **_k: SimpleNamespace(models=SimpleNamespace(
        generate_content=lambda **_kw: SimpleNamespace(text=json.dumps(payload, ensure_ascii=False), usage_metadata=None))))
    report = auth_as(TEACHER, "teacher").post(f"{BASE}/students/{ECE}/parent-reports", json={"days": 14}).json()["report"]
    assert report["ai_generated"] is True and report["content"]["focus"] == ["range kullanımı"]


def test_veli_portali_gercek_veri(auth_as, seeded):
    events(auth_as(ECE, "student"), {"type": "module_completed", "node_id": NODE_A})
    submit_hw(auth_as(ECE, "student"))
    overview = auth_as(PARENT, "parent").get(f"/parent/students/{ECE}/overview")
    assert overview.status_code == 200, overview.text
    data = overview.json()
    course = data["courses"][0]
    assert course["title"] == "Python Atölyesi" and course["teacher"] == "Selin Hoca"
    assert course["progress"] == 50 and course["active_days_14"] == 1
    assert course["homework"][0]["title"] == "Çarpım Tablosu" and course["homework"][0]["submitted"] is True
    assert auth_as(TEACHER, "teacher").get(f"/parent/students/{ECE}/overview").status_code == 403
    assert auth_as(OTHER_PARENT, "parent").get(f"/parent/students/{ECE}/overview").status_code == 404


def test_veli_yazim_kaydini_kapatinca_kayit_saklanmaz(auth_as, seeded, db_query):
    parent = auth_as(PARENT, "parent")
    notice = parent.get(f"/parent/students/{ECE}/consent").json()
    assert notice["status"] is None and notice["notice"]["paragraphs"]
    assert parent.put(f"/parent/students/{ECE}/consent", json={"status": "denied"}).status_code == 200
    assert auth_as(OTHER_PARENT, "parent").put(f"/parent/students/{ECE}/consent", json={"status": "granted"}).status_code == 404

    body = {"course_id": COURSE, "task_key": TASK_KEY, "client": "browser", "chunks": [{
        "file": "gorev.py", "session": "s1", "seq": 0, "started_at_ms": 1_000, "base_text": STARTER,
        "ops": [[0, len(STARTER), 0, "x = 1\n", "t"]]}]}
    assert auth_as(ECE, "student").post("/analytics/edits", json=body).json() == {"applied": 0, "recording": False}
    assert db_query("SELECT count(*) FROM code_edit_chunks WHERE course_id=%s", (COURSE,)) == [(0,)]
    assert auth_as(TEACHER, "teacher").get(f"{BASE}/students/{ECE}").json()["recording"] == "denied"

    auth_as(PARENT, "parent").put(f"/parent/students/{ECE}/consent", json={"status": "granted"})
    assert auth_as(ECE, "student").post("/analytics/edits", json=body).json() == {"applied": 1}


def test_ogrenci_kendi_kazanimlarini_gorur(auth_as, seeded):
    events(auth_as(ECE, "student"), fail(1), fail(2), fail(3))
    mine = auth_as(ECE, "student").get(f"/analytics/me/courses/{COURSE}/concepts")
    assert mine.status_code == 200, mine.text
    data = mine.json()
    labels = {c["concept_id"]: c for c in data["concepts"]}
    assert "for_dongusu" in labels and labels["for_dongusu"]["status_label"]
    assert all("misconception" not in c for c in data["concepts"])
    assert auth_as(OUTSIDER, "student").get(f"/analytics/me/courses/{COURSE}/concepts").status_code == 403


def test_kurs_ve_modul_kopyalama(auth_as, seeded, db_query):
    teacher = auth_as(TEACHER, "teacher")
    dup = teacher.post(f"/courses/{COURSE}/duplicate", json={"title": "Python Atölyesi — 2. dönem"})
    assert dup.status_code == 200, dup.text
    new_id = dup.json()["id"]
    assert dup.json()["students_count"] == 0 and dup.json()["classes"] == []
    assert db_query("SELECT count(*) FROM lesson_contents WHERE course_id=%s", (new_id,)) == [(2,)]
    assert db_query("SELECT count(*) FROM enrollments WHERE course_id=%s", (new_id,)) == [(0,)]
    assert auth_as(OTHER_TEACHER, "teacher").post(f"/courses/{COURSE}/duplicate", json={}).status_code == 404

    # Aynı modül hedefte zaten var: yeni kimlik alır, slaytlar yeni kimlikle kopyalanır.
    teacher = auth_as(TEACHER, "teacher")
    copied = teacher.post(f"/courses/{COURSE}/copy-modules", json={"target_course_id": new_id, "node_ids": [NODE_A]})
    assert copied.status_code == 200, copied.text
    new_node = copied.json()["copied"][0]["to"]
    assert new_node != NODE_A
    slide_ids = db_query("SELECT slides FROM lesson_contents WHERE course_id=%s AND node_id=%s", (new_id, new_node))[0][0]
    assert slide_ids[0]["id"] != TASK_SLIDE
    assert auth_as(OTHER_TEACHER, "teacher").post(
        f"/courses/{COURSE}/copy-modules", json={"target_course_id": new_id, "node_ids": [NODE_A]}).status_code == 404

    # Yol haritası dışa aktarma artık çalışıyor (eskiden her çağrıda 500).
    exported = auth_as(TEACHER, "teacher").get(f"/courses/{COURSE}/export_roadmap")
    assert exported.status_code == 200 and len(exported.json()["lesson_contents"]) == 2


def test_veli_ozeti_ve_kazanim_gorunumu(auth_as, seeded):
    events(auth_as(ECE, "student"), fail(1), fail(2), fail(3))
    parent = auth_as(PARENT, "parent")
    summary = parent.get("/parent/summary").json()["children"]
    assert [c["name"] for c in summary] == ["Ece Test"]
    assert summary[0]["active_days_14"] == 1 and summary[0]["homework_due_soon"][0]["title"] == "Çarpım Tablosu"
    concepts = parent.get(f"/parent/students/{ECE}/concepts").json()["courses"][0]
    assert concepts["course"] == "Python Atölyesi" and concepts["concepts"]
    assert all("misconception" not in c for c in concepts["concepts"])
    assert auth_as(OTHER_PARENT, "parent").get("/parent/summary").json()["children"] == []
    assert auth_as(ECE, "student").get("/parent/summary").status_code == 403
