"""
CSRF: oturum çerezi canlıda SameSite=None olduğundan başka bir site çerezli istek
tetikleyebiliyordu. İzinli olmayan kökenden gelen çerezli değiştirici istek reddedilir.
"""
from core.csrf import CSRFMiddleware


def test_yabanci_kokenden_cerezli_post_reddedilir(auth_as):
    client = auth_as(1, "student")
    r = client.post("/auth/logout", headers={"Origin": "https://kotu-site.example"})
    assert r.status_code == 403 and "CSRF" in r.json()["detail"]
    r = client.post("/auth/logout", headers={"Referer": "https://kotu-site.example/sayfa"})
    assert r.status_code == 403


def test_izinli_koken_ve_tarayici_disi_istemci_gecer(auth_as, client):
    c = auth_as(1, "student")
    assert c.post("/auth/logout", headers={"Origin": "https://gomufi.com"}).status_code == 200
    assert c.post("/auth/logout").status_code == 200                      # Origin yok: tarayıcı dışı
    c.cookies.clear()
    # Çerez yoksa (Bearer token / kimliksiz) CSRF söz konusu değil
    assert client.post("/auth/logout", headers={"Origin": "https://kotu-site.example"}).status_code == 200
    # Okuma istekleri etkilenmez
    assert auth_as(1, "student").get("/utils/health", headers={"Origin": "https://kotu-site.example"}).status_code == 200


def test_gelistirme_regex():
    mw = CSRFMiddleware(None, ["https://gomufi.com"], r"http://localhost(:\d+)?")
    assert mw._allowed("http://localhost:5173") and mw._allowed("https://gomufi.com")
    assert not mw._allowed("http://localhost.kotu.example")
