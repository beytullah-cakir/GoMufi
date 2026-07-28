"""
Tek modül yeniden üretiminde kapsam sınırı ("AI ile Tekrar Oluştur").

REGRESYON BAĞLAMI (gerçek çıktıda ölçüldü):
İlk üretimde `modules` dersin TÜM modüllerini içerir; model kardeş modülleri
görüp kapsamı kendiliğinden ayırır ("değişkenler 3. modülde, ben 1. modülüm").
Tekrar üretimde eskiden YALNIZCA tek modül gönderiliyordu — sınır kalmayınca
model, ders başlığındaki ("Ders 1: Giriş, Değişkenler") her konuyu o tek modüle
dolduruyordu. Yani "Giriş" modülü, sonraki ANLA modülünde işlenecek değişkenleri
de anlatıyordu.

Düzeltme: kardeşler yine gönderilir (kapsam sınırı olarak), `target_module_index`
hangisinin üretileceğini söyler ve slayt YALNIZCA hedef modül için üretilir.
"""
import pytest

from routers.ai import GenerateLessonSlidesRequest

LESSON_MODULES = [
    {"type": "UNDERSTAND", "topic": "Python'a giriş ve print komutu"},
    {"type": "APPLY", "topic": "print ile ekrana yazdırma pratiği"},
    {"type": "UNDERSTAND", "topic": "Değişkenler ve veri tipleri"},
    {"type": "APPLY", "topic": "Değişken tanımlama pratiği"},
    {"type": "CONNECT", "topic": "Temelleri birleştir"},
]


def _make(**over):
    base = dict(
        topic="Sıfırdan Python Kursu", difficulty="Orta", audience="Karma",
        lesson_number=1, lesson_title="Ders 1: Giriş, Değişkenler",
        lesson_objective="Öğrenci yazdırma ve değişkenleri öğrenir.",
        modules=LESSON_MODULES,
    )
    base.update(over)
    return GenerateLessonSlidesRequest(**base)


def _resolve(req):
    """routers/ai.py içindeki hedef-modül çözümlemesinin aynısı."""
    idx = req.target_module_index
    if req.is_regeneration and idx is not None and 0 <= idx < len(req.modules):
        return idx
    return None


def _modules_to_build(req):
    target = _resolve(req)
    if target is not None:
        return [(target, req.modules[target])]
    return list(enumerate(req.modules))


def test_normal_uretim_tum_modulleri_uretir():
    """İlk üretim yolu bozulmamalı: dersin her modülü için slayt çıkar."""
    req = _make(is_regeneration=False)
    assert _resolve(req) is None
    assert len(_modules_to_build(req)) == len(LESSON_MODULES)


def test_tekrar_uretim_sadece_hedef_modulu_uretir():
    """
    Kardeşler prompt'a girer ama slayt yalnızca hedef için üretilir —
    aksi halde frontend'in okuduğu notes[0] yanlış modül olurdu.
    """
    req = _make(is_regeneration=True, target_module_index=0)
    built = _modules_to_build(req)
    assert len(built) == 1
    assert built[0][0] == 0
    assert built[0][1]["topic"] == "Python'a giriş ve print komutu"


def test_kardes_modul_konulari_kapsam_disinda_kalir():
    """Hatanın özü: 'Değişkenler' başka bir modülün konusu, hedefe girmemeli."""
    req = _make(is_regeneration=True, target_module_index=0)
    target = _resolve(req)
    others = [m["topic"] for i, m in enumerate(req.modules) if i != target]
    assert "Değişkenler ve veri tipleri" in others
    assert req.modules[target]["topic"] not in others


def test_ortadaki_modul_de_hedeflenebilir():
    req = _make(is_regeneration=True, target_module_index=2)
    built = _modules_to_build(req)
    assert built[0][0] == 2
    assert built[0][1]["topic"] == "Değişkenler ve veri tipleri"


@pytest.mark.parametrize("bad_index", [-1, 99])
def test_gecersiz_indeks_tum_modullere_geri_doner(bad_index):
    """Bozuk indeks sessizce yanlış modül üretmemeli; güvenli davranışa dönmeli."""
    req = _make(is_regeneration=True, target_module_index=bad_index)
    assert _resolve(req) is None
    assert len(_modules_to_build(req)) == len(LESSON_MODULES)


def test_indekssiz_tekrar_uretim_eski_davranisi_korur():
    """Eski istemciler target_module_index göndermez — kırılmamalı."""
    req = _make(is_regeneration=True)
    assert req.target_module_index is None
    assert _resolve(req) is None
