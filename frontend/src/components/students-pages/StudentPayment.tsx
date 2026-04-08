import React, { useState } from 'react';
import { CreditCard, ShieldCheck, ShoppingBag, Trash2, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface CartItem {
    id: number;
    title: string;
    price: string;
    icon: string;
    instructor: string;
}

interface StudentPaymentProps {
    cart: CartItem[];
    removeFromCart: (id: number) => void;
    onBack: () => void;
    onPurchaseComplete: () => void;
}

const StudentPayment: React.FC<StudentPaymentProps> = ({ cart, removeFromCart, onBack, onPurchaseComplete }) => {
    const [isPaid, setIsPaid] = useState(false);

    const calculateTotal = () => {
        return cart.reduce((acc, item) => {
            const price = parseFloat(item.price.replace('₺', '').replace(',', '.'));
            return acc + price;
        }, 0).toFixed(2);
    };

    const handlePayment = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock payment process
        setIsPaid(true);
    };

    if (isPaid) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-8 animate-in zoom-in duration-500">
                <div className="bg-white rounded-[3rem] p-12 shadow-2xl border-2 border-gray-100 max-w-lg w-full text-center">
                    <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce">
                        <CheckCircle2 className="w-16 h-16" />
                    </div>
                    <h2 className="text-4xl font-black text-gray-900 mb-4 font-display">Ödeme Başarılı! 🥳</h2>
                    <p className="text-gray-500 font-bold mb-10 text-lg">Kursların hesabına tanımlandı. Hemen öğrenmeye başlayabilirsin!</p>
                    <button 
                        onClick={onPurchaseComplete}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95"
                    >
                        Öğrenmeye Başla!
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Back Button */}
            <button 
                onClick={onBack}
                className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-black text-sm uppercase mb-8 transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Geri Dön
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Left: Cart Items */}
                <div className="lg:col-span-7 space-y-8">
                    <div>
                        <h2 className="text-4xl font-black text-gray-900 mb-2 font-display tracking-tight">Ödeme Detayları 🛍️</h2>
                        <p className="text-gray-500 font-bold">Harika seçim! Kurslarına erişmek için son adımdasın.</p>
                    </div>

                    <div className="bg-white rounded-[2rem] border-2 border-gray-100 p-8 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <ShoppingBag className="w-6 h-6 text-sky-500" />
                            <h3 className="text-xl font-black text-gray-800">Sipariş Özeti ({cart.length})</h3>
                        </div>

                        <div className="space-y-6">
                            {cart.length > 0 ? (
                                cart.map((item) => (
                                    <div key={item.id} className="flex gap-4 p-4 hover:bg-gray-50 rounded-2xl transition-colors group border border-transparent hover:border-gray-100">
                                        <div className="w-24 h-16 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                                            <img src={item.icon} alt={item.title} className="w-12 h-12 object-contain" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-gray-900 mb-1 leading-tight">{item.title}</h4>
                                            <p className="text-xs text-gray-400 font-bold mb-1">{item.instructor}</p>
                                        </div>
                                        <div className="flex flex-col items-end justify-between">
                                            <span className="font-black text-sky-500">{item.price}</span>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                                                className="text-gray-300 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10">
                                    <p className="text-gray-400 font-bold">Sepetin henüz boş.</p>
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="mt-8 pt-8 border-t-2 border-gray-50 flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-400">Genel Toplam:</span>
                                <span className="text-3xl font-black text-gray-900 font-display">₺{calculateTotal()}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Payment Card */}
                <div className="lg:col-span-5">
                    <div className="sticky top-24">
                        <form onSubmit={handlePayment} className="bg-white rounded-[2rem] border-2 border-gray-100 p-8 shadow-xl">
                            <div className="flex items-center gap-3 mb-8">
                                <CreditCard className="w-6 h-6 text-purple-500" />
                                <h3 className="text-xl font-black text-gray-800">Ödeme Bilgileri</h3>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Kart Üzerindeki İsim</label>
                                    <input 
                                        type="text" 
                                        placeholder="MUALLA ŞAHİN" 
                                        className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-800 outline-none focus:border-gray-900 focus:bg-white transition-all uppercase placeholder:text-gray-300"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Kart Numarası</label>
                                    <div className="relative">
                                        <input 
                                            type="text" 
                                            placeholder="**** **** **** 4242" 
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-800 outline-none focus:border-gray-900 focus:bg-white transition-all placeholder:text-gray-300"
                                            required
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-4" alt="Mastercard" />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Son Kullanma</label>
                                        <input 
                                            type="text" 
                                            placeholder="MM/YY" 
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-800 outline-none focus:border-gray-900 focus:bg-white transition-all placeholder:text-gray-300"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">CVV</label>
                                        <input 
                                            type="text" 
                                            placeholder="123" 
                                            className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 font-bold text-gray-800 outline-none focus:border-gray-900 focus:bg-white transition-all placeholder:text-gray-300"
                                            required
                                        />
                                    </div>
                                </div>

                                <button 
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-black transition-all shadow-xl shadow-gray-200 active:scale-95 disabled:bg-gray-200"
                                    disabled={cart.length === 0}
                                >
                                    ₺{calculateTotal()} Öde
                                </button>

                                <div className="flex items-center justify-center gap-2 text-green-500 pt-4">
                                    <ShieldCheck className="w-5 h-5" />
                                    <span className="text-xs font-black uppercase tracking-widest">Güvenli Ödeme SSL</span>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentPayment;
