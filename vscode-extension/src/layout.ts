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
 * NEDEN ANİ, GEÇİŞSİZ: burada bir zamanlar elle tween vardı — oran hedefe kısa
 * adımlarla yürütülüyordu. Fikir iyiydi ama bu API'de yürümüyor: her adım
 * eklenti sürecinden pencereye giden ayrı bir komut ve tam bir yerleşim hesabı,
 * arada CSS geçişi yok. Adımlar yetişemediği için geçiş akıcı değil TAKIRTILI
 * görünüyordu; yani tween, önlemek için var olduğu şeyin (dikkat dağıtan bir
 * hareket) daha kötüsünü üretiyordu. Kare hızını pencereye bağlamak ve görünmez
 * kareleri atlamak da yetmedi.
 *
 * Ani uygulama zaten VS Code'un kendi davranışı: editör bölme, kenar çubuğu
 * açma/kapama, düzen değiştirme — hepsi tek karede olur. Panelin de öyle
 * davranması yabancı değil, tam tersine tanıdık.
 */

/** Panelin ekrandan aldığı pay. Kod editörünün payı bunun tümleyeni. */
const STAGE_RATIO: Record<string, number> = {
    // Ders seçim haritası: panel %38. UYGULA'dan (%40) bir tık dar, çünkü burada
    // öğrenci henüz ders içinde değil — yol haritası dikey akan dar bir şerit,
    // genişlik ona bir şey katmıyor; o sırada açık olan kendi kodu görünsün.
    'HARITA': 0.38,
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
/** Bu kadarlık bir fark göze görünmüyor; boşuna yerleşim hesabı yaptırmayalım. */
const MIN_STEP = 0.004;

let ratio = DEFAULT_RATIO;
let active = false;
/** Aşama başına kullanıcının kendi ayarı; bir sonraki aynı aşamada hatırlanır. */
let store: vscode.Memento | null = null;
let stage = '';

export function init(memento: vscode.Memento): void {
    store = memento;
}

/** Ders paneli açıldı/kapandı. Kapalıyken düzeni ellemiyoruz. */
export function setActive(value: boolean): void {
    active = value;
}

/**
 * Slayt aşaması değişti. Kullanıcı o aşamada daha önce elle ayar yaptıysa onun
 * değeri kullanılır — tercihini her modülde yeniden yapmak zorunda kalmasın.
 */
export async function applyStage(next: string): Promise<void> {
    stage = (next || '').toUpperCase();
    const saved = store?.get<number>(key(stage));
    await setRatio(saved ?? STAGE_RATIO[stage] ?? DEFAULT_RATIO);
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
    await setRatio(STAGE_RATIO[stage] ?? DEFAULT_RATIO);
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
    await setRatio(target);
}

/**
 * Oranı hedefe getirir.
 *
 * Panel kapalıyken de değeri saklıyoruz ki açıldığında doğru yerden başlasın —
 * öğrenci paneli kapatıp açtığında düzen sıfırlanmış gibi görünmesin.
 */
async function setRatio(target: number): Promise<void> {
    const to = clamp(target);
    // Aynı aşama birden çok kez bildirilebiliyor (sayfa yüklenirken iki kez
    // gelir). Fark yoksa pencereyi hiç rahatsız etmiyoruz.
    if (active && Math.abs(to - ratio) < MIN_STEP) return;

    ratio = to;
    if (!active) return;
    await applyRatio(to);
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
        // Düzen değişimi sırasında grup sayısı değişmiş olabilir; yok sayıyoruz.
    }
}

const clamp = (v: number): number => Math.min(MAX_RATIO, Math.max(MIN_RATIO, v));
const key = (s: string): string => `gomufi.ratio.${s || 'DEFAULT'}`;
