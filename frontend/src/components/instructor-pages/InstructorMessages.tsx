import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChatPanel from '../../messaging/ChatPanel';

/**
 * Öğretmenin mesaj kutusu: öğrencilerin soruları ve velilerle yazışmalar.
 *
 * Öğrenci listesindeki "mesaj gönder" buraya `?student=…&course=…` ile gelir;
 * o öğrenciyle açık bir yazışma varsa açılır, yoksa yeni mesaj penceresi.
 */
const InstructorMessages: React.FC = () => {
    const [params] = useSearchParams();
    const studentId = Number(params.get('student')) || undefined;
    const courseId = Number(params.get('course')) || undefined;
    const parentId = Number(params.get('parent')) || undefined;
    const target = useMemo(
        () => (studentId || parentId ? { studentId, courseId, parentId } : undefined),
        [studentId, courseId, parentId],
    );

    return (
        <div className="h-[calc(100vh-140px)] min-h-[560px] animate-fade-in-down">
            <ChatPanel
                role="teacher"
                heading="Mesajlar"
                subheading="Öğrencilerin ve velilerle yazışmalar"
                target={target}
            />
        </div>
    );
};

export default InstructorMessages;
