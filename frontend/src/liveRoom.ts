import api from './api';

/**
 * Canlı dersin görüntülü görüşme odası.
 *
 * Jitsi entegrasyonu ŞİMDİLİK KAPALI. Ders sınıfta ya da öğretmenin kendi
 * seçtiği çevrimiçi platformda (Zoom, Meet, okulun sistemi…) işlenebiliyor;
 * GoMufi görüntüye karışmıyor, yalnızca slaytları, görevleri ve canlı panoyu
 * yönetiyor. Eskiden ders başlarken ve öğrenci katılırken otomatik olarak bir
 * Jitsi penceresi açılıyordu.
 *
 * Geri açmak için ortam değişkeni: VITE_ENABLE_JITSI=true
 */
export const VIDEO_ROOM_ENABLED = import.meta.env.VITE_ENABLE_JITSI === 'true';

const JITSI_FLAGS = '#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false';

export async function openVideoRoom(courseId: number | string, features?: string): Promise<void> {
    if (!VIDEO_ROOM_ENABLED) return;
    try {
        const res = await api.get(`/jitsi/token/${courseId}`);
        const { token, room, domain } = res.data;
        window.open(`https://${domain}/${room}?jwt=${token}${JITSI_FLAGS}`, '_blank', features);
    } catch (err) {
        console.warn('Jitsi anahtarı alınamadı, herkese açık odaya geçiliyor:', err);
        window.open(`https://meet.jit.si/GoMufi-Room-${courseId}${JITSI_FLAGS}`, '_blank', features);
    }
}
