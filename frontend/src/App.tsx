import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import CoursesPage from './components/CoursesPage';
import ProfilePage from './components/ProfilePage';
import ContentPage from './components/ContentPage';
import AuthPage from './components/AuthPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);


  if (!isAuthenticated) {
    return <AuthPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
      <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
        <Sidebar/>

        <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/content" element={<ContentPage />} />
          </Routes>
        </div>
      </div>
    
  );
}

export default App;
