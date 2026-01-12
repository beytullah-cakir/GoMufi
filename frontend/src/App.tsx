import { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import api from "./api";
import Sidebar from "./components/students-pages/Sidebar";
import HomePage from "./components/HomePage";
import AuthPage from "./components/AuthPage";
import LandingPage from "./components/LandingPage";
import CoursesPage from "./components/students-pages/CoursesPage";
import ProfilePage from "./components/students-pages/ProfilePage";
import ContentPage from "./components/ContentPage";
import CompleteProfilePage from "./components/CompleteProfilePage";
import InstructorLayout from "./components/instructor-pages/InstructorLayout";
import InstructorDashboard from "./components/instructor-pages/InstructorDashboard";
import InstructorCourses from "./components/instructor-pages/InstructorCourses";
import InstructorContent from "./components/instructor-pages/InstructorContent";
import InstructorStudents from "./components/instructor-pages/InstructorStudents";
import InstructorInteractions from "./components/instructor-pages/InstructorInteractions";
import InstructorAssessments from "./components/instructor-pages/InstructorAssessments";
import InstructorCalendar from "./components/instructor-pages/InstructorCalendar";
import InstructorRevenue from "./components/instructor-pages/InstructorRevenue";
import InstructorSettings from "./components/instructor-pages/InstructorSettings";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<"student" | "teacher" | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState("Ana Sayfa");
  const [instructorPage, setInstructorPage] = useState("Dashboard");
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await api.get("/profile");
        setIsAuthenticated(true);
        setUserRole(response.data.role);
        setUserData(response.data);
      } catch (e) {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC]">
        <div className="animate-pulse font-black text-2xl text-sky-500">
          Mufi Yükleniyor...
        </div>
      </div>
    );
  }

  // Common Protected Layout for Students
  const StudentLayout = () => {
    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    if (userRole === "teacher") return <Navigate to="/instructor" replace />;

    return (
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <main className="flex-1 overflow-y-auto relative bg-white">
          <Outlet context={{ userData }} />
        </main>
      </div>
    );
  };

  // Instructor Specific Layout
  const InstructorPanel = () => {
    if (!isAuthenticated) return <Navigate to="/auth" replace />;
    if (userRole === "student") return <Navigate to="/dashboard" replace />;

    return (
      <InstructorLayout
        activePage={instructorPage}
        onNavigate={setInstructorPage}
        userData={userData}
      >
        {instructorPage === "Dashboard" ? (
          <InstructorDashboard />
        ) : instructorPage === "Courses" ? (
          <InstructorCourses />
        ) : instructorPage === "Content" ? (
          <InstructorContent />
        ) : instructorPage === "Students" ? (
          <InstructorStudents />
        ) : instructorPage === "Interactions" ? (
          <InstructorInteractions />
        ) : instructorPage === "Assessments" ? (
          <InstructorAssessments />
        ) : instructorPage === "Calendar" ? (
          <InstructorCalendar />
        ) : instructorPage === "Revenue" ? (
          <InstructorRevenue />
        ) : instructorPage === "Settings" ? (
          <InstructorSettings userData={userData} />
        ) : (
          <div className="flex items-center justify-center h-64 text-gray-400 font-bold text-lg">
            {instructorPage} İçeriği Hazırlanıyor...
          </div>
        )}
      </InstructorLayout>
    );
  };

  return (
    <Routes>
      <Route
        path="/"
        element={
          isAuthenticated ? (
            userRole === "teacher" ? (
              <Navigate to="/instructor" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <LandingPage />
          )
        }
      />

      <Route
        path="/auth"
        element={
          isAuthenticated ? (
            userRole === "teacher" ? (
              <Navigate to="/instructor" replace />
            ) : (
              <Navigate to="/dashboard" replace />
            )
          ) : (
            <AuthPage
              onLogin={() => {
                window.location.reload();
              }}
            />
          )
        }
      />

      <Route
        path="/complete-profile"
        element={
          isAuthenticated ? (
            <CompleteProfilePage userData={userData} />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />

      {/* Student Routes */}
      <Route element={<StudentLayout />}>
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/content" element={<ContentPage />} />
      </Route>

      {/* Instructor Routes */}
      <Route path="/instructor" element={<InstructorPanel />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
