import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api';
import { flushEdits, trackLearningEvent } from '../../learningEvents';
import { PYODIDE_UNAVAILABLE, runPythonTests } from '../../hooks/usePyodide';
import {
    evaluate, isAccepted, makeAIJudge, reviewRequirements, type CriterionResult,
} from './challengeCheck';
import { entryFile, joinFiles } from './challengeFiles';
import type {
    ChallengeCheckMode, ChallengeCriterion, ChallengeFile, ChallengeTest, TaskKind,
} from './types';
import type { ChallengeRuntime } from './challengeRuntime';

/**
 * Görev slaytlarının (UYGULA / BİRLEŞTİR / ÜRET) çözüm döngüsü:
 * hazırla → çalıştır → ölç → koçla.
 *
 * Karar site tarafında kalıyor (doğru/yanlış ölçümü ve YZ koçu burada), kod ve
 * çıktı VS Code'da. Bu bölünme kasıtlı: eklenti "çalıştır ve söyle" demekten
 * fazlasını bilmemeli, aksi halde her değerlendirme değişikliği yeni bir
 * eklenti sürümü gerektirirdi.
 *
 * Hangi yüzeyde çalıştığını bilmiyor — `runtime` panel köprüsü, tarayıcının
 * yerel sunucu istemcisi ya da tarayıcıdaki Pyodide olabilir.
 *
 * ÖLÇÜM ÜÇ KATMANLI, hepsi tek sonuç listesinde:
 *   1. Ölçütler (çıktı biçimi, zorunlu yapılar) — deterministik, bedava.
 *   2. Fonksiyon testleri — kod gerçekten çağrılır (Pyodide).
 *   3. Proje gereksinimleri — tek YZ çağrısı; yalnızca üsttekiler geçince.
 */

/**
 * `ran` — kod çalıştı ama otomatik karar yok: görev "Öğretmen değerlendirir"
 * kipinde ya da ölçülecek hiçbir şey tanımlanmamış. Eskiden bu durum `diff`
 * sayılıyordu; öğrenci doğru kodla her seferinde "yanlış" görüyordu.
 */
export type CheckStatus =
    | 'idle' | 'running' | 'checking' | 'solved' | 'diff' | 'ran' | 'error' | 'offline';

interface Options {
    runtime: ChallengeRuntime;
    task: string;
    /**
     * Görevin dosyaları — tek dosyalı görevlerde tek elemanlı liste.
     * Normalleştirmesi çağırana ait (bkz. challengeFiles.ts).
     */
    files: ChallengeFile[];
    criteria: ChallengeCriterion[];
    samples: Array<{ input: string; output: string }>;
    courseId?: number | string;
    xp?: number;
    language?: string;
    /** 'manual' ise kontrol görevi asla kendisi tamamlamaz; teslim gerekir. */
    checkMode?: ChallengeCheckMode;
    /** checkMode === 'tests' iken çağrılan fonksiyon testleri. */
    tests?: ChallengeTest[];
    /** ÜRET: madde madde YZ ile değerlendirilen proje gereksinimleri. */
    requirements?: string[];
    /** Koçun tonunu belirler (Uygula / Birleştir / Üret). */
    stage?: TaskKind;
    /** Görevin VS Code'daki kendi klasörü (bkz. challengeRuntime.ts). */
    folder?: string;
    /** Teslim anahtarı ("connect:<slayt>") — öğrenme kaydı ve koç bu anahtarla yazılır. */
    taskKey?: string;
    /**
     * Öğrenme kaydı tutulsun mu? Yalnızca öğrenci için: öğretmenin önizlemedeki
     * denemeleri sınıfın analizine karışmamalı.
     */
    track?: boolean;
    /** Kaydın hangi yüzeyden geldiği: vscode-panel / lab / browser. */
    client?: string;
    /** false ise görev dosyası hazırlanmaz (henüz VS Code'a bağlanılmadı). */
    enabled?: boolean;
    onSolved?: () => void;
    onCodeRead?: (code: string) => void;
    /** Her kontrolün sonucu — ÜRET'in gereksinim listesi işaretlerini buradan alır. */
    onChecked?: (checks: CriterionResult[], passed: boolean) => void;
}

/** Görev bileşenlerinin (laboratuvar, VS Code paneli, tarayıcı editörü) aldığı ortak ayarlar. */
export type TaskCheckOptions = Omit<Options, 'runtime' | 'enabled'>;

export const useChallengeCheck = ({
    runtime, task, files, criteria, samples = [], courseId, xp = 50,
    language = 'python', checkMode = 'output', tests = [], requirements = [],
    stage = 'challenge', folder, taskKey, track = false, client, enabled = true,
    onSolved, onCodeRead, onChecked,
}: Options) => {
    const entry = entryFile(files).name;
    // Görevde geçen süre: "15 dakikadır bu görevde" bilgisi öğretmen için takılmanın işareti.
    const [openedAt] = useState(() => Date.now());

    /**
     * Dosyaların KİMLİĞİ değil İÇERİĞİ bağımlılık.
     *
     * `files` her render'da yeni bir dizi olarak gelebiliyor; dizinin kendisine
     * bağlansaydık aşağıdaki hazırlık etkisi her render'da yeniden çalışır ve
     * eklentiye saniyede onlarca "görevi aç" isteği giderdi. İçerik değişmedikçe
     * anahtar da değişmiyor.
     */
    const filesKey = JSON.stringify(files.map((f) => [f.name, f.content, !!f.entry]));
    const filesRef = useRef(files);
    filesRef.current = files;

    const [status, setStatus] = useState<CheckStatus>('idle');
    const [opened, setOpened] = useState(false);
    const [stdout, setStdout] = useState<string | null>(null);
    const [stderr, setStderr] = useState<string | null>(null);
    const [checks, setChecks] = useState<CriterionResult[]>([]);
    const [attempt, setAttempt] = useState(0);

    const [coach, setCoach] = useState<string | null>(null);
    const [coachLoading, setCoachLoading] = useState(false);

    const stdin = samples.map((s) => (s.input ?? '').trim()).filter(Boolean).join('\n');

    /** Görev dosyalarını VS Code'a gönderir. Arayüzdeki "gönderildi" ışığı bunun sonucu. */
    // Eklenti yazım kaydını yalnızca öğrencinin görevleri için tutar: öğretmenin
    // önizlemesinde kurs/görev bilgisi gönderilmez.
    const target = { folder, ...(track ? { courseId, taskKey } : {}) };
    const targetKey = JSON.stringify(target);

    const prepare = useCallback(async (): Promise<boolean> => {
        const ok = await runtime.prepare(filesRef.current, language, JSON.parse(targetKey));
        setOpened(ok);
        return ok;
    }, [runtime, filesKey, language, targetKey]);

    useEffect(() => {
        if (!enabled) return;
        let alive = true;
        void runtime.prepare(filesRef.current, language, JSON.parse(targetKey)).then((ok) => {
            if (alive) setOpened(ok);
        });
        return () => { alive = false; };
    }, [runtime, filesKey, language, targetKey, enabled]);

    /** Kontrolün öğrenme kaydı. Kanal yokken (VS Code kapalı) yazılmaz: öğrencinin hatası değil. */
    const recordCheck = useCallback((
        outcome: 'pass' | 'fail' | 'error' | 'ran', tryNo: number, source: string,
        results: CriterionResult[], err: string,
    ) => {
        if (!track || !taskKey) return;
        trackLearningEvent(courseId, {
            type: 'check',
            task_key: taskKey,
            outcome,
            attempt: tryNo,
            client,
            code: source,
            stderr: err || undefined,
            duration_ms: Date.now() - openedAt,
            checks: results.map((r) => ({
                id: r.id,
                kind: r.source?.kind ?? r.kind,
                label: r.label,
                status: r.status,
                detail: r.detail,
                value: r.source?.value,
                conceptId: r.source?.conceptId,
            })),
        });
    }, [track, taskKey, courseId, client, openedAt]);

    const askCoach = useCallback(async (
        phase: 'error' | 'diff' | 'quality',
        code: string, out: string, err: string, tryNo: number, failure?: string,
    ) => {
        if (!courseId) return;
        setCoachLoading(true);
        try {
            const res = await api.post('/ai/challenge-coach', {
                course_id: Number(courseId),
                phase,
                stage,
                // Koçun tespiti (kavram + yanılgı) öğrencinin kaydına bu görevle yazılır.
                task_key: track ? taskKey : undefined,
                task,
                student_code: code,
                attempt: tryNo,
                stdout: out,
                stderr: err,
                expected_output: failure || null,
            });
            const text = res.data?.message || null;
            setCoach(text);
            if (text && phase !== 'quality') {
                runtime.hint(text, Number(res.data?.line) || 0, language, entry);
            }
        } catch {
            setCoach(null);
        } finally {
            setCoachLoading(false);
        }
    }, [courseId, stage, task, language, runtime, entry, track, taskKey]);

    /** Fonksiyon testlerini öğrencinin GERÇEK dosyalarıyla çalıştırır. */
    const runTests = useCallback(async (
        runFiles: ChallengeFile[],
    ): Promise<CriterionResult[]> => {
        if (language !== 'python') {
            return [{
                id: 'tests', kind: 'exact', label: 'Fonksiyon testleri', status: 'pending',
                detail: 'Fonksiyon testleri yalnızca Python görevlerinde çalışır.',
            }];
        }
        const { results, fatal } = await runPythonTests(runFiles, entry, tests, stdin);
        if (fatal) {
            return [{
                id: 'tests', kind: 'exact', label: 'Fonksiyon testleri',
                // Motor yüklenemediyse bu öğrencinin hatası değil.
                status: fatal === PYODIDE_UNAVAILABLE ? 'pending' : 'fail',
                detail: fatal === PYODIDE_UNAVAILABLE ? 'Testler şu an çalıştırılamadı, tekrar dene.' : fatal,
            }];
        }
        const byId = new Map(results.map((r) => [r.id, r]));
        return tests.map((t) => {
            const r = byId.get(t.id);
            return {
                id: `test:${t.id}`, kind: 'exact', label: `${t.call} → ${t.expected}`,
                status: r?.passed ? 'pass' : 'fail',
                detail: r?.passed ? undefined : (r?.error || `Gelen: ${r?.actual || '(boş)'}`),
            };
        });
    }, [language, entry, tests, stdin]);

    /** ÜRET gereksinimleri: üstteki kontroller geçtiyse tek YZ çağrısı. */
    const reviewProject = useCallback(async (
        prior: CriterionResult[], source: string, out: string,
    ): Promise<CriterionResult[]> => {
        const priorOk = prior.every(isAccepted);
        const verdicts = priorOk
            ? await reviewRequirements(courseId, task, requirements, source, out)
            : null;
        return requirements.map((req, i) => {
            const v = verdicts?.[i];
            if (!v || (!v.passed && !v.reason)) {
                return {
                    id: `req:${i}`, kind: 'ai', label: req, status: 'pending',
                    detail: priorOk ? 'Değerlendirilemedi, tekrar dene.' : 'Önceki kontroller geçince bakılacak.',
                };
            }
            return {
                id: `req:${i}`, kind: 'ai', label: req,
                status: v.passed ? 'pass' : 'fail', detail: v.reason || undefined,
            };
        });
    }, [courseId, task, requirements]);

    const handleCheck = useCallback(async () => {
        setStatus('running');
        setCoach(null);
        // Bekleyen yazım kaydı önce gitsin: sunucu "çözüldü" kanıtını tartarken
        // kodun ne kadarının elle yazıldığına bakıyor.
        if (track) flushEdits();

        const result = await runtime.check(language, stdin, entry, filesRef.current);
        if (!result) {
            // Kanal yok: eklenti kapanmış olabilir. Bu bir kod hatası DEĞİL,
            // arayüz de öyle söylemeli — öğrenci kodunda hata aramasın.
            setStatus('offline');
            setStderr(null);
            setStdout(null);
            setOpened(false);
            return;
        }
        if (!result.ok) {
            setStatus('error');
            setStderr(result.error || 'VS Code görevi çalıştıramadı.');
            setStdout(null);
            return;
        }

        const tryNo = attempt + 1;
        setAttempt(tryNo);
        // Ölçüm ve koç TÜM dosyaları görmeli: çözümünü `odev.py`ye yazan
        // öğrenci, yalnızca çalıştırılan dosyaya bakan bir ölçümde "kod
        // yazmamış" görünürdü. Eski eklenti `files` göndermez — o zaman
        // elimizdeki tek şey çalıştırılan dosya.
        const runFiles: ChallengeFile[] = result.files?.length
            ? result.files
            : [{ name: entry, content: result.code, entry: true }];
        const source = result.files?.length ? joinFiles(result.files) : result.code;
        onCodeRead?.(source);
        setStdout(result.stdout);
        setStderr(result.timedOut ? 'Kod 10 saniyede bitmedi.' : result.stderr);

        if (result.timedOut || result.stderr.trim()) {
            setChecks([]);
            setStatus('error');
            onChecked?.([], false);
            recordCheck('error', tryNo, source, [], result.timedOut ? 'Kod 10 saniyede bitmedi.' : result.stderr);
            // Program girdi bekliyor ama görevde örnek girdi yok: bu öğrencinin
            // kod hatası değil, görevin eksiği. YZ'ye sormak yerine açıkça söyle.
            if (/EOFError/.test(result.stderr) && !stdin) {
                const msg = 'Programın input() ile girdi bekliyor ama bu kontrolde girdi verilmiyor. '
                    + 'Görevde örnek girdi tanımlı değil; öğretmenine haber ver.';
                setCoach(msg);
                runtime.hint(msg, 0, language, entry);
                return;
            }
            runtime.hint(result.stderr || 'Kodda bir hata var.', 1, language, entry);
            void askCoach('error', source, result.stdout, result.stderr, tryNo);
            return;
        }

        setStatus('checking');
        const collected: CriterionResult[] = [];
        if (criteria.length) {
            const outcome = await evaluate(
                criteria, source, result.stdout,
                makeAIJudge(courseId, task, source, result.stdout),
                language,
            );
            collected.push(...outcome.results);
        }
        if (checkMode === 'tests' && tests.length) {
            collected.push(...await runTests(runFiles));
        }
        if (requirements.length) {
            collected.push(...await reviewProject(collected, source, result.stdout));
        }

        const passed = collected.length > 0 && collected.every(isAccepted);
        setChecks(collected);

        // Otomatik karar yok: ya öğretmen değerlendirecek ya da ölçülecek bir
        // şey tanımlanmamış. Sonuçlar yine gösteriliyor (geri bildirim olarak)
        // ama görev kendiliğinden tamamlanmıyor — teslim gerekiyor.
        if (checkMode === 'manual' || !collected.length) {
            setStatus('ran');
            onChecked?.(collected, false);
            recordCheck('ran', tryNo, source, collected, '');
            return;
        }
        onChecked?.(collected, passed);
        recordCheck(passed ? 'pass' : 'fail', tryNo, source, collected, '');

        if (!passed) {
            setStatus('diff');
            const failed = collected.find((r) => r.status === 'fail')
                ?? collected.find((r) => r.status === 'pending');
            const summary = failed ? `${failed.label}${failed.detail ? ` — ${failed.detail}` : ''}` : 'Çıktını kontrol et.';
            runtime.hint(summary, 2, language, entry);
            if (failed?.status === 'fail') {
                void askCoach('diff', source, result.stdout, '', tryNo, summary);
            }
            return;
        }

        setStatus('solved');
        runtime.success('Tebrikler! Görevi başarıyla çözdün.', xp, language, entry);
        onSolved?.();
        void askCoach('quality', source, result.stdout, '', tryNo);
    }, [
        runtime, language, stdin, entry, attempt, criteria, checkMode, tests, requirements,
        courseId, task, xp, askCoach, runTests, reviewProject, onCodeRead, onChecked, onSolved,
        track, recordCheck,
    ]);

    const failedCheck = checks.find((c) => c.status === 'fail')
        ?? checks.find((c) => c.status === 'near');

    return {
        status,
        opened,
        stdout,
        stderr,
        checks,
        attempt,
        coach,
        coachLoading,
        running: status === 'running' || status === 'checking',
        /** Panelde gösterilecek ipucu: koçunki varsa o, yoksa ölçümün kendi açıklaması. */
        activeHint: coach || failedCheck?.detail || failedCheck?.label || null,
        prepare,
        handleCheck,
        reveal: (line: number) => runtime.reveal(line, language, entry),
    };
};
