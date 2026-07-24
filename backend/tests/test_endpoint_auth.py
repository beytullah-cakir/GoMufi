"""Quiz ve dosya yükleme uçlarının yetkilendirmesi.

Regresyon: bu uçların hiçbirinde yetki kontrolü yoktu — kimliksiz biri Gemini
kotası yakabiliyor, tüm quiz'leri doğru cevaplarıyla dökebiliyor, istediği kursa
soru enjekte edebiliyor ve sunucuya dosya yükleyebiliyordu.
"""
import pytest

UNAUTHORIZED = (401, 403)


@pytest.mark.parametrize("method,path", [
    ("get", "/quiz/list"),
    ("get", "/quiz/by-node?course_id=1&section_id=a&node_id=1"),
    ("post", "/quiz/generate"),
    ("post", "/quiz/assign"),
    # main_fastapi.py'deki eski yollar da aynı korumayı taşımalı
    ("get", "/quizzes"),
    ("get", "/quiz_by_node?course_id=1&section_id=a&node_id=1"),
    ("post", "/generate_quiz"),
    ("post", "/assign_quiz"),
])
def test_quiz_uclari_kimliksiz_reddedilir(client, method, path):
    resp = client.post(path, json={}) if method == "post" else client.get(path)
    assert resp.status_code in UNAUTHORIZED


@pytest.mark.parametrize("path", ["/builder/upload-chat-file", "/builder/upload-image"])
def test_yukleme_uclari_kimliksiz_reddedilir(client, path):
    resp = client.post(path, files={"file": ("a.png", b"x", "image/png")})
    assert resp.status_code in UNAUTHORIZED


def test_quiz_list_ogrenciye_kapali(auth_as):
    """Tüm quiz'leri doğru cevaplarıyla listeler — sadece admin görmeli."""
    assert auth_as(1, "student").get("/quiz/list").status_code == 403


def test_quiz_generate_ogrenciye_kapali(auth_as):
    assert auth_as(1, "student").post("/quiz/generate", json={"topic": "x"}).status_code == 403


def test_upload_image_ogrenciye_kapali(auth_as):
    """Ders builder görseli yükleme yalnızca eğitmen/admin."""
    resp = auth_as(1, "student").post(
        "/builder/upload-image", files={"file": ("a.png", b"x", "image/png")}
    )
    assert resp.status_code == 403


@pytest.mark.parametrize("filename", ["evil.html", "shell.php", "x.svg", "a.exe"])
def test_tehlikeli_uzantilar_reddedilir(auth_as, filename):
    """Yüklenen dosyalar /static altından sunulduğu için XSS'e açık uzantılar engellenmeli."""
    resp = auth_as(1, "student").post(
        "/builder/upload-chat-file", files={"file": (filename, b"x", "text/plain")}
    )
    assert resp.status_code == 400
