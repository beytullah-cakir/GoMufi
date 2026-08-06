# GoMufi — VS Code Eklentisi

Öğrenci ödevlerini VS Code içinde açar, **kendi bilgisayarında** çalıştırır ve teslim eder.
Öğretmen aynı eklentiden gelen teslimleri inceleyip not verir.

## Neden

Kod çalıştırma tarafında eklenti **hiçbir şey yapmaz** — terminal, hata ayıklayıcı, `pip`,
`maven`, dil eklentileri zaten VS Code'da var. Bu yüzden Python dışındaki diller (Java, C++,
C#) tarayıcıda çözülemeyen bir problem olmaktan çıkar ve sunucuda sandbox çalıştırma
maliyeti/riski tamamen ortadan kalkar.

## Kurulum (geliştirme)

```bash
cd vscode-extension
npm install
npm run compile
```

VS Code'da bu klasörü aç ve **F5** ile "Extension Development Host" başlat.

Ayarlar → `gomufi.apiUrl` sunucu adresini gösterecek şekilde ayarlanmalı
(varsayılan `http://localhost:8000`).

## Akış

**Öğrenci**
1. `GoMufi: Giriş Yap` — e-posta + parola
2. Kenar çubuğundaki **Ödevlerim** ağacından bir ödeve tıkla
3. Ödev `~/GoMufi/<Kurs>/<Ödev>/` altına açılır: `YONERGE.md` + `cevap.py`
4. Kodu normal şekilde yaz ve çalıştır (VS Code'un kendi terminali/hata ayıklayıcısı)
5. `GoMufi: Ödevi Teslim Et`
6. Öğretmen not verince ağaçta `85/100` olarak görünür

**Öğretmen**
1. Giriş yap → **Gelen Teslimler** ağacı (bekleyenler üstte)
2. Teslime tıkla → dosya gerçek editörde açılır
3. `GoMufi: Not Ver` → not + geri bildirim

## Görünüm

İki tema gelir: **GoMufi Aydınlık** (site ve öğretmen panelinin beyaz/slate zemini) ve
**GoMufi Karanlık** (aynı palet, gece mavisi zemin üzerinde). Palet doğrudan landing
page'den alınmıştır — sky `#0ea5e9` birincil vurgu, yeşil `#23c55e` eylem rengi,
mor/fuşya `#7c3aed`/`#d946ef` ikincil, sarı `#eab308` uyarı.

`GoMufi: Tasarımı Uygula` komutu temayı seçer **ve** yazı tiplerini
kurar: kodda Cascadia Code → JetBrains Mono → Fira Code → Consolas sırası (ligatür açık,
1.7 satır aralığı), markdown önizlemede sitenin gövde fontu Nunito. Font tema
dosyasından ayarlanamadığı için bu ayrı bir komut; ikisi tek yerde toplanmıştır.
`gomufi.fontFamily` ve `gomufi.fontSize` ile değiştirilebilir. Ayarlar kullanıcı
kapsamına yazılır — öğrenci her ödevde yeni klasör açıyor, görünüm sıfırlanmamalı.

Eklenti ilk kurulduğunda temayı **bir kez teklif eder**, kendiliğinden uygulamaz.

## Panel / kod genişliği

Ders paneli ile kod editörünün genişlik dengesi slaydın aşamasına göre kendiliğinden
kurulur — sabit 50/50 her aşamada yanlış olurdu:

| Aşama | Ders paneli | Kod |
|---|---|---|
| ANLA | %70 | %30 |
| UYGULA · BİRLEŞTİR · ÜRET | %40 | %60 |
| QUIZ · ÖDEV | %94 | şerit |
| Modül listesi | %50 | %50 |

Geçişler 320 ms easeOutCubic ile tweenlenir. `vscode.setEditorLayout` anlık uygulanır
ve CSS geçişi yoktur; oranı adım adım yürütmek animasyonun tek yolu.

Elle ayar: `Ctrl+Alt+.` panel +%10, `Ctrl+Alt+,` kod +%10, `Ctrl+Alt+0` sıfırla.
Sınırlar %15–%94; hiçbir taraf tamamen yok olmaz. Elle yapılan ayar **aşama başına**
saklanır, aynı aşamaya dönüldüğünde geri gelir.

Düzen yalnızca tam iki editör grubu varken uygulanır. Üçüncü bir grup açıksa
`setEditorLayout` onu zorla ikiye indirip dosyaları taşırdı; oranı uygulamamayı
kullanıcının düzenini bozmaya tercih ediyoruz.

## Tasarım notları

- **Token işletim sisteminin şifre kasasında** (`context.secrets`) tutulur. `globalState`
  veya ayarlar kullanılmaz: ikisi de düz metindir ve ayarlar Settings Sync ile başka
  makinelere kopyalanır.
- **Teslim anahtarı** ödev *slaydının* id'sidir, müfredat düğümünün değil. Tarayıcı tarafı
  da aynısını kullanıyor; farklı bir anahtar seçilseydi eklentiden gelen teslimler
  tarayıcıdakilerle eşleşmez, öğretmen ikisini ayrı ödev sanırdı. Bkz. `src/assignments.ts`.
- **`.gomufi.json`** her ödev klasörüne bırakılır. Teslim komutu klasör ADINA güvenmez —
  öğrenci klasörü yeniden adlandırabilir.
- **Cevap dosyasının üzerine yazılmaz.** Ödev yeniden açıldığında `YONERGE.md` tazelenir
  ama öğrencinin yazdığı kod korunur.

## Bilinen sınır

Kod öğrencinin makinesinde çalıştığı için **teslim edilen çıktı doğrulanabilir değildir**.
Otomatik notlandırmanın güvenilir olması gerekirse, teslim edilen dosyanın sunucuda
çalıştırılması gerekir (teslim anında, tuş başına değil — bu çok daha ucuz bir sandbox).
