import React from 'react';
import { TrendingUp, Download } from 'lucide-react';

const InstructorRevenue: React.FC = () => {
    return (
        <div className="space-y-6 animate-fade-in-down">
            <h2 className="text-xl font-black text-gray-800">Gelir ve Ödemeler</h2>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-green-200">
                    <p className="font-bold text-green-100 mb-1">Toplam Kazanç</p>
                    <h3 className="text-3xl font-black">₺12,450.00</h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="font-bold text-gray-400 text-xs uppercase mb-1">Bu Ay</p>
                    <h3 className="text-2xl font-black text-gray-800">₺2,150.00</h3>
                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-1">
                        <TrendingUp size={14} />
                        <span>%12 Artış</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="font-bold text-gray-400 text-xs uppercase mb-1">Gelecek Ödeme</p>
                    <h3 className="text-2xl font-black text-gray-800">₺3,240.00</h3>
                    <p className="text-xs font-bold text-gray-400 mt-1">15 Şubat 2026</p>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Ödeme Geçmişi</h3>
                    <button className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-bold text-sm">
                        <Download size={16} />
                        Rapor İndir
                    </button>
                </div>
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase">Tarih</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase">Açıklama</th>
                            <th className="text-center py-4 px-6 text-xs font-bold text-gray-400 uppercase">Durum</th>
                            <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase">Tutar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {[
                            { date: '15 Oca 2026', desc: 'Aylık Ödeme Transferi', status: 'completed', amount: '₺1,850.00' },
                            { date: '15 Ara 2025', desc: 'Aylık Ödeme Transferi', status: 'completed', amount: '₺2,100.00' },
                            { date: '15 Kas 2025', desc: 'Aylık Ödeme Transferi', status: 'completed', amount: '₺1,650.00' },
                        ].map((t, i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="py-4 px-6 text-sm font-bold text-gray-600">{t.date}</td>
                                <td className="py-4 px-6 text-sm font-bold text-gray-800">{t.desc}</td>
                                <td className="py-4 px-6 text-center">
                                    <span className="bg-green-100 text-green-600 px-2 py-1 rounded-md text-xs font-bold uppercase">Tamamlandı</span>
                                </td>
                                <td className="py-4 px-6 text-right text-sm font-black text-gray-800">{t.amount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InstructorRevenue;
