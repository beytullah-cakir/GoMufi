import React from 'react';
import BooksIcon from '../assets/sprites/BooksIcon.png';
import FireIcon from '../assets/sprites/Fire.png';

// Import New Course Icons
import PythonIcon from '../assets/sprites/PythonIcon.png';
import ReactIcon from '../assets/sprites/ReactIcon.png';
import JsIcon from '../assets/sprites/JsIcon.png';
import EnglishIcon from '../assets/sprites/EnglishIcon.png';
import DataIcon from '../assets/sprites/DataIcon.png';
import FlutterIcon from '../assets/sprites/FlutterIcon.png';

const ContentPage: React.FC = () => {
    // Mock Data for Purchased Courses
    const myCourses = [
        {
            id: 1,
            title: 'Python ile Programlama',
            instructor: 'Mufi Hoca',
            progress: 45,
            color: 'bg-yellow-400',
            lightColor: 'bg-yellow-50',
            border: 'border-yellow-400',
            icon: PythonIcon
        },
        {
            id: 2,
            title: 'Sıfırdan İleri React',
            instructor: 'Ahmet Hoca',
            progress: 20,
            color: 'bg-sky-400',
            lightColor: 'bg-sky-50',
            border: 'border-sky-400',
            icon: ReactIcon
        },
        {
            id: 3,
            title: 'Modern JavaScript',
            instructor: 'Mehmet Hoca',
            progress: 0,
            color: 'bg-amber-400',
            lightColor: 'bg-amber-50',
            border: 'border-amber-400',
            icon: JsIcon
        },
        {
            id: 4,
            title: 'İngilizce B1',
            instructor: 'Sarah Teacher',
            progress: 80,
            color: 'bg-purple-500',
            lightColor: 'bg-purple-50',
            border: 'border-purple-500',
            icon: EnglishIcon
        },
        {
            id: 5,
            title: 'Veri Bilimi 101',
            instructor: 'Mufi Hoca',
            progress: 5,
            color: 'bg-blue-600',
            lightColor: 'bg-blue-50',
            border: 'border-blue-600',
            icon: DataIcon
        },
        {
            id: 6,
            title: 'Mobil Geliştirme (Flutter)',
            instructor: 'Can Hoca',
            progress: 0,
            color: 'bg-cyan-500',
            lightColor: 'bg-cyan-50',
            border: 'border-cyan-500',
            icon: FlutterIcon
        },
    ];

    return (
        <div className="w-full h-full bg-white overflow-y-auto pb-20">
            {/* Header */}
            <div className="p-8 pb-4 flex justify-between items-end border-b-2 border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 font-display">İçerikler</h1>
                    <p className="text-gray-500 font-bold mt-2 text-lg">Satın aldığın eğitimler ve kurslar</p>
                </div>

                {/* Mini Stats */}
                <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-2xl border-2 border-indigo-100">
                    <img src={FireIcon} alt="Streak" className="w-6 h-6" />
                    <span className="font-black text-indigo-500 font-display text-xl">{myCourses.length} Kurs</span>
                </div>
            </div>

            {/* Courses Grid */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* FEATURED COURSE (Big Blue Box) - RESTORED */}
                <div className="col-span-full mb-4">
                    <div className="bg-gradient-to-r from-sky-400 to-blue-600 rounded-3xl p-8 text-white relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 shadow-xl shadow-sky-200 cursor-pointer">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black backdrop-blur-md border border-white/30 tracking-wider">
                                        ŞU AN İZLENİYOR
                                    </span>
                                    <span className="inline-block px-3 py-1 bg-blue-800/30 rounded-full text-xs font-black backdrop-blur-md border border-white/10 tracking-wider text-blue-100">
                                        Ahmet Hoca
                                    </span>
                                </div>

                                <h2 className="text-5xl font-black font-display mb-3 tracking-tight">İngilizce B1</h2>
                                <p className="text-blue-100 font-medium text-xl mb-8 max-w-lg leading-relaxed">
                                    Kaldığın yerden devam et. 4. Ünitede "Geçmiş Zaman" konusunu işliyorduk. Harika gidiyorsun!
                                </p>

                                <div className="flex items-center gap-6">
                                    <button className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-50 transition-all flex items-center gap-3 group-hover:gap-5 duration-300">
                                        İzlemeye Devam Et
                                        <span className="text-2xl leading-none">→</span>
                                    </button>
                                    <span className="text-blue-100 font-bold text-lg">%65 Tamamlandı</span>
                                </div>
                            </div>

                            {/* Decorative Icon/Image */}
                            <div className="hidden lg:block relative">
                                <div className="absolute inset-0 bg-white/20 blur-3xl rounded-full"></div>
                                <img src={BooksIcon} alt="Books" className="w-64 drop-shadow-2xl transform group-hover:rotate-6 transition-transform duration-500 relative z-10" />
                            </div>
                        </div>

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/2 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-300 opacity-10 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/2 pointer-events-none"></div>
                    </div>
                </div>

                {myCourses.map((course) => (
                    <div key={course.id} className={`bg-white rounded-3xl border-4 ${course.border} p-6 relative group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer`}>
                        {/* Instructor Badge */}
                        <div className="absolute top-6 right-6 px-3 py-1 bg-gray-100 rounded-full border border-gray-200 text-xs font-black text-gray-500 uppercase tracking-wide">
                            {course.instructor}
                        </div>

                        {/* Icon/Avatar */}
                        <div className={`w-20 h-20 rounded-2xl ${course.lightColor} border-2 ${course.border} flex items-center justify-center mb-6 shadow-sm p-4`}>
                            <img src={course.icon} alt={course.title} className="w-full h-full object-contain drop-shadow-sm" />
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-black text-gray-800 font-display mb-2 leading-tight min-h-[4rem] flex items-center">
                            {course.title}
                        </h3>

                        {/* Progress Section */}
                        <div className="mt-4">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-gray-400 font-bold text-xs uppercase tracking-wider">İlerleme</span>
                                <span className={`text-sm font-black ${course.progress === 100 ? 'text-green-500' : 'text-gray-700'}`}>
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
                            {course.progress > 0 ? (
                                <button className={`w-full py-3 rounded-xl ${course.color} text-white font-black hover:opacity-90 transition-opacity shadow-md`}>
                                    Devam Et
                                </button>
                            ) : (
                                <button className={`w-full py-3 rounded-xl border-2 ${course.border} ${course.lightColor} text-gray-700 font-black hover:bg-white transition-colors`}>
                                    Kursa Başla
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {/* Add New Course Card */}
                <div className="bg-gray-50 rounded-3xl border-4 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-center hover:bg-gray-100 hover:border-gray-400 transition-all cursor-pointer group min-h-[300px]">
                    <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center text-5xl mb-4 text-gray-400 group-hover:text-gray-500 group-hover:scale-110 transition-all pb-2">
                        +
                    </div>
                    <h3 className="text-2xl font-bold text-gray-500 font-display group-hover:text-gray-600">Yeni Kurs Satın Al</h3>
                    <p className="text-gray-400 font-bold text-sm mt-2 uppercase tracking-wide">Kütüphaneni Genişlet</p>
                </div>
            </div>
        </div>
    );
};

export default ContentPage;
