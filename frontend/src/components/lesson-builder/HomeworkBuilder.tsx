import React, { useMemo, useState } from 'react';
import {
    PenTool, Code2, FileText, Image as ImageIcon, File as FileIcon,
    Lightbulb, Star, Send, Eye, ClipboardCheck,
} from 'lucide-react';
import type { Slide, HomeworkConfig } from './types';

/**
 * ÖDEV slaydı editörü — UYGULA'daki "Uygulama Görevi" özel slaydıyla AYNI
 * tasarım dilinde (bkz. ChallengeSlideBuilder): kalın alt kenarlı kartlar,
 * tracking-widest bölüm etiketleri, dört seçenekli teslim türü ızgarası.
 *
 * UYGULA'DAN AYRILDIĞI YER — kasıtlı: burada otomatik kontrol (ekran çıktısı /
 * fonksiyon testi) YOKTUR. Ödev asenkron ve ÖĞRETMEN tarafından notlanır;
 * teslimler "Ödev Gönderileri" sayfasında değerlendirilir. Buraya otomatik
 * kontrol koymak iki ayrı değerlendirme yolu doğurur ve hangisinin geçerli
 * olduğu belirsizleşir.
 */

const SUBMISSION_META: Record<
    HomeworkConfig['submissionType'],
    { label: string; desc: string; icon: React.ElementType }
> = {
    text:  { label: 'Metin',           desc: 'Serbest yazılı cevap', icon: FileText  },
    code:  { label: 'Kod',             desc: 'Python editörü',       icon: Code2     },
    image: { label: 'Ekran Görüntüsü', desc: 'PNG, JPG',             icon: ImageIcon },
    file:  { label: 'Dosya',           desc: 'PDF, ZIP, DOCX',       icon: FileIcon  },
};

const defaultHomeworkConfig = (): HomeworkConfig => ({
    title: 'Ödev Görevi',
    instructions: 'Öğrencinin ne yapacağını adım adım yaz.',
    submissionType: 'text',
    points: 100,
    starterCode: '# Kodunu buraya yaz\n',
});

/** Kaçmış `\n` dizilerini gerçek satır sonuna çevirir (eski kayıtlar için). */
const normalizeText = (t: string) =>
    (t || '').replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\t/g, '\t');

interface HomeworkBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
}

const HomeworkBuilder: React.FC<HomeworkBuilderProps> = ({ slide, updateSlide }) => {
    const cfg = useMemo<HomeworkConfig>(
        () => ({ ...defaultHomeworkConfig(), ...(slide.homeworkConfig || {}) }),
        [slide.homeworkConfig],
    );
    const [showHint, setShowHint] = useState(false);

    const patch = (updates: Partial<HomeworkConfig>) =>
        updateSlide({ homeworkConfig: { ...cfg, ...updates } });

    const instructions = normalizeText(cfg.instructions);
    const SubIcon = SUBMISSION_META[cfg.submissionType]?.icon || FileText;

    return (
        <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-6 select-none">
            <div className="mx-auto w-full max-w-5xl space-y-4">

                {/* ── Başlık şeridi ── */}
                <div className="flex items-center justify-between gap-4 rounded-2xl border-2 border-b-[5px] border-blue-200 bg-white px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                            <PenTool size={19} />
                        </div>
                        <div>
                            <h2 className="text-base font-black tracking-tight text-slate-800">Ödev Görevi</h2>
                            <p className="text-[11px] font-bold text-slate-400">
                                Ders dışında yapılır, teslimleri siz değerlendirirsiniz
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Star size={15} className="fill-amber-400 text-amber-400" />
                        <span className="text-[10px] font-black tracking-widest text-slate-500">ÖDÜL</span>
                        <input
                            type="number"
                            value={cfg.points ?? 100}
                            onChange={(e) => patch({ points: Number(e.target.value) || 0 })}
                            className="w-20 rounded-lg border-2 border-amber-200 bg-amber-50 px-2 py-0.5 text-[12px] font-bold outline-none focus:border-amber-400"
                        />
                        <span className="text-[10px] font-black text-slate-400">XP</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">

                    {/* ── Sol: görev metni ── */}
                    <div className="space-y-4 lg:col-span-7">
                        <div className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white p-4">
                            <span className="text-[10px] font-black tracking-widest text-slate-500">ÖDEV BAŞLIĞI</span>
                            <input
                                value={cfg.title}
                                onChange={(e) => patch({ title: e.target.value })}
                                placeholder="Kısa ve net bir ad"
                                className="mt-1.5 w-full rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-800 outline-none transition-colors focus:border-blue-400 focus:bg-white"
                            />
                        </div>

                        <div className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black tracking-widest text-slate-500">YÖNERGE</span>
                                <span className="text-[10px] font-bold text-slate-400">
                                    {instructions.length} karakter
                                </span>
                            </div>
                            <textarea
                                value={instructions}
                                onChange={(e) => patch({ instructions: e.target.value })}
                                rows={12}
                                placeholder={'Öğrenci ne yapacak? Adım adım yaz.\n\n1. ...\n2. ...'}
                                className="mt-1.5 w-full resize-y rounded-xl border-2 border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium leading-relaxed text-slate-700 outline-none transition-colors focus:border-blue-400 focus:bg-white"
                            />
                            <p className="mt-1.5 text-[10.5px] font-medium text-slate-400">
                                Satır sonları öğrenciye aynen görünür.
                            </p>
                        </div>

                        {/* İpucu — UYGULA'daki ile aynı davranış */}
                        <div className="rounded-2xl border-2 border-b-[5px] border-amber-200 bg-amber-50 p-4">
                            <button
                                onClick={() => setShowHint((v) => !v)}
                                className="flex items-center gap-2 text-[10px] font-black tracking-widest text-amber-700"
                            >
                                <Lightbulb size={13} /> İPUCU {showHint ? '−' : '+'}
                            </button>
                            {showHint && (
                                <textarea
                                    value={cfg.hint || ''}
                                    onChange={(e) => patch({ hint: e.target.value })}
                                    rows={2}
                                    placeholder="Öğrenci takılırsa açabileceği tek cümlelik ipucu"
                                    className="mt-2 w-full resize-none rounded-xl border-2 border-amber-200 bg-white p-2 text-[12px] font-medium text-amber-900 outline-none focus:border-amber-400"
                                />
                            )}
                        </div>
                    </div>

                    {/* ── Sağ: teslim ayarları ── */}
                    <div className="space-y-4 lg:col-span-5">
                        <div className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white p-4">
                            <span className="text-[10px] font-black tracking-widest text-slate-500">TESLİM TÜRÜ</span>
                            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                                {(Object.keys(SUBMISSION_META) as HomeworkConfig['submissionType'][]).map((k) => {
                                    const M = SUBMISSION_META[k].icon;
                                    const on = cfg.submissionType === k;
                                    return (
                                        <button
                                            key={k}
                                            onClick={() => patch({ submissionType: k })}
                                            className={`flex flex-col items-start gap-1 rounded-xl border-2 p-3 text-left transition-all ${
                                                on
                                                    ? 'border-b-[4px] border-blue-400 bg-blue-50 text-blue-700'
                                                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            <M size={16} />
                                            <span className="text-[11px] font-black">{SUBMISSION_META[k].label}</span>
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {SUBMISSION_META[k].desc}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {cfg.submissionType === 'code' && (
                            <div className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white p-4">
                                <span className="text-[10px] font-black tracking-widest text-slate-500">BAŞLANGIÇ KODU</span>
                                <textarea
                                    value={cfg.starterCode || ''}
                                    onChange={(e) => patch({ starterCode: e.target.value })}
                                    rows={8}
                                    placeholder="# Öğrencinin editöründe hazır gelecek kod"
                                    spellCheck={false}
                                    className="mt-1.5 w-full resize-y rounded-xl border-2 border-slate-700 bg-slate-900 p-2.5 font-mono text-[12px] leading-relaxed text-emerald-300 outline-none"
                                />
                            </div>
                        )}

                        {/* Değerlendirme yolu — belirsizlik bırakmamak için açıkça yazılı */}
                        <div className="rounded-2xl border-2 border-b-[5px] border-emerald-200 bg-emerald-50 p-4">
                            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-emerald-700">
                                <ClipboardCheck size={13} /> DEĞERLENDİRME
                            </div>
                            <p className="mt-1.5 text-[11.5px] font-medium leading-relaxed text-emerald-800">
                                Bu ödevi <b>siz</b> notlarsınız. Teslimler <b>Ödev Gönderileri</b> sayfasında
                                birikir; oradan not ve geri bildirim yazarsınız, öğrenci ödev ekranında görür.
                            </p>
                        </div>

                        {/* Öğrenci önizlemesi */}
                        <div className="rounded-2xl border-2 border-b-[5px] border-slate-200 bg-white p-4">
                            <div className="flex items-center gap-2 text-[10px] font-black tracking-widest text-slate-500">
                                <Eye size={13} /> ÖĞRENCİ NE GÖRECEK
                            </div>
                            <div className="mt-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-black tracking-wider text-blue-700">
                                        <SubIcon size={10} /> {SUBMISSION_META[cfg.submissionType]?.label}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">
                                        <Star size={9} className="fill-amber-500 text-amber-500" /> +{cfg.points ?? 100} XP
                                    </span>
                                </div>
                                <h5 className="mt-2 truncate text-sm font-black text-slate-800">
                                    {cfg.title || 'Başlıksız Ödev'}
                                </h5>
                                <p className="mt-1 line-clamp-3 whitespace-pre-line text-[11px] font-medium leading-relaxed text-slate-500">
                                    {instructions || 'Yönerge yazılmamış.'}
                                </p>
                                <div className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-1.5 text-[10px] font-black tracking-wider text-white">
                                    <Send size={11} /> ÖDEVİ TESLİM ET
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HomeworkBuilder;
