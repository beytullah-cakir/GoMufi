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
      { id: `sec_${Date.now()}`, title: "", lectures: [] },
    ]);
  };

  const updateSectionTitle = (id: string, newTitle: string) => {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, title: newTitle } : s)),
    );
  };

  const removeSection = (id: string) => {
    if (
      confirm(
        "Bu bölümü ve içindeki dersleri silmek istediğinize emin misiniz?",
      )
    ) {
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

  const removeLecture = (sectionId: string, lectureId: string) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            lectures: s.lectures.filter((l) => l.id !== lectureId),
          };
        }
        return s;
      }),
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedCategory) {
      alert("Lütfen en azından kurs başlığı ve kategorisini giriniz.");
      return;
    }

    // Only validate sections if they are expected (not for builder-managed content)
    const isBuilderContent =
      initialData?.curriculum && !Array.isArray(initialData.curriculum);

    if (
      !isBuilderContent &&
      (!sections ||
        sections.length === 0 ||
        sections.every((s) => !s.title?.trim()))
    ) {
      alert("Lütfen en az bir ders (bölüm) başlığı giriniz.");
      return;
    }

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
      schedule: schedule.filter((s) => s.day && s.time),
      // instructorNotes removed as they are now managed via Lesson Builder JSON
    });
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-3xl w-full max-w-4xl h-[90vh] shadow-2xl overflow-hidden flex flex-col">
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
              className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-8">
          <button
            onClick={() => setActiveTab("general")}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "general"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Layout size={18} />
            Genel Bilgiler
          </button>
          <button
            onClick={() => setActiveTab("details")}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "details"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <List size={18} />
            Detaylar & Gereksinimler
          </button>
          <button
            onClick={() => setActiveTab("schedule")}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "schedule"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Calendar size={18} />
            Ders Saatleri
          </button>
          <button
            onClick={() => setActiveTab("curriculum")}
            className={`py-4 px-6 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "curriculum"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            <Layers size={18} />
            Müfredat
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
          <form
            id="courseForm"
            onSubmit={handleSubmit}
            className="space-y-8 max-w-3xl mx-auto"
          >
            {/* GENERAL TAB */}
            {activeTab === "general" && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Kurs Başlığı <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Örn: Sıfırdan İleri Seviye Python Programlama"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all text-lg"
                      autoFocus
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Kategori <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            selectedCategory === cat.id
                              ? "border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-500"
                              : "border-gray-100 bg-white hover:border-gray-300 text-gray-600"
                          }`}
                        >
                          <div
                            className={`p-2 rounded-lg ${
                              selectedCategory === cat.id ? `bg-sky-100 text-sky-600` : `bg-gray-100 text-gray-600`
                            }`}
                          >
                            {cat.icon}
                          </div>
                          <span className="text-sm font-bold">{cat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Kurs Açıklaması
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Kursunuzun içeriğini ve kimler için uygun olduğunu detaylıca anlatın..."
                      rows={6}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all resize-none"
                    />
                  </div>

                  {/* Pricing */}
                  <div className="pt-6 border-t border-gray-100">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Kurs Ücreti (TL)
                    </label>
                    <div className="relative max-w-[200px]">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">
                        ₺
                      </span>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) =>
                          setPrice(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="0"
                        min="0"
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-black text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2 font-bold italic">
                      * Ücretsiz yapmak için 0 bırakın.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* DETAILS TAB */}
            {activeTab === "details" && (
              <div className="space-y-8 animate-fade-in">
                {/* Learning Outcomes */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h4 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    Öğrenecekleriniz
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Öğrencilerin bu kursu tamamladıktan sonra kazanacağı
                    yetenekleri listeleyin.
                  </p>

                  <div className="space-y-3">
                    {learningOutcomes.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
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
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
                        />
                        {learningOutcomes.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              removeListItem(
                                idx,
                                learningOutcomes,
                                setLearningOutcomes,
                              )
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
                      className="text-sky-600 font-bold text-sm flex items-center gap-2 hover:bg-sky-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Plus size={16} /> Daha fazla madde ekle
                    </button>
                  </div>
                </div>

                {/* Requirements */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h4 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                    </div>
                    Gereksinimler
                  </h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Bu kursa başlamadan önce öğrencilerin sahip olması gereken
                    bilgi veya ekipmanlar.
                  </p>

                  <div className="space-y-3">
                    {requirements.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
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
                          placeholder="Örn: Temel bilgisayar kullanma becerisi"
                          className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400"
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
                      className="text-sky-600 font-bold text-sm flex items-center gap-2 hover:bg-sky-50 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Plus size={16} /> Daha fazla madde ekle
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* SCHEDULE TAB */}
            {activeTab === "schedule" && (
              <div className="space-y-6 animate-fade-in pb-20">
                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
                  <div className="flex items-center gap-5 mb-8">
                    <div className="w-14 h-14 bg-gradient-to-br from-sky-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-sky-200">
                      <Calendar size={28} />
                    </div>
                    <div>
                      <h4 className="text-2xl font-black text-gray-800">
                        Ders Programı
                      </h4>
                      <p className="text-sm text-gray-500 font-medium">
                        Haftalık canlı ders saatlerinizi planlayın
                      </p>
                    </div>
                  </div>

                  {/* Weekly Grid View */}
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                    {[
                      "Pazartesi",
                      "Salı",
                      "Çarşamba",
                      "Perşembe",
                      "Cuma",
                      "Cumartesi",
                      "Pazar",
                    ].map((day) => {
                      const daySlots = schedule.filter((s) => s.day === day);
                      return (
                        <div key={day} className="flex flex-col gap-3">
                          <div className="text-center py-2 bg-gray-100 rounded-xl">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                              {day}
                            </span>
                          </div>

                          <div className="space-y-2 min-h-[100px] p-2 rounded-2xl border-2 border-dashed border-gray-50 hover:border-sky-100 transition-colors">
                            {daySlots.map((slot, sIdx) => (
                              <div
                                key={sIdx}
                                className="group relative bg-white border border-gray-200 p-2 rounded-xl shadow-sm hover:shadow-md transition-all"
                              >
                                <div className="flex items-center justify-center gap-1">
                                  <input 
                                    type="text"
                                    maxLength={2}
                                    value={slot.time.split(":")[0]}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                      if (val === "" || Number(val) <= 23) {
                                        const actualIdx = schedule.indexOf(slot);
                                        const newS = [...schedule];
                                        const [_, m] = slot.time.split(":");
                                        newS[actualIdx].time = `${val}:${m}`;
                                        setSchedule(newS);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const actualIdx = schedule.indexOf(slot);
                                      const newS = [...schedule];
                                      const [h, m] = slot.time.split(":");
                                      newS[actualIdx].time = `${h.padStart(2, '0')}:${m}`;
                                      setSchedule(newS);
                                    }}
                                    className="w-7 text-center bg-transparent text-sm font-black text-sky-600 focus:outline-none placeholder-sky-200"
                                    placeholder="00"
                                  />
                                  <span className="text-sky-300 font-bold">:</span>
                                  <input 
                                    type="text"
                                    maxLength={2}
                                    value={slot.time.split(":")[1]}
                                    onChange={(e) => {
                                      const val = e.target.value.replace(/[^0-9]/g, '');
                                      if (val === "" || Number(val) <= 59) {
                                        const actualIdx = schedule.indexOf(slot);
                                        const newS = [...schedule];
                                        const [h, _] = slot.time.split(":");
                                        newS[actualIdx].time = `${h}:${val}`;
                                        setSchedule(newS);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      const actualIdx = schedule.indexOf(slot);
                                      const newS = [...schedule];
                                      const [h, m] = slot.time.split(":");
                                      newS[actualIdx].time = `${h}:${m.padStart(2, '0')}`;
                                      setSchedule(newS);
                                    }}
                                    className="w-7 text-center bg-transparent text-sm font-black text-sky-600 focus:outline-none placeholder-sky-200"
                                    placeholder="00"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSchedule(
                                      schedule.filter((s) => s !== slot),
                                    )
                                  }
                                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-sm"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() =>
                                setSchedule([
                                  ...schedule,
                                  { day, time: "10:00" },
                                ])
                              }
                              className="w-full py-3 rounded-xl border border-dashed border-gray-200 text-gray-400 hover:text-sky-500 hover:border-sky-200 hover:bg-sky-50 transition-all flex items-center justify-center"
                              title="Saat Ekle"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-10 p-6 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-[2rem] border border-sky-100 flex gap-5">
                    <div className="w-12 h-12 bg-white text-sky-500 rounded-2xl flex items-center justify-center shrink-0 shadow-sm">
                      <Info size={24} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-black text-sky-900 text-sm">
                        Takvim Senkronizasyonu
                      </h5>
                      <p className="text-sky-700 text-xs font-bold leading-relaxed opacity-80">
                        Burada belirlediğiniz saatler otomatik olarak eğitmen
                        takviminize işlenir. Öğrenciler kurs sayfasında bu
                        saatleri görerek randevu oluşturabilirler.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CURRICULUM TAB */}
            {activeTab === "curriculum" && (
              <div className="space-y-6 animate-fade-in pb-20">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-lg font-black text-gray-800">
                    Ders Programı
                  </h4>
                  <button
                    type="button"
                    onClick={addSection}
                    className="bg-gray-800 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors flex items-center gap-2"
                  >
                    <Plus size={16} /> Yeni Bölüm Ekle
                  </button>
                </div>

                {sections.map((section, sIdx) => (
                  <div
                    key={section.id}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                  >
                    {/* Section Header */}
                    <div className="bg-gray-50 p-4 border-b border-gray-200 flex items-center gap-3">
                      <span className="font-bold text-gray-400 text-sm">
                        Bölüm {sIdx + 1}:
                      </span>
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) =>
                            updateSectionTitle(section.id, e.target.value)
                          }
                          placeholder="Bölüm Başlığı (Örn: Giriş)"
                          className="flex-1 px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-800 focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Lectures */}
                    <div className="p-4 space-y-3">
                      {section.lectures?.map((lecture, lIdx) => (
                        <div
                          key={lecture.id}
                          className="flex items-center gap-3 pl-4 border-l-2 border-gray-100"
                        >
                          <span className="text-xs font-bold text-gray-300 w-6">
                            {lIdx + 1}.
                          </span>
                          <div className="flex-1 flex gap-3">
                            <input
                              type="text"
                              value={lecture.title}
                              onChange={(e) =>
                                updateLecture(
                                  section.id,
                                  lecture.id,
                                  "title",
                                  e.target.value,
                                )
                              }
                              placeholder="Ders Başlığı"
                              className="flex-[3] px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-sky-400"
                            />
                            <input
                              type="text"
                              value={lecture.duration}
                              onChange={(e) =>
                                updateLecture(
                                  section.id,
                                  lecture.id,
                                  "duration",
                                  e.target.value,
                                )
                              }
                              placeholder="Süre (dk)"
                              className="flex-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm font-medium text-gray-700 focus:outline-none focus:bg-white focus:border-sky-400"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              removeLecture(section.id, lecture.id)
                            }
                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => addLecture(section.id)}
                        className="ml-4 mt-2 text-sky-600 hover:text-sky-700 text-xs font-bold flex items-center gap-1 py-2"
                      >
                        <Plus size={14} /> Ders Ekle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </form>
        </div>

        {/* Footer / Actions */}
        <div className="p-6 border-t border-gray-100 bg-white flex justify-between items-center z-10">
          <div className="text-sm font-bold text-gray-400">
            {activeTab === "general"
              ? "1/4 Genel Bilgiler"
              : activeTab === "details"
                ? "2/4 Detaylar"
                : activeTab === "schedule"
                  ? "3/4 Ders Saatleri"
                  : "4/4 Müfredat"}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors"
            >
              İptal
            </button>

            {activeTab !== "curriculum" ? (
              <button
                type="button"
                onClick={() =>
                  setActiveTab(
                    activeTab === "general"
                      ? "details"
                      : activeTab === "details"
                        ? "schedule"
                        : "curriculum",
                  )
                }
                className="px-6 py-3 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-xl transition-colors flex items-center gap-2"
              >
                Sonraki Adım <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`group relative overflow-hidden px-8 py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-sky-200/50 active:scale-[0.98] transition-all duration-300 flex items-center gap-3 ${
                  isSubmitting ? "opacity-90 cursor-not-allowed pr-10" : ""
                }`}
              >
                {isSubmitting ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="relative flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <div className="absolute w-5 h-5 border-2 border-white/10 rounded-full" />
                      </div>
                      <span className="tracking-wide">Kaydediliyor...</span>
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1 bg-white/20 animate-pulse" />
                  </>
                ) : (
                  <>
                    <span>
                      {initialData ? "Değişiklikleri Kaydet" : "Kursu Oluştur"}
                    </span>
                    {!initialData && (
                      <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Plus size={14} />
                      </div>
                    )}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddCourseModal;
