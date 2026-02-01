
import React from 'react';
import { Settings, Share2, Award, Trophy, ChevronRight, Lock, BookOpen, Clock, Target, Calendar, Cloud, Star, Code, Zap, Heart, Music, Circle, Triangle, Hexagon, Sparkles } from 'lucide-react';
// Import the new character avatar
import CharacterAvatar from '../assets/sprites/CharacterProfile.png';
import PythonIcon from '../assets/sprites/PythonIcon.png';

const ProfilePage: React.FC = () => {
    return (
        <div className="w-full min-h-screen bg-gray-50 pb-24">
            {/* HEROLIK HEADER - Custom Color requested #d2cfff */}
            <div className="relative w-full h-[400px] bg-[#d2cfff] rounded-b-[40px] shadow-sm overflow-hidden mb-16">

                {/* Background Decorations (Pattern) - Increased Visibility & Quantity */}
                <div className="absolute inset-0 pointer-events-none">
                    {/* Clouds */}
                    <Cloud className="absolute top-12 left-12 text-white/30 transform -rotate-12" size={80} />
                    <Cloud className="absolute top-32 right-[-20px] text-white/20 transform rotate-6" size={120} />
                    <Cloud className="absolute bottom-20 left-[-40px] text-white/10" size={100} />

                    {/* Shapes */}
                    <Star className="absolute top-24 left-1/3 text-white/40 animate-pulse" size={32} />
                    <Code className="absolute top-10 right-1/3 text-white/25 transform -rotate-45" size={48} />
                    <Zap className="absolute bottom-48 right-12 text-yellow-100/40" size={56} />
                    <Heart className="absolute top-40 left-10 text-pink-100/30 transform -rotate-12" size={40} />
                    <Music className="absolute bottom-32 right-1/4 text-white/20 transform rotate-12" size={44} />
                    <Sparkles className="absolute top-20 right-10 text-white/50 animate-pulse" size={28} />

                    {/* Geometric Shapes */}
                    <Circle className="absolute top-1/2 left-20 text-white/10" size={24} />
                    <Triangle className="absolute top-1/4 right-32 text-white/20 transform rotate-45" size={36} />
                    <Hexagon className="absolute bottom-40 left-1/3 text-white/15" size={64} />

                    {/* Dots */}
                    <div className="absolute top-1/2 left-32 w-3 h-3 bg-white/40 rounded-full"></div>
                    <div className="absolute top-1/3 right-1/4 w-5 h-5 bg-white/30 rounded-full"></div>
                    <div className="absolute bottom-24 right-1/3 w-2 h-2 bg-white/60 rounded-full"></div>
                </div>

                {/* Header Action Bar */}
                <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-20">
                    <button className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-white hover:bg-black/10 transition-all">
                        <Share2 size={20} className="text-gray-700" strokeWidth={2.5} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-white hover:bg-black/10 transition-all">
                        <Settings size={20} className="text-gray-700" strokeWidth={2.5} />
                    </button>
                </div>

                {/* Character Avatar - STATIC & PINNED */}
                <div className="absolute bottom-[-100px] left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10 w-full">
                    <div className="relative">
                        {/* Status Bubble */}
                        <div className="absolute -top-4 -right-8 bg-white border-2 border-gray-100 px-4 py-2 rounded-2xl rounded-bl-none shadow-lg transform rotate-12 z-20 animate-bounce">
                            <span className="text-xl font-black text-gray-800">Selam! 👋</span>
                        </div>

                        {/* Avatar Image */}
                        <div className="w-96 h-96 filter drop-shadow-xl cursor-default">
                            <img
                                src={CharacterAvatar}
                                alt="My Character"
                                className="w-full h-full object-contain"
                            />
                        </div>

                        {/* Edit Button */}
                        <div className="absolute bottom-6 right-8 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-700 hover:bg-gray-100 cursor-pointer border-4 border-gray-50">
                            <span className="text-xl">✏️</span>
                        </div>
                    </div>

                    {/* User Info Nameplate */}
                    <div className="mt-4 text-center">
                        <h1 className="text-3xl font-black text-gray-900 font-display tracking-tight mb-2">Kadir</h1>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-gray-500 font-bold text-sm tracking-wide bg-white border-2 border-gray-100 px-4 py-1.5 rounded-full shadow-sm flex items-center gap-2">
                                <span className="text-lg">🇹🇷</span> kadir_codera
                            </span>
                            <span className="text-gray-500 font-bold text-sm tracking-wide bg-white border-2 border-gray-100 px-4 py-1.5 rounded-full shadow-sm">
                                Aralık 2025
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT CONTAINER - Overlapping Layout */}
            <div className="max-w-5xl mx-auto px-6 relative z-10 -mt-8">

                {/* TOP ROW: Quick Stats Widget */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {/* Streak */}
                    <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🔥</span>
                            <span className="text-3xl font-black text-gray-800 font-display">8</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gün Serisi</span>
                    </div>

                    {/* XP */}
                    <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">⚡</span>
                            <span className="text-3xl font-black text-gray-800 font-display">12.5k</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toplam XP</span>
                    </div>

                    {/* League */}
                    <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🏆</span>
                            <span className="text-3xl font-black text-purple-600 font-display">Bronz</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Güncel Lig</span>
                    </div>

                    {/* Top 3 */}
                    <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">🥇</span>
                            <span className="text-3xl font-black text-gray-800 font-display">4</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">İlk 3 Derece</span>
                    </div>
                </div>

                {/* MIDDLE SECTION: Content Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                    {/* LEFT COLUMN (2/3): Activity & Badges */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Learning Activity Chart */}
                        <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <Clock className="text-blue-500" size={24} />
                                    <h3 className="text-xl font-black text-gray-800 font-display">Öğrenme Aktivitesi</h3>
                                </div>
                                <select className="bg-gray-50 border-2 border-gray-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-600 outline-none">
                                    <option>Son 7 Gün</option>
                                    <option>Son 30 Gün</option>
                                </select>
                            </div>

                            {/* Fake Bar Chart */}
                            <div className="flex items-end justify-between h-32 gap-2 px-2">
                                {[35, 60, 25, 80, 55, 90, 45].map((h, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 w-full group cursor-pointer">
                                        <div className="relative w-full bg-gray-100 rounded-t-lg h-full overflow-hidden">
                                            <div
                                                className={`absolute bottom - 0 w - full rounded - t - lg transition - all duration - 500 ${i === 5 ? 'bg-blue-500' : 'bg-blue-300 group-hover:bg-blue-400'} `}
                                                style={{ height: `${h}% ` }}
                                            ></div>
                                            {/* Tooltip on Hover */}
                                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {h} XP
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400">{['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'][i]}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Badges Section */}
                        <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Trophy className="text-yellow-500 fill-yellow-500" size={24} />
                                    <h3 className="text-xl font-black text-gray-800 font-display">Başarımlar</h3>
                                </div>
                                <button className="text-sm font-bold text-blue-500 hover:text-blue-600 uppercase tracking-wide">Tümünü Gör</button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Achievement 1 */}
                                <div className="flex items-center gap-4 p-3 bg-yellow-50 border-2 border-yellow-100 rounded-xl cursor-pointer hover:bg-yellow-100 transition-colors">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl shadow-sm">🎯</div>
                                    <div>
                                        <h4 className="font-black text-gray-800 text-sm">Keskin Nişancı</h4>
                                        <div className="w-24 bg-yellow-200 h-2 rounded-full mt-1">
                                            <div className="bg-yellow-500 w-full h-full rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                                {/* Achievement 2 */}
                                <div className="flex items-center gap-4 p-3 bg-orange-50 border-2 border-orange-100 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
                                    <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center text-2xl shadow-sm">🔥</div>
                                    <div>
                                        <h4 className="font-black text-gray-800 text-sm">Ateşli Seri</h4>
                                        <span className="text-xs font-bold text-orange-500">8 / 30 Gün</span>
                                        <div className="w-24 bg-orange-200 h-2 rounded-full mt-1">
                                            <div className="bg-orange-500 w-[26%] h-full rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                                {/* Achievement 3 */}
                                <div className="flex items-center gap-4 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl opacity-60">
                                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl grayscale">👑</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black text-gray-500 text-sm">Efsanevi</h4>
                                            <Lock size={12} />
                                        </div>
                                        <div className="w-24 bg-gray-200 h-2 rounded-full mt-1"></div>
                                    </div>
                                </div>
                                {/* Achievement 4 */}
                                <div className="flex items-center gap-4 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl opacity-60">
                                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center text-2xl grayscale">🦉</div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-black text-gray-500 text-sm">Gece Kuşu</h4>
                                            <Lock size={12} />
                                        </div>
                                        <div className="w-24 bg-gray-200 h-2 rounded-full mt-1"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* RIGHT COLUMN (1/3): Current Course & Friends */}
                    <div className="space-y-6">

                        {/* Current Course Widget */}
                        <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <img src={PythonIcon} className="w-24 h-24 rotate-12" />
                            </div>

                            <h3 className="text-gray-500 font-bold text-xs uppercase tracking-wider mb-2">Devam Et</h3>
                            <h2 className="text-2xl font-black text-gray-800 font-display leading-tight mb-4">Python Temelleri</h2>

                            <div className="flex items-center justify-between text-sm font-bold text-gray-500 mb-2">
                                <span>Bölüm 1 / 5</span>
                                <span className="text-green-600">65%</span>
                            </div>
                            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden mb-6 border border-gray-200">
                                <div className="bg-green-500 w-[65%] h-full rounded-full shadow-inner stripe-pattern"></div>
                            </div>

                            <button className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-xl shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2">
                                <BookOpen size={20} />
                                DERSİ SÜRDÜR
                            </button>
                        </div>

                        {/* Social / Friends Widget */}
                        <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-6 shadow-sm">
                            <h3 className="text-xl font-black text-gray-800 font-display mb-4">Arkadaşlar</h3>

                            <div className="flex flex-col gap-4">
                                {[
                                    { name: "Ayşe Y.", xp: "18k XP", rank: 1, color: "bg-pink-400" },
                                    { name: "Mehmet K.", xp: "11k XP", rank: 2, color: "bg-blue-400" },
                                    { name: "Selin A.", xp: "9k XP", rank: 3, color: "bg-purple-400" },
                                ].map((friend, i) => (
                                    <div key={i} className="flex items-center justify-between group cursor-pointer">
                                        <div className="flex items-center gap-3">
                                            <div className={`w - 10 h - 10 rounded - full ${friend.color} border - 2 border - white shadow - sm flex items - center justify - center text - white font - bold`}>
                                                {friend.name[0]}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800 text-sm group-hover:text-blue-500 transition-colors">{friend.name}</h4>
                                                <span className="text-xs font-bold text-gray-400">{friend.xp}</span>
                                            </div>
                                        </div>
                                        {i === 0 && <span className="text-xl">🥇</span>}
                                        {i === 1 && <span className="text-xl">🥈</span>}
                                        {i === 2 && <span className="text-xl">🥉</span>}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-100">
                                <button className="w-full py-2.5 rounded-xl border-2 border-gray-200 font-black text-gray-500 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 transition-all uppercase text-sm tracking-wide">
                                    ARKADAŞ EKLE
                                </button>
                            </div>
                        </div>

                        {/* Calendar / Streak View (Small) */}
                        <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Calendar className="text-orange-500" size={20} />
                                <h3 className="text-lg font-black text-gray-800 font-display">Günlük Hedef</h3>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-bold text-gray-500">50 XP / 100 XP</span>
                                <span className="text-xs font-black text-white bg-orange-400 px-2 py-0.5 rounded-lg">50%</span>
                            </div>
                            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden border border-gray-200">
                                <div className="bg-orange-500 w-[50%] h-full rounded-full"></div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default ProfilePage;
