import React from 'react';
import type { Slide } from './types';
import DragDropGameBuilder from './DragDropGameBuilder';
import MatchingGameBuilder from './MatchingGameBuilder';

interface GameBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
    isPreview?: boolean;
    previewRole?: 'student' | 'teacher';
}

const GameBuilder: React.FC<GameBuilderProps> = ({ slide, updateSlide, isPreview, previewRole }) => {
    if (slide.gameType === 'matching') {
        return <MatchingGameBuilder slide={slide} updateSlide={updateSlide} />;
    }
    return <DragDropGameBuilder slide={slide} updateSlide={updateSlide} isPreview={isPreview} previewRole={previewRole} />;
};

export default GameBuilder;
