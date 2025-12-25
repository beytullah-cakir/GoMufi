import React from 'react';
import MatchingGame from './games/MatchingGame';
import MonsterBattleGame from './games/MonsterBattleGame';

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
            {level === 2 ? (
                <MonsterBattleGame
                    level={level}
                    onClose={onClose}
                    onComplete={onComplete}
                />
            ) : (
                <MatchingGame
                    level={level}
                    lessonTitle={lessonTitle || ''}
                    onClose={onClose}
                    onComplete={onComplete}
                />
            )}
        </div>
    );
};

export default GameOverlay;
