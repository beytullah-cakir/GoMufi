import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import Courses from './components/Courses';


function App() {
  const [activePage, setActivePage] = useState('Ana Sayfa');

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="*" element={<div>Sayfa bulunamadı</div>} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
