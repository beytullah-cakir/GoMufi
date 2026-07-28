from routers.ai import _format_list_breaks

cases = [
    "1. Python'ın resmi web sitesi olan python.org/downloads adresine gidin.2. İşletim sisteminize (Windows, macOS, Linux) uygun en son Python sürümünü indirin. Genellikle en son sürüm önerilir.3. Kurulumu başlatın.",
    "İndirin. 2. Kurulumu Tamamlayın: adımları takip edin. 3. Kod Düzenleyici Seçimi.",
    "Ondalıklı sayılar (3.14, -0.5, 2.0). Tam sayılar da vardır.",
    "Python 3.8'i tercih edin. Ardından devam edin.",
]
for c in cases:
    print(repr(_format_list_breaks(c)))
    print()
