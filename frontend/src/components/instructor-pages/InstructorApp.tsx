import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import InstructorLayout from './InstructorLayout';
import InstructorDashboard from './InstructorDashboard';
import InstructorCourses from './InstructorCourses';
import InstructorStudents from './InstructorStudents';
// import InstructorRevenue from './InstructorRevenue';
// import InstructorAIQuestions from './InstructorAIQuestions';
import InstructorMessages from './InstructorMessages';
import InstructorHomeworkSubmissions from './InstructorHomeworkSubmissions';
import LessonBuilderPage from '../LessonBuilderPage';
import InstructorProfile from './InstructorProfile';
import InstructorRoadmapBuilder from './InstructorRoadmapBuilder';
import InstructorCalendar from './InstructorCalendar';
import InstructorClasses from './InstructorClasses';
import InstructorMetrics from './InstructorMetrics';
import api from '../../api';

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
            'calendar': 'Calendar',
            'classes': 'Classes',
            'students': 'Students',
            'messages': 'Messages',
            'metrics': 'Metrics',
            'profile': 'Profile',
            'builder': 'Builder',
            'homework-submissions': 'HomeworkSubmissions'
        };
        return mapping[lastPart] || 'Dashboard';
    };

    const activePage = getActivePageFromPath(location.pathname);

    // User Data State
    const [userData, setUserData] = useState<any>(null);
    const [coursesData, setCoursesData] = useState<any[]>([]);
    const [studentsData, setStudentsData] = useState<any[]>([]);
    const [isUserDataLoading, setIsUserDataLoading] = useState(true);

    const fetchUserData = async () => {
        try {
            const profileRes = await api.get("/profile");
            setUserData(profileRes.data);
            
            try {
                const [coursesRes, studentsRes] = await Promise.all([
                    api.get("/teacher/content"),
                    api.get("/teacher/students")
                ]);
                setCoursesData(coursesRes.data);
                setStudentsData(studentsRes.data);
            } catch (innerErr) {
                console.warn("Failed to fetch secondary instructor data", innerErr);
            }
        } catch (err) {
            console.error("Failed to fetch instructor data", err);
        } finally {
            setIsUserDataLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    const handleNavigate = (pageId: string) => {
        const mapping: { [key: string]: string } = {
            'Dashboard': '/instructor/dashboard',
            'Courses': '/instructor/courses',
            'Calendar': '/instructor/calendar',
            'Classes': '/instructor/classes',
            'Students': '/instructor/students',
            'Messages': '/instructor/messages',
            'Metrics': '/instructor/metrics',
            'Profile': '/instructor/profile',
            'Builder': '/instructor/builder',
            'HomeworkSubmissions': '/instructor/homework-submissions'
        };
        navigate(mapping[pageId] || '/instructor/dashboard');
    };

    if (isUserDataLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
                <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-black text-gray-700 font-display">Eğitmen Paneli Yükleniyor...</h2>
                <p className="text-gray-400 font-bold text-sm">Verileriniz hazırlanıyor</p>
            </div>
        );
    }

    if (location.pathname.includes("builder") || location.pathname.includes("roadmap-builder")) {
        return (
            <Routes>
                <Route 
                    path="builder" 
                    element={
                        <LessonBuilderPage 
                            onExit={() => { 
                                fetchUserData(); 
                                const queryParams = new URLSearchParams(location.search);
                                const cId = queryParams.get("courseId");
                                if (cId) {
                                    navigate(`/instructor/roadmap-builder/${cId}`);
                                } else {
                                    navigate('/instructor/courses');
                                }
                            }} 
                        />
                    } 
                />
                <Route path="roadmap-builder/:courseId" element={<InstructorRoadmapBuilder />} />
                <Route path="*" element={<Navigate to="/instructor/courses" replace />} />
            </Routes>
        );
    }

    return (
        <InstructorLayout
            activePage={activePage}
            onNavigate={handleNavigate}
            userData={userData}
        >
            <Routes>
                <Route path="/" element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<InstructorDashboard userData={userData} coursesData={coursesData} studentsData={studentsData} />} />
                <Route path="courses" element={<InstructorCourses coursesData={coursesData} refreshData={fetchUserData} />} />
                <Route path="calendar" element={<InstructorCalendar coursesData={coursesData} />} />
                <Route path="classes" element={<InstructorClasses />} />
                <Route path="students" element={<InstructorStudents studentsData={studentsData} />} />
                <Route path="messages" element={<InstructorMessages />} />
                <Route path="metrics" element={<InstructorMetrics />} />
                <Route path="profile" element={<InstructorProfile userData={userData} setUserData={setUserData} />} />
                <Route path="homework-submissions" element={<InstructorHomeworkSubmissions coursesData={coursesData} />} />
                <Route path="*" element={<Navigate to="dashboard" replace />} />
            </Routes>
        </InstructorLayout>
    );
};

export default InstructorApp;

