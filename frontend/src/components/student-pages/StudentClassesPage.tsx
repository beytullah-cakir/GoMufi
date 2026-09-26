import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle2, AlertTriangle, ArrowRight, Users } from 'lucide-react';
import api from '../../api';
import type { CourseData } from '../../types';
import CourseIcon from '../shared/CourseIcon';
import InitialsAvatar from '../shared/InitialsAvatar';
import { Card, CardTitle, ChunkyButton, DOTS_STYLE, MufiEmpty, PageHeader } from './ui';

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

    // Kurslarım'daki "Yeni kursa katıl" buraya #katil ile gelir: kod kutusuna odaklan.
    useEffect(() => {
        if (window.location.hash !== '#katil') return;
        const input = document.getElementById('join-code') as HTMLInputElement | null;
        input?.scrollIntoView({ block: 'center' });
        input?.focus();
    }, []);

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

    const joinCard = (
        <Card id="katil" className="p-5">
            <CardTitle icon={UserPlus} tone="violet" hint="Öğretmeninin verdiği kodu yaz.">Yeni bir sınıfa katıl</CardTitle>
            {error && (
                <div className="flex items-center gap-2 bg-rose-50 border-2 border-rose-100 rounded-2xl p-3 text-rose-600 text-sm font-bold mb-3">
                    <AlertTriangle className="w-4 h-4 shrink-0" /> <span>{error}</span>
                </div>
            )}
            {successMessage && (
                <div className="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-3 text-emerald-700 text-sm font-bold mb-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> <span>{successMessage}</span>
                </div>
            )}
            <form onSubmit={handleJoinSubmit} className="space-y-3">
                <label className="sr-only" htmlFor="join-code">Katılım kodu</label>
                <input
                    id="join-code"
                    type="text"
                    autoComplete="off"
                    placeholder="ör. XYZ123"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={isJoining}
                    className="w-full bg-slate-50 border-2 border-slate-200 border-b-4 focus:border-violet-400 rounded-2xl py-3.5 px-4 font-black text-lg tracking-[0.2em] text-center text-slate-800 placeholder:text-slate-300 placeholder:tracking-normal placeholder:font-bold focus:outline-none transition-colors"
                />
                <ChunkyButton type="submit" size="lg" className="w-full" disabled={isJoining || !code.trim()}>
                    {isJoining ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <>Sınıfa katıl <ArrowRight className="w-4 h-4" /></>}
                </ChunkyButton>
            </form>
        </Card>
    );

    return (
        <div className="min-h-full bg-white bg-[radial-gradient(#e2e8f0_1.2px,transparent_1.2px)] [background-size:22px_22px]">
            <div className="p-4 md:p-8 max-w-6xl mx-auto font-sans">
                <PageHeader title="Sınıflarım" subtitle="Şuben ve sınıf arkadaşların." pose="wave" />

                {courseList.length === 0 ? (
                    <div className="max-w-md mx-auto">
                        <MufiEmpty pose="peek" title="Henüz bir sınıfın yok" text="Öğretmeninin verdiği katılım koduyla hemen katılabilirsin." />
                        {joinCard}
                    </div>
                ) : (
                    <div className="grid grid-cols-12 gap-5 md:gap-6 items-start">
                        <div className="col-span-12 lg:col-span-8 space-y-4">
                            {/* Birden çok kurs varsa kurs seçimi sekmeler halinde */}
                            {courseList.length > 1 && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1" role="tablist">
                                    {courseList.map((course) => (
                                        <button key={course.id} type="button" role="tab" aria-selected={selectedCourseId === course.id}
                                                onClick={() => setSelectedCourseId(course.id)}
                                                className={`shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-2xl border-2 border-b-4 font-black text-sm transition-colors ${
                                                    selectedCourseId === course.id ? 'bg-violet-500 border-violet-700 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'}`}>
                                            <CourseIcon name={course.icon} size={16} /> {course.title}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {selectedCourse && (
                                <>
                                    <section className="relative rounded-[2rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white border-b-8 border-violet-700/50 p-5 md:p-6 overflow-hidden">
                                        <div className="absolute inset-0 pointer-events-none" style={DOTS_STYLE} />
                                        <div className="relative flex items-center gap-4">
                                            <span className="w-14 h-14 rounded-2xl bg-white text-violet-600 flex items-center justify-center shrink-0 border-b-4 border-violet-200">
                                                <CourseIcon name={selectedCourse.icon} size={28} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-black uppercase tracking-wider text-violet-100 truncate">{selectedCourse.title}</p>
                                                <h2 className="text-2xl md:text-3xl font-black font-display leading-tight truncate">
                                                    {isClassLoading ? 'Yükleniyor…' : classData.class_name || 'Şube atanmadı'}
                                                </h2>
                                                <p className="text-sm font-bold text-violet-100 truncate">Öğretmenin: {selectedCourse.instructor.name}</p>
                                            </div>
                                            {classData.class_name && (
                                                <span className="shrink-0 bg-white/20 border-2 border-white/25 px-3 py-1.5 rounded-2xl text-sm font-black flex items-center gap-1.5">
                                                    <Users size={16} /> {classData.classmates.length}
                                                </span>
                                            )}
                                        </div>
                                    </section>

                                    <Card className="p-5">
                                        <CardTitle icon={Users} tone="sky" hint={classData.class_name ? `${classData.classmates.length} kişi` : undefined}>Sınıf arkadaşların</CardTitle>
                                        {isClassLoading ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[0, 1].map((i) => <div key={i} className="h-16 rounded-2xl bg-slate-100 animate-pulse" />)}
                                            </div>
                                        ) : !classData.class_name ? (
                                            <MufiEmpty compact pose="peek" title="Bu kursta henüz bir şubede değilsin"
                                                       text="Öğretmenin seni bir şubeye eklediğinde ya da şube koduyla katıldığında arkadaşların burada görünecek." />
                                        ) : (
                                            <>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {classData.classmates.map((member) => (
                                                        <div key={member.id} className="flex items-center gap-3 p-3 bg-white border-2 border-slate-100 rounded-2xl">
                                                            <div className="relative shrink-0">
                                                                <InitialsAvatar name={member.name} className="w-11 h-11 rounded-xl text-sm" />
                                                                <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${member.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-black text-slate-800 truncate">{member.name}</p>
                                                                <p className={`text-xs font-bold ${member.status === 'online' ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                                    {member.status === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {classData.classmates.length <= 1 && (
                                                    <MufiEmpty compact pose="wave" title="Şimdilik burada yalnızsın"
                                                               text="Sınıf arkadaşların katıldıkça burada görünecekler." />
                                                )}
                                            </>
                                        )}
                                    </Card>
                                </>
                            )}
                        </div>

                        <div className="col-span-12 lg:col-span-4 space-y-4">
                            {joinCard}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentClassesPage;
