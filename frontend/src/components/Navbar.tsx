import React from 'react';

// Import sprites
import MufiLogo from '../assets/sprites/MufiLogo.png';
import LogoText from '../assets/sprites/LogoText.png';
import HomeIcon from '../assets/sprites/HomeIcon.png';
import ShopIcon from '../assets/sprites/ShopIcon.png';
import ProfileIcon from '../assets/sprites/ProfileIcon.png';
import BooksIcon from '../assets/sprites/BooksIcon.png';
import ChatIcon from '../assets/sprites/ChatIcon.png';


interface NavItemProps {
    icon: string;
    label: string;
    isActive?: boolean;
    onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick }) => {
    return (
        <button
            onClick={onClick}
            // STABLE GEOMETRY: Always have border-b-4 (transparent when inactive) to prevent height jumps
            className={`flex items-center gap-3 px-6 py-3 rounded-2xl cursor-pointer transition-all duration-75 group relative border-2 border-b-4 shrink-0
      ${isActive
                    ? 'bg-sky-100 border-sky-400 border-b-sky-400 translate-y-0 text-sky-500'
                    : 'bg-transparent border-transparent border-b-transparent text-gray-400 hover:bg-gray-50 hover:text-gray-600 hover:border-gray-200 hover:border-b-gray-200 active:border-b-transparent active:translate-y-[4px] active:duration-0'
                }
      `}
        >
            <img
                src={icon}
                alt={label}
                className={`w-8 h-8 object-contain transition-transform duration-300 ${isActive ? 'scale-100' : 'grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 group-hover:animate-wiggle'}`}
            />
            <span className="font-black tracking-wider uppercase font-sans text-sm whitespace-nowrap">
                {label}
            </span>
        </button>
    );
};

interface NavbarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate }) => {
    const navItems = [
        { label: 'Ana Sayfa', icon: HomeIcon },
        { label: 'Kurslar', icon: ShopIcon },
        { label: 'Profilim', icon: ProfileIcon },
        { label: 'İçerik', icon: BooksIcon },
        { label: 'Soru Sor!', icon: ChatIcon },
    ];

    return (
        <div className="w-full bg-white border-b-2 border-gray-200 px-8 py-3 flex items-center justify-between z-50 shadow-sm relative shrink-0 h-24 box-border">
            {/* Logo Area */}
            <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform shrink-0" onClick={() => onNavigate('Ana Sayfa')}>
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border-b-4 border-yellow-300 shadow-sm overflow-hidden relative z-10">
                    <img src={MufiLogo} alt="GoMufi" className="w-full h-full object-cover scale-110" />
                </div>
                <img src={LogoText} alt="GoMufi Text" className="h-28 scale-150 object-contain hidden lg:block origin-left relative z-0" />
            </div>

            {/* Navigation Items - FORCE NO VERTICAL SCROLL */}
            <div className="flex items-center gap-2 overflow-x-auto overflow-y-hidden no-scrollbar h-full py-1 px-1">
                {navItems.map((item) => (
                    <NavItem
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        isActive={activePage === item.label}
                        onClick={() => onNavigate(item.label)}
                    />
                ))}
            </div>

            {/* User Profile Mini (Optional Placeholder) */}
            <div className="hidden xl:flex items-center gap-3 pl-6 border-l-2 border-gray-100 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-xl cursor-pointer hover:bg-indigo-200 transition-colors">
                    👨‍🏫
                </div>
            </div>
            {/* Sleeping Cat Widget Removed */}
        </div>
    );
};

export default Navbar;
