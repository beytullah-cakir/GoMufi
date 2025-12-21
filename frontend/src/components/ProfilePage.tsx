import React, { useEffect, useState } from 'react';
import MufiFace from '../assets/sprites/MufiSleep.png'; // Using sleep mufi as avatar for now, or just an emoji
import api from "../api";
const ProfilePage: React.FC = () => {

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");

    const fetchProfile = async () => {
    try {
      const user = await api.get('/profile');
      setUsername(user.data.first_name);
      setEmail(user.data.email);
    } catch (error) {
      console.error("Error fetching profile", error);
    }
  };

    useEffect(() => {
    fetchProfile();
  }, []);

  
    return (
        <div className="w-full min-h-screen bg-white pb-20">
            {/* STICKY HEADER */}
            <div className="px-8 pb-4 pt-8 flex justify-between items-end border-b-2 border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-30">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 font-display">Profilim</h1>
                </div>

                {/* Right Action: Settings */}
                <button className="w-12 h-12 rounded-2xl bg-gray-50 border-2 border-gray-200 border-b-4 hover:bg-gray-100 flex items-center justify-center transition-all active:border-b-2 active:translate-y-[2px]">
                    <span className="text-2xl text-gray-400">⚙️</span>
                </button>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-8">
                {/* HERO PROFILE CARD */}
                <div className="w-full bg-white border-2 border-gray-200 border-b-4 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                    {/* Avatar */}
                    <div className="relative group cursor-pointer">
                        <div className="w-40 h-40 rounded-full border-4 border-indigo-500 overflow-hidden bg-indigo-50 p-2 shadow-lg group-hover:scale-105 transition-transform">
                            <img src={MufiFace} alt="Avatar" className="w-full h-full object-contain" />
                        </div>
                        <div className="absolute bottom-2 right-2 w-10 h-10 bg-indigo-500 rounded-full border-4 border-white flex items-center justify-center cursor-pointer hover:bg-indigo-600 transition-colors">
                            <span className="text-white text-lg font-bold">✎</span>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-4xl font-black text-gray-800 font-display mb-1">{username}</h2>
                        <p className="text-gray-400 font-bold text-lg mb-6 tracking-wide">{email} • Aralık 2025'te katıldı</p>

                        <div className="flex justify-center md:justify-start gap-4">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 border-2 border-green-100 border-b-4 cursor-pointer hover:bg-green-100 transition-colors">
                                <span className="text-xl">👥</span>
                                <span className="font-black text-green-600">140 Takipçi</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 border-2 border-orange-100 border-b-4 cursor-pointer hover:bg-orange-100 transition-colors">
                                <span className="text-xl">👣</span>
                                <span className="font-black text-orange-500">23 Takip Edilen</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATS GRID */}
                <h3 className="text-2xl font-black text-gray-800 font-display mb-6">İstatistikler</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                    {/* Streak */}
                    <div className="bg-white border-2 border-gray-200 border-b-4 rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:-translate-y-1 transition-transform cursor-default">
                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                            <span className="text-xl">🔥</span> Gün Serisi
                        </div>
                        <span className="text-3xl font-black text-gray-800 font-display">8</span>
                    </div>

                    {/* Total XP */}
                    <div className="bg-white border-2 border-gray-200 border-b-4 rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:-translate-y-1 transition-transform cursor-default">
                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                            <span className="text-xl">⚡</span> Toplam XP
                        </div>
                        <span className="text-3xl font-black text-gray-800 font-display">12,500</span>
                    </div>

                    {/* League */}
                    <div className="bg-white border-2 border-gray-200 border-b-4 rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:-translate-y-1 transition-transform cursor-default">
                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                            <span className="text-xl">🏆</span> Güncel Lig
                        </div>
                        <span className="text-3xl font-black text-yellow-500 font-display">Bronz</span>
                    </div>

                    {/* Top Finishes */}
                    <div className="bg-white border-2 border-gray-200 border-b-4 rounded-2xl p-4 flex flex-col gap-2 shadow-sm hover:-translate-y-1 transition-transform cursor-default">
                        <div className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-wider">
                            <span className="text-xl">🥇</span> İlk 3 Derece
                        </div>
                        <span className="text-3xl font-black text-gray-800 font-display">4</span>
                    </div>
                </div>

                {/* ACHIEVEMENTS */}
                <div className="flex justify-between items-end mb-6">
                    <h3 className="text-2xl font-black text-gray-800 font-display">Başarımlar</h3>
                    <a href="#" className="font-bold text-indigo-500 hover:text-indigo-600 uppercase text-xs tracking-wider border-b-2 border-transparent hover:border-indigo-200">Tümünü Gör</a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Achievement 1 - Unlocked */}
                    <div className="flex items-center gap-4 bg-yellow-50 border-2 border-yellow-200 border-b-4 rounded-2xl p-4">
                        <div className="w-20 h-20 bg-yellow-400 rounded-xl border-4 border-yellow-500 flex items-center justify-center text-4xl shadow-sm rotate-3">
                            🎯
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-gray-800 text-lg mb-1">Keskin Nişancı</h4>
                            <p className="text-gray-500 text-sm font-bold leading-tight mb-3">Tek bir derste hiç hata yapma.</p>
                            <div className="w-full bg-yellow-200 h-3 rounded-full overflow-hidden">
                                <div className="bg-yellow-500 w-full h-full"></div>
                            </div>
                        </div>
                    </div>

                    {/* Achievement 2 - Progress */}
                    <div className="flex items-center gap-4 bg-white border-2 border-gray-200 border-b-4 rounded-2xl p-4 grayscale-[0.5] opacity-80 hover:grayscale-0 hover:opacity-100 transition-all">
                        <div className="w-20 h-20 bg-gray-100 rounded-xl border-4 border-gray-300 flex items-center justify-center text-4xl shadow-sm -rotate-2">
                            🔥
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-gray-800 text-lg mb-1">Ateşli Seri</h4>
                            <p className="text-gray-500 text-sm font-bold leading-tight mb-3">30 günlük seriye ulaş.</p>
                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                <div className="bg-orange-500 w-[26%] h-full"></div>
                            </div>
                            <span className="text-xs font-bold text-gray-400 mt-1 block">8 / 30</span>
                        </div>
                    </div>

                    {/* Achievement 3 */}
                    <div className="flex items-center gap-4 bg-white border-2 border-gray-200 border-b-4 rounded-2xl p-4 grayscale-[0.8] opacity-60">
                        <div className="w-20 h-20 bg-gray-100 rounded-xl border-4 border-gray-300 flex items-center justify-center text-4xl shadow-sm">
                            👑
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-gray-800 text-lg mb-1">Efsanevi</h4>
                            <p className="text-gray-500 text-sm font-bold leading-tight mb-3">Elmas liginde 1. ol.</p>
                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                <div className="bg-gray-300 w-0 h-full"></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;
