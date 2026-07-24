import React, { useState } from 'react';
import { X, KeyRound, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import posthog from 'posthog-js';
import api from '../../api';

interface JoinCourseModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const JoinCourseModal: React.FC<JoinCourseModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successTitle, setSuccessTitle] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleClose = () => {
        setCode('');
        setError(null);
        setSuccessTitle(null);
        onClose();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!code.trim() || isLoading) return;

        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post('/enroll-by-code', { code: code.trim() });
            posthog?.capture('student_joined_class', { course_id: response.data.course_id });
            setSuccessTitle(response.data.course_title || 'Ders');
            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 1200);
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Kod doğrulanırken bir hata oluştu.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                <button
                    onClick={handleClose}
                    className="absolute top-5 right-5 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X size={20} />
                </button>

                {successTitle ? (
                    <div className="flex flex-col items-center text-center py-6">
                        <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                            <CheckCircle2 className="w-9 h-9" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 mb-2">Derse Katıldın! 🎉</h3>
                        <p className="text-gray-500 font-bold text-sm">"{successTitle}" artık Ana Sayfa'nda seni bekliyor.</p>
                    </div>
                ) : (
                    <>
                        <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-5">
                            <KeyRound className="w-7 h-7" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2 font-display">Kod ile Derse Katıl</h3>
                        <p className="text-gray-500 font-bold text-sm mb-6">
                            Eğitmeninden aldığın katılım kodunu aşağıya gir.
                        </p>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                placeholder="ÖRN: A1B2C3"
                                maxLength={12}
                                autoFocus
                                className="w-full bg-gray-50 border-2 border-gray-200 focus:border-indigo-500 focus:bg-white rounded-2xl px-5 py-4 font-black text-xl text-center tracking-[0.3em] text-gray-800 outline-none transition-all placeholder:tracking-normal placeholder:font-bold placeholder:text-gray-300"
                            />

                            {error && (
                                <div className="p-3 bg-red-50 border-2 border-red-100 rounded-xl flex items-center gap-2 text-red-500">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <p className="text-xs font-bold">{error}</p>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={!code.trim() || isLoading}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:bg-gray-200 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Derse Katıl'}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default JoinCourseModal;
