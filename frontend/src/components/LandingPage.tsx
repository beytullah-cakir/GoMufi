import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, Palette, Calculator, Languages, Dumbbell, Code, MoveRight, Star, Users, Award, CheckCircle2, ChevronDown, Sparkles, Search, ShoppingCart, Facebook, Instagram, Twitter, Linkedin, Youtube } from 'lucide-react';
import LogoText from '../assets/sprites/LogoText.png';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    const instructors = [
        { name: 'Ahmet Y.', subject: 'İleri Matematik', rating: 5.0, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Brian&mouth=smile' },
        { name: 'Zeynep K.', subject: 'Piyano & Keman', rating: 4.9, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Senorita' },
        { name: 'Mehmet S.', subject: 'İngilizce', rating: 4.8, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Christopher&mouth=twinkle' },
        { name: 'Elif T.', subject: 'Kodlama', rating: 5.0, image: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Annie&mouth=smile' },
    ];

    return (
        <div className="min-h-screen bg-white flex flex-col font-display selection:bg-indigo-200">
            {/* GoMufi Custom Navbar */}
            <nav className="sticky top-0 z-50 bg-white shadow-md h-[72px] px-4 md:px-6 flex items-center justify-between gap-4 transition-all overflow-x-auto">
                {/* Logo */}
                <div className="flex-shrink-0 cursor-pointer group" onClick={() => navigate('/')}>
                    <img src={LogoText} alt="GoMufi" className="h-[75px] object-contain" />
                </div>

                {/* Search Bar - Moved to Left */}
                <div className="flex-1 max-w-sm hidden md:flex relative group mx-2">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                        <Search className="w-4 h-4 group-focus-within:text-indigo-600 transition-colors duration-300" />
                    </div>
                    <input
                        type="text"
                        placeholder="Ne öğrenmek istersiniz?"
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm outline-none focus:bg-white focus:ring-2 focus:ring-indigo-600 transition-all duration-300 placeholder-gray-500 text-gray-800"
                    />
                </div>

                {/* Navbar Tabs */}
                <div className="hidden lg:flex items-center gap-6 text-sm font-bold text-gray-700 whitespace-nowrap">
                    <button onClick={() => scrollToSection('features')} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                        GoMufi Hakkında <ChevronDown className="w-3 h-3" />
                    </button>
                    <button onClick={() => scrollToSection('courses')} className="hover:text-indigo-600 transition-colors">Kurslar</button>
                    <button onClick={() => scrollToSection('faq')} className="hover:text-indigo-600 transition-colors">SSS</button>
                    <button onClick={() => scrollToSection('footer')} className="hover:text-indigo-600 transition-colors">İletişim</button>
                    <button onClick={() => scrollToSection('footer')} className="hover:text-indigo-600 transition-colors">İade Politikası</button>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 text-sm font-medium">
                    <button className="flex items-center gap-1 hover:text-indigo-600 transition-colors font-bold">
                        TR <ChevronDown className="w-3 h-3" />
                    </button>

                    <button className="hidden sm:block p-2 text-gray-600 hover:text-indigo-600 transition-colors">
                        <ShoppingCart className="w-5 h-5" />
                    </button>

                    <button
                        onClick={() => navigate('/auth')}
                        className="px-6 py-2.5 bg-white text-gray-800 border-2 border-gray-800 font-bold hover:bg-gray-800 hover:text-white transition-all duration-300 rounded-full"
                    >
                        Giriş Yap / Kaydol
                    </button>
                </div>
            </nav>

            {/* Mobile Search (Visible only on small screens) */}
            {/* Mobile Menu Button (Visible only on small screens) */}
            <div className="lg:hidden p-4 bg-white border-b border-gray-100 flex justify-center gap-4 text-sm font-bold text-gray-600 overflow-x-auto">
                <span>Kurslar</span>
                <span>SSS</span>
                <span>İletişim</span>
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

            {/* Stats / Trust Bar */}
            <section className="py-10 bg-white border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: 'Mutlu Öğrenci', value: '10,000+', icon: <Users className="w-6 h-6 text-indigo-500" /> },
                            { label: 'Onaylı Eğitmen', value: '500+', icon: <CheckCircle2 className="w-6 h-6 text-green-500" /> },
                            { label: 'Ders Kategorisi', value: '50+', icon: <Award className="w-6 h-6 text-orange-500" /> },
                            { label: 'Yıldız Puanı', value: '4.9/5', icon: <Star className="w-6 h-6 text-yellow-500" /> },
                        ].map((stat, idx) => (
                            <div key={idx} className="flex flex-col items-center text-center p-4 rounded-2xl hover:bg-gray-50 transition-colors">
                                <div className="mb-2 p-3 bg-gray-100 rounded-full">{stat.icon}</div>
                                <div className="text-3xl font-black text-gray-800 mb-1">{stat.value}</div>
                                <div className="text-gray-500 font-medium text-sm">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Why Us / Features */}
            <section id="features" className="py-20 px-6 bg-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">Neden GoMufi?</h2>
                        <p className="text-gray-500 text-lg max-w-2xl mx-auto">Sıkıcı derslere son veriyoruz. İşte bizi farklı kılan özellikler.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { title: 'Eğlenceli Öğrenme', desc: 'Oyunlaştırılmış ders içerikleri ile sıkılmadan öğren.', icon: <Sparkles className="w-8 h-8 text-white" />, color: 'bg-pink-500' },
                            { title: 'Güvenli Ödeme', desc: 'Ders tamamlanana kadar paranız güvende.', icon: <CheckCircle2 className="w-8 h-8 text-white" />, color: 'bg-indigo-500' },
                            { title: 'Doğrulanmış Eğitmenler', desc: 'Tüm eğitmenlerimiz titiz bir incelemeden geçer.', icon: <Award className="w-8 h-8 text-white" />, color: 'bg-purple-500' },
                        ].map((feature, idx) => (
                            <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm hover:shadow-lg transition-all border border-gray-100">
                                <div className={`${feature.color} w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md rotate-3 hover:rotate-6 transition-transform`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">{feature.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Courses Cards Section */}
            <section id="courses" className="py-20 px-6 bg-white z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 mb-2">Popüler Kurslar</h2>
                            <p className="text-gray-400 font-medium">En çok tercih edilen eğitim programları</p>
                        </div>
                        <button className="hidden md:flex items-center gap-2 text-indigo-600 font-bold hover:gap-3 transition-all">
                            Tüm Kursları Gör <MoveRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                age: 'YAŞ 8-11',
                                title: 'Scratch ile Kodlamanın Büyüsü',
                                desc: "Scratch'te çocuklar için kodlama ile görsel programlama, oyun ve çizgi film oluşturmak için temel algoritmalar.",
                                tags: ['Görsel Kodlama', 'Tasarım', 'Oyunlar'],
                                icon: <Code className="w-12 h-12 text-pink-500" />,
                                color: 'bg-pink-50',
                                btnColor: 'bg-indigo-500'
                            },
                            {
                                age: 'YAŞ 10-14',
                                title: 'Dijital Yaratıcılık PRO',
                                desc: "Sadece illüstrasyon değil, animasyon ve 3D bilgilerin bir kombinasyonu. Fikirleri hayata geçirmenin bir yoludur.",
                                tags: ['3D modelleme', 'Animasyon', 'İllüstrasyon'],
                                icon: <Palette className="w-12 h-12 text-purple-500" />,
                                color: 'bg-purple-50',
                                btnColor: 'bg-indigo-500'
                            },
                            {
                                age: 'YAŞ 14-17',
                                title: 'Python PRO',
                                desc: "Gençlere yönelik bu kursta, yaratıcılıklarınızı ortaya çıkaracak ve Python dilinin gelişmiş yeteneklerini keşfedeceksiniz!",
                                tags: ['API', 'HTML', 'Yapay Zeka', 'Veri Madenciliği'],
                                icon: <Languages className="w-12 h-12 text-blue-500" />,
                                color: 'bg-blue-50',
                                btnColor: 'bg-indigo-500'
                            },
                            {
                                age: 'YAŞ 10-13',
                                title: 'Roblox Oyun Tasarımı',
                                desc: "Sıfırdan oyunlar yaratmayı, hikayeler ve dijital dünyalar tasarlamayı ve projeleri yayınlamayı öğrenin.",
                                tags: ['3D Modelleme', 'Oyun Tasarımı', 'Yaratıcılık'],
                                icon: <Dumbbell className="w-12 h-12 text-orange-500" />, // Using dumbell as visible placeholder for active icon
                                color: 'bg-orange-50',
                                btnColor: 'bg-indigo-500'
                            },
                            {
                                age: 'YAŞ 7-10',
                                title: 'Matematik Temelleri',
                                desc: "Sayılarla eğlenceli bir yolculuğa çıkın. Temel matematik kavramlarını oyunlarla pekiştirin.",
                                tags: ['Aritmetik', 'Mantık', 'Problem Çözme'],
                                icon: <Calculator className="w-12 h-12 text-green-500" />,
                                color: 'bg-green-50',
                                btnColor: 'bg-indigo-500'
                            },
                            {
                                age: 'YAŞ 12-18',
                                title: 'Müzik Prodüksiyonu',
                                desc: "Kendi müziğini yap! Dijital araçlarla beste yapmayı ve ses tasarımının temellerini öğren.",
                                tags: ['DAW', 'Beste', 'Sound Design'],
                                icon: <Music className="w-12 h-12 text-yellow-500" />,
                                color: 'bg-yellow-50',
                                btnColor: 'bg-indigo-500'
                            },
                        ].map((course, idx) => (
                            <div key={idx} className={`p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full bg-white group`}>
                                <div className="flex justify-between items-start mb-6">
                                    <span className="text-indigo-500 font-bold text-sm tracking-wide">{course.age}</span>
                                    <div className={`p-3 rounded-2xl ${course.color} group-hover:scale-110 transition-transform duration-300`}>
                                        {course.icon}
                                    </div>
                                </div>

                                <h3 className="text-2xl font-black text-gray-800 mb-4 leading-tight">{course.title}</h3>
                                <p className="text-gray-500 font-medium mb-8 flex-grow leading-relaxed">
                                    {course.desc}
                                </p>

                                <div className="flex flex-wrap gap-2 mb-8">
                                    {course.tags.map((tag, tIdx) => (
                                        <span key={tIdx} className="px-4 py-2 rounded-xl bg-gray-50 text-gray-600 text-xs font-bold border border-gray-100">
                                            {tag}
                                        </span>
                                    ))}
                                </div>

                                <button className={`w-full py-4 rounded-xl ${course.btnColor} text-white font-bold text-lg shadow-lg shadow-indigo-200 hover:opacity-90 hover:scale-[1.02] transition-all active:scale-95`}>
                                    Daha fazla öğrenin
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20 px-6 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-4xl font-black text-gray-800 mb-4">3 Adımda Başla</h2>
                        <p className="text-gray-500 text-lg">Hemen öğrenmeye başlamak işte bu kadar kolay.</p>
                    </div>

                    <div className="relative grid md:grid-cols-3 gap-12">
                        {/* Connecting Line (Desktop) */}
                        <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-1 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 border-t-2 border-dashed border-gray-200 z-0"></div>

                        {[
                            { step: '01', title: 'Eğitmenini Bul', desc: 'Yüzlerce kategori arasından sana en uygun eğitmeni seç.', color: 'text-indigo-600', bg: 'bg-indigo-50' },
                            { step: '02', title: 'Dersini Planla', desc: 'Uygun olduğun gün ve saati belirle, randevunu oluştur.', color: 'text-purple-600', bg: 'bg-purple-50' },
                            { step: '03', title: 'Öğrenmeye Başla', desc: 'Canlı derslere katıl ve kendini geliştirmeye başla!', color: 'text-pink-600', bg: 'bg-pink-50' },
                        ].map((item, idx) => (
                            <div key={idx} className="relative z-10 flex flex-col items-center text-center group">
                                <div className={`w-24 h-24 rounded-full ${item.bg} flex items-center justify-center mb-6 border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                    <span className={`text-3xl font-black ${item.color}`}>{item.step}</span>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-3">{item.title}</h3>
                                <p className="text-gray-500 font-medium">{item.desc}</p>
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

            {/* Testimonials */}
            <section className="py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-3xl font-black text-gray-800 mb-2">Öğrencilerimiz Ne Diyor?</h2>
                            <p className="text-gray-400 font-medium">Bizi öğrencilerimize sorun</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            { name: 'Ayşe Y.', role: 'Lise Öğrencisi', comment: 'Matematik derslerim artık kabus değil! Harika bir platform.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse' },
                            { name: 'Can B.', role: 'Üniversite Öğrencisi', comment: 'İngilizce pratiği için en iyi yer. Eğitmenler çok ilgili.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Can' },
                            { name: 'Merve S.', role: 'Hobi Sever', comment: 'Piyano öğrenmek hiç bu kadar keyifli olmamıştı.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Merve' },
                        ].map((review, idx) => (
                            <div key={idx} className="bg-gray-50 p-8 rounded-[2rem] hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100">
                                <div className="flex gap-1 mb-4">
                                    {[1, 2, 3, 4, 5].map((s) => <Star key={s} className="w-5 h-5 text-yellow-400 fill-current" />)}
                                </div>
                                <p className="text-gray-700 font-medium mb-6 text-lg">"{review.comment}"</p>
                                <div className="flex items-center gap-4">
                                    <img src={review.avatar} alt={review.name} className="w-12 h-12 rounded-full bg-white shadow-sm" />
                                    <div>
                                        <div className="font-bold text-gray-900">{review.name}</div>
                                        <div className="text-sm text-gray-500">{review.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-10 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="relative overflow-hidden bg-gray-900 rounded-[3rem] p-12 md:p-20 text-center">
                        <div className="absolute top-0 left-0 w-full h-full">
                            <div className="absolute top-[-50%] left-[-20%] w-[40rem] h-[40rem] bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
                            <div className="absolute bottom-[-50%] right-[-20%] w-[40rem] h-[40rem] bg-pink-600 rounded-full mix-blend-screen filter blur-[100px] opacity-30"></div>
                        </div>

                        <div className="relative z-10 max-w-2xl mx-auto">
                            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Bildiklerini Kazanca Dönüştür</h2>
                            <p className="text-gray-300 text-xl mb-10 font-medium">Binlerce öğrenciye ulaş, kendi programını belirle ve kazanmaya başla.</p>
                            <button className="px-10 py-5 bg-white text-gray-900 rounded-full font-black text-lg hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                                GoMufi'de Eğitmen Ol
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ Section */}
            <section id="faq" className="py-20 px-6 bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-black text-gray-800 mb-4">Sıkça Sorulan Sorular</h2>
                        <p className="text-gray-400 font-medium">Aklınızda soru işareti kalmasın</p>
                    </div>

                    <div className="space-y-4">
                        {[
                            { q: 'Dersler nasıl işleniyor?', a: 'Dersler görüntülü görüşme üzerinden, interaktif bir şekilde işlenir.' },
                            { q: 'Ödeme güvenli mi?', a: 'Evet, ödemeniz ders gerçekleşene kadar güvenli havuz hesabında tutulur.' },
                            { q: 'Eğitmenleriniz sertifikalı mı?', a: 'Tüm eğitmenlerimiz uzmanlık alanlarına göre doğrulanmış ve sertifikalıdır.' }
                        ].map((faq, idx) => (
                            <div key={idx} className="border-b border-gray-100 last:border-0 pb-4">
                                <details className="group cursor-pointer">
                                    <summary className="flex justify-between items-center py-4 font-bold text-lg text-gray-800 group-hover:text-indigo-600 transition-colors list-none">
                                        {faq.q}
                                        <ChevronDown className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform" />
                                    </summary>
                                    <div className="text-gray-500 font-medium leading-relaxed pb-4 animate-fade-in">
                                        {faq.a}
                                    </div>
                                </details>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer Superprof Style */}
            <footer id="footer" className="bg-gray-900 text-gray-300 py-16 px-6 text-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
                        {/* Column 1: Hakkımızda */}
                        <div>
                            <h3 className="font-bold text-white mb-6 text-lg">Hakkımızda</h3>
                            <ul className="space-y-4">
                                {['Biz kimiz?', 'Yasal uyarılar', 'Gizlilik Politikası', 'Dünyada GoMufi', 'Online Dersler', 'Şehirler', 'GoMufi kariyer'].map((link) => (
                                    <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                                ))}
                            </ul>
                        </div>

                        {/* Column 2: Dersler */}
                        <div>
                            <h3 className="font-bold text-white mb-6 text-lg">Dersler</h3>
                            <ul className="space-y-4">
                                {['Sanat ve Hobi', 'Okul ve Sınavlar', 'Bilişim', 'Yabancı diller', 'Müzik', 'Sağlık ve Meditasyon', 'Mesleki gelişim', 'Spor ve Dans'].map((link) => (
                                    <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                                ))}
                            </ul>
                        </div>

                        {/* Column 3: Kaynaklar */}
                        <div>
                            <h3 className="font-bold text-white mb-6 text-lg">Kaynaklar</h3>
                            <ul className="space-y-4">
                                {['GoMufi Blog'].map((link) => (
                                    <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                                ))}
                            </ul>
                        </div>

                        {/* Column 4: Yardım */}
                        <div>
                            <h3 className="font-bold text-white mb-6 text-lg">Yardım</h3>
                            <ul className="space-y-4">
                                {['Yardım merkezi', 'İletişim'].map((link) => (
                                    <li key={link}><a href="#" className="hover:text-white transition-colors">{link}</a></li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                        <p>© 2025 GoMufi, en iyileriyle öğrenin!</p>
                        <div className="flex items-center gap-4">
                            {[Facebook, Twitter, Instagram, Youtube, Linkedin].map((Icon, idx) => (
                                <a key={idx} href="#" className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                                    <Icon className="w-5 h-5 text-white" />
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
