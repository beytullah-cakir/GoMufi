"""Oturum güvenliği: şifre değişince eski token'lar ölür, kayan oturumun sonu var, kayıt doğrulanır."""
import time
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from core import login_guard
from core.config import settings

pytestmark = pytest.mark.db

STUDENT = 997301


def token(sub=STUDENT, role="student", iat=None, auth_time=None):
    now = int(time.time())
    payload = {"sub": str(sub), "role": role, "type": "access", "iat": iat or now,
               "auth_time": auth_time or now, "exp": datetime.now(timezone.utc) + timedelta(hours=1)}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


@pytest.fixture
def seeded(db_query):
    def cleanup():
        db_query("DELETE FROM session_resets WHERE user_id = %s", (STUDENT,), fetch=False)
        db_query("DELETE FROM students WHERE id = %s", (STUDENT,), fetch=False)
        login_guard.invalidate_resets()
    cleanup()
    db_query("INSERT INTO students (id, first_name, last_name, email) VALUES (%s, 'Ece', 'K', %s)",
             (STUDENT, f"s{STUDENT}@test.local"), fetch=False)
    yield
    cleanup()


def get_profile(client, tok):
    client.cookies.clear()
    return client.get("/profile", headers={"Authorization": f"Bearer {tok}"})


def test_oturum_sifirlaninca_eski_token_gecersiz(client, seeded, db_query):
    now = int(time.time())
    old = token(iat=now - 60)
    assert get_profile(client, old).status_code == 200
    db_query("INSERT INTO session_resets (role, user_id, after) VALUES ('student', %s, %s)",
             (STUDENT, datetime.utcnow().replace(microsecond=0) - timedelta(seconds=5)), fetch=False)
    login_guard.invalidate_resets()
    assert get_profile(client, old).status_code == 401
    assert get_profile(client, token(iat=now)).status_code == 200          # sonra alınan token geçerli


def test_kayan_oturumun_sonu_var(client, seeded):
    fresh = token(auth_time=int(time.time()) - 3600)
    r = client.post("/auth/device-renew", headers={"Authorization": f"Bearer {fresh}"})
    assert r.status_code == 200
    renewed = jwt.decode(r.json()["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    # Tazelenen token gerçek giriş anını KORUR (yeni bir başlangıç yazmaz).
    assert abs(renewed["auth_time"] - (int(time.time()) - 3600)) <= 2

    stale = token(auth_time=int(time.time()) - 31 * 86400)
    assert client.post("/auth/device-renew", headers={"Authorization": f"Bearer {stale}"}).status_code == 401


def test_kayit_dogrulamasi(client):
    base = {"first_name": "Ece", "last_name": "K", "nickname": "ece", "grade_level": "9", "education_level": "lise"}
    short = client.post("/student/register", json={**base, "email": "yeni997@test.local", "password": "123"})
    assert short.status_code == 422
    bad = client.post("/student/register", json={**base, "email": "eposta-degil", "password": "uzun-sifre-1"})
    assert bad.status_code == 422
    html = client.post("/student/register", json={**base, "first_name": "<img src=x>", "email": "yeni998@test.local",
                                                   "password": "uzun-sifre-1"})
    assert html.status_code == 422
