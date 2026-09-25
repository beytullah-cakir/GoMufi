import React, { useCallback, useEffect, useState } from 'react';
import {
    Check, Loader2, Monitor, Play, PlugZap, RefreshCw, Zap, PenLine,
} from 'lucide-react';
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
 * Eklenti yoksa yol kapanmıyor: `onFallback` ile tarayıcı içi editöre dönülür.
 */

type Connection = 'probing' | 'online' | 'offline';

interface Props {
    /** Görevin dosyaları, ölçütleri ve geri çağrıları (bkz. useChallengeCheck). */
    task: TaskCheckOptions;
    /** "Tarayıcıda yaz" — eklentisi olmayan öğrenci için tarayıcı editörü. */
    onFallback?: () => void;
}

const ChallengeCodeLab: React.FC<Props> = ({ task, onFallback }) => {
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

    return (
        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] overflow-hidden">
            {/* ── Başlık: laboratuvar kimliği + bağlantı ışığı ── */}
            <div className="shrink-0 flex items-center gap-2 px-3 py-2.5 bg-slate-900 border-b-2 border-slate-800">
                <Monitor size={14} className="text-sky-400 shrink-0" />
                <span className="text-[11px] font-black tracking-widest text-white">KOD LABORATUVARI</span>
                <span className="ml-auto flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                        online ? 'bg-emerald-400 animate-pulse'
                            : connection === 'probing' ? 'bg-amber-400 animate-pulse' : 'bg-rose-400'}`} />
                    <span className="font-mono text-[10px] text-slate-300">
                        {language === 'python' ? 'Python' : language} · {entry.name}
                        {files.length > 1 && ` +${files.length - 1}`}
                    </span>
                </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
                {/* ── VS Code'a geçiş ── */}
                <div className={`rounded-xl border-2 border-b-[4px] p-3 ${
                    online ? 'bg-sky-50/70 border-sky-200' : 'bg-amber-50/70 border-amber-200'}`}>
                    {connection === 'probing' ? (
                        <p className="flex items-center gap-2 text-[12px] font-bold text-slate-500">
                            <Loader2 size={14} className="animate-spin" /> VS Code aranıyor…
                        </p>
                    ) : online ? (
                        <>
                            <p className="text-[12.5px] font-bold text-slate-700 leading-snug">
                                {launched
                                    ? 'Kodunu VS Code\'da yaz. Yazdıkça kaydet, sonra buradan kontrol et.'
                                    : 'Bu görevi VS Code\'da açalım mı? Kodunu orada yazacaksın.'}
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-slate-500 leading-snug">
                                {check.opened
                                    ? files.length > 1
                                        ? <>{files.length} dosya VS Code'a gönderildi. Program <span className="font-mono font-bold text-slate-700">{entry.name}</span> dosyasından çalışır.</>
                                        : <>Görev <span className="font-mono font-bold text-slate-700">{entry.name}</span> olarak VS Code'a gönderildi.</>
                                    : 'Görev dosyaları VS Code\'a gönderiliyor…'}
                            </p>

                            {/* Çok dosyalı görevde öğrenci HANGİ dosyada ne olduğunu
                                bilmeli: çalıştırılan dosya işaretli, ötekiler yanında. */}
                            {files.length > 1 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {files.map((f) => (
                                        <span
                                            key={f.name}
                                            className={`inline-flex items-center gap-1 rounded-md border-2 px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                                                f.name === entry.name
                                                    ? 'bg-sky-100 border-sky-300 text-sky-800'
                                                    : 'bg-white border-slate-200 text-slate-500'}`}
                                        >
                                            {f.name === entry.name && <Play size={9} />} {f.name}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            <p className="text-[12.5px] font-black text-amber-800 leading-snug">
                                VS Code bağlantısı bulunamadı.
                            </p>
                            <p className="mt-1 text-[11px] font-medium text-amber-700/90 leading-snug">
                                GoMufi eklentisinin kurulu, VS Code'un açık ve eklentide giriş yapmış
                                olman gerekiyor. Kurulumun varsa VS Code'u açıp tekrar dene.
                            </p>
                        </>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <button
                            onClick={openInVSCode}
                            className="flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-white font-black text-[12px] px-3.5 py-1.5 rounded-lg border-2 border-sky-700 border-b-[4px] active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer"
                        >
                            <Zap size={13} /> VS CODE'U AÇ
                        </button>

                        {!online && (
                            <button
                                onClick={() => void probe(true)}
                                disabled={connection === 'probing'}
                                className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-600 font-bold text-[11.5px] px-3 py-1.5 rounded-lg border-2 border-slate-200 border-b-[4px] active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-60"
                            >
                                <RefreshCw size={12} className={connection === 'probing' ? 'animate-spin' : ''} />
                                Yeniden dene
                            </button>
                        )}

                        {onFallback && (
                            <button
                                onClick={onFallback}
                                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 font-bold text-[11px] px-1.5 py-1 underline decoration-dotted underline-offset-2 cursor-pointer"
                            >
                                <PenLine size={12} /> Tarayıcıda yaz
                            </button>
                        )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[10.5px] font-bold">
                        {online ? (
                            <>
                                <Check size={12} className="text-emerald-600" />
                                <span className="text-emerald-700">VS Code bağlantısı aktif</span>
                            </>
                        ) : (
                            <>
                                <PlugZap size={12} className="text-slate-400" />
                                <span className="text-slate-500">
                                    {connection === 'probing' ? 'Bağlantı kontrol ediliyor…' : 'Bağlantı yok'}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Son kontrol ── */}
                <div>
                    <h3 className="text-[9.5px] font-black text-slate-500 tracking-widest mb-1.5">SON KONTROL</h3>
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
                        idleText="Henüz kod kontrol edilmedi. VS Code'da kodunu yaz, sonra Görevi Kontrol Et'e bas."
                    />
                </div>
            </div>

            {/* ── Kontrol düğmesi ── */}
            <div className="shrink-0 p-3 pt-0">
                <button
                    onClick={check.handleCheck}
                    disabled={check.running || !online}
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-black text-[12.5px] py-2 rounded-xl border-2 border-emerald-700 border-b-[4px] active:border-b-2 active:translate-y-0.5 transition-all cursor-pointer disabled:cursor-not-allowed"
                >
                    {check.running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                    {check.status === 'running' ? 'VS Code terminalinde çalışıyor…'
                        : check.status === 'checking' ? 'Kontrol ediliyor…'
                        : 'Görevi Kontrol Et'}
                </button>
            </div>
        </div>
    );
};

export default ChallengeCodeLab;
