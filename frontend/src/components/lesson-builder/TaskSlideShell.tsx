import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertTriangle, Check, ChevronDown, Code2, Download, File as FileIcon, FileCode2, FileText,
    Image as ImageIcon, Lightbulb, Loader2, Play, Plus, Send, ShieldCheck, Sparkles, Trash2,
    Trophy, Upload, Users, X,
} from 'lucide-react';
import api from '../../api';
import { recordBrowserEdit, trackLearningEvent } from '../../learningEvents';
import { runTests as runTestsInVSCode, VSCODE_REQUIRED } from '../../codeRunner';
import { isEmbeddedInVSCode } from '../../vscodeBridge';
import ChallengeCodeLab from './ChallengeCodeLab';
import ChallengeResultPanel from './ChallengeResultPanel';
import ChallengeVSCodePanel from './ChallengeVSCodePanel';
import ExpectedOutputVerifier from './ExpectedOutputVerifier';
import { criteriaOf, isAccepted, type CriterionResult } from './challengeCheck';
import { challengeFiles, entryFile, joinFiles, safeFileName } from './challengeFiles';
import { CODE_LANGUAGES, findLanguage, highlightCode } from './codeLanguages';
import { codeEditorStyles, codeInheritStyles, usePrismTheme } from './codeTheme';
import { STAGE_META, taskFolder, type StageTheme } from './taskStages';
import type {
    ChallengeCheckMode, ChallengeConfig, ChallengeCriterion, ChallengeFile,
    ChallengeSubmissionType, ChallengeTest, TaskKind,
} from './types';
import { useChallengeCheck, type TaskCheckOptions } from './useChallengeCheck';
import { ClassProgressCard } from '../instructor-pages/learning/LiveTask';
import { flushEdits } from '../../learningEvents';
import { TaskLiveAssist, TaskTimerBanner } from './TaskLiveAssist';
import RubricEditor from '../../rubric/RubricEditor';
import TaskHistoryCard from './TaskHistoryCard';
import RubricGrader from '../../rubric/RubricGrader';
import { rubricGrade, type RubricScores } from '../../rubric/rubric';
import type { Rubric } from './types';

/**
 * UYGULA / BİRLEŞTİR / ÜRET görev slaytlarının ORTAK iskeleti.
 *
 * NEDEN: üç slayt önceden üç ayrı kopyaydı ve kopyalandıktan sonra ayrıştı —
 * Birleştir ile Üret var olmayan bir adrese teslim gönderiyordu (teslimler
 * kayboluyordu), Birleştir'in düzenleme ekranında kod editörü yerine öğrenci
 * laboratuvarı açılıyordu, Üret'te teslim şekli ve XP ayarı yoktu. Artık
 * teslim, çalıştırma, kontrol, öğretmen paneli burada TEK; aşamalar yalnızca
 * kendi bilgi bölümünü (kavram köprüsü, proje gereksinimleri) ekliyor.
 */

/**
 * edit → görevi kur · student → çöz · review → teslimleri gör (oluşturucu önizlemesi)
 * present → canlı derste TAHTAYA yansıyan öğretmen ekranı: görev + isimsiz sınıf
 * durumu. Öğrenci adları ve notları burada GÖSTERİLMEZ; onlar öğretmenin çekmecesinde.
 */
export type TaskRole = 'edit' | 'student' | 'review' | 'present';

interface Props {
    kind: TaskKind;
    slideId: string | number;
    /** Varsayılanlarla birleştirilmiş yapılandırma. */
    cfg: ChallengeConfig;
    patch: (updates: Partial<ChallengeConfig>) => void;
    /** 'edit' → görevi kur, 'student' → görevi çöz, 'review' → teslimleri gör */
    role: TaskRole;
    courseId?: number | string;
    /** Teslimlerin anahtarı ("connect:<slayt id>") — öğrenci ve öğretmen aynı anahtarı kullanır. */
    submissionNodeId?: string;
    onSolved?: () => void;
    /** Rozetin yanındaki bilgi (Üret: tahmini süre). Yoksa teslim şekli gösterilir. */
    headerExtra?: React.ReactNode;
    /** Başlığın altı (Üret: proje adı ve süre alanları). */
    titleExtra?: React.ReactNode;
    /** Yönergenin altındaki aşamaya özel bölüm; son kontrolün sonuçlarını görür. */
    renderStageSection?: (checks: CriterionResult[]) => React.ReactNode;
    /** Koça ve YZ hakemine giden görev metnine eklenen aşama bağlamı. */
    stageContext?: string;
    /** Sistemin eklediği ölçütler (Birleştir: zorunlu yapılar). */
    extraCriteria?: ChallengeCriterion[];
    /** Üret: YZ ile madde madde değerlendirilen gereksinimler. */
    requirements?: string[];
}

const SUBMISSION_META: Record<ChallengeSubmissionType, { label: string; icon: React.ElementType }> = {
    code: { label: 'Kod', icon: Code2 },
    text: { label: 'Metin', icon: FileText },
    image: { label: 'Ekran Görüntüsü', icon: ImageIcon },
    file: { label: 'Dosya', icon: FileIcon },
};

const CHECK_META: Record<ChallengeCheckMode, { label: string; hint: string }> = {
    output: { label: 'Ekran çıktısı', hint: 'Kod çalıştırılır, çıktı ölçütlerle karşılaştırılır.' },
    tests: { label: 'Fonksiyon testleri', hint: 'Fonksiyon çağrılır, dönüş değerleri karşılaştırılır.' },
    manual: {
        label: 'Öğretmen değerlendirir',
        hint: 'Kontrol yalnızca geri bildirim verir; görev teslim edilince tamamlanır.',
    },
};

/** Çalıştırılabilen diller — öğretmenin seçebileceği görev dilleri. */
const TASK_LANGUAGES = CODE_LANGUAGES.filter((l) => l.runsInVSCode && !l.shell);

const starterFor = (cfg: ChallengeConfig, comment: string) =>
    cfg.starterCode ||
    (cfg.checkMode === 'tests' && (cfg.language || 'python') === 'python'
        ? `# ${comment}\ndef ${cfg.functionName || 'cozum'}():\n    pass\n`
        : (findLanguage(cfg.language).id === 'python' ? `# ${comment}\n` : ''));

/** Karşılaştırma anahtarı: aynı dosya listesi farklı yazımlarla gelebilir. */
const filesKeyOf = (files: ChallengeFile[], language?: string) =>
    JSON.stringify(challengeFiles({ files, language }, ''));

/* ------------------------------------------------------------------------- */
/*  Metin                                                                    */
/* ------------------------------------------------------------------------- */

const INLINE_TOKENS = /('(?:\\'|[^'])*'|"(?:\\"|[^"])*"|`[^`]+`|\b[a-zA-Z_]\w*\(\)|\b\d+(?:\.\d+)?\b)/g;

const renderInline = (text: string, keyBase: string) =>
    text.split(INLINE_TOKENS).map((part, i) => {
        if (!part) return null;
        const key = `${keyBase}-${i}`;
        const chip = 'inline-block font-mono px-1.5 py-0.5 rounded-md font-bold text-[11.5px] md:text-xs mx-0.5 my-0.5 border';
        if ((part.startsWith("'") && part.endsWith("'")) || (part.startsWith('"') && part.endsWith('"'))) {
            return <code key={key} className={`${chip} text-cyan-700 bg-cyan-50 border-cyan-300`}>{part}</code>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={key} className={`${chip} text-sky-700 bg-sky-50 border-sky-300`}>{part.slice(1, -1)}</code>;
        }
        if (/^[a-zA-Z_]\w*\(\)$/.test(part)) {
            return <code key={key} className={`${chip} text-indigo-700 bg-indigo-50 border-indigo-300`}>{part}</code>;
        }
        if (/^\d+(?:\.\d+)?$/.test(part)) {
            return <code key={key} className={`${chip} text-amber-700 bg-amber-50 border-amber-300`}>{part}</code>;
        }
        return <span key={key}>{part}</span>;
    });

/**
 * Görev metni: satır başındaki `# ` başlık, `- ` madde olur; satır içindeki
 * kod parçaları rozetlenir. Üret'in proje senaryoları başlık/madde kullanıyor,
 * Uygula'nınkiler satır içi kod — tek biçimlendirici ikisini de karşılıyor.
 */
const FormattedText: React.FC<{ text?: string }> = ({ text }) => {
    if (!text) return null;
    return (
        <div className="text-[12px] sm:text-xs md:text-[13.5px] font-medium text-slate-700 leading-relaxed">
            {text.split('\n').map((line, i) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('# ')) {
                    return <h3 key={i} className="text-sm md:text-base font-black text-slate-800 mt-2 mb-1">{renderInline(trimmed.slice(2), `h${i}`)}</h3>;
                }
                if (trimmed.startsWith('- ')) {
                    return <li key={i} className="ml-4 list-disc my-0.5">{renderInline(trimmed.slice(2), `l${i}`)}</li>;
                }
                return <p key={i} className="my-0.5 min-h-[1rem] whitespace-pre-wrap">{renderInline(line, `p${i}`)}</p>;
            })}
        </div>
    );
};

/* ------------------------------------------------------------------------- */
/*  Dosya sekmeli editör                                                     */
/* ------------------------------------------------------------------------- */

interface EditorProps {
    files: ChallengeFile[];
    active: string;
    setActive: (name: string) => void;
    onChange: (files: ChallengeFile[]) => void;
    language: string;
    theme: StageTheme;
    /** Öğretmen dosya ekleyip silebilir, adlandırabilir, giriş dosyasını seçebilir. */
    structural: boolean;
    toolbar?: React.ReactNode;
    /** Her düzenleme: dosya, önceki ve yeni metin, tarayıcının `inputType`ı (yazım kaydı için). */
    onEdit?: (file: string, before: string, after: string, inputType?: string) => void;
}

const FileTabsEditor: React.FC<EditorProps> = ({
    files, active, setActive, onChange, language, theme, structural, toolbar, onEdit,
}) => {
    const [renaming, setRenaming] = useState<string | null>(null);
    const preRef = useRef<HTMLPreElement>(null);
    const taRef = useRef<HTMLTextAreaElement>(null);
    const current = files.find((f) => f.name === active) ?? files[0];
    const ext = findLanguage(language).ext;

    const addFile = () => {
        let n = 1;
        while (files.some((f) => f.name === `modul_${n}.${ext}`)) n++;
        const name = `modul_${n}.${ext}`;
        onChange([...files, { name, content: '', entry: false }]);
        setActive(name);
    };

    const removeFile = (name: string) => {
        if (files.length <= 1) return;
        const next = files.filter((f) => f.name !== name);
        if (!next.some((f) => f.entry)) next[0] = { ...next[0], entry: true };
        onChange(next);
        if (active === name) setActive(entryFile(next).name);
    };

    const renameFile = (oldName: string, raw: string) => {
        setRenaming(null);
        const clean = safeFileName(raw);
        if (!clean || clean === oldName || files.some((f) => f.name === clean)) return;
        onChange(files.map((f) => (f.name === oldName ? { ...f, name: clean } : f)));
        if (active === oldName) setActive(clean);
    };

    const syncScroll = () => {
        if (!preRef.current || !taRef.current) return;
        preRef.current.scrollTop = taRef.current.scrollTop;
        preRef.current.scrollLeft = taRef.current.scrollLeft;
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1">
                {files.map((f) => (
                    <div
                        key={f.name}
                        onClick={() => setActive(f.name)}
                        className={`group relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all border ${
                            f.name === current?.name ? `${theme.tabOn} shadow-sm` : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                    >
                        <FileCode2 size={13} className={f.name === current?.name ? 'text-white' : theme.tabIcon} />
                        {renaming === f.name ? (
                            <input
                                autoFocus
                                type="text"
                                defaultValue={f.name}
                                onBlur={(e) => renameFile(f.name, e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') renameFile(f.name, (e.target as HTMLInputElement).value);
                                    if (e.key === 'Escape') setRenaming(null);
                                }}
                                className="w-24 bg-transparent text-inherit outline-none border-b border-white"
                            />
                        ) : (
                            <span
                                onDoubleClick={() => structural && setRenaming(f.name)}
                                title={structural ? 'Yeniden adlandırmak için çift tıkla' : undefined}
                            >
                                {f.name}
                            </span>
                        )}
                        {f.entry && files.length > 1 && (
                            <span className={`text-[9px] font-black px-1 rounded ${f.name === current?.name ? theme.tabEntry : 'bg-slate-100 text-slate-500'}`}>
                                ANA
                            </span>
                        )}
                        {structural && files.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(f.name); }}
                                className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-0.5 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                ))}
                {structural && (
                    <button
                        onClick={addFile}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-black border transition-all ${theme.addFile}`}
                    >
                        <Plus size={13} /> Dosya
                    </button>
                )}
            </div>

            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 bg-[#1e1e1e] shadow-md h-[340px] lg:h-[400px] flex flex-col">
                <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between gap-2 border-b border-[#3e3e3e]">
                    <span className={`text-[11px] font-bold font-mono flex items-center gap-1.5 ${theme.fileName}`}>
                        <Code2 size={13} /> {current?.name}
                    </span>
                    <div className="flex items-center gap-2">
                        {structural && files.length > 1 && current && (
                            <button
                                onClick={() => onChange(files.map((f) => ({ ...f, entry: f.name === current.name })))}
                                className={`text-[10px] font-black px-2 py-0.5 rounded-md transition-all ${
                                    current.entry ? theme.entryOn : 'text-zinc-400 hover:text-white bg-[#3e3e3e]'}`}
                                title="Program bu dosyadan çalıştırılır"
                            >
                                {current.entry ? 'Çalıştırılan dosya' : 'Bu dosyadan çalıştır'}
                            </button>
                        )}
                        {toolbar}
                    </div>
                </div>
                <div className="relative flex-1 min-h-0">
                    <pre
                        ref={preRef}
                        className="absolute inset-0 m-0 p-4 font-mono text-xs md:text-sm overflow-hidden pointer-events-none z-0"
                        style={codeEditorStyles()}
                        aria-hidden="true"
                    >
                        <code dangerouslySetInnerHTML={{ __html: `${highlightCode(current?.content || '', language)}\n` }} />
                    </pre>
                    <textarea
                        ref={taRef}
                        value={current?.content ?? ''}
                        onChange={(e) => {
                            if (current) {
                                onEdit?.(current.name, current.content, e.target.value,
                                    (e.nativeEvent as InputEvent).inputType);
                            }
                            onChange(files.map((f) => (
                                f.name === current?.name ? { ...f, content: e.target.value } : f)));
                        }}
                        onScroll={syncScroll}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoComplete="off"
                        autoCorrect="off"
                        className={`absolute inset-0 m-0 p-4 font-mono text-xs md:text-sm text-transparent bg-transparent outline-none resize-none z-10 custom-scrollbar ${theme.caret}`}
                        style={codeInheritStyles}
                    />
                </div>
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------------- */
/*  Öğretmen ayarları: fonksiyon testleri                                    */
/* ------------------------------------------------------------------------- */

/**
 * Fonksiyon testi düzenleyicisi.
 *
 * Eskiden "Fonksiyon testleri" seçilince yalnızca fonksiyon adı sorulabiliyordu;
 * test eklemenin bir yolu yoktu ve görev hiçbir zaman çözülemiyordu. Beklenen
 * değerler de tahmin edilmesin diye ölçülüyor: çözüm çalıştırılır, boş
 * beklenenler gerçek dönüş değeriyle dolar, uyuşmayanlar işaretlenir.
 */
const TestsEditor: React.FC<{
    cfg: ChallengeConfig;
    patch: (u: Partial<ChallengeConfig>) => void;
    theme: StageTheme;
}> = ({ cfg, patch, theme }) => {
    const tests = cfg.tests || [];
    const [running, setRunning] = useState(false);
    const [verdict, setVerdict] = useState<Record<string, { ok: boolean; actual: string }>>({});
    const [failure, setFailure] = useState<string | null>(null);

    const update = (next: ChallengeTest[]) => { setVerdict({}); patch({ tests: next }); };

    const verify = async () => {
        if (!(cfg.solutionCode || '').trim()) { setFailure('Önce çözüm kodunu yaz.'); return; }
        if (!tests.length) { setFailure('Önce en az bir test ekle.'); return; }
        setRunning(true);
        setFailure(null);
        const files = challengeFiles(cfg, '').map((f) => (f.entry ? { ...f, content: cfg.solutionCode || '' } : f));
        const stdin = (cfg.samples || []).map((s) => (s.input || '').trim()).filter(Boolean).join('\n');
        // Öğretmenin çözümü VS Code'da, ayrı bir klasörde çalışır (öğrenci dosyalarına dokunmaz).
        const run = await runTestsInVSCode(tests, entryFile(files).name, stdin, 'solution', files);
        setRunning(false);
        if (!run) { setFailure(VSCODE_REQUIRED); return; }
        const { results, fatal } = run;
        if (fatal) { setFailure(fatal); return; }
        const byId = new Map(results.map((r) => [r.id, r]));
        // Boş beklenenler ölçülen değerle dolar; dolu olanlar yalnızca denetlenir.
        const filled = tests.map((t) => {
            const r = byId.get(t.id);
            return !t.expected.trim() && r && !r.error ? { ...t, expected: r.actual } : t;
        });
        patch({ tests: filled });
        setVerdict(Object.fromEntries(filled.map((t) => {
            const r = byId.get(t.id);
            return [t.id, { ok: !!r && !r.error && r.actual.trim() === t.expected.trim(), actual: r?.error || r?.actual || '' }];
        })));
    };

    return (
        <div className="mt-2 space-y-2">
            <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-500">Fonksiyon:</span>
                <input
                    value={cfg.functionName || ''}
                    onChange={(e) => patch({ functionName: e.target.value })}
                    className={`font-mono font-bold border-2 rounded-lg px-2 py-0.5 outline-none w-36 ${theme.field}`}
                />
            </div>

            <div>
                <span className="text-[10px] font-black text-slate-500 tracking-widest">TESTLER</span>
                <div className="mt-1 space-y-1.5">
                    {tests.map((t, i) => (
                        <div key={t.id} className="flex items-center gap-1.5">
                            <input
                                value={t.call}
                                onChange={(e) => update(tests.map((x, j) => (j === i ? { ...x, call: e.target.value } : x)))}
                                placeholder={`${cfg.functionName || 'cozum'}(3)`}
                                className="flex-1 min-w-0 font-mono text-[11.5px] bg-slate-900 text-slate-100 rounded-lg px-2 py-1 outline-none border-2 border-slate-700 focus:border-cyan-500"
                            />
                            <span className="text-slate-400 font-black">→</span>
                            <input
                                value={t.expected}
                                onChange={(e) => update(tests.map((x, j) => (j === i ? { ...x, expected: e.target.value } : x)))}
                                placeholder="beklenen (boşsa ölçülür)"
                                className={`w-28 font-mono text-[11.5px] bg-slate-900 text-emerald-300 rounded-lg px-2 py-1 outline-none border-2 ${
                                    verdict[t.id] ? (verdict[t.id].ok ? 'border-emerald-600' : 'border-rose-500') : 'border-slate-700'}`}
                                title={verdict[t.id] && !verdict[t.id].ok ? `Çözüm şunu döndürdü: ${verdict[t.id].actual}` : undefined}
                            />
                            <button onClick={() => update(tests.filter((_, j) => j !== i))} className="text-slate-300 hover:text-rose-500 p-1">
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                </div>
                <button
                    onClick={() => update([...tests, { id: `t${Date.now()}`, call: '', expected: '' }])}
                    className="mt-1.5 w-full flex items-center justify-center gap-1 text-[11px] font-bold text-slate-600 bg-white border-2 border-slate-200 border-b-[3px] rounded-xl py-1.5 hover:border-slate-300"
                >
                    <Plus size={12} /> Test ekle
                </button>
            </div>

            <div>
                <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-black text-slate-500 tracking-widest">ÇÖZÜM KODU</span>
                    <span className="text-[9.5px] text-slate-400 font-bold">öğrenci görmez</span>
                </div>
                <textarea
                    value={cfg.solutionCode || ''}
                    onChange={(e) => { setVerdict({}); patch({ solutionCode: e.target.value }); }}
                    rows={4}
                    placeholder={`def ${cfg.functionName || 'cozum'}(n):\n    return n * 2`}
                    className="w-full font-mono text-[12px] bg-slate-900 text-slate-100 rounded-xl p-2.5 outline-none resize-none border-2 border-slate-700 focus:border-cyan-500"
                />
                <button
                    onClick={verify}
                    disabled={running}
                    className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-white font-black text-[12px] py-2 rounded-xl border-2 border-cyan-700 border-b-[4px] active:border-b-2 active:translate-y-0.5 transition-all"
                >
                    {running ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                    Testleri çözümle doğrula
                </button>
                {failure && (
                    <div className="mt-1.5 flex gap-2 bg-rose-50 border-2 border-rose-200 rounded-xl p-2">
                        <AlertTriangle size={13} className="text-rose-500 shrink-0 mt-0.5" />
                        <pre className="text-[11px] font-mono text-rose-700 whitespace-pre-wrap min-w-0">{failure}</pre>
                    </div>
                )}
                {Object.keys(verdict).length > 0 && !failure && (
                    <p className={`mt-1 text-[10.5px] font-bold ${Object.values(verdict).every((v) => v.ok) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {Object.values(verdict).every((v) => v.ok)
                            ? 'Çözüm tüm testleri geçiyor.'
                            : 'Kırmızı testlerde çözümün döndürdüğü değer beklenenden farklı (üzerine gel).'}
                    </p>
                )}
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------------- */
/*  Öğretmen: teslimler                                                      */
/* ------------------------------------------------------------------------- */

interface Submission {
    id: number;
    student_id?: number;
    student_name?: string;
    student_note?: string | null;
    file_name?: string;
    file_data?: string | null;
    file_mime?: string | null;
    submitted_at?: string | null;
    grade?: number | null;
    feedback?: string | null;
    graded_at?: string | null;
    late?: boolean;
    versions?: number;
    rubric_scores?: RubricScores | null;
}

const formatDate = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
};

const SubmissionRow: React.FC<{
    sub: Submission;
    courseId: number | string;
    theme: StageTheme;
    rubric?: Rubric | null;
    onGraded: (sub: Submission) => void;
}> = ({ sub, courseId, theme, rubric, onGraded }) => {
    const [open, setOpen] = useState(false);
    const [grade, setGrade] = useState(sub.grade != null ? String(sub.grade) : '');
    const [scores, setScores] = useState<RubricScores>(sub.rubric_scores || {});
    const [feedback, setFeedback] = useState(sub.feedback || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const isImage = (sub.file_mime || '').startsWith('image/');

    const save = async () => {
        setSaving(true);
        setError(null);
        try {
            const value = grade.trim() === '' ? null : Number(grade);
            const res = await api.put(
                `/courses/${courseId}/homework/submissions/${sub.id}/grade`,
                { grade: value, feedback, source: 'teacher', rubric_scores: rubric ? scores : undefined },
            );
            onGraded({ ...sub, ...res.data?.submission });
        } catch (err: any) {
            setError(err?.response?.data?.detail || 'Değerlendirme kaydedilemedi.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl">
            <button onClick={() => setOpen(!open)} className="w-full p-3 flex items-center justify-between gap-2 text-left">
                <div className="min-w-0">
                    <p className="text-xs font-black text-slate-800 truncate">{sub.student_name || `Öğrenci #${sub.student_id}`}</p>
                    <p className="text-[10px] text-slate-400">
                        {formatDate(sub.submitted_at) || 'Teslim edildi'}
                        {sub.late && <span className="ml-1 font-black text-rose-600">· geç</span>}
                        {!!sub.versions && <span className="ml-1 font-bold text-slate-500">· {sub.versions + 1}. sürüm</span>}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {sub.graded_at ? (
                        <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                            {sub.grade != null ? `${sub.grade}/100` : 'Değerlendirildi'}
                        </span>
                    ) : (
                        <span className="text-[10px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded-lg">Bekliyor</span>
                    )}
                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && (
                <div className="px-3 pb-3 space-y-2">
                    {sub.student_note && (
                        <pre className="max-h-64 overflow-auto custom-scrollbar bg-slate-900 text-slate-100 text-[11px] font-mono rounded-xl p-2.5 whitespace-pre-wrap break-words">
                            {sub.student_note}
                        </pre>
                    )}
                    {isImage && sub.file_data && (
                        <img src={`data:${sub.file_mime};base64,${sub.file_data}`} alt={sub.file_name} className="max-h-64 rounded-xl border border-slate-200" />
                    )}
                    {sub.file_data && (
                        <a
                            href={`data:${sub.file_mime || 'application/octet-stream'};base64,${sub.file_data}`}
                            download={sub.file_name || 'teslim'}
                            className={`inline-flex items-center gap-1 text-[11px] font-bold ${theme.accentText} hover:underline`}
                        >
                            <Download size={12} /> {sub.file_name || 'Dosyayı indir'}
                        </a>
                    )}
                    {rubric && (
                        <RubricGrader
                            rubric={rubric}
                            scores={scores}
                            onChange={(next) => {
                                setScores(next);
                                const computed = rubricGrade(rubric, next);
                                if (computed !== null) setGrade(String(computed));
                            }}
                        />
                    )}
                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="number"
                            min={0}
                            max={100}
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            placeholder="Not"
                            className="w-20 text-xs font-bold bg-white border-2 border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-slate-400"
                        />
                        <span className="text-[10px] text-slate-400 font-bold">/ 100</span>
                    </div>
                    <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={2}
                        placeholder="Öğrenciye geri bildirim…"
                        className="w-full text-xs bg-white border-2 border-slate-200 rounded-xl p-2 outline-none resize-none focus:border-slate-400"
                    />
                    {error && <p className="text-[11px] font-bold text-rose-600">{error}</p>}
                    <button
                        onClick={save}
                        disabled={saving || (grade.trim() === '' && !feedback.trim())}
                        className="w-full flex items-center justify-center gap-1.5 text-[11px] font-black py-1.5 rounded-xl border-2 border-b-[3px] bg-white border-slate-200 text-slate-700 hover:border-slate-300 disabled:opacity-50"
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Değerlendirmeyi kaydet
                    </button>
                </div>
            )}
        </div>
    );
};

const ReviewPanel: React.FC<{
    courseId?: number | string;
    nodeId?: string;
    title: string;
    empty: string;
    theme: StageTheme;
}> = ({ courseId, nodeId, title, empty, theme }) => {
    const [loaded, setSubs] = useState<Submission[] | null>(null);
    const [rubric, setRubric] = useState<Rubric | null>(null);
    // Ders bağlantısı yoksa (kaydedilmemiş önizleme) sorulacak bir şey yok.
    const canLoad = !!courseId && !!nodeId;
    const subs = canLoad ? loaded : [];

    useEffect(() => {
        if (!canLoad) return;
        let alive = true;
        api.get(`/courses/${courseId}/homework/${encodeURIComponent(nodeId as string)}/submissions`)
            .then((r) => {
                if (!alive) return;
                setSubs(r.data?.submissions || []);
                setRubric(r.data?.rubric || null);
            })
            .catch(() => { if (alive) setSubs([]); });
        return () => { alive = false; };
    }, [canLoad, courseId, nodeId]);

    return (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <Users size={14} className={theme.badgeIcon} /> {title}
                </span>
                <span className={`text-xs font-black px-2.5 py-1 rounded-xl ${theme.badge}`}>
                    {subs ? `${subs.length} Teslim` : 'Yükleniyor…'}
                </span>
            </div>
            {subs && subs.length === 0 && (
                <div className="p-8 text-center text-xs text-slate-400 italic">{empty}</div>
            )}
            <div className="flex flex-col gap-2 max-h-[480px] overflow-y-auto custom-scrollbar">
                {courseId && subs?.map((sub) => (
                    <SubmissionRow
                        key={sub.id}
                        sub={sub}
                        courseId={courseId}
                        theme={theme}
                        rubric={rubric}
                        onGraded={(next) => setSubs((prev) => prev?.map((s) => (s.id === next.id ? next : s)) ?? null)}
                    />
                ))}
            </div>
        </div>
    );
};

/* ------------------------------------------------------------------------- */
/*  İskelet                                                                  */
/* ------------------------------------------------------------------------- */

interface ExplainState {
    reason: string;
    lines: Array<{ file: string; line_no: number; code: string }>;
    answers: string[];
    sending: boolean;
    result: { understood: boolean; verdicts: Array<{ line_no: number; understood: boolean; feedback: string }> } | null;
}

interface SentState {
    at: string | null;
    grade?: number | null;
    feedback?: string | null;
    gradedAt?: string | null;
    rubricScores?: RubricScores | null;
    late?: boolean;
}

const TaskSlideShell: React.FC<Props> = ({
    kind, slideId, cfg, patch, role, courseId, submissionNodeId, onSolved,
    headerExtra, titleExtra, renderStageSection, stageContext, extraCriteria, requirements,
}) => {
    const meta = STAGE_META[kind];
    const theme = meta.theme;
    const isEdit = role === 'edit';
    const isReview = role === 'review';
    const isStudent = role === 'student';
    const isPresent = role === 'present';
    const language = cfg.language || 'python';
    const checkMode: ChallengeCheckMode = cfg.checkMode || 'manual';
    const samples = cfg.samples || [];
    const isCode = cfg.submissionType === 'code';

    usePrismTheme();

    /* --- dosyalar ------------------------------------------------------- */

    const starterFiles = useMemo(
        () => challengeFiles(cfg, starterFor(cfg, meta.starterComment)),
        [cfg.files, cfg.starterCode, cfg.language, cfg.checkMode, cfg.functionName, meta.starterComment],
    );
    const starterKey = JSON.stringify(starterFiles);

    const [draft, setDraft] = useState<ChallengeFile[]>(starterFiles);
    const [activeFile, setActiveFile] = useState(() => entryFile(starterFiles).name);
    /** Bu bileşenin en son yazdığı dosya listesi — dışarıdan gelen değişikliği ayırt eder. */
    const writtenKey = useRef<string>(starterKey);

    // Yapılandırmadaki dosyalar DIŞARIDAN değiştiyse (başka slayt, geri al,
    // YZ ile yeniden üretim) taslağı ona eşitle. Kendi yazdığımız değişiklikte
    // dokunmuyoruz: eskiden her tuşta taslak sıfırlanıyor ve açık sekme giriş
    // dosyasına geri sıçrıyordu.
    useEffect(() => {
        if (starterKey === writtenKey.current) return;
        writtenKey.current = starterKey;
        setDraft(starterFiles);
        setActiveFile((prev) => (starterFiles.some((f) => f.name === prev) ? prev : entryFile(starterFiles).name));
    }, [starterKey]);

    const writeFiles = (next: ChallengeFile[]) => {
        setDraft(next);
        if (!isEdit) return;
        writtenKey.current = filesKeyOf(next, language);
        // `starterCode` giriş dosyasının içeriği: `files` alanını tanımayan
        // eski istemciler de boş editör açmasın (sunucu da aynısını yapıyor).
        patch({ files: next, starterCode: entryFile(next).content });
    };

    /* --- öğrenci durumu ------------------------------------------------- */

    const [answer, setAnswer] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [lastChecks, setLastChecks] = useState<CriterionResult[]>([]);
    const [hasSource, setHasSource] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState<SentState | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [explain, setExplain] = useState<ExplainState | null>(null);
    const lastSourceRef = useRef<string | null>(null);
    const lastChecksRef = useRef<CriterionResult[]>([]);
    const sentRef = useRef<SentState | null>(null);
    sentRef.current = sent;
    const onSolvedRef = useRef(onSolved);
    onSolvedRef.current = onSolved;

    // Slayt değişti: öğrencinin her şeyi sıfırlanır.
    useEffect(() => {
        setAnswer(''); setFile(null); setLastChecks([]);
        setHasSource(false); setSent(null); setSubmitError(null); setShowHint(false); setExplain(null);
        lastSourceRef.current = null;
        lastChecksRef.current = [];
        writtenKey.current = starterKey;
        setDraft(starterFiles);
        setActiveFile(entryFile(starterFiles).name);
    }, [slideId]);

    // Daha önce teslim edilmiş mi? Ders tekrar açıldığında öğrenci aynı görevin
    // önünde kilitli kalmasın, öğretmenin notunu da görsün.
    useEffect(() => {
        if (!isStudent || !courseId || !submissionNodeId) return;
        let alive = true;
        api.get(`/courses/${courseId}/homework/${encodeURIComponent(submissionNodeId)}/submission`)
            .then((r) => {
                if (!alive || !r.data?.submitted) return;
                const s = r.data.submission || {};
                setSent({
                    at: s.submitted_at || null, grade: s.grade, feedback: s.feedback, gradedAt: s.graded_at,
                    rubricScores: s.rubric_scores, late: s.late,
                });
                onSolvedRef.current?.();
            })
            .catch(() => undefined);
        return () => { alive = false; };
    }, [isStudent, courseId, submissionNodeId]);

    /* --- teslim --------------------------------------------------------- */

    /** Öğretmenin göreceği özet: otomatik kontrol sonucu + kod. */
    const codeNote = (source: string) => {
        const checks = lastChecksRef.current;
        const lines: string[] = [];
        if (checks.length) {
            const passed = checks.every(isAccepted);
            lines.push(`Otomatik kontrol: ${passed ? 'GEÇTİ ✓' : 'geçmedi ✗'}`);
            for (const c of checks) {
                const mark = c.status === 'pass' ? '✓' : c.status === 'near' ? '≈' : c.status === 'pending' ? '…' : '✗';
                lines.push(`  ${mark} ${c.label}${c.detail && c.status !== 'pass' ? ` — ${c.detail}` : ''}`);
            }
            lines.push('');
        }
        lines.push(source);
        return lines.join('\n');
    };

    const submit = useCallback(async (auto = false): Promise<boolean> => {
        setSubmitError(null);
        if (!courseId || !submissionNodeId) {
            if (!auto) setSubmitError('Görev teslimi için ders bağlantısı bulunamadı.');
            return false;
        }
        const form = new FormData();
        if (cfg.submissionType === 'image' || cfg.submissionType === 'file') {
            if (!file) return false;
            form.append('file', file);
        } else if (cfg.submissionType === 'code') {
            const source = lastSourceRef.current;
            if (!source) {
                if (!auto) setSubmitError('Göndermeden önce kodunu en az bir kez kontrol et.');
                return false;
            }
            const ext = findLanguage(language).ext;
            form.append('file', new Blob([source], { type: 'text/plain' }), `cevap.${ext}`);
            form.append('student_note', codeNote(source).slice(0, 12000));
        } else {
            if (!answer.trim()) return false;
            form.append('file', new Blob([answer], { type: 'text/plain' }), 'cevap.txt');
            form.append('student_note', answer.slice(0, 12000));
        }

        setSending(true);
        try {
            const res = await api.post(`/courses/${courseId}/homework/${encodeURIComponent(submissionNodeId)}/submit`, form);
            setSent({ at: new Date().toISOString(), late: !!res.data?.late });
            return true;
        } catch (err: any) {
            if (!auto) setSubmitError(err?.response?.data?.detail || 'Gönderilemedi. Bağlantını kontrol et.');
            return false;
        } finally {
            setSending(false);
        }
    }, [courseId, submissionNodeId, cfg.submissionType, file, language, answer]);

    /**
     * Görevi tamamlar — ama çözüm büyük ölçüde dışarıdan yapıştırıldıysa önce
     * "Kodunu açıkla" sorulur. Ceza değil: öğrenci satırları açıklayınca görev
     * yine tamamlanır; öğretmen açıklamanın yeterli olup olmadığını görür.
     */
    const complete = async () => {
        if (isStudent && isCode && courseId && submissionNodeId) {
            try {
                flushEdits();
                // Yazım kaydının sunucuya ulaşması için kısa bir pay.
                await new Promise((r) => setTimeout(r, 1200));
                const res = await api.post('/analytics/explain/start', {
                    course_id: Number(courseId), task_key: submissionNodeId,
                });
                if (res.data?.required) {
                    setExplain({
                        reason: res.data.reason, lines: res.data.lines,
                        answers: res.data.lines.map(() => ''), sending: false, result: null,
                    });
                    return;
                }
            } catch {
                /* açıklama servisi yoksa görev bekletilmez */
            }
        }
        onSolvedRef.current?.();
    };

    const handleSubmit = async () => {
        if (await submit(false)) void complete();
    };

    /**
     * Otomatik kontrol görevi çözdü: slayt açılır ve çözüm öğretmene gider —
     * doğru çözen öğrencinin kodu da öğretmenin önünde olmalı. Daha önce
     * teslim edilmişse ÜZERİNE YAZILMAZ: sunucu yeni teslimde öğretmenin
     * notunu siliyor.
     */
    const handleSolved = () => {
        void complete();
        if (!sentRef.current) void submit(true);
    };

    const sendExplanation = async () => {
        if (!explain || !courseId || !submissionNodeId) return;
        setExplain({ ...explain, sending: true });
        try {
            const res = await api.post('/analytics/explain/answer', {
                course_id: Number(courseId),
                task_key: submissionNodeId,
                answers: explain.lines.map((l, i) => ({ ...l, answer: explain.answers[i] })),
            });
            setExplain({ ...explain, sending: false, result: res.data });
        } catch {
            setExplain({ ...explain, sending: false, result: { understood: true, verdicts: [] } });
        }
        onSolvedRef.current?.();
    };

    /* --- kontrol ayarları ----------------------------------------------- */

    const criteria = useMemo(
        () => [...criteriaOf(cfg), ...(extraCriteria || [])],
        [cfg.criteria, cfg.expectedOutput, cfg.checkMode, extraCriteria],
    );
    const taskText = [cfg.title, cfg.prompt, stageContext].filter(Boolean).join('\n\n');

    const taskOptions = (files: ChallengeFile[], client: string): TaskCheckOptions => ({
        task: taskText,
        files,
        criteria,
        samples,
        courseId,
        xp: cfg.xp,
        language,
        checkMode,
        tests: checkMode === 'tests' ? (cfg.tests || []).filter((t) => t.call.trim()) : [],
        requirements: (requirements || []).filter((r) => r.trim()),
        stage: kind,
        folder: taskFolder(kind, slideId),
        taskKey: submissionNodeId,
        track: isStudent,
        client,
        onSolved: handleSolved,
        onCodeRead: (source) => { lastSourceRef.current = source; setHasSource(true); },
        onChecked: (checks) => { lastChecksRef.current = checks; setLastChecks(checks); },
    });

    const inVSCode = isEmbeddedInVSCode();
    const SubIcon = SUBMISSION_META[cfg.submissionType]?.icon || Code2;
    const HeaderIcon = meta.icon;

    /* ------------------------------ SOL PANEL ------------------------------ */
    const brief = (
        <div className="flex flex-col gap-3 md:gap-4">
            {isEdit && <TaskHistoryCard courseId={courseId} taskKey={submissionNodeId} />}
            <div className={`bg-white border-2 border-b-[6px] rounded-3xl p-5 md:p-6 shadow-sm flex flex-col gap-4 ${theme.card}`}>
                <div className={`flex items-center justify-between gap-2 border-b pb-3 ${theme.divider}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wider uppercase border shadow-sm ${theme.badge}`}>
                            <HeaderIcon size={13} className={theme.badgeIcon} />
                            {meta.badge}
                        </span>
                        {headerExtra ?? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                <SubIcon size={11} className="text-slate-400" />
                                {SUBMISSION_META[cfg.submissionType]?.label}
                            </span>
                        )}
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 font-black text-xs rounded-xl shadow-sm shrink-0 ${theme.xpPill}`}>
                        <Trophy size={13} />
                        <span>{cfg.xp ?? 100} XP</span>
                    </div>
                </div>

                <div>
                    {isEdit ? (
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Görev Başlığı</label>
                            <input
                                type="text"
                                value={cfg.title}
                                onChange={(e) => patch({ title: e.target.value })}
                                className={`w-full text-base md:text-lg font-black text-slate-800 border-2 rounded-xl px-3 py-1.5 outline-none ${theme.field}`}
                                placeholder="Görev Başlığı"
                            />
                        </div>
                    ) : (
                        <h2 className="text-lg md:text-xl font-black text-slate-800 font-display tracking-tight">{cfg.title}</h2>
                    )}
                    {titleExtra}
                </div>

                <div>
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 block">{meta.promptLabel}</label>
                    {isEdit ? (
                        <textarea
                            value={cfg.prompt}
                            onChange={(e) => patch({ prompt: e.target.value })}
                            rows={4}
                            className={`w-full text-xs md:text-sm font-medium text-slate-700 border-2 rounded-xl p-3 outline-none resize-none ${theme.field}`}
                            placeholder={meta.promptPlaceholder}
                        />
                    ) : (
                        <div className={`p-3.5 rounded-2xl border ${theme.promptBox}`}>
                            <FormattedText text={cfg.prompt} />
                        </div>
                    )}
                </div>

                {renderStageSection?.(lastChecks)}

                {!isEdit && cfg.dueDate && (
                    <p className="text-[11px] font-black text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                        Son teslim: {new Date(cfg.dueDate).toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' })}
                        {cfg.allowLate === false && <span className="text-rose-600"> · sonrasında kabul edilmez</span>}
                    </p>
                )}
                {!isEdit && cfg.rubric && cfg.rubric.criteria.length > 0 && (
                    <details className={`border-2 rounded-2xl p-3 ${theme.panel}`}>
                        <summary className={`text-[11px] font-black uppercase tracking-wider cursor-pointer ${theme.panelTitle}`}>
                            Nasıl değerlendirilecek?
                        </summary>
                        <div className="mt-2">
                            <RubricGrader rubric={cfg.rubric} scores={sent?.rubricScores || {}} readOnly />
                        </div>
                    </details>
                )}

                {isCode && (samples.length > 0 || isEdit) && (
                    <div className={`border-2 rounded-2xl p-3.5 flex flex-col gap-2 ${theme.panel}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${theme.panelTitle}`}>
                                <Sparkles size={13} className={theme.badgeIcon} />
                                Örnekler & Test Girdileri
                            </span>
                            {isEdit && (
                                <button
                                    onClick={() => patch({ samples: [...samples, { input: '', output: '' }] })}
                                    className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${theme.smallButton}`}
                                >
                                    <Plus size={11} /> Örnek Ekle
                                </button>
                            )}
                        </div>
                        {isEdit && (
                            <p className="text-[10px] text-slate-500 font-medium leading-snug">
                                Girdiler, kontrol sırasında programın <code className="font-mono">input()</code> sorularına
                                sırayla cevap olarak verilir. Program girdi istiyorsa en az bir örnek ekle.
                            </p>
                        )}
                        <div className="flex flex-col gap-1.5">
                            {samples.map((s, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs font-mono">
                                    {isEdit ? (
                                        <>
                                            <input
                                                value={s.input}
                                                onChange={(e) => patch({ samples: samples.map((x, j) => (j === i ? { ...x, input: e.target.value } : x)) })}
                                                placeholder="girdi"
                                                className={`flex-1 min-w-0 bg-white border rounded-lg px-2 py-1 outline-none text-xs ${theme.field}`}
                                            />
                                            <span className={`font-black ${theme.accentText}`}>→</span>
                                            <input
                                                value={s.output}
                                                onChange={(e) => patch({ samples: samples.map((x, j) => (j === i ? { ...x, output: e.target.value } : x)) })}
                                                placeholder="çıktı (gösterim)"
                                                className={`flex-1 min-w-0 bg-white border rounded-lg px-2 py-1 outline-none text-xs ${theme.field}`}
                                            />
                                            <button onClick={() => patch({ samples: samples.filter((_, j) => j !== i) })} className="text-slate-400 hover:text-rose-500 p-1">
                                                <Trash2 size={12} />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="w-full flex items-center justify-between gap-2 bg-white/80 border border-slate-200 rounded-lg px-2.5 py-1">
                                            <span className="text-slate-700 font-bold">{s.input || '(girdi yok)'}</span>
                                            <span className={`font-black ${theme.accentText}`}>➔</span>
                                            <span className="text-slate-800 font-extrabold">{s.output}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {isEdit && (
                    <div className={`flex flex-col gap-2 pt-2 border-t ${theme.divider}`}>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Teslim Şekli</span>
                            <div className="grid grid-cols-4 gap-1.5">
                                {(Object.keys(SUBMISSION_META) as ChallengeSubmissionType[]).map((k) => {
                                    const Icon = SUBMISSION_META[k].icon;
                                    return (
                                        <button
                                            key={k}
                                            onClick={() => patch({ submissionType: k })}
                                            className={`flex flex-col items-center gap-1 rounded-xl border-2 py-2 text-[10px] font-bold transition-all ${
                                                cfg.submissionType === k ? `${theme.chipOn} border-b-[4px]` : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            <Icon size={14} /> {SUBMISSION_META[k].label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {isCode && (
                            <div className="flex flex-col gap-2 mt-1">
                                <div className="flex items-center justify-between gap-2">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Dil</label>
                                    <select
                                        value={findLanguage(language).id}
                                        onChange={(e) => patch({
                                            language: e.target.value,
                                            // Testler Python'da çalışır; başka dilde öğretmen değerlendirir.
                                            ...(e.target.value !== 'python' && checkMode === 'tests' ? { checkMode: 'manual' as const } : {}),
                                        })}
                                        className="text-[11px] font-bold bg-slate-100 border-2 border-slate-200 rounded-lg px-1.5 py-0.5 outline-none"
                                    >
                                        {TASK_LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                                    </select>
                                </div>

                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Değerlendirme Yöntemi</label>
                                    <span className={`text-[11px] font-bold ${theme.accentText}`}>{CHECK_META[checkMode].label}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                                    {(['output', 'tests', 'manual'] as ChallengeCheckMode[]).map((mode) => {
                                        const disabled = mode === 'tests' && language !== 'python';
                                        return (
                                            <button
                                                key={mode}
                                                onClick={() => !disabled && patch({ checkMode: mode })}
                                                disabled={disabled}
                                                title={disabled ? 'Fonksiyon testleri yalnızca Python görevlerinde çalışır.' : undefined}
                                                className={`py-1.5 text-[11px] font-black rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                                    checkMode === mode ? `bg-white shadow-sm ${theme.accentText}` : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                {CHECK_META[mode].label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400">{CHECK_META[checkMode].hint}</p>

                                {checkMode === 'output' && <ExpectedOutputVerifier cfg={cfg} patch={patch} />}
                                {checkMode === 'tests' && <TestsEditor cfg={cfg} patch={patch} theme={theme} />}
                            </div>
                        )}

                        {isCode && (
                            <label className="flex items-start gap-2 pt-2 border-t border-slate-100 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={cfg.explainIfPasted !== false}
                                    onChange={(e) => patch({ explainIfPasted: e.target.checked })}
                                    className="mt-0.5"
                                />
                                <span className="text-[10.5px] font-bold text-slate-500 leading-snug">
                                    Çözüm büyük ölçüde yapıştırılmışsa öğrenciye iki satırını açıklat
                                    <span className="block font-medium text-slate-400">"Kodunu açıkla" — ceza değil, anlama kontrolü.</span>
                                </span>
                            </label>
                        )}

                        {kind === 'produce' && (
                            <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Son teslim (isteğe bağlı)</label>
                                <input
                                    type="datetime-local"
                                    value={cfg.dueDate || ''}
                                    onChange={(e) => patch({ dueDate: e.target.value || undefined })}
                                    className="text-xs font-bold bg-slate-50 border-2 border-slate-200 rounded-lg px-2 py-1 outline-none"
                                />
                                {cfg.dueDate && (
                                    <label className="flex items-center gap-2 text-[10.5px] font-bold text-slate-500 cursor-pointer">
                                        <input type="checkbox" checked={cfg.allowLate !== false} onChange={(e) => patch({ allowLate: e.target.checked })} />
                                        Süre dolunca da teslim edilebilsin (geç işaretlenir)
                                    </label>
                                )}
                            </div>
                        )}

                        <RubricEditor rubric={cfg.rubric} onChange={(rubric) => patch({ rubric })} submissionType={cfg.submissionType} />

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kazanılan XP:</span>
                            <input
                                type="number"
                                value={cfg.xp}
                                onChange={(e) => patch({ xp: Number(e.target.value) || 0 })}
                                className="w-20 bg-amber-50 border-2 border-amber-200 rounded-lg px-2 py-0.5 text-xs font-bold outline-none focus:border-amber-400"
                            />
                        </div>
                    </div>
                )}
            </div>

            {(isEdit || cfg.hint) && (
                <div className={`border-2 rounded-2xl p-3.5 ${theme.hintBox}`}>
                    <button
                        onClick={() => {
                            // Öğretmen "ipucunu açtı mı, kaç kez" bilgisini görür: takılmanın erken işareti.
                            if (!showHint && isStudent && submissionNodeId) {
                                trackLearningEvent(courseId, { type: 'hint_opened', task_key: submissionNodeId });
                            }
                            setShowHint(!showHint);
                        }}
                        className={`w-full flex items-center justify-between text-left text-xs font-black ${theme.hintTitle}`}
                    >
                        <span className="flex items-center gap-1.5">
                            <Lightbulb size={14} className={theme.hintIcon} />
                            {isEdit ? meta.hintEditLabel : meta.hintViewLabel}
                        </span>
                        <span className={`text-[10px] uppercase font-bold ${theme.accentText}`}>{showHint ? 'Gizle' : 'Göster'}</span>
                    </button>
                    {showHint && (isEdit ? (
                        <textarea
                            value={cfg.hint || ''}
                            onChange={(e) => patch({ hint: e.target.value })}
                            rows={2}
                            className={`mt-2 w-full text-[12px] font-medium bg-white border-2 rounded-xl p-2 outline-none resize-none ${theme.hintText} ${theme.field}`}
                            placeholder={meta.hintPlaceholder}
                        />
                    ) : (
                        <div className={`mt-2 ${theme.hintText}`}><FormattedText text={cfg.hint} /></div>
                    ))}
                </div>
            )}
        </div>
    );

    /* ------------------------------ SAĞ PANEL ------------------------------ */

    const uploadWorkspace = (
        <div className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <SubIcon size={18} className={theme.badgeIcon} />
                <h3 className="text-base font-black text-slate-800">{SUBMISSION_META[cfg.submissionType]?.label}</h3>
                {isEdit && <span className="ml-auto text-[10px] font-bold text-slate-400">Öğrenci burada teslim eder</span>}
            </div>
            {cfg.submissionType === 'text' ? (
                <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    disabled={!isStudent}
                    rows={7}
                    className={`w-full text-sm font-medium text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 outline-none resize-none disabled:opacity-60 ${theme.focus}`}
                    placeholder="Cevabını buraya yaz..."
                />
            ) : (
                <label className={`border-2 border-dashed border-slate-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 text-center bg-slate-50 ${isStudent ? 'cursor-pointer' : 'opacity-60'}`}>
                    <Upload size={24} className="text-slate-400" />
                    <p className="text-xs font-bold text-slate-600">
                        {file ? file.name : cfg.submissionType === 'image' ? 'Ekran görüntünü seç' : 'Dosyanı seç'}
                    </p>
                    <input
                        type="file"
                        disabled={!isStudent}
                        accept={cfg.submissionType === 'image' ? 'image/*' : undefined}
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className={`text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-black cursor-pointer ${theme.fileInput}`}
                    />
                </label>
            )}
        </div>
    );

    // Çalışma alanları slayt kimliğiyle anahtarlanıyor: art arda iki görev
    // slaytında bileşen yeniden kurulmazsa önceki görevin kontrol sonucu ve
    // koç ipucu yeni görevde görünmeye devam ediyordu.
    const wsKey = String(slideId);
    let workspace: React.ReactNode;
    if (isPresent) {
        workspace = <ClassProgressCard courseId={courseId} taskKey={submissionNodeId} />;
    } else if (isReview) {
        workspace = (
            <ReviewPanel key={wsKey} courseId={courseId} nodeId={submissionNodeId} title={meta.reviewTitle} empty={meta.emptyReview} theme={theme} />
        );
    } else if (!isCode) {
        workspace = uploadWorkspace;
    } else if (isEdit) {
        workspace = (
            <div className="flex flex-col gap-2">
                <p className="text-[10.5px] font-bold text-slate-500">
                    Başlangıç dosyaları — öğrenci görevi bunlarla açar. Dosya adını değiştirmek için çift tıkla.
                </p>
                <FileTabsEditor
                    files={draft}
                    active={activeFile}
                    setActive={setActiveFile}
                    onChange={writeFiles}
                    language={language}
                    theme={theme}
                    structural
                />
            </div>
        );
    } else if (inVSCode) {
        workspace = <ChallengeVSCodePanel key={wsKey} task={taskOptions(starterFiles, 'vscode-panel')} />;
    } else {
        // Kod HER ZAMAN öğrencinin VS Code'unda (tarayıcı içi Python kaldırıldı).
        workspace = <ChallengeCodeLab key={wsKey} task={taskOptions(starterFiles, 'lab')} />;
    }

    const needsCheckFirst = isCode && !hasSource;
    const canSubmit = !sending && (
        cfg.submissionType === 'code' ? !needsCheckFirst
            : cfg.submissionType === 'text' ? !!answer.trim()
            : !!file
    );

    const explainCard = explain && (
        <div className="bg-white border-2 border-violet-200 border-b-[5px] rounded-2xl p-4 space-y-3">
            <div>
                <h3 className="text-sm font-black text-violet-800">Kodunu açıkla</h3>
                <p className="text-[11.5px] font-medium text-slate-600 leading-snug">
                    Kodunun bir kısmı dışarıdan gelmiş görünüyor ({explain.reason.toLocaleLowerCase('tr')}).
                    Sorun değil — sadece şu satırların ne yaptığını kendi cümlelerinle yaz.
                </p>
            </div>
            {explain.lines.map((line, i) => {
                const verdict = explain.result?.verdicts.find((v) => v.line_no === line.line_no);
                return (
                    <div key={line.file + '-' + line.line_no} className="space-y-1.5">
                        <pre className="bg-slate-900 text-slate-100 text-[12px] font-mono rounded-xl px-3 py-2 overflow-x-auto">
                            <span className="text-slate-500">{line.line_no}  </span>{line.code}
                        </pre>
                        <textarea
                            value={explain.answers[i]}
                            disabled={!!explain.result || explain.sending}
                            onChange={(e) => setExplain({ ...explain, answers: explain.answers.map((a, j) => (j === i ? e.target.value : a)) })}
                            rows={2}
                            placeholder="Bu satır ne yapıyor?"
                            className="w-full text-sm bg-slate-50 border-2 border-slate-200 rounded-xl p-2.5 outline-none focus:border-violet-400 resize-none disabled:opacity-70"
                        />
                        {verdict?.feedback && (
                            <p className={'text-[11.5px] font-bold ' + (verdict.understood ? 'text-emerald-700' : 'text-amber-700')}>{verdict.feedback}</p>
                        )}
                    </div>
                );
            })}
            {explain.result ? (
                <p className={'text-xs font-black ' + (explain.result.understood ? 'text-emerald-700' : 'text-amber-700')}>
                    {explain.result.understood
                        ? 'Açıklaman yeterli. Görev tamamlandı.'
                        : 'Görev tamamlandı; açıklamanı öğretmenin de görecek. Kodunu bir kez daha satır satır okumaya değer.'}
                </p>
            ) : (
                <button
                    onClick={sendExplanation}
                    disabled={explain.sending}
                    className="w-full flex items-center justify-center gap-1.5 font-black text-sm py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-60"
                >
                    {explain.sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Açıklamamı gönder
                </button>
            )}
        </div>
    );

    const submitBar = isStudent && (
        <div className="flex flex-col gap-1.5">
            <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`shrink-0 flex items-center justify-center gap-1.5 font-black text-[11px] md:text-sm py-1.5 md:py-2.5 rounded-xl border-2 border-b-[4px] md:border-b-[5px] active:border-b-2 active:translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    sent && !sending ? theme.submitDone : theme.submit}`}
            >
                {sending ? <Loader2 size={15} className="animate-spin" /> : sent ? <Check size={15} /> : <Send size={15} />}
                {sending ? 'Gönderiliyor…' : sent ? `${meta.sentLabel} · Tekrar Gönder` : meta.submitLabel}
            </button>
            {needsCheckFirst && !sent && (
                <p className="text-[10.5px] font-bold text-slate-400 text-center">
                    Göndermeden önce kodunu en az bir kez kontrol et.
                </p>
            )}
            {submitError && <p className="text-[11px] font-bold text-rose-600 text-center">{submitError}</p>}
            {sent && (
                <div className="bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-[11px]">
                    <p className="font-bold text-slate-500">
                        Teslim edildi{sent.at ? ` · ${formatDate(sent.at)}` : ''}
                        {sent.late && <span className="text-rose-600"> · geç teslim</span>}
                    </p>
                    {sent.gradedAt && (
                        <p className="mt-1 font-bold text-slate-700">
                            Öğretmen değerlendirmesi{sent.grade != null ? `: ${sent.grade}/100` : ''}
                            {sent.feedback && <span className="block font-medium text-slate-600 mt-0.5">{sent.feedback}</span>}
                        </p>
                    )}
                </div>
            )}
        </div>
    );

    return (
        <div className="w-full h-full bg-slate-50 overflow-y-auto custom-scrollbar pt-12 md:pt-16 pb-36 md:pb-44 px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20">
            <div className="w-full max-w-[1560px] mx-auto flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
                <div className="w-full md:w-[38%] lg:w-[36%] shrink-0 flex flex-col gap-3 md:gap-4">{brief}</div>
                <div className="w-full flex-1 flex flex-col gap-3 min-w-0 md:sticky md:top-4">
                    {(isStudent || isPresent) && <TaskTimerBanner taskKey={submissionNodeId} big={isPresent} />}
                    {isStudent && courseId && submissionNodeId && (
                        <TaskLiveAssist key={submissionNodeId} courseId={courseId} taskKey={submissionNodeId} solved={!!sent} />
                    )}
                    {explainCard}
                    {workspace}
                    {submitBar}
                </div>
            </div>
        </div>
    );
};

export default TaskSlideShell;
