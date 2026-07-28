import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Target, Play, Lightbulb, Check, X, Loader2, Plus, Trash2, RotateCcw, Trophy,
    Code2, FileText, Image as ImageIcon, File as FileIcon, Upload, Send, Users, Inbox,
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import type {
    ChallengeConfig, ChallengeCheckMode, ChallengeSubmissionType, ChallengeTest, Slide,
} from './types';
import { usePyodide, type PythonTestResult } from '../../hooks/usePyodide';
import api from '../../api';

/**
 * UYGULA aşamasına ÖZEL tam slayt — oyun/quiz slaytları gibi kendi tipi var,
 * tuval üstünde sürüklenen bir widget değil.
 *
 * AMACI: öğrencinin ANLA'da öğrendiğini uygulaması. Bu yüzden görev kod olmak
 * ZORUNDA DEĞİL — metin cevabı, ekran görüntüsü veya dosya da istenebilir.
 * Kod görevlerinde de her şey fonksiyon dönüşü değildir; "adını print ile
 * yazdır" gibi görevlerde doğru cevap ekran çıktısının kendisidir.
 *
 * Teslimler mevcut ödev altyapısına yazılır (homework_submissions tablosu),
 * böylece öğretmen önizlemede gerçek gönderileri görür.
 */

export const defaultChallengeConfig = (): ChallengeConfig => ({
    title: 'Uygulama Görevi',
    prompt: 'Öğrendiklerini kullanarak aşağıdaki görevi tamamla.',
    submissionType: 'code',
    checkMode: 'output',
    expectedOutput: '',
    functionName: 'cozum',
    tests: [],
    samples: [],
    hint: '',
    xp: 100,
});

const starterFor = (cfg: ChallengeConfig) =>
    cfg.starterCode ||
    (cfg.checkMode === 'tests'
        ? `# Kodunu buraya yaz 👇\ndef ${cfg.functionName || 'cozum'}():\n    pass\n`
        : '# Kodunu buraya yaz 👇\n');

const SUBMISSION_META: Record<ChallengeSubmissionType, { label: string; icon: React.ElementType }> = {
    code: { label: 'Kod', icon: Code2 },
    text: { label: 'Metin', icon: FileText },
    image: { label: 'Ekran Görüntüsü', icon: ImageIcon },
    file: { label: 'Dosya', icon: FileIcon },
};

const CHECK_META: Record<ChallengeCheckMode, { label: string; hint: string }> = {
    output: { label: 'Ekran çıktısı', hint: 'Kod çalıştırılır, ekrana basılan beklenenle karşılaştırılır.' },
    tests: { label: 'Fonksiyon testleri', hint: 'Fonksiyon çağrılır, dönüş değerleri karşılaştırılır.' },
    manual: { label: 'Öğretmen değerlendirir', hint: 'Otomatik kontrol yok.' },
};

interface Submission {
    student_id?: number;
    student_name?: string;
    student_note?: string | null;
    file_name?: string;
    file_data?: string | null;
    file_mime?: string | null;
    submitted_at?: string;
}

interface Props {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
    /** 'edit' -> görevi kur, 'student' -> görevi çöz, 'review' -> teslimleri gör */
    role?: 'edit' | 'student' | 'review';
    courseId?: number | string;
    /** Teslimlerin anahtarı (modül düğümü + slayt) */
    submissionNodeId?: string;
    onSolved?: () => void;
}

const ChallengeSlideBuilder: React.FC<Props> = ({
    slide, updateSlide, role = 'student', courseId, submissionNodeId, onSolved,
}) => {
    const cfg = useMemo<ChallengeConfig>(
        () => ({ ...defaultChallengeConfig(), ...(slide.challengeConfig || {}) }),
        [slide.challengeConfig],
    );
    const isEdit = role === 'edit';
    const isReview = role === 'review';
    const checkMode: ChallengeCheckMode = cfg.checkMode || 'manual';
    const tests = cfg.tests || [];
    const samples = cfg.samples || [];

    const [code, setCode] = useState(() => starterFor(cfg));
    const [answer, setAnswer] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [results, setResults] = useState<Record<string, PythonTestResult>>({});
    const [stdout, setStdout] = useState<string | null>(null);
    const [fatal, setFatal] = useState<string | null>(null);
    const [running, setRunning] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [subs, setSubs] = useState<Submission[] | null>(null);

    const { runTests, runAndCapture } = usePyodide();
    const preRef = useRef<HTMLPreElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setCode(starterFor(cfg));
        setResults({}); setStdout(null); setFatal(null); setSent(false);
    }, [slide.id, cfg.checkMode, cfg.functionName, cfg.starterCode]);

    // Öğretmen önizlemesi: gerçek teslimleri getir
    useEffect(() => {
        if (!isReview || !courseId || !submissionNodeId) return;
        let alive = true;
        api.get(`/courses/${courseId}/homework/${encodeURIComponent(submissionNodeId)}/submissions`)
            .then((r) => { if (alive) setSubs(r.data?.submissions || r.data || []); })
            .catch(() => { if (alive) setSubs([]); });
        return () => { alive = false; };
    }, [isReview, courseId, submissionNodeId]);

    const patch = (updates: Partial<ChallengeConfig>) =>
        updateSlide({ challengeConfig: { ...cfg, ...updates } });

    const passedCount = tests.filter((t) => results[t.id]?.passed).length;
    const outputOk = checkMode === 'output' && stdout !== null &&
        stdout.trim() === (cfg.expectedOutput || '').trim();
    const allPassed = checkMode === 'tests'
        ? tests.length > 0 && passedCount === tests.length
        : outputOk;

    const handleRun = async () => {
        setRunning(true); setFatal(null);
        if (checkMode === 'tests') {
            const { results: res, fatal: err } = await runTests(code, tests);
            setResults(Object.fromEntries(res.map((r) => [r.id, r])));
            setFatal(err);
            if (!err && res.length > 0 && res.every((r) => r.passed)) onSolved?.();
        } else {
            const { stdout: out, error } = await runAndCapture(code);
            setStdout(out); setFatal(error);
            if (!error && out.trim() === (cfg.expectedOutput || '').trim()) onSolved?.();
        }
        setRunning(false);
    };

    const handleSubmit = async () => {
        if (!courseId || !submissionNodeId) { setSent(true); return; }
        setSending(true);
        try {
            const form = new FormData();
            if (cfg.submissionType === 'image' || cfg.submissionType === 'file') {
                if (!file) { setSending(false); return; }
                form.append('file', file);
            } else {
                const body = cfg.submissionType === 'code' ? code : answer;
                const name = cfg.submissionType === 'code' ? 'cevap.py' : 'cevap.txt';
                form.append('file', new Blob([body], { type: 'text/plain' }), name);
                form.append('student_note', body.slice(0, 2000));
            }
            await api.post(
                `/courses/${courseId}/homework/${encodeURIComponent(submissionNodeId)}/submit`,
                form,
            );
            setSent(true);
            onSolved?.();
        } catch {
            setFatal('Gönderilemedi. Bağlantını kontrol et.');
        } finally {
            setSending(false);
        }
    };

    const syncScroll = () => {
        if (preRef.current && taRef.current) {
            preRef.current.scrollTop = taRef.current.scrollTop;
            preRef.current.scrollLeft = taRef.current.scrollLeft;
        }
    };

    const SubIcon = SUBMISSION_META[cfg.submissionType]?.icon || Code2;

    /* ------------------------------- SOL PANEL ------------------------------- */
    const brief = (
        <div className="flex flex-col gap-3 min-h-0">
            <div className="bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-4">
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 bg-cyan-100 text-cyan-800 border-2 border-cyan-300 border-b-[3px] rounded-full px-2.5 py-0.5 text-[10px] font-black tracking-wide">
                        <Target size={12} /> UYGULA · GÖREV
                    </span>
                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border-2 border-slate-300 border-b-[3px] rounded-full px-2 py-0.5 text-[10px] font-black">
                        <SubIcon size={11} /> {SUBMISSION_META[cfg.submissionType]?.label}
                    </span>
                    <span className="ml-auto inline-flex items-center gap-1 bg-amber-100 text-amber-800 border-2 border-amber-300 border-b-[3px] rounded-full px-2 py-0.5 text-[10px] font-black">
                        <Trophy size={11} /> +{cfg.xp} XP
                    </span>
                </div>

                {isEdit ? (
                    <input
                        value={cfg.title}
                        onChange={(e) => patch({ title: e.target.value })}
                        className="w-full text-xl font-black text-slate-800 outline-none border-b-2 border-dashed border-slate-200 focus:border-cyan-400 pb-1 mb-2"
                    />
                ) : (
                    <h2 className="text-xl font-black text-slate-800 mb-2">{cfg.title}</h2>
                )}

                {isEdit ? (
                    <textarea
                        value={cfg.prompt}
                        onChange={(e) => patch({ prompt: e.target.value })}
                        rows={3}
                        className="w-full text-[13.5px] font-medium text-slate-600 leading-relaxed outline-none bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 resize-none focus:border-cyan-400"
                    />
                ) : (
                    <p className="text-[13.5px] font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">{cfg.prompt}</p>
                )}
            </div>

            {/* Öğretmen ayarları */}
            {isEdit && (
                <div className="bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-4 space-y-3">
                    <div>
                        <span className="text-[10px] font-black text-slate-500 tracking-widest">TESLİM ŞEKLİ</span>
                        <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                            {(Object.keys(SUBMISSION_META) as ChallengeSubmissionType[]).map((k) => {
                                const M = SUBMISSION_META[k].icon;
                                const on = cfg.submissionType === k;
                                return (
                                    <button
                                        key={k}
                                        onClick={() => patch({ submissionType: k })}
                                        className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2 text-[10px] font-bold transition-all ${
                                            on ? 'bg-cyan-50 border-cyan-400 border-b-[4px] text-cyan-700'
                                               : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                    >
                                        <M size={14} /> {SUBMISSION_META[k].label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {cfg.submissionType === 'code' && (
                        <div>
                            <span className="text-[10px] font-black text-slate-500 tracking-widest">DEĞERLENDİRME</span>
                            <div className="mt-1.5 flex gap-1.5">
                                {(Object.keys(CHECK_META) as ChallengeCheckMode[]).map((k) => (
                                    <button
                                        key={k}
                                        onClick={() => patch({ checkMode: k })}
                                        title={CHECK_META[k].hint}
                                        className={`flex-1 rounded-xl border-2 py-1.5 text-[10px] font-bold transition-all ${
                                            checkMode === k ? 'bg-emerald-50 border-emerald-400 border-b-[4px] text-emerald-700'
                                                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                    >
                                        {CHECK_META[k].label}
                                    </button>
                                ))}
                            </div>
                            <p className="mt-1.5 text-[10.5px] text-slate-400 font-medium">{CHECK_META[checkMode].hint}</p>

                            {checkMode === 'output' && (
                                <textarea
                                    value={cfg.expectedOutput || ''}
                                    onChange={(e) => patch({ expectedOutput: e.target.value })}
                                    rows={2}
                                    placeholder="Beklenen ekran çıktısı"
                                    className="mt-2 w-full font-mono text-[12px] bg-slate-900 text-emerald-300 rounded-xl p-2.5 outline-none resize-none border-2 border-slate-700"
                                />
                            )}
                            {checkMode === 'tests' && (
                                <div className="mt-2 flex items-center gap-2 text-[12px]">
                                    <span className="font-bold text-slate-500">Fonksiyon:</span>
                                    <input
                                        value={cfg.functionName || ''}
                                        onChange={(e) => patch({ functionName: e.target.value })}
                                        className="font-mono font-bold bg-emerald-50 text-emerald-700 border-2 border-emerald-200 rounded-lg px-2 py-0.5 outline-none focus:border-emerald-400 w-36"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 tracking-widest">XP</span>
                        <input
                            type="number"
                            value={cfg.xp}
                            onChange={(e) => patch({ xp: Number(e.target.value) || 0 })}
                            className="w-20 bg-amber-50 border-2 border-amber-200 rounded-lg px-2 py-0.5 text-[12px] font-bold outline-none focus:border-amber-400"
                        />
                    </div>
                </div>
            )}

            {/* Örnekler */}
            {(samples.length > 0 || isEdit) && (
                <div className="bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-4">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-[10px] font-black text-slate-500 tracking-widest">ÖRNEKLER</h3>
                        {isEdit && (
                            <button onClick={() => patch({ samples: [...samples, { input: '', output: '' }] })} className="text-cyan-600 hover:text-cyan-700">
                                <Plus size={15} />
                            </button>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        {samples.map((s, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-[12px] font-mono">
                                {isEdit ? (
                                    <>
                                        <input
                                            value={s.input}
                                            onChange={(e) => { const n = [...samples]; n[i] = { ...s, input: e.target.value }; patch({ samples: n }); }}
                                            placeholder="girdi"
                                            className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-cyan-400"
                                        />
                                        <span className="text-slate-400 font-black">→</span>
                                        <input
                                            value={s.output}
                                            onChange={(e) => { const n = [...samples]; n[i] = { ...s, output: e.target.value }; patch({ samples: n }); }}
                                            placeholder="çıktı"
                                            className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-cyan-400"
                                        />
                                        <button onClick={() => patch({ samples: samples.filter((_, j) => j !== i) })} className="text-slate-300 hover:text-rose-500">
                                            <Trash2 size={13} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1 text-slate-700">{s.input}</span>
                                        <span className="text-slate-400 font-black">→</span>
                                        <span className="flex-1 bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1 text-slate-700">{s.output}</span>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* İpucu */}
            {(cfg.hint || isEdit) && (
                <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 border-b-[5px] p-4">
                    <button onClick={() => setShowHint((v) => !v)} className="flex items-center gap-2 text-[10px] font-black text-amber-700 tracking-widest">
                        <Lightbulb size={13} /> İPUCU {showHint ? '−' : '+'}
                    </button>
                    {showHint && (isEdit ? (
                        <textarea
                            value={cfg.hint || ''}
                            onChange={(e) => patch({ hint: e.target.value })}
                            rows={2}
                            className="mt-2 w-full text-[12px] font-medium text-amber-900 bg-white border-2 border-amber-200 rounded-xl p-2 outline-none resize-none focus:border-amber-400"
                        />
                    ) : (
                        <p className="mt-2 text-[12px] font-medium text-amber-900 leading-relaxed">{cfg.hint}</p>
                    ))}
                </div>
            )}
        </div>
    );

    /* ----------------------------- TESLİM ALANI ----------------------------- */
    const codeWorkspace = (
        <>
            <div className="flex-1 bg-[#1e1e1e] rounded-2xl border-2 border-slate-800 border-b-[5px] overflow-hidden flex flex-col min-h-[180px]">
                <div className="flex items-center gap-2 px-3 py-2 bg-[#2d2d2d] border-b border-black/30 shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                    <span className="ml-1.5 text-[10px] font-mono text-slate-400">main.py</span>
                    <button onClick={() => setCode(starterFor(cfg))} className="ml-auto flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-white">
                        <RotateCcw size={11} /> Sıfırla
                    </button>
                </div>
                <div className="relative flex-1 min-h-0 overflow-hidden">
                    <pre ref={preRef} aria-hidden className="absolute inset-0 m-0 p-3 overflow-auto font-mono text-[12.5px] leading-[1.6] pointer-events-none">
                        <code className="language-python" dangerouslySetInnerHTML={{ __html: Prism.highlight(code + '\n', Prism.languages.python, 'python') }} />
                    </pre>
                    <textarea
                        ref={taRef} value={code} onChange={(e) => setCode(e.target.value)} onScroll={syncScroll} spellCheck={false}
                        className="absolute inset-0 w-full h-full p-3 bg-transparent text-transparent caret-white font-mono text-[12.5px] leading-[1.6] resize-none outline-none"
                    />
                </div>
                <div className="px-3 py-2.5 bg-[#2d2d2d] border-t border-black/30 flex items-center gap-2.5 shrink-0 flex-wrap">
                    {checkMode !== 'manual' && (
                        <button
                            onClick={handleRun} disabled={running}
                            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-black text-[12.5px] px-4 py-1.5 rounded-lg border-2 border-emerald-700 border-b-[4px] active:border-b-2 active:translate-y-0.5 transition-all"
                        >
                            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                            {running ? 'Çalışıyor...' : 'Çalıştır'}
                        </button>
                    )}
                    {checkMode === 'tests' && Object.keys(results).length > 0 && (
                        <span className={`text-[12.5px] font-black ${allPassed ? 'text-emerald-400' : 'text-slate-300'}`}>
                            {passedCount}/{tests.length} test geçti
                        </span>
                    )}
                    {allPassed && (
                        <span className="ml-auto flex items-center gap-1 text-amber-300 font-black text-[12.5px]">
                            <Trophy size={13} /> +{cfg.xp} XP
                        </span>
                    )}
                </div>
            </div>

            {/* Çıktı / testler */}
            <div className="h-[34%] min-h-[120px] bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-3 overflow-y-auto shrink-0">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-black text-slate-500 tracking-widest">
                        {checkMode === 'tests' ? 'TEST SONUÇLARI' : checkMode === 'output' ? 'ÇIKTI' : 'NOT'}
                    </h3>
                    {isEdit && checkMode === 'tests' && (
                        <button
                            onClick={() => patch({ tests: [...tests, { id: `t${Date.now()}`, call: `${cfg.functionName || 'cozum'}()`, expected: '' } as ChallengeTest] })}
                            className="text-cyan-600 hover:text-cyan-700"
                        >
                            <Plus size={15} />
                        </button>
                    )}
                </div>

                {fatal && (
                    <div className="mb-2 bg-rose-50 border-2 border-rose-200 rounded-xl p-2.5 text-[11.5px] font-mono text-rose-700 whitespace-pre-wrap">{fatal}</div>
                )}

                {checkMode === 'manual' && (
                    <p className="text-[12px] text-slate-400 font-medium">Bu görevi öğretmenin değerlendirecek. Kodunu yazıp gönder.</p>
                )}

                {checkMode === 'output' && (
                    <div className="space-y-2">
                        <div className="bg-slate-900 rounded-xl p-2.5 font-mono text-[12px] text-slate-100 whitespace-pre-wrap min-h-[42px]">
                            {stdout === null ? <span className="text-slate-500">Çalıştır'a bas…</span> : (stdout || <span className="text-slate-500">(boş çıktı)</span>)}
                        </div>
                        {cfg.expectedOutput ? (
                            <div className={`flex items-start gap-2 rounded-xl border-2 px-2.5 py-2 text-[11.5px] font-mono ${
                                stdout === null ? 'bg-slate-50 border-slate-200'
                                    : outputOk ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                <span className={`shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center ${
                                    stdout === null ? 'bg-slate-200 text-slate-400' : outputOk ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                    {stdout === null ? '·' : outputOk ? <Check size={10} /> : <X size={10} />}
                                </span>
                                <span className="text-slate-600"><b>Beklenen:</b> {cfg.expectedOutput}</span>
                            </div>
                        ) : (
                            <p className="text-[11.5px] text-slate-400 font-medium">Beklenen çıktı tanımlanmamış — sonuç öğretmence değerlendirilir.</p>
                        )}
                    </div>
                )}

                {checkMode === 'tests' && (
                    <div className="space-y-1.5">
                        {tests.length === 0 && <p className="text-[12px] text-slate-400 font-medium">Henüz test yok.</p>}
                        {tests.map((t) => {
                            const r = results[t.id];
                            return (
                                <div key={t.id} className={`flex items-center gap-1.5 rounded-xl border-2 px-2.5 py-1.5 text-[11.5px] font-mono ${
                                    !r ? 'bg-slate-50 border-slate-200' : r.passed ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                    <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${
                                        !r ? 'bg-slate-200 text-slate-400' : r.passed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                        {r ? (r.passed ? <Check size={10} /> : <X size={10} />) : '·'}
                                    </span>
                                    {isEdit ? (
                                        <>
                                            <input value={t.call}
                                                onChange={(e) => patch({ tests: tests.map((x) => x.id === t.id ? { ...x, call: e.target.value } : x) })}
                                                className="flex-1 bg-white border-2 border-slate-200 rounded-lg px-2 py-0.5 outline-none focus:border-cyan-400" />
                                            <span className="text-slate-400 font-black">==</span>
                                            <input value={t.expected}
                                                onChange={(e) => patch({ tests: tests.map((x) => x.id === t.id ? { ...x, expected: e.target.value } : x) })}
                                                className="w-20 bg-white border-2 border-slate-200 rounded-lg px-2 py-0.5 outline-none focus:border-cyan-400" />
                                            <button onClick={() => patch({ tests: tests.filter((x) => x.id !== t.id) })} className="text-slate-300 hover:text-rose-500">
                                                <Trash2 size={13} />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="flex-1 text-slate-700 truncate">{t.call}</span>
                                            <span className="text-slate-400">→</span>
                                            <span className="font-bold text-slate-700">{t.expected}</span>
                                            {r && !r.passed && <span className="text-rose-600 font-bold truncate max-w-[35%]">({r.error || r.actual || 'boş'})</span>}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );

    const uploadWorkspace = (
        <div className="flex-1 bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-4 flex flex-col min-h-0">
            <h3 className="text-[10px] font-black text-slate-500 tracking-widest mb-2">
                {cfg.submissionType === 'text' ? 'CEVABIN' : cfg.submissionType === 'image' ? 'EKRAN GÖRÜNTÜSÜ' : 'DOSYA'}
            </h3>
            {cfg.submissionType === 'text' ? (
                <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={isEdit}
                    placeholder="Cevabını buraya yaz…"
                    className="flex-1 w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-[13.5px] font-medium text-slate-700 outline-none resize-none focus:border-cyan-400 disabled:opacity-60"
                />
            ) : (
                <label className="flex-1 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-cyan-400 hover:bg-cyan-50/40 transition-all">
                    <input
                        type="file"
                        accept={cfg.submissionType === 'image' ? 'image/*' : '*'}
                        className="hidden"
                        disabled={isEdit}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                    {cfg.submissionType === 'image' ? <ImageIcon size={26} className="text-slate-400" /> : <Upload size={26} className="text-slate-400" />}
                    <span className="text-[12.5px] font-bold text-slate-500">
                        {file ? file.name : cfg.submissionType === 'image' ? 'Ekran görüntüsü seç' : 'Dosya seç'}
                    </span>
                    <span className="text-[10.5px] text-slate-400">en fazla 5 MB</span>
                </label>
            )}
        </div>
    );

    /* ------------------------- ÖĞRETMEN: TESLİMLER ------------------------- */
    const reviewPanel = (
        <div className="flex-1 bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-4 overflow-y-auto min-h-0">
            <div className="flex items-center gap-2 mb-3">
                <Users size={15} className="text-slate-400" />
                <h3 className="text-[10px] font-black text-slate-500 tracking-widest">
                    TESLİM EDİLENLER {subs ? `(${subs.length})` : ''}
                </h3>
            </div>

            {subs === null && (
                <div className="flex items-center gap-2 text-slate-400 text-[12.5px] font-medium">
                    <Loader2 size={14} className="animate-spin" /> Yükleniyor…
                </div>
            )}

            {subs?.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-2 py-10 text-slate-400">
                    <Inbox size={30} />
                    <p className="text-[12.5px] font-bold">Henüz teslim yok.</p>
                    <p className="text-[11px]">Öğrenciler görevi gönderdiğinde burada listelenir.</p>
                </div>
            )}

            <div className="space-y-2">
                {subs?.map((s, i) => (
                    <div key={i} className="border-2 border-slate-200 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className="w-6 h-6 rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-[11px] font-black">
                                {(s.student_name || 'Ö')[0]}
                            </span>
                            <span className="text-[12.5px] font-black text-slate-700">{s.student_name || `Öğrenci #${s.student_id}`}</span>
                            {s.submitted_at && (
                                <span className="ml-auto text-[10.5px] text-slate-400 font-medium">
                                    {new Date(s.submitted_at).toLocaleString('tr-TR')}
                                </span>
                            )}
                        </div>
                        {s.student_note && (
                            <pre className="bg-slate-50 border-2 border-slate-200 rounded-lg p-2 text-[11.5px] font-mono text-slate-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                                {s.student_note}
                            </pre>
                        )}
                        {s.file_mime?.startsWith('image/') && s.file_data && (
                            <img src={`data:${s.file_mime};base64,${s.file_data}`} alt={s.file_name}
                                 className="mt-2 max-h-48 rounded-lg border-2 border-slate-200" />
                        )}
                        {s.file_name && !s.file_mime?.startsWith('image/') && (
                            <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11.5px] font-bold text-slate-500">
                                <FileIcon size={12} /> {s.file_name}
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    /* -------------------------------- LAYOUT -------------------------------- */
    return (
        <div className="w-full h-full flex gap-4 p-4 bg-slate-50 overflow-hidden">
            <div className="w-[36%] min-w-[280px] max-w-[420px] overflow-y-auto pr-1">{brief}</div>

            <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
                {isReview ? reviewPanel : (cfg.submissionType === 'code' ? codeWorkspace : uploadWorkspace)}

                {!isEdit && !isReview && (
                    <button
                        onClick={handleSubmit}
                        disabled={sending || sent}
                        className={`shrink-0 flex items-center justify-center gap-2 font-black text-sm py-2.5 rounded-xl border-2 border-b-[5px] active:border-b-2 active:translate-y-0.5 transition-all ${
                            sent ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                 : 'bg-cyan-500 hover:bg-cyan-400 text-white border-cyan-700'}`}
                    >
                        {sending ? <Loader2 size={15} className="animate-spin" /> : sent ? <Check size={15} /> : <Send size={15} />}
                        {sent ? 'Gönderildi' : sending ? 'Gönderiliyor…' : 'Görevi Gönder'}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ChallengeSlideBuilder;
