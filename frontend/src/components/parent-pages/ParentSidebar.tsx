import React from "react";
import {
  LayoutDashboard,
  LineChart,
  Users,
  GraduationCap,
  CreditCard,
  Settings,
  MessageSquare,
} from "lucide-react";
import Sidebar from "../Sidebar";
import { useUnreadMessages } from "../../messaging/useUnreadMessages";

interface ParentSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userData?: any;
}

const ParentSidebar: React.FC<ParentSidebarProps> = ({
  activePage,
  onNavigate,
  userData,
}) => {
  const unread = useUnreadMessages();
  const navItems = [
    {
      label: "Panel",
      icon: LayoutDashboard,
      id: "Dashboard",
    },
    {
      label: "Gelişim",
      icon: LineChart,
      id: "Progress",
    },
    {
      label: "Eğitmenler",
      icon: Users,
      id: "Instructors",
    },
    {
      label: "Öğrencilerim",
      icon: GraduationCap,
      id: "Students",
    },
    {
      label: "Mesajlar",
      icon: MessageSquare,
      id: "Messages",
      badgeCount: unread,
    },
    {
      label: "Ödemeler",
      icon: CreditCard,
      id: "Payments",
    },
    {
      label: "Profilim",
      icon: Settings,
      id: "Profile",
    },
  ];

  return (
    <Sidebar
      role="parent"
      activePage={activePage}
      onNavigate={onNavigate}
      items={navItems}
      userData={userData}
    />
  );
};

export default ParentSidebar;
