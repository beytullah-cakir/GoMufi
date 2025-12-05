import React from 'react';
import BooksIcon from '../assets/sprites/BooksIcon.png';
import FireIcon from '../assets/sprites/Fire.png';

const CoursesPage: React.FC = () => {
    // Mock Data for Courses
    const courses = [
        { id: 1, title: 'English A1', sub: 'Beginner', progress: 45, color: 'bg-cyan-500', lightColor: 'bg-cyan-100', border: 'border-cyan-500', icon: '🇬🇧' },
        { id: 2, title: 'English A2', sub: 'Elementary', progress: 12, color: 'bg-green-500', lightColor: 'bg-green-100', border: 'border-green-500', icon: '🇺🇸' },
        { id: 3, title: 'Business', sub: 'Professional', progress: 0, color: 'bg-purple-500', lightColor: 'bg-purple-100', border: 'border-purple-500', icon: '💼' },
        { id: 4, title: 'Travel', sub: 'Survival', progress: 0, color: 'bg-orange-500', lightColor: 'bg-orange-100', border: 'border-orange-500', icon: '✈️' },
        { id: 5, title: 'Grammar', sub: 'Mastery', progress: 80, color: 'bg-red-500', lightColor: 'bg-red-100', border: 'border-red-500', icon: '📚' },
        { id: 6, title: 'Speaking', sub: 'Conversation', progress: 0, color: 'bg-yellow-400', lightColor: 'bg-yellow-100', border: 'border-yellow-400', icon: '🗣️' },
    ];

    return (
        <div className="w-full h-full bg-white overflow-y-auto pb-20">
            {/* Header */}
            <div className="p-8 pb-4 flex justify-between items-end border-b-2 border-gray-100 sticky top-0 bg-white/95 backdrop-blur-sm z-20">
                <div>
                    <h1 className="text-4xl font-black text-gray-800 font-display">Kurslar</h1>
                    <p className="text-gray-500 font-bold mt-2 text-lg">Dil öğrenme macerana yön ver!</p>
                </div>

                {/* Mini Stats for Context */}
                <div className="flex items-center gap-3 bg-orange-50 px-4 py-2 rounded-2xl border-2 border-orange-100">
                    <img src={FireIcon} alt="Streak" className="w-6 h-6" />
                    <span className="font-black text-orange-500 font-display text-xl">2 Active</span>
                </div>
            </div>

            {/* Courses Grid */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">

                {/* Current Course Card (Featured) */}
                <div className="col-span-full mb-4">
                    <div className="bg-gradient-to-r from-sky-400 to-blue-500 rounded-3xl p-8 text-white relative overflow-hidden group hover:scale-[1.01] transition-transform duration-300 shadow-lg shadow-sky-200">
                        <div className="relative z-10 flex justify-between items-center">
                            <div>
                                <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-black backdrop-blur-md mb-3 border border-white/30">CURRENTLY LEARNING</span>
                                <h2 className="text-4xl font-black font-display mb-2">English B1</h2>
                                <p className="text-blue-100 font-medium text-lg mb-6 max-w-md">Continue your journey where you left off. You are doing great!</p>

                                <button className="bg-white text-blue-500 px-8 py-3 rounded-2xl font-black text-lg shadow-lg hover:bg-blue-50 transition-colors flex items-center gap-2 group-hover:gap-4 duration-300">
                                    Continue Learning
                                    <span className="text-2xl">→</span>
                                </button>
                            </div>

                            {/* Decorative Icon */}
                            <div className="hidden lg:block">
                                <img src={BooksIcon} alt="Books" className="w-48 drop-shadow-2xl transform group-hover:rotate-6 transition-transform duration-500" />
                            </div>
                        </div>

                        {/* Background Decor */}
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                </div>

                {/* Other Courses */}
                {courses.map((course) => (
                    <div key={course.id} className={`bg-white rounded-3xl border-4 ${course.border} p-6 relative group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-pointer`}>
                        {/* Header */}
                        <div className="flex justify-between items-start mb-6">
                            <div className={`w-16 h-16 rounded-2xl ${course.color} flex items-center justify-center text-4xl shadow-md transform group-hover:scale-110 transition-transform duration-300 delay-75`}>
                                {course.icon}
                            </div>
                            {course.progress > 0 && (
                                <span className={`px-3 py-1 rounded-full ${course.lightColor} text-gray-700 font-bold text-xs`}>
                                    {course.progress}%
                                </span>
                            )}
                        </div>

                        {/* Content */}
                        <h3 className="text-2xl font-black text-gray-800 font-display mb-1 group-hover:text-gray-900">{course.title}</h3>
                        <p className="text-gray-400 font-bold text-sm mb-6 uppercase tracking-wide">{course.sub}</p>

                        {/* Action or Progress */}
                        {course.progress > 0 ? (
                            <div className="w-full bg-gray-100 h-4 rounded-full overflow-hidden">
                                <div
                                    className={`h-full ${course.color} transition-all duration-1000 ease-out`}
                                    style={{ width: `${course.progress}%` }}
                                ></div>
                            </div>
                        ) : (
                            <button className={`w-full py-3 rounded-xl border-2 ${course.border} ${course.lightColor} font-bold text-gray-700 hover:bg-white transition-colors uppercase text-sm tracking-widest`}>
                                Start Course
                            </button>
                        )}
                    </div>
                ))}

                {/* Coming Soon Card */}
                <div className="bg-gray-50 rounded-3xl border-4 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center text-center opacity-70 hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-3xl mb-4 text-gray-400">
                        +
                    </div>
                    <h3 className="text-xl font-bold text-gray-400 font-display">More Coming Soon</h3>
                    <p className="text-gray-400 text-sm mt-2">We are cooking new content!</p>
                </div>

            </div>
        </div>
    );
};

export default CoursesPage;
