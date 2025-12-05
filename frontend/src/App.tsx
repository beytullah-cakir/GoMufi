import { useState } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import { Route, Routes } from 'react-router-dom';
import Courses from './components/Courses';
import Profile from './components/Profile';
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

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </div>
  );
}

export default App;
