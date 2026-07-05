import React from 'react';
import MatchingGame from '../games/MatchingGame';
import MonsterBattleGame from '../games/MonsterBattleGame';

interface GameOverlayProps {
    isOpen: boolean;
    level: number | null;
    lessonTitle?: string;
    courseId?: string;
    sectionId?: string;
    localNodeIndex?: number;
    onClose: () => void;
    onComplete: (stars: number) => void;
    onStatsUpdate?: () => void;
}

const GameOverlay: React.FC<GameOverlayProps> = ({ isOpen, level, lessonTitle, courseId, sectionId, localNodeIndex, onClose, onComplete, onStatsUpdate }) => {
    if (!isOpen || level === null) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-white animate-overlay-enter flex items-center justify-center">
            {level === 2 ? (
                <MonsterBattleGame
                    level={level}
                    courseId={courseId}
                    sectionId={sectionId}
                    localNodeIndex={localNodeIndex}
                    onClose={onClose}
                    onComplete={onComplete}
                    onStatsUpdate={onStatsUpdate}
                />
            ) : (
                <MatchingGame
                    level={level}
                    lessonTitle={lessonTitle || ''}
                    courseId={courseId}
                    sectionId={sectionId}
                    localNodeIndex={localNodeIndex}
                    onClose={onClose}
                    onComplete={onComplete}
                    onStatsUpdate={onStatsUpdate}
                />
            )}
        </div>
    );
};

export default GameOverlay;
