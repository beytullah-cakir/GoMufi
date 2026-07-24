"""AI metriklerinin eğitmen bazlı izolasyonu.

Regresyon: /ai/metrics herhangi bir eğitmene TÜM eğitmenlerin kullanım loglarını
ve maliyetlerini gösteriyordu; DELETE /ai/metrics ise tek bir eğitmenin platformun
tamamındaki log geçmişini silmesine izin veriyordu.
"""
import pytest

# Gerçek eğitmenlerle çakışmayan sentetik ID'ler (teacher_id'de FK yok)
TEACHER_A, TEACHER_B = 999901, 999902

pytestmark = pytest.mark.db


@pytest.fixture
def seeded_logs(db_query):
    """A için 3, B için 2 kayıt oluşturur; test sonunda temizler."""
    db_query("DELETE FROM ai_usage_logs WHERE teacher_id IN (%s, %s)",
             (TEACHER_A, TEACHER_B), fetch=False)
    for teacher_id, count in ((TEACHER_A, 3), (TEACHER_B, 2)):
        for i in range(count):
            db_query(
                "INSERT INTO ai_usage_logs (teacher_id, action, model_name, prompt_tokens,"
                " candidates_tokens, total_tokens, cost_usd) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                (teacher_id, f"test_{teacher_id}_{i}", "gemini-2.5-flash", 10, 5, 15, 0.001),
                fetch=False,
            )
    yield
    db_query("DELETE FROM ai_usage_logs WHERE teacher_id IN (%s, %s)",
             (TEACHER_A, TEACHER_B), fetch=False)


def _count_for(db_query, teacher_id):
    return db_query("SELECT count(*) FROM ai_usage_logs WHERE teacher_id = %s", (teacher_id,))[0][0]


def test_egitmen_yalnizca_kendi_kayitlarini_gorur(auth_as, seeded_logs):
    metrics = auth_as(TEACHER_A, "teacher").get("/ai/metrics").json()["metrics"]

    assert metrics["total_requests"] == 3
    actions = {log["action"] for log in metrics["recent_logs"]}
    assert actions and all(a.startswith(f"test_{TEACHER_A}_") for a in actions)


def test_diger_egitmen_kendi_kayitlarini_gorur(auth_as, seeded_logs):
    metrics = auth_as(TEACHER_B, "teacher").get("/ai/metrics").json()["metrics"]
    assert metrics["total_requests"] == 2


@pytest.mark.parametrize("method", ["get", "delete"])
def test_ogrenci_metriklere_erisemez(auth_as, method):
    client = auth_as(1, "student")
    assert getattr(client, method)("/ai/metrics").status_code == 403


def test_egitmen_silince_digerinin_kayitlari_korunur(auth_as, db_query, seeded_logs):
    resp = auth_as(TEACHER_A, "teacher").delete("/ai/metrics")

    assert resp.status_code == 200
    assert _count_for(db_query, TEACHER_A) == 0
    assert _count_for(db_query, TEACHER_B) == 2, "başka eğitmenin kayıtları silinmemeliydi"
