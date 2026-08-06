import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { answerFileFor, safeFolderName } from './assignments';
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

export function workspaceRoot(): vscode.Uri {
    const configured = vscode.workspace.getConfiguration('gomufi').get<string>('workspaceRoot');
    const base = configured && configured.trim()
        ? configured.trim()
        : path.join(os.homedir(), 'GoMufi');
    return vscode.Uri.file(base);
}

/**
 * Kök klasörün diskte var olduğundan emin olur; yoksa öğrenciye SORAR.
 *
 * Sessizce ev dizinine klasör açmak istemiyoruz: bu, dersin kodlarının kalıcı
 * olarak nereye yazılacağına dair bir karar ve öğrencinin bilmesi gerekiyor.
 * Seçim `gomufi.workspaceRoot` ayarına yazılır — bir kez sorulur, sonraki
 * derslerde doğrudan oraya gidilir.
 *
 * İptal edilirse null döner ve çağıran hiçbir şey oluşturmaz.
 */
export async function ensureWorkspaceRoot(): Promise<vscode.Uri | null> {
    const root = workspaceRoot();
    try {
        await vscode.workspace.fs.stat(root);
        return root;
    } catch {
        // Klasör yok — devam etmeden önce onay al.
    }

    const OLUSTUR = `Oluştur (${root.fsPath})`;
    const SEC = 'Başka Klasör Seç…';
    const secim = await vscode.window.showInformationMessage(
        'GoMufi ders dosyalarını nereye kaydetsin?',
        { modal: true, detail: 'Her ders için bu klasörün altında ayrı bir çalışma klasörü açılır.' },
        OLUSTUR, SEC,
    );

    if (secim === OLUSTUR) {
        await vscode.workspace.fs.createDirectory(root);
        return root;
    }

    if (secim === SEC) {
        const picked = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            canSelectFiles: false,
            canSelectMany: false,
            openLabel: 'Bu Klasörü Kullan',
            title: 'GoMufi çalışma klasörü',
        });
        if (!picked?.length) return null;

        // Genel ayara yazıyoruz: öğrenci başka bir proje açtığında da aynı yer
        // geçerli olsun — çalışma klasörü kişiye ait, projeye değil.
        await vscode.workspace.getConfiguration('gomufi').update(
            'workspaceRoot', picked[0].fsPath, vscode.ConfigurationTarget.Global,
        );
        await vscode.workspace.fs.createDirectory(picked[0]);
        return picked[0];
    }

    return null;
}

/**
 * Bir ders modülünün çalışma klasörünü hazırlar ve VS Code'un Gezgin'ine ekler.
 *
 * Klasörü çalışma alanına EKLİYORUZ, `vscode.openFolder` ile AÇMIYORUZ: açmak
 * pencereyi yeniden yükler, bu da ders panelini ve çalışan terminali kapatırdı.
 * Eklemek aynı sonucu verir (dosyalar Gezgin'de görünür) ve panel açık kalır.
 */
export async function openLessonFolder(
    courseTitle: string, moduleTitle: string,
): Promise<vscode.Uri | null> {
    const root = await ensureWorkspaceRoot();
    if (!root) return null;

    const folder = vscode.Uri.joinPath(
        root, safeFolderName(courseTitle), safeFolderName(moduleTitle),
    );
    await vscode.workspace.fs.createDirectory(folder);

    const already = (vscode.workspace.workspaceFolders ?? []).some(
        (f) => f.uri.fsPath === folder.fsPath,
    );
    if (!already) {
        vscode.workspace.updateWorkspaceFolders(
            vscode.workspace.workspaceFolders?.length ?? 0, 0,
            { uri: folder, name: `${moduleTitle} — GoMufi` },
        );
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
