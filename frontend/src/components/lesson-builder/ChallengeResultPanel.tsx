import React from 'react';
import { AlertTriangle, Check, Clock, Loader2, Sparkles, Trophy, X, PlugZap, UserCheck, Pin } from 'lucide-react';
import type { CriterionResult } from './challengeCheck';
import type { CheckStatus } from './useChallengeCheck';

/**
 * Bir kontrolün SONUCU: çıktı, hata, ölçüt listesi ve koçun ipucu.
 *
 * Görevin nerede çözüldüğünden bağımsız — VS Code panelinde de, tarayıcıdaki
 * kod laboratuvarında da öğrencinin gördüğü geri bildirim aynı olmalı. İki
 * kopya olsaydı biri "test geçti" derken diğeri sessiz kalırdı.
 */

/** Görev metnindeki kod parçalarını (fonksiyon, string, sayı) rozetlere çevirir. */
export const renderFormattedPrompt = (text?: string) => {
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
    status: CheckStatus;
    stdout: string | null;
    stderr: string | null;
    checks: CriterionResult[];
    coach: string | null;
    coachLoading: boolean;
    activeHint: string | null;
    xp: number;
    onReveal: (line: number) => void;
    /** Henüz hiç kontrol edilmemişken gösterilen yönlendirme. */
    idleText?: string;
    /** "Editörde satıra git" yalnızca gerçek bir editör varken anlamlı (tarayıcıda yok). */
    canReveal?: boolean;
}

const ChallengeResultPanel: React.FC<Props> = ({
    status, stdout, stderr, checks, coach, coachLoading, activeHint, xp, onReveal,
    idleText = 'Kodunu yaz, sonra Kontrol Et\'e bas…', canReveal = true,
}) => (
    <>
        <div className="bg-slate-900 rounded-lg p-2 font-mono text-[11px] text-slate-100 whitespace-pre-wrap break-words min-h-[34px]">
            {status === 'running'
                ? <span className="text-slate-400">Program VS Code terminalinde çalışıyor…</span>
                : stdout === null
                ? <span className="text-slate-500">{idleText}</span>
                : (stdout || <span className="text-slate-500">(boş çıktı)</span>)}
        </div>

        {status === 'offline' && (
            <div className="mt-2 flex gap-1.5 bg-amber-50 border-2 border-amber-200 rounded-lg p-2">
                <PlugZap size={12} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-amber-800 leading-snug">
                    VS Code'a ulaşılamadı. Eklentinin açık ve giriş yapmış olduğundan emin ol,
                    sonra tekrar dene.
                </p>
            </div>
        )}

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
                            : c.status === 'pending' ? 'bg-slate-50 border-slate-200'
                            : 'bg-rose-50 border-rose-200'}`}>
                        <span className={`shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center ${
                            c.status === 'pass' ? 'bg-emerald-500 text-white'
                                : c.status === 'near' ? 'bg-amber-500 text-white'
                                : c.status === 'pending' ? 'bg-slate-300 text-white'
                                : 'bg-rose-500 text-white'}`}>
                            {c.status === 'fail' ? <X size={10} />
                                : c.status === 'pending' ? <Clock size={10} />
                                : <Check size={10} />}
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

        {status === 'ran' && (
            <div className="mt-2 flex gap-1.5 bg-sky-50 border-2 border-sky-200 rounded-lg p-2">
                <UserCheck size={12} className="text-sky-500 shrink-0 mt-0.5" />
                <p className="text-[11px] font-bold text-sky-800 leading-snug">
                    Kodun çalıştı. Bu görevi öğretmenin değerlendirecek — hazır olduğunda
                    Görevi Gönder'e bas.
                </p>
            </div>
        )}

        {coachLoading && (
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-indigo-600 font-bold bg-indigo-50 border border-indigo-200 rounded-xl p-2 animate-pulse">
                <Loader2 size={12} className="animate-spin text-indigo-600" /> AI Koç İpucu Hazırlanıyor…
            </div>
        )}

        {activeHint && status !== 'solved' && (
            <div className="mt-2.5 rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-amber-50/90 p-2.5 shadow-sm">
                <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 bg-indigo-600 text-white font-black text-[9px] uppercase tracking-wider rounded-md px-2 py-0.5 shadow-xs">
                        <Sparkles size={10} /> MUFİ AI İPUCU
                    </span>
                    {canReveal && <button
                        onClick={() => onReveal(2)}
                        className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-300 rounded-md px-2 py-0.5 text-[9.5px] font-bold shadow-2xs transition-all active:scale-95 cursor-pointer"
                    >
                        <Pin size={10} /> Editörde 2. Satıra Git
                    </button>}
                </div>
                <div className="text-[11.5px] font-medium text-slate-800 leading-snug">
                    {renderFormattedPrompt(activeHint)}
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
    </>
);

export default ChallengeResultPanel;
