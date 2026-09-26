import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { ChunkyButton, Mufi, type MufiPose } from './ui';

/**
 * İlk giriş turu: Mufi yeni öğrenciye ana sayfayı 5 adımda gezdirir.
 *
 * Her adım bir `data-tour` / `data-nav` hedefini aydınlatır; hedef o ekran
 * boyutunda görünmüyorsa (ör. telefonda sağ sütun yok) kart ortada durur.
 * Tur bir kez gösterilir (kullanıcıya özel, bu tarayıcıda); profilden
 * yeniden başlatılabilir (bkz. `restartTour`).
 */

interface TourStep {
    /** CSS seçicileri, `|` ile öncelik sırasında — ilk GÖRÜNEN eşleşme aydınlatılır. */
    target?: string;
    title: string;
    text: string;
    pose: MufiPose;
}

const steps = (name: string): TourStep[] => [
    { title: `Merhaba ${name}!`, pose: 'wave',
      text: 'Ben Mufi, kodlama yolculuğunda sana eşlik edeceğim. Sana buranın nasıl çalıştığını 1 dakikada göstereyim mi?' },
    { target: '[data-tour="continue"]', title: 'Kaldığın yerden devam et', pose: 'build',
      text: 'Bu düğme seni her zaman sıradaki modüle götürür. Ne yapacağını düşünmene gerek yok!' },
    { target: '[data-tour="next-module"]|[data-tour="map"]', title: 'Yol haritan', pose: 'peek',
      text: 'Her durak bir modül. Bitirdikçe yıldız ve XP kazanırsın; arada ödül sandıkları var. Onları kaçırma!' },
    { target: '[data-tour="tools"]', title: 'VS Code ve bildirimler', pose: 'build',
      text: 'Kodlarını kendi bilgisayarında VS Code\'da yazarsın. Buradaki ışık yeşilse her şey hazır. Zil ise ödevleri, duyuruları ve canlı dersleri haber verir.' },
    { target: '[data-nav="Soru Sor!"]', title: 'Takıldın mı?', pose: 'peek',
      text: 'Soru Sor\'dan öğretmenine yazabilirsin. Takıldığında 10 dakikadan fazla bekleme!' },
    { title: 'Hazırsın!', pose: 'wave',
      text: 'Haydi ilk modülüne başlayalım. Her gün biraz çalışırsan serin büyür, seviye atlarsın.' },
];

const tourKey = (userId: unknown) => `gomufi.tourDone.${userId}`;

export const shouldShowTour = (userId: unknown): boolean => {
    if (userId == null) return false;
    try { return localStorage.getItem(tourKey(userId)) !== '1'; } catch { return false; }
};

const markDone = (userId: unknown) => {
    try { localStorage.setItem(tourKey(userId), '1'); } catch { /* yalnızca bu oturum */ }
};

/** Profildeki "Tanıtım turunu tekrar izle": işareti siler, ana sayfa turu yeniden açar. */
export const restartTour = (userId: unknown) => {
    try { localStorage.removeItem(tourKey(userId)); } catch { /* yok say */ }
};

const visibleTarget = (selectors?: string): HTMLElement | null => {
    for (const selector of (selectors || '').split('|').filter(Boolean)) {
        for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
            const r = el.getBoundingClientRect();
            if (r.width > 0 && r.height > 0) return el;
        }
    }
    return null;
};

const PAD = 8;

export const OnboardingTour: React.FC<{ userId: unknown; name: string; onClose: () => void }> = ({ userId, name, onClose }) => {
    const list = steps(name);
    const [index, setIndex] = useState(0);
    const [rect, setRect] = useState<DOMRect | null>(null);
    const step = list[index];
    const target = step.target;
    const last = index === list.length - 1;

    // Hedefi görünür alana getir, sonra ölç (kaydırma bitince bir kez daha); pencere
    // boyutu ya da kaydırma değişince yeniden ölç.
    useLayoutEffect(() => {
        const measure = () => {
            const el = visibleTarget(target);
            if (!el) return setRect(null);
            // Hedefin dışına taşan süsü de (ör. modülün süzülen ikonu) aydınlatmaya kat.
            const r = el.getBoundingClientRect();
            const extra = Number(el.dataset.tourTop || 0);
            setRect(new DOMRect(r.left, r.top - extra, r.width, r.height + extra));
        };
        const el = visibleTarget(target);
        if (el) {
            const r = el.getBoundingClientRect();
            if (r.top < 80 || r.bottom > window.innerHeight - 80) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        const frame = requestAnimationFrame(measure);
        const later = setTimeout(measure, 450);
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
            cancelAnimationFrame(frame);
            clearTimeout(later);
            window.removeEventListener('resize', measure);
            window.removeEventListener('scroll', measure, true);
        };
    }, [target]);

    const finish = useCallback(() => { markDone(userId); onClose(); }, [userId, onClose]);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') finish();
            if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, list.length - 1));
            if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0));
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [finish, list.length]);

    // Kart: hedefin altına sığıyorsa altına, sığmıyorsa üstüne; hedef yoksa ortaya.
    const cardWidth = Math.min(360, window.innerWidth - 32);
    let cardStyle: React.CSSProperties = { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: cardWidth };
    if (rect) {
        const left = Math.min(Math.max(16, rect.left + rect.width / 2 - cardWidth / 2), window.innerWidth - cardWidth - 16);
        const below = rect.bottom + PAD + 16;
        const above = rect.top - PAD - 16;
        cardStyle = window.innerHeight - below > 260
            ? { left, top: below, width: cardWidth }
            : above > 260
                ? { left, bottom: window.innerHeight - above, width: cardWidth }
                // Hedef ekranı dolduruyor: kart alt kenara oturur.
                : { left, bottom: 16, width: cardWidth };
    }

    return (
        <div className="fixed inset-0 z-[600]" role="dialog" aria-modal="true" aria-label="Tanıtım turu">
            {rect ? (
                <div className="absolute rounded-3xl border-4 border-amber-300 pointer-events-none transition-all duration-300"
                     style={{ left: rect.left - PAD, top: Math.max(4, rect.top - PAD), width: rect.width + PAD * 2,
                              height: Math.min(rect.bottom + PAD, window.innerHeight - 4) - Math.max(4, rect.top - PAD),
                              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.62)' }} />
            ) : (
                <div className="absolute inset-0 bg-slate-900/60" />
            )}
            <div className="absolute" style={cardStyle}>
                <div key={index} className="relative animate-pop-in bg-white rounded-[1.75rem] border-2 border-slate-200 border-b-[6px] p-5 pt-4">
                    <div className="flex items-start gap-3">
                        <Mufi pose={step.pose} className="w-16 shrink-0 -mt-1" />
                        <div className="min-w-0">
                            <p className="text-[11px] font-black uppercase tracking-widest text-violet-500">{index + 1} / {list.length}</p>
                            <h2 className="text-lg font-black font-display text-slate-800 leading-tight">{step.title}</h2>
                        </div>
                    </div>
                    <p className="text-sm font-bold text-slate-600 mt-2 leading-relaxed">{step.text}</p>
                    <div className="flex gap-1.5 mt-4">
                        {list.map((_, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= index ? 'bg-violet-500' : 'bg-slate-100'}`} />)}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                        {index === 0 ? (
                            <button type="button" onClick={finish} className="px-3 py-2 text-sm font-black text-slate-400 hover:text-slate-600">Şimdi değil</button>
                        ) : (
                            <ChunkyButton variant="white" size="sm" onClick={() => setIndex(index - 1)} aria-label="Geri"><ArrowLeft size={16} /></ChunkyButton>
                        )}
                        <ChunkyButton className="ml-auto" onClick={() => (last ? finish() : setIndex(index + 1))}>
                            {index === 0 ? 'Gezelim!' : last ? 'Başlayalım' : <>İleri <ArrowRight size={16} /></>}
                        </ChunkyButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingTour;
