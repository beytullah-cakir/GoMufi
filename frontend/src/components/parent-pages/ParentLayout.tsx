import React from "react";
import ParentSidebar from "./ParentSidebar";
import { Search, Bell } from "lucide-react";

interface ParentLayoutProps {
    activePage: string;
    onNavigate: (page: string) => void;
    children?: React.ReactNode;
    userData: any;
}

const ParentLayout: React.FC<ParentLayoutProps> = ({
    activePage,
    onNavigate,
    children,
    userData,
}) => {
    if (!userData) return null;
    const firstname = userData.first_name || "";
    const lastname = userData.last_name || "";

    const initials = (firstname.charAt(0) + lastname.charAt(0)).toUpperCase();

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            <ParentSidebar activePage={activePage} onNavigate={onNavigate} />
            <div className="flex-1 overflow-auto relative">
                {/* Top Bar */}
                <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-8 flex-1">
                        <h1 className="text-2xl font-black text-gray-800 tracking-tight whitespace-nowrap min-w-[150px]">
                            {activePage === "Dashboard"
                                ? "Ebeveyn Paneli"
                                : activePage === "Progress"
                                    ? "Gelişim Takibi"
                                    : activePage === "Instructors"
                                        ? "Eğitmenler"
                                        : activePage === "Students"
                                            ? "Öğrencilerim"
                                            : activePage === "Payments"
                                                ? "Ödemeler"
                                                : activePage === "Profile"
                                                    ? "Profilim"
                                                    : activePage}
                        </h1>

                    </div>

                    <div className="flex items-center gap-6">
                        {/* Notifications */}
                        <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors hover:bg-gray-100 rounded-xl">
                            <Bell className="h-6 w-6" />
                            <span className="absolute top-2 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse"></span>
                        </button>

                        <div className="flex items-center gap-3 pl-6 border-l-2 border-gray-100">
                            <div className="text-right hidden md:block">
                                <p className="text-sm font-black text-gray-800">
                                    {firstname} {lastname}
                                </p>
                                <p className="text-xs text-purple-500 font-bold">Veli Hesabı</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-purple-100 border-2 border-purple-200 flex items-center justify-center text-purple-600 font-bold cursor-pointer hover:bg-purple-200 transition-colors">
                                {initials}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-8">{children}</div>
            </div>
        </div>
    );
};

export default ParentLayout;
