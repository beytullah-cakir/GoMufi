import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  GraduationCap,
  ClipboardCheck,
  User,
  Users,
  MessageCircle,
  BarChart3,
  Microscope,
  UserCheck,
  Megaphone,
} from "lucide-react";
import Sidebar from "../Sidebar";
import { useUnreadMessages } from "../../messaging/useUnreadMessages";

interface InstructorSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userData?: any;
}

const InstructorSidebar: React.FC<InstructorSidebarProps> = ({
  activePage,
  onNavigate,
  userData,
}) => {
  const isAdmin = userData?.role === "admin" || localStorage.getItem("role") === "admin";
  const unread = useUnreadMessages();

  // Kurs merkezli: öğretmen önce kursunu açar; sınıf içi işler ve takip aynı
  // kursla açılır (seçilen kurs sayfalar arasında hatırlanır, bkz. activeCourse.ts).
  const navItems = [
    { label: "Panel", icon: LayoutDashboard, id: "Dashboard" },
    { label: "Kurslarım", icon: BookOpen, id: "Courses" },
    { label: "Takvim", icon: Calendar, id: "Calendar" },
    { label: "Yoklama", icon: UserCheck, id: "Attendance", section: "Sınıfta" },
    { label: "Duyurular", icon: Megaphone, id: "Announcements", section: "Sınıfta" },
    { label: "Şubeler", icon: Users, id: "Classes", section: "Sınıfta" },
    { label: "Öğrenciler", icon: GraduationCap, id: "Students", section: "Sınıfta" },
    { label: "Öğrenme Analizi", icon: Microscope, id: "Learning", section: "Takip" },
    { label: "Ödev Gönderileri", icon: ClipboardCheck, id: "HomeworkSubmissions", section: "Takip" },
    { label: "Mesajlar", icon: MessageCircle, id: "Messages", badgeCount: unread, section: "Hesap" },
    { label: "Profilim", icon: User, id: "Profile", section: "Hesap" },
    ...(isAdmin ? [{ label: "Metrikler", icon: BarChart3, id: "Metrics", section: "Hesap" }] : []),
  ];

  return (
    <Sidebar
      role="instructor"
      activePage={activePage}
      onNavigate={onNavigate}
      items={navItems}
      userData={userData}
    />
  );
};

export default InstructorSidebar;
