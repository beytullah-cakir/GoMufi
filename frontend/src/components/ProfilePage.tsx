
import React, { useState } from 'react';
import { Settings, Share2, Award, Trophy, ChevronRight, Lock, BookOpen, Clock, Target, Calendar, Cloud, Star, Code, Zap, Heart, Music, Circle, Triangle, Hexagon, Sparkles, Swords, Users, Video, Play, CheckCircle, GitBranch, Shield, Cpu, Gamepad2, Medal } from 'lucide-react';
// Import the new character avatar
import CharacterAvatar from '../assets/sprites/CharacterProfile.png';
import PythonIcon from '../assets/sprites/PythonIcon.png';

const ProfilePage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'skills' | 'portfolio'>('overview');

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

                    {/* User Info Nameplate REMOVED - Moved to main content */}
                </div>
            </div>

            {/* MAIN CONTENT CONTAINER - Overlapping Layout */}
            <div className="max-w-5xl mx-auto px-6 relative z-10 -mt-8">

                {/* NEW ROW: Name & Level Flanking Avatar */}
                <div className="flex flex-col md:flex-row items-end justify-between mb-8 relative z-20">
                    {/* Left: Name & Identity */}
                    <div className="flex flex-col items-center md:items-start mb-4 md:mb-0">
                        <h1 className="text-4xl font-black text-gray-900 font-display tracking-tight mb-1">Kadir</h1>
                        <div className="flex items-center gap-2 text-gray-500 font-bold text-sm">
                            <span className="text-blue-500">@kadir_codera</span>
                            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full"></span>
                            <span>Aralık 2025</span>
                        </div>
                    </div>

                    {/* Right: Level Progress */}
                    <div className="flex flex-col items-center md:items-end w-full md:w-auto">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="bg-orange-500 w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md transform rotate-3">
                                15
                            </div>
                            <span className="font-black text-gray-800 text-lg">Level 15</span>
                            <span className="text-xs font-bold text-gray-400">/ 20</span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full md:w-64 h-4 bg-gray-100 rounded-full border border-gray-200 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-500 w-[75%] rounded-full shadow-inner"></div>
                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide">Sonraki Seviye: 1250 XP</span>
                    </div>
                </div>

                {/* TOP ROW: Quick Stats Widget */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
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

                    {/* Verified Masteries - NEW */}
                    <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm hover:-translate-y-1 transition-transform">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="bg-blue-100 p-1 rounded-full">
                                <CheckCircle size={20} className="text-blue-600" />
                            </div>
                            <span className="text-3xl font-black text-gray-800 font-display">1</span>
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mastery Rozeti</span>
                    </div>
                </div>

                {/* SQUAD / TEAM BANNER - MOVED TO TOP OF OVERVIEW */}
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden mb-8">
                    {/* Background Pattern */}
                    <Swords className="absolute top-1/2 right-10 text-white/10 transform rotate-12 scale-[4]" />

                    <div className="flex flex-col md:flex-row items-center justify-between relative z-10 gap-6">
                        {/* Team Info */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl shadow-md border-4 border-indigo-200">
                                🚀
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-2xl font-black font-display">Kod Korsanları</h3>
                                    <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-sm">Lvl 5 Klan</span>
                                </div>
                                <p className="text-white/80 font-medium text-sm flex items-center gap-2">
                                    <Users size={14} /> Takım: Alphateam
                                </p>
                            </div>
                        </div>

                        {/* Role & Stats */}
                        <div className="flex items-center gap-8">
                            <div className="text-center">
                                <div className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Takım Rolü</div>
                                <div className="font-black text-lg flex items-center justify-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg">
                                    <Shield size={16} className="text-yellow-300" />
                                    Hata Avcısı
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Klan Skoru</div>
                                <div className="font-black text-2xl text-yellow-300">
                                    24.5k
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Squad Members */}
                    <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Squad Üyeleri</span>
                        <div className="flex -space-x-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-800 flex items-center justify-center text-xs font-bold relative group cursor-pointer hover:z-10 hover:scale-110 transition-all">
                                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i * 123}`} alt="Member" className="w-full h-full rounded-full" />
                                    {i === 1 && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-indigo-800"></div>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>


                {/* TAB NAVIGATION */}
                <div className="flex items-center gap-4 mb-8 border-b-2 border-gray-100 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Genel Bakış', icon: <Target size={18} /> },
                        { id: 'skills', label: 'Yetenek Ağacı', icon: <GitBranch size={18} /> },
                        { id: 'portfolio', label: 'Neler Ürettim?', icon: <Code size={18} /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-3 font-black text-sm uppercase tracking-wide transition-all border-b-4 ${activeTab === tab.id
                                ? 'text-blue-500 border-blue-500 bg-blue-50/50 rounded-t-xl'
                                : 'text-gray-400 border-transparent hover:text-gray-600 hover:border-gray-200'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENT: GENERAL OVERVIEW */}
                {activeTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

                        {/* LEFT COLUMN (2/3): Activity & Badges & SQUAD */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* SQUAD / TEAM BANNER - NEW */}
                            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                                {/* Background Pattern */}
                                <Swords className="absolute top-1/2 right-10 text-white/10 transform rotate-12 scale-[4]" />

                                <div className="flex flex-col md:flex-row items-center justify-between relative z-10 gap-6">
                                    {/* Team Info */}
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center text-3xl shadow-md border-4 border-indigo-200">
                                            🚀
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-2xl font-black font-display">Kod Korsanları</h3>
                                                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider backdrop-blur-sm">Lvl 5 Klan</span>
                                            </div>
                                            <p className="text-white/80 font-medium text-sm flex items-center gap-2">
                                                <Users size={14} /> Takım: Alphateam
                                            </p>
                                        </div>
                                    </div>

                                    {/* Role & Stats */}
                                    <div className="flex items-center gap-8">
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Takım Rolü</div>
                                            <div className="font-black text-lg flex items-center justify-center gap-1.5 bg-white/10 px-3 py-1 rounded-lg">
                                                <Shield size={16} className="text-yellow-300" />
                                                Hata Avcısı
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xs font-bold text-indigo-100 uppercase tracking-wider mb-1">Klan Skoru</div>
                                            <div className="font-black text-2xl text-yellow-300">
                                                24.5k
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Squad Members */}
                                <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-100 uppercase tracking-widest">Squad Üyeleri</span>
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-indigo-800 flex items-center justify-center text-xs font-bold relative group cursor-pointer hover:z-10 hover:scale-110 transition-all">
                                                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${i * 123}`} alt="Member" className="w-full h-full rounded-full" />
                                                {i === 1 && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-indigo-800"></div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

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
                                                    className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${i === 5 ? 'bg-blue-500' : 'bg-blue-300 group-hover:bg-blue-400'}`}
                                                    style={{ height: `${h}%` }}
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
                                                <div className={`w-10 h-10 rounded-full ${friend.color} border-2 border-white shadow-sm flex items-center justify-center text-white font-bold`}>
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
                )}

                {/* TAB CONTENT: SKILL TREE - FIXED & STYLED */}
                {activeTab === 'skills' && (
                    <div className="bg-white border-2 border-gray-100 border-b-4 rounded-3xl p-8 shadow-sm mb-8">
                        <div className="text-center mb-10">
                            <h2 className="text-3xl font-black text-gray-800 font-display mb-2 flex items-center justify-center gap-3">
                                <span className="bg-blue-100 text-blue-600 p-2 rounded-xl"><GitBranch size={28} /></span>
                                Teknoloji Yolculuğu
                            </h2>
                            <p className="text-gray-500 font-medium max-w-lg mx-auto">
                                Zirveye giden yol haritan. <span className="text-blue-500 font-bold">Adım adım ilerle!</span>
                            </p>
                        </div>

                        {/* Interactive Skill Tree Container */}
                        <div className="relative w-full h-[700px] bg-slate-50 rounded-3xl overflow-hidden border-2 border-gray-200 shadow-inner group select-none flex justify-center">

                            {/* 1. Grid Pattern (Subtle) */}
                            <div className="absolute inset-0 opacity-[0.05]"
                                style={{
                                    backgroundImage: `radial-gradient(#4b5563 1.5px, transparent 1.5px)`,
                                    backgroundSize: '24px 24px'
                                }}>
                            </div>

                            {/* 2. SVG Connections Layer - FIXED VIEWBOX */}
                            {/* We use a fixed viewBox 0 0 800 700 to ensure coordinates work perfectly */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 800 700" preserveAspectRatio="xMidYMid meet">

                                {/* Path: Root (Top) -> Algo (Middle) */}
                                {/* Start (400, 150) -> End (400, 310) */}
                                <path
                                    d="M400 150 L 400 310"
                                    stroke="#cbd5e1"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    fill="none"
                                />
                                {/* Active Progress Line (Green) */}
                                <path
                                    d="M400 150 L 400 310"
                                    stroke="#22c55e"
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    fill="none"
                                    className="animate-[pulse_3s_infinite]"
                                />

                                {/* Path: Algo (Middle) -> Web (Bottom Left) */}
                                {/* Start (400, 410) -> End (280, 560) */}
                                <path
                                    d="M400 410 C 400 500, 280 480, 280 560"
                                    stroke="#e2e8f0"
                                    strokeWidth="6"
                                    strokeDasharray="12 12"
                                    strokeLinecap="round"
                                    fill="none"
                                />

                                {/* Path: Algo (Middle) -> Game (Bottom Right) */}
                                {/* Start (400, 410) -> End (520, 560) */}
                                <path
                                    d="M400 410 C 400 500, 520 480, 520 560"
                                    stroke="#e2e8f0"
                                    strokeWidth="6"
                                    strokeDasharray="12 12"
                                    strokeLinecap="round"
                                    fill="none"
                                />
                            </svg>

                            {/* 3. Nodes Layer - Centered via Absolute % that match viewBox */}

                            {/* NODE 1: ROOT (Top Center) - x=400 (50%), y=100 (approx 15%) */}
                            <div className="absolute top-[8%] flex flex-col items-center group cursor-pointer hover:-translate-y-2 transition-transform duration-300">
                                {/* Connector Dot Bottom */}
                                <div className="absolute bottom-[-10px] w-4 h-4 bg-green-500 rounded-full border-4 border-slate-50 z-20"></div>

                                <div className="relative w-24 h-24 bg-white rounded-3xl border-b-8 border-r-8 border-green-200 group-hover:border-green-300 shadow-sm flex items-center justify-center transition-colors">
                                    <div className="absolute inset-0 bg-green-50 rounded-2xl m-1 flex items-center justify-center">
                                        <Code size={40} className="text-green-500" />
                                    </div>
                                    <div className="absolute -top-3 -right-3 bg-yellow-400 text-white p-1.5 rounded-xl shadow-sm rotate-12 group-hover:rotate-0 transition-transform">
                                        <Star size={16} fill="currentColor" />
                                    </div>
                                </div>
                                <div className="mt-4 bg-white px-4 py-2 rounded-xl border-2 border-green-100 shadow-sm text-center">
                                    <h3 className="font-black text-gray-800 text-sm">Python Temelleri</h3>
                                </div>
                            </div>

                            {/* NODE 2: CURRENT (Middle Center) - x=400 (50%), y=350 (approx 50%) */}
                            <div className="absolute top-[42%] flex flex-col items-center group cursor-pointer hover:-translate-y-2 transition-transform duration-300 z-10">
                                {/* Connector Dot Top */}
                                <div className="absolute top-[-10px] w-4 h-4 bg-green-500 rounded-full border-4 border-slate-50 z-20"></div>
                                {/* Connector Dot Bottom */}
                                <div className="absolute bottom-[-10px] w-4 h-4 bg-blue-100 rounded-full border-4 border-slate-50 z-20"></div>

                                <div className="relative w-28 h-28 bg-white rounded-full border-4 border-blue-500 shadow-xl flex items-center justify-center">
                                    {/* Inner Pulse */}
                                    <div className="absolute inset-0 bg-blue-50 rounded-full animate-pulse"></div>

                                    <GitBranch size={42} className="text-blue-600 relative z-10" />

                                    {/* Progress Ring SVG */}
                                    <svg className="absolute inset-0 w-full h-full -rotate-90 scale-110 pointer-events-none">
                                        <circle cx="50%" cy="50%" r="48%" stroke="#eff6ff" strokeWidth="4" fill="none" />
                                        <circle cx="50%" cy="50%" r="48%" stroke="#3b82f6" strokeWidth="4" fill="none" strokeDasharray="251" strokeDashoffset="100" strokeLinecap="round" />
                                    </svg>
                                </div>

                                {/* Info Card */}
                                <div className="mt-5 bg-white px-6 py-3 rounded-2xl border-b-4 border-blue-100 shadow-md text-center">
                                    <h3 className="font-black text-gray-800 text-lg">Algoritmalar</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">Lvl 12</span>
                                        <div className="w-20 bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-blue-500 w-[60%] h-full rounded-full"></div>
                                        </div>
                                        <span className="text-[10px] font-bold text-gray-400">%60</span>
                                    </div>
                                </div>
                            </div>

                            {/* NODE 3: LEFT (Bottom Left) - x=280 (35%), y=600 (approx 85%) */}
                            <div className="absolute top-[78%] left-[35%] -translate-x-1/2 flex flex-col items-center group cursor-not-allowed hover:opacity-100 opacity-60 transition-all duration-300">
                                <div className="absolute top-[-10px] w-4 h-4 bg-gray-200 rounded-full border-4 border-slate-50 z-20"></div>

                                <div className="relative w-20 h-20 bg-gray-100 rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center group-hover:bg-white group-hover:border-purple-300 transition-colors">
                                    <Cpu size={32} className="text-gray-400 group-hover:text-purple-500 transition-colors" />
                                    <div className="absolute -top-3 -left-3 bg-gray-200 text-gray-500 p-1.5 rounded-lg border-2 border-white">
                                        <Lock size={14} />
                                    </div>
                                </div>
                                <div className="mt-3 text-center">
                                    <h3 className="font-bold text-gray-500 text-sm group-hover:text-purple-600 transition-colors">Web Geliştirme</h3>
                                    <span className="text-[10px] font-black text-gray-300 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">LVL 15</span>
                                </div>
                            </div>

                            {/* NODE 4: RIGHT (Bottom Right) - x=520 (65%), y=600 (approx 85%) */}
                            <div className="absolute top-[78%] left-[65%] -translate-x-1/2 flex flex-col items-center group cursor-not-allowed hover:opacity-100 opacity-60 transition-all duration-300">
                                <div className="absolute top-[-10px] w-4 h-4 bg-gray-200 rounded-full border-4 border-slate-50 z-20"></div>

                                <div className="relative w-20 h-20 bg-gray-100 rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center group-hover:bg-white group-hover:border-orange-300 transition-colors">
                                    <Gamepad2 size={32} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
                                    <div className="absolute -top-3 -left-3 bg-gray-200 text-gray-500 p-1.5 rounded-lg border-2 border-white">
                                        <Lock size={14} />
                                    </div>
                                </div>
                                <div className="mt-3 text-center">
                                    <h3 className="font-bold text-gray-500 text-sm group-hover:text-orange-600 transition-colors">Oyun Kodlama</h3>
                                    <span className="text-[10px] font-black text-gray-300 bg-gray-100 px-2 py-0.5 rounded mt-1 inline-block">LVL 15</span>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
                {/* TAB CONTENT: PORTFOLIO */}
                {activeTab === 'portfolio' && (
                    <div className="space-y-8">

                        {/* Hero Section of Portfolio */}
                        <div className="bg-[#1e1b4b] rounded-2xl p-8 text-white relative overflow-hidden">
                            <Sparkles className="absolute top-10 right-10 text-yellow-400 animate-pulse" size={40} />
                            <div className="relative z-10 max-w-2xl">
                                <h2 className="text-3xl font-black font-display mb-4">Neler Ürettim?</h2>
                                <p className="text-indigo-200 text-lg mb-6">
                                    Gomufi evreninde kodladığın, tasarladığın ve hayata geçirdiğin her şey burada.
                                    Geleceği inşa etmeye devam et! 🚀
                                </p>
                                <div className="flex gap-4">
                                    <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-md">
                                        <span className="block text-2xl font-black text-yellow-400">12</span>
                                        <span className="text-xs text-indigo-300 font-bold uppercase">Proje</span>
                                    </div>
                                    <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-md">
                                        <span className="block text-2xl font-black text-green-400">45</span>
                                        <span className="text-xs text-indigo-300 font-bold uppercase">Aha! Anı</span>
                                    </div>
                                </div>
                            </div>
                            {/* Background Deco */}
                            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-600 rounded-full blur-3xl opacity-50"></div>
                        </div>

                        {/* PROJECT GALLERY */}
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-black text-gray-800 font-display flex items-center gap-2">
                                    <Gamepad2 className="text-purple-500" />
                                    Proje Galerisi
                                </h3>
                                <button className="text-sm font-bold text-purple-600 hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors">
                                    Tümünü Gör
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Project Card 1 */}
                                <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform group">
                                    <div className="h-48 bg-gray-900 relative flex items-center justify-center">
                                        <h4 className="text-green-400 font-mono text-xl font-bold">{`> Matrix_Bot_v1`}</h4>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <button className="bg-white text-gray-900 font-black px-6 py-3 rounded-full flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
                                                <Play size={20} fill="currentColor" />
                                                OYNA / İZLE
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Python</span>
                                            <span className="bg-green-100 text-green-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Bot</span>
                                        </div>
                                        <h4 className="font-black text-gray-800 text-lg mb-1">Discord Moderasyon Botu</h4>
                                        <p className="text-gray-500 text-xs font-medium mb-4">Sunucu güvenliğini sağlayan ve kelime filtresi yapan gelişmiş bir bot.</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <Heart size={16} /> <span className="text-xs font-bold">24</span>
                                            </div>
                                            <span className="text-gray-400 text-xs font-bold">3 gün önce</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Project Card 2 */}
                                <div className="bg-white border-2 border-gray-100 border-b-4 rounded-2xl overflow-hidden hover:-translate-y-1 transition-transform group">
                                    <div className="h-48 bg-[#2d1b4e] relative flex items-center justify-center">
                                        <div className="w-16 h-16 bg-yellow-400 rounded-lg shadow-lg rotate-12"></div>
                                        <div className="w-16 h-16 bg-red-400 rounded-lg shadow-lg -rotate-6 -ml-4 z-10"></div>
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                                            <button className="bg-white text-gray-900 font-black px-6 py-3 rounded-full flex items-center gap-2 transform scale-90 group-hover:scale-100 transition-transform">
                                                <Play size={20} fill="currentColor" />
                                                OYNA / İZLE
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Blok Kodlama</span>
                                            <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded uppercase">Oyun</span>
                                        </div>
                                        <h4 className="font-black text-gray-800 text-lg mb-1">Uzay Macerası 2D</h4>
                                        <p className="text-gray-500 text-xs font-medium mb-4">Kendi tasarladığım karakterlerle dolu sonsuz bir uzay platform oyunu.</p>
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-1 text-gray-400">
                                                <Heart size={16} /> <span className="text-xs font-bold">56</span>
                                            </div>
                                            <span className="text-gray-400 text-xs font-bold">1 hafta önce</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Project Card 3 */}
                                <div className="bg-white border-dashed border-2 border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                                        <Code size={24} />
                                    </div>
                                    <h4 className="font-black text-gray-400 text-lg">Yeni Proje Ekle</h4>
                                    <p className="text-gray-400 text-xs font-medium px-8 mt-2">Builder'a git ve oluşturmaya başla!</p>
                                </div>
                            </div>
                        </div>

                        {/* AHA! MOMENTS */}
                        <div className="pb-12">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-black text-gray-800 font-display flex items-center gap-2">
                                    <Video className="text-red-500" />
                                    "Aha!" Anları
                                </h3>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {[1, 2, 3, 4].map((clip, i) => (
                                    <div key={i} className="relative aspect-[9/16] bg-gray-900 rounded-2xl overflow-hidden group cursor-pointer shadow-md">
                                        <img src={`https://picsum.photos/300/600?random=${i}`} className="w-full h-full object-cover opacity-80 group-hover:opacity-40 transition-opacity" />

                                        {/* Play Icon Overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white scale-75 group-hover:scale-100 transition-all">
                                                <Play size={20} fill="currentColor" />
                                            </div>
                                        </div>

                                        <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/80 to-transparent">
                                            <span className="text-white text-xs font-bold block mb-1">🔥 İlk Hatasız Run</span>
                                            <span className="text-white/60 text-[10px] font-mono">12.01.2025</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfilePage;
