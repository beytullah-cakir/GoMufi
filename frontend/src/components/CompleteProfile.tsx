import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import MufiMascot from '../assets/sprites/MufiMascot.png';

const CompleteProfile: React.FC = () => {
    const [gradeLevel, setGradeLevel] = useState('');
    const [educationLevel, setEducationLevel] = useState('');
    const [nickname, setNickname] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/complete-profile', {
                grade_level: gradeLevel,
                education_level: educationLevel,
                nickname: nickname
            });
            // Profile complete, go to student dashboard
            navigate('/student');
        } catch (err) {
            console.error('Profile completion error:', err);
            alert('Profil güncellenirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl max-w-md w-full border border-gray-100 text-center">
                <img src={MufiMascot} alt="Mufi" className="w-32 mx-auto mb-6 animate-wave" />
                <h1 className="text-3xl font-black text-gray-800 mb-2">Harika! Son bir adım...</h1>
                <p className="text-gray-500 font-medium mb-8">Senin için en uygun içerikleri hazırlayabilmemiz için birkaç bilgiye ihtiyacımız var.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="text"
                        placeholder="Sana nasıl hitap edelim? (Nickname)"
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-4 focus:ring-green-100 outline-none"
                        required
                    />

                    <select
                        value={educationLevel}
                        onChange={(e) => setEducationLevel(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-4 focus:ring-green-100 outline-none"
                        required
                    >
                        <option value="">Eğitim Seviyesi Seç</option>
                        <option value="ilkokul">İlkokul</option>
                        <option value="ortaokul">Ortaokul</option>
                        <option value="lise">Lise</option>
                        <option value="universite">Üniversite</option>
                    </select>

                    <select
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-4 focus:ring-green-100 outline-none"
                        required
                    >
                        <option value="">Sınıf Seç</option>
                        {[...Array(12)].map((_, i) => (
                            <option key={i} value={`${i + 1}. Sınıf`}>{i + 1}. Sınıf</option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl font-black text-white text-xl shadow-xl hover:shadow-green-200/50 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? 'KAYDEDİLİYOR...' : 'KEŞFETMEYE BAŞLA'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfile;
