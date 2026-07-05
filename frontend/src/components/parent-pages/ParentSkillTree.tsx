import React from 'react';
import { Trophy, Star, Lock, CheckCircle2, ChevronRight, Brain, Zap, Target } from 'lucide-react';

const ParentSkillTree: React.FC = () => {
    const skills = {
        math: [
            { id: 1, name: "Saydılar ve İşlemler", status: "completed", score: 100 },
            { id: 2, name: "Çarpım Tablosu", status: "completed", score: 95 },
            { id: 3, name: "Bölme İşlemi", status: "in_progress", score: 60 },
            { id: 4, name: "Kesirler", status: "locked", score: 0 },
            { id: 5, name: "Problemler", status: "locked", score: 0 },
        ],
        logic: [
            { id: 6, name: "Örüntüler", status: "completed", score: 90 },
            { id: 7, name: "Şekil İlişkileri", status: "in_progress", score: 45 },
            { id: 8, name: "Mantık Yürütme", status: "locked", score: 0 },
        ]
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-500 text-white shadow-green-200 border-green-400';
            case 'in_progress': return 'bg-yellow-500 text-white shadow-yellow-200 border-yellow-400';
            default: return 'bg-gray-100 text-gray-400 border-gray-200 shadow-none'; // locked
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-6 h-6" />;
            case 'in_progress': return <Zap className="w-6 h-6 animate-pulse" />;
            default: return <Lock className="w-5 h-5" />;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2 flex items-center gap-3">
                        <Brain className="w-8 h-8 text-purple-600" />
                        Gelişim Ağacı
                    </h2>
                    <p className="text-gray-500 font-medium max-w-xl">
                        Çocuğunuzun öğrenme yolculuğu burada. Becerilerini bir ağaç gibi daldan dala büyütüyor.
                    </p>
                </div>
                <div className="flex gap-4">
                    <div className="text-center px-6 py-3 bg-green-50 rounded-2xl border border-green-100">
                        <div className="text-2xl font-black text-green-600">12</div>
                        <div className="text-xs font-bold text-green-400 uppercase tracking-wider">Tamamlanan</div>
                    </div>
                    <div className="text-center px-6 py-3 bg-yellow-50 rounded-2xl border border-yellow-100">
                        <div className="text-2xl font-black text-yellow-600">2</div>
                        <div className="text-xs font-bold text-yellow-400 uppercase tracking-wider">Devam Eden</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Math Tree */}
                <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl -mr-10 -mt-10"></div>

                    <h3 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-2 relative z-10">
                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                            <Target className="w-5 h-5" />
                        </div>
                        Matematik Becerileri
                    </h3>

                    <div className="relative">
                        {/* Vertical Line */}
                        <div className="absolute left-8 top-4 bottom-4 w-1 bg-gray-100 rounded-full"></div>

                        <div className="space-y-8 relative z-10">
                            {skills.math.map((skill) => (
                                <div key={skill.id} className="flex items-center gap-6 group">
                                    {/* Node */}
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-4 shadow-lg transition-transform hover:scale-110 z-10 ${getStatusColor(skill.status)}`}>
                                        {getStatusIcon(skill.status)}
                                    </div>

                                    {/* Card */}
                                    <div className={`flex-1 p-4 rounded-2xl border-2 transition-all ${skill.status === 'locked' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 hover:border-purple-200 hover:shadow-md'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-800">{skill.name}</h4>
                                            {skill.status !== 'locked' && (
                                                <span className={`text-xs font-bold px-2 py-1 rounded-lg ${skill.score >= 90 ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                                                    {skill.score}%
                                                </span>
                                            )}
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-1000 ${skill.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}
                                                style={{ width: `${skill.score}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Analysis / Feedback */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-8 rounded-[2rem] shadow-xl shadow-purple-200">
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2">
                            <Zap className="w-6 h-6 text-yellow-300" />
                            Yapay Zeka Analizi
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                <p className="font-medium text-purple-50 leading-relaxed italic">
                                    "Çocuğunuz görsel hafızayı kullanan problemlerde çok daha başarılı. Geometri konularına geçiş yaptığımızda performansının artacağını öngörüyoruz."
                                </p>
                                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-purple-200 uppercase tracking-wide">
                                    <Brain className="w-4 h-4" /> AI Pedagog Görüşü
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h3 className="text-xl font-black text-gray-800 mb-6">Önerilen Aksiyonlar</h3>
                        <div className="space-y-3">
                            <button className="w-full text-left p-4 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-100 transition-colors group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-orange-700">Mantık Egzersizleri Yap</span>
                                    <ChevronRight className="w-5 h-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <p className="text-xs text-orange-600 font-medium">Mantık yürütme becerisini geliştirmek için 10dk pratik.</p>
                            </button>
                            <button className="w-full text-left p-4 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-100 transition-colors group">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-blue-700">Geometri Seti İncele</span>
                                    <ChevronRight className="w-5 h-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
                                </div>
                                <p className="text-xs text-blue-600 font-medium">Görsel zekayı destekleyen materyaller.</p>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ParentSkillTree;
