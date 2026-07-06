import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Users, Calendar as CalendarIcon, LayoutGrid, LayoutList } from 'lucide-react';

interface Course {
    id: number | string;
    title: string;
    category?: string;
    students_count?: number;
    schedule?: { day: string; time: string }[];
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
    const [selectedCourseId, setSelectedCourseId] = useState<number | string | null>(null);
    const [activeTab, setActiveTab] = useState<'month' | 'week'>('month');
    
    // Date navigation state
    const [currentDate, setCurrentDate] = useState(new Date());
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    // Generate Month Days Helper
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonthOffset = (year: number, month: number) => {
        // day of week for 1st of month: 0 is Sun, 1 is Mon...
        const day = new Date(year, month, 1).getDay();
        return day === 0 ? 6 : day - 1; // offset: 0 is Mon, 6 is Sun
    };

    const daysCount = getDaysInMonth(currentYear, currentMonth);
    const startOffset = getFirstDayOfMonthOffset(currentYear, currentMonth);

    // Build grid cells: previous month placeholders + current month days + next month placeholders
    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
    const prevPlaceholders = Array.from({ length: startOffset }, (_, i) => prevMonthDaysCount - startOffset + i + 1);
    const currentDays = Array.from({ length: daysCount }, (_, i) => i + 1);
    
    // Keep total grid items 35 or 42 depending on requirement
    const totalSlots = startOffset + daysCount;
    const nextPlaceholdersCount = totalSlots <= 35 ? 35 - totalSlots : 42 - totalSlots;
    const nextPlaceholders = Array.from({ length: nextPlaceholdersCount }, (_, i) => i + 1);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
    };

    // Filter courses based on sidebar selection
    const filteredCourses = selectedCourseId 
        ? coursesData.filter(c => c.id === selectedCourseId)
        : coursesData;

    // Get all scheduled events from filtered courses
    const allEvents = filteredCourses.flatMap(course => {
        const schedule = course.schedule || [];
        return schedule.map(s => ({
            courseId: course.id,
            courseTitle: course.title,
            category: course.category || 'Diğer',
            day: s.day,
            time: s.time
        }));
    });

    const getEventsForDayIndex = (normalizedDayIndex: number) => {
        return allEvents.filter(e => dayMap[e.day] === normalizedDayIndex);
    };

    // Render Month Grid Cell
    const renderDayCell = (dayNum: number, isPlaceholder: boolean = false, isPrev: boolean = false) => {
        if (isPlaceholder) {
            return (
                <div key={`${isPrev ? 'prev' : 'next'}-${dayNum}`} className="h-32 border border-gray-100/70 rounded-2xl p-2 bg-gray-50/50 opacity-40 select-none">
                    <span className="text-xs font-bold text-gray-400">{dayNum}</span>
                </div>
            );
        }

        const dateObj = new Date(currentYear, currentMonth, dayNum);
        const dayOfWeekIndex = dateObj.getDay();
        const normalizedIndex = dayOfWeekIndex === 0 ? 6 : dayOfWeekIndex - 1;
        const dayEvents = getEventsForDayIndex(normalizedIndex);

        return (
            <div key={`day-${dayNum}`} className="h-32 border border-gray-100 rounded-2xl p-2 relative hover:bg-sky-50/30 transition-all group shadow-sm bg-white">
                <span className="text-xs font-black text-gray-700">{dayNum}</span>
                <div className="mt-1 space-y-1.5 overflow-y-auto max-h-[85px] no-scrollbar">
                    {dayEvents.map((event, idx) => (
                        <div 
                            key={idx} 
                            className="bg-indigo-50 text-indigo-700 p-1.5 rounded-xl text-[9px] font-black border-l-[3px] border-indigo-500 shadow-sm leading-tight truncate"
                            title={`${event.courseTitle} (${event.time})`}
                        >
                            <span className="block font-extrabold truncate">{event.courseTitle}</span>
                            <span className="opacity-80 block font-bold text-[8px] mt-0.5">{event.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 font-display">Takvim & Planlama</h2>
                    <p className="text-gray-400 font-bold text-xs mt-1">Derslerinize ait haftalık ve aylık yayın saatlerini yönetin.</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Switcher Tabs */}
                    <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
                        <button
                            onClick={() => setActiveTab('month')}
                            className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${activeTab === 'month' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-650'}`}
                        >
                            <LayoutGrid size={14} />
                            Aylık
                        </button>
                        <button
                            onClick={() => setActiveTab('week')}
                            className={`px-4 py-1.5 rounded-lg font-black text-xs transition-all flex items-center gap-1.5 ${activeTab === 'week' ? 'bg-indigo-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-650'}`}
                        >
                            <LayoutList size={14} />
                            Haftalık
                        </button>
                    </div>

                    {/* Date Navigation */}
                    {activeTab === 'month' && (
                        <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-800 transition-colors"><ChevronLeft size={16} /></button>
                            <span className="px-3 font-black text-gray-700 text-xs tracking-tight">{monthNames[currentMonth]} {currentYear}</span>
                            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-gray-800 transition-colors"><ChevronRight size={16} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-12 gap-6 items-start">
                {/* Left Sidebar: My Courses list */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-black text-gray-700 text-sm">Aktif Kurslarım</h3>
                        <button 
                            onClick={() => setSelectedCourseId(null)}
                            className={`text-xs font-black px-2.5 py-1 rounded-lg border transition-all ${
                                !selectedCourseId 
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                                    : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-700'
                            }`}
                        >
                            Tümü
                        </button>
                    </div>

                    <div className="space-y-3">
                        {coursesData.map(course => {
                            const isSelected = selectedCourseId === course.id;
                            const scheduleList = course.schedule || [];
                            
                            return (
                                <div
                                    key={course.id}
                                    onClick={() => setSelectedCourseId(course.id)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                                        isSelected 
                                            ? 'bg-white border-indigo-500 border-b-4 shadow-md' 
                                            : 'bg-white border-gray-150 border-b-4 hover:border-indigo-300 hover:shadow-sm'
                                    }`}
                                >
                                    <h4 className="font-black text-xs text-gray-800 truncate mb-1.5">{course.title}</h4>
                                    
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400">
                                            <Users size={12} />
                                            <span>{course.students_count || 0} Öğrenci</span>
                                        </div>

                                        <div className="mt-2 space-y-1">
                                            {scheduleList.map((slot, sIdx) => (
                                                <div key={sIdx} className="flex items-center gap-1 text-[9px] font-black text-indigo-600 bg-indigo-50/50 px-2 py-0.5 rounded-md w-fit border border-indigo-100/50">
                                                    <Clock size={10} />
                                                    <span>{slot.day} - {slot.time}</span>
                                                </div>
                                            ))}
                                            {scheduleList.length === 0 && (
                                                <span className="text-[9px] font-bold text-gray-400 italic block mt-1">Planlama eklenmedi</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {coursesData.length === 0 && (
                            <p className="text-xs font-bold text-gray-400 text-center py-8">Henüz aktif bir kurs bulunmuyor.</p>
                        )}
                    </div>
                </div>

                {/* Right Calendar View: Monthly or Weekly */}
                <div className="col-span-12 lg:col-span-9">
                    {activeTab === 'month' ? (
                        /* Monthly View Calendar Grid */
                        <div className="bg-white border-2 border-gray-150 border-b-6 rounded-3xl shadow-sm p-6 overflow-hidden">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 text-center mb-4">
                                {dayNames.map(day => (
                                    <div key={day} className="text-xs font-black text-gray-400 uppercase tracking-wider">{day}</div>
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
                                const dayEvents = getEventsForDayIndex(dayIdx);
                                return (
                                    <div key={dayName} className="col-span-7 md:col-span-1 bg-white border-2 border-gray-150 border-b-6 rounded-2xl p-4 min-h-[300px] flex flex-col">
                                        <div className="text-center border-b border-gray-100 pb-2 mb-3">
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest block">{dayName}</span>
                                        </div>
                                        <div className="flex-1 space-y-2.5 overflow-y-auto custom-scrollbar">
                                            {dayEvents.map((event, idx) => (
                                                <div 
                                                    key={idx} 
                                                    className="bg-indigo-50 border-2 border-indigo-150 text-indigo-700 p-2.5 rounded-xl text-[10px] font-black shadow-sm leading-tight flex flex-col gap-1 border-l-4 border-l-indigo-500 hover:scale-102 hover:-translate-y-0.5 transition-all"
                                                >
                                                    <span className="font-extrabold truncate block w-full" title={event.courseTitle}>{event.courseTitle}</span>
                                                    <span className="text-[9px] font-bold text-indigo-500 flex items-center gap-1 mt-0.5">
                                                        <Clock size={10} />
                                                        {event.time}
                                                    </span>
                                                </div>
                                            ))}
                                            {dayEvents.length === 0 && (
                                                <div className="h-full flex items-center justify-center text-center opacity-40 py-12">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Boş</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstructorCalendar;
