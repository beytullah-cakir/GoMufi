import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import HomePage from "./components/HomePage";
import CoursesPage from "./components/CoursesPage";
import ProfilePage from "./components/ProfilePage";
import ContentPage from "./components/ContentPage";
import AuthPage from "./components/AuthPage";
import CompleteProfilePage from "./components/CompleteProfilePage";
import api from "./api";
import LandingPage from './components/LandingPage';

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
      <div className="min-h-screen flex items-center justify-center">
        Yükleniyor...
      </div>
    );
  }

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

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/auth"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage onLogin={() => setIsAuthenticated(true)} />
          }
        />
        <Route path="/dashboard" element={<DashboardLayout />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
