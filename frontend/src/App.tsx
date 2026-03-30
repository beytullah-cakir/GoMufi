import { Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import StudentApp from './components/StudentApp';
import InstructorApp from './components/InstructorApp';
import ParentApp from './components/ParentApp';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentError from './components/PaymentError';

import CompleteProfile from './components/CompleteProfile';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/complete-profile" element={<CompleteProfile />} />
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

      {/* Payment Result Routes */}
      <Route path="/payment-success" element={<PaymentSuccess />} />
      <Route path="/payment-error" element={<PaymentError />} />

      {/* Redirect unknown routes to Landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
