import api from '../api';

/**
 * Mesajlaşma istemcisi (bkz. backend/routers/messages.py).
 *
 * Mesajlar sunucuda saklanıyor; yeni mesaj bildirimi WebSocket üzerinden
 * yalnızca karşı tarafa geliyor ("message_new"). Eskiden sohbetler
 * localStorage'daydı ve herkese yayınlanıyordu.
 */

export type MessagingRole = 'teacher' | 'student' | 'parent';

export interface Counterpart {
    role: MessagingRole;
    id: number;
    name: string;
    online: boolean;
}

export interface ConversationSummary {
    id: number;
    topic: string;
    course_id: number | null;
    course_title: string | null;
    student_id: number | null;
    student_name: string | null;
    counterpart: Counterpart;
    last_preview: string | null;
    last_message_at: string | null;
    unread: number;
    archived: boolean;
}

export interface ChatMessage {
    id: number;
    conversation_id: number;
    sender_role: MessagingRole | 'system';
    sender_id: number | null;
    body: string;
    kind: 'text' | 'image' | 'file';
    file_url: string | null;
    file_name: string | null;
    created_at: string | null;
}

export interface Contact {
    role: MessagingRole;
    id: number;
    name: string;
    course_id: number;
    course_title: string;
    student_id?: number;
    student_name?: string;
}

export interface OutgoingMessage {
    body?: string;
    kind?: ChatMessage['kind'];
    file_url?: string;
    file_name?: string;
}

export interface StartConversation extends OutgoingMessage {
    course_id: number;
    topic?: string;
    student_id?: number;
    parent_id?: number;
    reuse?: boolean;
}

export const messagingApi = {
    contacts: () => api.get<{ contacts: Contact[] }>('/messages/contacts').then((r) => r.data.contacts),
    list: (archived = false) =>
        api.get<{ conversations: ConversationSummary[] }>('/messages/conversations', { params: { archived } })
            .then((r) => r.data.conversations),
    unread: () => api.get<{ count: number }>('/messages/unread').then((r) => r.data.count),
    open: (id: number) =>
        api.get<{ conversation: ConversationSummary; messages: ChatMessage[]; has_more: boolean }>(`/messages/conversations/${id}`)
            .then((r) => r.data),
    send: (id: number, msg: OutgoingMessage) =>
        api.post<{ message: ChatMessage }>(`/messages/conversations/${id}/messages`, msg).then((r) => r.data.message),
    start: (body: StartConversation) =>
        api.post<{ conversation: ConversationSummary; message: ChatMessage }>('/messages/conversations', body).then((r) => r.data),
    archive: (id: number, archived: boolean) =>
        api.post(`/messages/conversations/${id}/archive`, { archived }).then((r) => r.data),
    upload: async (file: File) => {
        const form = new FormData();
        form.append('file', file);
        const res = await api.post<{ url: string; filename: string }>('/builder/upload-chat-file', form);
        return res.data;
    },
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** "14:05", "Dün 09:12", "12.09.2026" — sunucu UTC yazıyor. */
export const messageTime = (iso: string | null, withDay = false) => {
    if (!iso) return '';
    const date = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
    const now = new Date();
    const time = date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) return time;
    const yesterday = new Date(now.getTime() - 86_400_000);
    if (date.toDateString() === yesterday.toDateString()) return withDay ? `Dün ${time}` : 'Dün';
    return withDay ? `${date.toLocaleDateString('tr-TR')} ${time}` : date.toLocaleDateString('tr-TR');
};
