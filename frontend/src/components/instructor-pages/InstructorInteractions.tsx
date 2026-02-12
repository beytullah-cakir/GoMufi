import React, { useState } from 'react';
import { Search, MoreHorizontal, Check, Reply } from 'lucide-react';

const InstructorInteractions: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'qa' | 'comments' | 'messages'>('qa');

    const questions = [
        { id: 1, user: 'Ahmet Y.', avatar: 'bg-blue-100 text-blue-600', course: 'Python: Temel Algoritmalar', topic: 'Döngüler', title: 'While döngüsünde sonsuz döngüden nasıl çıkarım?', content: 'Break komutunu denedim ama tam olarak nereye yazmam gerektiğini anlamadım. Yardımcı olabilir misiniz?', time: '2 saat önce', replies: 0, status: 'unanswered' },
        { id: 2, user: 'Ayşe K.', avatar: 'bg-green-100 text-green-600', course: 'Web Geliştirme 101', topic: 'CSS Flexbox', title: 'Justify-content center çalışmıyor', content: 'Div elementine display:flex verdim ama ortalanmıyor. Yükseklik vermem gerekir mi?', time: '5 saat önce', replies: 1, status: 'answered' },
    ];

    return (
        <div className="space-y-6 animate-fade-in-down">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-gray-800">Etkileşim Merkezi</h2>
                    <p className="text-sm font-bold text-gray-400">Öğrencilerinle iletişimde kal</p>
                </div>
            </div>

            {/* Review Tabs */}
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('qa')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'qa' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Soru & Cevap
                    <span className="ml-2 bg-red-100 text-red-500 px-2 py-0.5 rounded-full text-xs">3</span>
                </button>
                <button
                    onClick={() => setActiveTab('comments')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'comments' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Yorumlar
                </button>
                <button
                    onClick={() => setActiveTab('messages')}
                    className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'messages' ? 'border-sky-500 text-sky-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                >
                    Mesajlar
                </button>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                {/* List */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-3xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-gray-100">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input type="text" placeholder="Ara..." className="w-full pl-10 pr-3 py-2 bg-gray-50 rounded-xl text-sm font-medium focus:outline-none" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {questions.map((q) => (
                            <div key={q.id} className={`p-4 border-b border-gray-50 hover:bg-sky-50 cursor-pointer transition-colors ${q.status === 'unanswered' ? 'bg-white' : 'bg-gray-50/50'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${q.avatar}`}>
                                            {q.user.split(' ').map(n => n[0]).join('')}
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-800">{q.user}</p>
                                            <p className="text-[10px] text-gray-400">{q.time}</p>
                                        </div>
                                    </div>
                                    {q.status === 'unanswered' && <span className="w-2 h-2 rounded-full bg-red-500"></span>}
                                </div>
                                <h4 className="text-sm font-bold text-gray-700 line-clamp-1">{q.title}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2 mt-1">{q.content}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{q.course}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Detail / Reply View */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-3xl p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg">AY</div>
                                <div>
                                    <h3 className="font-bold text-gray-800">Ahmet Yılmaz</h3>
                                    <p className="text-xs text-gray-500 font-bold">Python: Temel Algoritmalar • Bölüm 3: Döngüler</p>
                                </div>
                            </div>
                            <button className="text-gray-400 hover:text-gray-600"><MoreHorizontal /></button>
                        </div>

                        <h2 className="text-xl font-black text-gray-800 mb-2">While döngüsünde sonsuz döngüden nasıl çıkarım?</h2>
                        <p className="text-gray-600 leading-relaxed text-sm">
                            Merhaba Hocam, dersi izledim ama bir yerde takıldım. While döngüsü kurarken condition hep True kaldığı için kodum çalışınca durmuyor.
                            Break komutunu denedim ama tam olarak if bloğunun içine mi yazmam lazım yoksa döngünün sonuna mı?
                            <br /><br />
                            Teşekkürler.
                        </p>
                    </div>

                    <div className="mt-8">
                        <div className="text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                            <Reply size={14} />
                            Yanıtla
                        </div>
                        <textarea
                            className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-gray-700 font-medium text-sm"
                            placeholder="Cevabınızı buraya yazın..."
                        ></textarea>
                        <div className="flex justify-end mt-4 gap-3">
                            <button className="px-6 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors">Taslak Olarak Kaydet</button>
                            <button className="px-6 py-2 text-sm font-bold bg-sky-500 hover:bg-sky-600 text-white rounded-xl shadow-lg shadow-sky-200 transition-transform active:scale-95 flex items-center gap-2">
                                <Check size={16} strokeWidth={3} />
                                Gönder
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstructorInteractions;
