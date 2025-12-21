import React from "react";

// Import Icons
import PythonIcon from "../assets/sprites/PythonIcon.png";
import ReactIcon from "../assets/sprites/ReactIcon.png";
import JsIcon from "../assets/sprites/JsIcon.png";
import EnglishIcon from "../assets/sprites/EnglishIcon.png";
import DataIcon from "../assets/sprites/DataIcon.png";
import FlutterIcon from "../assets/sprites/FlutterIcon.png";
import ChestIcon from "../assets/sprites/Chest.png";

const CoursesPage: React.FC = () => {
  // const [activeCategory, setActiveCategory] = useState<string>('Hepsi'); // Removed simple category state

  // Expanded Mock Data matching the reference style
  const courses = [
    {
      id: 1,
      title: "(40+ Saat) Python | Sıfırdan İleri Seviye Programlama (2025)",
      description:
        "(40+ Saat) - Python ve Programlama Öğrenin. Django, Web Geliştirme, Veri Analizi (Pandas, Numpy), Selenium",
      instructor: "Mustafa Murat Coşkun",
      rating: 4.8,
      ratingCount: "50.154",
      students: "12.5k",
      hours: "42 saat",
      lectures: "336 ders",
      level: "Tüm Düzeyler",
      price: "₺299,99",
      oldPrice: "₺319,99",
      badge: "En Çok Satan",
      badgeColor: "bg-yellow-100 text-yellow-700",
      icon: PythonIcon,
      color: "bg-yellow-400", // For button/accents
    },
    {
      id: 2,
      title: "Komple Uygulamalı Web Geliştirme Eğitimi [2025]",
      description:
        "Sıfırdan ileri seviyeye Fullstack Web Geliştirme: HTML, CSS, Bootstrap, JavaScript, React, ASP.NET Core ve API",
      instructor: "Sadık Turan",
      rating: 4.7,
      ratingCount: "26.940",
      students: "110k",
      hours: "100 saat",
      lectures: "623 ders",
      level: "Yeni Başlayan",
      price: "₺349,99",
      oldPrice: "₺399,99",
      badge: "En Çok Satan",
      badgeColor: "bg-sky-100 text-sky-700",
      icon: ReactIcon,
      color: "bg-sky-500",
    },
    {
      id: 3,
      title: "(100+ Saat) Aranan Programcı Olma Kamp Kursu| Python,Java,C#",
      description:
        "Sürekli güncel kalan içeriğiyle sıfırdan Python, JAVA, C#, Flutter, Angular, React ve çok daha fazlasını öğrenin.",
      instructor: "Engin Demiroğ",
      rating: 4.8,
      ratingCount: "22.979",
      students: "85k",
      hours: "104.5 saat",
      lectures: "659 ders",
      level: "Tüm Düzeyler",
      price: "₺399,99",
      oldPrice: "",
      badge: "Üst Düzey",
      badgeColor: "bg-purple-100 text-purple-700",
      icon: JsIcon, // Using JS icon as generic code icon
      color: "bg-amber-500",
    },
    {
      id: 4,
      title: "İngilizce B1-B2: Orta Seviye İngilizce Kursu",
      description:
        "Grammar, Speaking, Listening ve Reading becerilerinizi B2 seviyesine taşıyın. Bol pratik ve sınav hazırlığı.",
      instructor: "Sarah Teacher",
      rating: 4.9,
      ratingCount: "5.420",
      students: "12k",
      hours: "24 saat",
      lectures: "112 ders",
      level: "Orta Düzey",
      price: "₺199,99",
      oldPrice: "₺499,99",
      badge: "Popüler",
      badgeColor: "bg-red-100 text-red-700",
      icon: EnglishIcon,
      color: "bg-indigo-500",
    },
    {
      id: 5,
      title: "Veri Bilimi ve Machine Learning Bootcamp 2025",
      description:
        "Sıfırdan Uzmanlığa: Python, R, İstatistik, Pandas, Matplotlib, Seaborn, Sklearn ve Deep Learning",
      instructor: "Mufi Academy",
      rating: 4.9,
      ratingCount: "3.150",
      students: "8k",
      hours: "35 saat",
      lectures: "210 ders",
      level: "İleri Düzey",
      price: "₺259,99",
      oldPrice: "₺599,99",
      badge: "Yeni",
      badgeColor: "bg-green-100 text-green-700",
      icon: DataIcon,
      color: "bg-blue-600",
    },
    {
      id: 6,
      title: "Flutter ile Mobil Uygulama Geliştirme Rehberi",
      description:
        "Dart dili ve Flutter framework ile Android ve iOS uyumlu native performanslı mobil uygulamalar geliştirin.",
      instructor: "Can Hoca",
      rating: 4.8,
      ratingCount: "9.800",
      students: "25k",
      hours: "48 saat",
      lectures: "415 ders",
      level: "Tüm Düzeyler",
      price: "₺299,99",
      oldPrice: "₺350,00",
      badge: "Editörün Seçimi",
      badgeColor: "bg-cyan-100 text-cyan-700",
      icon: FlutterIcon,
      color: "bg-cyan-500",
    },
  ];

  return (
    <div className="w-full h-full bg-white overflow-y-auto pb-20">
      {/* Header / Top Bar */}
      <div className="p-8 pb-4 border-b border-gray-100 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto">
          {/* Search Bar (Mobile/Tablet visible, Desktop larger) */}
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Ne öğrenmek istiyorsun?"
                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-gray-800 focus:bg-white rounded-full px-6 py-3 font-bold text-gray-700 outline-none transition-all placeholder:text-gray-400"
              />
              <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl text-gray-400">
                🔍
              </span>
            </div>
            <div className="hidden md:flex gap-2 text-sm font-bold text-gray-500 cursor-pointer hover:text-gray-800">
              <span>Kategoriler</span>
              <span>▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto p-8 pt-6">
        {/* HERO BANNER - Compact Udemy Style */}
        <div className="w-full bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 mb-10 overflow-hidden shadow-lg flex items-center justify-between relative">
          <div className="relative z-10 text-white max-w-xl">
            <h2 className="text-3xl font-black font-display mb-3 tracking-tight">
              Öğrenme Festivali Başladı! 🚀
            </h2>
            <p className="text-gray-300 font-medium text-lg mb-6 leading-relaxed">
              Yeteneklerine yatırım yapmanın tam zamanı. 24 saat boyunca geçerli
              indirimleri kaçırma.
            </p>
            <button className="bg-white text-gray-900 px-6 py-3 rounded-xl font-black shadow-md hover:bg-gray-100 transition-colors">
              Fırsatları İncele
            </button>
          </div>
          {/* Decor Image */}
          <div className="hidden lg:block absolute right-16 top-1/2 -translate-y-1/2">
            <img
              src={ChestIcon}
              alt="Chest"
              className="w-48 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transform rotate-[-12deg]"
            />
          </div>
        </div>

        {/* Content Layout: Sidebar + List */}
        <div className="flex gap-8">
          {/* LEFT SIDEBAR FILTERS (Fixed width) */}
          <div className="hidden lg:flex flex-col w-64 shrink-0 gap-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">⚡</span>
              <h3 className="font-black text-gray-800 text-lg uppercase tracking-wide">
                Filtrele
              </h3>
            </div>

            {/* Filter Group: Ratings */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 mb-3 text-sm">Puanlar</h4>
              <div className="flex flex-col gap-2">
                {[4.5, 4.0, 3.5, 3.0].map((rate) => (
                  <label
                    key={rate}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 group-hover:border-gray-800 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-transparent group-hover:bg-gray-800"></div>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600 group-hover:text-gray-900">
                      <span className="text-yellow-500 text-base">
                        ⭐⭐⭐⭐⭐
                      </span>
                      <span className="font-bold">{rate} ve üzeri</span>
                      <span className="text-xs text-gray-400 font-normal">
                        (1.2k)
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Group: Duration */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 mb-3 text-sm">
                Video Süresi
              </h4>
              <div className="flex flex-col gap-2">
                {[
                  "0-1 Saat (350)",
                  "1-3 Saat (1.1k)",
                  "3-6 Saat (850)",
                  "6-17 Saat (2.4k)",
                  "17+ Saat (500)",
                ].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-gray-800 focus:ring-gray-800"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Group: Topic */}
            <div className="border-t border-gray-100 pt-4">
              <h4 className="font-bold text-gray-800 mb-3 text-sm">Konu</h4>
              <div className="flex flex-col gap-2">
                {[
                  "Python",
                  "Web Geliştirme",
                  "Makine Öğrenimi",
                  "İngilizce",
                  "Çizim",
                  "Mobil",
                ].map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-gray-300 text-gray-800 focus:ring-gray-800"
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COURSE LIST */}
          <div className="flex-1">
            {/* List Header */}
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-gray-400 text-sm">
                10.000 sonuç
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-500">Sırala:</span>
                <select className="bg-white border text-sm border-gray-200 rounded-lg px-3 py-2 font-bold text-gray-800 outline-none cursor-pointer hover:border-gray-400">
                  <option>En Popüler</option>
                  <option>En Yeni</option>
                  <option>En Yüksek Puanlı</option>
                </select>
              </div>
            </div>

            {/* List Items */}
            <div className="flex flex-col gap-4">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="group bg-white border border-gray-200 hover:bg-gray-50 rounded-lg p-[1px] flex flex-col md:flex-row gap-4 h-full md:h-48 cursor-pointer transition-all hover:shadow-lg relative overflow-hidden"
                >
                  {/* Image / Icon Section */}
                  {/* Using a background color placeholder if icon is small to look like thumbnail */}
                  <div
                    className={`w-full md:w-64 h-48 md:h-full shrink-0 ${course.color} bg-opacity-10 md:bg-opacity-100 flex items-center justify-center relative md:rounded-l-lg overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-black/5 hidden md:block"></div>
                    <img
                      src={course.icon}
                      alt={course.title}
                      className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-md z-10 group-hover:scale-110 transition-transform"
                    />
                  </div>

                  {/* Content Section */}
                  <div className="flex-1 py-4 flex flex-col justify-between pr-4">
                    <div>
                      <h3 className="text-lg md:text-xl font-black font-display text-gray-900 mb-1 leading-tight group-hover:text-blue-600 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-500 font-medium line-clamp-2 mb-2">
                        {course.description}
                      </p>
                      <div className="text-xs text-gray-400 font-bold uppercase tracking-wide mb-1">
                        {course.instructor}
                      </div>

                      {/* Stats Row */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-yellow-600 text-sm">
                          {course.rating}
                        </span>
                        <div className="flex text-yellow-400 text-xs">
                          ⭐⭐⭐⭐⭐
                        </div>
                        <span className="text-xs text-gray-400 font-medium">
                          ({course.ratingCount})
                        </span>
                      </div>

                      <div className="text-xs text-gray-400 flex items-center gap-3">
                        <span>{course.hours}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>{course.lectures}</span>
                        <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span>{course.level}</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Badge Section */}
                  <div className="md:w-40 py-4 pr-6 flex flex-col items-end justify-between shrink-0 pl-4 md:border-l border-gray-100">
                    <div className="flex flex-col items-end">
                      <span className="text-2xl font-black text-gray-900 font-display">
                        {course.price}
                      </span>
                      {course.oldPrice && (
                        <span className="text-sm text-gray-400 line-through decoration-gray-400">
                          {course.oldPrice}
                        </span>
                      )}
                    </div>

                    {course.badge && (
                      <span
                        className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${course.badgeColor}`}
                      >
                        {course.badge}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 flex justify-center gap-2">
              {[1, 2, 3, "...", 12].map((page, i) => (
                <button
                  key={i}
                  className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-colors ${
                    page === 1
                      ? "bg-gray-800 text-white"
                      : "hover:bg-gray-100 text-gray-600"
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;
