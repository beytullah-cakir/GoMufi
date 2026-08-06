import React, { useCallback, useEffect, useState } from 'react';
import {
    Check, ExternalLink, Loader2, Play, Sparkles, Trophy, X, AlertTriangle,
} from 'lucide-react';
import api from '../../api';
import { checkTaskInVSCode, prepareTaskInVSCode, showHintInVSCode } from '../../vscodeBridge';
import { evaluate, makeAIJudge, type CriterionResult } from './challengeCheck';
import type { ChallengeCriterion } from './types';

/**
 * UYGULA görevinin VS Code sürümü — panel içindeki kod editörünün yerine geçer.
 *
 * NEDEN EDİTÖR YOK: öğrenci kodu zaten VS Code'da yazıyor. Panelin içine ikinci
 * bir editör koymak dar alanı iki kez harcamak ve iki ayrı "gerçek kod" kaynağı
 * yaratmak olurdu — hangisi çalıştırılıyor sorusu kullanıcı için belirsizleşir.
 * Burada tek bir dosya var: çalışma klasöründeki `gorev.py`.
 *
 * KOÇ: kontrol sonucuna göre üç ayrı an var (hata / çıktı farkı / doğru çözüm)
 * ve üçü farklı geri bildirim istiyor. Karar burada veriliyor, metni sunucudaki
 * `/ai/challenge-coach` üretiyor — kod vermeme kuralı orada zorlanıyor.
 */

interface Props {
    task: string;
    starter: string;
    /** Doğruluk ölçütleri (bkz. challengeCheck.ts). Boşsa yalnızca hata denetlenir. */
    criteria: ChallengeCriterion[];
    language?: string;
    courseId?: number | string;
    xp?: number;
    onSolved?: () => void;
    /** Dosyadan okunan güncel kod — "Görevi Gönder" bunu teslim eder. */
    onCodeRead?: (code: string) => void;
}

type Status = 'idle' | 'running' | 'checking' | 'error' | 'diff' | 'solved';

const ChallengeVSCodePanel: React.FC<Props> = ({
    task, starter, criteria, language = 'python', courseId, xp = 100, onSolved, onCodeRead,
}) => {
    const [status, setStatus] = useState<Status>('idle');
    const [stdout, setStdout] = useState<string | null>(null);
    const [stderr, setStderr] = useState('');
    const [checks, setChecks] = useState<CriterionResult[]>([]);
    const [attempt, setAttempt] = useState(0);
    const [coach, setCoach] = useState<string | null>(null);
    const [coachLoading, setCoachLoading] = useState(false);
    const [opened, setOpened] = useState(false);

    // Görev dosyasını slayt açılır açılmaz hazırla: öğrenci "nereye yazacağım"
    // diye aramasın. Dosya varsa dokunulmuyor, çözümü korunuyor.
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
                // Koça artık "beklenen X gelen Y" değil, DÜŞEN ÖLÇÜT gidiyor.
                // İpucunun kalitesi doğrudan buna bağlı: neyin önemli olduğunu
                // tahmin etmek zorunda kalmıyor.
                expected_output: failure || null,
            });
            const text = res.data?.message || null;
            setCoach(text);
            // Kalite önerisi doğru çözümün üstüne geliyor; onu koda tanı olarak
            // iliştirmek "hata var" hissi verirdi. Yalnızca yol gösteren
            // ipuçları editöre gidiyor.
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

        const result = await checkTaskInVSCode(language);
        if (!result || !result.ok) {
            setStatus('error');
            setStderr(result?.error || 'VS Code yanıt vermedi. Paneli kapatıp tekrar aç.');
            setStdout(null);
            return;
        }

        const tryNo = attempt + 1;
        setAttempt(tryNo);
        // Teslim edilecek kod artık dosyadan geliyor; panelde bir kopyası yok.
        onCodeRead?.(result.code);
        setStdout(result.stdout);
        setStderr(result.timedOut
            ? 'Kod 10 saniyede bitmedi — sonsuz döngü olabilir.'
            : result.stderr);

        if (result.timedOut || result.stderr.trim()) {
            setChecks([]);
            setStatus('error');
            // İkinci başarısız denemeden ÖNCE açılmıyor: öğrenci daha ilk hatada
            // düşünmeye başlıyor, araya girmek o anı bozar.
            if (tryNo >= 2) void askCoach('error', result.code, result.stdout, result.stderr, tryNo);
            return;
        }

        // Kod çalıştı; şimdi "doğru mu" sorusu. Deterministik ölçütler önce,
        // YZ ölçütü yalnızca onlar geçtiyse (bkz. challengeCheck.ts).
        setStatus('checking');
        const outcome = await evaluate(
            criteria, result.code, result.stdout,
            makeAIJudge(courseId, task, result.code, result.stdout),
        );
        setChecks(outcome.results);

        if (!outcome.passed) {
            setStatus('diff');
            if (tryNo >= 2) {
                void askCoach(
                    'diff', result.code, result.stdout, '', tryNo,
                    outcome.failureSummary || undefined,
                );
            }
            return;
        }

        setStatus('solved');
        onSolved?.();
        // Doğru çözümde koç HER ZAMAN çalışır: otomatik kontrolün öğretemediği
        // tek şey burada (okunabilirlik, isimlendirme, daha basit yaklaşım).
        void askCoach('quality', result.code, result.stdout, '', tryNo);
    };

    const running = status === 'running' || status === 'checking';

    return (
        <div className="flex-1 min-h-0 flex flex-col gap-3">
            {/* Dosya şeridi — kodun nerede olduğunu tek bakışta söyler */}
            <div className="shrink-0 flex items-center gap-2 bg-[#131a33] border-2 border-slate-700 rounded-2xl px-3 py-2.5">
                <ExternalLink className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[11.5px] font-bold text-slate-300 truncate">
                    Kodunu <span className="font-mono text-sky-300">gorev.py</span> dosyasına yaz
                </span>
                {opened && <Check className="w-3.5 h-3.5 text-emerald-400 ml-auto shrink-0" />}
            </div>

            <button
                onClick={handleCheck}
                disabled={running}
                className="shrink-0 flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-black text-[13px] py-2.5 rounded-xl border-2 border-emerald-700 border-b-[5px] active:border-b-2 active:translate-y-0.5 transition-all"
            >
                {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {status === 'running' ? 'Çalıştırılıyor…'
                    : status === 'checking' ? 'Kontrol ediliyor…'
                    : 'Çalıştır ve Kontrol Et'}
            </button>

            {/* Çıktı */}
            <div className="flex-1 min-h-0 bg-white rounded-2xl border-2 border-slate-200 border-b-[5px] p-3 overflow-y-auto">
                <h3 className="text-[10px] font-black text-slate-500 tracking-widest mb-2">ÇIKTI</h3>

                <div className="bg-slate-900 rounded-xl p-2.5 font-mono text-[12px] text-slate-100 whitespace-pre-wrap min-h-[42px]">
                    {stdout === null
                        ? <span className="text-slate-500">Kodunu yaz, sonra Kontrol Et'e bas…</span>
                        : (stdout || <span className="text-slate-500">(boş çıktı)</span>)}
                </div>

                {stderr && (
                    <div className="mt-2 flex gap-2 bg-rose-50 border-2 border-rose-200 rounded-xl p-2.5">
                        <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                        <pre className="text-[11.5px] font-mono text-rose-700 whitespace-pre-wrap min-w-0">{stderr}</pre>
                    </div>
                )}

                {/* Ölçüt ölçüt sonuç: öğrenci "yanlış" değil, HANGİ maddede
                    kaldığını görüyor. Tek bir kırmızı satır, neyi düzelteceğini
                    söylemediği için öğrenciyi deneme-yanılmaya itiyordu. */}
                {checks.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                        {checks.map((c) => (
                            <div key={c.id} className={`flex items-start gap-2 rounded-xl border-2 px-2.5 py-2 text-[11.5px] ${
                                c.status === 'pass' ? 'bg-emerald-50 border-emerald-200'
                                    : c.status === 'near' ? 'bg-amber-50 border-amber-200'
                                    : 'bg-rose-50 border-rose-200'}`}>
                                <span className={`shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center ${
                                    c.status === 'pass' ? 'bg-emerald-500 text-white'
                                        : c.status === 'near' ? 'bg-amber-500 text-white'
                                        : 'bg-rose-500 text-white'}`}>
                                    {c.status === 'fail' ? <X size={10} /> : <Check size={10} />}
                                </span>
                                <span className="min-w-0">
                                    <span className="font-bold text-slate-700">{c.label}</span>
                                    {c.detail && (
                                        <span className="block text-slate-500 font-medium mt-0.5">{c.detail}</span>
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

                {/* Koç — ilk denemede bilerek sessiz */}
                {(coachLoading || coach) && (
                    <div className={`mt-3 rounded-xl border-2 p-3 ${
                        status === 'solved'
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-indigo-50 border-indigo-200'}`}>
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <Sparkles size={12} className={status === 'solved' ? 'text-amber-500' : 'text-indigo-500'} />
                            <span className={`text-[10px] font-black tracking-widest ${
                                status === 'solved' ? 'text-amber-700' : 'text-indigo-700'}`}>
                                {status === 'solved' ? 'ŞUNU DA DENE' : 'İPUCU'}
                            </span>
                        </div>
                        {coachLoading
                            ? <div className="flex items-center gap-2 text-[12px] text-slate-400 font-medium">
                                <Loader2 size={12} className="animate-spin" /> Düşünüyor…
                              </div>
                            : <p className="text-[12.5px] font-medium text-slate-700 leading-relaxed">{coach}</p>}
                    </div>
                )}

                {status === 'error' && attempt === 1 && !coachLoading && !coach && (
                    <p className="mt-2 text-[11.5px] text-slate-400 font-medium">
                        Hata mesajını oku ve bir kez daha dene — takılırsan ipucu vereceğim.
                    </p>
                )}
            </div>
        </div>
    );
};

export default ChallengeVSCodePanel;
