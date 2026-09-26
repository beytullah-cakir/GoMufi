import * as vscode from 'vscode';

/**
 * Koçun ipucunu öğrencinin KODUNUN yanında, sıcak amber/sarı ışıltı, dost canlısı AI Koç
 * tonu ve yeşil kutlama efekti ile sunan eğlenceli ve destekçi yapay zekâ asistanı.
 */

let hintDecoration: vscode.TextEditorDecorationType | null = null;
let successDecoration: vscode.TextEditorDecorationType | null = null;
let diagnosticsCollection: vscode.DiagnosticCollection | null = null;

let active: { fsPath: string; line: number; message: string } | null = null;
let activeSuccess: { fsPath: string; message: string; xp: number } | null = null;

export let codeLensProvider: GoMufiCodeLensProvider | null = null;

function formatShortEditorHint(message: string): string {
    const raw = message.trim();
    if (!raw) return '';

    // 1. Önce "görevde", "beklenen", "olmalı", "istenen" kelimelerine en yakın tırnaklı metni yakala
    const expectedNearKey = raw.match(/(?:beklen|görev|olmalı|isten|içeriyor)[^'"]*('[^']+'|"[^"]+")/i);
    if (expectedNearKey && expectedNearKey[1]) {
        const val = expectedNearKey[1].slice(1, -1);
        return `'${val}' yazmayı dene`;
    }

    // 2. Birden fazla tırnak varsa ikincisi genelde beklenen hedeftir ("sadece 'Python' yazıyor ama 'Python harika!' bekleniyor")
    const allMatches = raw.match(/('[^']+'|"[^"]+")/g) || [];
    if (allMatches.length >= 2 && allMatches[1]) {
        const val = allMatches[1].slice(1, -1);
        return `'${val}' yazmayı dene`;
    } else if (allMatches.length === 1 && allMatches[0]) {
        const val = allMatches[0].slice(1, -1);
        return `'${val}' yazmayı dene`;
    }

    if (raw.toLowerCase().includes('print')) {
        return 'print() kullanımını incele';
    }

    if (raw.toLowerCase().includes('parantez')) {
        return 'kapatma parantezini kontrol et';
    }

    const firstSentence = raw.split('.')[0].trim();
    if (firstSentence.length <= 28) {
        return firstSentence;
    }

    return `${firstSentence.slice(0, 26).trimEnd()}…`;
}

export class GoMufiCodeLensProvider implements vscode.CodeLensProvider {
    private _onDidChangeCodeLenses = new vscode.EventEmitter<void>();
    public readonly onDidChangeCodeLenses = this._onDidChangeCodeLenses.event;

    refresh(): void {
        this._onDidChangeCodeLenses.fire();
    }

    provideCodeLenses(doc: vscode.TextDocument): vscode.CodeLens[] {
        if (!doc.uri.fsPath.endsWith('gorev.py') && !doc.uri.fsPath.endsWith('slayt.py')) return [];

        const range = new vscode.Range(0, 0, 0, 0);

        if (activeSuccess) {
            const successLens = new vscode.CodeLens(range, {
                title: `$(pass-filled) GÖREV TAMAMLANDI | +${activeSuccess.xp} XP Kazanıldı!`,
                command: 'gomufi.triggerCheck',
                tooltip: 'Görev başarıyla tamamlandı',
            });
            return [successLens];
        }

        const checkLens = new vscode.CodeLens(range, {
            title: '$(play) Kontrol Et & Gönder',
            command: 'gomufi.triggerCheck',
            tooltip: 'Görevi GoMufi üzerinde çalıştır ve kontrol et',
        });

        const shortHint = active ? formatShortEditorHint(active.message) : '';
        const hintTitle = shortHint ? `$(lightbulb) İpucu: ${shortHint}` : '$(sparkle) GoMufi AI Asistan';
        const hintLens = new vscode.CodeLens(range, {
            title: hintTitle,
            command: 'gomufi.triggerHint',
            tooltip: active ? active.message : 'GoMufi AI Koç İpucu',
        });

        return [checkLens, hintLens];
    }
}

/*
 * Koç önerisini editöre ekleyen "Tab ile kabul et" (satır içi tamamlama) ve
 * "Ctrl + . ile uygula" (hızlı düzeltme) kaldırıldı.
 *
 * NEDEN: öneri metni YZ çıktısından (tırnaklı ya da ters tırnaklı parçalar)
 * çıkarılıyordu. YZ'nin girdisinde öğretmenin görev metni ve öğrencinin kodu
 * var; ikisine de gizlenmiş bir talimatla koça herhangi bir kod söyletilip
 * öğrencinin dosyasına TEK TUŞLA yazdırılabiliyordu. Ayrıca koçun "kod verme"
 * kuralıyla çelişiyordu: ipucu yön gösterir, kodu öğrenci yazar.
 */

export function init(ctx: vscode.ExtensionContext): void {
    // Sıcak Amber/Sarı ışıltı ve samimi AI Koç rozeti
    hintDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(245, 158, 11, 0.16)',
        border: '1.5px dashed rgba(245, 158, 11, 0.65)',
        borderRadius: '4px',
        isWholeLine: true,
        overviewRulerColor: '#f59e0b',
        overviewRulerLane: vscode.OverviewRulerLane.Full,
        after: {
            color: '#ffffff',
            backgroundColor: '#d97706',
            border: '1px solid #b45309',
            fontStyle: 'normal',
            fontWeight: 'bold',
            margin: '0 0 0 1.5em',
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    // Görev başarıyla çözüldüğünde beliren YEŞİL KUTLAMA VURGUSU
    successDecoration = vscode.window.createTextEditorDecorationType({
        backgroundColor: 'rgba(34, 197, 94, 0.22)',
        border: '1.5px dashed rgba(34, 197, 94, 0.75)',
        borderRadius: '4px',
        isWholeLine: true,
        overviewRulerColor: '#22c55e',
        overviewRulerLane: vscode.OverviewRulerLane.Full,
        after: {
            color: '#ffffff',
            backgroundColor: '#15803d',
            border: '1px solid #166534',
            fontStyle: 'normal',
            fontWeight: 'bold',
            margin: '0 0 0 1.5em',
        },
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
    });

    diagnosticsCollection = vscode.languages.createDiagnosticCollection('gomufi-hints');
    codeLensProvider = new GoMufiCodeLensProvider();

    ctx.subscriptions.push(
        hintDecoration,
        successDecoration,
        diagnosticsCollection,
        vscode.languages.registerCodeLensProvider({ scheme: 'file', pattern: '**/*.py' }, codeLensProvider),

        // Öğrenci yazmaya başladı: ipucu görevini yaptı, çekilsin.
        vscode.workspace.onDidChangeTextDocument((e) => {
            if ((active || activeSuccess) && e.contentChanges.length) {
                const fsPath = e.document.uri.fsPath;
                if (active?.fsPath === fsPath || activeSuccess?.fsPath === fsPath) {
                    clear();
                }
            }
        }),

        // Sekme değişince dekorasyon kaybolur; geri dönüldüğünde yeniden çizilir.
        vscode.window.onDidChangeVisibleTextEditors(() => {
            paint();
            paintSuccess();
        }),
    );
}

/**
 * İpucunu gösterir. `line` 0 ise kod içinde varsayılan kod satırı bulunur.
 */
export function show(fsPath: string, message: string, line = 0): void {
    const text = message.trim();
    if (!text) {
        clear();
        return;
    }
    activeSuccess = null;
    active = { fsPath, line, message: text };
    codeLensProvider?.refresh();
    paint();
    paintSuccess();

    const visible = vscode.window.visibleTextEditors
        .some((e) => e.document.uri.fsPath === fsPath);
    if (!visible) {
        void vscode.workspace.openTextDocument(vscode.Uri.file(fsPath)).then(
            (doc) => vscode.window.showTextDocument(doc, {
                preview: false, preserveFocus: true, viewColumn: vscode.ViewColumn.One,
            }).then(() => { paint(); paintSuccess(); }),
            () => undefined,
        );
    }
}

/**
 * Görev doğru çözüldüğünde VS Code editöründe YEŞİL KUTLAMA VURGUSU gösterir.
 */
export function showSuccess(fsPath: string, message = 'Tebrikler! Görevi tamamladın.', xp = 100): void {
    active = null;
    if (diagnosticsCollection) diagnosticsCollection.clear();
    activeSuccess = { fsPath, message, xp };
    codeLensProvider?.refresh();
    paint();
    paintSuccess();
}

export function clear(fsPath?: string): void {
    if (fsPath && active?.fsPath !== fsPath && activeSuccess?.fsPath !== fsPath) return;
    active = null;
    activeSuccess = null;
    if (diagnosticsCollection) diagnosticsCollection.clear();
    codeLensProvider?.refresh();
    paint();
    paintSuccess();
}

function paintSuccess(): void {
    if (!successDecoration) return;

    for (const editor of vscode.window.visibleTextEditors) {
        if (!activeSuccess || editor.document.uri.fsPath !== activeSuccess.fsPath) {
            editor.setDecorations(successDecoration, []);
            continue;
        }

        const doc = editor.document;
        const lastLine = Math.max(0, doc.lineCount - 1);
        let targetLine = -1;
        for (let i = 0; i <= lastLine; i++) {
            const lineText = doc.lineAt(i).text.trim();
            if (lineText && !lineText.startsWith('#')) {
                if (targetLine === -1) targetLine = i;
                if (lineText.includes('print(')) {
                    targetLine = i;
                    break;
                }
            }
        }
        if (targetLine === -1) targetLine = 0;

        const line = doc.lineAt(targetLine);
        // Güvenilmez Markdown: içinde komut bağlantısı çalışmaz (bkz. paint).
        const hover = new vscode.MarkdownString(undefined, true);
        hover.appendMarkdown(`### $(pass-filled) Tebrikler! Görevi Harika Şekilde Tamamladın!\n\n`);
        hover.appendMarkdown(`$(star-full) **+${activeSuccess.xp} XP** Kazandın! Kodun tüm doğruluk testlerini geçti.`);

        editor.setDecorations(successDecoration, [{
            range: line.range,
            renderOptions: { after: { contentText: `  ✓ TEBRİKLER! Görev Tamamlandı (+${activeSuccess.xp} XP)` } },
            hoverMessage: hover,
        }]);
    }
}

function paint(): void {
    if (!hintDecoration) return;

    for (const editor of vscode.window.visibleTextEditors) {
        if (!active || editor.document.uri.fsPath !== active.fsPath) {
            editor.setDecorations(hintDecoration, []);
            if (diagnosticsCollection) diagnosticsCollection.delete(editor.document.uri);
            continue;
        }

        const doc = editor.document;
        const lastLine = Math.max(0, doc.lineCount - 1);

        let targetLine = -1;
        for (let i = 0; i <= lastLine; i++) {
            const lineText = doc.lineAt(i).text.trim();
            if (lineText && !lineText.startsWith('#')) {
                if (targetLine === -1) targetLine = i;
                if (lineText.includes('print(')) {
                    targetLine = i;
                    break;
                }
            }
        }
        if (targetLine === -1) {
            targetLine = active.line > 0 ? Math.min(active.line - 1, lastLine) : 0;
        }

        const index = targetLine;
        const line = doc.lineAt(index);
        const range = line.range;

        const matchString = active.message.match(/('[^']+'|"[^"]+")/g) || [];
        const inlineBadge = formatShortEditorHint(active.message);

        // AI Koç kartı — GÜVENİLMEZ Markdown, HTML kapalı.
        //
        // Koçun mesajı YZ çıktısıdır ve girdisinde öğretmenin görev metni ile
        // öğrencinin kodu var. Eskiden kart `isTrusted = true` idi ve mesaj
        // içine olduğu gibi ekleniyordu: mesaja sızdırılan bir
        // `[tıkla](command:...)` bağlantısı VS Code komutu (ör. terminale komut
        // yazdırma) çalıştırabiliyordu. Artık komut bağlantıları çalışmaz ve
        // YZ'den gelen her şey düz metin olarak (Markdown'dan kaçışlanarak) basılır.
        const hover = new vscode.MarkdownString(undefined, true);
        hover.isTrusted = false;
        hover.supportHtml = false;

        hover.appendMarkdown(`### $(lightbulb) GoMufi AI Koç İpucu (${index + 1}. Satır)\n\n`);

        if (matchString.length >= 2 && matchString[0] && matchString[1]) {
            hover.appendMarkdown(`$(output) **Senin çıktın:** `);
            hover.appendText(matchString[0].slice(1, -1));
            hover.appendMarkdown(`\n\n$(target) **Hedef çıktı:** `);
            hover.appendText(matchString[1].slice(1, -1));
            hover.appendMarkdown(`\n\n`);
        }

        hover.appendMarkdown(`$(lightbulb) **Öneri:** `);
        hover.appendText(active.message);

        editor.setDecorations(hintDecoration, [{
            range,
            renderOptions: { after: { contentText: `  » ${inlineBadge}` } },
            hoverMessage: hover,
        }]);

        // VS Code Diagnostic (Sarı uyarı alt çizgisi)
        if (diagnosticsCollection) {
            const diagRange = line.firstNonWhitespaceCharacterIndex < line.text.length
                ? new vscode.Range(index, line.firstNonWhitespaceCharacterIndex, index, line.text.length)
                : range;
            const diagnostic = new vscode.Diagnostic(
                diagRange,
                `GoMufi AI Koç İpucu (${index + 1}. Satır): ${active.message}`,
                vscode.DiagnosticSeverity.Warning,
            );
            diagnostic.source = 'GoMufi AI';
            diagnosticsCollection.set(doc.uri, [diagnostic]);
        }
    }
}
