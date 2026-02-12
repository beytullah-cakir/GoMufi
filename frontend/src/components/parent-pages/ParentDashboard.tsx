import React from "react";
import {
  Star,
  TrendingUp,
  Calendar,
  CreditCard,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Award,
} from "lucide-react";

interface ParentDashboardProps {
  userData?: any;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ userData }) => {
  const welcomeName = userData?.first_name
    ? `Sayın ${userData.first_name} ${userData.last_name || ""}`
    : "Sayın Veli";

  const students = userData?.students || [];
  const studentText =
    students.length > 0
      ? students.length === 1
        ? students[0].first_name || students[0].nickname || "Öğrenciniz"
        : `${students[0].first_name || students[0].nickname} ve ${students.length - 1} diğer çocuğunuz`
      : "Çocuğunuz";

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-purple-200">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-2">
              Hoşgeldin, {welcomeName}! 👋
            </h2>
            <p className="text-purple-100 font-medium text-lg max-w-xl">
              {studentText} bu hafta harika bir ilerleme kaydetti! Matematik
              dersindeki başarısı %15 arttı.
            </p>
            <button className="mt-6 px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-colors shadow-sm">
              Detaylı Raporu Gör
            </button>
          </div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
        </div>

        {/* Stat Cards */}
        {[
          {
            label: "Kalan Ders Kredisi",
            value: "4 Saat",
            icon: <CreditCard className="w-6 h-6 text-purple-500" />,
            sub: "Yenilemek için tıkla",
            color: "bg-purple-50",
          },
          {
            label: "Gelecek Ders",
            value: "Yarın, 14:00",
            icon: <Calendar className="w-6 h-6 text-orange-500" />,
            sub: "Matematik - Ahmet Hoca",
            color: "bg-orange-50",
          },
          {
            label: "Haftalık Odak",
            value: "8.5/10",
            icon: <TrendingUp className="w-6 h-6 text-green-500" />,
            sub: "Geçen haftaya göre +0.5",
            color: "bg-green-50",
          },
          {
            label: "Son Başarı",
            value: "Çarpım Tablosu",
            icon: <Award className="w-6 h-6 text-yellow-500" />,
            sub: "Rozet kazanıldı 🏆",
            color: "bg-yellow-50",
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div
              className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
            >
              {stat.icon}
            </div>
            <div className="text-gray-500 text-sm font-bold mb-1">
              {stat.label}
            </div>
            <div className="text-xl font-black text-gray-800 mb-2">
              {stat.value}
            </div>
            <div className="text-xs font-medium text-gray-400">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lesson Summary Module */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-2">
                <div className="w-2 h-8 bg-purple-500 rounded-full"></div>
                Son Ders Özeti
              </h3>
              <span className="text-sm font-bold text-gray-400">
                12 Şubat 2024 • Matematik
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
              {/* Focus Score */}
              <div className="flex-1 bg-purple-50 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#e5e7eb"
                      strokeWidth="12"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="#9333ea"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray="351"
                      strokeDashoffset="70"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-purple-600">
                      80
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      Odak Puanı
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-600">
                  "Derse katılımı yüksekti, özellikle problem çözme kısmında çok
                  istekliydi."
                </p>
              </div>

              {/* Critical Notes */}
              <div className="flex-[2] space-y-4">
                <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                  <h4 className="font-bold text-green-700 mb-2 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" /> Neleri İyi Yaptı?
                  </h4>
                  <p className="text-sm text-green-800 font-medium leading-relaxed">
                    Karmaşık problemleri parçalara ayırarak çözme mantığını
                    kavradı. Çarpım tablosunda hız kazandı.
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                  <h4 className="font-bold text-orange-700 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Geliştirilmesi
                    Gerekenler
                  </h4>
                  <p className="text-sm text-orange-800 font-medium leading-relaxed">
                    İşlem hatası yapmamak için soruyu daha dikkatli okumalı.
                    Gelecek ders bunun üzerine pratik yapacağız.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions / Notifications */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-800 mb-4">
                Bekleyen İşlemler
              </h3>
              <div className="space-y-3">
                <button className="w-full p-4 bg-red-50 hover:bg-red-100 rounded-xl flex items-center justify-between group transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 text-red-500 rounded-full flex items-center justify-center">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-red-600 text-sm">
                        Ödeme Hatırlatması
                      </div>
                      <div className="text-xs text-red-400">
                        Paketiniz bitmek üzere
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-red-300 group-hover:text-red-500" />
                </button>
                <button className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl flex items-center justify-between group transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white text-gray-500 rounded-full flex items-center justify-center shadow-sm">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-gray-700 text-sm">
                        Ders Programı
                      </div>
                      <div className="text-xs text-gray-400">
                        Gelecek haftayı planla
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-[2rem] text-white shadow-lg shadow-indigo-200">
              <h3 className="font-black mb-4 flex items-center gap-2">
                <Award className="w-6 h-6 text-yellow-300" />
                Başarı Duvarı
              </h3>
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 flex items-center gap-4">
                  <div className="text-3xl">🏆</div>
                  <div>
                    <div className="font-bold text-sm">Matematik Dehası</div>
                    <div className="text-xs text-indigo-100">
                      10 dersi başarıyla tamamladı
                    </div>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/20 flex items-center gap-4">
                  <div className="text-3xl">🚀</div>
                  <div>
                    <div className="font-bold text-sm">Hızlı Başlangıç</div>
                    <div className="text-xs text-indigo-100">
                      İlk haftada 3 ödev teslim etti
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar: Instructors & Quick Contacts */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="font-black text-gray-800 mb-4">Eğitmenlerimiz</h3>
            <div className="space-y-4">
              {[
                {
                  name: "Ahmet Y.",
                  subject: "Matematik",
                  img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Brian",
                },
                {
                  name: "Zeynep K.",
                  subject: "Piyano",
                  img: "https://api.dicebear.com/7.x/avataaars/svg?seed=Senorita",
                },
              ].map((inst, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group"
                >
                  <img
                    src={inst.img}
                    className="w-12 h-12 bg-gray-100 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-sm group-hover:text-purple-600">
                      {inst.name}
                    </div>
                    <div className="text-xs text-gray-500 font-bold">
                      {inst.subject}
                    </div>
                  </div>
                  <button className="p-2 bg-purple-50 text-purple-600 rounded-full hover:bg-purple-600 hover:text-white transition-colors">
                    <span className="sr-only">Mesaj</span>
                    ✉️
                  </button>
                </div>
              ))}
              <button className="w-full py-3 mt-2 border-2 border-dashed border-gray-200 text-gray-400 font-bold rounded-xl hover:border-purple-300 hover:text-purple-500 transition-colors">
                + Yeni Eğitmen Bul
              </button>
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
            <h3 className="font-black text-blue-800 mb-2">Yardım mı lazım?</h3>
            <p className="text-sm text-blue-600 font-medium mb-4">
              Eğitim danışmanlarımız 7/24 yanınızda.
            </p>
            <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">
              Canlı Destek
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
