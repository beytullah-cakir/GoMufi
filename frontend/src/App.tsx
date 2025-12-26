import { useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import CoursesPage from './components/CoursesPage';
import ProfilePage from './components/ProfilePage';
import ContentPage from './components/ContentPage';
import MufiSleep from './assets/sprites/MufiSleep.png';

// Import Types
import type { CourseData, PathNode } from './types';

// Import Assets for Course Data
import ChestIcon from './assets/sprites/Chest.png';
import HouseIcon from './assets/sprites/House.png';
import ButtonCyan from './assets/sprites/ButtonCyan.png';
import ButtonRed from './assets/sprites/ButtonRed.png';
import ButtonPurple from './assets/sprites/ButtonPurple.png';
import ButtonYellow from './assets/sprites/ButtonYellow.png';
import ButtonGreen from './assets/sprites/ButtonGreen.png';
import BrainIcon from './assets/sprites/Brain.png';
import PencilIcon from './assets/sprites/Pencil.png';
import PuzzleIcon from './assets/sprites/Puzzle.png';
import TrophyIcon from './assets/sprites/Trophy.png';

function App() {
  const [activePage, setActivePage] = useState('Ana Sayfa');
  const [activeCourseId, setActiveCourseId] = useState<string>('Python');

  // --- Helper to Generate Lesson Nodes ---
  const generateLessonNodes = (startId: number, lessonNum: number, isLockedStart: boolean, lessonTopic: string): PathNode[] => {
    const baseId = startId;
    const isLessonLocked = isLockedStart;

    return [
      {
        id: baseId,
        type: 'start', // Start of lesson
        button: ButtonPurple, // ANLA (Purple/Pink Base)
        icon: BrainIcon,
        curve: 'down',
        iconSize: 'w-20 h-20',
        iconOffset: '-mt-16',
        // Pink/Purple Scheme for ANLA
        ringColor: 'border-fuchsia-400 bg-white',
        numberGradient: 'bg-gradient-to-b from-fuchsia-100 to-fuchsia-400',
        pastelColor: '#fae8ff', // fuchsia-100
        glowColor: 'rgba(232, 121, 249, 0.4)',
        strokeColor: '#c026d3', // fuchsia-600
        baseColor: '#d946ef', // fuchsia-500
        title: 'ANLA: Konuyu Kavra',
        stars: isLessonLocked ? 0 : 3,
        isLocked: isLessonLocked,
        lessonNumber: lessonNum,
        lessonTopic: lessonTopic
      },
      {
        id: baseId + 1,
        type: 'paw', // Step 2
        button: ButtonCyan, // UYGULA (Cyan Base)
        icon: PencilIcon,
        curve: 'up',
        iconSize: 'w-16 h-16',
        iconOffset: '-mt-12',
        // Cyan Scheme for UYGULA
        ringColor: 'border-cyan-400 bg-white',
        numberGradient: 'bg-gradient-to-b from-cyan-100 to-cyan-400',
        pastelColor: '#cffafe', // cyan-100
        glowColor: 'rgba(34, 211, 238, 0.4)',
        strokeColor: '#0891b2', // cyan-600
        baseColor: '#06b6d4', // cyan-500
        title: 'UYGULA: Alıştırma Yap',
        stars: isLessonLocked ? 0 : 2,
        isLocked: isLessonLocked,
        lessonNumber: lessonNum,
        lessonTopic: lessonTopic
      },
      {
        id: baseId + 2,
        type: 'paw', // Step 3
        button: ButtonGreen, // BİRLEŞTİR (Green Base)
        icon: PuzzleIcon,
        curve: 'down',
        iconSize: 'w-18 h-18',
        iconOffset: '-mt-14',
        // Green Scheme for BİRLEŞTİR
        ringColor: 'border-green-400 bg-white',
        numberGradient: 'bg-gradient-to-b from-green-100 to-green-400',
        pastelColor: '#dcfce7', // green-100
        glowColor: 'rgba(74, 222, 128, 0.4)',
        strokeColor: '#16a34a', // green-600
        baseColor: '#22c55e', // green-500
        title: 'BİRLEŞTİR: Parçaları Tamamla',
        stars: isLessonLocked ? 0 : 1,
        isLocked: isLessonLocked,
        lessonNumber: lessonNum,
        lessonTopic: lessonTopic
      },
      {
        id: baseId + 3,
        type: 'chest', // End of lesson (Reward)
        button: ButtonYellow, // ÜRET (Yellow Base)
        icon: TrophyIcon,
        curve: 'up',
        iconSize: 'w-20 h-20',
        iconOffset: '-mt-16',
        // Yellow Scheme for ÜRET
        ringColor: 'border-yellow-400 bg-white',
        numberGradient: 'bg-gradient-to-b from-yellow-100 to-yellow-400',
        pastelColor: '#fef9c3', // yellow-100
        glowColor: 'rgba(250, 204, 21, 0.4)',
        strokeColor: '#ca8a04', // yellow-600
        baseColor: '#eab308', // yellow-500
        title: 'ÜRET: Kendini Göster',
        stars: isLessonLocked ? 0 : 0, // Usually reward node
        isLocked: isLessonLocked,
        lessonNumber: lessonNum,
        lessonTopic: lessonTopic
      }
    ];
  };

  // Initial Course Data
  const [courses, setCourses] = useState<Record<string, CourseData>>(() => {
    // Construct Python Course with generated nodes
    // 5 Lessons = 20 nodes
    const topics = ['Değişkenler', 'Veri Tipleri', 'Koşullar', 'Döngüler', 'Fonksiyonlar'];
    const pythonNodes: PathNode[] = [];
    let currentId = 1;

    topics.forEach((topic, index) => {
      const isLocked = index > 2; // Lock from 4th lesson onwards for demo
      const lessonNodes = generateLessonNodes(currentId, index + 1, isLocked, topic);
      pythonNodes.push(...lessonNodes);
      currentId += 4;
    });

    const mathNodes: PathNode[] = [];
    // Just generate one Math lesson for now
    mathNodes.push(...generateLessonNodes(1, 1, false, 'Temel Aritmetik'));

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
        stats: {
          league: 'Bronz Lig',
          xp: '120 XP',
          streak: 8,
          gems: 500
        },
        defaultHeader: {
          title: 'İngilizce temellerini at',
          subtitle: 'BÖLÜM 1, ÜNİTE 1'
        }
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
        stats: {
          league: 'Gümüş Lig',
          xp: '2400 XP',
          streak: 12,
          gems: 1200
        },
        defaultHeader: {
          title: 'Sayılarla Dans Et',
          subtitle: 'BÖLÜM 1, TEMEL ARİTMETİK'
        }
      }
    };
  });

  const handleCourseChange = (id: string) => {
    setActiveCourseId(id);
  };

  const currentCourse = courses[activeCourseId];

  return (
    <>
      <div className="flex flex-col h-screen bg-white font-sans text-gray-900 overflow-hidden">
        <Navbar
          activePage={activePage}
          onNavigate={setActivePage}
          currentCourse={currentCourse}
          activeCourseId={activeCourseId}
          courses={courses}
          onCourseChange={handleCourseChange}
        />

        <div className="flex-1 overflow-hidden relative w-full">
          {activePage === 'Ana Sayfa' ? (
            <HomePage
              currentCourse={currentCourse}
              activeCourseId={activeCourseId}
              courses={courses}
              onCourseChange={handleCourseChange}
              setCourses={setCourses}
            />
          ) : activePage === 'Kurslar' ? (
            <CoursesPage />
          ) : activePage === 'PROFILIM' || activePage === 'Profilim' ? (
            <ProfilePage />
          ) : activePage === 'İÇERİK' || activePage === 'İçerik' ? (
            <ContentPage />
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
        <div className="fixed bottom-0 right-0 z-[99999] pointer-events-none origin-bottom-right m-0 p-0">
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

export default App;
