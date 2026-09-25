import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Loader2, PlugZap, RefreshCw } from 'lucide-react';
import api, { setBearerToken } from '../api';
import {
    connectToVSCode, onDeviceToken, onOpenTarget, openLessonInVSCode,
    requestSignInFromVSCode, setVSCodeStage, type LessonTarget,
} from '../vscodeBridge';
import GamifiedRoadmapPath, { type RoadmapModule } from './student-pages/GamifiedRoadmapPath';
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
    // Öğretmenin roadmap builder'da koyduğu ders ayıracı. Yalnızca bir dersin
    // İLK modülünde doludur; roadmap bunu görünce "DERS N" kartını basar.
    lessonTopic?: string;
    lessonNumber?: number;
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

        const modules: Module[] = [];
        // Ders başlığı, slaytı olmadığı için elenen bir bölümde kalabilir. Onu
        // düşürmek dersin adını tamamen kaybettirirdi; bu yüzden başlığı ayakta
        // kalan İLK modüle taşıyoruz.
        let pendingTopic: string | undefined;
        let pendingNumber: number | undefined;

        sections.forEach((section: any, index: number) => {
            if (section.lessonTopic !== undefined) {
                pendingTopic = section.lessonTopic || course.title;
                pendingNumber = section.lessonNumber ?? 1;
            }

            // Slaytlar bölümün kendisinde değil, aynı id'yi taşıyan notta durur.
            const note = course.notes?.find((n: any) => String(n.id) === String(section.id));
            const slides = (note?.slides || []).filter((s: any) => s.type !== 'homework');
            if (slides.length === 0) return;

            modules.push({
                key: `${course.id}:${section.id ?? index}`,
                title: section.title || `Ders ${index + 1}`,
                stage: stageFor(index, section.theme),
                xp: section.xp ?? 500,
                slides,
                lessonTopic: pendingTopic,
                lessonNumber: pendingNumber,
            });
            pendingTopic = undefined;
            pendingNumber = undefined;
        });

        return { id: String(course.id), title: course.title, modules };
    }).filter((c: CourseView) => c.modules.length > 0);

const VSCodeLessonPage: React.FC = () => {
    const [phase, setPhase] = useState<'connecting' | 'loading' | 'ready' | 'error'>('connecting');
    const [errorText, setErrorText] = useState('');
    // Hatanın kaynağı 401 mi? Öyleyse "tekrar dene" anlamsız — aynı ölü token
    // aynı cevabı alır. Tek çıkış yolu eklentide yeniden giriş.
    const [needsSignIn, setNeedsSignIn] = useState(false);
    const [courses, setCourses] = useState<CourseView[]>([]);
    const [userData, setUserData] = useState<any>(null);
    const [active, setActive] = useState<{ course: CourseView; module: Module } | null>(null);
    // Tarayıcıdan "VS Code'a Geç" ile gelen slayt adresi. Panel kapalıyken
    // iframe'in URL'inde, açıkken postMessage ile gelir; ikisi de burada birleşir.
    const [target, setTarget] = useState<LessonTarget | null>(() => {
        const q = new URLSearchParams(window.location.search);
        if (!q.get('course') && !q.get('module')) return null;
        return {
            course: q.get('course') ?? undefined,
            module: q.get('module') ?? undefined,
            slide: Number(q.get('slide')) || 0,
        };
    });
    const [startSlide, setStartSlide] = useState(0);

    const load = useCallback(async () => {
        setPhase('loading');
        try {
            const [profile, content] = await Promise.all([
                api.get('/profile'),
                api.get('/my-content'),
            ]);
            setUserData(profile.data);
            setCourses(toCourseViews(content.data));
            setNeedsSignIn(false);
            setPhase('ready');
        } catch (err: any) {
            const expired = err?.response?.status === 401;
            setNeedsSignIn(expired);
            setErrorText(
                expired
                    ? 'Oturumun süresi dolmuş. Yeniden giriş yapman gerekiyor.'
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

    // Eklenti token'ı tazeledi (ya da kullanıcı yeniden giriş yaptı). Taze
    // token'ı isteklere bağla; hata ekranındaysak kendiliğinden toparlan —
    // kullanıcının bir daha bir şeye basması gerekmesin.
    useEffect(() => onDeviceToken((token) => {
        setBearerToken(token);
        if (phase === 'error') void load();
    }), [phase, load]);

    // Panel/kod genişlik dengesi aşamaya bağlı. Ders seçim haritasının kendi
    // aşaması var ('HARITA'); eskiden boş aşama gönderiliyordu ve panel %50'ye
    // oturuyordu — harita dikey aktığı için o genişliğin yarısı boşa gidiyordu.
    //
    // `phase` de bağımlılık: köprü el sıkışması bitmeden `setVSCodeStage` hedef
    // kökeni bilmediği için sessizce hiçbir şey yapmıyor. İlk render'da `active`
    // zaten null olduğundan efekt bir daha tetiklenmiyor ve harita oranı HİÇ
    // uygulanmıyordu — panel bir önceki aşamanın genişliğinde kalıyordu.
    useEffect(() => {
        if (phase === 'connecting') return;
        setVSCodeStage(active?.module.stage ?? 'HARITA');
    }, [active, phase]);

    // Panel zaten açıkken gelen adres (öğrenci tarayıcıya dönüp yeniden geçmiş).
    useEffect(() => onOpenTarget(setTarget), []);

    /**
     * Adresi gerçek bir modüle çevirir ve açar.
     *
     * Eşleştirme BAŞLIKLA yapılıyor, id ile değil: sitedeki yol haritası düğümü
     * ile paneldeki modül aynı bölümden türüyor ama iki tarafın anahtarları
     * farklı biçimde kuruluyor (`course:section` ve roadmap düğüm id'si).
     * Başlık ikisinde de aynı ve öğretmenin yazdığı şey.
     *
     * Bulamazsak yol haritasında kalıyoruz — yanlış dersi açmaktansa öğrencinin
     * seçmesi iyidir.
     */
    useEffect(() => {
        if (!target || phase !== 'ready' || courses.length === 0) return;

        const pool = target.course
            ? courses.filter((c) => String(c.id) === String(target.course))
            : courses;
        const wanted = (target.module || '').trim().toLocaleLowerCase('tr');

        for (const course of pool.length > 0 ? pool : courses) {
            const mod = wanted
                ? course.modules.find((m) => m.title.trim().toLocaleLowerCase('tr') === wanted)
                : undefined;
            if (mod) {
                openLessonInVSCode(course.title, mod.title);
                setStartSlide(target.slide || 0);
                setActive({ course, module: mod });
                break;
            }
        }
        setTarget(null);
    }, [target, phase, courses]);

    const totalModules = useMemo(
        () => courses.reduce((sum, c) => sum + c.modules.length, 0),
        [courses],
    );

    if (phase === 'connecting' || phase === 'loading') {
        return (
            <Shell>
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-600">
                    {phase === 'connecting' ? 'VS Code ile bağlanılıyor…' : 'Derslerin yükleniyor…'}
                </p>
            </Shell>
        );
    }

    if (phase === 'error') {
        return (
            <Shell>
                <PlugZap className="w-8 h-8 text-rose-500 mb-4" />
                <p className="text-sm font-bold text-slate-600 text-center max-w-sm mb-5">{errorText}</p>
                <button
                    onClick={() => {
                        // 401'de yeniden yüklemek anlamsız: aynı ölü token, aynı
                        // cevap. Girişi eklenti başlatır; bitince taze token
                        // `onDeviceToken` ile gelir ve sayfa kendi kendine yüklenir.
                        if (needsSignIn && requestSignInFromVSCode()) return;
                        void load();
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {needsSignIn ? 'Yeniden giriş yap' : 'Tekrar dene'}
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
                // Tarayıcıdan gelen öğrenci kaldığı slaytta devam eder.
                initialSlideIndex={startSlide}
                onClose={() => { setStartSlide(0); setActive(null); }}
                onComplete={() => { setStartSlide(0); setActive(null); }}
            />
        );
    }

    return (
        // Noktalı tuval: öğretmenin roadmap builder'ındaki `.roadmap-canvas` ile
        // aynı desen — öğretmen neyi kurduysa öğrenci onu aynı zeminde görüyor.
        <div
            className="min-h-screen text-slate-800 px-3 py-6 font-sans"
            style={{
                backgroundColor: '#ffffff',
                backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)',
                backgroundSize: '24px 24px',
            }}
        >
            {courses.map((course) => (
                <GamifiedRoadmapPath
                    key={course.id}
                    courseTitle={course.title}
                    modules={course.modules as RoadmapModule[]}
                    onSelectModule={(mod) => {
                        const targetModule = course.modules.find(m => m.key === mod.key);
                        if (targetModule) {
                            openLessonInVSCode(course.title, targetModule.title);
                            setActive({ course, module: targetModule });
                        }
                    }}
                    isDark={false}
                />
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
    );
};

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 font-sans">
        {children}
    </div>
);

export default VSCodeLessonPage;
