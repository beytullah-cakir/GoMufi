import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../Sidebar';
import { Bot, BookOpen, Building2, HelpCircle, History, LayoutDashboard, ShieldAlert, UserCog, Users } from 'lucide-react';
import api from '../../api';
import AdminPanel from './AdminPanel';
import AdminOverview from './AdminOverview';
import AdminAccounts from './AdminAccounts';
import AdminOrganizations from './AdminOrganizations';
import { AdminAudit, AdminSecurity } from './AdminSecurity';
import InstructorMetrics from '../instructor-pages/InstructorMetrics';

// Sayfa ↔ adres. Etkin sayfa adresten türetilir (tarayıcı geri/ileri kendiliğinden çalışır).
const PAGES: Record<string, string> = {
    Overview: '/admin',
    Accounts: '/admin/users',
    UserEdit: '/admin/users/edit',
    Organizations: '/admin/organizations',
    Courses: '/admin/courses',
    Quizzes: '/admin/quizzes',
    AI: '/admin/ai',
    Security: '/admin/security',
    Audit: '/admin/audit',
};

const pageOf = (path: string) => {
    const clean = path.replace(/\/+$/, '') || '/admin';
    return Object.keys(PAGES).find((k) => PAGES[k] === clean) || 'Overview';
};

function AdminApp() {
    const navigate = useNavigate();
    const location = useLocation();
    const activePage = pageOf(location.pathname);

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

    const go = (page: string) => navigate(PAGES[page] || '/admin');

    const navItems = [
        { id: 'Overview', label: 'Genel Bakış', icon: LayoutDashboard },
        { id: 'Accounts', label: 'Hesaplar', icon: Users, section: 'Kullanıcılar' },
        { id: 'UserEdit', label: 'Ekle / Düzenle', icon: UserCog, section: 'Kullanıcılar' },
        { id: 'Organizations', label: 'Kurumlar ve Paketler', icon: Building2, section: 'Kullanıcılar' },
        { id: 'Courses', label: 'Kurslar', icon: BookOpen, section: 'İçerik' },
        { id: 'Quizzes', label: 'Soru Bankası', icon: HelpCircle, section: 'İçerik' },
        { id: 'AI', label: 'YZ Maliyeti', icon: Bot, section: 'İşletme' },
        { id: 'Security', label: 'Güvenlik', icon: ShieldAlert, section: 'İşletme' },
        { id: 'Audit', label: 'İşlem Kaydı', icon: History, section: 'İşletme' },
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

    const search = new URLSearchParams(location.search).get('q') || '';

    return (
        <div className="flex flex-row h-screen bg-white font-sans text-gray-900 overflow-hidden">
            <Sidebar
                role="admin"
                activePage={activePage}
                onNavigate={go}
                items={navItems}
                userData={userData}
            />

            <div className="flex-1 flex flex-col relative w-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-gray-50/40">
                {activePage === 'Overview' && <AdminOverview onNavigate={go} />}
                {activePage === 'Accounts' && (
                    <AdminAccounts onEdit={(email) => navigate(`${PAGES.UserEdit}${email ? `?q=${encodeURIComponent(email)}` : ''}`)} />
                )}
                {activePage === 'Organizations' && <AdminOrganizations />}
                {activePage === 'UserEdit' && <AdminPanel key={`users-${search}`} initialTab="users" initialSearch={search} hideTabs />}
                {activePage === 'Courses' && <AdminPanel initialTab="courses" hideTabs />}
                {activePage === 'Quizzes' && <AdminPanel initialTab="quizzes" hideTabs />}
                {activePage === 'AI' && <InstructorMetrics />}
                {activePage === 'Security' && <AdminSecurity />}
                {activePage === 'Audit' && <AdminAudit />}
            </div>
        </div>
    );
}

export default AdminApp;
