import React from "react";
import InstructorSidebar from "./InstructorSidebar";
import { LiveNotification } from "../shared/LiveNotification";

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
      <div className={`flex-1 relative flex flex-col ${activePage === "Builder" ? "overflow-hidden" : "overflow-auto"}`}>
        <div className={`flex-1 relative ${activePage === "Builder" ? "overflow-hidden h-full w-full" : "overflow-y-auto p-8"}`}>
          {children}
        </div>
      </div>
      <LiveNotification />
    </div>
  );
};

export default InstructorLayout;
