import React from "react";
import { Star, Zap } from "lucide-react";
import api from "../api";

// Import Icons
import PythonIcon from "../assets/sprites/PythonIcon.png";
import ReactIcon from "../assets/sprites/ReactIcon.png";
import JsIcon from "../assets/sprites/JsIcon.png";
import EnglishIcon from "../assets/sprites/EnglishIcon.png";
import DataIcon from "../assets/sprites/DataIcon.png";
import FlutterIcon from "../assets/sprites/FlutterIcon.png";
import ChestIcon from "../assets/sprites/Chest.png";

interface Course {
  id: number;
  title: string;
  description: string;
  instructor: string;
  rating: number | string;
  ratingCount: string;
  students: string;
  hours: string;
  lectures: string;
  level: string;
  price: string;
  oldPrice: string;
  badge: string;
  badgeColor: string;
  icon: string;
  color: string;
  category: string;
}

// Interface for data coming from the backend
interface BackendCourse {
  id: number;
  teacher_id: number;
  title: string;
  description: string;
  category: string;
  created_at: string;
  progress: number;
  teacher?: {
    first_name: string;
    last_name: string;
  };
}

const CoursesPage: React.FC = () => {
  // const [activeCategory, setActiveCategory] = useState<string>('Hepsi'); // Removed simple category state

  // Expanded Mock Data matching the reference style
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get("/courses");
        const backendCourses = response.data;

        // Map backend data to frontend structure (filling missing fields with placeholders)
        const mappedCourses: Course[] = backendCourses.map(
          (course: BackendCourse) => ({
            id: course.id,
            title: course.title,
            description: course.description || "Açıklama bulunmuyor.",
            instructor: course.teacher
              ? `${course.teacher.first_name} ${course.teacher.last_name}`
              : "Eğitmen " + course.teacher_id,
            rating: (4 + Math.random()).toFixed(1), // Random rating 4.0-5.0
            ratingCount: Math.floor(Math.random() * 50000).toLocaleString(
              "tr-TR"
            ),
            students: Math.floor((Math.random() * 20000) / 1000) + "k",
            hours: Math.floor(Math.random() * 50 + 10) + " saat",
            lectures: Math.floor(Math.random() * 100 + 20) + " ders",
            level: "Tüm Düzeyler",
            price: "₺" + (Math.floor(Math.random() * 300) + 100) + ",99",
            oldPrice: "₺" + (Math.floor(Math.random() * 200) + 400) + ",99",
            badge: Math.random() > 0.5 ? "Popüler" : "Yeni",
            badgeColor:
              Math.random() > 0.5
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700",
            icon: getIconByCategory(course.category),
            color: getColorByCategory(course.category),
            category: course.category,
          })
        );
        setCourses(mappedCourses);
      } catch (error) {
        console.error("Error fetching courses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const getIconByCategory = (category: string) => {
    switch (category) {
      case "Yazılım":
        return PythonIcon;
      case "Müzik":
        return ReactIcon; // Placeholder icon
      case "Sanat":
        return DataIcon; // Placeholder icon
      case "Matematik":
        return JsIcon; // Placeholder icon
      case "Dil":
        return EnglishIcon;
      case "Mobil":
        return FlutterIcon;
      default:
        return PythonIcon;
    }
  };

  const getColorByCategory = (category: string) => {
    switch (category) {
      case "Yazılım":
        return "bg-yellow-400";
      case "Müzik":
        return "bg-pink-400";
      case "Sanat":
        return "bg-purple-400";
      case "Matematik":
        return "bg-blue-400";
      case "Dil":
        return "bg-indigo-400";
      default:
        return "bg-gray-400";
    }
  };

  const handleEnroll = async (e: React.MouseEvent, courseId: number) => {
    e.stopPropagation();
    try {
      await api.post(`/enroll/${courseId}`);
      alert("Kurs başarıyla satın alındı (kayıt olundu)!");
    } catch (err: any) {
      alert(err.response?.data?.detail || "Kayıt başarısız.");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Yükleniyor...
      </div>
    );

  return (
    <div className="w-full bg-white pb-20">
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
          <div className="hidden lg:flex flex-col w-64 shrink-0 gap-8">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-orange-500 fill-orange-500" />
              <h3 className="font-black text-gray-900 text-base uppercase tracking-wider font-display">
                FİLTRELE
              </h3>
            </div>

            {/* Filter Group: Ratings */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="font-bold text-gray-900 mb-4 text-sm font-display tracking-wide">
                PUANLAR
              </h4>
              <div className="flex flex-col gap-3">
                {[
                  { val: 4.5, label: "4.5 ve üzeri", count: "1.2k" },
                  { val: 4.0, label: "4 ve üzeri", count: "1.9k" },
                  { val: 3.5, label: "3.5 ve üzeri", count: "500" },
                  { val: 3.0, label: "3 ve üzeri", count: "100" },
                ].map((item) => (
                  <label
                    key={item.val}
                    className="flex items-center gap-3 cursor-pointer group relative pl-1"
                  >
                    <input
                      type="radio"
                      name="rating"
                      className="peer sr-only"
                    />

                    {/* Custom Radio Circle */}
                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 peer-checked:border-yellow-500 peer-checked:bg-yellow-50 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:border-gray-400">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-0 peer-checked:opacity-100 transform scale-50 peer-checked:scale-100 transition-all duration-200"></div>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-600 peer-checked:text-gray-900 transition-colors">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${
                              i <= Math.floor(item.val)
                                ? "fill-yellow-400 text-yellow-400"
                                : "fill-gray-200 text-gray-200"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-gray-700 peer-checked:text-black">
                        {item.label}
                      </span>
                      <span className="text-xs text-gray-400 font-normal group-hover:text-gray-500 transition-colors">
                        ({item.count})
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Group: Lesson Count */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="font-bold text-gray-900 mb-4 text-sm font-display tracking-wide">
                DERS SAYISI
              </h4>
              <div className="flex flex-col gap-3">
                {[
                  "0-5 Ders (350)",
                  "5-10 Ders (1.1k)",
                  "10-20 Ders (850)",
                  "20-50 Ders (2.4k)",
                  "50+ Ders (500)",
                ].map((opt, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 cursor-pointer group select-none relative"
                  >
                    <input type="checkbox" className="peer sr-only" />

                    {/* Custom Checkbox */}
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-lg flex items-center justify-center peer-checked:border-sky-500 peer-checked:bg-sky-500 transition-all duration-200 group-hover:border-gray-400 group-hover:scale-105">
                      <svg
                        className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 stroke-[4]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>

                    <span className="text-sm text-gray-600 font-bold group-hover:text-gray-900 peer-checked:text-gray-900 transition-colors">
                      {opt}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filter Group: Topic */}
            <div className="border-t border-gray-100 pt-6">
              <h4 className="font-bold text-gray-900 mb-4 text-sm font-display tracking-wide">
                KONU
              </h4>
              <div className="flex flex-col gap-3">
                {[
                  "Python",
                  "Web Geliştirme",
                  "Makine Öğrenimi",
                  "İngilizce",
                  "Çizim",
                  "Mobil",
                ].map((opt, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 cursor-pointer group select-none relative"
                  >
                    <input type="checkbox" className="peer sr-only" />
                    {/* Custom Checkbox (Using different active color for variety if needed, or stick to theme) */}
                    <div className="w-6 h-6 border-2 border-gray-300 rounded-lg flex items-center justify-center peer-checked:border-indigo-500 peer-checked:bg-indigo-500 transition-all duration-200 group-hover:border-gray-400 group-hover:scale-105">
                      <svg
                        className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 stroke-[4]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-600 font-bold group-hover:text-gray-900 peer-checked:text-gray-900 transition-colors">
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
                    <div className="flex flex-col items-end w-full gap-2">
                      <div className="flex flex-col items-end">
                        <div className="flex items-baseline gap-1 whitespace-nowrap">
                          <span className="text-2xl font-black text-gray-900 font-display">
                            {course.price}
                          </span>
                          <span className="text-xs text-gray-400 font-bold">
                            / ders
                          </span>
                        </div>
                        {course.oldPrice && (
                          <span className="text-sm text-gray-400 line-through decoration-gray-400">
                            {course.oldPrice}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleEnroll(e, course.id)}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm transition-colors shadow-md"
                      >
                        Satın Al
                      </button>
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
