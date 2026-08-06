import * as vscode from 'vscode';

/**
 * GoMufi görünümü: renk teması + yazı tipleri.
 *
 * NEDEN AYRI BİR KOMUT: renk teması bir `contributes.themes` girdisiyle gelir ve
 * kullanıcı onu tema seçicisinden seçer. Ama yazı tipi tema dosyasından
 * ayarlanamaz — VS Code'da font, temanın değil kullanıcı ayarlarının işi. Ders
 * anlatırken ekrandaki kodun okunaklı ve her makinede aynı görünmesi işin yarısı
 * olduğu için fontu da biz kuruyoruz; ikisini tek komutta topluyoruz ki öğrenci
 * "GoMufi görünümü" derken tek şey anlasın.
 *
 * Ayarlar KULLANICI kapsamına (Global) yazılır, çalışma alanına değil: öğrenci
 * her ödevde yeni bir klasör açıyor, görünüm her seferinde sıfırlanmamalı.
 */

const CODE_FONT =
    "'Cascadia Code', 'JetBrains Mono', 'Fira Code', 'Segoe UI Mono', Consolas, 'Courier New', monospace";

/** Sitedeki gövde fontu. Markdown önizleme ve yönergeler bununla okunur. */
const TEXT_FONT =
    "Nunito, 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif";

type Variant = 'dark' | 'light';

const THEME_NAME: Record<Variant, string> = {
    dark: 'GoMufi Karanlık',
    light: 'GoMufi Aydınlık',
};

/** Komut: görünümü uygula. Hangi varyant sorulur, sonra ayarlar yazılır. */
export async function applyTheme(): Promise<void> {
    const secim = await vscode.window.showQuickPick(
        [
            {
                label: '$(color-mode) GoMufi Karanlık',
                description: 'Gece mavisi zemin, canlı vurgular',
                variant: 'dark' as Variant,
            },
            {
                label: '$(lightbulb) GoMufi Aydınlık',
                description: 'Site ve öğretmen paneliyle aynı beyaz zemin',
                variant: 'light' as Variant,
            },
        ],
        {
            title: 'GoMufi görünümü',
            placeHolder: 'Tema seç — yazı tipleri de birlikte ayarlanır',
        },
    );
    if (!secim) return;

    await apply(secim.variant);
    vscode.window.showInformationMessage(
        `GoMufi: ${THEME_NAME[secim.variant]} teması ve yazı tipleri uygulandı.`,
    );
}

/**
 * İlk kurulumda bir kez sorar. Sessizce uygulamıyoruz — kullanıcının kendi
 * teması varsa habersiz değiştirmek saygısızlık olur; teklif edip bırakıyoruz.
 */
export async function offerOnce(ctx: vscode.ExtensionContext): Promise<void> {
    const KEY = 'gomufi.themeOffered';
    if (ctx.globalState.get<boolean>(KEY)) return;
    await ctx.globalState.update(KEY, true);

    const cevap = await vscode.window.showInformationMessage(
        'GoMufi temasını uygulayalım mı? Renkler ve yazı tipleri site ile aynı olur.',
        'Uygula',
        'Şimdi Değil',
    );
    if (cevap === 'Uygula') await applyTheme();
}

async function apply(variant: Variant): Promise<void> {
    const cfg = vscode.workspace.getConfiguration();
    const gomufi = vscode.workspace.getConfiguration('gomufi');

    const codeFont = (gomufi.get<string>('fontFamily') || '').trim() || CODE_FONT;
    const size = gomufi.get<number>('fontSize') || 15;
    const G = vscode.ConfigurationTarget.Global;

    // Tema. `workbench.preferredDarkColorTheme` da yazılıyor ki sistem
    // aydınlık/karanlık takibi açık olan makinede geri dönüş yaşanmasın.
    await set(cfg, 'workbench.colorTheme', THEME_NAME[variant], G);
    await set(
        cfg,
        variant === 'dark' ? 'workbench.preferredDarkColorTheme' : 'workbench.preferredLightColorTheme',
        THEME_NAME[variant],
        G,
    );

    // Kod yüzeyleri: editör, terminal, hata ayıklama konsolu, notebook çıktısı.
    await set(cfg, 'editor.fontFamily', codeFont, G);
    await set(cfg, 'editor.fontSize', size, G);
    // 1.7 satır aralığı: slaytta iki satır kod yan yana geldiğinde birbirine
    // yapışmasın. VS Code 8'den küçük değerleri çarpan olarak yorumluyor.
    await set(cfg, 'editor.lineHeight', 1.7, G);
    await set(cfg, 'editor.fontLigatures', true, G);
    await set(cfg, 'terminal.integrated.fontFamily', codeFont, G);
    await set(cfg, 'terminal.integrated.fontSize', size - 1, G);
    await set(cfg, 'terminal.integrated.lineHeight', 1.25, G);
    await set(cfg, 'debug.console.fontFamily', codeFont, G);
    await set(cfg, 'debug.console.fontSize', size - 1, G);
    await set(cfg, 'scm.inputFontFamily', 'editor', G);

    // Metin yüzeyleri: yönerge dosyaları markdown önizlemede açılıyor.
    await set(cfg, 'markdown.preview.fontFamily', TEXT_FONT, G);
    await set(cfg, 'markdown.preview.fontSize', 15, G);
    await set(cfg, 'markdown.preview.lineHeight', 1.7, G);

    // Tema renklerinin görünür olması için gereken birkaç davranış: parantez
    // renklendirme paletimizin altı rengini kullanır, aksi halde tema dosyasına
    // yazdığımız editorBracketHighlight renkleri hiç görünmez.
    await set(cfg, 'editor.bracketPairColorization.enabled', true, G);
    await set(cfg, 'editor.guides.bracketPairs', 'active', G);
    await set(cfg, 'editor.cursorBlinking', 'smooth', G);
    await set(cfg, 'editor.cursorSmoothCaretAnimation', 'on', G);
    await set(cfg, 'editor.roundedSelection', true, G);
    await set(cfg, 'editor.renderLineHighlight', 'all', G);
    await set(cfg, 'workbench.iconTheme', 'vs-seti', G);
}

/**
 * Tek bir ayarı yazar; başarısız olursa sessizce geçer.
 *
 * Bir ayar (ör. `editor.fontLigatures`) başka bir eklenti tarafından salt okunur
 * kılınmış olabilir. Tek bir hata yüzünden geri kalan yirmi ayarın yazılmaması
 * kullanıcıya yarım uygulanmış bir tema bırakırdı.
 */
async function set(
    cfg: vscode.WorkspaceConfiguration,
    key: string,
    value: unknown,
    target: vscode.ConfigurationTarget,
): Promise<void> {
    try {
        await cfg.update(key, value, target);
    } catch {
        // Yazılamayan ayar atlanır.
    }
}
