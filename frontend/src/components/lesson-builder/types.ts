export interface ElementStyle {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    fontSize?: number;
    fontFamily?: 'Patrick Hand' | 'Inter' | 'Fira Code' | 'Fredoka' | 'Comic Neue' | 'Bangers' | 'Pacifico';
    backgroundColor?: string;
    textAlign?: 'left' | 'center' | 'right';
}

export interface SlideElement {
    id: string;
    type: 'text' | 'code' | 'image' | 'video' | 'sticky' | 'shape';
    shapeType?: 'rectangle' | 'circle';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    content: string;
    src?: string;
    style?: ElementStyle;
    expectedOutput?: string;
}

export interface Slide {
    id: number;
    elements: SlideElement[];
}
