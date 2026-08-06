import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Loader2, PlugZap, RefreshCw } from 'lucide-react';
import api, { setBearerToken } from '../api';
import { connectToVSCode, openLessonInVSCode, setVSCodeStage } from '../vscodeBridge';
import LessonSlide from './student-pages/LessonSlide';

/**
 * VS Code sağ panelinde açılan ders oynatıcı.
 *
 * Bu sayfa YALNIZCA eklentinin webview'ü tarafından bir iframe içinde açılmak
 * üzere vardır; kimliği çerezden değil, eklentinin köprüyle verdiği Bearer
 * token'dan alır (bkz. vscodeBridge.ts).
 *
 * Oynatıcının kendisi siteyle AYNI bileşendir (LessonSlide). Oyunlar, kod
 * widget'ı, WebSocket senkronu, aşama geçişleri — hepsi olduğu gibi çalışır.
 * Burada yalnızca "hangi modül" sorusunu cevaplayan ince bir seçici var.
 */

// Öğretmenin roadmap builder'ındaki tema → aşama eşlemesi (bkz. StudentApp.tsx).
// Aşama, LessonSlide'ın üst barındaki ANLA/UYGULA/... rozetini belirler.
const THEME_STAGE: Record<string, string> = {
    purple: 'ANLA', cyan: 'UYGULA', green: 'BİRLEŞTİR', yellow: 'ÜRET', quiz: 'QUIZ', homework: 'ÖDEV',
};
const STAGE_PATTERN = ['purple', 'cyan', 'green', 'yellow'];

const stageFor = (index: number, theme?: string): string =>
    THEME_STAGE[theme && THEME_STAGE[theme] ? theme : STAGE_PATTERN[index % STAGE_PATTERN.length]];

interface Module {
    key: string;
    title: string;
    stage: string;
    xp: number;
    slides: any[];
}

interface CourseView {
    id: string;
    title: string;
    modules: Module[];
}

/** `/my-content` yanıtını (bölümler + notlar) oynatılabilir modüllere çevirir. */
const toCourseViews = (raw: any[]): CourseView[] =>
    (raw || []).map((course) => {
        const sections = (course.curriculum || []).filter(
            (item: any) => item?.type !== 'live_sessions_config',
        );

        const modules: Module[] = sections.map((section: any, index: number) => {
            // Slaytlar bölümün kendisinde değil, aynı id'yi taşıyan notta durur.
            const note = course.notes?.find((n: any) => String(n.id) === String(section.id));
            const slides = (note?.slides || []).filter((s: any) => s.type !== 'homework');
            return {
                key: `${course.id}:${section.id ?? index}`,
                title: section.title || `Ders ${index + 1}`,
                stage: stageFor(index, section.theme),
                xp: section.xp ?? 500,
                slides,
            };
        }).filter((m: Module) => m.slides.length > 0);

        return { id: String(course.id), title: course.title, modules };
    }).filter((c: CourseView) => c.modules.length > 0);

const STAGE_COLOR: Record<string, string> = {
    'ANLA': '#d946ef', 'UYGULA': '#06b6d4', 'BİRLEŞTİR': '#22c55e',
    'ÜRET': '#eab308', 'QUIZ': '#7c3aed', 'ÖDEV': '#2563eb',
};

const VSCodeLessonPage: React.FC = () => {
    const [phase, setPhase] = useState<'connecting' | 'loading' | 'ready' | 'error'>('connecting');
    const [errorText, setErrorText] = useState('');
    const [courses, setCourses] = useState<CourseView[]>([]);
    const [userData, setUserData] = useState<any>(null);
    const [active, setActive] = useState<{ course: CourseView; module: Module } | null>(null);

    const load = useCallback(async () => {
        setPhase('loading');
        try {
            const [profile, content] = await Promise.all([
                api.get('/profile'),
                api.get('/my-content'),
            ]);
            setUserData(profile.data);
            setCourses(toCourseViews(content.data));
            setPhase('ready');
        } catch (err: any) {
            setErrorText(
                err?.response?.status === 401
                    ? 'Oturumun süresi dolmuş. VS Code\'da çıkış yapıp yeniden giriş yap.'
                    : 'Ders içeriği alınamadı. GoMufi sunucusuna ulaşılamıyor olabilir.',
            );
            setPhase('error');
        }
    }, []);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const ok = await connectToVSCode();
            if (cancelled) return;
            if (!ok) {
                setErrorText('VS Code eklentisiyle bağlantı kurulamadı. Paneli kapatıp tekrar aç.');
                setPhase('error');
                return;
            }
            // Köprü token'ı verdi; bundan sonraki tüm istekler Bearer ile gider.
            const { getDeviceToken } = await import('../vscodeBridge');
            setBearerToken(getDeviceToken());
            await load();
        })();
        return () => { cancelled = true; };
    }, [load]);

    // Panel/kod genişlik dengesi aşamaya bağlı. Modül listesindeyken kod ekranı
    // gereksiz — boş bir aşama gönderip dengeyi ortaya çekiyoruz.
    useEffect(() => {
        setVSCodeStage(active?.module.stage ?? '');
    }, [active]);

    const totalModules = useMemo(
        () => courses.reduce((sum, c) => sum + c.modules.length, 0),
        [courses],
    );

    if (phase === 'connecting' || phase === 'loading') {
        return (
            <Shell>
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-300">
                    {phase === 'connecting' ? 'VS Code ile bağlanılıyor…' : 'Derslerin yükleniyor…'}
                </p>
            </Shell>
        );
    }

    if (phase === 'error') {
        return (
            <Shell>
                <PlugZap className="w-8 h-8 text-rose-400 mb-4" />
                <p className="text-sm font-bold text-slate-300 text-center max-w-sm mb-5">{errorText}</p>
                <button
                    onClick={load}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" /> Tekrar dene
                </button>
            </Shell>
        );
    }

    if (active) {
        return (
            <LessonSlide
                isOpen
                isLive={false}
                lessonTitle={active.module.title}
                slides={active.module.slides}
                courseId={active.course.id}
                userData={userData}
                moduleStage={active.module.stage}
                moduleXp={active.module.xp}
                onClose={() => setActive(null)}
                onComplete={() => setActive(null)}
            />
        );
    }

    return (
        <div className="min-h-screen bg-[#1e1e1e] text-slate-200 px-5 py-6 font-sans">
            <header className="mb-6">
                <h1 className="text-lg font-black tracking-tight text-white">Derslerim</h1>
                <p className="text-xs text-slate-400 font-medium mt-1">
                    {totalModules > 0
                        ? 'Bir modül seç — slaytlar burada açılır, kod bu VS Code penceresinde çalışır.'
                        : 'Henüz açılabilir bir ders yok.'}
                </p>
            </header>

            <div className="flex flex-col gap-6">
                {courses.map((course) => (
                    <section key={course.id}>
                        <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                            {course.title}
                        </h2>
                        <div className="flex flex-col gap-1.5">
                            {course.modules.map((module) => (
                                <button
                                    key={module.key}
                                    onClick={() => {
                                        // Önce klasör: eklenti Gezgin'i o derse taşısın ve
                                        // "Çalıştır" ilk tıklamada doğru yere yazsın.
                                        openLessonInVSCode(course.title, module.title);
                                        setActive({ course, module });
                                    }}
                                    className="group flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all"
                                >
                                    <span
                                        className="shrink-0 w-1.5 h-8 rounded-full"
                                        style={{ backgroundColor: STAGE_COLOR[module.stage] || '#6366f1' }}
                                    />
                                    <span className="flex-1 min-w-0">
                                        <span className="block text-sm font-bold text-slate-100 truncate">
                                            {module.title}
                                        </span>
                                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">
                                            {module.stage} · {module.slides.length} slayt
                                        </span>
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </button>
                            ))}
                        </div>
                    </section>
                ))}

                {totalModules === 0 && (
                    <div className="flex flex-col items-center text-center py-12 text-slate-500">
                        <BookOpen className="w-10 h-10 mb-3 opacity-40" />
                        <p className="text-xs font-bold max-w-xs">
                            Kayıtlı olduğun kurslarda slayt bulunamadı. Sitede bir kursa katıldıysan
                            paneli yenilemeyi dene.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-[#1e1e1e] flex flex-col items-center justify-center px-6 font-sans">
        {children}
    </div>
);

export default VSCodeLessonPage;
