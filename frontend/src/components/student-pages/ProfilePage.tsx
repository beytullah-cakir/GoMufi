import React, { useState } from "react";
import api from "../../api";
import AccountPrivacyCard from '../shared/AccountPrivacyCard';
import Leaderboard from "./Leaderboard";
import { Trophy, BookOpen, Cloud, Star, Code, Zap, Heart, Music, Circle, Triangle, Hexagon, Sparkles, CheckCircle, Flame, KeyRound, Medal } from 'lucide-react';
import { Card, CardTitle, ChunkyButton, DOTS_STYLE, IconTile, Mufi, MufiEmpty } from './ui';
// Import the new character avatar
import CharacterBody from "../../assets/sprites/CharacterProfile2.png";
import CharacterEyes from "../../assets/sprites/eyes.png";
import CourseIcon from '../shared/CourseIcon';
import { LeagueIcon } from '../shared/LeagueBadge';
import { useActivity } from './DailyQuests';
import { BadgeGrid, useBadges } from './rewards';
import { restartTour } from './OnboardingTour';

interface ProfilePageProps {
  userData?: any;
  isLoading?: boolean;
  courses?: Record<string, any>;
  currentCourse?: any;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ 
  userData: propUserData, 
  isLoading: propIsLoading,
  courses,
}) => {
  const [copied, setCopied] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const [profileData, setProfileData] = useState<any>(null);
  const badges = useBadges(propUserData?.xp);
  // Rozet kutlamasındaki "Rozetlerim" bağlantısı buraya iner.
  React.useEffect(() => {
    if (badges && window.location.hash === '#rozetler') {
      document.getElementById('rozetler')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [badges]);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state with props
  React.useEffect(() => {
    if (propUserData) {
      setProfileData(propUserData);
      setIsLoading(false);
    } else if (propIsLoading !== undefined) {
      setIsLoading(propIsLoading);
    }
  }, [propUserData, propIsLoading]);

  // If no props provided (fallback for existing logic), fetch locally
  React.useEffect(() => {
    if (!propUserData && propIsLoading === undefined) {
      const fetchProfile = async () => {
        try {
          const response = await api.get("/profile");
          setProfileData(response.data);
        } catch (err) {
          console.error("Profile fetch error:", err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    }
  }, [propUserData, propIsLoading]);

  const activity = useActivity(profileData?.xp ?? 0);
  const progression = profileData?.progression;
  const courseRows = Object.values(courses || {}).map((c: any) => {
    const completed = c.progress?.completed || {};
    const nodes: any[] = c.nodes || [];
    const next = nodes.find((n) => !n.isLocked && !(n.sectionId && completed[String(n.sectionId)]));
    return {
      id: c.id, title: c.title, icon: c.icon, color: c.themeColor,
      done: Object.keys(completed).length,
      total: c.progress?.order?.length ?? nodes.length,
      next: next?.title as string | undefined,
    };
  });
  const modulesDone = courseRows.reduce((sum, c) => sum + c.done, 0);

  // Blinking effect logic
  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        // Random interval between 2 and 5 seconds for the next blink
        timeoutId = setTimeout(triggerBlink, Math.random() * 3000 + 2000);
      }, 150);
    };

    timeoutId = setTimeout(triggerBlink, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  // Looking around effect logic
  React.useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const moveEyes = () => {
      // Randomly decide to move or center
      const shouldMove = Math.random() > 0.3; // 70% chance to look somewhere

      if (shouldMove) {
        // Limit movement range (pixels)
        // x: -3 to 3 (left/right) - Reduced
        // y: 0 (no vertical movement)
        const x = (Math.random() - 0.5) * 6;
        const y = 0;
        setEyePosition({ x, y });
      } else {
        // Return to center
        setEyePosition({ x: 0, y: 0 });
      }

      // Next movement in 1 to 4 seconds
      timeoutId = setTimeout(moveEyes, Math.random() * 3000 + 1000);
    };

    timeoutId = setTimeout(moveEyes, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="w-full h-full overflow-y-auto bg-gray-50 pb-24">
      {/* HEROLIK HEADER - Custom Color requested #d2cfff */}
      <div className="relative w-full h-[300px] md:h-[400px] bg-[#d2cfff] rounded-b-[40px] shadow-sm overflow-hidden mb-16">
        {/* Background Decorations (Pattern) - Increased Visibility & Quantity */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Clouds */}
          <Cloud
            className="absolute top-12 left-12 text-white/30 transform -rotate-12"
            size={80}
          />
          <Cloud
            className="absolute top-32 right-[-20px] text-white/20 transform rotate-6"
            size={120}
          />
          <Cloud
            className="absolute bottom-20 left-[-40px] text-white/10"
            size={100}
          />

          {/* Shapes */}
          <Star
            className="absolute top-24 left-1/3 text-white/40 animate-pulse"
            size={32}
          />
          <Code
            className="absolute top-10 right-1/3 text-white/25 transform -rotate-45"
            size={48}
          />
          <Zap
            className="absolute bottom-48 right-12 text-yellow-100/40"
            size={56}
          />
          <Heart
            className="absolute top-40 left-10 text-pink-100/30 transform -rotate-12"
            size={40}
          />
          <Music
            className="absolute bottom-32 right-1/4 text-white/20 transform rotate-12"
            size={44}
          />
          <Sparkles
            className="absolute top-20 right-10 text-white/50 animate-pulse"
            size={28}
          />

          {/* Geometric Shapes */}
          <Circle
            className="absolute top-1/2 left-20 text-white/10"
            size={24}
          />
          <Triangle
            className="absolute top-1/4 right-32 text-white/20 transform rotate-45"
            size={36}
          />
          <Hexagon
            className="absolute bottom-40 left-1/3 text-white/15"
            size={64}
          />

          {/* Dots */}
          <div className="absolute top-1/2 left-32 w-3 h-3 bg-white/40 rounded-full"></div>
          <div className="absolute top-1/3 right-1/4 w-5 h-5 bg-white/30 rounded-full"></div>
          <div className="absolute bottom-24 right-1/3 w-2 h-2 bg-white/60 rounded-full"></div>
        </div>

        {/* Character Avatar - STATIC & PINNED */}
        <div className="absolute bottom-[-10px] left-1/2 transform -translate-x-1/2 flex flex-col items-center z-10 w-full">
          <div className="relative">
            {/* Status Bubble */}
            <div className="absolute -top-4 -right-8 bg-white border-2 border-gray-100 px-4 py-2 rounded-2xl rounded-bl-none shadow-lg transform rotate-12 z-20 animate-bounce">
              <span className="text-xl font-black text-gray-800">
                Selam{profileData?.first_name ? `, ${profileData.first_name}` : ""}!
              </span>
            </div>

            {/* Avatar Image */}
            {/* Avatar Image - Layered for Animation */}
            <div className="w-64 h-64 md:w-96 md:h-96 filter drop-shadow-xl cursor-default relative">
              {/* Base Body Layer */}
              <img
                src={CharacterBody}
                alt="My Character Body"
                className="absolute inset-0 w-full h-full object-contain z-10"
              />
              {/* Eyes Layer - Animated */}
              <img
                src={CharacterEyes}
                alt="My Character Eyes"
                className="absolute inset-0 w-full h-full object-contain z-20 transition-transform duration-200 ease-in-out"
                style={{
                  transformOrigin: "50% 48%",
                  transform: `translate(${eyePosition.x}px, ${eyePosition.y}px) scaleY(${isBlinking ? 0.1 : 1})`,
                }}
              />
            </div>

          </div>

          {/* User Info Nameplate REMOVED - Moved to main content */}
        </div>
      </div>

      {/* Ana içerik: yalnızca gerçek veri (profil, /progress/activity, kurs ilerlemesi) */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 relative z-10 -mt-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <h1 className={`text-3xl md:text-4xl font-black font-display tracking-tight ${isLoading ? "bg-gray-200 animate-pulse text-transparent rounded" : "text-gray-900"}`}>
              {profileData?.first_name || "Öğrenci"} {profileData?.last_name || ""}
            </h1>
            <p className="flex flex-wrap justify-center md:justify-start items-center gap-2 font-bold text-sm text-gray-500 mt-1">
              {profileData?.nickname && <span className="text-blue-500">@{profileData.nickname}</span>}
              {profileData?.grade_level && <span>{profileData.grade_level}</span>}
            </p>
          </div>

          <div className="w-full md:w-72">
            <div className="flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-2 font-black text-gray-800">
                <span className="bg-amber-400 text-amber-950 border-b-4 border-amber-600 w-9 h-9 rounded-xl flex items-center justify-center text-sm">{progression?.level ?? 1}</span>
                Seviye {progression?.level ?? 1}
              </span>
              <span className="flex items-center gap-1 text-sm font-black" style={{ color: progression?.league?.color }}>
                <LeagueIcon icon={progression?.league?.icon} color={progression?.league?.color} size={16} /> {progression?.league?.name ?? "Bronz"} Lig
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 rounded-full" style={{ width: `${Math.max(3, Math.min(100, progression?.progress_pct ?? 0))}%` }} />
            </div>
            <p className="text-xs font-bold text-gray-400 mt-1">Sonraki seviyeye {progression?.xp_to_next_level ?? 0} XP</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { icon: Flame, tone: "orange", value: activity?.streak ?? profileData?.streak ?? 0, label: "Günlük seri" },
            { icon: Trophy, tone: "amber", value: activity?.longest ?? 0, label: "En uzun seri" },
            { icon: Zap, tone: "violet", value: (profileData?.xp ?? 0).toLocaleString("tr-TR"), label: "Toplam XP" },
            { icon: CheckCircle, tone: "green", value: modulesDone, label: "Bitirdiğin modül" },
          ] as const).map((s) => (
            <Card key={s.label} as="div" className="p-4 flex items-center gap-3">
              <IconTile icon={s.icon} tone={s.tone} size="lg" />
              <div className="min-w-0">
                <p className="text-2xl md:text-3xl font-black text-slate-800 font-display leading-none">{s.value}</p>
                <p className="text-xs font-bold text-slate-400 mt-1">{s.label}</p>
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-5 md:p-6">
              <CardTitle icon={BookOpen} tone="green">Kurslarımdaki ilerlemem</CardTitle>
              {courseRows.length === 0 ? (
                <MufiEmpty compact pose="peek" title="Henüz bir kursa katılmadın" text="Öğretmeninin verdiği kodla Sınıflarım sayfasından katılabilirsin." />
              ) : (
                <ul className="space-y-4">
                  {courseRows.map((c) => (
                    <li key={c.id} className="flex items-center gap-3">
                      <span className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                        <CourseIcon name={c.icon} size={24} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-black text-slate-800 truncate">{c.title}</span>
                          <span className="text-xs font-black text-slate-500 shrink-0">{c.done}/{c.total} modül</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mt-1.5">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${c.total ? Math.max(c.done ? 4 : 0, (c.done / c.total) * 100) : 0}%` }} />
                        </div>
                        {c.next && <p className="text-xs font-bold text-slate-400 mt-1 truncate">Sıradaki: {c.next}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5 md:p-6" id="rozetler">
              <CardTitle icon={Medal} tone="amber"
                hint={badges ? `${badges.filter((b) => b.earned).length}/${badges.length} rozet kazandın` : undefined}>
                Rozetlerim
              </CardTitle>
              {badges === null ? (
                <div className="h-32 rounded-2xl bg-slate-50 animate-pulse" />
              ) : badges.length === 0 ? (
                <MufiEmpty compact pose="peek" title="Rozetler yüklenemedi" />
              ) : (
                <BadgeGrid badges={badges} />
              )}
            </Card>

            <Leaderboard />
          </div>

          <div className="space-y-6">
            {profileData?.student_code && (
              <section className="relative bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-3xl p-5 text-white border-b-8 border-violet-700/50 overflow-hidden">
                <div className="absolute inset-0 pointer-events-none" style={DOTS_STYLE} />
                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-wider text-violet-100 flex items-center gap-1.5"><KeyRound size={14} /> Veli bağlantı kodu</p>
                  <p className="text-2xl font-black font-mono my-1 break-all">{profileData.student_code}</p>
                  <p className="text-xs font-bold text-violet-100 mb-3">Velin bu kodla hesabını seninkine bağlar; ilerlemeni görür.</p>
                  <ChunkyButton variant="ghost" size="sm"
                    onClick={() => { void navigator.clipboard?.writeText(profileData.student_code); setCopied(true); }}>
                    {copied ? "Kopyalandı ✓" : "Kodu kopyala"}
                  </ChunkyButton>
                </div>
              </section>
            )}
            <Card className="p-5">
              <div className="flex items-center gap-3">
                <Mufi pose="wave" className="w-16 shrink-0" />
                <div>
                  <p className="font-black text-slate-800">Seviye {progression?.level ?? 1}</p>
                  <p className="text-sm font-bold text-slate-500">Sonraki seviyeye {progression?.xp_to_next_level ?? 0} XP kaldı. Her modül seni yaklaştırır!</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-10 space-y-4">
        <Card as="div" className="p-4 flex items-center gap-3">
          <Mufi pose="peek" className="w-12 shrink-0" />
          <p className="flex-1 text-sm font-bold text-slate-500">Ana sayfanın nasıl çalıştığını unuttun mu? Mufi tekrar gezdirsin.</p>
          <ChunkyButton variant="white" size="sm" onClick={() => { restartTour(profileData?.user_id); window.location.href = '/student/home'; }}>
            Turu tekrar izle
          </ChunkyButton>
        </Card>
        <AccountPrivacyCard />
      </div>
    </div>
  );
};

export default ProfilePage;
