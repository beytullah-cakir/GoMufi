import React, { useState } from "react";

// Import sprites
import MufiLogo from "../assets/sprites/MufiLogo.png";
import LogoText from "../assets/sprites/LogoText.png";
import HomeIcon from "../assets/sprites/HomeIcon.png";
import ShopIcon from "../assets/sprites/ShopIcon.png";
import ProfileIcon from "../assets/sprites/ProfileIcon.png";
import BooksIcon from "../assets/sprites/BooksIcon.png";
import ChatIcon from "../assets/sprites/ChatIcon.png";

import FireIcon from "../assets/sprites/Fire.png";
import type { CourseData } from "../types";

interface NavItemProps {
  icon: string;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all duration-75 group relative border-2 border-b-4 shrink-0
      ${
        isActive
          ? "bg-sky-100 border-sky-400 border-b-sky-400 translate-y-0 text-sky-500"
          : "bg-transparent border-transparent border-b-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200 hover:border-b-gray-200 active:border-b-transparent active:translate-y-[4px] active:duration-0"
      }
      `}
    >
      <img
        src={icon}
        alt={label}
        className={`w-5.5 h-5.5 object-contain transition-transform duration-300 ${isActive ? "scale-100" : "grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:animate-wiggle"}`}
      />
      <span className="font-black tracking-wider uppercase font-sans text-[10px] whitespace-nowrap">
        {label}
      </span>
    </button>
  );
};

interface NavbarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  currentCourse: CourseData;
  activeCourseId: string;
  courses: Record<string, CourseData>;
  onCourseChange: (id: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  currentCourse,
}) => {
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const navItems = [
    { label: "Ana Sayfa", icon: HomeIcon },
    { label: "Kurslar", icon: ShopIcon },
    { label: "Profilim", icon: ProfileIcon },
    { label: "Kurslarım", icon: BooksIcon },
    { label: "Soru Sor!", icon: ChatIcon },
  ];

  return (
    <div className="w-full bg-white border-b-2 border-gray-200 px-5 py-1 flex items-center justify-between z-50 shadow-sm relative shrink-0 h-16 box-border">
      {/* LEFT SECTION: Logo */}
      <div
        className="flex items-center gap-2.5 cursor-pointer hover:scale-105 transition-transform shrink-0"
        onClick={() => onNavigate("Ana Sayfa")}
      >
        <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center border-b-[3px] border-yellow-300 shadow-sm overflow-hidden relative">
          <img
            src={MufiLogo}
            alt="GoMufi"
            className="w-full h-full object-cover scale-110"
          />
        </div>
        <img
          src={LogoText}
          alt="GoMufi Text"
          className="h-6 object-contain hidden lg:block"
        />
      </div>

      {/* CENTER SECTION: Navigation Items */}
      <div className="flex-1 flex items-center justify-center gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar h-full py-1 px-4 mx-4">
        {navItems.map((item) => (
          <NavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            isActive={activePage === item.label}
            onClick={() => onNavigate(item.label)}
          />
        ))}

        {/* BUILDER BUTTON (DEBUG) - Moved inside center group for better flow */}
        <button
          onClick={() => onNavigate("Builder")}
          className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl cursor-pointer transition-all duration-75 group relative border-2 border-b-4 shrink-0
                         ${
                           activePage === "Builder"
                             ? "bg-rose-100 border-rose-400 border-b-rose-400 text-rose-500"
                             : "bg-transparent border-transparent border-b-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200 hover:border-b-gray-200"
                         }
                         `}
        >
          <span className="text-sm">🛠️</span>
          <span className="font-black tracking-wider uppercase font-sans text-[10px] whitespace-nowrap">
            Builder
          </span>
        </button>
      </div>

      {/* RIGHT SECTION: Profile Dropdown + Stats */}
      <div className="flex items-center gap-3">
        {/* Stats Row */}
        {currentCourse && (
          <div className="flex items-center gap-3">
            {/* Fire / Streak */}
            <div
              className="flex items-center gap-1.5 group cursor-pointer"
              title="Günlük Seri"
            >
              <img
                src={FireIcon}
                alt="Streak"
                className="w-6 h-6 group-hover:scale-110 transition-transform"
              />
              <span className="text-sm font-black text-orange-500 font-display">
                {currentCourse.stats.streak}
              </span>
            </div>

            {/* Gems */}
            <div
              className="flex items-center gap-1.5 group cursor-pointer"
              title="Elmaslar"
            >
              <span className="text-sm group-hover:scale-110 transition-transform block text-sky-400">
                💎
              </span>
              <span className="text-sm font-black text-sky-500 font-display">
                {currentCourse.stats.gems}
              </span>
            </div>

            {/* Hearts */}
            <div
              className="flex items-center gap-1.5 group cursor-pointer"
              title="Canlar"
            >
              <span className="text-sm group-hover:scale-110 transition-transform block text-red-500">
                ❤️
              </span>
              <span className="text-sm font-black text-red-500 font-display">
                5
              </span>
            </div>
          </div>
        )}

        {/* Profile Dropdown Container */}
        <div className="relative">
          <button
            className="w-10 h-10 rounded-xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-xl hover:bg-indigo-200 transition-colors shadow-sm focus:outline-none"
            onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
          >
            👨‍🏫
          </button>

          {/* Profile Dropdown Menu */}
          {isProfileDropdownOpen && (
            <div className="absolute top-[120%] right-0 w-56 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Oturum Açıldı
                </span>
                <span className="text-sm font-black text-gray-800 font-display">
                  Mufi Öğrenci
                </span>
              </div>
              <div className="flex flex-col p-2">
                <button
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-gray-600 font-bold text-sm transition-colors text-left"
                  onClick={() => onNavigate("Profilim")}
                >
                  <span>👤</span> Profilim
                </button>
                <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-gray-600 font-bold text-sm transition-colors text-left">
                  <span>⚙️</span> Ayarlar
                </button>
                <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 text-red-500 font-bold text-sm transition-colors text-left border-t border-gray-100 mt-2">
                  <span>🚪</span> Çıkış Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Navbar;
