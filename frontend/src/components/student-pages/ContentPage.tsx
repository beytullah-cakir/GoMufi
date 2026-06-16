import React, { useState, useEffect } from 'react';
import api from '../../api';
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
    ChevronRight,
    ChevronDown,
    Gem,
    Target,
    Cloud,
    Circle,
    Triangle,
    Hexagon,
    Sparkles,
    Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import CourseInfoModal from '../shared/CourseInfoModal';

// Import Assets (Reusing existing or placeholders if needed)
import PythonIcon from '../../assets/sprites/PythonIcon.png';
import ReactIcon from '../../assets/sprites/ReactIcon.png';
import JsIcon from '../../assets/sprites/JsIcon.png';
import EnglishIcon from '../../assets/sprites/EnglishIcon.png';
import DataIcon from '../../assets/sprites/DataIcon.png';

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
    liveSessions: {date: string, time: string}[];
    description?: string;
    learning_outcomes?: string[];
    requirements?: string[];
    curriculum?: any[];
    price?: number;
}

interface ScheduleSlot {
    id: string;
    day: string;
    fullDate?: string;
    time: string;
    title: string;
    type: 'live' | 'empty' | 'reserved';
    status?: 'upcoming' | 'live_now' | 'completed';
    color?: string;
    duration?: string;
    courseId?: string;
}

interface SquadMember {
    id: number;
    name: string;
    status: 'online' | 'offline' | 'in-class';
    avatarSeed: number;
}

const getDayName = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return '';
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[date.getDay()];
};

let cachedContentCourses: Course[] = [];
let cachedSchedule: ScheduleSlot[] = [];
let isContentFetched = false;

const getCourseStyle = (category: string | null) => {
    const cat = (category || '').toLowerCase();
    if (cat.includes('python') || cat.includes('yazılım') || cat.includes('coding')) {
        return { icon: PythonIcon, color: 'bg-yellow-400', borderColor: 'border-yellow-500', lightColor: 'bg-yellow-50', instructor: 'Mufi Hoca' };
    } else if (cat.includes('react') || cat.includes('frontend')) {
        return { icon: ReactIcon, color: 'bg-sky-400', borderColor: 'border-sky-500', lightColor: 'bg-sky-50', instructor: 'Ahmet Hoca' };
    } else if (cat.includes('english') || cat.includes('dil') || cat.includes('ingilizce')) {
        return { icon: EnglishIcon, color: 'bg-purple-500', borderColor: 'border-purple-600', lightColor: 'bg-purple-50', instructor: 'Sarah Teacher' };
    } else if (cat.includes('ver') || cat.includes('data')) {
        return { icon: DataIcon, color: 'bg-blue-600', borderColor: 'border-blue-700', lightColor: 'bg-blue-50', instructor: 'Mufi Hoca' };
    }
    return { icon: JsIcon, color: 'bg-orange-400', borderColor: 'border-orange-500', lightColor: 'bg-orange-50', instructor: 'Mufi Hoca' };
};

const mapContentCourses = (data: any[]): Course[] => {
    return data.map((c: any) => {
        const style = getCourseStyle(c.category);
        
        let liveSessions = [];
        let finalCurriculum = c.curriculum || [];
        if (finalCurriculum.length > 0 && finalCurriculum[0]?.type === "live_sessions_config") {
            liveSessions = finalCurriculum[0].sessions || [];
        }

        return {
            id: c.id.toString(),
            title: c.title,
            level: `Level ${Math.floor((c.progress || 0) / 5) + 1}`,
            progress: c.progress || 0,
            icon: style.icon,
            color: style.color,
            borderColor: style.borderColor,
            lightColor: style.lightColor,
            nextLesson: 'Hemen İzle!',
            instructor: c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : style.instructor,
            liveSessions: liveSessions,
            description: c.description,
            learning_outcomes: c.learning_outcomes,
            requirements: c.requirements,
            curriculum: c.curriculum || [],
            notes: c.notes || [],
            price: c.price || 0
        };
    });
};

interface ContentPageProps {
    purchasedCourses?: any[];
}

const ContentPage: React.FC<ContentPageProps> = ({ purchasedCourses }) => {
    // --- State ---
    const [selectedCourse, setSelectedCourse] = useState<string>('python-101');
    const [activeTab, setActiveTab] = useState<'schedule' | 'month' | 'archive'>('schedule');
    const [infoCourseId, setInfoCourseId] = useState<string | null>(null);
    const navigate = useNavigate();

    // --- Mock Data ---
    const [courses, setCourses] = useState<Course[]>(() => {
        if (purchasedCourses && purchasedCourses.length > 0) {
            const mapped = mapContentCourses(purchasedCourses);
            cachedContentCourses = mapped;
            return mapped;
        }
        return cachedContentCourses;
    });
    const [isLoading, setIsLoading] = useState(!isContentFetched && (!purchasedCourses || purchasedCourses.length === 0));
    const [schedule, setSchedule] = useState<ScheduleSlot[]>(cachedSchedule);

    useEffect(() => {
        const fetchAllData = async () => {
            if (isContentFetched && cachedContentCourses.length > 0) {
                setCourses(cachedContentCourses);
                setSchedule(cachedSchedule);
                setIsLoading(false);
                if (!selectedCourse) setSelectedCourse(cachedContentCourses[0]?.id || '');
                return;
            }

            try {
                if (!isContentFetched && (!purchasedCourses || purchasedCourses.length === 0)) setIsLoading(true);
                // Fetch courses, schedule and profile in PARALLEL
                const [contentRes, scheduleRes, profileRes] = await Promise.all([
                    (!purchasedCourses || purchasedCourses.length === 0) ? api.get('/my-content') : Promise.resolve({ data: purchasedCourses }),
                    api.get('/my-schedule'),
                    api.get('/profile')
                ]);

                if (profileRes.data) {
                    setUserProfile({
                        firstName: profileRes.data.first_name,
                        lastName: profileRes.data.last_name
                    });
                }


                // 1. Handle Courses
                const mappedCourses: Course[] = mapContentCourses(contentRes.data);
                
                setCourses(mappedCourses);
                if (mappedCourses.length > 0 && !selectedCourse) {
                    setSelectedCourse(mappedCourses[0].id);
                }

                // 2. Handle Schedule
                let mappedSchedule: ScheduleSlot[] = [];
                if (scheduleRes.data && scheduleRes.data.length > 0) {
                    mappedSchedule = scheduleRes.data.map((s: any) => {
                        const timeStr = s.start_time ? s.start_time.substring(0, 5) : '';
                        let color = 'bg-gray-100 border-gray-300 text-gray-800';
                        if (s.title.toLowerCase().includes('python')) color = 'bg-yellow-100 border-yellow-300 text-yellow-800';
                        else if (s.title.toLowerCase().includes('react')) color = 'bg-sky-100 border-sky-300 text-sky-800';
                        else if (s.title.toLowerCase().includes('ingilizce')) color = 'bg-purple-100 border-purple-300 text-purple-800';
                        
                        return {
                            id: s.id.toString(),
                            day: s.day_of_week || '',
                            time: timeStr,
                            title: s.title,
                            type: s.type as 'live' | 'empty' | 'reserved',
                            status: s.status as 'upcoming' | 'live_now' | 'completed',
                            color: color,
                            duration: `${s.duration_minutes || 0} dk`,
                            courseId: s.course_id?.toString()
                        };
                    });
                }
                
                if (mappedCourses.length > 0) {
                    mappedCourses.forEach((c) => {
                        if (c.liveSessions) {
                            c.liveSessions.forEach((sess: any) => {
                                // Sadece scheduleRes içinde olmayanları ekle
                                const autoId = `auto-${c.id}-${sess.day || sess.date}`;
                                if (!mappedSchedule.some(s => s.id === autoId)) {
                                    mappedSchedule.push({
                                        id: autoId,
                                        day: sess.day || getDayName(sess.date),
                                        fullDate: sess.date,
                                        time: sess.time,
                                        title: c.title,
                                        type: 'live',
                                        status: 'upcoming',
                                        color: c.color.replace('bg-', 'bg-').replace('500', '100'),
                                        duration: '60 dk',
                                        courseId: c.id
                                    });
                                }
                            });
                        }
                    });
                }
                
                // Sort by time
                mappedSchedule.sort((a, b) => parseInt(a.time.replace(':', '')) - parseInt(b.time.replace(':', '')));
                
                cachedContentCourses = mappedCourses;
                cachedSchedule = mappedSchedule;
                isContentFetched = true;
                
                setSchedule(mappedSchedule);

            } catch (err) {
                console.error("Veri yükleme hatası:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAllData();
    }, []);

    const [timeLeftStr, setTimeLeftStr] = useState<string>("");
    const [nextLessonData, setNextLessonData] = useState<{title: string, subtitle: string, courseId?: string} | null>(null);
    const [isClassActive, setIsClassActive] = useState<boolean>(false);
    const [liveCourseId, setLiveCourseId] = useState<string | null>(null);
    const [userProfile, setUserProfile] = useState<{firstName: string, lastName: string} | null>(null);
    
    
    const activeCourseData = courses.find(c => c.id === selectedCourse) || courses[0];

    // İlk kursu göster
    useEffect(() => {
        if (courses.length > 0) {
            const firstCourse = courses[0];
            setNextLessonData({
                title: firstCourse.title,
                subtitle: firstCourse.nextLesson || '',
                courseId: firstCourse.id
            });
        }
    }, [courses]);

    // Eğitmenin dersi başlatıp başlatmadığını sunucudan kontrol et (5 saniyede bir)
    useEffect(() => {
        if (courses.length === 0) return;

        const checkSessionStatus = async () => {
            try {
                // Tüm kursları kontrol et, herhangi biri canlıysa aktif et
                for (const course of courses) {
                    const res = await api.get(`/session-status/${course.id}`);
                    if (res.data.is_live) {
                        setIsClassActive(true);
                        setLiveCourseId(course.id);
                        setTimeLeftStr("");
                        setNextLessonData({
                            title: course.title,
                            subtitle: '',
                            courseId: course.id
                        });
                        return;
                    }
                }
                // Hiçbir kurs canlı değilse
                setIsClassActive(false);
                setLiveCourseId(null);
                setTimeLeftStr("");
            } catch (err) {
                console.error("Session status kontrol hatası:", err);
            }
        };

        checkSessionStatus();
        const interval = setInterval(checkSessionStatus, 5000);
        return () => clearInterval(interval);
    }, [courses]);

    const squadMembers: SquadMember[] = [
        { id: 1, name: 'Ali', status: 'online', avatarSeed: 123 },
        { id: 2, name: 'Ayşe', status: 'in-class', avatarSeed: 456 },
        { id: 3, name: 'Can', status: 'offline', avatarSeed: 789 },
        { id: 4, name: 'Ece', status: 'online', avatarSeed: 101 },
    ];


    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); 
    const currentYear = currentDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const currentDayNum = currentDate.getDate();

    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const monthNameStr = `${monthNames[currentMonth]} ${currentYear}`;

    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
    const prevPlaceholders = Array.from({length: startOffset}, (_, i) => prevMonthDaysCount - startOffset + i + 1);

    const dayMap: { [key: string]: number } = {
        'Pazartesi': 0, 'Monday': 0, 'Salı': 1, 'Tuesday': 1, 'Çarşamba': 2, 'Wednesday': 2,
        'Perşembe': 3, 'Thursday': 3, 'Cuma': 4, 'Friday': 4, 'Cumartesi': 5, 'Saturday': 5, 'Pazar': 6, 'Sunday': 6
    };

    const getEventsForDay = (dayNum: number) => {
        const dateObj = new Date(currentYear, currentMonth, dayNum);

        return schedule.filter(s => {
            // Aylık takvimde tam tarih eşleşmesi yapılması daha mantıklı. 
            // Fakat 'schedule' içinde 'day' olarak sadece 'Pazartesi' vb string var. 
            // Bunun için backend'den gelen/hesaplanan slotların 'date' içerecek şekilde düzenlenmesi ya da 
            // gün eşleştirmesinin gün-isim (Pazartesi vb) üzerinden yapılması.
            
            // Eğer session haftalık tekrarlıysa gün eşleşmesi (Pazartesi vb):
            const dayOfWeekIndex = dateObj.getDay();
            const normalizedIndex = dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1;
            
            if (!s.day) return false;
            return dayMap[s.day] === normalizedIndex;
        });
    };

    return (
        <div className="w-full h-full bg-[#F3F4F6] p-3 md:p-6 font-sans text-gray-800 flex flex-col overflow-x-hidden overflow-y-auto">

            {/* --- MAIN GRID CONTENT --- */}
            <div className="grid grid-cols-12 gap-4 md:gap-8 flex-1 pb-20 mt-2">

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
                                    relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 group overflow-hidden
                                    ${selectedCourse === course.id
                                        ? 'bg-white border-indigo-500 border-b-4 shadow-md -translate-y-1'
                                        : 'bg-white border-gray-100 border-b-4 hover:border-indigo-300 hover:-translate-y-1 hover:shadow-sm'
                                    }
                                `}
                            >
                                {/* Active State Glow Background (Subtle) */}
                                {selectedCourse === course.id && (
                                    <div className="absolute inset-0 bg-indigo-50/30 pointer-events-none"></div>
                                )}

                                <div 
                                    className="flex items-center gap-4 mb-3 relative z-10"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setInfoCourseId(course.id);
                                    }}
                                >
                                    <div className={`w-12 h-12 rounded-xl ${course.lightColor} border-2 ${course.borderColor} flex items-center justify-center p-2 shadow-sm group-hover:scale-110 transition-transform cursor-pointer`}>
                                        <img src={course.icon} alt={course.title} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="cursor-pointer group/title flex-1 min-w-0">
                                        <h3 className={`font-black text-sm leading-tight mb-0.5 truncate w-full ${selectedCourse === course.id ? 'text-indigo-900' : 'text-gray-800'} group-hover/title:text-indigo-600 transition-colors`} title={course.title}>
                                            {course.title}
                                        </h3>
                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 shrink-0">
                                                {course.level}
                                            </span>
                                            {course.liveSessions && course.liveSessions.map((sess: any, idx: number) => (
                                                <span key={idx} className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-1.5 py-0.5 rounded-md flex items-center gap-1 border border-indigo-100 shadow-sm shrink-0">
                                                    <Clock className="w-3 h-3 text-indigo-400" />
                                                    {sess.day || getDayName(sess.date)} - {sess.time}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress */}
                                <div className="space-y-1 relative z-10">
                                    <div className="flex justify-between text-[10px] font-bold text-gray-400">
                                        <span>İlerleme</span>
                                        <span className={selectedCourse === course.id ? 'text-indigo-600' : ''}>%{course.progress}</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${course.color} relative overflow-hidden`}
                                            style={{ width: `${course.progress}%` }}
                                        >
                                            {/* Striped Pattern Overlay */}
                                            <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]"
                                                style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                 {/* Selected Checkmark (Optional visual reinforcement) */}
                                {selectedCourse === course.id && (
                                    <div className="absolute top-2 right-2 text-indigo-500">
                                        <CheckCircle size={16} fill="currentColor" className="text-white" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Add New Course Button */}
                        <button 
                            onClick={() => navigate('/student/catalog')}
                            className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 group"
                        >
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                <span className="text-xl leading-none mb-0.5">+</span>
                            </div>
                            Yeni Kurs Ekle
                        </button>
                    </div>
                </div>


                {/* CENTER COLUMN: SCHEDULER (50%) */}
                <div className="col-span-12 lg:col-span-6 flex flex-col">


                    {/* Switcher: Schedule vs Monthly vs Archive */}
                    <div className="bg-white p-2 rounded-2xl border-2 border-gray-200 flex mb-6 w-full lg:w-fit overflow-x-auto overflow-y-hidden no-scrollbar">
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
                                            {timeLeftStr && (
                                                <span className="flex items-center gap-1 text-xs font-bold bg-black/20 px-2 py-1 rounded-lg">
                                                    <Clock size={12} /> {timeLeftStr}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-3xl font-black font-display mb-1">{nextLessonData?.title || activeCourseData?.title || "Önce Bir Kurs Seç!"}</h2>
                                    </div>
                                    <button 
                                        disabled={!isClassActive}
                                        onClick={async () => {
                                            const courseIdToJoin = liveCourseId || nextLessonData?.courseId;
                                            if (!isClassActive || !courseIdToJoin) return;
                                            try {
                                                const jitsiRes = await api.get(`/jitsi/token/${courseIdToJoin}`);
                                                const { token, room, domain } = jitsiRes.data;
                                                const url = `https://${domain}/${room}?jwt=${token}#config.prejoinPageEnabled=false&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;
                                                window.open(url, "_blank");
                                            } catch (err) {
                                                console.error("Derse katılınamadı:", err);
                                                alert("Derse katılırken bir hata oluştu. Lütfen tekrar deneyin.");
                                            }
                                        }}
                                        className={`px-6 py-4 rounded-2xl font-black shadow-lg flex items-center gap-2 transition-all ${
                                            isClassActive
                                                ? 'bg-white text-orange-600 hover:scale-105 animate-bounce cursor-pointer'
                                                : 'bg-white/50 text-orange-800/50 cursor-not-allowed opacity-60'
                                        }`}
                                    >
                                        <Play fill="currentColor" />
                                        {isClassActive ? "DERSE KATIL" : "YAKINDA!"}
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
                                <h2 className="text-2xl font-black text-gray-800 font-display">{monthNameStr}</h2>
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
                            <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-[minmax(60px,auto)] overflow-y-auto">
                                {/* Placeholders for previous month */}
                                {prevPlaceholders.map(d => (
                                    <div key={`prev-${d}`} className="p-2 rounded-xl bg-gray-50/50 text-gray-300 font-bold text-sm min-h-[60px] border border-transparent">
                                        {d}
                                    </div>
                                ))}

                                {/* Current Month Days */}
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                                    const dailyEvents = getEventsForDay(day);
                                    const hasEvent = dailyEvents.length > 0;
                                    const isToday = day === currentDayNum; 
                                    
                                    return (
                                        <div key={day} className={`
                                            p-2 rounded-xl font-bold text-sm min-h-[60px] border-2 relative group cursor-pointer transition-all
                                            ${isToday ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-100 hover:border-indigo-100 hover:shadow-md'}
                                        `}>
                                            <span className={`${isToday ? 'bg-indigo-500 text-white px-2 py-0.5 rounded-md' : ''}`}>{day}</span>

                                            {hasEvent && (
                                                <div className="mt-2 space-y-1">
                                                    {dailyEvents.slice(0, 2).map((ev, i) => (
                                                        <div key={i} className={`h-1.5 w-full rounded-full ${(ev.color || '').split(' ')[0] || 'bg-indigo-400'}`}></div>
                                                    ))}
                                                    {dailyEvents.length > 2 && <div className="text-[8px] text-gray-400 text-right w-full">+{dailyEvents.length - 2}</div>}
                                                </div>
                                            )}

                                            {/* Hover Detail */}
                                            {hasEvent && (
                                                <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-gray-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-gray-700">
                                                    <div className="font-black text-xs border-b border-gray-700 pb-1 mb-1.5 text-indigo-300">{day} {monthNameStr.split(' ')[0]} Programı</div>
                                                    <div className="space-y-1.5">
                                                        {dailyEvents.map((ev, i) => (
                                                            <div key={i} className="flex flex-col text-[10px]">
                                                                <span className="font-bold text-gray-100 truncate w-full">{ev.title}</span>
                                                                <span className="text-gray-400 font-medium flex items-center gap-1">
                                                                    <Clock size={8} /> {ev.time}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        // ARCHIVE VIEW content placeholder
                        <div className="bg-white rounded-3xl border-2 border-gray-100 p-10 flex flex-col items-center justify-center text-center opacity-70 h-64">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4 border-2 border-gray-100">
                                <Video size={32} />
                            </div>
                            <h3 className="text-xl font-black text-gray-400">Ders Arşivi Boş</h3>
                            <p className="text-sm font-bold text-gray-300">Geçmiş canlı dersleriniz buraya yüklenecektir.</p>
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
                                <h4 className="font-black text-gray-800 text-lg">{activeCourseData?.instructor || "Mufi Hoca"}</h4>
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


            {/* --- INFO MODAL --- */}
            <CourseInfoModal
                isOpen={infoCourseId !== null}
                onClose={() => setInfoCourseId(null)}
                course={courses.find(c => c.id === infoCourseId) || null}
                mode="student"
            />
        </div>
    );
};

export default ContentPage;
