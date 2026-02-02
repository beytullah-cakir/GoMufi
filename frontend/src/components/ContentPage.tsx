
import React, { useState } from 'react';
import {
    Calendar as CalendarIcon,
    Clock,
    Video,
    MessageCircle,
    MoreHorizontal,
    Zap,
    Users,
    Shield,
    Play,
    CheckCircle,
    Lock,
    Star,
    Layout,
    TrendingUp,
    Award,
    Bell,
    Search,
    Filter,
    ChevronRight,
    ChevronDown,
    Gem,
    Cloud,
    Circle,
    Triangle,
    Hexagon,
    Sparkles,
    BookOpen,
    Target
} from 'lucide-react';

// Import Assets (Reusing existing or placeholders if needed)
import PythonIcon from '../assets/sprites/PythonIcon.png';
import ReactIcon from '../assets/sprites/ReactIcon.png';
import JsIcon from '../assets/sprites/JsIcon.png';
import EnglishIcon from '../assets/sprites/EnglishIcon.png';
import DataIcon from '../assets/sprites/DataIcon.png';

// Mock Data Types
interface Course {
    id: string;
    title: string;
    level: string;
    progress: number;
    icon: string;
    color: string;
    borderColor: string;
    lightColor: string;
    nextLesson: string;
    instructor: string;
}

interface ScheduleSlot {
    id: string;
    day: string;
    time: string;
    title: string;
    type: 'live' | 'empty' | 'reserved';
    status?: 'upcoming' | 'live_now' | 'completed';
    color?: string;
    duration?: string;
}

interface SquadMember {
    id: number;
    name: string;
    status: 'online' | 'offline' | 'in-class';
    avatarSeed: number;
}

const ContentPage: React.FC = () => {
    // --- State ---
    const [selectedCourse, setSelectedCourse] = useState<string>('python-101');
    const [activeTab, setActiveTab] = useState<'schedule' | 'month' | 'archive'>('schedule');

    // --- Mock Data ---

    const courses: Course[] = [
        {
            id: 'python-101',
            title: 'Python ile Programlama',
            level: 'Level 12',
            progress: 65,
            icon: PythonIcon,
            color: 'bg-yellow-400',
            borderColor: 'border-yellow-500',
            lightColor: 'bg-yellow-50',
            nextLesson: 'Döngüler ve Listeler',
            instructor: 'Mufi Hoca'
        },
        {
            id: 'react-adv',
            title: 'İleri Seviye React',
            level: 'Level 5',
            progress: 20,
            icon: ReactIcon,
            color: 'bg-sky-400',
            borderColor: 'border-sky-500',
            lightColor: 'bg-sky-50',
            nextLesson: 'Custom Hooks',
            instructor: 'Ahmet Hoca'
        },
        {
            id: 'eng-b1',
            title: 'İngilizce B1',
            level: 'Level 8',
            progress: 45,
            icon: EnglishIcon,
            color: 'bg-purple-500',
            borderColor: 'border-purple-600',
            lightColor: 'bg-purple-50',
            nextLesson: 'Past Perfect Tense',
            instructor: 'Sarah Teacher'
        },
        {
            id: 'data-101',
            title: 'Veri Bilimi Giriş',
            level: 'Level 2',
            progress: 10,
            icon: DataIcon,
            color: 'bg-blue-600',
            borderColor: 'border-blue-700',
            lightColor: 'bg-blue-50',
            nextLesson: 'Pandas Kütüphanesi',
            instructor: 'Mufi Hoca'
        }
    ];

    const schedule: ScheduleSlot[] = [
        // Monday
        { id: 's1', day: 'Pazartesi', time: '14:00', title: 'Python: Döngüler Pratik', type: 'live', status: 'completed', color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
        { id: 's2', day: 'Pazartesi', time: '16:00', title: 'Boş Slot', type: 'empty' },
        // Tuesday
        { id: 's3', day: 'Salı', time: '10:00', title: 'React: Component Mimarisi', type: 'live', status: 'upcoming', color: 'bg-sky-100 border-sky-300 text-sky-800', duration: '15 dk kaldı' },
        { id: 's4', day: 'Salı', time: '14:00', title: 'Boş Slot', type: 'empty' },
        // Wednesday (Availability)
        { id: 's5', day: 'Çarşamba', time: '15:00', title: 'Özel Ders Rezervasyonu', type: 'reserved' },
        // Thursday
        { id: 's6', day: 'Perşembe', time: '18:00', title: 'İngilizce Konuşma Kulübü', type: 'live', status: 'upcoming', color: 'bg-purple-100 border-purple-300 text-purple-800' },
        // Friday
        { id: 's7', day: 'Cuma', time: '20:00', title: 'Veri Bilimi: Soru & Cevap', type: 'live', status: 'upcoming', color: 'bg-blue-100 border-blue-300 text-blue-800' },
    ];

    const squadMembers: SquadMember[] = [
        { id: 1, name: 'Ali', status: 'online', avatarSeed: 123 },
        { id: 2, name: 'Ayşe', status: 'in-class', avatarSeed: 456 },
        { id: 3, name: 'Can', status: 'offline', avatarSeed: 789 },
        { id: 4, name: 'Ece', status: 'online', avatarSeed: 101 },
    ];

    const ahaClips = [
        { id: 1, title: 'Loop Mantığını Çözdüm!', views: 124, date: '2 gün önce' },
        { id: 2, title: 'React State Yönetimi', views: 85, date: '1 hafta önce' },
        { id: 3, title: 'İlk İngilizce Sunum', views: 240, date: '2 hafta önce' },
    ];

    const activeCourseData = courses.find(c => c.id === selectedCourse) || courses[0];

    return (
        <div className="w-full min-h-screen bg-[#F3F4F6] p-6 font-sans text-gray-800 overflow-hidden flex flex-col">

            {/* --- DASHBOARD HEADER (Redesigned) --- */}
            <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[3rem] p-8 mb-8 overflow-hidden min-h-[220px] flex flex-col justify-center shadow-xl border-b-8 border-indigo-800">
                {/* Decorative Background Elements */}
                <div className="absolute inset-0 pointer-events-none">
                    <Cloud className="absolute top-8 left-12 text-white/10 transform -rotate-12" size={120} />
                    <Cloud className="absolute -bottom-8 right-20 text-white/10 transform rotate-12" size={100} />
                    <Sparkles className="absolute top-12 right-1/4 text-yellow-300/40 animate-pulse" size={40} />
                    <Circle className="absolute top-1/2 left-1/4 text-white/5" size={24} />
                    <Triangle className="absolute bottom-12 left-20 text-white/10 transform rotate-45" size={32} />
                    <Hexagon className="absolute top-10 right-10 text-white/10" size={64} />

                    {/* Decorative Dots */}
                    <div className="absolute top-20 left-1/3 w-2 h-2 bg-white/30 rounded-full"></div>
                    <div className="absolute bottom-10 right-1/3 w-3 h-3 bg-white/20 rounded-full"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
                    {/* Left: Title & Intro */}
                    <div className="text-white">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md border border-white/10 shadow-lg">
                                <BookOpen size={20} className="text-white" />
                            </div>
                            <span className="font-black tracking-wider opacity-80 uppercase text-xs">Eğitim Paneli</span>
                        </div>
                        <h1 className="text-5xl font-black font-display mb-3 tracking-tight drop-shadow-sm">
                            Kurslarım
                        </h1>
                        <p className="text-indigo-100 font-bold max-w-md text-base leading-relaxed opacity-90">
                            Yeteneklerini geliştirmeye ve yeni şeyler öğrenmeye devam et! 🚀
                        </p>
                    </div>

                    {/* Right: Actions (Search, etc.) */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <div className="bg-white/10 flex items-center px-4 py-3 rounded-2xl border border-white/20 backdrop-blur-md flex-1 md:flex-none focus-within:bg-white/20 transition-all">
                            <Search size={20} className="text-indigo-200 mr-2" />
                            <input
                                type="text"
                                placeholder="Ders ara..."
                                className="bg-transparent outline-none text-sm font-bold text-white placeholder-indigo-200/70 w-full md:w-48"
                            />
                        </div>
                        <button className="bg-white/10 p-3 rounded-2xl border border-white/20 text-white hover:bg-white/20 transition-all backdrop-blur-md">
                            <Filter size={20} />
                        </button>
                        <button className="bg-white/10 p-3 rounded-2xl border border-white/20 text-white hover:bg-white/20 transition-all backdrop-blur-md relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-indigo-900"></span>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MAIN GRID CONTENT --- */}
            <div className="grid grid-cols-12 gap-8 flex-1 overflow-y-auto pb-20">

                {/* LEFT COLUMN: COURSE LIST (25%) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">
                    <div className="flex items-center justify-between mb-1">
                        <h2 className="font-black text-gray-700 text-lg">Aktif Dersler</h2>
                        <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg cursor-pointer hover:bg-indigo-100">Tümü</span>
                    </div>

                    <div className="space-y-4">
                        {courses.map((course) => (
                            <div
                                key={course.id}
                                onClick={() => setSelectedCourse(course.id)}
                                className={`
                                    relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 group
                                    ${selectedCourse === course.id
                                        ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-100 scale-[1.02]'
                                        : 'bg-white border-gray-100 hover:border-gray-300 hover:scale-[1.01]'
                                    }
                                `}
                            >
                                {/* Selection Indicator */}
                                {selectedCourse === course.id && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-1.5 h-12 bg-indigo-500 rounded-r-full"></div>
                                )}

                                <div className="flex items-center gap-4 mb-3">
                                    <div className={`w-12 h-12 rounded-xl ${course.lightColor} border ${course.borderColor} flex items-center justify-center p-2`}>
                                        <img src={course.icon} alt={course.title} className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-gray-800 text-sm leading-tight">{course.title}</h3>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{course.level}</span>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="space-y-1">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>İlerleme</span>
                                        <span>%{course.progress}</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full ${course.color} rounded-full`} style={{ width: `${course.progress}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add New Course Button */}
                        <button className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition-all flex items-center justify-center gap-2">
                            <span className="text-xl leading-none">+</span>
                            Yeni Kurs Ekle
                        </button>
                    </div>

                    {/* Checkpoint Matrix (Mini) */}
                    <div className="bg-indigo-900 rounded-3xl p-6 text-white relative overflow-hidden mt-2 border-b-8 border-indigo-950">
                        <TrendingUp className="absolute top-4 right-4 text-white/10" size={48} />
                        <h3 className="font-black text-lg mb-4 relative z-10">Kazanım Matrisi</h3>
                        <div className="space-y-4 relative z-10">
                            {['Anla', 'Uygula', 'Birleştir', 'Üret'].map((step, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 ${i < 3 ? 'bg-green-500 border-green-400 text-white' : 'bg-indigo-800 border-indigo-700 text-indigo-400'}`}>
                                        {i < 3 ? <CheckCircle size={14} /> : i + 1}
                                    </div>
                                    <span className={`text-sm font-bold ${i < 3 ? 'text-white' : 'text-indigo-300'}`}>{step}</span>
                                    {i === 2 && <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded text-white font-bold">Tamamlandı</span>}
                                </div>
                            ))}
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/10">
                            <div className="flex items-center justify-between text-xs font-bold text-indigo-300 mb-1">
                                <span>Boss Battle</span>
                                <span className="text-white">5 Gün Kaldı</span>
                            </div>
                            <div className="flex items-center gap-2 bg-indigo-950/50 p-2 rounded-lg border border-indigo-700">
                                <Lock size={14} className="text-indigo-400" />
                                <span className="text-xs font-bold text-indigo-200">Kilitli: Proje Teslimi</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* CENTER COLUMN: SCHEDULER (50%) */}
                <div className="col-span-12 lg:col-span-6 flex flex-col">


                    {/* Switcher: Schedule vs Monthly vs Archive */}
                    <div className="bg-white p-2 rounded-2xl border-2 border-gray-200 flex mb-6 w-fit mx-auto lg:mx-0 overflow-x-auto max-w-full">
                        <button
                            onClick={() => setActiveTab('schedule')}
                            className={`px-4 md:px-6 py-2 rounded-xl font-black text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'schedule' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <CalendarIcon size={16} />
                            Haftalık
                        </button>
                        <button
                            onClick={() => setActiveTab('month')}
                            className={`px-4 md:px-6 py-2 rounded-xl font-black text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'month' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Layout size={16} />
                            Aylık Takvim
                        </button>
                        <button
                            onClick={() => setActiveTab('archive')}
                            className={`px-4 md:px-6 py-2 rounded-xl font-black text-xs md:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'archive' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Video size={16} />
                            Ders Arşivi
                        </button>
                    </div>

                    {activeTab === 'schedule' ? (
                        <div className="flex flex-col gap-4 flex-1">
                            {/* Today's Highlight */}
                            <div className="bg-gradient-to-r from-orange-400 to-red-500 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden border-b-8 border-red-600">
                                <Zap className="absolute top-0 right-0 text-white/20 w-40 h-40 transform translate-x-10 -translate-y-10" />
                                <div className="relative z-10 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-white/20 px-2 py-1 rounded-lg text-xs font-black uppercase tracking-wider backdrop-blur-sm">Sıradaki Ders</span>
                                            <span className="flex items-center gap-1 text-xs font-bold bg-black/20 px-2 py-1 rounded-lg">
                                                <Clock size={12} /> 15 dk kaldı
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black font-display mb-1">{activeCourseData.title}</h2>
                                        <p className="text-orange-100 font-bold text-lg">{activeCourseData.nextLesson}</p>
                                    </div>
                                    <button className="bg-white text-orange-600 px-6 py-4 rounded-2xl font-black shadow-lg animate-bounce hover:scale-105 transition-transform flex items-center gap-2">
                                        <Play fill="currentColor" />
                                        SINIFA GİR
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-sm flex-1">
                                <div className="space-y-4">
                                    {schedule.map((slot) => (
                                        <div key={slot.id} className="group">
                                            <div className="flex items-start gap-4">
                                                {/* Time Column */}
                                                <div className="w-16 flex flex-col items-center pt-2">
                                                    <span className="font-black text-gray-800">{slot.time}</span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{slot.day}</span>
                                                </div>

                                                {/* Content Block */}
                                                <div className="flex-1">
                                                    {slot.type === 'live' ? (
                                                        <div className={`p-4 rounded-2xl border-l-[6px] ${slot.color} transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer relative overflow-hidden`}>
                                                            <div className="flex justify-between items-center relative z-10">
                                                                <div>
                                                                    <h4 className="font-black text-base mb-1">{slot.title}</h4>
                                                                    <div className="flex items-center gap-2 text-xs font-bold opacity-80">
                                                                        <Video size={14} />
                                                                        <span>Canlı Ders</span>
                                                                        {slot.status === 'upcoming' && slot.duration && (
                                                                            <span className="bg-white/50 px-2 py-0.5 rounded text-red-600 animate-pulse">{slot.duration}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                {slot.status === 'completed' ? (
                                                                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-700 flex items-center justify-center">
                                                                        <CheckCircle size={18} />
                                                                    </div>
                                                                ) : (
                                                                    <button className="bg-white/80 p-2 rounded-lg hover:bg-white transition-colors">
                                                                        <ChevronRight size={20} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : slot.type === 'reserved' ? (
                                                        <div className="p-4 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50 flex items-center justify-between">
                                                            <div>
                                                                <h4 className="font-black text-indigo-900 text-sm mb-1">{slot.title}</h4>
                                                                <span className="text-xs font-bold text-indigo-400">Onay Bekliyor</span>
                                                            </div>
                                                            <div className="bg-indigo-200 px-3 py-1 rounded-lg text-xs font-bold text-indigo-700">1-on-1</div>
                                                        </div>
                                                    ) : (
                                                        <div className="h-16 rounded-2xl border-2 border-dashed border-gray-100 flex items-center justify-center group-hover:border-gray-300 transition-colors cursor-pointer group/empty">
                                                            <div className="flex items-center gap-2 opacity-0 group-hover/empty:opacity-100 transition-opacity">
                                                                <span className="text-xs font-bold text-gray-400">Ders Ayarla</span>
                                                                <div className="bg-sky-100 text-sky-600 px-2 py-0.5 rounded flex items-center gap-1 text-[10px] font-black">
                                                                    <Gem size={10} /> 50
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : activeTab === 'month' ? (
                        <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-sm flex flex-col h-full animate-in fade-in zoom-in duration-300">
                            {/* Month Header */}
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-black text-gray-800 font-display">Şubat 2026</h2>
                                <div className="flex gap-2">
                                    <button className="p-2 rounded-xl border-2 border-gray-100 hover:bg-gray-50 text-gray-500"><ChevronDown className="rotate-90" size={20} /></button>
                                    <button className="p-2 rounded-xl border-2 border-gray-100 hover:bg-gray-50 text-gray-500"><ChevronRight size={20} /></button>
                                </div>
                            </div>

                            {/* Month Grid */}
                            <div className="grid grid-cols-7 gap-2 mb-2 text-center">
                                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                                    <div key={day} className="text-xs font-black text-gray-400 uppercase tracking-wide py-2">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                                {/* Placeholders for previous month */}
                                {[29, 30, 31].map(d => (
                                    <div key={`prev-${d}`} className="p-2 rounded-xl bg-gray-50/50 text-gray-300 font-bold text-sm min-h-[80px] border border-transparent">
                                        {d}
                                    </div>
                                ))}

                                {/* Current Month Days */}
                                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => {
                                    const hasEvent = [2, 5, 12, 15, 20, 24].includes(day);
                                    const isToday = day === 2; // Hypothetical today
                                    return (
                                        <div key={day} className={`
                                            p-2 rounded-xl font-bold text-sm min-h-[80px] border-2 relative group cursor-pointer transition-all
                                            ${isToday ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-md'}
                                        `}>
                                            <span className={`${isToday ? 'bg-indigo-500 text-white px-2 py-0.5 rounded-md' : ''}`}>{day}</span>

                                            {hasEvent && (
                                                <div className="mt-2 space-y-1">
                                                    <div className="h-1.5 w-full bg-yellow-400 rounded-full"></div>
                                                    {day % 2 === 0 && <div className="h-1.5 w-2/3 bg-sky-400 rounded-full"></div>}
                                                </div>
                                            )}

                                            {/* Hover Detail */}
                                            {hasEvent && (
                                                <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 bg-gray-900 text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                                    <div className="font-bold border-b border-gray-700 pb-1 mb-1">{day} Şubat</div>
                                                    <div className="flex items-center gap-1 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div> Python</div>
                                                    {day % 2 === 0 && <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-sky-400"></div> React</div>}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // ARCHIVE VIEW content placeholder
                        <div className="grid grid-cols-2 gap-4">
                            {ahaClips.map((clip) => (
                                <div key={clip.id} className="bg-white p-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-200 group cursor-pointer transition-all">
                                    <div className="aspect-video bg-gray-900 rounded-xl relative overflow-hidden mb-3">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm group-hover:scale-110 transition-transform">
                                                <Play size={20} className="text-white" fill="currentColor" />
                                            </div>
                                        </div>
                                        <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">00:30</span>
                                    </div>
                                    <h4 className="font-bold text-gray-800 text-sm mb-1">{clip.title}</h4>
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>{clip.views} izlenme</span>
                                        <span>{clip.date}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* RIGHT COLUMN: DASHBOARD WIDGETS (25%) */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-6">

                    {/* Teacher Hub */}
                    <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-sm border-b-4 border-gray-200">
                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                            <Star className="text-yellow-400 fill-yellow-400" size={20} />
                            Hoca Masası
                        </h3>

                        <div className="flex items-center gap-4 mb-6">
                            <div className="relative">
                                <div className="w-16 h-16 bg-gray-100 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-4xl shadow-sm">
                                    👨‍🏫
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                            </div>
                            <div>
                                <h4 className="font-black text-gray-800 text-lg">{activeCourseData.instructor}</h4>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-lg">Çevrimiçi</span>
                            </div>
                        </div>

                        {/* Recent Note */}
                        <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100 relative mb-4">
                            <div className="absolute -top-2 left-4 w-4 h-4 bg-yellow-50 border-t border-l border-yellow-100 transform rotate-45"></div>
                            <p className="text-xs font-bold text-gray-600 italic leading-relaxed">
                                "Kadir, geçen haftaki döngüler ödevinde harikaydın. Listeleri birleştirme yöntemine bayıldım! 🌟"
                            </p>
                            <span className="block text-[10px] text-gray-400 font-bold mt-2 text-right">- 10 dk önce</span>
                        </div>

                        {/* Quick Action */}
                        <button className="w-full py-3 bg-indigo-500 text-white rounded-xl font-black text-sm shadow-[0_4px_0_rgb(67,56,202)] hover:shadow-none hover:translate-y-[4px] transition-all flex items-center justify-center gap-2">
                            <MessageCircle size={18} />
                            Hocaya Soru Sor
                        </button>
                    </div>

                    {/* Squad Panel */}
                    <div className="bg-white rounded-3xl border-2 border-gray-100 p-6 shadow-sm border-b-4 border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-gray-800 flex items-center gap-2">
                                <Users className="text-sky-500" size={20} />
                                Alphateam
                            </h3>
                            <button className="text-xs font-bold text-gray-400 hover:text-gray-600">Detay</button>
                        </div>

                        <div className="flex -space-x-3 mb-6 overflow-x-auto py-2 px-1">
                            {squadMembers.map((member) => (
                                <div key={member.id} className="relative group cursor-pointer hover:z-10 hover:scale-110 transition-transform">
                                    <div className={`w-12 h-12 rounded-2xl border-2 border-white shadow-md flex items-center justify-center bg-gray-100`}>
                                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatarSeed}`} alt={member.name} className="w-full h-full rounded-xl" />
                                    </div>
                                    <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${member.status === 'online' ? 'bg-green-500' : member.status === 'in-class' ? 'bg-yellow-500' : 'bg-gray-400'}`}></div>

                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-[10px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                        {member.name} • {member.status === 'in-class' ? 'Derste' : member.status}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Squad Mission */}
                        <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
                            <h4 className="font-black text-sky-900 text-xs uppercase mb-2">Haftalık Klan Görevi</h4>
                            <div className="flex items-center justify-between text-xs font-bold text-sky-700 mb-1">
                                <span>Toplam 20 Saat Ders</span>
                                <span>14/20</span>
                            </div>
                            <div className="w-full h-2 bg-sky-200 rounded-full overflow-hidden">
                                <div className="h-full bg-sky-500 w-[70%] rounded-full"></div>
                            </div>
                            <p className="text-[10px] text-sky-400 mt-2 font-bold text-center">
                                Tamamlayınca +500 Gem kazan! 💎
                            </p>
                        </div>
                    </div>

                    {/* "Aha!" Clips Teaser */}
                    <div className="bg-rose-50 rounded-3xl border-2 border-rose-100 p-6 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm animate-pulse">
                            <Video className="text-rose-500" size={32} />
                        </div>
                        <h3 className="font-black text-rose-900 mb-1">Dersin Yıldızı Ol</h3>
                        <p className="text-xs font-bold text-rose-700/80 mb-4">
                            Son dersteki "Aha!" anını paylaştın mı?
                        </p>
                        <button className="bg-rose-500 text-white px-6 py-2 rounded-xl text-xs font-black shadow-lg hover:bg-rose-600 transition-colors">
                            KLİP YÜKLE
                        </button>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default ContentPage;
