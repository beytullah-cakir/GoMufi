import React, { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Mail, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../../api';

const InstructorStudents: React.FC = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const response = await api.get('/teacher/students');
                setStudents(response.data);
            } catch (err) {
                console.error("Failed to fetch students:", err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchStudents();
    }, []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <span className="bg-green-100 text-green-600 px-2 py-1 rounded-md text-xs font-bold">Aktif</span>;
            case 'struggling': return <span className="bg-orange-100 text-orange-600 px-2 py-1 rounded-md text-xs font-bold">Zorlanıyor</span>;
            case 'completed': return <span className="bg-blue-100 text-blue-600 px-2 py-1 rounded-md text-xs font-bold">Tamamladı</span>;
            case 'inactive': return <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-md text-xs font-bold">Pasif</span>;
            default: return null;
        }
    };

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-xl font-black text-gray-800">Öğrenci Yönetimi</h2>
                    <p className="text-sm font-bold text-gray-400">Toplam {students.length.toLocaleString()} Öğrenci</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Öğrenci ara..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                        />
                    </div>
                    <button className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
                        <Filter size={20} />
                    </button>
                    <button className="p-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 text-gray-500">
                        <Mail size={20} />
                    </button>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Öğrenci</th>
                            <th className="text-left py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Kayıtlı Kurs</th>
                            <th className="text-center py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">İlerleme</th>
                            <th className="text-center py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Durum</th>
                            <th className="text-right py-4 px-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Eylem</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-400 font-bold">Öğrenciler yükleniyor...</td>
                            </tr>
                        ) : students.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="text-center py-8 text-gray-400 font-bold">Henüz kurslarınıza kayıtlı bir öğrenci bulunmuyor.</td>
                            </tr>
                        ) : (
                            students.map((student, index) => (
                                <tr
                                    key={student.student_id ? student.student_id + '-' + index : index}
                                    className="group hover:bg-sky-50 transition-colors cursor-pointer"
                                >
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm">
                                                {student.first_name?.[0]}{student.last_name?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800 text-sm">{student.first_name} {student.last_name}</p>
                                                <p className="text-xs text-gray-400">{student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="text-sm font-semibold text-gray-600">{student.course_title}</span>
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${student.progress > 80 ? 'bg-green-500' : student.progress < 30 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${student.progress || 0}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-xs font-bold text-gray-500 w-8">{student.progress || 0}%</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6 text-center">
                                        {getStatusBadge(student.status || 'active')}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <button className="p-2 text-gray-400 hover:text-sky-600 rounded-lg transition-colors">
                                            <MoreVertical size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-500 rounded-xl"><AlertCircle size={24} /></div>
                    <div>
                        <h4 className="font-black text-gray-800 text-lg">15</h4>
                        <p className="text-xs font-bold text-gray-400">Riskli Öğrenci</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-green-50 text-green-500 rounded-xl"><CheckCircle size={24} /></div>
                    <div>
                        <h4 className="font-black text-gray-800 text-lg">892</h4>
                        <p className="text-xs font-bold text-gray-400">Kursu Tamamlayan</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-500 rounded-xl"><TrendingUp size={24} /></div>
                    <div>
                        <h4 className="font-black text-gray-800 text-lg">%86</h4>
                        <p className="text-xs font-bold text-gray-400">Ort. Memnuniyet</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstructorStudents;
