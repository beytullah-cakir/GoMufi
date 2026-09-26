import React, { useMemo } from 'react';
import { Check, CheckSquare, Clock, Plus, Sparkles, Trash2, X } from 'lucide-react';
import TaskSlideShell, { type TaskRole } from './TaskSlideShell';
import { STAGE_META } from './taskStages';
import type { CriterionResult } from './challengeCheck';
import type { ProduceConfig, Slide } from './types';

/**
 * ÜRET aşamasına ÖZEL tam slayt — "Proje Görevi".
 *
 * AMACI: öğrencinin öğrendiklerini birleştirip özgün bir mini proje üretmesi.
 * İskelet Uygula ve Birleştir ile ortak (bkz. TaskSlideShell).
 *
 * GEREKSİNİMLER DEĞERLENDİRME ÖLÇÜTÜDÜR: eskiden liste yalnızca öğrencinin
 * tarayıcıda kendi işaretlediği bir kontrol listesiydi — ne kaydediliyor ne
 * değerlendiriliyor ne de öğretmene ulaşıyordu. Artık "Kontrol Et"te tek bir
 * YZ çağrısıyla madde madde değerlendiriliyor ve işaretler o sonuçtan geliyor.
 * Projelerin çıktısı öğrenciden öğrenciye değiştiği için beklenen çıktıyla
 * karşılaştırma burada doğru ölçü değil; gereksinimler öyle.
 */

export const defaultProduceConfig = (): ProduceConfig => ({
    title: 'Proje Görevi',
    projectTitle: 'Özgün Proje Geliştirme',
    prompt: 'Öğrendiğin kavramları harmanlayarak aşağıdaki gereksinimleri karşılayan çalışan bir proje geliştir.',
    submissionType: 'code',
    checkMode: 'output',
    expectedOutput: '',
    functionName: 'cozum',
    tests: [],
    samples: [],
    hint: '',
    xp: 200,
    stage: 'ÜRET',
    estimatedTime: '25 dk',
    requirements: [
        'Program çalıştığında anlamlı bir sonucu ekrana yazdırıyor',
        'Koşul ve döngü yapılarını doğru kullanıyor',
        'Kod okunabilir: değişken adları ne tuttuğunu anlatıyor',
    ],
});

interface Props {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
    /** 'edit' -> görevi kur, 'student' -> görevi çöz, 'review' -> teslimleri gör */
    role?: TaskRole;
    courseId?: number | string;
    /** Teslimlerin anahtarı ("produce:<slayt id>") */
    submissionNodeId?: string;
    onSolved?: () => void;
}

const ProduceSlideBuilder: React.FC<Props> = ({
    slide, updateSlide, role = 'student', courseId, submissionNodeId, onSolved,
}) => {
    const cfg = useMemo<ProduceConfig>(
        () => ({ ...defaultProduceConfig(), ...(slide.produceConfig || slide.challengeConfig || {}) }),
        [slide.produceConfig, slide.challengeConfig],
    );
    const patch = (updates: Partial<ProduceConfig>) => updateSlide({ produceConfig: { ...cfg, ...updates } });
    const isEdit = role === 'edit';
    const requirements = cfg.requirements || [];
    const active = requirements.map((r) => r.trim()).filter(Boolean);
    const theme = STAGE_META.produce.theme;
    const isCode = cfg.submissionType === 'code';

    const stageContext = [
        cfg.projectTitle ? `Proje: ${cfg.projectTitle}` : '',
        active.length ? `Gereksinimler:\n${active.map((r) => `- ${r}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');

    const headerExtra = (
        <>
            {cfg.estimatedTime && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    <Clock size={11} className="text-slate-400" />
                    {cfg.estimatedTime}
                </span>
            )}
        </>
    );

    const titleExtra = isEdit ? (
        <div className="grid grid-cols-2 gap-2 mt-2">
            <input
                type="text"
                value={cfg.projectTitle || ''}
                onChange={(e) => patch({ projectTitle: e.target.value })}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-amber-400"
                placeholder="Proje Adı (Örn: Not Hesaplayıcı)"
            />
            <input
                type="text"
                value={cfg.estimatedTime || ''}
                onChange={(e) => patch({ estimatedTime: e.target.value })}
                className="w-full text-xs font-bold text-slate-700 bg-slate-50 border-2 border-slate-200 rounded-lg px-2.5 py-1 outline-none focus:border-amber-400"
                placeholder="Tahmini Süre (Örn: 25 dk)"
            />
        </div>
    ) : cfg.projectTitle ? (
        <p className="text-xs font-bold text-amber-600 mt-0.5 flex items-center gap-1">
            <Sparkles size={12} />
            {cfg.projectTitle}
        </p>
    ) : null;

    const renderRequirements = (checks: CriterionResult[]) => {
        // Sonuç kimliği, boş maddeler atlandıktan sonraki sıraya göre (bkz.
        // useChallengeCheck `req:<i>`); boş maddeleri aynı şekilde sayıyoruz.
        let activeIndex = -1;
        const statusOf = (req: string) => {
            if (!req.trim()) return undefined;
            activeIndex += 1;
            return checks.find((c) => c.id === `req:${activeIndex}`);
        };

        return (
            <div className={isEdit ? `border-2 rounded-2xl p-3.5 ${theme.panel}` : ''}>
                <div className="flex items-center justify-between mb-2">
                    <span className={`flex items-center gap-1.5 ${isEdit ? `text-[11px] font-black uppercase tracking-wider ${theme.panelTitle}` : 'text-xs font-black text-slate-400'}`}>
                        <CheckSquare size={isEdit ? 13 : 14} className={theme.badgeIcon} />
                        {isEdit ? 'Proje Gereksinimleri' : 'Projen şunları yapmalı'}
                    </span>
                    {isEdit && (
                        <button
                            onClick={() => patch({ requirements: [...requirements, ''] })}
                            className={`text-[10px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all ${theme.smallButton}`}
                        >
                            <Plus size={11} /> Gereksinim Ekle
                        </button>
                    )}
                </div>

                {isEdit && isCode && (
                    <p className="text-[10px] text-slate-500 font-medium leading-snug mb-2">
                        Öğrenci "Kontrol Et"e bastığında her gereksinim YZ tarafından değerlendirilir; hepsi
                        karşılanınca proje tamamlanır. Gözlemlenebilir yaz: "En az bir fonksiyon tanımlıyor"
                        gibi — "iyi bir program" gibi değil.
                    </p>
                )}

                <div className="flex flex-col gap-1.5">
                    {requirements.length === 0 ? (
                        <p className="text-[11px] text-amber-700/60 italic">Henüz gereksinim eklenmedi.</p>
                    ) : requirements.map((req, idx) => {
                        if (isEdit) {
                            return (
                                <div key={idx} className="flex items-center gap-2 group">
                                    <span className="text-[11px] font-black text-amber-700 w-4">{idx + 1}.</span>
                                    <input
                                        type="text"
                                        value={req}
                                        onChange={(e) => patch({ requirements: requirements.map((r, j) => (j === idx ? e.target.value : r)) })}
                                        placeholder="Örn: Kullanıcıdan en az iki sayı alıyor"
                                        className="flex-1 min-w-0 text-xs font-semibold text-slate-800 bg-white border border-amber-200 rounded-lg px-2 py-1 outline-none focus:border-amber-400"
                                    />
                                    <button
                                        onClick={() => patch({ requirements: requirements.filter((_, j) => j !== idx) })}
                                        className="text-slate-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            );
                        }
                        if (!req.trim()) return null;
                        const result = statusOf(req);
                        return (
                            <div key={idx} className={`flex items-start gap-2.5 py-2 px-3 rounded-2xl border-2 ${
                                result?.status === 'pass' ? 'bg-emerald-50 border-emerald-200'
                                    : result?.status === 'fail' ? 'bg-rose-50 border-rose-200'
                                    : 'bg-white border-slate-100'}`}>
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                                    result?.status === 'pass' ? 'bg-emerald-500 text-white'
                                        : result?.status === 'fail' ? 'bg-rose-500 text-white'
                                        : result?.status === 'pending' ? 'bg-slate-200 text-slate-500'
                                        : 'bg-amber-100 text-amber-600 text-[11px] font-black'}`}>
                                    {result?.status === 'pass' ? <Check size={14} strokeWidth={3} />
                                        : result?.status === 'fail' ? <X size={14} strokeWidth={3} />
                                        : result?.status === 'pending' ? <Clock size={13} />
                                        : idx + 1}
                                </span>
                                <span className="min-w-0 pt-0.5">
                                    <span className={`text-sm font-bold ${result?.status === 'pass' ? 'text-emerald-800' : 'text-slate-700'}`}>{req}</span>
                                    {result?.detail && result.status !== 'pass' && (
                                        <span className="block text-xs font-bold text-slate-500 mt-0.5">{result.detail}</span>
                                    )}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <TaskSlideShell
            kind="produce"
            slideId={slide.id}
            cfg={cfg}
            patch={patch}
            role={role}
            courseId={courseId}
            submissionNodeId={submissionNodeId}
            onSolved={onSolved}
            headerExtra={cfg.estimatedTime ? headerExtra : undefined}
            titleExtra={titleExtra}
            renderStageSection={renderRequirements}
            stageContext={stageContext}
            requirements={isCode ? active : undefined}
        />
    );
};

export default ProduceSlideBuilder;
