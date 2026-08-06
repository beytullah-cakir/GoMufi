"""VS Code eklentisi için Bearer token ucu.

Tarayıcı girişleri token'ı bilerek yalnızca `httpOnly` çerezle veriyor; bu uç
tarayıcı dışı istemciler için token'ı gövdede döner ve ÇEREZ BIRAKMAZ.
"""
import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from auth.auth_request import LoginRequest
from routers.device_auth import issue_device_token


class Sonuc:
    def __init__(self, deger):
        self._d = deger

    def scalars(self):
        return SimpleNamespace(first=lambda: self._d)


class SahteDB:
    """Sırayla öğrenci, sonra öğretmen sorgusu yanıtlar."""

    def __init__(self, ogrenci=None, ogretmen=None):
        self._sonuclar = [Sonuc(ogrenci), Sonuc(ogretmen)]

    async def execute(self, *_a, **_k):
        return self._sonuclar.pop(0) if self._sonuclar else Sonuc(None)


# bcrypt hash'i "dogruparola" için üretilmiş olmalı; testte verify_password'ü
# gerçek çalıştırmak yerine bilinen bir hash kullanıyoruz.
from core.security import hash_password  # noqa: E402

PAROLA = "dogruparola"
HASH = hash_password(PAROLA)


def ogrenci(**kw):
    d = dict(id=7, email="ogrenci@test.com", password=HASH,
             first_name="Ada", last_name="Yılmaz")
    d.update(kw)
    return SimpleNamespace(**d)


def ogretmen(**kw):
    d = dict(id=3, email="hoca@test.com", password=HASH,
             first_name="Mehmet", last_name="Demir")
    d.update(kw)
    return SimpleNamespace(**d)


def cagir(email, parola, *, ogr=None, hoca=None):
    return asyncio.run(issue_device_token(
        LoginRequest(email=email, password=parola), db=SahteDB(ogr, hoca)
    ))


# --- başarılı girişler -------------------------------------------------------

def test_ogrenci_token_alir():
    r = cagir("ogrenci@test.com", PAROLA, ogr=ogrenci())
    assert r.role == "student"
    assert r.user_id == "7"
    assert r.access_token
    assert r.display_name == "Ada Yılmaz"


def test_ogretmen_token_alir():
    """Öğrenci bulunamazsa öğretmen tablosuna bakılmalı — eklenti iki rolü de taşıyor."""
    r = cagir("hoca@test.com", PAROLA, hoca=ogretmen())
    assert r.role == "teacher"
    assert r.user_id == "3"


def test_eposta_buyuk_kucuk_harf_duyarsiz():
    r = cagir("OGRENCI@TEST.COM", PAROLA, ogr=ogrenci())
    assert r.role == "student"


def test_soyadi_bos_olabilir():
    r = cagir("ogrenci@test.com", PAROLA, ogr=ogrenci(last_name=None))
    assert r.display_name == "Ada"


def test_token_tipi_bearer():
    r = cagir("ogrenci@test.com", PAROLA, ogr=ogrenci())
    assert r.token_type == "bearer"


def test_gecerlilik_suresi_pozitif():
    r = cagir("ogrenci@test.com", PAROLA, ogr=ogrenci())
    assert r.expires_in > 0


# --- başarısız girişler ------------------------------------------------------

def test_yanlis_parola_reddedilir():
    with pytest.raises(HTTPException) as e:
        cagir("ogrenci@test.com", "yanlis", ogr=ogrenci())
    assert e.value.status_code == 401


def test_olmayan_hesap_reddedilir():
    with pytest.raises(HTTPException) as e:
        cagir("yok@test.com", PAROLA)
    assert e.value.status_code == 401


def test_hesap_varligi_sizdirilmaz():
    """Var olmayan hesap ile yanlış parola AYNI yanıtı vermeli."""
    with pytest.raises(HTTPException) as yok:
        cagir("yok@test.com", PAROLA)
    with pytest.raises(HTTPException) as yanlis:
        cagir("ogrenci@test.com", "yanlis", ogr=ogrenci())
    assert yok.value.status_code == yanlis.value.status_code
    assert yok.value.detail == yanlis.value.detail


def test_token_dogrulanabilir():
    """Üretilen token mevcut çözücüden geçmeli, yoksa diğer uçlar kabul etmez."""
    from core.security import decode_access_token
    r = cagir("ogrenci@test.com", PAROLA, ogr=ogrenci())
    payload = decode_access_token(r.access_token)
    assert payload is not None
    assert str(payload.get("sub")) == "7"
    assert payload.get("role") == "student"
