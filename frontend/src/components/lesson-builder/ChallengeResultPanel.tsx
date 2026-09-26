import React from 'react';
import { AlertTriangle, Check, Clock, Loader2, Sparkles, Trophy, X, PlugZap, UserCheck, Pin } from 'lucide-react';
import type { CriterionResult } from './challengeCheck';
import type { CheckStatus } from './useChallengeCheck';
import MufiWaveImg from '../../assets/sprites/mufi/wave.webp';
import MufiPeekImg from '../../assets/sprites/mufi/peek.webp';

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
                        <code key={index} className="inline-block font-mono text-emerald-700 bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 rounded-md font-bold text-[12px] mx-0.5">
                            {part}
                        </code>
                    );
                }
                if (part.startsWith('`') && part.endsWith('`')) {
                    return (
                        <code key={index} className="inline-block font-mono text-sky-700 bg-sky-50 border border-sky-300 px-1.5 py-0.5 rounded-md font-bold text-[12px] mx-0.5">
                            {part.slice(1, -1)}
                        </code>
                    );
                }
                if (/^[a-zA-Z_]\w*\(\)$/.test(part)) {
                    return (
                        <code key={index} className="inline-block font-mono text-indigo-700 bg-indigo-50 border border-indigo-300 px-1.5 py-0.5 rounded-md font-bold text-[12px] mx-0.5">
                            {part}
                        </code>
                    );
                }
                if (/^\d+(?:\.\d+)?$/.test(part)) {
                    return (
                        <code key={index} className="inline-block font-mono text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-md font-bold text-[12px] mx-0.5">
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
    <div className="space-y-3">
        {/* Çıktı: gerçek bir terminal görünümü */}
        <div className="rounded-2xl bg-slate-900 overflow-hidden">
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-800">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                <span className="ml-2 text-[11px] font-black text-slate-400">Çıktı</span>
            </div>
            <div className="px-3 py-2.5 font-mono text-[12.5px] text-slate-100 whitespace-pre-wrap break-words min-h-[44px] leading-relaxed">
                {status === 'running'
                    ? <span className="text-slate-400">Program VS Code terminalinde çalışıyor…</span>
                    : stdout === null
                    ? <span className="text-slate-500 font-sans font-bold text-xs">{idleText}</span>
                    : (stdout || <span className="text-slate-500">(boş çıktı)</span>)}
            </div>
        </div>

        {status === 'offline' && (
            <div className="flex gap-2 bg-orange-50 border-2 border-orange-100 rounded-2xl p-3">
                <PlugZap size={16} className="text-orange-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-orange-800 leading-snug">
                    VS Code'a ulaşılamadı. Eklentinin açık ve giriş yapmış olduğundan emin ol, sonra tekrar dene.
                </p>
            </div>
        )}

        {stderr && (
            <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 overflow-hidden">
                <p className="flex items-center gap-1.5 px-3 py-2 text-xs font-black text-rose-700 border-b-2 border-rose-100">
                    <AlertTriangle size={14} /> Kodun hata verdi
                </p>
                <pre className="px-3 py-2 text-[12px] font-mono text-rose-800 whitespace-pre-wrap break-all leading-snug">{stderr}</pre>
            </div>
        )}

        {checks.length > 0 && (
            <div className="space-y-2">
                {checks.map((c) => (
                    <div key={c.id} className={`flex items-start gap-2.5 rounded-2xl border-2 px-3 py-2.5 ${
                        c.status === 'pass' ? 'bg-emerald-50 border-emerald-200'
                            : c.status === 'near' ? 'bg-amber-50 border-amber-200'
                            : c.status === 'pending' ? 'bg-slate-50 border-slate-200'
                            : 'bg-rose-50 border-rose-200'}`}>
                        <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                            c.status === 'pass' ? 'bg-emerald-500 text-white'
                                : c.status === 'near' ? 'bg-amber-500 text-white'
                                : c.status === 'pending' ? 'bg-slate-300 text-white'
                                : 'bg-rose-500 text-white'}`}>
                            {c.status === 'fail' ? <X size={14} strokeWidth={3} />
                                : c.status === 'pending' ? <Clock size={14} />
                                : <Check size={14} strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 leading-snug pt-0.5">
                            <span className="text-sm font-black text-slate-700 break-words">{c.label}</span>
                            {c.detail && (
                                <span className="block text-xs text-slate-500 font-bold mt-0.5 break-words">{c.detail}</span>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        )}

        {status === 'solved' && (
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-500 text-white border-b-4 border-emerald-700 px-4 py-3">
                <img src={MufiWaveImg} alt="" className="w-12 -my-2 shrink-0" />
                <div className="min-w-0 flex-1">
                    <p className="font-black">Görev tamam, süpersin!</p>
                    <p className="text-xs font-bold text-emerald-50">Şimdi alttan devam edebilirsin.</p>
                </div>
                <span className="shrink-0 flex items-center gap-1 bg-white text-amber-600 font-black text-sm rounded-xl px-3 py-1.5">
                    <Trophy size={15} /> +{xp} XP
                </span>
            </div>
        )}

        {status === 'ran' && (
            <div className="flex gap-2 bg-sky-50 border-2 border-sky-100 rounded-2xl p-3">
                <UserCheck size={16} className="text-sky-500 shrink-0 mt-0.5" />
                <p className="text-sm font-bold text-sky-800 leading-snug">
                    Kodun çalıştı. Bu görevi öğretmenin değerlendirecek; hazır olduğunda Görevi Gönder'e bas.
                </p>
            </div>
        )}

        {/* Koç: kod vermeden ipucu — Mufi konuşuyor */}
        {(coachLoading || (activeHint && status !== 'solved') || (coach && !coachLoading && status === 'solved')) && (
            <div className="flex items-start gap-2.5">
                <img src={MufiPeekImg} alt="" className="w-12 shrink-0 mt-1" />
                <div className="relative flex-1 min-w-0 bg-white border-2 border-violet-200 border-b-4 rounded-2xl rounded-tl-md px-3.5 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-violet-600">
                            <Sparkles size={12} /> {status === 'solved' ? 'Şunu da dene' : 'Mufi\'nin ipucu'}
                        </span>
                        {canReveal && activeHint && status !== 'solved' && (
                            <button
                                onClick={() => onReveal(2)}
                                className="inline-flex items-center gap-1 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg px-2 py-0.5 text-[11px] font-black transition-colors cursor-pointer"
                            >
                                <Pin size={11} /> Editörde 2. satıra git
                            </button>
                        )}
                    </div>
                    {coachLoading ? (
                        <p className="flex items-center gap-2 text-sm font-bold text-slate-500">
                            <Loader2 size={14} className="animate-spin text-violet-500" /> Kodunu inceliyorum…
                        </p>
                    ) : (
                        <div className="text-sm font-bold text-slate-700 leading-relaxed">
                            {status === 'solved' ? coach : renderFormattedPrompt(activeHint ?? '')}
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
);

export default ChallengeResultPanel;
