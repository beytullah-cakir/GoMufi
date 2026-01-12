import React, { useState } from "react";
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
} from "lucide-react";

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
}

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: CourseData) => void;
  initialData?: Partial<CourseData> | null;
  isSubmitting?: boolean;
}

const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSubmitting = false,
}) => {
  const [activeTab, setActiveTab] = useState<
    "general" | "details" | "curriculum"
  >("general");

  // General State
  const [title, setTitle] = useState(initialData?.title || "");
  const [selectedCategory, setSelectedCategory] = useState(
    initialData?.category || ""
  );
  const [description, setDescription] = useState(
    initialData?.description || ""
  );

  // Details State
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(
    initialData?.learningOutcomes?.length ? initialData.learningOutcomes : [""]
  );
  const [requirements, setRequirements] = useState<string[]>(
    initialData?.requirements?.length ? initialData.requirements : [""]
  );

  // Curriculum State
  const [sections, setSections] = useState<Section[]>(
    initialData?.curriculum?.length
      ? initialData.curriculum
      : [{ id: "str_1", title: "Giriş", lectures: [] }]
  );

  if (!isOpen) return null;

  const categories = [
    { id: "coding", label: "Yazılım", icon: <Code size={20} />, color: "blue" },
    {
      id: "web",
      label: "Web Geliştirme",
      icon: <Globe size={20} />,
      color: "purple",
    },
    {
      id: "design",
      label: "Tasarım",
      icon: <Palette size={20} />,
      color: "orange",
    },
    { id: "music", label: "Müzik", icon: <Music size={20} />, color: "red" },
    { id: "other", label: "Diğer", icon: <Book size={20} />, color: "gray" },
  ];

  // Helper functions for dynamic lists
  const handleListChange = (
    index: number,
    value: string,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    const newList = [...list];
    newList[index] = value;
    setList(newList);
  };

  const addListItem = (
    setList: React.Dispatch<React.SetStateAction<string[]>>
  ) => {
    setList((prev) => [...prev, ""]);
  };

  const removeListItem = (
    index: number,
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>
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
      sections.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
  };

  const removeSection = (id: string) => {
    if (
      confirm(
        "Bu bölümü ve içindeki dersleri silmek istediğinize emin misiniz?"
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
      })
    );
  };

  const updateLecture = (
    sectionId: string,
    lectureId: string,
    field: keyof Lecture,
    value: string
  ) => {
    setSections(
      sections.map((s) => {
        if (s.id === sectionId) {
          return {
            ...s,
            lectures: s.lectures.map((l) =>
              l.id === lectureId ? { ...l, [field]: value } : l
            ),
          };
        }
        return s;
      })
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
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedCategory) {
      alert("Lütfen en azından kurs başlığı ve kategorisini giriniz.");
      return;
    }

    const category = categories.find((c) => c.id === selectedCategory);

    onSave({
      title,
      category: selectedCategory,
      color: category?.color || "gray",
      description,
      learningOutcomes: learningOutcomes.filter((i) => i.trim()),
      requirements: requirements.filter((i) => i.trim()),
      curriculum: sections,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in">
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
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
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
                            className={`p-2 rounded-lg bg-${cat.color}-100 text-${cat.color}-600`}
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
                              setLearningOutcomes
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
                                setLearningOutcomes
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
                              setRequirements
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
                      {section.lectures.map((lecture, lIdx) => (
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
                                  e.target.value
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
                                  e.target.value
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
              ? "1/3 Genel Bilgiler"
              : activeTab === "details"
              ? "2/3 Detaylar"
              : "3/3 Müfredat"}
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
                    activeTab === "general" ? "details" : "curriculum"
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
                className={`px-8 py-3 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl shadow-lg shadow-sky-200 active:scale-95 transition-all ${
                  isSubmitting ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Kaydediliyor...
                  </div>
                ) : initialData ? (
                  "Değişiklikleri Kaydet"
                ) : (
                  "Kursu Oluştur"
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
