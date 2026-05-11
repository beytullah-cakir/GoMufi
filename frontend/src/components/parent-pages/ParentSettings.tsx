import React, { useState, useEffect } from 'react';
import { User, Lock, Bell, Moon, Languages, HelpCircle, LogOut, Save, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../api';

interface ParentSettingsProps {
    userData: any;
}

const ParentSettings: React.FC<ParentSettingsProps> = ({ userData }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: ''
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (userData) {
            setFormData({
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || ''
            });
        }
    }, [userData]);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdating(true);
        setMessage({ type: '', text: '' });

        try {
            await api.put("/profile/update", {
                first_name: formData.first_name,
                last_name: formData.last_name
            });
            setMessage({ type: 'success', text: 'Profil başarıyla güncellendi!' });
            // Optionally refresh the page or parent state to sync names everywhere
            setTimeout(() => window.location.reload(), 1500);
        } catch (error: any) {
            console.error("Update failed", error);
            setMessage({ type: 'error', text: 'Güncelleme sırasında bir hata oluştu.' });
        } finally {
            setIsUpdating(false);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post("/auth/logout");
            window.location.href = "/";
        } catch (error) {
            console.error("Logout failed", error);
            window.location.href = "/";
        }
    };

    const initials = userData ? `${userData.first_name?.[0] || ''}${userData.last_name?.[0] || ''}` : '??';

    return (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
            <div className="mb-8">
                <h2 className="text-3xl font-black text-gray-800 mb-2">Profilim</h2>
                <p className="text-gray-500 font-medium">Kişisel bilgilerinizi yönetin ve güncelleyin.</p>
            </div>

            <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm overflow-hidden">
                {/* Header Section */}
                <div className="p-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-b border-gray-100 flex flex-col md:flex-row items-center gap-6">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-3xl font-black text-purple-600 border-4 border-purple-200 shadow-lg uppercase">
                        {initials}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-black text-gray-800">{formData.first_name} {formData.last_name}</h3>
                        <p className="text-purple-500 font-bold uppercase tracking-widest text-xs">Ebeveyn Hesabı</p>
                    </div>
                </div>

                {/* Form Section */}
                <form onSubmit={handleUpdate} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Adınız</label>
                            <input 
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-purple-400 focus:bg-white outline-none transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Soyadınız</label>
                            <input 
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                className="w-full px-6 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold focus:border-purple-400 focus:bg-white outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-Posta Adresiniz (Değiştirilemez)</label>
                        <input 
                            type="email"
                            value={formData.email}
                            disabled
                            className="w-full px-6 py-4 bg-gray-100 border-2 border-transparent rounded-2xl font-bold text-gray-500 cursor-not-allowed"
                        />
                    </div>

                    {message.text && (
                        <div className={`p-4 rounded-xl flex items-center gap-3 font-bold text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
                            {message.text}
                        </div>
                    )}

                    <div className="pt-4 flex justify-end">
                        <button 
                            type="submit"
                            disabled={isUpdating}
                            className="px-8 py-4 bg-purple-600 text-white font-black rounded-2xl shadow-lg shadow-purple-100 hover:bg-purple-700 transition-all flex items-center gap-2 disabled:bg-gray-300 transform active:scale-95"
                        >
                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            BİLGİLERİ GÜNCELLE
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ParentSettings;
