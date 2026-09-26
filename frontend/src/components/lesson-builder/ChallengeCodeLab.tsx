import React, { useCallback, useEffect, useState } from 'react';
import {
    Check, Code2, Loader2, Play, PlugZap, RefreshCw, Zap,
} from 'lucide-react';
import MufiBuildImg from '../../assets/sprites/mufi/build.webp';
import { VSCodeGuideModal, type VSCodeState } from '../student-pages/VSCodeStatus';
import ChallengeResultPanel from './ChallengeResultPanel';
import { localRuntime } from './challengeRuntime';
import { useChallengeCheck, type TaskCheckOptions } from './useChallengeCheck';
import { dropPairing, focusVSCode, pingLocalRunner } from '../../localRunnerClient';
import { entryFile } from './challengeFiles';

/**
 * TARAYICIDAKİ UYGULA görevi: kod laboratuvarı.
 *
 * NEDEN TARAYICI İÇİ EDİTÖR DEĞİL: burada öğretilen şey Python değil, Python'la
 * ÇALIŞMAK. Kendi makinesinde dosya açan, kaydeden, terminalde çalıştıran,
 * hatayı editörde satırıyla gören öğrenci gerçek işi öğreniyor; sahte bir
 * editörde `print()` yazan öğrenci ise kursu bitirdiğinde VS Code'u ilk kez
 * açacak. Eklenti zaten öğrencinin bilgisayarında — görevi oraya gönderiyoruz.
 *
 * Öğrencinin gördüğü akış: "VS Code'da açalım mı?" → aç → yaz → kontrol et.
 * Kontrol tarayıcıda kalıyor çünkü ölçüm ve YZ koçu site tarafında
 * (bkz. `useChallengeCheck`).
 *
 * Eklenti yoksa "VS Code'u aç" gösterilir. Tarayıcı içi editör yok: tarayıcıda
 * çalışan Python sayfaya ve öğrencinin oturumuna erişebiliyordu.
 */

type Connection = 'probing' | 'online' | 'offline';

interface Props {
    /** Görevin dosyaları, ölçütleri ve geri çağrıları (bkz. useChallengeCheck). */
    task: TaskCheckOptions;
}

const ChallengeCodeLab: React.FC<Props> = ({ task }) => {
    const { files, xp = 50, language = 'python' } = task;
    const [connection, setConnection] = useState<Connection>('probing');
    const [launched, setLaunched] = useState(false);
    const entry = entryFile(files);

    const check = useChallengeCheck({
        ...task,
        runtime: localRuntime,
        // Bağlantı doğrulanmadan görev göndermeyi denemek her slaytta boşa bir
        // istek turu demek; ışık yeşile döndüğünde hazırlık kendiliğinden başlar.
        enabled: connection === 'online',
    });

    const probe = useCallback(async (force = false) => {
        if (force) dropPairing();
        setConnection('probing');
        setConnection((await pingLocalRunner()) ? 'online' : 'offline');
    }, []);

    useEffect(() => { void probe(); }, [probe]);

    // Kopan bağlantıyı kontrol denemesi de haber verir; ışık gerçeği göstersin.
    useEffect(() => {
        if (check.status === 'offline') setConnection('offline');
    }, [check.status]);

    // Öğrenci VS Code'u DERS AÇIKKEN kurabilir/açabilir. Bağlantı yokken sessizce
    // yokluyoruz ki kart, öğrenci sayfayı yenilemeden kendiliğinden canlansın.
    useEffect(() => {
        if (connection !== 'offline') return;
        const timer = setInterval(() => { void probe(true); }, 15_000);
        return () => clearInterval(timer);
    }, [connection, probe]);

    /** Görevi gönder + VS Code penceresini öne getir. */
    const openInVSCode = async () => {
        setLaunched(true);
        if (connection === 'online') await check.prepare();
        focusVSCode(language);
    };

    const online = connection === 'online';
    const [showGuide, setShowGuide] = useState(false);
    const vsState: VSCodeState = connection === 'probing' ? 'checking' : online ? 'connected' : 'offline';

    // Üç adım: aç → yaz → kontrol et. Öğrenci nerede olduğunu tek bakışta görsün.
    const steps = [
        { label: 'VS Code\'da aç', done: launched || check.opened },
        { label: 'Kodunu yaz ve kaydet', done: check.stdout !== null },
        { label: 'Kontrol et', done: check.status === 'solved' },
    ];

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-3xl border-2 border-slate-200 border-b-[6px] overflow-hidden">
            {showGuide && <VSCodeGuideModal state={vsState} recheck={() => probe(true)} onClose={() => setShowGuide(false)} />}

            {/* ── Başlık: kod alanı + bağlantı durumu ── */}
            <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b-2 border-slate-100">
                <span className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center shrink-0"><Code2 size={18} /></span>
                <div className="min-w-0">
                    <p className="text-sm font-black text-slate-800 leading-tight">Kod alanın</p>
                    <p className="text-[11px] font-bold text-slate-400 truncate font-mono">
                        {language === 'python' ? 'Python' : language} · {entry.name}{files.length > 1 && ` +${files.length - 1}`}
                    </p>
                </div>
                <button type="button" onClick={() => setShowGuide(true)}
                        className={`ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 text-xs font-black ${
                            online ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                : connection === 'probing' ? 'bg-slate-50 border-slate-200 text-slate-500'
                                : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                    {connection === 'probing' ? <Loader2 size={12} className="animate-spin" />
                        : <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} />}
                    {connection === 'probing' ? 'Aranıyor…' : online ? 'VS Code bağlı' : 'VS Code bağlı değil'}
                </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {online ? (
                    <>
                        <ol className="flex items-center gap-2">
                            {steps.map((st, i) => (
                                <li key={st.label} className="flex items-center gap-2 min-w-0 flex-1">
                                    <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-black ${
                                        st.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        {st.done ? <Check size={14} strokeWidth={3} /> : i + 1}
                                    </span>
                                    <span className={`text-xs font-black truncate ${st.done ? 'text-emerald-700' : 'text-slate-500'}`}>{st.label}</span>
                                    {i < steps.length - 1 && <span className="hidden sm:block flex-1 h-0.5 rounded-full bg-slate-100 min-w-3" />}
                                </li>
                            ))}
                        </ol>

                        <div className="rounded-2xl bg-violet-50 border-2 border-violet-100 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                            <p className="text-sm font-bold text-slate-700 flex-1">
                                {!(launched || check.opened)
                                    ? 'Görevin dosyası hazır. VS Code\'da açıp kodunu orada yaz.'
                                    : files.length > 1
                                        ? <>{files.length} dosya VS Code'da. Program <span className="font-mono font-black">{entry.name}</span> dosyasından çalışır.</>
                                        : <>Kodunu VS Code'da <span className="font-mono font-black">{entry.name}</span> dosyasına yaz, kaydet, sonra burada kontrol et.</>}
                            </p>
                            <button onClick={openInVSCode}
                                    className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white font-black text-sm border-b-4 border-violet-700 active:translate-y-1 active:border-b-0 transition-all duration-75">
                                <Zap size={16} /> {launched || check.opened ? 'VS Code\'a geç' : 'VS Code\'da aç'}
                            </button>
                        </div>

                        {files.length > 1 && (
                            <div className="flex flex-wrap gap-1.5">
                                {files.map((f) => (
                                    <span key={f.name} className={`inline-flex items-center gap-1 rounded-lg border-2 px-2 py-0.5 font-mono text-[11px] font-bold ${
                                        f.name === entry.name ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-500'}`}>
                                        {f.name === entry.name && <Play size={10} />} {f.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </>
                ) : connection === 'probing' ? (
                    <p className="flex items-center justify-center gap-2 py-8 text-sm font-bold text-slate-400">
                        <Loader2 size={16} className="animate-spin" /> VS Code aranıyor…
                    </p>
                ) : (
                    <div className="rounded-2xl bg-orange-50 border-2 border-orange-100 p-4 flex items-start gap-3">
                        <img src={MufiBuildImg} alt="" className="w-16 shrink-0" />
                        <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-800">Önce VS Code'u açalım</p>
                            <p className="text-sm font-bold text-slate-500 mt-0.5">
                                Kodun kendi bilgisayarında, VS Code'da çalışır. Açıksa ve GoMufi eklentisine giriş yaptıysan birkaç saniyede bağlanır.
                            </p>
                            <div className="flex flex-wrap gap-2 mt-3">
                                <button onClick={openInVSCode}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-violet-500 hover:bg-violet-600 text-white font-black text-sm border-b-4 border-violet-700 active:translate-y-1 active:border-b-0 transition-all duration-75">
                                    <Zap size={15} /> VS Code'u aç
                                </button>
                                <button onClick={() => void probe(true)}
                                        className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-white hover:bg-slate-50 text-slate-600 font-black text-sm border-2 border-b-4 border-slate-200 active:translate-y-0.5 active:border-b-2 transition-all duration-75">
                                    <RefreshCw size={14} /> Tekrar dene
                                </button>
                                <button onClick={() => setShowGuide(true)}
                                        className="inline-flex items-center gap-1.5 h-10 px-2 text-sm font-black text-violet-600 hover:underline">
                                    <PlugZap size={14} /> Kurulum rehberi
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <ChallengeResultPanel
                    status={check.status}
                    stdout={check.stdout}
                    stderr={check.stderr}
                    checks={check.checks}
                    coach={check.coach}
                    coachLoading={check.coachLoading}
                    activeHint={check.activeHint}
                    xp={xp}
                    onReveal={check.reveal}
                    idleText="Henüz kontrol edilmedi. Kodunu VS Code'da yazıp kaydet, sonra Kontrol et'e bas."
                />
            </div>

            {/* ── Kontrol düğmesi ── */}
            <div className="shrink-0 p-4 pt-0">
                <button
                    onClick={check.handleCheck}
                    disabled={check.running || !online}
                    className="w-full h-12 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:text-slate-400 disabled:border-slate-300 text-white font-black text-base rounded-2xl border-b-4 border-emerald-700 active:translate-y-1 active:border-b-0 transition-all duration-75 disabled:cursor-not-allowed"
                >
                    {check.running ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} className="fill-current" />}
                    {check.status === 'running' ? 'VS Code terminalinde çalışıyor…'
                        : check.status === 'checking' ? 'Kontrol ediliyor…'
                        : 'Kontrol et'}
                </button>
            </div>
        </div>
    );
};

export default ChallengeCodeLab;
