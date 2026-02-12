import React, { useState } from "react";
import ParentLayout from "./parent-pages/ParentLayout";
import ParentDashboard from "./parent-pages/ParentDashboard";
import ParentSkillTree from "./parent-pages/ParentSkillTree";
import ParentInstructors from "./parent-pages/ParentInstructors";
import ParentStudents from "./parent-pages/ParentStudents";
import ParentPayments from "./parent-pages/ParentPayments";
import ParentSettings from "./parent-pages/ParentSettings";
import { useAuth } from "../hooks/useAuth";

const ParentApp: React.FC = () => {
  const [activePage, setActivePage] = useState("Dashboard");
  const { userData, loading, refresh } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="font-bold text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    switch (activePage) {
      case "Dashboard":
        return <ParentDashboard userData={userData} />;
      case "Progress":
        return <ParentSkillTree userData={userData} />;
      case "Instructors":
        return <ParentInstructors />;
      case "Students":
        return <ParentStudents userData={userData} onRefresh={refresh} />;
      case "Payments":
        return <ParentPayments />;
      case "Settings":
        return <ParentSettings userData={userData} onRefresh={refresh} />;
      default:
        return (
          <div className="p-8 text-center text-gray-500">Sayfa bulunamadı</div>
        );
    }
  };

  return (
    <ParentLayout
      activePage={activePage}
      onNavigate={setActivePage}
      userData={userData}
    >
      {renderPage()}
    </ParentLayout>
  );
};

export default ParentApp;
