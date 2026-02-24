import React, { useEffect, useState } from "react";
import InstructorSidebar from "./InstructorSidebar";
import { Search, Bell } from "lucide-react";
import api from "../../api";

interface InstructorLayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children?: React.ReactNode;
  userData: any;
}

const InstructorLayout: React.FC<InstructorLayoutProps> = ({
  activePage,
  onNavigate,
  children,
  userData,
}) => {
  if (!userData) return null;
  const firstname = userData.first_name || "";
  const lastname = userData.last_name || "";
  const email = userData.email || "";

  const initials = (firstname.charAt(0) + lastname.charAt(0)).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <InstructorSidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex-1 overflow-auto relative">
        {/* Top Bar */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8 flex-1">
            <h1 className="text-2xl font-black text-gray-800 tracking-tight whitespace-nowrap min-w-[150px]">
              {activePage === "Dashboard"
                ? "Panel"
                : activePage === "Courses"
                  ? "Kurslarım"
                  : activePage === "Content"
                    ? "İçerik Yönetimi"
                    : activePage === "Students"
                      ? "Öğrenciler"
                      : activePage === "Interactions"
                        ? "Etkileşimler"
                        : activePage === "Assessments"
                          ? "Değerlendirme"
                          : activePage === "Calendar"
                            ? "Takvim"
                            : activePage === "Revenue"
                              ? "Gelir"
                              : activePage === "Settings"
                                ? "Ayarlar"
                                : activePage === "Builder"
                                  ? "Ders Oluşturucu"
                                  : activePage}
            </h1>

            {/* Global Search */}
            <div className="relative max-w-md w-full hidden md:block group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400 group-focus-within:text-sky-500 transition-colors" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all duration-200 sm:text-sm font-bold"
                placeholder="Kurs, öğrenci veya içerik ara..."
              />
            </div>
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
                  {firstname} Hoca
                </p>
              </div>
              <div className="w-10 h-10 rounded-full bg-sky-100 border-2 border-sky-200 flex items-center justify-center text-sky-600 font-bold cursor-pointer hover:bg-sky-200 transition-colors">
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

export default InstructorLayout;
