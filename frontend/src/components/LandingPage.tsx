import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Palette, Calculator, Languages, Dumbbell, Code, MoveRight, Search, ShoppingCart } from 'lucide-react';
import LogoText from '../assets/sprites/LogoText.png';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const categories = [
        { name: 'Matematik', icon: <Calculator className="w-8 h-8 text-blue-500" />, color: 'bg-blue-50' },
        { name: 'Müzik', icon: <Music className="w-8 h-8 text-pink-500" />, color: 'bg-pink-50' },
        { name: 'Dil', icon: <Languages className="w-8 h-8 text-orange-500" />, color: 'bg-orange-50' },
        { name: 'Sanat', icon: <Palette className="w-8 h-8 text-purple-500" />, color: 'bg-purple-50' },
        { name: 'Spor', icon: <Dumbbell className="w-8 h-8 text-green-500" />, color: 'bg-green-50' },
        { name: 'Yazılım', icon: <Code className="w-8 h-8 text-indigo-500" />, color: 'bg-indigo-50' },
    ];

    const instructors = [
        { name: 'Ahmet Y.', subject: 'İleri Matematik', rating: 5.0, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Brian&mouth=smile' },
        { name: 'Zeynep K.', subject: 'Piyano & Keman', rating: 4.9, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Senorita' },
        { name: 'Mehmet S.', subject: 'İngilizce', rating: 4.8, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Christopher&mouth=twinkle' },
        { name: 'Elif T.', subject: 'Kodlama', rating: 5.0, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annie&mouth=smile' },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-display selection:bg-indigo-200">
            {/* GoMufi Custom Navbar */}
            <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md h-[88px] px-6 flex items-center justify-between gap-4 transition-all border-b border-gray-100/50 supports-[backdrop-filter]:bg-white/60">
                {/* Logo */}
                <div className="flex-shrink-0 cursor-pointer group" onClick={() => navigate('/')}>
                    <img src={LogoText} alt="GoMufi" className="h-20 object-contain group-hover:scale-105 transition-transform duration-300" />
                </div>

                {/* Search Bar - Custom Soft Style */}
                <div className="flex-1 max-w-2xl hidden md:flex relative group mx-8">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                        <Search className="w-5 h-5 group-focus-within:text-indigo-500 transition-colors duration-300" />
                    </div>
                    <input
                        type="text"
                        placeholder="Ne öğrenmek istersiniz?"
                        className="w-full pl-12 pr-4 py-3.5 bg-gray-100/50 border-2 border-transparent rounded-full text-sm outline-none focus:bg-white focus:border-indigo-200 focus:ring-4 focus:ring-indigo-50/50 transition-all duration-300 placeholder-gray-400 text-gray-700 font-bold shadow-sm group-hover:bg-white group-hover:shadow-md"
                    />
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                    <button className="hidden sm:block p-3 rounded-full hover:bg-gray-100/80 text-gray-600 hover:text-indigo-600 transition-colors">
                        <ShoppingCart className="w-6 h-6" />
                    </button>

                    <button
                        onClick={() => navigate('/auth')}
                        className="px-8 py-3.5 rounded-full bg-gray-900 text-white font-bold text-sm hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 transition-all duration-300 shadow-md flex items-center gap-2"
                    >
                        Giriş Yap / Kaydol
                    </button>
                </div>
            </nav>

            {/* Mobile Search (Visible only on small screens) */}
            <div className="md:hidden p-4 bg-white border-b border-gray-100">
                <div className="relative">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                        <Search className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        placeholder="Ne öğrenmek istersiniz?"
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-full text-sm outline-none focus:bg-white focus:border-indigo-300 transition-all placeholder-gray-500"
                    />
                </div>
            </div>

            {/* Hero Section */}
            <section className="relative pt-10 pb-20 px-6 overflow-hidden">
                <div className="absolute inset-0 z-0 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                    <div className="absolute top-[-20%] left-[-20%] w-[50rem] h-[50rem] bg-indigo-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob"></div>
                    <div className="absolute bottom-[-20%] right-[-20%] w-[50rem] h-[50rem] bg-pink-300 rounded-full mix-blend-multiply filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
                </div>

                <div className="relative z-10 max-w-4xl mx-auto text-center mt-10">
                    <div className="inline-block px-4 py-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/50 text-indigo-600 font-bold text-sm mb-6 animate-fade-in-up">
                        🚀 Mükemmel Öğretmenini Bul
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-gray-800 mb-8 tracking-tight leading-tight animate-fade-in-up animation-delay-200">
                        Eğlenerek <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Öğren</span>, <br />
                        Geleceği <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Keşfet</span>
                    </h1>
                    <p className="text-xl text-gray-500 mb-12 max-w-2xl mx-auto font-medium animate-fade-in-up animation-delay-400">
                        Binlerce özel ders öğretmeni, yüzlerce kategori. İster online, ister yüz yüze.
                    </p>
                </div>
            </section>

            {/* Categories Section */}
            <section className="py-20 px-6 bg-white z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 mb-2">Popüler Kategoriler</h2>
                            <p className="text-gray-400 font-medium">En çok tercih edilen dersleri keşfet</p>
                        </div>
                        <button className="hidden md:flex items-center gap-2 text-indigo-600 font-bold hover:gap-3 transition-all">
                            Tümünü Gör <MoveRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {categories.map((cat, idx) => (
                            <div key={idx} className={`${cat.color} p-6 rounded-3xl cursor-pointer hover:scale-105 transition-transform duration-300 border border-transparent hover:border-black/5`}>
                                <div className="mb-4">{cat.icon}</div>
                                <h3 className="font-bold text-gray-800">{cat.name}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Instructors Section */}
            <section className="py-20 px-6 bg-gray-50 z-10 border-t border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-black text-gray-800 mb-2">Haftanın Yıldız Eğitmenleri</h2>
                        <p className="text-gray-400 font-medium">Öğrencilerin favori öğretmenleri</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {instructors.map((instructor, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300 group">
                                <div className="relative mb-4 overflow-hidden rounded-2xl bg-gray-100">
                                    <img
                                        src={instructor.image}
                                        alt={instructor.name}
                                        className="w-full h-48 object-contain bg-center group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                                        ⭐ {instructor.rating}
                                    </div>
                                </div>
                                <h3 className="font-bold text-xl text-gray-800">{instructor.name}</h3>
                                <p className="text-indigo-500 font-medium text-sm mb-4">{instructor.subject}</p>
                                <button className="w-full py-3 rounded-xl bg-gray-50 text-gray-900 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                    Profili Gör
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer Simple */}
            <footer className="py-10 text-center text-gray-400 text-sm font-medium">
                © 2024 GoMufi. Tüm hakları saklıdır.
            </footer>
        </div>
    );
};

export default LandingPage;
