import React, { useState } from 'react';
import { ShoppingCart, X, Trash2 } from 'lucide-react';

// Import sprites
import MufiLogo from '../assets/sprites/MufiLogo.png';
import LogoText from '../assets/sprites/LogoText.png';
import HomeIcon from '../assets/sprites/HomeIcon.png';
import ShopIcon from '../assets/sprites/ShopIcon.png';
import ProfileIcon from '../assets/sprites/ProfileIcon.png';
import BooksIcon from '../assets/sprites/BooksIcon.png';
import ChatIcon from '../assets/sprites/ChatIcon.png';

import FireIcon from '../assets/sprites/Fire.png';
import type { CourseData } from '../types';

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
    currentCourse: CourseData;
    activeCourseId: string;
    courses: Record<string, CourseData>;
    onCourseChange: (id: string) => void;
    cart: { id: number; title: string; price: string; icon: string; instructor: string; }[];
    removeFromCart: (id: number) => void;
}

const Navbar: React.FC<NavbarProps> = ({ activePage, onNavigate, currentCourse, cart, removeFromCart }) => {
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [isCartOpen, setIsCartOpen] = useState(false);

    const calculateTotal = () => {
        return cart.reduce((acc, item) => {
            const price = parseFloat(item.price.replace('₺', '').replace(',', '.'));
            return acc + price;
        }, 0).toFixed(2);
    };

    const navItems = [
        { label: 'Ana Sayfa', icon: HomeIcon },
        { label: 'Kurslar', icon: ShopIcon },
        { label: 'Kurslarım', icon: BooksIcon },
        { label: 'Soru Sor!', icon: ChatIcon },
    ];

    return (
        <div className="w-full bg-white border-b-2 border-gray-200 px-8 py-3 flex items-center justify-between z-50 shadow-sm relative shrink-0 h-24 box-border">

            {/* LEFT SECTION: Logo */}
            <div className="flex items-center gap-2 cursor-pointer hover:scale-105 transition-transform shrink-0" onClick={() => onNavigate('Ana Sayfa')}>
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border-b-4 border-yellow-300 shadow-sm overflow-hidden relative z-10">
                    <img src={MufiLogo} alt="GoMufi" className="w-full h-full object-cover scale-110" />
                </div>
                <img src={LogoText} alt="GoMufi Text" className="h-28 scale-150 object-contain hidden lg:block origin-left relative z-0" />
            </div>

            {/* CENTER SECTION: Navigation Items */}
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
            {/* RIGHT SECTION: Profile Dropdown + Stats */}
            <div className="flex items-center gap-6">

                {/* Stats Row */}
                {currentCourse && (
                    <div className="flex items-center gap-4">
                        {/* Fire / Streak */}
                        <div className="flex items-center gap-1.5 group cursor-pointer" title="Günlük Seri">
                            <img src={FireIcon} alt="Streak" className="w-6 h-6 group-hover:scale-110 transition-transform" />
                            <span className="text-sm font-black text-orange-500 font-display">{currentCourse.stats.streak}</span>
                        </div>

                        {/* Gems */}
                        <div className="flex items-center gap-1.5 group cursor-pointer" title="Elmaslar">
                            <span className="text-lg group-hover:scale-110 transition-transform block text-sky-400">💎</span>
                            <span className="text-sm font-black text-sky-500 font-display">{currentCourse.stats.gems}</span>
                        </div>

                        {/* Hearts */}
                        <div className="flex items-center gap-1.5 group cursor-pointer" title="Canlar">
                            <span className="text-lg group-hover:scale-110 transition-transform block text-red-500">❤️</span>
                            <span className="text-sm font-black text-red-500 font-display">5</span>
                        </div>
                    </div>
                )}

                {/* Shopping Cart */}
                <div className="relative">
                    <button
                        className="w-12 h-12 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-all relative group"
                        onClick={() => setIsCartOpen(!isCartOpen)}
                    >
                        <ShoppingCart className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center border-2 border-white animate-bounce shadow-sm">
                                {cart.length}
                            </span>
                        )}
                    </button>

                    {/* Cart Dropdown */}
                    {isCartOpen && (
                        <div className="absolute top-[120%] right-0 w-80 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <span className="text-sm font-black text-gray-800 uppercase tracking-wider">Sepetim ({cart.length})</span>
                                <button onClick={() => setIsCartOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="max-h-96 overflow-y-auto no-scrollbar">
                                {cart.length > 0 ? (
                                    <div className="flex flex-col">
                                        {cart.map((item) => (
                                            <div key={item.id} className="p-4 border-b border-gray-50 flex gap-3 group hover:bg-gray-50 transition-colors">
                                                <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden shrink-0">
                                                    <img src={item.icon} alt={item.title} className="w-10 h-10 object-contain" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-xs font-black text-gray-900 truncate mb-0.5">{item.title}</h4>
                                                    <p className="text-[10px] text-gray-400 font-bold mb-1">{item.instructor}</p>
                                                    <span className="text-sm font-black text-sky-500">{item.price}</span>
                                                </div>
                                                <button 
                                                    onClick={() => removeFromCart(item.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-2 text-red-300 hover:text-red-500 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 text-center">
                                        <div className="text-4xl mb-3">🛒</div>
                                        <p className="text-sm font-bold text-gray-400">Sepetin henüz boş.</p>
                                        <button 
                                            onClick={() => { setIsCartOpen(false); onNavigate('Kurslar'); }}
                                            className="mt-4 text-xs font-black text-sky-500 uppercase hover:underline"
                                        >
                                            Kurslara Göz At
                                        </button>
                                    </div>
                                )}
                            </div>

                            {cart.length > 0 && (
                                <div className="p-4 bg-gray-50 border-t border-gray-100">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-xs font-bold text-gray-400 uppercase">Toplam:</span>
                                        <span className="text-lg font-black text-gray-900">₺{calculateTotal()}</span>
                                    </div>
                                    <button 
                                        onClick={() => { setIsCartOpen(false); onNavigate('Ödeme'); }}
                                        className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-colors shadow-lg shadow-gray-200"
                                    >
                                        Sepete Git ve Öde
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Profile Dropdown Container */}
                <div className="relative">
                    <button
                        className="w-12 h-12 rounded-xl bg-indigo-100 border-2 border-indigo-200 flex items-center justify-center text-2xl hover:bg-indigo-200 transition-colors shadow-sm focus:outline-none"
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                    >
                        👨‍🏫
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileDropdownOpen && (
                        <div className="absolute top-[120%] right-0 w-56 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-[100] overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-gray-100 bg-gray-50">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">Oturum Açıldı</span>
                                <span className="text-lg font-black text-gray-800 font-display">Mufi Öğrenci</span>
                            </div>
                            <div className="flex flex-col p-2">
                                <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-gray-600 font-bold text-sm transition-colors text-left" onClick={() => onNavigate('Profilim')}>
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

        </div >
    );
};

export default Navbar;
