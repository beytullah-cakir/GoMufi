import React, { useState } from 'react';
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
import { useEffect } from 'react';

const InstructorApp: React.FC = () => {
    const [activePage, setActivePage] = useState('Dashboard');

    // Mock User Data (In a real app, this would come from a Context or Global State)
    const userData = {
        first_name: "Mualla",
        last_name: "Yılmaz",
        email: "mualla@example.com"
    };

    const renderPage = () => {
        switch (activePage) {
            case 'Dashboard':
                return <InstructorDashboard />;
            case 'Courses':
                return <InstructorCourses />;
            case 'Students':
                return <InstructorStudents />;
            case 'Analytics':
                return <InstructorRevenue />; // Using Revenue component for Analytics
            case 'Settings':
                return <InstructorSettings />;
            case 'AIQuestions':
                return <InstructorAIQuestions />;
            case 'Profile':
                return <InstructorProfile userData={userData} setUserData={setUserData} />;
            default:
                return (
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-gray-800">Sayfa Bulunamadı</h2>
                        <p className="text-gray-600">{activePage} sayfası henüz hazırlanmadı.</p>
                    </div>
                );
        }
    };

    if (activePage === 'Builder') {
        return <LessonBuilderPage onExit={() => setActivePage('Dashboard')} />;
    }

    return (
        <InstructorLayout
            activePage={activePage}
            onNavigate={setActivePage}
            userData={userData}
        >
            {renderPage()}
        </InstructorLayout>
    );
};

export default InstructorApp;
