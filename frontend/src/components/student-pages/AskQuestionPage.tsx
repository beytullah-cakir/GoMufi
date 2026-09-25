import React from 'react';
import ChatPanel from '../../messaging/ChatPanel';
import type { CourseData } from '../../types';

/**
 * Öğrencinin "Soru Sor" sayfası: kayıtlı olduğu kursların öğretmenleriyle yazışma.
 *
 * Eskiden sohbetler yalnızca bu tarayıcıda (localStorage) duruyor ve soru
 * WebSocket üzerinden bağlı herkese yayınlanıyordu; öğretmen çevrimdışıysa
 * soru kayboluyor, sınıf arkadaşlarının tarayıcısına da ulaşıyordu. Hoca
 * listesi de örnek verilerle doluydu. Artık öğretmenler kayıtlı kurslardan,
 * mesajlar sunucudan geliyor.
 */
interface AskQuestionPageProps {
    courses?: Record<string, CourseData>;
}

const AskQuestionPage: React.FC<AskQuestionPageProps> = () => (
    <div className="w-full h-full bg-[#F3F4F6] p-2 md:p-6 font-sans text-gray-800 flex flex-col overflow-hidden">
        <ChatPanel
            role="student"
            heading="Sorularım"
            subheading="Öğretmenine yaz; cevabı burada ve bildirimle gelir."
        />
    </div>
);

export default AskQuestionPage;
