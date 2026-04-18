import React, { useState, useEffect } from 'react';
import { User, Plus, ChevronRight, BookOpen, Clock, Trophy, Loader2, Link2, X, Trash2 } from 'lucide-react';
import api from '../../api';

interface Student {
    id: number;
    first_name: string;
    last_name: string;
    nickname: string;
    grade_level: string;
    education_level: string;
    // Calculated or additional stats can be added here
    completedLessons?: number;
    totalLessons?: number;
    badges?: number;
    points?: number;
}

const ParentStudents: React.FC = () => {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLinking, setIsLinking] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [studentCode, setStudentCode] = useState("");
    const [linkError, setLinkError] = useState("");

    const fetchStudents = async () => {
        setIsLoading(true);
        try {
            const response = await api.get("/profile");
            if (response.data && response.data.students) {
                // Backend returns basic student info, we can add default stats for now
                const enrichedStudents = response.data.students.map((s: any) => ({
                    ...s,
                    completedLessons: Math.floor(Math.random() * 10), // Mock stats for UI
                    totalLessons: 20,
                    badges: Math.floor(Math.random() * 5),
                    points: Math.floor(Math.random() * 2000),
                }));
                setStudents(enrichedStudents);
            }
        } catch (err) {
            console.error("Failed to fetch students", err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    const handleLinkStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentCode.trim()) return;

        setIsLinking(true);
        setLinkError("");
        try {
            await api.post("/profile/link-student", { student_code: studentCode });
            setStudentCode("");
            setShowLinkModal(false);
            fetchStudents(); // Refresh list
        } catch (err: any) {
            setLinkError(err.response?.data?.detail || "Bağlantı başarısız. Kodu kontrol edin.");
        } finally {
            setIsLinking(false);
        }
    };

    const handleUnlinkStudent = async (studentId: number) => {
        if (!window.confirm("Bu öğrenciyi hesabınızdan ayırmak istediğinize emin misiniz?")) return;
        
        try {
            await api.post(`/profile/unlink-student/${studentId}`);
            fetchStudents();
        } catch (err) {
            console.error("Failed to unlink student", err);
            alert("İşlem başarısız oldu.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-gray-500 font-bold uppercase tracking-widest">Öğrenciler yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Öğrencilerim</h2>
                    <p className="text-gray-500 font-medium">Çocuklarınızın profillerini yönetin ve gelişimlerini takip edin.</p>
                </div>
                <button 
                    onClick={() => setShowLinkModal(true)}
                    className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center gap-2 transform hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" /> Öğrenci Bağla
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map((student) => (
                    <div key={student.id} className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group relative">
                        {/* Unlink Button */}
                        <button 
                            onClick={() => handleUnlinkStudent(student.id)}
                            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-red-500 hover:text-white text-gray-400 rounded-xl transition-all z-10 backdrop-blur-sm"
                            title="Bağlantıyı Kes"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="h-24 bg-gradient-to-r from-purple-100 to-indigo-100 relative">
                            <div className="absolute -bottom-10 left-6 p-1 bg-white rounded-2xl shadow-sm border border-gray-50">
                                <img 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${student.nickname || student.id}`} 
                                    alt={student.first_name} 
                                    className="w-20 h-20 rounded-xl bg-gray-50" 
                                />
                            </div>
                        </div>

                        <div className="pt-12 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-gray-800">{student.first_name} {student.last_name}</h3>
                                    <p className="text-gray-500 font-bold text-sm uppercase tracking-wide">
                                        {student.grade_level || "Sınıf Belirtilmedi"} • {student.nickname}
                                    </p>
                                </div>
                                <div className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-xs font-black flex items-center gap-1 border border-yellow-100">
                                    <Trophy className="w-3 h-3" />
                                    {student.points} XP
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                                    <div className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" /> İlerleme
                                    </div>
                                    <div className="text-lg font-black text-blue-600">
                                        %{Math.floor((student.completedLessons! / student.totalLessons!) * 100)}
                                    </div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                    <div className="text-[10px] text-green-500 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                        <Trophy className="w-3 h-3" /> Rozetler
                                    </div>
                                    <div className="text-lg font-black text-green-600">
                                        {student.badges}
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-3 bg-gray-50 text-gray-700 font-black rounded-xl hover:bg-purple-600 hover:text-white transition-all flex items-center justify-center gap-2 border-b-4 border-gray-200 active:border-b-0 active:translate-y-1">
                                Gelişimi Görüntüle <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add New Student Card */}
                <button 
                    onClick={() => setShowLinkModal(true)}
                    className="bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-gray-400 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all gap-4 min-h-[340px] group"
                >
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                        <Plus className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <span className="font-black text-lg block">Yeni Öğrenci Bağla</span>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1 block">Kod girerek ekleyin</span>
                    </div>
                </button>
            </div>

            {/* Link Student Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowLinkModal(false)} />
                    <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-zoom-in">
                        <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-white">
                            <div className="flex justify-between items-center mb-2">
                                <div className="p-3 bg-purple-500 text-white rounded-2xl shadow-lg shadow-purple-100">
                                    <Link2 className="w-6 h-6" />
                                </div>
                                <button onClick={() => setShowLinkModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <h3 className="text-2xl font-black text-gray-800">Öğrenci Bağla</h3>
                            <p className="text-gray-500 font-medium text-sm">Öğrencinin profilindeki bağlantı kodunu girin.</p>
                        </div>

                        <form onSubmit={handleLinkStudent} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Öğrenci Kodu</label>
                                <input 
                                    type="text"
                                    value={studentCode}
                                    onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                                    placeholder="Örn: ST-A1B2C3"
                                    className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-xl tracking-widest focus:border-purple-400 focus:bg-white outline-none transition-all placeholder:text-gray-300 placeholder:tracking-normal"
                                    maxLength={10}
                                    autoFocus
                                />
                                {linkError && <p className="text-red-500 text-xs font-bold ml-1">{linkError}</p>}
                            </div>

                            <button 
                                type="submit"
                                disabled={isLinking || !studentCode.trim()}
                                className="w-full py-4 bg-purple-600 text-white font-black rounded-2xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:shadow-none uppercase tracking-widest text-sm"
                            >
                                {isLinking ? <Loader2 className="w-5 h-5 animate-spin" /> : "BAĞLANTIYI KUR"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentStudents;
