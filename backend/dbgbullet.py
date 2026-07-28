from routers.ai import _enforce_slide_bullets, _format_list_breaks, _clip_to_max_chars

def pipeline(el, val):
    return _clip_to_max_chars(el, _enforce_slide_bullets(el, _format_list_breaks(val)))

BODY = {"maxChars": 666}
STICKY = {"maxChars": 92}
TITLE = {"maxChars": 30}

# 1. Gercek sikayet: 90 kelimelik ansiklopedi paragrafi (IDE slaydi)
ide = ("IDE (Integrated Development Environment), yazılım geliştiricilere kod yazma, hata "
       "ayıklama ve test etme gibi konularda yardımcı olan bir yazılım uygulamasıdır. Python için "
       "birçok popüler IDE bulunmaktadır. VS Code, PyCharm ve Jupyter Notebook en çok tercih "
       "edilenler arasındadır. IDE'ler, kod tamamlama, sözdizimi vurgulama ve entegre hata "
       "ayıklama gibi özellikler sunarak geliştirme sürecini hızlandırır ve hataları azaltır. "
       "Bir IDE seçmek, projenizin türüne ve kişisel tercihinize bağlıdır. Yeni başlayanlar için "
       "VS Code veya PyCharm Community Edition önerilir.")
print("=== 1) PARAGRAF -> MADDE ===")
out = pipeline(BODY, ide)
print(out)
print("madde sayisi:", out.count("•"))
print()

# 2. Numarali adimlar numarasini korumali
steps = ("1. Python.org'dan Python'ı İndirin: resmi siteye gidin.2. İşletim sisteminize uygun "
         "sürümü indirin. 3. Kurulumu başlatın. 4. PATH seçeneğini işaretleyin. 5. Doğrulayın.")
print("=== 2) NUMARALI ADIMLAR ===")
print(pipeline(BODY, steps))
print()

# 3. Sticky/baslik dokunulmamali
print("=== 3) KUCUK KUTULAR KORUNUR ===")
print("sticky:", repr(pipeline(STICKY, "Farklı IDE'leri deneyin. Verimliliği artırır.")))
print("title :", repr(pipeline(TITLE, "Entegre Geliştirme Ortamı")))
print()

# 4. Zaten madde formatinda gelen icerik bozulmamali
already = "• Kod tamamlama sunar<br>• Hata ayıklama kolaydır<br>• Ücretsizdir"
print("=== 4) ZATEN MADDE ===")
print(pipeline(BODY, already))
print()

# 5. Tek cumle -> dokunma
print("=== 5) TEK CUMLE ===")
print(repr(pipeline(BODY, "Python yorumlanabilir bir dildir.")))
