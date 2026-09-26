import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Archive, ArchiveRestore, ArrowLeft, Image as ImageIcon, Loader2, MessageCircle, Paperclip, Plus,
    Search, Send, X,
} from 'lucide-react';
import { useWebSocketEvent } from '../hooks/useWebSocket';
import {
    MAX_UPLOAD_BYTES, messageTime, messagingApi,
    type ChatMessage, type Contact, type ConversationSummary, type MessagingRole, type OutgoingMessage,
} from './messagingApi';

/**
 * Öğretmen, öğrenci ve velinin ortak mesaj ekranı.
 *
 * Solda yazışmalar, sağda seçili yazışma. Mesaj sunucuya yazıldıktan sonra
 * gösterilir; karşı taraftan gelen mesaj WebSocket ile (yalnızca bu kişiye)
 * anında düşer. Sayfa yenilense, cihaz değişse de geçmiş kaybolmaz.
 */

export interface ChatTarget {
    courseId?: number;
    studentId?: number;
    parentId?: number;
}

interface Props {
    role: MessagingRole;
    heading: string;
    subheading?: string;
    /** Açılışta bu kişiyle yazışmaya git ("mesaj gönder" bağlantıları). */
    target?: ChatTarget;
}

const ROLE_LABEL: Record<string, string> = { teacher: 'Öğretmen', student: 'Öğrenci', parent: 'Veli' };

const contactKey = (c: Pick<Contact, 'role' | 'id' | 'course_id'> & { student_id?: number }) =>
    `${c.role}-${c.id}-${c.course_id}-${c.student_id ?? ''}`;

const errorText = (err: any, fallback: string) => err?.response?.data?.detail || fallback;

const ChatPanel: React.FC<Props> = ({ role, heading, subheading, target }) => {
    const [archivedView, setArchivedView] = useState(false);
    const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
    const [listError, setListError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [threadLoading, setThreadLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [composer, setComposer] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState<string | null>(null);
    const [newOpen, setNewOpen] = useState(false);
    const [preset, setPreset] = useState<ChatTarget | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const targetHandled = useRef(false);

    const loadList = useCallback((archived: boolean) => {
        messagingApi.list(archived)
            .then((list) => { setConversations(list); setListError(null); })
            .catch((err) => setListError(errorText(err, 'Yazışmalar yüklenemedi.')));
    }, []);

    useEffect(() => { loadList(archivedView); }, [archivedView, loadList]);

    const openConversation = useCallback(async (id: number) => {
        setSelectedId(id);
        setThreadLoading(true);
        setSendError(null);
        try {
            const data = await messagingApi.open(id);
            setMessages(data.messages);
            setConversations((prev) => prev?.map((c) => (c.id === id ? { ...data.conversation, unread: 0 } : c)) ?? prev);
        } catch (err) {
            setSendError(errorText(err, 'Yazışma açılamadı.'));
        } finally {
            setThreadLoading(false);
        }
    }, []);

    // "Mesaj gönder" bağlantısı: o kişiyle bir yazışma varsa aç, yoksa yeni mesaj penceresi.
    useEffect(() => {
        if (!target || targetHandled.current || conversations === null || archivedView) return;
        targetHandled.current = true;
        const wantRole = target.parentId ? 'parent' : role === 'teacher' ? 'student' : 'teacher';
        const wantId = target.parentId ?? (role === 'teacher' ? target.studentId : undefined);
        const existing = conversations.find((c) =>
            (!target.courseId || c.course_id === target.courseId)
            && c.counterpart.role === wantRole
            && (wantId === undefined || c.counterpart.id === wantId)
            && (role !== 'parent' || !target.studentId || c.student_id === target.studentId));
        if (existing) {
            void openConversation(existing.id);
        } else {
            setPreset(target);
            setNewOpen(true);
        }
    }, [target, conversations, archivedView, role, openConversation]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ block: 'end' });
    }, [messages, selectedId]);

    useWebSocketEvent('message_new', (event) => {
        const incoming = event.message as ChatMessage;
        const summary = event.conversation as ConversationSummary;
        const isOpen = incoming.conversation_id === selectedId;
        if (isOpen) {
            setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
            // Açık yazışmada gelen mesaj okunmuş sayılır.
            void messagingApi.open(incoming.conversation_id).catch(() => undefined);
        }
        if (!archivedView) {
            setConversations((prev) => {
                const rest = (prev ?? []).filter((c) => c.id !== summary.id);
                return [{ ...summary, unread: isOpen ? 0 : summary.unread }, ...rest];
            });
        }
    });

    const selected = conversations?.find((c) => c.id === selectedId) ?? null;
    const q = search.trim().toLocaleLowerCase('tr');
    const visible = (conversations ?? []).filter((c) => !q
        || `${c.counterpart.name} ${c.topic} ${c.course_title ?? ''} ${c.student_name ?? ''}`.toLocaleLowerCase('tr').includes(q));

    const bumpConversation = (id: number, msg: ChatMessage) =>
        setConversations((prev) => {
            if (!prev) return prev;
            const found = prev.find((c) => c.id === id);
            if (!found) return prev;
            const preview = msg.kind === 'image' ? 'Görsel' : msg.kind === 'file' ? `Dosya: ${msg.file_name || 'dosya'}` : msg.body;
            return [{ ...found, last_preview: preview, last_message_at: msg.created_at, unread: 0 },
                ...prev.filter((c) => c.id !== id)];
        });

    const send = async (payload: OutgoingMessage) => {
        if (!selectedId) return;
        setSending(true);
        setSendError(null);
        try {
            const msg = await messagingApi.send(selectedId, payload);
            setMessages((prev) => [...prev, msg]);
            bumpConversation(selectedId, msg);
            if (payload.kind === undefined || payload.kind === 'text') setComposer('');
        } catch (err) {
            setSendError(errorText(err, 'Mesaj gönderilemedi.'));
        } finally {
            setSending(false);
        }
    };

    const sendFile = async (file: File | undefined, kind: 'image' | 'file') => {
        if (!file) return;
        if (file.size > MAX_UPLOAD_BYTES) {
            setSendError('Dosya 5 MB sınırını aşıyor.');
            return;
        }
        setSending(true);
        try {
            const uploaded = await messagingApi.upload(file);
            setSending(false);
            await send({ kind, file_url: uploaded.url, file_name: file.name });
        } catch (err) {
            setSending(false);
            setSendError(errorText(err, 'Dosya yüklenemedi.'));
        }
    };

    const toggleArchive = async () => {
        if (!selected) return;
        await messagingApi.archive(selected.id, !selected.archived).catch(() => undefined);
        setConversations((prev) => prev?.filter((c) => c.id !== selected.id) ?? prev);
        setSelectedId(null);
        setMessages([]);
    };

    const started = (summary: ConversationSummary, first: ChatMessage) => {
        setNewOpen(false);
        setPreset(null);
        setArchivedView(false);
        setConversations((prev) => [summary, ...(prev ?? []).filter((c) => c.id !== summary.id)]);
        setSelectedId(summary.id);
        setMessages([]);
        void openConversation(summary.id).then(() => {
            setMessages((prev) => (prev.some((m) => m.id === first.id) ? prev : [...prev, first]));
        });
    };

    return (
        <div className="w-full h-full min-h-[560px] flex flex-col md:flex-row gap-4">
            {/* --- Yazışmalar --- */}
            <aside className={`w-full md:w-[340px] md:shrink-0 flex-col bg-white rounded-3xl border-2 border-b-4 border-gray-200 overflow-hidden ${selectedId ? 'hidden md:flex' : 'flex flex-1 md:flex-none'}`}>
                <div className="p-4 border-b border-gray-100 bg-gray-50/60 space-y-3">
                    <div>
                        <h2 className="text-lg font-black text-gray-800">{heading}</h2>
                        {subheading && <p className="text-[11px] font-bold text-gray-400">{subheading}</p>}
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Kişi, konu ya da kurs ara…"
                            className="w-full pl-9 pr-3 py-2 bg-white border-2 border-gray-100 rounded-xl text-sm font-medium outline-none focus:border-indigo-300"
                        />
                    </div>
                    <div className="flex p-1 bg-gray-200/50 rounded-xl">
                        {[false, true].map((archived) => (
                            <button
                                key={String(archived)}
                                onClick={() => { setArchivedView(archived); setSelectedId(null); setMessages([]); }}
                                className={`flex-1 py-1.5 text-xs font-black rounded-lg transition-all ${archivedView === archived ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
                            >
                                {archived ? 'Arşiv' : 'Gelen kutusu'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {listError && <p className="text-xs font-bold text-rose-600 p-3">{listError}</p>}
                    {conversations === null && !listError && (
                        <p className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400 p-6">
                            <Loader2 size={14} className="animate-spin" /> Yükleniyor…
                        </p>
                    )}
                    {conversations !== null && visible.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center text-gray-300 p-8 gap-2">
                            <MessageCircle size={40} />
                            <p className="text-xs font-bold text-gray-400">
                                {archivedView ? 'Arşivde yazışma yok.' : 'Henüz yazışma yok.'}
                            </p>
                        </div>
                    )}
                    {visible.map((c) => (
                        <button
                            key={c.id}
                            onClick={() => void openConversation(c.id)}
                            className={`w-full text-left p-3 rounded-2xl border-2 transition-all ${
                                selectedId === c.id ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-transparent hover:border-gray-100'}`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-black text-gray-800 truncate flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${c.counterpart.online ? 'bg-green-500' : 'bg-gray-300'}`} />
                                    {c.counterpart.name}
                                </span>
                                <span className="text-[10px] font-bold text-gray-400 shrink-0">{messageTime(c.last_message_at)}</span>
                            </div>
                            <p className="text-[11px] font-bold text-gray-400 truncate">
                                {c.course_title}{c.topic ? ` · ${c.topic}` : ''}
                            </p>
                            <div className="flex items-end justify-between gap-2 mt-1">
                                <p className="text-xs text-gray-500 font-medium line-clamp-1 flex-1">{c.last_preview}</p>
                                {c.unread > 0 && (
                                    <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md">{c.unread}</span>
                                )}
                            </div>
                        </button>
                    ))}
                </div>
                <div className="p-3 border-t border-gray-100">
                    <button
                        onClick={() => { setPreset(null); setNewOpen(true); }}
                        className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
                    >
                        <Plus size={18} /> {role === 'teacher' ? 'YENİ MESAJ' : 'YENİ SORU SOR'}
                    </button>
                </div>
            </aside>

            {/* --- Seçili yazışma --- */}
            <section className={`flex-1 flex-col bg-white rounded-3xl border-2 border-b-4 border-gray-200 overflow-hidden min-h-[480px] ${selectedId ? 'flex' : 'hidden md:flex'}`}>
                {!selected ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 gap-3 p-8">
                        <MessageCircle size={56} />
                        <p className="text-sm font-bold text-gray-400 text-center max-w-xs">
                            Soldan bir yazışma seç ya da yeni bir mesaj başlat.
                        </p>
                    </div>
                ) : (
                    <>
                        <header className="p-4 border-b border-gray-100 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <button onClick={() => setSelectedId(null)} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
                                    <ArrowLeft size={18} />
                                </button>
                                <div className="min-w-0">
                                    <h3 className="font-black text-gray-800 truncate">{selected.counterpart.name}</h3>
                                    <p className="text-[11px] font-bold text-gray-400 truncate">
                                        {ROLE_LABEL[selected.counterpart.role]} · {selected.course_title}
                                        {selected.topic ? ` · ${selected.topic}` : ''}
                                        <span className={selected.counterpart.online ? 'text-green-600' : ''}>
                                            {' · '}{selected.counterpart.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={toggleArchive}
                                title={selected.archived ? 'Arşivden çıkar' : 'Arşivle'}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                            >
                                {selected.archived ? <ArchiveRestore size={18} /> : <Archive size={18} />}
                            </button>
                        </header>

                        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50/40">
                            {threadLoading && messages.length === 0 && (
                                <p className="flex items-center justify-center gap-2 text-xs font-bold text-gray-400">
                                    <Loader2 size={14} className="animate-spin" /> Mesajlar yükleniyor…
                                </p>
                            )}
                            {messages.map((m) => {
                                const mine = m.sender_role === role;
                                return (
                                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
                                            <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium whitespace-pre-wrap break-words ${
                                                mine ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-white border-2 border-gray-100 text-gray-700 rounded-tl-none'}`}>
                                                {m.kind === 'image' && m.file_url ? (
                                                    <a href={m.file_url} target="_blank" rel="noreferrer">
                                                        <img src={m.file_url} alt={m.file_name || 'Görsel'} className="max-h-60 rounded-lg" />
                                                    </a>
                                                ) : m.kind === 'file' && m.file_url ? (
                                                    <a href={m.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-bold underline underline-offset-2">
                                                        <Paperclip size={15} /> {m.file_name || 'Dosya'}
                                                    </a>
                                                ) : m.body}
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-300 mt-1 px-1">{messageTime(m.created_at, true)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={bottomRef} />
                        </div>

                        <div className="p-3 border-t border-gray-100">
                            {sendError && <p className="text-[11px] font-bold text-rose-600 mb-2">{sendError}</p>}
                            <div className="flex items-end gap-2 bg-gray-50 border-2 border-gray-200 focus-within:border-indigo-300 rounded-2xl p-2">
                                <label className="p-2 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer" title="Dosya ekle">
                                    <Paperclip size={19} />
                                    <input type="file" className="hidden" onChange={(e) => { void sendFile(e.target.files?.[0], 'file'); e.target.value = ''; }} />
                                </label>
                                <label className="p-2 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer" title="Görsel ekle">
                                    <ImageIcon size={19} />
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { void sendFile(e.target.files?.[0], 'image'); e.target.value = ''; }} />
                                </label>
                                <textarea
                                    value={composer}
                                    onChange={(e) => setComposer(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            if (composer.trim() && !sending) void send({ body: composer });
                                        }
                                    }}
                                    rows={1}
                                    placeholder="Mesajını yaz… (Shift + Enter: alt satır)"
                                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium resize-none max-h-32 min-h-[40px] py-2.5 text-gray-700"
                                />
                                <button
                                    onClick={() => void send({ body: composer })}
                                    disabled={!composer.trim() || sending}
                                    className="p-3 rounded-xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:bg-gray-200 disabled:text-gray-400"
                                >
                                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {newOpen && (
                <NewConversationModal
                    role={role}
                    preset={preset}
                    onClose={() => { setNewOpen(false); setPreset(null); }}
                    onStarted={started}
                />
            )}
        </div>
    );
};

const NewConversationModal: React.FC<{
    role: MessagingRole;
    preset: ChatTarget | null;
    onClose: () => void;
    onStarted: (summary: ConversationSummary, first: ChatMessage) => void;
}> = ({ role, preset, onClose, onStarted }) => {
    const [contacts, setContacts] = useState<Contact[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [chosen, setChosen] = useState<string>('');
    const [topic, setTopic] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        messagingApi.contacts()
            .then(setContacts)
            .catch((err) => setError(errorText(err, 'Kişiler yüklenemedi.')));
    }, []);

    const options = useMemo(() => {
        const list = contacts ?? [];
        if (!preset) return list;
        const narrowed = list.filter((c) =>
            (!preset.courseId || c.course_id === preset.courseId)
            && (!preset.studentId || c.student_id === preset.studentId)
            && (preset.parentId ? c.role === 'parent' && c.id === preset.parentId : role !== 'teacher' || c.role === 'student'));
        return narrowed.length ? narrowed : list;
    }, [contacts, preset, role]);
    const selected = options.find((c) => contactKey(c) === chosen) ?? (options.length === 1 || preset ? options[0] : undefined);

    const submit = async () => {
        if (!selected || !body.trim()) return;
        setSending(true);
        setError(null);
        try {
            const res = await messagingApi.start({
                course_id: selected.course_id,
                topic: topic.trim() || undefined,
                body,
                student_id: role === 'teacher' ? selected.student_id : role === 'parent' ? selected.student_id : undefined,
                parent_id: role === 'teacher' && selected.role === 'parent' ? selected.id : undefined,
                reuse: role === 'teacher' && !topic.trim(),
            });
            onStarted(res.conversation, res.message);
        } catch (err) {
            setError(errorText(err, 'Mesaj gönderilemedi.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 text-white flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black">{role === 'teacher' ? 'Yeni mesaj' : 'Yeni soru'}</h2>
                        <p className="text-indigo-100 text-xs font-bold">
                            {role === 'teacher' ? 'Öğrencine ya da velisine yaz.' : 'Takıldığın yeri anlat, öğretmenin görsün.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-full"><X size={18} /></button>
                </div>
                <div className="p-6 space-y-4">
                    {error && <p className="text-xs font-bold text-rose-600 bg-rose-50 rounded-xl px-3 py-2">{error}</p>}
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Kime</label>
                        {contacts === null ? (
                            <p className="text-xs font-bold text-gray-400 flex items-center gap-2"><Loader2 size={13} className="animate-spin" /> Yükleniyor…</p>
                        ) : options.length === 0 ? (
                            <p className="text-xs font-bold text-gray-500">
                                {role === 'teacher' ? 'Kurslarına kayıtlı öğrenci yok.' : 'Kayıtlı olduğun bir kurs yok.'}
                            </p>
                        ) : (
                            <select
                                value={selected ? contactKey(selected) : ''}
                                onChange={(e) => setChosen(e.target.value)}
                                className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-indigo-400"
                            >
                                {!selected && <option value="">Seç…</option>}
                                {options.map((c) => (
                                    <option key={contactKey(c)} value={contactKey(c)}>
                                        {c.name} — {c.course_title}{role === 'parent' && c.student_name ? ` (${c.student_name})` : ''}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Konu (isteğe bağlı)</label>
                        <input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            maxLength={200}
                            placeholder={role === 'teacher' ? 'ör. Ödev geri bildirimi' : 'ör. Döngüler — 3. görev'}
                            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 outline-none focus:border-indigo-400"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Mesaj</label>
                        <textarea
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={5}
                            maxLength={4000}
                            className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-medium text-gray-700 outline-none focus:border-indigo-400 resize-none"
                            placeholder={role === 'teacher' ? 'Mesajın…' : 'Nerede takıldın? Ne denedin?'}
                        />
                    </div>
                    <button
                        onClick={submit}
                        disabled={!selected || !body.trim() || sending}
                        className="w-full py-3.5 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 bg-gray-800 text-white hover:bg-gray-900 disabled:bg-gray-200 disabled:text-gray-400"
                    >
                        {sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />} Gönder
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatPanel;
