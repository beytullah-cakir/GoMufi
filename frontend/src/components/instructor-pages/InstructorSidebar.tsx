import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  PlusCircle,
  Sparkles,
  User,
  Users,
  MessageCircle,
  BarChart3,
} from "lucide-react";
import Sidebar from "../Sidebar";

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
  const navItems = [
    {
      label: "Panel",
      icon: LayoutDashboard,
      id: "Dashboard",
    },
    {
      label: "Kurslarım",
      icon: BookOpen,
      id: "Courses",
    },
    {
      label: "Ders Oluşturucu",
      icon: PlusCircle,
      id: "Builder",
    },
    {
      label: "YZ Soru Oluştur",
      icon: Sparkles,
      id: "AIQuestions",
    },
    {
      label: "Profilim",
      icon: User,
      id: "Profile",
    },
    {
      label: "Öğrenciler",
      icon: Users,
      id: "Students",
    },
    {
      label: "Mesajlar",
      icon: MessageCircle,
      id: "Messages",
    },
    {
      label: "İstatistikler",
      icon: BarChart3,
      id: "Analytics",
    },
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
