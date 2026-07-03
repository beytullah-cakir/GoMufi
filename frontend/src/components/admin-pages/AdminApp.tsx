import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Users, BookOpen, HelpCircle } from 'lucide-react';
import api from '../../api';
import AdminPanel from './AdminPanel';

function AdminApp() {
    const navigate = useNavigate();
    const location = useLocation();

    const [activePage, setActivePage] = useState('Users');
    const [userData, setUserData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAdminProfile = async () => {
            try {
                const response = await api.get("/profile");
                if (response.data.role !== "admin") {
                    alert("Bu sayfaya erişim yetkiniz yok.");
                    navigate("/");
                    return;
                }
                setUserData(response.data);
            } catch (err) {
                console.error("Admin profile verification error:", err);
                navigate("/");
            } finally {
                setIsLoading(false);
            }
        };
        fetchAdminProfile();
    }, [navigate]);

    // Page to Path mapping
    const pageToPath: Record<string, string> = {
        'Users': '/admin/users',
        'Courses': '/admin/courses',
        'Quizzes': '/admin/quizzes'
    };

    const pathToPage: Record<string, string> = {
        '/admin/users': 'Users',
        '/admin/courses': 'Courses',
        '/admin/quizzes': 'Quizzes'
    };

    // Effect to sync URL -> State (Handle browser back/forward and initial load)
    useEffect(() => {
        const path = location.pathname;
        const page = pathToPage[path];
        if (page) {
            setActivePage(page);
        } else if (path === '/admin' || path === '/admin/') {
            setActivePage('Users');
        }
    }, [location.pathname]);

    // Effect to sync State -> URL
    useEffect(() => {
        const targetPath = pageToPath[activePage] || '/admin/users';
        if (location.pathname !== targetPath) {
            navigate(targetPath);
        }
    }, [activePage]);

    const navItems = [
        { id: 'Users', label: 'Kullanıcılar', icon: Users },
        { id: 'Courses', label: 'Kurslar', icon: BookOpen },
        { id: 'Quizzes', label: 'Soru Bankası', icon: HelpCircle }
    ];

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center font-display">
                <div className="w-16 h-16 border-4 border-red-200 border-t-red-500 rounded-full animate-spin mb-4"></div>
                <h2 className="text-xl font-black text-gray-800">Yönetici Paneli Yükleniyor...</h2>
                <p className="text-gray-500 font-bold text-sm">Verileriniz hazırlanıyor 🚀</p>
            </div>
        );
    }

    return (
        <div className="flex flex-row h-screen bg-white font-sans text-gray-900 overflow-hidden">
            <Sidebar
                role="admin"
                activePage={activePage}
                onNavigate={setActivePage}
                items={navItems}
                userData={userData}
            />

            <div className="flex-1 flex flex-col relative w-full overflow-y-auto overflow-x-hidden custom-scrollbar">
                <AdminPanel initialTab={activePage.toLowerCase() as any} />
            </div>
        </div>
    );
}

export default AdminApp;
