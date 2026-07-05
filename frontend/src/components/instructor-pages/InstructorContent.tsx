import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Video, FileText, HelpCircle, Plus, Edit2, Trash2, GripVertical } from 'lucide-react';

const InstructorContent: React.FC = () => {
    const [expandedModules, setExpandedModules] = useState<number[]>([1]);

    const toggleModule = (id: number) => {
        if (expandedModules.includes(id)) {
            setExpandedModules(expandedModules.filter(m => m !== id));
        } else {
            setExpandedModules([...expandedModules, id]);
        }
    };

    const modules = [
        {
            id: 1,
            title: 'Bölüm 1: Giriş ve Kurulumlar',
            lessons: [
                { id: 101, title: 'Python Nedir? Neden Kullanılır?', type: 'video', duration: '12:40' },
                { id: 102, title: 'Geliştirme Ortamı Kurulumu (VS Code)', type: 'video', duration: '15:20' },
                { id: 103, title: 'İlk Kodunu Yaz', type: 'text', duration: '5:00' },
                { id: 104, title: 'Bölüm Sonu Testi', type: 'quiz', questions: 10 },
            ]
        },
        {
            id: 2,
            title: 'Bölüm 2: Değişkenler ve Veri Tipleri',
            lessons: [
                { id: 201, title: 'Değişken Mantığı', type: 'video', duration: '08:15' },
                { id: 202, title: 'String, Integer, Float', type: 'video', duration: '10:30' },
                { id: 203, title: 'Pratik Uygulama', type: 'repo', url: 'github.com/...' },
            ]
        },
        {
            id: 3,
            title: 'Bölüm 3: Döngüler (Loops)',
            lessons: []
        }
    ];

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'video': return <Video size={16} className="text-blue-500" />;
            case 'text': return <FileText size={16} className="text-green-500" />;
            case 'quiz': return <HelpCircle size={16} className="text-purple-500" />;
            default: return <FileText size={16} className="text-gray-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-black text-gray-800">İçerik Müfredatı</h2>
                    <p className="text-sm font-bold text-gray-400">Python: Temel Algoritmalar</p>
                </div>
                <button className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-sky-200 transition-transform active:scale-95">
                    <Plus size={18} strokeWidth={3} />
                    Yeni Bölüm
                </button>
            </div>

            <div className="space-y-4">
                {modules.map((module) => (
                    <div key={module.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        {/* Module Header */}
                        <div
                            className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors select-none"
                            onClick={() => toggleModule(module.id)}
                        >
                            <div className="flex items-center gap-3">
                                <GripVertical className="text-gray-300 cursor-move" size={20} />
                                <div className="p-1 bg-white rounded-lg border border-gray-200 text-gray-400">
                                    {expandedModules.includes(module.id) ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                </div>
                                <h3 className="font-bold text-gray-700">{module.title}</h3>
                                <span className="text-xs font-bold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-md">
                                    {module.lessons.length} Ders
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-2 text-gray-400 hover:text-sky-600">
                                    <Plus size={18} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-gray-600">
                                    <Edit2 size={16} />
                                </button>
                                <button className="p-2 text-gray-400 hover:text-red-500">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Module Content */}
                        {expandedModules.includes(module.id) && (
                            <div className="bg-white">
                                {module.lessons.length > 0 ? (
                                    <div className="divide-y divide-gray-100">
                                        {module.lessons.map((lesson) => (
                                            <div key={lesson.id} className="flex items-center justify-between px-6 py-3 hover:bg-sky-50 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-white">
                                                        {getTypeIcon(lesson.type)}
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-700">{lesson.title}</span>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md uppercase">
                                                        {lesson.type}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-400 w-16 text-right">
                                                        {lesson.type === 'quiz' ? `${(lesson as any).questions} Soru` : lesson.duration}
                                                    </span>
                                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="p-1 text-gray-400 hover:text-gray-600"><Edit2 size={14} /></button>
                                                        <button className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-gray-400 text-sm font-medium border-t border-gray-100">
                                        Bu bölümde henüz içerik yok.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InstructorContent;
