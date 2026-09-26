import * as vscode from 'vscode';
import { Api, UnauthorizedError } from './api';
import { answerFileFor } from './assignments';
import { Auth } from './auth';
import { StudentTree, AssignmentItem } from './studentView';
import { SubmissionItem, TeacherTree } from './teacherView';
import type { Assignment } from './types';
import { LocalRunner, initConsent } from './localRunner';
import { LessonPanel, type LessonTarget } from './lessonPanel';
import { EditRecorder } from './editRecorder';
import * as hints from './hints';
import * as layout from './layout';
import { applyTheme, offerOnce } from './theme';
import { checkEnvironment, resetPythonCache } from './environment';
import {
    ensureWorkspaceRoot, findMarker, isLessonsWindow, labMode, prepareAssignment, setLabUser, workspaceRoot,
} from './workspace';

let auth: Auth;
let api: Api;
let studentTree: StudentTree;
let teacherTree: TeacherTree;
let runner: LocalRunner;
let lessons: LessonPanel;
let recorder: EditRecorder;
let pairTimer: NodeJS.Timeout | null = null;
let status: vscode.StatusBarItem;
let extCtx: vscode.ExtensionContext;
let currentLesson = '';
let pairError = '';

/** "Ders klasörüne geçiliyor, açılınca paneli şu slaytta aç" kaydı. */
const PENDING_KEY = 'gomufi.pendingLessons';
/** Bekleyen geçiş bu kadar eskiyse yok sayılır (öğrenci vazgeçmiş olabilir). */
const PENDING_TTL_MS = 3 * 60_000;
const ONBOARD_KEY = 'gomufi.onboardingDone';
/** Kök klasör yeni açıldı; bildirim ders penceresinde gösterilecek. */
const ROOT_NOTICE_KEY = 'gomufi.rootNotice';

interface PendingLessons { at: number; root: string; target: LessonTarget | null }

export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
    extCtx = ctx;
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
        vscode.commands.registerCommand('gomufi.openLessons', () => openLessons()),
        vscode.commands.registerCommand('gomufi.changeRoot', changeRoot),
        vscode.commands.registerCommand('gomufi.applyTheme', applyTheme),
        vscode.commands.registerCommand('gomufi.growLesson', layout.growLesson),
        vscode.commands.registerCommand('gomufi.growEditor', layout.growEditor),
        vscode.commands.registerCommand('gomufi.resetLayout', layout.resetRatio),
        vscode.commands.registerCommand('gomufi.triggerCheck', () => {
            lessons.postMessage({ type: 'gomufi:runCheckFromVSCode' });
        }),
        vscode.commands.registerCommand('gomufi.triggerHint', () => {
            lessons.postMessage({ type: 'gomufi:requestHintFromVSCode' });
        }),
        // Tarayıcıdaki "VS Code'u Aç" butonunun karşılığı.
        //
        // NEDEN AYRI BİR YOL: yerel sunucu görev dosyasını yazıp editörde
        // açabiliyor ama VS Code PENCERESİNİ öne getiremez — işletim sistemi
        // odağı, isteği alan sürecin değil, kullanıcının tıkladığı bağlantının
        // sahibine verir. `vscode://` bağlantısı tam olarak bunu yapıyor:
        // tıklama tarayıcıda, odak VS Code'da.
        vscode.window.registerUriHandler({
            handleUri: async (uri) => {
                const q = new URLSearchParams(uri.query);

                // UYGULA görevi: görev dosyasını öne getir.
                if (uri.path.startsWith('/task')) {
                    // Görev dosyaları ders klasörünün altında; başka bir
                    // pencereden tıklandıysa önce oraya geç.
                    if (!isLessonsWindow()) {
                        await openLessons();
                        return;
                    }
                    try {
                        await runner.revealLine(1, q.get('language') || 'python', 'student');
                    } catch {
                        // Dosya henüz hazırlanmamış olabilir (site /task'ten önce
                        // bağlantıyı açtıysa). Pencere zaten öne geldi; sessiz geç.
                    }
                    return;
                }

                // "VS Code'a Geç": ders panelini aç ve öğrencinin tarayıcıda
                // kaldığı slayda git. Adres olmadan da çalışır — o zaman panel
                // yol haritasında açılır ve öğrenci dersi kendi seçer.
                if (uri.path.startsWith('/lesson')) {
                    await openLessons({
                        course: q.get('course') ?? undefined,
                        module: q.get('module') ?? undefined,
                        slide: Number(q.get('slide')) || 0,
                    });
                }
            },
        }),
        auth.onDidChange((session) => {
            setLabUser(session && labMode() ? { displayName: session.displayName, userId: session.userId } : null);
            refreshAll();
            void syncPairing();
            updateStatus();
            // Çıkışta panel kapanır ki bir sonraki kullanıcı öncekinin dersini görmesin;
            // laboratuvar modunda açık dosyaları da (önceki öğrencinin kodu).
            if (!session) {
                lessons.close();
                if (labMode()) void vscode.commands.executeCommand('workbench.action.closeAllEditors');
            }
        }),
        // Gerçek giriş (tarayıcı onayı): ilk kurulum rehberi + ders klasörüne geç.
        auth.onDidSignIn(() => { void afterSignIn(); }),
        // Başka bir pencereden "Dersleri Aç" denince VS Code zaten açık olan ders
        // penceresini öne getirir — o pencere yeniden başlamaz, bekleyen isteği
        // odağa geldiğinde okur.
        vscode.window.onDidChangeWindowState((state) => {
            if (state.focused) void consumePending();
        }),
        vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('gomufi.workspaceRoot') || e.affectsConfiguration('gomufi.labMode')) {
                void syncPairing();
                updateStatus();
            }
        }),
        vscode.extensions.onDidChange(() => resetPythonCache()),
        // Token tazelendi. Panel token'ı yalnızca el sıkışmada alıyordu; taze
        // olanı ona iletmezsek eklenti geçerli, panel süresi dolmuş bir token
        // kullanmaya devam ederdi.
        auth.onDidChangeToken((token) => {
            if (token) lessons.postMessage({ type: 'gomufi:init', token });
        }),
        { dispose: () => auth.dispose() },
    );

    runner = new LocalRunner();
    initConsent(ctx.globalState);
    lessons = new LessonPanel(ctx, runner, (title) => {
        currentLesson = title;
        updateStatus();
    });
    // Görev dosyalarının yazım kaydı (bkz. editRecorder.ts). Yalnızca sitenin
    // öğrenci için hazırladığı görev klasörlerini izler.
    recorder = new EditRecorder(ctx, api, runner);
    ctx.subscriptions.push(recorder);
    status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
    ctx.subscriptions.push(status, { dispose: () => stopPairing() });

    await auth.restore();
    await syncPairing();
    updateStatus();

    if (auth.current && isLessonsWindow()) {
        // Ders penceresi açıldı: bekleyen bir geçiş varsa onun slaydına, yoksa
        // yol haritasına. Başka pencerelerde panel kendiliğinden AÇILMAZ —
        // öğrencinin kendi projesi ders paneliyle bölünmesin.
        if (!(await consumePending())) lessons.show(auth.current.token);
        void continueOnboarding();
    } else if (!auth.current) {
        void welcomeOnce();
    }
}

/**
 * İlk kurulum, adım adım: giriş → ders klasörü → ders penceresi → ortam
 * (Python) → tema. Eskiden tema teklifi, yazım kaydı bildirimi ve giriş
 * birbirinden habersiz aynı anda çıkıyordu.
 */
async function welcomeOnce(): Promise<void> {
    const KEY = 'gomufi.welcomed';
    if (extCtx.globalState.get<boolean>(KEY)) return;
    await extCtx.globalState.update(KEY, true);
    const GIR = 'Giriş Yap';
    const secim = await vscode.window.showInformationMessage(
        'GoMufi kuruldu! Derslerine başlamak için GoMufi hesabınla giriş yap.', GIR,
    );
    if (secim === GIR) await signIn();
}

async function afterSignIn(): Promise<void> {
    const { created } = await ensureWorkspaceRoot();
    // Bildirim BURADA gösterilmiyor: bir sonraki adımda pencere ders klasörüne
    // geçip yeniden yükleniyor, bildirim de onunla kaybolurdu.
    if (created) await extCtx.globalState.update(ROOT_NOTICE_KEY, true);
    await openLessons(pendingAfterSignIn ?? undefined);
    pendingAfterSignIn = null;
}

/** Ders penceresinde, rehberin kalan adımları (bir kez). */
async function continueOnboarding(): Promise<void> {
    if (extCtx.globalState.get<boolean>(ROOT_NOTICE_KEY)) {
        await extCtx.globalState.update(ROOT_NOTICE_KEY, undefined);
        const DEGISTIR = 'Klasörü Değiştir';
        void vscode.window.showInformationMessage(
            `GoMufi: Ders dosyaların bu klasörde duruyor: ${workspaceRoot().fsPath}`, DEGISTIR,
        ).then((secim) => { if (secim === DEGISTIR) void changeRoot(); });
    }
    if (extCtx.globalState.get<boolean>(ONBOARD_KEY)) return;
    await extCtx.globalState.update(ONBOARD_KEY, true);
    // Sıra önemli: Python eksikse önce o söylenir; tema bir süs, en sona.
    await checkEnvironment();
    await offerOnce(extCtx);
}

/** Girişten önce istenen hedef slayt: giriş bitince oraya gidilir. */
let pendingAfterSignIn: LessonTarget | null = null;

/**
 * "Dersleri Aç": ders klasörüne geç ve paneli aç.
 *
 * - Pencere zaten ders klasöründeyse panel açılır.
 * - Değilse `vscode.openFolder` ile ders klasörüne geçilir. Pencere boşsa
 *   AYNI pencere kullanılır; başka bir proje açıksa ona dokunmadan YENİ
 *   pencerede açılır (VS Code o klasör zaten bir pencerede açıksa onu öne
 *   getirir). Pencere yeniden yüklendiğinde panel bekleyen kayıttan açılır.
 */
async function openLessons(target?: LessonTarget): Promise<void> {
    if (!auth.current) {
        pendingAfterSignIn = target ?? null;
        await signIn();
        return;
    }
    if (isLessonsWindow()) {
        lessons.show(auth.current.token, target);
        void continueOnboarding();
        return;
    }

    const { root } = await ensureWorkspaceRoot();
    const pending: PendingLessons = { at: Date.now(), root: root.fsPath, target: target ?? null };
    await extCtx.globalState.update(PENDING_KEY, pending);
    const hasProject = (vscode.workspace.workspaceFolders?.length ?? 0) > 0
        || vscode.workspace.workspaceFile !== undefined;
    await vscode.commands.executeCommand('vscode.openFolder', root, { forceNewWindow: hasProject });
}

/** Bekleyen "paneli aç" isteği bu pencere içinse yerine getirir. */
async function consumePending(): Promise<boolean> {
    const pending = extCtx.globalState.get<PendingLessons>(PENDING_KEY);
    if (!pending || !auth.current || !isLessonsWindow()) return false;
    await extCtx.globalState.update(PENDING_KEY, undefined);
    if (Date.now() - pending.at > PENDING_TTL_MS || pending.root !== workspaceRoot().fsPath) return false;
    lessons.show(auth.current.token, pending.target ?? undefined);
    void continueOnboarding();
    return true;
}

/** Ders klasörünü değiştir: seçilen klasör ayara yazılır ve oraya geçilir. */
async function changeRoot(): Promise<void> {
    const picked = await vscode.window.showOpenDialog({
        canSelectFolders: true, canSelectFiles: false, canSelectMany: false,
        openLabel: 'Bu Klasörü Kullan', title: 'GoMufi ders klasörü',
        defaultUri: workspaceRoot(),
    });
    if (!picked?.length) return;
    // Kullanıcı ayarına: çalışma klasörü kişiye ait, projeye değil.
    await vscode.workspace.getConfiguration('gomufi').update(
        'workspaceRoot', picked[0].fsPath, vscode.ConfigurationTarget.Global,
    );
    if (auth.current) await openLessons();
}

/** Durum çubuğu: tek bakışta durum, tek tıkla "Dersleri Aç". */
function updateStatus(): void {
    if (!status) return;
    if (!auth.current) {
        status.text = '$(account) GoMufi: Giriş Yap';
        status.tooltip = 'GoMufi hesabınla giriş yap';
        status.command = 'gomufi.signIn';
    } else if (isLessonsWindow()) {
        status.text = pairError ? '$(warning) GoMufi' : `$(book) ${currentLesson || 'GoMufi Dersler'}`;
        status.tooltip = pairError
            ? `Sitedeki "Çalıştır" bu pencereye ulaşamıyor: ${pairError}`
            : `Ders paneli · sitedeki "Çalıştır" bu pencerede çalışır\nKlasör: ${workspaceRoot().fsPath}`;
        status.command = 'gomufi.openLessons';
    } else {
        status.text = '$(book) GoMufi Dersleri';
        status.tooltip = 'Ders klasörüne geç ve dersleri aç';
        status.command = 'gomufi.openLessons';
    }
    status.show();
}

/**
 * Sitedeki "Çalıştır" butonunun bu makineye ulaşabilmesi için yerel sunucuyu
 * başlatır ve adresini GoMufi sunucusuna duyurur.
 *
 * Eşleşme kaydı sunucuda süreli durur; VS Code kapanınca kendiliğinden düşer
 * ve site çalışmayan bir porta istek atmaya devam etmez. Bu yüzden açık
 * kaldığımız sürece düzenli olarak tazeliyoruz.
 */
async function syncPairing(): Promise<void> {
    // YALNIZCA ders penceresi eşleşir. Eskiden açık her VS Code penceresi
    // kendi sunucusunu açıp sunucuya "beni kullan" diyordu; sitedeki
    // "Çalıştır" hangi pencereye düşeceği belli olmadan son söyleyene gidiyordu.
    if (!auth.current || !isLessonsWindow()) {
        stopPairing();
        runner.stop();
        pairError = '';
        return;
    }

    try {
        const port = await runner.start();
        await api.pairRunner(port, runner.token);
        pairError = '';

        if (!pairTimer) {
            // Sunucudaki TTL 120 sn; yarisindan once tazelemek baglantiyi kesintisiz tutar.
            pairTimer = setInterval(() => { void refreshPairing(); }, 45_000);
        }
    } catch (err) {
        pairError = (err as Error).message;
    }
    updateStatus();
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

export function deactivate(): Promise<void> | void {
    // Bekleyen yazım kaydı: kapanışta son bir kez göndermeyi dene.
    void recorder?.flush();
    stopPairing();
    // Eşleşmeyi hemen bırak ki site "bağlı" sanıp beklemesin — ama YALNIZCA bu
    // pencere eşleşmişse: ders penceresi olmayan bir pencere kapanırken ders
    // penceresinin eşleşmesini koparmamalı.
    if (runner?.running) void api.unpairRunner().catch(() => undefined);
    runner?.stop();
    // Laboratuvar modu: ortak bilgisayarda oturum pencereyle birlikte kapanır.
    if (labMode() && auth?.current) return auth.signOut().catch(() => undefined);
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

async function signOut(): Promise<void> {
    if (runner.running) await api.unpairRunner().catch(() => undefined);
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
