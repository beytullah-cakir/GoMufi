import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookCheck, Brain, ClipboardList, HelpCircle, LayoutDashboard, Loader2, RefreshCw, Tags, Users, Microscope, Table2 } from 'lucide-react';
import api from '../../../api';
import { useWebSocket } from '../../../hooks/useWebSocket';
import { errorText, learningApi, type Scope } from './learningApi';
import GradebookTab from './GradebookTab';
import CodeReplayModal from './CodeReplayModal';
import ConceptMapTab from './ConceptMapTab';
import HomeworkTab from './HomeworkTab';
import { PracticeTaskModal, type PracticeTarget } from './InsightCard';
import MisconceptionsTab from './MisconceptionsTab';
import MebReportCard from './MebReportCard';
import OverviewTab from './OverviewTab';
import StudentsTab, { StudentProfileView } from './StudentsTab';
import TasksTab, { TaskDetailView } from './TasksTab';

/**
 * Öğrenme Analizi: öğretmenin "kim nerede takılıyor, hangi konuda zorlanıyor"
 * sorusunun cevabı. Veri: backend/routers/analytics.py.
 *
 * Sayfa canlı: bir öğrenci görevde bir şey yaptığında sunucu yalnızca bu
 * öğretmene haber veriyor (WebSocket), açık sekme birkaç saniye içinde yenileniyor.
 */

type Tab = 'overview' | 'misconceptions' | 'concepts' | 'tasks' | 'students' | 'homework' | 'gradebook';

const TABS: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Genel Bakış', icon: LayoutDashboard },
    { id: 'misconceptions', label: 'Neyi Anlamadılar?', icon: HelpCircle },
    { id: 'concepts', label: 'Kazanım Haritası', icon: Brain },
    { id: 'tasks', label: 'Görevler', icon: ClipboardList },
    { id: 'students', label: 'Öğrenciler', icon: Users },
    { id: 'homework', label: 'Ödevler', icon: BookCheck },
    { id: 'gradebook', label: 'Not Defteri', icon: Table2 },
];

interface CourseOption { id: number; title: string; classes: Array<{ id: string; name: string }> }

/** "Şu tarihten beri" hazır seçenekleri (Türkiye saatiyle gün başı). */
const dayString = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sinceOptions = () => {
    const now = new Date();
    const days = (n: number) => dayString(new Date(now.getTime() - n * 86_400_000));
    // Eğitim yılı eylülde başlar.
    const termYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    return [
        { value: '', label: 'Tüm zamanlar' },
        { value: days(7), label: 'Son 7 gün' },
        { value: days(30), label: 'Son 30 gün' },
        { value: `${termYear}-09-01`, label: 'Bu eğitim yılı' },
    ];
};

const TAB_IDS = TABS.map((t) => t.id) as string[];

const InstructorLearning: React.FC<{ coursesData?: any[] }> = ({ coursesData }) => {
    // Başka sayfalardan doğrudan açılabilsin: ana panel, öğrenci listesi,
    // son etkinlikler "?course=…&student=…&tab=…" ile buraya bağlanıyor.
    const [params] = useSearchParams();
    const paramCourse = Number(params.get('course')) || null;
    const paramStudent = Number(params.get('student')) || null;
    const paramTab = params.get('tab');
    const [courses, setCourses] = useState<CourseOption[]>([]);
    const [courseId, setCourseId] = useState<number | null>(paramCourse);
    const [tab, setTab] = useState<Tab>(
        paramStudent ? 'students' : params.get('task') ? 'tasks'
            : paramTab && TAB_IDS.includes(paramTab) ? (paramTab as Tab) : 'overview',
    );
    const [studentId, setStudentId] = useState<number | null>(paramStudent);
    const [taskKey, setTaskKey] = useState<string | null>(params.get('task'));
    const [replay, setReplay] = useState<{ studentId: number; name: string; taskKey: string } | null>(null);
    const [practice, setPractice] = useState<PracticeTarget | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [tagging, setTagging] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const [classId, setClassId] = useState<string>('');
    const [since, setSince] = useState<string>('');
    const [sinceChoices] = useState(sinceOptions);
    const scope: Scope = { classId: classId || null, since: since || null };
    const { lastMessage } = useWebSocket();

    useEffect(() => {
        const apply = (list: any[]) => {
            const data = list.map((c: any) => ({
                id: c.id, title: c.title,
                classes: (c.classes || []).filter((x: any) => x && x.id != null).map((x: any) => ({ id: String(x.id), name: x.name || 'Şube' })),
            }));
            setCourses(data);
            if (data.length) setCourseId((prev) => prev ?? data[0].id);
        };
        if (coursesData?.length) apply(coursesData);
        else api.get('/teacher/content').then((r) => apply(r.data || [])).catch(() => setNotice('Kurslar yüklenemedi.'));
    }, [coursesData]);

    // Canlı yenileme: bu kursta bir görev olayı geldiyse kısa bir gecikmeyle
    // yeniden çek (aynı anda 20 öğrenci kontrol ederse 20 kez değil, bir kez).
    useEffect(() => {
        if (lastMessage?.type !== 'task_event' || Number(lastMessage.courseId) !== courseId) return;
        const timer = setTimeout(() => setRefreshKey((k) => k + 1), 2500);
        return () => clearTimeout(timer);
    }, [lastMessage, courseId]);

    const openStudent = (id: number) => { setTaskKey(null); setStudentId(id); setTab('students'); };
    const openTask = (key: string) => { setStudentId(null); setTaskKey(key); setTab('tasks'); };
    const openPractice = (conceptId: string) => setPractice({ conceptId });
    const openReplay = (sid: number, name: string, key: string) => setReplay({ studentId: sid, name, taskKey: key });

    const tagConcepts = async () => {
        if (!courseId) return;
        setTagging(true);
        setNotice(null);
        try {
            const res = await learningApi.tagConcepts(courseId);
            setNotice(res.dictionary_missing
                ? 'Bu kursun dili için kavram sözlüğü yok; önce yol haritası oluşturucudan sözlüğü onayla.'
                : res.tagged ? `${res.tagged} modüle kavram etiketi eklendi.` : (res.message || 'Etiketlenecek modül yok.'));
            setRefreshKey((k) => k + 1);
        } catch (err) {
            setNotice(errorText(err, 'Kavramlar etiketlenemedi.'));
        } finally {
            setTagging(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-violet-50/20 p-6 font-sans">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-400/30">
                            <Microscope size={22} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-800 tracking-tight">Öğrenme Analizi</h1>
                            <p className="text-xs text-gray-400 font-bold">Kim nerede takılıyor, hangi konuda zorlanıyor</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={courseId ?? ''}
                            onChange={(e) => { setCourseId(Number(e.target.value)); setStudentId(null); setTaskKey(null); setClassId(''); }}
                            className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 shadow-sm"
                        >
                            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                        {(courses.find((c) => c.id === courseId)?.classes.length ?? 0) > 0 && (
                            <select
                                value={classId}
                                onChange={(e) => setClassId(e.target.value)}
                                title="Şube"
                                className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 shadow-sm"
                            >
                                <option value="">Tüm şubeler</option>
                                {courses.find((c) => c.id === courseId)?.classes.map((cl) => (
                                    <option key={cl.id} value={cl.id}>{cl.name}</option>
                                ))}
                            </select>
                        )}
                        <select
                            value={sinceChoices.some((o) => o.value === since) ? since : 'custom'}
                            onChange={(e) => setSince(e.target.value === 'custom' ? since : e.target.value)}
                            title="Etkinlik ve teslim sayıları bu tarihten sonrasını kapsar; kazanım haritası birikimlidir."
                            className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-100 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 shadow-sm"
                        >
                            {sinceChoices.map((o) => <option key={o.label} value={o.value}>{o.label}</option>)}
                            {!sinceChoices.some((o) => o.value === since) && <option value="custom">{since} itibarıyla</option>}
                        </select>
                        <input
                            type="date"
                            value={since}
                            onChange={(e) => setSince(e.target.value)}
                            title="Şu tarihten beri"
                            className="text-sm font-bold text-gray-700 bg-white border-2 border-gray-100 rounded-xl px-2 py-1.5 focus:outline-none focus:border-indigo-400 shadow-sm"
                        />
                        <button
                            onClick={tagConcepts}
                            disabled={!courseId || tagging}
                            title="Kavram etiketi olmayan modüllere kazanım ve kavram bağlar"
                            className="flex items-center gap-1.5 text-xs font-black px-3 py-2.5 rounded-xl bg-white border-2 border-gray-100 text-gray-600 hover:border-indigo-200 disabled:opacity-50"
                        >
                            {tagging ? <Loader2 size={14} className="animate-spin" /> : <Tags size={14} />} Kavramları etiketle
                        </button>
                        <button
                            onClick={() => setRefreshKey((k) => k + 1)}
                            className="w-10 h-10 rounded-xl bg-white border-2 border-gray-100 flex items-center justify-center text-gray-400 hover:text-indigo-600"
                            title="Yenile"
                        >
                            <RefreshCw size={16} />
                        </button>
                    </div>
                </div>

                {notice && (
                    <p className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5">{notice}</p>
                )}

                <div className="flex flex-wrap gap-1.5 bg-white border-2 border-gray-100 rounded-2xl p-1.5 w-fit">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.id;
                        return (
                            <button
                                key={t.id}
                                onClick={() => { setTab(t.id); setStudentId(null); setTaskKey(null); }}
                                className={`flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl transition-colors ${
                                    active ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <Icon size={14} /> {t.label}
                            </button>
                        );
                    })}
                </div>

                {!courseId ? (
                    <p className="text-sm font-bold text-gray-400">Kurs bulunamadı.</p>
                ) : tab === 'overview' ? (
                    <OverviewTab courseId={courseId} refreshKey={refreshKey} onOpenStudent={openStudent}
                                 onOpenTask={openTask} onPractice={openPractice} onReplay={openReplay} scope={scope} />
                ) : tab === 'misconceptions' ? (
                    <MisconceptionsTab courseId={courseId} refreshKey={refreshKey} scope={scope}
                                       onOpenStudent={openStudent} onPractice={setPractice} />
                ) : tab === 'concepts' ? (
                    <div className="space-y-6">
                        <MebReportCard courseId={courseId} refreshKey={refreshKey} scope={scope} onOpenStudent={openStudent} />
                        <ConceptMapTab courseId={courseId} refreshKey={refreshKey} onOpenStudent={openStudent} onPractice={openPractice} scope={scope} />
                    </div>
                ) : tab === 'tasks' ? (
                    taskKey
                        ? <TaskDetailView courseId={courseId} taskKey={taskKey} refreshKey={refreshKey} onBack={() => setTaskKey(null)}
                                          onOpenStudent={openStudent} onReplay={openReplay} scope={scope} />
                        : <TasksTab courseId={courseId} refreshKey={refreshKey} onOpenTask={openTask} scope={scope} />
                ) : tab === 'students' ? (
                    studentId
                        ? <StudentProfileView courseId={courseId} studentId={studentId} refreshKey={refreshKey}
                                              onBack={() => setStudentId(null)} onOpenTask={openTask}
                                              onReplay={openReplay} onPractice={openPractice} />
                        : <StudentsTab courseId={courseId} refreshKey={refreshKey} onOpenStudent={openStudent} scope={scope} />
                ) : tab === 'homework' ? (
                    <HomeworkTab courseId={courseId} refreshKey={refreshKey} onOpenStudent={openStudent} onPractice={openPractice} scope={scope} />
                ) : (
                    <GradebookTab courseId={courseId} courseTitle={courses.find((c) => c.id === courseId)?.title || 'Kurs'}
                                  refreshKey={refreshKey} scope={scope} onOpenStudent={openStudent} />
                )}
            </div>

            {replay && courseId && (
                <CodeReplayModal courseId={courseId} studentId={replay.studentId} studentName={replay.name}
                                 taskKey={replay.taskKey} onClose={() => setReplay(null)} />
            )}
            {practice && courseId && (
                <PracticeTaskModal courseId={courseId} conceptId={practice.conceptId} misconception={practice.misconception}
                                   students={practice.students} onClose={() => setPractice(null)} />
            )}
        </div>
    );
};

export default InstructorLearning;
