import * as vscode from 'vscode';
import type { Api } from './api';
import { findAssignments } from './assignments';
import type { Assignment, MySubmission } from './types';

/** Ağaçta bir ödev; durumu (teslim/not) yanında rozet olarak görünür. */
export class AssignmentItem extends vscode.TreeItem {
    constructor(readonly assignment: Assignment, readonly submission: MySubmission | null) {
        super(assignment.title, vscode.TreeItemCollapsibleState.None);
        this.contextValue = 'assignment';
        this.description = describe(assignment, submission);
        this.tooltip = new vscode.MarkdownString(
            `**${assignment.title}**\n\n${assignment.instructions.slice(0, 400)}`,
        );
        this.iconPath = new vscode.ThemeIcon(iconFor(submission));
        this.command = {
            command: 'gomufi.openAssignment',
            title: 'Ödevi Aç',
            arguments: [assignment],
        };
    }
}

class CourseItem extends vscode.TreeItem {
    constructor(readonly courseId: number, title: string, readonly children: AssignmentItem[]) {
        super(title, vscode.TreeItemCollapsibleState.Expanded);
        this.contextValue = 'course';
        this.iconPath = new vscode.ThemeIcon('book');
        const bekleyen = children.filter((c) => !c.submission).length;
        this.description = bekleyen ? `${bekleyen} bekliyor` : 'tamamlandı';
    }
}

// graded_at TEK doğruluk kaynağı: 0 geçerli bir nottur, `grade` dolu mu diye
// bakmak 0 alan öğrenciyi "değerlendirilmemiş" gösterirdi.
function describe(a: Assignment, s: MySubmission | null): string {
    if (s?.graded_at) return s.grade === null ? 'değerlendirildi' : `${s.grade}/100`;
    if (s) return 'teslim edildi · not bekliyor';
    return `+${a.points} XP`;
}

function iconFor(s: MySubmission | null): string {
    if (s?.graded_at) return 'pass-filled';
    if (s) return 'clock';
    return 'circle-large-outline';
}

type Node = CourseItem | AssignmentItem;

export class StudentTree implements vscode.TreeDataProvider<Node> {
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
        if (node instanceof CourseItem) return node.children;
        if (node) return [];

        const courses = await this.api.myCourses();
        const assignments = findAssignments(courses);

        // Her ödevin teslim durumu ayrı bir istek; hepsi paralel sorulur.
        const withStatus = await Promise.all(
            assignments.map(async (a) => {
                let sub: MySubmission | null = null;
                try {
                    sub = await this.api.mySubmission(a.courseId, a.nodeId);
                } catch {
                    // Tek bir ödevin durumu alınamazsa ağacın tamamı çökmesin.
                }
                return new AssignmentItem(a, sub);
            }),
        );

        const byCourse = new Map<number, { title: string; items: AssignmentItem[] }>();
        for (const item of withStatus) {
            const { courseId, courseTitle } = item.assignment;
            if (!byCourse.has(courseId)) byCourse.set(courseId, { title: courseTitle, items: [] });
            byCourse.get(courseId)!.items.push(item);
        }

        return [...byCourse.entries()].map(
            ([id, { title, items }]) => new CourseItem(id, title, items),
        );
    }
}
