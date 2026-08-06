import * as vscode from 'vscode';

/**
 * Koçun ipucunu öğrencinin KODUNUN yanında gösterir.
 *
 * NEDEN PANELDE DEĞİL: ipucu "3. satırda `sayi` bir metin" diyorsa, öğrencinin
 * o cümleyi panelde okuyup gözüyle 3. satırı bulması gerekir. İki ekran arasında
 * gidip gelmek, ipucunun işaret ettiği şeyi bulmayı ipucunun kendisinden daha
 * zor hale getirebiliyor. Editörde gösterince işaret ile hedef aynı yerde olur.
 *
 * TANI (Diagnostic) KULLANIYORUZ, süslü bir dekorasyon değil: satırın altını
 * çizer, üstüne gelince metni gösterir, Sorunlar panelinde listelenir ve
 * öğrencinin zaten bildiği bir arayüzdür. Severity `Information` — bu bir
 * derleyici hatası değil, öğretmen notu.
 */

let collection: vscode.DiagnosticCollection | null = null;

export function init(ctx: vscode.ExtensionContext): void {
    collection = vscode.languages.createDiagnosticCollection('gomufi');
    ctx.subscriptions.push(collection);
}

/**
 * İpucunu dosyaya iliştirir.
 *
 * `line` 0 ise (koç belirli bir satıra bağlayamadıysa) ipucu ilk satıra
 * konur — uydurma bir satır göstermek öğrenciyi yanlış yere baktırır.
 */
export function show(fsPath: string, message: string, line: number): void {
    if (!collection || !message.trim()) return;

    const uri = vscode.Uri.file(fsPath);
    const doc = vscode.workspace.textDocuments.find((d) => d.uri.fsPath === fsPath);

    // Model dosyanın sonundan büyük bir satır söyleyebilir; kırpmazsak tanı
    // görünmez bir yere düşer ve öğrenci hiçbir şey görmez.
    const lastLine = doc ? Math.max(0, doc.lineCount - 1) : 0;
    const index = Math.min(Math.max(0, line - 1), lastLine);

    const range = doc
        ? doc.lineAt(index).range
        : new vscode.Range(index, 0, index, 200);

    const diagnostic = new vscode.Diagnostic(
        range, `GoMufi ipucu: ${message}`, vscode.DiagnosticSeverity.Information,
    );
    diagnostic.source = 'GoMufi';

    collection.set(uri, [diagnostic]);
}

/** Öğrenci yeniden çalıştırdığında eski ipucu kalmamalı. */
export function clear(fsPath?: string): void {
    if (!collection) return;
    if (fsPath) collection.delete(vscode.Uri.file(fsPath));
    else collection.clear();
}
