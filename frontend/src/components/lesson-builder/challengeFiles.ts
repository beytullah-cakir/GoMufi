import { findLanguage } from './codeLanguages';
import type { ChallengeConfig, ChallengeFile } from './types';

/**
 * UYGULA görevinin dosya listesi — tek kaynak.
 *
 * NEDEN AYRI MODÜL: aynı listeyi dört yer soruyor (öğretmenin kurduğu sekmeler,
 * tarayıcıdaki laboratuvar, VS Code panelindeki görev, öğretmenin çözüm
 * doğrulaması). Her biri kendi "dosya yoksa ne yapayım" kuralını yazsaydı,
 * biri `gorev.py` derken diğeri `main.py` der ve öğrencinin dosyası ikiye
 * bölünürdü.
 *
 * ESKİ GÖREVLER: `files` alanı olmayan görevler tek dosyalı bir liste gibi
 * görünür ve dosya adı `gorev.<ext>` kalır — eskiden diske yazılan ad buydu,
 * değiştirirsek öğrencinin üzerinde çalıştığı dosya bir anda "kaybolur".
 */

/** Uzantısı olmayan dile göre varsayılan tek dosya adı. */
export const legacyFileName = (language?: string): string =>
    `gorev.${findLanguage(language).ext}`;

/**
 * Dosya adını güvenli hale getirir.
 *
 * Eklenti aynı temizliği bir kez daha yapıyor (orası diske yazan taraf ve
 * tarayıcıya güvenemez); burada yapmamızın sebebi öğretmene ANINDA doğru adı
 * göstermek — kaydettiği `src/main.py` sessizce `main.py` olarak yazılacaksa
 * bunu kaydederken görmeli.
 */
export const safeFileName = (raw: string): string =>
    (raw.split(/[\\/]/).pop() ?? '')
        .replace(/[^A-Za-z0-9._-]/g, '')
        .replace(/^\.+/, '')
        .slice(0, 64);

/**
 * Görevin dosyaları: her zaman en az bir dosya, her zaman tam olarak bir giriş.
 *
 * `starter` çağırandan geliyor çünkü tek dosyalı görevin içeriği yalnızca
 * `starterCode` değil — kip'e göre üretilen bir iskelet de olabilir
 * (bkz. ChallengeSlideBuilder `starterFor`).
 */
export const challengeFiles = (
    cfg: Pick<ChallengeConfig, 'files' | 'language'>, starter: string,
): ChallengeFile[] => {
    const clean = (cfg.files ?? [])
        .map((f) => ({ ...f, name: safeFileName(f.name || '') }))
        .filter((f) => f.name);

    if (!clean.length) {
        return [{ name: legacyFileName(cfg.language), content: starter, entry: true }];
    }
    // Aynı ad iki kez verilmişse ikincisi diske YAZILMAZ (aynı dosyadır);
    // listede tutmak öğretmene var olmayan bir dosya gösterirdi.
    const unique = clean.filter((f, i) => clean.findIndex((o) => o.name === f.name) === i);
    // TAM OLARAK BİR giriş dosyası: hiç işaretli yoksa ilki, birden fazla
    // işaretliyse yine ilki. "Hangi dosya çalışıyor" sorusunun tek cevabı
    // olmalı, yoksa arayüz bir dosyayı gösterirken eklenti başkasını çalıştırır.
    const at = Math.max(0, unique.findIndex((f) => f.entry));
    return unique.map((f, i) => ({ ...f, entry: i === at }));
};

/** Çalıştırılan dosya. Liste boş olamaz (bkz. `challengeFiles`). */
export const entryFile = (files: ChallengeFile[]): ChallengeFile =>
    files.find((f) => f.entry) ?? files[0];

/**
 * Ölçüm ve YZ koçu için tek metin.
 *
 * Tek dosyada kodun kendisi; birden fazlasında dosya adı başlıklarıyla
 * birleştirilmiş hâli. Yalnızca çalıştırılan dosyayı göndermek, çözümü
 * `odev.py`ye yazan öğrenciyi "hiç kod yazmamış" gibi gösterirdi.
 */
export const joinFiles = (files: ChallengeFile[]): string =>
    files.length === 1
        ? files[0].content
        : files.map((f) => `# ===== ${f.name} =====\n${f.content}`).join('\n\n');
