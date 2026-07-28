from routers.ai import _enforce_slide_bullets, _clip_to_max_chars, _format_list_breaks
BODY = {"maxChars": 666}

def p(el, val):
    return _clip_to_max_chars(el, _enforce_slide_bullets(el, _format_list_breaks(val)))

print("=== A) TANIM (3 cumle) -> akici metin korunmali ===")
tanim = ("Python, yorumlanan yüksek seviyeli bir programlama dilidir. "
         "Kodu derlemeden satır satır çalıştırır, hatayı anında görürsünüz. "
         "Girintiler süslü parantez yerine blokları belirler.")
out = p(BODY, tanim)
print(out)
print("bozulmadi:", out == tanim, "| madde yok:", "•" not in out)
print()

print("=== B) KURULUM ADIMLARI -> numarali liste korunmali ===")
steps = "1. Python.org adresini ziyaret edin.2. En güncel sürümü indirin. 3. Dosyayı çalıştırın. 4. 'Add Python to PATH' işaretleyin."
print(p(BODY, steps))
print()

print("=== C) IDE KARSILASTIRMA -> madde korunmali ===")
cmp_ = "• VS Code: Hafif ve ücretsizdir<br>• PyCharm: Python'a özeldir<br>• Jupyter: Veri bilimi için"
print(p(BODY, cmp_))
print()

print("=== D) ANSIKLOPEDI PARAGRAFI (6 cumle) -> hala maddeye bolunur ===")
uzun = ("IDE yazılım geliştiricilere yardımcı olan bir uygulamadır. "
        "Python için birçok popüler IDE bulunmaktadır. "
        "VS Code, PyCharm ve Jupyter tercih edilenler arasındadır. "
        "IDE'ler kod tamamlama ve hata ayıklama sunar. "
        "Bir IDE seçmek kişisel tercihinize bağlıdır. "
        "Yeni başlayanlar için VS Code önerilir.")
out = p(BODY, uzun)
print(out)
print("madde sayisi:", out.count("•"))
