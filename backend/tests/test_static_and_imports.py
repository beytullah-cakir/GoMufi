"""Yüklenen dosyaların sunulması ve sessiz import hataları.

Regresyon:
- builder.py `{base_url}/static/uploads/...` URL'i döndürüyordu ama StaticFiles
  mount edilmemişti — yüklenen tüm görseller 404 veriyordu.
- courses.py `json.loads` çağırıyordu ama `json` import edilmemişti; try/except
  yuttuğu için ödev listesinde ders başlıkları sessizce kayboluyordu.
"""


def test_static_mount_edilmis(app):
    assert any(getattr(r, "path", "") == "/static" for r in app.routes), \
        "/static mount edilmemiş — yüklenen dosyalar sunulamaz"


def test_olmayan_static_dosya_404(client):
    assert client.get("/static/uploads/boyle-bir-dosya-yok.png").status_code == 404


def test_courses_json_import_edilmis():
    """`json` eksikse NameError try/except içinde yutulur ve hata görünmez."""
    import routers.courses as courses

    assert hasattr(courses, "json"), "courses.py içinde json import edilmemiş"
    assert courses.json.loads('{"a": 1}') == {"a": 1}


def test_uygulama_tum_routerlari_yukluyor(app):
    """Bir router import hatası alırsa yol sayısı sessizce düşer."""
    paths = app.openapi()["paths"]

    assert len(paths) > 60
    for beklenen in ("/ai/evaluate-homework", "/ai/metrics", "/quiz/generate", "/profile"):
        assert beklenen in paths, f"{beklenen} kayıtlı değil"
