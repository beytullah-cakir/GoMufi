import React, { useState, useEffect } from 'react';
import { Users, BookOpen, TrendingUp, AlertTriangle, CheckCircle, MessageSquare } from 'lucide-react';
import api from '../../api';

const InstructorDashboard: React.FC = () => {
    const [courses, setCourses] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [coursesRes, studentsRes] = await Promise.all([
                    api.get('/teacher/content'),
                    api.get('/teacher/students')
                ]);
                
                setCourses(coursesRes.data);
                
                const uniqueStudents = new Set();
                studentsRes.data.forEach((s: any) => {
                    if (s.student_id) uniqueStudents.add(s.student_id);
                });
                setStudents(Array.from(uniqueStudents));
            } catch (err) {
                console.error("Failed to fetch dashboard data:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    return (
        <div className="space-y-8 animate-fade-in-down">
            {/* Smart Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                    <div className="bg-orange-100 p-2 rounded-xl text-orange-500">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800">Düşük Tamamlanma Oranı</h4>
                        <p className="text-sm text-gray-600 mt-1">"Web Geliştirme 101" kursunda son 3 gündür aktivite %15 düştü. Öğrencilere motivasyon mesajı göndermeyi düşünün.</p>
                        <button className="text-orange-600 text-sm font-bold mt-2 hover:underline">Mesaj Gönder →</button>
                    </div>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm">
                    <div className="bg-sky-100 p-2 rounded-xl text-sky-500">
                        <MessageSquare size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800">Cevap Bekleyen Sorular</h4>
                        <p className="text-sm text-gray-600 mt-1">Son 24 saatte 5 yeni soru geldi. Bunlardan 3 tanesi "Python Döngüler" dersi ile ilgili.</p>
                        <button className="text-sky-600 text-sm font-bold mt-2 hover:underline">Soruları Yanıtla →</button>
                    </div>
                </div>
            </div>

            {/* Detailed Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Toplam Öğrenci', value: isLoading ? '...' : students.length.toString(), change: 'Tümü', sublabel: 'Platformda aktif', icon: <Users size={24} />, color: 'blue' },
                    { label: 'Aktif Kurslar', value: isLoading ? '...' : courses.length.toString(), change: 'Sistemde', sublabel: 'Yayındaki kurslarım', icon: <BookOpen size={24} />, color: 'emerald' },
                    { label: 'Ortalama Tamamlanma', value: '86%', change: '+5%', sublabel: 'Hedefin üstünde', icon: <CheckCircle size={24} />, color: 'purple' },
                    { label: 'Bugün Aktif', value: '142', change: 'En yüksek', sublabel: '24s içindeki girişler', icon: <TrendingUp size={24} />, color: 'orange' },
                ].map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center justify-between mb-4">
                            <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-500 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                {stat.icon}
                            </div>
                            <span className={`text-xs font-black px-2 py-1 rounded-lg ${stat.change.includes('+') || stat.change === 'En yüksek' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <h3 className="text-3xl font-black text-gray-800 mb-1">{stat.value}</h3>
                        <p className="text-gray-500 font-bold text-sm">{stat.label}</p>
                        <p className="text-xs text-gray-400 mt-2 font-medium">{stat.sublabel}</p>
                    </div>
                ))}
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Courses List */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-gray-800">Kurs Performansı</h2>
                        <div className="flex gap-2">
                            <button className="px-3 py-1 text-xs font-bold text-white bg-gray-800 rounded-lg">Aktif</button>
                            <button className="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Taslak</button>
                            <button className="px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Arşiv</button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Header */}
                        <div className="grid grid-cols-12 text-xs font-bold text-gray-400 uppercase tracking-wider px-4 pb-2 border-b border-gray-100">
                            <div className="col-span-5">Kurs Adı</div>
                            <div className="col-span-2 text-center">Öğrenci</div>
                            <div className="col-span-2 text-center">Puan</div>
                            <div className="col-span-3 text-right">Durum</div>
                        </div>

                        {isLoading ? (
                            <p className="text-sm p-4 text-gray-400 font-bold text-center">Kurslar yükleniyor...</p>
                        ) : courses.length === 0 ? (
                            <p className="text-sm p-4 text-gray-400 font-bold text-center">Yayında bir kursunuz bulunmuyor.</p>
                        ) : (
                            courses.slice(0, 5).map((course, i) => {
                                const colors = ['blue', 'purple', 'orange', 'emerald', 'sky'];
                                const c = colors[i % colors.length];
                                
                                return (
                                <div key={course.id} className="grid grid-cols-12 items-center p-4 rounded-2xl hover:bg-gray-50 transition-colors group cursor-pointer">
                                    <div className="col-span-5 flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl bg-${c}-100 flex items-center justify-center text-xl`}>
                                            {i % 4 === 0 ? '🐍' : i % 4 === 1 ? '🌐' : i % 4 === 2 ? '🎮' : '📊'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 text-sm group-hover:text-sky-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">{course.title}</h4>
                                            <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                                <div className={`h-full bg-${c}-500 rounded-full`} style={{ width: `${course.progress || 0}%` }}></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-2 text-center font-bold text-gray-600 text-sm">{/* Not available yet */ '-'}</div>
                                    <div className="col-span-2 text-center flex items-center justify-center gap-1 font-bold text-gray-600 text-sm">
                                        <span className="text-yellow-400">★</span> 5.0
                                    </div>
                                    <div className="col-span-3 text-right">
                                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${course.progress !== undefined ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                            Yayında
                                        </span>
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                </div>

                {/* Right Column: Quick Stats & Activity */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
                        <div className="flex justify-between items-start mb-8">
                            <div>
                                <p className="text-indigo-100 text-sm font-bold mb-1">Toplam Kazanç</p>
                                <h3 className="text-3xl font-black">
                                    {isLoading ? '...' : `₺${students.reduce((acc, student) => {
                                        const course = courses.find((c: any) => c.id === student.course_id);
                                        return acc + (course?.price || 0);
                                    }, 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                                </h3>
                            </div>
                            <div className="p-2 bg-white/20 rounded-xl">
                                <TrendingUp size={20} />
                            </div>
                        </div>
                        <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                            <div className="flex justify-between text-xs font-bold text-indigo-100 mb-2">
                                <span>Bu ayki hedef</span>
                                <span>85%</span>
                            </div>
                            <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                                <div className="h-full bg-white rounded-full w-[85%]"></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h3 className="text-lg font-black text-gray-800 mb-4">Son Aktiviteler</h3>
                        <div className="relative pl-4 border-l-2 border-gray-100 space-y-6">
                            {[
                                { user: 'Ahmet Y.', action: 'yeni bir test tamamladı', time: '5dk önce', type: 'success' },
                                { user: 'Ayşe K.', action: 'kurşuna kayıt oldu', time: '12dk önce', type: 'info' },
                                { user: 'Mehmet T.', action: 'bir soru sordu', time: '1s önce', type: 'warning' },
                            ].map((activity, i) => (
                                <div key={i} className="relative">
                                    <div className={`absolute -left-[21px] top-1 w-3 h-3 rounded-full border-2 border-white ring-2 ${activity.type === 'success' ? 'bg-green-400 ring-green-100' : activity.type === 'warning' ? 'bg-orange-400 ring-orange-100' : 'bg-sky-400 ring-sky-100'}`}></div>
                                    <p className="text-sm font-bold text-gray-700">
                                        <span className="text-sky-600">{activity.user}</span> {activity.action}
                                    </p>
                                    <span className="text-xs text-gray-400 font-semibold">{activity.time}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstructorDashboard;
