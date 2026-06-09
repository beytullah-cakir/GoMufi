import React from 'react';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentError: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const message = searchParams.get('message') || 'Ödeme işleminiz sırasında bir hata oluştu.';

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl border-2 border-gray-100 max-w-lg w-full text-center animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-shake">
                    <XCircle className="w-16 h-16" />
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-4 font-display">Ödeme Başarısız 😔</h2>
                <div className="bg-red-50 p-6 rounded-2xl mb-10">
                    <p className="text-red-500 font-bold text-lg">{message}</p>
                </div>
                <div className="flex flex-col gap-4">
                    <button 
                        onClick={() => navigate('/student')}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" /> Tekrar Dene
                    </button>
                    <button 
                        onClick={() => navigate('/student')}
                        className="w-full py-4 bg-transparent text-gray-400 font-black text-lg hover:text-gray-900 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5" /> Geri Dön
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentError;
