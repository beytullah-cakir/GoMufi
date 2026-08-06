import * as vscode from 'vscode';
import { Api, UnauthorizedError } from './api';
import { answerFileFor } from './assignments';
import { Auth } from './auth';
import { StudentTree, AssignmentItem } from './studentView';
import { SubmissionItem, TeacherTree } from './teacherView';
import type { Assignment } from './types';
import { LocalRunner } from './localRunner';
import { LessonPanel } from './lessonPanel';
import * as hints from './hints';
import * as layout from './layout';
import { applyTheme, offerOnce } from './theme';
import { findMarker, prepareAssignment } from './workspace';

let auth: Auth;
let api: Api;
let studentTree: StudentTree;
let teacherTree: TeacherTree;
let runner: LocalRunner;
let lessons: LessonPanel;
let pairTimer: NodeJS.Timeout | null = null;
let status: vscode.StatusBarItem;

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
    auth = new Auth(ctx);
    api = new Api(auth);
    layout.init(ctx.globalState);
    hints.init(ctx);
    studentTree = new StudentTree(api);
    teacherTree = new TeacherTree(api);

    ctx.subscriptions.push(
        vscode.window.registerTreeDataProvider('gomufi.assignments', studentTree),
        vscode.window.registerTreeDataProvider('gomufi.submissions', teacherTree),
        vscode.commands.registerCommand('gomufi.signIn', signIn),
        vscode.commands.registerCommand('gomufi.signOut', signOut),
        vscode.commands.registerCommand('gomufi.refresh', refreshAll),
        vscode.commands.registerCommand('gomufi.openAssignment', openAssignment),
        vscode.commands.registerCommand('gomufi.submitAssignment', submitAssignment),
        vscode.commands.registerCommand('gomufi.openSubmission', openSubmission),
        vscode.commands.registerCommand('gomufi.gradeSubmission', gradeSubmission),
        vscode.commands.registerCommand('gomufi.openLessons', openLessons),
        vscode.commands.registerCommand('gomufi.applyTheme', applyTheme),
        vscode.commands.registerCommand('gomufi.growLesson', layout.growLesson),
        vscode.commands.registerCommand('gomufi.growEditor', layout.growEditor),
        vscode.commands.registerCommand('gomufi.resetLayout', layout.resetRatio),
        auth.onDidChange((session) => {
            refreshAll();
            void syncPairing();
            // Giriş yapıldığında ders paneli kendiliğinden açılır; çıkışta kapanır
            // ki bir sonraki kullanıcı öncekinin dersini görmesin.
            if (session) void openLessons(); else lessons.close();
        }),
    );

    runner = new LocalRunner();
    lessons = new LessonPanel(ctx, runner);
    status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    status.command = 'gomufi.signIn';
    ctx.subscriptions.push(status, { dispose: () => stopPairing() });

    await auth.restore();
    await syncPairing();

    // Tema teklifi en sona: girişten önce sorulsaydı, kurulumdan hemen sonra iki
    // bildirim üst üste düşerdi. Beklemiyoruz — teklif reddedilse de eklenti çalışır.
    void offerOnce(ctx);
}

/**
 * Sitedeki "Calistir" butonunun bu makineye ulasabilmesi icin yerel sunucuyu
 * baslatir ve adresini GoMufi sunucusuna duyurur.
 *
 * Eslesme kaydi Redis'te TTL ile durur; VS Code kapaninca kendiliginden duser
 * ve site calismayan bir porta istek atmaya devam etmez. Bu yuzden acik
 * kaldigimiz surece duzenli olarak tazeliyoruz.
 */
async function syncPairing(): Promise<void> {
    if (!auth.current) {
        stopPairing();
        runner.stop();
        status.hide();
        return;
    }

    try {
        const port = await runner.start();
        await api.pairRunner(port, runner.token);

        status.text = '$(vm-running) GoMufi bagli';
        status.tooltip = `Sitedeki "Calistir" butonu bu VS Code penceresinde calisacak (port ${port}).`;
        status.command = undefined;
        status.show();

        if (!pairTimer) {
            // Sunucudaki TTL 120 sn; yarisindan once tazelemek baglantiyi kesintisiz tutar.
            pairTimer = setInterval(() => { void refreshPairing(); }, 45_000);
        }
    } catch (err) {
        status.text = '$(warning) GoMufi baglanamadi';
        status.tooltip = (err as Error).message;
        status.show();
    }
}

async function refreshPairing(): Promise<void> {
    if (!auth.current || !runner.running) return;
    try {
        await api.pairRunner(runner.port, runner.token);
    } catch {
        // Gecici ag hatasi olabilir; bir sonraki tik yeniden dener.
    }
}

function stopPairing(): void {
    if (pairTimer) {
        clearInterval(pairTimer);
        pairTimer = null;
    }
}

export function deactivate(): void {
    stopPairing();
    // Eslesmeyi hemen birak ki site "bagli" sanip beklemesin.
    void api.unpairRunner().catch(() => undefined);
    runner.stop();
}

function refreshAll(): void {
    studentTree.refresh();
    teacherTree.refresh();
}

/** 401 durumunda kullanıcıya tek ve anlaşılır bir yol gösterir. */
async function guard(action: () => Promise<void>): Promise<void> {
    try {
        await action();
    } catch (err) {
        if (err instanceof UnauthorizedError) {
            const secim = await vscode.window.showWarningMessage(
                err.message, 'Giriş Yap',
            );
            if (secim === 'Giriş Yap') await signIn();
            return;
        }
        vscode.window.showErrorMessage(`GoMufi: ${(err as Error).message}`);
    }
}

async function signIn(): Promise<void> {
    const cfg = vscode.workspace.getConfiguration('gomufi');
    const apiUrl = cfg.get<string>('apiUrl') || '';
    const siteUrl = cfg.get<string>('siteUrl') || '';
    try {
        const session = await auth.signIn(apiUrl, siteUrl);
        if (session) {
            vscode.window.showInformationMessage(
                `GoMufi: Hoş geldin, ${session.displayName}.`,
            );
        }
    } catch (err) {
        vscode.window.showErrorMessage(`GoMufi: ${(err as Error).message}`);
    }
}

/** Sağdaki ders panelini açar. Oturum yoksa önce girişe yönlendirir. */
async function openLessons(): Promise<void> {
    if (!auth.current) {
        await signIn();
        // signIn başarılıysa onDidChange paneli zaten açar; burada tekrarlamıyoruz.
        return;
    }
    lessons.show(auth.current.token);
}

async function signOut(): Promise<void> {
    await api.unpairRunner().catch(() => undefined);
    await auth.signOut();
    vscode.window.showInformationMessage('GoMufi: Çıkış yapıldı.');
}

/** Ödevi diske hazırlar ve cevap dosyasını açar. */
async function openAssignment(assignment: Assignment): Promise<void> {
    await guard(async () => {
        const answerUri = await prepareAssignment(assignment);
        const folder = vscode.Uri.joinPath(answerUri, '..');

        // Yönergeyi yanda önizleme olarak aç, cevabı düzenlemeye ver.
        await vscode.commands.executeCommand(
            'markdown.showPreviewToSide', vscode.Uri.joinPath(folder, 'YONERGE.md'),
        );
        if (assignment.submissionType === 'code' || assignment.submissionType === 'text') {
            const doc = await vscode.workspace.openTextDocument(answerUri);
            await vscode.window.showTextDocument(doc, vscode.ViewColumn.One);
        } else {
            await vscode.commands.executeCommand('revealFileInOS', folder);
        }
    });
}

/**
 * Teslim. Hangi ödev olduğunu klasördeki `.gomufi.json` söyler — klasör adına
 * güvenilmez, öğrenci yeniden adlandırmış olabilir.
 */
async function submitAssignment(arg?: AssignmentItem): Promise<void> {
    await guard(async () => {
        let courseId: number;
        let nodeId: string;
        let fileUri: vscode.Uri;
        let mime: string;

        if (arg instanceof AssignmentItem) {
            const a = arg.assignment;
            const answerUri = await prepareAssignment(a);
            courseId = a.courseId;
            nodeId = a.nodeId;
            ({ mime } = answerFileFor(a.submissionType));
            fileUri = a.submissionType === 'image' || a.submissionType === 'file'
                ? await pickFile()
                : answerUri;
        } else {
            const active = vscode.window.activeTextEditor?.document.uri;
            if (!active) {
                vscode.window.showWarningMessage(
                    'GoMufi: Önce teslim edeceğin ödevin dosyasını aç.',
                );
                return;
            }
            const found = await findMarker(vscode.Uri.joinPath(active, '..'));
            if (!found) {
                vscode.window.showWarningMessage(
                    'GoMufi: Bu klasör bir GoMufi ödevi değil. Ödevi kenar çubuğundan aç.',
                );
                return;
            }
            courseId = found.marker.courseId;
            nodeId = found.marker.nodeId;
            fileUri = active;
            ({ mime } = answerFileFor(found.marker.submissionType));
        }

        const content = await vscode.workspace.fs.readFile(fileUri);
        const fileName = fileUri.path.split('/').pop() || 'cevap.txt';

        await vscode.window.withProgress(
            { location: vscode.ProgressLocation.Notification, title: 'GoMufi: teslim ediliyor…' },
            () => api.submit(courseId, nodeId, fileName, content, mime),
        );

        vscode.window.showInformationMessage(
            'GoMufi: Ödevin teslim edildi. Öğretmenin değerlendirmesi bekleniyor.',
        );
        refreshAll();
    });
}

async function pickFile(): Promise<vscode.Uri> {
    const picked = await vscode.window.showOpenDialog({
        canSelectMany: false,
        openLabel: 'Teslim Et',
    });
    if (!picked?.length) throw new Error('Dosya seçilmedi.');
    return picked[0];
}

/** Öğretmen: teslimi geçici bir dosyaya yazıp gerçek editörde açar. */
async function openSubmission(item: SubmissionItem): Promise<void> {
    await guard(async () => {
        const s = item.submission;
        if (!s.file_data) {
            vscode.window.showWarningMessage('GoMufi: Bu teslimde dosya içeriği yok.');
            return;
        }
        const bytes = Uint8Array.from(Buffer.from(s.file_data, 'base64'));
        const dir = vscode.Uri.joinPath(
            vscode.Uri.file(require('os').tmpdir()), 'gomufi-teslimler', String(s.id),
        );
        await vscode.workspace.fs.createDirectory(dir);
        const uri = vscode.Uri.joinPath(dir, s.file_name || 'teslim.txt');
        await vscode.workspace.fs.writeFile(uri, bytes);

        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
    });
}

/** Öğretmen: not + geri bildirim. İkisi de boş bırakılamaz (sunucu da reddediyor). */
async function gradeSubmission(item: SubmissionItem): Promise<void> {
    await guard(async () => {
        const s = item.submission;

        const gradeRaw = await vscode.window.showInputBox({
            title: `Not — ${s.student_name}`,
            prompt: '0-100 arası. Boş bırakırsan yalnızca yazılı geri bildirim gönderilir.',
            value: s.grade === null ? '' : String(s.grade),
            validateInput: (v) => {
                if (!v.trim()) return null;
                const n = Number(v);
                return Number.isInteger(n) && n >= 0 && n <= 100
                    ? null
                    : 'Not 0 ile 100 arasında bir tam sayı olmalı.';
            },
        });
        if (gradeRaw === undefined) return;

        const feedback = await vscode.window.showInputBox({
            title: `Geri bildirim — ${s.student_name}`,
            prompt: 'Öğrencinin göreceği yorum.',
            value: s.feedback ?? '',
        });
        if (feedback === undefined) return;

        const grade = gradeRaw.trim() === '' ? null : Number(gradeRaw);
        if (grade === null && !feedback.trim()) {
            vscode.window.showWarningMessage(
                'GoMufi: En az bir not veya geri bildirim gir.',
            );
            return;
        }

        await api.grade(item.courseId, s.id, grade, feedback.trim() || null);
        vscode.window.showInformationMessage('GoMufi: Değerlendirme kaydedildi.');
        refreshAll();
    });
}
