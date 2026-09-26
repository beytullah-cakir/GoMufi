/**
 * Site <-> VS Code webview köprüsü.
 *
 * Oynatıcı VS Code'un sağ panelinde bir <iframe> içinde çalışır. O bağlamda iki
 * şey tarayıcıdakinden farklıdır:
 *
 *  1. KİMLİK: webview'ün tarayıcı çerezlerine erişimi yoktur, dolayısıyla
 *     `withCredentials` hiçbir işe yaramaz. Eklenti kendi Bearer token'ını
 *     (işletim sistemi kasasında duran cihaz token'ı) el sıkışmayla buraya verir.
 *  2. ÇALIŞTIR: tarayıcıda "Çalıştır" 127.0.0.1'deki yerel sunucuya HTTP atar;
 *     burada eklenti zaten bir postMessage uzağımızda. Ağ turu, port ve token
 *     denetimi gereksiz — doğrudan mesaj gönderiyoruz.
 *
 * GÜVENLİK: token'ı yalnızca üst çerçeve `vscode-webview://` kökenindeyse kabul
 * ederiz ve cevapları sabit o kökene göndeririz. `*` hedefi kullanılsaydı, sayfa
 * başka bir siteye gömüldüğünde token oraya sızardı.
 */

const VSCODE_ORIGIN_PREFIX = 'vscode-webview://';

interface InitMessage {
    type: 'gomufi:init';
    token: string;
    apiUrl?: string;
}

let hostOrigin: string | null = null;
let deviceToken: string | null = null;
let initResolve: ((ok: boolean) => void) | null = null;

/**
 * VS Code panelinin içinde miyiz?
 *
 * KAYNAK EL SIKIŞMA, referrer DEĞİL: üst çerçeve `vscode-webview://` şemasında
 * ve tarayıcılar http olmayan bir şemadan http'ye referrer göndermiyor —
 * `document.referrer` orada boş kalıyor, dolayısıyla ona bakan bir denetim
 * panelin İÇİNDE bile false döner. `hostOrigin` ise token'ı aldığımız anda
 * doluyor ve yanılma payı yok.
 *
 * Sıralama güvenli: VSCodeLessonPage oynatıcıyı ancak `connectToVSCode()`
 * çözüldükten sonra render ediyor, yani slaytlar çizilirken bu değer hazır.
 */
export const isEmbeddedInVSCode = (): boolean => {
    if (hostOrigin) return true;
    // El sıkışma daha bitmediyse (ör. bağımsız açılmış bir sayfa) referrer bir
    // yedek ipucu; bazı sürümlerde geliyor.
    return window.parent !== window && document.referrer.startsWith(VSCODE_ORIGIN_PREFIX);
};

export const getDeviceToken = () => deviceToken;

/**
 * Eklentiyle el sıkışır: hazır olduğumuzu duyurur, token'ı bekler.
 *
 * Sıralamayı BİZ başlatıyoruz. Eklenti iframe yüklenir yüklenmez gönderseydi,
 * React henüz dinleyiciyi kurmamış olabilir ve mesaj sessizce kaybolurdu.
 */
/**
 * Token her değiştiğinde haber verir.
 *
 * Dinleyici KALICI olmak zorunda: eklenti erişim token'ını süresi dolmadan
 * sessizce tazeliyor ve yenisini aynı `gomufi:init` mesajıyla gönderiyor. İlk
 * mesajdan sonra dinlemeyi bıraksaydık sayfa eski token'la kalır ve yarım saat
 * sonra 401'e düşerdi — düzeltmeye çalıştığımız hatanın ta kendisi.
 */
const tokenSubs = new Set<(token: string) => void>();

export const onDeviceToken = (fn: (token: string) => void): (() => void) => {
    tokenSubs.add(fn);
    return () => { tokenSubs.delete(fn); };
};

let initListenerBound = false;

const bindInitListener = (): void => {
    if (initListenerBound) return;
    initListenerBound = true;

    window.addEventListener('message', (event: MessageEvent) => {
        if (!event.origin.startsWith(VSCODE_ORIGIN_PREFIX)) return;
        if (event.source !== window.parent) return;

        const data = event.data as InitMessage;
        if (data?.type !== 'gomufi:init' || typeof data.token !== 'string') return;

        hostOrigin = event.origin;
        deviceToken = data.token;
        initResolve?.(true);
        initResolve = null;
        tokenSubs.forEach((fn) => fn(data.token));
    });
};

/**
 * "Şu dersin şu slaydını aç" — tarayıcıdan VS Code'a geçen öğrencinin adresi.
 *
 * Panel zaten açıkken gelir (kapalıysa adres iframe'in URL'inde taşınır, orada
 * mesaja gerek yok). Abonelik KALICI: öğrenci tarayıcı ile VS Code arasında
 * birden çok kez gidip gelebilir.
 */
export interface LessonTarget {
    course?: string;
    module?: string;
    slide?: number;
}

const targetSubs = new Set<(t: LessonTarget) => void>();

export const onOpenTarget = (fn: (t: LessonTarget) => void): (() => void) => {
    bindTargetListener();
    targetSubs.add(fn);
    return () => { targetSubs.delete(fn); };
};

let targetListenerBound = false;

const bindTargetListener = (): void => {
    if (targetListenerBound) return;
    targetListenerBound = true;
    window.addEventListener('message', (event: MessageEvent) => {
        if (!event.origin.startsWith(VSCODE_ORIGIN_PREFIX)) return;
        const data = event.data;
        if (data?.type !== 'gomufi:openTarget') return;
        targetSubs.forEach((fn) => fn({
            course: data.course, module: data.module, slide: Number(data.slide) || 0,
        }));
    });
};

export const connectToVSCode = (timeoutMs = 8000): Promise<boolean> =>
    new Promise((resolve) => {
        bindInitListener();
        if (deviceToken) {
            resolve(true);
            return;
        }
        initResolve = resolve;

        window.parent.postMessage({ type: 'gomufi:ready' }, '*');

        setTimeout(() => {
            if (deviceToken) return;
            initResolve?.(false);
            initResolve = null;
        }, timeoutMs);
    });

/**
 * Eklentiden yeniden giriş ister (tarayıcıda onay akışı).
 *
 * Süresi dolmuş bir token'la yapılan her istek aynı 401'i alır; sayfanın kendi
 * başına yapabileceği hiçbir şey yok. Giriş bitince eklenti taze token'ı
 * `gomufi:init` ile geri gönderiyor ve `onDeviceToken` dinleyicileri uyanıyor.
 */
export const requestSignInFromVSCode = (): boolean => {
    if (!hostOrigin) return false;
    window.parent.postMessage({ type: 'gomufi:signIn' }, hostOrigin);
    return true;
};

/**
 * Ders seçildiğini bildirir; eklenti o modülün çalışma klasörünü açar (yoksa
 * oluşturur) ve sonraki "Çalıştır"lar oraya yazar.
 */
export const openLessonInVSCode = (courseTitle: string, moduleTitle: string): void => {
    if (!hostOrigin) return;
    window.parent.postMessage({ type: 'gomufi:openLesson', courseTitle, moduleTitle }, hostOrigin);
};

/**
 * Slaydın aşamasını bildirir; eklenti ders paneli / kod editörü genişlik
 * dengesini ona göre kurar (ANLA'da panel geniş, UYGULA/ÜRET'te kod geniş,
 * QUIZ/ÖDEV'de panel neredeyse tam ekran).
 *
 * Oranı burada DEĞİL eklentide tutuyoruz: kullanıcının elle yaptığı ±%10
 * ayarları VS Code'un kendi belleğinde saklanmalı ki sayfa yenilense de kalsın.
 */
export const setVSCodeStage = (stage: string): void => {
    if (!hostOrigin) return;
    window.parent.postMessage({ type: 'gomufi:layout', stage }, hostOrigin);
};

/**
 * Kodu VS Code editöründe AÇAR (çalıştırmaz).
 *
 * NEDEN AYRI BİR MESAJ: dar panelde en çok yatay yer isteyen şey kod. Web'de
 * `Yazı | Kod` yan yana olmak zorunda çünkü başka yer yok — ama VS Code'da
 * zaten bir kod editörü var; panelin içinde ikinci bir kod ekranı göstermek
 * aynı yeri iki kez harcamak. Kod editöre taşınınca panelin dar olması sorun
 * olmaktan çıkıyor. Küçülme değil, yeniden dağıtım.
 */
export const openCodeInVSCode = (code: string, language: string, title?: string): boolean => {
    if (!hostOrigin) return false;
    window.parent.postMessage({ type: 'gomufi:openCode', code, language, title }, hostOrigin);
    return true;
};

/* --------------------------- İSTEK / YANIT --------------------------------
 * Yukarıdaki mesajlar tek yönlü ("şunu yap"). UYGULA görevi ise cevap bekler:
 * öğrencinin kodu ve çıktısı VS Code'da, ama doğru/yanlış kararını ve YZ
 * çağrısını site veriyor. Her isteğe bir id takıp gelen yanıtı eşliyoruz.
 */

const pending = new Map<string, (data: any) => void>();
let replyListenerBound = false;

const bindReplyListener = () => {
    if (replyListenerBound) return;
    replyListenerBound = true;
    window.addEventListener('message', (event: MessageEvent) => {
        if (!event.origin.startsWith(VSCODE_ORIGIN_PREFIX)) return;
        const data = event.data;
        if (data?.type !== 'gomufi:reply' || typeof data.id !== 'string') return;
        const resolve = pending.get(data.id);
        if (!resolve) return;
        pending.delete(data.id);
        resolve(data);
    });
};

const request = <T>(type: string, body: Record<string, unknown>, timeoutMs = 30_000): Promise<T | null> => {
    if (!hostOrigin) return Promise.resolve(null);
    bindReplyListener();

    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return new Promise<T | null>((resolve) => {
        pending.set(id, resolve as (d: any) => void);
        window.parent.postMessage({ type, id, ...body }, hostOrigin as string);

        // Eklenti çökerse veya mesaj kaybolursa arayüz sonsuza kadar "kontrol
        // ediliyor" göstermesin.
        setTimeout(() => {
            if (!pending.has(id)) return;
            pending.delete(id);
            resolve(null);
        }, timeoutMs);
    });
};

export interface TaskCheckResult {
    ok: boolean;
    /** Çalıştırılan (giriş) dosyanın içeriği. */
    code: string;
    /**
     * Görevin TÜM dosyaları. Eski eklenti sürümleri göndermez; çağıran
     * yokluğunda `code`a düşer (bkz. useChallengeCheck).
     */
    files?: Array<{ name: string; content: string; entry?: boolean }>;
    stdout: string;
    stderr: string;
    timedOut: boolean;
    error?: string;
}

/**
 * Hangi dosya: öğrencinin çözümü mü, öğretmenin doğrulama çalıştırması mı?
 * İkisi ayrı dosya — öğretmen ders hazırlarken öğrencinin çözümünü ezmemeli.
 */
export type TaskSlot = 'student' | 'solution';

/**
 * Göreve giden dosya. Eklenti bunları aynı klasöre yazar, `entry` olanı
 * çalıştırır. Tip burada da duruyor (ders yapılandırmasından import etmek
 * yerine) çünkü köprü yalnızca TELİ tanır, dersin veri modelini değil.
 */
export interface TaskFile {
    name: string;
    content: string;
    entry?: boolean;
}

/**
 * Görev dosyasını VS Code'da hazırlar ve editörde açar.
 * `student` yuvasında dosya varsa dokunulmaz; `solution` her zaman tazelenir.
 */
export const prepareTaskInVSCode = (
    files: TaskFile[], language = 'python', slot: TaskSlot = 'student',
    /**
     * Görevin kimliği: kendi klasörü (ör. "birlestir-8374") ve yazım kaydının
     * gideceği kurs/görev. Verilmezse eski davranış: tüm görevler ortak
     * klasörde, yazım kaydı yok. Bkz. localRunner.ts `prepareTask`.
     */
    target?: { folder?: string; courseId?: number | string; taskKey?: string },
) =>
    request<{ ok: boolean; path?: string; error?: string }>(
        'gomufi:prepareTask', {
            files, language, slot, ...target,
            // ESKİ EKLENTİ İÇİN: `files` alanını tanımayan sürüm `starter`ı
            // okuyor. Kullanıcının eklentisi siteden eski olabilir; o durumda
            // görev çok dosyalı olmasa da AÇILSIN.
            starter: (files.find((f) => f.entry) ?? files[0])?.content ?? '',
        },
    );

/**
 * Koçun ipucunu öğrencinin editöründe, ilgili satırın yanında gösterir.
 *
 * Panelde de duruyor ama asıl yeri burası: "3. satırda şu var" diyen bir ipucu
 * için öğrencinin panelden koda göz taşıması gerekiyordu; tanı olarak
 * iliştirilince işaret ile hedef aynı ekranda oluyor. Boş mesaj eskisini siler.
 */
export const showHintInVSCode = (
    message: string, line = 0, language = 'python', file?: string,
): void => {
    if (!hostOrigin) return;
    window.parent.postMessage(
        { type: 'gomufi:hint', message, line, language, file, slot: 'student' }, hostOrigin,
    );
};

/**
 * Görev doğru çözüldüğünde VS Code editöründe YEŞİL KUTLAMA VURGUSU tetikler.
 */
export const showSuccessInVSCode = (
    message = 'Tebrikler!', xp = 100, language = 'python', file?: string,
): void => {
    if (!hostOrigin) return;
    window.parent.postMessage(
        { type: 'gomufi:success', message, xp, language, file, slot: 'student' }, hostOrigin,
    );
};

/**
 * Editörde belirtilen satırı öne getirir, imleci o satıra koyar ve odaklanır.
 */
export const revealLineInVSCode = (
    line: number, language = 'python', file?: string,
): void => {
    if (!hostOrigin) return;
    window.parent.postMessage(
        { type: 'gomufi:revealLine', line, language, file, slot: 'student' }, hostOrigin,
    );
};

/**
 * Görev dosyasını çalıştırır ve kod + çıktısıyla döner.
 *
 * `visible` (varsayılan): program öğrencinin terminalinde, gözünün önünde
 * çalışır ve `input()` sorularına kendisi cevap verir; program durunca çıktısı
 * okunup kontrol edilir. Öğrenci için doğrusu bu — tek çalıştırma, görünür yer.
 *
 * `visible: false`: gizli süreç, girdi `stdin`den beslenir. Öğretmenin çözümü
 * doğrulaması için — orada etkileşim istemiyoruz, ölçüm istiyoruz.
 *
 * `stdin`: yalnızca gizli çalıştırmada kullanılır (ve terminal yolu kabuk
 * desteği olmadığında ona düştüğünde yedek olarak).
 */
export const checkTaskInVSCode = (
    language = 'python', slot: TaskSlot = 'student', stdin = '', visible = true,
    entry?: string,
) => request<TaskCheckResult>('gomufi:checkTask', { language, slot, stdin, visible, entry });

/**
 * Kodu VS Code'a gönderir: eklenti dosyaya yazıp editörde açar ve terminalde
 * çalıştırır. Köprü kurulmamışsa false döner — çağıran "VS Code'u aç" göstermeli.
 */
export const runInVSCode = (code: string, language: string, title?: string): boolean => {
    if (!hostOrigin) return false;
    window.parent.postMessage({ type: 'gomufi:run', code, language, title }, hostOrigin);
    return true;
};

/** Fonksiyon testlerini VS Code'da, öğrencinin (ya da öğretmenin çözüm) dosyalarıyla çalıştırır. */
export const runTestsInVSCode = (
    body: { language: string; slot: TaskSlot; entry: string; tests: unknown[]; stdin: string; files?: TaskFile[] },
) => request<{ ok: boolean; results?: any[]; fatal?: string | null; error?: string }>('gomufi:runTests', body, 60_000);
