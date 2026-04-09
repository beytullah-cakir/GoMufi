import React, { useState, useEffect } from 'react';
import { Star, Zap, Search, ChevronDown, MonitorPlay, Loader2 } from 'lucide-react';
import api from '../api';

// Import Icons
import PythonIcon from '../assets/sprites/PythonIcon.png';
import ReactIcon from '../assets/sprites/ReactIcon.png';
import JsIcon from '../assets/sprites/JsIcon.png';
import EnglishIcon from '../assets/sprites/EnglishIcon.png';
import DataIcon from '../assets/sprites/DataIcon.png';
import FlutterIcon from '../assets/sprites/FlutterIcon.png';
import ChestIcon from '../assets/sprites/Chest.png';

interface CoursesPageProps {
    addToCart: (course: { id: number; title: string; price: string; icon: string; instructor: string; }) => void;
    onSelectCourse: (id: number) => void;
    cart: { id: number; }[];
    purchasedCourseIds: number[];
}

interface BackendCourse {
    id: number;
    title: string;
    description?: string;
    category?: string;
    price: number;
    teacher?: {
        first_name: string;
        last_name: string;
    };
}

const CoursesPage: React.FC<CoursesPageProps> = ({ addToCart, onSelectCourse, cart, purchasedCourseIds }) => {
    const [courses, setCourses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setIsLoading(true);
            const response = await api.get('/courses');
            
            // Map backend data to frontend format
            const mappedCourses = response.data.map((c: any) => ({
                id: c.id,
                title: c.title,
                description: c.description || "Bu kurs için açıklama henüz eklenmemiş.",
                instructor: c.teacher ? `${c.teacher.first_name} ${c.teacher.last_name}` : "Anonim Eğitmen",
                rating: 4.8, // Mock for now
                ratingCount: '0', 
                students: '0',
                hours: '10+ saat', // Mock for now
                lectures: '20+ ders', // Mock for now
                level: 'Tüm Düzeyler',
                price: `₺${c.price.toLocaleString('tr-TR')}`,
                oldPrice: c.price > 0 ? `₺${(c.price * 1.2).toFixed(2)}` : null,
                badge: c.price === 0 ? 'Ücretsiz' : 'Yeni',
                badgeColor: c.price === 0 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700',
                icon: getIconByCategory(c.category),
                color: getColorByCategory(c.category),
            }));
            
            setCourses(mappedCourses);
        } catch (err: any) {
            console.error("Courses fetch error:", err);
            setError("Kurslar yüklenirken bir hata oluştu.");
        } finally {
            setIsLoading(false);
        }
    };

    const getIconByCategory = (category?: string) => {
        const cat = category?.toLowerCase() || "";
        if (cat.includes("python")) return PythonIcon;
        if (cat.includes("react") || cat.includes("web")) return ReactIcon;
        if (cat.includes("javascript") || cat.includes("js")) return JsIcon;
        if (cat.includes("ingilizce") || cat.includes("english")) return EnglishIcon;
        if (cat.includes("data") || cat.includes("veri")) return DataIcon;
        if (cat.includes("flutter") || cat.includes("mobil")) return FlutterIcon;
        return ChestIcon; // Default
    };

    const getColorByCategory = (category?: string) => {
        const cat = category?.toLowerCase() || "";
        if (cat.includes("python")) return "bg-yellow-400";
        if (cat.includes("react") || cat.includes("web")) return "bg-sky-500";
        if (cat.includes("javascript") || cat.includes("js")) return "bg-amber-500";
        if (cat.includes("ingilizce") || cat.includes("english")) return "bg-indigo-500";
        if (cat.includes("data") || cat.includes("veri")) return "bg-blue-600";
        if (cat.includes("flutter") || cat.includes("mobil")) return "bg-cyan-500";
        return "bg-purple-500"; // Default
    };

    return (
        <div className="w-full bg-white pb-20">
            {/* Header / Top Bar */}
            <div className="px-6 py-3 border-b border-gray-100 bg-white sticky top-0 z-30">
                <div className="max-w-7xl mx-auto">
                    {/* Search Bar (Mobile/Tablet visible, Desktop larger) */}
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="Ne öğrenmek istiyorsun?"
                                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-gray-800 focus:bg-white rounded-full px-5 py-2 font-bold text-gray-700 outline-none transition-all placeholder:text-gray-400 text-sm"
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-lg text-gray-400">🔍</span>
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
                <div className="w-full bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-6 mb-6 overflow-hidden shadow-lg flex items-center justify-between relative">
                    <div className="relative z-10 text-white max-w-xl">
                        <h2 className="text-2xl font-black font-display mb-2 tracking-tight">Öğrenme Festivali Başladı! 🚀</h2>
                        <p className="text-gray-300 font-medium text-base mb-4 leading-relaxed">
                            Yeteneklerine yatırım yapmanın tam zamanı. 24 saat boyunca geçerli indirimleri kaçırma.
                        </p>
                        <button className="bg-white text-gray-900 px-5 py-2 rounded-xl font-black shadow-md hover:bg-gray-100 transition-colors text-sm">
                            Fırsatları İncele
                        </button>
                    </div>
                    {/* Decor Image */}
                    <div className="hidden lg:block absolute right-16 top-1/2 -translate-y-1/2">
                        <img
                            src={ChestIcon}
                            alt="Chest"
                            className="w-32 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] transform rotate-[-12deg]"
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
                            <h3 className="font-black text-gray-900 text-base uppercase tracking-wider font-display">FİLTRELE</h3>
                        </div>

                        {/* Filter Group: Ratings */}
                        <div className="border-t border-gray-100 pt-6">
                            <h4 className="font-bold text-gray-900 mb-4 text-sm font-display tracking-wide">PUANLAR</h4>
                            <div className="flex flex-col gap-3">
                                {[
                                    { val: 4.5, label: "4.5 ve üzeri", count: "1.2k" },
                                    { val: 4.0, label: "4 ve üzeri", count: "1.9k" },
                                    { val: 3.5, label: "3.5 ve üzeri", count: "500" },
                                    { val: 3.0, label: "3 ve üzeri", count: "100" }
                                ].map((item) => (
                                    <label key={item.val} className="flex items-center gap-3 cursor-pointer group relative pl-1">
                                        <input type="radio" name="rating" className="peer sr-only" />

                                        {/* Custom Radio Circle */}
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 peer-checked:border-yellow-500 peer-checked:bg-yellow-50 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:border-gray-400">
                                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 opacity-0 peer-checked:opacity-100 transform scale-50 peer-checked:scale-100 transition-all duration-200"></div>
                                        </div>

                                        <div className="flex items-center gap-2 text-sm text-gray-600 peer-checked:text-gray-900 transition-colors">
                                            <div className="flex gap-0.5">
                                                {[1, 2, 3, 4, 5].map(i => (
                                                    <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.floor(item.val) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`} />
                                                ))}
                                            </div>
                                            <span className="font-bold text-gray-700 peer-checked:text-black">{item.label}</span>
                                            <span className="text-xs text-gray-400 font-normal group-hover:text-gray-500 transition-colors">({item.count})</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Filter Group: Lesson Count */}
                        <div className="border-t border-gray-100 pt-6">
                            <h4 className="font-bold text-gray-900 mb-4 text-sm font-display tracking-wide">DERS SAYISI</h4>
                            <div className="flex flex-col gap-3">
                                {['0-5 Ders (350)', '5-10 Ders (1.1k)', '10-20 Ders (850)', '20-50 Ders (2.4k)', '50+ Ders (500)'].map((opt, i) => (
                                    <label key={i} className="flex items-center gap-3 cursor-pointer group select-none relative">
                                        <input type="checkbox" className="peer sr-only" />

                                        {/* Custom Checkbox */}
                                        <div className="w-6 h-6 border-2 border-gray-300 rounded-lg flex items-center justify-center peer-checked:border-sky-500 peer-checked:bg-sky-500 transition-all duration-200 group-hover:border-gray-400 group-hover:scale-105">
                                            <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 stroke-[4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>

                                        <span className="text-sm text-gray-600 font-bold group-hover:text-gray-900 peer-checked:text-gray-900 transition-colors">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Filter Group: Topic */}
                        <div className="border-t border-gray-100 pt-6">
                            <h4 className="font-bold text-gray-900 mb-4 text-sm font-display tracking-wide">KONU</h4>
                            <div className="flex flex-col gap-3">
                                {['Python', 'Web Geliştirme', 'Makine Öğrenimi', 'İngilizce', 'Çizim', 'Mobil'].map((opt, i) => (
                                    <label key={i} className="flex items-center gap-3 cursor-pointer group select-none relative">
                                        <input type="checkbox" className="peer sr-only" />
                                        {/* Custom Checkbox (Using different active color for variety if needed, or stick to theme) */}
                                        <div className="w-6 h-6 border-2 border-gray-300 rounded-lg flex items-center justify-center peer-checked:border-indigo-500 peer-checked:bg-indigo-500 transition-all duration-200 group-hover:border-gray-400 group-hover:scale-105">
                                            <svg className="w-3.5 h-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity duration-200 stroke-[4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-sm text-gray-600 font-bold group-hover:text-gray-900 peer-checked:text-gray-900 transition-colors">{opt}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>


                    {/* RIGHT COURSE LIST */}
                    <div className="flex-1">
                        {/* List Header */}
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-gray-400 text-sm">{courses.length} sonuç listeleniyor</span>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-gray-500">Sırala:</span>
                                <select className="bg-white border text-sm border-gray-200 rounded-lg px-3 py-2 font-bold text-gray-800 outline-none cursor-pointer hover:border-gray-400">
                                    <option>En Popüler</option>
                                    <option>En Yeni</option>
                                    <option>En Yüksek Puanlı</option>
                                </select>
                            </div>
                        </div>

                        {/* Loading & Error States */}
                        {isLoading && (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
                                <p className="font-bold text-gray-400">Kurslar Yükleniyor...</p>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border-2 border-red-100 rounded-2xl p-8 text-center">
                                <p className="text-red-500 font-bold mb-4">{error}</p>
                                <button 
                                    onClick={fetchCourses}
                                    className="bg-red-500 text-white px-6 py-2 rounded-xl font-black hover:bg-red-600 transition-colors"
                                >
                                    Tekrar Dene
                                </button>
                            </div>
                        )}

                        {!isLoading && !error && courses.length === 0 && (
                            <div className="bg-gray-50 border-2 border-gray-100 rounded-2xl p-12 text-center">
                                <div className="text-5xl mb-4">📭</div>
                                <h3 className="text-xl font-black text-gray-800 mb-2">Henüz Kurs Bulunamadı</h3>
                                <p className="text-gray-400 font-bold">Kriterlere uygun kurs henüz eklenmemiş.</p>
                            </div>
                        )}

                        {/* List Items */}
                        <div className="flex flex-col gap-4">
                            {courses.map((course) => (
                                <div 
                                    key={course.id} 
                                    className="group bg-white border border-gray-200 hover:bg-gray-50 rounded-lg p-[1px] flex flex-col md:flex-row gap-4 h-full md:h-48 transition-all hover:shadow-lg relative overflow-hidden"
                                >
                                    {/* Thumbnail Area - Clickable */}
                                    <div 
                                        className={`w-full md:w-64 h-48 md:h-full shrink-0 ${course.color} bg-opacity-10 md:bg-opacity-100 flex items-center justify-center relative md:rounded-l-lg overflow-hidden cursor-pointer`}
                                        onClick={() => onSelectCourse(course.id)}
                                    >
                                        <div className="absolute inset-0 bg-black/5 hidden md:block"></div>
                                        <img
                                            src={course.icon}
                                            alt={course.title}
                                            className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-md z-10 group-hover:scale-110 transition-transform"
                                        />
                                    </div>

                                    {/* Content Section - Clickable */}
                                    <div 
                                        className="flex-1 py-4 flex flex-col justify-between pr-4 cursor-pointer"
                                        onClick={() => onSelectCourse(course.id)}
                                    >
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
                                                <span className="font-black text-yellow-600 text-sm">{course.rating}</span>
                                                <div className="flex text-yellow-400 text-xs">⭐⭐⭐⭐⭐</div>
                                                <span className="text-xs text-gray-400 font-medium">({course.ratingCount})</span>
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

                                    {/* Price & Badge Section (NOT clickable for detail) */}
                                    <div className="md:w-40 py-4 pr-6 flex flex-col items-end justify-between shrink-0 pl-4 md:border-l border-gray-100">
                                        <div className="flex flex-col items-end w-full gap-2">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-baseline gap-1 whitespace-nowrap">
                                                    <span className="text-2xl font-black text-gray-900 font-display">{course.price}</span>
                                                    <span className="text-xs text-gray-400 font-bold">/ ders</span>
                                                </div>
                                                {course.oldPrice && (
                                                    <span className="text-sm text-gray-400 line-through decoration-gray-400">{course.oldPrice}</span>
                                                )}
                                            </div>

                                            {purchasedCourseIds.includes(course.id) ? (
                                                <div className="w-full py-2 rounded-lg font-black text-xs text-center bg-gray-100 text-gray-500 border-2 border-gray-200 cursor-default uppercase tracking-wider">
                                                    Zaten Sahipsin ✓
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={(e) => { 
                                                        e.preventDefault();
                                                        e.stopPropagation(); 
                                                        addToCart(course); 
                                                    }}
                                                    className={`w-full py-2 rounded-lg font-black text-xs transition-all tracking-wider uppercase
                                                        ${cart.some(item => item.id === course.id)
                                                            ? 'bg-green-100 text-green-600 border-2 border-green-200 cursor-default'
                                                            : 'bg-gray-900 text-white hover:bg-black shadow-md active:scale-95'
                                                        }`}
                                                >
                                                    {cart.some(item => item.id === course.id) ? 'Sepette ✓' : 'Sepete Ekle'}
                                                </button>
                                            )}
                                        </div>

                                        {course.badge && (
                                            <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-wide ${course.badgeColor}`}>
                                                {course.badge}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="mt-8 flex justify-center gap-2">
                            {[1, 2, 3, '...', 12].map((page, i) => (
                                <button key={i} className={`w-10 h-10 rounded-full font-bold flex items-center justify-center transition-colors ${page === 1 ? 'bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-600'}`}>
                                    {page}
                                </button>
                            ))}
                        </div>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default CoursesPage;
