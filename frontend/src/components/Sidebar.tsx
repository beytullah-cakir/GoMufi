import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

// Sprite ve Icon Importları
import MufiLogo from "../assets/sprites/MufiLogo.png";
import LogoText from "../assets/sprites/LogoText.png";
import HomeIcon from "../assets/sprites/HomeIcon.png";
import ShopIcon from "../assets/sprites/ShopIcon.png";
import ProfileIcon from "../assets/sprites/ProfileIcon.png";
import BooksIcon from "../assets/sprites/BooksIcon.png";
import ChatIcon from "../assets/sprites/ChatIcon.png";

interface NavItemProps {
  icon: string;
  label: string;
  isActive?: boolean;
}

// NavItem Bileşeni (Arayüz yapısı korundu)
const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive }) => {
  return (
    <div
      className={`flex items-center px-6 py-2 rounded-2xl cursor-pointer transition-all duration-75 group relative select-none border-2
      ${
        isActive
          ? "bg-sky-100 border-sky-400 border-b-[4px] translate-y-[0px]"
          : "bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200 hover:border-b-[4px] active:translate-y-[4px] active:border-b-[0px] active:duration-0"
      }
      `}
    >
      <div
        className={`w-8 h-8 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${
          isActive ? "scale-100" : "group-hover:animate-wiggle"
        }`}
      >
        <img
          src={icon}
          alt={label}
          className="w-full h-full object-contain drop-shadow-sm"
        />
      </div>

      <span
        className={`ml-3 text-sm font-black tracking-wider uppercase font-sans transition-colors duration-200
        ${isActive ? "text-sky-500" : "text-gray-400 group-hover:text-gray-600"}
      `}
      >
        {label}
      </span>
    </div>
  );
};

interface SidebarProps {
  activePage?: string;
  onNavigate?: (page: string) => void;
}

const Navbar: React.FC<SidebarProps> = ({
  activePage: externalActivePage,
  onNavigate,
}) => {
  const [internalActivePage, setInternalActivePage] = useState("Ana Sayfa");
  const navigate = useNavigate();

  const currentActivePage = externalActivePage || internalActivePage;

  const navItems = [
    { label: "Ana Sayfa", icon: HomeIcon, path: "/dashboard" },
    { label: "Kurslar", icon: ShopIcon, path: "/courses" },
    { label: "Profilim", icon: ProfileIcon, path: "/profile" },
    { label: "İçerik", icon: BooksIcon, path: "/content" },
    { label: "Soru Sor!", icon: ChatIcon, path: "/ask" },
  ];

  const handleNavigation = (label: string, path: string) => {
    setInternalActivePage(label);
    if (onNavigate) onNavigate(label);
    navigate(path);
  };

  return (
    <div className="w-full bg-white border-b-2 border-gray-200 h-20 px-8 flex items-center justify-between sticky top-0 z-50">
      {/* Logo Area */}
      <div
        className="flex items-center cursor-pointer"
        onClick={() => handleNavigation("Ana Sayfa", "/dashboard")}
      >
        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border-b-4 border-yellow-300 shadow-sm mr-3">
          <img
            src={MufiLogo}
            alt="GoMufi Logo"
            className="w-8 h-8 object-contain"
          />
        </div>
        <img
          src={LogoText}
          alt="GoMufi"
          className="h-12 object-contain hidden md:block"
        />
      </div>

      {/* Navigation */}
      <div className="flex gap-2">
        {navItems.map((item) => (
          <div
            key={item.label}
            onClick={() => handleNavigation(item.label, item.path)}
          >
            <NavItem
              icon={item.icon}
              label={item.label}
              isActive={currentActivePage === item.label}
            />
          </div>
        ))}
      </div>

      {/* Placeholder for User Profile / Right side actions if needed */}
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 cursor-pointer">
        <img
          src={ProfileIcon}
          alt="Profile"
          className="w-6 h-6 object-contain opacity-50"
        />
      </div>
    </div>
  );
};

export default Navbar;
