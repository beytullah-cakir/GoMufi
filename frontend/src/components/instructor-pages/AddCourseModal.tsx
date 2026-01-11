import React, { useState } from "react";
import { X, Book, Code, Globe, Music, Palette } from "lucide-react";

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (courseData: {
    title: string;
    category: string;
    color: string;
  }) => void;
  isSubmitting?: boolean;
  initialData?: { title: string; category: string; color: string } | null;
}

const AddCourseModal: React.FC<AddCourseModalProps> = ({
  isOpen,
  onClose,
  onSave,
  isSubmitting,
  initialData,
}) => {
  const [title, setTitle] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Pre-fill data when modal opens with initialData
  React.useEffect(() => {
    if (isOpen && initialData) {
      setTitle(initialData.title);
      setSelectedCategory(initialData.category);
    } else if (isOpen && !initialData) {
      // Reset if opening in "Add" mode
      setTitle("");
      setSelectedCategory("");
    }
  }, [isOpen, initialData]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedCategory || isSubmitting) return;

    const category = categories.find((c) => c.id === selectedCategory);

    onSave({
      title,
      category: selectedCategory,
      color: category?.color || "gray",
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden relative">
        <div className="px-6 pt-6 flex justify-between items-center">
          <h3 className="text-xl font-black text-gray-800">
            {initialData ? "Kursu Düzenle" : "Yeni Kurs Ekle"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Kurs Başlığı
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              placeholder="Örn: Python ile Veri Bilimi"
              className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Kategori (Renk/İkon)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    selectedCategory === cat.id
                      ? "border-sky-500 bg-sky-50 text-sky-700 ring-1 ring-sky-500"
                      : "border-gray-100 bg-white hover:border-gray-300 text-gray-600"
                  } ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
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

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className={`flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors ${
                isSubmitting ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={!title || !selectedCategory || isSubmitting}
              className={`flex-1 py-3 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                !title || !selectedCategory || isSubmitting
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-sky-500 hover:bg-sky-600 text-white shadow-sky-200 active:scale-95"
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>İşleniyor...</span>
                </>
              ) : initialData ? (
                "Kaydet"
              ) : (
                "Oluştur"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCourseModal;
