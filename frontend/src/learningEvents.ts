import api, { getApiBaseUrl, getBearerToken } from './api';

/**
 * Öğrenme kaydı istemcisi: öğretmenin "kim nerede takıldı" sayfasının veri kaynağı.
 *
 * İKİ AKIŞ:
 *   - Olaylar (`/analytics/events`): kontrol sonucu, ipucu, quiz cevabı, modül bitişi.
 *   - Yazım kaydı (`/analytics/edits`): tarayıcı editöründeki her düzenleme ve kaynağı
 *     (elle yazma / yapıştırma / geri alma). VS Code'daki yazımı eklenti kendisi gönderir.
 *
 * Kayıt ÖĞRENCİYİ ASLA BEKLETMEZ: kuyruğa yazılır, birkaç saniyede bir toplu
 * gönderilir; başarısız olursa bir kez daha denenir ve sonra bırakılır. Analitik
 * uğruna öğrencinin kontrol düğmesi yavaşlamamalı.
 *
 * Sayfa kapanırken bekleyenler `fetch(keepalive)` ile yollanır — axios o anda
 * isteği tamamlayamıyor.
 */

export interface LearningCheck {
    id: string;
    kind: string;
    label: string;
    status: string;
    detail?: string;
    value?: string;
    conceptId?: string;
}

export interface LearningEvent {
    type: 'check' | 'hint_opened' | 'quiz_answer' | 'module_completed' | 'slide_answer';
    task_key?: string;
    node_id?: string;
    outcome?: 'pass' | 'fail' | 'error' | 'ran';
    attempt?: number;
    checks?: LearningCheck[];
    stderr?: string;
    code?: string;
    duration_ms?: number;
    client?: string;
    question_id?: number;
    correct?: boolean;
    answer?: string;
    /** slide_answer: çoktan seçmeli (element_id + selected) ya da oyun (items) */
    slide_id?: string;
    element_id?: string;
    selected?: string[];
    items?: GameItem[];
}

/** Oyunda öğrencinin bir öğeyi nereye koyduğu: item → chosen (doğrusu expected). */
export interface GameItem { item: string; chosen?: string | null; expected?: string | null; correct: boolean }

const FLUSH_DELAY_MS = 3000;
const MAX_BATCH = 20;
const MAX_CODE = 8 * 1024;

const eventQueues = new Map<string, LearningEvent[]>();
let eventTimer: ReturnType<typeof setTimeout> | null = null;

const postKeepalive = (path: string, body: unknown) => {
    const token = getBearerToken();
    void fetch(`${getApiBaseUrl()}${path}`, {
        method: 'POST',
        keepalive: true,
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
    }).catch(() => undefined);
};

const sendEvents = async (courseId: string, events: LearningEvent[], unloading: boolean) => {
    const body = { course_id: Number(courseId), events };
    if (unloading) {
        postKeepalive('/analytics/events', body);
        return;
    }
    try {
        await api.post('/analytics/events', body);
    } catch (err: any) {
        // 4xx: istek geçersiz (öğrenci değil, kursa kayıtlı değil) — tekrar denemek anlamsız.
        if (err?.response?.status >= 400 && err?.response?.status < 500) return;
        try { await api.post('/analytics/events', body); } catch { /* bırak */ }
    }
};

export const flushLearningEvents = (unloading = false) => {
    if (eventTimer) { clearTimeout(eventTimer); eventTimer = null; }
    for (const [courseId, events] of eventQueues) {
        eventQueues.delete(courseId);
        for (let i = 0; i < events.length; i += MAX_BATCH) {
            void sendEvents(courseId, events.slice(i, i + MAX_BATCH), unloading);
        }
    }
};

/** Bir öğrenme olayını kuyruğa ekler. `courseId` yoksa (önizleme) sessizce atlanır. */
export const trackLearningEvent = (courseId: number | string | undefined | null, event: LearningEvent) => {
    if (courseId === undefined || courseId === null || courseId === '' || Number.isNaN(Number(courseId))) return;
    const key = String(courseId);
    const queue = eventQueues.get(key) ?? [];
    queue.push(event.code ? { ...event, code: event.code.slice(0, MAX_CODE) } : event);
    eventQueues.set(key, queue);
    if (queue.length >= MAX_BATCH) flushLearningEvents();
    else if (!eventTimer) eventTimer = setTimeout(() => flushLearningEvents(), FLUSH_DELAY_MS);
};

/* ------------------------------------------------------------------------- */
/*  Tarayıcı editörünün yazım kaydı                                          */
/* ------------------------------------------------------------------------- */

/** [ms (paket başından), konum, silinen uzunluk, eklenen metin, tür] — sunucu biçimiyle aynı. */
type EditOp = [number, number, number, string, string];

interface EditBuffer {
    courseId: string;
    taskKey: string;
    file: string;
    seq: number;
    startedAt: number | null;
    baseText: string | null;
    ops: EditOp[];
    /** Oturumda bu dosya için ilk paket mi gidecek? İlk pakette dosyanın tam metni gider. */
    needsBase: boolean;
}

const EDIT_FLUSH_MS = 15_000;
const SESSION_ID = `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const editBuffers = new Map<string, EditBuffer>();
let editTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Düzenlemenin türü — tarayıcının kendi `inputType` bilgisinden.
 *
 * Tarayıcı yapıştırmayı, geri almayı, sürükle-bırakı AYIRT EDİYOR; tahmin etmemiz
 * gerekmiyor. Yalnızca uzun ve kaynağı belirsiz eklemeler "toplu" sayılıyor.
 */
export const classifyInput = (inputType: string | undefined, inserted: string): string => {
    switch (inputType) {
        case 'insertFromPaste':
        case 'insertFromPasteAsQuotation':
        case 'insertFromDrop':
            return 'p';
        case 'historyUndo':
            return 'u';
        case 'historyRedo':
            return 'r';
        case 'insertReplacementText':
            return 'a';
        default:
            if (inserted.length <= 2 || !inserted.trim()) return 't';
            return inserted.includes('\n') ? 'b' : 'a';
    }
};

/** Eski ve yeni metin arasındaki tek bitişik değişiklik: (konum, silinen, eklenen). */
export const diffText = (before: string, after: string): [number, number, string] => {
    let start = 0;
    const max = Math.min(before.length, after.length);
    while (start < max && before[start] === after[start]) start++;
    let end = 0;
    while (end < max - start && before[before.length - 1 - end] === after[after.length - 1 - end]) end++;
    return [start, before.length - start - end, after.slice(start, after.length - end)];
};

const sendEdits = (buffer: EditBuffer, unloading: boolean) => {
    if (!buffer.ops.length && !buffer.needsBase) return;
    const chunk = {
        file: buffer.file,
        session: SESSION_ID,
        seq: buffer.seq++,
        started_at_ms: buffer.startedAt ?? Date.now(),
        base_text: buffer.needsBase ? buffer.baseText : null,
        ops: buffer.ops,
    };
    const body = {
        course_id: Number(buffer.courseId),
        task_key: buffer.taskKey,
        client: 'browser',
        chunks: [chunk],
    };
    buffer.ops = [];
    buffer.startedAt = null;
    buffer.needsBase = false;
    if (unloading) postKeepalive('/analytics/edits', body);
    else void api.post('/analytics/edits', body).catch(() => undefined);
};

export const flushEdits = (unloading = false) => {
    for (const buffer of editBuffers.values()) sendEdits(buffer, unloading);
};

/**
 * Tarayıcı editöründeki bir düzenlemeyi kaydeder.
 * `before` düzenlemeden önceki tam metin: oturumun ilk paketi onu taşır.
 */
export const recordBrowserEdit = (
    courseId: number | string | undefined, taskKey: string | undefined, file: string,
    before: string, after: string, inputType: string | undefined,
) => {
    if (!courseId || !taskKey || before === after) return;
    const key = `${courseId}|${taskKey}|${file}`;
    let buffer = editBuffers.get(key);
    if (!buffer) {
        buffer = {
            courseId: String(courseId), taskKey, file, seq: 0, startedAt: null,
            baseText: before, ops: [], needsBase: true,
        };
        editBuffers.set(key, buffer);
    }
    const now = Date.now();
    if (buffer.startedAt === null) buffer.startedAt = now;
    const [offset, deleted, inserted] = diffText(before, after);
    buffer.ops.push([now - buffer.startedAt, offset, deleted, inserted, classifyInput(inputType, inserted)]);
    if (buffer.ops.length >= 500) sendEdits(buffer, false);
    if (!editTimer) editTimer = setInterval(() => flushEdits(), EDIT_FLUSH_MS);
};

// Sayfa gizlenirken/kapanırken bekleyen her şey gönderilir.
if (typeof window !== 'undefined') {
    const onHide = () => { flushLearningEvents(true); flushEdits(true); };
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') onHide();
    });
}
