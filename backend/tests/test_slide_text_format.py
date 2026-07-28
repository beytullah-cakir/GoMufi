"""
Slayt gövde metni biçimlendirme — paragraf değil, slayt.

Regresyon bağlamı (hepsi gerçek çıktıda ölçüldü):
  1) AI numaralı listeyi tek paragraf halinde, bazen boşluksuz üretiyordu
     ("gidin.2.") ve HTML render'da hepsi bitişik görünüyordu.
  2) maxChars limiti prompt'ta yazmasına rağmen aşılıyor, metin kutu dışına
     taşıyordu; kelime sınırında "…" ile kesmek ise yarım cümle bırakıyordu.
  3) Model slayt yerine ansiklopedi paragrafı üretiyordu (tek blokta 90
     kelime) — tahtaya yansıtıldığında okunmuyor.
  4) Her şeyi maddeye çevirmek de hataydı: tanım/kavram anlatımı cümleleri
     koparılınca içi boş tek satırlara dönüşüyordu. Format artık içeriğin
     türüne göre seçilir — kısa akıcı metin de geçerli bir slayt formatıdır.
"""
import asyncio
import json

from routers.ai import (
    _BULLET_MAX,
    _clear_unfilled_placeholder,
    _clip_to_max_chars,
    _effective_max_chars,
    _enforce_slide_bullets,
    _fit_text,
    _format_list_breaks,
    _shrink_overflowing,
    _visible_len,
)

# Gerçek şablon elemanları (slide_templates.json'dan birebir geometri).
# Dar ve geniş başlık AYNI maxChars:30 değerini taşıyor — hatanın kaynağı buydu.
TITLE_NARROW = {"type": "text", "width": 759, "height": 85,
                "style": {"fontSize": 60, "fontFamily": "Fredoka"}, "maxChars": 30}
TITLE_WIDE = {"type": "text", "width": 1215, "height": 85,
              "style": {"fontSize": 60, "fontFamily": "Fredoka"}, "maxChars": 30}
STICKY_BOX = {"type": "sticky", "width": 200, "height": 200,
              "style": {"fontSize": 24, "fontFamily": "Patrick Hand"}, "maxChars": 92}
CHALLENGE = {"type": "challenge", "width": 486, "height": 249, "maxChars": 498}

BODY = {"maxChars": 666}
STICKY = {"maxChars": 92}
TITLE = {"maxChars": 30}

PARAGRAF = (
    "IDE, yazılım geliştiricilere yardımcı olan bir uygulamadır. "
    "Python için birçok popüler IDE bulunmaktadır. "
    "VS Code, PyCharm ve Jupyter Notebook tercih edilenler arasındadır. "
    "IDE'ler kod tamamlama ve hata ayıklama sunar. "
    "Bir IDE seçmek kişisel tercihinize bağlıdır. "
    "Yeni başlayanlar için VS Code önerilir."
)


def _pipeline(el, val):
    """Üretim akışındaki sıranın aynısı (bkz. routers/ai.py çağrı noktaları)."""
    return _clip_to_max_chars(el, _enforce_slide_bullets(el, _format_list_breaks(val)))


# --- 1) numaralı liste satırlara ayrılmalı -----------------------------------

def test_numarali_liste_bosluksuz_da_ayrilir():
    """AI madde arasına boşluk koymayabiliyor: 'gidin.2.' de yakalanmalı."""
    text = "Siteye gidin.2. Sürümü indirin. 3. Kurulumu başlatın."
    out = _format_list_breaks(text)
    assert "<br><br>2." in out
    assert "<br><br>3." in out


def test_ondalik_sayi_madde_sanilmaz():
    """'3.14' ve sürüm numaraları liste maddesi değildir."""
    text = "Ondalıklı sayılar (3.14, -0.5, 2.0). Tam sayılar da vardır."
    assert _format_list_breaks(text) == text


# --- 2) kırpma tam cümlede bitmeli, üç nokta olmamalı ------------------------

def test_kirpma_uc_nokta_koymaz_ve_tam_cumlede_biter():
    text = "Birinci cümle burada. İkinci cümle biraz daha uzun sürüyor. Üçüncü cümle."
    out = _clip_to_max_chars({"maxChars": 60}, text)
    assert "…" not in out
    assert out.endswith(".")
    assert len(out) <= 60


def test_limit_altindaki_metne_dokunulmaz():
    text = "Kısa ve tam bir cümle."
    assert _clip_to_max_chars({"maxChars": 500}, text) == text


# --- 3) gövde metni madde listesine dönmeli ----------------------------------

def test_paragraf_maddelere_bolunur():
    out = _enforce_slide_bullets(BODY, PARAGRAF)
    assert "<br>" in out
    assert out.startswith("• ")


def test_madde_sayisi_dorde_sinirlanir():
    """Slayt başına en fazla 4 madde — fazlası tahtada okunmuyor."""
    out = _enforce_slide_bullets(BODY, PARAGRAF)
    assert out.count("•") == 4


def test_numarali_adimlar_numarasini_korur():
    """Sıra bilgisi taşıyan adımlar • ile değiştirilmemeli."""
    steps = "1. İndirin.<br><br>2. Kurun.<br><br>3. Doğrulayın."
    out = _enforce_slide_bullets(BODY, steps)
    assert out.startswith("1. ")
    assert "•" not in out


def test_kisa_kutular_madde_yapilmaz():
    """Başlık ve sticky note'lar madde listesi değildir."""
    sticky_text = "Farklı IDE'leri deneyin. Verimliliği artırır."
    assert _enforce_slide_bullets(STICKY, sticky_text) == sticky_text
    assert _enforce_slide_bullets(TITLE, "Entegre Geliştirme Ortamı") == "Entegre Geliştirme Ortamı"


def test_tek_cumle_oldugu_gibi_kalir():
    """Tek cümle zaten madde gibi; başına gereksiz • konmaz."""
    tek = "Python yorumlanabilir bir dildir."
    assert _enforce_slide_bullets(BODY, tek) == tek


def test_kisa_akici_metin_maddeye_cevrilmez():
    """
    Tanım/kavram anlatımı liste değildir: cümleleri koparmak açıklamayı
    birbirine bağlayan dokuyu siler. 2-4 cümlelik akıcı metin geçerli bir
    slayt formatıdır ve dokunulmamalıdır.
    """
    tanim = (
        "Python, yorumlanan yüksek seviyeli bir programlama dilidir. "
        "Kodu derlemeden satır satır çalıştırır, bu yüzden hatayı hemen görürsünüz. "
        "Girintiler süslü parantez yerine blokları belirler."
    )
    assert _enforce_slide_bullets(BODY, tanim) == tanim
    assert "•" not in _enforce_slide_bullets(BODY, tanim)


def test_asiri_uzun_paragraf_hala_maddeye_bolunur():
    """Akıcı metin serbestliği ansiklopedi paragrafını meşrulaştırmaz."""
    out = _enforce_slide_bullets(BODY, PARAGRAF)
    assert out.count("•") == _BULLET_MAX


def test_zaten_madde_olan_icerik_bozulmaz():
    already = "• Kod tamamlama sunar<br>• Hata ayıklama kolaydır<br>• Ücretsizdir"
    out = _enforce_slide_bullets(BODY, already)
    assert out.count("•") == 3
    assert "••" not in out


# --- 4) limit kutu geometrisine uymalı ---------------------------------------

def test_dar_baslik_kutusu_daha_dusuk_limit_alir():
    """
    Hatanın kaynağı: dar (759px) ve geniş (1215px) başlık kutusu aynı
    maxChars:30 taşıyordu. Tek elle konmuş sayı iki kutuyu birden doğru tarif
    edemiyor: dar kutuda 30 karakter taşıyor, geniş kutuda ise ~41 karakter
    sığdığı halde başlık gereksiz yere kesiliyordu.
    """
    assert _effective_max_chars(TITLE_NARROW) < TITLE_NARROW["maxChars"]
    assert _effective_max_chars(TITLE_WIDE) > TITLE_WIDE["maxChars"]
    assert _effective_max_chars(TITLE_NARROW) < _effective_max_chars(TITLE_WIDE)


def test_genis_baslik_gereksiz_kesilmez():
    """Ölçülen hata: 'Temel Veri Tipleri: Metin ve Boole' -> '... Metin ve'."""
    baslik = "Temel Veri Tipleri: Metin ve Boole"
    assert _clip_to_max_chars(TITLE_WIDE, baslik) == baslik


def test_dar_govde_kutusu_tasmadan_once_kirpilir():
    """
    Ölçülen hata: 173 karakterlik metin 482x260 kutuya sığmıyor ama eski
    kapasite tahmini (183) izin verdiği için kırpılmıyor, CSS taşırıyordu.
    """
    body = {"type": "text", "width": 482, "height": 260,
            "style": {"fontSize": 28, "fontFamily": "Fredoka"}, "maxChars": 190}
    uzun = ("print() fonksiyonu, kodunuzdan metin veya değişken değerlerini ekrana "
            "göstermek için kullanılır. Parantez içine yazdığınız her şey tırnak "
            'işaretleri ("") arasında olmalıdır.')
    out = _clip_to_max_chars(body, uzun)
    assert len(out) < len(uzun)
    assert out.endswith(".")       # tam cümlede bitmeli
    assert len(out) <= _effective_max_chars(body)


def test_doldurulmayan_yer_tutucu_temizlenir():
    """
    Şablondaki örnek metin ("important note 1") AI doldurmazsa slayta
    yazılıyordu — veritabanında bu içerikle kaydedilmiş sarı notlar bulundu.
    """
    el = {"type": "sticky", "content": "important note 1"}
    _clear_unfilled_placeholder(el)
    assert el["content"] == ""

    widget = {"type": "code_editor", "content": "print()"}
    _clear_unfilled_placeholder(widget)
    assert widget["content"] == "print()"   # widget'lara dokunulmaz


def test_tasan_baslik_kutuya_sigacak_sekilde_kirpilir():
    tasan = "Python Kurulumu ve IDE Seçimi:"   # tam 30 karakter, yine de taşıyordu
    out = _clip_to_max_chars(TITLE_NARROW, tasan)
    assert len(out) <= _effective_max_chars(TITLE_NARROW)
    assert "…" not in out


def test_sticky_gercek_kapasitesine_gore_daraltilir():
    """92 karakterlik sticky, 200x200 kutuda 6 satır olup taşıyordu."""
    assert _effective_max_chars(STICKY_BOX) < STICKY_BOX["maxChars"]
    tasan = ("PATH'e eklemeyi unutmak, sık karşılaşılan bir hatadır. "
             "Manuel olarak ayarlamak gerekebilir.")
    out = _clip_to_max_chars(STICKY_BOX, tasan)
    assert len(out) <= _effective_max_chars(STICKY_BOX)
    assert out.endswith(".")   # tam cümlede bitmeli


def test_widget_elemanlari_tahminle_daraltilmaz():
    """
    challenge/code_editor kendi iç düzenine sahip ayrı bileşenler; fontSize
    bile tanımlı değil. Ölçüm dayanağı olmadan daraltmak gerçek içeriği kırpar.
    """
    assert _effective_max_chars(CHALLENGE) == CHALLENGE["maxChars"]


def test_isaretleme_karakter_kotasini_yemez():
    """<br> etiketleri görünmüyor; limitten düşülmemeli."""
    assert _visible_len("• Bir<br>• Iki<br>• Uc") == 14


# --- 5) sığmayan metin kesilmez, yeniden yazdırılır --------------------------

class _FakeModels:
    def __init__(self, payload, fail=False):
        self.payload, self.fail, self.called = payload, fail, 0

    def generate_content(self, **kwargs):
        self.called += 1
        if self.fail:
            raise RuntimeError("API down")
        return type("R", (), {"text": json.dumps(self.payload, ensure_ascii=False),
                              "usage_metadata": None})()


class _FakeClient:
    def __init__(self, payload=None, fail=False):
        self.models = _FakeModels(payload or {"items": []}, fail)


UZUN_BASLIK = "Python Kurulumu ve IDE Seçimi Rehberi"


def test_sigan_metin_kuyruga_girmez():
    pending = []
    el = dict(TITLE_WIDE)
    _fit_text(el, "Kısa başlık", pending)
    assert pending == []
    assert el["content"] == "Kısa başlık"


def test_sigmayan_metin_kesilmeden_kuyruga_alinir():
    """Kesme yara bandıydı: metin tam kalmalı, yeniden yazdırılmak üzere beklemeli."""
    pending = []
    el = dict(TITLE_NARROW)
    _fit_text(el, UZUN_BASLIK, pending)
    assert len(pending) == 1
    assert el["content"] == UZUN_BASLIK   # HENÜZ kesilmemiş olmalı


def test_model_yeniden_yazinca_tam_metin_kullanilir():
    pending = []
    el = dict(TITLE_NARROW)
    _fit_text(el, UZUN_BASLIK, pending)

    client = _FakeClient({"items": [{"id": "0", "text": "Python ve IDE Kurulumu"}]})
    asyncio.run(_shrink_overflowing(client, pending, db=None, teacher_id=None, course_topic="Python"))

    assert el["content"] == "Python ve IDE Kurulumu"
    assert _visible_len(el["content"]) <= _effective_max_chars(el)


def test_cagri_basarisiz_olursa_son_care_kesme():
    """Davranış hiçbir koşulda eskisinden kötü olmamalı."""
    pending = []
    el = dict(TITLE_NARROW)
    _fit_text(el, UZUN_BASLIK, pending)

    asyncio.run(_shrink_overflowing(_FakeClient(fail=True), pending,
                                    db=None, teacher_id=None, course_topic="Python"))

    assert _visible_len(el["content"]) <= _effective_max_chars(el)
    assert "…" not in el["content"]


def test_tasma_yoksa_ek_cagri_yapilmaz():
    """Maliyet: yalnızca gerçekten taşma olduğunda ek çağrı."""
    client = _FakeClient()
    asyncio.run(_shrink_overflowing(client, [], db=None, teacher_id=None, course_topic="X"))
    assert client.models.called == 0


def test_model_yine_sigdiramazsa_kesmeye_dusulur():
    pending = []
    el = dict(TITLE_NARROW)
    _fit_text(el, UZUN_BASLIK, pending)

    # Model daha da uzun bir metin döndürüyor — kabul edilmemeli
    client = _FakeClient({"items": [{"id": "0", "text": UZUN_BASLIK + " ve Daha Fazlası"}]})
    asyncio.run(_shrink_overflowing(client, pending, db=None, teacher_id=None, course_topic="Python"))

    assert _visible_len(el["content"]) <= _effective_max_chars(el)


# --- uçtan uca ---------------------------------------------------------------

def test_uctan_uca_paragraf_okunabilir_slayta_donusur():
    out = _pipeline(BODY, PARAGRAF)
    assert out.count("•") == 4       # en fazla 4 madde
    assert "…" not in out            # yarım cümle işareti yok
    assert len(out) <= BODY["maxChars"]
