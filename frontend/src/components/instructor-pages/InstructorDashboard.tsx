import React, { useState, useEffect } from "react";
import {
  Users,
  BookOpen,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Video,
  Play,
  Clock,
  Sparkles,
  Plus,
  Calendar,
  ChevronRight,
  GraduationCap,
  Flame,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api";

interface InstructorDashboardProps {
  userData?: any;
  coursesData?: any[];
  studentsData?: any[];
}

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ userData, coursesData, studentsData }) => {
  const navigate = useNavigate();
  const handleNavigate = (pageId: string) => {
    const mapping: { [key: string]: string } = {
      'Dashboard': '/instructor/dashboard',
      'Courses': '/instructor/courses',
      'Calendar': '/instructor/calendar',
      'Classes': '/instructor/classes',
      'Students': '/instructor/students',
      'Messages': '/instructor/messages',
      // 'Analytics': '/instructor/analytics',
      // 'AIQuestions': '/instructor/ai-questions',
      'Profile': '/instructor/profile',
      'Builder': '/instructor/builder'
    };
    navigate(mapping[pageId] || '/instructor/dashboard');
  };

  const [courses, setCourses] = useState<any[]>(coursesData || []);
  
  // Calculate unique students
  const initialUniqueStudents = Array.from(new Set((studentsData || []).filter(s => s.student_id).map(s => s.student_id)));
  const [students, setStudents] = useState<any[]>(initialUniqueStudents);
  
  const [isLoading, setIsLoading] = useState(!coursesData && !studentsData);

  const [timeOffsetMs, setTimeOffsetMs] = useState(0);
  const [upcomingSession, setUpcomingSession] = useState<{
    courseId: number;
    courseTitle: string;
    date: string;
    time: string;
    isActive: boolean;
    timeLeftStr: string;
  } | null>(null);
  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
  } | null>(userData ? { firstName: userData.first_name, lastName: userData.last_name } : null);

  useEffect(() => {
    const fetchRealTime = async () => {
      try {
        const res = await fetch(
          "https://worldtimeapi.org/api/timezone/Europe/Istanbul",
        );
        if (!res.ok) throw new Error("API response not ok");
        const data = await res.json();
        const realTime = new Date(data.datetime).getTime();
        setTimeOffsetMs(realTime - new Date().getTime());
      } catch (err) {
        console.warn("Gerçek saat sunucudan alınamadı, yerel saat kullanılıyor:", err);
        setTimeOffsetMs(0); // Fallback to local time
      }
    };
    fetchRealTime();
  }, []);

  useEffect(() => {
    if (coursesData && studentsData) {
        setCourses(coursesData);
        setStudents(Array.from(new Set(studentsData.filter(s => s.student_id).map(s => s.student_id))));
        setIsLoading(false);
    } else {
        const fetchDashboardData = async () => {
          try {
            const [coursesRes, studentsRes, profileRes] = await Promise.all([
              api.get("/teacher/content"),
              api.get("/teacher/students"),
              api.get("/profile"),
            ]);
            setCourses(coursesRes.data);

            if (profileRes.data) {
              setUserProfile({
                firstName: profileRes.data.first_name,
                lastName: profileRes.data.last_name,
              });
            }
            const uniqueStudents = new Set();
            studentsRes.data.forEach((s: any) => {
              if (s.student_id) uniqueStudents.add(s.student_id);
            });
            setStudents(Array.from(uniqueStudents));
          } catch (err) {
            console.error("Failed to fetch dashboard data:", err);
          } finally {
            setIsLoading(false);
          }
        };
        fetchDashboardData();
    }
  }, [coursesData, studentsData]);

  // Kurslar veya zaman offset'i değişince, en yakın oturumu hesapla
  useEffect(() => {
    const computeNextSession = () => {
      const now = new Date(Date.now() + timeOffsetMs);
      let closest: typeof upcomingSession = null;
      let minDiff = Infinity;

      for (const c of courses) {
        const curriculum = c.curriculum || [];
        if (
          curriculum.length > 0 &&
          curriculum[0]?.type === "live_sessions_config"
        ) {
          const sessions: { date: string; time: string }[] =
            curriculum[0].sessions || [];
          for (const sess of sessions) {
            if (!sess.date || !sess.time) continue;
            const [year, month, day] = sess.date.split("-").map(Number);
            const [hours, minutes] = sess.time.split(":").map(Number);
            const lessonTime = new Date(
              year,
              month - 1,
              day,
              hours,
              minutes,
              0,
              0,
            );
            const diff = lessonTime.getTime() - now.getTime();

            if (diff > -7200000 && diff < minDiff) {
              minDiff = diff;
              let isActive = false;
              let timeLeftStr = "";
              if (diff <= 0 && diff > -7200000) {
                isActive = true;
                timeLeftStr = "";
              } else if (diff > 0) {
                const d = Math.floor(diff / 86400000);
                const h = Math.floor((diff % 86400000) / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                if (d > 0) timeLeftStr = `${d} gün ${h} s kaldı`;
                else if (h > 0) timeLeftStr = `${h} s ${m} dk kaldı`;
                else if (m > 0) timeLeftStr = `${m} dk kaldı`;
                else timeLeftStr = `${s} sn kaldı`;
              }
              closest = {
                courseId: c.id,
                courseTitle: c.title,
                date: sess.date,
                time: sess.time,
                isActive,
                timeLeftStr,
              };
            }
          }
        }
      }
      setUpcomingSession(closest);
    };

    if (!isLoading) {
      computeNextSession();
      const timer = setInterval(computeNextSession, 1000);
      return () => clearInterval(timer);
    }
  }, [courses, timeOffsetMs, isLoading]);

  return (
    <div className="space-y-8 animate-fade-in-down pb-10">
      {/* Banner / Header Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 p-8 rounded-[2.5rem] border-2 border-b-[8px] border-indigo-950 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.15),transparent_60%)]"></div>
        <div className="absolute -top-12 -left-12 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-500/30">
              Eğitmen Paneli
            </span>
            <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 px-3 py-1.5 rounded-xl border border-purple-500/30">
              GoMufi Copilot Aktif
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight font-display">
            Hoş Geldiniz, {userProfile?.firstName || userData?.first_name || "Hocam"}! 👋
          </h1>
          <p className="text-sm text-indigo-200 mt-1 font-bold">
            Öğrencilerinizin genel başarısı bugün %5 daha yüksek. Harika gidiyorsunuz!
          </p>
        </div>
        
        <div className="relative z-10 flex items-center gap-3">
          <button 
            onClick={() => handleNavigate("Courses")}
            className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:translate-y-[2px] active:border-b-2 text-white font-black rounded-2xl border-2 border-b-4 border-indigo-800 shadow-sm transition-all text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <BookOpen size={16} />
            Kurslarımı Yönet
          </button>
          
          <button 
            onClick={() => handleNavigate("Calendar")}
            className="px-5 py-3.5 bg-purple-600 hover:bg-purple-500 active:translate-y-[2px] active:border-b-2 text-white font-black rounded-2xl border-2 border-b-4 border-purple-800 shadow-sm transition-all text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <Calendar size={16} />
            Ajanda
          </button>
        </div>
      </div>

      {/* Yaklaşan Ders Baneri */}
      {upcomingSession && (
        <div
          className={`relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-xl border-b-8 ${
            upcomingSession.isActive
              ? "bg-gradient-to-r from-green-500 to-emerald-600 border-green-700"
              : "bg-gradient-to-r from-indigo-600 to-purple-750 border-indigo-800"
          }`}
        >
          <Video className="absolute top-0 right-0 w-48 h-48 text-white/10 translate-x-12 -translate-y-10" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full ${
                    upcomingSession.isActive
                      ? "bg-white/20 animate-pulse"
                      : "bg-white/10"
                  }`}
                >
                  {upcomingSession.isActive ? "🔴 CANLI" : "📅 YAKLAŞAN DERS"}
                </span>
              </div>
              <h2 className="text-2xl font-black mb-1 font-display">
                {upcomingSession.courseTitle}
              </h2>
              <div className="flex items-center gap-2 text-white/80">
                <Clock size={14} />
                <span className="text-sm font-bold">
                  {upcomingSession.date} · {upcomingSession.time}
                </span>
                <span className="ml-2 bg-black/20 px-2 py-0.5 rounded-lg text-xs font-black">
                  {upcomingSession.timeLeftStr}
                </span>
              </div>
            </div>
            <button
              disabled={!upcomingSession.isActive}
              onClick={async () => {
                if (upcomingSession.isActive) {
                  try {
                    await api.post(
                      `/start-session/${upcomingSession.courseId}`,
                    );
                    try {
                      const jitsiRes = await api.get(
                        `/jitsi/token/${upcomingSession.courseId}`,
                      );
                      const { token, room, domain } = jitsiRes.data;
                      const url = `https://${domain}/${room}?jwt=${token}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
                      window.open(
                        url,
                        "_blank",
                        "width=1280,height=720,toolbar=no,menubar=no,scrollbars=no",
                      );
                    } catch (jitsiErr) {
                      console.warn("Jitsi JWT token failed, falling back to public Jitsi Meet:", jitsiErr);
                      const fallbackUrl = `https://meet.jit.si/GoMufi-Room-${upcomingSession.courseId}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
                      window.open(
                        fallbackUrl,
                        "_blank",
                        "width=1280,height=720,toolbar=no,menubar=no,scrollbars=no",
                      );
                    }
                  } catch (err) {
                    console.error("Ders başlatılamadı:", err);
                    alert(
                      "Ders başlatılırken bir hata oluştu. Lütfen tekrar deneyin.",
                    );
                  }
                }
              }}
              className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg shadow-lg transition-all whitespace-nowrap ${
                upcomingSession.isActive
                  ? "bg-white text-green-600 hover:scale-105 animate-bounce"
                  : "bg-white/20 text-white/50 cursor-not-allowed"
              }`}
            >
              <Play fill="currentColor" size={20} />
              {upcomingSession.isActive ? "TOPLANTIYI BAŞLAT" : "BEKLENIYOR"}
            </button>
          </div>
        </div>
      )}

      {/* Main Grid Layout (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column (8/12) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* 1. Bugün Yapılacaklar (Today's Tasks) */}
          <div className="bg-white rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-100/10 rounded-full blur-3xl -translate-y-6 translate-x-6"></div>
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border-2 border-b-4 border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <Flame size={20} className="animate-bounce" />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 text-lg tracking-tight">Bugün Yapılacaklar</h3>
                  <p className="text-xs text-slate-400 font-bold">Takip etmeniz gereken en önemli başlıklar</p>
                </div>
              </div>
              <span className="text-[9px] font-black text-white bg-purple-500 border border-b-2 border-purple-600 px-3 py-1.5 rounded-xl uppercase tracking-widest">
                🔥 Günün Görevleri
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Task 1 */}
              <div 
                onClick={() => handleNavigate("Students")}
                className="flex items-start gap-4 p-4 bg-slate-50/50 hover:bg-white border-2 border-b-4 border-slate-200 hover:border-indigo-400 hover:border-b-indigo-500 rounded-2xl transition-all cursor-pointer group/item"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 border-2 border-b-4 border-orange-200 flex items-center justify-center shrink-0">
                  <GraduationCap size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-black text-gray-800 group-hover/item:text-indigo-605 transition-colors">12 Öğrenci Ödev Bekliyor</h5>
                  <p className="text-[11px] text-gray-400 font-bold mt-0.5">Teslim edilen ödevleri inceleyip puanlayın.</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover/item:text-indigo-500 group-hover/item:translate-x-0.5 transition-all self-center" />
              </div>

              {/* Task 3 */}
              <div 
                onClick={() => handleNavigate("Calendar")}
                className="flex items-start gap-4 p-4 bg-slate-50/50 hover:bg-white border-2 border-b-4 border-slate-200 hover:border-indigo-400 hover:border-b-indigo-500 rounded-2xl transition-all cursor-pointer group/item"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 border-2 border-b-4 border-indigo-200 flex items-center justify-center shrink-0">
                  <Video size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-black text-gray-800 group-hover/item:text-indigo-605 transition-colors">Bugün saat 20.00 Canlı Ders</h5>
                  <p className="text-[11px] text-gray-400 font-bold mt-0.5">Takvimdeki canlı sanal sınıf oturumuna katılın.</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover/item:text-indigo-500 group-hover/item:translate-x-0.5 transition-all self-center" />
              </div>

              {/* Task 4 */}
              <div 
                onClick={() => handleNavigate("Courses")}
                className="flex items-start gap-4 p-4 bg-slate-50/50 hover:bg-white border-2 border-b-4 border-slate-200 hover:border-indigo-400 hover:border-b-indigo-500 rounded-2xl transition-all cursor-pointer group/item"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-500 border-2 border-b-4 border-purple-200 flex items-center justify-center shrink-0">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="text-sm font-black text-gray-800 group-hover/item:text-indigo-605 transition-colors">Yapay Zeka ile Ders Oluştur</h5>
                  <p className="text-[11px] text-gray-400 font-bold mt-0.5">Gemini AI ile hızlıca yeni modüller ekleyin.</p>
                </div>
                <ChevronRight size={16} className="text-gray-300 group-hover/item:text-indigo-500 group-hover/item:translate-x-0.5 transition-all self-center" />
              </div>
            </div>
          </div>

          {/* 3. Hızlı İşlemler (Quick Actions) */}
          <div className="space-y-4">
            <h3 className="font-black text-gray-800 text-lg tracking-tight font-display">Hızlı İşlemler</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <button 
                onClick={() => handleNavigate("Courses")}
                className="flex flex-col items-center justify-center p-6 bg-white hover:bg-indigo-50/10 border-2 border-b-[6px] border-slate-200 hover:border-indigo-400 hover:border-b-indigo-500 rounded-[2rem] hover:shadow-md transition-all group active:translate-y-[2px] active:border-b-2 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border-2 border-b-4 border-indigo-200 text-indigo-600 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
                  <Plus size={24} strokeWidth={3} />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-indigo-600 uppercase tracking-widest transition-colors">Yeni Kurs</span>
              </button>

              <button 
                onClick={() => {
                  navigate("/instructor/courses", { state: { openAIModal: true } });
                }}
                className="flex flex-col items-center justify-center p-6 bg-white hover:bg-purple-50/10 border-2 border-b-[6px] border-slate-200 hover:border-purple-400 hover:border-b-purple-500 rounded-[2rem] hover:shadow-md transition-all group active:translate-y-[2px] active:border-b-2 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-purple-50 border-2 border-b-4 border-purple-200 text-purple-600 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
                  <Sparkles size={24} />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-purple-600 uppercase tracking-widest transition-colors">AI ile Kurs</span>
              </button>

              <button 
                onClick={() => handleNavigate("Calendar")}
                className="flex flex-col items-center justify-center p-6 bg-white hover:bg-rose-50/10 border-2 border-b-[6px] border-slate-200 hover:border-rose-400 hover:border-b-rose-500 rounded-[2rem] hover:shadow-md transition-all group active:translate-y-[2px] active:border-b-2 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-50 border-2 border-b-4 border-rose-200 text-rose-600 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
                  <Video size={24} />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-rose-600 uppercase tracking-widest transition-colors">Canlı Başlat</span>
              </button>

              <button 
                onClick={() => handleNavigate("Classes")}
                className="flex flex-col items-center justify-center p-6 bg-white hover:bg-emerald-50/10 border-2 border-b-[6px] border-slate-200 hover:border-emerald-400 hover:border-b-emerald-500 rounded-[2rem] hover:shadow-md transition-all group active:translate-y-[2px] active:border-b-2 cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 border-2 border-b-4 border-emerald-200 text-emerald-600 flex items-center justify-center mb-3 transition-transform group-hover:scale-105">
                  <Users size={24} />
                </div>
                <span className="text-xs font-black text-slate-700 group-hover:text-emerald-600 uppercase tracking-widest transition-colors">Sınıf Oluştur</span>
              </button>
            </div>
          </div>

          {/* 4. Kurs Performansı (Course Performance) */}
          <div className="bg-white rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-gray-800 text-lg tracking-tight font-display">Kurs Performansı</h3>
                <p className="text-xs text-gray-400 font-bold">Kurslarınızdaki güncel durum ve veriler</p>
              </div>
              <button 
                onClick={() => handleNavigate("Courses")}
                className="px-4 py-2 bg-white border-2 border-b-4 border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 active:translate-y-[2px] active:border-b-2 transition-all text-xs uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Tümünü Gör
              </button>
            </div>

            <div className="space-y-4">
              {isLoading ? (
                <p className="text-sm p-8 text-gray-400 font-bold text-center">Kurslar yükleniyor...</p>
              ) : courses.length === 0 ? (
                <p className="text-sm p-8 text-gray-400 font-bold text-center">Henüz yayında bir kursunuz bulunmuyor.</p>
              ) : (
                courses.map((course, idx) => {
                  const colors = ["indigo", "purple", "rose", "emerald", "sky"];
                  const color = colors[idx % colors.length];
                  
                  const activeCount = course.students_count || 14;
                  const completionRate = idx % 2 === 0 ? 84 : 76;
                  const stuckCount = idx % 2 === 0 ? 5 : 0;
                  
                  return (
                    <div 
                      key={course.id}
                      onClick={() => navigate(`/instructor/roadmap-builder/${course.id}`)}
                      className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50/50 hover:bg-white border-2 border-b-4 border-slate-200 hover:border-indigo-300 hover:border-b-indigo-400 rounded-3xl transition-all hover:shadow-sm cursor-pointer group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`w-12 h-12 rounded-2xl bg-${color}-50 border-2 border-b-4 border-${color}-200 text-${color}-600 flex items-center justify-center text-2xl shrink-0 group-hover:scale-105 transition-transform`}>
                          {course.title.toLowerCase().includes("python") ? "🐍" : "💻"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-black text-gray-800 text-sm group-hover:text-indigo-650 transition-colors truncate">
                            {course.title}
                          </h4>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-lg">
                              🔥 {activeCount} aktif
                            </span>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                              📈 %{completionRate} tamamlandı
                            </span>
                            {stuckCount > 0 ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg animate-pulse">
                                ⚠️ {stuckCount} kişi Quiz 2'de kaldı
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-lg">
                                ✅ Sorunsuz İlerliyor
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 self-end md:self-center">
                        {/* Completion progress bar */}
                        <div className="hidden lg:block w-24 text-right pr-4 shrink-0">
                          <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">İlerleme</span>
                          <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-full mt-1.5 overflow-hidden">
                            <div className={`h-full bg-${color}-500 rounded-full`} style={{ width: `${completionRate}%` }}></div>
                          </div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/instructor/roadmap-builder/${course.id}`);
                          }}
                          className="px-4 py-2.5 bg-white border-2 border-b-4 border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 font-black rounded-xl active:translate-y-[2px] active:border-b-2 transition-all text-xs uppercase tracking-wider cursor-pointer shadow-sm"
                        >
                          Yönet
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4/12) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 gap-4">
            {[
              {
                label: "Toplam Öğrenci",
                value: isLoading ? "..." : students.length.toString(),
                icon: <Users size={20} />,
                color: "indigo"
              },
              {
                label: "Aktif Kurslar",
                value: isLoading ? "..." : courses.length.toString(),
                icon: <BookOpen size={20} />,
                color: "purple"
              },
              {
                label: "Ortalama Başarı",
                value: "86%",
                icon: <CheckCircle size={20} />,
                color: "emerald"
              },
              {
                label: "Bugün Aktif",
                value: "142",
                icon: <TrendingUp size={20} />,
                color: "rose"
              }
            ].map((stat, idx) => (
              <div key={idx} className="bg-white p-5 rounded-[2rem] border-2 border-b-[6px] border-slate-200 shadow-md hover:border-slate-350 hover:shadow-lg transition-all group">
                <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 border-2 border-b-4 border-${stat.color}-200 text-${stat.color}-600 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform`}>
                  {stat.icon}
                </div>
                <h4 className="text-xl font-black text-gray-800 tracking-tight leading-none mb-1 font-display">
                  {stat.value}
                </h4>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* 6. Son Aktiviteler (Recent Activities) */}
          <div className="bg-white rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-xl p-8 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-gray-800 text-lg tracking-tight font-display">Son Aktiviteler</h3>
                <p className="text-xs text-gray-400 font-bold">Öğrencilerinizin canlı öğrenme akışı</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></div>
            </div>

            <div className="relative border-l-2 border-slate-200 pl-6 ml-2 space-y-6">
              {[
                {
                  student: "Ali",
                  action: "Quiz tamamladı",
                  time: "5 dk önce",
                  icon: "👑",
                  color: "purple"
                },
                {
                  student: "Ayşe",
                  action: "Ödev gönderdi",
                  time: "1 saat önce",
                  icon: "📝",
                  color: "indigo"
                },
                {
                  student: "Mehmet",
                  action: "Yeni katıldı",
                  time: "2 saat önce",
                  icon: "🎓",
                  color: "emerald"
                },
                {
                  student: "Zeynep",
                  action: "Canlı derse giriş yaptı",
                  time: "3 saat önce",
                  icon: "👥",
                  color: "rose"
                }
              ].map((act, idx) => (
                <div key={idx} className="relative group">
                  {/* Timeline dot */}
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white bg-${act.color}-500 border-b-[3px] border-b-black/20 group-hover:scale-125 transition-transform shrink-0`}></div>
                  
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-xl shrink-0 leading-none">{act.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <h5 className="text-xs font-black text-gray-800 group-hover:text-indigo-650 transition-colors truncate">
                          {act.student}
                        </h5>
                        <span className="text-[9px] font-black text-gray-400 shrink-0 uppercase tracking-wider">{act.time}</span>
                      </div>
                      <p className="text-xs text-gray-500 font-bold mt-0.5">{act.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
