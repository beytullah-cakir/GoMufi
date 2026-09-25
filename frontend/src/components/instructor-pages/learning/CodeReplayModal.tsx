import React, { useEffect, useMemo, useState } from 'react';
import { ClipboardPaste, FileCode2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { learningApi } from './learningApi';
import { buildReplay, coloredRuns } from './provenanceReplay';
import { Empty, ErrorBox, FlagList, Loading, ProvenanceBar, SOURCE_STYLE, useLoad } from './learningUi';

/**
 * Kod oynatma: öğretmen öğrencinin kodu NASIL yazdığını baştan izler.
 *
 * Kaydırıcı her düzenleme adımında bir kare ilerler; kodun her parçası
 * kaynağının rengiyle boyanır (elle yazılan yeşil, dışarıdan yapıştırılan
 * kırmızı…). Yapıştırma anları kaydırıcının altında işaretli — öğretmen
 * doğrudan o ana atlayabilir.
 */

const JUMP_KINDS = new Set(['p', 'b', 'e']);
const JUMP_LABEL: Record<string, string> = { p: 'yapıştırma', b: 'toplu ekleme', e: 'dış değişiklik' };

const CodeReplayModal: React.FC<{
    courseId: number;
    studentId: number;
    studentName: string;
    taskKey: string;
    onClose: () => void;
}> = ({ courseId, studentId, studentName, taskKey, onClose }) => {
    const { data, error, loading } = useLoad(() => learningApi.code(courseId, studentId, taskKey), [courseId, studentId, taskKey]);
    const replay = useMemo(() => (data ? buildReplay(data, data.starters) : null), [data]);
    const total = replay?.steps.length ?? 0;
    const [position, setPosition] = useState<number | null>(null);
    const [playing, setPlaying] = useState(false);
    const [file, setFile] = useState<string | null>(null);
    const step = position ?? total;

    useEffect(() => {
        if (!playing) return;
        const timer = setInterval(() => {
            setPosition((p) => {
                const next = (p ?? 0) + 1;
                if (next >= total) { setPlaying(false); return total; }
                return next;
            });
        }, 60);
        return () => clearInterval(timer);
    }, [playing, total]);

    const frames = useMemo(() => replay?.frameAt(step) ?? {}, [replay, step]);
    const files = Object.keys(frames);
    const current = file && frames[file] ? file : files[0];
    const frame = current ? frames[current] : null;
    const jumps = useMemo(
        () => (replay?.steps ?? []).map((s, i) => ({ ...s, index: i + 1 })).filter((s) => JUMP_KINDS.has(s.kind) && s.inserted >= 20),
        [replay],
    );
    const at = replay && step > 0 ? replay.steps[step - 1]?.at : null;

    return (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
                    <div className="min-w-0">
                        <h2 className="text-base font-black text-gray-800 truncate">Kod oynatma · {studentName}</h2>
                        <p className="text-xs font-bold text-gray-400 truncate">{data?.task ?? taskKey}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><X size={18} /></button>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-4">
                    {loading && <Loading />}
                    {error && <ErrorBox message={error} />}
                    {data && !data.provenance.has_recording && (
                        <Empty>
                            Bu görev için yazım kaydı yok. Öğrenci kodu eklentinin eski bir sürümüyle ya da kayıt
                            başlamadan önce yazmış olabilir.
                        </Empty>
                    )}
                    {data && data.provenance.has_recording && (
                        <>
                            <div className="grid md:grid-cols-[1fr_260px] gap-4">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">SON KODUN KAYNAKLARI</p>
                                    <ProvenanceBar share={data.provenance.share} />
                                </div>
                                <div className="text-[11px] font-bold text-gray-500 space-y-0.5">
                                    <p>Aktif çalışma: {data.provenance.activity.active_minutes ?? 0} dk</p>
                                    <p>Yazılan: {data.provenance.activity.typed ?? 0} · Silinen: {data.provenance.activity.deleted ?? 0} karakter</p>
                                    <p>Yapıştırma: {data.provenance.activity.paste_events ?? 0} kez (en büyüğü {data.provenance.activity.max_paste ?? 0})</p>
                                    {data.provenance.ai_extensions.length > 0 && (
                                        <p className="text-violet-700">YZ eklentisi: {data.provenance.ai_extensions.join(', ')}</p>
                                    )}
                                </div>
                            </div>
                            {data.provenance.flags.length > 0 && <FlagList flags={data.provenance.flags} />}

                            {/* Oynatma denetimleri */}
                            <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-3 space-y-2">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { setPlaying(false); setPosition(0); }} className="p-1.5 rounded-lg hover:bg-white text-slate-600"><SkipBack size={15} /></button>
                                    <button
                                        onClick={() => { if (step >= total) setPosition(0); setPlaying(!playing); }}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-black"
                                    >
                                        {playing ? <Pause size={13} /> : <Play size={13} />} {playing ? 'Durdur' : 'Oynat'}
                                    </button>
                                    <button onClick={() => { setPlaying(false); setPosition(total); }} className="p-1.5 rounded-lg hover:bg-white text-slate-600"><SkipForward size={15} /></button>
                                    <input
                                        type="range" min={0} max={total} value={step}
                                        onChange={(e) => { setPlaying(false); setPosition(Number(e.target.value)); }}
                                        className="flex-1 accent-indigo-600"
                                    />
                                    <span className="text-[11px] font-black text-slate-500 tabular-nums w-24 text-right">
                                        {step}/{total} adım
                                    </span>
                                </div>
                                {at && (
                                    <p className="text-[10.5px] font-bold text-slate-400">
                                        {new Date(at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'medium' })}
                                    </p>
                                )}
                                {jumps.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {jumps.slice(0, 12).map((j) => (
                                            <button
                                                key={j.index}
                                                onClick={() => { setPlaying(false); setPosition(j.index); setFile(j.file); }}
                                                className="flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100"
                                            >
                                                <ClipboardPaste size={11} /> {JUMP_LABEL[j.kind]} · {j.inserted} karakter
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {files.length > 1 && (
                                <div className="flex gap-1">
                                    {files.map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFile(f)}
                                            className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-xl border ${f === current ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200'}`}
                                        >
                                            <FileCode2 size={12} /> {f}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <pre className="bg-slate-900 text-slate-100 rounded-2xl p-4 text-[12.5px] font-mono leading-relaxed overflow-auto max-h-[46vh] whitespace-pre-wrap break-words">
                                {frame && frame.text
                                    ? coloredRuns(frame).map((run, i) => (
                                        <span
                                            key={i}
                                            className={SOURCE_STYLE[run.source]?.mark ?? 'bg-slate-400/30 rounded-sm'}
                                            title={SOURCE_STYLE[run.source]?.label ?? run.source}
                                        >
                                            {run.text}
                                        </span>
                                    ))
                                    : <span className="text-slate-500">(boş)</span>}
                            </pre>
                            <p className="text-[10.5px] font-bold text-gray-400">
                                Renkli arka plan kodun öğrencinin elinden çıkmadığını gösterir (çubuktaki renklerle aynı).
                                Bu bir kanıttır, hüküm değil: öğrencinin kendi eski kodunu yapıştırmış olması da mümkündür.
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CodeReplayModal;
