import React, { useState, useEffect } from 'react';
import api from '../../api';
import { openMeetingLink, rememberMeetingLink } from '../../meetingLink';
import { Calendar as CalendarIcon, Clock, Video, MessageCircle, Play, CheckCircle, Layout, ChevronRight, Info, UserRound, Rocket, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import CourseInfoModal from '../shared/CourseInfoModal';
import InitialsAvatar from '../shared/InitialsAvatar';
import { Card, CardTitle, ChunkyButton, DOTS_STYLE, Mufi, MufiEmpty, PageHeader } from './ui';
import { completedCount, fetchProgress, type CourseProgress } from '../../progress';

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
    classes?: any[];
    schedule?: any[];
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
    sectionTitle?: string;
    lessonIndex?: number;
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
        return { icon: PythonIcon, color: 'bg-yellow-400', borderColor: 'border-yellow-500', lightColor: 'bg-yellow-50', instructor: 'Öğretmen' };
    } else if (cat.includes('react') || cat.includes('frontend')) {
        return { icon: ReactIcon, color: 'bg-sky-400', borderColor: 'border-sky-500', lightColor: 'bg-sky-50', instructor: 'Öğretmen' };
    } else if (cat.includes('english') || cat.includes('dil') || cat.includes('ingilizce')) {
        return { icon: EnglishIcon, color: 'bg-purple-500', borderColor: 'border-purple-600', lightColor: 'bg-purple-50', instructor: 'Öğretmen' };
    } else if (cat.includes('ver') || cat.includes('data')) {
        return { icon: DataIcon, color: 'bg-blue-600', borderColor: 'border-blue-700', lightColor: 'bg-blue-50', instructor: 'Öğretmen' };
    }
    if (cat.includes('javascript')) {
        return { icon: JsIcon, color: 'bg-orange-400', borderColor: 'border-orange-500', lightColor: 'bg-orange-50', instructor: 'Öğretmen' };
    }
    // Tanınmayan kurs: yanlış bir dil logosu yerine genel simge
    return { icon: '', color: 'bg-indigo-400', borderColor: 'border-indigo-500', lightColor: 'bg-indigo-50', instructor: 'Öğretmen' };
};

const mapContentCourses = (data: any[]): Course[] => {
    return data.map((c: any) => {
        // Kategori boş ya da genel olabiliyor ("Programlama"): kurs adı da hesaba katılır.
        const style = getCourseStyle(`${c.category || ''} ${c.title || ''}`);
        
        let liveSessions = [];
        let finalCurriculum = c.curriculum || [];
        if (finalCurriculum.length > 0 && finalCurriculum[0]?.type === "live_sessions_config") {
            liveSessions = finalCurriculum[0].sessions || [];
        }

        return {
            id: c.id.toString(),
            title: c.title,
            level: '',
            progress: 0,
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
            classes: c.classes || [],
            schedule: c.schedule || []
        };
    });
};

interface ContentPageProps {
    enrolledCourses?: any[];
    onOpenJoinModal: () => void;
    userData?: any;
    onJoinLiveClass: (courseId: string) => void;
}

const ContentPage: React.FC<ContentPageProps> = ({ enrolledCourses, onOpenJoinModal, userData, onJoinLiveClass }) => {
    // --- State ---
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'schedule' | 'month'>('schedule');
    const [infoCourseId, setInfoCourseId] = useState<string | null>(null);
    const navigate = useNavigate();

    // --- Mock Data ---
    const [courses, setCourses] = useState<Course[]>(() => {
        if (enrolledCourses && enrolledCourses.length > 0) {
            const mapped = mapContentCourses(enrolledCourses);
            cachedContentCourses = mapped;
            return mapped;
        }
        return cachedContentCourses;
    });
    const [isLoading, setIsLoading] = useState(!isContentFetched && (!enrolledCourses || enrolledCourses.length === 0));
    const [schedule, setSchedule] = useState<ScheduleSlot[]>(cachedSchedule);

    useEffect(() => {
        const fetchAllData = async () => {
            if (isContentFetched && cachedContentCourses.length > 0) {
                setCourses(cachedContentCourses);
                setSchedule(cachedSchedule);
                setIsLoading(false);
                if (cachedContentCourses.length > 0) {
                    setSelectedCourse(cachedContentCourses[0].id);
                }
                return;
            }

            try {
                if (!isContentFetched && (!enrolledCourses || enrolledCourses.length === 0)) setIsLoading(true);
                // Fetch courses, schedule and profile in PARALLEL
                const [contentRes, scheduleRes, profileRes] = await Promise.all([
                    (!enrolledCourses || enrolledCourses.length === 0) ? api.get('/my-content') : Promise.resolve({ data: enrolledCourses }),
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
                if (mappedCourses.length > 0) {
                    setSelectedCourse(mappedCourses[0].id);
                }

                // 2. Handle Schedule
                let mappedSchedule: ScheduleSlot[] = [];
                if (scheduleRes.data && scheduleRes.data.length > 0) {
                    mappedSchedule = scheduleRes.data.map((s: any) => {
                        const timeStr = s.start_time ? s.start_time.substring(0, 5) : '';
                        let color = 'bg-gray-100 border-gray-355 text-gray-850';
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
    const [lastActiveSessionTitle, setLastActiveSessionTitle] = useState<string | null>(null);
    
    
    const activeCourseData = courses.find(c => c.id === selectedCourse) || courses[0];

    const getDaysOfCurrentWeek = () => {
        const startOfWeek = new Date();
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday is start of week
        startOfWeek.setDate(diff);
        
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return d;
        });
    };

    const getStudentClassForCourse = (course: Course) => {
        if (!course) return null;
        const classes = course.classes || [];
        if (!userData || !userData.id) {
            if (classes.length > 0) {
                return classes[0];
            }
            return null;
        }
        const studentIdStr = userData.id.toString();
        // Sınıfta student_ids içinde öğrencinin id'si var mı diye bak
        const matched = classes.find((cls: any) => {
            const studentIds = cls.student_ids || [];
            return studentIds.some((sid: any) => sid.toString() === studentIdStr);
        });
        return matched || classes[0] || null;
    };

    // Seçilen kurs değiştikçe Sıradaki Ders kartını güncelle
    useEffect(() => {
        const targetCourse = courses.find(c => c.id === selectedCourse) || courses[0];
        if (targetCourse) {
            setNextLessonData({
                title: targetCourse.title,
                subtitle: targetCourse.nextLesson || 'Hemen Başla!',
                courseId: targetCourse.id
            });
        }
    }, [selectedCourse, courses]);

    // Sunucudaki modül ilerlemesi (takvimde işlenen dersleri işaretlemek için)
    const [progressMap, setProgressMap] = useState<Record<string, CourseProgress | null>>({});
    const courseIdsKey = courses.map(c => c.id).join(',');
    useEffect(() => {
        if (!courseIdsKey) return;
        const ids = courseIdsKey.split(',');
        Promise.all(ids.map((id) => fetchProgress(id))).then((list) => {
            const next: Record<string, CourseProgress | null> = {};
            ids.forEach((id, i) => { next[id] = list[i]; });
            setProgressMap(next);
        });
    }, [courseIdsKey]);
    // Kurs kartındaki ilerleme: sunucudaki bitmiş modüller / toplam modül
    const realProgress = (courseId: string) => {
        const p = progressMap[String(courseId)];
        const total = p?.order.length ?? 0;
        const done = p ? Object.keys(p.completed).length : 0;
        return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
    };

    // Sınıflara göre haftalık ve aylık takvimi dinamik oluştur
    useEffect(() => {
        if (courses.length === 0) return;

        const generateScheduleEvents = () => {
            const events: ScheduleSlot[] = [];
            
            // Eğer selectedCourse seçilmişse sadece o kursu, yoksa tüm kursları işle
            const coursesToProcess = selectedCourse
                ? courses.filter(c => c.id === selectedCourse)
                : courses;
                
            coursesToProcess.forEach(course => {
                const studentClass = getStudentClassForCourse(course);
                const scheduleList = studentClass ? (studentClass.schedule || []) : (course.schedule || []);
                
                const sections = (course.curriculum || []).filter((item: any) => item.type !== 'live_sessions_config');
                const currentProgress = completedCount(progressMap[String(course.id)]);
                
                if (sections.length === 0) {
                    // Sınıfın haftalık günlerine göre bu haftaki slotları oluştur
                    const weekDays = getDaysOfCurrentWeek();
                    weekDays.forEach(dateObj => {
                        const dayOfWeek = dateObj.getDay();
                        const normalizedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        
                        scheduleList.forEach((slot: any) => {
                            if (dayMap[slot.day] === normalizedDayIndex) {
                                events.push({
                                    id: `sched-${course.id}-${dateObj.getDate()}-${slot.time}`,
                                    day: slot.day,
                                    fullDate: `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`,
                                    time: slot.time,
                                    title: course.title,
                                    type: 'live',
                                    status: 'upcoming',
                                    color: course.color.replace('bg-', 'bg-').replace('555', '100').replace('500', '100').replace('600', '100'),
                                    duration: '60 dk',
                                    courseId: course.id,
                                    sectionTitle: "Genel Canlı Ders",
                                    lessonIndex: 1
                                });
                            }
                        });
                    });
                } else {
                    // Bu ay için takvim günlerini oluşturup sırayla müfredat derslerini dağıtalım
                    const dateSlots: { dayNum: number; day: string; time: string; fullDateStr: string; normalizedDayIndex: number }[] = [];
                    
                    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                        const dateObj = new Date(currentYear, currentMonth, dayNum);
                        const dayOfWeek = dateObj.getDay();
                        const normalizedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                        
                        scheduleList.forEach((slot: any) => {
                            if (dayMap[slot.day] === normalizedDayIndex) {
                                dateSlots.push({
                                    dayNum,
                                    day: slot.day,
                                    time: slot.time,
                                    fullDateStr: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`,
                                    normalizedDayIndex
                                });
                            }
                        });
                    }
                    
                    // Kronolojik sıralama
                    dateSlots.sort((a, b) => {
                        if (a.dayNum !== b.dayNum) return a.dayNum - b.dayNum;
                        return a.time.localeCompare(b.time);
                    });
                    
                    // Ders müfredatını günlere dağıtalım (örnek: 4 ders)
                    const limit = Math.min(dateSlots.length, sections.length);
                    for (let i = 0; i < limit; i++) {
                        const slot = dateSlots[i];
                        const section = sections[i];
                        const lessonIndex = section.lessonNumber || (i + 1);
                        const isCompleted = lessonIndex <= currentProgress;
                        
                        events.push({
                            id: `sched-${course.id}-${slot.dayNum}-${slot.time}`,
                            day: slot.day,
                            fullDate: slot.fullDateStr,
                            time: slot.time,
                            title: course.title,
                            type: 'live',
                            status: isCompleted ? 'completed' : 'upcoming',
                            color: course.color.replace('bg-', 'bg-').replace('555', '100').replace('500', '100').replace('600', '100'),
                            duration: '60 dk',
                            courseId: course.id,
                            sectionTitle: section.title,
                            lessonIndex: lessonIndex
                        });
                    }
                }
            });
            
            return events;
        };

        const generated = generateScheduleEvents();
        setSchedule(generated);
    }, [courses, selectedCourse, userData, progressMap]);

    // Eğitmenin dersi başlatıp başlatmadığını sunucudan kontrol et (5 saniyede bir)
    useEffect(() => {
        if (courses.length === 0) return;

        const checkSessionStatus = async () => {
            try {
                // Tüm kursları kontrol et, herhangi biri canlıysa aktif et
                for (const course of courses) {
                    const res = await api.get(`/session-status/${course.id}`);
                    if (res.data.is_live) {
                        rememberMeetingLink(course.id, res.data.meeting_url);
                        setIsClassActive(true);
                        setLiveCourseId(course.id);
                        setTimeLeftStr("");
                        setNextLessonData({
                            title: course.title,
                            subtitle: '',
                            courseId: course.id
                        });
                        // Track the current live session title (contains current lesson number)
                        if (res.data.title) {
                            setLastActiveSessionTitle(res.data.title);
                        }
                        return;
                    }
                }
                
                // Hiçbir kurs canlı değilse:
                // Eğer daha önce canlı bir ders varsa ve şimdi bittiyse (transition from live to not-live)
                if (isClassActive) {
                    setIsClassActive(false);
                    setLiveCourseId(null);
                    setTimeLeftStr("");
                    
                    // Öğretmenin canlı derste işlediği modüller sunucuda bitmiş sayılır;
                    // takvimi güncel ilerlemeyle yeniden çiz (sayfayı yenilemeden).
                    if (lastActiveSessionTitle && lastActiveSessionTitle.startsWith("gomufi_session:") && liveCourseId) {
                        const updated = await fetchProgress(liveCourseId);
                        if (updated) setProgressMap((prev) => ({ ...prev, [String(liveCourseId)]: updated }));
                    }
                    setLastActiveSessionTitle(null);
                }
            } catch (err) {
                console.error("Session status kontrol hatası:", err);
            }
        };

        checkSessionStatus();
        const interval = setInterval(checkSessionStatus, 5000);
        return () => clearInterval(interval);
    }, [courses, isClassActive, lastActiveSessionTitle, liveCourseId]);


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

    const getWeeklyEvents = (allEvents: ScheduleSlot[]) => {
        const weekDays = getDaysOfCurrentWeek();
        const startOfWeek = weekDays[0];
        const endOfWeek = weekDays[6];
        
        const getFormatDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const startStr = getFormatDate(startOfWeek);
        const endStr = getFormatDate(endOfWeek);
        
        return allEvents.filter(e => {
            if (!e.fullDate) return false;
            return e.fullDate >= startStr && e.fullDate <= endStr;
        });
    };

    const handleJoinLiveClick = async (courseId: string) => {
        try {
            // Öğretmen görüşme linki eklediyse (Zoom, Meet…) yeni sekmede açılır.
            openMeetingLink(courseId);

            // Student enters live session roadmap dashboard
            onJoinLiveClass(courseId);
        } catch (err) {
            console.error("Join live class helper error:", err);
        }
    };

    const getEventsForDay = (dayNum: number) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        return schedule.filter(s => s.fullDate === dateStr);
    };

    // Sıradaki canlı ders: takvimdeki bugünden sonraki ilk (bitmemiş) oturum.
    const nowMs = Date.now();
    const nextLive = schedule
        .filter((e) => e.type === 'live' && e.status !== 'completed' && e.fullDate && e.time)
        .map((e) => ({ e, at: new Date(`${e.fullDate}T${e.time}`).getTime() }))
        .filter(({ at }) => !Number.isNaN(at) && at + 60 * 60_000 > nowMs)
        .sort((x, y) => x.at - y.at)[0];
    const whenText = (at: number) => {
        const days = Math.floor((new Date(at).setHours(0, 0, 0, 0) - new Date(nowMs).setHours(0, 0, 0, 0)) / 86_400_000);
        if (at <= nowMs) return 'Şimdi';
        if (days === 0) return 'Bugün';
        if (days === 1) return 'Yarın';
        return `${days} gün sonra`;
    };
    const weekly = getWeeklyEvents(schedule).filter((slot) => slot.type === 'live' || slot.type === 'reserved');

    return (
        <div className="w-full h-full bg-white bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] [background-size:22px_22px] p-4 md:p-8 font-sans text-slate-800 flex flex-col overflow-x-hidden overflow-y-auto">
            <PageHeader title="Kurslarım" subtitle="Kursların, ders programın ve öğretmenin tek yerde." />

            <div className="grid grid-cols-12 gap-5 md:gap-6 flex-1 pb-20">

                {/* SOL: kurs kartları */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-slate-700">Aktif kurslar</h2>
                        {courses.length > 1 && (
                            <button type="button" onClick={() => setSelectedCourse('')}
                                    className={`text-xs font-black px-3 py-1 rounded-xl border-2 border-b-4 transition-colors ${!selectedCourse ? 'bg-violet-500 border-violet-700 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-violet-300'}`}>
                                Tümü
                            </button>
                        )}
                    </div>

                    {isLoading && courses.length === 0 && (
                        <div className="h-28 rounded-3xl bg-slate-100 animate-pulse" />
                    )}

                    {courses.map((course) => {
                        const selected = selectedCourse === course.id;
                        const prog = realProgress(course.id);
                        return (
                            <div key={course.id} role="button" tabIndex={0}
                                 onClick={() => setSelectedCourse(course.id)}
                                 onKeyDown={(e) => { if (e.key === 'Enter') setSelectedCourse(course.id); }}
                                 className={`relative p-4 rounded-3xl border-2 border-b-4 cursor-pointer transition-all bg-white ${selected ? 'border-violet-400 shadow-md shadow-violet-100' : 'border-slate-200 hover:border-violet-200 hover:-translate-y-0.5'}`}>
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`w-12 h-12 rounded-2xl ${course.lightColor} flex items-center justify-center p-2 shrink-0`}>
                                        {course.icon ? <img src={course.icon} alt="" className="w-full h-full object-contain" /> : <Rocket size={22} className="text-violet-500" />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <h3 className={`font-black leading-tight truncate ${selected ? 'text-violet-800' : 'text-slate-800'}`} title={course.title}>{course.title}</h3>
                                        <p className="text-xs font-bold text-slate-400 truncate">{course.instructor}</p>
                                    </div>
                                    <button type="button" onClick={(e) => { e.stopPropagation(); setInfoCourseId(course.id); }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50" aria-label="Kurs hakkında">
                                        <Info size={18} />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between text-xs font-black mb-1">
                                    <span className="text-slate-500">{prog.done}/{prog.total} modül</span>
                                    <span className="text-emerald-600">%{prog.pct}</span>
                                </div>
                                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.max(prog.pct ? 4 : 0, prog.pct)}%` }} />
                                </div>
                                {course.liveSessions?.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {course.liveSessions.map((sess: any, idx: number) => (
                                            <span key={idx} className="text-[11px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {sess.day || getDayName(sess.date)} {sess.time}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    <button type="button" onClick={onOpenJoinModal}
                            className="w-full py-3.5 rounded-3xl border-2 border-dashed border-slate-300 text-slate-500 font-black text-sm hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50/50 transition-colors flex items-center justify-center gap-2">
                        <Plus size={18} /> Yeni kursa katıl
                    </button>
                </div>

                {/* ORTA: sıradaki canlı ders + takvim */}
                <div className="col-span-12 lg:col-span-6 flex flex-col gap-4">
                    {isClassActive ? (
                        <section className="relative rounded-[2rem] bg-gradient-to-br from-emerald-500 to-teal-500 text-white border-b-8 border-emerald-700/50 p-5 md:p-6 overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none" style={DOTS_STYLE} />
                            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
                                <Mufi pose="wave" className="w-20 -mb-6 hidden sm:block" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-white animate-ping" /> Şu an canlı</p>
                                    <h2 className="text-2xl font-black font-display truncate">{courses.find((c) => c.id === liveCourseId)?.title || 'Canlı ders'}</h2>
                                </div>
                                <ChunkyButton variant="white" size="lg" onClick={() => liveCourseId && handleJoinLiveClick(liveCourseId)}>
                                    <Play size={18} className="fill-current text-emerald-600" /> <span className="text-emerald-700">Derse katıl</span>
                                </ChunkyButton>
                            </div>
                        </section>
                    ) : nextLive ? (
                        <section className="relative rounded-[2rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-b-8 border-violet-700/50 p-5 md:p-6 overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none" style={DOTS_STYLE} />
                            <div className="relative flex items-center gap-4">
                                <span className="w-16 h-16 rounded-2xl bg-white text-violet-600 flex flex-col items-center justify-center shrink-0 border-b-4 border-violet-200">
                                    <span className="text-[11px] font-black uppercase leading-none">{nextLive.e.day?.slice(0, 3)}</span>
                                    <span className="text-xl font-black font-display leading-tight">{nextLive.e.time}</span>
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-black uppercase tracking-wider text-violet-100">Sıradaki canlı ders · {whenText(nextLive.at)}</p>
                                    <h2 className="text-xl md:text-2xl font-black font-display truncate">{nextLive.e.title}</h2>
                                    {nextLive.e.sectionTitle && <p className="text-sm font-bold text-violet-100 truncate">Ders {nextLive.e.lessonIndex}: {nextLive.e.sectionTitle}</p>}
                                </div>
                            </div>
                        </section>
                    ) : null}

                    <div className="bg-white p-1.5 rounded-2xl border-2 border-slate-200 flex w-full sm:w-fit">
                        {([['schedule', 'Bu hafta', CalendarIcon], ['month', 'Aylık takvim', Layout]] as const).map(([key, label, Icon]) => (
                            <button key={key} type="button" onClick={() => setActiveTab(key)}
                                    className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${activeTab === key ? 'bg-violet-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
                                <Icon size={16} /> {label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'schedule' ? (
                        <Card className="p-4 md:p-6">
                            {weekly.length === 0 ? (
                                <MufiEmpty pose="sleep" title="Bu hafta canlı ders yok"
                                           text="Haritadaki modüllerle kendi hızında ilerleyebilirsin."
                                           action={<ChunkyButton onClick={() => navigate('/student/home')}>Haritaya git <ChevronRight size={16} /></ChunkyButton>} />
                            ) : (
                                <div className="space-y-3">
                                    {weekly.map((slot) => {
                                        const isLiveNow = isClassActive && String(slot.courseId) === String(liveCourseId);
                                        const done = slot.status === 'completed';
                                        return (
                                            <div key={slot.id} className="flex items-stretch gap-3">
                                                <div className="w-16 shrink-0 flex flex-col items-center justify-center rounded-2xl bg-slate-50 py-2">
                                                    <span className="font-black text-slate-800">{slot.time}</span>
                                                    <span className="text-[11px] font-black text-slate-400">{slot.day?.slice(0, 3)}</span>
                                                </div>
                                                <div className={`flex-1 min-w-0 p-3 md:p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${isLiveNow ? 'bg-emerald-50 border-emerald-300' : done ? 'bg-slate-50 border-slate-100' : 'bg-white border-violet-100'}`}>
                                                    <div className="min-w-0">
                                                        <h4 className={`font-black truncate ${done ? 'text-slate-400' : 'text-slate-800'}`}>{slot.title}</h4>
                                                        <p className="text-xs font-bold text-slate-500 truncate flex items-center gap-1.5">
                                                            <Video size={13} /> {slot.sectionTitle ? `Ders ${slot.lessonIndex}: ${slot.sectionTitle}` : 'Canlı ders'}
                                                        </p>
                                                    </div>
                                                    {isLiveNow ? (
                                                        <ChunkyButton variant="green" size="sm" onClick={() => slot.courseId && handleJoinLiveClick(slot.courseId)}>
                                                            <Play size={12} className="fill-current" /> Katıl
                                                        </ChunkyButton>
                                                    ) : done ? (
                                                        <span className="shrink-0 text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1"><CheckCircle size={13} /> İşlendi</span>
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>
                    ) : (
                        <Card className="p-4 md:p-6 flex flex-col">
                            <h2 className="text-xl font-black text-slate-800 font-display mb-4">{monthNameStr}</h2>
                            <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-2 text-center">
                                {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((day) => (
                                    <div key={day} className="text-xs font-black text-slate-400 py-1">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1.5 md:gap-2 auto-rows-[minmax(56px,auto)]">
                                {prevPlaceholders.map((d) => (
                                    <div key={`prev-${d}`} className="p-2 rounded-xl text-slate-300 font-bold text-sm">{d}</div>
                                ))}
                                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                                    const dailyEvents = getEventsForDay(day);
                                    const isToday = day === currentDayNum;
                                    return (
                                        <div key={day} className={`p-1.5 md:p-2 rounded-xl font-bold text-sm border-2 relative group ${isToday ? 'bg-violet-50 border-violet-300 text-violet-700' : 'bg-white border-slate-100'}`}>
                                            <span className={isToday ? 'bg-violet-500 text-white px-1.5 py-0.5 rounded-md' : ''}>{day}</span>
                                            {dailyEvents.length > 0 && (
                                                <div className="mt-1.5 space-y-1">
                                                    {dailyEvents.slice(0, 2).map((ev, i) => (
                                                        <div key={i} className={`h-1.5 w-full rounded-full ${ev.status === 'completed' ? 'bg-emerald-400' : 'bg-violet-400'}`} />
                                                    ))}
                                                </div>
                                            )}
                                            {dailyEvents.length > 0 && (
                                                <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-slate-900 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl">
                                                    {dailyEvents.map((ev, i) => (
                                                        <div key={i} className="text-[11px]">
                                                            <span className="font-black block truncate">{ev.title}</span>
                                                            <span className="text-slate-300 flex items-center gap-1"><Clock size={10} /> {ev.time}{ev.sectionTitle ? ` · ${ev.sectionTitle}` : ''}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </div>

                {/* SAĞ: öğretmen */}
                <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
                    <Card className="p-5">
                        <CardTitle icon={UserRound} tone="violet" hint={activeCourseData?.title}>Öğretmenin</CardTitle>
                        <div className="flex items-center gap-3 mb-4">
                            <InitialsAvatar name={activeCourseData?.instructor || 'Öğretmen'} className="w-12 h-12 rounded-2xl text-base" />
                            <p className="font-black text-slate-800 text-lg leading-tight">{activeCourseData?.instructor || 'Öğretmen'}</p>
                        </div>
                        <ChunkyButton className="w-full" onClick={() => navigate('/student/ask')}>
                            <MessageCircle size={18} /> Öğretmenine soru sor
                        </ChunkyButton>
                    </Card>
                    <Card className="p-5 bg-gradient-to-br from-amber-50 to-white">
                        <div className="flex items-center gap-3">
                            <Mufi pose="peek" className="w-14 shrink-0" />
                            <p className="text-sm font-bold text-slate-600">
                                Canlı ders dışında da haritadan kendi hızında ilerleyebilirsin. Takıldığında <b className="text-violet-600">Soru Sor</b>'dan yaz!
                            </p>
                        </div>
                    </Card>
                </div>
            </div>

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
