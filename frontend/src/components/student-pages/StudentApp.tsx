import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Home, BookOpen, MessageSquare, User, Users } from 'lucide-react';
import api from '../../api';
import HomePage from './HomePage';
import ProfilePage from './ProfilePage';
import ContentPage from './ContentPage';
import AskQuestionPage from './AskQuestionPage';
import StudentClassesPage from './StudentClassesPage';
import { useUnreadMessages } from '../../messaging/useUnreadMessages';
import { applyProgress, fetchProgress, type CourseProgress } from '../../progress';


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
import ButtonDarkBlue from '../../assets/sprites/ButtonDarkBlue.png';
import ButtonDarkPurple from '../../assets/sprites/ButtonDarkPurple.png';
import QuestionIcon from '../../assets/sprites/Question.png';
import BagIcon from '../../assets/sprites/Bag.png';

// --- Helper to Generate Lesson Nodes ---
// --- Helper to get theme metadata ---
const getNodeMetadata = (idx: number, customTheme?: string) => {
    const themes: { [key: string]: any } = {
        purple: { button: ButtonPurple, icon: BrainIcon, ringColor: "border-fuchsia-400 bg-white", baseColor: "#d946ef", strokeColor: "#c026d3", pastelColor: "#fae8ff", glowColor: "rgba(232, 121, 249, 0.4)", iconSize: "w-20 h-20", iconOffset: "-mt-22" },
        cyan: { button: ButtonCyan, icon: PencilIcon, ringColor: "border-cyan-400 bg-white", baseColor: "#06b6d4", strokeColor: "#0891b2", pastelColor: "#cffafe", glowColor: "rgba(34, 211, 238, 0.4)", iconSize: "w-24 h-24", iconOffset: "-mt-20" },
        green: { button: ButtonGreen, icon: PuzzleIcon, ringColor: "border-green-400 bg-white", baseColor: "#22c55e", strokeColor: "#16a34a", pastelColor: "#dcfce7", glowColor: "rgba(74, 222, 128, 0.4)", iconSize: "w-20 h-20", iconOffset: "-mt-20" },
        yellow: { button: ButtonYellow, icon: TrophyIcon, ringColor: "border-yellow-400 bg-white", baseColor: "#eab308", strokeColor: "#ca8a04", pastelColor: "#fef9c3", glowColor: "rgba(250, 204, 21, 0.4)", iconSize: "w-24 h-24", iconOffset: "-mt-20" },
        quiz: { button: ButtonDarkPurple, icon: QuestionIcon, ringColor: "border-purple-400 bg-white", baseColor: "#7c3aed", strokeColor: "#6d28d9", pastelColor: "#ede9fe", glowColor: "rgba(139, 92, 246, 0.4)", iconSize: "w-26 h-26", iconOffset: "-mt-24" },
        homework: { button: ButtonDarkBlue, icon: BagIcon, ringColor: "border-indigo-400 bg-white", baseColor: "#2563eb", strokeColor: "#1d4ed8", pastelColor: "#e0e7ff", glowColor: "rgba(99, 102, 241, 0.4)", iconSize: "w-26 h-26", iconOffset: "-mt-24" },
    };

    if (customTheme && themes[customTheme]) {
        return themes[customTheme];
    }
    const pattern = ["purple", "cyan", "green", "yellow"];
    const defaultTheme = pattern[idx % pattern.length];
    return themes[defaultTheme];
};

// Tema → roadmap modül aşaması (öğretmen roadmap builder'ındaki aynı eşleme: purple=ANLA, cyan=UYGULA, green=BİRLEŞTİR, yellow=ÜRET)
const THEME_STAGE: Record<string, string> = {
    purple: 'ANLA', cyan: 'UYGULA', green: 'BİRLEŞTİR', yellow: 'ÜRET', quiz: 'QUIZ', homework: 'ÖDEV'
};
const resolveThemeKey = (idx: number, customTheme?: string) => {
    if (customTheme && THEME_STAGE[customTheme]) return customTheme;
    const pattern = ["purple", "cyan", "green", "yellow"];
    return pattern[idx % pattern.length];
};

// --- Helper to Generate Lesson Nodes ---
const generateLessonNodes = (
    startId: number,
    isLockedStart: boolean,
    title: string,
    showStars: boolean,
    sectionId?: string,
    theme?: string,
    slides: any[] = [],
    lessonTopic?: string,
    lessonNumber?: number,
    xp?: number
): PathNode[] => {
    const metadata = getNodeMetadata(startId - 1, theme);
    const stage = THEME_STAGE[resolveThemeKey(startId - 1, theme)];

    return [
        {
            id: startId,
            type: theme === 'quiz' ? 'quiz' : (theme === 'homework' ? 'homework' : 'step'),
            button: metadata.button,
            icon: metadata.icon,
            curve: (startId - 1) % 2 === 0 ? 'up' : 'down',
            iconSize: metadata.iconSize,
            iconOffset: metadata.iconOffset,
            ringColor: metadata.ringColor,
            numberGradient: 'bg-gradient-to-b from-fuchsia-100 to-fuchsia-400',
            pastelColor: metadata.pastelColor,
            glowColor: metadata.glowColor,
            strokeColor: metadata.strokeColor,
            baseColor: metadata.baseColor,
            title: title,
            stars: showStars ? 0 : undefined,
            isLocked: isLockedStart,
            lessonNumber: lessonNumber,
            lessonTopic: lessonTopic,
            sectionId: sectionId,
            localNodeIndex: startId,
            slides: slides,
            stage: stage,
            xp: xp ?? 500
        }
    ];
};

const generateCourseData = (
    enrolledList: any[],
    instructorsMap: Record<string, string>,
    progressMap: Record<string, CourseProgress | null>,
): Record<string, CourseData> => {
    const result: Record<string, CourseData> = {};

    enrolledList.forEach(course => {
        const courseName = course.title;
        const courseIdStr = course.id.toString();
        const titleLower = courseName.toLowerCase();
        const progress = progressMap[courseIdStr];
        const instructorName = instructorsMap[courseName] || 'Mufi Eğitmen';

        // Check if curriculum exists and has sections
        const curriculum = course.curriculum || [];
        
        if (curriculum.length > 0) {
            const dynamicNodes: PathNode[] = [];

            // Filter out metadata objects like 'live_sessions_config'
            const actualSections = curriculum.filter((item: any) => item.type !== 'live_sessions_config');

            actualSections.forEach((section: any, index: number) => {
                const sectionTitle = section.title || `Ders ${index + 1}`;
                const sectionId = section.id || `section_${index + 1}`;
                const matchingNote = course.notes?.find((n: any) => String(n.id) === String(section.id));
                const slides = matchingNote?.slides || [];

                const lessonNodes = generateLessonNodes(
                    index + 1,
                    false,
                    sectionTitle,
                    true,
                    sectionId,
                    section.theme,
                    slides,
                    section.lessonTopic,
                    section.lessonNumber,
                    section.xp
                );
                
                dynamicNodes.push(...lessonNodes);
            });

            result[courseIdStr] = {
                id: courseIdStr,
                title: courseName,
                icon: titleLower.includes('python') ? 'python' : (titleLower.includes('matematik') ? 'math' : 'rocket'),
                themeColor: titleLower.includes('python') ? '#58cc02' : (titleLower.includes('matematik') ? '#3b82f6' : '#8b5cf6'),
                nodes: applyProgress(dynamicNodes, progress),
                progress,
                instructor: {
                    name: instructorName,
                    avatar: '',
                    status: 'Öğretmenin',
                    isOnline: false
                },
                stats: { league: 'Bronz Lig', xp: '0 XP', streak: 0 },
                defaultHeader: { title: `${courseName} Yolculuğu`, subtitle: 'BÖLÜM 1, ÜNİTE 1' },
                classes: course.classes || []
            };
        } else {
            // FALLBACK: If no curriculum, show at least one default section
            const fallbackTopics = ['Giriş'];
            const fallbackNodes: PathNode[] = [];

            fallbackTopics.forEach((topic, index) => {
                const lessonNodes = generateLessonNodes(
                    index + 1,
                    false,
                    "ANLA",
                    true,
                    undefined,
                    undefined,
                    [],
                    topic,
                    1
                );
                fallbackNodes.push(...lessonNodes);
            });

            result[courseIdStr] = {
                id: courseIdStr,
                title: courseName,
                icon: 'rocket',
                themeColor: '#8b5cf6',
                nodes: applyProgress(fallbackNodes, progress),
                progress,
                instructor: {
                    name: instructorName,
                    avatar: '',
                    status: 'Öğretmenin',
                    isOnline: false
                },
                stats: { league: 'Bronz Lig', xp: '0 XP', streak: 0 },
                defaultHeader: { title: `${courseName} Yolculuğu`, subtitle: 'BÖLÜM 1, ÜNİTE 1' },
                classes: course.classes || []
            };
        }
    });

    return result;
};



function StudentApp() {
    const navigate = useNavigate();
    const location = useLocation();

    // "Soru Sor!" rozeti: öğretmenden gelen okunmamış cevaplar.
    const unreadMessages = useUnreadMessages();
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

    // Sayfa ↔ adres. Etkin sayfa ADRESTEN türetilir: eskiden ayrı bir durumda
    // tutulup iki effect ile eşitleniyordu; doğrudan açılan ya da yenilenen
    // /student/my-courses gibi adresler bu yüzden hep ana sayfaya düşüyordu.
    const pageToPath: Record<string, string> = {
        'Ana Sayfa': '/student/home',
        'Kurslarım': '/student/my-courses',
        'Soru Sor!': '/student/ask',
        'Profilim': '/student/profile',
        'PROFILIM': '/student/profile',
        'Sınıflarım': '/student/my-classes',
    };
    const pathToPage: Record<string, string> = {
        '/student/home': 'Ana Sayfa',
        '/student/my-courses': 'Kurslarım',
        '/student/ask': 'Soru Sor!',
        '/student/profile': 'Profilim',
        '/student/my-classes': 'Sınıflarım',
    };
    // /student ya da artık olmayan eski adresler (katalog, sepet) ana sayfa sayılır
    const activePage = pathToPage[location.pathname.replace(/\/+$/, '')] || 'Ana Sayfa';
    const setActivePage = (page: string) => {
        const target = pageToPath[page] || '/student/home';
        if (location.pathname !== target) navigate(target);
    };

    // --- Kayıtlı kurslar (öğrenci kursa öğretmenin verdiği katılım koduyla girer) ---
    const [enrolledCourses, setEnrolledCourses] = useState<any[]>([]);

    // --- Course Data State ---
    const [courses, setCourses] = useState<Record<string, CourseData>>({});

    // --- Sunucudaki modül ilerlemesi (kurs kimliği → ilerleme) ---
    const [progressMap, setProgressMap] = useState<Record<string, CourseProgress | null>>({});
    const handleProgress = (courseId: string | number, progress: CourseProgress | null) => {
        if (progress) setProgressMap((prev) => ({ ...prev, [String(courseId)]: progress }));
    };
    const refreshProgress = async (courseId: string | number) => {
        handleProgress(courseId, await fetchProgress(courseId));
    };

    // --- Instructors mapping (Title -> Instructor Name) ---
    const [instructorsMap, setInstructorsMap] = useState<Record<string, string>>({});

    // --- Live session joined state ---
    const [isLiveSessionJoined, setIsLiveSessionJoined] = useState<boolean>(false);

    // Fetch user data and enrolled courses once on mount
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

                setEnrolledCourses(contentRes.data);

                const progresses = await Promise.all(contentRes.data.map((c: any) => fetchProgress(c.id)));
                const newProgress: Record<string, CourseProgress | null> = {};
                contentRes.data.forEach((c: any, i: number) => { newProgress[String(c.id)] = progresses[i]; });
                setProgressMap(newProgress);

                // Generate course data synchronously to batch with isUserDataLoading(false)
                const newCourseData = generateCourseData(contentRes.data, newMap, newProgress);
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

    // Sync roadmap state whenever the enrolled course list changes
    useEffect(() => {
        const newCourseData = generateCourseData(enrolledCourses, instructorsMap, progressMap);
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
    }, [enrolledCourses, instructorsMap, progressMap]);

    const handleCourseChange = (id: string) => {
        setActiveCourseId(id);
    };

    const currentCourse = courses[activeCourseId];

    const navItems = [
        { id: 'Ana Sayfa', label: 'Ana Sayfa', icon: Home },
        { id: 'Kurslarım', label: 'Kurslarım', icon: BookOpen },
        { id: 'Soru Sor!', label: 'Soru Sor!', icon: MessageSquare, badgeCount: unreadMessages },
        { id: 'Sınıflarım', label: 'Sınıflarım', icon: Users },
        { id: 'Profilim', label: 'Profilim', icon: User },
    ];

    if (isUserDataLoading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center font-display">
                <div className="w-16 h-16 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-black text-gray-800">Öğrenci Paneli Yükleniyor...</h2>
                <p className="text-gray-500 font-bold text-sm">Macera başlıyor, verileriniz hazırlanıyor…</p>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col md:flex-row h-[100dvh] bg-white font-sans text-gray-900 overflow-hidden">
                {activePage !== 'Builder' && !isLiveSessionJoined && (
                    <Sidebar
                        role="student"
                        activePage={activePage}
                        onNavigate={setActivePage}
                        items={navItems}
                        userData={userData}
                    />
                )}

                <div className="flex-1 min-h-0 flex flex-col relative w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
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
                            isLiveSessionJoined={isLiveSessionJoined}
                            setIsLiveSessionJoined={setIsLiveSessionJoined}
                            onProgress={handleProgress}
                            refreshProgress={refreshProgress}
                            unreadMessages={unreadMessages}
                        />
                    ) : activePage === 'PROFILIM' || activePage === 'Profilim' ? (
                        <ProfilePage 
                            userData={userData} 
                            isLoading={isUserDataLoading} 
                            courses={courses} 
                            currentCourse={currentCourse} 
                        />
                    ) : activePage === 'Kurslarım' ? (
                        <ContentPage 
                            enrolledCourses={enrolledCourses}
                            onOpenJoinModal={() => navigate('/student/my-classes#katil')}
                            userData={userData}
                            onJoinLiveClass={(courseId) => {
                                handleCourseChange(courseId);
                                setActivePage('Ana Sayfa');
                                setIsLiveSessionJoined(true);
                            }}
                        />
                    ) : activePage === 'Soru Sor!' ? (
                        <AskQuestionPage courses={courses} />
                    ) : activePage === 'Sınıflarım' ? (
                        <StudentClassesPage
                            courses={courses}
                            onClassJoined={() => {
                                refreshUserData();
                                window.location.href = '/student/my-classes';
                            }}
                        />
                    ) : (
                        <div className="p-8">
                            <h1 className="text-3xl font-bold text-gray-800">{activePage}</h1>
                            <p className="mt-4 text-gray-600">This page is under construction.</p>
                        </div>
                    )}
                </div>
            </div>

        </>
    );
}

export default StudentApp;
