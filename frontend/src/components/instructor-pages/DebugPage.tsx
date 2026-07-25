import React, { useState } from 'react';
import { Bug, Minus, Plus, RotateCcw, Check, Lock, Unlock } from 'lucide-react';

export interface DebugCourse {
    id: string;
    title: string;
    icon?: string;
    /** Roadmap'teki modül (ders) sayısı = curriculum bölüm sayısı */
    total: number;
}

interface DebugPageProps {
    courses: DebugCourse[];
}

const progressKey = (courseId: string) => `progress_${courseId}`;

/**
 * Yalnızca admin için geliştirici sayfası (öğretmen panelinde).
 * "Öğretmen N. dersi işledi" senaryosunu taklit eder: kurs başına tamamlanan ders
 * sayısını (localStorage progress_<id>) elle ayarlar. Öğrenci roadmap'i bu değeri okur:
 * node.id > progress + 1 → kilitli. Yani progress=N → ilk N+1 modül açık.
 *
 * Not: İlerleme öğrencinin tarayıcısındaki localStorage'da tutulur. Bu araç aynı
 * tarayıcıda panel değiştirerek (admin) test için doğru sonucu verir.
 */
const DebugPage: React.FC<DebugPageProps> = ({ courses }) => {
    // Her kurs için taslak progress değerini localStorage'dan başlat
    const [draft, setDraft] = useState<Record<string, number>>(() => {
        const init: Record<string, number> = {};
        courses.forEach((c) => {
            const saved = localStorage.getItem(progressKey(c.id));
            init[c.id] = saved ? parseInt(saved) : 0;
        });
        return init;
    });

    const setValue = (courseId: string, value: number, max: number) => {
        const clamped = Math.max(0, Math.min(max, value));
        setDraft((prev) => ({ ...prev, [courseId]: clamped }));
    };

    const applyAndReload = () => {
        Object.entries(draft).forEach(([courseId, value]) => {
            localStorage.setItem(progressKey(courseId), String(value));
        });
        // Kilit durumu öğrenci roadmap'i oluşturulurken hesaplandığından tam yenileme en güvenlisi
        window.location.reload();
    };

    return (
        <div className="w-full h-full bg-[#F3F4F6] p-4 md:p-8 font-sans text-gray-800 flex flex-col overflow-x-hidden overflow-y-auto">
            <div className="max-w-4xl w-full mx-auto flex flex-col gap-6 pb-24">

                {/* Sayfa Başlığı */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-md border-b-4 border-black shrink-0">
                        <Bug size={26} className="text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 font-display tracking-tight flex items-center gap-2">
                            Debug — İlerleme Kontrolü
                            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-red-100 text-red-500 border border-red-200">
                                ADMIN
                            </span>
                        </h1>
                        <p className="text-sm font-bold text-gray-400">
                            "N. ders işlendi" senaryosunu taklit et; öğrencide sonraki modüllerin kilidi açılsın.
                        </p>
                    </div>
                </div>

                {/* Kurs listesi */}
                <div className="flex flex-col gap-3">
                    {courses.length === 0 ? (
                        <div className="py-16 text-center text-sm font-bold text-gray-400 bg-white border-2 border-dashed border-gray-200 rounded-3xl">
                            Kurs bulunamadı.
                        </div>
                    ) : (
                        courses.map((c) => {
                            const total = c.total;
                            const value = draft[c.id] ?? 0;
                            const unlocked = Math.min(total, value + 1); // açık modül sayısı
                            return (
                                <div
                                    key={c.id}
                                    className="p-5 bg-white border-2 border-gray-100 border-b-4 rounded-3xl flex flex-col gap-4 shadow-sm"
                                >
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-3xl shrink-0">{c.icon || '📚'}</span>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-base text-gray-800 font-display truncate">
                                                    {c.title}
                                                </h3>
                                                <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1.5">
                                                    <Unlock size={11} /> {unlocked} açık
                                                    <span className="text-gray-300">·</span>
                                                    <Lock size={11} /> {Math.max(0, total - unlocked)} kilitli
                                                </span>
                                            </div>
                                        </div>

                                        {/* Stepper */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => setValue(c.id, value - 1, total)}
                                                disabled={value <= 0}
                                                className="w-9 h-9 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-indigo-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                            >
                                                <Minus size={16} />
                                            </button>
                                            <div className="flex flex-col items-center w-16">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={total}
                                                    value={value}
                                                    onChange={(e) => setValue(c.id, parseInt(e.target.value) || 0, total)}
                                                    className="w-full text-center font-black text-xl text-indigo-600 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                                    / {total} ders
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => setValue(c.id, value + 1, total)}
                                                disabled={value >= total}
                                                className="w-9 h-9 rounded-xl bg-gray-50 border-2 border-gray-200 flex items-center justify-center text-gray-600 hover:border-indigo-300 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                                            >
                                                <Plus size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Hızlı butonlar + ilerleme */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setValue(c.id, 0, total)}
                                            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:border-gray-300 transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                            <RotateCcw size={11} /> Sıfırla
                                        </button>
                                        <button
                                            onClick={() => setValue(c.id, total, total)}
                                            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-600 transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                            <Unlock size={11} /> Tümünü Aç
                                        </button>
                                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden ml-1 border border-gray-200">
                                            <div
                                                className="h-full bg-indigo-500 rounded-full transition-all"
                                                style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Uygula çubuğu */}
                {courses.length > 0 && (
                    <div className="flex items-center justify-between gap-3 flex-wrap bg-white border-2 border-gray-100 border-b-4 rounded-3xl p-4 shadow-sm sticky bottom-4">
                        <p className="text-[11px] font-bold text-gray-400">
                            Uygulayınca sayfa yenilenir; öğrenci roadmap kilitleri güncellenir.
                        </p>
                        <button
                            onClick={applyAndReload}
                            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-md border-b-4 border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all cursor-pointer flex items-center gap-2"
                        >
                            <Check size={16} /> Uygula & Yenile
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DebugPage;
