import * as vscode from 'vscode';

/**
 * Ders paneli / kod editörü genişlik dengesi.
 *
 * NEDEN AŞAMAYA GÖRE: slaytın istediği şey aşamadan aşamaya değişiyor. ANLA'da
 * öğrenci okuyor — kod ekranı sadece "birazdan buraya yazacaksın" demek için
 * duruyor. UYGULA/ÜRET'te tam tersi: metin kısaldı, iş kodda. Sabit bir 50/50
 * ikisinde de yanlış olurdu; öğrenci her slaytta sashi eliyle çekmek zorunda
 * kalırdı.
 *
 * NEDEN ELLE TWEEN: `vscode.setEditorLayout` anlık uygulanır, CSS geçişi yoktur.
 * Oran bir karede 0.70'ten 0.40'a atlayınca ekran "sıçrıyor" ve öğrenci neyin
 * değiştiğini kaçırıyor. Hedefe kısa adımlarla yürüyerek geçişi göz takip
 * edilebilir hale getiriyoruz.
 */

/** Panelin ekrandan aldığı pay. Kod editörünün payı bunun tümleyeni. */
const STAGE_RATIO: Record<string, number> = {
    // Anlatım: panel %70, kod %30.
    'ANLA': 0.70,
    // Uygulama aşamaları: kod %60, panel %40. BİRLEŞTİR de buraya giriyor —
    // öğrenci orada da kod yazıyor, okumuyor.
    'UYGULA': 0.40,
    'BİRLEŞTİR': 0.40,
    'ÜRET': 0.40,
    // Değerlendirme: soru ekranı tam ekran, kod yalnızca bir şerit halinde
    // kalıyor. Tamamen kapatmıyoruz; öğrenci yazdığı çözüme bakabilmeli.
    'QUIZ': 0.94,
    'ÖDEV': 0.94,
};

const DEFAULT_RATIO = 0.5;
/** Elle büyütme/küçültme adımı. */
const STEP = 0.10;
/** Sınırlar: hiçbir taraf tamamen yok olmasın. */
const MIN_RATIO = 0.15;
const MAX_RATIO = 0.94;

const DURATION_MS = 320;
const FRAME_MS = 16;

let ratio = DEFAULT_RATIO;
let active = false;
let tween: NodeJS.Timeout | null = null;
/** Aşama başına kullanıcının kendi ayarı; bir sonraki aynı aşamada hatırlanır. */
let store: vscode.Memento | null = null;
let stage = '';

export function init(memento: vscode.Memento): void {
    store = memento;
}

/** Ders paneli açıldı/kapandı. Kapalıyken düzeni ellemiyoruz. */
export function setActive(value: boolean): void {
    active = value;
    if (!value) stopTween();
}

/**
 * Slayt aşaması değişti. Kullanıcı o aşamada daha önce elle ayar yaptıysa onun
 * değeri kullanılır — tercihini her modülde yeniden yapmak zorunda kalmasın.
 */
export async function applyStage(next: string): Promise<void> {
    stage = (next || '').toUpperCase();
    const saved = store?.get<number>(key(stage));
    const target = saved ?? STAGE_RATIO[stage] ?? DEFAULT_RATIO;
    await animateTo(target);
}

/** Komut: ders panelini %10 büyüt. */
export async function growLesson(): Promise<void> {
    await nudge(STEP);
}

/** Komut: kod editörünü %10 büyüt (panel küçülür). */
export async function growEditor(): Promise<void> {
    await nudge(-STEP);
}

/** Komut: aşamanın varsayılan oranına dön, elle ayarı unut. */
export async function resetRatio(): Promise<void> {
    if (stage) await store?.update(key(stage), undefined);
    await animateTo(STAGE_RATIO[stage] ?? DEFAULT_RATIO);
}

async function nudge(delta: number): Promise<void> {
    if (!active) {
        vscode.window.showInformationMessage(
            'GoMufi: Önce ders panelini aç (GoMufi: Dersleri Aç).',
        );
        return;
    }
    const target = clamp(ratio + delta);
    // Elle yapılan ayar aşamaya yazılır; aynı aşamaya dönüldüğünde geri gelsin.
    if (stage) await store?.update(key(stage), target);
    await animateTo(target);
}

/**
 * Hedef orana yumuşak geçiş.
 *
 * Devam eden bir geçiş varsa iptal edilir: öğrenci slaytları hızlı geçerken iki
 * animasyon üst üste binerse panel ileri geri titrer.
 */
function animateTo(target: number): Promise<void> {
    stopTween();
    const to = clamp(target);
    if (!active) {
        // Panel kapalıyken oranı yine de kaydediyoruz ki açıldığında doğru yerden başlasın.
        ratio = to;
        return Promise.resolve();
    }

    const from = ratio;
    if (Math.abs(to - from) < 0.005) {
        ratio = to;
        return applyRatio(to);
    }

    return new Promise((resolve) => {
        const started = Date.now();
        tween = setInterval(() => {
            const t = Math.min(1, (Date.now() - started) / DURATION_MS);
            // easeOutCubic: hızlı başlayıp yavaşlayan geçiş, göze doğal gelir.
            const eased = 1 - Math.pow(1 - t, 3);
            ratio = from + (to - from) * eased;
            void applyRatio(ratio);

            if (t >= 1) {
                stopTween();
                ratio = to;
                void applyRatio(to);
                resolve();
            }
        }, FRAME_MS);
    });
}

function stopTween(): void {
    if (tween) {
        clearInterval(tween);
        tween = null;
    }
}

/**
 * Oranı VS Code'a yazar.
 *
 * İki grup yoksa çıkıyoruz: kullanıcı üçüncü bir editör grubu açmışsa
 * `setEditorLayout` onu zorla ikiye indirir ve açtığı dosyalar yer değiştirir.
 * Düzenini bozmaktansa oranı uygulamamayı tercih ediyoruz.
 */
async function applyRatio(value: number): Promise<void> {
    if (vscode.window.tabGroups.all.length !== 2) return;
    try {
        await vscode.commands.executeCommand('vscode.setEditorLayout', {
            // 0 = yatay: gruplar yan yana. Panel ikinci sütunda (ViewColumn.Two).
            orientation: 0,
            groups: [{ size: 1 - value }, { size: value }],
        });
    } catch {
        // Düzen değişimi sırasında grup sayısı değişmiş olabilir; sonraki kare düzeltir.
    }
}

const clamp = (v: number): number => Math.min(MAX_RATIO, Math.max(MIN_RATIO, v));
const key = (s: string): string => `gomufi.ratio.${s || 'DEFAULT'}`;
