# Değişiklikler

## 0.6.0

- **Ders klasörü kendiliğinden:** ilk girişte ev dizininde `GoMufi` klasörü
  açılır; artık "nereye kaydedeyim?" diye sorulmaz. Klasör değiştirmek için
  **GoMufi: Ders Klasörünü Değiştir**.
- **Dersleri Aç → ders penceresi:** komut ders klasörüne geçer ve panel orada
  açılır. Başka bir proje açıksa ona dokunulmaz, dersler yeni pencerede açılır.
  Modüller artık çalışma alanına ayrı kök olarak eklenmiyor.
- **İlk kurulum rehberi:** giriş → klasör → Python kontrolü → tema, sırayla.
- **Python bulunur:** Python eklentisinde seçili yorumlayıcı, `py -3`,
  `python3`, `python` sırasıyla denenir; terminal ve otomatik kontrol aynı
  yorumlayıcıyı kullanır. Python yoksa nasıl kurulacağı söylenir.
- **Slayt kodları korunur:** her slayt kendi dosyasına yazılır; öğrencinin
  düzenlemesi başka bir slayt açılınca kaybolmaz.
- **Laboratuvar modu** (`gomufi.labMode`): ortak bilgisayarda oturum VS Code
  kapanınca biter, her öğrencinin dosyaları ayrı klasörde durur.
- **Tek pencere eşleşir:** sitedeki "Çalıştır" yalnızca ders penceresine gider.
- **Bağlantı yoksa** panelde hata ekranı ve "Tekrar dene".
- **Kısıtlı Mod:** güvenilmeyen klasörde kod çalıştırılmaz, neden söylenir.
- Varsayılan adresler canlı site; en düşük VS Code sürümü 1.97.
