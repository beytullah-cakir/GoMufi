import React, { useState, useEffect } from "react";
import {
  Search,
  Filter,
  MoreVertical,
  Plus,
  Users,
  Star,
  Info,
  Layout,
  Loader2,
  Video,
  Play,
  Square,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddCourseModal from "./AddCourseModal";
import api from "../../api";
import CourseInfoModal from "../shared/CourseInfoModal";

interface Course {
  id: number;
  title: string;
  description: string;
  price: number;
  students: number;
  rating: number;
  progress: number;
  status: string;
  color: string;
  lastUpdated: string;
  learning_outcomes?: string[];
  requirements?: string[];
  curriculum?: any[];
  isLive?: boolean;
  liveSessions?: { date: string; time: string }[];
  schedule?: { day: string; time: string }[];
  instructor?: string;
}

interface InstructorCoursesProps {
    coursesData?: any[];
    refreshData?: () => void;
}

const InstructorCourses: React.FC<InstructorCoursesProps> = ({ coursesData, refreshData }) => {
  const [filter, setFilter] = useState("active");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [infoCourseId, setInfoCourseId] = useState<number | string | null>(
    null,
  );
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadingContentId, setLoadingContentId] = useState<
    number | string | null
  >(null);
  const [liveSessionCourseIds, setLiveSessionCourseIds] = useState<Set<number>>(new Set());
  const [startingSessionId, setStartingSessionId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    const mapCourses = (data: any[]) => {
      return data.map((c: any) => {
        let isLive = c.is_live || false;
        let liveSessions = c.live_sessions || [];
        let rawCurriculum = c.curriculum || [];
        let notes = c.notes || [];
        let finalCurriculum = Array.isArray(rawCurriculum) ? rawCurriculum : (rawCurriculum ? [rawCurriculum] : []);

        if (
          finalCurriculum.length > 0 &&
          finalCurriculum[0]?.type === "live_sessions_config"
        ) {
          isLive = finalCurriculum[0].is_live;
          liveSessions = finalCurriculum[0].sessions || [];
        }

        return {
          id: c.id,
          title: c.title,
          description: c.description || "",
          price: c.price || 0,
          students: c.students_count || 0,
          rating: c.rating || 5,
          progress: c.progress !== undefined ? c.progress : 100,
          status: c.status || "active",
          learning_outcomes: c.learning_outcomes || [],
          requirements: c.requirements || [],
          curriculum: finalCurriculum,
          color:
            c.category === "coding"
              ? "blue"
              : c.category === "web"
                ? "purple"
                : c.category === "design"
                  ? "orange"
                  : "gray",
          lastUpdated: "Yakın zamanda",
          isLive: isLive,
          liveSessions: liveSessions,
          schedule: c.schedule || [],
          notes: notes,
          instructor: c.teacher
            ? `${c.teacher.first_name} ${c.teacher.last_name}`
            : "Mufi Eğitmen",
        };
      });
    };

    if (coursesData) {
      setCourses(mapCourses(coursesData));
      setIsLoading(false);
    } else {
      const fetchCourses = async () => {
        try {
          const response = await api.get("/teacher/content");
          console.log("DEBUG: Fetch Courses Response:", response.data);
          if (isMounted) {
            setCourses(mapCourses(response.data));
          }
        } catch (error) {
          console.error("Error fetching courses", error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };
      fetchCourses();
    }

    // Fetch live session statuses for all courses
    const fetchLiveStatuses = async (courseList: any[]) => {
      try {
        const statuses = await Promise.all(
          courseList.map((c: any) => api.get(`/session-status/${c.id || c.id}`).catch(() => ({ data: { is_live: false } })))
        );
        const liveIds = new Set<number>();
        courseList.forEach((c: any, i: number) => {
          if (statuses[i]?.data?.is_live) liveIds.add(c.id);
        });
        if (isMounted) setLiveSessionCourseIds(liveIds);
      } catch (err) {
        console.error('Live status fetch error:', err);
      }
    };

    if (coursesData) {
      fetchLiveStatuses(coursesData);
    } else {
      // Will be called after courses are fetched inside the else block above
    }
    
    return () => {
      isMounted = false;
    };
  }, [coursesData]);

  const handleSaveCourse = async (courseData: any) => {
    setIsSubmitting(true);
    try {
      let savedCourseId: number;
      if (editingCourse) {
        // Update existing course via API
        // Construct curriculum payload carefully
        // Müfredat artık notlardan bağımsız, sadece müfredat ve canlı ders ayarlarını gönderiyoruz
        const curriculumPayload = [
          {
            type: "live_sessions_config",
            is_live: courseData.isLive,
            sessions: courseData.liveSessions,
          },
          ...(Array.isArray(courseData.curriculum) ? courseData.curriculum : []),
        ];

        await api.put(`/update_course/${editingCourse.id}`, {
          title: courseData.title,
          description: courseData.description,
          category: courseData.category,
          price: courseData.price,
          learning_outcomes: courseData.learningOutcomes,
          requirements: courseData.requirements,
          curriculum: curriculumPayload,
          schedule: courseData.schedule,
        });

        setCourses(
          courses.map((c) =>
            c.id === editingCourse.id
              ? {
                  ...c,
                  title: courseData.title,
                  description: courseData.description,
                  price: courseData.price,
                  learning_outcomes: courseData.learningOutcomes,
                  requirements: courseData.requirements,
                  curriculum: courseData.curriculum,
                  color: courseData.color,
                  lastUpdated: "Şimdi",
                  isLive: courseData.isLive,
                  liveSessions: courseData.liveSessions,
                  schedule: courseData.schedule,
                }
              : c,
          ),
        );
        savedCourseId = editingCourse.id;
        setEditingCourse(null);
      } else {
        // Add new course via API
        // Construct curriculum payload for new course
        let curriculumPayload;
        if (
          courseData.curriculum &&
          !Array.isArray(courseData.curriculum) &&
          courseData.curriculum.slides
        ) {
          curriculumPayload = {
            ...courseData.curriculum,
            live_sessions_config: {
              is_live: courseData.isLive,
              sessions: courseData.liveSessions,
            },
          };
        } else {
          curriculumPayload = [
            {
              type: "live_sessions_config",
              is_live: courseData.isLive,
              sessions: courseData.liveSessions,
            },
            ...(Array.isArray(courseData.curriculum)
              ? courseData.curriculum
              : []),
          ];
        }

        const response = await api.post("/create_course", {
          title: courseData.title,
          description: courseData.description || "Yeni oluşturulan kurs dersi.",
          category: courseData.category,
          price: courseData.price || 0,
          learning_outcomes: courseData.learningOutcomes,
          requirements: courseData.requirements,
          curriculum: curriculumPayload,
          schedule: courseData.schedule,
        });

        const newCourse: Course = {
          id: response.data.id,
          title: response.data.title,
          description: response.data.description || "",
          price: response.data.price || 0,
          learning_outcomes: response.data.learning_outcomes || [],
          requirements: response.data.requirements || [],
          curriculum: response.data.curriculum || [],
          isLive: courseData.isLive,
          liveSessions: courseData.liveSessions,
          schedule: response.data.schedule || [],
          students: 0,
          rating: 0,
          progress: 0,
          status: "active",
          color: courseData.color,
          lastUpdated: "Şimdi",
        };
        savedCourseId = response.data.id;
        setCourses([newCourse, ...courses]);
      }
      setIsAddModalOpen(false);
      if (refreshData) {
          refreshData();
      }
      // Redirect to dedicated visual roadmap builder page
      navigate(`/instructor/roadmap-builder/${savedCourseId}`);
    } catch (error: any) {
      console.error("Kurs kaydedilirken hata oluştu:", error);
      const errorMsg =
        error.response?.data?.detail ||
        "Kurs kaydedilemedi. Lütfen tekrar deneyin.";
      alert(`Hata: ${errorMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (id: number) => {
    if (window.confirm("Bu kursu silmek istediğine emin misin?")) {
      try {
        await api.delete(`/delete_course/${id}`);
        setCourses(courses.filter((c) => c.id !== id));
        if (refreshData) {
            refreshData();
        }
      } catch (error) {
        console.error("Kurs silinirken hata oluştu:", error);
        alert("Kurs silinemedi.");
      }
    }
    setOpenMenuId(null);
  };

  const handleStartSession = async (courseId: number) => {
    setStartingSessionId(courseId);
    try {
      await api.post(`/start-session/${courseId}`);
      setLiveSessionCourseIds(prev => new Set(prev).add(courseId));
      
      // Dersi başlattıktan sonra otomatik olarak Jitsi toplantısını aç
      try {
        const jitsiRes = await api.get(`/jitsi/token/${courseId}`);
        const { token, room, domain } = jitsiRes.data;
        const url = `https://${domain}/${room}?jwt=${token}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
        window.open(url, "_blank");
      } catch (jitsiErr) {
        console.error('Toplantı açılamadı:', jitsiErr);
        alert('Ders başlatıldı fakat toplantı penceresi açılamadı. "Toplantıya Git" butonunu kullanabilirsiniz.');
      }
    } catch (err) {
      console.error('Ders başlatılamadı:', err);
      alert('Ders başlatılırken bir hata oluştu.');
    } finally {
      setStartingSessionId(null);
    }
  };

  const handleStopSession = async (courseId: number) => {
    setStartingSessionId(courseId);
    try {
      await api.post(`/stop-session/${courseId}`);
      setLiveSessionCourseIds(prev => {
        const next = new Set(prev);
        next.delete(courseId);
        return next;
      });
    } catch (err) {
      console.error('Ders durdurulamadı:', err);
      alert('Ders durdurulurken bir hata oluştu.');
    } finally {
      setStartingSessionId(null);
    }
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

  const filteredCourses = courses.filter((c) => {
    if (filter === "all") return true;
    return c.status === filter;
  });

  return (
    <div className="space-y-6 animate-fade-in-down">
      {/* Header / Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter("active")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "active"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Aktif
          </button>
          <button
            onClick={() => setFilter("draft")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "draft"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Taslak
          </button>
          <button
            onClick={() => setFilter("archived")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "archived"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
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
              <div
                key={course.id}
                onClick={() => setInfoCourseId(course.id)}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-sky-100 transition-all group cursor-pointer active:scale-[0.98]"
              >
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Icon / Thumbnail */}
                  <div
                    className={`w-16 h-16 rounded-2xl bg-${course.color}-100 flex items-center justify-center text-3xl flex-shrink-0 group-hover:scale-105 transition-transform text-${course.color}-600`}
                  >
                    {course.title.toLowerCase().includes("python")
                      ? "🐍"
                      : course.title.toLowerCase().includes("web")
                        ? "🌐"
                        : course.title.toLowerCase().includes("oyun")
                          ? "🎮"
                          : "📘"}
                  </div>

                  {/* Main Info */}
                  <div className="flex-1 text-center md:text-left">
                    <h3 className="text-lg font-black text-gray-800 group-hover:text-sky-600 transition-colors">
                      {course.title}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-1">
                      <p className="text-xs font-bold text-gray-400">
                        Son güncelleme: {course.lastUpdated}
                      </p>
                      {course.isLive &&
                        course.liveSessions &&
                        course.liveSessions.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {course.liveSessions.map((session, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-wider animate-pulse border border-red-100"
                              >
                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                                Canlı: {session.date} @ {session.time}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-8 w-full md:w-auto justify-center md:justify-end">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-800 font-bold mb-1">
                        <span className="text-lg">₺{course.price}</span>
                      </div>
                      <p className="text-[10px] uppercase font-black text-gray-300">
                        Ücret
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 font-bold mb-1">
                        <Users size={16} />
                        <span>{course.students}</span>
                      </div>
                      <p className="text-[10px] uppercase font-black text-gray-300">
                        Öğrenci
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-gray-500 font-bold mb-1">
                        <Star
                          size={16}
                          className="text-yellow-400 fill-current"
                        />
                        <span>{course.rating > 0 ? course.rating : "-"}</span>
                      </div>
                      <p className="text-[10px] uppercase font-black text-gray-300">
                        Puan
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 border-t md:border-t-0 border-gray-100 pt-4 md:pt-0 w-full md:w-auto justify-end relative">
                    {/* Dersi Başlat Butonu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartSession(course.id);
                      }}
                      disabled={startingSessionId === course.id}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm shadow-md transition-all active:scale-95 whitespace-nowrap ${
                        startingSessionId === course.id
                          ? 'bg-gray-200 text-gray-400 cursor-wait'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                      }`}
                    >
                      {startingSessionId === course.id ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Play size={16} fill="currentColor" />
                          Dersi Başlat
                        </>
                      )}
                    </button>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(
                            openMenuId === course.id ? null : course.id,
                          );
                        }}
                        className="p-2 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <MoreVertical size={20} />
                      </button>

                      {openMenuId === course.id && (
                        <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden animate-fade-in">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLoadingContentId(course.id);
                              navigate(
                                `/instructor/builder?courseId=${course.id}`,
                              );
                            }}
                            disabled={loadingContentId === course.id}
                            className="w-full text-left px-4 py-2 text-sm text-sky-600 hover:bg-sky-50 font-bold transition-colors border-b border-gray-50 flex items-center gap-2 disabled:opacity-50"
                          >
                            {loadingContentId === course.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Layout size={14} />
                            )}
                            {loadingContentId === course.id
                              ? "Yükleniyor..."
                              : "Ders İçeriğini Düzenle"}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/instructor/roadmap-builder/${course.id}`,
                              );
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-sky-600 hover:bg-sky-50 font-bold transition-colors border-b border-gray-50 flex items-center gap-2"
                          >
                            <Layout size={14} />
                            Yol Haritasını Düzenle
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCourse(course.id);
                            }}
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

      {!isLoading && filteredCourses.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
            <Filter size={32} />
          </div>
          <h3 className="text-lg font-bold text-gray-400">
            Bu filtrede kurs bulunamadı.
          </h3>
        </div>
      )}

      <AddCourseModal
        key={editingCourse ? `edit-${editingCourse.id}` : "new-course"}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveCourse}
        isSubmitting={isSubmitting}
        initialData={
          editingCourse
            ? {
                title: editingCourse.title,
                description: editingCourse.description,
                price: editingCourse.price,
                learningOutcomes: editingCourse.learning_outcomes,
                requirements: editingCourse.requirements,
                curriculum: editingCourse.curriculum,
                category:
                  editingCourse.color === "blue"
                    ? "coding"
                    : editingCourse.color === "purple"
                      ? "web"
                      : editingCourse.color === "orange"
                        ? "design"
                        : "other",
                color: editingCourse.color,
                isLive: editingCourse.isLive,
                liveSessions: editingCourse.liveSessions,
                schedule: editingCourse.schedule,
              }
            : null
        }
      />

      <CourseInfoModal
        isOpen={infoCourseId !== null}
        onClose={() => setInfoCourseId(null)}
        course={courses.find((c) => c.id === infoCourseId) || null}
        onEdit={() => {
          const course = courses.find((c) => c.id === infoCourseId);
          if (course) handleEditClick(course);
        }}
        mode="instructor"
      />
    </div>
  );
};

export default InstructorCourses;
