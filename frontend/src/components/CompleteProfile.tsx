import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import MufiMascot from '../assets/sprites/MufiMascot.png';

const CompleteProfile: React.FC = () => {
    // Shared
    const [role, setRole] = useState<'student' | 'teacher' | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingRole, setIsFetchingRole] = useState(true);
    const navigate = useNavigate();

    // Student fields
    const [gradeLevel, setGradeLevel] = useState('');
    const [educationLevel, setEducationLevel] = useState('');
    const [nickname, setNickname] = useState('');

    // Teacher fields
    const [expertises, setExpertises] = useState<string[]>([]);
    const [bio, setBio] = useState('');

    const availableLanguages = [
        "Python", "JavaScript", "TypeScript", "Java", "C++", 
        "C#", "Swift", "Go", "Ruby", "PHP", "Rust", "Kotlin",
        "React", "Node.js", "Vue.js", "Flutter", "Angular"
    ];

    const toggleTag = (tag: string) => {
        if (expertises.includes(tag)) {
            setExpertises(expertises.filter(t => t !== tag));
        } else {
            setExpertises([...expertises, tag]);
        }
    };

    // Fetch user role on mount
    React.useEffect(() => {
        const checkRole = async () => {
            try {
                const response = await api.get('/profile');
                setRole(response.data.role);
            } catch (err) {
                console.error('Failed to fetch role', err);
            } finally {
                setIsFetchingRole(false);
            }
        };
        checkRole();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const data = role === 'student' 
                ? { grade_level: gradeLevel, education_level: educationLevel, nickname: nickname }
                : { expertises: expertises.join(', '), bio: bio };

            await api.post('/complete-profile', data);
            
            // Redirect based on role
            if (role === 'teacher') {
                navigate('/instructor');
            } else {
                navigate('/student');
            }
        } catch (err) {
            console.error('Profile completion error:', err);
            alert('Profil güncellenirken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetchingRole) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F8F9FC]">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl max-w-md w-full border border-gray-100 text-center">
                <img src={MufiMascot} alt="Mufi" className="w-32 mx-auto mb-6 animate-wave" />
                <h1 className="text-3xl font-black text-gray-800 mb-2">Harika! Son bir adım...</h1>
                <p className="text-gray-500 font-medium mb-8">Senin için en uygun içerikleri hazırlayabilmemiz için birkaç bilgiye ihtiyacımız var.</p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {role === 'student' ? (
                        <>
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
                                onChange={(e) => {
                                    setEducationLevel(e.target.value);
                                    setGradeLevel(''); // Reset grade when education level changes
                                }}
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
                                disabled={!educationLevel}
                            >
                                <option value="">Sınıf Seç</option>
                                {educationLevel === 'ilkokul' && [1, 2, 3, 4].map(n => <option key={n} value={`${n}. Sınıf`}>{n}. Sınıf</option>)}
                                {educationLevel === 'ortaokul' && [5, 6, 7, 8].map(n => <option key={n} value={`${n}. Sınıf`}>{n}. Sınıf</option>)}
                                {educationLevel === 'lise' && [9, 10, 11, 12].map(n => <option key={n} value={`${n}. Sınıf`}>{n}. Sınıf</option>)}
                                {educationLevel === 'universite' && ['Hazırlık', '1. Sınıf', '2. Sınıf', '3. Sınıf', '4. Sınıf', 'Mezun'].map(n => <option key={n} value={n}>{n}</option>)}
                            </select>

                        </>
                    ) : (
                        <>
                            <div className="text-left mb-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-2">Uzmanlık Alanların (Tagler)</label>
                                <div className="flex flex-wrap gap-2 mt-2 p-4 bg-gray-50 border border-gray-200 rounded-2xl min-h-[100px]">
                                    {availableLanguages.map((lang) => (
                                        <button
                                            key={lang}
                                            type="button"
                                            onClick={() => toggleTag(lang)}
                                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border-2 ${
                                                expertises.includes(lang)
                                                    ? "bg-cyan-500 text-white border-cyan-600 shadow-md"
                                                    : "bg-white text-gray-400 border-gray-100 hover:border-cyan-200"
                                            }`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <textarea
                                placeholder="Kısa Biyografi (Örn: 5 yıllık Python geliştiricisi)"
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 border border-gray-200 rounded-2xl font-bold focus:ring-4 focus:ring-cyan-100 outline-none min-h-[120px]"
                                required
                            />
                        </>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-5 rounded-2xl font-black text-white text-xl shadow-xl transition-all active:scale-95 disabled:opacity-50 ${
                            role === 'student' 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-green-200/50' 
                                : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-cyan-200/50'
                        }`}
                    >
                        {isLoading ? 'KAYDEDİLİYOR...' : 'KEŞFETMEYE BAŞLA'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CompleteProfile;
