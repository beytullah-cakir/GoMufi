import React, { useEffect, useState } from "react";
import { AlertCircle, CalendarClock, CalendarCheck, ChevronRight, FileText, Flame, Loader2, MessageSquare, Trophy, UserPlus } from "lucide-react";
import api from "../../api";
import { parentApi, shortDate, type ChildSummary } from "./parentApi";

/**
 * Veli paneli: her çocuk için kısa ve GERÇEK durum.
 *
 * Eskiden bu ekran örnek verilerle doluydu ("4 saat ders kredisi", "Yarın
 * 14:00 Matematik", "Haftalık odak 8.5/10", uydurma rozetler, "harika bir
 * ilerleme" cümlesi). Artık sayılar öğrenme kaydından, raporlar öğretmenden.
 */

interface ParentDashboardProps {
    userData: any;
    teachersData?: any[];
    onOpenStudent?: (student: { id: number }) => void;
    onNavigate?: (page: string) => void;
}

const ParentDashboard: React.FC<ParentDashboardProps> = ({ userData, teachersData, onOpenStudent, onNavigate }) => {
    const [fetchedTeachers, setFetchedTeachers] = useState<any[] | null>(null);
    const [children, setChildren] = useState<ChildSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const instructors = teachersData ?? fetchedTeachers ?? [];

    useEffect(() => {
        if (teachersData) return;
        api.get("/profile/parent/teachers").then((r) => setFetchedTeachers(r.data)).catch(() => undefined);
    }, [teachersData]);

    useEffect(() => {
        let alive = true;
        parentApi.summary()
            .then((list) => { if (alive) setChildren(list); })
            .catch(() => { if (alive) setError("Özet yüklenemedi."); });
        return () => { alive = false; };
    }, []);

    const unread = (children ?? []).reduce((n, c) => n + c.unread_reports, 0);
    const dueSoon = (children ?? []).flatMap((c) => c.homework_due_soon.map((h) => ({ ...h, child: c.name })));
    const overdue = (children ?? []).reduce((n, c) => n + c.homework_overdue, 0);

    const headline = !children ? "Özet hazırlanıyor…"
        : children.length === 0 ? "Çocuğunuzun öğrenci kodunu ekleyerek gelişimini buradan takip edebilirsiniz."
        : unread ? `Öğretmenden ${unread} yeni rapor var.`
        : dueSoon.length ? `Bu hafta ${dueSoon.length} ödevin son teslim tarihi var.`
        : "Yeni bir gelişme yok; ayrıntılar için çocuğunuzun sayfasına bakabilirsiniz.";

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-xl shadow-purple-200">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black mb-2">Hoşgeldin, {userData?.first_name || 'Sayın Veli'}!</h2>
                    <p className="text-purple-100 font-medium text-lg max-w-xl">{headline}</p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            </div>

            {error && <p className="text-sm font-bold text-rose-600">{error}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    {!children && (
                        <div className="flex items-center gap-2 text-gray-400 font-bold"><Loader2 className="w-5 h-5 animate-spin" /> Yükleniyor…</div>
                    )}
                    {children?.length === 0 && (
                        <button onClick={() => onNavigate?.('Students')}
                                className="w-full p-6 bg-white rounded-[2rem] border-2 border-dashed border-purple-200 text-purple-600 font-black flex items-center justify-center gap-2">
                            <UserPlus className="w-5 h-5" /> Öğrenci ekle
                        </button>
                    )}
                    {children?.map((c) => (
                        <button key={c.student_id} onClick={() => onOpenStudent?.({ id: c.student_id })}
                                className="w-full text-left bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-black text-gray-800 group-hover:text-purple-600">{c.name}</h3>
                                    <p className="text-xs font-bold text-gray-400">{c.courses} kurs · son çalışma {shortDate(c.last_activity_at)}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                                <div className="bg-gray-50 rounded-2xl p-3">
                                    <CalendarCheck className="w-4 h-4 text-indigo-500 mb-1" />
                                    <p className="text-lg font-black text-gray-800">{c.active_days_14} gün</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Son 14 günde</p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-3">
                                    <Trophy className="w-4 h-4 text-yellow-500 mb-1" />
                                    <p className="text-lg font-black text-gray-800">{c.xp}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">XP</p>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-3">
                                    <Flame className="w-4 h-4 text-orange-500 mb-1" />
                                    <p className="text-lg font-black text-gray-800">{c.streak} gün</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Seri</p>
                                </div>
                                <div className={`rounded-2xl p-3 ${c.homework_overdue ? 'bg-rose-50' : 'bg-gray-50'}`}>
                                    <AlertCircle className={`w-4 h-4 mb-1 ${c.homework_overdue ? 'text-rose-500' : 'text-gray-300'}`} />
                                    <p className="text-lg font-black text-gray-800">{c.homework_overdue}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Geciken ödev</p>
                                </div>
                            </div>
                            {c.latest_report?.summary && (
                                <p className="mt-4 text-sm text-gray-600 bg-indigo-50/60 border border-indigo-100 rounded-2xl p-3">
                                    <span className="font-black text-indigo-700">
                                        Öğretmenden{c.unread_reports ? ' (yeni)' : ''}:
                                    </span>{' '}{c.latest_report.summary}
                                </p>
                            )}
                        </button>
                    ))}
                </div>

                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-4 flex items-center gap-2">
                            <CalendarClock className="w-5 h-5 text-orange-500" /> Yaklaşan ödevler
                        </h3>
                        {dueSoon.length === 0 ? (
                            <p className="text-sm text-gray-400 font-medium">Önümüzdeki 7 günde son tarihi olan ödev yok.</p>
                        ) : (
                            <div className="space-y-2">
                                {dueSoon.map((h) => (
                                    <div key={`${h.child}-${h.title}`} className="p-3 bg-orange-50 rounded-xl">
                                        <p className="text-sm font-black text-gray-800">{h.title}</p>
                                        <p className="text-xs font-bold text-gray-500">{h.child} · {h.course} · {shortDate(h.due_at)}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                        {overdue > 0 && <p className="text-xs font-bold text-rose-600 mt-3">{overdue} ödevin süresi doldu ve teslim edilmedi.</p>}
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                        <h3 className="font-black text-gray-800 mb-4">Eğitmenler</h3>
                        <div className="space-y-3">
                            {instructors.length === 0 ? (
                                <p className="text-gray-400 text-sm font-medium italic">Henüz bir eğitmen bulunmuyor.</p>
                            ) : instructors.slice(0, 4).map((inst: any) => (
                                <div key={inst.id} className="flex items-center gap-3">
                                    <img
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${inst.first_name}${inst.id}`}
                                        className="w-10 h-10 bg-gray-100 rounded-full border border-gray-100"
                                        alt={inst.first_name}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-bold text-gray-800 text-sm truncate">{inst.first_name} {inst.last_name}</div>
                                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider truncate">{inst.expertises || "Eğitmen"}</div>
                                    </div>
                                    <button onClick={() => onNavigate?.('Messages')} title="Mesaj gönder"
                                            className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-600 hover:text-white transition-all">
                                        <MessageSquare className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button onClick={() => onNavigate?.('Messages')}
                            className="w-full p-5 bg-blue-50 rounded-[2rem] border border-blue-100 text-left">
                        <h3 className="font-black text-blue-800 mb-1 flex items-center gap-2"><FileText className="w-4 h-4" /> Sorunuz mu var?</h3>
                        <p className="text-sm text-blue-600 font-medium">Öğretmene doğrudan mesaj yazabilirsiniz.</p>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ParentDashboard;
