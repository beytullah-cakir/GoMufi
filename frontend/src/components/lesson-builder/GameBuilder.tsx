import React from 'react';
import type { Slide } from './types';
import DragDropGameBuilder from './DragDropGameBuilder';
import MatchingGameBuilder from './MatchingGameBuilder';
import MatchingGame from '../games/MatchingGame';

interface GameBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
    isPreview?: boolean;
    previewRole?: 'student' | 'teacher';
    onExitPreview?: () => void;
}

const GameBuilder: React.FC<GameBuilderProps> = ({ slide, updateSlide, isPreview, previewRole, onExitPreview }) => {
    if (slide.gameType === 'matching') {
        if (isPreview) {
            return (
                <MatchingGame
                    level={1}
                    lessonTitle="Eşleştirme Oyunu"
                    onClose={onExitPreview || (() => {})}
                    onComplete={onExitPreview || (() => {})}
                    isPreviewMode={true}
                    previewQuestions={slide.gameConfig?.questions || []}
                    previewRole={previewRole}
                />
            );
        }
        return <MatchingGameBuilder slide={slide} updateSlide={updateSlide} />;
    }
    return <DragDropGameBuilder slide={slide} updateSlide={updateSlide} isPreview={isPreview} previewRole={previewRole} />;
};

export default GameBuilder;
