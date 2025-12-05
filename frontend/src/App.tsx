import { useState } from 'react';
import Navbar from './components/Navbar';
import HomePage from './components/HomePage';
import CoursesPage from './components/CoursesPage';
import ProfilePage from './components/ProfilePage';
import ContentPage from './components/ContentPage';

function App() {
  const [activePage, setActivePage] = useState('Ana Sayfa');

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
      <Navbar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 overflow-y-scroll relative w-full">
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
