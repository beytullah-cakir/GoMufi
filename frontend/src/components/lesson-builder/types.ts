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
        /** `codeLanguages.ts` kayıt defterindeki dil kimliği (python, go, bash…). */
        language?: string;
        /**
         * Görünüm. Boşsa dil karar verir: kabuk dilleri terminal, ötekiler
         * editör. Öğretmen bunu ezebilir (ör. bir Python REPL oturumunu
         * terminal gibi göstermek).
         */
        mode?: 'editor' | 'terminal';
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

/**
 * Dereceli puanlama anahtarı: ölçütler ve seviyeler (düşükten yükseğe).
 * Not, seçilen seviyelerin puanından 100 üzerinden hesaplanır
 * (bkz. backend/homework_rules.py). Öğretmen kütüphanesinden kopyalanır.
 */
export interface RubricLevel {
    label: string;
    points: number;
    description?: string;
}

export interface RubricCriterion {
    id: string;
    title: string;
    description?: string;
    levels: RubricLevel[];
}

export interface Rubric {
    criteria: RubricCriterion[];
}

export interface HomeworkConfig {
    title: string;
    instructions: string;
    submissionType: 'text' | 'code' | 'image' | 'file';
    points?: number;
    /** Son teslim — yerel saat, "YYYY-MM-DDTHH:MM" (tarih-saat girişinin biçimi). */
    dueDate?: string;
    /** Son tarihten sonra teslime izin verilsin mi (verilirse "geç" işaretlenir). Varsayılan: evet. */
    allowLate?: boolean;
    /** Dereceli puanlama anahtarı (isteğe bağlı). */
    rubric?: Rubric;
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

/**
 * Bir görevin "doğru sayılma" ölçütü.
 *
 * NEDEN LİSTE: eskiden tek bir `expectedOutput` vardı ve öğretmene "çıktı ne
 * olacak?" diye soruyordu. Bu, her öğrencinin ne yazacağını önceden bilmesini
 * istemek demek — "kendi adını yazdır" gibi görevlerde imkânsız. Doğru soru
 * "ne doğru sayılır?" ve bunun cevabı bir değer değil, bir ölçüt.
 *
 * Sonuç ölçüt-ölçüt raporlanır: öğrenci hangi maddede kaldığını görür ve YZ
 * koçu "beklenen X gelen Y" yerine "2. ölçüt düştü" bilgisiyle çalışır.
 */
export type CriterionKind =
    | 'exact'      // çıktı birebir eşleşmeli
    | 'template'   // çıktı bu biçimde; {} yerleri serbest
    | 'contains'   // çıktı bunu içermeli
    | 'code'       // kod bu ifadeyi içermeli (yöntemi zorunlu kılar)
    | 'ai';        // öğretmenin cümlesine göre YZ karar verir

export interface ChallengeCriterion {
    id: string;
    kind: CriterionKind;
    /** exact/template/contains: metin · code: aranan ifade · ai: ölçüt cümlesi */
    value: string;
    /**
     * Öğrenciye gösterilen ad — yalnızca sistemin ürettiği ölçütlerde dolu
     * (ör. Birleştir'in "Önceki konudan `for` kullanıldı" ölçütü). Boşsa türe
     * göre üretilir (bkz. challengeCheck.ts `criterionLabel`).
     */
    label?: string;
    /**
     * Ölçütün ölçtüğü kavram (sözlük kimliği). Boşsa sunucu türetir: `code`
     * ölçütünde yapıdan (for -> for_dongusu), ötekilerde modülün birincil kavramı.
     */
    conceptId?: string;
}

/**
 * Görevin bir dosyası.
 *
 * NEDEN ÇOKLU DOSYA: gerçek programlama tek dosyada olmuyor — `main.py`
 * `odev.py`den içe aktarır. Tek `starterCode` alanı bunu anlatamıyordu; görev
 * "import nasıl çalışır"ı öğretmek istediğinde öğretmenin elinde iki dosya
 * olmalı. Dosyaların hepsi öğrencinin VS Code'unda AYNI klasöre yazılır ve
 * program o klasörde çalışır, yoksa `import` bulunamazdı.
 */
export interface ChallengeFile {
    /** Uzantısıyla birlikte dosya adı: "main.py". Diske bu adla yazılır. */
    name: string;
    content: string;
    /** Çalıştırılan dosya. Listede tam olarak biri işaretlidir. */
    entry?: boolean;
}

export interface ChallengeConfig {
    title: string;
    /** Görev metni (ne yapılacak) */
    prompt: string;
    submissionType: ChallengeSubmissionType;
    xp: number;
    hint?: string;
    /** Bu görevin ait olduğu aşama ('UYGULA' | 'BİRLEŞTİR' | 'ÜRET') */
    stage?: string;
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
    /**
     * Çok dosyalı görevin dosyaları. VARSA `starterCode` yerine bunlar kullanılır.
     *
     * `starterCode` geriye dönük uyumluluk için duruyor: dosyası olmayan eski
     * görevler tek dosyalı bir listeymiş gibi ele alınır (bkz. challengeFiles.ts).
     */
    files?: ChallengeFile[];
    /**
     * Görevin dili — dosya uzantısını ve çalıştırma komutunu belirler.
     * Boşsa Python.
     */
    language?: string;
    /**
     * Öğretmenin referans çözümü — öğrenciye ASLA gösterilmez.
     *
     * `expectedOutput` bunun gerçek çıktısından türetilir. Eskiden beklenen çıktı
     * elle yazılıyordu ve doğruluğunu hiçbir şey denetlemiyordu; bir boşluk fazla
     * yazıldığında öğrenci doğru kodla "yanlış" alıyordu.
     */
    solutionCode?: string;
    /**
     * Doğruluk ölçütleri. VARSA `expectedOutput` yerine bunlar uygulanır.
     *
     * `expectedOutput` geriye dönük uyumluluk için duruyor: ölçütü olmayan eski
     * slaytlar tek bir `exact` ölçütüymüş gibi değerlendirilir (bkz.
     * challengeCheck.ts `criteriaOf`).
     */
    criteria?: ChallengeCriterion[];
    /**
     * `expectedOutput` gerçekten çalıştırılarak mı üretildi?
     *
     * Eski slaytlarda (ve çalıştırılamayan görevlerde) elle yazılmış çıktılar
     * var; ikisini ayırmadan öğretmene "bu doğrulandı" diyemeyiz.
     */
    outputVerified?: boolean;
    /**
     * Çözüm büyük ölçüde dışarıdan yapıştırıldıysa öğrenciye iki satırını
     * açıklatsın mı ("Kodunu açıkla")? Varsayılan AÇIK; öğretmen kapatabilir.
     */
    explainIfPasted?: boolean;
    /** Öğretmen değerlendirmesi için dereceli puanlama anahtarı (özellikle Üret projeleri). */
    rubric?: Rubric;
    /** Son teslim (yerel saat) ve geç teslime izin — ödevlerle aynı kural. */
    dueDate?: string;
    allowLate?: boolean;
}

export interface ConnectConfig extends ChallengeConfig {
    /**
     * Birleştirilecek önceki konular.
     *
     * NEDEN LİSTE: birleştirme çoğu zaman tek bir eski kavramla değil, ikisi
     * üçüyle yapılır ("döngü + koşul + liste"). Tek alan bunu anlatamıyordu.
     */
    previousTopics?: string[];
    /** @deprecated Tek önceki konu — eski slaytlar için; `previousTopics`e katılır. */
    previousTopic?: string;
    /** Şimdiki konu/kavram (opsiyonel) */
    currentTopic?: string;
    /**
     * Çözümde KULLANILMASI ZORUNLU yapılar (ör. `for`, `def`).
     *
     * Birleştirmenin gerçekten yapıldığının tek deterministik kanıtı bu: her
     * biri bir `code` ölçütüne dönüşür. Olmasaydı öğrenci görevi yalnızca yeni
     * konuyla çözüp eski konuyu hiç kullanmadan geçebilirdi.
     */
    requiredConstructs?: string[];
}

export interface ProduceConfig extends ChallengeConfig {
    /** Proje başlığı / senaryo adı (opsiyonel) */
    projectTitle?: string;
    /** Tahmini süre (örn: '25 dk') */
    estimatedTime?: string;
    /**
     * Proje gereksinimleri. Değerlendirme ölçütü de bunlar: kontrol sırasında
     * tek bir YZ çağrısıyla madde madde değerlendirilir (bkz. useChallengeCheck).
     */
    requirements?: string[];
}

/** Görev slaytının türü — teslim anahtarının öneki de budur ("connect:<id>"). */
export type TaskKind = 'challenge' | 'connect' | 'produce';

export interface Slide {
    id: number | string;
    // 'normal' is default if undefined
    type?: 'normal' | 'game' | 'coding' | 'homework' | 'challenge' | 'connect' | 'produce';
    /**
     * Grid yerleşimi. VARSA slayt satır/kolon yapısına göre çözümlenir ve iki
     * yüzeyde (16:9 sahne + dar VS Code paneli) ayrı ayrı konumlanır. YOKSA
     * elemanlar kendi x/y'leriyle çizilir — eski slaytlar dokunulmadan çalışır.
     * Bkz. grid.ts
     */
    layout?: import('./grid').SlideLayout;
    gameType?: 'matching' | 'monster';
    gameConfig?: MatchingGameConfig | any;
    homeworkConfig?: HomeworkConfig;
    /** type === 'challenge' olduğunda dolu olur */
    challengeConfig?: ChallengeConfig;
    /** type === 'connect' olduğunda dolu olur */
    connectConfig?: ConnectConfig;
    /** type === 'produce' olduğunda dolu olur */
    produceConfig?: ProduceConfig;
    elements: SlideElement[];
    connections?: SlideConnection[];
    background?: 'default' | 'notebook';
    backgroundColor?: string;
}
