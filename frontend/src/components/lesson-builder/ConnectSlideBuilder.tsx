import React, { useMemo, useState } from 'react';
import { ArrowRight, Check, Clock, Code2, Plus, Puzzle, X } from 'lucide-react';
import TaskSlideShell, { type TaskRole } from './TaskSlideShell';
import { STAGE_META } from './taskStages';
import type { CriterionResult } from './challengeCheck';
import type { ChallengeCriterion, ConnectConfig, Slide } from './types';

/**
 * BİRLEŞTİR aşamasına ÖZEL tam slayt — "Birleştirme / Sentez Görevi".
 *
 * AMACI: öğrencinin önceki konularda öğrendiklerini şimdiki konuyla BİRLİKTE
 * kullanması. İskelet Uygula ve Üret ile ortak (bkz. TaskSlideShell); burada
 * yalnızca aşamaya özel "kavram köprüsü" var.
 *
 * Köprünün iki işi var:
 *  1. Öğrenciye neyi neyle birleştireceğini göstermek (önceki konular → şimdiki).
 *  2. Birleştirmenin GERÇEKTEN yapıldığını ölçmek: "zorunlu yapılar" (`for`,
 *     `def`…) birer `code` ölçütüne dönüşür. Bu olmadan öğrenci görevi yalnızca
 *     yeni konuyla çözüp eski konuyu hiç kullanmadan geçebiliyordu.
 */

export const defaultConnectConfig = (): ConnectConfig => ({
    title: 'Birleştirme Görevi',
    prompt: 'Önceki konularda öğrendiğin kavramları şimdiki konu ile birleştirerek görevi tamamla.',
    submissionType: 'code',
    checkMode: 'output',
    expectedOutput: '',
    functionName: 'cozum',
    tests: [],
    samples: [],
    hint: '',
    xp: 150,
    stage: 'BİRLEŞTİR',
    previousTopics: [],
    currentTopic: '',
    requiredConstructs: [],
});

/** Eski slaytların tek `previousTopic` alanı listeye katılır. */
export const previousTopicsOf = (cfg: ConnectConfig): string[] => {
    const list = (cfg.previousTopics || []).map((t) => t.trim()).filter(Boolean);
    const legacy = (cfg.previousTopic || '').trim();
    return legacy && !list.includes(legacy) ? [legacy, ...list] : list;
};

/** Zorunlu yapıların ölçüt karşılığı. Kimlik, köprüdeki rozetin sonucunu bulmak için. */
export const constructCriteria = (cfg: ConnectConfig): ChallengeCriterion[] =>
    (cfg.requiredConstructs || [])
        .map((c) => c.trim())
        .filter(Boolean)
        .map((value, i) => ({
            id: `construct:${i}`,
            kind: 'code' as const,
            value,
            label: `Kodda "${value}" kullanıldı (birleştirme)`,
        }));

/** Etiket listesi girişi: yaz + Enter → etiket; × ile sil. */
const ChipInput: React.FC<{
    values: string[];
    onChange: (next: string[]) => void;
    placeholder: string;
    suggestions?: string[];
    mono?: boolean;
    listId: string;
}> = ({ values, onChange, placeholder, suggestions = [], mono, listId }) => {
    const [draft, setDraft] = useState('');
    const add = (raw: string) => {
        const value = raw.trim();
        if (value && !values.includes(value)) onChange([...values, value]);
        setDraft('');
    };
    const unused = suggestions.filter((s) => !values.includes(s));

    return (
        <div>
            <div className="flex flex-wrap gap-1 mb-1.5">
                {values.map((v) => (
                    <span key={v} className={`inline-flex items-center gap-1 bg-white border border-emerald-300 text-slate-800 rounded-lg px-2 py-0.5 text-[11px] font-bold ${mono ? 'font-mono' : ''}`}>
                        {v}
                        <button onClick={() => onChange(values.filter((x) => x !== v))} className="text-slate-400 hover:text-rose-500">
                            <X size={11} />
                        </button>
                    </span>
                ))}
            </div>
            <div className="flex items-center gap-1">
                <input
                    value={draft}
                    list={unused.length ? listId : undefined}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(draft); }
                    }}
                    placeholder={placeholder}
                    className={`flex-1 min-w-0 text-xs font-bold text-slate-800 bg-emerald-50/50 border border-emerald-300 rounded-lg px-2 py-1 outline-none focus:border-emerald-500 ${mono ? 'font-mono' : ''}`}
                />
                <button
                    onClick={() => add(draft)}
                    className="p-1.5 rounded-lg bg-emerald-200/60 hover:bg-emerald-200 text-emerald-800"
                >
                    <Plus size={12} />
                </button>
                {unused.length > 0 && (
                    <datalist id={listId}>
                        {unused.map((s) => <option key={s} value={s} />)}
                    </datalist>
                )}
            </div>
        </div>
    );
};

interface Props {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
    /** 'edit' -> görevi kur, 'student' -> görevi çöz, 'review' -> teslimleri gör */
    role?: TaskRole;
    courseId?: number | string;
    /** Teslimlerin anahtarı ("connect:<slayt id>") */
    submissionNodeId?: string;
    onSolved?: () => void;
    /** Önceki derslerin konuları — öğretmene "önceki konu" önerisi olarak sunulur. */
    topicSuggestions?: string[];
}

const ConnectSlideBuilder: React.FC<Props> = ({
    slide, updateSlide, role = 'student', courseId, submissionNodeId, onSolved, topicSuggestions,
}) => {
    // Ölçütler yapılandırmayla birlikte üretiliyor: kimlikleri yapılandırma
    // değişmedikçe sabit kalsın (kabuk ölçüt listesini bağımlılık olarak kullanıyor).
    const { cfg, extraCriteria } = useMemo(() => {
        const merged: ConnectConfig = {
            ...defaultConnectConfig(), ...(slide.connectConfig || slide.challengeConfig || {}),
        };
        return { cfg: merged, extraCriteria: constructCriteria(merged) };
    }, [slide.connectConfig, slide.challengeConfig]);
    const patch = (updates: Partial<ConnectConfig>) => updateSlide({ connectConfig: { ...cfg, ...updates } });
    const isEdit = role === 'edit';
    const topics = previousTopicsOf(cfg);
    const constructs = (cfg.requiredConstructs || []).map((c) => c.trim()).filter(Boolean);
    const theme = STAGE_META.connect.theme;

    const stageContext = [
        topics.length ? `Birleştirilecek önceki konular: ${topics.join(', ')}` : '',
        cfg.currentTopic ? `Şimdiki konu: ${cfg.currentTopic}` : '',
        constructs.length ? `Kodda kullanılması gereken yapılar: ${constructs.join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const renderBridge = (checks: CriterionResult[]) => {
        if (!isEdit && !topics.length && !cfg.currentTopic && !constructs.length) return null;
        const statusOf = (i: number) => checks.find((c) => c.id === `construct:${i}`)?.status;

        return (
            <div className={`border-2 rounded-2xl p-3.5 flex flex-col gap-2.5 ${theme.panel}`}>
                <span className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${theme.panelTitle}`}>
                    <Puzzle size={13} className={theme.badgeIcon} />
                    Kavram Köprüsü
                </span>

                {isEdit ? (
                    <>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block mb-1">Önceki Konular</span>
                            <ChipInput
                                values={topics}
                                onChange={(next) => patch({ previousTopics: next, previousTopic: '' })}
                                placeholder="Örn: Döngüler (Enter ile ekle)"
                                suggestions={topicSuggestions}
                                listId={`connect-topics-${slide.id}`}
                            />
                        </div>
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-wider text-teal-700 block mb-1">Şimdiki Konu</span>
                            <input
                                type="text"
                                value={cfg.currentTopic || ''}
                                onChange={(e) => patch({ currentTopic: e.target.value })}
                                placeholder="Örn: Fonksiyonlar"
                                className="w-full text-xs font-bold text-slate-800 bg-teal-50/50 border border-teal-300 rounded-lg px-2 py-1 outline-none focus:border-teal-500"
                            />
                        </div>
                        {cfg.submissionType === 'code' && (
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                                    Kodda kullanılması zorunlu yapılar
                                </span>
                                <ChipInput
                                    values={constructs}
                                    onChange={(next) => patch({ requiredConstructs: next })}
                                    placeholder="Örn: for, def, append"
                                    mono
                                    listId={`connect-constructs-${slide.id}`}
                                />
                                <p className="mt-1 text-[10px] text-slate-500 font-medium leading-snug">
                                    Her biri öğrencinin kodunda aranır. Birleştirmenin kanıtı budur: önceki
                                    konunun yapısını buraya yazarsan, öğrenci onu kullanmadan görevi geçemez.
                                </p>
                            </div>
                        )}
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 bg-white/90 border border-emerald-200/80 rounded-xl p-2.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block mb-1">Önceki Konular</span>
                                <div className="flex flex-wrap gap-1">
                                    {(topics.length ? topics : ['Temel Kavramlar']).map((t) => (
                                        <span key={t} className="text-xs font-bold text-slate-800 bg-emerald-50 border border-emerald-200 rounded-md px-1.5 py-0.5">{t}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0 shadow-sm">
                                <ArrowRight size={14} />
                            </div>
                            <div className="flex-1 min-w-0 bg-white/90 border border-emerald-200/80 rounded-xl p-2.5">
                                <span className="text-[9px] font-black uppercase tracking-wider text-teal-700 block mb-1">Şimdiki Konu</span>
                                <span className="text-xs font-bold text-slate-800">{cfg.currentTopic || 'Yeni Konu'}</span>
                            </div>
                        </div>
                        {constructs.length > 0 && cfg.submissionType === 'code' && (
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 block mb-1">
                                    Kodunda bunlar olmalı
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {constructs.map((c, i) => {
                                        const st = statusOf(i);
                                        return (
                                            <span
                                                key={c}
                                                className={`inline-flex items-center gap-1 font-mono text-[11px] font-bold rounded-md px-1.5 py-0.5 border ${
                                                    st === 'pass' ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                                        : st === 'fail' ? 'bg-rose-50 border-rose-300 text-rose-700'
                                                        : 'bg-white border-slate-200 text-slate-700'}`}
                                            >
                                                {st === 'pass' ? <Check size={10} /> : st === 'fail' ? <X size={10} /> : st === 'pending' ? <Clock size={10} /> : <Code2 size={10} />}
                                                {c}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        );
    };

    return (
        <TaskSlideShell
            kind="connect"
            slideId={slide.id}
            cfg={cfg}
            patch={patch}
            role={role}
            courseId={courseId}
            submissionNodeId={submissionNodeId}
            onSolved={onSolved}
            renderStageSection={renderBridge}
            stageContext={stageContext}
            extraCriteria={cfg.submissionType === 'code' ? extraCriteria : undefined}
        />
    );
};

export default ConnectSlideBuilder;
