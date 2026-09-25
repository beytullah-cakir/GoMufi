"""
Kavram sözlüğü tohumları — DİLE ait, kursa DEĞİL.

Buradaki liste bir kursun değil, bir DİLİN sözlüğüdür. "Sıfırdan Python",
"Python ile Veri Analizi", "Çocuklar için Python" — üçünde de konular
değişir, altındaki kavramlar aynı kalır. Bu yüzden kurs açıldıkça büyüyen
bir maliyet yok: dil başına bir kez yazılır, sonsuz kursta kullanılır.

Ölçü: bir öğrencinin AYRI AYRI anlayabileceği/anlayamayacağı en küçük şey.
  * "Döngüler" çok geniş — hangi kısmını anlamadığını söylemez.
  * "range() bitiş değerini kapsamaz" tam kıvamında — tek başına ölçülür.

`prerequisites` alanı kavramlar arası sırayı taşır: bir öğrenci
`range_kullanimi`nda takılıyorsa, önce `for_dongusu`nu biliyor mu diye
bakılabilir. Ön koşul DAİMA aynı dilin sözlüğündeki bir kimliktir.

Kimlikler SABİTTİR. Bir kimlik yayına girdikten sonra değiştirilemez —
öğrenci ilerlemesi, ölçüm kayıtları ve konu eşleşmeleri ona bağlanır.
Etiket ve açıklama değişebilir, kimlik değişemez.
"""

from __future__ import annotations

from typing import Dict, List

# (kimlik, görünen ad, ön koşullar, kısa açıklama)
_PYTHON: List[tuple] = [
    ("degisken_atama", "Değişkene değer atama", [],
     "Bir değeri isimlendirip saklamak; = işaretinin eşitlik değil atama olduğu."),
    ("ekrana_yazdirma", "print() ile ekrana yazdırma", [],
     "print() çağrısı, birden fazla değeri virgülle yazdırma."),
    ("veri_tipleri", "Temel veri tipleri (int, float, str, bool)", ["degisken_atama"],
     "Bir değerin tipi olduğunu ve tipin ne yapılabileceğini belirlediğini kavramak."),
    ("tip_donusumu", "Tip dönüşümü (int(), str(), float())", ["veri_tipleri"],
     "Tipler arası dönüştürme; \"5\" ile 5'in aynı şey olmadığı."),
    ("kullanicidan_girdi", "input() ile kullanıcıdan veri alma", ["degisken_atama", "ekrana_yazdirma"],
     "input() DAİMA metin döndürür; sayı gerekiyorsa dönüştürülmesi gerekir."),
    ("aritmetik_operatorler", "Aritmetik operatörler (+ - * / // % **)", ["veri_tipleri"],
     "/ ile // farkı, % ile kalan alma."),
    ("string_birlestirme", "Metin birleştirme ve f-string", ["veri_tipleri"],
     "+ ile birleştirme, f\"{ad}\" ile değer gömme; metinle sayı toplanamayacağı."),
    ("string_indeksleme", "Metinde indeks ve dilimleme", ["veri_tipleri"],
     "s[0], s[-1], s[1:4]; dilimlemede bitiş indeksinin dahil olmadığı."),
    ("string_metotlari", "Metin metotları (upper, strip, split, replace)", ["veri_tipleri"],
     "Metot çağrısının metni değiştirmeyip YENİ metin döndürdüğü."),
    ("karsilastirma_operatorleri", "Karşılaştırma operatörleri (==, !=, <, >)", ["veri_tipleri"],
     "== ile = karışıklığı; karşılaştırmanın True/False ürettiği."),
    ("mantiksal_operatorler", "Mantıksal operatörler (and, or, not)", ["karsilastirma_operatorleri"],
     "Birden fazla koşulu birleştirme."),
    ("if_kosulu", "if ile koşul kurma", ["karsilastirma_operatorleri"],
     "Koşul doğruysa çalışan blok; girintinin bloğu belirlediği."),
    ("elif_else", "elif ve else dalları", ["if_kosulu"],
     "Birden çok durumu ayırma; yalnızca ilk uyan dalın çalıştığı."),
    ("while_dongusu", "while döngüsü", ["karsilastirma_operatorleri"],
     "Koşul bozulana kadar tekrar; sayacın döngü içinde değişmesi gerektiği."),
    ("for_dongusu", "for ile dizi üzerinde dönme", ["degisken_atama"],
     "Bir koleksiyonun elemanları üzerinde sırayla dolaşma."),
    ("range_kullanimi", "range() kullanımı", ["for_dongusu"],
     "range(5) 0-4 üretir; BİTİŞ DEĞERİ KAPSANMAZ. Adım ve başlangıç parametreleri."),
    ("ic_ice_dongu", "İç içe döngüler", ["for_dongusu"],
     "Dış döngünün her adımında iç döngünün baştan çalıştığı."),
    ("dongu_kontrol", "break ve continue", ["while_dongusu", "for_dongusu"],
     "Döngüyü erken bitirme ve adımı atlama arasındaki fark."),
    ("liste_olusturma", "Liste oluşturma", ["veri_tipleri"],
     "Birden çok değeri tek isimde toplama."),
    ("liste_indeksleme", "Liste indeksleme", ["liste_olusturma"],
     "İndeksin 0'dan başladığı, negatif indeks, IndexError."),
    ("liste_guncelleme", "Liste güncelleme (append, remove, pop)", ["liste_olusturma"],
     "Listenin yerinde değiştiği (mutable olduğu)."),
    ("liste_dolasma", "Liste üzerinde döngü", ["liste_olusturma", "for_dongusu"],
     "for ile eleman eleman gezme; len() ile indeks üzerinden gezmeyle farkı."),
    ("sozluk_kullanimi", "Sözlük (dict) anahtar-değer", ["liste_olusturma"],
     "Sıra yerine anahtarla erişim; KeyError."),
    ("demet_ve_kume", "Demet (tuple) ve küme (set)", ["liste_olusturma"],
     "Demetin değiştirilemezliği, kümenin tekrarsızlığı."),
    ("fonksiyon_tanimlama", "def ile fonksiyon tanımlama", ["degisken_atama"],
     "Tanımlamakla ÇAĞIRMANIN farklı şeyler olduğu."),
    ("fonksiyon_parametre", "Parametre ve argüman", ["fonksiyon_tanimlama"],
     "Fonksiyona dışarıdan veri geçme; varsayılan değerler."),
    ("fonksiyon_return", "return ile değer döndürme", ["fonksiyon_tanimlama"],
     "print etmekle DÖNDÜRMENİN farkı; return sonrası kodun çalışmadığı."),
    ("hata_yakalama", "try/except ile hata yakalama", ["tip_donusumu"],
     "Programı çökertmeden hatayı ele alma."),
    ("dosya_okuma_yazma", "Dosya okuma ve yazma", ["string_metotlari"],
     "with open(...) kalıbı, okuma/yazma kipleri."),
    ("modul_ice_aktarma", "import ile modül kullanma", ["fonksiyon_tanimlama"],
     "Hazır kütüphaneyi projeye dahil etme; import ile pip install farkı."),
]

# Dil kimliği -> tohum listesi.
# Yeni dil eklemek için buraya bir liste yazmak YETERLİ. Yazılmadıysa sistem
# uydurmaz: öğretmene taslak çıkarıp onayını ister (bkz. concept_registry).
SEED_DICTIONARIES: Dict[str, List[tuple]] = {
    "python": _PYTHON,
}


def seed_entries(language: str) -> List[dict]:
    """Tohum listesini kayıt sözlüğü biçiminde döndürür."""
    return [
        {
            "concept_id": concept_id,
            "label": label,
            "prerequisites": list(prereqs),
            "description": description,
        }
        for concept_id, label, prereqs, description in SEED_DICTIONARIES.get(language, [])
    ]
