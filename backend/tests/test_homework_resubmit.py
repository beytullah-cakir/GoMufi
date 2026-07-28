"""Yeniden teslim, eski değerlendirmeyi geçersiz kılar.

Öğrenci cevabını güncellediğinde öğretmenin BAŞKA bir cevaba verdiği not
üstünde kalamaz: öğrenci yanlış not görür, öğretmen listesinde de ödev
"değerlendirildi" görünüp yeniden bakılması gerektiği kaçar.
"""
import asyncio
import io
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException, UploadFile

from routers.courses import submit_homework


def yukleme(icerik: bytes = b"print('yeni cevap')", ad: str = "cevap.py") -> UploadFile:
    return UploadFile(filename=ad, file=io.BytesIO(icerik))


class Sonuc:
    def __init__(self, deger):
        self._d = deger

    def scalar_one_or_none(self):
        return self._d


class SahteDB:
    """Sırayla: kayıt (enrollment) sorgusu, sonra mevcut gönderi sorgusu."""

    def __init__(self, kayit, mevcut):
        self._sonuclar = [Sonuc(kayit), Sonuc(mevcut)]
        self.eklenen = None

    async def execute(self, *_a, **_k):
        return self._sonuclar.pop(0)

    def add(self, obj):
        self.eklenen = obj

    async def commit(self):
        pass


def notlu_gonderi():
    return SimpleNamespace(
        id=1, file_name="eski.py", file_data="eski", file_mime="text/x-python",
        student_note=None,
        grade=95, feedback="Mükemmel.", graded_at=datetime(2026, 1, 1),
        graded_by=7, graded_source="teacher",
    )


def teslim_et(mevcut, *, kayit=SimpleNamespace(id=1), rol="student"):
    db = SahteDB(kayit, mevcut)
    asyncio.run(submit_homework(
        course_id=1, node_id="n1", file=yukleme(), student_note=None,
        user={"sub": "5", "role": rol}, db=db,
    ))
    return db


def test_yeniden_teslim_eski_notu_siler():
    g = notlu_gonderi()
    teslim_et(g)
    assert g.grade is None
    assert g.feedback is None
    assert g.graded_at is None
    assert g.graded_by is None
    assert g.graded_source is None


def test_yeniden_teslim_yeni_icerigi_yazar():
    g = notlu_gonderi()
    teslim_et(g)
    assert g.file_name == "cevap.py"
    assert g.file_data  # base64 yazıldı
    assert g.file_data != "eski"


def test_ilk_teslim_yeni_kayit_olusturur():
    db = teslim_et(None)
    assert db.eklenen is not None
    assert db.eklenen.node_id == "n1"
    assert db.eklenen.student_id == 5
    # Yeni kayıt değerlendirilmemiş başlar
    assert getattr(db.eklenen, "grade", None) is None


def test_kayitsiz_ogrenci_teslim_edemez():
    with pytest.raises(HTTPException) as e:
        teslim_et(None, kayit=None)
    assert e.value.status_code == 403


def test_ogretmen_odev_teslim_edemez():
    with pytest.raises(HTTPException) as e:
        teslim_et(None, rol="teacher")
    assert e.value.status_code == 403


def test_buyuk_dosya_reddedilir():
    db = SahteDB(SimpleNamespace(id=1), None)
    with pytest.raises(HTTPException) as e:
        asyncio.run(submit_homework(
            course_id=1, node_id="n1",
            file=yukleme(b"x" * (5 * 1024 * 1024 + 1), "buyuk.zip"),
            student_note=None, user={"sub": "5", "role": "student"}, db=db,
        ))
    assert e.value.status_code == 413
