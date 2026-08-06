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

export class LessonPanel {
    private panel: vscode.WebviewPanel | null = null;

    constructor(
        private readonly ctx: vscode.ExtensionContext,
        private readonly runner: LocalRunner,
    ) {}

    /** Paneli açar; zaten açıksa öne getirir. */
    show(token: string): void {
        const siteUrl = siteBase();

        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two, true);
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

        this.panel.webview.html = html(siteUrl, `${siteUrl}/vscode-ders`);

        this.panel.webview.onDidReceiveMessage(
            (msg) => this.onMessage(msg, token),
            null,
            this.ctx.subscriptions,
        );

        layout.setActive(true);
        this.panel.onDidDispose(() => {
            this.panel = null;
            layout.setActive(false);
        }, null, this.ctx.subscriptions);
    }

    close(): void {
        this.panel?.dispose();
        this.panel = null;
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

        if (msg?.type === 'gomufi:layout') {
            // Slayt aşaması değişti; panel/kod genişlik dengesini ona göre kur.
            await layout.applyStage(String(msg.stage ?? ''));
            return;
        }

        if (msg?.type === 'gomufi:openLesson') {
            // Ders seçildi: o modülün çalışma klasörüne geç. Bundan sonraki her
            // "Çalıştır" oraya yazar ve terminal orada açılır.
            try {
                const folder = await openLessonFolder(
                    String(msg.courseTitle ?? 'GoMufi'),
                    String(msg.moduleTitle ?? 'Ders'),
                );
                // İptal edilirse klasör değiştirmiyoruz; ders yine de izlenebilir,
                // kod eski/varsayılan klasöre yazılır.
                if (folder) this.runner.setWorkingDir(folder);
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
                const path = await this.runner.prepareTask(
                    String(msg.starter ?? ''), String(msg.language ?? 'python'),
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
            );
            if (msg.message) hints.show(path, String(msg.message), Number(msg.line) || 0);
            else hints.clear(path);
            return;
        }

        if (msg?.type === 'gomufi:checkTask') {
            try {
                // Yeni çalıştırma: bir önceki ipucu artık geçersiz olabilir.
                hints.clear(this.runner.taskPath(
                    String(msg.language ?? 'python'),
                    msg.slot === 'solution' ? 'solution' : 'student',
                ));
                const result = await this.runner.checkTask(
                    String(msg.language ?? 'python'),
                    msg.slot === 'solution' ? 'solution' : 'student',
                );
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
  /* Kabuk zemini temayla birlikte değişsin: iframe yüklenene kadar görünen bu
     yüzey sabit koyu gri kalsaydı, GoMufi Aydınlık temasında her açılışta bir
     kare siyah flaş olurdu. */
  html, body {
    margin: 0; padding: 0; height: 100%; overflow: hidden;
    background: var(--vscode-editor-background, #131a33);
  }
  iframe { border: 0; width: 100%; height: 100%; display: block; }
</style>
</head>
<body>
<iframe id="ders" src="${src}" allow="clipboard-write; autoplay"></iframe>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  const frame = document.getElementById('ders');
  const SITE = ${JSON.stringify(siteOrigin)};

  // Bu pencereye iki ayrı kaynaktan mesaj düşer ve ikisi farklı yöne gider:
  //   - iframe'den (event.source === frame.contentWindow) gelen -> eklentiye
  //   - eklentiden gelen (kaynağı bir pencere DEĞİL, o yüzden source null) -> iframe'e
  // Ayrımı source üzerinden yapıyoruz; origin'e bakmak yetmez, çünkü eklenti
  // mesajları webview'ün kendi kökeniyle görünür.
  window.addEventListener('message', (event) => {
    if (event.source === frame.contentWindow) {
      if (event.origin !== SITE) return;
      vscode.postMessage(event.data);
      return;
    }

    // Hedef köken sabit: '*' olsaydı token başka bir sayfaya gömüldüğümüz an sızardı.
    const t = event.data && event.data.type;
    if (t === 'gomufi:init' || t === 'gomufi:reply') {
      frame.contentWindow.postMessage(event.data, SITE);
    }
  });
</script>
</body>
</html>`;
}
