import React from 'react';
import { CreditCard, Download, CheckCircle, AlertCircle, Package } from 'lucide-react';

const ParentPayments: React.FC = () => {
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 mb-2">Ödemeler ve Paketler</h2>
                    <p className="text-gray-500 font-medium">Abonelik durumunuzu ve ödeme geçmişinizi yönetin.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Plan Card */}
                <div className="lg:col-span-2 space-y-8">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-purple-200 relative overflow-hidden">
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-lg text-sm font-bold backdrop-blur-sm mb-4">
                                    <Package className="w-4 h-4" /> Aktif Paket
                                </div>
                                <h3 className="text-3xl font-black mb-2">Premium Aile Paketi</h3>
                                <p className="text-purple-100 font-medium mb-8">
                                    Aylık 8 Ders Hakkı • Tüm İçeriklere Erişim
                                </p>
                                <div className="flex items-center gap-8">
                                    <div>
                                        <div className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">Kalan Ders</div>
                                        <div className="text-2xl font-black">4 Ders</div>
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-1">Yenilenme</div>
                                        <div className="text-2xl font-black">01 Mar</div>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-4xl font-black">₺2.499<span className="text-lg text-purple-200 font-medium">/ay</span></div>
                                <button className="mt-4 px-6 py-3 bg-white text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition-colors shadow-sm">
                                    Paketi Yükselt
                                </button>
                            </div>
                        </div>
                        {/* Decorative Circles */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-3xl -ml-10 -mb-10"></div>
                    </div>

                    {/* Payment History */}
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                        <h3 className="text-xl font-black text-gray-800 mb-6">Ödeme Geçmişi</h3>
                        <div className="space-y-4">
                            {[
                                { date: "01 Şub 2024", item: "Premium Aile Paketi", amount: "₺2.499", status: "Başarılı" },
                                { date: "01 Oca 2024", item: "Premium Aile Paketi", amount: "₺2.499", status: "Başarılı" },
                                { date: "01 Ara 2023", item: "Premium Aile Paketi", amount: "₺1.999", status: "Başarılı" },
                            ].map((payment, idx) => (
                                <div key={idx} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition-colors group cursor-pointer border border-transparent hover:border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-green-50 text-green-500 rounded-xl flex items-center justify-center">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-800">{payment.item}</div>
                                            <div className="text-xs text-gray-400 font-bold">{payment.date}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <span className="font-black text-gray-800">{payment.amount}</span>
                                        <button className="text-gray-400 hover:text-purple-600 transition-colors">
                                            <Download className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="space-y-8">
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
                        <h3 className="text-xl font-black text-gray-800 mb-6">Kayıtlı Kartlar</h3>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-900 text-white rounded-2xl shadow-lg relative overflow-hidden group hover:scale-[1.02] transition-transform cursor-pointer">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                                <div className="flex justify-between items-start mb-6">
                                    <CreditCard className="w-6 h-6" />
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-6" alt="Mastercard" />
                                </div>
                                <div className="font-mono text-lg tracking-wider mb-2">**** **** **** 4242</div>
                                <div className="flex justify-between items-end">
                                    <div className="text-xs text-gray-400">Son Kullanma<br /><span className="text-white text-sm font-bold">12/25</span></div>
                                    <div className="text-sm font-bold">Mualla Şahin</div>
                                </div>
                            </div>
                            <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 flex items-center justify-center gap-2 font-bold hover:bg-white hover:border-purple-300 hover:text-purple-500 transition-colors cursor-pointer">
                                <PlusIcon className="w-5 h-5" /> Yeni Kart Ekle
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-[2rem] border border-blue-100 p-6">
                        <div className="flex items-start gap-4">
                            <AlertCircle className="w-6 h-6 text-blue-500 flex-shrink-0" />
                            <div>
                                <h4 className="font-bold text-blue-800 mb-2">Otomatik Ödeme Aktif</h4>
                                <p className="text-sm text-blue-600 font-medium">
                                    Her ayın 1'inde kayıtlı kartınızdan ödeme alınacaktır. İptal etmek için ayarlara gidin.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Simple Plus Icon component locally defined to avoid changing imports constantly
const PlusIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
    </svg>
)

export default ParentPayments;
