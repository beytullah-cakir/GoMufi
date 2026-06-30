import React, { useState, useEffect } from "react";
import { 
  Users, 
  BookOpen, 
  HelpCircle, 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  X, 
  Check, 
  ShieldAlert,
  Save,
  Book,
  Compass
} from "lucide-react";
import api from "../../api";

interface UserItem {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  nickname: string;
  role: "student" | "teacher" | "admin";
  grade_level?: string;
  education_level?: string;
  gems?: number;
  hearts?: number;
  streak?: number;
  xp?: number;
  expertises?: string;
  bio?: string;
  created_at?: string;
  enrolled_courses?: { id: number; title: string }[];
}

interface CourseItem {
  id: number;
  teacher_id: number;
  teacher_name: string;
  title: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  status: string;
  curriculum: any[];
}

interface QuizItem {
  id: number;
  course_id: number;
  course_title: string;
  section_id: string;
  node_id: number;
  topic: string;
  difficulty: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  explanation: string;
  question_type: string;
}

interface AdminPanelProps {
  initialTab?: "users" | "courses" | "quizzes";
}

const AdminPanel: React.FC<AdminPanelProps> = ({ initialTab = "users" }) => {
  const [activeTab, setActiveTab] = useState<"users" | "courses" | "quizzes">(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Data lists
  const [users, setUsers] = useState<UserItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [quizzes, setQuizzes] = useState<QuizItem[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Loading states
  const [loading, setLoading] = useState(false);

  // Modals state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseItem | null>(null);

  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState<QuizItem | null>(null);

  // Course Enrollment states
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedUserForEnroll, setSelectedUserForEnroll] = useState<UserItem | null>(null);
  const [selectedCourseToAssign, setSelectedCourseToAssign] = useState<number | string>("");

  // Form states
  const [userForm, setUserForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    nickname: "",
    password: "",
    role: "student" as "student" | "teacher" | "admin",
    grade_level: "5. Sınıf",
    education_level: "ortaokul",
    expertises: "",
    bio: "",
    gems: 0,
    hearts: 5,
    streak: 0,
    xp: 0
  });

  const [courseForm, setCourseForm] = useState({
    teacher_id: 1,
    title: "",
    description: "",
    category: "Yazılım",
    price: 0,
    curriculumText: "[]" // JSON representation
  });

  const [quizForm, setQuizForm] = useState({
    course_id: 0,
    section_id: "sec1",
    node_id: 1,
    topic: "",
    difficulty: "Orta",
    question_text: "",
    optionsText: "", // comma separated or line separated
    correct_answer: "",
    explanation: "",
    question_type: "multiple-choice"
  });

  // Load data based on active tab
  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === "users") {
        const [usersRes, coursesRes] = await Promise.all([
          api.get("/admin/users"),
          api.get("/admin/courses")
        ]);
        setUsers(usersRes.data);
        setCourses(coursesRes.data);
      } else if (activeTab === "courses") {
        const res = await api.get("/admin/courses");
        setCourses(res.data);
      } else if (activeTab === "quizzes") {
        const res = await api.get("/admin/quizzes");
        setQuizzes(res.data);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  // Handle User Operations
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user
        await api.put(`/admin/users/${editingUser.role}/${editingUser.id}`, userForm);
        alert("Kullanıcı başarıyla güncellendi.");
      } else {
        // Create user
        await api.post("/admin/users", userForm);
        alert("Kullanıcı başarıyla oluşturuldu.");
      }
      setUserModalOpen(false);
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || "İşlem başarısız.");
    }
  };

  const handleEditUser = (u: UserItem) => {
    setEditingUser(u);
    setUserForm({
      first_name: u.first_name || "",
      last_name: u.last_name || "",
      email: u.email || "",
      nickname: u.nickname || "",
      password: "", // blank for no password update
      role: u.role,
      grade_level: u.grade_level || "5. Sınıf",
      education_level: u.education_level || "ortaokul",
      expertises: u.expertises || "",
      bio: u.bio || "",
      gems: u.gems || 0,
      hearts: u.hearts || 5,
      streak: u.streak || 0,
      xp: u.xp || 0
    });
    setUserModalOpen(true);
  };

  const handleDeleteUser = async (u: UserItem) => {
    if (!window.confirm(`${u.first_name} ${u.last_name} kullanıcısını silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/admin/users/${u.role}/${u.id}`);
      alert("Kullanıcı silindi.");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Silme başarısız.");
    }
  };

  const handleAssignCourse = async (studentId: number, courseId: number) => {
    if (!courseId) return;
    try {
      await api.post(`/admin/users/student/${studentId}/enroll`, { course_id: courseId });
      alert("Kurs ataması başarıyla yapıldı.");
      
      const updatedUsers = users.map(u => {
        if (u.id === studentId && u.role === 'student') {
          const targetCourse = courses.find(c => c.id === courseId);
          const enrolled = u.enrolled_courses || [];
          return {
            ...u,
            enrolled_courses: [...enrolled, { id: courseId, title: targetCourse ? targetCourse.title : "Yeni Kurs" }]
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      
      const targetUser = updatedUsers.find(u => u.id === studentId);
      if (targetUser) setSelectedUserForEnroll(targetUser);
      
      setSelectedCourseToAssign("");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Atama başarısız.");
    }
  };

  const handleRemoveEnrollment = async (studentId: number, courseId: number) => {
    if (!window.confirm("Bu öğrencinin kurs atamasını kaldırmak istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/admin/users/student/${studentId}/enroll/${courseId}`);
      alert("Atama kaldırıldı.");
      
      const updatedUsers = users.map(u => {
        if (u.id === studentId && u.role === 'student') {
          const enrolled = u.enrolled_courses || [];
          return {
            ...u,
            enrolled_courses: enrolled.filter((c: any) => c.id !== courseId)
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      
      const targetUser = updatedUsers.find(u => u.id === studentId);
      if (targetUser) setSelectedUserForEnroll(targetUser);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Kaldırma başarısız.");
    }
  };

  const handleCreateUserClick = () => {
    setEditingUser(null);
    setUserForm({
      first_name: "",
      last_name: "",
      email: "",
      nickname: "",
      password: "",
      role: "student",
      grade_level: "5. Sınıf",
      education_level: "ortaokul",
      expertises: "",
      bio: "",
      gems: 100,
      hearts: 5,
      streak: 0,
      xp: 0
    });
    setUserModalOpen(true);
  };

  // Handle Course Operations
  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedCurriculum = [];
    try {
      parsedCurriculum = JSON.parse(courseForm.curriculumText);
    } catch {
      alert("Müfredat JSON biçimi geçersiz!");
      return;
    }

    const payload = {
      teacher_id: courseForm.teacher_id,
      title: courseForm.title,
      description: courseForm.description,
      category: courseForm.category,
      price: courseForm.price,
      curriculum: parsedCurriculum
    };

    try {
      if (editingCourse) {
        await api.put(`/admin/courses/${editingCourse.id}`, payload);
        alert("Kurs güncellendi.");
      } else {
        await api.post("/admin/courses", payload);
        alert("Kurs oluşturuldu.");
      }
      setCourseModalOpen(false);
      setEditingCourse(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Kurs işlemi başarısız.");
    }
  };

  const handleEditCourse = (c: CourseItem) => {
    setEditingCourse(c);
    setCourseForm({
      teacher_id: c.teacher_id,
      title: c.title,
      description: c.description || "",
      category: c.category || "Yazılım",
      price: c.price || 0,
      curriculumText: JSON.stringify(c.curriculum, null, 2)
    });
    setCourseModalOpen(true);
  };

  const handleDeleteCourse = async (c: CourseItem) => {
    if (!window.confirm(`"${c.title}" kursunu silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/admin/courses/${c.id}`);
      alert("Kurs silindi.");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Kurs silme başarısız.");
    }
  };

  const handleCreateCourseClick = () => {
    setEditingCourse(null);
    // Find first teacher as default
    const firstTeacher = users.find(u => u.role === "teacher");
    setCourseForm({
      teacher_id: firstTeacher ? firstTeacher.id : 1,
      title: "",
      description: "",
      category: "Yazılım",
      price: 0,
      curriculumText: `[
  { "id": "sec1", "title": "Bölüm 1: Giriş" }
]`
    });
    setCourseModalOpen(true);
  };

  // Handle Quiz Operations
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = quizForm.optionsText.split("\n").map(o => o.trim()).filter(Boolean);
    if (opts.length < 2) {
      alert("En az 2 seçenek girilmelidir.");
      return;
    }
    if (!opts.includes(quizForm.correct_answer)) {
      alert("Doğru cevap seçeneklerden birisiyle eşleşmelidir.");
      return;
    }

    const payload = {
      course_id: quizForm.course_id || null,
      section_id: quizForm.section_id,
      node_id: quizForm.node_id,
      topic: quizForm.topic,
      difficulty: quizForm.difficulty,
      question_text: quizForm.question_text,
      options: opts,
      correct_answer: quizForm.correct_answer,
      explanation: quizForm.explanation,
      question_type: quizForm.question_type
    };

    try {
      if (editingQuiz) {
        await api.put(`/admin/quizzes/${editingQuiz.id}`, payload);
        alert("Soru güncellendi.");
      } else {
        await api.post("/admin/quizzes", payload);
        alert("Soru eklendi.");
      }
      setQuizModalOpen(false);
      setEditingQuiz(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Soru ekleme başarısız.");
    }
  };

  const handleEditQuiz = (q: QuizItem) => {
    setEditingQuiz(q);
    setQuizForm({
      course_id: q.course_id || 0,
      section_id: q.section_id || "sec1",
      node_id: q.node_id || 1,
      topic: q.topic || "",
      difficulty: q.difficulty || "Orta",
      question_text: q.question_text || "",
      optionsText: (q.options || []).join("\n"),
      correct_answer: q.correct_answer || "",
      explanation: q.explanation || "",
      question_type: q.question_type || "multiple-choice"
    });
    setQuizModalOpen(true);
  };

  const handleDeleteQuiz = async (q: QuizItem) => {
    if (!window.confirm("Bu soruyu silmek istediğinize emin misiniz?")) return;
    try {
      await api.delete(`/admin/quizzes/${q.id}`);
      alert("Soru silindi.");
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Soru silme başarısız.");
    }
  };

  const handleCreateQuizClick = () => {
    setEditingQuiz(null);
    setQuizForm({
      course_id: courses[0]?.id || 0,
      section_id: "sec1",
      node_id: 1,
      topic: "",
      difficulty: "Orta",
      question_text: "",
      optionsText: "A Seçeneği\nB Seçeneği\nC Seçeneği\nD Seçeneği",
      correct_answer: "",
      explanation: "",
      question_type: "multiple-choice"
    });
    setQuizModalOpen(true);
  };

  // Filters
  const filteredUsers = users.filter(u => 
    `${u.first_name} ${u.last_name} ${u.email} ${u.nickname}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const filteredCourses = courses.filter(c => 
    `${c.title} ${c.category} ${c.teacher_name}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  const filteredQuizzes = quizzes.filter(q => 
    `${q.question_text} ${q.topic} ${q.course_title}`
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24 p-8">
      {/* Title */}
      <div className="flex items-center gap-3 mb-8">
        <div className="bg-red-500 text-white p-3 rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center">
          <ShieldAlert size={28} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-800 font-display">Sistem Yönetici Paneli</h1>
          <p className="text-gray-500 text-sm font-semibold">Tüm kullanıcıları, ders müfredatlarını ve test sorularını yönetin.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-4 border-b-2 border-gray-100 mb-8 overflow-x-auto">
        <button
          onClick={() => { setActiveTab("users"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-6 py-4 font-black text-sm uppercase tracking-wide transition-all border-b-4 ${
            activeTab === "users"
              ? "text-sky-500 border-sky-500 bg-sky-50/50 rounded-t-2xl"
              : "text-gray-400 border-transparent hover:text-gray-600"
          }`}
        >
          <Users size={18} />
          Kullanıcılar
        </button>
        <button
          onClick={() => { setActiveTab("courses"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-6 py-4 font-black text-sm uppercase tracking-wide transition-all border-b-4 ${
            activeTab === "courses"
              ? "text-sky-500 border-sky-500 bg-sky-50/50 rounded-t-2xl"
              : "text-gray-400 border-transparent hover:text-gray-600"
          }`}
        >
          <BookOpen size={18} />
          Kurslar
        </button>
        <button
          onClick={() => { setActiveTab("quizzes"); setSearchQuery(""); }}
          className={`flex items-center gap-2 px-6 py-4 font-black text-sm uppercase tracking-wide transition-all border-b-4 ${
            activeTab === "quizzes"
              ? "text-sky-500 border-sky-500 bg-sky-50/50 rounded-t-2xl"
              : "text-gray-400 border-transparent hover:text-gray-600"
          }`}
        >
          <HelpCircle size={18} />
          Soru Bankası
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-3xl border-2 border-gray-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder={`${activeTab === "users" ? "Kullanıcı" : activeTab === "courses" ? "Kurs" : "Soru"} ara...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 outline-none focus:ring-2 focus:ring-sky-400 font-semibold text-gray-700 text-sm"
          />
        </div>

        {activeTab === "users" && (
          <button
            onClick={handleCreateUserClick}
            className="w-full md:w-auto bg-sky-500 hover:bg-sky-600 text-white font-black px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_0_rgb(3,105,161)] active:shadow-none active:translate-y-[4px] transition-all text-sm"
          >
            <Plus size={18} /> KULLANICI EKLE
          </button>
        )}
        {activeTab === "courses" && (
          <button
            onClick={handleCreateCourseClick}
            className="w-full md:w-auto bg-sky-500 hover:bg-sky-600 text-white font-black px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_0_rgb(3,105,161)] active:shadow-none active:translate-y-[4px] transition-all text-sm"
          >
            <Plus size={18} /> KURS OLUŞTUR
          </button>
        )}
        {activeTab === "quizzes" && (
          <button
            onClick={handleCreateQuizClick}
            className="w-full md:w-auto bg-sky-500 hover:bg-sky-600 text-white font-black px-6 py-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-[0_4px_0_rgb(3,105,161)] active:shadow-none active:translate-y-[4px] transition-all text-sm"
          >
            <Plus size={18} /> SORU EKLE
          </button>
        )}
      </div>

      {/* Grid / Table Container */}
      <div className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-sky-100 border-t-sky-500 rounded-full animate-spin mb-4"></div>
            <span className="font-bold text-gray-500">Veriler yükleniyor...</span>
          </div>
        ) : (
          <>
            {/* 1. USERS LIST */}
            {activeTab === "users" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 font-bold text-gray-400 text-xs tracking-wider uppercase">
                      <th className="p-5">Ad Soyad</th>
                      <th className="p-5">E-Posta</th>
                      <th className="p-5">Kullanıcı Adı</th>
                      <th className="p-5">Rol</th>
                      <th className="p-5">Detaylar / Stats</th>
                      <th className="p-5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                    {filteredUsers.map(u => (
                      <tr key={`${u.role}-${u.id}`} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-5 flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm ${
                            u.role === 'admin' ? 'bg-red-500' : u.role === 'teacher' ? 'bg-purple-500' : 'bg-sky-500'
                          }`}>
                            {u.first_name[0]}{u.last_name[0]}
                          </div>
                          <div>
                            <span className="block font-bold text-gray-800">{u.first_name} {u.last_name}</span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase">
                              {u.role === 'admin' ? 'Yönetici' : u.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
                            </span>
                          </div>
                        </td>
                        <td className="p-5 font-mono text-xs text-gray-500">{u.email}</td>
                        <td className="p-5 font-bold text-sky-600">@{u.nickname || "yok"}</td>
                        <td className="p-5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                            u.role === 'admin' ? 'bg-red-50 text-red-600 border border-red-200' : 
                            u.role === 'teacher' ? 'bg-purple-50 text-purple-600' : 'bg-sky-50 text-sky-600'
                          }`}>
                            {u.role === 'admin' ? 'yönetici' : u.role === 'teacher' ? 'eğitmen' : 'öğrenci'}
                          </span>
                        </td>
                        <td className="p-5">
                          {u.role === 'student' || u.role === 'admin' ? (
                            <div className="flex flex-col gap-1">
                              <span className="text-xs text-gray-500">
                                ⚡ {u.xp || 0} XP • 💎 {u.gems || 0} • ❤️ {u.hearts ?? 5} Can • 🔥 {u.streak || 0} Seri
                              </span>
                              {u.enrolled_courses && u.enrolled_courses.length > 0 ? (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {u.enrolled_courses.map(ec => (
                                    <span key={ec.id} className="text-[10px] bg-green-50 text-green-700 font-bold px-1.5 py-0.5 rounded-md border border-green-200">
                                      📚 {ec.title}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                u.role === 'student' && <span className="text-[10px] text-gray-400 font-bold italic">Kayıtlı Kurs Yok</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 truncate max-w-[200px] block">
                              📚 {u.expertises || "Uzmanlık Yok"}
                            </span>
                          )}
                        </td>
                        <td className="p-5 text-right flex items-center justify-end gap-2">
                          {u.role === 'student' && (
                            <button 
                              onClick={() => {
                                setSelectedUserForEnroll(u);
                                setEnrollModalOpen(true);
                                setSelectedCourseToAssign("");
                              }} 
                              title="Kurs Atamalarını Yönet"
                              className="p-2 text-gray-500 hover:text-green-600 bg-gray-50 hover:bg-green-50 rounded-xl transition-all"
                            >
                              <BookOpen size={16} />
                            </button>
                          )}
                          <button onClick={() => handleEditUser(u)} className="p-2 text-gray-500 hover:text-sky-500 bg-gray-50 hover:bg-sky-50 rounded-xl transition-all"><Edit size={16} /></button>
                          {u.email !== 'admin@gomufi.com' && (
                            <button onClick={() => handleDeleteUser(u)} className="p-2 text-gray-500 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-12 text-gray-400 font-bold">Kullanıcı bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 2. COURSES LIST */}
            {activeTab === "courses" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 font-bold text-gray-400 text-xs tracking-wider uppercase">
                      <th className="p-5">Kurs Adı</th>
                      <th className="p-5">Kategori</th>
                      <th className="p-5">Eğitmen</th>
                      <th className="p-5">Fiyat</th>
                      <th className="p-5">Üniteler</th>
                      <th className="p-5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                    {filteredCourses.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-5 font-bold text-gray-800 flex items-center gap-2">
                          <Book className="text-sky-500" size={18} />
                          {c.title}
                        </td>
                        <td className="p-5"><span className="bg-sky-50 text-sky-600 px-2 py-0.5 rounded text-xs font-bold">{c.category}</span></td>
                        <td className="p-5 text-gray-600">👨‍🏫 {c.teacher_name}</td>
                        <td className="p-5 font-bold text-green-600">{c.price === 0 ? "Ücretsiz" : `₺${c.price}`}</td>
                        <td className="p-5">
                          <span className="text-xs text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-lg">
                            {c.curriculum?.length || 0} Ünite
                          </span>
                        </td>
                        <td className="p-5 text-right flex items-center justify-end gap-2">
                          <button onClick={() => handleEditCourse(c)} className="p-2 text-gray-500 hover:text-sky-500 bg-gray-50 hover:bg-sky-50 rounded-xl transition-all"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteCourse(c)} className="p-2 text-gray-500 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredCourses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-12 text-gray-400 font-bold">Kurs bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. QUIZZES LIST */}
            {activeTab === "quizzes" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 font-bold text-gray-400 text-xs tracking-wider uppercase">
                      <th className="p-5">Soru</th>
                      <th className="p-5">Kurs / Ünite</th>
                      <th className="p-5">Konu</th>
                      <th className="p-5">Zorluk</th>
                      <th className="p-5">Doğru Cevap</th>
                      <th className="p-5 text-right">İşlemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-sm font-semibold text-gray-700">
                    {filteredQuizzes.map(q => (
                      <tr key={q.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-5 font-bold text-gray-800 max-w-sm truncate" title={q.question_text}>
                          {q.question_text}
                        </td>
                        <td className="p-5 text-xs text-gray-500">
                          <span className="block font-semibold text-gray-700">{q.course_title}</span>
                          <span>Bölüm: {q.section_id} • Düğüm: #{q.node_id}</span>
                        </td>
                        <td className="p-5 text-sky-600 font-bold">#{q.topic}</td>
                        <td className="p-5">
                          <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                            q.difficulty === 'Kolay' ? 'bg-green-50 text-green-600' :
                            q.difficulty === 'Zor' ? 'bg-red-50 text-red-600' : 'bg-yellow-50 text-yellow-600'
                          }`}>
                            {q.difficulty}
                          </span>
                        </td>
                        <td className="p-5 text-green-600 font-bold">{q.correct_answer}</td>
                        <td className="p-5 text-right flex items-center justify-end gap-2">
                          <button onClick={() => handleEditQuiz(q)} className="p-2 text-gray-500 hover:text-sky-500 bg-gray-50 hover:bg-sky-50 rounded-xl transition-all"><Edit size={16} /></button>
                          <button onClick={() => handleDeleteQuiz(q)} className="p-2 text-gray-500 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                        </td>
                      </tr>
                    ))}
                    {filteredQuizzes.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-12 text-gray-400 font-bold">Soru bulunamadı.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- MODAL 1: USER EDIT / CREATE --- */}
      {userModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h3 className="text-2xl font-black text-gray-800 font-display">
                {editingUser ? "Kullanıcıyı Düzenle" : "Yeni Kullanıcı Ekle"}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Ad</label>
                  <input
                    type="text"
                    required
                    value={userForm.first_name}
                    onChange={(e) => setUserForm({...userForm, first_name: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Soyad</label>
                  <input
                    type="text"
                    required
                    value={userForm.last_name}
                    onChange={(e) => setUserForm({...userForm, last_name: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">E-Posta</label>
                <input
                  type="email"
                  required
                  value={userForm.email}
                  onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Kullanıcı Adı (Takma Ad)</label>
                <input
                  type="text"
                  value={userForm.nickname}
                  onChange={(e) => setUserForm({...userForm, nickname: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                  placeholder="Seçilmezse adı kullanılır"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Şifre {editingUser && "(Değiştirmek istemiyorsanız boş bırakın)"}</label>
                <input
                  type="password"
                  required={!editingUser}
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Rol</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({...userForm, role: e.target.value as any})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                  >
                    <option value="student">Öğrenci</option>
                    <option value="teacher">Öğretmen</option>
                  </select>
                </div>
              )}

              {userForm.role === "student" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-gray-400 mb-1">Eğitim Kademesi</label>
                      <select
                        value={userForm.education_level}
                        onChange={(e) => setUserForm({...userForm, education_level: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                      >
                        <option value="ilkokul">İlkokul</option>
                        <option value="ortaokul">Ortaokul</option>
                        <option value="lise">Lise</option>
                        <option value="universite">Üniversite</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-gray-400 mb-1">Sınıf</label>
                      <select
                        value={userForm.grade_level}
                        onChange={(e) => setUserForm({...userForm, grade_level: e.target.value})}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                      >
                        {[...Array(12)].map((_, idx) => (
                          <option key={idx} value={`${idx + 1}. Sınıf`}>{idx + 1}. Sınıf</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">XP</label>
                      <input type="number" value={userForm.xp} onChange={(e) => setUserForm({...userForm, xp: parseInt(e.target.value) || 0})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Elmas</label>
                      <input type="number" value={userForm.gems} onChange={(e) => setUserForm({...userForm, gems: parseInt(e.target.value) || 0})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Can</label>
                      <input type="number" value={userForm.hearts} onChange={(e) => setUserForm({...userForm, hearts: parseInt(e.target.value) || 0})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-1">Seri (Gün)</label>
                      <input type="number" value={userForm.streak} onChange={(e) => setUserForm({...userForm, streak: parseInt(e.target.value) || 0})} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-center" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-1">Uzmanlık Alanları (Virgülle Ayırın)</label>
                    <input
                      type="text"
                      value={userForm.expertises}
                      onChange={(e) => setUserForm({...userForm, expertises: e.target.value})}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                      placeholder="Python, React, CSS"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-400 mb-1">Biyografi (Bio)</label>
                    <textarea
                      value={userForm.bio}
                      onChange={(e) => setUserForm({...userForm, bio: e.target.value})}
                      rows={2}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-2xl shadow-[0_4px_0_rgb(3,105,161)] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> KAYDET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 2: COURSE EDIT / CREATE --- */}
      {courseModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h3 className="text-2xl font-black text-gray-800 font-display">
                {editingCourse ? "Kursu Düzenle" : "Yeni Kurs Oluştur"}
              </h3>
              <button onClick={() => setCourseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Kurs Başlığı</label>
                <input
                  type="text"
                  required
                  value={courseForm.title}
                  onChange={(e) => setCourseForm({...courseForm, title: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Açıklama</label>
                <textarea
                  value={courseForm.description}
                  onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                  rows={2}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Kategori</label>
                  <input
                    type="text"
                    required
                    value={courseForm.category}
                    onChange={(e) => setCourseForm({...courseForm, category: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Fiyat (₺)</label>
                  <input
                    type="number"
                    required
                    value={courseForm.price}
                    onChange={(e) => setCourseForm({...courseForm, price: parseInt(e.target.value) || 0})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Eğitmen Seçin (ID)</label>
                <select
                  value={courseForm.teacher_id}
                  onChange={(e) => setCourseForm({...courseForm, teacher_id: parseInt(e.target.value)})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                >
                  {users.filter(u => u.role === "teacher").map(t => (
                    <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>
                  ))}
                  {users.filter(u => u.role === "teacher").length === 0 && (
                    <option value={1}>Mufi Hoca (Hazır)</option>
                  )}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black uppercase text-gray-400">Müfredat JSON Yapısı</label>
                  <span className="text-[10px] text-gray-400 font-bold">Örn: [{"{ \"id\": \"sec1\", \"title\": \"Giriş\" }"}]</span>
                </div>
                <textarea
                  value={courseForm.curriculumText}
                  onChange={(e) => setCourseForm({...courseForm, curriculumText: e.target.value})}
                  rows={6}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-mono text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-2xl shadow-[0_4px_0_rgb(3,105,161)] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> KAYDET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 3: QUIZ EDIT / CREATE --- */}
      {quizModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <h3 className="text-2xl font-black text-gray-800 font-display">
                {editingQuiz ? "Soruyu Düzenle" : "Yeni Soru Ekle"}
              </h3>
              <button onClick={() => setQuizModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <form onSubmit={handleQuizSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Kurs Seçimi</label>
                <select
                  value={quizForm.course_id}
                  onChange={(e) => setQuizForm({...quizForm, course_id: parseInt(e.target.value)})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Bölüm ID (Örn: sec1)</label>
                  <input
                    type="text"
                    required
                    value={quizForm.section_id}
                    onChange={(e) => setQuizForm({...quizForm, section_id: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Düğüm (Node) ID (1-7)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={7}
                    value={quizForm.node_id}
                    onChange={(e) => setQuizForm({...quizForm, node_id: parseInt(e.target.value) || 1})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Konu Başlığı</label>
                  <input
                    type="text"
                    required
                    value={quizForm.topic}
                    onChange={(e) => setQuizForm({...quizForm, topic: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase text-gray-400 mb-1">Zorluk</label>
                  <select
                    value={quizForm.difficulty}
                    onChange={(e) => setQuizForm({...quizForm, difficulty: e.target.value})}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold"
                  >
                    <option value="Kolay">Kolay</option>
                    <option value="Orta">Orta</option>
                    <option value="Zor">Zor</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Soru Metni</label>
                <textarea
                  required
                  value={quizForm.question_text}
                  onChange={(e) => setQuizForm({...quizForm, question_text: e.target.value})}
                  rows={2}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-black uppercase text-gray-400 font-display">Seçenekler (Alt alta girin)</label>
                  <span className="text-[10px] text-gray-400 font-bold">Her satıra bir seçenek</span>
                </div>
                <textarea
                  required
                  value={quizForm.optionsText}
                  onChange={(e) => setQuizForm({...quizForm, optionsText: e.target.value})}
                  rows={4}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                  placeholder="Seçenek A&#10;Seçenek B&#10;Seçenek C"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Doğru Cevap (Seçenekle birebir aynı olmalıdır)</label>
                <input
                  type="text"
                  required
                  value={quizForm.correct_answer}
                  onChange={(e) => setQuizForm({...quizForm, correct_answer: e.target.value})}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-bold text-green-600"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-gray-400 mb-1">Çözüm / Açıklama</label>
                <textarea
                  value={quizForm.explanation}
                  onChange={(e) => setQuizForm({...quizForm, explanation: e.target.value})}
                  rows={2}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-sky-400 font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-black py-4 rounded-2xl shadow-[0_4px_0_rgb(3,105,161)] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center gap-2"
              >
                <Save size={18} /> KAYDET
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: COURSE ENROLLMENT MANAGEMENT --- */}
      {enrollModalOpen && selectedUserForEnroll && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <div className="bg-green-500 text-white p-2 rounded-xl flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-800 font-display">Kurs Atamalarını Yönet</h3>
                  <p className="text-xs text-gray-500 font-bold">{selectedUserForEnroll.first_name} {selectedUserForEnroll.last_name}</p>
                </div>
              </div>
              <button onClick={() => setEnrollModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            {/* Assign Course Form */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 mb-6">
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Yeni Kurs Ata</label>
              <div className="flex gap-2">
                <select
                  value={selectedCourseToAssign}
                  onChange={(e) => setSelectedCourseToAssign(e.target.value)}
                  className="flex-1 p-3 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-400 font-bold text-gray-700 text-sm"
                >
                  <option value="">Atanacak Kurs Seçin...</option>
                  {courses
                    .filter((c: any) => !selectedUserForEnroll.enrolled_courses?.some((ec: any) => ec.id === c.id))
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleAssignCourse(selectedUserForEnroll.id, Number(selectedCourseToAssign))}
                  disabled={!selectedCourseToAssign}
                  className="bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white font-black px-5 py-3 rounded-xl transition-all shadow-[0_4px_0_rgb(21,128,61)] active:shadow-none active:translate-y-[4px] text-xs"
                >
                  Kursa Ata
                </button>
              </div>
            </div>

            {/* Enrolled Courses List */}
            <div>
              <label className="block text-[10px] font-black uppercase text-gray-400 mb-2">Kayıtlı Olduğu Kurslar</label>
              <div className="space-y-2">
                {selectedUserForEnroll.enrolled_courses && selectedUserForEnroll.enrolled_courses.length > 0 ? (
                  selectedUserForEnroll.enrolled_courses.map((ec: any) => (
                    <div key={ec.id} className="flex items-center justify-between p-3.5 bg-white border-2 border-gray-100 hover:border-green-300 rounded-2xl transition-all">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📚</span>
                        <span className="font-bold text-gray-700 text-sm">{ec.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveEnrollment(selectedUserForEnroll.id, ec.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Atamayı Kaldır"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-400 font-bold text-xs italic bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    Öğrenciye tanımlı herhangi bir kurs bulunmamaktadır.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8">
              <button
                type="button"
                onClick={() => setEnrollModalOpen(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-black py-3 rounded-xl text-sm"
              >
                KAPAT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
