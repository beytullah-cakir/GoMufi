export interface ElementStyle {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    fontSize?: number;
    fontFamily?: 'Patrick Hand' | 'Inter' | 'Fira Code' | 'Fredoka' | 'Comic Neue' | 'Bangers' | 'Pacifico';
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
    verticalAlign?: 'top' | 'middle' | 'bottom';
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;
    borderPosition?: 'inside' | 'outside';
    opacity?: number;
}

export interface SlideElement {
    id: string;
    type: 'text' | 'code' | 'image' | 'video' | 'sticky' | 'shape' | 'draw' | 'arrow';
    shapeType?: 'rectangle' | 'circle';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    content: string;
    src?: string;
    imageUrl?: string;
    videoUrl?: string;
    style?: ElementStyle;
    // New Config for Widgets
    codeConfig?: {
        language?: 'python' | 'javascript' | 'typescript' | 'cpp';
        expectedOutput?: string;
        hint?: string;
        runnable?: boolean;
        theme?: 'dark' | 'light';
        enableAutocomplete?: boolean;
    };
    arrowConfig?: {
        start: { x: number, y: number };
        end: { x: number, y: number };
        startConnectedElementId?: string;
        endConnectedElementId?: string;
        startSide?: 'top' | 'bottom' | 'left' | 'right';
        endSide?: 'top' | 'bottom' | 'left' | 'right';
        customChannel?: number;
        customStartOffset?: number;
        customEndOffset?: number;
        arrowStyle?: 'straight' | 'curved' | 'elbow';
    };
}

export interface SlideConnection {
    id: string;
    startElementId: string;
    endElementId: string;
    color?: string;
    width?: number;
}

export interface QuizOption {
    id: string;
    text: string;
    isCorrect: boolean;
}

export interface QuizQuestion {
    id: string;
    text: string;
    options: QuizOption[];
}

export interface MatchingGameConfig {
    timeLimit: number; // seconds
    questions: QuizQuestion[];
}

export interface Slide {
    id: number;
    // 'normal' is default if undefined
    type?: 'normal' | 'game' | 'coding';
    gameType?: 'matching' | 'monster';
    gameConfig?: MatchingGameConfig | any;
    elements: SlideElement[];
    connections?: SlideConnection[];
    background?: 'default' | 'notebook';
    backgroundColor?: string;
}
