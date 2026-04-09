import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import StudentApp from './components/StudentApp';
import InstructorApp from './components/InstructorApp';
import ParentApp from './components/ParentApp';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/auth"
        element={<AuthPage onLogin={() => { }} />}
      />

      {/* Student Routes */}
      <Route path="/student/*" element={<StudentApp />} />

      {/* Instructor Routes */}
      <Route path="/instructor/*" element={<InstructorApp />} />

      {/* Parent Routes */}
      <Route path="/parent/*" element={<ParentApp />} />

      {/* Redirect unknown routes to Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
