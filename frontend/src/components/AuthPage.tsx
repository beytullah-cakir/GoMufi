import React, { useState } from 'react';
import MufiLogo from '../assets/sprites/MufiLogo.png';
import LogoText from '../assets/sprites/LogoText.png';

interface AuthPageProps {
    onLogin: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onLogin }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Just simulate a successful login/register immediately for demo purposes.
        onLogin();
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
                {/* Floating Elements (Paws/Notes) - Starting from bottom (-bottom-8) */}
                <div className="absolute left-[10%] -bottom-8 animate-[float-up_10s_linear_infinite] opacity-0 text-sky-300">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.22-7.52-3.22 3.22 7.52 3.22-7.52-7.52-3.22-3.22 7.52 3.22-7.52z" /></svg> {/* Star/Sparkle shape */}
                </div>
                <div className="absolute left-[25%] -bottom-8 animate-[float-up_14s_linear_infinite_3s] opacity-0 text-pink-300">
                    <span className="text-3xl">🎶</span>
                </div>
                <div className="absolute left-[50%] -bottom-8 animate-[float-up_18s_linear_infinite_1s] opacity-0 text-yellow-300">
                    <span className="text-4xl">✨</span>
                </div>
                <div className="absolute left-[70%] -bottom-8 animate-[float-up_11s_linear_infinite_4s] opacity-0 text-purple-300">
                    <span className="text-3xl">🎵</span>
                </div>
                <div className="absolute left-[85%] -bottom-8 animate-[float-up_13s_linear_infinite_2s] opacity-0 text-cyan-300">
                    <span className="text-4xl">🐾</span>
                </div>
                <div className="absolute left-[15%] -bottom-8 animate-[float-up_16s_linear_infinite_5s] opacity-0 text-indigo-300">
                    <span className="text-2xl">⚡</span>
                </div>
                <div className="absolute left-[60%] -bottom-8 animate-[float-up_19s_linear_infinite_0s] opacity-0 text-pink-300">
                    <span className="text-5xl">🐾</span>
                </div>
                <div className="absolute left-[90%] -bottom-8 animate-[float-up_15s_linear_infinite_6s] opacity-0 text-orange-300">
                    <span className="text-3xl">🎼</span>
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
