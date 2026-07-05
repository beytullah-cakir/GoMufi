import React, { useState } from 'react';
import ParentLayout from './parent-pages/ParentLayout';
import ParentDashboard from './parent-pages/ParentDashboard';
import ParentSkillTree from './parent-pages/ParentSkillTree';
import ParentInstructors from './parent-pages/ParentInstructors';
import ParentStudents from './parent-pages/ParentStudents';
import ParentPayments from './parent-pages/ParentPayments';
import ParentSettings from './parent-pages/ParentSettings';

const ParentApp: React.FC = () => {
    const [activePage, setActivePage] = useState('Dashboard');

    // Mock User Data for Parent
    const userData = {
        first_name: "Mualla", // You can update this based on actual auth data later
        last_name: "Şahin",
        email: "mualla@example.com",
        role: "parent"
    };

    const renderPage = () => {
        switch (activePage) {
            case 'Dashboard': return <ParentDashboard />;
            case 'Progress': return <ParentSkillTree />;
            case 'Instructors': return <ParentInstructors />;
            case 'Students': return <ParentStudents />;
            case 'Payments': return <ParentPayments />;
            case 'Settings': return <ParentSettings />;
            default: return <div className="p-8 text-center text-gray-500">Sayfa bulunamadı</div>;
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
