import React, { useEffect } from 'react';
import { Check, ExternalLink, Loader2, Play } from 'lucide-react';
import ChallengeResultPanel from './ChallengeResultPanel';
import { panelRuntime } from './challengeRuntime';
import { useChallengeCheck, type TaskCheckOptions } from './useChallengeCheck';
import { entryFile } from './challengeFiles';

/**
 * VS Code ders panelindeki (webview) UYGULA görevi.
 *
 * Panel dar; kod zaten yanda gerçek editörde. Bu yüzden burada kod ekranı YOK —
 * yalnızca "kontrol et" ve sonuç. Tarayıcıdaki karşılığı `ChallengeCodeLab`;
 * ikisi de aynı `useChallengeCheck` döngüsünü kullanır, yalnızca VS Code'a
 * ulaşma yolları (postMessage / yerel HTTP) farklıdır.
 */

interface Props {
    /** Görevin dosyaları, ölçütleri ve geri çağrıları (bkz. useChallengeCheck). */
    task: TaskCheckOptions;
}

const ChallengeVSCodePanel: React.FC<Props> = ({ task }) => {
    const { files, xp = 50 } = task;
    const entry = entryFile(files);

    const check = useChallengeCheck({ ...task, runtime: panelRuntime });

    // Eklenti "Görevi Kontrol Et" komutunu editörden de sunuyor (CodeLens);
    // oradan tetiklenince kontrolü panelde biz yürütüyoruz.
    useEffect(() => {
        const onMsg = (e: MessageEvent) => {
            if (e.data?.type === 'gomufi:runCheckFromVSCode') void check.handleCheck();
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, [check.handleCheck]);

    return (
        <div className="flex-1 min-h-0 flex flex-col gap-2">
            {/* Görevin dosyaları. Panel dar; hepsi tek şeritte, çalıştırılan
                dosya vurgulu — öğrenci hangi sekmeye döneceğini bilmeli. */}
            <div className="shrink-0 flex items-center gap-1.5 bg-[#131a33] border-2 border-slate-700 rounded-xl px-2.5 py-1.5 flex-wrap">
                <ExternalLink className="w-3 h-3 text-sky-400 shrink-0" />
                {files.map((f) => (
                    <span
                        key={f.name}
                        className={`font-mono text-[11px] truncate ${
                            f.name === entry.name ? 'text-sky-300 font-bold' : 'text-slate-500'}`}
                    >
                        {f.name}
                    </span>
                ))}
                {check.opened && <Check className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />}
            </div>

            <button
                onClick={check.handleCheck}
                disabled={check.running}
                className="shrink-0 flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-black text-[12px] py-2 rounded-xl border-2 border-emerald-700 border-b-[4px] active:border-b-2 active:translate-y-0.5 transition-all"
            >
                {check.running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {check.status === 'running' ? 'Terminalde çalışıyor…'
                    : check.status === 'checking' ? 'Kontrol ediliyor…'
                    : 'Kontrol Et'}
            </button>

            <div className="flex-1 min-h-0 bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-2.5 overflow-y-auto">
                <h3 className="text-[9.5px] font-black text-slate-500 tracking-widest mb-1.5">ÇIKTI</h3>
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
                />
            </div>
        </div>
    );
};

export default ChallengeVSCodePanel;
