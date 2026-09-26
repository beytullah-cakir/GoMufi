"""
Giriş koruması: kaba kuvvet denemesine sınır, askıya alınmış hesap.
Regresyon: girişte deneme sınırı yoktu — şifre sınırsız denenebiliyordu.
"""
import pytest

from core import login_guard
from core.security import hash_password

pytestmark = pytest.mark.db

STUDENT, TEACHER = 999511, 999501
EMAIL, T_EMAIL = "lg-ogrenci@test.local", "lg-ogretmen@test.local"


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM login_attempts WHERE email IN (%s, %s) OR ip LIKE '10.99.%%'", (EMAIL, T_EMAIL), fetch=False)
        db_query("DELETE FROM account_suspensions WHERE user_id IN (%s, %s)", (STUDENT, TEACHER), fetch=False)
        db_query("DELETE FROM students WHERE id = %s", (STUDENT,), fetch=False)
        db_query("DELETE FROM teachers WHERE id = %s", (TEACHER,), fetch=False)
        login_guard.invalidate()

    cleanup()
    db_query("INSERT INTO students (id, first_name, last_name, email, xp, password) VALUES (%s, 'Ece', 'T', %s, 0, %s)",
             (STUDENT, EMAIL, hash_password("dogru-sifre-123")), fetch=False)
    db_query("INSERT INTO teachers (id, first_name, last_name, email, password) VALUES (%s, 'Selin', 'H', %s, %s)",
             (TEACHER, T_EMAIL, hash_password("dogru-sifre-123")), fetch=False)
    yield
    cleanup()


def login(client, password, email=EMAIL, ip="10.99.0.1", path="/student/login"):
    client.cookies.clear()
    return client.post(path, json={"email": email, "password": password}, headers={"X-Forwarded-For": ip})


def test_bes_hatali_denemeden_sonra_kilit(client, seeded):
    for _ in range(5):
        assert login(client, "yanlis").status_code == 401
    # Doğru şifre bile 15 dakika kabul edilmez; başka IP'den de.
    r = login(client, "dogru-sifre-123", ip="10.99.0.2")
    assert r.status_code == 429 and "15 dakika" in r.json()["detail"]
    # Öğretmen girişi ve eklenti girişi aynı sayacı paylaşır.
    assert login(client, "yanlis", path="/auth/device-token").status_code == 429


def test_basarili_giris_sayaci_sifirlar(client, seeded):
    for _ in range(4):
        login(client, "yanlis")
    assert login(client, "dogru-sifre-123").status_code == 200
    for _ in range(4):
        assert login(client, "yanlis").status_code == 401
    assert login(client, "dogru-sifre-123").status_code == 200


def test_ip_bazli_sinir(client, seeded):
    for i in range(login_guard.MAX_PER_IP):
        login(client, "yanlis", email=f"yok{i}@test.local", ip="10.99.9.9")
    assert login(client, "dogru-sifre-123", ip="10.99.9.9").status_code == 429
    assert login(client, "dogru-sifre-123", ip="10.99.9.8").status_code == 200


def test_askiya_alinan_hesap(client, auth_as, seeded, db_query):
    db_query("INSERT INTO account_suspensions (role, user_id, reason) VALUES ('teacher', %s, 'test')", (TEACHER,), fetch=False)
    login_guard.invalidate()
    r = login(client, "dogru-sifre-123", email=T_EMAIL, path="/teacher/login")
    assert r.status_code == 403 and "askıya" in r.json()["detail"]
    # Önceden alınmış oturum da reddedilir.
    assert auth_as(TEACHER, "teacher").get("/teacher/content").status_code == 403
    assert auth_as(STUDENT, "student").get("/my-content").status_code == 200
