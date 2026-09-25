"""
Kavram sözlüğü: tohum tutarlılığı, dil tespiti ve eşleştirme doğrulaması.

Buradaki kurallar ürün kararıdır, gevşetilirse ölçüm birimi bozulur:
konu başına en fazla 4 kavram, tam olarak bir birincil kavram ve YALNIZCA
sözlükteki kimlikler.
"""
import concept_registry as registry
from concept_seeds import SEED_DICTIONARIES, seed_entries
from models.concept import Concept


def _known(*ids):
    return {i: Concept(language="python", concept_id=i, label=i.replace("_", " ")) for i in ids}


# --- Tohumlar ---------------------------------------------------------------

def test_python_sozlugu_olculebilir_boyutta():
    """25-30 arası: az tutmak kasıtlı, eksikler pilotta görülüp eklenir."""
    entries = seed_entries("python")
    assert 25 <= len(entries) <= 30


def test_kimlikler_tekil():
    for language in SEED_DICTIONARIES:
        ids = [e["concept_id"] for e in seed_entries(language)]
        assert len(ids) == len(set(ids)), f"{language} sözlüğünde tekrar eden kimlik var"


def test_on_kosullar_ayni_sozlukte_cozulur():
    """Ölü ön koşul, öğrencinin asla göremeyeceği bir bağ demektir."""
    for language in SEED_DICTIONARIES:
        entries = seed_entries(language)
        ids = {e["concept_id"] for e in entries}
        for entry in entries:
            for prereq in entry["prerequisites"]:
                assert prereq in ids, f"{entry['concept_id']} -> bilinmeyen ön koşul {prereq}"
                assert prereq != entry["concept_id"], "kavram kendine ön koşul olamaz"


def test_kimlikler_ascii_snake_case():
    """Kimlik SABİTTİR ve URL/JSON'da taşınır: Türkçe karakter ve boşluk yok."""
    for language in SEED_DICTIONARIES:
        for entry in seed_entries(language):
            assert entry["concept_id"] == registry.slugify(entry["concept_id"])


# --- Dil tespiti ------------------------------------------------------------

def test_kurs_konusundan_dil_cikarilir():
    assert registry.detect_language("Sıfırdan Python Programlama") == "python"
    assert registry.detect_language("Python ile Veri Analizi") == "python"
    assert registry.detect_language("Çocuklar için Scratch") == "scratch"
    assert registry.detect_language("SQL Temelleri") == "sql"


def test_javascript_java_ile_karismaz():
    """'javascript' içinde 'java' geçer — sıra bozulursa yanlış sözlük gelir."""
    assert registry.detect_language("JavaScript ile Web Geliştirme") == "javascript"
    assert registry.detect_language("Java ile Nesne Yönelimli Programlama") == "java"


def test_dil_bulunamazsa_uydurmaz():
    assert registry.detect_language("Genel Matematik Kursu") is None
    assert registry.detect_language("") is None


# --- Eşleştirme doğrulaması -------------------------------------------------

def test_sozlukte_olmayan_kavram_dusurulur_ve_raporlanir():
    known = _known("degisken_atama", "veri_tipleri")
    accepted, unmatched = registry.normalize_topic_concepts(
        [{"concept_id": "degisken_atama"}, {"concept_id": "asenkron_programlama"}], known
    )
    assert [c["concept_id"] for c in accepted] == ["degisken_atama"]
    assert unmatched == ["asenkron_programlama"]


def test_konu_basina_en_fazla_dort_kavram():
    known = _known("a", "b", "c", "d", "e")
    accepted, _ = registry.normalize_topic_concepts(
        [{"concept_id": x} for x in ["a", "b", "c", "d", "e"]], known
    )
    assert len(accepted) == registry.MAX_CONCEPTS_PER_TOPIC


def test_daima_tek_birincil_kavram():
    known = _known("a", "b", "c")
    # Model hiç işaretlemedi -> ilki birincil olur (sıra = modelin önem sırası)
    accepted, _ = registry.normalize_topic_concepts(
        [{"concept_id": "a"}, {"concept_id": "b"}], known
    )
    assert [c["primary"] for c in accepted] == [True, False]

    # Model birden fazla işaretledi -> yalnızca ilki korunur
    accepted, _ = registry.normalize_topic_concepts(
        [{"concept_id": "a", "primary": True}, {"concept_id": "b", "primary": True}], known
    )
    assert [c["primary"] for c in accepted] == [True, False]

    # Model ikinciyi işaretledi -> o birincil kalır
    accepted, _ = registry.normalize_topic_concepts(
        [{"concept_id": "a"}, {"concept_id": "b", "primary": True}], known
    )
    assert [c["primary"] for c in accepted] == [False, True]


def test_hicbir_kavram_eslesmezse_bos_kalir():
    """Zorla eşleştirme YOK: uyduran bir liste, ölçümü baştan bozar."""
    accepted, unmatched = registry.normalize_topic_concepts(
        [{"concept_id": "yok_boyle_bir_sey"}], _known("a")
    )
    assert accepted == []
    assert unmatched == ["yok_boyle_bir_sey"]


def test_ayni_kavram_iki_kez_sayilmaz():
    known = _known("a", "b")
    accepted, _ = registry.normalize_topic_concepts(
        [{"concept_id": "a"}, {"concept_id": "a"}, {"concept_id": "b"}], known
    )
    assert [c["concept_id"] for c in accepted] == ["a", "b"]


def test_model_etiket_yazdiysa_slug_ile_eslesir():
    """Model kimlik yerine 'Değişken Atama' yazarsa düşürmek yerine eşleştir."""
    known = _known("degisken_atama")
    accepted, unmatched = registry.normalize_topic_concepts(["Değişken Atama"], known)
    assert [c["concept_id"] for c in accepted] == ["degisken_atama"]
    assert unmatched == []


def test_prompt_blogu_kimlik_ve_on_kosul_tasir():
    """Model listeyi görmezse kimlik uydurur; blok bu yüzden kimlik + ön koşul taşır."""
    concept = Concept(
        language="python", concept_id="range_kullanimi", label="range() kullanımı",
        prerequisites=["for_dongusu"], description="Bitiş değeri kapsanmaz.",
    )
    block = registry.dictionary_prompt_block([concept])
    assert "range_kullanimi" in block
    assert "for_dongusu" in block
