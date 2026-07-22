import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Brain,
    Layout,
    Gamepad2,
    Calendar,
    TrendingUp,
    Sparkles,
    Code,
    Users,
    CheckCircle2,
    ArrowRight,
    Lock,
    Plus,
    Play,
    Settings,
    Layers,
    Video,
    Check,
    ChevronDown,
    Menu,
    X,
    Search,
    BookOpen,
    Trophy,
    MessageSquare,
    ChevronRight,
    HelpCircle,
    UserCheck,
    Cpu,
    MousePointerClick,
    Volume2,
    Swords,
    ShieldAlert,
    KeyRound,
    Zap,
    Bot
} from 'lucide-react';

import LogoText from '../assets/sprites/GoMufiLogo_Final.png';
import BrainSprite from '../assets/sprites/Brain.png';
import PencilSprite from '../assets/sprites/Pencil.png';
import PuzzleSprite from '../assets/sprites/Puzzle.png';
import TrophySprite from '../assets/sprites/Trophy.png';
import QuestionSprite from '../assets/sprites/Question.png';
import PythonIcon from '../assets/sprites/PythonIcon.png';
import EnglishIcon from '../assets/sprites/EnglishIcon.png';
import JsIcon from '../assets/sprites/JsIcon.png';
import MufiMascot from '../assets/sprites/MufiMascot.png';
import GrassIcon from '../assets/sprites/grass.png';
import ButtonCyan from '../assets/sprites/ButtonCyan.png';
import ButtonPurple from '../assets/sprites/ButtonPurple.png';
import ButtonYellow from '../assets/sprites/ButtonYellow.png';
import ButtonGreen from '../assets/sprites/ButtonGreen.png';
import Frame1 from '../assets/sprites/Mufi/Frame1.png';
import Frame2 from '../assets/sprites/Mufi/Frame2.png';

// Inline Vector Cloud Component for clean sharp rendering
const VectorCloud: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 120 80" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M 25,60 A 20,20 0 0,1 45,30 A 25,25 0 0,1 85,25 A 20,20 0 0,1 105,45 A 15,15 0 0,1 100,75 L 25,75 Z" />
    </svg>
);

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [activePreviewTab, setActivePreviewTab] = useState<'roadmap' | 'editor' | 'live' | 'student'>('roadmap');
    const [faqOpen, setFaqOpen] = useState<number | null>(null);

    // AI dynamic creation loop states (Step 0 to 5)
    const [simStep, setSimStep] = useState(0);
    const [typedPrompt, setTypedPrompt] = useState("");
    const [roadNodeCount, setRoadNodeCount] = useState(0);
    const [slideCount, setSlideCount] = useState(0);
    const [codeLinesCount, setCodeLinesCount] = useState(0);
    const [quizCompileCount, setQuizCompileCount] = useState(0);
    const fullPrompt = "Python Değişkenleri";

    // Builder Cat frame animation state
    const [builderCatFrame, setBuilderCatFrame] = useState(1);

    useEffect(() => {
        if (simStep === 5) {
            setBuilderCatFrame(1);
            return;
        }

        const interval = setInterval(() => {
            setBuilderCatFrame(prev => prev === 1 ? 2 : 1);
        }, 350);

        return () => clearInterval(interval);
    }, [simStep]);

    // Falling icons state & spawn effect + proportional progress
    const [fallingIcons, setFallingIcons] = useState<{ id: number; img: string; leftOffset: number }[]>([]);

    useEffect(() => {
        if (builderCatFrame === 2 && simStep !== 5) {
            const icons = [BrainSprite, PencilSprite, PuzzleSprite, TrophySprite, QuestionSprite];
            const randomIcon = icons[Math.floor(Math.random() * icons.length)];
            const newItem = {
                id: Date.now() + Math.random(),
                img: randomIcon,
                leftOffset: Math.floor(Math.random() * 120) - 60
            };
            setFallingIcons(prev => [...prev, newItem]);
            
            setTimeout(() => {
                setFallingIcons(prev => prev.filter(item => item.id !== newItem.id));
            }, 900);

            // Proportional progress for each step driven by strikes!
            if (simStep === 1) {
                setRoadNodeCount(prev => {
                    const next = prev + 1;
                    return next > 5 ? 5 : next;
                });
            } else if (simStep === 2) {
                setSlideCount(prev => {
                    const next = prev + 3;
                    return next > 12 ? 12 : next;
                });
            } else if (simStep === 3) {
                setCodeLinesCount(prev => {
                    const next = prev + 1;
                    return next > 3 ? 3 : next;
                });
            } else if (simStep === 4) {
                setQuizCompileCount(prev => {
                    const next = prev + 1;
                    return next > 3 ? 3 : next;
                });
            }
        }
    }, [builderCatFrame, simStep]);

    // Unified simulation stage transition controller based on progress values
    useEffect(() => {
        if (simStep === 0) return;
        let timeout: any;

        if (simStep === 1 && roadNodeCount === 5) {
            timeout = setTimeout(() => setSimStep(2), 1200);
        } else if (simStep === 2 && slideCount === 12) {
            timeout = setTimeout(() => setSimStep(3), 1200);
        } else if (simStep === 3 && codeLinesCount === 3) {
            timeout = setTimeout(() => setSimStep(4), 1200);
        } else if (simStep === 4 && quizCompileCount === 3) {
            timeout = setTimeout(() => setSimStep(5), 1200);
        }

        return () => clearTimeout(timeout);
    }, [simStep, roadNodeCount, slideCount, codeLinesCount, quizCompileCount]);

    // Robust typing effect loop
    useEffect(() => {
        if (simStep !== 0) return;

        setTypedPrompt("");
        setRoadNodeCount(0);
        setSlideCount(0);
        setCodeLinesCount(0);
        setQuizCompileCount(0);
        let currentString = "";
        let index = 0;

        const typingInterval = setInterval(() => {
            if (index < fullPrompt.length) {
                currentString += fullPrompt.charAt(index);
                setTypedPrompt(currentString);
                index++;
            } else {
                clearInterval(typingInterval);
                setTimeout(() => setSimStep(1), 1000);
            }
        }, 100);

        return () => clearInterval(typingInterval);
    }, [simStep]);

    // Sequential simulation step control
    useEffect(() => {
        if (simStep === 0) return;
        let timeout: any;

        if (simStep === 1) {
            // Managed by hammer strike trigger in combination with roadNodeCount transition useEffect
            return;
        } else if (simStep === 2) {
            // Generating slides
            timeout = setTimeout(() => setSimStep(3), 2000);
        } else if (simStep === 3) {
            // Building code samples
            timeout = setTimeout(() => setSimStep(4), 2200);
        } else if (simStep === 4) {
            // Building quizzes
            timeout = setTimeout(() => setSimStep(5), 2000);
        } else if (simStep === 5) {
            // Completed! Wait and reset
            timeout = setTimeout(() => setSimStep(0), 4500);
        }

        return () => clearTimeout(timeout);
    }, [simStep]);

    // Scroll Reveal Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('reveal-active');
                    }
                });
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        );

        const targets = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
        targets.forEach((target) => observer.observe(target));

        return () => {
            targets.forEach((target) => observer.unobserve(target));
        };
    }, []);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
            setIsMobileMenuOpen(false);
        }
    };

    const handleStudentJoin = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinCode.trim()) {
            navigate('/auth', { state: { role: 'student', code: joinCode.trim().toUpperCase() } });
        }
    };

    // FAQ list
    const faqs = [
        {
            q: "AI dersleri nasıl oluşturuyor?",
            a: "Yazmak istediğiniz konuyu (örneğin 'Python Değişkenler') girdiğinizde, AI motorumuz bu konuyu pedagojik standartlara göre analiz eder. Saniyeler içinde Anla, Uygula, Birleştir, Üret, Quiz ve Ödev modüllerinden oluşan tam kapsamlı, oyunlaştırılmış ve sunuma hazır bir ders içeriği üretir."
        },
        {
            q: "Oluşturulan içerikleri düzenleyebilir miyim?",
            a: "Evet, tamamen! GoMufi içinde entegre olarak gelen Canva benzeri zengin editörümüzle, AI tarafından oluşturulan tüm slaytları, kod örneklerini, oyun sahnelerini ve soruları sürükle-bırak yöntemiyle dilediğiniz gibi özelleştirebilir, kendi materyallerinizi ekleyebilirsiniz."
        },
        {
            q: "Öğrenciler derse nasıl katılıyor?",
            a: "Öğretmen olarak canlı dersinizi başlattığınızda sistem size benzersiz bir ders katılım kodu üretir. Öğrencileriniz ana sayfamızdaki 'Kod Gir' alanına veya kendi panellerine bu kodu yazarak herhangi bir karmaşık kurulum yapmadan saniyeler içinde canlı dersinize katılırlar."
        },
        {
            q: "Kendi materyallerimi yükleyebilir miyim?",
            a: "Kesinlikle. Mevcut PDF, görsel, sunum veya YouTube videolarınızı sisteme kolayca yükleyebilir, bunları AI tarafından oluşturulmuş interaktif oyunlaştırılmış modüllerle harmanlayarak kendi özgün ders akışınızı oluşturabilirsiniz."
        },
        {
            q: "Canlı dersleri nasıl yönetiyorum?",
            a: "GoMufi eğitmen paneli üzerinden canlı dersinizi başlatıp yönetebilirsiniz. Öğrencilerin yanıtlarını, liderlik tablosunu, aktif oyun durumlarını ve anlık katılım istatistiklerini tek bir ekran üzerinden gerçek zamanlı olarak takip edebilirsiniz."
        },
        {
            q: "Hangi yaş grupları için uygun?",
            a: "Platformumuz özellikle K-12 (İlkokul, Ortaokul ve Lise) seviyesindeki tüm yaş grupları için uygundur. Yapay zeka motorumuz, girdiğiniz yaş seviyesine göre dil tonunu, oyunlaştırma zorluğunu ve anlatım derinliğini otomatik olarak ayarlar."
        },
        {
            q: "Ücretsiz plan var mı?",
            a: "Evet, GoMufi'ye ücretsiz olarak üye olabilir, ilk AI derslerinizi oluşturup platformun temel özelliklerini deneyimleyebilirsiniz. Daha geniş depolama, sınırsız canlı sınıf kapasitesi ve gelişmiş yapay zeka özellikleri için premium planlarımıza geçiş yapabilirsiniz."
        }
    ];

    // AI generated sample courses
    const sampleCourses = [
        {
            title: "Python Temelleri",
            icon: PythonIcon,
            lessons: "8 Canlı Ders",
            modules: "48 Modül",
            color: "bg-blue-50 border-blue-200"
        },
        {
            title: "Eğlenceli Robotik",
            icon: BrainSprite,
            lessons: "6 Canlı Ders",
            modules: "32 Modül",
            color: "bg-purple-50 border-purple-200"
        },
        {
            title: "Scratch ile Programlama",
            icon: PuzzleSprite,
            lessons: "10 Canlı Ders",
            modules: "60 Modül",
            color: "bg-pink-50 border-pink-200"
        },
        {
            title: "Görsel Matematik",
            icon: TrophySprite,
            lessons: "12 Canlı Ders",
            modules: "54 Modül",
            color: "bg-emerald-50 border-emerald-200"
        },
        {
            title: "İnteraktif İngilizce",
            icon: EnglishIcon,
            lessons: "8 Canlı Ders",
            modules: "40 Modül",
            color: "bg-amber-50 border-amber-200"
        }
    ];

    // Core feature list with rich custom styling variables
    const features = [
        {
            title: "AI Lesson Builder",
            highlight: "AI",
            gradient: "from-[#8b5cf6] to-purple-600",
            desc: "Tek komutla ders planı oluşturun, kazanımlara göre otomatik slaytlar elde edin.",
            icon: <Cpu className="w-7 h-7 text-[#8b5cf6]" />,
            cardBg: "from-white to-purple-50/20",
            cardBorder: "border-purple-200 hover:border-[#8b5cf6] border-b-purple-300",
            glowShadow: "hover:shadow-purple-100/80",
            watermarkColor: "text-purple-100/10 group-hover:text-purple-200/20",
            badgeColor: "bg-purple-50 border-purple-100"
        },
        {
            title: "Canva Benzeri Editör",
            highlight: "Editör",
            gradient: "from-blue-600 to-indigo-500",
            desc: "Hazır eğitsel şablonlar, görseller ve sürükle-bırak nesnelerle içerikleri kolayca düzenleyin.",
            icon: <Layout className="w-7 h-7 text-blue-600" />,
            cardBg: "from-white to-blue-50/20",
            cardBorder: "border-blue-200 hover:border-blue-500 border-b-blue-300",
            glowShadow: "hover:shadow-blue-100/80",
            watermarkColor: "text-blue-100/10 group-hover:text-blue-200/20",
            badgeColor: "bg-blue-50 border-blue-100"
        },
        {
            title: "Oyunlaştırılmış Dersler",
            highlight: "Oyunlaştırılmış",
            gradient: "from-pink-600 to-rose-500",
            desc: "Ders aralarına serpiştirilmiş quizler, anlık görevler ve mini oyunlarla motivasyonu zirvede tutun.",
            icon: <Gamepad2 className="w-7 h-7 text-pink-600" />,
            cardBg: "from-white to-pink-50/20",
            cardBorder: "border-pink-200 hover:border-pink-500 border-b-pink-300",
            glowShadow: "hover:shadow-pink-100/80",
            watermarkColor: "text-pink-100/10 group-hover:text-pink-200/20",
            badgeColor: "bg-pink-50 border-pink-100"
        },
        {
            title: "Hazır Modüller",
            highlight: "Modüller",
            gradient: "from-emerald-600 to-teal-500",
            desc: "Anla, Uygula, Birleştir, Üret, Quiz ve Ödev modülleriyle pedagojik ders akışları kurun.",
            icon: <Layers className="w-7 h-7 text-emerald-600" />,
            cardBg: "from-white to-emerald-50/20",
            cardBorder: "border-emerald-200 hover:border-emerald-500 border-b-emerald-300",
            glowShadow: "hover:shadow-emerald-100/80",
            watermarkColor: "text-emerald-100/10 group-hover:text-emerald-200/20",
            badgeColor: "bg-emerald-50 border-emerald-100"
        },
        {
            title: "Canlı Ders Yönetimi",
            highlight: "Canlı Ders",
            gradient: "from-amber-600 to-orange-500",
            desc: "Görüntülü bağlantı, öğrenci katılım takip araçları ve entegre takvim sistemi tek panelde.",
            icon: <Calendar className="w-7 h-7 text-amber-600" />,
            cardBg: "from-white to-amber-50/20",
            cardBorder: "border-amber-200 hover:border-amber-500 border-b-amber-300",
            glowShadow: "hover:shadow-amber-100/80",
            watermarkColor: "text-amber-100/10 group-hover:text-amber-200/20",
            badgeColor: "bg-amber-50 border-amber-100"
        },
        {
            title: "Öğrenci Analitiği",
            highlight: "Analitiği",
            gradient: "from-indigo-600 to-violet-500",
            desc: "Öğrencilerin gelişim raporlarını, katılım sürelerini ve soru başarı grafiklerini anlık izleyin.",
            icon: <TrendingUp className="w-7 h-7 text-indigo-600" />,
            cardBg: "from-white to-indigo-50/20",
            cardBorder: "border-indigo-200 hover:border-indigo-500 border-b-indigo-300",
            glowShadow: "hover:shadow-indigo-100/80",
            watermarkColor: "text-indigo-100/10 group-hover:text-indigo-200/20",
            badgeColor: "bg-indigo-50 border-indigo-100"
        }
    ];

    // Helper to render title with specific highlighted gradient word
    const renderTitle = (title: string, highlight: string, gradient: string) => {
        if (!highlight) return <span>{title}</span>;
        const parts = title.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    part.toLowerCase() === highlight.toLowerCase() ? (
                        <span key={i} className={`bg-clip-text text-transparent bg-gradient-to-r ${gradient} font-black`}>
                            {part}
                        </span>
                    ) : (
                        <span key={i} className="text-slate-800">{part}</span>
                    )
                )}
            </span>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-850 selection:bg-purple-200 overflow-x-hidden">
            <style>{`
                .reveal {
                    opacity: 0;
                    transform: translateY(40px);
                    transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .reveal-left {
                    opacity: 0;
                    transform: translateX(-50px);
                    transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .reveal-right {
                    opacity: 0;
                    transform: translateX(50px);
                    transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .reveal-scale {
                    opacity: 0;
                    transform: scale(0.93);
                    transition: opacity 0.8s cubic-bezier(0.2, 0.8, 0.2, 1), transform 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                .reveal-active {
                    opacity: 1;
                    transform: translate(0) scale(1) !important;
                }
                
                @keyframes float-cloud-1 {
                    0% { transform: translateX(0); }
                    50% { transform: translateX(25px) translateY(-5px); }
                    100% { transform: translateX(0); }
                }
                @keyframes float-cloud-2 {
                    0% { transform: translateX(0); }
                    50% { transform: translateX(-35px) translateY(5px); }
                    100% { transform: translateX(0); }
                }
                .animate-cloud-1 {
                    animation: float-cloud-1 14s ease-in-out infinite;
                }
                .animate-cloud-2 {
                    animation: float-cloud-2 18s ease-in-out infinite;
                }
                
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                .animate-bounce-slow {
                    animation: bounce-slow 3s ease-in-out infinite;
                }
                
                @keyframes card-impact {
                    0%, 100% { transform: translateX(0); }
                    15% { transform: translateX(-4px); }
                    30% { transform: translateX(3px); }
                    45% { transform: translateX(-2px); }
                    60% { transform: translateX(1px); }
                }
                .animate-card-impact {
                    animation: card-impact 0.2s ease-out;
                }
                
                @keyframes debris-1 {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
                    20% { transform: translate(-25px, -30px) rotate(45deg); }
                    100% { opacity: 0; transform: translate(-60px, 90px) rotate(180deg) scale(0.3); }
                }
                @keyframes debris-2 {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
                    25% { transform: translate(-15px, -45px) rotate(-60deg); }
                    100% { opacity: 0; transform: translate(-40px, 110px) rotate(-240deg) scale(0.2); }
                }
                @keyframes debris-3 {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
                    15% { transform: translate(-35px, -15px) rotate(30deg); }
                    100% { opacity: 0; transform: translate(-80px, 75px) rotate(120deg) scale(0.3); }
                }
                @keyframes debris-4 {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
                    30% { transform: translate(-10px, -35px) rotate(90deg); }
                    100% { opacity: 0; transform: translate(-30px, 120px) rotate(360deg) scale(0.2); }
                }
                @keyframes debris-5 {
                    0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
                    22% { transform: translate(-30px, -25px) rotate(-45deg); }
                    100% { opacity: 0; transform: translate(-70px, 100px) rotate(-180deg) scale(0.4); }
                }
                .animate-debris-1 {
                    animation: debris-1 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                .animate-debris-2 {
                    animation: debris-2 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                .animate-debris-3 {
                    animation: debris-3 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                .animate-debris-4 {
                    animation: debris-4 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                .animate-debris-5 {
                    animation: debris-5 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
                }
                
                .construction-tape {
                    background: repeating-linear-gradient(
                        -45deg,
                        #eab308,
                        #eab308 10px,
                        #1e293b 10px,
                        #1e293b 20px
                    );
                }
                
                .blueprint-grid {
                    background-size: 20px 20px;
                    background-image: 
                        linear-gradient(to right, rgba(139, 92, 246, 0.04) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(139, 92, 246, 0.04) 1px, transparent 1px);
                }
                
                @keyframes icon-fall {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -20px) scale(0.6) rotate(0deg);
                    }
                    15% {
                        opacity: 0.85;
                        transform: translate(-50%, 0) scale(1.05) rotate(15deg);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, 220px) scale(0.4) rotate(360deg);
                    }
                }
                .animate-icon-fall {
                    animation: icon-fall 0.85s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
                }
                
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
                .animate-float {
                    animation: float 2.5s ease-in-out infinite;
                }
                
                @keyframes shadow-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.15; }
                    50% { transform: scale(0.85); opacity: 0.08; }
                }
                .animate-shadow-pulse {
                    animation: shadow-pulse 2.5s ease-in-out infinite;
                }
            `}</style>

            {/* Header / Navbar */}
            <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm h-[90px] px-6 lg:px-12 flex items-center justify-between border-b-2 border-slate-100">
                <div className="flex items-center gap-6 xl:gap-8 w-full justify-between">
                    {/* Logo */}
                    <div className="flex-shrink-0 cursor-pointer group" onClick={() => navigate('/')}>
                        <img src={LogoText} alt="GoMufi" className="h-[48px] md:h-[58px] object-contain group-hover:scale-105 transition-transform duration-300" />
                    </div>

                    {/* Clean navigation links matching main app sidebar hover styles */}
                    <div className="hidden xl:flex items-center gap-2 text-sm font-black tracking-wider whitespace-nowrap">
                        <button
                            onClick={() => scrollToSection('features')}
                            className="px-4 py-2.5 rounded-2xl text-slate-550 hover:bg-slate-100 hover:text-slate-800 transition-all uppercase cursor-pointer"
                        >
                            Özellikler
                        </button>
                        <button
                            onClick={() => scrollToSection('sample-courses')}
                            className="px-4 py-2.5 rounded-2xl text-slate-550 hover:bg-slate-100 hover:text-slate-800 transition-all uppercase cursor-pointer"
                        >
                            Örnek Dersler
                        </button>
                        <button
                            onClick={() => scrollToSection('steps')}
                            className="px-4 py-2.5 rounded-2xl text-slate-550 hover:bg-slate-100 hover:text-slate-800 transition-all uppercase cursor-pointer"
                        >
                            Nasıl Çalışır?
                        </button>
                        <button
                            onClick={() => scrollToSection('faq')}
                            className="px-4 py-2.5 rounded-2xl text-slate-550 hover:bg-slate-100 hover:text-slate-800 transition-all uppercase cursor-pointer"
                        >
                            SSS
                        </button>
                        <button
                            onClick={() => navigate('/animation')}
                            className="px-4 py-2.5 rounded-2xl text-slate-550 hover:bg-slate-100 hover:text-slate-800 transition-all uppercase cursor-pointer text-purple-600 font-bold"
                        >
                            Animasyon
                        </button>
                    </div>

                    {/* CTA Actions */}
                    <div className="hidden sm:flex items-center gap-4">
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-6 py-3.5 rounded-2xl border-2 border-b-4 border-slate-200 bg-white text-slate-700 font-black text-sm hover:bg-slate-50 active:translate-y-[2px] active:border-b-2 transition-all cursor-pointer"
                        >
                            Giriş Yap
                        </button>
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-6 py-3.5 rounded-2xl border-2 border-b-4 border-green-700 bg-[#23c55e] text-white font-black text-sm hover:bg-[#1ea54c] active:translate-y-[2px] active:border-b-2 transition-all cursor-pointer shadow-sm"
                        >
                            Ücretsiz Başla
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button className="xl:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg" onClick={() => setIsMobileMenuOpen(true)}>
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </nav>

            {/* Mobile Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm transition-opacity" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute top-0 right-0 w-[85%] max-w-sm h-full bg-white shadow-2xl p-6 flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <img src={LogoText} alt="GoMufi" className="h-10 object-contain" />
                            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-4 text-base font-black text-slate-700">
                            <button onClick={() => scrollToSection('features')} className="text-left py-3 px-2 hover:bg-slate-50 hover:text-purple-600 rounded-lg transition-colors">Özellikler</button>
                            <button onClick={() => scrollToSection('sample-courses')} className="text-left py-3 px-2 hover:bg-slate-50 hover:text-purple-600 rounded-lg transition-colors">Örnek Dersler</button>
                            <button onClick={() => scrollToSection('steps')} className="text-left py-3 px-2 hover:bg-slate-55 hover:text-purple-600 rounded-lg transition-colors">Nasıl Çalışır?</button>
                            <button onClick={() => scrollToSection('faq')} className="text-left py-3 px-2 hover:bg-slate-50 hover:text-purple-600 rounded-lg transition-colors">SSS</button>
                            <button onClick={() => { navigate('/animation'); setIsMobileMenuOpen(false); }} className="text-left py-3 px-2 hover:bg-slate-50 hover:text-purple-600 rounded-lg transition-colors text-purple-600 font-bold">Animasyon</button>
                        </div>
                        <div className="mt-auto pt-6 border-t-2 border-slate-100 flex flex-col gap-3">
                            <button onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }} className="w-full py-3.5 rounded-2xl border-2 border-b-4 border-slate-200 bg-white font-black text-center text-slate-700 active:translate-y-[2px] active:border-b-2 transition-all">Giriş Yap</button>
                            <button onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }} className="w-full py-3.5 rounded-2xl border-2 border-b-4 border-green-700 bg-[#23c55e] text-white font-black text-center active:translate-y-[2px] active:border-b-2 transition-all">Kayıt Ol</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Hero Section */}
            <section className="relative pt-16 pb-24 px-6 md:px-12 overflow-hidden bg-white">
                <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-50/50 via-white to-white"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[45rem] h-[45rem] bg-green-200/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob"></div>
                <div className="absolute top-[10%] right-[-10%] w-[45rem] h-[45rem] bg-purple-200/20 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[25%] w-[40rem] h-[40rem] bg-indigo-200/15 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000"></div>

                {/* Floating Figma-like AI Particles, Coding Snippets and Vector Clouds */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none opacity-50">
                    <img src={BrainSprite} alt="" className="absolute top-[12%] left-[8%] w-10 h-10 opacity-20 blur-[1.5px] animate-float" />
                    <img src={PuzzleSprite} alt="" className="absolute bottom-[25%] left-[6%] w-12 h-12 opacity-15 blur-[1px] animate-float animation-delay-2000" />
                    <img src={TrophySprite} alt="" className="absolute top-[22%] right-[5%] w-14 h-14 opacity-20 blur-[2px] animate-float animation-delay-4000" />
                    <img src={PencilSprite} alt="" className="absolute bottom-[20%] right-[10%] w-9 h-9 opacity-15 blur-[1px] animate-float animation-delay-1000" />

                    <div className="absolute top-[16%] left-[24%] text-[9px] font-mono text-purple-400/40 rotate-6 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-xl shadow-sm">
                        def mufi_ai():
                    </div>
                    <div className="absolute bottom-[38%] left-[8%] text-[9px] font-mono text-emerald-500/40 -rotate-12 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-xl shadow-sm">
                        import gomufi
                    </div>
                    <div className="absolute top-[38%] right-[24%] text-[8px] font-mono text-indigo-500/40 rotate-12 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-xl shadow-sm">
                        {"{ active: true }"}
                    </div>
                    <div className="absolute bottom-[25%] right-[22%] text-[9px] font-mono text-pink-500/40 -rotate-6 bg-slate-50 border border-slate-200/60 px-2.5 py-1.5 rounded-xl shadow-sm">
                        await lesson.generate()
                    </div>

                    <VectorCloud className="absolute top-[8%] left-[4%] w-24 opacity-30 text-emerald-100/50 animate-cloud-1" />
                    <VectorCloud className="absolute top-[30%] right-[12%] w-32 opacity-25 text-indigo-100/50 animate-cloud-2" />

                    <Sparkles className="absolute top-[15%] left-[45%] w-5 h-5 text-yellow-400/40 animate-pulse" />
                    <Sparkles className="absolute bottom-[40%] left-[28%] w-6 h-6 text-[#8b5cf6]/35 animate-pulse animate-delay-2000" />
                    <Sparkles className="absolute top-[32%] right-[40%] w-4 h-4 text-emerald-500/40 animate-pulse animate-delay-4000" />
                </div>

                <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-8 items-center relative z-10">
                    {/* Hero Text */}
                    <div className="lg:col-span-6 text-left space-y-6 animate-in fade-in slide-in-from-left-6 duration-700">
                        <h1 className="text-4xl sm:text-5xl md:text-[52px] font-black text-slate-900 tracking-tight leading-[1.2]">
                            Canlı Derslerini Yapay Zeka ile <br />
                            <span className="relative inline-block text-white bg-gradient-to-r from-[#23c55e] to-[#10b981] px-5 py-2 my-1 rounded-2xl border-2 border-b-4 border-[#16a34a] font-black shadow-md shadow-green-100/30 transform rotate-[-1deg] hover:scale-[1.02] transition-transform duration-250">
                                15 Dakikada
                            </span> <br />
                            Hazırla.
                        </h1>
                        <p className="text-base md:text-lg text-slate-500 font-bold leading-relaxed max-w-xl">
                            GoMufi; öğretmenlerin yapay zekâ ile ders planı, oyunlaştırılmış içerik, quiz ve etkileşimli dersler oluşturmasını sağlayan yeni nesil eğitim platformudur.
                        </p>
                        <div className="flex flex-wrap gap-4 pt-1">
                            <button
                                onClick={() => navigate('/auth')}
                                className="px-8 py-4 rounded-[2rem] border-2 border-b-4 border-green-700 bg-[#23c55e] hover:bg-[#1ea54c] active:translate-y-[2px] active:border-b-2 text-white font-black text-base shadow-md shadow-green-150 transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Sparkles size={18} className="animate-pulse" />
                                ✨ AI ile Ücretsiz Oluştur
                            </button>
                            <button
                                onClick={() => scrollToSection('preview')}
                                className="px-8 py-4 rounded-[2rem] border-2 border-b-4 border-slate-200 bg-white hover:bg-slate-50 active:translate-y-[2px] active:border-b-2 text-slate-700 font-black text-base transition-all cursor-pointer"
                            >
                                Demo İzle
                            </button>
                        </div>
                    </div>

                    {/* Hero Animation (Highly Active AI Production Pipeline Simulation) */}
                    <div className="lg:col-span-6 flex justify-center relative animate-in fade-in slide-in-from-right-6 duration-700">
                        <div className="relative w-full max-w-[440px]">
                            {/* Falling Icons from bottom center */}
                            <div className="absolute left-0 right-0 -bottom-[220px] h-[220px] overflow-hidden pointer-events-none z-0">
                                {fallingIcons.map(icon => (
                                    <img
                                        key={icon.id}
                                        src={icon.img}
                                        alt=""
                                        className="absolute top-0 w-14 h-14 object-contain animate-icon-fall"
                                        style={{
                                            left: `calc(50% + ${icon.leftOffset}px)`,
                                            transform: 'translateX(-50%)'
                                        }}
                                    />
                                ))}
                            </div>

                            <img src={MufiMascot} alt="Mufi" className="absolute -top-10 -left-6 w-16 h-16 object-contain z-20 animate-bounce-slow" />

                            <div className={`w-full bg-white rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-xl relative overflow-hidden flex flex-col font-sans ${builderCatFrame === 2 && simStep !== 5 ? 'animate-card-impact' : ''}`}>
                                {/* Window Header */}
                                <div className="flex items-center justify-between px-6 pt-5 pb-4 shrink-0">
                                    <div className="flex gap-2">
                                        <div className="w-3.5 h-3.5 rounded-full bg-red-400 border border-red-500/30"></div>
                                        <div className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-500/30"></div>
                                        <div className="w-3.5 h-3.5 rounded-full bg-green-400 border border-green-500/30"></div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-black tracking-widest uppercase">GoMufi Builder</span>
                                    <div className="w-10"></div>
                                </div>

                                {/* Construction Safety Tape */}
                                {simStep !== 5 ? (
                                    <div className="w-full h-2 construction-tape shrink-0 border-y border-slate-200" />
                                ) : (
                                    <div className="w-full h-2 bg-emerald-500 shrink-0 border-y border-emerald-600 animate-in fade-in duration-300" />
                                )}

                                {/* Main Content Area */}
                                <div className="px-5 pt-4 pb-5 flex-1 flex flex-col gap-3.5 min-h-[380px]">

                                    {/* Prompt Input Card */}
                                    <div className={`rounded-2xl border-2 border-b-4 p-4 transition-all duration-300 ${
                                        simStep === 5 
                                            ? 'bg-emerald-50 border-emerald-200' 
                                            : 'bg-slate-50 border-slate-200'
                                    }`}>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ders Konusu</span>
                                            {simStep === 5 ? (
                                                <span className="text-[9px] font-black text-white bg-emerald-500 px-2.5 py-1 rounded-xl border border-b-2 border-emerald-600">
                                                    ✓ Hazır
                                                </span>
                                            ) : simStep > 0 ? (
                                                <span className="text-[9px] font-black text-white bg-purple-500 px-2.5 py-1 rounded-xl border border-b-2 border-purple-600 animate-pulse">
                                                    ⚡ İşleniyor
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="text-sm font-black text-slate-700 font-mono">
                                            {typedPrompt || <span className="text-slate-300">|</span>}
                                            {simStep === 0 && <span className="inline-block w-0.5 h-4 bg-purple-500 ml-0.5 animate-pulse align-middle"></span>}
                                        </div>
                                    </div>

                                    {/* Dynamic Step Content Card */}
                                    <div className={`flex-1 rounded-2xl border-2 border-b-4 p-5 flex flex-col justify-center relative overflow-hidden transition-all duration-300 ${
                                        simStep === 5 
                                            ? 'bg-emerald-50 border-emerald-200' 
                                            : 'bg-white border-slate-200'
                                    }`}>

                                        {/* Step 0 */}
                                        {simStep === 0 && (
                                            <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in-95 duration-300">
                                                <div className="w-14 h-14 rounded-[1.2rem] bg-purple-50 border-2 border-b-4 border-purple-200 flex items-center justify-center shadow-sm">
                                                    <span className="text-2xl">🎯</span>
                                                </div>
                                                <div className="text-center">
                                                    <p className="text-sm font-black text-slate-700">Ders planlanıyor...</p>
                                                    <p className="text-[11px] text-slate-400 font-bold mt-0.5">AI müfredat analiz ediyor</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 1: Roadmap */}
                                        {simStep === 1 && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-xl bg-purple-500 border border-b-[3px] border-purple-700 flex items-center justify-center text-white text-[10px] font-black shadow-sm">1</div>
                                                        <span className="text-xs font-black text-slate-700">Modül Haritası</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-xl">{roadNodeCount}/5</span>
                                                </div>
                                                <div className="flex justify-center items-end gap-2 py-1 h-[100px]">
                                                    {[
                                                        { name: "Anla", img: BrainSprite, button: ButtonPurple },
                                                        { name: "Uygula", img: PencilSprite, button: ButtonCyan },
                                                        { name: "Birleştir", img: PuzzleSprite, button: ButtonGreen },
                                                        { name: "Üret", img: TrophySprite, button: ButtonYellow },
                                                        { name: "Quiz", img: QuestionSprite, button: ButtonPurple }
                                                    ].map((node, i) => {
                                                        const isUnlocked = roadNodeCount > i;
                                                        return (
                                                            <div key={i} className={`relative flex flex-col items-center transition-all duration-500 ${isUnlocked ? "opacity-100 scale-100" : "opacity-25 grayscale scale-90"}`}>
                                                                <div className="relative">
                                                                    <img src={node.button} alt="" className="w-[52px] h-auto relative z-10 select-none pointer-events-none" />
                                                                    <img src={node.img} alt="" className="absolute w-8 h-8 object-contain bottom-3 left-1/2 -translate-x-1/2 z-20 animate-float" style={{ animationDelay: `${i * 0.3}s` }} />
                                                                </div>
                                                                <span className="text-[7px] font-black text-slate-500 uppercase tracking-wider mt-0.5">{node.name}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <p className="text-[10px] font-black text-purple-500 text-center animate-pulse">🚧 Modüller oluşturuluyor...</p>
                                            </div>
                                        )}

                                        {/* Step 2: Slides */}
                                        {simStep === 2 && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-xl bg-blue-500 border border-b-[3px] border-blue-700 flex items-center justify-center text-white text-[10px] font-black shadow-sm">2</div>
                                                        <span className="text-xs font-black text-slate-700">Slayt Tasarımı</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-xl">{slideCount}/12</span>
                                                </div>
                                                <div className="grid grid-cols-6 gap-1.5 py-1">
                                                    {Array.from({ length: 12 }).map((_, i) => (
                                                        <div 
                                                            key={i} 
                                                            className={`h-8 rounded-lg border-2 border-b-[3px] transition-all duration-300 flex items-center justify-center text-[9px] font-black ${
                                                                i < slideCount 
                                                                    ? 'bg-blue-50 border-blue-300 text-blue-500' 
                                                                    : 'bg-slate-50 border-slate-200 text-slate-300'
                                                            }`}
                                                        >
                                                            {i < slideCount ? '✓' : i + 1}
                                                        </div>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] font-black text-blue-500 text-center animate-pulse">
                                                    {slideCount === 12 ? "✓ Slaytlar hazır!" : "🎨 Slaytlar tasarlanıyor..."}
                                                </p>
                                            </div>
                                        )}

                                        {/* Step 3: Code */}
                                        {simStep === 3 && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-xl bg-emerald-500 border border-b-[3px] border-emerald-700 flex items-center justify-center text-white text-[10px] font-black shadow-sm">3</div>
                                                        <span className="text-xs font-black text-slate-700">Kod Üretimi</span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-xl">Python</span>
                                                </div>
                                                <div className="bg-slate-900 rounded-2xl border-2 border-b-4 border-slate-700 p-4 font-mono text-[11px] leading-relaxed min-h-[85px] flex flex-col justify-center">
                                                    {codeLinesCount >= 1 && (
                                                        <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                                            <span className="text-slate-500 select-none">1 </span><span className="text-purple-400"># Değişken tanımlama</span>
                                                        </div>
                                                    )}
                                                    {codeLinesCount >= 2 && (
                                                        <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                                            <span className="text-slate-500 select-none">2 </span><span className="text-cyan-300">name</span> <span className="text-slate-400">=</span> <span className="text-green-400">"Mufi"</span>
                                                        </div>
                                                    )}
                                                    {codeLinesCount >= 3 && (
                                                        <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                                                            <span className="text-slate-500 select-none">3 </span><span className="text-cyan-300">score</span> <span className="text-slate-400">=</span> <span className="text-orange-300">100</span>
                                                        </div>
                                                    )}
                                                    {codeLinesCount === 0 && (
                                                        <div className="text-slate-500 animate-pulse flex items-center gap-2">
                                                            <span className="w-1.5 h-4 bg-green-400 rounded-sm animate-pulse"></span>
                                                            <span className="italic text-[10px]">Kod yazılıyor...</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 4: Quiz */}
                                        {simStep === 4 && (
                                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-3 duration-300">
                                                <div className="flex justify-between items-center">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-xl bg-orange-500 border border-b-[3px] border-orange-700 flex items-center justify-center text-white text-[10px] font-black shadow-sm">4</div>
                                                        <span className="text-xs font-black text-slate-700">Quiz Oluşturma</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-xl">{quizCompileCount}/3</span>
                                                </div>
                                                <div className="bg-slate-50 rounded-2xl border-2 border-b-4 border-slate-200 p-4 min-h-[85px] flex flex-col justify-center">
                                                    {quizCompileCount === 0 ? (
                                                        <div className="text-center">
                                                            <div className="text-2xl mb-1.5 animate-bounce">📝</div>
                                                            <p className="text-[10px] font-black text-slate-400 animate-pulse">Sorular derleniyor...</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2.5">
                                                            <p className="text-xs font-black text-slate-700">Yazı tipindeki verileri hangi değişken saklar?</p>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {quizCompileCount >= 2 && (
                                                                    <div className="bg-white border-2 border-b-[3px] border-slate-200 text-slate-600 text-[10px] font-black p-2 rounded-xl text-center animate-in fade-in zoom-in-95 duration-200">
                                                                        B) int
                                                                    </div>
                                                                )}
                                                                {quizCompileCount >= 3 && (
                                                                    <div className="bg-green-50 border-2 border-b-[3px] border-green-300 text-green-600 text-[10px] font-black p-2 rounded-xl text-center animate-in fade-in zoom-in-95 duration-200">
                                                                        A) str ✓
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Step 5: Done */}
                                        {simStep === 5 && (
                                            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 fade-in duration-500">
                                                <div className="w-14 h-14 rounded-[1.2rem] bg-emerald-500 border-2 border-b-4 border-emerald-700 flex items-center justify-center text-white text-2xl shadow-md animate-bounce">
                                                    ✓
                                                </div>
                                                <div className="text-center">
                                                    <h5 className="text-sm font-black text-slate-800">Ders Hazır! 🎉</h5>
                                                    <p className="text-[10px] text-slate-400 font-black mt-1">Öğrenci Kodu:</p>
                                                    <div className="mt-1.5 inline-flex bg-white border-2 border-b-4 border-emerald-200 px-4 py-2 rounded-2xl">
                                                        <span className="text-emerald-600 font-black tracking-[0.2em] text-base font-mono">45CZWT</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar - Chunky Segmented */}
                                    {simStep > 0 && simStep < 5 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1.5">
                                                {[
                                                    { step: 1, progress: roadNodeCount / 5, color: "bg-purple-500", border: "border-purple-600" },
                                                    { step: 2, progress: slideCount / 12, color: "bg-blue-500", border: "border-blue-600" },
                                                    { step: 3, progress: codeLinesCount / 3, color: "bg-emerald-500", border: "border-emerald-600" },
                                                    { step: 4, progress: quizCompileCount / 3, color: "bg-orange-500", border: "border-orange-600" }
                                                ].map((item, i) => (
                                                    <div key={i} className="flex-1">
                                                        <div className={`h-3 rounded-full border overflow-hidden transition-all duration-300 ${
                                                            simStep > item.step ? `${item.color} ${item.border}` :
                                                            simStep === item.step ? 'bg-slate-100 border-slate-200' :
                                                            'bg-slate-50 border-slate-100'
                                                        }`}>
                                                            {simStep === item.step && (
                                                                <div 
                                                                    className={`h-full ${item.color} rounded-full transition-all duration-300`}
                                                                    style={{ width: `${item.progress * 100}%` }}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                    {simStep === 1 ? "Müfredat" :
                                                     simStep === 2 ? "Slaytlar" :
                                                     simStep === 3 ? "Kod" :
                                                     "Quiz"}
                                                </span>
                                                <span className="text-[9px] font-black text-purple-500">
                                                    Adım {simStep}/4
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Debris/Sparks flying on strike */}
                            {builderCatFrame === 2 && simStep !== 5 && (
                                <div className="absolute -right-2 top-[60%] pointer-events-none z-30">
                                    <span className="absolute w-3 h-2 bg-amber-500 rounded-sm animate-debris-1 shadow-sm" />
                                    <span className="absolute w-2 h-3 bg-amber-600 rounded-sm animate-debris-2 shadow-sm" />
                                    <span className="absolute w-2.5 h-2.5 bg-yellow-500 rounded-full animate-debris-3 shadow-md shadow-yellow-500/50" />
                                    <span className="absolute w-2 h-2 bg-orange-400 rounded-sm animate-debris-4 shadow-sm" />
                                    <span className="absolute w-3.5 h-1.5 bg-yellow-400 rounded-sm animate-debris-5 shadow-sm" />
                                </div>
                            )}

                            {/* Hitting Builder Cat Animation */}
                            <div className="hidden md:block absolute -right-[265px] bottom-2 w-72 h-auto z-10 scale-x-[-1]">
                                <img
                                    src={Frame1}
                                    alt="Builder Cat Frame 1"
                                    className={`w-full h-auto ${builderCatFrame === 1 ? 'block' : 'hidden'}`}
                                />
                                <img
                                    src={Frame2}
                                    alt="Builder Cat Frame 2"
                                    className={`w-full h-auto ${builderCatFrame === 2 ? 'block' : 'hidden'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2. Login & Join Code Cards */}
            <section className="py-16 px-6 md:px-12 bg-slate-50 overflow-hidden">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                    {/* Instructor Login Card */}
                    <div className="reveal-left bg-white rounded-[2.5rem] p-8 md:p-10 border-2 border-b-[6px] border-slate-200 hover:border-purple-300 hover:shadow-purple-100/50 hover:scale-[1.01] transition-all duration-300 shadow-md shadow-slate-100/50 flex flex-col justify-between group">
                        <div className="space-y-6">
                            {/* Card Header with GoMufi Sprite & Brand Badge */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-purple-50 border-2 border-b-4 border-purple-200 rounded-2xl flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-300">
                                    <img src={BrainSprite} alt="Brain" className="w-10 h-10 object-contain" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 border border-purple-100 px-2.5 py-1 rounded-xl">Eğitmen</span>
                                    <h3 className="text-2xl font-black text-slate-800 mt-1">Öğretmen</h3>
                                </div>
                            </div>

                            <p className="text-slate-500 font-bold text-sm leading-relaxed text-left">
                                İlk AI dersini oluşturmaya başla, yol haritaları ve oyunlaştırılmış mini quizlerle öğrencilerinin ilgisini topla.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/auth')}
                            className="mt-8 w-full py-4 rounded-2xl border-2 border-b-4 border-[#6d28d9] bg-[#8b5cf6] hover:bg-[#7c3aed] active:translate-y-[2px] active:border-b-2 text-white font-black text-sm transition-all tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                            Giriş Yap <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Student Join Code Card */}
                    <div className="reveal-right bg-white rounded-[2.5rem] p-8 md:p-10 border-2 border-b-[6px] border-slate-200 hover:border-green-300 hover:shadow-green-100/50 hover:scale-[1.01] transition-all duration-300 shadow-md shadow-slate-100/50 flex flex-col justify-between group">
                        <div className="space-y-6">
                            {/* Card Header with GoMufi Sprite & Brand Badge */}
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-green-50 border-2 border-b-4 border-green-200 rounded-2xl flex items-center justify-center shadow-inner shrink-0 group-hover:scale-105 transition-transform duration-300">
                                    <img src={PuzzleSprite} alt="Puzzle" className="w-10 h-10 object-contain" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 border border-green-100 px-2.5 py-1 rounded-xl">Katılım</span>
                                    <h3 className="text-2xl font-black text-slate-800 mt-1">Öğrenci</h3>
                                </div>
                            </div>

                            <p className="text-slate-550 font-bold text-sm leading-relaxed text-left">
                                Öğretmeninin seninle paylaştığı katılım kodunu girerek oyunlaştırılmış canlı derslere ve quizlere anında bağlan.
                            </p>
                        </div>
                        <form onSubmit={handleStudentJoin} className="mt-8 space-y-3">
                            <div className="flex gap-2 items-end">
                                <div className="flex-1 relative flex items-center">
                                    <KeyRound size={16} className="absolute left-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="DERS KODU (örn: 45CZWT)"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value)}
                                        maxLength={8}
                                        className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-b-4 border-slate-200 focus:border-green-400 focus:border-b-green-500 focus:bg-white rounded-2xl outline-none text-sm font-black text-center tracking-widest placeholder-slate-400 uppercase transition-all"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="px-6 py-4 rounded-2xl border-2 border-b-4 border-[#15803d] bg-[#23c55e] hover:bg-[#1ea54c] text-white font-black text-sm active:translate-y-[2px] active:border-b-2 transition-all shrink-0 cursor-pointer shadow-sm"
                                >
                                    Kod Gir
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </section>

            {/* 3. Product Focused Core Benefits */}
            <section className="reveal-scale py-14 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { title: "15 Dakikada Ders Hazırlama", icon: <Zap className="w-6 h-6 text-orange-500" />, bg: "bg-orange-50 border-orange-200 shadow-orange-100/50" },
                            { title: "AI Destekli İçerik Üretimi", icon: <Bot className="w-6 h-6 text-purple-600" />, bg: "bg-purple-50 border-purple-200 shadow-purple-100/50" },
                            { title: "Oyunlaştırılmış Öğrenme", icon: <Gamepad2 className="w-6 h-6 text-pink-500" />, bg: "bg-pink-50 border-pink-200 shadow-pink-100/50" },
                            { title: "Canlı Ders Yönetimi", icon: <Users className="w-6 h-6 text-emerald-500" />, bg: "bg-emerald-50 border-emerald-200 shadow-emerald-100/50" }
                        ].map((stat, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-5 rounded-[2rem] border-2 border-b-[5px] border-slate-200 bg-white shadow-md hover:scale-105 transition-transform duration-300">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${stat.bg.split(' ')[0]} border-2 border-b-4 ${stat.bg.split(' ')[1]} ${stat.bg.split(' ')[2]} shadow-inner`}>
                                    {stat.icon}
                                </div>
                                <div className="font-black text-slate-800 text-sm leading-tight text-left">{stat.title}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 4. Why GoMufi? */}
            <section id="features" className="py-24 px-6 bg-slate-50 relative overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="reveal text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-[44px] font-black tracking-tight leading-tight">
                            Neden <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-505">GoMufi?</span>
                        </h2>
                        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto font-bold font-sans">
                            Sert, jenerik sınıfları canlandıran ve öğretmenlerin yükünü hafifleten yeni nesil eğitim teknolojileri.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {features.map((feature, idx) => (
                            <div
                                key={idx}
                                className={`reveal-scale bg-gradient-to-br ${feature.cardBg} p-8 rounded-[2.5rem] border-2 border-b-[8px] ${feature.cardBorder} ${feature.glowShadow} transition-all duration-300 flex flex-col items-start gap-4 hover:-translate-y-2 relative overflow-hidden group`}
                                style={{ transitionDelay: `${idx * 80}ms` }}
                            >
                                {/* Subtle Back Watermark */}
                                <div className={`absolute right-4 bottom-4 ${feature.watermarkColor} transition-colors pointer-events-none duration-300 transform rotate-12 group-hover:scale-110 z-0`}>
                                    <Swords size={68} />
                                </div>

                                {/* Icon container with 3D bottom border */}
                                <div className={`p-4 rounded-[1.5rem] bg-white border-2 border-b-4 ${feature.cardBorder.split(' ')[0]} shadow-inner shrink-0 relative z-10 group-hover:scale-105 transition-transform duration-300`}>
                                    {feature.icon}
                                </div>

                                {/* Title with custom highlight gradient matching user requests */}
                                <h3 className="text-xl font-black tracking-tight relative z-10 text-left">
                                    {renderTitle(feature.title, feature.highlight, feature.gradient)}
                                </h3>

                                {/* Description with subtle Slate colors for premium contrast */}
                                <p className="text-slate-600 font-bold text-sm leading-relaxed relative z-10 text-left">
                                    {feature.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. AI Sample Courses */}
            <section id="sample-courses" className="py-20 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="reveal text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">AI ile Oluşturulmuş Örnek Dersler</h2>
                        <p className="text-slate-550 text-lg max-w-2xl mx-auto font-bold">Yapay zekanın saniyeler içinde kurguladığı örnek ders müfredatlarını inceleyin.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {sampleCourses.map((course, idx) => (
                            <div
                                key={idx}
                                className="reveal-scale bg-white rounded-[2.5rem] p-6 border-2 border-b-[8px] border-slate-200 hover:border-slate-300 transition-all shadow-md flex flex-col justify-between relative group hover:-translate-y-1 duration-300"
                                style={{ transitionDelay: `${idx * 100}ms` }}
                            >
                                <div className="absolute top-4 right-4 bg-emerald-50 text-emerald-600 border-2 border-emerald-200 px-2.5 py-0.5 rounded-xl text-[9px] font-black uppercase tracking-wider">
                                    AI Üretimi
                                </div>

                                <div className="space-y-4 text-left">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border-2 border-b-4 border-slate-200">
                                        <img src={course.icon} alt="" className="w-10 h-10 object-contain" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800 leading-tight">{course.title}</h3>
                                </div>

                                <div className="mt-8 pt-4 border-t-2 border-slate-100 flex justify-between text-xs font-black text-slate-400">
                                    <span>{course.lessons}</span>
                                    <span>{course.modules}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 6. AI 4 Steps */}
            <section id="steps" className="py-20 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="reveal text-center mb-20 space-y-4">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">AI ile Ders Oluşturmanın 4 Adımı</h2>
                        <p className="text-slate-550 text-lg max-w-2xl mx-auto font-bold">Yapay zeka sayesinde saatler süren ders hazırlığını dakikalara düşürün.</p>
                    </div>

                    <div className="relative grid md:grid-cols-4 gap-8">
                        {/* Connecting Line */}
                        <div className="hidden md:block absolute top-[48px] left-[12.5%] right-[12.5%] h-0.5 border-t-2 border-dashed border-slate-300 z-0"></div>

                        {[
                            { step: "01", title: "Konunu Yaz", desc: '"Python Değişkenler" gibi hedefliliğinizi sisteme girin.', bg: "bg-purple-50 text-purple-600 border-purple-100" },
                            { step: "02", title: "AI Yol Haritasını Oluştursun", desc: "6 ders, 40 modül ve Quizler anında otomatik oluşturulsun.", bg: "bg-blue-50 text-blue-600 border-blue-100" },
                            { step: "03", title: "Canva Editöründe Düzenle", desc: "İçerikleri dilediğiniz gibi sürükle-bırak yöntemiyle özelleştirin, istersen değiştir.", bg: "bg-pink-50 text-pink-600 border-pink-100" },
                            { step: "04", title: "Canlı Dersi Başlat", desc: "Öğretmen olarak canlı dersinizi başlatın, öğrenciler kod ile katılsın.", bg: "bg-emerald-50 text-emerald-600 border-emerald-100" }
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="reveal-scale relative z-10 flex flex-col items-center text-center group bg-white p-7 rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-md hover:-translate-y-1 transition-all duration-300"
                                style={{ transitionDelay: `${idx * 150}ms` }}
                            >
                                <div className={`w-14 h-14 rounded-2xl ${item.bg.split(' ')[0]} ${item.bg.split(' ')[1]} flex items-center justify-center mb-4 border-2 border-b-4 border-slate-200 shadow-md group-hover:scale-105 transition-transform duration-300 text-xl font-black`}>
                                    {item.step}
                                </div>
                                <h3 className="text-lg font-black text-slate-800 mb-2">{item.title}</h3>
                                <p className="text-slate-500 font-bold text-xs leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 7. Platform Visuals (Screenshots Tab) */}
            <section id="preview" className="py-20 px-6 bg-white">
                <div className="max-w-6xl mx-auto space-y-12">
                    <div className="reveal text-center space-y-4">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Platformdan Görseller</h2>
                        <p className="text-slate-505 text-lg font-bold">GoMufi'nin zengin ve dinamik arayüzlerini yakından keşfedin.</p>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="reveal flex flex-wrap justify-center gap-3 border-b-2 border-slate-100 pb-4">
                        {[
                            { id: "roadmap", label: "Roadmap Builder", emoji: "🗺️" },
                            { id: "editor", label: "Canva Editörü", emoji: "🎨" },
                            { id: "live", label: "Canlı Ders Ekranı", emoji: "📺" },
                            { id: "student", label: "Öğrenci Görünümü", emoji: "🎒" }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActivePreviewTab(tab.id as any)}
                                className={`px-5 py-3 rounded-2xl font-black text-sm tracking-wide transition-all border-2 border-b-4 flex items-center gap-2 cursor-pointer active:translate-y-[2px] active:border-b-2 ${activePreviewTab === tab.id
                                    ? "border-green-700 bg-[#23c55e] text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                    }`}
                            >
                                <span className="text-base">{tab.emoji}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Interactive CSS Mockups */}
                    <div className="reveal-scale bg-white border-2 border-b-[8px] border-slate-200 rounded-[2.5rem] shadow-xl p-8 min-h-[440px] flex flex-col justify-between overflow-hidden relative">
                        {/* Tab Content: Roadmap Builder */}
                        {activePreviewTab === 'roadmap' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col justify-center">
                                <div className="text-center space-y-2 mb-4">
                                    <span className="bg-purple-50 text-purple-605 border border-purple-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">Görsel Yol Haritası</span>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight">Ders Planını Haritaya Çevirin</h4>
                                </div>
                                <div className="max-w-2xl mx-auto w-full bg-slate-50 border-2 border-b-[6px] border-slate-200 rounded-[2.5rem] p-8 flex flex-col items-center relative overflow-hidden">
                                    <div className="absolute inset-x-0 top-1/2 h-[34px] bg-repeat-x opacity-15 pointer-events-none -translate-y-1/2 z-0" style={{ backgroundImage: `url(${GrassIcon})`, backgroundSize: 'contain' }}></div>
                                    <div className="absolute inset-x-8 top-1/2 h-1 bg-slate-200 -translate-y-1/2 z-0"></div>
 
                                    <div className="flex items-center gap-4 w-full justify-between relative z-10 px-4">
                                        {[
                                            { label: "Anla", img: BrainSprite, border: "border-purple-200 border-b-purple-400 bg-purple-50" },
                                            { label: "Uygula", img: PencilSprite, border: "border-cyan-200 border-b-cyan-400 bg-cyan-50" },
                                            { label: "Birleştir", img: PuzzleSprite, border: "border-green-200 border-b-green-400 bg-green-50" },
                                            { label: "Üret", img: TrophySprite, border: "border-amber-200 border-b-amber-400 bg-amber-50" },
                                            { label: "Quiz", img: QuestionSprite, border: "border-purple-205 border-b-purple-405 bg-purple-50" }
                                        ].map((node, i) => (
                                            <div key={i} className="flex flex-col items-center gap-2">
                                                <div className={`w-14 h-14 rounded-2xl border-2 border-b-4 ${node.border} flex items-center justify-center font-black shadow-sm`}>
                                                    <img src={node.img} alt="" className="w-9 h-9 object-contain" />
                                                </div>
                                                <span className="text-[10px] text-slate-800 font-black tracking-wide">{node.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Canva Editor */}
                        {activePreviewTab === 'editor' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col justify-center">
                                <div className="text-center space-y-2 mb-4">
                                    <span className="bg-blue-50 text-blue-600 border border-blue-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">Zengin Editör</span>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight">Sürükle & Bırak İçerik Üretimi</h4>
                                </div>
                                <div className="max-w-3xl mx-auto w-full bg-slate-50 border-2 border-b-[6px] border-slate-200 rounded-[2.5rem] p-5 flex gap-4 text-slate-400 text-xs">
                                    {/* Editor Sidebar */}
                                    <div className="w-1/4 border-r-2 border-slate-200 pr-4 space-y-3 flex flex-col justify-center font-black text-slate-700">
                                        <div className="bg-white p-3 rounded-2xl text-center border-2 border-b-4 border-slate-250 shadow-sm cursor-pointer hover:bg-slate-50 active:translate-y-[1px] active:border-b-2 transition-all">🖼️ Slayt Ekle</div>
                                        <div className="bg-white p-3 rounded-2xl text-center border-2 border-b-4 border-slate-250 shadow-sm cursor-pointer hover:bg-slate-50 active:translate-y-[1px] active:border-b-2 transition-all">🧩 Kod Editörü</div>
                                        <div className="bg-white p-3 rounded-2xl text-center border-2 border-b-4 border-slate-250 shadow-sm cursor-pointer hover:bg-slate-50 active:translate-y-[1px] active:border-b-2 transition-all">🎮 Mini Oyun</div>
                                    </div>
                                    {/* Editor Canvas */}
                                    <div className="flex-1 bg-white border-2 border-b-4 border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center relative min-h-[180px] shadow-sm">
                                        <div className="w-16 h-16 rounded-3xl bg-purple-50 border-2 border-b-4 border-purple-200 flex items-center justify-center text-2xl shadow-inner animate-bounce-slow">🐍</div>
                                        <span className="text-slate-800 font-black mt-4 text-base">Python Veri Tipleri</span>
                                        <div className="absolute bottom-4 right-4 text-[10px] font-black text-slate-400">Slayt 2/12</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Live Lesson */}
                        {activePreviewTab === 'live' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col justify-center">
                                <div className="text-center space-y-2 mb-4">
                                    <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider font-sans">Canlı Ders Paneli</span>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight font-sans">Gerçek Zamanlı Etkileşim</h4>
                                </div>
                                <div className="max-w-3xl mx-auto w-full bg-slate-50 border-2 border-b-[6px] border-slate-200 rounded-[2.5rem] p-5 flex gap-4 text-xs text-slate-550">
                                    {/* Live Feed Mockup */}
                                    <div className="flex-1 bg-white border-2 border-b-4 border-slate-200 rounded-3xl p-5 flex flex-col justify-between min-h-[180px] shadow-sm">
                                        <div className="flex justify-between items-center text-slate-800 font-black">
                                            <span className="flex items-center gap-1.5"><Video size={14} className="text-rose-500" /> Canlı Yayın</span>
                                            <span className="text-emerald-600 font-black bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">Kod: 45CZWT</span>
                                        </div>
                                        <div className="text-center text-slate-550 py-6 font-bold">
                                            Öğrenciler quiz sorularını yanıtlıyor... 📊
                                        </div>
                                    </div>
                                    {/* Student Scoreboard Mockup */}
                                    <div className="w-1/3 border-l-2 border-slate-200 pl-4 space-y-3 flex flex-col justify-center">
                                        <h5 className="font-black text-[10px] uppercase text-slate-700 tracking-wider">Liderlik Tablosu</h5>
                                        <div className="space-y-2 text-[10px] font-black">
                                            <div className="flex justify-between bg-white p-2 rounded-xl border-2 border-b-[3px] border-slate-200 shadow-sm">
                                                <span className="text-slate-800 truncate">🥇 Ayşe K.</span>
                                                <span className="text-yellow-600">1200 XP</span>
                                            </div>
                                            <div className="flex justify-between bg-white p-2 rounded-xl border-2 border-b-[3px] border-slate-200 shadow-sm">
                                                <span className="text-slate-850 truncate">🥈 Mehmet B.</span>
                                                <span className="text-slate-400">950 XP</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab Content: Student View */}
                        {activePreviewTab === 'student' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col justify-center">
                                <div className="text-center space-y-2 mb-4">
                                    <span className="bg-pink-50 text-pink-650 border border-pink-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider font-sans">Öğrenci Arayüzü</span>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight font-sans">Oyunlaştırılmış Öğrenci Deneyimi</h4>
                                </div>
                                <div className="max-w-2xl mx-auto w-full bg-slate-50 border-2 border-b-[6px] border-slate-200 rounded-[2.5rem] p-6 flex justify-between items-center text-slate-550 font-bold">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl bg-white border-2 border-b-4 border-slate-200 text-white flex items-center justify-center shadow-sm">
                                            <img src={TrophySprite} alt="" className="w-9 h-9 object-contain" />
                                        </div>
                                        <div>
                                            <h5 className="font-black text-slate-800 text-sm leading-none mb-1">Bronz Lig</h5>
                                            <span className="text-[10px] text-slate-400 font-bold">Seviye 4 Öğrencisi</span>
                                        </div>
                                    </div>
                                    <div className="w-32 bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                                        <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 w-[65%]"></div>
                                    </div>
                                    <span className="text-yellow-600 font-black text-sm">850 XP</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* 8. Teacher Experience Reviews */}
            <section className="py-20 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="reveal text-center mb-16 space-y-4">
                        <h2 className="text-3xl md:text-4xl font-black text-slate-800 tracking-tight">Öğretmen Deneyimleri</h2>
                        <p className="text-slate-555 text-lg max-w-2xl mx-auto font-bold">GoMufi'ye geçen öğretmenlerin zamandan tasarruf hikayeleri.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: 'Selin K.', role: 'Matematik Öğretmeni', comment: 'Eskiden bir ders hazırlamam 3 saat sürüyordu. Şimdi AI ile 20 dakikada bitiriyorum.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Selin' },
                            { name: 'Mehmet H.', role: 'Fen Bilgisi Öğretmeni', comment: 'Ders planı, quizler, oyun sahneleri hepsi tek komutla hazırlanıyor. İnanılmaz pratik.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet' },
                            { name: 'Sibel G.', role: 'Sınıf Öğretmeni', comment: 'Çocuklar derse katılmak için can atıyor. Oyunlaştırma yapısı gerçekten mükemmel çalışıyor.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sibel' }
                        ].map((review, idx) => (
                            <div
                                key={idx}
                                className="reveal-scale bg-white p-8 rounded-[2.5rem] border-2 border-b-[8px] border-slate-200 shadow-xl flex flex-col justify-between hover:-translate-y-1 transition-all duration-300"
                                style={{ transitionDelay: `${idx * 150}ms` }}
                            >
                                <p className="text-slate-655 font-bold leading-relaxed text-sm md:text-base italic mb-6">"{review.comment}"</p>
                                <div className="flex items-center gap-3 pt-4 border-t-2 border-slate-100">
                                    <img src={review.avatar} alt={review.name} className="w-11 h-11 rounded-2xl bg-slate-50 border-2 border-b-[3px] border-slate-200" />
                                    <div className="text-left">
                                        <div className="font-black text-slate-800 text-sm">{review.name}</div>
                                        <div className="text-slate-400 font-black text-xs">{review.role}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 9. CTA - AI Lesson Creator Start */}
            <section className="reveal py-12 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-12 md:p-20 text-center border-b-8 border-slate-950">
                        {/* Glow shapes */}
                        <div className="absolute top-0 left-0 w-full h-full">
                            <div className="absolute top-[-50%] left-[-20%] w-[40rem] h-[40rem] bg-green-500 rounded-full mix-blend-screen filter blur-[120px] opacity-30"></div>
                            <div className="absolute bottom-[-50%] right-[-20%] w-[40rem] h-[40rem] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30"></div>
                        </div>

                        {/* Mascot */}
                        <img src={MufiMascot} alt="" className="absolute -bottom-6 -right-6 w-32 h-32 object-contain opacity-25" />

                        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                            <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">AI ile Ders Hazırlamaya Başla</h2>
                            <p className="text-slate-350 text-base md:text-lg font-bold leading-relaxed">GoMufi'yi ücretsiz dene. İlk dersini birkaç dakikada oluştur.</p>
                            <button
                                onClick={() => navigate('/auth')}
                                className="px-10 py-5 border-2 border-b-4 border-green-700 bg-[#23c55e] hover:bg-[#1ea54c] active:translate-y-[2px] active:border-b-2 text-white rounded-[2rem] font-black text-lg transition-all shadow-lg cursor-pointer flex items-center gap-2 mx-auto"
                            >
                                <Sparkles size={18} className="animate-pulse" />
                                ✨ AI ile Ücretsiz Oluştur
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* 10. FAQ Section */}
            <section id="faq" className="py-20 px-6 bg-white border-t-2 border-slate-100">
                <div className="max-w-3xl mx-auto">
                    <div className="reveal text-center mb-16 space-y-4">
                        <h2 className="text-3xl font-black text-slate-805 tracking-tight">Sıkça Sorulan Sorular</h2>
                        <p className="text-slate-405 font-bold">Platformumuz hakkında en çok merak edilenler</p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, idx) => {
                            const isOpen = faqOpen === idx;
                            return (
                                <div
                                    key={idx}
                                    className="reveal border-2 border-slate-200 border-b-[5px] rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition-all"
                                    style={{ transitionDelay: `${idx * 50}ms` }}
                                >
                                    <button
                                        className="w-full flex justify-between items-center p-5 font-black text-left text-sm md:text-base text-slate-800"
                                        onClick={() => setFaqOpen(isOpen ? null : idx)}
                                    >
                                        <span>{faq.q}</span>
                                        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-205 ${isOpen ? "transform rotate-180 text-green-600" : ""}`} />
                                    </button>
                                    {isOpen && (
                                        <div className="px-5 pb-5 text-slate-505 font-bold text-xs md:text-sm leading-relaxed animate-in fade-in duration-200 text-left border-t border-slate-100 pt-3">
                                            {faq.a}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* 11. Modern Footer */}
            <footer id="footer" className="bg-slate-900 text-slate-455 py-16 px-6 text-sm border-t-2 border-slate-800">
                <div className="max-w-7xl mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16 text-left">
                        {/* Column 1: Ürün */}
                        <div className="space-y-4">
                            <h3 className="font-black text-white text-base">Ürün</h3>
                            <ul className="space-y-2 font-bold text-xs">
                                <li><a href="#" className="hover:text-white transition-colors">Özellikler</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Yol Haritası</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                            </ul>
                        </div>

                        {/* Column 2: Bilgi */}
                        <div className="space-y-4">
                            <h3 className="font-black text-white text-base font-sans">Kaynaklar</h3>
                            <ul className="space-y-2 font-bold text-xs">
                                <li><a href="#" className="hover:text-white transition-colors">Dokümantasyon</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Yardım Merkezi</a></li>
                            </ul>
                        </div>

                        {/* Column 3: Şirket */}
                        <div className="space-y-4">
                            <h3 className="font-black text-white text-base font-sans">İletişim</h3>
                            <ul className="space-y-2 font-bold text-xs">
                                <li><a href="#" className="hover:text-white transition-colors">Bize Ulaşın</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Destek Ekibi</a></li>
                            </ul>
                        </div>

                        {/* Column 4: Yasal */}
                        <div className="space-y-4">
                            <h3 className="font-black text-white text-base">Yasal</h3>
                            <ul className="space-y-2 font-bold text-xs">
                                <li><a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-6 text-xs font-bold text-slate-500">
                        <p>© 2026 GoMufi. Yapay zeka destekli oyunlaştırılmış eğitim.</p>
                        <p>GoMufi ile öğretmenler yapay zekâ sayesinde dakikalar içinde oyunlaştırılmış canlı dersler oluşturabilir.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
