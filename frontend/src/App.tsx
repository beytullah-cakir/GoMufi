import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
