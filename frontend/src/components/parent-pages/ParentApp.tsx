import React, { useState, useEffect } from 'react';
import api from '../../api';
import ParentLayout from './ParentLayout';
import ParentDashboard from './ParentDashboard';
import ParentSkillTree from './ParentSkillTree';
import ParentInstructors from './ParentInstructors';
import ParentStudents from './ParentStudents';
import ParentPayments from './ParentPayments';
import ParentSettings from './ParentSettings';
import ParentStudentDetail from './ParentStudentDetail';
import { Loader2 } from 'lucide-react';

const ParentApp: React.FC = () => {
    const [activePage, setActivePage] = useState('Dashboard');
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<any>(null);

    useEffect(() => {
        // Handle browser back button
        const handlePopState = (event: PopStateEvent) => {
            if (activePage !== 'Dashboard' || selectedStudent) {
                // If we are on a subpage or student detail, go back to main list or dashboard
                if (selectedStudent) {
                    setSelectedStudent(null);
                } else {
                    setActivePage('Dashboard');
                }
                // Push current state back to keep user in the parent panel
                window.history.pushState({ page: 'parent' }, '', window.location.href);
            }
        };

        window.addEventListener('popstate', handlePopState);
        
        // Initial state push
        if (!window.history.state || window.history.state.page !== 'parent') {
            window.history.pushState({ page: 'parent' }, '', window.location.href);
        }

        return () => window.removeEventListener('popstate', handlePopState);
    }, [activePage, selectedStudent]);

    useEffect(() => {
        // Reset selected student when navigating to other main pages
        if (activePage !== 'Students') {
            setSelectedStudent(null);
        }
    }, [activePage]);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const response = await api.get('/profile');
                setUserData(response.data);
                setError(null);
            } catch (err: any) {
                console.error('Profile fetch error:', err);
                setError(err.response?.data?.detail || 'Profil bilgileri yüklenemedi.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
                <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest animate-pulse">Veli Paneli Yükleniyor...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <h2 className="text-2xl font-black text-red-500 mb-2">Bir Hata Oluştu</h2>
                <p className="text-gray-500 font-bold mb-6">{error}</p>
                <button 
                    onClick={() => window.location.reload()}
                    className="bg-purple-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
                >
                    Tekrar Dene
                </button>
            </div>
        );
    }

    const renderPage = () => {
        switch (activePage) {
            case 'Dashboard': return <ParentDashboard userData={userData} />;
            case 'Progress': return <ParentSkillTree />;
            case 'Instructors': return <ParentInstructors />;
            case 'Students': 
                return selectedStudent ? (
                    <ParentStudentDetail 
                        student={selectedStudent} 
                        onBack={() => setSelectedStudent(null)} 
                    />
                ) : (
                    <ParentStudents 
                        userData={userData} 
                        onSelectStudent={setSelectedStudent} 
                    />
                );
            case 'Payments': return <ParentPayments />;
            case 'Profile': return <ParentSettings userData={userData} />;
            default: return <div className="p-8 text-center text-gray-500 font-bold">Sayfa bulunamadı</div>;
        }
    };

    return (
        <ParentLayout
            activePage={activePage}
            onNavigate={setActivePage}
            userData={userData}
        >
            {renderPage()}
        </ParentLayout>
    );
};

export default ParentApp;
