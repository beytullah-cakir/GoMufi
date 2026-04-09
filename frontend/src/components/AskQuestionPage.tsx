import React, { useState } from 'react';
import {
    Search,
    Plus,
    MessageCircle,
    MoreHorizontal,
    Paperclip,
    Image as ImageIcon,
    Send,
    X,
    User,
    Wifi
} from 'lucide-react';

// --- Types ---
interface Message {
    id: string;
    senderId: string;
    senderType: 'user' | 'instructor' | 'system';
    content: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
    fileUrl?: string; // For images/files
    fileName?: string;
}

interface ChatSession {
    id: string;
    lessonTitle: string;
    topic?: string;
    instructorName: string;
    instructorId: string;
    instructorStatus: 'online' | 'offline';
    lastMessage: string;
    lastMessageTime: string;
    unreadCount: number;
    status: 'active' | 'archived';
    messages: Message[];
}

interface Instructor {
    id: string;
    name: string;
    branch: string;
    status: 'online' | 'offline';
    avatarSeed: number;
}

// --- Mock Data ---

const MOCK_INSTRUCTORS: Instructor[] = [
    { id: 'inst1', name: 'Mufi Hoca', branch: 'Python', status: 'online', avatarSeed: 101 },
    { id: 'inst2', name: 'Ahmet Hoca', branch: 'React', status: 'offline', avatarSeed: 202 },
    { id: 'inst3', name: 'Sarah Teacher', branch: 'English', status: 'online', avatarSeed: 303 },
    { id: 'inst4', name: 'Elif Hoca', branch: 'Data Science', status: 'online', avatarSeed: 404 },
];

const MOCK_CHATS: ChatSession[] = [
    {
        id: 'c1',
        lessonTitle: 'Python Giriş',
        topic: 'Döngülerde Hata',
        instructorName: 'Mufi Hoca',
        instructorId: 'inst1',
        instructorStatus: 'online',
        lastMessage: 'Evet, indent hatası yapmışsın.',
        lastMessageTime: '10 dk önce',
        unreadCount: 1,
        status: 'active',
        messages: [
            { id: 'm1', senderId: 'user', senderType: 'user', content: 'Hocam merhaba, for döngüsünde hata alıyorum.', timestamp: '14:30', type: 'text' },
            { id: 'm2', senderId: 'inst1', senderType: 'instructor', content: 'Merhaba Kadir, kodu atabilir misin?', timestamp: '14:32', type: 'text' },
            { id: 'm3', senderId: 'inst1', senderType: 'instructor', content: 'Sanırım girintilerde kayma var.', timestamp: '14:32', type: 'text' },
            { id: 'm4', senderId: 'inst1', senderType: 'instructor', content: 'Evet, indent hatası yapmışsın.', timestamp: '14:40', type: 'text' },
        ]
    },
    {
        id: 'c2',
        lessonTitle: 'React Components',
        topic: 'Props Drifting',
        instructorName: 'Ahmet Hoca',
        instructorId: 'inst2',
        instructorStatus: 'offline',
        lastMessage: 'Tamamdır, teşekkürler hocam!',
        lastMessageTime: 'Dün',
        unreadCount: 0,
        status: 'archived',
        messages: [
            { id: 'm1', senderId: 'user', senderType: 'user', content: 'Prop drilling yerine ne kullanabilirim?', timestamp: 'Dün 10:00', type: 'text' },
            { id: 'm2', senderId: 'inst2', senderType: 'instructor', content: 'Context API veya Redux kullanabilirsin.', timestamp: 'Dün 10:15', type: 'text' },
            { id: 'm3', senderId: 'user', senderType: 'user', content: 'Tamamdır, teşekkürler hocam!', timestamp: 'Dün 10:20', type: 'text' },
        ]
    }
];


const AskQuestionPage: React.FC = () => {
    const [chats, setChats] = useState<ChatSession[]>(MOCK_CHATS);
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [newMessage, setNewMessage] = useState('');

    // New Question Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newQuestionForm, setNewQuestionForm] = useState({
        lesson: 'Python',
        topic: '',
        instructor: 'auto', // 'auto' or specific ID
        message: ''
    });

    // Validated active chat
    const activeChat = chats.find(c => c.id === selectedChatId);

    // Filtered chats lists
    const filteredChats = chats.filter(chat => {
        const matchesFilter = filter === 'all' || chat.status === filter;
        const matchesSearch = chat.lessonTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            chat.instructorName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesFilter && matchesSearch;
    });

    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedChatId) return;

        const updatedChats = chats.map(chat => {
            if (chat.id === selectedChatId) {
                return {
                    ...chat,
                    messages: [
                        ...chat.messages,
                        {
                            id: Date.now().toString(),
                            senderId: 'user',
                            senderType: 'user' as const,
                            content: newMessage,
                            timestamp: 'Şimdi',
                            type: 'text' as const
                        }
                    ],
                    lastMessage: newMessage,
                    lastMessageTime: 'Şimdi'
                };
            }
            return chat;
        });

        setChats(updatedChats);
        setNewMessage('');
    };

    const handleNewQuestionSubmit = () => {
        // Logic to find instructor
        let assignedInstructor = MOCK_INSTRUCTORS.find(i => i.id === newQuestionForm.instructor);

        // Fallback or Auto assign logic
        if (!assignedInstructor || newQuestionForm.instructor === 'auto') {
            // Try to find online instructor for branch, fallback to any
            assignedInstructor = MOCK_INSTRUCTORS.find(i => i.branch === newQuestionForm.lesson && i.status === 'online') ||
                MOCK_INSTRUCTORS.find(i => i.branch === newQuestionForm.lesson) ||
                MOCK_INSTRUCTORS[0];
        }

        const newChat: ChatSession = {
            id: Date.now().toString(),
            lessonTitle: newQuestionForm.lesson,
            topic: newQuestionForm.topic || 'Genel Soru',
            instructorName: assignedInstructor.name,
            instructorId: assignedInstructor.id,
            instructorStatus: assignedInstructor.status,
            lastMessage: newQuestionForm.message,
            lastMessageTime: 'Şimdi',
            unreadCount: 0,
            status: 'active',
            messages: [
                {
                    id: 'sys1',
                    senderId: 'system',
                    senderType: 'system',
                    content: `Soru ${assignedInstructor.name} hocasına iletildi.`,
                    timestamp: 'Şimdi',
                    type: 'text'
                },
                {
                    id: 'msg1',
                    senderId: 'user',
                    senderType: 'user',
                    content: newQuestionForm.message,
                    timestamp: 'Şimdi',
                    type: 'text'
                }
            ]
        };

        setChats([newChat, ...chats]);
        setSelectedChatId(newChat.id);
        setIsModalOpen(false);
        setNewQuestionForm({ lesson: 'Python', topic: '', instructor: 'auto', message: '' });
    };

    return (
        <div className="w-full h-full bg-[#F3F4F6] p-6 font-sans text-gray-800 flex flex-col overflow-hidden">

            <div className="flex h-full gap-6">

                {/* --- LEFT PANEL: CHAT LIST --- */}
                <div className="w-1/3 min-w-[300px] flex flex-col bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden border-b-4 border-gray-200">

                    {/* Header: Search & Filter */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-black text-gray-800 font-display">Sorularım</h2>
                            <span className="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full">{chats.length}</span>
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Ders, hoca veya konu ara..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:font-normal"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex p-1 bg-gray-200/50 rounded-xl">
                            <button onClick={() => setFilter('all')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Tümü</button>
                            <button onClick={() => setFilter('active')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'active' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Aktif</button>
                            <button onClick={() => setFilter('archived')} className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${filter === 'archived' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Arşiv</button>
                        </div>
                    </div>

                    {/* Chat List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {filteredChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 p-6 opacity-60">
                                <MessageCircle size={48} className="mb-2" />
                                <p className="text-sm font-bold">Görünüşe göre burada kimse yok.</p>
                            </div>
                        ) : (
                            filteredChats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    className={`p-4 rounded-2xl cursor-pointer border-2 transition-all hover:shadow-md group relative
                                        ${selectedChatId === chat.id
                                            ? 'bg-indigo-50 border-indigo-200 shadow-sm'
                                            : 'bg-white border-transparent hover:border-gray-100'
                                        }
                                    `}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <h3 className={`font-black text-sm ${selectedChatId === chat.id ? 'text-indigo-900' : 'text-gray-800'}`}>{chat.lessonTitle}</h3>
                                        <span className="text-[10px] font-bold text-gray-400">{chat.lastMessageTime}</span>
                                    </div>

                                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-2">
                                        <User size={12} className={selectedChatId === chat.id ? 'text-indigo-500' : 'text-gray-400'} />
                                        <span>{chat.instructorName}</span>
                                        {chat.topic && <span className="text-gray-300">•</span>}
                                        {chat.topic && <span className="text-gray-400 font-normal truncate max-w-[100px]">{chat.topic}</span>}
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <p className="text-xs text-gray-500 font-medium line-clamp-1 flex-1 pr-2">
                                            {chat.lastMessage}
                                        </p>
                                        {chat.unreadCount > 0 && (
                                            <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm animate-pulse">
                                                {chat.unreadCount}
                                            </span>
                                        )}
                                    </div>

                                    {/* Active State Indicator line */}
                                    {selectedChatId === chat.id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-indigo-500 rounded-r-full"></div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Fixed Bottom: New Question Button */}
                    <div className="p-4 border-t border-gray-100 bg-white shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] text-center relative z-20">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-black text-sm shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 group"
                        >
                            <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                            YENİ SORU SOR
                        </button>
                    </div>
                </div>

                {/* --- RIGHT PANEL: ACTIVE CHAT --- */}
                <div className="flex-1 flex flex-col bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden border-b-4 border-gray-200 relative">

                    {activeChat ? (
                        <>
                            {/* Chat Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white/80 backdrop-blur-md z-10">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 bg-gray-100 rounded-2xl border-2 border-gray-100 flex items-center justify-center text-2xl">
                                            {/* Pseudo Avatar */}
                                            👨‍🏫
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${activeChat.instructorStatus === 'online' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                    </div>
                                    <div>
                                        <h2 className="font-black text-gray-800 text-lg leading-none mb-1">{activeChat.lessonTitle}</h2>
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                                            <span>{activeChat.instructorName}</span>
                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                            <span className={`${activeChat.instructorStatus === 'online' ? 'text-green-500' : 'text-gray-400'}`}>
                                                {activeChat.instructorStatus === 'online' ? 'Çevrimiçi' : 'Çevrimdışı'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-gray-600 transition-colors">
                                        <MoreHorizontal size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Messages Area */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                                {activeChat.messages.map((msg) => {
                                    const isMe = msg.senderType === 'user';
                                    const isSystem = msg.senderType === 'system';

                                    if (isSystem) {
                                        return (
                                            <div key={msg.id} className="flex justify-center my-4">
                                                <div className="bg-gray-200/60 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                                                    {msg.content}
                                                </div>
                                            </div>
                                        )
                                    }

                                    return (
                                        <div key={msg.id} className={`flex gap-3 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            {!isMe && (
                                                <div className="w-8 h-8 rounded-full bg-gray-200 border border-gray-300 flex items-center justify-center text-sm shrink-0 mt-2">
                                                    👨‍🏫
                                                </div>
                                            )}

                                            <div className={`max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                <div className={`
                                                    p-4 rounded-2xl text-sm font-medium shadow-sm relative
                                                    ${isMe
                                                        ? 'bg-indigo-500 text-white rounded-tr-none'
                                                        : 'bg-white border-2 border-gray-100 text-gray-700 rounded-tl-none'
                                                    }
                                                `}>
                                                    {msg.content}
                                                </div>
                                                <span className="text-[10px] font-bold text-gray-300 mt-1 px-1">{msg.timestamp}</span>
                                            </div>

                                            {isMe && (
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-sm shrink-0 mt-2">
                                                    You
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="relative flex items-end gap-2 bg-gray-50 border-2 border-gray-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50 rounded-2xl p-2 transition-all">
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors">
                                        <Paperclip size={20} />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors">
                                        <ImageIcon size={20} />
                                    </button>

                                    <textarea
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium max-h-32 min-h-[44px] py-3 resize-none text-gray-700 placeholder:text-gray-400"
                                        placeholder="Mesajınızı yazın..."
                                        rows={1}
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleSendMessage();
                                            }
                                        }}
                                    />

                                    <button
                                        onClick={handleSendMessage}
                                        className={`p-3 rounded-xl shadow-lg transition-all ${newMessage.trim() ? 'bg-indigo-500 text-white hover:bg-indigo-600 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send size={18} fill={newMessage.trim() ? "currentColor" : "none"} />
                                    </button>
                                </div>
                                <div className="text-center mt-2">
                                    <span className="text-[10px] text-gray-400 font-bold">Shift + Enter ile alt satıra geçebilirsin</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        // EMPTY STATE
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-300 select-none">
                            <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                <MessageCircle size={64} className="text-gray-200" />
                            </div>
                            <h2 className="text-2xl font-black text-gray-400 mb-2 font-display">Bir Soru Seç</h2>
                            <p className="text-sm font-bold text-gray-400/60 max-w-xs text-center leading-relaxed">
                                Soldaki menüden mevcut bir sohbeti seçebilir veya yeni bir soru sorarak öğrenmeye devam edebilirsin.
                            </p>
                        </div>
                    )}
                </div>

            </div>

            {/* --- NEW QUESTION MODAL --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>

                    {/* Modal Content */}
                    <div className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white text-center relative overflow-hidden">
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black font-display mb-1">Yeni Soru Sor</h2>
                                <p className="text-indigo-100 text-sm font-medium">Takıldığın yeri anlat, hocaların yardımcı olsun!</p>
                            </div>
                            {/* Close Button */}
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors text-white">
                                <X size={20} />
                            </button>

                            {/* Deco */}
                            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                        </div>

                        {/* Form */}
                        <div className="p-8 space-y-6">

                            {/* Lesson Select */}
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Ders Seçimi</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {['Python', 'React', 'English', 'Data Science'].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setNewQuestionForm({ ...newQuestionForm, lesson: opt })}
                                            className={`py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all ${newQuestionForm.lesson === opt
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm'
                                                : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200'}`}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Instructor Selection */}
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Hoca Tercihi</label>
                                <select
                                    className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-indigo-400 transition-colors"
                                    value={newQuestionForm.instructor}
                                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, instructor: e.target.value })}
                                >
                                    <option value="auto">Otomatik (Müsait Olan)</option>
                                    {MOCK_INSTRUCTORS.map(inst => (
                                        <option key={inst.id} value={inst.id}>
                                            {inst.name} ({inst.status === 'online' ? '🟢 Çevrimiçi' : '🔴 Çevrimdışı'})
                                        </option>
                                    ))}
                                </select>
                                {newQuestionForm.instructor === 'auto' && (
                                    <div className="flex items-center gap-2 mt-2 text-xs text-indigo-500 font-medium">
                                        <Wifi size={14} />
                                        <span>Aktif olan en uygun hocaya yönlendirileceksiniz.</span>
                                    </div>
                                )}
                            </div>

                            {/* Question Text */}
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Sorunuz</label>
                                <textarea
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-indigo-400 focus:bg-white transition-all h-32 resize-none"
                                    placeholder="Nerede takıldın? Detaylıca anlat..."
                                    value={newQuestionForm.message}
                                    onChange={(e) => setNewQuestionForm({ ...newQuestionForm, message: e.target.value })}
                                />
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleNewQuestionSubmit}
                                disabled={!newQuestionForm.message.trim()}
                                className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2
                                    ${newQuestionForm.message.trim()
                                        ? 'bg-gray-800 text-white hover:bg-gray-900 hover:shadow-xl'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    }
                                `}
                            >
                                <Send size={18} />
                                Gönder
                            </button>

                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default AskQuestionPage;
