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

export interface Slide {
    id: number;
    elements: SlideElement[];
    connections?: SlideConnection[];
}
