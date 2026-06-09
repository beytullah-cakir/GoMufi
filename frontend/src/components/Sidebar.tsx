import React, { useState } from "react";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api";

// Import sprites
import MufiLogo from "../assets/sprites/MufiLogo.png";
import GoMufiLogo_Final from "../assets/sprites/GoMufiLogo_Final.png";
import FireIcon from "../assets/sprites/Fire.png";

export interface SidebarItem {
  label: string;
  id: string;
  icon: React.ElementType;
  badgeCount?: number;
}

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  isActive?: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  badgeCount?: number;
  themeColor: "sky" | "purple";
}

const NavItem: React.FC<NavItemProps> = ({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
  badgeCount,
  themeColor,
}) => {
  const activeClass =
    themeColor === "purple"
      ? "bg-purple-100 border-purple-400 border-b-purple-400 text-purple-500"
      : "bg-sky-100 border-sky-400 border-b-sky-400 text-sky-500";

  const iconColorClass = isActive
    ? themeColor === "purple"
      ? "text-purple-500"
      : "text-sky-500"
    : "text-gray-400 group-hover:text-gray-600";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-4 mb-2 rounded-2xl cursor-pointer transition-all duration-75 group relative border-2 border-b-4 select-none
      ${
        isActive
          ? `${activeClass} translate-y-0`
          : "bg-transparent border-transparent border-b-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200 hover:border-b-gray-200 active:border-b-transparent active:translate-y-[4px] active:border-b-[0px] active:duration-0"
      }
      ${isCollapsed ? "justify-center w-12 h-12 px-0 py-0 mx-auto" : "w-full px-5 py-3.5"}
      `}
      title={isCollapsed ? label : undefined}
    >
      <div
        className={`flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
          isCollapsed ? "" : "w-6 h-6"
        } ${isActive ? "scale-110" : "group-hover:scale-110"}`}
      >
        <Icon className={`w-5 h-5 ${iconColorClass}`} strokeWidth={isActive ? 3 : 2.5} />
      </div>

      {!isCollapsed && (
        <span className="font-black tracking-wider uppercase font-sans text-sm whitespace-nowrap">
          {label}
        </span>
      )}

      {/* Badge rendering */}
      {badgeCount !== undefined && badgeCount > 0 && (
        <>
          {!isCollapsed ? (
            <span className="ml-auto bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-sm shrink-0">
              {badgeCount}
            </span>
          ) : (
            <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-sm z-30 animate-[pulse_1.5s_infinite]">
              {badgeCount}
            </span>
          )}
        </>
      )}
    </button>
  );
};

interface SidebarProps {
  role: "student" | "instructor" | "parent";
  activePage: string;
  onNavigate: (id: string) => void;
  items: SidebarItem[];
  userData?: any;
}

const Sidebar: React.FC<SidebarProps> = ({
  role,
  activePage,
  onNavigate,
  items,
  userData,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const themeColor = role === "parent" ? "purple" : "sky";

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("gomufi_lesson_builder_draft");
      window.location.href = "/";
    }
  };

  const getLogoBorderColor = () => {
    switch (role) {
      case "student":
        return "border-yellow-300";
      case "instructor":
        return "border-sky-300";
      case "parent":
        return "border-purple-300";
      default:
        return "border-gray-300";
    }
  };

  const getBadgeText = () => {
    switch (role) {
      case "student":
        return "Öğrenci";
      case "instructor":
        return "Eğitmen";
      case "parent":
        return "Ebeveyn";
      default:
        return "";
    }
  };

  const getBadgeClass = () => {
    return themeColor === "purple"
      ? "text-purple-500 bg-purple-100"
      : "text-sky-500 bg-sky-100";
  };

  return (
    <div
      className={`relative h-screen bg-white border-r-2 border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-[100] shrink-0 box-border ${
        isCollapsed ? "w-24" : "w-64"
      }`}
      style={{ display: "flex", flexDirection: "column", height: "100vh" }}
    >
      {/* Logo Area */}
      <div
        className={`p-6 mb-2 flex items-center ${
          isCollapsed ? "justify-center" : "gap-3"
        } cursor-pointer hover:scale-105 transition-transform duration-300`}
        onClick={() => onNavigate(role === "student" ? "Ana Sayfa" : "Dashboard")}
      >
        <div
          className={`flex-shrink-0 bg-white rounded-2xl flex items-center justify-center border-b-4 shadow-sm transition-all duration-300 overflow-hidden ${getLogoBorderColor()}`}
          style={{
            width: isCollapsed ? "56px" : "72px",
            height: isCollapsed ? "56px" : "72px",
          }}
        >
          <img
            src={MufiLogo}
            alt="GoMufi Logo"
            className="w-full h-full object-contain scale-110"
          />
        </div>
        {!isCollapsed && (
          <div className="ml-1 flex flex-col justify-center">
            <img
              src={GoMufiLogo_Final}
              alt="GoMufi"
              className="h-16 object-contain -ml-2"
            />
            <span
              className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md self-start -mt-3 ${getBadgeClass()}`}
            >
              {getBadgeText()}
            </span>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <div className="flex-1 px-4 overflow-y-auto no-scrollbar mt-4">
        {items.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={activePage === item.id}
            isCollapsed={isCollapsed}
            onClick={() => onNavigate(item.id)}
            badgeCount={item.badgeCount}
            themeColor={themeColor}
          />
        ))}
      </div>

      {/* Bottom section with stats and logout */}
      <div className="mt-auto shrink-0 flex flex-col pt-4">
        {/* Stats card when role is student */}
        {role === "student" && (
          <div className="px-4 mb-4">
            <div
              className={`p-3 bg-gray-50 border-2 border-gray-100 rounded-2xl flex ${
                isCollapsed ? "flex-col items-center gap-3" : "items-center justify-around gap-1"
              } shrink-0`}
            >
              {/* Fire / Streak */}
              <div className="flex flex-col items-center gap-1 group cursor-pointer" title="Günlük Seri">
                <img
                  src={FireIcon}
                  alt="Streak"
                  className="w-6 h-6 group-hover:scale-110 transition-transform"
                />
                <span className="text-[11px] font-black text-orange-500 font-display">
                  {userData?.streak ?? 0}
                </span>
              </div>

              {/* Gems */}
              <div className="flex flex-col items-center gap-1 group cursor-pointer" title="Elmaslar">
                <span className="text-lg group-hover:scale-110 transition-transform block text-sky-400 leading-none">
                  💎
                </span>
                <span className="text-[11px] font-black text-sky-500 font-display">
                  {userData?.gems ?? 0}
                </span>
              </div>

              {/* Hearts */}
              <div className="flex flex-col items-center gap-1 group cursor-pointer" title="Canlar">
                <span className="text-lg group-hover:scale-110 transition-transform block text-red-500 leading-none">
                  ❤️
                </span>
                <span className="text-[11px] font-black text-red-500 font-display">
                  {userData?.hearts ?? 5}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* LOGOUT BUTTON */}
        <div className="px-4 pb-8">
          <button
            type="button"
            onClick={handleLogout}
            className={`w-full group relative flex cursor-pointer items-center rounded-2xl border-2 border-transparent bg-red-50 py-3 transition-all duration-75 hover:border-red-200 hover:border-b-[4px] hover:bg-red-100 active:translate-y-[4px] active:border-b-[0px]
            ${isCollapsed ? "justify-center w-12 h-12 px-0 mx-auto" : "px-4"}`}
            title={isCollapsed ? "Çıkış Yap" : undefined}
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center text-red-500">
              <LogOut size={22} strokeWidth={2.5} />
            </div>
            {!isCollapsed && (
              <span className="ml-4 font-sans text-sm font-black uppercase tracking-wider text-red-500">
                Çıkış Yap
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Collapse Toggle Button */}
      <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 z-[150]">
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="relative bg-gray-300 text-white w-10 h-16 rounded-xl border-b-4 border-gray-400 flex items-center justify-center shadow-sm hover:bg-gray-400 hover:border-gray-500 active:border-b-[2px] active:translate-y-[2px] active:duration-0 transition-all duration-75 cursor-pointer"
        >
          {/* Invisible larger hit area to make it easier to click */}
          <div className="absolute -inset-4 z-0" />
          {isCollapsed ? (
            <ChevronRight size={22} strokeWidth={4} className="pointer-events-none relative z-10" />
          ) : (
            <ChevronLeft size={22} strokeWidth={4} className="pointer-events-none relative z-10" />
          )}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
