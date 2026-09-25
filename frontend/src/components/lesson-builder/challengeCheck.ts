import api from '../../api';
import type { ChallengeConfig, ChallengeCriterion, CriterionKind } from './types';

/**
 * UYGULA görevinin doğruluk kontrolü.
 *
 * TASARIM: kontrol bir merdiven. Üst basamaklar deterministik (bedava, anlık,
 * her seferinde aynı sonuç), yalnızca en alt basamak YZ. Bunun sebebi
 * kararlılık: aynı gönderim bir kez geçip bir kez kalırsa öğrenci sistemin adil
 * olmadığını öğrenir ve bunu geri kazanamazsın. YZ gerçekten yargı gereken
 * ölçütler için var, "çıktı esnek" olduğu her yer için değil.
 *
 * "Esnek" görevlerin çoğu aslında ŞABLON: "Adım: {ad}, Soyadım: {soyad}" —
 * değişen iki alan, geri kalanı sabit ve zaten görevin öğrettiği şey o sabit
 * kısım. Şablonla ifade edilince kontrol deterministik kalır ve hata mesajı
 * "virgülden sonra boşluk yok" kadar kesin olur.
 */

/**
 * Ölçüt sonucu üç değerli, iki değil.
 *
 * NEDEN: "Adım: Kadir, Soyadım: Ustasarac" yazan öğrenciyi sondaki ünlem eksik
 * diye REDDETMEK öğretmiyor, cezalandırıyor. Ama sessizce geçmek de öğretmiyor —
 * biçim zaten görevin konusuydu. Doğrusu ikisinin arası: cevabı kabul et, farkı
 * söyle. `near` tam olarak bu.
 */
export type CriterionStatus = 'pass' | 'near' | 'fail' | 'pending';

export interface CriterionResult {
    id: string;
    kind: CriterionKind;
    label: string;
    status: CriterionStatus;
    /** `near` ve `fail` için açıklama — koça ve öğrenciye gösterilir. */
    detail?: string;
    /** Tahkim aşamasının ölçüte geri dönebilmesi için kaynak. */
    source?: ChallengeCriterion;
}

/**
 * Görev geçildi mi? `near` geçer — kabul edilir, not düşülür.
 * `pending` (henüz bakılmadı) geçmez: bakılmamış bir madde onaylanmış sayılamaz.
 */
export const isAccepted = (r: CriterionResult) => r.status === 'pass' || r.status === 'near';

export interface CheckOutcome {
    passed: boolean;
    results: CriterionResult[];
    /** Düşen ilk ölçütün insan okunur özeti; koç bunu alır. */
    failureSummary: string | null;
}

/** Ölçütün öğrenciye gösterilen adı. */
export const criterionLabel = (c: ChallengeCriterion): string => {
    if (c.label) return c.label;
    switch (c.kind) {
        case 'exact': return 'Çıktı birebir doğru';
        case 'template': return 'Çıktı istenen biçimde';
        case 'contains': return `Çıktı "${c.value}" içeriyor`;
        case 'code': return `Kodda "${c.value}" kullanılmış`;
        case 'ai': return c.value;
    }
};

/**
 * Yapılandırmanın ölçütlerini verir.
 *
 * Eski slaytlarda ölçüt yok, yalnızca `expectedOutput` var — onları tek bir
 * ölçüte çeviriyoruz ki eski dersler dokunulmadan çalışsın.
 *
 * Tür `exact` DEĞİL `template`: yer tutucu içermeyen bir şablon zaten birebir
 * eşleşme demek, ama üstüne yakın-eşleşme toleransı geliyor. Yani eski
 * slaytlar da noktalama ve büyük/küçük harf sapmasında öğrenciyi reddetmiyor.
 * Sunucudaki `_normalize_criteria` de aynı seçimi yapıyor; ikisi ayrışırsa
 * aynı görev üretim yolundan geçtiğine göre farklı davranırdı.
 */
export const criteriaOf = (cfg: ChallengeConfig): ChallengeCriterion[] => {
    // Çıktı ölçütleri yalnızca "Ekran çıktısı" kipinde anlamlı. Öğretmen kipi
    // değiştirdiğinde eski ölçütler yapılandırmada kalıyor; uygulansalardı
    // fonksiyon testi görevinde ekran çıktısı da aranırdı. Sunucudaki
    // `_normalize_criteria` da aynı kuralı uyguluyor.
    if (cfg.checkMode && cfg.checkMode !== 'output') return [];
    if (cfg.criteria?.length) return cfg.criteria;
    const expected = (cfg.expectedOutput || '').trim();
    if (!expected) return [];
    return [{ id: 'legacy', kind: 'template', value: expected }];
};

const normalize = (text: string) =>
    text.replace(/\r\n/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').trim();

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Satır yorumu `#` ile başlayan diller; ötekiler `//` kullanıyor. */
const HASH_COMMENT = new Set(['python', 'bash', 'powershell', 'ruby', 'yaml', 'docker']);

/**
 * Kod bu yapıyı kullanıyor mu?
 *
 * Düz `includes` yanıltıyordu: "for" ölçütü `format(...)` ya da
 * `# for kullanmadım` yorumuyla geçiyordu. Kelime benzeri ifadelerde (for,
 * while, def, append) kelime sınırı aranır; yorum satırları sayılmaz.
 * Kelime olmayan ifadeler (`+=`, `[i]`) olduğu gibi aranır.
 */
export const codeUses = (code: string, construct: string, language = 'python'): boolean => {
    const needle = construct.trim();
    if (!needle) return true;
    const marker = HASH_COMMENT.has(language) ? '#' : '//';
    const body = code
        .split('\n')
        .filter((line) => !line.trimStart().startsWith(marker))
        .join('\n');
    if (/^[\p{L}_][\p{L}\p{N}_]*$/u.test(needle)) {
        return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRegExp(needle)}(?![\\p{L}\\p{N}_])`, 'u').test(body);
    }
    return body.includes(needle);
};

/**
 * "Ruhen aynı mı" karşılaştırması için metni sadeleştirir.
 *
 * Noktalama SİLİNMİYOR, boşluğa çevriliyor: `Adım:Kadir` ile `Adım: Kadir`
 * böylece aynı yere düşüyor. Silseydik ilki `adımkadir` olur, ikincisiyle
 * eşleşmezdi ve tam da yakalamak istediğimiz durumu kaçırırdık.
 *
 * Küçük harfe çevirme Türkçe'ye duyarlı: `I` → `ı`, `İ` → `i`. Varsayılan
 * çeviri `İ`yi `i̇` (iki kod noktası) yapar ve karşılaştırma sessizce bozulur.
 */
const loosen = (text: string) =>
    normalize(text)
        .toLocaleLowerCase('tr')
        // Nokta ve virgül SAYILARIN İÇİNDE korunur: `1.70` bir ondalık, ayırıcı
        // değil. Ayırt etmeseydik `1 70` olurdu ve öğrencinin doğru sayısı
        // bozulmuş görünürdü.
        //
        // Ondalık sayılması için İKİ YANIN DA rakam olması şart. Yalnızca
        // "iki yanı da rakam değilse değiştir" deseydik `20,boy` içindeki virgül
        // (solu rakam, sağı harf) ondalık sanılıp korunurdu — oysa o bir ayırıcı.
        .replace(/(?<![0-9])[.,]|[.,](?![0-9])/g, ' ')
        .replace(/[!?;:'"`´’‘“”\-–—_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

/**
 * Şablonu düzenli ifadeye çevirir: `{...}` yerleri serbest, geri kalan birebir.
 *
 * Yer tutucu en az bir karakter ister (`.+`) — boş bırakmak "Adım: , Soyadım: "
 * gibi yarım bir çıktıyı geçirirdi.
 */
const templateToRegExp = (template: string): RegExp => {
    const parts = normalize(template).split(/\{[^}]*\}/);
    const pattern = parts.map(escapeRegExp).join('(.+)');
    return new RegExp(`^${pattern}$`);
};

/**
 * "Kabul edildi ama…" notu: neyin farklı olduğunu söyler.
 *
 * Öğrenci geçtiğini gördü, artık öğretilebilir bir an var — ama bunu bir hata
 * gibi sunmuyoruz.
 */
const nearDetail = (expected: string, actual: string): string => {
    const e = normalize(expected);
    const a = normalize(actual);
    const punct = /[!?.,;:]/g;
    const ePunct = (e.match(punct) || []).join('');
    const aPunct = (a.match(punct) || []).join('');

    if (ePunct !== aPunct) {
        const missing = [...new Set(ePunct.split(''))].filter((p) => !aPunct.includes(p));
        if (missing.length) return `Kabul edildi. Yalnızca "${missing.join(' ')}" eksik.`;
        return 'Kabul edildi. Noktalama beklenenden biraz farklı.';
    }
    if (e.toLocaleLowerCase('tr') === a.toLocaleLowerCase('tr')) {
        return 'Kabul edildi. Büyük/küçük harf farkı var.';
    }
    return 'Kabul edildi. Boşluk veya noktalama farkı var.';
};

/** Şablon düşmüşse nerede saptığını bulmaya çalışır — genel mesaj işe yaramıyor. */
const templateDetail = (template: string, actual: string): string => {
    const t = normalize(template);
    const a = normalize(actual);
    if (!a) return 'Hiçbir şey yazdırılmadı.';
    if (t.split('\n').length !== a.split('\n').length) {
        return `Beklenen ${t.split('\n').length} satır, ${a.split('\n').length} satır yazdırıldı.`;
    }
    // Şablonun sabit parçalarından ilk eksik olanı göster: öğrencinin gözden
    // kaçırdığı şey neredeyse her zaman bir noktalama veya boşluk.
    const literals = t.split(/\{[^}]*\}/).filter((s) => s.trim());
    const missing = literals.find((s) => !a.includes(s));
    if (missing) return `Çıktıda "${missing.trim()}" kısmı beklendiği gibi değil.`;
    return 'Çıktı istenen biçime uymuyor (boşluk veya noktalama farkı olabilir).';
};

interface AIJudge {
    (criterion: string): Promise<{ passed: boolean; reason: string } | null>;
}

/**
 * Tahkim sorusu.
 *
 * Modele "bu doğru mu" diye SORMUYORUZ — beklenen biçimi veriyoruz ve neyin
 * affedilebilir olduğunu açıkça sayıyoruz. Serbest bıraksak bir gün boşluğu
 * affeder, ertesi gün etmez; öğrenci için en kötüsü bu.
 */
const arbitrationCriterion = (expected: string) => [
    `Çıktı şu biçimde isteniyor: "${expected}"`,
    'Öğrenci istenen BİLGİLERİ doğru ve doğru sırada ürettiyse kabul et:',
    'boşluk farkı, noktalama farkı, büyük/küçük harf, eksik birim eki (m, kg, TL),',
    've yer tutucuların yerine kendi verisini koymuş olması sorun DEĞİLDİR.',
    'Bilgilerden biri eksikse, yanlışsa veya sırası bozuksa kabul etme.',
].join('\n');

/**
 * Ölçütleri sırayla uygular.
 *
 * YZ ölçütleri EN SONA bırakılır ve deterministik ölçütlerden biri düştüyse hiç
 * çağrılmaz: öğrenci zaten somut bir eksikle geri dönecek, ayrıca model çağırıp
 * beklemesinin ve para harcamanın anlamı yok.
 */
export const evaluate = async (
    criteria: ChallengeCriterion[], code: string, stdout: string, judge?: AIJudge,
    language = 'python',
): Promise<CheckOutcome> => {
    const results: CriterionResult[] = [];
    const deterministic = criteria.filter((c) => c.kind !== 'ai');
    const aiOnes = criteria.filter((c) => c.kind === 'ai');

    for (const c of deterministic) {
        const label = criterionLabel(c);
        let status: CriterionStatus = 'fail';
        let detail: string | undefined;

        if (c.kind === 'exact' || c.kind === 'template') {
            const strict = c.kind === 'exact'
                ? normalize(stdout) === normalize(c.value)
                : templateToRegExp(c.value).test(normalize(stdout));

            if (strict) {
                status = 'pass';
            } else {
                // Sıkı eşleşme tutmadı; noktalama ve büyük/küçük harf farkını
                // yok sayarak bir daha bak. Tutuyorsa öğrenci işi yapmış,
                // yalnızca biçimde ufak bir sapma var.
                const loose = c.kind === 'exact'
                    ? loosen(stdout) === loosen(c.value)
                    : templateToRegExp(loosen(c.value)).test(loosen(stdout));
                status = loose ? 'near' : 'fail';
                detail = loose
                    ? nearDetail(c.value, stdout)
                    : (c.kind === 'template'
                        ? templateDetail(c.value, stdout)
                        : `Beklenen: ${normalize(c.value)} · Gelen: ${normalize(stdout) || '(boş)'}`);
            }
        } else if (c.kind === 'contains') {
            if (normalize(stdout).includes(c.value.trim())) status = 'pass';
            else if (loosen(stdout).includes(loosen(c.value))) {
                status = 'near';
                detail = 'Metin var ama yazımı birebir aynı değil.';
            } else detail = `Çıktıda "${c.value.trim()}" geçmiyor.`;
        } else if (c.kind === 'code') {
            // Kod ölçütünde gevşetme YOK: "for kullan" dendiyse `for` ya vardır
            // ya yoktur, arada bir hâli yok.
            status = codeUses(code, c.value, language) ? 'pass' : 'fail';
            if (status === 'fail') detail = `Kodda "${c.value.trim()}" kullanılmamış.`;
        }

        results.push({ id: c.id, kind: c.kind, label, status, detail, source: c });
    }

    // --- GRİ BÖLGE TAHKİMİ ---------------------------------------------------
    // Biçim ölçütü düştü ama öğrenci istenen bilgiyi üretmiş olabilir: birim eki
    // unutulmuş, ayırıcı farklı, kelime sırası aynı ama noktalama başka. Metin
    // karşılaştırması bunu "yanlış" der; oysa insan öğretmen "olmuş, şu ufak
    // şey eksik" derdi. Kararı burada modele bırakıyoruz.
    //
    // YALNIZCA bu durumda çağrılıyor: doğru cevap hiç model görmeden, anında ve
    // bedava geçiyor. Model yalnızca kararsız kaldığımız yerde devreye giriyor.
    if (judge) {
        for (const r of results) {
            if (r.status !== 'fail') continue;
            const c = r.source;
            if (!c || (c.kind !== 'template' && c.kind !== 'exact')) continue;

            const verdict = await judge(arbitrationCriterion(c.value));
            if (verdict?.passed) {
                r.status = 'near';
                r.detail = verdict.reason || 'Kabul edildi, biçimde küçük fark var.';
            } else if (verdict?.reason) {
                r.detail = verdict.reason;
            }
        }
    }

    const deterministicOk = results.every(isAccepted);

    for (const c of aiOnes) {
        if (!deterministicOk || !judge) {
            // Değerlendirilmedi: geçmiş gibi göstermek yanlış olurdu, düşmüş
            // gibi göstermek de — bu yüzden ayrı bir "henüz bakılmadı" hali.
            results.push({
                id: c.id, kind: 'ai', label: criterionLabel(c), status: 'pending',
                detail: deterministicOk ? 'Değerlendirilemedi.' : 'Önceki ölçütler geçince bakılacak.',
            });
            continue;
        }
        const verdict = await judge(c.value);
        results.push({
            id: c.id, kind: 'ai', label: criterionLabel(c),
            status: verdict?.passed ? 'pass' : 'fail',
            detail: verdict?.reason,
        });
    }

    const failed = results.find((r) => r.status === 'fail');
    return {
        passed: results.length > 0 && results.every(isAccepted),
        results,
        failureSummary: failed ? `${failed.label}${failed.detail ? ` — ${failed.detail}` : ''}` : null,
    };
};

/**
 * YZ ölçütünü sunucuya sordurur.
 *
 * Kararı (kod, çıktı, ölçüt) üçlüsüne göre önbelleğe alıyoruz: aynı gönderim
 * ikinci kez farklı sonuç verirse öğrenci sistemin adil olmadığını düşünür ve
 * bu, yanlış bir karardan daha çok zarar verir.
 */
const verdictCache = new Map<string, { passed: boolean; reason: string }>();

export const makeAIJudge = (
    courseId: number | string | undefined, task: string, code: string, stdout: string,
): AIJudge => async (criterion: string) => {
    if (!courseId) return null;
    const key = `${criterion} ${code} ${stdout}`;
    const cached = verdictCache.get(key);
    if (cached) return cached;

    try {
        const res = await api.post('/ai/challenge-check', {
            course_id: Number(courseId),
            task,
            criterion,
            student_code: code,
            stdout,
        });
        const verdict = {
            passed: !!res.data?.passed,
            reason: String(res.data?.reason || ''),
        };
        verdictCache.set(key, verdict);
        return verdict;
    } catch {
        return null;
    }
};

/**
 * ÜRET projesinin gereksinimlerini TEK çağrıda değerlendirir.
 *
 * NEDEN AYRI UÇ: her gereksinimi ayrı bir `ai` ölçütü yapmak, beş maddelik
 * bir projede her "Kontrol Et"te beş model çağrısı demekti — hem yavaş hem
 * pahalı. Proje bir bütün; model maddeleri birlikte görünce de daha tutarlı
 * karar veriyor.
 *
 * `null` = değerlendirilemedi (ağ/servis hatası). Çağıran bunu "düştü" değil
 * "bakılamadı" olarak göstermeli.
 */
const reviewCache = new Map<string, Array<{ passed: boolean; reason: string }>>();

export const reviewRequirements = async (
    courseId: number | string | undefined, task: string, requirements: string[],
    code: string, stdout: string,
): Promise<Array<{ passed: boolean; reason: string }> | null> => {
    if (!courseId || !requirements.length) return null;
    const key = JSON.stringify([requirements, code, stdout]);
    const cached = reviewCache.get(key);
    if (cached) return cached;

    try {
        const res = await api.post('/ai/project-review', {
            course_id: Number(courseId),
            task,
            requirements,
            student_code: code,
            stdout,
        });
        const raw: any[] = Array.isArray(res.data?.results) ? res.data.results : [];
        // Model maddeleri atlayabilir ya da sırayı bozabilir; sonucu ÖĞRETMENİN
        // listesine göre diziyoruz, eksik madde "bakılamadı" kalır.
        const byIndex = new Map(raw.map((r) => [Number(r?.index), r]));
        const verdicts = requirements.map((_, i) => {
            const r = byIndex.get(i + 1);
            return r
                ? { passed: !!r.passed, reason: String(r.reason || '') }
                : { passed: false, reason: '' };
        });
        if (raw.length) reviewCache.set(key, verdicts);
        return raw.length ? verdicts : null;
    } catch {
        return null;
    }
};
