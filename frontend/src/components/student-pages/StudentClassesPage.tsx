import React, { useState, useEffect } from 'react';
import { UserPlus, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Users, BookOpen, User } from 'lucide-react';
import api from '../../api';
import type { CourseData } from '../../types';

interface StudentClassesPageProps {
    courses: Record<string, CourseData>;
    onClassJoined: () => void;
}

interface Classmate {
    id: number;
    name: string;
    status: string;
    avatarSeed: number;
    email: string;
}

const StudentClassesPage: React.FC<StudentClassesPageProps> = ({ courses, onClassJoined }) => {
    const courseList = Object.values(courses);
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(
        courseList.length > 0 ? courseList[0].id : null
    );

    const [classData, setClassData] = useState<{ class_name: string | null; classmates: Classmate[] }>({
        class_name: null,
        classmates: []
    });
    const [isClassLoading, setIsClassLoading] = useState(false);

    // Join Code Form State
    const [code, setCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Fetch Class Details for the selected course
    const fetchClassDetails = async (courseId: string) => {
        setIsClassLoading(true);
        try {
            const res = await api.get(`/student/my-class/${courseId}`);
            setClassData({
                class_name: res.data.class_name,
                classmates: res.data.classmates || []
            });
        } catch (err) {
            console.error("Failed to load class details:", err);
            setClassData({ class_name: null, classmates: [] });
        } finally {
            setIsClassLoading(false);
        }
    };

    useEffect(() => {
        if (selectedCourseId) {
            fetchClassDetails(selectedCourseId);
        }
    }, [selectedCourseId]);

    const handleJoinSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            setError('Lütfen geçerli bir davet kodu girin.');
            return;
        }

        setIsJoining(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const res = await api.post('/class/join', { code: code.trim() });
            if (res.data.success) {
                setSuccessMessage(res.data.message || 'Sınıfa başarıyla katıldınız!');
                setCode('');
                setTimeout(() => {
                    setSuccessMessage(null);
                    onClassJoined();
                }, 2000);
            }
        } catch (err: any) {
            console.error('Join class error:', err);
            const errMsg = err.response?.data?.detail || 'Geçersiz veya bulunamayan katılım kodu. Lütfen tekrar deneyin.';
            setError(errMsg);
        } finally {
            setIsJoining(false);
        }
    };

    const selectedCourse = selectedCourseId ? courses[selectedCourseId] : null;

    return (
        <div className="p-6 md:p-10 space-y-6 max-w-7xl mx-auto font-sans">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-gray-800 font-display uppercase tracking-tight">Sınıflarım</h2>
                <p className="text-gray-400 font-bold text-xs mt-1">Kayıtlı olduğunuz kursları, sınıflarınızı ve sınıf arkadaşlarınızı görüntüleyin.</p>
            </div>

            <div className="grid grid-cols-12 gap-6 items-start">
                
                {/* LEFT SIDE: Course & Join Form Column */}
                <div className="col-span-12 lg:col-span-5 space-y-6">
                    
                    {/* Courses List */}
                    <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                            <BookOpen size={16} className="text-sky-500" />
                            Aktif Kurslarım
                        </h3>
                        {courseList.length > 0 ? (
                            <div className="space-y-3">
                                {courseList.map(course => {
                                    const isSelected = selectedCourseId === course.id;
                                    return (
                                        <div
                                            key={course.id}
                                            onClick={() => setSelectedCourseId(course.id)}
                                            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center justify-between ${
                                                isSelected 
                                                    ? 'bg-sky-50/50 border-sky-500 border-b-4 shadow-md -translate-y-0.5' 
                                                    : 'bg-white border-gray-100 border-b-4 hover:border-sky-300 hover:shadow-sm'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{course.icon}</span>
                                                <div>
                                                    <h4 className="font-black text-sm text-gray-800 truncate max-w-[180px] leading-tight">{course.title}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{course.instructor.name}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black text-sky-600 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-md">
                                                Seç
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 font-bold italic py-4">Kayıtlı olduğunuz bir kurs bulunmamaktadır.</p>
                        )}
                    </div>

                    {/* Join Class Form Card */}
                    <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="font-black text-gray-700 text-sm uppercase tracking-wider flex items-center gap-2">
                            <UserPlus size={16} className="text-sky-500" />
                            Yeni Bir Sınıfa Katıl
                        </h3>
                        
                        {error && (
                            <div className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-600 text-xs font-bold animate-in slide-in-from-top-2">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {successMessage && (
                            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-emerald-700 text-xs font-bold animate-in zoom-in-95">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                                <span>{successMessage}</span>
                            </div>
                        )}

                        <form onSubmit={handleJoinSubmit} className="space-y-3">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Katılım Kodu (Örn: XYZ123)"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    disabled={isJoining}
                                    className="w-full bg-gray-50/50 hover:bg-gray-50 border-2 border-gray-200 border-b-4 focus:border-sky-500 rounded-xl py-3 px-4 font-black text-sm tracking-wider text-center text-gray-800 focus:outline-none transition-all"
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sky-400">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isJoining || !code.trim()}
                                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black text-xs py-3.5 px-4 rounded-xl border-b-4 border-sky-700 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider disabled:opacity-50"
                            >
                                {isJoining ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>Sınıfa Katıl</span>
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* RIGHT SIDE: Selected Course's Class Details */}
                <div className="col-span-12 lg:col-span-7">
                    {selectedCourse ? (
                        <div className="bg-white border-2 border-gray-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 min-h-[400px]">
                            
                            {/* Course Header Info */}
                            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-3xl shrink-0">
                                    {selectedCourse.icon}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-gray-800 leading-tight font-display">{selectedCourse.title}</h3>
                                    <p className="text-xs text-gray-400 font-bold mt-1 uppercase">EĞİTMEN: {selectedCourse.instructor.name}</p>
                                </div>
                            </div>

                            {/* Class Details */}
                            {isClassLoading ? (
                                <div className="flex flex-col items-center justify-center py-20">
                                    <div className="w-10 h-10 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin mb-3"></div>
                                    <p className="text-gray-450 font-bold text-xs uppercase">Sınıf verileri alınıyor...</p>
                                </div>
                            ) : classData.class_name ? (
                                <div className="space-y-6">
                                    {/* Class Info Box */}
                                    <div className="p-4 bg-gradient-to-r from-sky-500 to-indigo-500 text-white rounded-2xl shadow-md flex items-center justify-between border-b-4 border-indigo-750">
                                        <div>
                                            <span className="text-[10px] font-black text-sky-100 uppercase tracking-widest leading-none">Aktif Sınıfınız</span>
                                            <h4 className="text-2xl font-black font-display leading-none mt-1.5">{classData.class_name}</h4>
                                        </div>
                                        <div className="bg-white/20 border border-white/30 px-3 py-1.5 rounded-xl text-xs font-bold shadow-inner">
                                            {classData.classmates.length} Öğrenci
                                        </div>
                                    </div>

                                    {/* Classmates Grid */}
                                    <div className="space-y-3">
                                        <h4 className="font-black text-gray-700 text-xs uppercase tracking-wider flex items-center gap-2">
                                            <Users size={14} className="text-indigo-500" />
                                            Sınıf Arkadaşlarınız
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {classData.classmates.map(member => (
                                                <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
                                                    <div className="relative shrink-0">
                                                        <img
                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${member.avatarSeed}`}
                                                            alt={member.name}
                                                            className="w-10 h-10 rounded-lg bg-white border border-gray-200"
                                                        />
                                                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                                                            member.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                                                        }`}></div>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h5 className="font-black text-sm text-gray-800 truncate leading-tight">{member.name}</h5>
                                                        <p className="text-[9px] text-gray-450 font-bold truncate mt-0.5 uppercase tracking-wider">
                                                            {member.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50 p-6">
                                    <Users className="w-12 h-12 text-gray-300 mb-3" />
                                    <h4 className="font-black text-gray-700 text-sm font-display mb-1.5">Sınıf Bulunamadı</h4>
                                    <p className="text-xs text-gray-400 max-w-sm font-bold mb-4">
                                        Bu derste henüz bir sınıfa atanmadınız. Sınıfa katılmak için sol taraftaki kodu kullanabilirsiniz.
                                    </p>
                                </div>
                            )}

                        </div>
                    ) : (
                        <div className="flex items-center justify-center min-h-[400px] bg-white border-2 border-gray-150 rounded-3xl p-6 text-gray-400 font-bold italic">
                            Ayrıntıları görmek için aktif bir kurs seçin.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default StudentClassesPage;
