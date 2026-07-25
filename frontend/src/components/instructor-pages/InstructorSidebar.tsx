import React from "react";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  PlusCircle,
  Sparkles,
  User,
  Users,
  MessageCircle,
  BarChart3,
  Bug,
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
  const isAdmin = userData?.role === "admin" || localStorage.getItem("role") === "admin";

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
      label: "Takvim",
      icon: Calendar,
      id: "Calendar",
    },
    {
      label: "Sınıflarım",
      icon: Users,
      id: "Classes",
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
      label: "Ödev Gönderileri",
      icon: BookOpen,
      id: "HomeworkSubmissions",
    },
    ...(isAdmin
      ? [
          {
            label: "Metrikler",
            icon: BarChart3,
            id: "Metrics",
          },
          {
            label: "Debug",
            icon: Bug,
            id: "Debug",
          },
        ]
      : []),
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
