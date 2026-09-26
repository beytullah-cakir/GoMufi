import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { answerFileFor } from './assignments';
import { isSameOrInside, labFolderName, safeFolderName } from './paths';
import type { Assignment, AssignmentMarker } from './types';

/**
 * Ödevin öğrencinin diskindeki karşılığı.
 *
 * Klasör yapısı:
 *   <kök>/<Kurs Adı>/<Ödev Adı>/
 *       YONERGE.md      — görev metni (salt okunur bilgi)
 *       cevap.py        — öğrencinin çalışacağı dosya
 *       .gomufi.json    — klasörü sunucudaki ödeve bağlayan işaret
 *
 * `.gomufi.json` olmadan "bu klasör hangi ödev?" sorusunun cevabı yok; teslim
 * komutu klasör adına GÜVENMEZ çünkü öğrenci klasörü yeniden adlandırabilir.
 */

const MARKER = '.gomufi.json';

/**
 * Laboratuvar modunda oturum açan öğrenci: kök klasörün altında ona ait bir
 * alt klasör kullanılır ki aynı bilgisayardaki öğrencilerin dosyaları karışmasın.
 */
let labUser: { displayName: string; userId: string } | null = null;

export function setLabUser(user: { displayName: string; userId: string } | null): void {
    labUser = user;
}

export function labMode(): boolean {
    return vscode.workspace.getConfiguration('gomufi').get<boolean>('labMode') === true;
}

/** Ayardaki kök ya da ev dizinindeki `GoMufi` — kişiden bağımsız temel klasör. */
export function baseRoot(): vscode.Uri {
    const configured = vscode.workspace.getConfiguration('gomufi').get<string>('workspaceRoot');
    const base = configured && configured.trim()
        ? configured.trim()
        : path.join(os.homedir(), 'GoMufi');
    return vscode.Uri.file(base);
}

/**
 * Derslerin, ödevlerin ve slayt kodlarının TEK kökü.
 *
 * Eskiden üç ayrı düzen vardı (ödevler `~/GoMufi/<Kurs>`, modüller sorulan bir
 * kökte, "Çalıştır" `~/GoMufi/Calisma`'da) ve öğrenci dosyalarının nerede
 * olduğunu bilemiyordu. Artık hepsi bu klasörün altında.
 */
export function workspaceRoot(): vscode.Uri {
    const base = baseRoot();
    return labMode() && labUser
        ? vscode.Uri.joinPath(base, labFolderName(labUser.displayName, labUser.userId))
        : base;
}

const README = `# GoMufi Derslerim

Bu klasörü GoMufi eklentisi oluşturdu. Derslerde yazdığın kodlar burada durur:

    <Kurs>/<Modül>/      → derste açılan görev ve slayt dosyaları
    <Kurs>/<Ödev>/       → ödevin yönergesi (YONERGE.md) ve cevabın

Dosyaları silmediğin sürece kodların kaybolmaz; bir dersi tekrar açtığında
kaldığın yerden devam edersin.

Klasörü değiştirmek için: Ayarlar → "gomufi.workspaceRoot".
`;

/**
 * Kök klasörün diskte olduğundan emin olur — SORMADAN.
 *
 * Eskiden ilk derste ekranı kilitleyen bir "nereye kaydedeyim?" penceresi
 * çıkıyordu; öğrenci için anlamsız bir karar. Artık ev dizininde `GoMufi`
 * klasörü kendiliğinden açılır ve ilk kurulumda bir kez "burada" denir
 * (değiştirmek isteyen ayardan değiştirir). İlk kez oluşturulduysa true döner.
 */
export async function ensureWorkspaceRoot(): Promise<{ root: vscode.Uri; created: boolean }> {
    const root = workspaceRoot();
    try {
        await vscode.workspace.fs.stat(root);
        return { root, created: false };
    } catch {
        // yok — oluştur
    }
    await vscode.workspace.fs.createDirectory(root);
    try {
        await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(root, 'BENİOKU.md'), encode(README));
    } catch {
        // Açıklama dosyası süs; yazılamazsa klasör yine de kullanılabilir.
    }
    return { root, created: true };
}

/** Bu pencere GoMufi ders klasöründe mi (ya da onun altındaki bir klasörde)? */
export function isLessonsWindow(): boolean {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length !== 1 || folders[0].uri.scheme !== 'file') return false;
    return isSameOrInside(workspaceRoot().fsPath, folders[0].uri.fsPath);
}

/**
 * Bir ders modülünün çalışma klasörünü hazırlar ve Gezgin'de gösterir.
 *
 * Klasör çalışma alanına EKLENMEZ: eskiden her modül ayrı bir kök olarak
 * ekleniyordu — 10 dersten sonra Gezgin'de 10 kök oluyordu, öğrencinin kendi
 * projesi açıksa GoMufi klasörleri onun içine karışıyordu, boş pencerede ise
 * ilk ekleme VS Code'un tüm eklentileri yeniden başlatmasına (panel ve
 * terminal kapanır) yol açıyordu. Artık pencere zaten ders kökünde açık
 * (bkz. extension.ts → openLessons); modül onun altında bir klasör.
 */
export async function openLessonFolder(
    courseTitle: string, moduleTitle: string,
): Promise<vscode.Uri> {
    const { root } = await ensureWorkspaceRoot();
    const folder = vscode.Uri.joinPath(
        root, safeFolderName(courseTitle), safeFolderName(moduleTitle),
    );
    await vscode.workspace.fs.createDirectory(folder);
    if (isLessonsWindow()) {
        // Gezgin'de klasörü aç ama odağı editörden/panelden çalma.
        void vscode.commands.executeCommand('revealInExplorer', folder).then(undefined, () => undefined);
    }
    return folder;
}

export function assignmentFolder(a: Assignment): vscode.Uri {
    return vscode.Uri.joinPath(
        workspaceRoot(), safeFolderName(a.courseTitle), safeFolderName(a.title),
    );
}

const encode = (text: string) => new TextEncoder().encode(text);

/**
 * Ödevi diske hazırlar ve cevap dosyasını döner.
 * Var olan cevap dosyasının ÜZERİNE YAZMAZ — öğrencinin emeği kaybolmamalı.
 */
export async function prepareAssignment(a: Assignment): Promise<vscode.Uri> {
    const folder = assignmentFolder(a);
    await vscode.workspace.fs.createDirectory(folder);

    const { name: answerName } = answerFileFor(a.submissionType);
    const answerUri = vscode.Uri.joinPath(folder, answerName);

    // Yönerge her açılışta tazelenir (öğretmen güncellemiş olabilir).
    const brief = [
        `# ${a.title}`,
        '',
        `**Kurs:** ${a.courseTitle}  `,
        `**Ödül:** ${a.points} XP  `,
        `**Teslim türü:** ${a.submissionType}`,
        '',
        '---',
        '',
        a.instructions || '_Yönerge yazılmamış._',
        '',
        '---',
        '',
        a.submissionType === 'code' || a.submissionType === 'text'
            ? `Cevabını \`${answerName}\` dosyasına yaz, sonra **GoMufi: Ödevi Teslim Et** komutunu çalıştır.`
            : 'Teslim edeceğin dosyayı **GoMufi: Ödevi Teslim Et** komutuyla seç.',
    ].join('\n');
    await vscode.workspace.fs.writeFile(vscode.Uri.joinPath(folder, 'YONERGE.md'), encode(brief));

    const marker: AssignmentMarker = {
        courseId: a.courseId,
        nodeId: a.nodeId,
        title: a.title,
        submissionType: a.submissionType,
        answerFile: answerName,
    };
    await vscode.workspace.fs.writeFile(
        vscode.Uri.joinPath(folder, MARKER), encode(JSON.stringify(marker, null, 2)),
    );

    // Cevap dosyası yalnızca YOKSA oluşturulur.
    if (a.submissionType === 'code' || a.submissionType === 'text') {
        try {
            await vscode.workspace.fs.stat(answerUri);
        } catch {
            const seed = a.submissionType === 'code'
                ? (a.starterCode || '# Kodunu buraya yaz\n')
                : '';
            await vscode.workspace.fs.writeFile(answerUri, encode(seed));
        }
    }

    return answerUri;
}

/** Verilen dosyanın bulunduğu ödev klasörünü yukarı doğru arar. */
export async function findMarker(
    start: vscode.Uri,
): Promise<{ folder: vscode.Uri; marker: AssignmentMarker } | null> {
    let dir = start;
    // Kök dizine kadar en fazla birkaç seviye — sonsuz döngü olmasın.
    for (let i = 0; i < 8; i++) {
        const candidate = vscode.Uri.joinPath(dir, MARKER);
        try {
            const raw = await vscode.workspace.fs.readFile(candidate);
            return { folder: dir, marker: JSON.parse(new TextDecoder().decode(raw)) };
        } catch {
            const parent = vscode.Uri.joinPath(dir, '..');
            if (parent.fsPath === dir.fsPath) break;
            dir = parent;
        }
    }
    return null;
}
