# GoMufi — VS Code Eklentisi

GoMufi derslerini VS Code'da açar: slaytlar sağdaki panelde, kod solda gerçek
editörde. Kod **öğrencinin kendi bilgisayarında** çalışır; ödevler buradan
teslim edilir. Öğretmen gelen teslimleri aynı eklentiden inceleyip not verir.

## Öğrenci için

1. Eklentiyi kur. Sol alttaki **GoMufi: Giriş Yap**'a tıkla; giriş tarayıcıda
   yapılır (parolan VS Code'a girilmez).
2. Giriş biter bitmez ev dizininde **`GoMufi`** klasörü açılır ve VS Code o
   klasöre geçer; ders paneli sağda açılır.
3. Bir derse tıkla. O dersin klasörü (`GoMufi/<Kurs>/<Modül>`) açılır;
   "Çalıştır" dediğin kod oraya yazılır ve VS Code'un kendi terminalinde çalışır.
4. İstediğin zaman: `Ctrl+Shift+P` → **GoMufi: Dersleri Aç** ya da durum
   çubuğundaki **GoMufi** yazısı. Başka bir projedeyken bile seni ders
   penceresine götürür.

Python gerekiyorsa ve bilgisayarda yoksa eklenti söyler ve indirme sayfasını açar.

### Klasör düzeni

```
GoMufi/
  BENİOKU.md
  Serbest Çalışma/           ← ders seçmeden sitede "Çalıştır" denirse
  <Kurs>/
    <Modül>/                 ← derste açılan görev ve slayt dosyaları
      slayt-<slayt adı>.py
      <görev>/gorev.py
    <Ödev>/                  ← YONERGE.md + cevap.py + .gomufi.json
```

Klasörü değiştirmek için **GoMufi: Ders Klasörünü Değiştir**.

## Öğretmen için

- **Gelen Teslimler** ağacı (bekleyenler üstte) → teslime tıkla, dosya editörde açılır.
- **GoMufi: Not Ver** → not ve geri bildirim.

## Okul laboratuvarı

Ortak bilgisayarlarda ayarlardan **`gomufi.labMode`** açılmalı (makine ayarı):

- VS Code kapanınca oturum kapanır; bir sonraki öğrenci öncekinin hesabıyla açamaz.
- Her öğrencinin dosyaları `GoMufi/<Ad-Kimlik>/` altında ayrı durur.

## Ayarlar

| Ayar | Varsayılan | Ne işe yarar |
|---|---|---|
| `gomufi.siteUrl` | `https://go-mufi.vercel.app` | Giriş ve ders paneli |
| `gomufi.apiUrl` | `https://gomufi-backend.onrender.com` | Sunucu |
| `gomufi.workspaceRoot` | `~/GoMufi` | Ders klasörü |
| `gomufi.labMode` | kapalı | Ortak bilgisayar modu |
| `gomufi.fontFamily`, `gomufi.fontSize` | — | **GoMufi: Tasarımı Uygula** komutunun yazı tipi |

Geliştirmede `siteUrl` = `http://localhost:5173`, `apiUrl` = `http://localhost:8000`.

## Güvenlik

- Oturum anahtarı işletim sisteminin şifre kasasında (`SecretStorage`) durur.
- Sitedeki "Çalıştır" için açılan yerel sunucu yalnızca `127.0.0.1`'i dinler,
  her istekte rastgele bir anahtar ve izinli site adresi ister; yalnızca ders
  penceresi eşleşir.
- Kısıtlı Mod'daki (güvenilmeyen) klasörde kod çalıştırılmaz.
- Yazım kaydı yalnızca GoMufi görev dosyalarını izler; öğrencinin başka hiçbir
  dosyası okunmaz.

## Panel / kod genişliği

Ders paneli ile kod editörünün dengesi slaydın aşamasına göre kurulur (ANLA'da
panel geniş, UYGULA/ÜRET'te kod geniş, QUIZ/ÖDEV'de panel neredeyse tam ekran).
Elle: `Ctrl+Alt+.` panel +%10, `Ctrl+Alt+,` kod +%10, `Ctrl+Alt+0` sıfırla.

## Geliştirme

```bash
cd vscode-extension
npm install
npm run compile      # derle
npm test             # birim testleri
npm run package      # gomufi-<sürüm>.vsix üretir
```

VS Code'da bu klasörü açıp **F5** ile "Extension Development Host" başlat.

### Yayınlama

Site `vscode://gomufi.gomufi/...` bağlantılarını kullanır; bunun çalışması için
eklentinin **gomufi** yayıncı adıyla yayınlanması gerekir:

```bash
npx @vscode/vsce publish          # Visual Studio Marketplace
npx ovsx publish gomufi-*.vsix    # Open VSX (Cursor, VSCodium)
```
