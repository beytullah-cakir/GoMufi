import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';

const InstructorCalendar: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in-down">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-800">Takvim & Planlama</h2>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white rounded-xl border border-gray-200 p-1">
                        <button className="p-1 hover:bg-gray-50 rounded-lg"><ChevronLeft size={20} className="text-gray-400" /></button>
                        <span className="px-4 font-bold text-gray-700 text-sm">Oca 2026</span>
                        <button className="p-1 hover:bg-gray-50 rounded-lg"><ChevronRight size={20} className="text-gray-400" /></button>
                    </div>
                    <button className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-sky-200 transition-transform active:scale-95">
                        <Plus size={18} strokeWidth={3} />
                        Etkinlik Ekle
                    </button>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 overflow-hidden">
                <div className="grid grid-cols-7 text-center mb-4">
                    {['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(day => (
                        <div key={day} className="text-xs font-bold text-gray-400 uppercase">{day}</div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className={`h-32 border border-gray-100 rounded-2xl p-2 relative hover:bg-gray-50 transition-colors ${i === 8 ? 'bg-sky-50/50' : ''}`}>
                            <span className={`text-sm font-bold ${i === 8 ? 'text-sky-600' : 'text-gray-700'}`}>{i + 1 > 31 ? i + 1 - 31 : i + 1}</span>
                            {i === 8 && (
                                <div className="mt-2 bg-sky-100 text-sky-600 p-2 rounded-xl text-[10px] font-bold border-l-4 border-sky-500">
                                    Canlı Ders: Python
                                    <div className="opacity-75">14:00</div>
                                </div>
                            )}
                            {i === 12 && (
                                <div className="mt-2 bg-purple-100 text-purple-600 p-2 rounded-xl text-[10px] font-bold border-l-4 border-purple-500">
                                    Ödev Teslim
                                    <div className="opacity-75">23:59</div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default InstructorCalendar;
