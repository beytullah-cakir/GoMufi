import React from 'react';
import { User, Plus, ChevronRight, BookOpen, Clock, Trophy } from 'lucide-react';

const ParentStudents: React.FC = () => {
    // Mock Data
    const students = [
        {
            id: 1,
            name: "Ali Yılmaz",
            grade: "4. Sınıf",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
            totalLessons: 24,
            completedLessons: 18,
            badges: 5,
            points: 1250,
            interests: ["Matematik", "Kodlama", "Satranç"]
        },
        {
            id: 2,
            name: "Ayşe Yılmaz",
            grade: "2. Sınıf",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Annie",
            totalLessons: 12,
            completedLessons: 10,
            badges: 3,
            points: 850,
            interests: ["Piyano", "Resim"]
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Öğrencilerim</h2>
                    <p className="text-gray-500 font-medium">Çocuklarınızın profillerini yönetin.</p>
                </div>
                <button className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors flex items-center gap-2">
                    <Plus className="w-5 h-5" /> Öğrenci Ekle
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map((student) => (
                    <div key={student.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all group">
                        <div className="h-24 bg-gradient-to-r from-purple-100 to-indigo-100 relative">
                            <div className="absolute -bottom-10 left-6 p-1 bg-white rounded-2xl">
                                <img src={student.avatar} alt={student.name} className="w-20 h-20 rounded-xl bg-gray-50" />
                            </div>
                        </div>

                        <div className="pt-12 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-gray-800">{student.name}</h3>
                                    <p className="text-gray-500 font-bold text-sm">{student.grade}</p>
                                </div>
                                <div className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-xs font-bold flex items-center gap-1">
                                    <Trophy className="w-3 h-3" />
                                    {student.points} Puan
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-6">
                                {student.interests.map((tag, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-md">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="p-3 bg-blue-50 rounded-xl">
                                    <div className="text-xs text-blue-400 font-bold mb-1 flex items-center gap-1">
                                        <BookOpen className="w-3 h-3" /> Dersler
                                    </div>
                                    <div className="text-lg font-black text-blue-600">
                                        {student.completedLessons}/{student.totalLessons}
                                    </div>
                                </div>
                                <div className="p-3 bg-green-50 rounded-xl">
                                    <div className="text-xs text-green-500 font-bold mb-1 flex items-center gap-1">
                                        <Trophy className="w-3 h-3" /> Rozetler
                                    </div>
                                    <div className="text-lg font-black text-green-600">
                                        {student.badges}
                                    </div>
                                </div>
                            </div>

                            <button className="w-full py-3 bg-gray-50 text-gray-700 font-bold rounded-xl hover:bg-purple-600 hover:text-white transition-colors flex items-center justify-center gap-2">
                                Profili Düzenle <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}

                {/* Add New Student Card (Placeholder style) */}
                <button className="bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 text-gray-400 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50 transition-all gap-4 min-h-[300px]">
                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm">
                        <Plus className="w-8 h-8" />
                    </div>
                    <span className="font-bold text-lg">Yeni Öğrenci Ekle</span>
                </button>
            </div>
        </div>
    );
};

export default ParentStudents;
