import React from "react";
import InstructorSidebar from "./InstructorSidebar";

interface InstructorLayoutProps {
  activePage: string;
  onNavigate: (page: string) => void;
  children?: React.ReactNode;
  userData: any;
  headerSlot?: React.ReactNode;
}

const InstructorLayout: React.FC<InstructorLayoutProps> = ({
  activePage,
  onNavigate,
  children,
  userData,
  headerSlot,
}) => {
  const firstname = userData?.first_name || "Eğitmen";
  const lastname = userData?.last_name || "";
  const email = userData?.email || "";

  const initials = (firstname.charAt(0) + (lastname.charAt(0) || "")).toUpperCase();

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <InstructorSidebar activePage={activePage} onNavigate={onNavigate} />
      <div className="flex-1 overflow-auto relative flex flex-col">
        <div className={`flex-1 overflow-y-auto relative ${activePage === "Builder" ? "" : "p-8"}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default InstructorLayout;
