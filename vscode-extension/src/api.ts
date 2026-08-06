import * as vscode from 'vscode';
import type { Auth } from './auth';
import type { Course, MySubmission, Submission } from './types';

/**
 * Backend istemcisi.
 *
 * Kimlik `Authorization: Bearer` başlığıyla taşınır — sunucudaki
 * `get_current_user_info` çerezin yanında bu başlığı da kabul ediyor
 * (backend/auth/dependencies.py), bu yüzden tüm mevcut uçlar olduğu gibi çalışır.
 */

/** Oturumun düştüğünü (401) ayırt etmek için — çağıran yeniden giriş isteyebilir. */
export class UnauthorizedError extends Error {
    constructor() {
        super('Oturumun sona ermiş. Lütfen tekrar giriş yap.');
    }
}

export class Api {
    constructor(private readonly auth: Auth) {}

    private get baseUrl(): string {
        const raw = vscode.workspace.getConfiguration('gomufi').get<string>('apiUrl') || '';
        return raw.replace(/\/+$/, '');
    }

    private async request(path: string, init: RequestInit = {}): Promise<Response> {
        const session = this.auth.current;
        if (!session) throw new UnauthorizedError();

        const headers = new Headers(init.headers);
        headers.set('Authorization', `Bearer ${session.token}`);

        const res = await fetch(`${this.baseUrl}${path}`, { ...init, headers });
        if (res.status === 401 || res.status === 403) throw new UnauthorizedError();
        if (!res.ok) {
            let detail = `${res.status}`;
            try {
                detail = ((await res.json()) as any).detail ?? detail;
            } catch {
                /* gövde JSON değilse durum kodu yeterli */
            }
            throw new Error(detail);
        }
        return res;
    }

    private async json<T>(path: string, init?: RequestInit): Promise<T> {
        return (await this.request(path, init)).json() as Promise<T>;
    }

    /** Öğrencinin kayıtlı olduğu kurslar (müfredat ve slaytlar dahil). */
    myCourses(): Promise<Course[]> {
        return this.json<Course[]>('/my-content');
    }

    /** Öğrencinin bir ödevdeki kendi teslimi ve varsa notu. */
    async mySubmission(courseId: number, nodeId: string): Promise<MySubmission | null> {
        const data = await this.json<{ submitted: boolean; submission: MySubmission | null }>(
            `/courses/${courseId}/homework/${encodeURIComponent(nodeId)}/submission`,
        );
        return data.submitted ? data.submission : null;
    }

    /** Ödev teslimi. Sunucu multipart bekliyor; metin/kod da dosya olarak gider. */
    async submit(
        courseId: number, nodeId: string, fileName: string, content: Uint8Array, mime: string,
    ): Promise<void> {
        const form = new FormData();
        form.append('file', new Blob([content as BlobPart], { type: mime }), fileName);
        await this.request(
            `/courses/${courseId}/homework/${encodeURIComponent(nodeId)}/submit`,
            { method: 'POST', body: form },
        );
    }

    /** Öğretmen: bir kursa gelen tüm teslimler. */
    async submissions(courseId: number): Promise<Submission[]> {
        const data = await this.json<{ submissions: Submission[] }>(
            `/courses/${courseId}/homework/all-submissions`,
        );
        return data.submissions ?? [];
    }

    /** Öğretmen: not ve geri bildirim yaz. */
    async grade(
        courseId: number, submissionId: number, grade: number | null, feedback: string | null,
    ): Promise<void> {
        await this.request(
            `/courses/${courseId}/homework/submissions/${submissionId}/grade`,
            {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grade, feedback, source: 'teacher' }),
            },
        );
    }

    /** Öğretmenin sahip olduğu kurslar. */
    teacherCourses(): Promise<Course[]> {
        return this.json<Course[]>('/teacher/content');
    }

    /** Yerel calistiriciyi duyurur; TTL dolmadan tazelenmeli. */
    async pairRunner(port: number, token: string): Promise<void> {
        await this.request('/devices/pair', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ port, token }),
        });
    }

    /** VS Code kapanirken eslesmeyi birakir. */
    async unpairRunner(): Promise<void> {
        await this.request('/devices/pair', { method: 'DELETE' });
    }
}
