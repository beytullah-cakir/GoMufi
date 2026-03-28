import React from 'react';
import { Search, Filter, MoreVertical, Mail, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

const InstructorStudents: React.FC = () => {
    // const [selectedStudent, setSelectedStudent] = useState<number | null>(null);

    const students = [
        { id: 1, name: 'Ali Yılmaz', email: 'ali@example.com', progress: 85, lastLogin: '2 saat önce', status: 'active', course: 'Python: Temel Algoritmalar', performance: 'high' },
        { id: 2, name: 'Ayşe Demir', email: 'ayse@example.com', progress: 15, lastLogin: '5 gün önce', status: 'struggling', course: 'Web Geliştirme 101', performance: 'low' },
        { id: 3, name: 'Mehmet Kaya', email: 'mehmet@example.com', progress: 45, lastLogin: '1 gün önce', status: 'active', course: 'Python: Temel Algoritmalar', performance: 'average' },
        { id: 4, name: 'Zeynep Çelik', email: 'zeynep@example.com', progress: 98, lastLogin: '10dk önce', status: 'completed', course: 'Oyun Tasarımı', performance: 'high' },
        { id: 5, name: 'Canberk Öz', email: 'canberk@example.com', progress: 0, lastLogin: '1 ay önce', status: 'inactive', course: 'Web Geliştirme 101', performance: 'inactive' },
    ];

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
                    <p className="text-sm font-bold text-gray-400">Toplam 1,234 Öğrenci</p>
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
                        {students.map((student) => (
                            <tr
                                key={student.id}
                                className="group hover:bg-sky-50 transition-colors cursor-pointer"
                            // onClick={() => setSelectedStudent(student.id)}
                            >
                                <td className="py-4 px-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-sm">
                                            {student.name.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-800 text-sm">{student.name}</p>
                                            <p className="text-xs text-gray-400">{student.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4 px-6">
                                    <span className="text-sm font-semibold text-gray-600">{student.course}</span>
                                </td>
                                <td className="py-4 px-6">
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${student.progress > 80 ? 'bg-green-500' : student.progress < 30 ? 'bg-red-500' : 'bg-blue-500'}`}
                                                style={{ width: `${student.progress}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-bold text-gray-500 w-8">{student.progress}%</span>
                                    </div>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    {getStatusBadge(student.status)}
                                </td>
                                <td className="py-4 px-6 text-right">
                                    <button className="p-2 text-gray-400 hover:text-sky-600 rounded-lg transition-colors">
                                        <MoreVertical size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
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
