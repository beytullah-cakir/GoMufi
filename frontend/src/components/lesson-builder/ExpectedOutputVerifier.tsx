import React, { useState } from 'react';
import { AlertTriangle, Loader2, Pencil, Play, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { usePyodide } from '../../hooks/usePyodide';
import { checkTaskInVSCode, isEmbeddedInVSCode, prepareTaskInVSCode } from '../../vscodeBridge';
import type { ChallengeConfig, ChallengeCriterion, CriterionKind } from './types';

/**
 * Beklenen çıktıyı ÖLÇEREK üretir.
 *
 * NEDEN: `expectedOutput` eskiden elle yazılıyordu ve doğruluğunu hiçbir şey
 * denetlemiyordu. Bir boşluk fazla yazıldığında öğrenci doğru kodu yazmasına
 * rağmen "yanlış" alıyor, üstelik YZ koçu olmayan bir hatayı açıklamaya
 * çalışıyordu. Burada öğretmen çözümü yazıyor, çıktıyı sistem çalıştırıp
 * kendisi dolduruyor — tahmin değil ölçüm.
 *
 * NEREDE ÇALIŞIR: öğretmenin VS Code'u eşliyse orada (gerçek yorumlayıcı,
 * öğrencininkiyle aynı ortam), değilse tarayıcıdaki Pyodide. Hiçbiri çalışmazsa
 * (ör. Arduino görevi) otomatik kontrol dürüstçe kapatılır — sistem
 * çalıştıramadığı şeyi çalıştırabiliyormuş gibi göstermemeli.
 */

interface Props {
    cfg: ChallengeConfig;
    patch: (updates: Partial<ChallengeConfig>) => void;
}

const ExpectedOutputVerifier: React.FC<Props> = ({ cfg, patch }) => {
    const [running, setRunning] = useState(false);
    const [failure, setFailure] = useState<string | null>(null);
    const [manualEdit, setManualEdit] = useState(false);
    const { runAndCapture } = usePyodide();

    const solution = cfg.solutionCode || '';
    const verified = !!cfg.outputVerified;

    const verify = async () => {
        if (!solution.trim()) {
            setFailure('Önce çözüm kodunu yaz.');
            return;
        }
        setRunning(true);
        setFailure(null);

        try {
            if (isEmbeddedInVSCode()) {
                // Öğretmen paneli VS Code'da açtıysa çözümü öğrencinin ortamında
                // doğrula — kurulu paketler ve gerçek sürüm burada belirleyici.
                await prepareTaskInVSCode(solution, 'python', 'solution');
                const res = await checkTaskInVSCode('python', 'solution');
                if (!res?.ok) throw new Error(res?.error || 'VS Code yanıt vermedi.');
                if (res.timedOut) throw new Error('Çözüm 10 saniyede bitmedi.');
                if (res.stderr.trim()) throw new Error(res.stderr.trim());
                patch({ expectedOutput: res.stdout.trimEnd(), outputVerified: true });
            } else {
                const { stdout, error } = await runAndCapture(solution);
                if (error) throw new Error(error);
                patch({ expectedOutput: (stdout || '').trimEnd(), outputVerified: true });
            }
            setManualEdit(false);
        } catch (err) {
            // Başarısızlık iki anlama gelebilir: çözüm hatalı ya da bu görev
            // burada hiç çalıştırılamaz. İkisini de öğretmene söylüyoruz ki
            // "Öğretmen değerlendirir" moduna geçmeyi kendisi seçebilsin.
            setFailure((err as Error).message || 'Çözüm çalıştırılamadı.');
            patch({ outputVerified: false });
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="mt-2 space-y-2">
            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-500 tracking-widest">
                        ÇÖZÜM KODU
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-bold">öğrenci görmez</span>
                </div>
                <textarea
                    value={solution}
                    onChange={(e) => patch({ solutionCode: e.target.value, outputVerified: false })}
                    rows={5}
                    placeholder={'print("Merhaba")'}
                    className="w-full font-mono text-[12px] bg-slate-900 text-slate-100 rounded-xl p-2.5 outline-none resize-none border-2 border-slate-700 focus:border-cyan-500"
                />
            </div>

            <button
                onClick={verify}
                disabled={running}
                className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-white font-black text-[12px] py-2 rounded-xl border-2 border-cyan-700 border-b-[4px] active:border-b-2 active:translate-y-0.5 transition-all"
            >
                {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                {running ? 'Çalıştırılıyor…' : 'Çalıştır ve Beklenen Çıktıyı Üret'}
            </button>

            {failure && (
                <div className="space-y-2">
                    <div className="flex gap-2 bg-rose-50 border-2 border-rose-200 rounded-xl p-2.5">
                        <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                        <pre className="text-[11px] font-mono text-rose-700 whitespace-pre-wrap min-w-0">{failure}</pre>
                    </div>
                    <button
                        onClick={() => patch({ checkMode: 'manual', outputVerified: false })}
                        className="w-full text-[11px] font-bold text-slate-600 bg-white border-2 border-slate-200 border-b-[3px] rounded-xl py-1.5 hover:border-slate-300"
                    >
                        Bu görev çalıştırılamıyor → Öğretmen değerlendirsin
                    </button>
                </div>
            )}

            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-500 tracking-widest">
                        ÖLÇÜLEN ÇIKTI
                    </span>
                    {verified && !manualEdit ? (
                        <button
                            onClick={() => setManualEdit(true)}
                            className="flex items-center gap-1 text-[9.5px] font-bold text-slate-400 hover:text-slate-600"
                        >
                            <Pencil size={9} /> elle düzenle
                        </button>
                    ) : (
                        <span className="text-[9.5px] font-bold text-amber-600">doğrulanmadı</span>
                    )}
                </div>

                <textarea
                    value={cfg.expectedOutput || ''}
                    onChange={(e) => patch({ expectedOutput: e.target.value, outputVerified: false })}
                    readOnly={verified && !manualEdit}
                    rows={2}
                    placeholder="Çözümü çalıştırınca burası kendiliğinden dolar"
                    className={`w-full font-mono text-[12px] rounded-xl p-2.5 outline-none resize-none border-2 ${
                        verified && !manualEdit
                            ? 'bg-slate-900 text-emerald-300 border-emerald-600 cursor-default'
                            : 'bg-slate-900 text-emerald-300 border-slate-700 focus:border-emerald-500'}`}
                />

                {verified && (
                    <p className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-emerald-600">
                        <ShieldCheck size={11} /> Çözüm çalıştırıldı, çıktı ölçüldü.
                    </p>
                )}
                {!verified && (cfg.expectedOutput || '').trim() && (
                    <p className="mt-1 flex items-center gap-1 text-[10.5px] font-bold text-amber-600">
                        <AlertTriangle size={11} /> Elle yazılmış — ölçülmedi.
                    </p>
                )}
            </div>

            <CriteriaEditor cfg={cfg} patch={patch} />
        </div>
    );
};

/**
 * Ölçüt listesi editörü.
 *
 * Ölçülen çıktı burada bir BAŞLANGIÇ NOKTASI: "şablona çevir" düğmesi, öğretmenin
 * çözümünün çıktısını alıp değişebilecek yerleri `{}` ile işaretlemesini
 * kolaylaştırıyor. "Kendi adını yazdır" görevinde doğru ölçüt birebir eşleşme
 * değil, biçim — ve biçim zaten görevin öğrettiği şey.
 */
const KIND_LABEL: Record<CriterionKind, string> = {
    exact: 'Birebir',
    template: 'Şablon',
    contains: 'İçerir',
    code: 'Kodda geçsin',
    ai: 'YZ değerlendirsin',
};

const KIND_HINT: Record<CriterionKind, string> = {
    exact: 'Çıktı birebir bu olmalı. Yalnızca herkeste aynı çıkan görevlerde kullan.',
    template: 'Değişebilecek yerleri {} ile işaretle: Adım: {ad}, Soyadım: {soyad}',
    contains: 'Çıktı bu metni içermeli, gerisi serbest.',
    code: 'Öğrenci bu ifadeyi kullanmak zorunda (ör. "for").',
    ai: 'Bir cümleyle yaz. Yalnızca deterministik ölçütler yetmiyorsa kullan — yavaş ve maliyetli.',
};

const CriteriaEditor: React.FC<Props> = ({ cfg, patch }) => {
    const criteria = cfg.criteria || [];

    const update = (next: ChallengeCriterion[]) => patch({ criteria: next });
    const add = (kind: CriterionKind, value = '') =>
        update([...criteria, { id: `c${Date.now()}`, kind, value }]);

    return (
        <div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black text-slate-500 tracking-widest">
                    DOĞRULUK ÖLÇÜTLERİ
                </span>
                {!criteria.length && (cfg.expectedOutput || '').trim() && (
                    <button
                        onClick={() => add('template', cfg.expectedOutput || '')}
                        className="text-[9.5px] font-bold text-cyan-600 hover:text-cyan-700"
                    >
                        şablona çevir
                    </button>
                )}
            </div>

            {!criteria.length && (
                <p className="text-[10.5px] text-slate-400 font-medium mb-1.5">
                    Ölçüt eklemezsen çıktı birebir karşılaştırılır — öğrenciye göre
                    değişen görevlerde bu hep yanlış verir.
                </p>
            )}

            <div className="space-y-1.5">
                {criteria.map((c) => (
                    <div key={c.id} className="border-2 border-slate-200 rounded-xl p-2">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <select
                                value={c.kind}
                                onChange={(e) => update(criteria.map((x) =>
                                    x.id === c.id ? { ...x, kind: e.target.value as CriterionKind } : x))}
                                className="text-[10.5px] font-bold bg-slate-100 border-2 border-slate-200 rounded-lg px-1.5 py-0.5 outline-none"
                            >
                                {(Object.keys(KIND_LABEL) as CriterionKind[]).map((k) => (
                                    <option key={k} value={k}>{KIND_LABEL[k]}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => update(criteria.filter((x) => x.id !== c.id))}
                                className="ml-auto text-slate-300 hover:text-rose-500"
                            >
                                <Trash2 size={13} />
                            </button>
                        </div>
                        <textarea
                            value={c.value}
                            onChange={(e) => update(criteria.map((x) =>
                                x.id === c.id ? { ...x, value: e.target.value } : x))}
                            rows={c.kind === 'ai' ? 2 : 1}
                            className="w-full font-mono text-[11.5px] bg-slate-900 text-slate-100 rounded-lg p-2 outline-none resize-none border-2 border-slate-700 focus:border-cyan-500"
                        />
                        <p className="mt-1 text-[9.5px] text-slate-400 font-medium">{KIND_HINT[c.kind]}</p>
                    </div>
                ))}
            </div>

            <button
                onClick={() => add('template')}
                className="mt-1.5 w-full flex items-center justify-center gap-1 text-[11px] font-bold text-slate-600 bg-white border-2 border-slate-200 border-b-[3px] rounded-xl py-1.5 hover:border-slate-300"
            >
                <Plus size={12} /> Ölçüt ekle
            </button>
        </div>
    );
};

export default ExpectedOutputVerifier;
