import { 
  X, CheckCircle, Info, BookOpen, Users, Star, Clock, 
  ChevronRight, Target, Award, List, FileJson, Download, Edit3
} from "lucide-react";
import { useNavigate } from "react-router-dom";

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
    curriculum?: any[];
    instructor?: string;
    instructor_notes?: { title: string; type: string }[];
  } | null;
  mode: 'student' | 'instructor';
}

const CourseInfoModal: React.FC<CourseInfoModalProps> = ({ isOpen, onClose, onEdit, course, mode }) => {
  const navigate = useNavigate();
  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
        
        {/* Header Section */}
        <div className="relative p-8 pb-6 border-b border-gray-100 overflow-hidden">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-100 rounded-full blur-3xl opacity-30 -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-20 -ml-32 -mb-32"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-3xl font-black text-gray-800 leading-tight mb-2 tracking-tight mt-4">
                {course.title}
              </h2>
              <p className="text-gray-500 font-bold flex items-center gap-2">
                <Users size={18} className="text-gray-400" />
                <span>{course.instructor || ""}</span>
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-3 hover:bg-gray-100 rounded-2xl transition-all text-gray-400 hover:text-gray-600 hover:rotate-90"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Stats Bar (Instructor Mode or Detailed) */}
          <div className="relative z-10 flex items-center gap-8 mt-6 py-4 px-6 bg-gray-50/50 rounded-2xl border border-gray-100">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Öğrenciler</span>
                <span className="text-sm font-black text-gray-800">{course.students || 0}</span>
             </div>
             <div className="w-px h-8 bg-gray-200"></div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Puan</span>
                <div className="flex items-center gap-1">
                  <Star size={14} className="text-yellow-400 fill-current" />
                  <span className="text-sm font-black text-gray-800">{course.rating || "4.8"}</span>
                </div>
             </div>
             <div className="w-px h-8 bg-gray-200"></div>
             <div className="flex flex-col text-right ml-auto">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kurs Ücreti</span>
                <span className="text-sm font-black text-sky-600">₺{course.price || 0}</span>
             </div>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-8 pt-6 space-y-10 custom-scrollbar">
          
          {/* Description */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-sky-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-100">
                <Info size={18} />
              </div>
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Kurs Hakkında</h3>
            </div>
            <div className="text-gray-600 font-bold leading-relaxed text-sm bg-gray-50/50 p-6 rounded-3xl border border-gray-100">
              {course.description || "Bu kurs için henüz bir açıklama girilmemiş."}
            </div>
          </section>

          {/* Grid: Outcomes & Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Outcomes */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-green-100">
                  <Target size={18} />
                </div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Kazanımlar</h3>
              </div>
              <div className="space-y-3">
                {course.learning_outcomes && course.learning_outcomes.length > 0 ? (
                  course.learning_outcomes.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 bg-white border border-gray-100 rounded-2xl hover:border-green-200 transition-colors group">
                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold text-gray-600">{item}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic ml-2">Girilmemiş.</p>
                )}
              </div>
            </section>

            {/* Requirements */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-100">
                  <Award size={18} />
                </div>
                <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">Gereksinimler</h3>
              </div>
              <div className="space-y-3">
                {course.requirements && course.requirements.length > 0 ? (
                  course.requirements.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start p-3 bg-white border border-gray-100 rounded-2xl hover:border-orange-200 transition-colors group">
                      <ChevronRight className="w-5 h-5 text-orange-400 shrink-0 group-hover:translate-x-1 transition-transform" />
                      <span className="text-sm font-bold text-gray-600">{item}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs font-bold text-gray-400 italic ml-2">Ön koşul belirtilmemiş.</p>
                )}
              </div>
            </section>
          </div>

          {/* Curriculum Preview */}
          <section className="pb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-100">
                <BookOpen size={18} />
              </div>
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">Müfredat Özeti</h3>
            </div>
            <div className="border-2 border-gray-100 rounded-[2rem] overflow-hidden">
              {course.curriculum && course.curriculum.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {course.curriculum.filter(s => s.type !== "live_sessions_config").map((section, idx) => (
                    <div key={idx} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400">
                          <List size={20} />
                        </div>
                        <div>
                          <p className="font-black text-gray-800 text-sm">{section.title || `Bölüm ${idx + 1}`}</p>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                            {(section.lectures?.length || section.lessons?.length || 0)} Ders Mevcut
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <p className="text-sm font-bold text-gray-400 italic uppercase tracking-widest">Henüz içerik eklenmemiş.</p>
                </div>
              )}
            </div>
          </section>

          {/* Builder Content Section */}
          <section className="pb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
                {mode === 'instructor' ? <FileJson size={18} /> : <Download size={18} />}
              </div>
              <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                {mode === 'instructor' ? "Ders İçeriği (JSON)" : "Ders Notları (PDF)"}
              </h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div 
                onClick={() => {
                  if (mode === 'instructor') {
                    onClose();
                    navigate(`/instructor/builder?courseId=${course.id}`);
                  } else {
                    // PDF Download logic handled in CourseDetailPage
                    // For now, show a placeholder or alert
                    alert("PDF indirme özelliği yakında!");
                  }
                }}
                className={`flex items-center justify-between p-5 ${mode === 'instructor' ? 'bg-indigo-50/50 border-indigo-200' : 'bg-pink-50/50 border-pink-200'} border-2 border-dashed rounded-2xl hover:bg-white transition-all cursor-pointer group`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-white rounded-xl flex items-center justify-center ${mode === 'instructor' ? 'text-indigo-600' : 'text-pink-600'} shadow-sm border border-indigo-100 group-hover:scale-110 transition-transform`}>
                    {mode === 'instructor' ? <FileJson size={24} /> : <Download size={24} />}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">
                      {mode === 'instructor' ? "kurs_icerigi.json" : "ders_notlari.pdf"}
                    </h4>
                    <p className={`text-xs font-bold ${mode === 'instructor' ? 'text-indigo-500' : 'text-pink-500'} uppercase tracking-widest mt-1`}>
                      {mode === 'instructor' ? "Ders Oluşturucu Dosyası" : "İndirmek için tıklayın"}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 ${mode === 'instructor' ? 'text-indigo-600' : 'text-pink-600'} font-black text-xs uppercase tracking-widest`}>
                  {mode === 'instructor' ? <><Edit3 size={16} /> Düzenle</> : <><Download size={16} /> İndir</>}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-gray-100 bg-gray-50 flex items-center justify-center gap-4">
          {mode === 'instructor' && onEdit && (
            <button 
              onClick={() => {
                onClose();
                onEdit();
              }}
              className="px-8 py-4 bg-white border-2 border-gray-900 text-gray-900 font-black rounded-3xl transition-all hover:bg-gray-50 active:scale-95 uppercase tracking-widest text-xs"
            >
              Düzenle
            </button>
          )}
          <button 
            onClick={onClose}
            className="px-12 py-4 bg-gray-900 text-white font-black rounded-3xl shadow-xl shadow-gray-200 transition-all hover:scale-105 active:scale-95 uppercase tracking-widest text-xs"
          >
            Harika, Anladım!
          </button>
        </div>

      </div>
    </div>
  );
};

export default CourseInfoModal;
