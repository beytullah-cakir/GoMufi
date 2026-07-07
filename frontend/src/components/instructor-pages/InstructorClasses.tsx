import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Users, UserPlus, X, Edit3, Check, Copy } from 'lucide-react';
import api from '../../api';

interface Student {
    id: number | string;
    first_name: string;
    last_name: string;
    email: string;
}

interface ClassModel {
    id: string;
    name: string;
    schedule: { day: string; time: string }[];
    student_ids?: (number | string)[];
    code?: string;
}

interface Course {
    id: number | string;
    title: string;
    category?: string;
    classes?: ClassModel[];
    schedule?: { day: string; time: string }[];
}

const dayNames = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];

const InstructorClasses: React.FC = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<number | string | null>(null);
    const [courseStudents, setCourseStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingClassId, setEditingClassId] = useState<string | null>(null);
    const [editClassNameVal, setEditClassNameVal] = useState("");

    // Fetch Courses
    const fetchCoursesAndData = async () => {
        setIsLoading(true);
        try {
            const coursesRes = await api.get("/teacher/content");
            const updatedCourses = coursesRes.data.map((course: Course) => {
                if (course.classes && course.classes.length > 0) {
                    let hasMissingCode = false;
                    const classesWithCodes = course.classes.map(cls => {
                        if (!cls.code) {
                            hasMissingCode = true;
                            return { ...cls, code: Math.random().toString(36).substring(2, 8).toUpperCase() };
                        }
                        return cls;
                    });
                    if (hasMissingCode) {
                        api.put(`/update_course/${course.id}`, { classes: classesWithCodes }).catch(console.error);
                        return { ...course, classes: classesWithCodes };
                    }
                }
                return course;
            });
            setCourses(updatedCourses);
            if (updatedCourses.length > 0 && !selectedCourseId) {
                setSelectedCourseId(updatedCourses[0].id);
            }
        } catch (err) {
            console.error("Failed to load courses", err);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch Students enrolled in the selected course
    const fetchCourseStudents = async (courseTitle: string) => {
        try {
            const res = await api.get("/teacher/students");
            const students = res.data
                .filter((row: any) => row.course_title === courseTitle)
                .map((row: any) => ({
                    id: row.student_id,
                    first_name: row.first_name,
                    last_name: row.last_name,
                    email: row.email
                }));
            setCourseStudents(students);
        } catch (err) {
            console.error("Failed to load students", err);
        }
    };

    useEffect(() => {
        fetchCoursesAndData();
    }, []);

    useEffect(() => {
        const actCourse = courses.find(c => c.id === selectedCourseId);
        if (actCourse) {
            fetchCourseStudents(actCourse.title);
        }
    }, [selectedCourseId, courses]);

    const activeCourse = courses.find(c => c.id === selectedCourseId);
    const activeClasses = activeCourse?.classes || [];

    const handleUpdateClasses = async (updatedClasses: ClassModel[]) => {
        if (!selectedCourseId || !activeCourse) return;
        
        try {
            const payload = {
                classes: updatedClasses,
                schedule: updatedClasses.flatMap(c => c.schedule || [])
            };
            
            await api.put(`/update_course/${selectedCourseId}`, payload);
            
            setCourses(prev => prev.map(c => c.id === selectedCourseId ? { ...c, ...payload } : c));
        } catch (err) {
            console.error("Failed to update classes", err);
            alert("Sınıflar kaydedilirken bir hata oluştu.");
        }
    };

    const handleAddClass = () => {
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const nextLetter = alphabet[activeClasses.length] || String(activeClasses.length + 1);
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const newClass: ClassModel = {
            id: `c_${Date.now()}`,
            name: `${nextLetter} Sınıfı`,
            schedule: [],
            student_ids: [],
            code: code
        };
        handleUpdateClasses([...activeClasses, newClass]);
    };

    const handleDeleteClass = (classId: string) => {
        if (confirm("Bu sınıfı silmek istediğinize emin misiniz?")) {
            handleUpdateClasses(activeClasses.filter(c => c.id !== classId));
        }
    };

    const handleStartEdit = (cls: ClassModel) => {
        setEditingClassId(cls.id);
        setEditClassNameVal(cls.name);
    };

    const handleSaveName = (classId: string) => {
        if (!editClassNameVal.trim()) return;
        const updated = activeClasses.map(c => c.id === classId ? { ...c, name: editClassNameVal.trim() } : c);
        handleUpdateClasses(updated);
        setEditingClassId(null);
    };

    const handleAddSchedule = (classId: string, day: string, time: string) => {
        const updated = activeClasses.map(c => {
            if (c.id === classId) {
                const schedule = c.schedule || [];
                return { ...c, schedule: [...schedule, { day, time }] };
            }
            return c;
        });
        handleUpdateClasses(updated);
    };

    const handleRemoveSchedule = (classId: string, sIdx: number) => {
        const updated = activeClasses.map(c => {
            if (c.id === classId) {
                return { ...c, schedule: c.schedule.filter((_, idx) => idx !== sIdx) };
            }
            return c;
        });
        handleUpdateClasses(updated);
    };

    const handleAssignStudent = (classId: string, studentId: number | string) => {
        const updated = activeClasses.map(c => {
            if (c.id === classId) {
                const studentIds = c.student_ids || [];
                if (studentIds.includes(studentId)) return c;
                return { ...c, student_ids: [...studentIds, studentId] };
            }
            const studentIds = c.student_ids || [];
            if (studentIds.includes(studentId)) {
                return { ...c, student_ids: studentIds.filter(id => id !== studentId) };
            }
            return c;
        });
        handleUpdateClasses(updated);
    };

    const handleUnassignStudent = (classId: string, studentId: number | string) => {
        const updated = activeClasses.map(c => {
            if (c.id === classId) {
                const studentIds = c.student_ids || [];
                return { ...c, student_ids: studentIds.filter(id => id !== studentId) };
            }
            return c;
        });
        handleUpdateClasses(updated);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin mb-3"></div>
                <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Sınıflar Yükleniyor...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in-down">
            <div>
                <h2 className="text-2xl font-black text-gray-800 font-display">Sınıflarım</h2>
                <p className="text-gray-400 font-bold text-xs mt-1">Kurslarınıza sınıf açın, program planlayın ve öğrenci atayın.</p>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Course List Sidebar */}
                <div className="col-span-12 lg:col-span-4 space-y-4">
                    <h3 className="font-black text-gray-750 text-sm">Aktif Kurslarım</h3>
                    <div className="space-y-3">
                        {courses.map(course => {
                            const isSelected = selectedCourseId === course.id;
                            const classCount = course.classes?.length || 0;
                            return (
                                <div
                                    key={course.id}
                                    onClick={() => setSelectedCourseId(course.id)}
                                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                                        isSelected 
                                            ? 'bg-white border-sky-500 border-b-4 shadow-md -translate-y-0.5' 
                                            : 'bg-white border-gray-100 border-b-4 hover:border-sky-300 hover:shadow-sm hover:-translate-y-0.5'
                                    }`}
                                >
                                    <h4 className="font-black text-xs text-gray-800 truncate mb-1">{course.title}</h4>
                                    <span className="text-[10px] font-black text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md w-fit border border-sky-100/50">
                                        {classCount} Sınıf Aktif
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Main Classes Manager */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    {activeCourse ? (
                        <>
                            <div className="flex items-center justify-between">
                                <h3 className="font-black text-gray-750 text-sm">{activeCourse.title} Sınıfları</h3>
                                <button
                                    onClick={handleAddClass}
                                    className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    <Plus size={14} />
                                    Yeni Sınıf Ekle
                                </button>
                            </div>

                            <div className="space-y-6">
                                {activeClasses.map((cls, cIdx) => {
                                    const assignedStudents = courseStudents.filter(s => cls.student_ids?.includes(s.id));
                                    const unassignedStudents = courseStudents.filter(s => {
                                        return !activeClasses.some(c => c.student_ids?.includes(s.id));
                                    });

                                    return (
                                        <div key={cls.id} className="bg-white border-2 border-gray-100 p-6 rounded-2xl shadow-sm relative space-y-5">
                                            <button
                                                onClick={() => handleDeleteClass(cls.id)}
                                                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                                                title="Sınıfı Sil"
                                            >
                                                <Trash2 size={16} />
                                            </button>

                                            <div className="flex items-center gap-3 max-w-md">
                                                {editingClassId === cls.id ? (
                                                    <div className="flex items-center gap-2 w-full">
                                                        <input
                                                            type="text"
                                                            value={editClassNameVal}
                                                            onChange={(e) => setEditClassNameVal(e.target.value)}
                                                            className="px-3 py-1.5 border border-gray-300 rounded-xl font-bold text-sm text-gray-800 focus:outline-none focus:border-sky-500 w-full"
                                                            autoFocus
                                                        />
                                                        <button 
                                                            onClick={() => handleSaveName(cls.id)}
                                                            className="p-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600"
                                                        >
                                                            <Check size={14} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-wrap items-center gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <h4 className="text-base font-black text-gray-800">{cls.name}</h4>
                                                            <button 
                                                                onClick={() => handleStartEdit(cls)}
                                                                className="p-1 text-gray-400 hover:text-sky-500 rounded-md hover:bg-gray-50"
                                                                title="İsmi Düzenle"
                                                            >
                                                                <Edit3 size={14} />
                                                            </button>
                                                        </div>
                                                        {/* Invitation Code Display */}
                                                        <div className="flex items-center gap-2 bg-sky-50 border border-sky-100 px-3 py-1 rounded-xl text-xs font-bold text-sky-700">
                                                            <span>Kod: <span className="font-mono text-sm tracking-wider select-all">{cls.code || "KOD_YOK"}</span></span>
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(cls.code || "");
                                                                    alert("Sınıf katılım kodu panoya kopyalandı!");
                                                                }}
                                                                className="hover:text-sky-900 transition-colors p-1"
                                                                title="Kodu Kopyala"
                                                            >
                                                                <Copy size={12} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-2">
                                                <h5 className="text-xs font-black text-gray-400 uppercase tracking-wider">Haftalık Canlı Ders Saatleri</h5>
                                                <div className="flex flex-wrap gap-2">
                                                    {cls.schedule?.map((slot, sIdx) => (
                                                        <div key={sIdx} className="flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-100 rounded-xl text-xs font-bold text-sky-700">
                                                            <Clock size={12} />
                                                            <span>{slot.day} - {slot.time}</span>
                                                            <button
                                                                onClick={() => handleRemoveSchedule(cls.id, sIdx)}
                                                                className="text-sky-400 hover:text-sky-700 font-bold ml-1"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {(!cls.schedule || cls.schedule.length === 0) && (
                                                        <span className="text-xs text-gray-400 font-bold italic">Ders saati planlanmamış</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-105 w-fit mt-2">
                                                    <select
                                                        id={`day-add-${cls.id}`}
                                                        className="bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg p-2 focus:outline-none"
                                                    >
                                                        {dayNames.map(d => (
                                                            <option key={d} value={d}>{d}</option>
                                                        ))}
                                                    </select>
                                                    <input
                                                        type="time"
                                                        id={`time-add-${cls.id}`}
                                                        defaultValue="14:00"
                                                        className="bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-lg p-1.5 focus:outline-none"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const dSel = document.getElementById(`day-add-${cls.id}`) as HTMLSelectElement;
                                                            const tSel = document.getElementById(`time-add-${cls.id}`) as HTMLInputElement;
                                                            if (dSel && tSel && tSel.value) {
                                                                handleAddSchedule(cls.id, dSel.value, tSel.value);
                                                            }
                                                        }}
                                                        className="px-3.5 py-2 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-lg transition-all"
                                                    >
                                                        Ekle
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-3 pt-3 border-t border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="text-xs font-black text-gray-450 uppercase tracking-wider flex items-center gap-2">
                                                        <Users size={14} />
                                                        Sınıf Öğrencileri ({assignedStudents.length})
                                                    </h5>

                                                    {unassignedStudents.length > 0 && (
                                                        <div className="relative group/assign">
                                                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-600 hover:bg-sky-50 hover:text-sky-600 hover:border-sky-200 rounded-xl font-bold text-[10px] uppercase tracking-wider transition-colors cursor-pointer">
                                                                <UserPlus size={12} />
                                                                Öğrenci Ata
                                                            </button>
                                                            <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-100 shadow-xl rounded-2xl p-2 w-56 hidden group-hover/assign:block z-20 animate-in fade-in duration-100">
                                                                <span className="block text-[9px] font-black text-gray-400 uppercase tracking-wider px-2 py-1">Atanmamış Öğrenciler</span>
                                                                {unassignedStudents.map(student => (
                                                                    <button
                                                                        key={student.id}
                                                                        onClick={() => handleAssignStudent(cls.id, student.id)}
                                                                        className="w-full text-left px-2 py-1.5 text-xs font-bold text-gray-700 hover:bg-sky-50 hover:text-sky-600 rounded-lg truncate"
                                                                    >
                                                                        {student.first_name} {student.last_name}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {assignedStudents.map(student => (
                                                        <div key={student.id} className="flex items-center justify-between p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                                                            <div className="min-w-0">
                                                                <p className="text-xs font-black text-gray-800 truncate">{student.first_name} {student.last_name}</p>
                                                                <p className="text-[9px] font-bold text-gray-400 truncate">{student.email}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleUnassignStudent(cls.id, student.id)}
                                                                className="text-gray-400 hover:text-red-500 font-bold text-xs p-1"
                                                                title="Sınıftan Çıkar"
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {assignedStudents.length === 0 && (
                                                        <p className="text-xs text-gray-400 font-bold italic col-span-2">Bu sınıfa atanmış öğrenci yok.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {activeClasses.length === 0 && (
                                    <div className="text-center py-16 bg-white border-2 border-dashed border-gray-250 rounded-2xl p-6">
                                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <p className="text-sm font-bold text-gray-500 mb-4">Bu kursta henüz bir sınıf oluşturulmamış.</p>
                                        <button
                                            onClick={handleAddClass}
                                            className="bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-transform active:scale-95"
                                        >
                                            İlk Sınıfı Oluştur
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-20 bg-white border-2 border-dashed border-gray-250 rounded-2xl p-6">
                            <p className="text-sm font-bold text-gray-400">Yönetmek istediğiniz kursu soldaki listeden seçin.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstructorClasses;
