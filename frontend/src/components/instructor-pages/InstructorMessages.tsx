import React, { useState, useEffect } from 'react';
import { Search, Send, User, MessageCircle, X, Paperclip, Image as ImageIcon } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import api from '../../api';

interface Message {
    id: string;
    senderId: string;
    senderType: 'user' | 'instructor' | 'system';
    content: string;
    timestamp: string;
    type: 'text' | 'image' | 'file';
    fileUrl?: string;
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

const InstructorMessages: React.FC = () => {
    const [chats, setChats] = useState<ChatSession[]>(() => {
        const saved = localStorage.getItem('gomufi_chats');
        if (saved) return JSON.parse(saved);
        return [];
    });

    useEffect(() => {
        localStorage.setItem('gomufi_chats', JSON.stringify(chats));
    }, [chats]);

    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [newMessage, setNewMessage] = useState('');

    const { sendMessage, lastMessage } = useWebSocket();

    // Multi-tab sync
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'gomufi_chats') {
                setChats(e.newValue ? JSON.parse(e.newValue) : []);
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // WebSocket Message receiver
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'chat_message') {
            const { chatId, senderId, senderType, content, timestamp, fileType, fileUrl, fileName } = lastMessage;
            
            setChats(prevChats => {
                const chatExists = prevChats.some(c => c.id === chatId);
                if (chatExists) {
                    return prevChats.map(c => {
                        if (c.id === chatId) {
                            const msgExists = c.messages.some(m => m.content === content && m.senderType === senderType && m.timestamp === timestamp);
                            if (msgExists) return c;

                            return {
                                ...c,
                                messages: [
                                    ...c.messages,
                                    {
                                        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                        senderId,
                                        senderType,
                                        content,
                                        timestamp,
                                        type: fileType || 'text',
                                        fileUrl,
                                        fileName
                                    }
                                ],
                                lastMessage: fileType === 'image' ? '📷 Görsel' : fileType === 'file' ? `📁 ${fileName}` : content,
                                lastMessageTime: timestamp,
                                unreadCount: selectedChatId === chatId ? c.unreadCount : c.unreadCount + 1
                            };
                        }
                        return c;
                    });
                }
                return prevChats;
            });
        } else if (lastMessage.type === 'new_chat_session') {
            const { chatId, lessonTitle, topic, instructorName, instructorId, instructorStatus, message, timestamp } = lastMessage;
            
            setChats(prevChats => {
                const chatExists = prevChats.some(c => c.id === chatId);
                if (chatExists) return prevChats;

                const newChat: ChatSession = {
                    id: chatId,
                    lessonTitle,
                    topic,
                    instructorName,
                    instructorId,
                    instructorStatus,
                    lastMessage: message,
                    lastMessageTime: timestamp,
                    unreadCount: 1,
                    status: 'active',
                    messages: [
                        {
                            id: 'sys1',
                            senderId: 'system',
                            senderType: 'system',
                            content: `Soru ${instructorName} hocasına iletildi.`,
                            timestamp: timestamp,
                            type: 'text'
                        },
                        {
                            id: 'msg1',
                            senderId: 'user',
                            senderType: 'user',
                            content: message,
                            timestamp: timestamp,
                            type: 'text'
                        }
                    ]
                };
                return [newChat, ...prevChats];
            });
        }
    }, [lastMessage, selectedChatId]);

    const activeChat = chats.find(c => c.id === selectedChatId);

    const filteredChats = chats.filter(chat => {
        const matchesSearch = chat.lessonTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (chat.topic && chat.topic.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSearch;
    });

    const handleSendMessage = () => {
        if (!newMessage.trim() || !selectedChatId || !activeChat) return;

        const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        const updatedChats = chats.map(chat => {
            if (chat.id === selectedChatId) {
                return {
                    ...chat,
                    messages: [
                        ...chat.messages,
                        {
                            id: Date.now().toString(),
                            senderId: activeChat.instructorId,
                            senderType: 'instructor' as const,
                            content: newMessage,
                            timestamp: timeStr,
                            type: 'text' as const
                        }
                    ],
                    lastMessage: newMessage,
                    lastMessageTime: timeStr
                };
            }
            return chat;
        });

        setChats(updatedChats);

        sendMessage({
            type: 'chat_message',
            chatId: selectedChatId,
            senderId: activeChat.instructorId,
            senderType: 'instructor',
            content: newMessage,
            timestamp: timeStr
        });

        setNewMessage('');
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fileType: 'file' | 'image') => {
        const file = e.target.files?.[0];
        if (!file || !selectedChatId || !activeChat) return;

        // Size check: 5MB
        const max_size = 5 * 1024 * 1024;
        if (file.size > max_size) {
            alert("Dosya boyutu 5MB sınırını aşamaz.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await api.post("/builder/upload-chat-file", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            if (res.data && res.data.url) {
                const publicUrl = res.data.url;
                const fileName = file.name;
                const timeStr = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

                // Update local chat
                const updatedChats = chats.map(chat => {
                    if (chat.id === selectedChatId) {
                        return {
                            ...chat,
                            messages: [
                                ...chat.messages,
                                {
                                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                    senderId: activeChat.instructorId,
                                    senderType: 'instructor' as const,
                                    content: fileType === 'image' ? publicUrl : fileName,
                                    timestamp: timeStr,
                                    type: fileType,
                                    fileUrl: publicUrl,
                                    fileName: fileName
                                }
                            ],
                            lastMessage: fileType === 'image' ? '📷 Görsel' : `📁 ${fileName}`,
                            lastMessageTime: timeStr
                        };
                    }
                    return chat;
                });

                setChats(updatedChats);

                // Broadcast
                sendMessage({
                    type: 'chat_message',
                    chatId: selectedChatId,
                    senderId: activeChat.instructorId,
                    senderType: 'instructor',
                    content: fileType === 'image' ? publicUrl : fileName,
                    timestamp: timeStr,
                    fileType: fileType,
                    fileUrl: publicUrl,
                    fileName: fileName
                });
            }
        } catch (err: any) {
            console.error("Upload error", err);
            alert(err.response?.data?.detail || "Dosya yüklenirken hata oluştu.");
        }
    };

    return (
        <div className="w-full h-full bg-[#F3F4F6] p-2 md:p-6 font-sans text-gray-800 flex flex-col overflow-hidden">
            <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6">
                {/* --- LEFT PANEL: CHAT LIST --- */}
                <div className={`w-full md:w-1/3 md:min-w-[300px] flex-col bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden border-b-4 border-gray-200 ${selectedChatId ? 'hidden md:flex' : 'flex flex-1'}`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-2 mb-4">
                            <h2 className="text-xl font-black text-gray-800 font-display">Gelen Sorular</h2>
                            <span className="bg-sky-100 text-sky-600 text-xs font-bold px-2 py-0.5 rounded-full">{chats.length}</span>
                        </div>
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Ders veya konu ara..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-600 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-50 transition-all placeholder:font-normal"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredChats.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-50">
                                <MessageCircle size={48} className="mb-4 text-gray-300" />
                                <h3 className="text-gray-500 font-bold">Mesaj Bulunamadı</h3>
                            </div>
                        ) : (
                            filteredChats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => setSelectedChatId(chat.id)}
                                    className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer transition-all border-2 border-transparent ${
                                        selectedChatId === chat.id ? 'bg-sky-50 border-sky-200' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0 border border-gray-200">
                                        👨‍🎓
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h4 className="font-bold text-gray-800 text-sm truncate pr-2">{chat.lessonTitle}</h4>
                                            <span className="text-[10px] text-gray-400 font-medium shrink-0">{chat.lastMessageTime}</span>
                                        </div>
                                        <p className="text-xs text-sky-600 font-bold truncate mb-1">{chat.topic}</p>
                                        <p className="text-xs text-gray-500 truncate">{chat.lastMessage}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- RIGHT PANEL: CHAT VIEW --- */}
                <div className={`flex-1 flex-col bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden border-b-4 border-gray-200 ${!selectedChatId ? 'hidden md:flex' : 'flex'}`}>
                    {activeChat ? (
                        <>
                            <div className="p-4 border-b border-gray-100 bg-white flex justify-between items-center z-10 shadow-sm">
                                <div className="flex items-center gap-2 md:gap-4">
                                    <button 
                                        className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg shrink-0"
                                        onClick={() => setSelectedChatId(null)}
                                    >
                                        <X size={20} />
                                    </button>
                                    <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl border-2 border-gray-200 shadow-sm shrink-0">
                                        👨‍🎓
                                    </div>
                                    <div>
                                        <h2 className="font-black text-lg text-gray-800 font-display leading-tight">{activeChat.lessonTitle}</h2>
                                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2 mt-0.5">
                                            ÖĞRENCİ SORUSU
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8F9FA]">
                                {activeChat.messages.map(msg => {
                                    const isInstructor = msg.senderType === 'instructor';
                                    const isSystem = msg.senderType === 'system';

                                    if (isSystem) {
                                        return (
                                            <div key={msg.id} className="flex justify-center my-4">
                                                <span className="bg-gray-200 text-gray-600 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">{msg.content}</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={msg.id} className={`flex items-end gap-3 max-w-[85%] ${isInstructor ? 'ml-auto flex-row-reverse' : ''}`}>
                                            {!isInstructor && (
                                                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                                    <User size={16} />
                                                </div>
                                            )}
                                            
                                            <div className={`flex flex-col gap-1 ${isInstructor ? 'items-end' : 'items-start'}`}>
                                                <div className="flex items-baseline gap-2 mx-1">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{isInstructor ? 'Siz' : 'Öğrenci'}</span>
                                                    <span className="text-[9px] text-gray-300 font-medium">{msg.timestamp}</span>
                                                </div>
                                                <div className={`px-5 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm
                                                    ${isInstructor ? 'bg-sky-500 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm'}`}
                                                >
                                                    {msg.type === 'image' ? (
                                                        <img src={msg.fileUrl || msg.content} alt="Resim" className="max-w-full rounded-lg max-h-60 object-contain cursor-pointer" onClick={() => window.open(msg.fileUrl || msg.content, '_blank')} />
                                                    ) : msg.type === 'file' ? (
                                                        <a href={msg.fileUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-2 hover:underline font-bold ${isInstructor ? 'text-sky-100' : 'text-sky-600'}`}>
                                                            <Paperclip size={16} />
                                                            <span>{msg.fileName || 'Dosya İndir'}</span>
                                                        </a>
                                                    ) : (
                                                        msg.content
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                            <div className="p-4 bg-white border-t border-gray-100">
                                <div className="relative flex items-end gap-2 bg-gray-50 border-2 border-gray-200 focus-within:border-sky-300 focus-within:ring-4 focus-within:ring-sky-50 rounded-2xl p-2 transition-all">
                                    <input 
                                        type="file" 
                                        id="instructor-file-input" 
                                        className="hidden" 
                                        onChange={(e) => handleFileUpload(e, 'file')} 
                                    />
                                    <input 
                                        type="file" 
                                        id="instructor-image-input" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => handleFileUpload(e, 'image')} 
                                    />
                                    <button 
                                        onClick={() => document.getElementById('instructor-file-input')?.click()}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors shrink-0"
                                    >
                                        <Paperclip size={20} />
                                    </button>
                                    <button 
                                        onClick={() => document.getElementById('instructor-image-input')?.click()}
                                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 rounded-lg transition-colors shrink-0"
                                    >
                                        <ImageIcon size={20} />
                                    </button>

                                    <textarea
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium max-h-32 min-h-[44px] py-3 resize-none text-gray-700 placeholder:text-gray-400 focus:outline-none"
                                        placeholder="Cevabınızı yazın..."
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
                                        className={`p-3 rounded-xl shadow-lg transition-all shrink-0 ${newMessage.trim() ? 'bg-sky-500 text-white hover:bg-sky-600 hover:scale-105' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                                        disabled={!newMessage.trim()}
                                    >
                                        <Send size={18} fill={newMessage.trim() ? "currentColor" : "none"} />
                                    </button>
                                </div>
                            </div>                     </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-[#F8F9FA]">
                            <div className="w-24 h-24 bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center text-4xl mb-6">
                                💬
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 font-display mb-2">Mesaj Seçin</h2>
                            <p className="text-gray-400 font-medium max-w-sm">Öğrencilerin sorularını cevaplamak için sol taraftan bir sohbet seçin.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default InstructorMessages;
