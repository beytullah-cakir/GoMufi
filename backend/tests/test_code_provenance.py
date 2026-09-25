"""
Kod kökeni: son koddaki her karakterin nereden geldiği.

Öğretmenin "bu kodu öğrenci mi yazdı" sorusuna verilen cevap bu oynatmaya
dayanıyor; yanlış bir sayı ya haksız bir şüpheye ya da gözden kaçan bir
yapıştırmaya dönüşür. Bu yüzden kurallar tek tek sınanıyor.
"""
from code_provenance import (
    apply_chunk, composition, empty_state, flags, summarize,
)


def _run(*chunks, starters=()):
    state = empty_state()
    for chunk in chunks:
        apply_chunk(state, chunk, starters)
    return state


def chunk(ops, base=None, start=0):
    return {"started_at_ms": start, "base_text": base, "ops": ops}


def test_elle_yazilan_kod_tamamen_ogrencinin():
    state = _run(chunk([[0, 0, 0, "print(1)", "t"]], base=""))
    assert state["text"] == "print(1)"
    assert composition(state) == {"typed": 8}
    assert summarize(state)["own_share"] == 1.0


def test_baslangic_kodu_ogrencinin_sayilmaz():
    starter = "# Kodunu buraya yaz\n"
    state = _run(chunk([[0, len(starter), 0, "x = 5", "t"]], base=starter), starters=[starter])
    comp = composition(state)
    assert comp["starter"] == len("#Kodunuburayayaz")
    assert comp["typed"] == len("x=5")


def test_bilinmeyen_baslangic_isaretlenir():
    """Kayıt başlamadan önce dosyada olan içerik kimseye yazılmaz."""
    state = _run(chunk([], base="eski kod"))
    assert composition(state) == {"unknown": 7}


def test_dis_yapistirma_ve_payi():
    pasted = "for i in range(10):\n    print(i)\n"
    state = _run(chunk([
        [0, 0, 0, "# not\n", "t"],
        [500, 6, 0, pasted, "p"],
    ], base=""))
    summary = summarize(state)
    assert summary["composition"]["paste_external"] == len("foriinrange(10):print(i)")
    assert summary["share"]["paste_external"] > 0.8
    assert summary["activity"]["paste_events"] == 1


def test_yapistirilip_silinen_kod_son_kodda_sayilmaz():
    """Önemli olan SON kod: yapıştırıp silip kendisi yazan öğrenci işaretlenmez."""
    state = _run(chunk([
        [0, 0, 0, "cevap = 42", "p"],
        [100, 0, 10, "", "t"],
        [200, 0, 0, "cevap = 42", "t"],
    ], base=""))
    assert composition(state) == {"typed": len("cevap=42")}
    assert summarize(state)["activity"]["paste_external"] == 10  # etkinlikte yine görünür


def test_geri_al_yapistirmayi_elle_yazilmis_gostermez():
    """Açık kapı: yapıştır → sil → geri al; geri gelen kod yine yapıştırmadır."""
    state = _run(chunk([
        [0, 0, 0, "gizli_cozum()", "p"],
        [100, 0, 13, "", "t"],
        [200, 0, 0, "gizli_cozum()", "u"],
    ], base=""))
    assert composition(state) == {"paste_external": len("gizli_cozum()")}


def test_bicimlendirme_sahipligi_degistirmez():
    state = _run(chunk([
        [0, 0, 0, "x=1", "t"],
        [100, 0, 3, "x = 1", "f"],
    ], base=""))
    assert composition(state) == {"typed": 3}


def test_dis_degisiklik_yalnizca_degisen_kisimda():
    """Eklenti kapalıyken dosya değiştiyse yalnızca değişen kısım 'dış değişiklik'."""
    first = chunk([[0, 0, 0, "a = 1\nb = 2\n", "t"]], base="")
    second = chunk([], base="a = 1\nb = 2\nc = 3\n")
    state = _run(first, second)
    comp = composition(state)
    assert comp["typed"] == len("a=1b=2")
    assert comp["external"] == len("c=3")
    assert summarize(state)["activity"]["gaps"] == 1


def test_ayni_metinle_yeni_oturum_bosluk_yaratmaz():
    first = chunk([[0, 0, 0, "print(2)", "t"]], base="")
    second = chunk([[0, 8, 0, "\n", "t"]], base="print(2)")
    state = _run(first, second)
    assert "external" not in composition(state)


def test_sinir_disi_islem_kirpilir():
    """İstemci kayarsa kayıt reddedilmez, sınırlar kırpılır."""
    state = _run(chunk([[0, 0, 0, "abc", "t"], [10, 99, 50, "d", "t"]], base=""))
    assert state["text"] == "abcd"


def test_aktif_sure_uzun_araliklari_saymaz():
    state = _run(chunk([
        [0, 0, 0, "a", "t"],
        [30_000, 1, 0, "b", "t"],
        [10 * 60_000, 2, 0, "c", "t"],
    ], base=""))
    assert summarize(state)["activity"]["active_minutes"] == 0.5


def test_yapistirma_agirlikli_kod_isaretlenir():
    code = "def ortalama(notlar):\n    return sum(notlar) / len(notlar)\n"
    state = _run(chunk([[0, 0, 0, code, "p"]], base=""))
    codes = [f["code"] for f in flags(summarize(state))]
    assert "paste_heavy" in codes


def test_kisa_kodda_isaret_yok():
    """Birkaç karakterlik yapıştırma için öğrenci işaretlenmez."""
    state = _run(chunk([[0, 0, 0, "print(1)", "p"]], base=""))
    assert flags(summarize(state)) == []


def test_toplu_ekleme_ve_yz_eklentisi_birlikte_raporlanir():
    code = "sayilar = [3, 1, 2]\nsayilar.sort()\nprint(sayilar)\n"
    state = _run(chunk([[0, 0, 0, code, "b"]], base=""))
    found = flags(summarize(state), ["GitHub.copilot"])
    assert found[0]["code"] == "bulk_heavy"
    assert "GitHub.copilot" in found[0]["detail"]


def test_insanustu_yazma_hizi():
    ops = [[i * 50, i * 10, 0, "x" * 10, "t"] for i in range(800)]   # 40 sn'de 8000 karakter
    state = _run(chunk(ops, base=""))
    assert summarize(state)["activity"]["max_cpm"] >= 700
    assert "fast_typing" in [f["code"] for f in flags(summarize(state))]


def test_bosluklar_paya_girmez():
    state = _run(chunk([[0, 0, 0, "    ", "p"], [10, 4, 0, "x=1", "t"]], base=""))
    assert composition(state) == {"typed": 3}
