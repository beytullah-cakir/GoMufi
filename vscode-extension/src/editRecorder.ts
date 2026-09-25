import * as crypto from 'crypto';
import * as path from 'path';
import * as vscode from 'vscode';
import { UnauthorizedError, type Api, type EditChunk } from './api';
import type { LocalRunner, PreparedTask } from './localRunner';

/**
 * Yazım kaydı: GoMufi görev dosyalarında her düzenleme ve KAYNAĞI.
 *
 * Öğretmen, teslim edilen kodun ne kadarının öğrencinin elinden çıktığını
 * görmek istiyor: elle mi yazıldı, dışarıdan mı yapıştırıldı, otomatik
 * tamamlamayla mı geldi, dosya editör dışında mı değişti. Kaynak burada
 * belirleniyor, "son kodun her karakteri nereden geldi" hesabı sunucuda
 * (backend/code_provenance.py).
 *
 * YALNIZCA GÖREV KLASÖRLERİ: öğrencinin başka hiçbir dosyası izlenmez. Bir
 * dosya ancak site onu bir görev olarak hazırladıysa (kurs + görev anahtarıyla)
 * kayda girer.
 *
 * KAYNAK NASIL ANLAŞILIYOR:
 *   - Yapıştırma: VS Code'un yapıştırma API'si her yapıştırmada bize haber
 *     veriyor. Kopyalama VS Code içinde yapıldıysa kopyalama anında kaynağı
 *     işaretliyoruz; işaret yoksa içerik dışarıdan (tarayıcı, sohbet) gelmiş.
 *   - Toplu ekleme: yapıştırma olmadan tek seferde çok satır — otomatik
 *     tamamlama önerisinin (Copilot vb.) kabulü böyle görünür.
 *   - Dış değişiklik: dosya editör dışında değişti (başka program, YZ aracı).
 *   - Geri al / yinele: VS Code değişikliğin sebebini söylüyor.
 *
 * Bu bir KANIT katmanıdır, hüküm değil; arayüz "YZ kullandı" demez.
 */

const COPY_MIME = 'application/vnd.gomufi.copy-source';
const FLUSH_MS = 15_000;
const PASTE_MATCH_MS = 1500;
const MAX_PENDING_CHUNKS = 200;
const TASKS_STATE_KEY = 'gomufi.recordedTasks';
const NOTICE_STATE_KEY = 'gomufi.recordingNoticeShown';

/**
 * Bilinen YZ kod asistanları. Yalnızca bu listedekiler raporlanır —
 * öğrencinin kurduğu diğer eklentiler kimseyi ilgilendirmez.
 */
const AI_EXTENSIONS = [
    'github.copilot', 'github.copilot-chat', 'codeium.codeium', 'tabnine.tabnine-vscode',
    'continue.continue', 'amazonwebservices.amazon-q-vscode', 'supermaven.supermaven',
    'saoudrizwan.claude-dev', 'rooveterinaryinc.roo-cline', 'google.geminicodeassist',
    'sourcegraph.cody-ai', 'anthropic.claude-code', 'blackboxapp.blackbox', 'codium.codium',
    'qodo.qodo-gen', 'bito.bito', 'danielsanmedium.dscodegpt', 'genieai.chatgpt-vscode',
];

interface TaskInfo {
    courseId: number;
    taskKey: string;
}

type Op = [number, number, number, string, string];

interface FileBuffer {
    task: TaskInfo;
    file: string;
    seq: number;
    startedAt: number | null;
    baseText: string | null;
    ops: Op[];
}

interface PendingChunk {
    task: TaskInfo;
    chunk: EditChunk;
}

const norm = (p: string) => (process.platform === 'win32' ? p.toLowerCase() : p);
const stripWs = (text: string) => text.replace(/\s+/g, '');
const eol = (text: string) => text.replace(/\r\n/g, '\n');

export class EditRecorder implements vscode.Disposable {
    /** Görev klasörü -> kurs/görev. VS Code yeniden açılınca da bilinsin diye saklanır. */
    private readonly tasks = new Map<string, TaskInfo>();
    private readonly buffers = new Map<string, FileBuffer>();
    /** Dosyanın bildiğimiz son metni: değişiklik öncesini ve dış değişikliği buradan anlıyoruz. */
    private readonly lastText = new Map<string, string>();
    private readonly pending: PendingChunk[] = [];
    private pendingPaste: { file: string; text: string; at: number; kind: string } | null = null;
    private readonly session = crypto.randomBytes(8).toString('hex');
    private readonly disposables: vscode.Disposable[] = [];
    private timer: NodeJS.Timeout | null = null;
    private flushing = false;

    constructor(
        private readonly ctx: vscode.ExtensionContext,
        private readonly api: Api,
        private readonly runner: LocalRunner,
    ) {
        for (const [dir, info] of Object.entries(ctx.globalState.get<Record<string, TaskInfo>>(TASKS_STATE_KEY) ?? {})) {
            this.tasks.set(dir, info);
        }
        this.disposables.push(
            runner.onDidPrepareTask((task) => { void this.onPrepared(task); }),
            runner.onWillCheckTask((dir) => { void this.syncFromDisk(dir).then(() => this.flush()); }),
            vscode.workspace.onDidChangeTextDocument((e) => this.onChange(e)),
            vscode.workspace.onDidOpenTextDocument((doc) => this.remember(doc)),
            vscode.languages.registerDocumentPasteEditProvider(
                { scheme: 'file' },
                {
                    prepareDocumentPaste: (doc, _ranges, data) => this.onCopy(doc, data),
                    provideDocumentPasteEdits: async (doc, _ranges, data) => {
                        await this.onPaste(doc, data);
                        // Hiçbir düzenleme önermiyoruz: yapıştırmayı VS Code her zamanki
                        // gibi yapar, biz yalnızca olduğunu öğreniyoruz.
                        return undefined;
                    },
                },
                {
                    providedPasteEditKinds: [vscode.DocumentDropOrPasteEditKind.Text],
                    pasteMimeTypes: ['text/plain'],
                    copyMimeTypes: [COPY_MIME],
                },
            ),
        );
        for (const doc of vscode.workspace.textDocuments) this.remember(doc);
        this.timer = setInterval(() => { void this.flush(); }, FLUSH_MS);
    }

    dispose(): void {
        if (this.timer) clearInterval(this.timer);
        this.disposables.forEach((d) => d.dispose());
    }

    // --- görevler ---------------------------------------------------------

    private taskFor(fsPath: string): TaskInfo | undefined {
        return this.tasks.get(norm(path.dirname(fsPath)));
    }

    private async onPrepared(prepared: PreparedTask): Promise<void> {
        // Site kurs/görev göndermediyse (öğretmen önizlemesi, eski site) kayıt yok.
        if (prepared.courseId === undefined || !prepared.taskKey) return;
        const info: TaskInfo = { courseId: prepared.courseId, taskKey: prepared.taskKey };
        this.tasks.set(norm(prepared.dir.fsPath), info);
        await this.ctx.globalState.update(TASKS_STATE_KEY, Object.fromEntries(this.tasks));
        void this.showNoticeOnce();

        for (const name of prepared.files) {
            const uri = vscode.Uri.joinPath(prepared.dir, name);
            const open = vscode.workspace.textDocuments.find((d) => norm(d.uri.fsPath) === norm(uri.fsPath));
            try {
                const text = open ? open.getText() : new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
                // Oturumun ilk paketi dosyanın bu anki tam metnini taşır: sunucu
                // başlangıç kodunu ve eklenti kapalıyken olan değişikliği buradan anlar.
                this.ensureBuffer(uri.fsPath, info, text);
                this.lastText.set(norm(uri.fsPath), text);
            } catch {
                /* dosya henüz yok — ilk düzenlemede tanınır */
            }
        }
    }

    private async showNoticeOnce(): Promise<void> {
        if (this.ctx.globalState.get<boolean>(NOTICE_STATE_KEY)) return;
        await this.ctx.globalState.update(NOTICE_STATE_KEY, true);
        void vscode.window.showInformationMessage(
            'GoMufi: Görev dosyalarındaki yazım sürecin (yazma, silme, yapıştırma) öğretmeninle '
            + 'paylaşılır. Öğretmenin nerede zorlandığını görüp sana yardım edebilsin diye. '
            + 'Başka dosyaların izlenmez.',
            'Anladım',
        );
    }

    private remember(doc: vscode.TextDocument): void {
        if (doc.uri.scheme !== 'file' || !this.taskFor(doc.uri.fsPath)) return;
        const key = norm(doc.uri.fsPath);
        if (!this.lastText.has(key)) this.lastText.set(key, doc.getText());
    }

    private ensureBuffer(fsPath: string, task: TaskInfo, baseText: string): FileBuffer {
        const key = norm(fsPath);
        let buffer = this.buffers.get(key);
        if (!buffer) {
            buffer = { task, file: path.basename(fsPath), seq: 0, startedAt: null, baseText, ops: [] };
            this.buffers.set(key, buffer);
        }
        return buffer;
    }

    // --- kopyala / yapıştır ------------------------------------------------

    private onCopy(doc: vscode.TextDocument, data: vscode.DataTransfer): void {
        // Kaynağın ADI değil TÜRÜ işaretleniyor: öğrencinin kendi başka bir
        // dosyasından kopyaladığında o dosyanın adı kayda geçmemeli.
        const root = norm(this.runner.workingRoot().fsPath);
        const fsPath = norm(doc.uri.fsPath);
        const lesson = path.dirname(fsPath) === root && /^slayt\./i.test(path.basename(fsPath));
        data.set(COPY_MIME, new vscode.DataTransferItem(lesson ? 'lesson' : 'vscode'));
    }

    private async onPaste(doc: vscode.TextDocument, data: vscode.DataTransfer): Promise<void> {
        if (!this.taskFor(doc.uri.fsPath)) return;
        const text = await data.get('text/plain')?.asString();
        if (!text) return;
        const source = await data.get(COPY_MIME)?.asString();
        this.pendingPaste = {
            file: norm(doc.uri.fsPath),
            text: eol(text),
            at: Date.now(),
            kind: source === 'lesson' ? 'l' : source ? 'c' : 'p',
        };
    }

    // --- düzenlemeler --------------------------------------------------------

    private onChange(e: vscode.TextDocumentChangeEvent): void {
        const doc = e.document;
        if (doc.uri.scheme !== 'file' || !e.contentChanges.length) return;
        const task = this.taskFor(doc.uri.fsPath);
        if (!task) return;

        const key = norm(doc.uri.fsPath);
        let before = this.lastText.get(key);
        if (before === undefined) {
            // İlk kez görüyoruz ve öncesini bilmiyoruz: değişikliği geri sararak
            // bulmak yerine şimdiki metni temel alıyoruz — bu tek düzenleme
            // kaybolur ama kayıt kaymaz.
            this.lastText.set(key, doc.getText());
            this.ensureBuffer(doc.uri.fsPath, task, doc.getText());
            return;
        }
        const buffer = this.ensureBuffer(doc.uri.fsPath, task, before);
        const now = Date.now();
        if (buffer.startedAt === null) buffer.startedAt = now;

        const paste = this.pendingPaste && this.pendingPaste.file === key
            && now - this.pendingPaste.at <= PASTE_MATCH_MS ? this.pendingPaste : null;

        for (const change of e.contentChanges) {
            const deleted = before.substr(change.rangeOffset, change.rangeLength);
            const kind = this.classify(e.reason, change.text, deleted, paste, doc.isDirty);
            buffer.ops.push([now - buffer.startedAt, change.rangeOffset, change.rangeLength, change.text, kind]);
            before = before.slice(0, change.rangeOffset) + change.text
                + before.slice(change.rangeOffset + change.rangeLength);
        }
        if (paste) this.pendingPaste = null;
        this.lastText.set(key, doc.getText());
    }

    private classify(
        reason: vscode.TextDocumentChangeReason | undefined, inserted: string, deleted: string,
        paste: { text: string; kind: string } | null, dirty: boolean,
    ): string {
        if (reason === vscode.TextDocumentChangeReason.Undo) return 'u';
        if (reason === vscode.TextDocumentChangeReason.Redo) return 'r';
        if (paste && inserted && (eol(inserted) === paste.text || paste.text.includes(eol(inserted)))) {
            return paste.kind;
        }
        // Belge değişiklikten sonra KİRLİ DEĞİLSE içerik diskten geldi: dosya
        // editör dışında değişti ve VS Code yeniden yükledi.
        if (!dirty && inserted.length > 2) return 'e';
        if (deleted && inserted && stripWs(deleted) === stripWs(inserted)) return 'f';
        if (inserted.length <= 2 || !inserted.trim()) return 't';
        if (!inserted.includes('\n') && inserted.length <= 40) return 'a';
        return 'b';
    }

    /**
     * Kapalı sekmedeki bir dosya diskte değiştiyse (başka bir program, dosyaya
     * yazan bir araç) bunu değişiklik olayından öğrenemeyiz; kontrol öncesi
     * diskteki metni bildiğimizle karşılaştırıyoruz.
     */
    private async syncFromDisk(dir: vscode.Uri): Promise<void> {
        const task = this.tasks.get(norm(dir.fsPath));
        if (!task) return;
        for (const [key, known] of this.lastText) {
            if (path.dirname(key) !== norm(dir.fsPath)) continue;
            const open = vscode.workspace.textDocuments.find((d) => norm(d.uri.fsPath) === key);
            if (open && !open.isClosed) continue;   // açık belgeleri olay zaten bildiriyor
            let disk: string;
            try {
                const buffer = this.buffers.get(key);
                const uri = vscode.Uri.file(buffer ? path.join(dir.fsPath, buffer.file) : key);
                disk = new TextDecoder().decode(await vscode.workspace.fs.readFile(uri));
            } catch {
                continue;
            }
            if (disk === known) continue;
            const buffer = this.ensureBuffer(key, task, known);
            const now = Date.now();
            if (buffer.startedAt === null) buffer.startedAt = now;
            let start = 0;
            while (start < known.length && start < disk.length && known[start] === disk[start]) start++;
            let end = 0;
            while (end < known.length - start && end < disk.length - start
                && known[known.length - 1 - end] === disk[disk.length - 1 - end]) end++;
            buffer.ops.push([now - buffer.startedAt, start, known.length - start - end,
                disk.slice(start, disk.length - end), 'e']);
            this.lastText.set(key, disk);
        }
    }

    // --- gönderim --------------------------------------------------------------

    private aiExtensions(): string[] {
        return vscode.extensions.all
            .filter((ext) => AI_EXTENSIONS.includes(ext.id.toLowerCase()))
            .map((ext) => ext.id);
    }

    async flush(): Promise<void> {
        if (this.flushing) return;
        this.flushing = true;
        try {
            for (const buffer of this.buffers.values()) {
                if (!buffer.ops.length && buffer.baseText === null) continue;
                this.pending.push({
                    task: buffer.task,
                    chunk: {
                        file: buffer.file,
                        session: this.session,
                        seq: buffer.seq++,
                        started_at_ms: buffer.startedAt ?? Date.now(),
                        base_text: buffer.baseText,
                        ops: buffer.ops,
                    },
                });
                buffer.ops = [];
                buffer.startedAt = null;
                buffer.baseText = null;
            }
            // Ağ yokken birikenler sınırlı: sonsuza kadar bellekte tutulmaz.
            if (this.pending.length > MAX_PENDING_CHUNKS) {
                this.pending.splice(0, this.pending.length - MAX_PENDING_CHUNKS);
            }

            const groups = new Map<string, PendingChunk[]>();
            for (const item of this.pending) {
                const key = `${item.task.courseId}|${item.task.taskKey}`;
                groups.set(key, [...(groups.get(key) ?? []), item]);
            }
            const version = String(this.ctx.extension.packageJSON?.version ?? '');
            const ai = this.aiExtensions();
            for (const items of groups.values()) {
                for (let i = 0; i < items.length; i += 20) {
                    const slice = items.slice(i, i + 20);
                    try {
                        await this.api.postEdits({
                            course_id: slice[0].task.courseId,
                            task_key: slice[0].task.taskKey,
                            client: 'vscode',
                            ext_version: version,
                            ai_extensions: ai,
                            chunks: slice.map((s) => s.chunk),
                        });
                        slice.forEach((s) => this.pending.splice(this.pending.indexOf(s), 1));
                    } catch (err) {
                        // Oturum yoksa (giriş yapılmamış) kayıt gönderilemez ve
                        // beklemesi de anlamsız; ağ hatasında sonraki turda yeniden denenir.
                        if (err instanceof UnauthorizedError) {
                            slice.forEach((s) => this.pending.splice(this.pending.indexOf(s), 1));
                        }
                    }
                }
            }
        } finally {
            this.flushing = false;
        }
    }
}
