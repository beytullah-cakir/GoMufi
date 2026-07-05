import React from 'react';
import api from '../../api';
import { 
    ChevronLeft, 
    BookOpen, 
    Trophy, 
    Clock, 
    Target, 
    TrendingUp, 
    Zap, 
    Calendar,
    Star,
    Award,
    MessageSquare,
    Brain,
    Loader2
} from 'lucide-react';

interface StudentDetailProps {
    student: any;
    onBack: () => void;
}

const ParentStudentDetail: React.FC<StudentDetailProps> = ({ student: initialStudent, onBack }) => {
    const [student, setStudent] = React.useState(initialStudent);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchStudentDetail = async () => {
            try {
                setIsLoading(true);
                const response = await api.get(`/profile/parent/student/${initialStudent.id}`);
                setStudent(response.data);
            } catch (error) {
                console.error("Öğrenci detayları yüklenemedi:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (initialStudent?.id) {
            fetchStudentDetail();
        }
    }, [initialStudent?.id]);

    const getColorByCategory = (category: string) => {
        const colors: any = {
            'Matematik': 'bg-blue-500',
            'Fen Bilimleri': 'bg-green-500',
            'Türkçe': 'bg-orange-500',
            'İngilizce': 'bg-purple-500',
            'Sosyal Bilgiler': 'bg-red-500'
        };
        return colors[category] || 'bg-indigo-500';
    };

    const getIconByCategory = (category: string) => {
        if (category === 'Matematik') return <Brain className="w-4 h-4" />;
        if (category === 'İngilizce') return <Languages className="w-4 h-4" />;
        return <BookOpen className="w-4 h-4" />;
    };

    // Mapping dynamic courses to UI subjects
    const subjects = (student.courses || []).map((course: any) => ({
        name: course.title,
        progress: course.progress || 0,
        color: getColorByCategory(course.category || course.title),
        icon: getIconByCategory(course.category || course.title)
    }));

    // Fallback for mock-like appearance if no courses found
    const displaySubjects = subjects.length > 0 ? subjects : [
        { name: "Matematik", progress: 0, color: "bg-blue-500", icon: <Brain className="w-4 h-4" /> },
        { name: "Türkçe", progress: 0, color: "bg-orange-500", icon: <BookOpen className="w-4 h-4" /> }
    ];

    const stats = {
        totalStudyTime: "42 Saat",
        lessonAttendance: "95%",
        currentStreak: `${student.streak || 0} Gün`,
        globalRank: "#452",
        recentLessons: [
            { date: "12 Şubat", subject: "Matematik", topic: "Üslü Sayılar", performance: "Harika", score: 92 },
            { date: "10 Şubat", subject: "Fen Bilimleri", topic: "Hücre Bölünmesi", performance: "İyi", score: 85 },
            { date: "09 Şubat", subject: "Türkçe", topic: "Paragraf Anlamı", performance: "Mükemmel", score: 98 },
        ]
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Öğrenci Verileri Güncelleniyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            {/* Navigation Header */}
            <div className="flex items-center gap-4">
                <button 
                    onClick={onBack}
                    className="p-3 bg-white rounded-2xl border-2 border-gray-100 text-gray-400 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-gray-800">{student.first_name}'nın Gelişimi</h2>
                    <p className="text-gray-500 font-medium">Detaylı öğrenci analiz raporu ve başarı takibi.</p>
                </div>
            </div>

            {/* Profile Header Card */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-purple-100 relative overflow-hidden">
                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    <div className="relative">
                        <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-[2rem] p-1 border-2 border-white/30">
                            <img 
                                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.nickname || student.id}`} 
                                className="w-full h-full rounded-[1.8rem] bg-white"
                                alt={student.first_name}
                            />
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-yellow-400 p-2 rounded-xl shadow-lg border-4 border-purple-600">
                            <Trophy className="w-5 h-5 text-purple-700" />
                        </div>
                    </div>

                    <div className="text-center md:text-left flex-1">
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                            <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                                {student.grade_level || "8. Sınıf"}
                            </span>
                            <span className="px-3 py-1 bg-yellow-400 text-purple-800 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Elit Lig
                            </span>
                        </div>
                        <h3 className="text-4xl font-black mb-1">{student.first_name} {student.last_name}</h3>
                        <p className="text-purple-100 font-medium text-lg">"{student.nickname}" • Öğrenci Kodu: {student.student_code}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-center">
                            <div className="text-2xl font-black mb-1">{student.xp || student.points || 0}</div>
                            <div className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">Toplam XP</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 text-center">
                            <div className="text-2xl font-black mb-1">{stats.currentStreak}</div>
                            <div className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">Günlük Seri</div>
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Progress & Subjects */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Subject Progress Cards */}
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                                <Target className="w-6 h-6 text-purple-500" />
                                Ders Bazlı İlerleme
                            </h3>
                            <button className="text-sm font-bold text-purple-600 hover:underline">Tümünü Gör</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {displaySubjects.map((sub: any, idx: number) => (
                                <div key={idx} className="p-5 rounded-3xl bg-gray-50 border border-gray-100 group hover:border-purple-200 transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 ${sub.color} text-white rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                                                {sub.icon}
                                            </div>
                                            <span className="font-bold text-gray-700">{sub.name}</span>
                                        </div>
                                        <span className="text-lg font-black text-gray-800">%{sub.progress}</span>
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full ${sub.color} rounded-full transition-all duration-1000 ease-out shadow-sm`}
                                            style={{ width: `${sub.progress}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Lesson History */}
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
                        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-orange-500" />
                            Son Ders Performansı
                        </h3>
                        <div className="space-y-4">
                            {stats.recentLessons.map((lesson, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-orange-50 text-orange-600 rounded-xl flex flex-col items-center justify-center border border-orange-100">
                                            <span className="text-xs font-black leading-none">{lesson.date.split(' ')[0]}</span>
                                            <span className="text-[10px] font-bold uppercase">{lesson.date.split(' ')[1]}</span>
                                        </div>
                                        <div>
                                            <div className="font-black text-gray-800">{lesson.topic}</div>
                                            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">{lesson.subject}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-sm font-black ${lesson.score > 90 ? 'text-green-500' : 'text-blue-500'}`}>
                                            {lesson.performance} ({lesson.score}/100)
                                        </div>
                                        <div className="flex gap-0.5 justify-end mt-1">
                                            {[1,2,3,4,5].map(s => (
                                                <Star key={s} className={`w-3 h-3 ${s <= (lesson.score / 20) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'}`} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column: Badges & Teacher Notes */}
                <div className="space-y-8">
                    {/* Achievement Badges */}
                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
                        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
                            <Award className="w-6 h-6 text-yellow-500" />
                            Başarı Rozetleri
                        </h3>
                        <div className="grid grid-cols-3 gap-4">
                            {[
                                { emoji: "🚀", label: "Hızlı", color: "bg-blue-50" },
                                { emoji: "🔥", label: "Seri", color: "bg-orange-50" },
                                { emoji: "🧠", label: "Zeki", color: "bg-purple-50" },
                                { emoji: "🎯", label: "Odak", color: "bg-green-50" },
                                { emoji: "⭐", label: "Yıldız", color: "bg-yellow-50" },
                                { emoji: "📚", label: "Kitap", color: "bg-indigo-50" },
                            ].map((badge, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2 group cursor-pointer">
                                    <div className={`w-14 h-14 ${badge.color} rounded-2xl flex items-center justify-center text-2xl shadow-sm border border-white group-hover:scale-110 transition-transform group-hover:shadow-md`}>
                                        {badge.emoji}
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{badge.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Teacher Feedback / Quick Actions */}
                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-lg shadow-indigo-100">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-indigo-300" />
                            Eğitmen Notu
                        </h3>
                        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 mb-6 border border-white/20 italic text-sm leading-relaxed text-indigo-50 font-medium">
                            " {student.first_name} bu hafta özellikle denklemler konusundaki mantığı çok iyi kavradı. Ev ödevlerini zamanında teslim etti. Haftaya geometriye başlıyoruz."
                        </div>
                        <button className="w-full py-4 bg-white text-indigo-600 font-black rounded-xl hover:bg-indigo-50 transition-colors shadow-sm flex items-center justify-center gap-2">
                            Eğitmene Mesaj Gönder
                        </button>
                    </div>

                    {/* Time Stats */}
                    <div className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                                <Clock className="w-6 h-6 text-gray-400" />
                            </div>
                            <div>
                                <div className="text-2xl font-black text-gray-800">{stats.totalStudyTime}</div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Toplam Çalışma</div>
                            </div>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full">
                            <div className="h-full w-3/4 bg-purple-500 rounded-full" />
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 mt-2">Haftalık hedef: 50 Saat</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Languages = ({ className }: { className: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
);

export default ParentStudentDetail;
