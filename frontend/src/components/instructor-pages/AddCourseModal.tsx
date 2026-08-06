import React, { useState, useEffect } from "react";
import {
  X,
  Book,
  Code,
  Globe,
  Music,
  Palette,
  Plus,
  Trash2,
  ChevronRight,
  Layout,
  List,
  Layers,
  Calendar,
  Clock,
  Video,
  Info,
  Upload,
  BookOpen,
  Check,
} from "lucide-react";
import categoryData from "../../data/categories.json";

export interface Lecture {
  id: string;
  title: string;
  duration: string;
}

export interface Section {
  id: string;
  title: string;
  lectures: Lecture[];
}

export interface CourseData {
  title: string;
  category: string;
  color: string;
  description: string;
  learningOutcomes: string[];
  requirements: string[];
  curriculum: Section[];
  price: number;
  isLive?: boolean;
  liveSessions?: { date: string; time: string }[];
  schedule?: { day: string; time: string }[];
  instructorNotes?: { title: string; type: string }[];
  classes?: { id: string; name: string; schedule: { day: string; time: string }[] }[];
  start_date?: string;
}

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: CourseData) => void;
  isSubmitting?: boolean;
  initialData?: Partial<CourseData> | null;
}

const STORAGE_KEY = "gomufi_new_course_draft";

const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSubmitting = false,
}) => {
  // Taslak Geri Yükleme Mantığı
  const savedDraft = !initialData
    ? (() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
      } catch (e) {
        return null;
      }
    })()
    : null;

  const [activeTab, setActiveTab] = useState<
    "general" | "details" | "curriculum" | "schedule"
  >(savedDraft?.activeTab || "general");

  // General State
  const [title, setTitle] = useState(
    initialData?.title || savedDraft?.title || "",
  );
  const [selectedCategory, setSelectedCategory] = useState(
    initialData?.category || savedDraft?.selectedCategory || "",
  );
  const [description, setDescription] = useState(
    initialData?.description || savedDraft?.description || "",
  );
  const [price, setPrice] = useState<number | string>(
    initialData?.price ?? savedDraft?.price ?? 0,
  );
  const [startDate, setStartDate] = useState(
    initialData?.start_date || savedDraft?.startDate || "",
  );
  const [isLive, setIsLive] = useState(
    initialData?.isLive || savedDraft?.isLive || false,
  );
  const [liveSessions, setLiveSessions] = useState<
    { date: string; time: string }[]
  >(
    initialData?.liveSessions?.length
      ? initialData.liveSessions
      : savedDraft?.liveSessions?.length
        ? savedDraft.liveSessions
        : [{ date: "", time: "" }],
  );

  // Details State
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(
    initialData?.learningOutcomes?.length
      ? initialData.learningOutcomes
      : savedDraft?.learningOutcomes?.length
        ? savedDraft.learningOutcomes
        : [""],
  );
  const [requirements, setRequirements] = useState<string[]>(
    initialData?.requirements?.length
      ? initialData.requirements
      : savedDraft?.requirements?.length
        ? savedDraft.requirements
        : [""],
  );

  // Curriculum State
  const [sections, setSections] = useState<Section[]>(
    initialData?.curriculum?.length
      ? initialData.curriculum
      : savedDraft?.sections?.length
        ? savedDraft.sections
        : [{ id: "str_1", title: "Giriş", lectures: [] }],
  );
  const [schedule, setSchedule] = useState<{ day: string; time: string }[]>(
    initialData?.schedule?.length
      ? initialData.schedule
      : savedDraft?.schedule?.length
        ? savedDraft.schedule
        : [{ day: "Pazartesi", time: "10:00" }],
  );
  const [classes, setClasses] = useState<{ id: string; name: string; schedule: { day: string; time: string }[] }[]>(
    initialData?.classes?.length
      ? initialData.classes
      : savedDraft?.classes?.length
        ? savedDraft.classes
        : [{ id: "c_1", name: "A Sınıfı", schedule: [] }]
  );

  // Otomatik Taslak Kaydetme
  useEffect(() => {
    if (!initialData && isOpen) {
      const draft = {
        title,
        selectedCategory,
        description,
        price,
        isLive,
        liveSessions,
        learningOutcomes,
        requirements,
        sections,
        schedule,
        classes,
        activeTab,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [
    title,
    selectedCategory,
    description,
    price,
    isLive,
    liveSessions,
    learningOutcomes,
    requirements,
    sections,
    schedule,
    classes,
    activeTab,
    initialData,
    isOpen,
  ]);

  const clearDraft = () => {
    if (
      confirm("Taslağı silmek ve baştan başlamak istediğinize emin misiniz?")
    ) {
      localStorage.removeItem(STORAGE_KEY);
      setTitle("");
      setSelectedCategory("");
      setDescription("");
      setPrice(0);
      setIsLive(false);
      setLiveSessions([{ date: "", time: "" }]);
      setLearningOutcomes([""]);
      setRequirements([""]);
      setSections([{ id: "str_1", title: "Giriş", lectures: [] }]);
      setSchedule([{ day: "Pazartesi", time: "10:00" }]);
      setClasses([{ id: "c_1", name: "A Sınıfı", schedule: [] }]);
      setActiveTab("general");
    }
  };

  if (!isOpen) return null;

  const categories = categoryData.categories.map((c) => ({
    id: c.id,
    label: c.label,
    icon: <span className="text-xl" role="img" aria-label={c.label}>{c.emoji}</span>,
    color: c.color,
  }));

  // Helper functions for dynamic lists
  const handleListChange = (
    index: number,
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    const newList = [...list];
    newList[index] = value;
    setList(newList);
  };

  const addListItem = (
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    setList((prev) => [...prev, ""]);
  };

  const removeListItem = (
    index: number,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
  ) => {
    if (list.length > 1) {
      setList(list.filter((_, i) => i !== index));
    }
  };

  // Helper functions for Curriculum
  const addSection = () => {
    setSections([
      ...sections,
      { id: `sec_${Date.now()}`, title: `Ders ${sections.length + 1}`, lectures: [] },
    ]);
  };

  const updateSectionTitle = (id: string, newTitle: string) => {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, title: newTitle } : s)),
    );
  };

  const removeSection = (id: string) => {
    if (confirm("Bu seviyeyi silmek istediğinize emin misiniz?")) {
      setSections(sections.filter((s) => s.id !== id));
    }
  };

  const addLecture = (sectionId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            lectures: [
              ...s.lectures,
              { id: `lec_${Date.now()}`, title: "", duration: "" },
            ],
          };
        }
        return s;
      }),
    );
  };

  const updateLecture = (
    sectionId: string,
    lectureId: string,
    field: keyof Lecture,
    value: string,
  ) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            lectures: s.lectures.map((l) =>
              l.id === lectureId ? { ...l, [field]: value } : l,
            ),
          };
        }
        return s;
      }),
    );
  };

  const DAYS_OF_WEEK = [
    "Pazartesi",
    "Salı",
    "Çarşamba",
    "Perşembe",
    "Cuma",
    "Cumartesi",
    "Pazar",
  ];

  // Helper functions for Classes & Schedule
  const addClass = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const nextLetter = alphabet[classes.length] || String(classes.length + 1);
    setClasses([
      ...classes,
      {
        id: `c_${Date.now()}`,
        name: `${nextLetter} Sınıfı`,
        schedule: [{ day: "Pazartesi", time: "10:00" }],
      },
    ]);
  };

  const updateClassName = (id: string, name: string) => {
    setClasses(classes.map((c) => (c.id === id ? { ...c, name } : c)));
  };

  const removeClass = (id: string) => {
    if (classes.length > 1) {
      setClasses(classes.filter((c) => c.id !== id));
    }
  };

  const addClassScheduleItem = (classId: string) => {
    setClasses(
      classes.map((c) => {
        if (c.id === classId) {
          return {
            ...c,
            schedule: [...(c.schedule || []), { day: "Pazartesi", time: "10:00" }],
          };
        }
        return c;
      }),
    );
  };

  const updateClassScheduleItem = (
    classId: string,
    index: number,
    field: "day" | "time",
    value: string,
  ) => {
    setClasses(
      classes.map((c) => {
        if (c.id === classId) {
          const updatedSchedule = [...(c.schedule || [])];
          updatedSchedule[index] = {
            ...updatedSchedule[index],
            [field]: value,
          };
          return { ...c, schedule: updatedSchedule };
        }
        return c;
      }),
    );
  };

  const removeClassScheduleItem = (classId: string, index: number) => {
    setClasses(
      classes.map((c) => {
        if (c.id === classId) {
          return {
            ...c,
            schedule: (c.schedule || []).filter((_, i) => i !== index),
          };
        }
        return c;
      }),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedCategory) {
      alert("Lütfen en azından kurs başlığı ve kategorisini giriniz.");
      return;
    }

    // Curriculum will be edited in the dedicated roadmap builder page

    const category = categories.find((c) => c.id === selectedCategory);

    if (!initialData) {
      localStorage.removeItem(STORAGE_KEY);
    }

    onSave({
      title,
      category: selectedCategory,
      color: category?.color || "gray",
      description,
      learningOutcomes: learningOutcomes.filter((i) => i.trim()),
      requirements: requirements.filter((i) => i.trim()),
      curriculum: sections,
      price: Number(price) || 0,
      isLive,
      liveSessions: isLive ? liveSessions.filter((s) => s.date && s.time) : [],
      classes: classes,
      schedule: classes.flatMap((c) => c.schedule || []),
      start_date: startDate,
    });
  };

  return (
    <div className="fixed top-0 bottom-0 left-24 md:left-64 right-0 z-30 bg-[#F8F9FC] flex flex-col h-screen overflow-hidden animate-in fade-in duration-200">
      <div className="relative bg-[#F8F9FC] w-full h-full flex flex-col overflow-hidden border-none">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div>
            <h3 className="text-2xl font-black text-gray-800">
              {initialData ? "Kursu Düzenle" : "Yeni Kurs Oluştur"}
            </h3>
            <p className="text-gray-500 font-medium text-sm">
              Harika bir eğitim deneyimi tasarlayın
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!initialData && (
              <button
                onClick={clearDraft}
                className="px-4 py-2 text-xs font-black text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100 uppercase tracking-wider"
              >
                Taslağı Sıfırla
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 font-bold text-xs transition-colors flex items-center gap-2"
              title="Geri Dön"
            >
              <X className="w-4 h-4" /> Geri Dön
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-8 bg-gray-50">
          <form
            id="courseForm"
            onSubmit={handleSubmit}
            className="space-y-8 max-w-4xl mx-auto pb-12"
          >
            {/* BÖLÜM 1: GENEL BİLGİLER */}
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <h4 className="text-xl font-black text-gray-800 border-b border-gray-100 pb-4 flex items-center gap-3">
                  <Layout className="text-sky-500" size={22} />
                  Genel Bilgiler
                </h4>
                
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Kurs Başlığı <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Örn: Python ile Sıfırdan İleri Seviyeye Programlama"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all text-base"
                    required
                  />
                </div>

                {/* Kategoriler */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Kategori Seçin <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-3 ${selectedCategory === cat.id
                            ? "border-sky-500 bg-sky-50/50 text-sky-700 shadow-sm ring-2 ring-sky-400/20"
                            : "border-gray-100 bg-white hover:border-gray-200 text-gray-700"
                          }`}
                      >
                        <span className="text-2xl shrink-0">{cat.icon}</span>
                        <span className="font-bold text-sm text-gray-800 leading-snug">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Açıklama */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Kurs Açıklaması
                  </label>
                  <textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Bu kursta öğrenciler neler öğrenecek? Kursun içeriğini ve hedeflerini kısaca anlatın..."
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-gray-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all text-sm"
                  />
                </div>

                {/* Ücret & Tarih */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Kurs Ücreti (₺)
                    </label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      placeholder="0 (Ücretsiz ise 0 bırakın)"
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all text-base"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Tahmini Başlangıç Tarihi
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold text-gray-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all text-base"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* BÖLÜM 2: DETAYLAR & GEREKSİNİMLER */}
            <div className="space-y-6">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <h4 className="text-xl font-black text-gray-800 border-b border-gray-100 pb-4 flex items-center gap-3">
                  <List className="text-sky-500" size={22} />
                  Detaylar & Gereksinimler
                </h4>

                {/* Kazanımlar */}
                <div>
                  <h5 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    Kazanımlar (Öğrenciler Ne Öğrenecek?)
                  </h5>
                  <div className="space-y-3">
                    {learningOutcomes.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) =>
                            handleListChange(
                              idx,
                              e.target.value,
                              learningOutcomes,
                              setLearningOutcomes,
                            )
                          }
                          placeholder="Örn: Python ile veri analizi yapabileceksiniz"
                          className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-gray-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all text-sm"
                        />
                        {learningOutcomes.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeListItem(idx, learningOutcomes, setLearningOutcomes)
                            }
                            className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addListItem(setLearningOutcomes)}
                      className="text-sky-600 font-bold text-sm flex items-center gap-2 hover:bg-sky-50 px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <Plus size={16} /> Daha fazla madde ekle
                    </button>
                  </div>
                </div>

                {/* Gereksinimler */}
                <div className="pt-4">
                  <h5 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    Gereksinimler & Ön Koşullar
                  </h5>
                  <div className="space-y-3">
                    {requirements.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) =>
                            handleListChange(
                              idx,
                              e.target.value,
                              requirements,
                              setRequirements,
                            )
                          }
                          placeholder="Örn: Temel bilgisayar kullanımı bilgisi"
                          className="flex-1 px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl font-medium text-gray-800 focus:outline-none focus:bg-white focus:ring-4 focus:ring-sky-100 focus:border-sky-400 transition-all text-sm"
                        />
                        {requirements.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeListItem(idx, requirements, setRequirements)
                            }
                            className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                          >
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addListItem(setRequirements)}
                      className="text-sky-600 font-bold text-sm flex items-center gap-2 hover:bg-sky-50 px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <Plus size={16} /> Daha fazla madde ekle
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BÖLÜM 3: SINIFLAR & DERS SAATLERİ */}
            <div className="space-y-6 pb-12">
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                <h4 className="text-xl font-black text-gray-800 border-b border-gray-100 pb-4 flex items-center gap-3">
                  <Calendar className="text-sky-500" size={22} />
                  Sınıflar & Ders Programı
                </h4>

                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h5 className="text-base font-black text-gray-800">
                      Kurs Sınıfları ({classes.length})
                    </h5>
                    <button
                      type="button"
                      onClick={addClass}
                      className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-600 font-bold text-xs rounded-xl transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} /> Yeni Sınıf Ekle
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    {classes.map((cls, classIdx) => (
                      <div
                        key={cls.id}
                        className="p-6 bg-slate-50/70 border border-slate-200 rounded-3xl space-y-5"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <input
                            type="text"
                            value={cls.name}
                            onChange={(e) =>
                              updateClassName(cls.id, e.target.value)
                            }
                            placeholder="Sınıf Adı (Örn: A Şubesi)"
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl font-bold text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 text-sm flex-1"
                          />
                          {classes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeClass(cls.id)}
                              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>

                        {/* Ders Saatleri */}
                        <div className="space-y-3 pl-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              Ders Saatleri
                            </span>
                            <button
                              type="button"
                              onClick={() => addClassScheduleItem(cls.id)}
                              className="text-xs font-bold text-sky-600 hover:underline flex items-center gap-1"
                            >
                              <Plus size={14} /> Ders Saati Ekle
                            </button>
                          </div>

                          {(cls.schedule || []).map((sch, schIdx) => (
                            <div
                              key={schIdx}
                              className="flex flex-wrap items-center gap-3"
                            >
                              <select
                                value={sch.day}
                                onChange={(e) =>
                                  updateClassScheduleItem(
                                    cls.id,
                                    schIdx,
                                    "day",
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 text-xs"
                              >
                                {DAYS_OF_WEEK.map((d) => (
                                  <option key={d} value={d}>
                                    {d}
                                  </option>
                                ))}
                              </select>

                              <input
                                type="time"
                                value={sch.time}
                                onChange={(e) =>
                                  updateClassScheduleItem(
                                    cls.id,
                                    schIdx,
                                    "time",
                                    e.target.value,
                                  )
                                }
                                className="px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-gray-700 text-xs"
                              />

                              {(cls.schedule || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeClassScheduleItem(cls.id, schIdx)
                                  }
                                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-gray-100 bg-white flex justify-end items-center z-10 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`group relative overflow-hidden px-8 py-3.5 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-sky-200/50 active:scale-[0.98] transition-all duration-300 flex items-center gap-3 ${isSubmitting ? "opacity-90 cursor-not-allowed pr-10" : ""
              }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="tracking-wide text-sm">Kaydediliyor...</span>
              </div>
            ) : (
              <>
                <span className="text-sm">Kaydet</span>
                <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <Check size={14} />
                </div>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddCourseModal;
