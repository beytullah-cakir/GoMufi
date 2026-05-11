import React, { useState, useEffect } from 'react';
import { Mail, Star, Calendar, MessageSquare, MoreVertical, Loader2 } from 'lucide-react';
import api from '../../api';

interface Instructor {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    expertises: string;
    bio: string;
    rating: number;
    nextLesson: string;
    avatar: string;
}

const ParentInstructors: React.FC = () => {
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchInstructors = async () => {
            try {
                const response = await api.get("/profile/parent/teachers");
                const enrichedData = response.data.map((t: any) => ({
                    ...t,
                    rating: parseFloat((4.5 + Math.random() * 0.5).toFixed(1)),
                    nextLesson: "-", // This could be fetched from live sessions in the future
                    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.first_name}${t.id}`
                }));
                setInstructors(enrichedData);
            } catch (error) {
                console.error("Failed to fetch instructors:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInstructors();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-gray-500 font-bold uppercase tracking-widest animate-pulse">Eğitmenler Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h2 className="text-4xl font-black text-gray-800 mb-2">Eğitmenlerimiz</h2>
                    <p className="text-gray-500 font-medium text-lg">Çocuklarınızın eğitim aldığı uzman kadromuz.</p>
                </div>
            </div>

            {instructors.length === 0 ? (
                <div className="bg-white p-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 flex flex-col items-center text-center gap-4">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
                        <Star className="w-10 h-10 text-gray-200" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-800">Henüz Eğitmen Yok</h3>
                        <p className="text-gray-500 font-medium max-w-sm mt-2">
                            Öğrencileriniz herhangi bir kursa kayıt olduğunda eğitmenleri burada listelenecektir.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {instructors.map((instructor) => (
                        <div key={instructor.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-100 transition-all group relative overflow-hidden">
                            <div className="flex items-start gap-6 relative z-10">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-purple-500 rounded-3xl rotate-6 group-hover:rotate-12 transition-transform opacity-10" />
                                    <img src={instructor.avatar} alt={instructor.first_name} className="w-24 h-24 rounded-3xl bg-gray-50 relative z-10 border-2 border-white shadow-sm" />
                                    <div className="absolute -bottom-2 -right-2 bg-white px-3 py-1.5 rounded-xl text-sm font-black shadow-lg flex items-center gap-1.5 z-20 border border-gray-50">
                                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                        {instructor.rating}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <div>
                                            <h3 className="text-2xl font-black text-gray-800 group-hover:text-purple-600 transition-colors">
                                                {instructor.first_name} {instructor.last_name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-green-600 font-black text-xs uppercase tracking-widest">Aktif</span>
                                            </div>
                                        </div>
                                        <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors">
                                            <MoreVertical className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <p className="text-gray-500 text-sm font-medium line-clamp-2 mb-4 leading-relaxed">
                                        {instructor.bio || "Eğitmen hakkında bilgi bulunmuyor."}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {(instructor.expertises || "").split(',').map((exp, idx) => (
                                            exp.trim() && (
                                                <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-purple-100/50">
                                                    {exp.trim()}
                                                </span>
                                            )
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-50 mt-6 pt-6 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-3 text-sm font-bold text-gray-500">
                                    <div className="p-2 bg-gray-50 rounded-lg">
                                        <Calendar className="w-4 h-4 text-purple-500" />
                                    </div>
                                    {instructor.nextLesson !== "-" ? (
                                        <span>Sonraki Ders: <span className="text-gray-900 font-black">{instructor.nextLesson}</span></span>
                                    ) : (
                                        <span className="text-gray-400 italic">Planlanmış ders yok</span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button className="p-3 bg-purple-50 text-purple-600 rounded-2xl hover:bg-purple-600 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm">
                                        <MessageSquare className="w-5 h-5" />
                                    </button>
                                    <button className="p-3 bg-gray-50 text-gray-600 rounded-2xl hover:bg-gray-900 hover:text-white transition-all transform hover:-translate-y-1 shadow-sm">
                                        <Mail className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ParentInstructors;
