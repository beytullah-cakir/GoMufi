import * as crypto from 'crypto';
import * as vscode from 'vscode';
import * as layout from './layout';
import type { LocalRunner } from './localRunner';
import * as hints from './hints';
import { openLessonFolder } from './workspace';

/**
 * Sağdaki ders paneli.
 *
 * NEDEN IFRAME: slayt oynatıcı (LessonSlide) oyunlar, kod widget'ı, WebSocket
 * senkronu ve aşama geçişleriyle birlikte binlerce satır React'tir. Onu burada
 * yeniden yazmak iki ayrı doğruluk kaynağı yaratırdı — öğretmenin builder'da
 * kurduğu bir slayt sitede çalışıp panelde bozulurdu. Bu yüzden panel siteyi
 * gömer; oynatıcı İKİ yerde de aynı koddur.
 *
 * Kimlik köprüyle geçer: webview iframe'in `gomufi:ready` mesajını bekler ve
 * cihaz token'ını yalnızca site kökenine gönderir. Token'ı iframe adresine
 * koymak daha kolay olurdu ama adres geçmişe, referrer'a ve loglara sızardı.
 */

/** Tarayıcıdan gelen "şu slaytta devam et" adresi. */
export interface LessonTarget {
    course?: string;
    module?: string;
    slide?: number;
}

const targetQuery = (target?: LessonTarget): string => {
    if (!target) return '';
    const params = new URLSearchParams();
    if (target.course) params.set('course', target.course);
    if (target.module) params.set('module', target.module);
    if (target.slide) params.set('slide', String(target.slide));
    const query = params.toString();
    return query ? `?${query}` : '';
};

export class LessonPanel {
    private panel: vscode.WebviewPanel | null = null;

    constructor(
        private readonly ctx: vscode.ExtensionContext,
        private readonly runner: LocalRunner,
        /** Öğrenci bir ders seçti (durum çubuğu adını gösterir); '' = panel kapandı. */
        private readonly onLesson: (title: string) => void = () => undefined,
    ) {}

    /**
     * Paneli açar; zaten açıksa öne getirir.
     *
     * `target`: tarayıcıdan "VS Code'a Geç" ile gelindiğinde açılacak slayt.
     * İki yol var çünkü panel HENÜZ YOKSA adresi iframe'in URL'ine koymak
     * gerekiyor (sayfa daha yüklenmedi, mesaj gönderecek kimse yok); panel
     * ZATEN AÇIKSA sayfayı yeniden yüklemek öğrencinin yerini kaybettirir —
     * orada mesajla söylüyoruz.
     */
    show(token: string, target?: LessonTarget): void {
        const siteUrl = siteBase();

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two, true);
            if (target) this.postMessage({ type: 'gomufi:openTarget', ...target });
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'gomufi.lessons',
            'GoMufi Dersler',
            // preserveFocus: panel açılırken imleç editörden kaçmasın — öğrenci
            // ders açtı diye yazdığı kodun ortasından koparılmamalı.
            { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
            {
                enableScripts: true,
                // Panel arkaplandayken de canlı kalsın: WebSocket bağlantısı ve
                // slayt konumu her sekme değişiminde sıfırlanmasın.
                retainContextWhenHidden: true,
            },
        );

        this.panel.webview.html = html(siteUrl, `${siteUrl}/vscode-ders${targetQuery(target)}`);

        this.panel.webview.onDidReceiveMessage(
            (msg) => this.onMessage(msg, token),
            null,
            this.ctx.subscriptions,
        );

        layout.setActive(true);
        this.panel.onDidDispose(() => {
            this.panel = null;
            layout.setActive(false);
            this.onLesson('');
        }, null, this.ctx.subscriptions);
    }

    close(): void {
        this.panel?.dispose();
        this.panel = null;
    }

    /** İframe webview'e dışarıdan mesaj yollar. */
    postMessage(msg: any): void {
        this.panel?.webview.postMessage(msg);
    }

    /** İstek/yanıt mesajlarının cevabını, isteği açan `id` ile geri yollar. */
    private reply(id: unknown, payload: Record<string, unknown>): void {
        if (typeof id !== 'string') return;
        this.panel?.webview.postMessage({ type: 'gomufi:reply', id, ...payload });
    }

    private async onMessage(msg: any, token: string): Promise<void> {
        if (msg?.type === 'gomufi:ready') {
            // İframe hazır olduğunu bildirdi; token'ı ancak şimdi gönderiyoruz.
            this.panel?.webview.postMessage({ type: 'gomufi:init', token });
            return;
        }

        if (msg?.type === 'gomufi:signIn') {
            // Panel 401 aldı ve kullanıcı yeniden giriş istedi. Girişi panel
            // yapamaz — akış tarayıcıda yürüyor; komut eklentinin işi. Giriş
            // bitince `onDidChangeToken` taze token'ı panele geri gönderiyor.
            void vscode.commands.executeCommand('gomufi.signIn');
            return;
        }

        if (msg?.type === 'gomufi:layout') {
            // Slayt aşaması değişti; panel/kod genişlik dengesini ona göre kur.
            await layout.applyStage(String(msg.stage ?? ''));
            return;
        }

        if (msg?.type === 'gomufi:openLesson') {
            // Ders seçildi: o modülün çalışma klasörüne geç. Bundan sonraki her
            // "Çalıştır" oraya yazar ve terminal orada açılır.
            try {
                const moduleTitle = String(msg.moduleTitle ?? 'Ders');
                const folder = await openLessonFolder(String(msg.courseTitle ?? 'GoMufi'), moduleTitle);
                this.runner.setWorkingDir(folder);
                this.onLesson(moduleTitle);
            } catch (err) {
                vscode.window.showErrorMessage(
                    `GoMufi: çalışma klasörü hazırlanamadı — ${(err as Error).message}`,
                );
            }
            return;
        }

        if (msg?.type === 'gomufi:openCode' && typeof msg.code === 'string') {
            // Dar panelde slaydın kod bloğu yerine "editörde aç" şeridi çıkıyor;
            // bu onun karşılığı. Çalıştırmıyoruz — öğrenci sadece bakmak veya
            // düzenlemek istiyor olabilir.
            try {
                await this.runner.open({
                    code: msg.code,
                    language: typeof msg.language === 'string' ? msg.language : undefined,
                    title: typeof msg.title === 'string' ? msg.title : undefined,
                });
            } catch (err) {
                vscode.window.showErrorMessage(`GoMufi: kod açılamadı — ${(err as Error).message}`);
            }
            return;
        }

        // --- UYGULA görevi: istek/yanıt (msg.id ile eşleşir) ------------------
        // Aşağıdaki ikisi tek yönlü mesaj DEĞİL: site cevabı bekliyor, çünkü
        // otomatik kontrol ve YZ koçu öğrencinin gerçek çıktısına dayanıyor.
        if (msg?.type === 'gomufi:prepareTask') {
            try {
                // Gövde OLDUĞU GİBİ geçiyor: çok dosyalı görevlerde `files`,
                // eskilerde `starter` var. Ayrımı runner yapıyor ki iki yüzeyde
                // (panel / tarayıcı) aynı kural işlesin.
                const path = await this.runner.prepareTask(
                    msg, String(msg.language ?? 'python'),
                    msg.slot === 'solution' ? 'solution' : 'student',
                );
                this.reply(msg.id, { ok: true, path });
            } catch (err) {
                this.reply(msg.id, { ok: false, error: (err as Error).message });
            }
            return;
        }

        if (msg?.type === 'gomufi:hint') {
            // Koç bir ipucu üretti; öğrencinin kodunun yanına iliştir.
            const path = this.runner.taskPath(
                String(msg.language ?? 'python'),
                msg.slot === 'solution' ? 'solution' : 'student',
                msg.file,
            );
            if (msg.message) hints.show(path, String(msg.message), Number(msg.line) || 0);
            else hints.clear(path);
            return;
        }

        if (msg?.type === 'gomufi:success') {
            const path = this.runner.taskPath(
                String(msg.language ?? 'python'),
                'student',
                msg.file,
            );
            hints.showSuccess(path, String(msg.message || 'Tebrikler! Görevi tamamladın.'), Number(msg.xp) || 100);
            return;
        }

        if (msg?.type === 'gomufi:revealLine') {
            const line = Number(msg.line) || 1;
            const path = this.runner.taskPath(
                String(msg.language ?? 'python'),
                msg.slot === 'solution' ? 'solution' : 'student',
                msg.file,
            );
            void vscode.workspace.openTextDocument(vscode.Uri.file(path)).then((doc) => {
                void vscode.window.showTextDocument(doc, {
                    viewColumn: vscode.ViewColumn.One,
                    preserveFocus: false,
                }).then((editor) => {
                    const index = Math.min(Math.max(0, line - 1), Math.max(0, doc.lineCount - 1));
                    const pos = new vscode.Position(index, 0);
                    editor.selection = new vscode.Selection(pos, pos);
                    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
                });
            });
            return;
        }

        if (msg?.type === 'gomufi:checkTask') {
            try {
                // Yeni çalıştırma: bir önceki ipucu artık geçersiz olabilir.
                hints.clear(this.runner.taskPath(
                    String(msg.language ?? 'python'),
                    msg.slot === 'solution' ? 'solution' : 'student',
                    msg.entry,
                ));
                const language = String(msg.language ?? 'python');
                const slot = msg.slot === 'solution' ? 'solution' : 'student';

                // Önce görünür terminalde çalıştırmayı dene: öğrenci programı
                // çalışırken görür ve `input()` sorularına kendi cevap verir.
                // Kabuk bunu desteklemiyorsa çıktıyı okuyamayız; o zaman gizli
                // süreç + örnek girdi yoluna düşüyoruz.
                let result = msg.visible === false
                    ? null
                    : await this.runner.runInTerminal(language, slot, msg.entry);

                if (!result) {
                    result = await this.runner.checkTask(
                        language, slot, typeof msg.stdin === 'string' ? msg.stdin : '',
                        msg.entry,
                    );
                }
                this.reply(msg.id, { ok: true, ...result });
            } catch (err) {
                this.reply(msg.id, { ok: false, error: (err as Error).message });
            }
            return;
        }

        if (msg?.type === 'gomufi:run' && typeof msg.code === 'string') {
            try {
                await this.runner.run({
                    code: msg.code,
                    language: typeof msg.language === 'string' ? msg.language : undefined,
                    title: typeof msg.title === 'string' ? msg.title : undefined,
                });
            } catch (err) {
                vscode.window.showErrorMessage(`GoMufi: kod çalıştırılamadı — ${(err as Error).message}`);
            }
        }
    }
}

function siteBase(): string {
    const raw = vscode.workspace.getConfiguration('gomufi').get<string>('siteUrl') || '';
    return raw.replace(/\/+$/, '');
}

/**
 * Webview kabuğu: tam ekran bir iframe ve iki yönlü mesaj aktarımı.
 *
 * CSP `frame-src` yalnızca site kökenini kabul eder; script'imiz satır içi
 * olduğu için nonce ile izinlidir. Böylece panelde siteden başka hiçbir şey
 * çerçevelenemez.
 */
function html(siteOrigin: string, src: string): string {
    const nonce = crypto.randomBytes(16).toString('base64');

    return `<!DOCTYPE html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy"
      content="default-src 'none'; frame-src ${siteOrigin}; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
<style>
  /* Kabuk zemini gömülü sayfayla AYNI olmalı: ders paneli (roadmap ve slaytlar)
     sitedeki gibi beyaz zeminde çiziliyor. Burada VS Code temasının rengini
     kullansaydık koyu temada her açılışta beyaza açılan bir kare flaş olurdu. */
  html, body {
    margin: 0; padding: 0; height: 100%; overflow: hidden;
    background: #ffffff;
  }
  iframe { border: 0; width: 100%; height: 100%; display: block; }
  #hata {
    display: none; position: fixed; inset: 0; background: #ffffff; color: #334155;
    font: 15px/1.5 -apple-system, "Segoe UI", sans-serif; text-align: center;
    flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px;
  }
  #hata.acik { display: flex; }
  #hata b { font-size: 18px; color: #0f172a; }
  #hata button {
    border: 0; border-radius: 12px; padding: 10px 18px; font-weight: 700; cursor: pointer;
    background: #0ea5e9; color: #fff; font-size: 14px;
  }
</style>
</head>
<body>
<iframe id="ders" src="${src}" allow="clipboard-write; autoplay"></iframe>
<div id="hata" role="alert">
  <b>Ders sayfasına ulaşılamadı</b>
  <span>İnternet bağlantını kontrol et. Sorun sürerse öğretmenine haber ver.</span>
  <button id="tekrar" type="button">Tekrar dene</button>
</div>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const frame = document.getElementById('ders');
  const SITE = ${JSON.stringify(siteOrigin)};
  const SRC = ${JSON.stringify(src)};
  const hata = document.getElementById('hata');

  // Site açılmazsa (internet yok, sunucu kapalı) iframe sessizce boş kalıyordu.
  // Sayfa hazır olduğunda 'gomufi:ready' der; belli bir sürede demezse hata
  // ekranı çıkar. Ağ hatasında iframe'in 'error' olayı güvenilir değil.
  let hazir = false;
  let sayac = null;
  function bekle() {
    clearTimeout(sayac);
    sayac = setTimeout(() => { if (!hazir) hata.classList.add('acik'); }, 15000);
  }
  document.getElementById('tekrar').addEventListener('click', () => {
    hata.classList.remove('acik');
    hazir = false;
    frame.src = SRC + (SRC.includes('?') ? '&' : '?') + 't=' + Date.now();
    bekle();
  });
  bekle();

  // Bu pencereye iki ayrı kaynaktan mesaj düşer ve ikisi farklı yöne gider:
  //   - iframe'den (event.source === frame.contentWindow) gelen -> eklentiye
  //   - eklentiden gelen (kaynağı bir pencere DEĞİL, o yüzden source null) -> iframe'e
  // Ayrımı source üzerinden yapıyoruz; origin'e bakmak yetmez, çünkü eklenti
  // mesajları webview'ün kendi kökeniyle görünür.
  window.addEventListener('message', (event) => {
    if (event.source === frame.contentWindow) {
      if (event.origin !== SITE) return;
      if (event.data && event.data.type === 'gomufi:ready') {
        hazir = true;
        hata.classList.remove('acik');
      }
      vscode.postMessage(event.data);
      return;
    }

    // Hedef köken sabit: '*' olsaydı token başka bir sayfaya gömüldüğümüz an sızardı.
    const t = event.data && event.data.type;
    if (t === 'gomufi:init' || t === 'gomufi:reply'
        || t === 'gomufi:openTarget' || t === 'gomufi:runCheckFromVSCode'
        || t === 'gomufi:requestHintFromVSCode') {
      frame.contentWindow.postMessage(event.data, SITE);
    }
  });
</script>
</body>
</html>`;
}
