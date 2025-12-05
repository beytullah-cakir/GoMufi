import React, { useState } from 'react';
import { Music, Zap } from 'lucide-react';
import MufiLogo from '../assets/sprites/MufiLogo.png';
import LogoText from '../assets/sprites/LogoText.png';
import Paw from '../assets/sprites/Paw.png';
import api from "../api";
interface AuthPageProps {
    onLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
        if (isLogin) {
            await api.post("/login", { email, password });
        } else {
            await api.post("/register", { name, email, password });
        }

        onLogin(); // başarı olursa yönlendirme
    } catch (err) {
        console.error("Auth error:", err);
    }
        
    };

    return (
        <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-yellow-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-20%] left-[20%] w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
            </div>

            {/* Background Animations */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                {/* Scattered Icons - Matching screenshot style */}

                {/* Music Note - Blue & Rotated */}
                <div className="absolute top-[15%] left-[10%] animate-float opacity-20 text-sky-400 transform -rotate-12">
                    <Music className="w-12 h-12" strokeWidth={2.5} />
                </div>

                {/* Paw - Brown & Rotated */}
                <div className="absolute top-[25%] right-[15%] animate-float animation-delay-2000 opacity-20 transform rotate-12">
                    <img src={Paw} alt="Paw" className="w-10 h-10 opacity-60" style={{ filter: 'sepia(1) hue-rotate(-30deg) saturate(2)' }} />
                </div>

                {/* Lightning - Yellow & Rotated */}
                <div className="absolute bottom-[20%] left-[20%] animate-float animation-delay-4000 opacity-20 text-yellow-400 transform -rotate-12">
                    <Zap className="w-10 h-10 fill-current" />
                </div>

                {/* Music Note - Purple & Rotated */}
                <div className="absolute top-[50%] right-[25%] animate-float animation-delay-1000 opacity-20 text-purple-400 transform rotate-45">
                    <Music className="w-8 h-8" strokeWidth={2.5} />
                </div>

                {/* Paw - Brown/Orange */}
                <div className="absolute bottom-[10%] right-[10%] animate-float animation-delay-3000 opacity-20 transform -rotate-6">
                    <img src={Paw} alt="Paw" className="w-12 h-12 opacity-60" style={{ filter: 'sepia(1) hue-rotate(-30deg) saturate(2)' }} />
                </div>

                {/* Sparkle/Star - Pink */}
                <div className="absolute top-[10%] right-[40%] animate-float animation-delay-500 opacity-20 text-pink-300 transform rotate-12">
                    <span className="text-4xl font-black">✦</span>
                </div>

                {/* Extra Lightning */}
                <div className="absolute top-[40%] left-[5%] animate-float animation-delay-2500 opacity-20 text-yellow-300 transform rotate-12">
                    <Zap className="w-8 h-8 fill-current" />
                </div>
            </div>

            <div className="relative z-10 w-full max-w-sm mt-12">
                {/* Logo Section - Top Text, Bottom Logo */}
                <div className="flex flex-col items-center mb-8 animate-fade-in-down">
                    <img src={LogoText} alt="GoMufi" className="h-16 mb-4 object-contain" />
                    <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
                        <img src={MufiLogo} alt="GoMufi Logo" className="w-20 h-20 object-contain" />
                    </div>
                </div>

                {/* Card - Clean White */}
                <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-sky-100/50 relative">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-black text-gray-800 font-display mb-2">
                            {isLogin ? 'Hoşgeldin !' : 'Aramıza Katıl !'}
                        </h2>
                        <p className="text-gray-500 font-sans font-medium text-sm">
                            {isLogin ? 'Eğlenerek öğrenmeye hazır mısın?' : 'Hayallerine giden ilk adımı at.'}
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isLogin && (
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-400 ml-1">İsim</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-700 font-bold focus:outline-none focus:border-cyan-400 focus:bg-white transition-all duration-300 placeholder-gray-300 text-sm"
                                    placeholder="Senin adın ne?"
                                />
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">E-Posta</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-700 font-bold focus:outline-none focus:border-cyan-400 focus:bg-white transition-all duration-300 placeholder-gray-300 text-sm"
                                placeholder="ornek@email.com"
                            />
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-400 ml-1">Şifre</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-xl text-gray-700 font-bold focus:outline-none focus:border-cyan-400 focus:bg-white transition-all duration-300 placeholder-gray-300 text-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        {/* Submit Button - Simple & Bold */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full py-4 rounded-xl font-black text-white text-lg shadow-lg active:scale-95 transition-transform duration-200 font-display tracking-wide bg-cyan-400 hover:bg-cyan-300 shadow-cyan-200"
                            >
                                {isLogin ? 'GİRİŞ YAP' : 'KAYIT OL'}
                            </button>
                        </div>
                    </form>

                    {/* Toggle Mode */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-400 font-bold text-xs">
                            {isLogin ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}
                            <button
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-1 text-cyan-500 hover:text-cyan-600 underline"
                            >
                                {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
