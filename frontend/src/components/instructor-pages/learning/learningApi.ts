import api from '../../../api';

/**
 * Öğrenme analitiği uçlarının istemcisi ve tipleri (bkz. backend/routers/analytics.py).
 * Tipler sunucunun döndürdüğü biçimle birebir; sayfa bileşenleri yalnızca bunları kullanır.
 */

export type MasteryStatus = 'veri_az' | 'zorlaniyor' | 'gelisiyor' | 'hakim';

export interface Flag {
    code: 'paste_heavy' | 'bulk_heavy' | 'external_change' | 'fast_typing' | string;
    label: string;
    detail: string;
}

export interface Counted {
    label: string;
    students: number;
}

/** Öğretmenin kod kökeni kararı: accepted = "sorun yok / ben söyledim", concern = doğrulandı. */
export interface ProvenanceReview {
    verdict: 'accepted' | 'concern';
    note: string | null;
    at: string | null;
}

export interface HelpInfo {
    id: number;
    note: string | null;
    at: string;
    responded: boolean;
    waiting_minutes: number;
}

export interface TaskStats {
    started: number;
    solved: number;
    completed: number;
    solve_rate: number;
    first_try_rate: number;
    median_attempts: number | null;
    median_solve_minutes: number | null;
    stuck: number;
}

export interface OverviewConcept {
    concept_id: string;
    label: string;
    avg_score: number | null;
    struggling: number;
    developing: number;
    mastered: number;
    misconceptions: string[];
}

export interface Overview {
    course: { id: number; title: string; language: string | null; nodes: number; tagged_nodes: number };
    student_count: number;
    concepts: OverviewConcept[];
    hard_tasks: Array<TaskStats & { task_key: string; task: string; stage: string; top_failures: Counted[] }>;
    stuck_now: Array<{
        student_id: number; student: string; task_key: string; task: string;
        attempts: number; last_failure: string | null; minutes_on_task: number | null;
    }>;
    at_risk: Array<{
        student_id: number; student: string; stuck_tasks: number;
        struggling_concepts: Array<{ concept_id: string; label: string }>;
    }>;
    integrity: Array<{
        student_id: number; student: string; task_key: string; task: string;
        own_share: number; flags: Flag[]; review: ProvenanceReview | null;
    }>;
    integrity_accepted: number;
    help_open: Array<HelpInfo & { student_id: number; student: string; task_key: string; task: string }>;
}

export interface MatrixCell {
    score: number;
    status: MasteryStatus;
    evidence: number;
    successes: number;
    failures: number;
    misconception: string | null;
}

export interface ConceptMatrix {
    concepts: Array<{ concept_id: string; label: string; prerequisites: string[]; nodes: string[] }>;
    students: Array<{ student_id: number; student: string; cells: Record<string, MatrixCell> }>;
}

export interface TaskRow extends TaskStats {
    task_key: string;
    task: string;
    stage: string;
    node_id: string;
    node: string | null;
    top_failures: Counted[];
    top_errors: Counted[];
    top_misconceptions: Counted[];
}

export interface TaskDetail extends TaskStats {
    task_key: string;
    task: string;
    stage: string;
    node: string | null;
    top_failures: Counted[];
    top_errors: Counted[];
    top_misconceptions: Counted[];
    students: Array<{
        student_id: number; student: string; attempts: number; solved: boolean; first_try: boolean;
        submitted: boolean; last_failure: string | null; last_error_type: string | null;
        stuck: boolean; stuck_now: boolean; hints_opened: number; coach_messages: number;
        minutes: number | null; own_share: number | null; flags: Flag[];
        help: HelpInfo | null; review: ProvenanceReview | null;
    }>;
    not_started: Array<{ student_id: number; student: string }>;
    help_open: number;
}

export interface StudentRow {
    student_id: number;
    student: string;
    struggling: number;
    developing: number;
    mastered: number;
    tasks_attempted: number;
    tasks_solved: number;
    stuck_tasks: number;
    stuck_now: number;
    code_flags: number;
    help_open: number;
    homework_submitted: number;
    homework_total: number;
    last_activity_at: string | null;
}

export interface TimelineItem {
    at: string;
    type: string;
    task_key: string | null;
    task: string | null;
    node: string | null;
    stage: string | null;
    outcome: string | null;
    attempt: number | null;
    error_type: string | null;
    error_line: number | null;
    concepts: string[];
    failed: string[];
    coach: string | null;
    misconception: string | null;
    note: string | null;
    has_code: boolean;
    event_id: number;
}

export interface StudentProfile {
    student_id: number;
    student: string;
    concepts: Array<{
        concept_id: string; label: string; status: MasteryStatus; score: number; evidence: number;
        successes: number; failures: number; misconception: string | null; last_evidence_at: string | null;
    }>;
    root_causes: Array<{
        concept_id: string; label: string;
        weak_prerequisites: Array<{ concept_id: string; label: string }>;
    }>;
    tasks: Array<{
        task_key: string; task: string; stage: string; attempts: number; solved: boolean;
        submitted: boolean; first_try: boolean; last_failure: string | null; stuck: boolean;
        stuck_now: boolean; hints_opened: number; coach_messages: number; own_share: number | null;
        flags: Flag[]; review: ProvenanceReview | null; last_activity_at: string | null;
    }>;
    /** Velinin yazım kaydı kararı: "denied" ise kod kökeni verisi toplanmıyor. */
    recording: 'granted' | 'denied' | null;
    homework: Array<{
        task_key: string; title: string; submitted: boolean; submitted_at: string | null;
        due_at: string | null; late: boolean; overdue: boolean;
        grade: number | null; feedback: string | null; ai_score: number | null;
        weaknesses: Array<{ explanation?: string; conceptId?: string | null; misconception?: string | null }>;
    }>;
    timeline: TimelineItem[];
}

export interface ConceptEvidence {
    concept_id: string;
    label: string;
    description: string;
    prerequisites: Array<{ concept_id: string; label: string }>;
    status: MasteryStatus;
    score: number | null;
    misconception: string | null;
    evidence: Array<{
        event_id: number; at: string; type: string; task_key: string | null; task: string | null;
        outcome: string | null; attempt: number | null; error_type: string | null; failed: string[];
        misconception: string | null; coach: string | null; grade: number | null;
        question: string | null; note: string | null; has_code: boolean;
    }>;
}

export interface HomeworkRow {
    task_key: string;
    title: string;
    node: string | null;
    due_at: string | null;
    late: number;
    overdue: boolean;
    enrolled: number;
    submitted: number;
    graded: number;
    pending_grading: number;
    avg_grade: number | null;
    grade_distribution: Record<string, number>;
    avg_ai_score: number | null;
    ai_teacher_gap: number | null;
    common_weaknesses: Array<{ concept_id: string | null; label: string; students: number; misconceptions: string[] }>;
    self_checks: number;
    missing: Array<{ student_id: number; student: string }>;
}

export type EditOp = [number, number, number, string, string];

export interface CodeHistory {
    task_key: string;
    task: string;
    provenance: {
        has_recording: boolean;
        chars: number;
        starter_chars: number;
        composition: Record<string, number>;
        share: Record<string, number>;
        own_share: number;
        activity: Record<string, number>;
        ai_extensions: string[];
        flags: Flag[];
    };
    final: Record<string, string>;
    starters: string[];
    files: Record<string, Array<{
        session: string; seq: number; client: string; started_at_ms: number;
        base_text: string | null; ops: EditOp[];
    }>>;
    checks: Array<{ at: string; outcome: string; attempt: number }>;
}

export interface InsightItem {
    title: string;
    detail: string;
    concept_id: string;
    concept: string;
    students: Array<{ name: string; student_id: number }>;
}

export interface Insight {
    summary: string;
    findings: InsightItem[];
    actions: Array<InsightItem & { kind: 'reteach' | 'practice_task' | 'talk' | 'check_code' }>;
}

export interface InsightState {
    insight: Insight | null;
    stale: boolean;
    created_at?: string;
    cached?: boolean;
}

export interface PracticeDraft {
    slide: { id: number; type: 'challenge'; challengeConfig: Record<string, any> };
    concept: string;
    misconceptions: string[];
    nodes: Array<{ node_id: string; title: string; stage: string }>;
}

/** "Neyi anlamadılar?" — sınıfın yanılgıları, öğrenci sayısına göre sıralı. */
export interface MisconceptionRow {
    label: string;
    student_count: number;
    students: Array<{ id: number; name: string }>;
    /** kaynak → kayıt sayısı: soru, oyun, koç, ödev */
    sources: Record<string, number>;
    modules: string[];
    concept_id: string | null;
    concept: string | null;
    examples: string[];
}

export interface QuestionStat {
    slide_id: string;
    element_id: string;
    question: string;
    module: string | null;
    answered: number;
    first_try_correct: number;
    correct_rate: number;
    wrong_choices: Array<{ text: string; misconception: string | null; students: number }>;
}

export interface Misconceptions {
    misconceptions: MisconceptionRow[];
    questions: QuestionStat[];
}

export type ActionKind = 'reteach' | 'practice_task' | 'talk' | 'check_code' | 'other';
export type ActionVerdict = 'iyilesti' | 'degismedi' | 'kotulesti' | 'veri_bekleniyor';

export interface ConceptSnapshot {
    struggling?: number;
    developing?: number;
    mastered?: number;
    no_data?: number;
    avg_score?: number | null;
    status?: MasteryStatus | null;
}

export interface TeacherActionRow {
    id: number;
    kind: ActionKind;
    title: string;
    note: string | null;
    concept_id: string | null;
    concept: string | null;
    student_id: number | null;
    student: string | null;
    at: string;
    before: ConceptSnapshot;
    after: ConceptSnapshot;
    new_evidence: number;
    verdict: ActionVerdict | null;
}

export interface HelpRequestRow {
    id: number;
    student_id: number;
    student: string;
    task_key: string;
    task: string;
    note: string | null;
    at: string;
    waiting_minutes: number;
    responded: boolean;
}

export interface BoardPayload {
    task_key: string;
    task: string;
    language: string;
    code: string;
    failed: string[];
    note: string | null;
}

export interface TeacherNoteRow { id: number; text: string; at: string }

/** Analizin kapsamı: şube ve "şu tarihten beri". Kazanım haritası tarihle süzülmez. */
export interface Scope {
    classId?: string | null;
    since?: string | null;
}

export const scopeKey = (s?: Scope) => `${s?.classId ?? ''}|${s?.since ?? ''}`;

const q = (s?: Scope, extra: Record<string, unknown> = {}) => ({
    params: {
        ...extra,
        ...(s?.classId ? { class_id: s.classId } : {}),
        ...(s?.since ? { since: s.since } : {}),
    },
});

export type GradeComponent = 'homework' | 'tasks' | 'projects' | 'quiz' | 'mastery';

export interface GradeCell {
    grade: number | null;
    status: 'graded' | 'pending' | 'missing' | 'overdue' | 'open';
}

export interface Gradebook {
    weights: Record<GradeComponent, number>;
    missing_as_zero: boolean;
    homeworks: Array<{ task_key: string; title: string; due_at: string | null }>;
    projects: Array<{ task_key: string; title: string }>;
    task_count: number;
    students: Array<{
        student_id: number;
        student: string;
        class_name: string | null;
        components: Record<GradeComponent, number | null>;
        homework: Record<string, GradeCell>;
        projects: Record<string, GradeCell>;
        tasks_done: number;
        quiz_answered: number;
        total: number | null;
    }>;
    class_average: number | null;
    classes: Array<{ id: string; name: string; students: number }>;
}

const base = (courseId: number) => `/analytics/courses/${courseId}`;
const enc = encodeURIComponent;

export const learningApi = {
    overview: (c: number, s?: Scope) => api.get<Overview>(`${base(c)}/overview`, q(s)).then((r) => r.data),
    concepts: (c: number, s?: Scope) =>
        api.get<ConceptMatrix>(`${base(c)}/concepts`, q({ classId: s?.classId })).then((r) => r.data),
    tasks: (c: number, s?: Scope) => api.get<{ tasks: TaskRow[] }>(`${base(c)}/tasks`, q(s)).then((r) => r.data.tasks),
    task: (c: number, key: string, s?: Scope) => api.get<TaskDetail>(`${base(c)}/tasks/${enc(key)}`, q(s)).then((r) => r.data),
    students: (c: number, s?: Scope) =>
        api.get<{ students: StudentRow[] }>(`${base(c)}/students`, q(s)).then((r) => r.data.students),
    student: (c: number, s: number) => api.get<StudentProfile>(`${base(c)}/students/${s}`).then((r) => r.data),
    conceptEvidence: (c: number, s: number, concept: string) =>
        api.get<ConceptEvidence>(`${base(c)}/students/${s}/concepts/${enc(concept)}`).then((r) => r.data),
    code: (c: number, s: number, key: string) =>
        api.get<CodeHistory>(`${base(c)}/students/${s}/code/${enc(key)}`).then((r) => r.data),
    eventCode: (c: number, eventId: number) =>
        api.get<{ code: string | null; stderr: string | null; at: string }>(`${base(c)}/events/${eventId}/code`).then((r) => r.data),
    homework: (c: number, s?: Scope) =>
        api.get<{ homeworks: HomeworkRow[] }>(`${base(c)}/homework`, q(s)).then((r) => r.data.homeworks),
    gradebook: (c: number, s?: Scope) =>
        api.get<Gradebook>(`${base(c)}/gradebook`, q({ classId: s?.classId })).then((r) => r.data),
    saveGradebookSettings: (c: number, weights: Record<GradeComponent, number>, missingAsZero: boolean) =>
        api.put(`${base(c)}/gradebook/settings`, { weights, missing_as_zero: missingAsZero }).then((r) => r.data),
    tagConcepts: (c: number) =>
        api.post<{ tagged: number; dictionary_missing?: boolean; message?: string }>(`${base(c)}/tag-concepts`).then((r) => r.data),
    insight: (c: number, studentId?: number) =>
        api.get<InsightState>(`${base(c)}/insights`, { params: studentId ? { student_id: studentId } : {} }).then((r) => r.data),
    createInsight: (c: number, studentId?: number, force = false) =>
        api.post<InsightState>(`${base(c)}/insights`, { student_id: studentId ?? null, force }).then((r) => r.data),
    misconceptions: (c: number, s?: Scope) =>
        api.get<Misconceptions>(`${base(c)}/misconceptions`, q(s)).then((r) => r.data),
    practiceTask: (c: number, conceptId: string, misconception?: string) =>
        api.post<PracticeDraft>(`${base(c)}/practice-task`, { concept_id: conceptId, misconception: misconception || null })
            .then((r) => r.data),
    applyPracticeTask: (c: number, nodeId: string, slide: PracticeDraft['slide'], conceptId?: string, studentIds: number[] = []) =>
        api.post<{ ok: boolean; node: string; assigned_to: number[] }>(`${base(c)}/practice-task/apply`, {
            node_id: nodeId, slide, concept_id: conceptId, student_ids: studentIds,
        }).then((r) => r.data),

    // --- canlı ders ve müdahaleler (bkz. backend/routers/live_teaching.py) ---
    helpQueue: (c: number, taskKey?: string) =>
        api.get<{ requests: HelpRequestRow[] }>(`${base(c)}/help`, { params: taskKey ? { task_key: taskKey } : {} })
            .then((r) => r.data.requests),
    resolveHelp: (c: number, requestId: number) => api.post(`${base(c)}/help/${requestId}/resolve`).then((r) => r.data),
    nudge: (c: number, studentId: number, text: string, taskKey?: string) =>
        api.post<{ ok: boolean; id: number }>(`${base(c)}/nudges`, { student_id: studentId, task_key: taskKey, text }).then((r) => r.data),
    board: (c: number, taskKey: string, studentId: number, broadcast = false) =>
        api.post<BoardPayload>(`${base(c)}/board`, { task_key: taskKey, student_id: studentId, broadcast }).then((r) => r.data),
    clearBoard: (c: number) => api.post(`${base(c)}/board/clear`).then((r) => r.data),
    actions: (c: number, studentId?: number) =>
        api.get<{ actions: TeacherActionRow[] }>(`${base(c)}/actions`, { params: studentId ? { student_id: studentId } : {} })
            .then((r) => r.data.actions),
    createAction: (c: number, body: { kind: ActionKind; title: string; note?: string; concept_id?: string | null; student_id?: number | null }) =>
        api.post<{ ok: boolean; id: number }>(`${base(c)}/actions`, body).then((r) => r.data),
    deleteAction: (c: number, id: number) => api.delete(`${base(c)}/actions/${id}`).then((r) => r.data),
    assess: (c: number, s: number, concept: string, status: Exclude<MasteryStatus, 'veri_az'>, note: string) =>
        api.post<{ ok: boolean; status: MasteryStatus }>(`${base(c)}/students/${s}/concepts/${enc(concept)}/assess`, { status, note })
            .then((r) => r.data),
    review: (c: number, s: number, key: string, verdict: 'accepted' | 'concern' | 'clear', note = '') =>
        api.put<{ ok: boolean; review: ProvenanceReview | null }>(`${base(c)}/students/${s}/code/${enc(key)}/review`, { verdict, note })
            .then((r) => r.data),
    notes: (c: number, s: number) =>
        api.get<{ notes: TeacherNoteRow[] }>(`${base(c)}/students/${s}/notes`).then((r) => r.data.notes),
    addNote: (c: number, s: number, text: string) =>
        api.post<{ note: TeacherNoteRow }>(`${base(c)}/students/${s}/notes`, { text }).then((r) => r.data.note),
    deleteNote: (c: number, s: number, id: number) => api.delete(`${base(c)}/students/${s}/notes/${id}`).then((r) => r.data),
};

export const errorText = (err: any, fallback: string) =>
    err?.response?.data?.detail || err?.message || fallback;
