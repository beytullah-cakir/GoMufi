"""POST /ai/evaluate-homework yetkilendirmesi.

Bu uç, Gemini anahtarını tarayıcı bundle'ına gömen homeworkAIService.ts'in yerini
aldı. Anahtar artık sunucuda; dolayısıyla ucun kötüye kullanıma karşı korunması şart.

Gemini'ye gerçek çağrı yapılmaz: genai.Client patch'lenir ve çağrılırsa test patlar —
böylece tüm redlerin model çağrısından ÖNCE gerçekleştiği kanıtlanır.
"""
import pytest

import routers.ai as ai

pytestmark = pytest.mark.db

# Testler mevcut kurs/kayıt verisine göre çalışır; yoksa atlanır.
DEFAULT_SUBMISSION = {"question": "Soru", "submission_type": "text", "text_answer": "cevap"}


@pytest.fixture
def no_gemini(monkeypatch):
    """Gemini istemcisini çağrılırsa patlayacak şekilde değiştirir."""
    def _boom(*args, **kwargs):
        raise AssertionError("Gemini çağrıldı — yetki kontrolü ÖNCE çalışmalıydı!")

    monkeypatch.setattr(ai.genai, "Client", _boom)


@pytest.fixture
def course_ctx(db_query):
    """Bir kurs + o kursa kayıtlı/kayıtsız öğrenci ve sahibi/sahibi olmayan eğitmen."""
    rows = db_query(
        "SELECT e.course_id, e.student_id, c.teacher_id FROM enrollments e "
        "JOIN courses c ON c.id = e.course_id LIMIT 1"
    )
    if not rows:
        pytest.skip("veritabanında kayıtlı öğrencisi olan bir kurs yok")
    course_id, enrolled_student, owner_teacher = rows[0]

    other_student = db_query(
        "SELECT id FROM students WHERE id NOT IN "
        "(SELECT student_id FROM enrollments WHERE course_id = %s) LIMIT 1", (course_id,)
    )
    other_teacher = db_query(
        "SELECT id FROM teachers WHERE id <> %s LIMIT 1", (owner_teacher,)
    )
    return {
        "course_id": course_id,
        "enrolled_student": enrolled_student,
        "owner_teacher": owner_teacher,
        "other_student": other_student[0][0] if other_student else None,
        "other_teacher": other_teacher[0][0] if other_teacher else None,
    }


def _post(client, **fields):
    data = dict(DEFAULT_SUBMISSION)
    data.update({k: v for k, v in fields.items() if v is not None})
    return client.post("/ai/evaluate-homework", data=data)


def test_kimliksiz_reddedilir(client, no_gemini):
    assert _post(client).status_code == 401


def test_ogrenci_course_id_vermeden_degerlendiremez(auth_as, no_gemini, course_ctx):
    resp = _post(auth_as(course_ctx["enrolled_student"], "student"))
    assert resp.status_code == 400


def test_kayitli_olmadigi_kursu_degerlendiremez(auth_as, no_gemini, course_ctx):
    if course_ctx["other_student"] is None:
        pytest.skip("kursa kayıtlı olmayan bir öğrenci yok")
    resp = _post(auth_as(course_ctx["other_student"], "student"), course_id=course_ctx["course_id"])
    assert resp.status_code == 403


def test_sahibi_olmadigi_kursu_degerlendiremez(auth_as, no_gemini, course_ctx):
    if course_ctx["other_teacher"] is None:
        pytest.skip("başka bir eğitmen yok")
    resp = _post(auth_as(course_ctx["other_teacher"], "teacher"), course_id=course_ctx["course_id"])
    assert resp.status_code == 403


def test_var_olmayan_kurs_404(auth_as, no_gemini, course_ctx):
    resp = _post(auth_as(course_ctx["enrolled_student"], "student"), course_id=999999)
    assert resp.status_code == 404


def test_gecersiz_teslim_turu(auth_as, no_gemini, course_ctx):
    resp = _post(auth_as(course_ctx["enrolled_student"], "student"),
                 course_id=course_ctx["course_id"], submission_type="video")
    assert resp.status_code == 400


def test_bos_cevap_reddedilir(auth_as, no_gemini, course_ctx):
    resp = auth_as(course_ctx["enrolled_student"], "student").post(
        "/ai/evaluate-homework",
        data={"question": "Soru", "submission_type": "text", "text_answer": "   ",
              "course_id": str(course_ctx["course_id"])},
    )
    assert resp.status_code == 400


@pytest.mark.live
def test_canli_degerlendirme_ve_loglama(auth_as, db_query, course_ctx):
    """Gerçek Gemini çağrısı: yanıt şeması + kullanım logu + maliyet tutarlılığı."""
    from core.config import settings
    from core import ai_pricing

    if not settings.MY_API_KEY:
        pytest.skip("MY_API_KEY tanımlı değil")

    marker = "pytest-live-node"
    db_query("DELETE FROM ai_usage_logs WHERE details LIKE %s", (f"%{marker}%",), fetch=False)

    resp = auth_as(course_ctx["enrolled_student"], "student").post(
        "/ai/evaluate-homework",
        data={
            "question": "1'den 5'e kadar sayıları yazdıran bir Python döngüsü yaz.",
            "submission_type": "code",
            "text_answer": "for i in range(1, 5):\n    print(i)",
            "course_id": str(course_ctx["course_id"]),
            "node_id": marker,
        },
    )

    assert resp.status_code == 200, resp.text[:500]
    body = resp.json()
    assert 0 <= body["overallScore"] <= 100
    assert body["summary"].strip()
    assert isinstance(body["weaknesses"], list)

    rows = db_query(
        "SELECT model_name, prompt_tokens, candidates_tokens, thoughts_tokens, cost_usd, course_id "
        "FROM ai_usage_logs WHERE details LIKE %s ORDER BY id DESC LIMIT 1", (f"%{marker}%",)
    )
    assert rows, "kullanım logu yazılmadı"
    model, prompt_tokens, candidates_tokens, thoughts_tokens, cost, logged_course = rows[0]

    assert model == settings.GEMINI_MODEL
    assert prompt_tokens > 0 and candidates_tokens > 0
    assert logged_course == course_ctx["course_id"]
    # Kaydedilen maliyet, panelde gösterilenle AYNI tablodan gelmeli — thinking dahil
    assert cost == pytest.approx(
        round(ai_pricing.cost_usd(model, prompt_tokens, candidates_tokens, thoughts_tokens or 0), 6)
    )

    db_query("DELETE FROM ai_usage_logs WHERE details LIKE %s", (f"%{marker}%",), fetch=False)
