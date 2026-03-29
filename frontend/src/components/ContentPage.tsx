import React, { useState, useEffect } from 'react';
import api from '../api';
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
    Sparkles
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
    liveSessions: {date: string, time: string}[];
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

    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);

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

    useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await api.get('/my-content');
                const mappedCourses: Course[] = response.data.map((c: any) => {
                    const style = getCourseStyle(c.category);
                    
                    let liveSessions = [];
                    let finalCurriculum = c.curriculum || [];
                    if (finalCurriculum.length > 0 && finalCurriculum[0]?.type === "live_sessions_config") {
                        liveSessions = finalCurriculum[0].sessions || [];
                    }

                    return {
                        id: c.id.toString(),
                        title: c.title,
                        level: `Level ${Math.floor(c.progress / 5) + 1}`,
                        progress: c.progress || 0,
                        icon: style.icon,
                        color: style.color,
                        borderColor: style.borderColor,
                        lightColor: style.lightColor,
                        nextLesson: 'Hemen İzle!',
                        instructor: c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : style.instructor,
                        liveSessions: liveSessions
                    };
                });
                setCourses(mappedCourses);
                if (mappedCourses.length > 0) {
                    setSelectedCourse(mappedCourses[0].id);
                }
            } catch (err) {
                console.error("Kurslar alınamadı:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCourses();
    }, []);

    const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const response = await api.get('/my-schedule');
                let mappedSchedule: ScheduleSlot[] = [];

                if (response.data && response.data.length > 0) {
                    mappedSchedule = response.data.map((s: any) => {
                        const timeStr = s.start_time.substring(0, 5); // "14:00:00" -> "14:00"
                        
                        let color = 'bg-gray-100 border-gray-300 text-gray-800';
                        if (s.title.toLowerCase().includes('python')) color = 'bg-yellow-100 border-yellow-300 text-yellow-800';
                        else if (s.title.toLowerCase().includes('react')) color = 'bg-sky-100 border-sky-300 text-sky-800';
                        else if (s.title.toLowerCase().includes('ingilizce')) color = 'bg-purple-100 border-purple-300 text-purple-800';
                        
                        return {
                            id: s.id.toString(),
                            day: s.day_of_week,
                            time: timeStr,
                            title: s.title,
                            type: s.type as 'live' | 'empty' | 'reserved',
                            status: s.status as 'upcoming' | 'live_now' | 'completed',
                            color: color,
                            duration: `${s.duration_minutes} dk`
                        };
                    });
                } else if (courses.length > 0) {
                    // GERÇEK PLAN: Eğitmenin kurs oluştururken girdiği "liveSessions" değerlerini takvime aktar.
                    const daysMapList = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
                    
                    courses.forEach((c) => {
                        // Eğer kursun eğitmeni tarafından belirlenmiş özel saatleri varsa onları çıkar
                        if (c.liveSessions && c.liveSessions.length > 0) {
                            c.liveSessions.forEach((session, idx) => {
                                let color = 'bg-gray-100 border-gray-300 text-gray-800';
                                if (c.title.toLowerCase().includes('python') || c.title.toLowerCase().includes('yazılım')) color = 'bg-yellow-100 border-yellow-300 text-yellow-800';
                                else if (c.title.toLowerCase().includes('react') || c.title.toLowerCase().includes('web')) color = 'bg-sky-100 border-sky-300 text-sky-800';
                                else if (c.title.toLowerCase().includes('ingilizce') || c.title.toLowerCase().includes('dil')) color = 'bg-purple-100 border-purple-300 text-purple-800';
                                else if (c.title.toLowerCase().includes('oyun') || c.title.toLowerCase().includes('tasarım')) color = 'bg-orange-100 border-orange-300 text-orange-800';
                                else color = 'bg-indigo-100 border-indigo-300 text-indigo-800';

                                let dayName = "Belirsiz";
                                if (session.date) {
                                  const parsedDate = new Date(session.date);
                                  if (!isNaN(parsedDate.getTime())) {
                                      dayName = daysMapList[parsedDate.getDay()];
                                  }
                                }

                                mappedSchedule.push({
                                    id: `course-${c.id}-sess-${idx}`,
                                    day: dayName,
                                    fullDate: session.date,
                                    time: session.time || "00:00",
                                    title: c.title,
                                    type: 'live',
                                    status: 'upcoming',
                                    color: color,
                                    duration: '45 dk'
                                });
                            });
                        }
                    });
                }
                
                // Saate göre sırala (en erkenden en geçe)
                mappedSchedule.sort((a, b) => {
                    const timeA = parseInt(a.time.replace(':', ''));
                    const timeB = parseInt(b.time.replace(':', ''));
                    return timeA - timeB;
                });

                setSchedule(mappedSchedule);
            } catch (err) {
                console.error("Takvim alınamadı:", err);
            }
        };
        fetchSchedule();
    }, [courses]); // Refresh schedule when courses list changes

    const [timeLeftStr, setTimeLeftStr] = useState<string>("Hesaplanıyor...");
    const [nextLessonData, setNextLessonData] = useState<{title: string, subtitle: string} | null>(null);
    const [isClassActive, setIsClassActive] = useState<boolean>(false);
    const [timeOffsetMs, setTimeOffsetMs] = useState<number>(0);
    const [showJitsi, setShowJitsi] = useState<boolean>(false);
    const [jitsiRoomName, setJitsiRoomName] = useState<string>("");

    // Uygulama yüklendiğinde, öğrenci pc saatini değiştirip hile yapamasın diye ve
    // saat farklılıklarını engellemek adına Türkiye gerçek saatini çekip, farkı (offset) hesaplıyoruz.
    useEffect(() => {
        const fetchRealTime = async () => {
             try {
                 const res = await fetch("http://worldtimeapi.org/api/timezone/Europe/Istanbul");
                 const data = await res.json();
                 const realTime = new Date(data.datetime).getTime();
                 const localTime = new Date().getTime();
                 setTimeOffsetMs(realTime - localTime);
             } catch (err) {
                 console.error("Gerçek saat alınamadı, cihaz saati kullanılacak.", err);
             }
        };
        fetchRealTime();
    }, []);

    useEffect(() => {
        const updateCountdown = () => {
             if (schedule.length === 0) {
                 setTimeLeftStr("Ders Bulunmuyor");
                 setNextLessonData(null);
                 setIsClassActive(false);
                 return;
             }

             const now = new Date(new Date().getTime() + timeOffsetMs);
             let nextValidLesson = null;
             let minDiff = Infinity;

             for (const s of schedule) {
                 if (s.type === 'live' && s.status !== 'completed' && s.fullDate && s.time) {
                     const [hours, minutes] = s.time.split(':').map(Number);
                     const [year, month, day] = s.fullDate.split('-').map(Number);
                     
                     // UTC kaymalarını engellemek için yerel Date üzerinden inşa ediyoruz
                     const lessonTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
                     
                     // Diff in ms (lessonTime - now)
                     const diff = lessonTime.getTime() - now.getTime();
                     
                     // Eğer ders geçmişteyse bile 2 saat (7200000 ms) boyunca aktif/geçerli sayılsın
                     if (diff > -7200000 && diff < minDiff) {
                         minDiff = diff;
                         nextValidLesson = { ...s, lessonTime };
                     }
                 }
             }

             if (!nextValidLesson) {
                 setTimeLeftStr("Yeni Ders Bekleniyor");
                 setNextLessonData(null);
                 setIsClassActive(false);
                 return;
             }
             
             setNextLessonData({
                 title: nextValidLesson.title,
                 subtitle: `Planlanan Gün: ${nextValidLesson.day}`
             });

             // Calculate remaining time
             const diff = nextValidLesson.lessonTime.getTime() - now.getTime();
             
             if (diff <= 0 && diff > -7200000) {
                 // Ders şu an yayında
                 setTimeLeftStr("Canlı Yayında!");
                 setIsClassActive(true);
             } else if (diff > 0) {
                 // Ders gelecekte
                 const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));
                 const diffHours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                 const diffMinutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                 const diffSeconds = Math.floor((diff % (1000 * 60)) / 1000);
                 
                 setIsClassActive(false); // Ders saati tam olarak gelene kadar kapalı
                 
                 if (diffDays > 0) {
                     setTimeLeftStr(`${diffDays} gün ${diffHours} s kaldı`);
                 } else if (diffHours > 0) {
                     setTimeLeftStr(`${diffHours} s ${diffMinutes} dk kaldı`);
                 } else if (diffMinutes > 0) {
                     setTimeLeftStr(`${diffMinutes} dk kaldı`);
                 } else {
                     setTimeLeftStr(`${diffSeconds} sn kaldı`);
                 }
             } else {
                 setTimeLeftStr("Geçti");
                 setIsClassActive(false);
             }
        };

        updateCountdown();
        const interval = setInterval(updateCountdown, 1000); // Her saniye kontrol et!
        return () => clearInterval(interval);
    }, [schedule, timeOffsetMs]);

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

    if (isLoading) {
        return (
            <div className="w-full min-h-screen bg-[#F3F4F6] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="font-black text-gray-500">Kursların Yükleniyor...</p>
                </div>
            </div>
        );
    }

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
        <div className="w-full min-h-screen bg-[#F3F4F6] p-6 font-sans text-gray-800 overflow-hidden flex flex-col">

            {/* --- DASHBOARD HEADER (Restored Style + Builder Content + Heatmap) --- */}
            <div className="relative bg-gradient-to-r from-indigo-600 to-violet-600 rounded-[3rem] p-6 mb-6 overflow-hidden min-h-[180px] flex flex-col justify-center shadow-xl border-b-8 border-indigo-800">
                {/* Decorative Background Elements (Restored) */}
                <div className="absolute inset-0 pointer-events-none">
                    <Cloud className="absolute top-8 left-12 text-white/10 transform -rotate-12" size={100} />
                    <Cloud className="absolute -bottom-8 right-20 text-white/10 transform rotate-12" size={80} />
                    <Sparkles className="absolute top-8 right-1/4 text-yellow-300/40 animate-pulse" size={32} />
                    <Circle className="absolute top-1/2 left-1/4 text-white/5" size={20} />
                    <Triangle className="absolute bottom-10 left-20 text-white/10 transform rotate-45" size={24} />
                    <Hexagon className="absolute top-6 right-10 text-white/10" size={48} />

                    {/* Decorative Dots */}
                    <div className="absolute top-20 left-1/3 w-2 h-2 bg-white/30 rounded-full"></div>
                    <div className="absolute bottom-10 right-1/3 w-3 h-3 bg-white/20 rounded-full"></div>
                </div>

                {/* Content Container */}
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 text-white">

                    {/* Left: Prompt & Motivation */}
                    <div className="flex-1 text-center lg:text-left">
                        <h1 className="text-4xl md:text-5xl font-black font-display tracking-tight mb-2 drop-shadow-md">
                            Bugün Ne İnşa Ediyorsun?
                        </h1>
                        <p className="text-indigo-100 text-lg md:text-xl font-bold tracking-wide opacity-90">
                            Planın hazır. Squad’ın seni bekliyor.
                        </p>
                    </div>

                    {/* Right: Weekly Heatmap Widget (Mini Calendar) */}
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 shadow-lg relative overflow-hidden min-w-[300px] group/heatmap hover:bg-white/15 transition-all">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-white font-black text-xs uppercase tracking-wider opacity-90">Üretim Zinciri</h3>
                                <p className="text-[10px] font-bold text-indigo-200 opacity-80">Son 7 Gün</p>
                            </div>
                            <div className="flex items-center gap-1 bg-white/10 px-2 py-1.5 rounded-lg border border-white/5">
                                <span className="text-xs">🔥</span>
                                <span className="font-black text-white text-[10px]">12 Gün</span>
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="flex justify-between items-end gap-3">
                            {[
                                { day: 'Pzt', level: 1 },
                                { day: 'Sal', level: 3 },
                                { day: 'Çar', level: 0 },
                                { day: 'Per', level: 2 },
                                { day: 'Cum', level: 3 },
                                { day: 'Cmt', level: 1 },
                                { day: 'Paz', level: 0 }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-1.5 group/day cursor-pointer">
                                    <div className="relative">
                                        {/* Tooltip */}
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 opacity-0 group-hover/day:opacity-100 transition-opacity bg-gray-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap pointer-events-none">
                                            {item.level === 0 ? 'Boş' : `${item.level} Saat`}
                                        </div>
                                        {/* Heatmap Block */}
                                        <div className={`w-7 h-7 rounded-md border-2 border-white/10 transition-all duration-300 hover:scale-110
                                            ${item.level === 0 ? 'bg-white/5' :
                                                item.level === 1 ? 'bg-indigo-400/60' :
                                                    item.level === 2 ? 'bg-indigo-300' : 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]'}
                                        `}></div>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase transition-colors ${item.day === 'Cum' ? 'text-white' : 'text-indigo-200/70 group-hover/day:text-white'}`}>{item.day}</span>
                                </div>
                            ))}
                        </div>
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

                                <div className="flex items-center gap-4 mb-3 relative z-10">
                                    <div className={`w-12 h-12 rounded-xl ${course.lightColor} border-2 ${course.borderColor} flex items-center justify-center p-2 shadow-sm group-hover:scale-110 transition-transform`}>
                                        <img src={course.icon} alt={course.title} className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className={`font-black text-sm leading-tight mb-0.5 ${selectedCourse === course.id ? 'text-indigo-900' : 'text-gray-800'}`}>
                                            {course.title}
                                        </h3>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                                            {course.level}
                                        </span>
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
                        <button className="w-full py-4 rounded-2xl border-2 border-dashed border-gray-300 text-gray-400 font-bold text-sm hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-center gap-2 group">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                <span className="text-xl leading-none mb-0.5">+</span>
                            </div>
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
                                                <Clock size={12} /> {timeLeftStr}
                                            </span>
                                        </div>
                                        <h2 className="text-3xl font-black font-display mb-1">{nextLessonData?.title || activeCourseData?.title || "Önce Bir Kurs Seç!"}</h2>
                                        <p className="text-orange-100 font-bold text-lg">{nextLessonData?.subtitle || activeCourseData?.nextLesson || "Marketten yeni kurslar keşfedebilirsin."}</p>
                                    </div>
                                    <button 
                                        disabled={!isClassActive}
                                        onClick={() => {
                                            if (isClassActive) {
                                                // Derse tıklandığında Jitsi frame'ini güvenli bir isimle başlatıyoruz.
                                                const roomName = `GoMufi-${activeCourseData?.id}-${(nextLessonData?.title || "Class").replace(/[^a-zA-Z0-9]/g, "")}`;
                                                setJitsiRoomName(roomName);
                                                setShowJitsi(true);
                                            }
                                        }}
                                        className={`px-6 py-4 rounded-2xl font-black shadow-lg flex items-center gap-2 transition-all ${
                                            isClassActive 
                                            ? 'bg-white text-orange-600 animate-bounce hover:scale-105' 
                                            : 'bg-white/50 text-orange-800/50 cursor-not-allowed opacity-60'
                                        }`}
                                    >
                                        <Play fill="currentColor" />
                                        {isClassActive ? 'SINIFA GİR' : 'BEKLENİYOR'}
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

            {/* JITSI MEET MODAL OVERLAY */}
            {showJitsi && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 lg:p-10 backdrop-blur-sm">
                    <div className="w-full max-w-7xl flex justify-between items-center px-6 py-4 bg-[#111] border-b border-gray-800 text-white rounded-t-2xl shadow-xl shadow-black/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-xl">
                                <Video size={24} className="text-indigo-400 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="font-black text-xl tracking-tight leading-tight">Canlı Sınıf</h2>
                                <p className="text-xs font-bold text-gray-400">{nextLessonData?.title || 'Online Ders'} (Oda: {jitsiRoomName})</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setShowJitsi(false)} 
                            className="bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white px-4 py-2 flex items-center gap-2 rounded-xl font-bold transition-all border border-red-500/20 hover:border-red-600"
                        >
                            <span className="text-xl leading-none">&times;</span>
                            <span className="hidden sm:inline">Dersten Çık</span>
                        </button>
                    </div>
                    <div className="w-full max-w-7xl h-[85vh] bg-[#1a1a1a] rounded-b-2xl overflow-hidden shadow-2xl relative">
                        {/* Jitsi meet iframe - Öğrenci mod: kamera/mikrofon kapalı başlar */}
                        <iframe 
                            src={`https://meet.element.io/${jitsiRoomName}#userInfo.displayName=%C3%96%C4%9Frenci&config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithAudioMuted=true&config.startWithVideoMuted=true&config.toolbarButtons=[%22microphone%22,%22camera%22,%22desktop%22,%22chat%22,%22raisehand%22,%22hangup%22]`} 
                            allow="camera; microphone; fullscreen; display-capture; screen-wake-lock; autoplay" 
                            className="absolute inset-0 w-full h-full border-none"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentPage;
