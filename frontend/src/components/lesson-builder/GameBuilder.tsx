import React from 'react';
import type { Slide } from './types';
import MatchingGameBuilder from './MatchingGameBuilder';

interface GameBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
}

const GameBuilder: React.FC<GameBuilderProps> = ({ slide, updateSlide }) => {
    if (slide.gameType === 'matching') {
        return <MatchingGameBuilder slide={slide} updateSlide={updateSlide} />;
    }

    // Fallback or other games
    return (
        <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <h2 className="text-xl font-bold">Oyun Tipi Seçilmedi veya Henüz Hazır Değil</h2>
        </div>
    );
};

export default GameBuilder;
