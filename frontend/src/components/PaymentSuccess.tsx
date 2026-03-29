import React, { useEffect } from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const courseIds = searchParams.get('course_ids');

    useEffect(() => {
        // Here you could trigger a local state update or just rely on the backend enrollment
        // For now, we'll just clear the local cart to be sure
        localStorage.removeItem('gomufi_cart');
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
            <div className="bg-white rounded-[3rem] p-12 shadow-2xl border-2 border-gray-100 max-w-lg w-full text-center animate-in zoom-in duration-500">
                <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                    <CheckCircle2 className="w-16 h-16" />
                </div>
                <h2 className="text-4xl font-black text-gray-900 mb-4 font-display">Ödeme Başarılı! 🥳</h2>
                <p className="text-gray-500 font-bold mb-10 text-lg">
                    Kursların hesabına başarıyla tanımlandı. Hemen öğrenmeye başlayabilirsin!
                </p>
                <button 
                    onClick={() => navigate('/student')}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 flex items-center justify-center gap-2"
                >
                    Öğrenmeye Başla <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default PaymentSuccess;
