import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Mail, Megaphone, Send, Trash2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api';
import { preferredCourse, rememberCourse } from './activeCourse';

/**
 * Duyurular: kursun tamamına ya da tek şubeye "yarın ders yok", "ödev süresi
 * uzadı" gibi tek seferde duyuru. Öğrenci panelinde görünür; istenirse
 * öğrencilere ve bağlı velilere e-postayla da gider.
 */

interface Announcement {
    id: number;
    title: string;
    body: string;
    class_id: string | null;
    class_name: string | null;
    email_sent: boolean;
    email_count: number;
    created_at: string | null;
}

const when = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

const InstructorAnnouncements: React.FC<{ coursesData?: any[] }> = ({ coursesData = [] }) => {
    const courses = useMemo(() => (coursesData || []).map((c: any) => ({
        id: Number(c.id), title: String(c.title),
        classes: (c.classes || []).filter((x: any) => x && x.id != null).map((x: any) => ({ id: String(x.id), name: x.name || 'Şube' })),
    })), [coursesData]);
    const [courseId, setCourseId] = useState<number | null>(null);
    const course = courses.find((c) => c.id === courseId);

    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [classId, setClassId] = useState('');
    const [sendEmail, setSendEmail] = useState(false);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
    const [list, setList] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(false);

    const [params] = useSearchParams();
    const paramCourse = params.get('course');
    useEffect(() => {
        if (courseId === null && courses.length) setCourseId(preferredCourse(courses.map((c) => c.id), paramCourse));
    }, [courses, courseId, paramCourse]);
    useEffect(() => rememberCourse(courseId), [courseId]);

    const load = useCallback(async () => {
        if (!courseId) return;
        setLoading(true);
        try {
            const res = await api.get(`/announcements/courses/${courseId}`);
            setList(res.data.announcements || []);
        } catch {
            setList([]);
        } finally {
            setLoading(false);
        }
    }, [courseId]);

    useEffect(() => { void load(); }, [load]);

    const publish = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) return;
        setBusy(true);
        setMessage(null);
        try {
            const res = await api.post(`/announcements/courses/${courseId}`, {
                title: title.trim(), body: body.trim(), class_id: classId || null, send_email: sendEmail,
            });
            const a: Announcement = res.data.announcement;
            setList((prev) => [a, ...prev]);
            setTitle('');
            setBody('');
            setMessage({
                ok: true,
                text: `Duyuru ${res.data.recipients} öğrenciye yayınlandı${a.email_sent ? `, ${a.email_count} adrese e-posta gönderiliyor` : ''}.`,
            });
        } catch (err: any) {
            setMessage({ ok: false, text: err?.response?.data?.detail || 'Duyuru yayınlanamadı.' });
        } finally {
            setBusy(false);
        }
    };

    const remove = async (id: number) => {
        if (!window.confirm('Duyuru silinsin mi? Öğrenci panelinden de kalkar (gönderilmiş e-postalar geri alınamaz).')) return;
        await api.delete(`/announcements/${id}`);
        setList((prev) => prev.filter((a) => a.id !== id));
    };

    if (!courses.length) {
        return (
            <div className="p-10 text-center text-slate-400 font-bold bg-white rounded-3xl border border-dashed border-slate-200">
                Duyuru yapmak için önce bir kurs oluştur.
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3"><Megaphone className="text-orange-500" /> Duyurular</h1>
                <p className="text-slate-500 font-bold mt-1">Kursun tamamına ya da bir şubeye tek seferde duyuru yap.</p>
            </div>

            <form onSubmit={publish} className="bg-white rounded-3xl border-2 border-slate-100 p-5 space-y-4">
                <div className="flex flex-wrap gap-3">
                    <label className="flex flex-col gap-1 min-w-[200px] flex-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kurs</span>
                        <select value={courseId ?? ''} onChange={(e) => { setCourseId(Number(e.target.value)); setClassId(''); setMessage(null); }}
                                className="p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold">
                            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 min-w-[160px]">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kime</span>
                        <select value={classId} onChange={(e) => setClassId(e.target.value)}
                                className="p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold">
                            <option value="">Tüm kurs</option>
                            {(course?.classes || []).map((c: { id: string; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required
                       placeholder="Başlık (ör. Yarın ders yok)" aria-label="Duyuru başlığı"
                       className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-orange-300" />
                <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} required rows={4}
                          placeholder="Duyuru metni" aria-label="Duyuru metni"
                          className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold outline-none focus:border-orange-300 resize-y" />
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} className="w-4 h-4" />
                        <Mail size={16} className="text-slate-400" /> Öğrencilere ve velilere e-postayla da gönder
                    </label>
                    <button type="submit" disabled={busy || !title.trim() || !body.trim()}
                            className="px-6 py-3 rounded-xl font-black text-sm bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2">
                        {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Yayınla
                    </button>
                </div>
                {message && (
                    <p className={`text-sm font-bold rounded-xl px-3 py-2 flex items-center gap-2 ${message.ok ? 'text-emerald-700 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                        {message.ok && <Check size={16} />} {message.text}
                    </p>
                )}
            </form>

            <section className="space-y-3">
                <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest">Yayınlananlar</h2>
                {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="animate-spin text-orange-500" /></div>
                ) : list.length === 0 ? (
                    <p className="p-8 text-center text-slate-400 font-bold bg-white rounded-3xl border border-dashed border-slate-200">Bu kursta henüz duyuru yok.</p>
                ) : list.map((a) => (
                    <article key={a.id} className="bg-white rounded-2xl border-2 border-slate-100 p-4 flex gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-black text-slate-800">{a.title}</h3>
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-500">
                                    {a.class_name || 'Tüm kurs'}
                                </span>
                                {a.email_sent && (
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-50 text-sky-600 flex items-center gap-1">
                                        <Mail size={10} /> {a.email_count} e-posta
                                    </span>
                                )}
                            </div>
                            <p className="text-sm font-medium text-slate-600 whitespace-pre-line">{a.body}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2">{when(a.created_at)}</p>
                        </div>
                        <button onClick={() => void remove(a.id)} title="Sil" aria-label="Duyuruyu sil"
                                className="self-start p-2 rounded-xl text-slate-300 hover:text-rose-500 hover:bg-rose-50">
                            <Trash2 size={16} />
                        </button>
                    </article>
                ))}
            </section>
        </div>
    );
};

export default InstructorAnnouncements;
