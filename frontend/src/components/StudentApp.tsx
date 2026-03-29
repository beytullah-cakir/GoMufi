import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import api from '../api';
import HomePage from './HomePage';
import CoursesPage from './CoursesPage';
import ProfilePage from './ProfilePage';
import ContentPage from './ContentPage';
import AskQuestionPage from './AskQuestionPage';
import StudentPayment from './students-pages/StudentPayment';
import MufiSleep from '../assets/sprites/MufiSleep.png';


// Import Types
import type { CourseData, PathNode } from '../types';

// Import Assets for Course Data
import ButtonCyan from '../assets/sprites/ButtonCyan.png';
import ButtonPurple from '../assets/sprites/ButtonPurple.png';
import ButtonYellow from '../assets/sprites/ButtonYellow.png';
import ButtonGreen from '../assets/sprites/ButtonGreen.png';
import BrainIcon from '../assets/sprites/Brain.png';
import PencilIcon from '../assets/sprites/Pencil.png';
import PuzzleIcon from '../assets/sprites/Puzzle.png';
import TrophyIcon from '../assets/sprites/Trophy.png';

interface CartItem {
    id: number;
    title: string;
    price: string;
    icon: string;
    instructor: string;
}

function StudentApp() {
    const [activePage, setActivePage] = useState('Ana Sayfa');
    const [activeCourseId, setActiveCourseId] = useState<string>('Python');
    const [userData, setUserData] = useState<any>(null);
    const [isUserDataLoading, setIsUserDataLoading] = useState(true);

    // Fetch user data once on mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.get("/profile");
                setUserData(response.data);
            } catch (err) {
                console.error("Failed to fetch user data", err);
            } finally {
                setIsUserDataLoading(false);
            }
        };
        fetchUserData();
    }, []);

    // --- One-time Reset (Test İçin Geçici) ---
    useEffect(() => {
        localStorage.removeItem('progress_Python');
        localStorage.removeItem('progress_Matematik');
        localStorage.removeItem('gomufi_purchased_courses');
        localStorage.removeItem('gomufi_cart');
        console.log('Tüm veriler sıfırlandı.');
    }, []);

    // --- Purchased Courses State ---
    const [purchasedCourses, setPurchasedCourses] = useState<string[]>(() => {
        const saved = localStorage.getItem('gomufi_purchased_courses');
        return saved ? JSON.parse(saved) : []; // No courses purchased by default
    });

    // --- Shopping Cart State ---
    const [cart, setCart] = useState<CartItem[]>(() => {
        const savedCart = localStorage.getItem('gomufi_cart');
        return savedCart ? JSON.parse(savedCart) : [];
    });

    const addToCart = (item: CartItem) => {
        if (!cart.find(i => i.id === item.id)) {
            const newCart = [...cart, item];
            setCart(newCart);
            localStorage.setItem('gomufi_cart', JSON.stringify(newCart));
        }
    };

    const removeFromCart = (id: number) => {
        const newCart = cart.filter(item => item.id !== id);
        setCart(newCart);
        localStorage.setItem('gomufi_cart', JSON.stringify(newCart));
    };

    const completePurchase = () => {
        const newPurchased = [...purchasedCourses, ...cart.map(item => item.title)];
        // Remove duplicates just in case
        const uniquePurchased = Array.from(new Set(newPurchased));
        setPurchasedCourses(uniquePurchased);
        localStorage.setItem('gomufi_purchased_courses', JSON.stringify(uniquePurchased));

        // Clear cart
        setCart([]);
        localStorage.removeItem('gomufi_cart');

        // Refresh courses state to unlock new purchases
        refreshCourses(uniquePurchased);

        // Redirect to Home or Courses
        setActivePage('Ana Sayfa');
    };

    // --- Helper to Generate Lesson Nodes ---
    const generateLessonNodes = (startId: number, lessonNum: number, isLockedStart: boolean, lessonTopic: string, showStars: boolean): PathNode[] => {
        const baseId = startId;
        const isLessonLocked = isLockedStart;

        return [
            {
                id: baseId,
                type: 'step', // Number Node 1 -> Brain
                button: ButtonPurple,
                icon: BrainIcon,
                curve: 'up',
                iconSize: 'w-20 h-20', // Slightly smaller than main
                iconOffset: '-mt-22',
                ringColor: 'border-fuchsia-400 bg-white',
                numberGradient: 'bg-gradient-to-b from-fuchsia-100 to-fuchsia-400',
                pastelColor: '#fae8ff',
                glowColor: 'rgba(232, 121, 249, 0.4)',
                strokeColor: '#c026d3',
                baseColor: '#d946ef',
                title: 'BÖLÜM 1',
                stars: showStars ? 0 : undefined,
                isLocked: isLessonLocked,
                lessonNumber: lessonNum,
                lessonTopic: lessonTopic
            },
            {
                id: baseId + 1,
                type: 'start', // BRAIN
                button: ButtonPurple,
                icon: BrainIcon,
                curve: 'down',
                iconSize: 'w-24 h-24',
                iconOffset: '-mt-24',
                ringColor: 'border-fuchsia-400 bg-white',
                numberGradient: 'bg-gradient-to-b from-fuchsia-100 to-fuchsia-400',
                pastelColor: '#fae8ff',
                glowColor: 'rgba(232, 121, 249, 0.4)',
                strokeColor: '#c026d3',
                baseColor: '#d946ef',
                title: 'ANLA: Konuyu Kavra',
                stars: showStars ? 0 : undefined,
                isLocked: isLessonLocked,
                lessonNumber: lessonNum,
                lessonTopic: lessonTopic
            },
            {
                id: baseId + 2,
                type: 'step', // Number Node 2 -> Pencil
                button: ButtonCyan,
                icon: PencilIcon,
                curve: 'up',
                iconSize: 'w-24 h-24', // Slightly smaller
                iconOffset: '-mt-20',
                ringColor: 'border-cyan-400 bg-white',
                numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400',
                pastelColor: '#cffafe',
                glowColor: 'rgba(34, 211, 238, 0.4)',
                strokeColor: '#0891b2',
                baseColor: '#06b6d4',
                title: 'BÖLÜM 2',
                stars: showStars ? 0 : undefined,
                isLocked: isLessonLocked,
                lessonNumber: lessonNum,
                lessonTopic: lessonTopic
            },
            {
                id: baseId + 3,
                type: 'paw', // PENCIL
                button: ButtonCyan,
                icon: PencilIcon,
                curve: 'down',
                iconSize: 'w-28 h-28',
                iconOffset: '-mt-20',
                ringColor: 'border-cyan-400 bg-white',
                numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400',
                pastelColor: '#cffafe',
                glowColor: 'rgba(34, 211, 238, 0.4)',
                strokeColor: '#0891b2',
                baseColor: '#06b6d4',
                title: 'UYGULA: Alıştırma Yap',
                stars: showStars ? 0 : undefined,
                isLocked: isLessonLocked,
                lessonNumber: lessonNum,
                lessonTopic: lessonTopic
            },
            {
                id: baseId + 4,
                type: 'step', // Number Node 3 -> Puzzle
                button: ButtonGreen,
                icon: PuzzleIcon,
                curve: 'up',
                iconSize: 'w-20 h-20',
                iconOffset: '-mt-20',
                ringColor: 'border-green-400 bg-white',
                numberGradient: 'bg-gradient-to-b from-green-100 to-green-400',
                pastelColor: '#dcfce7',
                glowColor: 'rgba(74, 222, 128, 0.4)',
                strokeColor: '#16a34a',
                baseColor: '#22c55e',
                title: 'BÖLÜM 3',
                stars: showStars ? 0 : undefined,
                isLocked: isLessonLocked,
                lessonNumber: lessonNum,
                lessonTopic: lessonTopic
            },
            {
                id: baseId + 5,
                type: 'paw', // PUZZLE
                button: ButtonGreen,
                icon: PuzzleIcon,
                curve: 'down',
                iconSize: 'w-22 h-22',
                iconOffset: '-mt-22',
                ringColor: 'border-green-400 bg-white',
                numberGradient: 'bg-gradient-to-b from-green-100 to-green-400',
                pastelColor: '#dcfce7',
                glowColor: 'rgba(74, 222, 128, 0.4)',
                strokeColor: '#16a34a',
                baseColor: '#22c55e',
                title: 'BİRLEŞTİR: Parçaları Tamamla',
                stars: showStars ? 0 : undefined,
                isLocked: isLessonLocked,
                lessonNumber: lessonNum,
                lessonTopic: lessonTopic
            },
            {
                id: baseId + 6,
                type: 'chest', // TROPHY
                button: ButtonYellow,
                icon: TrophyIcon,
                curve: 'up',
                iconSize: 'w-24 h-24',
                iconOffset: '-mt-24',
                // Yellow Scheme
                ringColor: 'border-yellow-400 bg-white',
                numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400',
                pastelColor: '#fef9c3',
                glowColor: 'rgba(250, 204, 21, 0.4)',
                strokeColor: '#ca8a04',
                baseColor: '#eab308',
                title: 'ÜRET: Kendini Göster',
                stars: showStars ? 0 : undefined,
                isLocked: isLessonLocked,
                lastInLesson: true,
                lessonNumber: lessonNum,
                lessonTopic: lessonTopic
            }
        ];
    };

    const generateCourseData = (purchasedList: string[]): Record<string, CourseData> => {
        // Load progress from localStorage per course
        const getProgress = (courseId: string) => {
            const saved = localStorage.getItem(`progress_${courseId}`);
            return saved ? parseInt(saved) : 0; // Default to 0
        };

        // --- Python Course Generation ---
        const pythonTopics = ['Değişkenler', 'Veri Tipleri', 'Koşullar', 'Döngüler', 'Fonksiyonlar'];
        const pythonNodes: PathNode[] = [];
        let currentPythonId = 1;
        const pythonProgress = getProgress('Python');
        const isPythonPurchased = purchasedList.some(t => t.toLowerCase().includes('python'));

        pythonTopics.forEach((topic, index) => {
            const lessonNodes = generateLessonNodes(currentPythonId, index + 1, false, topic, true);
            const processedNodes = lessonNodes.map(node => ({
                ...node,
                // RULE: If NOT purchased, everything is locked.
                // If purchased, Node 1 is ALWAYS OPEN, others open if id <= progress + 1
                isLocked: !isPythonPurchased || (node.id > 1 && node.id > (pythonProgress + 1))
            }));
            pythonNodes.push(...processedNodes);
            currentPythonId += 7;
        });

        // --- Math Course Generation ---
        const isMathPurchased = purchasedList.some(t => t.toLowerCase().includes('matematik'));
        const mathProgress = getProgress('Matematik');
        const mathNodes: PathNode[] = generateLessonNodes(1, 1, false, 'Temel Aritmetik', true).map(node => ({
            ...node,
            isLocked: !isMathPurchased || (node.id > 1 && node.id > (mathProgress + 1))
        }));

        return {
            'Python': {
                id: 'Python',
                title: 'PYTHON',
                icon: '🐍',
                themeColor: '#58cc02',
                nodes: pythonNodes,
                instructor: {
                    name: 'Mufi Hoca',
                    avatar: '👨‍🏫',
                    status: 'Çevrimiçi',
                    isOnline: true
                },
                stats: { league: 'Bronz Lig', xp: '120 XP', streak: 8, gems: 500 },
                defaultHeader: { title: 'Python temellerini at', subtitle: 'BÖLÜM 1, ÜNİTE 1' }
            },
            'Matematik': {
                id: 'Matematik',
                title: 'MATEMATİK',
                icon: '📐',
                themeColor: '#3b82f6',
                nodes: mathNodes,
                instructor: {
                    name: 'Mufi Bilgin',
                    avatar: '👩‍🏫',
                    status: 'Meşgul',
                    isOnline: false
                },
                stats: { league: 'Gümüş Lig', xp: '2400 XP', streak: 12, gems: 1200 },
                defaultHeader: { title: 'Sayılarla Dans Et', subtitle: 'BÖLÜM 1, ÜNİTE 1' }
            }
        };
    };

    const [courses, setCourses] = useState<Record<string, CourseData>>(() => generateCourseData(purchasedCourses));

    const refreshCourses = (purchasedList: string[]) => {
        setCourses(generateCourseData(purchasedList));
    };

    const handleCourseChange = (id: string) => {
        setActiveCourseId(id);
    };

    const currentCourse = courses[activeCourseId];

    return (
        <>
            <div className="flex flex-col h-screen bg-white font-sans text-gray-900 overflow-hidden">
                {activePage !== 'Builder' && (
                    <Navbar
                        activePage={activePage}
                        onNavigate={setActivePage}
                        currentCourse={currentCourse}
                        activeCourseId={activeCourseId}
                        courses={courses}
                        onCourseChange={handleCourseChange}
                        cart={cart}
                        removeFromCart={removeFromCart}
                    />
                )}

                <div className="flex-1 overflow-y-auto relative w-full">
                    {activePage === 'Ana Sayfa' ? (
                        <HomePage
                            currentCourse={currentCourse}
                            activeCourseId={activeCourseId}
                            courses={courses}
                            onCourseChange={handleCourseChange}
                            setCourses={setCourses}
                        />
                    ) : activePage === 'Kurslar' ? (
                        <CoursesPage addToCart={addToCart} cart={cart} />
                    ) : activePage === 'PROFILIM' || activePage === 'Profilim' ? (
                        <ProfilePage userData={userData} isLoading={isUserDataLoading} />
                    ) : activePage === 'Kurslarım' ? (
                        <ContentPage />
                    ) : activePage === 'Soru Sor!' ? (
                        <AskQuestionPage />
                    ) : activePage === 'Ödeme' ? (
                        <StudentPayment
                            cart={cart}
                            removeFromCart={removeFromCart}
                            onBack={() => setActivePage('Kurslar')}
                            onPurchaseComplete={completePurchase}
                        />
                    ) : (
                        <div className="p-8">
                            <h1 className="text-3xl font-bold text-gray-800">{activePage}</h1>
                            <p className="mt-4 text-gray-600">This page is under construction.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Sleeping User Widget (Global Fixed - Outside App Layout) */}
            {activePage === 'Ana Sayfa' && (
                <div className="fixed bottom-0 right-0 z-[90] pointer-events-none origin-bottom-right m-0 p-0">
                    <div className="relative">
                        <div className="absolute top-2 right-12 z-20 flex flex-col items-center">
                            <span className="text-3xl font-black text-sky-400 animate-zzz font-display leading-none">Z</span>
                            <span className="text-2xl font-black text-sky-400/80 animate-zzz font-display absolute -top-4 -right-4 leading-none" style={{ animationDelay: '1s' }}>z</span>
                            <span className="text-xl font-black text-sky-400/60 animate-zzz font-display absolute -top-8 -right-6 leading-none" style={{ animationDelay: '2s' }}>z</span>
                        </div>
                        <img src={MufiSleep} alt="Sleeping Mufi" className="w-56 animate-breathe drop-shadow-2xl relative z-10 block" />
                    </div>
                </div>
            )}
        </>
    );
}

export default StudentApp;
