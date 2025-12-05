import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useNavigate } from "react-router-dom";

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
    isCollapsed: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, isCollapsed }) => {
    return (
        <div
            className={`flex items-center px-4 py-3 mb-2 rounded-2xl cursor-pointer transition-all duration-75 group relative select-none border-2
      ${isActive
                    ? 'bg-sky-100 border-sky-400 border-b-[4px] translate-y-[0px]'
                    : 'bg-transparent border-transparent hover:bg-gray-50 hover:border-gray-200 hover:border-b-[4px] active:translate-y-[4px] active:border-b-[0px] active:duration-0'
                }
      ${isCollapsed ? 'justify-center' : ''}
      `}
        >
            <div
                className={`w-10 h-10 flex items-center justify-center flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-100' : 'group-hover:animate-wiggle'}`}
                style={{ width: '32px', height: '32px' }}
            >
                <img src={icon} alt={label} className="w-full h-full object-contain drop-shadow-sm" style={{ maxWidth: '100%', maxHeight: '100%' }} />
            </div>

            {!isCollapsed && (
                <span className={`ml-4 text-sm font-black tracking-wider uppercase font-sans transition-colors duration-200
          ${isActive ? 'text-sky-500' : 'text-gray-400 group-hover:text-gray-600'}
        `}>
                    {label}
                </span>
            )}
        </div>
    );
};

interface SidebarProps {
    activePage: string;
    onNavigate: (page: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const navigate = useNavigate();
    const navItems = [
        { label: 'Ana Sayfa', icon: HomeIcon ,path: "/"},
        { label: 'Kurslar', icon: ShopIcon ,path:"/courses"},
        { label: 'Profilim', icon: ProfileIcon ,path:"/profile"},
        { label: 'İçerik', icon: BooksIcon ,path:"/content"},
        { label: 'Soru Sor!', icon: ChatIcon ,},
    ];

    return (
        <div
            className={`relative h-screen bg-white border-r-2 border-gray-200 flex flex-col transition-all duration-300 ease-in-out z-20
      ${isCollapsed ? 'w-24' : 'w-64'}
      `}
            style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}
        >
            {/* Logo Area */}
            <div className={`p-6 mb-2 flex items-center ${isCollapsed ? 'justify-center' : ''}`}>
                <div
                    className="flex-shrink-0 bg-white rounded-2xl flex items-center justify-center border-b-4 border-yellow-300 shadow-sm transition-all duration-300"
                    style={{
                        width: isCollapsed ? '56px' : '72px',
                        height: isCollapsed ? '56px' : '72px'
                    }}
                >
                    <img src={MufiLogo} alt="GoMufi Logo" className="w-full h-full object-contain" style={{ maxWidth: '100%', maxHeight: '100%' }} />
                </div>
                {!isCollapsed && (
                    <img src={LogoText} alt="GoMufi" className="ml-4 h-32 object-contain" />
                )}
            </div>

            {/* Navigation */}
            <div className="flex-1 px-4 overflow-y-auto">
                {navItems.map((item) => (
                    <div key={item.label} onClick={() =>{
                        onNavigate(item.label);
                        navigate(item.path || "/");
                    }}>
                        <NavItem
                            icon={item.icon}
                            label={item.label}
                            isActive={activePage === item.label}
                            isCollapsed={isCollapsed}
                        />
                    </div>
                ))}
            </div>

            {/* Collapse Button */}
            <div className="absolute -right-5 top-1/2 transform -translate-y-1/2 z-30">
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="bg-gray-300 text-white w-8 h-14 rounded-xl border-b-4 border-gray-400 flex items-center justify-center shadow-sm hover:bg-gray-400 hover:border-gray-500 active:border-b-[2px] active:translate-y-[2px] active:duration-0 transition-all duration-75"
                >
                    {isCollapsed ? <ChevronRight size={20} strokeWidth={4} /> : <ChevronLeft size={20} strokeWidth={4} />}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
