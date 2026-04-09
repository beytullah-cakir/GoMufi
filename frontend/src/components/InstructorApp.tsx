import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import InstructorLayout from './instructor-pages/InstructorLayout';
import InstructorDashboard from './instructor-pages/InstructorDashboard';
import InstructorCourses from './instructor-pages/InstructorCourses';
import InstructorStudents from './instructor-pages/InstructorStudents';
import InstructorRevenue from './instructor-pages/InstructorRevenue';
import InstructorSettings from './instructor-pages/InstructorSettings';
import InstructorAIQuestions from './instructor-pages/InstructorAIQuestions';
import LessonBuilderPage from './LessonBuilderPage';
import InstructorProfile from './instructor-pages/InstructorProfile';
import api from '../api';

const InstructorApp: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Derived activePage from URL
    const getActivePageFromPath = (path: string) => {
        const parts = path.split('/');
        const lastPart = parts[parts.length - 1];
        if (!lastPart || lastPart === 'instructor') return 'Dashboard';
        
        const mapping: { [key: string]: string } = {
            'dashboard': 'Dashboard',
            'courses': 'Courses',
            'students': 'Students',
            'analytics': 'Analytics',
            'settings': 'Settings',
            'ai-questions': 'AIQuestions',
            'profile': 'Profile',
            'builder': 'Builder'
        };
        return mapping[lastPart] || 'Dashboard';
    };

    const activePage = getActivePageFromPath(location.pathname);

    // User Data State
    const [userData, setUserData] = useState<any>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.get("/profile");
                setUserData(response.data);
            } catch (err) {
                console.error("Failed to fetch coach data", err);
            }
        };
        fetchUserData();
    }, []);

    const handleNavigate = (pageId: string) => {
        const mapping: { [key: string]: string } = {
            'Dashboard': '/instructor/dashboard',
            'Courses': '/instructor/courses',
            'Students': '/instructor/students',
            'Analytics': '/instructor/analytics',
            'Settings': '/instructor/settings',
            'AIQuestions': '/instructor/ai-questions',
            'Profile': '/instructor/profile',
            'Builder': '/instructor/builder'
        };
        navigate(mapping[pageId] || '/instructor/dashboard');
    };

    if (activePage === 'Builder') {
        return <LessonBuilderPage onExit={() => navigate('/instructor/dashboard')} />;
    }

    return (
        <InstructorLayout
            activePage={activePage}
            onNavigate={handleNavigate}
            userData={userData}
        >
            <Routes>
                <Route path="/" element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<InstructorDashboard />} />
                <Route path="courses" element={<InstructorCourses />} />
                <Route path="students" element={<InstructorStudents />} />
                <Route path="analytics" element={<InstructorRevenue />} />
                <Route path="settings" element={<InstructorSettings />} />
                <Route path="ai-questions" element={<InstructorAIQuestions />} />
                <Route path="profile" element={<InstructorProfile userData={userData} setUserData={setUserData} />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
        </InstructorLayout>
    );
};

export default InstructorApp;

