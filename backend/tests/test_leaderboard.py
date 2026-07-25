"""Liderlik tablosu (leaderboard) endpoint'i — yetki, scope ve sıralama.

XP kazanma zaten çalışıyordu; bu testler yeni eklenen sıralama/level katmanını korur.
"""
import pytest

from core import gamification

pytestmark = pytest.mark.db


@pytest.fixture
def a_student_id(db_query):
    rows = db_query("SELECT id FROM students ORDER BY id LIMIT 1")
    if not rows:
        pytest.skip("veritabanında öğrenci yok")
    return rows[0][0]


def test_kimliksiz_reddedilir(client):
    assert client.get("/leaderboard").status_code == 401


def test_egitmen_erisemez(auth_as):
    # Liderlik yalnızca öğrenci/admin; öğretmen 403 almalı
    assert auth_as(1, "teacher").get("/leaderboard").status_code == 403


def test_gecersiz_scope_400(auth_as, a_student_id):
    assert auth_as(a_student_id, "student").get("/leaderboard?scope=xyz").status_code == 400


def test_class_scope_course_id_zorunlu(auth_as, a_student_id):
    r = auth_as(a_student_id, "student").get("/leaderboard?scope=class")
    assert r.status_code == 400


def test_kayitli_olmadigi_kursun_siralamasi_403(auth_as, a_student_id):
    r = auth_as(a_student_id, "student").get("/leaderboard?scope=class&course_id=99999999")
    assert r.status_code == 403


def test_global_siralama_yapisi_ve_seviye(auth_as, a_student_id):
    r = auth_as(a_student_id, "student").get("/leaderboard?scope=global&limit=10")
    assert r.status_code == 200
    data = r.json()

    assert data["scope"] == "global"
    assert isinstance(data["entries"], list)
    assert data["me"] is not None and data["me"]["is_me"] is True

    xps = [e["xp"] for e in data["entries"]]
    assert xps == sorted(xps, reverse=True), "XP azalan sırada olmalı"

    for e in data["entries"]:
        # level ve lig, gamification çekirdeğiyle tutarlı olmalı
        assert e["level"] == gamification.level_for_xp(e["xp"])
        assert e["league"]["name"] == gamification.league_for_level(e["level"])["name"]
        # gizlilik: e-posta sızmamalı
        assert "email" not in e
        assert 1 <= e["rank"]


def test_rank_benzersiz_ve_sirali(auth_as, a_student_id):
    r = auth_as(a_student_id, "student").get("/leaderboard?scope=global&limit=50")
    ranks = [e["rank"] for e in r.json()["entries"]]
    assert ranks == list(range(1, len(ranks) + 1))
