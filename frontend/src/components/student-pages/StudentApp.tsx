import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Home, Search, BookOpen, MessageSquare, ShoppingCart, User } from 'lucide-react';
import api from '../../api';
import HomePage from './HomePage';
import CoursesPage from './CoursesPage';
import ProfilePage from './ProfilePage';
import ContentPage from './ContentPage';
import AskQuestionPage from './AskQuestionPage';
import StudentPayment from './StudentPayment';
import CourseDetailPage from './CourseDetailPage';
import MufiSleep from '../../assets/sprites/MufiSleep.png';


// Import Types
import type { CourseData, PathNode } from '../../types';

// Import Assets for Course Data
import ButtonCyan from '../../assets/sprites/ButtonCyan.png';
import ButtonPurple from '../../assets/sprites/ButtonPurple.png';
import ButtonYellow from '../../assets/sprites/ButtonYellow.png';
import ButtonGreen from '../../assets/sprites/ButtonGreen.png';
import BrainIcon from '../../assets/sprites/Brain.png';
import PencilIcon from '../../assets/sprites/Pencil.png';
import PuzzleIcon from '../../assets/sprites/Puzzle.png';
import TrophyIcon from '../../assets/sprites/Trophy.png';

interface CartItem {
    id: number;
    title: string;
    price: string;
    icon: string;
    instructor: string;
}

// --- Helper to Generate Lesson Nodes ---
const generateLessonNodes = (startId: number, lessonNum: number, isLockedStart: boolean, lessonTopic: string, showStars: boolean, sectionId?: string): PathNode[] => {
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
            lessonTopic: lessonTopic,
            sectionId: sectionId,
            localNodeIndex: 1
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
            lessonTopic: lessonTopic,
            sectionId: sectionId,
            localNodeIndex: 2
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
            lessonTopic: lessonTopic,
            sectionId: sectionId,
            localNodeIndex: 3
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
            lessonTopic: lessonTopic,
            sectionId: sectionId,
            localNodeIndex: 4
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
            lessonTopic: lessonTopic,
            sectionId: sectionId,
            localNodeIndex: 5
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
            lessonTopic: lessonTopic,
            sectionId: sectionId,
            localNodeIndex: 6
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
            lessonTopic: lessonTopic,
            sectionId: sectionId,
            localNodeIndex: 7
        }
    ];
};

const generateCourseData = (purchasedList: any[], instructorsMap: Record<string, string>): Record<string, CourseData> => {
    const getProgress = (courseId: string) => {
        const saved = localStorage.getItem(`progress_${courseId}`);
        return saved ? parseInt(saved) : 0; // Default to 0
    };

    const result: Record<string, CourseData> = {};

    purchasedList.forEach(course => {
        const courseName = course.title;
        const titleLower = courseName.toLowerCase();
        const progress = getProgress(courseName);
        const instructorName = instructorsMap[courseName] || 'Mufi Eğitmen';

        // Check if curriculum exists and has sections
        const curriculum = course.curriculum || [];
        
        if (curriculum.length > 0) {
            const dynamicNodes: PathNode[] = [];
            let currentId = 1;

            // Filter out metadata objects like 'live_sessions_config'
            const actualSections = curriculum.filter((item: any) => item.type !== 'live_sessions_config');

            actualSections.forEach((section: any, index: number) => {
                const sectionTitle = section.title || `Bölüm ${index + 1}`;
                const sectionId = section.id || `section_${index + 1}`;
                const lessonNodes = generateLessonNodes(currentId, index + 1, false, sectionTitle, true, sectionId);
                
                const processedNodes = lessonNodes.map(node => ({
                    ...node,
                    isLocked: node.id > 1 && node.id > (progress + 1)
                }));
                
                dynamicNodes.push(...processedNodes);
                currentId += 7;
            });

            result[courseName] = {
                id: courseName,
                title: courseName.toUpperCase(),
                icon: titleLower.includes('python') ? '🐍' : (titleLower.includes('matematik') ? '📐' : '🚀'),
                themeColor: titleLower.includes('python') ? '#58cc02' : (titleLower.includes('matematik') ? '#3b82f6' : '#8b5cf6'),
                nodes: dynamicNodes,
                instructor: {
                    name: instructorName,
                    avatar: titleLower.includes('python') ? '👨‍🏫' : (titleLower.includes('matematik') ? '👩‍🏫' : '👤'),
                    status: 'Çevrimiçi',
                    isOnline: true
                },
                stats: { league: 'Bronz Lig', xp: '0 XP', streak: 0, gems: 100 },
                defaultHeader: { title: `${courseName} Yolculuğu`, subtitle: 'BÖLÜM 1, ÜNİTE 1' }
            };
        } else {
            // FALLBACK: If no curriculum, show at least one default section
            const fallbackTopics = ['Giriş'];
            const fallbackNodes: PathNode[] = [];
            let currentId = 1;

            fallbackTopics.forEach((topic, index) => {
                const lessonNodes = generateLessonNodes(currentId, index + 1, false, topic, true);
                const processedNodes = lessonNodes.map(node => ({
                    ...node,
                    isLocked: node.id > 1 && node.id > (progress + 1)
                }));
                fallbackNodes.push(...processedNodes);
                currentId += 7;
            });

            result[courseName] = {
                id: courseName,
                title: courseName.toUpperCase(),
                icon: '🚀',
                themeColor: '#8b5cf6',
                nodes: fallbackNodes,
                instructor: {
                    name: instructorName,
                    avatar: '👤',
                    status: 'Hazır',
                    isOnline: true
                },
                stats: { league: 'Bronz Lig', xp: '0 XP', streak: 0, gems: 100 },
                defaultHeader: { title: `${courseName} Yolculuğu`, subtitle: 'BÖLÜM 1, ÜNİTE 1' }
            };
        }
    });

    return result;
};

function StudentApp() {
    const navigate = useNavigate();
    const location = useLocation();

    const [activePage, setActivePage] = useState('Ana Sayfa');
    const [activeCourseId, setActiveCourseId] = useState<string>('');
    const [userData, setUserData] = useState<any>(null);
    const [isUserDataLoading, setIsUserDataLoading] = useState(true);

    const refreshUserData = async () => {
        try {
            const profileRes = await api.get("/profile");
            setUserData(profileRes.data);
        } catch (err) {
            console.error("Failed to refresh user data", err);
        }
    };
    const [selectedCourseForDetail, setSelectedCourseForDetail] = useState<number | null>(null);
    
    // Page to Path mapping
    const pageToPath: Record<string, string> = {
        'Ana Sayfa': '/student/home',
        'Kurslarım': '/student/my-courses',
        'Kurslar': '/student/catalog',
        'Soru Sor!': '/student/ask',
        'Profilim': '/student/profile',
        'PROFILIM': '/student/profile',
        'Sepetim': '/student/cart',
        'Ödeme': '/student/cart'
    };

    const pathToPage: Record<string, string> = {
        '/student/home': 'Ana Sayfa',
        '/student/my-courses': 'Kurslarım',
        '/student/catalog': 'Kurslar',
        '/student/ask': 'Soru Sor!',
        '/student/profile': 'Profilim',
        '/student/cart': 'Sepetim'
    };

    // Effect to sync URL -> State (Handle browser back/forward and initial load)
    useEffect(() => {
        const path = location.pathname;
        
        // Handle course detail specifically
        if (path.startsWith('/student/catalog/')) {
            const idMatch = path.match(/\/student\/catalog\/(\d+)/);
            if (idMatch) {
                setActivePage('Kurslar');
                setSelectedCourseForDetail(parseInt(idMatch[1]));
                return;
            }
        }

        const page = pathToPage[path];
        if (page) {
            setActivePage(page);
            setSelectedCourseForDetail(null);
        } else if (path === '/student' || path === '/student/') {
            // Default to home if at base /student
            setActivePage('Ana Sayfa');
            setSelectedCourseForDetail(null);
        }
    }, [location.pathname]);

    // Effect to sync State -> URL (Update URL when user clicks menu)
    useEffect(() => {
        let targetPath = pageToPath[activePage] || '/student/home';
        
        // Override if in course detail
        if (activePage === 'Kurslar' && selectedCourseForDetail) {
            targetPath = `/student/catalog/${selectedCourseForDetail}`;
        }

        if (location.pathname !== targetPath) {
            navigate(targetPath);
        }
    }, [activePage, selectedCourseForDetail]);

    // Reset course detail view when switching pages (already covered by sync, but keep as safety)
    useEffect(() => {
        if (activePage !== 'Kurslar') {
            setSelectedCourseForDetail(null);
        }
    }, [activePage]);

    // --- Purchased Courses State ---
    const [purchasedCourses, setPurchasedCourses] = useState<any[]>([]);
    const [purchasedCourseIds, setPurchasedCourseIds] = useState<number[]>([]);

    // --- Shopping Cart State ---
    const [cart, setCart] = useState<CartItem[]>([]);

    // --- Course Data State ---
    const [courses, setCourses] = useState<Record<string, CourseData>>({});

    // --- Instructors mapping (Title -> Instructor Name) ---
    const [instructorsMap, setInstructorsMap] = useState<Record<string, string>>({});

    // Fetch user data and purchased courses once on mount
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch both profile and content in PARALLEL to save time
                const [profileRes, contentRes] = await Promise.all([
                    api.get("/profile"),
                    api.get('/my-content')
                ]);

                // Handle Profile Data
                setUserData(profileRes.data);

                // Handle Course Content Data
                const titles = contentRes.data.map((c: any) => c.title);
                const newMap = { ...instructorsMap };
                contentRes.data.forEach((c: any) => {
                    if (c.teacher) {
                        newMap[c.title] = `${c.teacher.first_name} ${c.teacher.last_name}`;
                    }
                });
                
                setInstructorsMap(newMap);

                // Update purchased courses (Overwrite with full objects)
                setPurchasedCourses(contentRes.data);
                setPurchasedCourseIds(contentRes.data.map((c: any) => c.id));

                // Generate course data synchronously to batch with isUserDataLoading(false)
                const newCourseData = generateCourseData(contentRes.data, newMap);
                setCourses(newCourseData);
                const availableCourseKeys = Object.keys(newCourseData);
                if (availableCourseKeys.length > 0) {
                    setActiveCourseId(availableCourseKeys[0]);
                }
            } catch (err) {
                console.error("Failed to fetch user data or courses", err);
            } finally {
                setIsUserDataLoading(false);
            }
        };
        fetchData();
    }, []);

    // Sync roadmap state whenever purchasedCourses list changes
    useEffect(() => {
        const newCourseData = generateCourseData(purchasedCourses, instructorsMap);
        setCourses(newCourseData);
        
        // If current active course doesn't exist anymore or it's empty, pick the first one
        const availableCourseKeys = Object.keys(newCourseData);
        if (activeCourseId === '' && availableCourseKeys.length > 0) {
            setActiveCourseId(availableCourseKeys[0]);
        } else if (activeCourseId !== '' && !newCourseData[activeCourseId]) {
            if (availableCourseKeys.length > 0) {
                setActiveCourseId(availableCourseKeys[0]);
            } else {
                setActiveCourseId('');
            }
        }
    }, [purchasedCourses, instructorsMap]);

    const addToCart = (item: CartItem) => {
        if (!cart.find(i => i.id === item.id)) {
            const newCart = [...cart, item];
            setCart(newCart);
        }
    };

    const removeFromCart = (id: number) => {
        const newCart = cart.filter(item => item.id !== id);
        setCart(newCart);
    };

    const completePurchase = () => {
        // Construct mock objects for the newly purchased items from cart
        const newPurchasedFromCart = cart.map(item => ({
            id: item.id,
            title: item.title,
            curriculum: [{ title: 'Giriş', lectures: [] }] // Default curriculum for new purchase
        }));
        
        const newPurchased = [...purchasedCourses, ...newPurchasedFromCart];
        
        // Save instructors from cart
        const newMap = { ...instructorsMap };
        cart.forEach(item => {
            newMap[item.title] = item.instructor;
        });
        setInstructorsMap(newMap);

        // Remove duplicates just in case
        const uniquePurchased = Array.from(new Set(newPurchased));
        setPurchasedCourses(uniquePurchased);

        // CRITICAL: Update roadmap data state IMMEDIATELY for instant UI feedback
        const updatedCourseData = generateCourseData(newPurchased, newMap);
        setCourses(updatedCourseData);

        // Clear cart
        setCart([]);

        // Redirect to Home or Courses
        setActivePage('Ana Sayfa');
        
        // Update active course if currently empty
        if (activeCourseId === '' && newPurchased.length > 0) {
            const course = newPurchased[0];
            setActiveCourseId(course.title);
        }
    };

    const handleCourseChange = (id: string) => {
        setActiveCourseId(id);
    };

    const currentCourse = courses[activeCourseId];

    const navItems = [
        { id: 'Ana Sayfa', label: 'Ana Sayfa', icon: Home },
        { id: 'Kurslar', label: 'Kurslar', icon: Search },
        { id: 'Kurslarım', label: 'Kurslarım', icon: BookOpen },
        { id: 'Soru Sor!', label: 'Soru Sor!', icon: MessageSquare },
        { id: 'Sepetim', label: 'Sepetim', icon: ShoppingCart, badgeCount: cart.length },
        { id: 'Profilim', label: 'Profilim', icon: User },
    ];

    if (isUserDataLoading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center font-display">
                <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-black text-gray-800">Öğrenci Paneli Yükleniyor...</h2>
                <p className="text-gray-500 font-bold text-sm">Macera başlıyor, verileriniz hazırlanıyor 🚀</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-row h-screen bg-white font-sans text-gray-900 overflow-hidden">
                {activePage !== 'Builder' && (
                    <Sidebar
                        role="student"
                        activePage={activePage}
                        onNavigate={setActivePage}
                        items={navItems}
                        userData={userData}
                    />
                )}

                <div className="flex-1 flex flex-col relative w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {activePage === 'Ana Sayfa' ? (
                        <HomePage
                            currentCourse={currentCourse}
                            activeCourseId={activeCourseId}
                            courses={courses}
                            onCourseChange={handleCourseChange}
                            setCourses={setCourses}
                            userData={userData}
                            isUserDataLoading={isUserDataLoading}
                            refreshUserData={refreshUserData}
                        />
                    ) : activePage === 'Kurslar' ? (
                        selectedCourseForDetail ? (
                            <CourseDetailPage
                                courseId={selectedCourseForDetail}
                                onBack={() => {
                                    setSelectedCourseForDetail(null);
                                }}
                                isEnrolled={purchasedCourseIds.includes(selectedCourseForDetail)}
                                onEnroll={async (id) => {
                                    try {
                                        await api.post(`/enroll/${id}`);
                                        // Refresh my-content to update purchasedCourses
                                        const contentRes = await api.get('/my-content');
                                        setPurchasedCourses(contentRes.data);
                                        setPurchasedCourseIds(contentRes.data.map((c: any) => c.id));
                                        alert("Kursa başarıyla kayıt olundu!");
                                    } catch (err: any) {
                                        alert(err.response?.data?.detail || "Kayıt başarısız.");
                                    }
                                }}
                            />
                        ) : (
                            <CoursesPage 
                                addToCart={addToCart} 
                                cart={cart} 
                                onSelectCourse={(id) => setSelectedCourseForDetail(id)} 
                                purchasedCourseIds={purchasedCourseIds}
                                onGoToMyCourses={() => setActivePage('Kurslarım')}
                            />
                        )
                    ) : activePage === 'PROFILIM' || activePage === 'Profilim' ? (
                        <ProfilePage 
                            userData={userData} 
                            isLoading={isUserDataLoading} 
                            courses={courses} 
                            currentCourse={currentCourse} 
                        />
                    ) : activePage === 'Kurslarım' ? (
                        <ContentPage purchasedCourses={purchasedCourses} />
                    ) : activePage === 'Soru Sor!' ? (
                        <AskQuestionPage courses={courses} />
                    ) : activePage === 'Ödeme' || activePage === 'Sepetim' ? (
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
