import React, { useCallback, useEffect, useState } from 'react';
import {
    Check, ExternalLink, Loader2, Play, Sparkles, Trophy, X, AlertTriangle,
} from 'lucide-react';
import api from '../../api';
import { checkTaskInVSCode, prepareTaskInVSCode, showHintInVSCode, revealLineInVSCode, showSuccessInVSCode } from '../../vscodeBridge';
import { evaluate, makeAIJudge, type CriterionResult } from './challengeCheck';
import type { ChallengeCriterion } from './types';

const renderFormattedPrompt = (text?: string) => {
    if (!text) return null;
    const regex = /('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`[^`]+`|\b[a-zA-Z_]\w*\(\)|\b\d+(?:\.\d+)?\b)/g;
    const parts = text.split(regex);
    if (parts.length === 1) {
        return <span className="whitespace-pre-wrap">{text}</span>;
    }
    return (
        <span className="whitespace-pre-wrap">
            {parts.map((part, index) => {
                if (!part) return null;
                if ((part.startsWith("'") && part.endsWith("'")) || (part.startsWith('"') && part.endsWith('"'))) {
                    return (
                        <code key={index} className="inline-block font-mono text-emerald-700 bg-emerald-50 border border-emerald-300 px-1 py-0.5 rounded font-bold text-[10.5px] mx-0.5">
                            {part}
                        </code>
                    );
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return (
                        <code key={index} className="inline-block font-mono text-sky-700 bg-sky-50 border border-sky-300 px-1 py-0.5 rounded font-bold text-[10.5px] mx-0.5">
                            {part.slice(1, -1)}
                        </code>
                    );
                }
                if (/^[a-zA-Z_]\w*\(\)$/.test(part)) {
                    return (
                        <code key={index} className="inline-block font-mono text-indigo-700 bg-indigo-50 border border-indigo-300 px-1 py-0.5 rounded font-bold text-[10.5px] mx-0.5">
                            {part}
                        </code>
                    );
                }
                if (/^\d+(?:\.\d+)?$/.test(part)) {
                    return (
                        <code key={index} className="inline-block font-mono text-amber-700 bg-amber-50 border border-amber-300 px-1 py-0.5 rounded font-bold text-[10.5px] mx-0.5">
                            {part}
                        </code>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
};

interface Props {
    task: string;
    starter: string;
    criteria: ChallengeCriterion[];
    samples: Array<{ input: string; output: string }>;
    courseId?: number | string;
    xp?: number;
    onSolved?: () => void;
    onCodeRead?: (code: string) => void;
}

const ChallengeVSCodePanel: React.FC<Props> = ({
    task, starter, criteria, samples = [], courseId, xp = 50,
    onSolved, onCodeRead,
}) => {
    const [status, setStatus] = useState<'idle' | 'running' | 'checking' | 'solved' | 'diff' | 'error'>('idle');
    const [opened, setOpened] = useState(false);
    const [stdout, setStdout] = useState<string | null>(null);
    const [stderr, setStderr] = useState<string | null>(null);
    const [checks, setChecks] = useState<CriterionResult[]>([]);
    const [attempt, setAttempt] = useState(0);

    const [coach, setCoach] = useState<string | null>(null);
    const [coachLoading, setCoachLoading] = useState(false);

    const language = 'python';
    const stdin = samples.map((s) => (s.input ?? '').trim()).filter(Boolean).join('\n');

    useEffect(() => {
        let alive = true;
        prepareTaskInVSCode(starter, language).then((r) => {
            if (alive && r?.ok) setOpened(true);
        });
        return () => { alive = false; };
    }, [starter, language]);

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
                showHintInVSCode(text, Number(res.data?.line) || 0, language);
            }
        } catch {
            setCoach(null);
        } finally {
            setCoachLoading(false);
        }
    }, [courseId, task, language]);

    const handleCheck = async () => {
        setStatus('running');
        setCoach(null);

        const result = await checkTaskInVSCode(language, 'student', stdin);
        if (!result || !result.ok) {
            setStatus('error');
            setStderr(result?.error || 'VS Code yanıt vermedi.');
            setStdout(null);
            return;
        }

        const tryNo = attempt + 1;
        setAttempt(tryNo);
        onCodeRead?.(result.code);
        setStdout(result.stdout);
        setStderr(result.timedOut ? 'Kod 10 saniyede bitmedi.' : result.stderr);

        if (result.timedOut || result.stderr.trim()) {
            setChecks([]);
            setStatus('error');
            showHintInVSCode(result.stderr || 'Kodda bir hata var.', 1, language);
            void askCoach('error', result.code, result.stdout, result.stderr, tryNo);
            return;
        }

        setStatus('checking');
        const outcome = await evaluate(
            criteria, result.code, result.stdout,
            makeAIJudge(courseId, task, result.code, result.stdout),
        );
        setChecks(outcome.results);

        if (!outcome.passed) {
            setStatus('diff');
            const failedCheck = outcome.results.find(r => r.status === 'fail' || r.status === 'near');
            const immediateHint = outcome.failureSummary || failedCheck?.detail || failedCheck?.label || 'Çıktını kontrol et.';
            showHintInVSCode(immediateHint, 2, language);

            void askCoach(
                'diff', result.code, result.stdout, '', tryNo,
                outcome.failureSummary || undefined,
            );
            return;
        }

        setStatus('solved');
        showSuccessInVSCode('Tebrikler! Görevi başarıyla çözdün.', xp, language);
        onSolved?.();
        void askCoach('quality', result.code, result.stdout, '', tryNo);
    };

    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.data?.type === 'gomufi:runCheckFromVSCode') {
                void handleCheck();
            }
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, [handleCheck]);

    const running = status === 'running' || status === 'checking';
    const failedCheck = checks.find(c => c.status === 'fail' || c.status === 'near');
    const activeHintText = coach || failedCheck?.detail || failedCheck?.label || null;

    return (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
            <div className="shrink-0 flex items-center gap-1.5 bg-[#131a33] border-2 border-slate-700 rounded-xl px-2.5 py-1.5">
                <ExternalLink className="w-3 h-3 text-sky-400 shrink-0" />
                <span className="font-mono text-[11px] text-sky-300 truncate">gorev.py</span>
                {opened && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
            </div>

            <button
                onClick={handleCheck}
                disabled={running}
                className="shrink-0 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-black text-[12px] py-2 rounded-xl border-2 border-emerald-700 border-b-[4px] active:border-b-2 active:translate-y-0.5 transition-all"
            >
                {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {status === 'running' ? 'Terminalde çalışıyor…'
                    : status === 'checking' ? 'Kontrol ediliyor…'
                    : 'Kontrol Et'}
            </button>

            <div className="flex-1 min-h-0 bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-2.5 overflow-y-auto">
                <h3 className="text-[9.5px] font-black text-slate-500 tracking-widest mb-1.5">ÇIKTI</h3>

                <div className="bg-slate-900 rounded-lg p-2 font-mono text-[11px] text-slate-100 whitespace-pre-wrap break-words min-h-[34px]">
                    {status === 'running'
                        ? <span className="text-slate-400">Program çalışıyor…</span>
                        : stdout === null
                        ? <span className="text-slate-500">Kodunu yaz, sonra Kontrol Et'e bas…</span>
                        : (stdout || <span className="text-slate-500">(boş çıktı)</span>)}
                </div>

                {stderr && (
                    <div className="mt-2 flex gap-1.5 bg-rose-50 border-2 border-rose-200 rounded-lg p-2">
                        <AlertTriangle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                        <pre className="text-[10.5px] font-mono text-rose-700 whitespace-pre-wrap break-all min-w-0 leading-snug">{stderr}</pre>
                    </div>
                )}

                {checks.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {checks.map((c) => (
                            <div key={c.id} className={`flex items-start gap-1.5 rounded-lg border-2 px-2 py-1.5 text-[11px] ${
                                c.status === 'pass' ? 'bg-emerald-50 border-emerald-200'
                                    : c.status === 'near' ? 'bg-amber-50 border-amber-200'
                                    : 'bg-rose-50 border-rose-200'}`}>
                                <span className={`shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center ${
                                    c.status === 'pass' ? 'bg-emerald-500 text-white'
                                        : c.status === 'near' ? 'bg-amber-500 text-white'
                                        : 'bg-rose-500 text-white'}`}>
                                    {c.status === 'fail' ? <X size={10} /> : <Check size={10} />}
                                </span>
                                <span className="min-w-0 leading-snug">
                                    <span className="font-bold text-slate-700 break-words">{c.label}</span>
                                    {c.detail && (
                                        <span className="block text-slate-500 font-medium mt-0.5 break-words">{c.detail}</span>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                {status === 'solved' && (
                    <div className="mt-2 flex items-center gap-1.5 text-amber-600 font-black text-[12.5px]">
                        <Trophy size={14} /> +{xp} XP
                    </div>
                )}

                {coachLoading && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-200 rounded-xl p-2 animate-pulse">
                        <Loader2 size={12} className="animate-spin text-indigo-600" /> AI Koç İpucu Hazırlanıyor…
                    </div>
                )}

                {activeHintText && status !== 'solved' && (
                    <div className="mt-2.5 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-amber-50/90 p-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                            <span className="inline-flex items-center gap-1 bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider rounded-md px-2 py-0.5 shadow-xs">
                                <Sparkles size={10} /> MUFİ AI İPUCU
                            </span>
                            <button
                                onClick={() => revealLineInVSCode(2, language)}
                                className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-300 rounded-md px-2 py-0.5 text-[9.5px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                                📌 Editörde 2. Satıra Git
                            </button>
                        </div>
                        <div className="text-[11.5px] font-medium text-slate-800 leading-snug">
                            {renderFormattedPrompt(activeHintText)}
                        </div>
                    </div>
                )}

                {coach && !coachLoading && status === 'solved' && (
                    <div className="mt-2 rounded-xl border-2 bg-amber-50 border-amber-200 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Sparkles size={11} className="text-amber-500" />
                            <span className="text-[9.5px] font-black tracking-widest text-amber-700">
                                ŞUNU DA DENE
                            </span>
                        </div>
                        <p className="text-[11.5px] font-medium text-slate-700 leading-snug">{coach}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChallengeVSCodePanel;
