import api from '../../api';

/**
 * Veli portalı istemcisi (bkz. backend/routers/parent_portal.py).
 * Veli yalnızca öğretmenin onayladığı raporları ve sade özetleri görür.
 */

export interface ChildHomework {
    title: string;
    due_at: string | null;
    submitted: boolean;
    late: boolean;
    overdue: boolean;
    grade: number | null;
    feedback: string | null;
}

export interface ChildCourse {
    id: number;
    title: string;
    teacher: string;
    progress: number;
    modules_done: number;
    modules_total: number;
    tasks_solved: number;
    active_days_14: number;
    last_activity_at: string | null;
    homework: ChildHomework[];
}

export interface ChildOverview {
    student: {
        id: number; first_name: string; last_name: string; nickname: string | null;
        grade_level: string | null; xp: number; streak: number; student_code: string;
    };
    courses: ChildCourse[];
    latest_report: { id: number; sent_at: string | null; summary: string | null } | null;
    unread_reports: number;
    recording: 'granted' | 'denied' | null;
}

export interface ParentReportView {
    id: number;
    course: string | null;
    sent_at: string | null;
    period_start: string;
    period_end: string;
    content: { summary: string; learned: string[]; focus: string[]; homework: string; teacher_note: string };
    facts: { active_days?: number; tasks_solved?: string[]; modules_completed?: string[]; quiz?: { answered: number; correct: number } };
}

export interface ConsentState {
    notice: { version: string; title: string; paragraphs: string[] };
    status: 'granted' | 'denied' | null;
    decided_at: string | null;
}

export interface ConceptView {
    course_id: number;
    course: string;
    concepts: Array<{ concept_id: string; label: string; description: string; status: string; status_label: string; modules: string[] }>;
    next_steps: Array<{ label: string; status: string; modules: string[] }>;
    counts: Record<string, number>;
}

export interface ChildSummary {
    student_id: number;
    name: string;
    xp: number;
    streak: number;
    courses: number;
    active_days_14: number;
    last_activity_at: string | null;
    homework_due_soon: Array<{ title: string; course: string; due_at: string }>;
    homework_overdue: number;
    unread_reports: number;
    latest_report: ChildOverview['latest_report'];
}

export const parentApi = {
    summary: () => api.get<{ children: ChildSummary[] }>('/parent/summary').then((r) => r.data.children),
    overview: (id: number) => api.get<ChildOverview>(`/parent/students/${id}/overview`).then((r) => r.data),
    reports: (id: number) => api.get<{ reports: ParentReportView[] }>(`/parent/students/${id}/reports`).then((r) => r.data.reports),
    consent: (id: number) => api.get<ConsentState>(`/parent/students/${id}/consent`).then((r) => r.data),
    setConsent: (id: number, status: 'granted' | 'denied') =>
        api.put(`/parent/students/${id}/consent`, { status }).then((r) => r.data),
    concepts: (id: number) => api.get<{ courses: ConceptView[] }>(`/parent/students/${id}/concepts`).then((r) => r.data.courses),
};

export const shortDate = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
};

export const STATUS_TONE: Record<string, string> = {
    hakim: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    gelisiyor: 'bg-amber-100 text-amber-700 border-amber-200',
    zorlaniyor: 'bg-rose-100 text-rose-700 border-rose-200',
    veri_az: 'bg-gray-100 text-gray-500 border-gray-200',
};
