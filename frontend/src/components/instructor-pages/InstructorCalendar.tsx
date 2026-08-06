import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock, Users, Calendar as CalendarIcon, LayoutGrid, LayoutList, Play, Loader2, X, Brain, Puzzle, Trophy, HelpCircle } from 'lucide-react';
import api from '../../api';
import LessonSlide from '../student-pages/LessonSlide';

import LiveLessonTeacher from './LiveLessonTeacher';

// Sprites matching the student view
import GrassIcon from "../../assets/sprites/grass.png";
import ButtonCyan from "../../assets/sprites/ButtonCyan.png";
import ButtonPurple from "../../assets/sprites/ButtonPurple.png";
import ButtonYellow from "../../assets/sprites/ButtonYellow.png";
import ButtonGreen from "../../assets/sprites/ButtonGreen.png";
import BrainIcon from "../../assets/sprites/Brain.png";
import PencilIcon from "../../assets/sprites/Pencil.png";
import PuzzleIcon from "../../assets/sprites/Puzzle.png";
import TrophyIcon from "../../assets/sprites/Trophy.png";
import ButtonDarkBlue from "../../assets/sprites/ButtonDarkBlue.png";
import ButtonDarkPurple from "../../assets/sprites/ButtonDarkPurple.png";
import QuestionIcon from "../../assets/sprites/Question.png";
import BagIcon from "../../assets/sprites/Bag.png";

interface ClassModel {
    id: string;
    name: string;
    schedule: { day: string; time: string }[];
    student_ids?: (number | string)[];
}

interface Course {
    id: number | string;
    title: string;
    category?: string;
    students_count?: number;
    classes?: ClassModel[];
    schedule?: { day: string; time: string }[];
    curriculum?: any[];
    notes?: any[];
}

interface InstructorCalendarProps {
    coursesData?: Course[];
}

const dayMap: { [key: string]: number } = {
    'Pazartesi': 0, 'Monday': 0, 'Salı': 1, 'Tuesday': 1, 'Çarşamba': 2, 'Wednesday': 2,
    'Perşembe': 3, 'Thursday': 3, 'Cuma': 4, 'Friday': 4, 'Cumartesi': 5, 'Saturday': 5, 'Pazar': 6, 'Sunday': 6
};

const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const InstructorCalendar: React.FC<InstructorCalendarProps> = ({ coursesData = [] }) => {
    const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'month' | 'week'>('month');
    const [debugMode, setDebugMode] = useState(false);
    const [startingSessionId, setStartingSessionId] = useState<number | string | null>(null);
    
    // Slide player overlay states
    const [showLessonSlide, setShowLessonSlide] = useState(false);
    const [activeLessonTitle, setActiveLessonTitle] = useState("");
    const [activeLessonSlides, setActiveLessonSlides] = useState<any[]>([]);
    const [activeLaunchCourseId, setActiveLaunchCourseId] = useState<number | string | null>(null);
    const [activeLessonIndex, setActiveLessonIndex] = useState<number | null>(null);
    const [activeLessonIndexState, setActiveLessonIndexState] = useState(0);
    const [showSessionManager, setShowSessionManager] = useState(false);
    const [sessionStudents, setSessionStudents] = useState<{ [id: string]: { name: string, isReady: boolean, currentSlide: number, lastSeen: number } }>({});


    const [activeSession, setActiveSession] = useState<{
        courseId: string | number;
        lessonIndex: number;
        title: string;
        slides: any[];
    } | null>(null);

    // Poll active session details to resume or stop it if teacher page reloads
    useEffect(() => {
        const checkActiveSessions = async () => {
            if (!coursesData || coursesData.length === 0) return;
            try {
                for (const course of coursesData) {
                    const res = await api.get(`/session-status/${course.id}`);
                    if (res.data.is_live) {
                        const sessionTitle = res.data.title || "";
                        let lessonIndex = 1;
                        let topic = "Genel Canlı Ders";
                        
                        if (sessionTitle.startsWith("gomufi_session:")) {
                            const parts = sessionTitle.split(":");
                            lessonIndex = parseInt(parts[1]) || 1;
                            topic = parts[2] || "Genel Canlı Ders";
                        }
                        
                        const lessonsList = course.curriculum || [];
                        const matchingLesson = lessonsList.find((l: any) => l.lessonNumber === lessonIndex);
                        const slides = matchingLesson?.slides || [];
                        
                        setActiveSession({
                            courseId: course.id,
                            lessonIndex: lessonIndex,
                            title: matchingLesson?.title || topic,
                            slides: slides
                        });
                        break;
                    }
                }
            } catch (err) {
                console.error("Error checking active sessions:", err);
            }
        };
        
        checkActiveSessions();
    }, [coursesData]);



    // Clean inactive students (offline detection)
    useEffect(() => {
        if (!showSessionManager) return;
        const interval = setInterval(() => {
            const now = Date.now();
            setSessionStudents(prev => {
                const cleaned = { ...prev };
                let changed = false;
                for (const id in cleaned) {
                    if (now - cleaned[id].lastSeen > 12000) {
                        delete cleaned[id];
                        changed = true;
                    }
                }
                return changed ? cleaned : prev;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [showSessionManager]);

    // Date navigation state
    const [currentDate, setCurrentDate] = useState(new Date());
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Generate Month Days Helper
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonthOffset = (year: number, month: number) => {
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // offset: 0 is Mon, 6 is Sun
    };

    const daysCount = getDaysInMonth(currentYear, currentMonth);
    const startOffset = getFirstDayOfMonthOffset(currentYear, currentMonth);

    // Build grid cells: previous month placeholders + current month days + next month placeholders
    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
    const prevPlaceholders = Array.from({ length: startOffset }, (_, i) => prevMonthDaysCount - startOffset + i + 1);
    const currentDays = Array.from({ length: daysCount }, (_, i) => i + 1);
    
    const totalSlots = startOffset + daysCount;
    const nextPlaceholdersCount = totalSlots <= 35 ? 35 - totalSlots : 42 - totalSlots;
    const nextPlaceholders = Array.from({ length: nextPlaceholdersCount }, (_, i) => i + 1);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Helper to calculate week days based on currentDate
    const getDaysOfCurrentWeek = () => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Monday is start of week
        startOfWeek.setDate(diff);
        
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            return d;
        });
    };

    const weekDays = getDaysOfCurrentWeek();

    // Flatten classes from coursesData to create sidebar selectable items
    const calendarClasses = coursesData.flatMap(course => {
        const classes = course.classes || [];
        if (classes.length === 0) {
            // Fallback for courses with no classes configured
            return [{
                id: `course_${course.id}`,
                courseId: course.id,
                courseTitle: course.title,
                name: "Genel Sınıf",
                studentsCount: course.students_count || 0,
                schedule: course.schedule || []
            }];
        }
        return classes.map(cls => ({
            id: cls.id,
            courseId: course.id,
            courseTitle: course.title,
            name: cls.name,
            studentsCount: cls.student_ids?.length || 0,
            schedule: cls.schedule || []
        }));
    });

    // Filter based on sidebar selection
    const filteredClasses = selectedClassId 
        ? calendarClasses.filter(c => c.id === selectedClassId)
        : calendarClasses;

    // Generate monthly events sequentially mapped to curriculum lessons
    const generateMonthlyEvents = () => {
        const events: any[] = [];
        
        filteredClasses.forEach(cls => {
            const course = coursesData.find(c => String(c.id) === String(cls.courseId));
            if (!course) return;
            
            const sections = (course.curriculum || []).filter((item: any) => item.type !== 'live_sessions_config');
            
            if (sections.length === 0) {
                // Repeat general class slots on matching week days
                const schedule = cls.schedule || [];
                const daysInMonth = getDaysInMonth(currentYear, currentMonth);
                for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                    const dateObj = new Date(currentYear, currentMonth, dayNum);
                    const dayOfWeek = dateObj.getDay();
                    const normalizedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    
                    schedule.forEach(slot => {
                        if (dayMap[slot.day] === normalizedDayIndex) {
                            events.push({
                                classId: cls.id,
                                courseId: cls.courseId,
                                courseTitle: cls.courseTitle,
                                className: cls.name,
                                dayNum: dayNum,
                                day: slot.day,
                                time: slot.time,
                                sectionTitle: "Genel Canlı Ders",
                                lessonIndex: 1,
                                isFallback: true
                            });
                        }
                    });
                }
                return;
            }
            
            // Group sections/bubbles by lessonNumber
            const lessonsMap: { [key: number]: { lessonNumber: number; title: string; slides: any[] } } = {};
            sections.forEach((section: any) => {
                const lessonNum = section.lessonNumber || 1;
                const lessonTopic = section.lessonTopic || section.title || `Ders ${lessonNum}`;
                
                const matchingNote = course.notes?.find((n: any) => String(n.id) === String(section.id));
                const rawSlides = matchingNote?.slides || [];
                const slides = rawSlides.map((s: any) => ({
                    ...s,
                    bubbleTitle: section.title,
                    bubbleId: section.id
                }));
                
                if (!lessonsMap[lessonNum]) {
                    lessonsMap[lessonNum] = {
                        lessonNumber: lessonNum,
                        title: lessonTopic,
                        slides: [...slides]
                    };
                } else {
                    lessonsMap[lessonNum].slides.push(...slides);
                }
            });
            
            const lessonsList = Object.values(lessonsMap).sort((a, b) => a.lessonNumber - b.lessonNumber);
            
            // Map scheduled times to sequential curriculum lessons
            const daysInMonth = getDaysInMonth(currentYear, currentMonth);
            const schedule = cls.schedule || [];
            
            const dateSlots: { dayNum: number; day: string; time: string; normalizedDayIndex: number }[] = [];
            for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                const dateObj = new Date(currentYear, currentMonth, dayNum);
                const dayOfWeek = dateObj.getDay();
                const normalizedDayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                
                schedule.forEach(slot => {
                    if (dayMap[slot.day] === normalizedDayIndex) {
                        dateSlots.push({
                            dayNum,
                            day: slot.day,
                            time: slot.time,
                            normalizedDayIndex
                        });
                    }
                });
            }
            
            // Sort slots chronologically
            dateSlots.sort((a, b) => {
                if (a.dayNum !== b.dayNum) return a.dayNum - b.dayNum;
                return a.time.localeCompare(b.time);
            });
            
            // Distribute curriculum lessons (e.g. 4 lessons) sequentially on these scheduled slots
            const limit = Math.min(dateSlots.length, lessonsList.length);
            for (let i = 0; i < limit; i++) {
                const slot = dateSlots[i];
                const lesson = lessonsList[i];
                
                events.push({
                    classId: cls.id,
                    courseId: cls.courseId,
                    courseTitle: cls.courseTitle,
                    className: cls.name,
                    dayNum: slot.dayNum,
                    day: slot.day,
                    time: slot.time,
                    sectionTitle: lesson.title,
                    section: { id: `lesson_${lesson.lessonNumber}`, title: lesson.title },
                    slides: lesson.slides,
                    lessonIndex: lesson.lessonNumber
                });
            }
        });
        
        return events;
    };

    const monthlyEvents = generateMonthlyEvents();

    // Execute Jitsi launching and slide preview opening directly for specific scheduled slot
    const handleStartClassEvent = async (event: any) => {
        const { courseId, courseTitle, className, section, lessonIndex } = event;
        
        setStartingSessionId(courseId);
        setActiveLaunchCourseId(courseId);
        
        const slides = event.slides || [];
        setActiveLessonTitle(section?.title || courseTitle);
        setActiveLessonSlides(slides);
        setActiveLessonIndex(lessonIndex);
        
        // Structure custom title including lesson number index to notify student progress
        const titleParam = `gomufi_session:${lessonIndex}:${section?.title || "Genel Canlı Ders"}`;
        
        try {
            await api.post(`/start-session/${courseId}?title=${encodeURIComponent(titleParam)}`);
            
            // Automatically open Jitsi video classroom
            try {
                const jitsiRes = await api.get(`/jitsi/token/${courseId}`);
                const { token, room, domain } = jitsiRes.data;
                const url = `https://${domain}/${room}?jwt=${token}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
                window.open(url, "_blank");
            } catch (jitsiErr) {
                console.warn('Jitsi JWT token failed, falling back to public Jitsi Meet:', jitsiErr);
                const fallbackUrl = `https://meet.jit.si/GoMufi-Room-${courseId}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
                window.open(fallbackUrl, "_blank");
            }

            // Open session manager to let the teacher view the roadmap first
            setShowSessionManager(true);
        } catch (err) {
            console.error('Session failed to start', err);
            alert('Ders başlatılırken bir hata oluştu.');
            setActiveLaunchCourseId(null);
        } finally {
            setStartingSessionId(null);
        }
    };

    // Calculate if event is startable (day/time matching)
    const isEventStartable = (eventDay: string, eventTime: string, cellDayNum?: number) => {
        if (debugMode) return true;
        
        const now = new Date();
        
        // Match day
        if (cellDayNum !== undefined) {
            const isTodayCell = cellDayNum === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
            if (!isTodayCell) return false;
        } else {
            const currentDayTurkish = dayNames[now.getDay() === 0 ? 6 : now.getDay() - 1];
            const dayTranslationMap: { [key: string]: string } = {
                'Pazartesi': 'Pazartesi', 'Salı': 'Salı', 'Çarşamba': 'Çarşamba', 'Perşembe': 'Perşembe',
                'Cuma': 'Cuma', 'Cumartesi': 'Cumartesi', 'Pazar': 'Pazar',
                'Monday': 'Pazartesi', 'Tuesday': 'Salı', 'Wednesday': 'Çarşamba', 'Thursday': 'Perşembe',
                'Friday': 'Cuma', 'Saturday': 'Cumartesi', 'Sunday': 'Pazar'
            };
            const normalizedEventDay = dayTranslationMap[eventDay] || eventDay;
            if (normalizedEventDay !== currentDayTurkish) return false;
        }

        // Match time
        const [evtHour, evtMin] = eventTime.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();

        const eventMinutes = evtHour * 60 + evtMin;
        const currentMinutes = currentHour * 60 + currentMin;

        return currentMinutes >= eventMinutes - 15;
    };

    // Render Month Grid Cell
    const renderDayCell = (dayNum: number, isPlaceholder: boolean = false, isPrev: boolean = false) => {
        if (isPlaceholder) {
            return (
                <div key={`${isPrev ? 'prev' : 'next'}-${dayNum}`} className="h-32 border border-dashed border-slate-200 rounded-2xl p-2.5 bg-slate-50/20 opacity-30 select-none">
                    <span className="text-xs font-bold text-slate-400">{dayNum}</span>
                </div>
            );
        }

        const dayEvents = monthlyEvents.filter(e => e.dayNum === dayNum);

        return (
            <div key={`day-${dayNum}`} className="h-32 border-2 border-b-4 border-slate-200 rounded-2xl p-2.5 relative hover:border-sky-300 hover:border-b-sky-400 hover:shadow-sm transition-all duration-200 group bg-white cursor-pointer flex flex-col justify-between">
                <div>
                    <span className="text-xs font-black text-slate-800">{dayNum}</span>
                    <div className="mt-1.5 space-y-1.5 overflow-y-auto max-h-[85px] no-scrollbar">
                        {dayEvents.map((event, idx) => {
                            const startable = isEventStartable(event.day, event.time, dayNum);
                            return (
                                <div 
                                    key={idx} 
                                    className="bg-sky-50 text-sky-700 p-1.5 rounded-xl text-[9px] font-black border-l-[3px] border-sky-500 shadow-sm leading-tight flex flex-col gap-0.5"
                                    title={`${event.courseTitle} - ${event.className} (${event.time})`}
                                >
                                    <span className="block font-extrabold truncate">{event.courseTitle}</span>
                                    <span className="block font-extrabold text-[8px] opacity-75 truncate">{event.className}</span>
                                    {event.sectionTitle && (
                                        <span className="block text-[8px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100/50 rounded px-1.5 py-0.5 mt-0.5 truncate">
                                            Ders {event.lessonIndex}: {event.sectionTitle}
                                        </span>
                                    )}
                                    <span className="opacity-80 block font-bold text-[8px]">{event.time}</span>
                                    
                                    {startable && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleStartClassEvent(event);
                                            }}
                                            disabled={startingSessionId !== null}
                                            className="mt-1.5 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[8px] py-1 rounded flex items-center justify-center gap-0.5 shadow-sm transition-all cursor-pointer"
                                        >
                                            {startingSessionId === event.courseId ? (
                                                <Loader2 size={8} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <Play size={8} fill="currentColor" />
                                                    Başlat
                                                </>
                                            )}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* Active Session Warning Banner */}
            {activeSession && (
                <div className="bg-amber-50 border-2 border-b-[6px] border-amber-300 rounded-[2rem] p-6 mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md select-text">
                    <div className="flex items-center gap-3.5">
                        <span className="text-3xl">⏰</span>
                        <div>
                            <h3 className="font-black text-amber-900 text-sm md:text-base leading-tight">Devam Eden Aktif Canlı Dersiniz Var!</h3>
                            <p className="text-[11px] text-amber-700 font-bold mt-1">
                                Ders: <span className="font-black underline">{activeSession.title}</span>. Sayfayı yenilediniz veya tarayıcı kapandı, derse devam edebilir veya sonlandırabilirsiniz.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2.5 shrink-0 select-none">
                        <button
                            onClick={() => {
                                setActiveLaunchCourseId(activeSession.courseId);
                                setActiveLessonTitle(activeSession.title);
                                setActiveLessonSlides(activeSession.slides);
                                setActiveLessonIndex(activeSession.lessonIndex);
                                setShowLessonSlide(true);
                            }}
                            className="px-5 py-2.5 bg-amber-550 hover:bg-amber-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-sm transition-all active:translate-y-[2px] active:border-b-2 cursor-pointer border-2 border-b-4 border-amber-700"
                        >
                            Derse Devam Et
                        </button>
                        <button
                            onClick={async () => {
                                try {
                                    await api.post(`/stop-session/${activeSession.courseId}`);
                                    setActiveSession(null);
                                    alert("Ders sonlandırıldı.");
                                } catch (e) {
                                    console.error("Failed to stop session:", e);
                                    alert("Ders sonlandırılırken hata oluştu.");
                                }
                            }}
                            className="px-5 py-2.5 bg-white hover:bg-slate-50 text-slate-600 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:translate-y-[2px] active:border-b-2 cursor-pointer border-2 border-b-4 border-slate-200"
                        >
                            Dersi Sonlandır
                        </button>
                    </div>
                </div>
            )}

            {/* Header section */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 font-display">Takvim & Planlama</h2>
                    <p className="text-slate-400 font-bold text-xs mt-1">Sınıflarınıza ait yayın saatlerini yönetin.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher Tabs */}
                    <div className="bg-white p-1.5 rounded-2xl border-2 border-b-4 border-slate-200 flex shadow-sm gap-1">
                        <button
                            onClick={() => setActiveTab('month')}
                            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:translate-y-[1px] flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'month' 
                                    ? 'bg-slate-900 border-2 border-b-2 border-black text-white shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-700 bg-transparent border-2 border-transparent'
                            }`}
                        >
                            <LayoutGrid size={14} />
                            Aylık Takvim
                        </button>
                        <button
                            onClick={() => setActiveTab('week')}
                            className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:translate-y-[1px] flex items-center gap-1.5 whitespace-nowrap ${
                                activeTab === 'week' 
                                    ? 'bg-slate-900 border-2 border-b-2 border-black text-white shadow-sm' 
                                    : 'text-slate-400 hover:text-slate-700 bg-transparent border-2 border-transparent'
                            }`}
                        >
                            <LayoutList size={14} />
                            Haftalık
                        </button>
                    </div>

                    {/* Date Navigation */}
                    {activeTab === 'month' && (
                        <div className="flex items-center bg-white rounded-2xl border-2 border-b-4 border-slate-200 p-1 shadow-sm">
                            <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 border-2 border-transparent hover:border-slate-200 rounded-xl text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"><ChevronLeft size={16} /></button>
                            <span className="px-3 font-black text-slate-700 text-xs tracking-tight">{monthNames[currentMonth]} {currentYear}</span>
                            <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 border-2 border-transparent hover:border-slate-200 rounded-xl text-slate-400 hover:text-slate-800 transition-colors cursor-pointer"><ChevronRight size={16} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-12 gap-6 items-start">
                {/* Left Sidebar: Sınıflar list */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-slate-800 text-sm">Sınıflarım</h3>
                        <button 
                            onClick={() => setSelectedClassId(null)}
                            className={`text-xs font-black px-3 py-1 rounded-xl border-2 transition-all cursor-pointer ${
                                !selectedClassId 
                                    ? 'bg-sky-50 border-b-2 border-sky-300 text-sky-600' 
                                    : 'bg-white border-b-2 border-slate-250 text-slate-500 hover:border-slate-350'
                            }`}
                        >
                            Tümü
                        </button>
                    </div>

                    <div className="space-y-3">
                        {calendarClasses.map(cls => {
                            const isSelected = selectedClassId === cls.id;
                            const scheduleList = cls.schedule || [];
                            
                            return (
                                <div
                                    key={cls.id}
                                    onClick={() => setSelectedClassId(cls.id)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                                        isSelected 
                                            ? 'bg-white border-sky-400 border-b-[6px] shadow-md hover:scale-[1.01]' 
                                            : 'bg-white border-slate-200 border-b-4 hover:border-sky-300 hover:scale-[1.01]'
                                    }`}
                                >
                                    <h4 className="font-black text-xs text-slate-850 truncate mb-1">{cls.courseTitle}</h4>
                                    <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md w-fit border border-sky-100/50 mb-2 block">
                                        {cls.name}
                                    </span>
                                    
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400">
                                            <Users size={12} />
                                            <span>{cls.studentsCount} Öğrenci</span>
                                        </div>

                                        <div className="mt-2 space-y-1">
                                            {scheduleList.map((slot, sIdx) => (
                                                <div key={sIdx} className="flex items-center gap-1 text-[9px] font-black text-sky-600 bg-sky-50/50 px-2 py-0.5 rounded-md w-fit border border-sky-100/50">
                                                    <Clock size={10} />
                                                    <span>{slot.day} - {slot.time}</span>
                                                </div>
                                            ))}
                                            {scheduleList.length === 0 && (
                                                <span className="text-[9px] font-bold text-slate-400 italic block mt-1">Planlama yok</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {calendarClasses.length === 0 && (
                            <p className="text-xs font-bold text-slate-400 text-center py-8">Henüz aktif bir sınıf bulunmuyor.</p>
                        )}
                    </div>
                </div>

                {/* Right Calendar View: Monthly or Weekly */}
                <div className="col-span-12 lg:col-span-9 space-y-4">
                    {activeTab === 'month' ? (
                        /* Monthly View Calendar Grid */
                        <div className="bg-white border-2 border-b-[8px] border-slate-200 rounded-[2.5rem] shadow-xl p-6 overflow-hidden animate-in fade-in zoom-in duration-300">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 text-center mb-4">
                                {dayNames.map(day => (
                                    <div key={day} className="text-xs font-black text-slate-400 uppercase tracking-wider">{day}</div>
                                ))}
                            </div>
                            
                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-2">
                                {/* Previous month placeholders */}
                                {prevPlaceholders.map(dayNum => renderDayCell(dayNum, true, true))}
                                
                                {/* Current month days */}
                                {currentDays.map(dayNum => renderDayCell(dayNum, false))}
                                
                                {/* Next month placeholders */}
                                {nextPlaceholders.map(dayNum => renderDayCell(dayNum, true, false))}
                            </div>
                        </div>
                    ) : (
                        /* Weekly View Calendar List */
                        <div className="grid grid-cols-7 gap-4">
                            {dayNames.map((dayName, dayIdx) => {
                                const dateOfIndex = weekDays[dayIdx];
                                const isSameMonth = dateOfIndex.getMonth() === currentMonth && dateOfIndex.getFullYear() === currentYear;
                                const dayEvents = isSameMonth 
                                    ? monthlyEvents.filter(e => e.dayNum === dateOfIndex.getDate()) 
                                    : [];
                                    
                                return (
                                    <div key={dayName} className="col-span-7 md:col-span-1 bg-white border-2 border-b-[6px] border-slate-200 rounded-2xl p-4 min-h-[300px] flex flex-col hover:border-sky-300 hover:border-b-sky-450 hover:shadow-sm transition-all duration-300">
                                        <div className="text-center border-b border-slate-100 pb-2 mb-3">
                                            <span className="text-xs font-black text-slate-800 uppercase tracking-widest block">{dayName}</span>
                                            <span className="text-[10px] font-black text-slate-400 block mt-0.5">{dateOfIndex.getDate()} {monthNames[dateOfIndex.getMonth()]}</span>
                                        </div>
                                        <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar">
                                            {dayEvents.map((event, idx) => {
                                                const startable = isEventStartable(event.day, event.time);
                                                return (
                                                    <div 
                                                        key={idx} 
                                                        className="bg-sky-50 border border-sky-100 text-sky-700 p-2.5 rounded-xl text-[10px] font-black shadow-sm leading-tight flex flex-col gap-1 border-l-4 border-l-sky-500 hover:scale-102 hover:-translate-y-0.5 transition-all"
                                                    >
                                                        <span className="font-extrabold truncate block w-full" title={event.courseTitle}>{event.courseTitle}</span>
                                                        <span className="text-[9px] font-black text-sky-600 opacity-80 truncate block w-full">{event.className}</span>
                                                        {event.sectionTitle && (
                                                            <span className="block text-[9px] font-black text-indigo-650 bg-indigo-50 border border-indigo-100/50 rounded px-1.5 py-0.5 mt-0.5 truncate">
                                                                Ders {event.lessonIndex}: {event.sectionTitle}
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] font-bold text-sky-500 flex items-center gap-1 mt-0.5">
                                                            <Clock size={10} />
                                                            {event.time}
                                                        </span>

                                                        {startable && (
                                                            <button
                                                                onClick={() => handleStartClassEvent(event)}
                                                                disabled={startingSessionId !== null}
                                                                className="mt-2 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[9px] py-1 rounded flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                                                            >
                                                                {startingSessionId === event.courseId ? (
                                                                    <Loader2 size={10} className="animate-spin" />
                                                                ) : (
                                                                    <>
                                                                        <Play size={10} fill="currentColor" />
                                                                        Dersi Başlat
                                                                    </>
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                            {dayEvents.length === 0 && (
                                                <div className="h-full flex items-center justify-center text-center opacity-40 py-12">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Boş</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Debug Mode Switcher */}
                    <div className="bg-amber-50 border-2 border-b-[6px] border-amber-200 p-4 rounded-3xl flex items-center justify-between shadow-sm max-w-md animate-in fade-in duration-300">
                        <div className="flex gap-3 items-center">
                            <div className="w-8 h-8 rounded-full bg-amber-100 border-2 border-b-2 border-amber-200 flex items-center justify-center text-amber-600 font-bold">⚙️</div>
                            <div>
                                <h4 className="text-xs font-black text-amber-900">Hızlı Ders Başlatma (Debug Modu)</h4>
                                <p className="text-[10px] text-amber-700 font-bold">Aktifken, saati veya tarihi gelmeyen dersler de anında takvimden başlatılabilir.</p>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={debugMode} 
                                onChange={(e) => setDebugMode(e.target.checked)} 
                                className="sr-only peer" 
                            />
                            <div className="w-9 h-5 bg-gray-250 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Slide Player Overlay */}
            {showLessonSlide && (
                <LessonSlide
                    isOpen={showLessonSlide}
                    lessonTitle={activeLessonTitle}
                    slides={activeLessonSlides}
                    previewRole="teacher" // TEACHER PREVIEW MODE!
                    courseId={activeLaunchCourseId ? String(activeLaunchCourseId) : undefined}
                    lessonIndex={activeLessonIndex || undefined}
                    initialSlideIndex={activeLessonIndexState}
                    onClose={async () => {
                        setShowLessonSlide(false);
                    }}
                    onComplete={async () => {
                        setShowLessonSlide(false);
                        
                        // Save completed stars (3 stars) in teacher's localStorage
                        if (activeLaunchCourseId && activeLessonIndex !== null) {
                            const key = `completed_lessons_${activeLaunchCourseId}`;
                            const saved = localStorage.getItem(key);
                            const completedObj = saved ? JSON.parse(saved) : {};
                            completedObj[activeLessonIndex] = 3;
                            localStorage.setItem(key, JSON.stringify(completedObj));

                        }
                    }}
                />
            )}

            {/* Live Session Manager (Canlı Ders Yönetim Paneli) Overlay */}
            {showSessionManager && (
                <LiveLessonTeacher
                    activeLaunchCourseId={activeLaunchCourseId}
                    activeLessonIndex={activeLessonIndex}
                    activeLessonTitle={activeLessonTitle}
                    coursesData={coursesData}
                    sessionStudents={sessionStudents}
                    showLessonSlide={showLessonSlide}
                    setActiveLessonIndexState={setActiveLessonIndexState}
                    setActiveLessonTitle={setActiveLessonTitle}
                    setShowLessonSlide={setShowLessonSlide}
                    setActiveLessonIndex={setActiveLessonIndex}
                    onStopSession={async () => {
                        try {
                            await api.post(`/stop-session/${activeLaunchCourseId}`);
                            setShowSessionManager(false);
                            setShowLessonSlide(false);
                            setActiveLaunchCourseId(null);
                            setActiveSession(null);
                            alert("Canlı ders sonlandırıldı.");
                        } catch (e) {
                            console.error("Failed to stop session:", e);
                            alert("Ders sonlandırılırken hata oluştu.");
                        }
                    }}
                />
            )}
        </div>
    );
};

export default InstructorCalendar;
