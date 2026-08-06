import * as vscode from 'vscode';
import type { Api } from './api';
import type { Course, Submission } from './types';

/** Öğretmen ağacında tek bir teslim. */
export class SubmissionItem extends vscode.TreeItem {
    constructor(readonly courseId: number, readonly submission: Submission) {
        super(submission.student_name || 'İsimsiz öğrenci', vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'submission';
        // graded_at tek doğruluk kaynağı (0 geçerli bir nottur).
        this.description = submission.graded_at
            ? (submission.grade === null ? 'değerlendirildi' : `${submission.grade}/100`)
            : `${submission.node_title} · bekliyor`;
        this.iconPath = new vscode.ThemeIcon(
            submission.graded_at ? 'pass-filled' : 'circle-large-outline',
        );
        this.tooltip = `${submission.node_title}\n${submission.file_name}`;
        this.command = {
            command: 'gomufi.openSubmission',
            title: 'Teslimi İncele',
            arguments: [this],
        };
    }
}

class TeacherCourseItem extends vscode.TreeItem {
    constructor(readonly course: Course) {
        super(course.title, vscode.TreeItemCollapsibleState.Collapsed);
        this.contextValue = 'course';
        this.iconPath = new vscode.ThemeIcon('book');
    }
}

type Node = TeacherCourseItem | SubmissionItem;

export class TeacherTree implements vscode.TreeDataProvider<Node> {
    private readonly changed = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this.changed.event;

    constructor(private readonly api: Api) {}

    refresh(): void {
        this.changed.fire();
    }

    getTreeItem(node: Node): vscode.TreeItem {
        return node;
    }

    async getChildren(node?: Node): Promise<Node[]> {
        // Teslimler yalnızca kurs açıldığında çekilir — her kursu baştan sorgulamak
        // çok sayıda kursu olan öğretmende gereksiz yük olurdu.
        if (node instanceof TeacherCourseItem) {
            const subs = await this.api.submissions(node.course.id);
            const bekleyenOnce = [...subs].sort(
                (a, b) => Number(!!a.graded_at) - Number(!!b.graded_at),
            );
            return bekleyenOnce.map((s) => new SubmissionItem(node.course.id, s));
        }
        if (node) return [];

        const courses = await this.api.teacherCourses();
        return courses.map((c) => new TeacherCourseItem(c));
    }
}
