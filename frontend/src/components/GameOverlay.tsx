import React from 'react';
import MatchingGame from './games/MatchingGame';

interface GameOverlayProps {
    isOpen: boolean;
    level: number | null;
    lessonTitle?: string;
    onClose: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ isOpen, level, lessonTitle, onClose }) => {
    if (!isOpen || level === null) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-white animate-overlay-enter flex items-center justify-center">
            {/* The Matching Game now handles its own display logic (Intro -> Countdown -> Game) */}
            <MatchingGame
                level={level}
                lessonTitle={lessonTitle || ''}
                onClose={onClose}
            />
        </div>
    );
};

export default GameOverlay;
