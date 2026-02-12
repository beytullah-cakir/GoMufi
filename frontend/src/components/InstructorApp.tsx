import React, { useState } from "react";
import InstructorLayout from "./instructor-pages/InstructorLayout";
import InstructorDashboard from "./instructor-pages/InstructorDashboard";
import InstructorCourses from "./instructor-pages/InstructorCourses";
import InstructorStudents from "./instructor-pages/InstructorStudents";
import InstructorRevenue from "./instructor-pages/InstructorRevenue";
import InstructorSettings from "./instructor-pages/InstructorSettings";

import { useAuth } from "../hooks/useAuth";

const InstructorApp: React.FC = () => {
  const [activePage, setActivePage] = useState("Dashboard");
  const { userData, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin"></div>
          <p className="font-bold text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <InstructorDashboard />;
      case "Courses":
        return <InstructorCourses />;
      case "Students":
        return <InstructorStudents />;
      case "Analytics":
        return <InstructorRevenue />; // Using Revenue component for Analytics
      case "Settings":
        return <InstructorSettings />;
      default:
        return (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800">
              Sayfa Bulunamadı
            </h2>
            <p className="text-gray-600">
              {activePage} sayfası henüz hazırlanmadı.
            </p>
          </div>
        );
    }
  };

  return (
    <InstructorLayout
      activePage={activePage}
      onNavigate={setActivePage}
      userData={userData}
    >
      {renderPage()}
    </InstructorLayout>
  );
};

export default InstructorApp;
