import React, { useMemo } from 'react';
import TaskSlideShell, { type TaskRole } from './TaskSlideShell';
import type { ChallengeConfig, Slide } from './types';

/**
 * UYGULA aşamasına ÖZEL tam slayt — "Uygulama Görevi".
 *
 * AMACI: öğrencinin ANLA'da öğrendiği kavramı tek başına uygulaması. İskelet
 * (teslim, çalıştırma, kontrol, öğretmen paneli) Birleştir ve Üret ile ortak:
 * bkz. TaskSlideShell. Uygula'nın aşamaya özel ek bir bölümü yok.
 */

export const defaultChallengeConfig = (stage?: string): ChallengeConfig => ({
    title: 'Uygulama Görevi',
    prompt: 'Öğrendiklerini kullanarak aşağıdaki görevi tamamla.',
    submissionType: 'code',
    checkMode: 'output',
    expectedOutput: '',
    functionName: 'cozum',
    tests: [],
    samples: [],
    hint: '',
    xp: 100,
    stage: stage || 'UYGULA',
});

interface Props {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
    /** 'edit' -> görevi kur, 'student' -> görevi çöz, 'review' -> teslimleri gör */
    role?: TaskRole;
    courseId?: number | string;
    /** Teslimlerin anahtarı ("challenge:<slayt id>") */
    submissionNodeId?: string;
    onSolved?: () => void;
}

const ChallengeSlideBuilder: React.FC<Props> = ({
    slide, updateSlide, role = 'student', courseId, submissionNodeId, onSolved,
}) => {
    const cfg = useMemo<ChallengeConfig>(
        () => ({ ...defaultChallengeConfig(), ...(slide.challengeConfig || {}) }),
        [slide.challengeConfig],
    );

    return (
        <TaskSlideShell
            kind="challenge"
            slideId={slide.id}
            cfg={cfg}
            patch={(updates) => updateSlide({ challengeConfig: { ...cfg, ...updates } })}
            role={role}
            courseId={courseId}
            submissionNodeId={submissionNodeId}
            onSolved={onSolved}
        />
    );
};

export default ChallengeSlideBuilder;
