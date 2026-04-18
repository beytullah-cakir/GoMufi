import React, { useEffect, useState } from "react";
import { 
  Star, 
  CheckCircle, 
  PlayCircle, 
  FileText, 
  Clock, 
  Globe, 
  ChevronDown, 
  ChevronUp,
  Download,
  Lock
} from "lucide-react";
import api from "../../api";

interface CourseDetail {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  learning_outcomes: string[];
  requirements: string[];
  curriculum: any[];
  teacher?: {
    first_name: string;
    last_name: string;
  };
}

interface CourseDetailPageProps {
  courseId: number;
  onBack: () => void;
  isEnrolled: boolean;
  onEnroll: (courseId: number) => Promise<void>;
}

const CourseDetailPage: React.FC<CourseDetailPageProps> = ({ 
  courseId, 
  onBack, 
  isEnrolled,
  onEnroll 
}) => {
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  useEffect(() => {
    const fetchCourseDetail = async () => {
      try {
        const response = await api.get(`/courses/${courseId}`);
        setCourse(response.data);
      } catch (error) {
        console.warn("Backend verisi alınamadı, örnek veri gösteriliyor.");
        // Fallback mock data for development
        setCourse({
          id: courseId,
          title: "Python ile Veri Bilimi ve Programlama",
          description: "Bu kapsamlı kursta Python programlama dilini sıfırdan öğrenecek, Pandas, Numpy ve Matplotlib gibi kütüphanelerle veri analizi yapmayı keşfedeceksiniz. Kurs sonunda gerçek bir veri bilimci gibi projeler üretebileceksiniz.",
          category: "Yazılım",
          price: 299,
          learning_outcomes: [
            "Python dilinin temellerini ve ileri seviye özelliklerini öğrenme",
            "Veri analizi için Pandas ve Numpy kullanımında uzmanlaşma",
            "Matplotlib ile etkileyici veri görselleştirmeleri oluşturma",
            "Gerçek dünya verileriyle projeler geliştirme"
          ],
          requirements: [
            "Temel bilgisayar kullanımı bilgisi",
            "Herhangi bir programlama geçmişine gerek yoktur"
          ],
          curriculum: [
            {
              title: "Giriş ve Kurulumlar",
              lessons: [{ title: "Python Nedir?" }, { title: "Python Kurulumu (Anaconda vs. Pip)" }]
            },
            {
              title: "Değişkenler ve Temel Veri Yapıları",
              lessons: [{ title: "Numbers & Strings" }, { title: "Lists & Dictionaries" }]
            }
          ],
          teacher: { first_name: "Mufi", last_name: "Bilgin" }
        });
      } finally {
        setLoading(false);
      }

    };
    fetchCourseDetail();
  }, [courseId]);

  const handleDownloadPDF = () => {
    if (!course || !course.curriculum) return;

    // Use global jsPDF from CDN
    // @ts-ignore
    const { jsPDF } = window.jspdf;
    if (!course?.curriculum) return;
    const curriculum = course.curriculum;
    const slides = Array.isArray(curriculum) ? curriculum : (curriculum.slides || []);
    const pdfTitle = (!Array.isArray(curriculum) && curriculum.noteTitle) ? curriculum.noteTitle : course.title;

    const doc = new window.jspdf.jsPDF();
    
    // Title
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(pdfTitle, 20, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, 20, 30);
    
    doc.setLineWidth(0.5);
    doc.line(20, 35, 190, 35);

    let yOffset = 45;

    // Extract notes from curriculum
    
    slides.forEach((slide: any, index: number) => {
      if (yOffset > 270) {
        doc.addPage();
        yOffset = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(63, 63, 191); // Purple
      doc.text(`Bölüm/Slayt ${index + 1}`, 20, yOffset);
      yOffset += 10;

      const elements = slide.elements || [];
      elements.forEach((el: any) => {
        if (el.type === 'text' || el.type === 'sticky') {
          if (yOffset > 270) {
            doc.addPage();
            yOffset = 20;
          }
          doc.setFontSize(11);
          doc.setTextColor(60, 60, 60);
          
          // Wrap text
          const splitText = doc.splitTextToSize(el.content || "", 160);
          doc.text(splitText, 25, yOffset);
          yOffset += (splitText.length * 6) + 5;
        }
      });
      
      yOffset += 10;
    });

    doc.save(`${title.replace(/\s+/g, '_')}_notlari.pdf`);
  };

  const toggleSection = (index: number) => {
    if (expandedSections.includes(index)) {
      setExpandedSections(expandedSections.filter(i => i !== index));
    } else {
      setExpandedSections([...expandedSections, index]);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );

  if (!course) return (
    <div className="p-8 text-center">
      <h2 className="text-2xl font-bold text-gray-800">Kurs bulunamadı.</h2>
      <button onClick={onBack} className="mt-4 text-purple-600 font-bold hover:underline">
        Geri Dön
      </button>
    </div>
  );

  const instructorName = course.teacher 
    ? `${course.teacher.first_name} ${course.teacher.last_name}` 
    : "Eğitmen";

  return (
    <div className="bg-white min-h-screen pb-20 font-sans">
      {/* Dark Header Section (Udemy Style) */}
      <div className="bg-[#2d2f31] text-white py-12 px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-12">
          <div className="flex-1">
            <nav className="flex text-sm font-bold text-purple-400 mb-4 gap-2">
              <span>{course.category}</span>
              <span>›</span>
              <span className="text-white opacity-80">{course.title}</span>
            </nav>
            <h1 className="text-4xl font-black mb-4 leading-tight">
              {course.title}
            </h1>
            <p className="text-xl mb-6 opacity-90 leading-relaxed max-w-3xl">
              {course.description.substring(0, 150)}...
            </p>
            
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                <span className="text-yellow-400 font-black text-lg">4.8</span>
                <div className="flex text-yellow-400">
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <Star className="w-4 h-4 fill-yellow-400" />
                  <Star className="w-4 h-4 fill-yellow-400 opacity-50" />
                </div>
              </div>
              <span className="text-purple-300 underline font-medium cursor-pointer">(12,450 puan)</span>
              <span className="opacity-80">45,890 öğrenci</span>
            </div>

            <div className="text-sm">
              Oluşturan <span className="text-purple-400 underline font-bold cursor-pointer">{instructorName}</span>
            </div>
            
            <div className="flex items-center gap-6 mt-4 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>Son güncelleme 03/2026</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>Türkçe</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content & Sticky Sidebar Container */}
      <div className="max-w-6xl mx-auto px-8 mt-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column: Details */}
        <div className="lg:col-span-2 space-y-12">
          
          {/* Back Button */}
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-purple-600 font-bold hover:bg-purple-50 px-4 py-2 rounded-lg transition-colors border border-purple-100"
          >
            ← Kurslara Geri Dön
          </button>

          {/* Learning Outcomes */}
          <div className="border border-gray-200 rounded-xl p-8 bg-gray-50/50">
            <h2 className="text-2xl font-black mb-6 text-gray-900 uppercase tracking-tight">Öğrenecekleriniz</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(course.learning_outcomes && course.learning_outcomes.length > 0) ? (
                course.learning_outcomes.map((outcome, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <CheckCircle className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
                    <span className="text-gray-700 leading-snug">{outcome}</span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">Öğrenim kazanımları henüz eklenmedi.</div>
              )}
            </div>
          </div>

          {/* Curriculum Section */}
          <div>
            <h2 className="text-2xl font-black mb-6 text-gray-900 uppercase tracking-tight">Kurs Müfredatı</h2>
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              {(() => {
                const rawCurriculum = course.curriculum || [];
                const activeCurriculum = Array.isArray(rawCurriculum)
                  ? rawCurriculum
                  : (rawCurriculum ? [rawCurriculum] : []);
                
                const standardSections = activeCurriculum.filter(s => 
                  s.type !== "live_sessions_config" && !s.slides && !s.noteTitle
                );

                if (standardSections.length > 0) {
                  return standardSections.map((section, index) => (
                    <div key={index} className="border-b border-gray-200 last:border-0">
                      <button 
                        onClick={() => toggleSection(index)}
                        className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {expandedSections.includes(index) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          <span className="font-bold text-gray-800">{section.title || `Bölüm ${index + 1}`}</span>
                        </div>
                        <span className="text-sm text-gray-500">{(section.lessons?.length || section.lectures?.length || 0)} ders</span>
                      </button>
                      {expandedSections.includes(index) && (
                        <div className="bg-white p-2">
                          {(section.lessons || section.lectures)?.map((lesson: any, li: number) => (
                            <div key={li} className="flex items-center justify-between p-3 hover:bg-purple-50 rounded-lg group cursor-pointer transition-colors">
                              <div className="flex items-center gap-3">
                                <PlayCircle className="w-4 h-4 text-gray-400 group-hover:text-purple-600" />
                                <span className="text-gray-700 font-medium">{lesson.title || `Ders ${li + 1}`}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                }

                return <div className="p-8 text-center text-gray-500 italic">Müfredat bilgisi bulunmuyor.</div>;
              })()}
            </div>
          </div>

          {/* Builder Notes Section */}
          <div>
            <h2 className="text-2xl font-black mb-6 text-gray-900 uppercase tracking-tight">İnteraktif Ders Notları</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(() => {
                const notes = (course as any).notes || [];

                if (notes.length > 0) {
                  return notes.map((note: any, index: number) => (
                    <div key={index} className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h4 className="font-black text-gray-800 group-hover:text-amber-600 transition-colors">{note.noteTitle || `Not ${index + 1}`}</h4>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{note.slides?.length || 0} İnteraktif Slayt</p>
                        </div>
                      </div>
                      <button className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-colors shadow-lg shadow-amber-100">
                        İncele
                      </button>
                    </div>
                  ));
                }

                return <div className="col-span-2 p-8 text-center text-gray-400 italic border-2 border-dashed border-gray-100 rounded-2xl">Henüz not eklenmemiş.</div>;
              })()}
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-2xl font-black mb-4 text-gray-900 uppercase tracking-tight">Kurs Açıklaması</h2>
            <div className="text-gray-700 leading-relaxed space-y-4 prose max-w-none">
              {course.description}
            </div>
          </div>

          {/* PDF Download Section */}
          <div className={`p-8 rounded-2xl border-2 transition-all ${isEnrolled ? 'border-indigo-200 bg-indigo-50/30' : 'border-dashed border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${isEnrolled ? 'bg-indigo-500' : 'bg-gray-400'} rounded-xl flex items-center justify-center text-white shadow-lg`}>
                  <FileText size={20} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Ders Notları & Kaynaklar</h2>
              </div>
              {!isEnrolled && <Lock className="w-6 h-6 text-gray-400" />}
            </div>
            
            {isEnrolled ? (
              <div className="space-y-4">
                <div 
                  onClick={handleDownloadPDF}
                  className="flex items-center justify-between p-6 bg-white border border-indigo-100 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                      <Download size={28} />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-800 text-lg group-hover:text-indigo-700">ders_notlari.pdf</h4>
                      <p className="text-xs font-black text-indigo-400 uppercase tracking-widest mt-1">Tüm ders içeriklerini PDF olarak indir</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 group-hover:bg-indigo-700 transition-colors">
                    <Download size={16} />
                    İndir
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center bg-white/50 rounded-3xl border-2 border-dashed border-gray-100">
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Notları indirmek için kursa kayıt olmalısınız.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sticky Purchase Sidebar */}
        <div className="hidden lg:block relative">
          <div className="sticky top-28 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden">
            {/* Visual Thumbnail / Video Preview Placeholder */}
            <div className="aspect-video bg-gray-900 flex items-center justify-center relative group cursor-pointer">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
              <PlayCircle className="w-16 h-16 text-white z-10 drop-shadow-lg opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-bold text-sm z-10">Önizlemeyi İzle</div>
            </div>

            <div className="p-6">
              {/* Price Section */}
              <div className="space-y-1 mb-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-gray-900">
                    {course.price > 0 ? `₺${course.price}` : "Ücretsiz"}
                  </span>
                  {course.price > 0 && (
                    <>
                      <span className="text-gray-400 line-through text-lg">₺{(course.price * 5.5).toFixed(0)}</span>
                      <span className="text-gray-800 font-bold bg-yellow-400 px-2 py-0.5 rounded text-sm">%82 İndirim</span>
                    </>
                  )}
                </div>
                {course.price > 0 && (
                  <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                    <Clock className="w-4 h-4" />
                    <span>Bu fiyattan yararlanmak için son 5 saat!</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 mb-6">
                {!isEnrolled ? (
                  <>
                    <button 
                      onClick={() => onEnroll(course.id)}
                      className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-lg text-lg transition-all shadow-lg active:scale-95"
                    >
                      Şimdi Kayıt Ol
                    </button>
                    <button className="w-full py-3.5 border-2 border-gray-900 hover:bg-gray-50 text-gray-900 font-black rounded-lg text-lg transition-all">
                      Sepete Ekle
                    </button>
                  </>
                ) : (
                  <button className="w-full py-4 bg-green-600 text-white font-black rounded-lg text-lg flex items-center justify-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    Kayıt Oldunuz
                  </button>
                )}
              </div>

              <p className="text-center text-[11px] text-gray-500 font-medium mb-8">
                30 Gün İçinde Para İade Garantisi
              </p>

              {/* Course Features List */}
              <div className="space-y-4">
                <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider">Bu kursun içeriği:</h4>
                <div className="space-y-3.5 text-sm text-gray-700">
                  <div className="flex items-center gap-3">
                    <PlayCircle className="w-4 h-4 text-gray-400" />
                    <span>45 saat uzunluğunda isteğe bağlı video</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>12 makale ve 25 indirilebilir kaynak</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <span>Ömür boyu tam erişim</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Globe className="w-4 h-4 text-gray-400" />
                    <span>Mobil ve TV'den erişim</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Star className="w-4 h-4 text-gray-400" />
                    <span>Bitirme sertifikası</span>
                  </div>
                </div>
              </div>

              {/* Share/Coupon Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between gap-4">
                <button className="flex-1 text-sm font-bold text-gray-900 underline hover:text-purple-600">Paylaş</button>
                <button className="flex-1 text-sm font-bold text-gray-900 underline hover:text-purple-600">Hediye Et</button>
                <button className="flex-1 text-sm font-bold text-gray-900 underline hover:text-purple-600">Kupon Uygula</button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CourseDetailPage;
