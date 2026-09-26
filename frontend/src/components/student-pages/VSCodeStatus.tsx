import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, Loader2, MonitorSmartphone, PlugZap, Puzzle, RefreshCw, TerminalSquare, X } from 'lucide-react';
import { dropPairing, getPairing, pingLocalRunner } from '../../localRunnerClient';
import { isEmbeddedInVSCode } from '../../vscodeBridge';
import { switchToVSCode } from '../../vscodeTarget';
import { ChunkyButton, Mufi } from './ui';

/**
 * VS Code bağlantı durumu ve kurulum rehberi.
 *
 * NEDEN ÖNEMLİ: kod artık yalnızca öğrencinin VS Code'unda çalışıyor (tarayıcıda
 * Python yok). Bağlı olmayan öğrenci bir görevde "Çalıştır"a basınca ancak o an
 * öğreniyordu; artık üst çubukta her zaman görüyor ve tek tıkla rehbere ulaşıyor.
 */

export type VSCodeState = 'checking' | 'embedded' | 'connected' | 'offline';

const POLL_MS = 30_000;

/** `onOffline`: ilk kontrol "bağlı değil" dönünce bir kez çağrılır (rehberi açmak için). */
export const useVSCodeStatus = (onOffline?: () => void) => {
    const [state, setState] = useState<VSCodeState>(() => (isEmbeddedInVSCode() ? 'embedded' : 'checking'));
    const offlineRef = React.useRef(onOffline);
    useEffect(() => { offlineRef.current = onOffline; }, [onOffline]);
    const notified = React.useRef(false);

    const check = useCallback(async () => {
        // Panelin içindeysek durum baştan 'embedded' ve değişmez.
        if (isEmbeddedInVSCode()) return;
        dropPairing();
        const pairing = await getPairing(true);
        const next: VSCodeState = pairing && (await pingLocalRunner()) ? 'connected' : 'offline';
        setState(next);
        if (next === 'offline' && !notified.current) {
            notified.current = true;
            offlineRef.current?.();
        }
    }, []);

    useEffect(() => {
        const first = setTimeout(() => void check(), 0);
        const timer = setInterval(() => { if (document.visibilityState === 'visible') void check(); }, POLL_MS);
        const onFocus = () => void check();
        window.addEventListener('focus', onFocus);
        return () => { clearTimeout(first); clearInterval(timer); window.removeEventListener('focus', onFocus); };
    }, [check]);

    return { state, recheck: check };
};

const ok = (s: VSCodeState) => s === 'connected' || s === 'embedded';

/** Üst çubuktaki küçük durum hapı. Tıklayınca rehber açılır. */
export const VSCodeStatusChip: React.FC<{ state: VSCodeState; onClick: () => void; onDark?: boolean }> = ({ state, onClick, onDark }) => {
    const base = onDark ? 'bg-white/15 hover:bg-white/25 text-white border-white/20' : 'bg-white hover:bg-slate-50 border-slate-200';
    return (
        <button type="button" onClick={onClick}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs font-black transition-colors ${base}`}
                title={ok(state) ? 'VS Code bağlı' : 'VS Code bağlı değil — kurulum rehberi'}>
            {state === 'checking' ? (
                <Loader2 size={14} className="animate-spin" />
            ) : (
                <span className="relative flex w-2.5 h-2.5">
                    {!ok(state) && <span className="absolute inline-flex w-full h-full rounded-full bg-orange-400 opacity-75 animate-ping" />}
                    <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${ok(state) ? 'bg-emerald-400' : 'bg-orange-400'}`} />
                </span>
            )}
            <span className={onDark ? '' : ok(state) ? 'text-emerald-700' : 'text-orange-700'}>
                VS Code<span className="hidden sm:inline">{state === 'checking' ? '…' : ok(state) ? ' bağlı' : ' bağlı değil'}</span>
            </span>
        </button>
    );
};

const GUIDE_SEEN_KEY = 'gomufi.vscodeGuideSeen';

/** İlk girişte, VS Code bağlı değilse rehberi bir kez kendiliğinden aç. */
export const shouldAutoOpenGuide = (): boolean => {
    try {
        if (localStorage.getItem(GUIDE_SEEN_KEY)) return false;
        localStorage.setItem(GUIDE_SEEN_KEY, '1');
    } catch { return false; }
    return true;
};

const STEPS = [
    {
        icon: Download, title: 'VS Code\'u kur',
        text: 'Ücretsiz kod editörü. Bilgisayarında zaten varsa bu adımı geç.',
        action: { label: 'İndir', href: 'https://code.visualstudio.com/download' },
    },
    {
        icon: Puzzle, title: 'GoMufi eklentisini ekle',
        text: 'VS Code\'da sol taraftaki Eklentiler bölümünde "GoMufi" ara ve Yükle\'ye bas.',
        action: { label: 'VS Code\'da aç', href: 'vscode:extension/gomufi.gomufi' },
    },
    {
        icon: TerminalSquare, title: 'Python\'u kur',
        text: 'Python derslerinde kodun çalışması için gerekli. Eklenti eksikse sana söyler.',
        action: { label: 'python.org', href: 'https://www.python.org/downloads/' },
    },
    {
        icon: PlugZap, title: 'Dersleri aç ve giriş yap',
        text: 'Eklenti ders klasörünü kendisi hazırlar. İlk seferde tarayıcıda açılan sayfada girişini onayla.',
        action: null,
    },
] as const;

export const VSCodeGuideModal: React.FC<{ state: VSCodeState; recheck: () => Promise<void>; onClose: () => void }> = ({ state, recheck, onClose }) => {
    const [checking, setChecking] = useState(false);
    const connected = ok(state);

    const again = async () => {
        setChecking(true);
        try { await recheck(); } finally { setChecking(false); }
    };

    return (
        <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}
             role="dialog" aria-modal="true" aria-label="VS Code kurulum rehberi">
            <div className="bg-white w-full sm:max-w-xl rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden max-h-[92dvh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="relative bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white px-6 pt-6 pb-5 flex items-end gap-4">
                    <Mufi pose={connected ? 'wave' : 'build'} className="w-20 -mb-5 shrink-0" />
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-wider text-violet-100 flex items-center gap-1.5"><MonitorSmartphone size={14} /> Kod yazma alanın</p>
                        <h2 className="text-xl md:text-2xl font-black font-display leading-tight">
                            {connected ? 'VS Code hazır, kod yazabilirsin!' : 'VS Code\'u 4 adımda hazırla'}
                        </h2>
                    </div>
                    <button type="button" onClick={onClose} aria-label="Kapat" className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30"><X size={18} /></button>
                </div>

                <div className="p-6 space-y-3">
                    {connected ? (
                        <div className="p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500 shrink-0" />
                            <p className="text-sm font-bold text-emerald-800">
                                {state === 'embedded' ? 'Bu sayfa VS Code\'un içinde açık.' : 'VS Code açık ve hesabına bağlı.'} Görevlerdeki kodların orada çalışacak.
                            </p>
                        </div>
                    ) : (
                        <p className="text-sm font-bold text-slate-500">
                            GoMufi'de kodlar senin bilgisayarında, gerçek bir kod editöründe çalışır. Bir kere kurman yeterli.
                        </p>
                    )}

                    <ol className="space-y-2.5">
                        {STEPS.map((step, i) => (
                            <li key={step.title} className="flex items-start gap-3 p-3 rounded-2xl border-2 border-slate-100">
                                <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center font-black shrink-0">{i + 1}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-black text-slate-800 flex items-center gap-1.5"><step.icon size={16} className="text-violet-500 shrink-0" /> {step.title}</p>
                                    <p className="text-xs font-bold text-slate-500 mt-0.5">{step.text}</p>
                                    {step.action && (
                                        <a href={step.action.href} target={step.action.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer"
                                           className="mt-2 inline-flex items-center gap-1 text-xs font-black text-violet-600 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-xl">
                                            {step.action.label} <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            </li>
                        ))}
                    </ol>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <ChunkyButton variant="primary" size="lg" className="flex-1" onClick={() => switchToVSCode()}>
                            <PlugZap size={18} /> Dersleri VS Code'da aç
                        </ChunkyButton>
                        <ChunkyButton variant="white" size="lg" onClick={() => void again()} disabled={checking}>
                            {checking ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />} Tekrar kontrol et
                        </ChunkyButton>
                    </div>
                </div>
            </div>
        </div>
    );
};
