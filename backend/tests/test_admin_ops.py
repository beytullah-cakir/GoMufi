"""
Yönetici paneli: genel bakış, kullanıcı arama, askıya alma, işlem kaydı, güvenlik ekranı.
"""
import json

import pytest

from core import login_guard
from core.config import settings

pytestmark = pytest.mark.db

ADMIN_EMAIL = "yonetici-test@test.local"
TEACHER, STUDENT = 999701, 999711
COURSE = 999731


@pytest.fixture
def admin(monkeypatch, auth_as, db_query):
    monkeypatch.setattr(settings, "ADMIN_EMAIL", ADMIN_EMAIL)
    monkeypatch.setattr(settings, "ADMIN_PASSWORD", "cok-guclu-yonetici-parolasi")
    yield lambda: auth_as("admin", "admin")
    db_query("DELETE FROM students WHERE email = %s", (ADMIN_EMAIL,), fetch=False)


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM admin_actions WHERE target LIKE %s OR target LIKE %s",
                 (f"%{TEACHER}%", f"%{STUDENT}%"), fetch=False)
        db_query("DELETE FROM account_suspensions WHERE user_id IN (%s, %s)", (TEACHER, STUDENT), fetch=False)
        db_query("DELETE FROM login_attempts WHERE email LIKE 'adm-%%'", fetch=False)
        db_query("DELETE FROM enrollments WHERE course_id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM courses WHERE id = %s", (COURSE,), fetch=False)
        db_query("DELETE FROM students WHERE id = %s", (STUDENT,), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)
        login_guard.invalidate()

    cleanup()
    db_query("INSERT INTO teachers (id, first_name, last_name, email) VALUES (%s, 'Zeynep', 'Aranır', 'adm-t@test.local')",
             (TEACHER,), fetch=False)
    db_query("INSERT INTO students (id, first_name, last_name, email, xp) VALUES (%s, 'Kerem', 'Aranır', 'adm-s@test.local', 0)",
             (STUDENT,), fetch=False)
    db_query("INSERT INTO courses (id, teacher_id, title, curriculum, notes, classes, progress) VALUES (%s, %s, 'Kurs', %s, '[]', '[]', 0)",
             (COURSE, TEACHER, json.dumps([{"id": "m1", "title": "A", "aiReview": "pending"}])), fetch=False)
    db_query("INSERT INTO enrollments (student_id, course_id) VALUES (%s, %s)", (STUDENT, COURSE), fetch=False)
    yield
    cleanup()


def test_yalnizca_yonetici(auth_as, seeded):
    for path in ("/admin/overview", "/admin/accounts", "/admin/audit", "/admin/security"):
        assert auth_as(TEACHER, "teacher").get(path).status_code == 403


def test_genel_bakis(admin, seeded):
    data = admin().get("/admin/overview").json()
    assert data["users"]["teacher"]["total"] >= 1 and data["users"]["parent"]["total"] >= 0
    assert data["courses"]["modules_pending_review"] >= 1
    assert {"this_month", "last_30d", "top_teachers"} <= set(data["ai"])
    assert "files" in data["storage"] and isinstance(data["warnings"], list)


def test_arama_askiya_alma_ve_islem_kaydi(admin, auth_as, seeded, db_query):
    found = admin().get("/admin/accounts", params={"q": "aranır"}).json()
    by_role = {x["role"]: x for x in found["items"]}
    assert found["total"] == 2 and by_role["student"]["courses"] == 1 and by_role["teacher"]["courses"] == 1

    r = admin().post(f"/admin/users/teacher/{TEACHER}/suspend", json={"reason": "Şikâyet inceleniyor"})
    assert r.status_code == 200
    assert auth_as(TEACHER, "teacher").get("/teacher/content").status_code == 403
    suspended = admin().get("/admin/accounts", params={"status": "suspended", "q": "aranır"}).json()["items"]
    assert [(x["role"], x["suspension_reason"]) for x in suspended] == [("teacher", "Şikâyet inceleniyor")]

    assert admin().delete(f"/admin/users/teacher/{TEACHER}/suspend").status_code == 200
    assert auth_as(TEACHER, "teacher").get("/teacher/content").status_code == 200

    audit = admin().get("/admin/audit").json()["items"]
    mine = [a for a in audit if a["target"] == f"teacher:{TEACHER}"]
    assert [a["summary"] for a in mine[:2]] == ["Hesap yeniden açıldı", "Hesap askıya alındı"]


def test_kursu_olan_ogretmen_onaysiz_silinmez(admin, seeded, db_query):
    r = admin().delete(f"/admin/users/teacher/{TEACHER}")
    assert r.status_code == 409 and r.json()["detail"]["courses"] == [{"id": COURSE, "title": "Kurs"}]
    assert admin().delete(f"/admin/users/teacher/{TEACHER}", params={"with_courses": "true"}).status_code == 200
    assert db_query("SELECT count(*) FROM courses WHERE id = %s", (COURSE,))[0][0] == 0


def test_guvenlik_ekrani_ve_kilit_acma(admin, client, seeded):
    for _ in range(5):
        client.cookies.clear()
        client.post("/student/login", json={"email": "adm-s@test.local", "password": "yanlis"},
                    headers={"X-Forwarded-For": "10.98.0.1"})
    sec = admin().get("/admin/security").json()
    row = next(x for x in sec["failed_by_email"] if x["email"] == "adm-s@test.local")
    assert row["count"] == 5 and row["locked"] is True
    assert admin().delete("/admin/security/lock", params={"email": "adm-s@test.local"}).status_code == 200
    sec = admin().get("/admin/security").json()
    assert all(x["email"] != "adm-s@test.local" for x in sec["failed_by_email"])
