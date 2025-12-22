import React from 'react';
import { Flame, Trophy, Star, Target } from 'lucide-react';
import HouseIcon from '../assets/sprites/House.png';

const Dashboard: React.FC = () => {
    return (
        <div className="flex-1 p-8 overflow-y-auto">
            {/* Header Stats */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-800 mb-2">Welcome back, Traveler!</h1>
                    <p className="text-gray-500 font-semibold">Ready for your next adventure?</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center bg-white px-4 py-2 rounded-xl shadow-sm border-b-4 border-gray-100">
                        <Flame className="text-orange-500 mr-2" fill="currentColor" />
                        <span className="font-bold text-gray-700">12 Day Streak</span>
                    </div>
                    <div className="flex items-center bg-white px-4 py-2 rounded-xl shadow-sm border-b-4 border-gray-100">
                        <Star className="text-yellow-400 mr-2" fill="currentColor" />
                        <span className="font-bold text-gray-700">1,250 Gems</span>
                    </div>
                </div>
            </div>

            {/* XP Progress */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border-b-4 border-gray-100 mb-8">
                <div className="flex justify-between mb-2">
                    <span className="font-bold text-gray-700">Level 5</span>
                    <span className="font-bold text-blue-500">2,450 / 3,000 XP</span>
                </div>
                <div className="h-6 bg-gray-100 rounded-full overflow-hidden border-2 border-gray-100">
                    <div
                        className="h-full bg-blue-400 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                        style={{ width: '82%' }}
                    >
                        <div className="absolute top-0 left-0 w-full h-full bg-white opacity-20 animate-pulse"></div>
                    </div>
                </div>
            </div>

            {/* Daily Quests */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Target className="mr-2 text-red-500" />
                Daily Quests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                    { title: 'Complete 2 Lessons', progress: '1/2', reward: '50 XP', color: 'bg-blue-50', border: 'border-blue-200' },
                    { title: 'Score 100% on a Quiz', progress: '0/1', reward: '100 XP', color: 'bg-purple-50', border: 'border-purple-200' },
                    { title: 'Practice Speaking', progress: '5/10 min', reward: '20 Gems', color: 'bg-green-50', border: 'border-green-200' },
                ].map((quest, index) => (
                    <div
                        key={index}
                        className={`p-5 rounded-2xl border-2 border-b-4 ${quest.color} ${quest.border} transition-transform hover:-translate-y-1 cursor-pointer`}
                    >
                        <h3 className="font-bold text-gray-800 mb-2">{quest.title}</h3>
                        <div className="flex justify-between items-end">
                            <span className="text-sm font-semibold text-gray-500">{quest.progress}</span>
                            <span className="text-xs font-bold bg-white px-2 py-1 rounded-lg shadow-sm text-gray-600">
                                {quest.reward}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Activity / Content */}
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <Trophy className="mr-2 text-yellow-500" />
                Your Journey
            </h2>
            <div className="bg-white rounded-3xl shadow-sm border-b-4 border-gray-100 p-8 text-center">
                <div className="inline-block p-4 bg-gray-50 rounded-full mb-4">
                    <img src={HouseIcon} alt="House" className="w-24 h-24 object-contain opacity-50 grayscale" />
                </div>
                <h3 className="text-lg font-bold text-gray-400">Map Locked</h3>
                <p className="text-gray-400">Complete more quests to unlock the world map!</p>
            </div>
        </div>
    );
};

export default Dashboard;
