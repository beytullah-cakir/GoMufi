from routers.ai import _clip_to_max_chars

long_text = ("1. Python.org'dan Python'ı İndirin: Resmi web sitesine gidin ve işletim "
             "sisteminize uygun en son sürümü indirin. Kurulum sırasında 'Add Python to PATH' "
             "seçeneğini işaretlemeyi unutmayın. 2. Kurulumu Tamamlayın: İndirilen yükleyiciyi "
             "çalıştırın ve adımları takip edin. Kurulumun başarıyla tamamlandığından emin olmak "
             "için komut istemcisini (CMD/Terminal) açın ve `python --version` yazarak Python "
             "sürümünü kontrol edin. 3. Kod Düzenleyici Seçimi: Yazdığınız kodları daha rahat ve "
             "verimli bir şekilde yönetmek için bir kod düzenleyiciye ihtiyacınız var.")
print("orig len:", len(long_text))
el = {"maxChars": 666}
out = _clip_to_max_chars(el, long_text)
print("clipped len:", len(out))
print(out)

short = "Kısa metin"
print(_clip_to_max_chars({"maxChars": 100}, short) == short)
print(_clip_to_max_chars({}, long_text) == long_text)
