import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Brain, Calendar, CheckCircle, ChevronRight, ClipboardCheck, Clock, Flame, GraduationCap, Hand, LifeBuoy, MessageSquare, Microscope, Play, Plus, Sparkles, TrendingUp, UserPlus, Users, Video, CheckCircle2, Upload, FileText, Flag, Radio, CalendarClock } from 'lucide-react';
import { useNavigate } from "react-router-dom";
import api from "../../api";

/**
 * Eğitmen ana paneli.
 *
 * Buradaki her sayı /teacher/home'dan gelir (öğrenme kaydı, teslimler,
 * mesajlar). Eskiden "%86 başarı", "142 bugün aktif", uydurma bir aktivite
 * akışı ve kursun sırasına göre dönüşümlü "%84/%76 tamamlandı" gösteriliyordu;
 * öğretmen karar verirken bu sayılara baktığı için hepsi gerçek veriyle
 * değiştirildi. Veri yoksa sayı yerine "—" yazar.
 */

interface HomeTodo {
  kind: "help" | "stuck" | "grading" | "messages" | "concept" | "setup" | "live";
  title: string;
  detail: string;
  link: string;
}

interface HomeCourse {
  id: number;
  title: string;
  students: number;
  modules: number;
  completion_rate: number | null;
  solve_rate: number | null;
  stuck_now: number;
  struggling_students: number;
  pending_grading: number;
  help_open: number;
  top_concept: { concept_id: string; label: string; students: number } | null;
}

interface HomeActivity {
  at: string;
  kind: "solved" | "submitted" | "homework" | "module" | "joined" | "help";
  student: string;
  student_id: number;
  course: string;
  course_id: number;
  text: string;
}

interface TeacherHome {
  student_count: number;
  course_count: number;
  active_today: number;
  active_week: number;
  solve_rate: number | null;
  tasks_started: number;
  avg_homework_grade: number | null;
  pending_grading: number;
  unread_messages: number;
  help_open: Array<{ id: number; student: string; course_id: number }>;
  stuck_now: Array<{ student: string; task: string; course_id: number }>;
  courses: HomeCourse[];
  todos: HomeTodo[];
  activity: HomeActivity[];
}

interface UpcomingSession {
  courseId: number;
  courseTitle: string;
  date: string;
  time: string;
  isActive: boolean;
  timeLeftStr: string;
}

interface InstructorDashboardProps {
  userData?: any;
  coursesData?: any[];
  studentsData?: any[];
}

const TODO_META: Record<HomeTodo["kind"], { icon: React.ElementType; box: string }> = {
  help: { icon: LifeBuoy, box: "bg-rose-50 text-rose-500 border-rose-200" },
  stuck: { icon: Flame, box: "bg-orange-50 text-orange-500 border-orange-200" },
  grading: { icon: ClipboardCheck, box: "bg-amber-50 text-amber-600 border-amber-200" },
  messages: { icon: MessageSquare, box: "bg-sky-50 text-sky-600 border-sky-200" },
  concept: { icon: Brain, box: "bg-violet-50 text-violet-600 border-violet-200" },
  setup: { icon: Sparkles, box: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  live: { icon: Video, box: "bg-emerald-50 text-emerald-600 border-emerald-200" },
};

const ACTIVITY_META: Record<HomeActivity["kind"], { icon: React.ElementType; tone: string; dot: string }> = {
  solved: { icon: CheckCircle2, tone: "text-emerald-500", dot: "bg-emerald-500" },
  submitted: { icon: Upload, tone: "text-cyan-500", dot: "bg-cyan-500" },
  homework: { icon: FileText, tone: "text-indigo-500", dot: "bg-indigo-500" },
  module: { icon: Flag, tone: "text-purple-500", dot: "bg-purple-500" },
  joined: { icon: GraduationCap, tone: "text-sky-500", dot: "bg-sky-500" },
  help: { icon: Hand, tone: "text-rose-500", dot: "bg-rose-500" },
};

/** "5 dk önce" — sunucu UTC yazıyor (saat dilimi eki olmadan). */
const timeAgo = (iso: string) => {
  const date = new Date(iso.endsWith("Z") || iso.includes("+") ? iso : `${iso}Z`);
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "şimdi";
  if (minutes < 60) return `${minutes} dk önce`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return days < 30 ? `${days} gün önce` : date.toLocaleDateString("tr-TR");
};

const pctOrDash = (value: number | null | undefined) => (value === null || value === undefined ? "—" : `%${value}`);

/** Kursların canlı oturum takviminden en yakın (ya da şu an süren) ders. */
const nextSession = (courses: any[], nowMs: number): UpcomingSession | null => {
  let closest: UpcomingSession | null = null;
  let minDiff = Infinity;
  for (const c of courses) {
    const config = (c.curriculum || [])[0];
    if (config?.type !== "live_sessions_config") continue;
    for (const sess of config.sessions || []) {
      if (!sess.date || !sess.time) continue;
      const [y, mo, d] = sess.date.split("-").map(Number);
      const [h, mi] = sess.time.split(":").map(Number);
      const diff = new Date(y, mo - 1, d, h, mi).getTime() - nowMs;
      if (diff <= -7_200_000 || diff >= minDiff) continue;
      minDiff = diff;
      let timeLeftStr = "";
      if (diff > 0) {
        const days = Math.floor(diff / 86_400_000);
        const hours = Math.floor((diff % 86_400_000) / 3_600_000);
        const mins = Math.floor((diff % 3_600_000) / 60_000);
        timeLeftStr = days > 0 ? `${days} gün ${hours} sa kaldı` : hours > 0 ? `${hours} sa ${mins} dk kaldı` : `${Math.max(1, mins)} dk kaldı`;
      }
      closest = { courseId: c.id, courseTitle: c.title, date: sess.date, time: sess.time, isActive: diff <= 0, timeLeftStr };
    }
  }
  return closest;
};

const InstructorDashboard: React.FC<InstructorDashboardProps> = ({ userData, coursesData }) => {
  const navigate = useNavigate();
  const [home, setHome] = useState<TeacherHome | null>(null);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [fetchedCourses, setFetchedCourses] = useState<any[] | null>(null);
  const courses = coursesData ?? fetchedCourses ?? [];
  const [timeOffsetMs, setTimeOffsetMs] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = () =>
      api.get<TeacherHome>("/teacher/home")
        .then((r) => { if (alive) { setHome(r.data); setHomeError(null); } })
        .catch(() => { if (alive) setHomeError("Panel verileri yüklenemedi."); });
    load();
    // Takılan ve yardım isteyen öğrenciler dakikalar içinde değişir.
    const timer = setInterval(load, 60_000);
    return () => { alive = false; clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (coursesData) return;
    api.get("/teacher/content").then((r) => setFetchedCourses(r.data || [])).catch(() => undefined);
  }, [coursesData]);

  useEffect(() => {
    fetch("https://worldtimeapi.org/api/timezone/Europe/Istanbul")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setTimeOffsetMs(new Date(data.datetime).getTime() - Date.now()))
      .catch(() => setTimeOffsetMs(0));
  }, []);

  // En yakın canlı oturum (kursun live_sessions_config bölümünden); yarım dakikada bir tazelenir.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const upcomingSession = useMemo(() => nextSession(courses, nowMs + timeOffsetMs), [courses, nowMs, timeOffsetMs]);

  const firstName = userData?.first_name || "Hocam";
  const todos: HomeTodo[] = [...(home?.todos || [])];
  if (upcomingSession && (upcomingSession.isActive || upcomingSession.timeLeftStr.includes("dk"))) {
    todos.unshift({
      kind: "live",
      title: upcomingSession.isActive ? `Canlı ders şimdi: ${upcomingSession.courseTitle}` : `Bugün ${upcomingSession.time} canlı ders`,
      detail: upcomingSession.isActive ? "Takvimden dersi başlat." : `${upcomingSession.courseTitle} · ${upcomingSession.timeLeftStr}`,
      link: "/instructor/calendar",
    });
  }

  const headline = !home
    ? "Veriler hazırlanıyor…"
    : home.student_count === 0
      ? "Öğrencilerin kursa katıldıkça burada gerçek zamanlı bir özet göreceksin."
      : home.active_week === 0
        ? "Bu hafta henüz çalışan öğrenci yok."
        : `Bu hafta ${home.active_week} öğrenci çalıştı${home.solve_rate !== null ? `; görevlerin %${home.solve_rate}'i çözüldü` : ""}.`;

  const stats = [
    { label: "Toplam Öğrenci", value: home ? String(home.student_count) : "…", icon: Users, box: "bg-indigo-50 border-indigo-200 text-indigo-600" },
    { label: "Bugün Aktif", value: home ? String(home.active_today) : "…", icon: TrendingUp, box: "bg-rose-50 border-rose-200 text-rose-600", hint: "Bugün en az bir görev, ödev ya da modülde çalışan öğrenci" },
    { label: "Görev Başarısı", value: home ? pctOrDash(home.solve_rate) : "…", icon: CheckCircle, box: "bg-emerald-50 border-emerald-200 text-emerald-600", hint: "Başlanan görevlerin çözülme oranı" },
    { label: "Ödev Ortalaması", value: home ? (home.avg_homework_grade ?? "—").toString() : "…", icon: GraduationCap, box: "bg-purple-50 border-purple-200 text-purple-600", hint: "Notlanan teslimlerin ortalaması (100 üzerinden)" },
  ];

  return (
    <div className="space-y-8 animate-fade-in-down pb-10">
      {/* Karşılama */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-indigo-900 via-indigo-950 to-purple-950 p-8 rounded-[2.5rem] border-2 border-b-[8px] border-indigo-950 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.15),transparent_60%)]"></div>
        <div className="relative z-10">
          <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 px-3 py-1.5 rounded-xl border border-indigo-500/30">
            Eğitmen Paneli
          </span>
          <h1 className="text-3xl font-black text-white tracking-tight font-display mt-3">
            Hoş Geldiniz, {firstName}!
          </h1>
          <p className="text-sm text-indigo-200 mt-1 font-bold">{headline}</p>
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <button
            onClick={() => navigate("/instructor/learning")}
            className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-500 active:translate-y-[2px] active:border-b-2 text-white font-black rounded-2xl border-2 border-b-4 border-indigo-800 shadow-sm transition-all text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <Microscope size={16} /> Öğrenme Analizi
          </button>
          <button
            onClick={() => navigate("/instructor/calendar")}
            className="px-5 py-3.5 bg-purple-600 hover:bg-purple-500 active:translate-y-[2px] active:border-b-2 text-white font-black rounded-2xl border-2 border-b-4 border-purple-800 shadow-sm transition-all text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer"
          >
            <Calendar size={16} /> Ajanda
          </button>
        </div>
      </div>

      {/* Yaklaşan ders */}
      {upcomingSession && (
        <div className={`relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-xl border-b-8 ${
          upcomingSession.isActive ? "bg-gradient-to-r from-green-500 to-emerald-600 border-green-700" : "bg-gradient-to-r from-indigo-600 to-purple-700 border-indigo-800"}`}>
          <Video className="absolute top-0 right-0 w-48 h-48 text-white/10 translate-x-12 -translate-y-10" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <span className={`inline-flex items-center gap-1 text-xs font-black px-3 py-1 rounded-full mb-2 ${upcomingSession.isActive ? "bg-white/20 animate-pulse" : "bg-white/10"}`}>
                {upcomingSession.isActive ? <><Radio size={12} /> DERS SAATİ</> : <><CalendarClock size={12} /> YAKLAŞAN DERS</>}
              </span>
              <h2 className="text-2xl font-black mb-1 font-display">{upcomingSession.courseTitle}</h2>
              <div className="flex items-center gap-2 text-white/80">
                <Clock size={14} />
                <span className="text-sm font-bold">{upcomingSession.date} · {upcomingSession.time}</span>
                {upcomingSession.timeLeftStr && (
                  <span className="ml-2 bg-black/20 px-2 py-0.5 rounded-lg text-xs font-black">{upcomingSession.timeLeftStr}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate("/instructor/calendar")}
              className="flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-lg shadow-lg transition-all whitespace-nowrap bg-white text-indigo-700 hover:scale-105"
            >
              <Play fill="currentColor" size={20} /> DERSE GİT
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sol sütun */}
        <div className="lg:col-span-8 space-y-8">
          {/* Bugün yapılacaklar */}
          <div className="bg-white rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border-2 border-b-4 border-indigo-200 text-indigo-600 flex items-center justify-center">
                <Flame size={20} />
              </div>
              <div>
                <h3 className="font-black text-gray-800 text-lg tracking-tight">Bugün Yapılacaklar</h3>
                <p className="text-xs text-slate-400 font-bold">Öğrenme kaydından ve teslimlerden çıkarıldı</p>
              </div>
            </div>
            {homeError && (
              <p className="flex items-center gap-2 text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-4 py-3">
                <AlertTriangle size={14} /> {homeError}
              </p>
            )}
            {!home && !homeError && <p className="text-sm text-gray-400 font-bold text-center py-6">Yükleniyor…</p>}
            {home && todos.length === 0 && (
              <p className="text-sm text-emerald-700 font-black bg-emerald-50 border-2 border-emerald-100 rounded-2xl px-5 py-4">
                Bekleyen bir iş yok: takılan öğrenci, değerlendirme bekleyen teslim ya da okunmamış mesaj görünmüyor.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {todos.map((todo, i) => {
                const meta = TODO_META[todo.kind] ?? TODO_META.setup;
                const Icon = meta.icon;
                return (
                  <button
                    key={`${todo.kind}-${i}`}
                    onClick={() => navigate(todo.link)}
                    className="flex items-start gap-4 p-4 bg-slate-50/50 hover:bg-white border-2 border-b-4 border-slate-200 hover:border-indigo-400 hover:border-b-indigo-500 rounded-2xl transition-all cursor-pointer text-left group/item"
                  >
                    <div className={`w-10 h-10 rounded-xl border-2 border-b-4 flex items-center justify-center shrink-0 ${meta.box}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-black text-gray-800 group-hover/item:text-indigo-600 transition-colors">{todo.title}</h5>
                      <p className="text-[11px] text-gray-400 font-bold mt-0.5 line-clamp-2">{todo.detail}</p>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover/item:text-indigo-500 self-center" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hızlı işlemler */}
          <div className="space-y-4">
            <h3 className="font-black text-gray-800 text-lg tracking-tight font-display">Hızlı İşlemler</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Yeni Kurs", icon: Plus, onClick: () => navigate("/instructor/courses"), tone: "bg-indigo-50 border-indigo-200 text-indigo-600" },
                { label: "AI ile Kurs", icon: Sparkles, onClick: () => navigate("/instructor/courses", { state: { openAIModal: true } }), tone: "bg-purple-50 border-purple-200 text-purple-600" },
                { label: "Canlı Ders", icon: Video, onClick: () => navigate("/instructor/calendar"), tone: "bg-rose-50 border-rose-200 text-rose-600" },
                { label: "Sınıflar", icon: UserPlus, onClick: () => navigate("/instructor/classes"), tone: "bg-emerald-50 border-emerald-200 text-emerald-600" },
              ].map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    className="flex flex-col items-center justify-center p-6 bg-white border-2 border-b-[6px] border-slate-200 hover:border-indigo-400 rounded-[2rem] hover:shadow-md transition-all group active:translate-y-[2px] active:border-b-2 cursor-pointer"
                  >
                    <div className={`w-14 h-14 rounded-2xl border-2 border-b-4 flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${action.tone}`}>
                      <Icon size={24} />
                    </div>
                    <span className="text-xs font-black text-slate-700 uppercase tracking-widest">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Kurs performansı */}
          <div className="bg-white rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-gray-800 text-lg tracking-tight font-display">Kurs Performansı</h3>
                <p className="text-xs text-gray-400 font-bold">Tamamlama: bitirilen modüllerin ortalaması · Çözme: başlanan görevlerin çözülme oranı</p>
              </div>
              <button
                onClick={() => navigate("/instructor/courses")}
                className="px-4 py-2 bg-white border-2 border-b-4 border-slate-200 text-slate-600 font-black rounded-xl hover:bg-slate-50 active:translate-y-[2px] active:border-b-2 transition-all text-xs uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Kurslar
              </button>
            </div>
            <div className="space-y-4">
              {!home ? (
                <p className="text-sm p-8 text-gray-400 font-bold text-center">Yükleniyor…</p>
              ) : home.courses.length === 0 ? (
                <p className="text-sm p-8 text-gray-400 font-bold text-center">Henüz bir kursunuz yok.</p>
              ) : home.courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => navigate(`/instructor/learning?course=${course.id}`)}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-50/50 hover:bg-white border-2 border-b-4 border-slate-200 hover:border-indigo-300 rounded-3xl transition-all cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-black text-gray-800 text-sm group-hover:text-indigo-600 transition-colors truncate">{course.title}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                        <Users size={11} /> {course.students} öğrenci
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                        Çözme {pctOrDash(course.solve_rate)}
                      </span>
                      {course.stuck_now > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                          <Flame size={11} /> {course.stuck_now} şu an takılı
                        </span>
                      )}
                      {course.help_open > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg">
                          <Hand size={11} /> {course.help_open} yardım isteği
                        </span>
                      )}
                      {course.pending_grading > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                          {course.pending_grading} teslim bekliyor
                        </span>
                      )}
                      {course.top_concept && course.top_concept.students > 0 && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg">
                          <Brain size={11} /> {course.top_concept.students} kişi “{course.top_concept.label}” kavramında zorlanıyor
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-32 shrink-0 text-right">
                    <span className="text-[10px] font-black text-gray-400 block uppercase tracking-wider">
                      Tamamlama {pctOrDash(course.completion_rate)}
                    </span>
                    <div className="w-full h-2 bg-slate-100 border border-slate-200 rounded-full mt-1.5 overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${course.completion_rate ?? 0}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sağ sütun */}
        <div className="lg:col-span-4 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} title={stat.hint} className="bg-white p-5 rounded-[2rem] border-2 border-b-[6px] border-slate-200 shadow-md">
                  <div className={`w-12 h-12 rounded-2xl border-2 border-b-4 flex items-center justify-center mb-3 ${stat.box}`}>
                    <Icon size={20} />
                  </div>
                  <h4 className="text-xl font-black text-gray-800 tracking-tight leading-none mb-1 font-display">{stat.value}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{stat.label}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-white rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-xl p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-black text-gray-800 text-lg tracking-tight font-display">Son Aktiviteler</h3>
                <p className="text-xs text-gray-400 font-bold">Öğrencilerinin öğrenme akışı</p>
              </div>
              <BookOpen size={18} className="text-slate-300" />
            </div>
            {home && home.activity.length === 0 && (
              <p className="text-xs text-gray-400 font-bold text-center py-6">Henüz etkinlik yok.</p>
            )}
            <div className="relative border-l-2 border-slate-200 pl-6 ml-2 space-y-5">
              {home?.activity.map((act, idx) => {
                const meta = ACTIVITY_META[act.kind] ?? ACTIVITY_META.solved;
                return (
                  <button
                    key={`${act.at}-${idx}`}
                    onClick={() => navigate(`/instructor/learning?course=${act.course_id}&student=${act.student_id}`)}
                    className="relative group block w-full text-left"
                  >
                    <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white ${meta.dot} group-hover:scale-125 transition-transform`} />
                    <div className="flex items-start gap-3 min-w-0">
                      <meta.icon size={18} className={`shrink-0 ${meta.tone}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <h5 className="text-xs font-black text-gray-800 group-hover:text-indigo-600 truncate">{act.student}</h5>
                          <span className="text-[9px] font-black text-gray-400 shrink-0 uppercase tracking-wider">{timeAgo(act.at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold mt-0.5">{act.text}</p>
                        <p className="text-[10px] text-gray-300 font-bold truncate">{act.course}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorDashboard;
