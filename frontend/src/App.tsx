import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import StudentApp from './components/StudentApp';
import InstructorApp from './components/InstructorApp';
import ParentApp from './components/ParentApp';
import PaymentSuccess from './components/PaymentSuccess';
import PaymentError from './components/PaymentError';

import CompleteProfile from './components/CompleteProfile';

function App() {
  const [sessionExpired, setSessionExpired] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthExpired = () => {
      setSessionExpired(true);
      setTimeout(() => {
         setSessionExpired(false);
         navigate('/');
      }, 3000);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [navigate]);

  return (
    <>
      {sessionExpired && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-sm text-center animate-in zoom-in-95 duration-300">
                <div className="text-5xl mb-4">⏳</div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Oturum Süresi Doldu</h2>
                <p className="text-gray-500 font-medium mb-6">Güvenliğiniz için tekrar giriş yapmalısınız. Yönlendiriliyorsunuz...</p>
                <div className="w-8 h-8 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto"></div>
            </div>
        </div>
      )}
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
    </>
  );
}

export default App;
