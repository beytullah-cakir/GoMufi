import React, { useEffect, useState } from 'react';
import {
    BookOpen, CalendarCheck, ChevronLeft, ClipboardList, FileText, Flame, Loader2, MessageSquare, ShieldCheck, Target, Trophy,
} from 'lucide-react';
import {
    parentApi, shortDate, type ChildOverview, type ConsentState, type ParentReportView,
} from './parentApi';
import { AnnouncementFeed, AttendanceCard } from '../shared/SchoolNotices';

/**
 * Velinin çocuğuna ait detay sayfası.
 *
 * Eskiden bu sayfa uydurma sayılarla doluydu ("42 saat çalışma", "%95 katılım",
 * "#452 sıralama", örnek ders geçmişi ve sabit bir "eğitmen notu"). Artık:
 * kurs başına gerçek ilerleme ve ödev durumu, öğretmenin GÖNDERDİĞİ raporlar
 * ve velinin yazım kaydı kararı.
 */

interface StudentDetailProps {
    student: any;
    onBack: () => void;
    onMessage?: () => void;
}

const ParentStudentDetail: React.FC<StudentDetailProps> = ({ student: initialStudent, onBack, onMessage }) => {
    const id: number = initialStudent?.id;
    const [overview, setOverview] = useState<ChildOverview | null>(null);
    const [reports, setReports] = useState<ParentReportView[] | null>(null);
    const [consent, setConsent] = useState<ConsentState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savingConsent, setSavingConsent] = useState(false);

    useEffect(() => {
        let alive = true;
        Promise.all([parentApi.overview(id), parentApi.reports(id), parentApi.consent(id)])
            .then(([o, r, c]) => { if (alive) { setOverview(o); setReports(r); setConsent(c); } })
            .catch((err) => { if (alive) setError(err?.response?.data?.detail || 'Bilgiler yüklenemedi.'); });
        return () => { alive = false; };
    }, [id]);

    const decide = async (status: 'granted' | 'denied') => {
        setSavingConsent(true);
        try {
            await parentApi.setConsent(id, status);
            setConsent((c) => (c ? { ...c, status, decided_at: new Date().toISOString() } : c));
        } finally {
            setSavingConsent(false);
        }
    };

    if (error) return <p className="p-8 text-center text-rose-600 font-bold">{error}</p>;
    if (!overview) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                <p className="text-gray-500 font-bold uppercase tracking-widest">Öğrenci verileri yükleniyor…</p>
            </div>
        );
    }

    const s = overview.student;
    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-3 bg-white rounded-2xl border-2 border-gray-100 text-gray-400 hover:text-purple-600 hover:border-purple-200 transition-all shadow-sm">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-gray-800">{s.first_name} — gelişim</h2>
                    <p className="text-gray-500 font-medium">Kurslar, ödevler ve öğretmenin raporları</p>
                </div>
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-xl shadow-purple-100 flex flex-col md:flex-row items-center gap-8">
                <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${s.nickname || s.id}`}
                    className="w-28 h-28 rounded-[2rem] bg-white border-4 border-white/30"
                    alt={s.first_name}
                />
                <div className="flex-1 text-center md:text-left">
                    {s.grade_level && (
                        <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20">
                            {s.grade_level}
                        </span>
                    )}
                    <h3 className="text-4xl font-black mt-2">{s.first_name} {s.last_name}</h3>
                    <p className="text-purple-100 font-medium">Öğrenci kodu: {s.student_code}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
                        <Trophy className="w-5 h-5 mx-auto mb-1 text-yellow-300" />
                        <div className="text-2xl font-black">{s.xp}</div>
                        <div className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">Toplam XP</div>
                    </div>
                    <div className="bg-white/10 p-4 rounded-2xl border border-white/10 text-center">
                        <Flame className="w-5 h-5 mx-auto mb-1 text-orange-300" />
                        <div className="text-2xl font-black">{s.streak} gün</div>
                        <div className="text-[10px] font-bold text-purple-200 uppercase tracking-widest">Günlük seri</div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
                        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
                            <Target className="w-6 h-6 text-purple-500" /> Kurslar
                        </h3>
                        {overview.courses.length === 0 && <p className="text-gray-400 font-bold">Kayıtlı olduğu bir kurs yok.</p>}
                        <div className="space-y-6">
                            {overview.courses.map((c) => (
                                <div key={c.id} className="p-5 rounded-3xl bg-gray-50 border border-gray-100 space-y-4">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="font-black text-gray-800 flex items-center gap-2"><BookOpen className="w-4 h-4 text-indigo-500" /> {c.title}</p>
                                            <p className="text-xs font-bold text-gray-400">Öğretmen: {c.teacher}</p>
                                        </div>
                                        <span className="text-lg font-black text-gray-800">%{c.progress}</span>
                                    </div>
                                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.progress}%` }} />
                                    </div>
                                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-bold text-gray-500">
                                        <span>{c.modules_done}/{c.modules_total} modül</span>
                                        <span>{c.tasks_solved} görev tamamlandı</span>
                                        <span className="flex items-center gap-1"><CalendarCheck className="w-3.5 h-3.5" /> Son 14 günde {c.active_days_14} gün çalıştı</span>
                                        <span>Son çalışma: {shortDate(c.last_activity_at)}</span>
                                    </div>
                                    {c.homework.length > 0 && (
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                                                <ClipboardList className="w-3.5 h-3.5" /> Ödevler
                                            </p>
                                            {c.homework.map((h) => (
                                                <div key={h.title} className="flex items-center justify-between gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100">
                                                    <span className="text-sm font-bold text-gray-700">{h.title}</span>
                                                    <span className={`text-xs font-black ${
                                                        h.grade !== null ? 'text-emerald-600' : h.submitted ? 'text-sky-600' : h.overdue ? 'text-rose-600' : 'text-gray-400'}`}>
                                                        {h.grade !== null ? `${h.grade}/100`
                                                            : h.submitted ? 'Teslim edildi, değerlendiriliyor'
                                                            : h.overdue ? 'Teslim edilmedi (süre doldu)'
                                                            : h.due_at ? `Son teslim ${shortDate(h.due_at)}` : 'Henüz teslim edilmedi'}
                                                        {h.late && ' · geç'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm">
                        <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-3">
                            <FileText className="w-6 h-6 text-orange-500" /> Öğretmen raporları
                        </h3>
                        {reports && reports.length === 0 && (
                            <p className="text-gray-400 font-bold">Öğretmen henüz bir rapor göndermedi.</p>
                        )}
                        <div className="space-y-4">
                            {reports?.map((r, i) => (
                                <details key={r.id} open={i === 0} className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                                    <summary className="cursor-pointer font-black text-gray-800">
                                        {r.course} · {shortDate(r.period_start)} – {shortDate(r.period_end)}
                                    </summary>
                                    <div className="mt-3 space-y-3 text-sm text-gray-700">
                                        <p className="leading-relaxed">{r.content.summary}</p>
                                        {r.content.learned.length > 0 && (
                                            <div>
                                                <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-1">Öğrendikleri</p>
                                                <ul className="list-disc pl-5 space-y-0.5">{r.content.learned.map((t) => <li key={t}>{t}</li>)}</ul>
                                            </div>
                                        )}
                                        {r.content.focus.length > 0 && (
                                            <div>
                                                <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Üzerinde çalışıyoruz</p>
                                                <ul className="list-disc pl-5 space-y-0.5">{r.content.focus.map((t) => <li key={t}>{t}</li>)}</ul>
                                            </div>
                                        )}
                                        {r.content.homework && <p><b>Ödevler:</b> {r.content.homework}</p>}
                                        {r.content.teacher_note && (
                                            <p className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 italic text-indigo-900">“{r.content.teacher_note}”</p>
                                        )}
                                    </div>
                                </details>
                            ))}
                        </div>
                    </section>
                </div>

                <div className="space-y-8">
                    <AttendanceCard studentId={id} />
                    <AnnouncementFeed courseIds={overview.courses.map((c) => c.id)} />

                    <section className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-lg shadow-indigo-100">
                        <h3 className="text-xl font-black mb-3 flex items-center gap-3">
                            <MessageSquare className="w-6 h-6 text-indigo-300" /> Öğretmene yaz
                        </h3>
                        <p className="text-sm text-indigo-100 mb-5">Sorularınızı çocuğunuzun öğretmenine doğrudan iletebilirsiniz.</p>
                        <button onClick={onMessage} className="w-full py-4 bg-white text-indigo-600 font-black rounded-xl hover:bg-indigo-50 transition-colors shadow-sm">
                            Eğitmene Mesaj Gönder
                        </button>
                    </section>

                    {consent && (
                        <section className="bg-white p-6 rounded-[2.5rem] border-2 border-gray-100 shadow-sm space-y-3">
                            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-emerald-500" /> {consent.notice.title}
                            </h3>
                            {consent.notice.paragraphs.map((p) => (
                                <p key={p.slice(0, 24)} className="text-xs text-gray-600 leading-relaxed">{p}</p>
                            ))}
                            <p className="text-xs font-black text-gray-700">
                                Şu anki durum: {consent.status === 'denied' ? 'Kapalı' : consent.status === 'granted' ? 'Açık (onay verdiniz)' : 'Açık (henüz karar vermediniz)'}
                            </p>
                            <div className="flex gap-2">
                                <button onClick={() => void decide('granted')} disabled={savingConsent || consent.status === 'granted'}
                                        className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-600 text-white disabled:opacity-50">
                                    Onaylıyorum
                                </button>
                                <button onClick={() => void decide('denied')} disabled={savingConsent || consent.status === 'denied'}
                                        className="flex-1 py-2.5 rounded-xl text-xs font-black bg-white border-2 border-gray-200 text-gray-700 disabled:opacity-50">
                                    Kapat
                                </button>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ParentStudentDetail;
