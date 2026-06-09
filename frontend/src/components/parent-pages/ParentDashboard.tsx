import React, { useState, useEffect } from "react";
import { Star, TrendingUp, Calendar, CreditCard, ChevronRight, AlertCircle, CheckCircle2, Award, Mail, MessageSquare } from "lucide-react";
import api from "../../api";

interface ParentDashboardProps {
    userData: any;
    teachersData?: any[];
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ userData, teachersData }) => {
    const [instructors, setInstructors] = useState<any[]>(teachersData || []);

    useEffect(() => {
        if (teachersData) {
            setInstructors(teachersData);
        } else {
            const fetchInstructors = async () => {
                try {
                    const response = await api.get("/profile/parent/teachers");
                    setInstructors(response.data);
                } catch (error) {
                    console.error("Dashboard eğitmen yükleme hatası:", error);
                }
            };
            fetchInstructors();
        }
    }, [teachersData]);

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Welcome & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-purple-200">
                    <div className="relative z-10">
                        <h2 className="text-3xl font-black mb-2">Hoşgeldin, {userData?.first_name || 'Sayın Veli'}! 👋</h2>
                        <p className="text-purple-100 font-medium text-lg max-w-xl">
                            Çocuklarınız bu hafta harika bir ilerleme kaydetti! Tüm derslerdeki başarı ortalaması yükseliyor.
                        </p>
                    </div>
                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
                </div>

                {/* Stat Cards */}
                {[
                    { label: "Kalan Ders Kredisi", value: "4 Saat", icon: <CreditCard className="w-6 h-6 text-purple-500" />, sub: "Yenilemek için tıkla", color: "bg-purple-50" },
                    { label: "Gelecek Ders", value: "Yarın, 14:00", icon: <Calendar className="w-6 h-6 text-orange-500" />, sub: "Matematik - Ahmet Hoca", color: "bg-orange-50" },
                    { label: "Haftalık Odak", value: "8.5/10", icon: <TrendingUp className="w-6 h-6 text-green-500" />, sub: "Geçen haftaya göre +0.5", color: "bg-green-50" },
                    { label: "Son Başarı", value: "Çarpım Tablosu", icon: <Award className="w-6 h-6 text-yellow-500" />, sub: "Rozet kazanıldı 🏆", color: "bg-yellow-50" },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                        <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                            {stat.icon}
                        </div>
                        <div className="text-gray-500 text-sm font-bold mb-1">{stat.label}</div>
                        <div className="text-xl font-black text-gray-800 mb-2">{stat.value}</div>
                        <div className="text-xs font-medium text-gray-400">{stat.sub}</div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Quick Actions & Achievements */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Quick Actions / Notifications */}
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                            <h3 className="font-black text-gray-800 mb-4">Bekleyen İşlemler</h3>
                            <div className="space-y-3">
                                <button className="w-full p-4 bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-between group transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-red-600 text-sm">Ödeme Hatırlatması</div>
                                            <div className="text-xs text-red-400">Paketiniz bitmek üzere</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-red-500" />
                                </button>
                                <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-between group transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white text-gray-500 rounded-full flex items-center justify-center shadow-sm">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-bold text-gray-700 text-sm">Ders Programı</div>
                                            <div className="text-xs text-gray-400">Gelecek haftayı planla</div>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                                </button>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-200">
                            <h3 className="font-black mb-4 flex items-center gap-2">
                                <Award className="w-6 h-6 text-yellow-300" />
                                Başarı Duvarı
                            </h3>
                            <div className="space-y-4">
                                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 flex items-center gap-4">
                                    <div className="text-3xl">🏆</div>
                                    <div>
                                        <div className="font-bold text-sm">Matematik Dehası</div>
                                        <div className="text-xs text-indigo-100">10 dersi başarıyla tamamladı</div>
                                    </div>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 flex items-center gap-4">
                                    <div className="text-3xl">🚀</div>
                                    <div>
                                        <div className="font-bold text-sm">Hızlı Başlangıç</div>
                                        <div className="text-xs text-indigo-100">İlk haftada 3 ödev teslim etti</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar: Instructors & Quick Contacts */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-4">Eğitmenlerimiz</h3>
                        <div className="space-y-4">
                            {instructors.length === 0 ? (
                                <p className="text-gray-400 text-sm font-medium italic p-2">Henüz bir eğitmen bulunmuyor.</p>
                            ) : (
                                instructors.slice(0, 3).map((inst, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group">
                                        <img 
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${inst.first_name}${inst.id}`} 
                                            className="w-12 h-12 bg-gray-100 rounded-full border border-gray-100" 
                                            alt={inst.first_name}
                                        />
                                        <div className="flex-1">
                                            <div className="font-bold text-gray-800 text-sm group-hover:text-purple-600">{inst.first_name} {inst.last_name}</div>
                                            <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider line-clamp-1">{inst.expertises || "Eğitmen"}</div>
                                        </div>
                                        <button className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all">
                                            <MessageSquare className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
                        <h3 className="font-black text-blue-800 mb-2">Yardım mı lazım?</h3>
                        <p className="text-sm text-blue-600 font-medium mb-4">
                            Eğitim danışmanlarımız 7/24 yanınızda.
                        </p>
                        <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
                            Canlı Destek
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;
