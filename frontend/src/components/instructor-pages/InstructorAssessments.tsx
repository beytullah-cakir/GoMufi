import React from 'react';
import { Search, Filter, CheckCircle, Clock } from 'lucide-react';

const InstructorAssessments: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in-down">
            <h2 className="text-xl font-black text-gray-800">Değerlendirme Merkezi</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Bekleyen', value: '12', color: 'orange', icon: <Clock size={20} /> },
                    { label: 'Tamamlanan', value: '145', color: 'green', icon: <CheckCircle size={20} /> },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-xl bg-${stat.color}-50 text-${stat.color}-500`}>
                            {stat.icon}
                        </div>
                        <div>
                            <h4 className="font-black text-xl text-gray-800">{stat.value}</h4>
                            <p className="text-xs font-bold text-gray-400">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700">Son Gönderiler</h3>
                    <div className="flex gap-2">
                        <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"><Search size={18} /></button>
                        <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg"><Filter size={18} /></button>
                    </div>
                </div>
                <div className="divide-y divide-gray-100">
                    {[
                        { student: 'Mehmet K.', task: 'Python: Hesap Makinesi Projesi', time: '20dk önce', status: 'pending' },
                        { student: 'Ayşe T.', task: 'Web: Landing Page Tasarımı', time: '1 saat önce', status: 'pending' },
                        { student: 'Can B.', task: 'Veri: Pandas Alıştırması', time: '3 saat önce', status: 'graded', score: 90 },
                    ].map((item, i) => (
                        <div key={i} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-500">
                                    {item.student.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800 text-sm">{item.student}</h4>
                                    <p className="text-xs text-gray-400">{item.task}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold text-gray-400">{item.time}</span>
                                {item.status === 'pending' ? (
                                    <button className="px-4 py-1.5 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-lg shadow-sky-200 shadow-md transition-all active:scale-95">
                                        Puanla
                                    </button>
                                ) : (
                                    <div className="px-4 py-1.5 bg-green-100 text-green-600 text-xs font-bold rounded-lg">
                                        {item.score} Puan
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InstructorAssessments;
