import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    Layout,
    Gamepad2,
    Calendar,
    TrendingUp,
    Sparkles,
    Users,
    ChevronDown,
    Menu,
    X,
    ChevronRight,
    Cpu,
    Layers,
    Video,
    KeyRound,
    Zap,
    Bot,
    Star,
    Quote,
    ArrowRight,
    BarChart3,
    Wand2,
    MousePointerClick,
    Timer,
    ShieldCheck,
    GraduationCap
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
import ReactIcon from '../assets/sprites/ReactIcon.png';
import DataIcon from '../assets/sprites/DataIcon.png';
import BooksIcon from '../assets/sprites/BooksIcon.png';
import ChestSprite from '../assets/sprites/Chest.png';
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

// Scalloped section divider (bubbly cloud edge) for playful transitions
const ScallopDivider: React.FC<{ className?: string; flip?: boolean }> = ({ className, flip }) => (
    <svg
        className={`w-full h-10 md:h-14 block ${flip ? 'rotate-180' : ''} ${className || ''}`}
        viewBox="0 0 1440 64"
        preserveAspectRatio="none"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M0 64 L0 32 Q 60 0 120 32 Q 180 64 240 32 Q 300 0 360 32 Q 420 64 480 32 Q 540 0 600 32 Q 660 64 720 32 Q 780 0 840 32 Q 900 64 960 32 Q 1020 0 1080 32 Q 1140 64 1200 32 Q 1260 0 1320 32 Q 1380 64 1440 32 L 1440 64 Z" />
    </svg>
);

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [activePreviewTab, setActivePreviewTab] = useState<'roadmap' | 'editor' | 'live' | 'student'>('roadmap');
    const [faqOpen, setFaqOpen] = useState<number | null>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 30);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
            return;
        } else if (simStep === 2) {
            timeout = setTimeout(() => setSimStep(3), 2000);
        } else if (simStep === 3) {
            timeout = setTimeout(() => setSimStep(4), 2200);
        } else if (simStep === 4) {
            timeout = setTimeout(() => setSimStep(5), 2000);
        } else if (simStep === 5) {
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
            level: "Anla (Başlangıç)",
            topBg: "bg-fuchsia-50/80",
            cardBorder: "border-fuchsia-300 border-b-[6px] border-b-fuchsia-400 hover:border-fuchsia-400 hover:border-b-fuchsia-500",
            plate: "bg-fuchsia-50 border-fuchsia-200",
            badge: "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200",
            bar: "bg-fuchsia-500"
        },
        {
            title: "Eğlenceli Robotik",
            icon: BrainSprite,
            lessons: "6 Canlı Ders",
            modules: "32 Modül",
            level: "Uygula (Orta)",
            topBg: "bg-cyan-50/80",
            cardBorder: "border-cyan-300 border-b-[6px] border-b-cyan-400 hover:border-cyan-400 hover:border-b-cyan-500",
            plate: "bg-cyan-50 border-cyan-200",
            badge: "bg-cyan-100 text-cyan-700 border-cyan-200",
            bar: "bg-cyan-500"
        },
        {
            title: "Scratch ile Programlama",
            icon: PuzzleSprite,
            lessons: "10 Canlı Ders",
            modules: "60 Modül",
            level: "Birleştir (Başlangıç)",
            topBg: "bg-emerald-50/80",
            cardBorder: "border-emerald-300 border-b-[6px] border-b-emerald-400 hover:border-emerald-400 hover:border-b-emerald-500",
            plate: "bg-emerald-50 border-emerald-200",
            badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
            bar: "bg-emerald-500"
        },
        {
            title: "Görsel Matematik",
            icon: TrophySprite,
            lessons: "12 Canlı Ders",
            modules: "54 Modül",
            level: "Üret (Orta)",
            topBg: "bg-amber-50/80",
            cardBorder: "border-amber-300 border-b-[6px] border-b-amber-400 hover:border-amber-400 hover:border-b-amber-500",
            plate: "bg-amber-50 border-amber-200",
            badge: "bg-amber-100 text-amber-700 border-amber-200",
            bar: "bg-amber-500"
        },
        {
            title: "İnteraktif İngilizce",
            icon: EnglishIcon,
            lessons: "8 Canlı Ders",
            modules: "40 Modül",
            level: "Quiz & Ödev",
            topBg: "bg-purple-50/80",
            cardBorder: "border-purple-300 border-b-[6px] border-b-purple-400 hover:border-purple-400 hover:border-b-purple-500",
            plate: "bg-purple-50 border-purple-200",
            badge: "bg-purple-100 text-purple-700 border-purple-200",
            bar: "bg-purple-500"
        }
    ];

    // Marquee subject chips (Single row rich cards)
    // Marquee subject chips (Single row rich cards using Roadmap Level Themes: Purple, Cyan, Emerald, Amber)
    const marqueeItems = [
        { label: "Python ile Kodlama", sub: "8 Canlı Ders • 120 XP", badge: "Popüler", img: PythonIcon, border: "hover:border-purple-300 hover:border-b-purple-400", badgeBg: "bg-purple-100 text-purple-700 border-purple-200", iconBg: "bg-purple-50 border-purple-200 text-purple-600" },
        { label: "JavaScript ES6+", sub: "10 Modül • 150 XP", badge: "İnteraktif", img: JsIcon, border: "hover:border-cyan-300 hover:border-b-cyan-400", badgeBg: "bg-cyan-100 text-cyan-700 border-cyan-200", iconBg: "bg-cyan-50 border-cyan-200 text-cyan-600" },
        { label: "Görsel Matematik", sub: "14 Sunum • Quizli", badge: "K-12 Uyumlu", img: TrophySprite, border: "hover:border-emerald-300 hover:border-b-emerald-400", badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200", iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600" },
        { label: "İnteraktif İngilizce", sub: "Speaking & Games", badge: "Oyunlu", img: EnglishIcon, border: "hover:border-amber-300 hover:border-b-amber-400", badgeBg: "bg-amber-100 text-amber-700 border-amber-200", iconBg: "bg-amber-50 border-amber-200 text-amber-600" },
        { label: "Robotik & Yapay Zeka", sub: "6 Proje • Canlı Kod", badge: "Yeni", img: BrainSprite, border: "hover:border-purple-300 hover:border-b-purple-400", badgeBg: "bg-purple-100 text-purple-700 border-purple-200", iconBg: "bg-purple-50 border-purple-200 text-purple-600" },
        { label: "Modern React 19", sub: "Komponent Yapısı", badge: "Gelişmiş", img: ReactIcon, border: "hover:border-cyan-300 hover:border-b-cyan-400", badgeBg: "bg-cyan-100 text-cyan-700 border-cyan-200", iconBg: "bg-cyan-50 border-cyan-200 text-cyan-600" },
        { label: "Veri Bilimi & Grafik", sub: "Analiz & Görseller", badge: "AI Destekli", img: DataIcon, border: "hover:border-emerald-300 hover:border-b-emerald-400", badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200", iconBg: "bg-emerald-50 border-emerald-200 text-emerald-600" },
        { label: "Scratch ile Blok Kod", sub: "Sürükle & Bırak", badge: "Başlangıç", img: PuzzleSprite, border: "hover:border-amber-300 hover:border-b-amber-400", badgeBg: "bg-amber-100 text-amber-700 border-amber-200", iconBg: "bg-amber-50 border-amber-200 text-amber-600" },
        { label: "Deneylerle Fen Bilgisi", sub: "Simülasyon Modülü", badge: "İnteraktif", img: BooksIcon, border: "hover:border-purple-300 hover:border-b-purple-400", badgeBg: "bg-purple-100 text-purple-700 border-purple-200", iconBg: "bg-purple-50 border-purple-200 text-purple-600" },
        { label: "Canlı Quiz Turnuvası", sub: "Anlık Liderlik", badge: "Turnuva", img: QuestionSprite, border: "hover:border-cyan-300 hover:border-b-cyan-400", badgeBg: "bg-cyan-100 text-cyan-700 border-cyan-200", iconBg: "bg-cyan-50 border-cyan-200 text-cyan-600" },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-700 selection:bg-purple-200">
            <style>{`
                .font-display { font-family: "Fredoka", "Nunito", ui-rounded, system-ui, sans-serif; }

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
                .animate-cloud-1 { animation: float-cloud-1 14s ease-in-out infinite; }
                .animate-cloud-2 { animation: float-cloud-2 18s ease-in-out infinite; }

                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-6px); }
                }
                .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }

                @keyframes card-impact {
                    0%, 100% { transform: translateX(0); }
                    15% { transform: translateX(-4px); }
                    30% { transform: translateX(3px); }
                    45% { transform: translateX(-2px); }
                    60% { transform: translateX(1px); }
                }
                .animate-card-impact { animation: card-impact 0.2s ease-out; }

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
                .animate-debris-1 { animation: debris-1 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; }
                .animate-debris-2 { animation: debris-2 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; }
                .animate-debris-3 { animation: debris-3 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; }
                .animate-debris-4 { animation: debris-4 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; }
                .animate-debris-5 { animation: debris-5 0.45s cubic-bezier(0.1, 0.8, 0.3, 1) forwards; }

                .construction-tape {
                    background: repeating-linear-gradient(
                        -45deg,
                        #eab308,
                        #eab308 10px,
                        #1e293b 10px,
                        #1e293b 20px
                    );
                }

                .dot-grid {
                    background-image: radial-gradient(circle, rgba(100, 116, 139, 0.14) 1.5px, transparent 1.5px);
                    background-size: 26px 26px;
                }
                .dot-grid-dark {
                    background-image: radial-gradient(circle, rgba(255, 255, 255, 0.07) 1.5px, transparent 1.5px);
                    background-size: 26px 26px;
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
                .animate-icon-fall { animation: icon-fall 0.85s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; }

                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-6px); }
                }
                .animate-float { animation: float 2.5s ease-in-out infinite; }

                @keyframes wiggle {
                    0%, 100% { transform: rotate(-2deg); }
                    50% { transform: rotate(2deg); }
                }
                .animate-wiggle { animation: wiggle 4s ease-in-out infinite; }

                @keyframes marquee-scroll {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes marquee-scroll-reverse {
                    0% { transform: translateX(-50%); }
                    100% { transform: translateX(0); }
                }
                .animate-marquee {
                    animation: marquee-scroll 38s linear infinite;
                }
                .animate-marquee-reverse {
                    animation: marquee-scroll-reverse 38s linear infinite;
                }
                .group-marquee:hover .animate-marquee,
                .group-marquee:hover .animate-marquee-reverse {
                    animation-play-state: paused;
                }
                .marquee-mask {
                    mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
                    -webkit-mask-image: linear-gradient(to right, transparent, black 6%, black 94%, transparent);
                }

                @keyframes bar-grow {
                    0% { transform: scaleY(0.2); }
                    100% { transform: scaleY(1); }
                }
                .animate-bar-grow {
                    transform-origin: bottom;
                    animation: bar-grow 1s cubic-bezier(0.2, 0.8, 0.2, 1) both;
                }

                @keyframes ping-soft {
                    0% { transform: scale(1); opacity: 0.6; }
                    100% { transform: scale(1.8); opacity: 0; }
                }
                .animate-ping-soft { animation: ping-soft 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
            `}</style>

            {/* ============ NAVBAR ============ */}
            <header className="sticky top-0 z-50 w-full pointer-events-none">
                <motion.nav
                    initial={{ y: -60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className={`pointer-events-auto transition-all duration-500 ease-out flex items-center justify-between ${
                        isScrolled
                            ? 'mt-3 mx-4 lg:mx-auto max-w-6xl rounded-3xl bg-white/90 backdrop-blur-xl border-2 border-slate-200/90 shadow-xl shadow-slate-900/5 py-2.5 px-6'
                            : 'w-full bg-white/90 backdrop-blur-md border-b-2 border-slate-100 py-4 px-6 lg:px-12'
                    }`}
                >
                    <div className="flex items-center gap-6 xl:gap-8 w-full justify-between max-w-[1400px] mx-auto">
                        {/* Logo */}
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex-shrink-0 cursor-pointer"
                            onClick={() => navigate('/')}
                        >
                            <img
                                src={LogoText}
                                alt="GoMufi"
                                className={`object-contain transition-all duration-300 ${
                                    isScrolled ? 'h-[36px] md:h-[40px]' : 'h-[46px] md:h-[54px]'
                                }`}
                            />
                        </motion.div>

                        {/* Nav pills */}
                        <div className={`hidden xl:flex items-center gap-1 font-black tracking-wide whitespace-nowrap bg-slate-100/70 border-2 border-slate-200/60 rounded-2xl transition-all duration-300 ${
                            isScrolled ? 'p-1 text-[12px]' : 'p-1.5 text-[13px]'
                        }`}>
                            {[
                                { id: 'features', label: 'Özellikler' },
                                { id: 'sample-courses', label: 'Örnek Dersler' },
                                { id: 'steps', label: 'Nasıl Çalışır?' },
                                { id: 'preview', label: 'Platform' },
                                { id: 'faq', label: 'SSS' }
                            ].map(link => (
                                <motion.button
                                    key={link.id}
                                    whileHover={{ scale: 1.04, y: -1 }}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => scrollToSection(link.id)}
                                    className={`rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all cursor-pointer ${
                                        isScrolled ? 'px-3 py-1.5' : 'px-4 py-2'
                                    }`}
                                >
                                    {link.label}
                                </motion.button>
                            ))}
                            <motion.button
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/animation')}
                                className={`rounded-xl text-purple-600 hover:bg-white hover:shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ${
                                    isScrolled ? 'px-3 py-1.5' : 'px-4 py-2'
                                }`}
                            >
                                <Sparkles size={13} className="animate-pulse" /> Animasyon
                            </motion.button>
                        </div>

                        {/* CTA Actions */}
                        <div className="hidden sm:flex items-center gap-3">
                            <motion.button
                                whileHover={{ scale: 1.04, y: -1 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => navigate('/auth')}
                                className={`rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white text-slate-700 font-black hover:bg-slate-50 active:translate-y-[2px] active:border-b-2 transition-all cursor-pointer ${
                                    isScrolled ? 'px-4 py-2 text-xs' : 'px-6 py-2.5 text-sm'
                                }`}
                            >
                                Giriş Yap
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.05, y: -1 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => navigate('/auth')}
                                className={`rounded-2xl border-2 border-b-4 border-green-700 bg-[#23c55e] text-white font-black hover:bg-[#1ea54c] active:translate-y-[2px] active:border-b-2 transition-all cursor-pointer shadow-md shadow-green-200/50 ${
                                    isScrolled ? 'px-5 py-2 text-xs' : 'px-6 py-2.5 text-sm'
                                }`}
                            >
                                Ücretsiz Başla
                            </motion.button>
                        </div>

                        {/* Mobile Menu Button */}
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            className="xl:hidden p-2.5 text-slate-600 hover:bg-slate-100 rounded-xl border-2 border-slate-200"
                            onClick={() => setIsMobileMenuOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </motion.button>
                    </div>
                </motion.nav>
            </header>

            {/* Mobile Drawer */}
            <AnimatePresence>
                {isMobileMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm"
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                            className="absolute top-0 right-0 w-[85%] max-w-sm h-full bg-white shadow-2xl p-6 flex flex-col"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <img src={LogoText} alt="GoMufi" className="h-10 object-contain" />
                                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                    <X className="w-6 h-6 text-slate-500" />
                                </button>
                            </div>
                            <div className="flex flex-col gap-2 text-base font-black text-slate-700">
                                <button onClick={() => scrollToSection('features')} className="text-left py-3 px-3 hover:bg-slate-50 hover:text-purple-600 rounded-xl transition-colors">Özellikler</button>
                                <button onClick={() => scrollToSection('sample-courses')} className="text-left py-3 px-3 hover:bg-slate-50 hover:text-purple-600 rounded-xl transition-colors">Örnek Dersler</button>
                                <button onClick={() => scrollToSection('steps')} className="text-left py-3 px-3 hover:bg-slate-50 hover:text-purple-600 rounded-xl transition-colors">Nasıl Çalışır?</button>
                                <button onClick={() => scrollToSection('preview')} className="text-left py-3 px-3 hover:bg-slate-50 hover:text-purple-600 rounded-xl transition-colors">Platform</button>
                                <button onClick={() => scrollToSection('faq')} className="text-left py-3 px-3 hover:bg-slate-50 hover:text-purple-600 rounded-xl transition-colors">SSS</button>
                                <button onClick={() => { navigate('/animation'); setIsMobileMenuOpen(false); }} className="text-left py-3 px-3 hover:bg-slate-50 rounded-xl transition-colors text-purple-600">✨ Animasyon</button>
                            </div>
                            <div className="mt-auto pt-6 border-t-2 border-slate-100 flex flex-col gap-3">
                                <button onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }} className="w-full py-3.5 rounded-2xl border-2 border-slate-200 border-b-4 border-b-slate-300 bg-white font-black text-center text-slate-700 active:translate-y-[2px] active:border-b-2 transition-all">Giriş Yap</button>
                                <button onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }} className="w-full py-3.5 rounded-2xl border-2 border-b-4 border-green-700 bg-[#23c55e] text-white font-black text-center active:translate-y-[2px] active:border-b-2 transition-all">Kayıt Ol</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ============ 1. HERO ============ */}
            <section className="relative pt-14 lg:pt-20 pb-28 px-6 md:px-12 overflow-hidden bg-white">
                {/* Layered background: dot grid */}
                <div className="absolute inset-0 z-0 dot-grid opacity-60"></div>



                <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center relative z-10">
                    {/* Hero Text */}
                    <div className="lg:col-span-6 text-left space-y-7 animate-in fade-in slide-in-from-left-6 duration-700">
                        {/* Eyebrow badge */}
                        <div className="inline-flex items-center gap-2.5 bg-white border-2 border-b-4 border-purple-200 rounded-2xl pl-2 pr-4 py-1.5 shadow-sm shadow-purple-100/60">
                            <span className="relative flex items-center justify-center w-7 h-7 bg-purple-50 border border-purple-200 rounded-xl">
                                <Bot size={15} className="text-purple-600" />
                                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full">
                                    <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping-soft"></span>
                                </span>
                            </span>
                            <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest">Yapay Zeka Destekli Eğitim Platformu</span>
                        </div>

                        <h1 className="font-display text-[42px] sm:text-5xl md:text-[58px] font-bold text-slate-700 tracking-wide leading-[1.15]">
                            Canlı Derslerini
                            <br />
                            <span className="bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
                                Yapay Zeka ile
                            </span>{' '}
                            <span className="relative inline-block align-middle text-white bg-[#23c55e] px-5 py-1.5 my-2 rounded-2xl border-2 border-b-[6px] border-[#16a34a] font-bold shadow-lg shadow-green-200/50 transform rotate-[-1.5deg] hover:rotate-0 hover:scale-[1.03] transition-transform duration-300">
                                15 Dakikada
                                <Sparkles size={20} className="absolute -top-3 -right-3 text-yellow-300 fill-yellow-300 animate-pulse" />
                            </span>
                            <br />
                            Hazırla.
                        </h1>

                        <p className="text-base md:text-lg text-slate-500 font-bold leading-relaxed max-w-xl">
                            Konuyu yaz, gerisini <span className="text-purple-600">Mufi</span>'ye bırak. Ders planı, oyunlaştırılmış içerik,
                            quiz ve etkileşimli slaytlar — hepsi tek komutla, sunuma hazır.
                        </p>

                        <div className="flex flex-wrap gap-4 pt-1">
                            <motion.button
                                whileHover={{ scale: 1.04, y: -2 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => navigate('/auth')}
                                className="group px-8 py-4 rounded-[1.6rem] border-2 border-b-[6px] border-green-700 bg-[#23c55e] hover:bg-[#1ea54c] active:translate-y-[3px] active:border-b-2 text-white font-black text-base shadow-lg shadow-green-200/60 transition-all flex items-center gap-2.5 cursor-pointer"
                            >
                                <Wand2 size={19} className="group-hover:rotate-12 transition-transform" />
                                AI ile Ücretsiz Oluştur
                                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                            </motion.button>
                            <motion.button
                                whileHover={{ scale: 1.04, y: -2 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => scrollToSection('preview')}
                                className="px-8 py-4 rounded-[1.6rem] border-2 border-slate-200 border-b-[6px] border-b-slate-300 bg-white hover:bg-slate-50 active:translate-y-[3px] active:border-b-2 text-slate-700 font-black text-base transition-all cursor-pointer flex items-center gap-2"
                            >
                                <MousePointerClick size={18} className="text-purple-500" />
                                Demo İzle
                            </motion.button>
                        </div>

                        {/* Trust strip */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-3">
                            {[
                                { icon: <Timer size={15} className="text-orange-500" />, label: "Dakikalar içinde hazır" },
                                { icon: <ShieldCheck size={15} className="text-emerald-500" />, label: "K-12 müfredat uyumlu" },
                                { icon: <GraduationCap size={15} className="text-purple-500" />, label: "Öğretmenler için ücretsiz" }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-2 text-[12px] font-black text-slate-500">
                                    <span className="w-7 h-7 rounded-xl bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">{item.icon}</span>
                                    {item.label}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Hero Animation (AI Production Pipeline Simulation) */}
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

                            <div className={`w-full bg-white rounded-[2.5rem] border-2 border-slate-200 border-b-[8px] border-b-slate-300 shadow-lg relative overflow-hidden flex flex-col font-sans ${builderCatFrame === 2 && simStep !== 5 ? 'animate-card-impact' : ''}`}>
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

                {/* Grass strip footer of hero */}
                <div
                    className="absolute bottom-0 inset-x-0 h-[26px] bg-repeat-x opacity-40 pointer-events-none"
                    style={{ backgroundImage: `url(${GrassIcon})`, backgroundSize: 'auto 100%' }}
                ></div>
            </section>

            {/* ============ 2. SUBJECT MARQUEE ============ */}
            <section className="py-8 bg-slate-50/90 border-y-2 border-slate-200/80 overflow-hidden relative">
                <div className="group-marquee marquee-mask overflow-hidden py-1">
                    <div className="flex gap-4 w-max animate-marquee">
                        {[...marqueeItems, ...marqueeItems].map((item, i) => (
                            <div
                                key={i}
                                className={`flex items-center gap-3.5 bg-white border-2 border-slate-200 border-b-4 border-b-slate-300 rounded-2xl px-4 py-3 shrink-0 shadow-sm ${item.border} hover:-translate-y-1 hover:shadow-md transition-all duration-300 cursor-pointer group/card`}
                            >
                                <div className={`w-11 h-11 rounded-xl ${item.iconBg} border flex items-center justify-center shrink-0 group-hover/card:scale-110 transition-transform duration-300`}>
                                    <img src={item.img} alt="" className="w-6 h-6 object-contain" />
                                </div>
                                <div className="flex flex-col text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-black text-slate-800 tracking-tight whitespace-nowrap">{item.label}</span>
                                        <span className={`text-[9px] font-black border px-2 py-0.5 rounded-lg whitespace-nowrap ${item.badgeBg}`}>
                                            {item.badge}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mt-0.5">{item.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ 3. LOGIN & JOIN CODE CARDS ============ */}
            <section className="py-20 px-6 md:px-12 bg-slate-50 overflow-hidden relative">
                <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none"></div>
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 relative z-10">
                    {/* Instructor Login Card (Anla - #d946ef) */}
                    <div className="reveal-left bg-white rounded-[2.5rem] border-2 border-[#d946ef] border-b-[8px] border-b-[#c026d3] hover:border-[#c026d3] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
                        {/* Card top band */}
                        <div className="relative bg-[#d946ef]/5 px-8 pt-8 pb-6 border-b-2 border-[#d946ef]/20">
                            <div className="absolute top-4 right-6 text-[#d946ef]/20 rotate-12 group-hover:rotate-6 transition-transform">
                                <Cpu size={56} />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-16 h-16 bg-white border-2 border-b-4 border-[#d946ef]/30 rounded-2xl flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 group-hover:-rotate-3 transition-transform duration-300">
                                    <img src={BrainSprite} alt="Brain" className="w-10 h-10 object-contain" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-[#d946ef] uppercase tracking-widest bg-[#d946ef]/10 border border-[#d946ef]/30 px-2.5 py-1 rounded-xl">Eğitmen</span>
                                    <h3 className="font-display text-2xl font-black text-slate-700 mt-1.5">Öğretmenim</h3>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 flex-1 flex flex-col justify-between gap-6">
                            <p className="text-slate-500 font-bold text-sm leading-relaxed text-left">
                                İlk AI dersini oluşturmaya başla; yol haritaları, oyunlaştırılmış mini quizler ve canlı ders araçlarıyla öğrencilerinin ilgisini topla.
                            </p>
                            <button
                                onClick={() => navigate('/auth')}
                                className="w-full py-4 rounded-2xl border-2 border-b-[6px] border-[#c026d3] bg-[#d946ef] hover:bg-[#c026d3] active:translate-y-[2px] active:border-b-2 text-white font-black text-sm transition-all tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-fuchsia-200/50"
                            >
                                Eğitmen Girişi <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Student Join Code Card (Birleştir - #22c55e) */}
                    <div className="reveal-right bg-white rounded-[2.5rem] border-2 border-[#22c55e] border-b-[8px] border-b-[#16a34a] hover:border-[#16a34a] hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group">
                        {/* Card top band */}
                        <div className="relative bg-green-50/60 px-8 pt-8 pb-6 border-b-2 border-green-100/60">
                            <div className="absolute top-4 right-6 text-green-200/60 -rotate-12 group-hover:-rotate-6 transition-transform">
                                <Gamepad2 size={56} />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-16 h-16 bg-white border-2 border-b-4 border-green-200 rounded-2xl flex items-center justify-center shadow-sm shrink-0 group-hover:scale-105 group-hover:rotate-3 transition-transform duration-300">
                                    <img src={PuzzleSprite} alt="Puzzle" className="w-10 h-10 object-contain" />
                                </div>
                                <div>
                                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-100/70 border border-green-200 px-2.5 py-1 rounded-xl">Katılım</span>
                                    <h3 className="font-display text-2xl font-black text-slate-700 mt-1.5">Öğrenciyim</h3>
                                </div>
                            </div>
                        </div>

                        <div className="px-8 py-6 flex-1 flex flex-col justify-between gap-6">
                            <p className="text-slate-500 font-bold text-sm leading-relaxed text-left">
                                Öğretmeninin seninle paylaştığı katılım kodunu gir; oyunlaştırılmış canlı derslere ve quizlere anında bağlan.
                            </p>
                            <form onSubmit={handleStudentJoin} className="space-y-3">
                                <div className="flex gap-2 items-stretch">
                                    <div className="flex-1 relative flex items-center">
                                        <KeyRound size={16} className="absolute left-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="DERS KODU"
                                            value={joinCode}
                                            onChange={(e) => setJoinCode(e.target.value)}
                                            maxLength={8}
                                            className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border-2 border-b-4 border-slate-200 focus:border-green-400 focus:border-b-green-500 focus:bg-white rounded-2xl outline-none text-sm font-black text-center tracking-[0.25em] placeholder-slate-300 uppercase transition-all"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-6 rounded-2xl border-2 border-b-[6px] border-[#15803d] bg-[#23c55e] hover:bg-[#1ea54c] text-white font-black text-sm active:translate-y-[2px] active:border-b-2 transition-all shrink-0 cursor-pointer shadow-md shadow-green-200/50"
                                    >
                                        Kod Gir
                                    </button>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 text-center tracking-wide">örn: 45CZWT — öğretmenin ekranında yazar 👀</p>
                            </form>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 4. QUICK BENEFITS STRIP ============ */}
            <section className="reveal-scale py-14 bg-white border-t-2 border-slate-100">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                        {[
                            { title: "15 Dakikada", sub: "Ders Hazırlama", icon: <Zap className="w-6 h-6 text-orange-500" />, plate: "bg-orange-50 border-orange-200" },
                            { title: "AI Destekli", sub: "İçerik Üretimi", icon: <Bot className="w-6 h-6 text-purple-600" />, plate: "bg-purple-50 border-purple-200" },
                            { title: "Oyunlaştırılmış", sub: "Öğrenme Deneyimi", icon: <Gamepad2 className="w-6 h-6 text-pink-500" />, plate: "bg-pink-50 border-pink-200" },
                            { title: "Canlı Ders", sub: "Tek Panelden Yönetim", icon: <Users className="w-6 h-6 text-emerald-500" />, plate: "bg-emerald-50 border-emerald-200" }
                        ].map((stat, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-5 rounded-[1.8rem] border-2 border-slate-200 border-b-[6px] border-b-slate-300 bg-white hover:-translate-y-1 hover:border-slate-300 hover:border-b-slate-400 transition-all duration-300">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 border-b-4 ${stat.plate} shadow-inner`}>
                                    {stat.icon}
                                </div>
                                <div className="text-left leading-tight">
                                    <div className="font-display font-black text-slate-700 text-sm">{stat.title}</div>
                                    <div className="font-bold text-slate-400 text-xs mt-0.5">{stat.sub}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ 5. FEATURES (BENTO GRID) ============ */}
            <section id="features" className="py-24 px-6 bg-slate-50 relative overflow-hidden">
                <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="reveal text-center mb-16 space-y-4">
                        <span className="inline-block text-[11px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 border-2 border-purple-100 px-4 py-1.5 rounded-2xl">Neler Yapabilirsin?</span>
                        <h2 className="font-display text-3xl md:text-[44px] font-black tracking-tight leading-tight text-slate-700">
                            Neden <span className="text-purple-600">GoMufi?</span>
                        </h2>
                        <p className="text-slate-500 text-base md:text-lg max-w-2xl mx-auto font-bold">
                            Sıkıcı, jenerik sınıfları canlandıran ve öğretmenlerin yükünü hafifleten yeni nesil eğitim teknolojileri.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
                        {/* 1. BIG: AI Lesson Builder (Anla Level - Fuchsia #d946ef) */}
                        <div className="reveal-scale md:col-span-4 bg-white rounded-[2.5rem] border-2 border-[#d946ef] border-b-[8px] border-b-[#c026d3] hover:border-[#c026d3] hover:-translate-y-1 transition-all duration-300 overflow-hidden group relative">
                            <div className="grid sm:grid-cols-2 h-full">
                                <div className="p-8 md:p-10 flex flex-col justify-between gap-6">
                                    <div className="space-y-3">
                                        <span className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#d946ef] bg-[#d946ef]/10 border border-[#d946ef]/30 px-3 py-1 rounded-xl uppercase tracking-widest">
                                            <Sparkles size={12} /> AI Destekli Üretim
                                        </span>
                                        <h3 className="font-display text-2xl md:text-3xl font-black text-slate-700 tracking-tight">
                                            <span className="text-[#d946ef]">AI</span> Lesson Builder
                                        </h3>
                                        <p className="text-slate-500 font-bold text-sm leading-relaxed">
                                            Tek komutla ders planı oluşturun; kazanımlara göre otomatik slaytlar, kodlar ve quizler saniyeler içinde elinizde.
                                        </p>
                                    </div>
                                    {/* Feature Pills */}
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {["⚡ 4 Saniyede Ders", "🧠 Pedagojik Akış", "🎯 Kazanım Odaklı"].map((pill, i) => (
                                            <span key={i} className="text-[11px] font-black text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
                                                {pill}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                {/* Mini visual: prompt → roadmap node flow */}
                                <div className="relative bg-slate-50/80 p-8 flex flex-col justify-center gap-3 border-t-2 sm:border-t-0 sm:border-l-2 border-slate-100">
                                    {/* Simulated AI Prompt Box */}
                                    <div className="bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <Wand2 size={15} className="text-[#d946ef] shrink-0" />
                                            <span className="text-[11px] font-black text-slate-700 font-mono truncate">"Kesirler konusu, 5. sınıf"</span>
                                        </div>
                                        <span className="text-[9px] font-black text-white bg-[#d946ef] px-2.5 py-1 rounded-lg shrink-0">AI OLUŞTUR</span>
                                    </div>

                                    <div className="flex justify-center">
                                        <ChevronDown size={18} className="text-[#d946ef] animate-bounce" />
                                    </div>

                                    {/* Generated Roadmap Nodes flow */}
                                    <div className="grid grid-cols-5 gap-1.5 bg-white border-2 border-b-4 border-slate-200 rounded-2xl p-3 shadow-sm">
                                        {[
                                            { label: "Anla", img: BrainSprite, bg: "bg-[#d946ef]/10 border-[#d946ef]" },
                                            { label: "Uygula", img: PencilSprite, bg: "bg-[#06b6d4]/10 border-[#06b6d4]" },
                                            { label: "Birleştir", img: PuzzleSprite, bg: "bg-[#22c55e]/10 border-[#22c55e]" },
                                            { label: "Üret", img: TrophySprite, bg: "bg-[#eab308]/10 border-[#eab308]" },
                                            { label: "Quiz", img: QuestionSprite, bg: "bg-[#7c3aed]/10 border-[#7c3aed]" }
                                        ].map((m, i) => (
                                            <div key={i} className={`border-2 rounded-xl p-1.5 flex flex-col items-center gap-0.5 ${m.bg} group-hover:-translate-y-0.5 transition-transform`}>
                                                <img src={m.img} alt="" className="w-5 h-5 object-contain" />
                                                <span className="text-[7px] font-black text-slate-700 uppercase tracking-tighter truncate w-full text-center">{m.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Canva-like Editor (Uygula Level - Cyan #06b6d4) */}
                        <div className="reveal-scale md:col-span-2 bg-white rounded-[2.5rem] border-2 border-[#06b6d4] border-b-[8px] border-b-[#0891b2] hover:border-[#0891b2] hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col justify-between gap-6 group relative overflow-hidden" style={{ transitionDelay: '80ms' }}>
                            <div className="space-y-3">
                                <span className="inline-block text-[10px] font-black text-[#06b6d4] bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-3 py-1 rounded-xl uppercase tracking-widest">
                                    🎨 Sürükle & Bırak
                                </span>
                                <h3 className="font-display text-xl font-black text-slate-700 tracking-tight">
                                    Canva Benzeri <span className="text-[#06b6d4]">Editör</span>
                                </h3>
                                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                                    Hazır eğitsel şablonlar, görseller ve interaktif nesnelerle sunumları kolayca düzenleyin.
                                </p>
                            </div>

                            {/* Mini Editor Toolbar Mockup */}
                            <div className="bg-slate-50 border-2 border-b-4 border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-700 shadow-2xl flex items-center gap-1">📐 Şekil</span>
                                    <span className="text-[10px] font-black bg-white border border-slate-200 px-2 py-1 rounded-lg text-slate-700 shadow-2xl flex items-center gap-1">✍️ Metin</span>
                                </div>
                                <span className="text-[10px] font-black text-white bg-[#06b6d4] px-2.5 py-1 rounded-lg shadow-sm">DÜZENLE</span>
                            </div>
                        </div>

                        {/* 3. Gamified (Birleştir Level - Green #22c55e) */}
                        <div className="reveal-scale md:col-span-2 bg-white rounded-[2.5rem] border-2 border-[#22c55e] border-b-[8px] border-b-[#16a34a] hover:border-[#16a34a] hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col justify-between gap-6 group relative overflow-hidden" style={{ transitionDelay: '120ms' }}>
                            <div className="space-y-3">
                                <span className="inline-block text-[10px] font-black text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/30 px-3 py-1 rounded-xl uppercase tracking-widest">
                                    🎮 Oyunlaştırma
                                </span>
                                <h3 className="font-display text-xl font-black text-slate-700 tracking-tight">
                                    <span className="text-[#22c55e]">Oyunlaştırılmış</span> Dersler
                                </h3>
                                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                                    Quizler, görevler ve mini oyunlarla motivasyonu zirvede tutun. XP ve ligler dahil.
                                </p>
                            </div>

                            {/* Gamification Stats Widget */}
                            <div className="bg-slate-50 border-2 border-b-4 border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2">
                                    <img src={TrophySprite} alt="" className="w-7 h-7 object-contain" />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-slate-800 leading-none">Bronz Lig #1</span>
                                        <span className="text-[9px] font-bold text-amber-600">850 XP Kazanıldı</span>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-1 rounded-lg">🔥 5 Gün</span>
                            </div>
                        </div>

                        {/* 4. Ready Modules (Üret Level - Gold #eab308 / #ca8a04) */}
                        <div className="reveal-scale md:col-span-2 bg-white rounded-[2.5rem] border-2 border-[#eab308] border-b-[8px] border-b-[#ca8a04] hover:border-[#ca8a04] hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col justify-between gap-6 group relative overflow-hidden" style={{ transitionDelay: '160ms' }}>
                            <div className="space-y-3">
                                <span className="inline-block text-[10px] font-black text-[#ca8a04] bg-[#eab308]/10 border border-[#eab308]/30 px-3 py-1 rounded-xl uppercase tracking-widest">
                                    📦 Modül Kütüphanesi
                                </span>
                                <h3 className="font-display text-xl font-black text-slate-700 tracking-tight">
                                    Hazır <span className="text-[#ca8a04]">Modüller</span>
                                </h3>
                                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                                    Anla, Uygula, Birleştir, Üret, Quiz ve Ödev modülleriyle eksiksiz ders akışları kurun.
                                </p>
                            </div>

                            {/* 5 Module Pills Grid */}
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { name: "Anla", color: "bg-[#d946ef]/10 text-[#d946ef] border-[#d946ef]/30" },
                                    { name: "Uygula", color: "bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/30" },
                                    { name: "Birleştir", color: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/30" },
                                    { name: "Üret", color: "bg-[#eab308]/10 text-[#ca8a04] border-[#eab308]/30" },
                                    { name: "Quiz", color: "bg-[#7c3aed]/10 text-[#7c3aed] border-[#7c3aed]/30" }
                                ].map((mod, idx) => (
                                    <span key={idx} className={`text-[10px] font-black border px-2.5 py-1 rounded-lg ${mod.color}`}>
                                        {mod.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* 5. Live Lesson (Quiz Level - Violet #7c3aed) */}
                        <div className="reveal-scale md:col-span-2 bg-white rounded-[2.5rem] border-2 border-[#7c3aed] border-b-[8px] border-b-[#6d28d9] hover:border-[#6d28d9] hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col justify-between gap-6 group relative overflow-hidden" style={{ transitionDelay: '200ms' }}>
                            <div className="space-y-3">
                                <span className="inline-block text-[10px] font-black text-[#7c3aed] bg-[#7c3aed]/10 border border-[#7c3aed]/30 px-3 py-1 rounded-xl uppercase tracking-widest">
                                    📹 Canlı Sınıf
                                </span>
                                <h3 className="font-display text-xl font-black text-slate-700 tracking-tight">
                                    <span className="text-[#7c3aed]">Canlı Ders</span> Yönetimi
                                </h3>
                                <p className="text-slate-500 font-bold text-sm leading-relaxed">
                                    Görüntülü bağlantı, katılım takibi ve entegre takvim sistemi tek panelde.
                                </p>
                            </div>

                            {/* Live Video Meeting Mockup */}
                            <div className="bg-slate-50 border-2 border-b-4 border-slate-200 rounded-2xl p-3 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></span>
                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-wide">● CANLI</span>
                                </div>
                                <div className="flex -space-x-2 overflow-hidden">
                                    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Selin" alt="" />
                                    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet" alt="" />
                                    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-white" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sibel" alt="" />
                                </div>
                                <span className="text-[9px] font-black text-purple-700 bg-purple-100 border border-purple-200 px-2 py-1 rounded-lg">24 Öğrenci</span>
                            </div>
                        </div>

                        {/* 6. WIDE: Analytics & Growth (Cyan #06b6d4) */}
                        <div className="reveal-scale md:col-span-6 bg-white rounded-[2.5rem] border-2 border-[#06b6d4] border-b-[8px] border-b-[#0891b2] hover:border-[#0891b2] hover:-translate-y-1 transition-all duration-300 overflow-hidden group" style={{ transitionDelay: '240ms' }}>
                            <div className="grid sm:grid-cols-2">
                                <div className="p-8 md:p-10 flex flex-col justify-between gap-6">
                                    <div className="space-y-3">
                                        <span className="inline-block text-[10px] font-black text-[#06b6d4] bg-[#06b6d4]/10 border border-[#06b6d4]/30 px-3 py-1 rounded-xl uppercase tracking-widest">
                                            📊 Detaylı Analiz
                                        </span>
                                        <h3 className="font-display text-2xl md:text-3xl font-black text-slate-700 tracking-tight">
                                            Öğrenci <span className="text-[#06b6d4]">Analitiği</span> & Gelişim Raporları
                                        </h3>
                                        <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-md">
                                            Öğrencilerin gelişim raporlarını, katılım sürelerini ve soru başarı grafiklerini anlık izleyin. Kim nerede zorlanıyor, tek bakışta görün.
                                        </p>
                                    </div>
                                    {/* Stat counters */}
                                    <div className="grid grid-cols-3 gap-3 pt-2">
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                                            <div className="text-lg font-black text-slate-800">%94</div>
                                            <div className="text-[9px] font-bold text-slate-400">Katılım Oranı</div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                                            <div className="text-lg font-black text-[#06b6d4]">14.2 dk</div>
                                            <div className="text-[9px] font-bold text-slate-400">Ort. Ders Süresi</div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-center">
                                            <div className="text-lg font-black text-emerald-600">+28%</div>
                                            <div className="text-[9px] font-bold text-slate-400">Başarı Artışı</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Mini bar chart mock */}
                                <div className="relative bg-slate-50/80 p-8 md:p-10 flex flex-col justify-end border-t-2 sm:border-t-0 sm:border-l-2 border-slate-100 min-h-[240px]">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                            <BarChart3 size={14} className="text-[#06b6d4]" /> Sınıf Haftalık Başarısı
                                        </span>
                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-xl">↑ %24 bu ay</span>
                                    </div>
                                    <div className="flex items-end gap-2.5 h-[120px]">
                                        {[45, 65, 50, 78, 60, 88, 95].map((h, i) => (
                                            <div key={i} className="flex-1 flex flex-col justify-end h-full">
                                                <div
                                                    className={`rounded-t-lg border-2 border-b-0 animate-bar-grow ${i === 6 ? 'bg-[#06b6d4] border-[#0891b2]' : 'bg-[#06b6d4]/25 border-[#06b6d4]/40'}`}
                                                    style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                                                ></div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-between mt-3 text-[9px] font-black text-slate-400 uppercase tracking-wider">
                                        <span>Pzt</span><span>Sal</span><span>Çar</span><span>Per</span><span>Cum</span><span>Cmt</span><span>Paz</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 6. AI SAMPLE COURSES ============ */}
            <section id="sample-courses" className="py-24 px-6 bg-white relative">
                <div className="max-w-7xl mx-auto">
                    <div className="reveal text-center mb-16 space-y-4">
                        <span className="inline-block text-[11px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 border-2 border-emerald-100 px-4 py-1.5 rounded-2xl">✨ AI Üretimi</span>
                        <h2 className="font-display text-3xl md:text-4xl font-black text-slate-700 tracking-tight">Örnek Ders Müfredatları</h2>
                        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-bold">Yapay zekanın saniyeler içinde kurguladığı ders akışlarını inceleyin.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                        {sampleCourses.map((course, idx) => (
                            <div
                                key={idx}
                                className={`reveal-scale bg-white rounded-[2.2rem] border-2 border-b-[8px] ${course.cardBorder} hover:-translate-y-1.5 transition-all flex flex-col overflow-hidden group duration-300`}
                                style={{ transitionDelay: `${idx * 80}ms` }}
                            >
                                {/* Colored header band */}
                                <div className={`relative bg-gradient-to-b ${course.topBg} px-6 pt-6 pb-5`}>
                                    <span className={`absolute top-4 right-4 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border ${course.badge}`}>
                                        {course.level}
                                    </span>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 border-b-4 ${course.plate} bg-white group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 shadow-sm`}>
                                        <img src={course.icon} alt="" className="w-9 h-9 object-contain" />
                                    </div>
                                </div>

                                <div className="px-6 py-5 flex-1 flex flex-col justify-between gap-4">
                                    <h3 className="font-display text-lg font-black text-slate-700 leading-tight text-left">{course.title}</h3>
                                    <div>
                                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                                            <div className={`h-full ${course.bar} rounded-full w-0 group-hover:w-full transition-all duration-700 ease-out`}></div>
                                        </div>
                                        <div className="flex justify-between text-[11px] font-black text-slate-400">
                                            <span className="flex items-center gap-1"><Video size={11} /> {course.lessons}</span>
                                            <span className="flex items-center gap-1"><Layers size={11} /> {course.modules}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ 7. HOW IT WORKS (4 STEPS) ============ */}
            <section id="steps" className="py-24 px-6 bg-slate-50 relative overflow-hidden">
                <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none"></div>
                <VectorCloud className="absolute top-10 left-[5%] w-28 opacity-40 text-white animate-cloud-1 pointer-events-none" />
                <VectorCloud className="absolute top-24 right-[8%] w-36 opacity-50 text-white animate-cloud-2 pointer-events-none" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="reveal text-center mb-20 space-y-4">
                        <span className="inline-block text-[11px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 border-2 border-blue-100 px-4 py-1.5 rounded-2xl">Nasıl Çalışır?</span>
                        <h2 className="font-display text-3xl md:text-4xl font-black text-slate-700 tracking-tight">4 Adımda Dersin Hazır</h2>
                        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-bold">Saatler süren ders hazırlığını dakikalara düşürün.</p>
                    </div>

                    <div className="relative grid md:grid-cols-4 gap-8 md:gap-6">
                        {/* Connecting dashed path */}
                        <div className="hidden md:block absolute top-[44px] left-[12.5%] right-[12.5%] border-t-[3px] border-dashed border-slate-300 z-0"></div>

                        {[
                            { step: "1", title: "Konunu Yaz", desc: '"Python Değişkenler" gibi hedefini sisteme gir.', color: "bg-purple-500 border-purple-700", ring: "ring-purple-100", img: PencilSprite },
                            { step: "2", title: "AI Haritayı Kursun", desc: "Dersler, modüller ve quizler anında otomatik oluşsun.", color: "bg-blue-500 border-blue-700", ring: "ring-blue-100", img: BrainSprite },
                            { step: "3", title: "Editörde Düzenle", desc: "İçerikleri sürükle-bırak ile dilediğin gibi özelleştir.", color: "bg-pink-500 border-pink-700", ring: "ring-pink-100", img: PuzzleSprite },
                            { step: "4", title: "Canlı Dersi Başlat", desc: "Kodu paylaş, öğrenciler saniyeler içinde katılsın.", color: "bg-emerald-500 border-emerald-700", ring: "ring-emerald-100", img: TrophySprite }
                        ].map((item, idx) => (
                            <div
                                key={idx}
                                className="reveal-scale relative z-10 flex flex-col items-center text-center group"
                                style={{ transitionDelay: `${idx * 120}ms` }}
                            >
                                {/* Number puck on the path */}
                                <div className={`w-[88px] h-[88px] rounded-[1.8rem] ${item.color} border-2 border-b-[6px] flex items-center justify-center mb-[-28px] relative z-20 shadow-lg ring-8 ${item.ring} group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300`}>
                                    <span className="font-display text-white text-3xl font-black">{item.step}</span>
                                    <img src={item.img} alt="" className="absolute -top-3 -right-3 w-9 h-9 object-contain drop-shadow-md animate-float" style={{ animationDelay: `${idx * 0.4}s` }} />
                                </div>
                                {/* Card */}
                                <div className="bg-white pt-12 pb-7 px-6 rounded-[2.2rem] border-2 border-slate-200 border-b-[8px] border-b-slate-300 group-hover:-translate-y-1 group-hover:border-slate-300 group-hover:border-b-slate-400 transition-all duration-300 w-full">
                                    <h3 className="font-display text-lg font-black text-slate-700 mb-2">{item.title}</h3>
                                    <p className="text-slate-500 font-bold text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ============ 8. PLATFORM PREVIEW TABS ============ */}
            <section id="preview" className="py-24 px-6 bg-white">
                <div className="max-w-6xl mx-auto space-y-12">
                    <div className="reveal text-center space-y-4">
                        <span className="inline-block text-[11px] font-black text-pink-600 uppercase tracking-widest bg-pink-50 border-2 border-pink-100 px-4 py-1.5 rounded-2xl">Platform Turu</span>
                        <h2 className="font-display text-3xl md:text-4xl font-black text-slate-700 tracking-tight">Platformdan Görseller</h2>
                        <p className="text-slate-500 text-lg font-bold">GoMufi'nin zengin ve dinamik arayüzlerini yakından keşfedin.</p>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="reveal flex flex-wrap justify-center gap-3">
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
                                    ? "border-green-700 bg-[#23c55e] text-white shadow-md shadow-green-200/50"
                                    : "border-slate-200 border-b-slate-300 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:border-b-slate-400"
                                    }`}
                            >
                                <span className="text-base">{tab.emoji}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Browser-framed mockup */}
                    <div className="reveal-scale bg-white border-2 border-slate-200 border-b-[8px] border-b-slate-300 rounded-[2.5rem] shadow-lg overflow-hidden relative">
                        {/* Browser chrome */}
                        <div className="flex items-center gap-3 px-6 py-4 bg-slate-50 border-b-2 border-slate-100">
                            <div className="flex gap-2">
                                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400"></div>
                            </div>
                            <div className="flex-1 max-w-xs mx-auto bg-white border-2 border-slate-200 rounded-xl px-4 py-1.5 text-[10px] font-black text-slate-400 text-center tracking-wide">
                                app.gomufi.com
                            </div>
                            <div className="w-14"></div>
                        </div>

                        <div className="p-8 min-h-[420px] flex flex-col justify-center">
                            {/* Tab Content: Roadmap Builder */}
                            {activePreviewTab === 'roadmap' && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 flex-1 flex flex-col justify-center">
                                    <div className="text-center space-y-2 mb-4">
                                        <span className="bg-purple-50 text-purple-600 border border-purple-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">Görsel Yol Haritası</span>
                                        <h4 className="font-display text-2xl font-black text-slate-700 tracking-tight">Ders Planını Haritaya Çevirin</h4>
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
                                                { label: "Quiz", img: QuestionSprite, border: "border-purple-200 border-b-purple-400 bg-purple-50" }
                                            ].map((node, i) => (
                                                <div key={i} className="flex flex-col items-center gap-2">
                                                    <div className={`w-14 h-14 rounded-2xl border-2 border-b-4 ${node.border} flex items-center justify-center font-black shadow-sm hover:scale-110 transition-transform`}>
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
                                        <h4 className="font-display text-2xl font-black text-slate-700 tracking-tight">Sürükle & Bırak İçerik Üretimi</h4>
                                    </div>
                                    <div className="max-w-3xl mx-auto w-full bg-slate-50 border-2 border-b-[6px] border-slate-200 rounded-[2.5rem] p-5 flex gap-4 text-slate-400 text-xs">
                                        {/* Editor Sidebar */}
                                        <div className="w-1/4 border-r-2 border-slate-200 pr-4 space-y-3 flex flex-col justify-center font-black text-slate-700">
                                            <div className="bg-white p-3 rounded-2xl text-center border-2 border-b-4 border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 active:translate-y-[1px] active:border-b-2 transition-all">🖼️ Slayt Ekle</div>
                                            <div className="bg-white p-3 rounded-2xl text-center border-2 border-b-4 border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 active:translate-y-[1px] active:border-b-2 transition-all">🧩 Kod Editörü</div>
                                            <div className="bg-white p-3 rounded-2xl text-center border-2 border-b-4 border-slate-200 shadow-sm cursor-pointer hover:bg-slate-50 active:translate-y-[1px] active:border-b-2 transition-all">🎮 Mini Oyun</div>
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
                                        <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">Canlı Ders Paneli</span>
                                        <h4 className="font-display text-2xl font-black text-slate-700 tracking-tight">Gerçek Zamanlı Etkileşim</h4>
                                    </div>
                                    <div className="max-w-3xl mx-auto w-full bg-slate-50 border-2 border-b-[6px] border-slate-200 rounded-[2.5rem] p-5 flex gap-4 text-xs text-slate-500">
                                        {/* Live Feed Mockup */}
                                        <div className="flex-1 bg-white border-2 border-b-4 border-slate-200 rounded-3xl p-5 flex flex-col justify-between min-h-[180px] shadow-sm">
                                            <div className="flex justify-between items-center text-slate-800 font-black">
                                                <span className="flex items-center gap-1.5"><Video size={14} className="text-rose-500" /> Canlı Yayın</span>
                                                <span className="text-emerald-600 font-black bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">Kod: 45CZWT</span>
                                            </div>
                                            <div className="text-center text-slate-500 py-6 font-bold">
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
                                                    <span className="text-slate-800 truncate">🥈 Mehmet B.</span>
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
                                        <span className="bg-pink-50 text-pink-600 border border-pink-200 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">Öğrenci Arayüzü</span>
                                        <h4 className="font-display text-2xl font-black text-slate-700 tracking-tight">Oyunlaştırılmış Öğrenci Deneyimi</h4>
                                    </div>
                                    <div className="max-w-2xl mx-auto w-full bg-slate-50 border-2 border-b-[6px] border-slate-200 rounded-[2.5rem] p-6 flex justify-between items-center text-slate-500 font-bold">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-white border-2 border-b-4 border-slate-200 flex items-center justify-center shadow-sm">
                                                <img src={TrophySprite} alt="" className="w-9 h-9 object-contain" />
                                            </div>
                                            <div>
                                                <h5 className="font-black text-slate-800 text-sm leading-none mb-1">Bronz Lig</h5>
                                                <span className="text-[10px] text-slate-400 font-bold">Seviye 4 Öğrencisi</span>
                                            </div>
                                        </div>
                                        <div className="w-32 bg-slate-200 rounded-full h-3 overflow-hidden shadow-inner">
                                            <div className="h-full bg-purple-500 w-[65%]"></div>
                                        </div>
                                        <span className="text-yellow-600 font-black text-sm">850 XP</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* ============ 9. TESTIMONIALS ============ */}
            <section className="py-24 px-6 bg-slate-50 relative overflow-hidden">
                <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none"></div>
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="reveal text-center mb-16 space-y-4">
                        <span className="inline-block text-[11px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 border-2 border-amber-100 px-4 py-1.5 rounded-2xl">💬 Deneyimler</span>
                        <h2 className="font-display text-3xl md:text-4xl font-black text-slate-700 tracking-tight">Öğretmenler Ne Diyor?</h2>
                        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-bold">GoMufi'ye geçen öğretmenlerin zamandan tasarruf hikayeleri.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { name: 'Selin K.', role: 'Matematik Öğretmeni', comment: 'Eskiden bir ders hazırlamam 3 saat sürüyordu. Şimdi AI ile 20 dakikada bitiriyorum.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Selin', tilt: 'md:rotate-[-1.5deg]', accent: 'border-t-purple-300' },
                            { name: 'Mehmet H.', role: 'Fen Bilgisi Öğretmeni', comment: 'Ders planı, quizler, oyun sahneleri hepsi tek komutla hazırlanıyor. İnanılmaz pratik.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mehmet', tilt: 'md:translate-y-3', accent: 'border-t-green-300' },
                            { name: 'Sibel G.', role: 'Sınıf Öğretmeni', comment: 'Çocuklar derse katılmak için can atıyor. Oyunlaştırma yapısı gerçekten mükemmel çalışıyor.', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sibel', tilt: 'md:rotate-[1.5deg]', accent: 'border-t-pink-300' }
                        ].map((review, idx) => (
                            <div
                                key={idx}
                                className={`reveal-scale bg-white p-8 rounded-[2.5rem] border-2 border-slate-200 border-b-[8px] border-b-slate-300 border-t-4 ${review.accent} ${review.tilt} flex flex-col justify-between hover:-translate-y-1 hover:rotate-0 hover:border-slate-300 hover:border-b-slate-400 transition-all duration-300`}
                                style={{ transitionDelay: `${idx * 120}ms` }}
                            >
                                <div>
                                    <Quote size={28} className="text-slate-200 mb-3 fill-slate-200" />
                                    <div className="flex gap-1 mb-4">
                                        {Array.from({ length: 5 }).map((_, s) => (
                                            <Star key={s} size={15} className="text-amber-400 fill-amber-400" />
                                        ))}
                                    </div>
                                    <p className="text-slate-600 font-bold leading-relaxed text-sm md:text-base mb-6 text-left">"{review.comment}"</p>
                                </div>
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

            {/* ============ 10. BIG CTA ============ */}
            <section className="reveal py-16 px-6 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="relative overflow-hidden bg-gradient-to-r from-[#0d3b2e] via-[#151c38] to-[#2e1040] rounded-[3rem] p-12 md:p-20 text-center border-2 border-slate-800 border-b-[10px] border-b-slate-950 shadow-2xl">
                        {/* Glow shapes + dark dot grid */}
                        <div className="absolute inset-0">
                            <div className="absolute inset-0 dot-grid-dark"></div>
                            <div className="absolute top-[-50%] left-[-20%] w-[40rem] h-[40rem] bg-green-500 rounded-full mix-blend-screen filter blur-[120px] opacity-30"></div>
                            <div className="absolute bottom-[-50%] right-[-20%] w-[40rem] h-[40rem] bg-purple-600 rounded-full mix-blend-screen filter blur-[120px] opacity-30"></div>
                        </div>

                        {/* Floating sprites */}
                        <img src={BrainSprite} alt="" className="absolute top-10 left-[8%] w-10 h-10 object-contain opacity-30 animate-float hidden md:block" />
                        <img src={TrophySprite} alt="" className="absolute top-16 right-[12%] w-12 h-12 object-contain opacity-30 animate-float hidden md:block" style={{ animationDelay: '1s' }} />
                        <img src={QuestionSprite} alt="" className="absolute bottom-16 left-[15%] w-9 h-9 object-contain opacity-25 animate-float hidden md:block" style={{ animationDelay: '1.8s' }} />

                        {/* Mascot */}
                        <img src={MufiMascot} alt="" className="absolute -bottom-4 -right-4 w-36 h-36 object-contain opacity-40 animate-wiggle" />

                        <div className="relative z-10 max-w-2xl mx-auto space-y-8">
                            <span className="inline-flex items-center gap-2 text-[11px] font-black text-emerald-300 uppercase tracking-widest bg-white/5 border-2 border-white/10 px-4 py-1.5 rounded-2xl backdrop-blur-sm">
                                <Sparkles size={13} /> Kredi kartı gerekmez
                            </span>
                            <h2 className="font-display text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
                                İlk AI Dersini <span className="text-[#23c55e]">Bugün</span> Oluştur
                            </h2>
                            <p className="text-slate-300 text-base md:text-lg font-bold leading-relaxed">
                                GoMufi'yi ücretsiz dene. Konuyu yaz, dersin birkaç dakikada sunuma hazır olsun.
                            </p>
                            <div className="flex flex-wrap justify-center gap-4">
                                <button
                                    onClick={() => navigate('/auth')}
                                    className="group px-10 py-5 border-2 border-b-[6px] border-green-700 bg-[#23c55e] hover:bg-[#1ea54c] active:translate-y-[3px] active:border-b-2 text-white rounded-[1.8rem] font-black text-lg transition-all shadow-lg shadow-green-900/40 cursor-pointer flex items-center gap-2.5"
                                >
                                    <Wand2 size={20} className="group-hover:rotate-12 transition-transform" />
                                    AI ile Ücretsiz Oluştur
                                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>

                        {/* Grass silhouette bottom */}
                        <div
                            className="absolute bottom-0 inset-x-0 h-[22px] bg-repeat-x opacity-20 pointer-events-none"
                            style={{ backgroundImage: `url(${GrassIcon})`, backgroundSize: 'auto 100%' }}
                        ></div>
                    </div>
                </div>
            </section>

            {/* ============ 11. FAQ ============ */}
            <section id="faq" className="py-24 px-6 bg-white">
                <div className="max-w-3xl mx-auto">
                    <div className="reveal text-center mb-16 space-y-4">
                        <span className="inline-block text-[11px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 border-2 border-indigo-100 px-4 py-1.5 rounded-2xl">Merak Edilenler</span>
                        <h2 className="font-display text-3xl md:text-4xl font-black text-slate-700 tracking-tight">Sıkça Sorulan Sorular</h2>
                        <p className="text-slate-500 font-bold">Cevabını bulamadığın bir soru mu var? Bize yaz, Mufi cevaplasın. 🐾</p>
                    </div>

                    <div className="space-y-4">
                        {faqs.map((faq, idx) => {
                            const isOpen = faqOpen === idx;
                            return (
                                <motion.div
                                    key={idx}
                                    layout
                                    className={`reveal border-2 border-b-[5px] rounded-[1.6rem] overflow-hidden transition-colors duration-300 ${
                                        isOpen ? 'border-green-300 border-b-green-400 bg-green-50/40' : 'border-slate-200 border-b-slate-300 bg-white hover:bg-slate-50 hover:border-slate-300 hover:border-b-slate-400'
                                    }`}
                                    style={{ transitionDelay: `${idx * 40}ms` }}
                                >
                                    <button
                                        className="w-full flex justify-between items-center gap-4 p-5 font-black text-left text-sm md:text-base text-slate-700 cursor-pointer"
                                        onClick={() => setFaqOpen(isOpen ? null : idx)}
                                    >
                                        <span className="flex items-center gap-3">
                                            <span className={`w-8 h-8 rounded-xl border-2 border-b-[3px] flex items-center justify-center text-xs shrink-0 transition-colors ${
                                                isOpen ? 'bg-[#23c55e] border-green-700 text-white' : 'bg-white border-slate-200 text-slate-400'
                                            }`}>
                                                {isOpen ? '−' : '?'}
                                            </span>
                                            {faq.q}
                                        </span>
                                        <ChevronDown className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-green-600" : "text-slate-400"}`} />
                                    </button>
                                    <AnimatePresence>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                transition={{ duration: 0.25, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="px-5 pb-5 pl-[4.25rem] text-slate-500 font-bold text-xs md:text-sm leading-relaxed text-left">
                                                    {faq.a}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ============ 12. FOOTER ============ */}
            <footer id="footer" className="bg-slate-900 text-slate-400 pt-0 text-sm relative overflow-hidden">
                {/* Seamless top wave transition from white FAQ section */}
                <div className="w-full overflow-hidden leading-none bg-white -mt-0.5">
                    <svg
                        viewBox="0 0 1440 72"
                        preserveAspectRatio="none"
                        className="relative block w-full h-10 md:h-16 text-slate-900"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M 0,32 Q 60,64 120,32 Q 180,0 240,32 Q 300,64 360,32 Q 420,0 480,32 Q 540,64 600,32 Q 660,0 720,32 Q 780,64 840,32 Q 900,0 960,32 Q 1020,64 1080,32 Q 1140,0 1200,32 Q 1260,64 1320,32 Q 1380,0 1440,32 L 1440,72 L 0,72 Z" />
                    </svg>
                </div>
                <div className="absolute inset-0 dot-grid-dark pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 py-16 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-14 text-left">
                        {/* Brand column */}
                        <div className="md:col-span-4 space-y-5">
                            <img src={LogoText} alt="GoMufi" className="h-12 object-contain brightness-0 invert opacity-90" />
                            <p className="font-bold text-xs leading-relaxed text-slate-400 max-w-xs">
                                Öğretmenlerin yapay zekâ ile dakikalar içinde oyunlaştırılmış canlı dersler oluşturmasını sağlayan yeni nesil eğitim platformu.
                            </p>
                            <div className="flex items-center gap-2.5">
                                <img src={MufiMascot} alt="" className="w-9 h-9 object-contain animate-bounce-slow" />
                                <span className="text-[11px] font-black text-slate-500">Mufi seni bekliyor! 🐾</span>
                            </div>
                        </div>

                        {/* Link columns */}
                        <div className="md:col-span-2 space-y-4">
                            <h3 className="font-display font-black text-white text-sm uppercase tracking-widest">Ürün</h3>
                            <ul className="space-y-2.5 font-bold text-xs">
                                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors cursor-pointer">Özellikler</button></li>
                                <li><button onClick={() => scrollToSection('sample-courses')} className="hover:text-white transition-colors cursor-pointer">Örnek Dersler</button></li>
                                <li><button onClick={() => scrollToSection('steps')} className="hover:text-white transition-colors cursor-pointer">Nasıl Çalışır?</button></li>
                            </ul>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <h3 className="font-display font-black text-white text-sm uppercase tracking-widest">Kaynaklar</h3>
                            <ul className="space-y-2.5 font-bold text-xs">
                                <li><a href="#" className="hover:text-white transition-colors">Dokümantasyon</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Yardım Merkezi</a></li>
                                <li><button onClick={() => scrollToSection('faq')} className="hover:text-white transition-colors cursor-pointer">SSS</button></li>
                            </ul>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <h3 className="font-display font-black text-white text-sm uppercase tracking-widest">İletişim</h3>
                            <ul className="space-y-2.5 font-bold text-xs">
                                <li><a href="#" className="hover:text-white transition-colors">Bize Ulaşın</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Destek Ekibi</a></li>
                            </ul>
                        </div>

                        <div className="md:col-span-2 space-y-4">
                            <h3 className="font-display font-black text-white text-sm uppercase tracking-widest">Yasal</h3>
                            <ul className="space-y-2.5 font-bold text-xs">
                                <li><a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a></li>
                                <li><a href="#" className="hover:text-white transition-colors">Kullanım Şartları</a></li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-bold text-slate-500">
                        <p>© 2026 GoMufi. Yapay zeka destekli oyunlaştırılmış eğitim.</p>
                        <button
                            onClick={() => navigate('/auth')}
                            className="px-5 py-2.5 rounded-xl border-2 border-b-4 border-green-700 bg-[#23c55e] text-white font-black text-xs hover:bg-[#1ea54c] active:translate-y-[2px] active:border-b-2 transition-all cursor-pointer"
                        >
                            Ücretsiz Başla →
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
