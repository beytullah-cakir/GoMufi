/**
 * InstructorHomeworkSubmissions.tsx
 * Eğitmenin öğrencilerden gelen ödev gönderilerini görebildiği, indirebildiği
 * ve AI ile değerlendirebildiği tam sayfa bileşen.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
    BookCheck, Download, User, Calendar, FileText,
    RefreshCw, ChevronDown, ChevronUp, Loader2, BrainCircuit,
    Inbox, Sparkles, AlertCircle, X, Search
} from 'lucide-react';
import api from '../../api';
import { evaluateHomework, type AIReviewResult } from '../student-pages/homeworkAIService';
import HomeworkAIReview from '../student-pages/HomeworkAIReview';

interface Submission {
    id: number;
    node_id: string;
    node_title: string;
    student_id: number;
    student_name: string;
    student_email: string;
    file_name: string;
    file_mime: string;
    file_data: string;          // base64
    student_note: string | null;
    status?: string;
    feedback?: string | null;
    submitted_at: string | null;
    approved_at?: string | null;
    student?: { id: number; first_name?: string; last_name?: string; email?: string };
}

interface Course {
    id: number;
    title: string;
}

interface InstructorHomeworkSubmissionsProps {
    coursesData?: any[];
}

const InstructorHomeworkSubmissions: React.FC<InstructorHomeworkSubmissionsProps> = ({ coursesData }) => {
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
    const [selectedHomeworkId, setSelectedHomeworkId] = useState<string>('all');
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [feedbacks, setFeedbacks] = useState<Record<number, string>>({});
    const [approvingId, setApprovingId] = useState<number | null>(null);

    // Reset selected homework filter when course changes
    useEffect(() => {
        setSelectedHomeworkId('all');
    }, [selectedCourseId]);

    const handleApproveHomework = async (sub: Submission) => {
        if (!selectedCourseId) return;
        setApprovingId(sub.id);
        try {
            const feedbackText = feedbacks[sub.id] !== undefined ? feedbacks[sub.id] : (sub.feedback || '');
            await api.post(`/courses/${selectedCourseId}/homework/${sub.id}/approve`, {
                feedback: feedbackText
            });
            setSubmissions(prev => prev.map(item => item.id === sub.id ? {
                ...item,
                status: 'approved',
                feedback: feedbackText,
                approved_at: new Date().toISOString()
            } : item));
            alert("Ödev başarıyla onaylandı ve yorumunuz kaydedildi!");
        } catch (err: any) {
            console.error("Approve error:", err);
            alert(err?.response?.data?.error || "Ödev onaylanırken hata oluştu.");
        } finally {
            setApprovingId(null);
        }
    };

    // AI review state
    const [evaluatingId, setEvaluatingId] = useState<number | null>(null);
    const [aiResult, setAiResult] = useState<AIReviewResult | null>(null);
    const [showReview, setShowReview] = useState(false);
    const [reviewSub, setReviewSub] = useState<Submission | null>(null);

    // Load instructor courses
    useEffect(() => {
        if (coursesData && coursesData.length > 0) {
            setCourses(coursesData);
            setSelectedCourseId(prev => prev ?? coursesData[0].id);
        } else {
            api.get('/teacher/content')
                .then(res => {
                    const data = res.data || [];
                    setCourses(data);
                    if (data.length > 0) setSelectedCourseId(prev => prev ?? data[0].id);
                })
                .catch(() => setError('Kurslar yüklenemedi.'));
        }
    }, [coursesData]);

    const loadSubmissions = useCallback(async (courseId: number) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get(`/courses/${courseId}/homework/all-submissions`);
            const list = Array.isArray(res.data) ? res.data : (res.data?.submissions || []);
            setSubmissions(list);
        } catch (e: any) {
            setError(e?.response?.data?.detail || 'Gönderiler yüklenemedi.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (selectedCourseId) loadSubmissions(selectedCourseId);
    }, [selectedCourseId, loadSubmissions]);

    // Download file from base64
    const downloadFile = (sub: Submission) => {
        const byteChars = atob(sub.file_data);
        const byteArr = new Uint8Array(byteChars.length);
        for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
        const blob = new Blob([byteArr], { type: sub.file_mime || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = sub.file_name;
        a.click();
        URL.revokeObjectURL(url);
    };

    // AI Evaluate
    const handleAIEvaluate = async (sub: Submission) => {
        setEvaluatingId(sub.id);
        try {
            // base64 → File
            const byteChars = atob(sub.file_data);
            const byteArr = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
            const blob = new Blob([byteArr], { type: sub.file_mime || 'application/octet-stream' });
            const file = new File([blob], sub.file_name, { type: sub.file_mime || 'application/octet-stream' });

            const result = await evaluateHomework('Ödev değerlendirmesi: Dosyayı incele ve genel bir değerlendirme yap.', file);
            setAiResult(result);
            setReviewSub(sub);
            setShowReview(true);
        } catch (err: any) {
            alert(`AI değerlendirme hatası: ${err?.message || 'Bilinmeyen hata'}`);
        } finally {
            setEvaluatingId(null);
        }
    };

    // Get unique homework tasks for the selected course
    const currentCourse = courses.find(c => c.id === selectedCourseId);
    
    const homeworkTasks = (() => {
        const tasksMap = new Map<string, string>(); // node_id -> title

        // 1. Add from curriculum
        const curriculum = currentCourse?.curriculum || [];
        curriculum.forEach((node: any) => {
            if (node && (node.theme === 'homework' || node.theme === 'ÖDEV' || node.type === 'homework')) {
                tasksMap.set(String(node.id), node.title || 'İsimsiz Ödev');
            }
        });

        // 2. Add from submissions (fallback for legacy or dynamic submissions)
        submissions.forEach(sub => {
            if (sub.node_id && !tasksMap.has(sub.node_id)) {
                tasksMap.set(sub.node_id, sub.node_title || sub.node_id);
            }
        });

        return Array.from(tasksMap.entries()).map(([id, title]) => ({ id, title }));
    })();

    const filtered = submissions.filter(s => {
        // Filter by selected homework pill
        if (selectedHomeworkId !== 'all' && s.node_id !== selectedHomeworkId) {
            return false;
        }

        const studentName = s?.student_name || '';
        const fileName = s?.file_name || '';
        const nodeId = s?.node_id || '';
        const query = search ? search.toLowerCase() : '';
        return studentName.toLowerCase().includes(query) ||
               fileName.toLowerCase().includes(query) ||
               nodeId.toLowerCase().includes(query);
    });

    const formatDate = (iso: string | null) => {
        if (!iso) return '—';
        return new Date(iso).toLocaleString('tr-TR', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getCodeContent = (fileData?: string) => {
        if (!fileData) return "Dosya içeriği boş.";
        try {
            return decodeURIComponent(escape(atob(fileData)));
        } catch {
            try {
                return atob(fileData);
            } catch {
                return "Kod içeriği okunamadı veya ikili dosya (binary).";
            }
        }
    };

    if (showReview && aiResult && reviewSub) {
        return (
            <HomeworkAIReview
                result={aiResult}
                fileName={reviewSub.file_name}
                homeworkTitle={`${reviewSub.student_name} — ${reviewSub.node_id}`}
                onBack={() => setShowReview(false)}
                onClose={() => setShowReview(false)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 p-6 font-sans">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-400/30">
                            <BookCheck size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 tracking-tight">Ödev Gönderileri</h1>
                            <p className="text-xs text-gray-400 font-bold">Öğrencilerin teslim ettiği ödevleri incele</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Course selector */}
                        <select
                            value={selectedCourseId ?? ''}
                            onChange={e => setSelectedCourseId(Number(e.target.value))}
                            className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 transition-colors cursor-pointer shadow-sm"
                        >
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title}</option>
                            ))}
                        </select>

                        {/* Refresh */}
                        <button
                            onClick={() => selectedCourseId && loadSubmissions(selectedCourseId)}
                            className="w-10 h-10 rounded-xl bg-white border-2 border-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* ── Search bar ── */}
                <div className="relative">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Öğrenci adı, dosya adı veya ders ID ile ara..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-indigo-400 transition-colors shadow-sm"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* ── Stats row ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {[
                        { label: 'Toplam Gönderim', value: submissions.length, color: 'indigo' },
                        { label: 'Benzersiz Öğrenci', value: new Set(submissions.map(s => s.student_id)).size, color: 'violet' },
                        { label: 'Benzersiz Ödev', value: new Set(submissions.map(s => s.node_id)).size, color: 'blue' },
                    ].map(stat => (
                        <div key={stat.label} className={`bg-white rounded-2xl border-2 border-${stat.color}-50 p-4 shadow-sm`}>
                            <p className={`text-2xl font-black text-${stat.color}-600`}>{stat.value}</p>
                            <p className="text-xs text-gray-400 font-bold mt-0.5">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* ── Error ── */}
                {error && (
                    <div className="bg-red-50 border-2 border-red-100 rounded-2xl px-5 py-4 flex items-center gap-3 text-red-600">
                        <AlertCircle size={18} />
                        <span className="text-sm font-bold">{error}</span>
                    </div>
                )}

                {/* ── Loading ── */}
                {isLoading && (
                    <div className="flex items-center justify-center py-20 text-indigo-400 gap-3">
                        <Loader2 size={28} className="animate-spin" />
                        <span className="text-sm font-bold">Gönderiler yükleniyor…</span>
                    </div>
                )}

                {/* ── Empty ── */}
                {!isLoading && !error && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-300 gap-4">
                        <Inbox size={52} />
                        <div className="text-center">
                            <p className="text-base font-black text-gray-400">Henüz gönderi yok</p>
                            <p className="text-xs text-gray-300 font-bold mt-1">
                                {search ? 'Arama kriterlerinize eşleşen sonuç bulunamadı.' : 'Öğrenciler ödev teslim ettikçe burada görünecek.'}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Submissions list ── */}
                {!isLoading && filtered.length > 0 && (
                    <div className="space-y-3">
                        {filtered.map(sub => {
                            const studentName = sub.student ? `${sub.student.first_name || ''} ${sub.student.last_name || ''}`.trim() : (sub.student_name || 'Öğrenci');
                            const studentEmail = sub.student?.email || sub.student_email || 'E-posta belirtilmemiş';
                            const displayContent = sub.student_note || getCodeContent(sub.file_data);

                            return (
                                <div
                                    key={sub.id}
                                    className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden transition-all hover:border-indigo-100"
                                >
                                    {/* Row */}
                                    <div className="flex items-center justify-between px-5 py-4 gap-4">
                                        {/* Student info */}
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-violet-100 flex items-center justify-center shrink-0">
                                                <User size={18} className="text-indigo-500" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-black text-gray-800 truncate">{studentName}</p>
                                                <p className="text-[11px] text-gray-400 font-bold truncate">{studentEmail}</p>
                                            </div>
                                        </div>

                                        {/* File + date */}
                                        <div className="hidden sm:flex flex-col items-start min-w-0 flex-1 px-4">
                                            <div className="flex items-center gap-1.5 text-gray-600">
                                                <FileText size={14} className="text-indigo-400 shrink-0" />
                                                <span className="text-xs font-bold truncate max-w-[200px]">{sub.file_name || 'Metin / Kod Yanıtı'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-gray-400 mt-0.5">
                                                <Calendar size={12} className="shrink-0" />
                                                <span className="text-[11px] font-bold">{formatDate(sub.submitted_at)}</span>
                                            </div>
                                        </div>

                                        {/* Node ID badge + Status Badge */}
                                        <div className="hidden md:flex items-center gap-2">
                                            <span className="text-[10px] font-black text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full shrink-0 truncate max-w-[180px]" title={sub.node_title}>
                                                {sub.node_title}
                                            </span>
                                            {sub.status === 'approved' ? (
                                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                                                    <BookCheck size={12} /> EĞİTMEN ONAYLADI
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1">
                                                    ⏳ ONAY BEKLİYOR
                                                </span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {sub.file_data && (
                                                <button
                                                    onClick={() => downloadFile(sub)}
                                                    title="Dosyayı indir"
                                                    className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-500 hover:bg-indigo-100 flex items-center justify-center transition-colors"
                                                >
                                                    <Download size={16} />
                                                </button>
                                            )}

                                            {/* Expand */}
                                            <button
                                                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                                                className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 flex items-center justify-center transition-colors"
                                            >
                                                {expandedId === sub.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded detail */}
                                    {expandedId === sub.id && (
                                        <div className="border-t-2 border-gray-50 px-5 py-4 bg-gray-50/50 space-y-4">
                                            {/* Mobile metadata */}
                                            <div className="sm:hidden space-y-1">
                                                <p className="text-xs font-bold text-gray-500">Öğrenci: <span className="text-gray-700">{studentName}</span></p>
                                                <p className="text-xs font-bold text-gray-500">Tarih: <span className="text-gray-700">{formatDate(sub.submitted_at)}</span></p>
                                                <p className="text-xs font-bold text-gray-500">Ders: <span className="text-violet-600">{sub.node_title}</span></p>
                                                <p className="text-xs font-bold text-gray-500">Durum: <span className={sub.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'}>{sub.status === 'approved' ? 'Eğitmen Onayladı' : 'Onay Bekliyor'}</span></p>
                                            </div>

                                            {/* Grid Details */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div className="bg-white rounded-xl border border-gray-200/60 p-3 shadow-xs">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">DERS / GÖREV</p>
                                                    <p className="text-xs font-bold text-gray-700">{sub.node_title}</p>
                                                </div>
                                                <div className="bg-white rounded-xl border border-gray-200/60 p-3 shadow-xs">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">TESLİM SAATİ</p>
                                                    <p className="text-xs font-bold text-gray-700">{formatDate(sub.submitted_at)}</p>
                                                </div>
                                            </div>

                                            {/* Code / Text Content Viewer */}
                                            <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-md border border-slate-800 flex flex-col">
                                                <div className="bg-slate-850 px-4 py-2.5 flex items-center justify-between border-b border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                    <span>ÖĞRENCİ YANITI / İÇERİK</span>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(displayContent);
                                                            alert("Yanıt kopyalandı!");
                                                        }}
                                                        className="text-[9px] font-black bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-white px-2 py-1 rounded transition-all cursor-pointer"
                                                    >
                                                        KOPYALA
                                                    </button>
                                                </div>
                                                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto max-h-80 whitespace-pre-wrap break-words scrollbar-thin">
                                                    <code>{displayContent || '(Yanıt metni yok)'}</code>
                                                </pre>
                                            </div>

                                            {/* Instructor Feedback + Approve Box */}
                                            <div className="bg-white rounded-2xl border-2 border-indigo-100 p-4 space-y-3 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-xs font-black text-indigo-950 uppercase tracking-wider flex items-center gap-1.5 font-display">
                                                        ✍️ Eğitmen Yorumu & Geri Bildirimi
                                                    </label>
                                                    {sub.status === 'approved' && (
                                                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                                            ✅ Onaylandı
                                                        </span>
                                                    )}
                                                </div>
                                                <textarea
                                                    className="w-full h-24 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:bg-white focus:border-indigo-400 outline-none resize-none"
                                                    placeholder="Öğrencinin ödevi hakkında yorumunuzu veya tavsiyelerinizi buraya yazın..."
                                                    value={feedbacks[sub.id] !== undefined ? feedbacks[sub.id] : (sub.feedback || '')}
                                                    onChange={(e) => setFeedbacks(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                                />
                                                <button
                                                    onClick={() => handleApproveHomework(sub)}
                                                    disabled={approvingId === sub.id}
                                                    className={`w-full py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                                                        sub.status === 'approved'
                                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                                                    }`}
                                                >
                                                    {approvingId === sub.id ? (
                                                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <>
                                                            <BookCheck size={16} />
                                                            <span>{sub.status === 'approved' ? 'YORUMU GÜNCELLE VE ONAYI YENİLE' : 'ÖDEVİ ONAYLA VEYA YORUM EKLE'}</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default InstructorHomeworkSubmissions;
