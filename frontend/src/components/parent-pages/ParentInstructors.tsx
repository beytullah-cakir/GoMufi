import React from 'react';
import { Mail, Star, Calendar, MessageSquare, MoreVertical, ChevronRight } from 'lucide-react';

const ParentInstructors: React.FC = () => {
    // Mock Data
    const instructors = [
        {
            id: 1,
            name: "Ahmet Yılmaz",
            subject: "Matematik",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Brian",
            rating: 4.9,
            nextLesson: "Yarın, 14:00",
            status: "active",
            expertises: ["Geometri", "Cebir"],
            bio: "10 yıllık matematik öğretmenliği deneyimi. ODTÜ mezunu."
        },
        {
            id: 2,
            name: "Zeynep Kaya",
            subject: "Piyano",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Senorita",
            rating: 5.0,
            nextLesson: "Cuma, 16:30",
            status: "active",
            expertises: ["Klasik Müzik", "Solfej"],
            bio: "Konservatuar mezunu, çocuklarla çalışma konusunda uzman."
        },
        {
            id: 3,
            name: "Can Demir",
            subject: "İngilizce",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix",
            rating: 4.8,
            nextLesson: "-",
            status: "inactive",
            expertises: ["Speaking", "Grammar"],
            bio: "TESOL sertifikalı, eğlenceli İngilizce öğretimi."
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Eğitmenlerimiz</h2>
                    <p className="text-gray-500 font-medium">Çocuğunuzun eğitim aldığı uzman kadromuz.</p>
                </div>
                <button className="px-6 py-3 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors flex items-center gap-2">
                    + Yeni Eğitmen Bul
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {instructors.map((instructor) => (
                    <div key={instructor.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-start gap-4">
                            <div className="relative">
                                <img src={instructor.avatar} alt={instructor.name} className="w-20 h-20 rounded-2xl bg-gray-50" />
                                <div className="absolute -bottom-2 -right-2 bg-white px-2 py-1 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1">
                                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                                    {instructor.rating}
                                </div>
                            </div>

                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-800 group-hover:text-purple-600 transition-colors">{instructor.name}</h3>
                                        <p className="text-purple-500 font-medium text-sm mb-2">{instructor.subject}</p>
                                    </div>
                                    <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>

                                <p className="text-gray-500 text-sm line-clamp-2 mb-4">
                                    {instructor.bio}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    {instructor.expertises.map((exp, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg">
                                            {exp}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-gray-100 mt-4 pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {instructor.nextLesson !== "-" ? (
                                    <span>Sonraki Ders: <span className="text-gray-900 font-bold">{instructor.nextLesson}</span></span>
                                ) : (
                                    <span className="text-gray-400">Planlanmış ders yok</span>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button className="p-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-colors">
                                    <MessageSquare className="w-5 h-5" />
                                </button>
                                <button className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors">
                                    <Mail className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ParentInstructors;
