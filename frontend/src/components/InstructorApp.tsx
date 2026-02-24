import React, { useState } from "react";
import InstructorLayout from "./instructor-pages/InstructorLayout";
import InstructorDashboard from "./instructor-pages/InstructorDashboard";
import InstructorCourses from "./instructor-pages/InstructorCourses";
import InstructorStudents from "./instructor-pages/InstructorStudents";
import InstructorRevenue from "./instructor-pages/InstructorRevenue";
import InstructorSettings from "./instructor-pages/InstructorSettings";
import LessonBuilderPage from "./LessonBuilderPage";

const InstructorApp: React.FC = () => {
  const [activePage, setActivePage] = useState("Dashboard");

  // Mock User Data (In a real app, this would come from a Context or Global State)
  const userData = {
    first_name: "Mualla",
    last_name: "Yılmaz",
    email: "mualla@example.com",
  };

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
      case "Builder":
        return <LessonBuilderPage onExit={() => setActivePage("Courses")} />;
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

  if (activePage === "Builder") {
    return renderPage();
  }

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
