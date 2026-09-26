import React from 'react';
import { Bug, ClipboardCheck, HelpCircle, Lightbulb } from 'lucide-react';
import ChatPanel, { type QuickStart } from '../../messaging/ChatPanel';
import type { CourseData } from '../../types';
import { Mufi, PageHeader } from './ui';

/**
 * Öğrencinin "Soru Sor" sayfası: kayıtlı olduğu kursların öğretmenleriyle yazışma.
 *
 * Eskiden sohbetler yalnızca bu tarayıcıda (localStorage) duruyor ve soru
 * WebSocket üzerinden bağlı herkese yayınlanıyordu; öğretmen çevrimdışıysa
 * soru kayboluyor, sınıf arkadaşlarının tarayıcısına da ulaşıyordu. Hoca
 * listesi de örnek verilerle doluydu. Artık öğretmenler kayıtlı kurslardan,
 * mesajlar sunucudan geliyor.
 *
 * Hazır kalıplar: öğrencinin en sık zorlandığı şey "nasıl soracağım". Kalıp,
 * öğretmenin işine yarayan bilgiyi (hangi görev, ne denedin) baştan istiyor.
 */
interface AskQuestionPageProps {
    courses?: Record<string, CourseData>;
}

const QUICK_STARTS: QuickStart[] = [
    {
        label: 'Bu hatayı anlamadım', icon: Bug, topic: 'Hata mesajı',
        body: 'Hangi görevde: \nAldığım hata mesajı: \nNe denedim: ',
    },
    {
        label: 'Görevi anlamadım', icon: HelpCircle, topic: 'Görev açıklaması',
        body: 'Hangi görev: \nAnlamadığım kısım: ',
    },
    {
        label: 'Kodumu kontrol eder misin?', icon: ClipboardCheck, topic: 'Kod kontrolü',
        body: 'Hangi görev: \nKodum:\n\nEmin olmadığım yer: ',
    },
    {
        label: 'Bir fikrim var', icon: Lightbulb, topic: 'Fikir',
        body: '',
    },
];

const AskQuestionPage: React.FC<AskQuestionPageProps> = () => (
    <div className="w-full h-full bg-white bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] [background-size:22px_22px] p-3 md:p-8 font-sans text-slate-800 flex flex-col overflow-hidden">
        <div className="hidden md:block">
            <PageHeader title="Soru Sor" subtitle="Takıldığın yeri öğretmenine yaz; cevabı burada ve bildirimle gelir." pose="peek" />
        </div>
        <div className="flex-1 min-h-0 flex flex-col">
            <ChatPanel
                role="student"
                heading="Sorularım"
                subheading="Öğretmenine yaz; cevabı burada ve bildirimle gelir."
                emptyArt={<Mufi pose="peek" className="w-28" />}
                quickStarts={QUICK_STARTS}
            />
        </div>
    </div>
);

export default AskQuestionPage;
