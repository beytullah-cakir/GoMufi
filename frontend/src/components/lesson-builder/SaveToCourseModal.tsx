import React, { useState, useEffect } from "react";
import { X, Search, BookOpen, CheckCircle2, Loader2, AlertCircle, Save, Type } from "lucide-react";
import api from "../../api";

interface Course {
  id: number | string;
  title: string;
  category: string;
}

interface SaveToCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  slides: any[];
  initialCourseId?: number | string;
  courseTitle?: string;
}

const SaveToCourseModal: React.FC<SaveToCourseModalProps> = ({ isOpen, onClose, slides, initialCourseId, courseTitle }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | string | null>(initialCourseId || null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [title, setTitle] = useState(courseTitle || "");

  useEffect(() => {
    if (courseTitle) setTitle(courseTitle);
  }, [courseTitle]);

  useEffect(() => {
    if (isOpen) {
      fetchCourses();
      if (initialCourseId) setSelectedCourseId(initialCourseId);
    }
  }, [isOpen, initialCourseId]);

  const fetchCourses = async () => {
    setIsLoading(true);
    setSaveStatus("idle");
    try {
      const response = await api.get("/teacher/content");
      setCourses(response.data);
    } catch (error) {
      console.error("Error fetching courses", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedCourseId) return;

    setIsSaving(true);
    setSaveStatus("idle");
    try {
      // API call to update course curriculum
      await api.put(`/update_course/${selectedCourseId}`, {
        curriculum: {
          noteTitle: title,
          slides: slides
        }
      });
      setSaveStatus("success");
      // Clear Lesson Builder draft from localStorage on successful save
      localStorage.removeItem("gomufi_lesson_builder_draft");
      
      setTimeout(() => {
        onClose();
        setSaveStatus("idle");
      }, 1500);
    } catch (error) {
      console.error("Error saving curriculum", error);
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const filteredCourses = courses.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-sky-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-sky-100">
              <Save className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800">Derse Kaydet</h2>
              <p className="text-sm text-gray-500 font-bold tracking-tight">Bu çalışmayı hangi derse kaydetmek istersiniz?</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 flex-1 overflow-hidden flex flex-col gap-4">
          
          {/* Lesson Title Input */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Ders Notu Başlığı</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Type className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-3.5 border-2 border-indigo-50 rounded-2xl leading-5 bg-indigo-50/30 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-black text-lg"
                placeholder="Ders notuna bir isim verin..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
          </div>

          <div className="h-px bg-gray-100 my-2"></div>

          {/* Search */}
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Kursa Kaydet</label>
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-sky-500 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-11 pr-4 py-3 border-2 border-gray-100 rounded-2xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-4 focus:ring-sky-50 focus:border-sky-400 transition-all font-bold"
                placeholder="Ders ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Course List */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-sky-500" />
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Derslerin yükleniyor...</p>
              </div>
            ) : filteredCourses.length > 0 ? (
              <div className="grid gap-3">
                {filteredCourses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => setSelectedCourseId(course.id)}
                    className={`flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      selectedCourseId === course.id
                        ? "bg-sky-50 border-sky-400 shadow-md shadow-sky-100"
                        : "bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                      selectedCourseId === course.id ? "bg-sky-500 text-white" : "bg-gray-100 text-gray-400"
                    }`}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="text-left flex-1">
                      <p className={`font-black tracking-tight ${selectedCourseId === course.id ? "text-sky-900" : "text-gray-800"}`}>
                        {course.title}
                      </p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                        {course.category}
                      </p>
                    </div>
                    {selectedCourseId === course.id && (
                      <CheckCircle2 className="w-6 h-6 text-sky-500 animate-in zoom-in" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                <AlertCircle className="w-10 h-10 text-gray-300" />
                <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Ders bulunamadı.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex-1 pr-4">
            {saveStatus === "success" && (
              <div className="flex items-center gap-2 text-green-600 animate-in slide-in-from-left">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-black uppercase tracking-tight">Başarıyla Kaydedildi!</span>
              </div>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-2 text-red-600 animate-in slide-in-from-left">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm font-black uppercase tracking-tight">Kaydetme Hatası.</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 font-black text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-2xl transition-all uppercase tracking-widest text-xs"
            >
              İptal
            </button>
            <button
              onClick={handleSave}
              disabled={!selectedCourseId || isSaving || saveStatus === "success"}
              className={`flex items-center gap-3 px-8 py-3 font-black rounded-2xl transition-all uppercase tracking-widest text-xs shadow-lg ${
                !selectedCourseId || isSaving || saveStatus === "success"
                  ? "bg-gray-200 text-gray-400 shadow-none cursor-not-allowed"
                  : "bg-sky-500 text-white hover:bg-sky-600 shadow-sky-100 hover:scale-105 active:scale-95"
              }`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Kaydediliyor...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>Kaydet</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SaveToCourseModal;
