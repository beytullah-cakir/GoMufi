import React from "react";
import {
  X,
  CheckCircle,
  Info,
  BookOpen,
  Users,
  Star,
  Clock,
  ChevronRight,
  Target,
  Award,
  List,
  FileJson,
  Download,
  Edit3,
  Calendar,
  Video,
  Layers,
  BadgeCheck,
  Zap,
  Trophy,
  Layout,
  Code,
  Globe,
  Palette,
  GraduationCap,
  StickyNote,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

interface CourseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  course: {
    id: number | string;
    title: string;
    description?: string;
    category?: string;
    price?: number;
    students?: number;
    rating?: number;
    learning_outcomes?: string[];
    requirements?: string[];
    curriculum?: any;
    instructor?: string;
    isLive?: boolean;
    liveSessions?: { date: string; time: string }[];
  } | null;
  mode: "student" | "instructor";
}

const CourseInfoModal: React.FC<CourseInfoModalProps> = ({
  isOpen,
  onClose,
  onEdit,
  course,
  mode,
}) => {
  const navigate = useNavigate();
  const [isNavigating, setIsNavigating] = React.useState(false);
  const [preFetchedData, setPreFetchedData] = React.useState<any>(null);
  const isFetchingRef = React.useRef(false);

  // Müfredatı liste yapısına normalize et (Legacy desteği ile)
  const notes = React.useMemo(() => {
    if (!course?.curriculum) return [];
    const raw = course.curriculum;
    if (Array.isArray(raw)) return raw;

    // Eski tekli nesne yapısı
    if (raw.slides || raw.noteTitle) {
      return [
        {
          id: "default",
          noteTitle: raw.noteTitle || course.title,
          slides: raw.slides || [],
        },
      ];
    }
    return [];
  }, [course?.curriculum, course?.title]);

  const preFetchCurriculum = async () => {
    if (isFetchingRef.current || preFetchedData || !course?.id) return;
    isFetchingRef.current = true;
    try {
      const response = await api.get(`/courses/${course.id}`);
      setPreFetchedData(response.data?.curriculum);
    } catch (error) {
      console.error("Ön yükleme hatası:", error);
    } finally {
      isFetchingRef.current = false;
    }
  };

  // Modal açıldığı anda arka planda veriyi çekmeye başla
  React.useEffect(() => {
    if (isOpen && course?.id && !preFetchedData && !isFetchingRef.current) {
      preFetchCurriculum();
    }
    // Modal kapandığında veya kurs değiştiğinde ön yüklemeyi sıfırla
    if (!isOpen) {
      setPreFetchedData(null);
      isFetchingRef.current = false;
    }
  }, [isOpen, course?.id]);

  if (!isOpen || !course) return null;

  const curriculum = course.curriculum;
  const liveConfigFromCurriculum = Array.isArray(curriculum)
    ? curriculum.find((c) => c.type === "live_sessions_config")
    : curriculum?.live_sessions_config;

  const isLive = course.isLive || liveConfigFromCurriculum?.is_live;
  const sessions =
    course.liveSessions || liveConfigFromCurriculum?.sessions || [];

  // Category Icon Resolver
  const getCategoryIcon = (category?: string) => {
    switch (category?.toLowerCase()) {
      case "coding":
        return <Code size={24} />;
      case "web":
        return <Globe size={24} />;
      case "design":
        return <Palette size={24} />;
      default:
        return <GraduationCap size={24} />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modern Card-Based Modal */}
      <div className="relative bg-white w-full max-w-5xl h-full sm:h-[90vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col border border-gray-100">
        {/* HEADER AREA (Sticky) */}
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white z-20 shrink-0">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-sky-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-100 transition-transform hover:scale-105">
              {getCategoryIcon(course.category)}
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">
                {course.title}
              </h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em]">
                  {course.category || "Eğitim"}
                </span>
                <span className="w-1 h-1 bg-gray-200 rounded-full" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  Kurs Detayları
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mode === "instructor" && onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="px-5 py-3 text-[10px] font-black text-sky-600 hover:bg-sky-50 rounded-xl transition-all border border-sky-100 uppercase tracking-widest flex items-center gap-2 bg-white"
              >
                <Edit3 size={14} /> Düzenle
              </button>
            )}
            <button
              onClick={onClose}
              className="p-3 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-10 sm:p-12 space-y-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* SECTION 1: OVERVIEW CARD */}
            <section className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100 space-y-10">
              <div className="flex flex-wrap items-center gap-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Eğitmen
                  </span>
                  <p className="font-bold text-gray-800 flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    {course.instructor || "Mufi Academy"}
                    <BadgeCheck size={16} className="text-sky-500" />
                  </p>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Puan
                  </span>
                  <p className="font-black text-gray-800 flex items-center gap-2">
                    <Star size={16} className="text-yellow-400 fill-current" />
                    {course.rating || "4.8"}
                  </p>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Öğrenci
                  </span>
                  <p className="font-black text-gray-800 flex items-center gap-2">
                    <Users size={16} className="text-gray-400" />
                    {Number(course.students).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col ml-auto text-right">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Kurs Ücreti
                  </span>
                  <p className="text-3xl font-black text-sky-600 tracking-tighter">
                    ₺{Number(course.price).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Info size={18} className="text-sky-500" />
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                    Kurs Hakkında
                  </h3>
                </div>
                <div className="p-8 bg-gray-50 rounded-[2rem] border border-gray-100 text-gray-600 font-medium leading-relaxed italic text-lg">
                  "
                  {course.description ||
                    "Bu kurs için henüz bir açıklama metni girilmemiş."}
                  "
                </div>
              </div>
            </section>

            {/* SECTION 2: LIVE SCHEDULE CARD */}
            {isLive && sessions.length > 0 && (
              <section className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
                    <Video size={24} />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                    Canlı Oturum Saatleri
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {sessions.map((s: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center gap-5 p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 group hover:border-rose-200 transition-colors"
                    >
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-rose-500 shadow-sm">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                          Oturum {i + 1} • {s.date}
                        </p>
                        <p className="text-xl font-black text-gray-800 leading-none">
                          {s.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* SECTION 3: OUTCOMES & REQUIREMENTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <section className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <Target size={24} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                    Kazanımlar
                  </h3>
                </div>
                <div className="space-y-4">
                  {course.learning_outcomes?.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-5 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      <CheckCircle
                        size={18}
                        className="text-emerald-500 shrink-0 mt-0.5"
                      />
                      <span className="text-sm font-bold text-gray-700 leading-snug">
                        {item}
                      </span>
                    </div>
                  )) || (
                    <p className="text-xs font-bold text-gray-400 italic">
                      Girilmemiş.
                    </p>
                  )}
                </div>
              </section>

              <section className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                    <Award size={24} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                    Gereksinimler
                  </h3>
                </div>
                <div className="space-y-4">
                  {course.requirements?.map((item, i) => (
                    <div
                      key={i}
                      className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100"
                    >
                      <Zap
                        size={18}
                        className="text-amber-500 shrink-0 mt-0.5"
                      />
                      <span className="text-sm font-bold text-gray-700 leading-snug">
                        {item}
                      </span>
                    </div>
                  )) || (
                    <p className="text-xs font-bold text-gray-400 italic">
                      Belirtilmemiş.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* SECTION 4: KURS NOTLARI */}
            <section className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <FileJson size={24} />
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  Kurs Notları
                </h3>
              </div>

              <div className="space-y-4">
                {notes.length > 0 ? (
                  notes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-center justify-between p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 group hover:border-amber-200 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm">
                          <StickyNote size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Kayıtlı Ders Notu
                          </p>
                          <p className="text-xl font-black text-gray-800 leading-none">
                            {note.noteTitle || "İsimsiz Not"}
                          </p>
                        </div>
                      </div>

                      <button
                        disabled={isNavigating}
                        onMouseEnter={preFetchCurriculum}
                        onClick={async () => {
                          setIsNavigating(true);
                          let data = preFetchedData;
                          if (!data) {
                            try {
                              const response = await api.get(
                                `/courses/${course.id}`,
                              );
                              data = response.data?.curriculum;
                            } catch (e) {
                              console.error("Veri çekme hatası:", e);
                            }
                          }
                          navigate(
                            `/instructor/builder?courseId=${course.id}&noteId=${note.id}`,
                            {
                              state: { curriculum: data },
                            },
                          );
                          setIsNavigating(false);
                        }}
                        className={`px-6 py-3 border-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center gap-2 ${
                          isNavigating
                            ? "bg-gray-50 border-gray-200 text-gray-400 cursor-wait"
                            : "bg-white border-amber-500 text-amber-600 hover:bg-amber-500 hover:text-white shadow-amber-100"
                        }`}
                      >
                        {isNavigating ? (
                          <Zap className="w-4 h-4 animate-spin" />
                        ) : (
                          <Edit3 size={14} />
                        )}
                        {isNavigating ? "Yükleniyor..." : "Düzenle"}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                      Henüz ders notu eklenmemiş.
                    </p>
                    <button
                      onClick={() =>
                        navigate(`/instructor/builder?courseId=${course.id}`)
                      }
                      className="mt-4 text-xs font-black text-amber-600 hover:text-amber-700 underline underline-offset-4"
                    >
                      + Yeni Ders Notu Oluştur
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* SECTION 5: CURRICULUM CARD */}
            <section className="bg-white p-10 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
                  <List size={24} />
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                  Eğitim Müfredatı
                </h3>
              </div>

              <div className="border border-gray-100 rounded-[2rem] overflow-hidden">
                {(() => {
                  // Sadece standart müfredat öğelerini (lectures olanları) filtrele
                  const standardSections = Array.isArray(curriculum)
                    ? curriculum.filter((s: any) => s.lectures)
                    : [];

                  if (standardSections.length > 0) {
                    return (
                      <div className="divide-y divide-gray-50">
                        {standardSections.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-6 flex items-center justify-between hover:bg-gray-50 transition-all cursor-default group"
                          >
                            <div className="flex items-center gap-6">
                              <span className="text-lg font-black text-gray-200 group-hover:text-purple-300 transition-colors">
                                {(idx + 1).toString().padStart(2, "0")}
                              </span>
                              <div>
                                <h4 className="font-bold text-gray-800 text-lg">
                                  {s.title || `Bölüm ${idx + 1}`}
                                </h4>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  {s.lectures?.length || 0} Ders İçeriği
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-200" />
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="p-16 text-center text-gray-300 font-bold italic">
                      Ders müfredatı henüz oluşturulmamış.
                    </div>
                  );
                })()}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseInfoModal;
