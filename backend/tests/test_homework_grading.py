"""Ödev değerlendirme ucu.

Öğretmen gönderilen ödevi görebiliyordu ama değerlendiremiyordu; AI çıktısı
yalnızca ekranda kalıyor, hiçbir yere yazılmıyordu. Bu testler notun kalıcı
olmasını ve yetkisiz erişime kapalı kalmasını korur.
"""
import asyncio
from datetime import datetime
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from routers.courses import GradeHomeworkRequest, grade_homework_submission


class SahteSonuc:
    def __init__(self, deger):
        self._deger = deger

    def scalar_one_or_none(self):
        return self._deger


class SahteDB:
    """Sırayla: kurs sorgusu, sonra gönderi sorgusu."""

    def __init__(self, kurs, gonderi):
        self._sonuclar = [SahteSonuc(kurs), SahteSonuc(gonderi)]
        self.commit_edildi = False

    async def execute(self, *_a, **_k):
        return self._sonuclar.pop(0)

    def add(self, _obj):
        pass

    async def commit(self):
        self.commit_edildi = True

    async def refresh(self, _obj):
        pass


def gonderi(**kw):
    varsayilan = dict(id=7, course_id=1, grade=None, feedback=None,
                      graded_at=None, graded_by=None, graded_source=None)
    varsayilan.update(kw)
    return SimpleNamespace(**varsayilan)


def calistir(payload, *, kurs=SimpleNamespace(id=1), gonderi_obj=None,
             rol="teacher", teacher_id="42"):
    db = SahteDB(kurs, gonderi_obj if gonderi_obj is not None else gonderi())
    sonuc = asyncio.run(grade_homework_submission(
        course_id=1, submission_id=7, payload=payload,
        user={"sub": teacher_id, "role": rol}, db=db,
    ))
    return sonuc, db


# --- yetki --------------------------------------------------------------------

def test_ogrenci_not_veremez():
    with pytest.raises(HTTPException) as e:
        calistir(GradeHomeworkRequest(grade=90), rol="student")
    assert e.value.status_code == 403


def test_baskasinin_kursuna_not_verilemez():
    """Kurs sorgusu teacher_id ile filtreleniyor; eşleşmezse 404."""
    with pytest.raises(HTTPException) as e:
        calistir(GradeHomeworkRequest(grade=90), kurs=None)
    assert e.value.status_code == 404


def test_kursa_ait_olmayan_gonderi_404():
    db = SahteDB(SimpleNamespace(id=1), None)
    with pytest.raises(HTTPException) as e:
        asyncio.run(grade_homework_submission(
            course_id=1, submission_id=7, payload=GradeHomeworkRequest(grade=90),
            user={"sub": "42", "role": "teacher"}, db=db,
        ))
    assert e.value.status_code == 404


# --- doğrulama ----------------------------------------------------------------

def test_not_araligi_zorlanir():
    for gecersiz in (-1, 101, 999):
        with pytest.raises(HTTPException) as e:
            calistir(GradeHomeworkRequest(grade=gecersiz))
        assert e.value.status_code == 400


def test_sinir_degerler_gecerli():
    for gecerli in (0, 100):
        sonuc, _ = calistir(GradeHomeworkRequest(grade=gecerli))
        assert sonuc["submission"]["grade"] == gecerli


def test_bos_degerlendirme_reddedilir():
    """Ne not ne geri bildirim varsa bu bir değerlendirme değildir."""
    with pytest.raises(HTTPException) as e:
        calistir(GradeHomeworkRequest(grade=None, feedback="   "))
    assert e.value.status_code == 400


def test_yalniz_geri_bildirim_gecerlidir():
    """Her ödev puanlanmak zorunda değil; yazılı yorum tek başına yeterli."""
    sonuc, _ = calistir(GradeHomeworkRequest(grade=None, feedback="Değişken adları güzel."))
    assert sonuc["submission"]["grade"] is None
    assert sonuc["submission"]["feedback"] == "Değişken adları güzel."


def test_sifir_puan_degerlendirme_sayilir():
    """0 geçerli bir nottur; 'değerlendirilmedi' ile karıştırılmamalı."""
    sonuc, _ = calistir(GradeHomeworkRequest(grade=0))
    assert sonuc["submission"]["grade"] == 0
    assert sonuc["submission"]["graded_at"] is not None


# --- kayıt --------------------------------------------------------------------

def test_degerlendirme_kaydedilir():
    sonuc, db = calistir(GradeHomeworkRequest(grade=85, feedback="Döngü doğru."))
    assert db.commit_edildi
    assert sonuc["success"] is True
    assert sonuc["submission"]["grade"] == 85


def test_degerlendiren_ogretmen_yazilir():
    g = gonderi()
    calistir(GradeHomeworkRequest(grade=70), gonderi_obj=g, teacher_id="42")
    assert g.graded_by == 42
    assert isinstance(g.graded_at, datetime)


def test_gecersiz_kaynak_teacher_a_duser():
    """source dışarıdan geliyor; beklenmeyen değer sessizce kabul edilmemeli."""
    g = gonderi()
    calistir(GradeHomeworkRequest(grade=70, source="sihirbaz"), gonderi_obj=g)
    assert g.graded_source == "teacher"


def test_ai_destekli_kaynak_korunur():
    """Free/paid ayrımı için AI destekli değerlendirme ayırt edilebilmeli."""
    g = gonderi()
    calistir(GradeHomeworkRequest(grade=70, source="ai_assisted"), gonderi_obj=g)
    assert g.graded_source == "ai_assisted"


def test_bosluklu_geri_bildirim_kirpilir():
    g = gonderi()
    calistir(GradeHomeworkRequest(grade=50, feedback="  İyi iş.  "), gonderi_obj=g)
    assert g.feedback == "İyi iş."


def test_yeniden_degerlendirme_ustune_yazar():
    g = gonderi(grade=40, feedback="Eksik.", graded_at=datetime(2020, 1, 1))
    calistir(GradeHomeworkRequest(grade=95, feedback="Düzeltilmiş."), gonderi_obj=g)
    assert g.grade == 95
    assert g.feedback == "Düzeltilmiş."
    assert g.graded_at.year != 2020
