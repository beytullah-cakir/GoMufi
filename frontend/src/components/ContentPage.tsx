import React, { useState, useEffect } from "react";
import BooksIcon from "../assets/sprites/BooksIcon.png";
import FireIcon from "../assets/sprites/Fire.png";
import api from "../api";

// Import New Course Icons
import PythonIcon from "../assets/sprites/PythonIcon.png";
import ReactIcon from "../assets/sprites/ReactIcon.png";
import JsIcon from "../assets/sprites/JsIcon.png";
import EnglishIcon from "../assets/sprites/EnglishIcon.png";
import DataIcon from "../assets/sprites/DataIcon.png";
import FlutterIcon from "../assets/sprites/FlutterIcon.png";

interface Course {
  id: number;
  title: string;
  instructor: string;
  progress: number;
  color: string;
  lightColor: string;
  border: string;
  icon: string;
}

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

const ContentPage: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await api.get("/my-content");
        const backendCourses = response.data;

        const mappedCourses: Course[] = backendCourses.map(
          (course: BackendCourse) => {
            const colors = getColorPropsByCategory(course.category);
            return {
              id: course.id,
              title: course.title,
              instructor: course.teacher
                ? `${course.teacher.first_name} ${course.teacher.last_name}`
                : "Benim Kursum",
              progress: course.progress || 0,
              icon: getIconByCategory(course.category),
              ...colors,
            };
          }
        );
        setCourses(mappedCourses);
      } catch (error) {
        console.error("Error fetching my courses:", error);
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
        return ReactIcon;
      case "Sanat":
        return DataIcon;
      case "Matematik":
        return JsIcon;
      case "Dil":
        return EnglishIcon;
      case "Mobil":
        return FlutterIcon;
      default:
        return PythonIcon;
    }
  };

  const getColorPropsByCategory = (category: string) => {
    switch (category) {
      case "Yazılım":
        return {
          color: "bg-yellow-400",
          lightColor: "bg-yellow-50",
          border: "border-yellow-400",
        };
      case "Müzik":
        return {
          color: "bg-pink-400",
          lightColor: "bg-pink-50",
          border: "border-pink-400",
        };
      case "Sanat":
        return {
          color: "bg-purple-500",
          lightColor: "bg-purple-50",
          border: "border-purple-500",
        };
      case "Matematik":
        return {
          color: "bg-blue-400",
          lightColor: "bg-blue-50",
          border: "border-blue-400",
        };
      case "Dil":
        return {
          color: "bg-indigo-400",
          lightColor: "bg-indigo-50",
          border: "border-indigo-400",
        };
      case "Mobil":
        return {
          color: "bg-cyan-500",
          lightColor: "bg-cyan-50",
          border: "border-cyan-500",
        };
      default:
        return {
          color: "bg-gray-400",
          lightColor: "bg-gray-50",
          border: "border-gray-400",
        };
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-white overflow-y-auto pb-20">
      {/* Header */}
      <div className="p-8 pb-4 flex justify-between items-end border-b-2 border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
        <div>
          <h1 className="text-4xl font-black text-gray-800 font-display">
            İçerikler
          </h1>
          <p className="text-gray-500 font-bold mt-2 text-lg">
            Oluşturduğun ve yönettiğin kurslar
          </p>
        </div>

        {/* Mini Stats */}
        <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-2xl border-2 border-indigo-100">
          <img src={FireIcon} alt="Streak" className="w-6 h-6" />
          <span className="font-black text-indigo-500 font-display text-xl">
            {courses.length} Kurs
          </span>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* FEATURED COURSE (Big Blue Box) - This could be dynamic too, but static for now */}
        {courses.length > 0 && (
          <div className="col-span-full mb-4">
            <div className="bg-gradient-to-r from-sky-400 to-blue-600 rounded-3xl p-8 text-white relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 shadow-xl shadow-sky-200 cursor-pointer">
              <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black backdrop-blur-md border border-white/30 tracking-wider">
                      EN POPÜLER
                    </span>
                    <span className="inline-block px-3 py-1 bg-blue-800/30 rounded-full text-xs font-black backdrop-blur-md border border-white/10 tracking-wider text-blue-100">
                      {courses[0].instructor}
                    </span>
                  </div>

                  <h2 className="text-5xl font-black font-display mb-3 tracking-tight">
                    {courses[0].title}
                  </h2>
                  <p className="text-blue-100 font-medium text-xl mb-8 max-w-lg leading-relaxed">
                    Öğrencileriniz bu kursu çok seviyor!
                  </p>

                  <div className="flex items-center gap-6">
                    <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-50 transition-all flex items-center gap-3 group-hover:gap-5 duration-300">
                      İstatistikleri Gör
                      <span className="text-2xl leading-none">→</span>
                    </button>
                  </div>
                </div>

                {/* Decorative Icon/Image */}
                <div className="hidden lg:block relative">
                  <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
                  <img
                    src={BooksIcon}
                    alt="Books"
                    className="w-64 drop-shadow-2xl transform group-hover:rotate-6 transition-transform duration-500 relative z-10"
                  />
                </div>
              </div>

              {/* Background Decor */}
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-300 opacity-10 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/2 pointer-events-none"></div>
            </div>
          </div>
        )}

        {courses.map((course) => (
          <div
            key={course.id}
            className={`bg-white rounded-3xl border-4 ${course.border} p-6 relative group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer`}
          >
            {/* Instructor Badge */}
            <div className="absolute top-6 right-6 px-3 py-1 bg-gray-100 rounded-full border border-gray-200 text-xs font-black text-gray-500 uppercase tracking-wide">
              {course.instructor}
            </div>

            {/* Icon/Avatar */}
            <div
              className={`w-20 h-20 rounded-2xl ${course.lightColor} border-2 ${course.border} flex items-center justify-center mb-6 shadow-sm p-4`}
            >
              <img
                src={course.icon}
                alt={course.title}
                className="w-full h-full object-contain drop-shadow-sm"
              />
            </div>

            {/* Title */}
            <h3 className="text-2xl font-black text-gray-800 font-display mb-2 leading-tight min-h-[4rem] flex items-center">
              {course.title}
            </h3>

            {/* Progress Section */}
            <div className="mt-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">
                  Tamamlanma
                </span>
                <span
                  className={`text-sm font-black ${
                    course.progress === 100 ? "text-green-500" : "text-gray-700"
                  }`}
                >
                  %{course.progress}
                </span>
              </div>

              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full ${course.color} transition-all duration-1000 ease-out`}
                  style={{ width: `${course.progress}%` }}
                ></div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-6">
              <button
                className={`w-full py-3 rounded-xl ${course.color} text-white font-black hover:opacity-90 transition-opacity shadow-md`}
              >
                Düzenle
              </button>
            </div>
          </div>
        ))}

        {/* Add New Course Card */}
        <div className="bg-gray-50 rounded-3xl border-4 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-center hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer group min-h-[300px]">
          <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-5xl mb-4 text-gray-400 group-hover:text-gray-500 group-hover:scale-110 transition-all pb-2">
            +
          </div>
          <h3 className="text-2xl font-bold text-gray-500 font-display group-hover:text-gray-600">
            Yeni Kurs Oluştur
          </h3>
          <p className="text-gray-400 font-bold text-sm mt-2 uppercase tracking-wide">
            Bilgini Paylaş
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContentPage;
