import React, { useState } from 'react';
import { Search, Filter, MoreVertical, Plus, Users, Star } from 'lucide-react';
import AddCourseModal from './AddCourseModal';

interface Course {
    id: number;
    title: string;
    students: number;
    rating: number;
    progress: number;
    status: string;
    color: string;
    lastUpdated: string;
}

const InstructorCourses: React.FC = () => {
    const [filter, setFilter] = useState('active');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    // Track which dropdown menu is open
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    const [courses, setCourses] = useState<Course[]>([
        { id: 1, title: 'Python: Temel Algoritmalar', students: 450, rating: 4.8, progress: 75, status: 'active', color: 'blue', lastUpdated: '2 gün önce' },
        { id: 2, title: 'Web Geliştirme 101', students: 320, rating: 4.5, progress: 45, status: 'active', color: 'purple', lastUpdated: '5 gün önce' },
        { id: 3, title: 'Oyun Tasarımı', students: 210, rating: 4.9, progress: 90, status: 'active', color: 'orange', lastUpdated: '1 hafta önce' },
        { id: 4, title: 'Veri Bilimine Giriş', students: 0, rating: 0, progress: 0, status: 'draft', color: 'gray', lastUpdated: '1 ay önce' },
        { id: 5, title: 'Eski: Java 101', students: 120, rating: 4.2, progress: 100, status: 'archived', color: 'red', lastUpdated: '1 yıl önce' },
    ]);

    const handleSaveCourse = (courseData: { title: string; category: string; color: string }) => {
        if (editingCourse) {
            // Update existing course
            setCourses(courses.map(c => c.id === editingCourse.id ? {
                ...c,
                title: courseData.title,
                color: courseData.color,
                lastUpdated: 'Şimdi'
            } : c));
            setEditingCourse(null);
        } else {
            // Add new course
            const newCourse: Course = {
                id: Math.max(...courses.map(c => c.id), 0) + 1,
                title: courseData.title,
                students: 0,
                rating: 0,
                progress: 0,
                status: 'draft',
                color: courseData.color,
                lastUpdated: 'Şimdi'
            };
            setCourses([newCourse, ...courses]);
        }
        setIsAddModalOpen(false);
    };

    const handleDeleteCourse = (id: number) => {
        if (window.confirm('Bu kursu silmek istediğine emin misin?')) {
            setCourses(courses.filter(c => c.id !== id));
        }
        setOpenMenuId(null);
    };

    const handleEditClick = (course: Course) => {
        setEditingCourse(course);
        setIsAddModalOpen(true);
        setOpenMenuId(null);
    };

    const openAddModal = () => {
        setEditingCourse(null);
        setIsAddModalOpen(true);
    };

    const filteredCourses = courses.filter(c => {
        if (filter === 'all') return true;
        return c.status === filter;
    });

    return (
        <div className="space-y-6 animate-fade-in-down">
            {/* Header / Toolbar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex bg-gray-100 p-1 rounded-xl">
                    <button
                        onClick={() => setFilter('active')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'active' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Aktif
                    </button>
                    <button
                        onClick={() => setFilter('draft')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'draft' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Taslak
                    </button>
                    <button
                        onClick={() => setFilter('archived')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filter === 'archived' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Arşiv
                    </button>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Kurslarda ara..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                        />
                    </div>
                    <button
                        onClick={openAddModal}
                        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-bold text-sm shadow-lg shadow-sky-200 transition-all active:scale-95"
                    >
                        <Plus size={18} strokeWidth={3} />
                        <span className="hidden sm:inline">Yeni Kurs</span>
                    </button>
                </div>
            </div>

            {/* Courses List */}
            <div className="grid grid-cols-1 gap-4">
                {filteredCourses.map((course) => (
                    <div key={course.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex flex-col md:flex-row items-center gap-6">
                            {/* Icon / Thumbnail */}
                            <div className={`w-16 h-16 rounded-2xl bg-${course.color}-100 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-105 transition-transform text-${course.color}-600`}>
                                {course.id === 1 ? '🐍' : course.id === 2 ? '🌐' : course.id === 3 ? '🎮' : '📘'}
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-lg font-black text-gray-800 group-hover:text-sky-600 transition-colors">{course.title}</h3>
                                <p className="text-xs font-bold text-gray-400 mt-1">Son güncelleme: {course.lastUpdated}</p>
                            </div>

                            {/* Metrics */}
                            <div className="flex items-center gap-8 w-full md:w-auto justify-center md:justify-end">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-gray-500 font-bold mb-1">
                                        <Users size={16} />
                                        <span>{course.students}</span>
                                    </div>
                                    <p className="text-[10px] uppercase font-black text-gray-300">Öğrenci</p>
                                </div>

                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-gray-500 font-bold mb-1">
                                        <Star size={16} className="text-yellow-400 fill-current" />
                                        <span>{course.rating > 0 ? course.rating : '-'}</span>
                                    </div>
                                    <p className="text-[10px] uppercase font-black text-gray-300">Puan</p>
                                </div>

                                <div className="text-center w-24 hidden sm:block">
                                    <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
                                        <span>İlerleme</span>
                                        <span>{course.progress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className={`h-full bg-${course.color}-500 rounded-full`} style={{ width: `${course.progress}%` }}></div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0 w-full md:w-auto justify-end relative">
                                <button
                                    onClick={() => handleEditClick(course)}
                                    className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-xl font-bold text-sm transition-colors"
                                >
                                    Düzenle
                                </button>
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === course.id ? null : course.id)}
                                        className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                                    >
                                        <MoreVertical size={20} />
                                    </button>

                                    {openMenuId === course.id && (
                                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden animate-fade-in">
                                            <button
                                                onClick={() => handleDeleteCourse(course.id)}
                                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 font-bold transition-colors"
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filteredCourses.length === 0 && (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                        <Filter size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-400">Bu filtrede kurs bulunamadı.</h3>
                </div>
            )}

            <AddCourseModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleSaveCourse}
                initialData={editingCourse ? {
                    title: editingCourse.title,
                    category: editingCourse.color === 'blue' ? 'coding' : editingCourse.color === 'purple' ? 'web' : editingCourse.color === 'orange' ? 'design' : 'other',
                    color: editingCourse.color
                } : null}
            />
        </div>
    );
};

export default InstructorCourses;
