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
    objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
}

export interface SlideElement {
    id: string;
    type: 'text' | 'code' | 'image' | 'video' | 'sticky' | 'shape' | 'draw' | 'arrow' | 'whiteboard' | 'file' | 'link' | 'speaking_note' | 'code_editor' | 'answer_box' | 'challenge' | 'connection_task' | 'production_task' | 'multiple_choice';
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
    extra?: any;
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
    type?: 'multiple_choice' | 'true_false' | 'short_answer' | 'open_ended';
    multipleCorrect?: boolean;
    correctShortAnswer?: string;
    explanation?: string;
    timeLimit?: number; // seconds
}

export interface MatchingGameConfig {
    timeLimit: number; // seconds
    questions: QuizQuestion[];
}

export interface HomeworkConfig {
    title: string;
    instructions: string;
    submissionType: 'text' | 'code' | 'image' | 'file';
    points?: number;
    dueDate?: string;
    starterCode?: string;
    /** Öğrencinin isteğe bağlı açabileceği ipucu (UYGULA'daki ile aynı davranış). */
    hint?: string;
}

/**
 * UYGULA aşamasına özel "Uygulama Görevi" slaydının yapılandırması.
 * Amaç: öğrencinin ANLA'da öğrendiğini uygulaması. Her görev kod olmak
 * zorunda değil — metin, ekran görüntüsü veya dosya da istenebilir.
 */
export interface ChallengeSample {
    input: string;
    output: string;
}

export interface ChallengeTest {
    id: string;
    /** Öğrenci kodu çalıştıktan sonra değerlendirilecek ifade, ör. "asal_mi(7)" */
    call: string;
    /** Beklenen değerin metin karşılığı, ör. "True" */
    expected: string;
}

/** Öğrencinin görevi nasıl teslim edeceği. */
export type ChallengeSubmissionType = 'code' | 'text' | 'image' | 'file';

/**
 * Kod görevlerinde doğruluğun nasıl ölçüleceği:
 *  - 'output' : ekrana basılan çıktı beklenenle karşılaştırılır (print tipi görevler)
 *  - 'tests'  : fonksiyon çağrıları çalıştırılıp dönüş değerleri karşılaştırılır
 *  - 'manual' : otomatik kontrol yok, öğretmen değerlendirir
 */
export type ChallengeCheckMode = 'output' | 'tests' | 'manual';

export interface ChallengeConfig {
    title: string;
    /** Görev metni (ne yapılacak) */
    prompt: string;
    submissionType: ChallengeSubmissionType;
    xp: number;
    hint?: string;
    /** Öğrenciye gösterilen örnek girdi/çıktı tablosu (opsiyonel) */
    samples?: ChallengeSample[];

    // --- yalnızca submissionType === 'code' için ---
    checkMode?: ChallengeCheckMode;
    /** checkMode === 'output' iken beklenen ekran çıktısı */
    expectedOutput?: string;
    /** checkMode === 'tests' iken öğrencinin yazacağı fonksiyonun adı */
    functionName?: string;
    /** checkMode === 'tests' iken çalıştırılan testler */
    tests?: ChallengeTest[];
    starterCode?: string;
}

export interface Slide {
    id: number | string;
    // 'normal' is default if undefined
    type?: 'normal' | 'game' | 'coding' | 'homework' | 'challenge';
    gameType?: 'matching' | 'monster';
    gameConfig?: MatchingGameConfig | any;
    homeworkConfig?: HomeworkConfig;
    /** type === 'challenge' olduğunda dolu olur */
    challengeConfig?: ChallengeConfig;
    elements: SlideElement[];
    connections?: SlideConnection[];
    background?: 'default' | 'notebook';
    backgroundColor?: string;
}
