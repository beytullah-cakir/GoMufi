from routers.ai import _format_list_breaks, _clip_to_max_chars

text = ("1. Python.org'dan Python'ı İndirin: Resmi web sitesine gidin ve işletim "
        "sisteminize uygun en son sürümü indirin. Kurulum sırasında 'Add Python to PATH' "
        "seçeneğini işaretlemeyi unutmayın. 2. Kurulumu Tamamlayın: İndirilen yükleyiciyi "
        "çalıştırın ve adımları takip edin. Kurulumun başarıyla tamamlandığından emin olmak "
        "için komut istemcisini (CMD/Terminal) açın ve `python --version` yazarak Python "
        "sürümünü kontrol edin. 3. Kod Düzenleyici Seçimi: Yazdığınız kodları daha rahat ve "
        "verimli bir şekilde yönetmek için bir kod düzenleyiciye ihtiyacınız var. Yeni "
        "başlayanlar için VS Code veya PyCharm Community Edition önerilir. Bu IDE'ler, "
        "kod tamamlama, hata ayıklama gibi özellikler sunar.")
out = _format_list_breaks(text)
print(out)
print()
print("---clipped to 300---")
print(_clip_to_max_chars({"maxChars": 300}, _format_list_breaks(text)))

# guard against false positive on decimals
decimal_text = "Ondalıklı sayılar (3.14, -0.5, 2.0). Tam sayılar da vardır."
print()
print("decimal check:", _format_list_breaks(decimal_text))
