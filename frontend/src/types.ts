export type NodeType = 'start' | 'chest' | 'house' | 'paw' | 'step';
export type CurveType = 'up' | 'down';

export interface PathNode {
    id: number;
    type: NodeType;
    button: string;
    icon?: string;
    curve: CurveType;
    iconSize?: string;
    iconOffset?: string;
    ringColor: string;
    numberGradient: string;
    pastelColor: string;
    glowColor: string;
    strokeColor: string;
    baseColor: string;
    title: string;
    stars?: number;
    isLocked?: boolean;
    lessonNumber?: number;
    lessonTopic?: string;
    lastInLesson?: boolean;
}

export interface Instructor {
    name: string;
    avatar: string;
    status: string;
    isOnline: boolean;
}

export interface CourseStats {
    league: string;
    xp: string;
    streak: number;
    gems: number;
}

export interface CourseData {
    id: string;
    title: string;
    icon: string;
    themeColor: string;
    nodes: PathNode[];
    instructor: Instructor;
    stats: CourseStats;
    defaultHeader: {
        title: string;
        subtitle: string;
    };
}
