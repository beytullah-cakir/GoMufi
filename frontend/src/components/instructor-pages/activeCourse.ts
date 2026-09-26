/**
 * Öğretmenin "şu an üzerinde çalıştığı kurs": yoklama, duyuru, ödevler ve analiz
 * sayfaları aynı kursla açılır. Öncelik: adresteki ?course= → son seçilen → ilk kurs.
 * Tarayıcı depolaması yalnızca kolaylık; okunamazsa ilk kurs seçilir.
 */
const KEY = 'gomufi:instructor:course';

export const preferredCourse = (ids: number[], param?: string | null): number | null => {
    const fromParam = Number(param);
    if (fromParam && ids.includes(fromParam)) return fromParam;
    try {
        const stored = Number(localStorage.getItem(KEY));
        if (stored && ids.includes(stored)) return stored;
    } catch {
        // depolama kapalı: ilk kursa düş
    }
    return ids[0] ?? null;
};

export const rememberCourse = (id: number | null | undefined) => {
    if (!id) return;
    try {
        localStorage.setItem(KEY, String(id));
    } catch {
        // depolama kapalı: hatırlamadan devam
    }
};
