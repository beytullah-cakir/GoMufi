import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  LogOut,
  PlusCircle,
  Sparkles,
  User,
} from "lucide-react";
import api from "../../api";

// Import sprites (reusing some for consistency, using Lucide for others where sprites might not exist)
import MufiLogo from "../../assets/sprites/MufiLogo.png";
import LogoText from "../../assets/sprites/GoMufiLogo_Final.png";
import { useNavigate } from "react-router-dom";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive,
  isCollapsed,
}) => {
  return (
    <div
      className={`flex items-center px-4 py-3 mb-2 rounded-2xl cursor-pointer transition-all duration-75 group relative select-none border-2
      ${
        isActive
          ? "bg-sky-100 border-sky-400 border-b-[4px] translate-y-[0px]"
          : "bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200 hover:border-b-[4px] active:translate-y-[4px] active:border-b-[0px] active:duration-0"
      }
      ${isCollapsed ? "justify-center" : ""}
      `}
    >
      <div
        className={`w-10 h-10 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
          isActive ? "scale-100" : "group-hover:animate-wiggle"
        }`}
        style={{ width: "32px", height: "32px" }}
      >
        {/* Using Lucide icons directly for instructor panel to differentiate style slightly or until sprites are ready */}
        <div
          className={`w-full h-full flex items-center justify-center ${
            isActive
              ? "text-sky-500"
              : "text-gray-400 group-hover:text-gray-600"
          }`}
        >
          {icon}
        </div>
      </div>

      {!isCollapsed && (
        <span
          className={`ml-4 text-sm font-black tracking-wider uppercase font-display transition-colors duration-200
          ${
            isActive
              ? "text-sky-500"
              : "text-gray-400 group-hover:text-gray-600"
          }
        `}
        >
          {label}
        </span>
      )}
    </div>
  );
};

interface InstructorSidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

const InstructorSidebar: React.FC<InstructorSidebarProps> = ({
  activePage,
  onNavigate,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const navItems = [
    {
      label: "Panel",
      icon: <LayoutDashboard size={24} strokeWidth={2.5} />,
      id: "Dashboard",
    },
    {
      label: "Kurslarım",
      icon: <BookOpen size={24} strokeWidth={2.5} />,
      id: "Courses",
    },
    {
      label: "Ders Oluşturucu",
      icon: <PlusCircle size={24} strokeWidth={2.5} />,
      id: "Builder",
    },
    {
      label: "YZ Soru Oluştur",
      icon: <Sparkles size={24} strokeWidth={2.5} />,
      id: "AIQuestions",
    },
    {
      label: "Profilim",
      icon: <User size={24} strokeWidth={2.5} />,
      id: "Profile",
    },
    {
      label: "Öğrenciler",
      icon: <Users size={24} strokeWidth={2.5} />,
      id: "Students",
    },
    {
      label: "İstatistikler",
      icon: <BarChart3 size={24} strokeWidth={2.5} />,
      id: "Analytics",
    },
    {
      label: "Ayarlar",
      icon: <Settings size={24} strokeWidth={2.5} />,
      id: "Settings",
    },
  ];

  const handleLogout = async () => {
  try {
    // 1. Backend'e çıkış isteği gönder
    await api.post("/auth/logout");
    
    // 2. Başarılıysa kullanıcıyı LandingPage veya Auth sayfasına yönlendir
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("gomufi_lesson_builder_draft");
    window.location.href = "/";
  } catch (error) {
    console.error("Logout failed", error);
    // Hata olsa bile kullanıcıyı ana sayfaya atmak iyi bir pratiktir
    window.location.href = "/";
  }
};

  return (
    <div
      className={`relative h-screen bg-white border-r-2 border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-20
      ${isCollapsed ? "w-24" : "w-64"}
      `}
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* Logo Area */}
      <div
        className={`p-6 mb-2 flex items-center ${
          isCollapsed ? "justify-center" : ""
        }`}
      >
        <div
          className="flex-shrink-0 bg-white rounded-2xl flex items-center justify-center border-b-4 border-sky-300 shadow-sm transition-all duration-300"
          style={{
            width: isCollapsed ? "56px" : "72px",
            height: isCollapsed ? "56px" : "72px",
          }}
        >
          <img
            src={MufiLogo}
            alt="GoMufi Logo"
            className="w-full h-full object-contain"
            style={{ maxWidth: "100%", maxHeight: "100%" }}
          />
        </div>
        {!isCollapsed && (
          <div className="ml-4 flex flex-col justify-center">
            <img
              src={LogoText}
              alt="GoMufi"
              className="h-20 object-contain -ml-2"
            />
            <span className="text-xs font-black text-sky-500 uppercase tracking-widest bg-sky-100 px-2 py-1 rounded-md self-start -mt-4">
              Eğitmen
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 px-4 overflow-y-auto">
        {navItems.map((item) => (
          <div key={item.id} onClick={() => onNavigate(item.id)}>
            <NavItem
              icon={item.icon}
              label={item.label}
              isActive={activePage === item.id}
              isCollapsed={isCollapsed}
            />
          </div>
        ))}
      </div>

      {/* Logout Button */}
      <div className="px-4 pb-8">
        <div
          onClick={handleLogout}
          className={`group relative flex cursor-pointer items-center rounded-2xl border-2 border-transparent bg-red-50 px-4 py-3 transition-all duration-75 hover:border-red-200 hover:border-b-[4px] hover:bg-red-100 active:translate-y-[4px] active:border-b-[0px]
                    ${isCollapsed ? "justify-center" : ""}`}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-red-500">
            <LogOut size={24} strokeWidth={2.5} />
          </div>
          {!isCollapsed && (
            <span className="ml-4 font-sans text-sm font-black uppercase tracking-wider text-red-500">
              Çıkış Yap
            </span>
          )}
        </div>
      </div>

      {/* Collapse Button */}
      <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 z-30">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="bg-gray-300 text-white w-8 h-14 rounded-xl border-b-4 border-gray-400 flex items-center justify-center shadow-sm hover:bg-gray-400 hover:border-gray-500 active:border-b-[2px] active:translate-y-[2px] active:duration-0 transition-all duration-75"
        >
          {isCollapsed ? (
            <ChevronRight size={20} strokeWidth={4} />
          ) : (
            <ChevronLeft size={20} strokeWidth={4} />
          )}
        </button>
      </div>
    </div>
  );
};

export default InstructorSidebar;
