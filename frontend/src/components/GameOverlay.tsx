import React from 'react';
import MatchingGame from './games/MatchingGame';

interface GameOverlayProps {
    isOpen: boolean;
    level: number | null;
    lessonTitle?: string;
    onClose: () => void;
    onComplete: (stars: number) => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ isOpen, level, lessonTitle, onClose, onComplete }) => {
    if (!isOpen || level === null) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-white animate-overlay-enter flex items-center justify-center">
            {/* The Matching Game now handles its own display logic (Intro -> Countdown -> Game) */}
            <MatchingGame
                level={level}
                lessonTitle={lessonTitle || ''}
                onClose={onClose}
                onComplete={onComplete}
            />
        </div>
    );
};

export default GameOverlay;
