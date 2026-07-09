import React, { useState } from 'react';
import { UserPlus, Sparkles, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import api from '../../api';

interface JoinClassPageProps {
    onClassJoined: () => void;
}

const JoinClassPage: React.FC<JoinClassPageProps> = ({ onClassJoined }) => {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim()) {
            setError('Lütfen geçerli bir davet kodu girin.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccessMessage(null);

        try {
            const res = await api.post('/class/join', { code: code.trim() });
            if (res.data.success) {
                setSuccessMessage(res.data.message || 'Sınıfa başarıyla katıldınız!');
                setTimeout(() => {
                    onClassJoined();
                }, 2000);
            } else {
                setError(res.data.detail || 'Bir hata oluştu.');
            }
        } catch (err: any) {
            console.error('Join class error:', err);
            const errMsg = err.response?.data?.detail || 'Geçersiz veya bulunamayan katılım kodu. Lütfen tekrar deneyin.';
            setError(errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-6 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/50 font-sans">
            <div className="relative w-full max-w-lg">
                {/* Decorative Background Elements */}
                <div className="absolute -top-12 -left-12 w-48 h-48 bg-sky-200/40 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-indigo-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }}></div>

                {/* Main Card */}
                <div className="relative bg-white/80 backdrop-blur-md border border-gray-100 rounded-3xl p-8 md:p-10 shadow-2xl shadow-gray-200/80 transition-all duration-300">
                    
                    {/* Header */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-200 mb-4 animate-bounce">
                            <UserPlus className="w-8 h-8 text-white" strokeWidth={2.5} />
                        </div>
                        <h1 className="text-3xl font-black text-gray-800 font-display tracking-tight uppercase">Sınıfa Katıl</h1>
                        <p className="text-gray-450 font-bold text-sm mt-2 max-w-sm">
                            Öğretmeninizden aldığınız sınıf davet kodunu aşağıya yapıştırarak maceraya hemen dahil olun!
                        </p>
                    </div>

                    {/* Notification States */}
                    {error && (
                        <div className="flex items-center gap-3 bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 text-rose-600 text-sm font-bold mb-6 animate-in slide-in-from-top-2 duration-200">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {successMessage && (
                        <div className="flex flex-col items-center text-center bg-emerald-50 border-2 border-emerald-100 rounded-3xl p-6 text-emerald-700 text-sm font-bold mb-6 animate-in zoom-in-95 duration-300">
                            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-3 animate-bounce" />
                            <span className="text-lg font-black font-display mb-1">Maceraya Katıldınız!</span>
                            <span>{successMessage}</span>
                            <span className="text-xs text-emerald-600/70 mt-3 font-medium animate-pulse">Yönlendiriliyorsunuz...</span>
                        </div>
                    )}

                    {/* Form */}
                    {!successMessage && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="block text-[10px] font-black text-gray-450 uppercase tracking-widest pl-1">
                                    Sınıf Davet Kodu
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Örn: INV-ABC"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        disabled={isLoading}
                                        className="w-full bg-gray-50/50 hover:bg-gray-50 border-2 border-gray-200 border-b-4 focus:border-sky-500 rounded-2xl py-4.5 px-6 font-black text-lg tracking-wider text-center text-gray-800 placeholder-gray-400 focus:outline-none transition-all"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-400 animate-pulse">
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading || !code.trim()}
                                className={`w-full bg-sky-500 hover:bg-sky-600 text-white font-black text-base py-4.5 px-8 rounded-2xl border-b-4 border-sky-700 active:border-b-0 active:translate-y-[4px] transition-all shadow-lg shadow-sky-100 flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider ${
                                    isLoading || !code.trim() ? 'opacity-50 pointer-events-none' : ''
                                }`}
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>Katıl</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JoinClassPage;
