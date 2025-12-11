import { useState } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import CoursesPage from './components/CoursesPage';
import ProfilePage from './components/ProfilePage';
import ContentPage from './components/ContentPage';
import AuthPage from './components/AuthPage';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activePage, setActivePage] = useState('Ana Sayfa');

  if (!isAuthenticated) {
    return(
      <AuthPage onLogin={() => setIsAuthenticated(true)} />     
    )
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 overflow-auto">
        {activePage === 'Ana Sayfa' ? (
          <HomePage />
        ) : activePage === 'Kurslar' ? (
          <CoursesPage />
        ) : activePage === 'PROFILIM' || activePage === 'Profilim' ? (
          <ProfilePage />
        ) : activePage === 'İÇERİK' || activePage === 'İçerik' ? (
          <ContentPage />
        ) : (
          <div className="p-8">
            <h1 className="text-3xl font-bold text-gray-800">{activePage}</h1>
            <p className="mt-4 text-gray-600">This page is under construction.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
