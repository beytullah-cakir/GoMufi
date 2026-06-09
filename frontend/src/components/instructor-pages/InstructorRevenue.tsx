import React, { useState, useEffect } from 'react';
import { TrendingUp, Download, CheckCircle, Clock } from 'lucide-react';
import api from '../../api';

interface InstructorRevenueProps {
    coursesData?: any[];
    studentsData?: any[];
}

const InstructorRevenue: React.FC<InstructorRevenueProps> = ({ coursesData, studentsData }) => {
    const [courses, setCourses] = useState<any[]>(coursesData || []);
    const [students, setStudents] = useState<any[]>(studentsData || []);
    const [isLoading, setIsLoading] = useState(!coursesData && !studentsData);

    useEffect(() => {
        if (coursesData && studentsData) {
            setCourses(coursesData);
            setStudents(studentsData);
            setIsLoading(false);
        } else {
            const fetchRevenueData = async () => {
                try {
                    const [coursesRes, studentsRes] = await Promise.all([
                        api.get('/teacher/content'),
                        api.get('/teacher/students')
                    ]);
                    setCourses(coursesRes.data);
                    setStudents(studentsRes.data);
                } catch (err) {
                    console.error("Failed to fetch revenue data:", err);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchRevenueData();
        }
    }, [coursesData, studentsData]);

    const courseMap = React.useMemo(() => {
        const map = new Map();
        courses.forEach(c => map.set(c.id, c));
        return map;
    }, [courses]);

    // Toplam gelir hesaplama: her öğrencinin kayıtlı olduğu kursun fiyatını topla.
    const totalRevenue = students.reduce((acc, student) => {
        const course = courseMap.get(student.course_id);
        const price = course?.price || 0;
        return acc + price;
    }, 0);

    const thisMonthRevenue = students.reduce((acc, student) => {
        const date = new Date(student.enrolled_at);
        const now = new Date();
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
            const course = courseMap.get(student.course_id);
            return acc + (course?.price || 0);
        }
        return acc;
    }, 0);

    const sortedTransactions = [...students].sort((a, b) => {
        return new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime();
    });

    return (
        <div className="space-y-6 animate-fade-in-down">
            <h2 className="text-xl font-black text-gray-800">Gelir ve Ödemeler</h2>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl p-6 text-white shadow-lg shadow-green-200">
                    <p className="font-bold text-green-100 mb-1">Toplam Kazanç</p>
                    <h3 className="text-3xl font-black">
                        {isLoading ? '...' : `₺${totalRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                    </h3>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="font-bold text-gray-400 text-xs uppercase mb-1">Bu Ay</p>
                    <h3 className="text-2xl font-black text-gray-800">
                        {isLoading ? '...' : `₺${thisMonthRevenue.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`}
                    </h3>
                    <div className="flex items-center gap-1 text-green-500 text-xs font-bold mt-1">
                        <TrendingUp size={14} />
                        <span>Platform Aktif</span>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-center">
                    <p className="font-bold text-gray-400 text-xs uppercase mb-1">Bekleyen Ödeme</p>
                    <h3 className="text-2xl font-black text-gray-800">
                        {isLoading ? '...' : `₺0.00`}
                    </h3>
                    <p className="text-xs font-bold text-gray-400 mt-1">Bir sonraki aktarım talebinde</p>
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
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-sm font-bold text-gray-400">Veriler Yükleniyor...</td>
                            </tr>
                        ) : sortedTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-sm font-bold text-gray-400">Henüz hiçbir kurs satışı bulunmuyor.</td>
                            </tr>
                        ) : (
                            sortedTransactions.map((tx, i) => {
                                const course = courseMap.get(tx.course_id);
                                const price = (course?.price || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 });
                                const date = new Date(tx.enrolled_at || Date.now()).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
                                
                                return (
                                <tr key={i} className="hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 text-sm font-bold text-gray-600">{date}</td>
                                    <td className="py-4 px-6 text-sm font-bold text-gray-800">
                                        <span className="block">{tx.first_name} {tx.last_name}</span>
                                        <span className="text-xs text-gray-400 font-medium">Satın Alınan: {tx.course_title}</span>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        <span className="bg-green-100 text-green-600 px-2 flex items-center justify-center gap-1 w-max mx-auto py-1 rounded-md text-xs font-bold uppercase">
                                            <CheckCircle size={12} />
                                            Onaylandı
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right text-sm font-black text-gray-800">
                                        ₺{price}
                                    </td>
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InstructorRevenue;
