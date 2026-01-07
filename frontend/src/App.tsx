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
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
        <Sidebar activePage={activePage} onNavigate={setActivePage} />
        <div className="flex-1 overflow-auto">
          {activePage === 'Ana Sayfa' ? (
            <HomePage />
          ) : (
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-800">{activePage}</h1>
              <p className="mt-4 text-gray-600">This page is under construction.</p>
            </div>
          )}
        </div>
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
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/auth"
          element={
            isAuthenticated ? (
              // Redirect based on role
              userRole === 'instructor' ? <Navigate to="/instructor" replace /> : <Navigate to="/dashboard" replace />
            ) : (
              <AuthPage onLogin={(role) => {
                setIsAuthenticated(true);
                setUserRole(role);
              }} />
            )
          }
        />
        <Route path="/dashboard" element={<DashboardLayout />} />
        <Route path="/instructor" element={<InstructorPanelLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
