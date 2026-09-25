/**
 * Canlı dersin görüntülü görüşme linki.
 *
 * GoMufi görüşme açmıyor: öğretmen dersi sınıfta ya da kendi seçtiği
 * platformda (Zoom, Meet, okulun sistemi…) işliyor ve linkini kursa ekliyor.
 * GoMufi slaytları, görevleri ve canlı panoyu yönetiyor.
 *
 * Link, `/session-status` yoklamasıyla önceden hafızaya alınır ve "Derse katıl"
 * tıklamasında hemen açılır — tarayıcılar `await` sonrasında açılan sekmeyi
 * açılır pencere sayıp engelliyor.
 */
const knownLinks = new Map<string, string | null>();

export function rememberMeetingLink(courseId: number | string, url?: string | null): void {
    knownLinks.set(String(courseId), url || null);
}

/** Link varsa yeni sekmede açar; tıklama işleyicisinde, ilk `await`'ten ÖNCE çağırın. */
export function openMeetingLink(courseId: number | string, url?: string | null): boolean {
    const target = url || knownLinks.get(String(courseId));
    if (!target) return false;
    window.open(target, '_blank', 'noopener,noreferrer');
    return true;
}
