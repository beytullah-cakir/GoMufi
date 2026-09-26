"""
Kurumlar ve paketler: kredi hesabı, sınırlar, davet akışı, kurum yöneticisi ekranı.
"""
import json

import pytest

from core import mailer
from core.config import settings

pytestmark = pytest.mark.db

ADMIN_EMAIL = "yonetici-org@test.local"
MUDUR, HOCA, YENI, BASKA = 999801, 999802, 999803, 999804
OGR = 999811
COURSE_H, COURSE_M = 999831, 999832
T_IDS = (MUDUR, HOCA, YENI, BASKA)


@pytest.fixture
def seeded(db_query, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_EMAIL", ADMIN_EMAIL)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "cok-guclu-yonetici-parolasi")
    mailer.outbox.clear()

    def cleanup():
        db_query("DELETE FROM ai_usage_logs WHERE teacher_id IN %s OR course_id IN %s",
                 (T_IDS, (COURSE_H, COURSE_M)), fetch=False)
        db_query("DELETE FROM subscriptions WHERE (owner_type = 'teacher' AND owner_id IN %s) OR "
                 "(owner_type = 'organization' AND owner_id IN (SELECT id FROM organizations WHERE name LIKE 'Test Kurum%%'))",
                 (T_IDS,), fetch=False)
        db_query("DELETE FROM organizations WHERE name LIKE 'Test Kurum%%'", fetch=False)
        db_query("DELETE FROM lesson_contents WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN %s)", (T_IDS,), fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE teacher_id IN %s)", (T_IDS,), fetch=False)
        db_query("DELETE FROM courses WHERE teacher_id IN %s", (T_IDS,), fetch=False)
        db_query("DELETE FROM students WHERE id = %s OR email = %s OR email LIKE 'org-kap-%%'", (OGR, ADMIN_EMAIL), fetch=False)
        db_query("DELETE FROM teachers WHERE id IN %s", (T_IDS,), fetch=False)

    cleanup()
    for tid, name in ((MUDUR, "Müdür"), (HOCA, "Hoca"), (YENI, "Yeni"), (BASKA, "Başka")):
        db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, %s, 'T', %s)",
                 (tid, name, f"org-{tid}@test.local"), fetch=False)
    db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, 'Ece', 'T', 'org-ogr@test.local', 0)",
             (OGR,), fetch=False)
    for cid, tid, code in ((COURSE_H, HOCA, "ORGH01"), (COURSE_M, MUDUR, "ORGM01")):
        classes = [{"id": "c1", "name": "7-A", "student_ids": [OGR] if cid == COURSE_H else [], "code": code, "schedule": []}]
        db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes, progress) "
                 "VALUES (%s, %s, %s, '[]', '[]', %s, 0)", (cid, tid, f"Kurs {cid}", json.dumps(classes)), fetch=False)
    db_query("INSERT INTO lesson_contents (course_id, node_id, title, slides) VALUES (%s, 'm1', 'Giriş', '[]')", (COURSE_H,), fetch=False)
    db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (OGR, COURSE_H), fetch=False)
    db_query("INSERT INTO concept_mastery (course_id, student_id, concept_id, score, evidence_weight, successes, failures, last_misconception) "
             "VALUES (%s, %s, 'tip_donusumu', 0.2, 5, 1, 4, 'input sayı döndürür sanıyor') ON CONFLICT DO NOTHING", (COURSE_H, OGR), fetch=False)
    yield
    db_query("DELETE FROM concept_mastery WHERE course_id = %s", (COURSE_H,), fetch=False)
    cleanup()


def spend(db_query, usd, teacher_id=None, course_id=None):
    db_query("INSERT INTO ai_usage_logs (teacher_id, course_id, action, model_name, cost_usd) VALUES (%s, %s, 'test', 'gemini-2.5-flash', %s)",
             (teacher_id, course_id, usd), fetch=False)


def admin(auth_as):
    return auth_as("admin", "admin")


def test_ucretsiz_paket_kredi_ve_ogrenci_kullanimi_sayar(auth_as, seeded, db_query):
    spend(db_query, 1.00, teacher_id=HOCA)            # öğretmenin kendi üretimi
    spend(db_query, 0.25, course_id=COURSE_H)         # kurstaki öğrencinin koç kullanımı
    plan = auth_as(HOCA, "teacher").get("/org/plan").json()
    assert plan["plan"] == "free" and plan["credits"]["used"] == 125 and plan["credits"]["left"] == 375
    assert plan["students"] == {"count": 1, "max": 100}


def test_kredi_bitince_ogretmen_uretimi_durur_ogrenci_durmaz(auth_as, seeded, db_query):
    spend(db_query, 5.00, teacher_id=HOCA)
    r = auth_as(HOCA, "teacher").post("/courses/suggest_lesson_title", json={})
    assert r.status_code == 402 and "kredi" in r.json()["detail"]
    # Öğrenci uçlarında kredi kontrolü yok: 402 değil (doğrulama/diğer hatalar olabilir)
    r = auth_as(OGR, "student").post("/ai/challenge-coach", json={})
    assert r.status_code != 402
    # Pro paketi verilince açılır
    admin(auth_as).post("/admin/subscriptions", json={"owner_type": "teacher", "teacher_email": f"org-{HOCA}@test.local",
                                                      "plan": "pro", "months": 1, "note": "Pilot"})
    plan = auth_as(HOCA, "teacher").get("/org/plan").json()
    assert plan["plan"] == "pro" and plan["credits"]["left"] == 4500 and plan["note"] == "Pilot"


def test_ogrenci_siniri(auth_as, seeded, db_query, monkeypatch):
    from core import plans
    monkeypatch.setitem(plans.PLANS["free"], "max_students", 1)
    db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (999812, 'Yeni', 'Ö', 'org-kap-1@test.local', 0)", fetch=False)
    r = auth_as(999812, "student").post("/class/join", json={"code": "ORGH01"})
    assert r.status_code == 403 and "sınır" in r.json()["detail"]
    # Zaten kayıtlı öğrenci başka şubeye geçebilir (sayı artmaz)
    assert auth_as(OGR, "student").post("/class/join", json={"code": "ORGH01"}).status_code == 200
    db_query("DELETE FROM students WHERE id = 999812", fetch=False)


def test_kurum_akisi(auth_as, seeded, db_query):
    # GoMufi yöneticisi kurumu açar, müdürü davet eder
    r = admin(auth_as).post("/admin/organizations", json={"name": "Test Kurum Lisesi", "kind": "okul", "city": "İzmir",
                                                         "admin_email": f"org-{MUDUR}@test.local"})
    org_id = r.json()["id"]
    assert r.json()["admin_invited"] == f"org-{MUDUR}@test.local"
    assert any("davet" in m.subject for m in mailer.outbox)

    mudur = auth_as(MUDUR, "teacher")
    me = mudur.get("/org/me").json()
    assert me["organization"] is None and me["invites"][0]["organization"]["name"] == "Test Kurum Lisesi"
    assert mudur.post(f"/org/invites/{me['invites'][0]['id']}/accept").json()["role"] == "admin"

    # Müdür öğretmeni e-postadaki bağlantıyla davet eder
    mailer.outbox.clear()
    assert auth_as(MUDUR, "teacher").post("/org/invites", json={"email": f"org-{HOCA}@test.local"}).status_code == 200
    token = mailer.outbox[-1].text.split("token=")[1].split()[0]
    assert auth_as(HOCA, "teacher").post("/org/invites/accept-token", json={"token": token}).json()["joined"]
    assert auth_as(BASKA, "teacher").post("/org/invites/accept-token", json={"token": token}).status_code == 409

    # Kurum paketi: havuz 1000 kredi; Hoca'ya 100 kredi sınırı
    admin(auth_as).post("/admin/subscriptions", json={"owner_type": "organization", "owner_id": org_id, "plan": "kurum",
                                                      "pool_credits": 1000, "months": 12})
    assert auth_as(MUDUR, "teacher").put(f"/org/members/{HOCA}", json={"ai_cap_credits": 100}).status_code == 200
    spend(db_query, 1.50, teacher_id=HOCA)
    plan = auth_as(HOCA, "teacher").get("/org/plan").json()
    assert plan["source"] == "organization" and plan["credits"]["total"] == 1000 and plan["credits"]["left"] == 0
    r = auth_as(HOCA, "teacher").post("/courses/suggest_lesson_title", json={})
    assert r.status_code == 402 and "kurum yöneticinden" in r.json()["detail"].lower()

    # Kurum yöneticisi ekranı: özet sayılar, öğrenci adı yok
    ov = auth_as(MUDUR, "teacher").get("/org/overview").json()
    assert ov["totals"]["teachers"] == 2 and ov["totals"]["students"] == 1
    hoca = next(t for t in ov["teachers"] if t["teacher_id"] == HOCA)
    assert hoca["credits_used"] == 150 and hoca["ai_cap_credits"] == 100 and hoca["courses"] == 1
    cl = auth_as(MUDUR, "teacher").get("/org/classes").json()["courses"]
    kurs = next(c for c in cl if c["course_id"] == COURSE_H)
    assert kurs["struggling_students"] == 1 and kurs["top_misconceptions"][0]["label"] == "input sayı döndürür sanıyor"
    assert "Ece" not in json.dumps(cl)
    assert auth_as(HOCA, "teacher").get("/org/overview").status_code == 403

    # Tek yönetici ayrılamaz; öğretmen çıkarılınca kursunun kopyası kurumda kalır
    assert auth_as(MUDUR, "teacher").post("/org/leave").status_code == 409
    r = auth_as(MUDUR, "teacher").delete(f"/org/members/{HOCA}", params={"copy_to": MUDUR})
    assert r.json() == {"removed": True, "courses_copied": 1}
    assert db_query("SELECT count(*) FROM courses WHERE teacher_id = %s", (HOCA,))[0][0] == 1       # öğretmende kaldı
    copy = db_query("SELECT id, title FROM courses WHERE teacher_id = %s AND title LIKE %s", (MUDUR, "%kursundan%"))
    assert len(copy) == 1
    assert db_query("SELECT count(*) FROM enrollments WHERE course_id = %s", (copy[0][0],))[0][0] == 0   # öğrencisiz
    assert db_query("SELECT count(*) FROM lesson_contents WHERE course_id = %s", (copy[0][0],))[0][0] == 1
    assert auth_as(HOCA, "teacher").get("/org/plan").json()["plan"] == "free"

    listing = admin(auth_as).get("/admin/organizations").json()["organizations"]
    org = next(o for o in listing if o["id"] == org_id)
    assert org["teachers"] == 1 and org["subscription"]["plan"] == "kurum"


def test_veli_raporu_e_postasi_ucretli_pakette(auth_as, seeded):
    from core import plans
    assert plans.PLANS["free"]["parent_report_email"] is False and plans.PLANS["pro"]["parent_report_email"] is True
