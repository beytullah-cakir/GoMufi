import { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import HomePage from "./components/HomePage";
import CoursesPage from "./components/CoursesPage";
import ProfilePage from "./components/ProfilePage";
import ContentPage from "./components/ContentPage";
import AuthPage from "./components/AuthPage";
import CompleteProfilePage from "./components/CompleteProfilePage";
import api from "./api";
import LandingPage from "./components/LandingPage";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("/profile");
        setIsAuthenticated(true);
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="screen-center flex items-center justify-center min-h-screen">
        <div className="animate-pulse font-black text-2xl text-sky-500">
          Mufi Yükleniyor...
        </div>
      </div>
    );
  }

  // Dashboard Layout with Outlet for nested routes
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import InstructorLayout from './components/InstructorLayout';
import InstructorDashboard from './components/InstructorDashboard';
import InstructorCourses from './components/InstructorCourses';
import InstructorContent from './components/InstructorContent';
import InstructorStudents from './components/InstructorStudents';
import InstructorInteractions from './components/InstructorInteractions';
import InstructorAssessments from './components/InstructorAssessments';
import InstructorCalendar from './components/InstructorCalendar';
import InstructorRevenue from './components/InstructorRevenue';
import InstructorSettings from './components/InstructorSettings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<'student' | 'instructor' | null>(null);
  const [activePage, setActivePage] = useState('Ana Sayfa');


  // Dashboard Layout Implementation
  const DashboardLayout = () => {
    if (!isAuthenticated) {
      return <Navigate to="/auth" replace />;
    }

    return (
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto relative bg-white">
          <Outlet />
        </main>
      </div>
    );
  };

  const InstructorPanelLayout = () => {
    if (!isAuthenticated) {
      return <Navigate to="/auth" replace />;
    }

    // Simple internal routing for the instructor panel demo
    const [instructorPage, setInstructorPage] = useState('Dashboard');

    return (
      <InstructorLayout activePage={instructorPage} onNavigate={setInstructorPage}>
        {instructorPage === 'Dashboard' ? <InstructorDashboard /> :
          instructorPage === 'Courses' ? <InstructorCourses /> :
            instructorPage === 'Content' ? <InstructorContent /> :
              instructorPage === 'Students' ? <InstructorStudents /> :
                instructorPage === 'Interactions' ? <InstructorInteractions /> :
                  instructorPage === 'Assessments' ? <InstructorAssessments /> :
                    instructorPage === 'Calendar' ? <InstructorCalendar /> :
                      instructorPage === 'Revenue' ? <InstructorRevenue /> :
                        instructorPage === 'Settings' ? <InstructorSettings /> : (
                          <div className="flex items-center justify-center h-64 text-gray-400 font-bold text-lg">
                            {instructorPage} İçeriği Hazırlanıyor...
                          </div>
                        )}
      </InstructorLayout>
    );
  };

  return (
    <Routes>
      {/* Public Landing Page at root / (only for guests) */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LandingPage />
          )
        }
      />

      {/* Auth Page handling */}
      <Route
        path="/auth"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <AuthPage onLogin={() => setIsAuthenticated(true)} />
          )
        }
      />

      {/* Protected Dashboard Routes */}
      <Route element={<DashboardLayout />}>
        {/* We use /dashboard as the entry point to avoid collision with the landing page / */}
        <Route path="/dashboard" element={<HomePage />} />
        <Route path="/courses" element={<CoursesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/content" element={<ContentPage />} />
        <Route path="/complete-profile" element={<CompleteProfilePage />} />
      </Route>

      {/* Fallback redirect to / */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
