import React, { useEffect } from 'react';
import { PenTool, Code, FileText, Image, File, Check, Star } from 'lucide-react';
import type { Slide, HomeworkConfig } from './types';

interface HomeworkBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
}

const DEFAULT_CONFIG: HomeworkConfig = {
    title: 'Yeni Ödev Görevi',
    instructions: 'Ödev detaylarını, soruları veya yönergeleri buraya yazın...',
    submissionType: 'text',
    points: 100,
    starterCode: '# Kodunuzu buraya yazın\n'
};

const HomeworkBuilder: React.FC<HomeworkBuilderProps> = ({ slide, updateSlide }) => {
    // Current config merged with defaults
    const config: HomeworkConfig = {
        title: slide.homeworkConfig?.title ?? DEFAULT_CONFIG.title,
        instructions: slide.homeworkConfig?.instructions ?? DEFAULT_CONFIG.instructions,
        submissionType: slide.homeworkConfig?.submissionType ?? DEFAULT_CONFIG.submissionType,
        points: slide.homeworkConfig?.points ?? DEFAULT_CONFIG.points,
        starterCode: slide.homeworkConfig?.starterCode ?? DEFAULT_CONFIG.starterCode,
    };

    // Ensure initial slide has homeworkConfig attached
    useEffect(() => {
        if (!slide.homeworkConfig) {
            updateSlide({ homeworkConfig: config });
        }
    }, [slide.id]);

    const updateConfig = (updates: Partial<HomeworkConfig>) => {
        const newConfig = { ...config, ...updates };
        updateSlide({
            homeworkConfig: newConfig
        });
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-y-auto pb-20 relative select-none">
            <div className="max-w-5xl mx-auto w-full p-8">

                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-md">
                            <PenTool size={24} className="animate-bounce" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 font-display">Ödev Editörü</h2>
                            <p className="text-xs text-gray-400 font-bold mt-0.5">Asenkron ödev teslimat sayfası tasarlayın</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Points indicator */}
                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border-2 border-gray-100 shadow-sm">
                            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                            <span className="text-xs font-black text-gray-500 uppercase">Ödül:</span>
                            <input
                                type="number"
                                className="w-16 text-center font-black text-gray-800 bg-gray-50 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                value={config.points}
                                onChange={(e) => updateConfig({ points: parseInt(e.target.value) || 0 })}
                            />
                            <span className="text-xs font-black text-gray-400">XP</span>
                        </div>
                    </div>
                </div>

                {/* Two Column Workspace */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Editor for Instructions (7/12) */}
                    <div className="lg:col-span-7 bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm p-6 space-y-6">
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Ödev Başlığı</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl font-bold text-gray-800 placeholder-gray-400 transition-all text-sm outline-none"
                                value={config.title}
                                placeholder="Ödevin kısa adı"
                                onChange={(e) => updateConfig({ title: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Ödev Yönergesi / İçeriği</label>
                            <textarea
                                className="w-full h-80 px-4 py-3 bg-gray-50 border-2 border-gray-100 hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-xl font-medium text-gray-700 placeholder-gray-400 transition-all text-sm outline-none resize-none"
                                value={config.instructions}
                                placeholder="Ödev detaylarını, soruları veya yönergeleri buraya yazın..."
                                onChange={(e) => updateConfig({ instructions: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Right Column: Submission Type Settings (5/12) */}
                    <div className="lg:col-span-5 flex flex-col gap-6">

                        {/* Submission Type Card */}
                        <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm p-6">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-4">Öğrenci Teslim Türü</label>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {
                                        id: 'text',
                                        label: 'Metin Yanıtı',
                                        desc: 'Serbest metin',
                                        icon: <FileText size={18} />,
                                        isDisabled: false,
                                        activeClass: 'border-blue-500 bg-blue-50/50 text-blue-700 ring-2 ring-blue-500/20 shadow-md',
                                        iconActiveClass: 'bg-blue-100 text-blue-600',
                                        checkClass: 'bg-blue-500'
                                    },
                                    {
                                        id: 'code',
                                        label: 'Kod Editörü',
                                        desc: 'Python editörü',
                                        icon: <Code size={18} />,
                                        isDisabled: false,
                                        activeClass: 'border-indigo-500 bg-indigo-50/50 text-indigo-700 ring-2 ring-indigo-500/20 shadow-md',
                                        iconActiveClass: 'bg-indigo-100 text-indigo-600',
                                        checkClass: 'bg-indigo-500'
                                    },
                                    {
                                        id: 'image',
                                        label: 'Resim Yükle',
                                        desc: 'Pasif (Yakında)',
                                        icon: <Image size={18} />,
                                        isDisabled: true,
                                        activeClass: 'border-rose-500 bg-rose-50/50 text-rose-700',
                                        iconActiveClass: 'bg-rose-100 text-rose-600',
                                        checkClass: 'bg-rose-500'
                                    },
                                    {
                                        id: 'file',
                                        label: 'Dosya Yükle',
                                        desc: 'Pasif (Yakında)',
                                        icon: <File size={18} />,
                                        isDisabled: true,
                                        activeClass: 'border-amber-500 bg-amber-50/50 text-amber-700',
                                        iconActiveClass: 'bg-amber-100 text-amber-600',
                                        checkClass: 'bg-amber-500'
                                    },
                                ].map((type) => {
                                    const isSelected = config.submissionType === type.id;
                                    const isDisabled = type.isDisabled;

                                    return (
                                        <button
                                            key={type.id}
                                            type="button"
                                            disabled={isDisabled}
                                            onClick={() => {
                                                if (!isDisabled) {
                                                    updateConfig({ submissionType: type.id as any });
                                                }
                                            }}
                                            className={`p-4 rounded-2xl border-2 text-left flex flex-col justify-between transition-all group relative cursor-pointer
                                                ${isDisabled ? 'opacity-50 cursor-not-allowed bg-gray-100/60 border-gray-200 shadow-none' : isSelected ? type.activeClass : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50/80 text-gray-600'}
                                            `}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform ${isDisabled ? 'bg-gray-200 text-gray-400' : isSelected ? type.iconActiveClass : 'bg-gray-100 text-gray-500 group-hover:scale-105'}`}>
                                                    {type.icon}
                                                </div>
                                                {isDisabled ? (
                                                    <span className="text-[9px] font-black uppercase tracking-wider bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded-md">
                                                        PASİF
                                                    </span>
                                                ) : isSelected && (
                                                    <div className={`w-5 h-5 rounded-full ${type.checkClass} text-white flex items-center justify-center shadow-sm`}>
                                                        <Check size={12} strokeWidth={3} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mt-4">
                                                <h5 className={`text-xs font-black uppercase tracking-wider ${isDisabled ? 'text-gray-400' : isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                                                    {type.label}
                                                </h5>
                                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{type.desc}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Additional Configs based on Selection */}
                        {config.submissionType === 'code' && (
                            <div className="bg-white rounded-[2rem] border-2 border-gray-100 shadow-sm p-6 animate-in slide-in-from-bottom duration-200">
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-wider mb-2">Başlangıç Kodu Taslağı</label>
                                <textarea
                                    className="w-full h-40 px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl font-mono text-xs text-green-400 placeholder-gray-600 outline-none resize-none"
                                    value={config.starterCode || ''}
                                    placeholder="# Öğrencinin göreceği başlangıç kod taslağı..."
                                    onChange={(e) => updateConfig({ starterCode: e.target.value })}
                                />
                            </div>
                        )}

                        {/* Interactive UI Preview for Student */}
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] p-6 text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
                            <h4 className="font-black text-sm uppercase tracking-wider mb-1 flex items-center gap-1.5 font-display">
                                🎮 Öğrenci Ekranı Önizlemesi
                            </h4>
                            <p className="text-[10px] text-blue-100 font-bold mb-4">Bu ödev, ders bittikten sonra öğrencilerin HomePage'inde çıkacaktır.</p>

                            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 text-xs font-medium space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="font-black text-[10px] uppercase text-blue-200">Ödev Durumu</span>
                                    <span className="bg-yellow-400 text-yellow-950 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">AKTİF</span>
                                </div>
                                <h5 className="font-black text-sm text-white truncate">{config.title || 'Başlıksız Ödev'}</h5>
                                <div className="flex justify-between items-center text-[10px] text-blue-100 font-bold pt-2 border-t border-white/10">
                                    <span>Tür: {(config.submissionType || 'text').toUpperCase()}</span>
                                    <span>+{config.points || 100} XP</span>
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
