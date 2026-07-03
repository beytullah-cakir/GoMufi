import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Clock, Check, Puzzle, Eye, ArrowRight, EyeOff, Layout, ListOrdered, FolderClosed, Image, CalendarRange, X } from 'lucide-react';
import type { Slide } from './types';

interface DragDropGameBuilderProps {
    slide: Slide;
    updateSlide: (updates: Partial<Slide>) => void;
    isPreview?: boolean;
    previewRole?: 'student' | 'teacher';
}

interface DragDropQuestion {
    id: string;
    type: 'matching' | 'sorting' | 'categories' | 'image_drop' | 'timeline';
    text: string; // Question Title
    timeLimit?: number;
    pairs?: { id: string; concept: string; definition: string }[];
    steps?: { id: string; text: string }[]; // correct order
    categories?: { id: string; title: string; items: string[] }[];
    imageDrop?: { imageUrl: string; hotspots: { id: string; label: string; x: number; y: number }[] };
    timelineEvents?: { id: string; event: string; year: string }[]; // sorted chronological
}

const DragDropGameBuilder: React.FC<DragDropGameBuilderProps> = ({ slide, updateSlide, isPreview, previewRole = 'student' }) => {
    const [mode, setMode] = useState<'editor' | 'preview'>('editor');
    
    // Sync mode with isPreview
    useEffect(() => {
        if (isPreview) {
            setMode('preview');
        } else {
            setMode('editor');
        }
    }, [isPreview]);

    // Questions inside gameConfig
    const config = slide.gameConfig || {
        timeLimit: 60,
        activityType: 'matching', // default activity type
        questions: [
            {
                id: 'default-q',
                type: 'matching',
                text: 'Kavramları Sürükle ve Eşleştir',
                pairs: [
                    { id: '1', concept: 'Class', definition: 'Bir nesnenin şablonu veya kalıbıdır.' },
                    { id: '2', concept: 'Object', definition: 'Class\'tan üretilen somut örnektir.' },
                    { id: '3', concept: 'Inheritance', definition: 'Alt sınıfların üst sınıftan kalıtım almasıdır.' }
                ]
            }
        ]
    };

    const activeType: 'matching' | 'sorting' | 'categories' | 'image_drop' | 'timeline' = config.activityType || 'matching';

    const updateConfig = (updates: any) => {
        updateSlide({
            gameConfig: { ...config, ...updates }
        });
    };

    // Playable Preview State
    const [previewConcepts, setPreviewConcepts] = useState<{ id: string; concept: string }[]>([]);
    const [previewDefinitions, setPreviewDefinitions] = useState<{ id: string; definition: string }[]>([]);
    const [matches, setMatches] = useState<Record<string, string>>({}); // definitionId -> conceptId
    const [showResults, setShowResults] = useState(false);

    // Sorting game preview state
    const [previewSteps, setPreviewSteps] = useState<{ id: string; text: string; correctIdx: number }[]>([]);
    const [draggedStepIdx, setDraggedStepIdx] = useState<number | null>(null);

    // Categories game preview state
    const [categoryItemsPool, setCategoryItemsPool] = useState<string[]>([]);
    const [categoryMatches, setCategoryMatches] = useState<Record<string, string[]>>({}); // categoryId -> items[]

    // Image Drop preview state
    const [imageLabelsPool, setImageLabelsPool] = useState<string[]>([]);
    const [imageMatches, setImageMatches] = useState<Record<string, string>>({}); // hotspotId -> label

    // Timeline preview state
    const [timelineEventsPool, setTimelineEventsPool] = useState<{ id: string; event: string; year: string }[]>([]);
    const [timelineMatches, setTimelineMatches] = useState<Record<string, string>>({}); // yearSlotId -> eventId

    // Initializer function when entering preview mode
    const startPreviewGame = () => {
        const activeQ = getActiveQuestion();
        const shuffle = (array: any[]) => [...array].sort(() => Math.random() - 0.5);
        setShowResults(false);

        if (activeQ.type === 'matching' && activeQ.pairs) {
            const concepts = activeQ.pairs.map(p => ({ id: p.id, concept: p.concept }));
            const definitions = activeQ.pairs.map(p => ({ id: p.id, definition: p.definition }));
            setPreviewConcepts(shuffle(concepts));
            setPreviewDefinitions(shuffle(definitions));
            setMatches({});
        } else if (activeQ.type === 'sorting' && activeQ.steps) {
            const stepsWithIdx = activeQ.steps.map((s, idx) => ({ ...s, correctIdx: idx }));
            setPreviewSteps(shuffle(stepsWithIdx));
        } else if (activeQ.type === 'categories' && activeQ.categories) {
            const allItems = activeQ.categories.flatMap(c => c.items).filter(Boolean);
            setCategoryItemsPool(shuffle(allItems));
            const initialMatches: Record<string, string[]> = {};
            activeQ.categories.forEach(c => {
                initialMatches[c.id] = [];
            });
            setCategoryMatches(initialMatches);
        } else if (activeQ.type === 'image_drop' && activeQ.imageDrop) {
            const labels = activeQ.imageDrop.hotspots.map(h => h.label).filter(Boolean);
            setImageLabelsPool(shuffle(labels));
            setImageMatches({});
        } else if (activeQ.type === 'timeline' && activeQ.timelineEvents) {
            const events = activeQ.timelineEvents.map(e => ({ id: e.id, event: e.event, year: e.year }));
            setTimelineEventsPool(shuffle(events));
            setTimelineMatches({});
        }
    };

    const fillCorrectAnswers = () => {
        const activeQ = getActiveQuestion();
        if (activeQ.type === 'matching' && activeQ.pairs) {
            const nextMatches: Record<string, string> = {};
            activeQ.pairs.forEach(p => {
                nextMatches[p.id] = p.id;
            });
            setMatches(nextMatches);
        } else if (activeQ.type === 'sorting' && activeQ.steps) {
            const sortedSteps = [...previewSteps].sort((a, b) => a.correctIdx - b.correctIdx);
            setPreviewSteps(sortedSteps);
        } else if (activeQ.type === 'categories' && activeQ.categories) {
            const nextMatches: Record<string, string[]> = {};
            activeQ.categories.forEach(c => {
                nextMatches[c.id] = [...c.items].filter(Boolean);
            });
            setCategoryMatches(nextMatches);
            setCategoryItemsPool([]);
        } else if (activeQ.type === 'image_drop' && activeQ.imageDrop) {
            const nextMatches: Record<string, string> = {};
            activeQ.imageDrop.hotspots.forEach(h => {
                nextMatches[h.id] = h.label;
            });
            setImageMatches(nextMatches);
            setImageLabelsPool([]);
        } else if (activeQ.type === 'timeline' && activeQ.timelineEvents) {
            const nextMatches: Record<string, string> = {};
            activeQ.timelineEvents.forEach(e => {
                nextMatches[e.id] = e.id;
            });
            setTimelineMatches(nextMatches);
            setTimelineEventsPool([]);
        }
    };

    // Trigger initializer on preview mode enter
    useEffect(() => {
        if (mode === 'preview') {
            startPreviewGame();
        }
    }, [mode, slide]);

    // Drag and Drop handlers for matching game
    const handleDragStart = (e: React.DragEvent, conceptId: string) => {
        e.dataTransfer.setData('text/plain', conceptId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, definitionId: string) => {
        e.preventDefault();
        const conceptId = e.dataTransfer.getData('text/plain');
        if (conceptId) {
            setMatches(prev => ({
                ...prev,
                [definitionId]: conceptId
            }));
        }
    };

    const handleTypeChange = (type: 'matching' | 'sorting' | 'categories' | 'image_drop' | 'timeline') => {
        let sampleQuestion: DragDropQuestion = {
            id: Date.now().toString(),
            type: type,
            text: type === 'matching' ? 'Kavramları Sürükle ve Eşleştir' :
                  type === 'sorting' ? 'Adımları Doğru Sıraya Diz' :
                  type === 'categories' ? 'Kelimeleri Doğru Kategoriye Sürükle' :
                  type === 'image_drop' ? 'Görseldeki Sıcak Noktaları Etiketle' :
                  'Olayları Kronolojik Sıraya Göre Yerleştir'
        };

        if (type === 'matching') {
            sampleQuestion.pairs = [
                { id: '1', concept: 'Class', definition: 'Bir nesnenin şablonu.' },
                { id: '2', concept: 'Object', definition: 'Class\'ın somut örneği.' }
            ];
        } else if (type === 'sorting') {
            sampleQuestion.steps = [
                { id: '1', text: 'Kodu Yaz' },
                { id: '2', text: 'Derle' },
                { id: '3', text: 'Programı Çalıştır' }
            ];
        } else if (type === 'categories') {
            sampleQuestion.categories = [
                { id: '1', title: 'Memeliler', items: ['Köpek', 'Kedi'] },
                { id: '2', title: 'Kuşlar', items: ['Kartal', 'Serçe'] }
            ];
        } else if (type === 'image_drop') {
            sampleQuestion.imageDrop = {
                imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
                hotspots: [
                    { id: '1', label: 'Kitap', x: 45, y: 55 },
                    { id: '2', label: 'Kahve', x: 25, y: 70 }
                ]
            };
        } else if (type === 'timeline') {
            sampleQuestion.timelineEvents = [
                { id: '1', event: 'I. Dünya Savaşı', year: '1914' },
                { id: '2', event: 'II. Dünya Savaşı', year: '1939' },
                { id: '3', event: 'Berlin Duvarı Yıkılışı', year: '1989' }
            ];
        }

        updateConfig({
            activityType: type,
            questions: [sampleQuestion]
        });
    };

    const getActiveQuestion = (): DragDropQuestion => {
        return config.questions[0] || { id: 'temp', type: 'matching', text: 'Soru Başlığı' };
    };

    const updateActiveQuestion = (updates: Partial<DragDropQuestion>) => {
        const activeQ = getActiveQuestion();
        updateConfig({
            questions: [{ ...activeQ, ...updates }]
        });
    };

    const renderMatchingEditor = (q: DragDropQuestion) => {
        const pairs = q.pairs || [];
        return (
            <div className="flex flex-col gap-4 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">EŞLEŞTİRME ÇİFTLERİ</span>
                {pairs.map((pair, idx) => (
                    <div key={pair.id} className="flex gap-4 items-center bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm hover:border-slate-200 transition-all">
                        <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Kavram</label>
                            <input
                                type="text"
                                value={pair.concept}
                                onChange={(e) => {
                                    const newPairs = [...pairs];
                                    newPairs[idx].concept = e.target.value;
                                    updateActiveQuestion({ pairs: newPairs });
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                placeholder="Örn: Class"
                            />
                        </div>
                        <div className="flex-[2]">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Açıklama / Tanım</label>
                            <input
                                type="text"
                                value={pair.definition}
                                onChange={(e) => {
                                    const newPairs = [...pairs];
                                    newPairs[idx].definition = e.target.value;
                                    updateActiveQuestion({ pairs: newPairs });
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                placeholder="Örn: Bir nesnenin şablonu"
                            />
                        </div>
                        <button
                            onClick={() => {
                                updateActiveQuestion({ pairs: pairs.filter(p => p.id !== pair.id) });
                            }}
                            className="mt-5 p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => {
                        const newPairs = [...pairs, { id: Date.now().toString(), concept: '', definition: '' }];
                        updateActiveQuestion({ pairs: newPairs });
                    }}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl py-3.5 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest mt-2 bg-white"
                >
                    <Plus className="w-4 h-4" /> Yeni Eşleştirme Çifti Ekle
                </button>
            </div>
        );
    };

    const renderSortingEditor = (q: DragDropQuestion) => {
        const steps = q.steps || [];
        return (
            <div className="flex flex-col gap-4 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">SIRALAMA ADIMLARI (DOĞRU SIRADA YAZIN)</span>
                {steps.map((step, idx) => (
                    <div key={step.id} className="flex gap-4 items-center bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm hover:border-slate-200 transition-all">
                        <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 font-black text-sm flex items-center justify-center select-none shrink-0 border border-indigo-100 shadow-inner">
                            {idx + 1}
                        </span>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={step.text}
                                onChange={(e) => {
                                    const newSteps = [...steps];
                                    newSteps[idx].text = e.target.value;
                                    updateActiveQuestion({ steps: newSteps });
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                placeholder={`Adım ${idx + 1} metni...`}
                            />
                        </div>
                        <button
                            onClick={() => {
                                updateActiveQuestion({ steps: steps.filter(s => s.id !== step.id) });
                            }}
                            className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => {
                        const newSteps = [...steps, { id: Date.now().toString(), text: '' }];
                        updateActiveQuestion({ steps: newSteps });
                    }}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl py-3.5 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest mt-2 bg-white"
                >
                    <Plus className="w-4 h-4" /> Yeni Sıralama Adımı Ekle
                </button>
            </div>
        );
    };

    const renderCategoriesEditor = (q: DragDropQuestion) => {
        const categories = q.categories || [];
        return (
            <div className="flex flex-col gap-6 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">KATEGORİLER & ELEMANLAR</span>
                {categories.map((cat, catIdx) => (
                    <div key={cat.id} className="bg-white border-2 border-slate-200/80 rounded-3xl p-6 relative shadow-sm">
                        <button
                            onClick={() => {
                                updateActiveQuestion({ categories: categories.filter(c => c.id !== cat.id) });
                            }}
                            className="absolute right-4 top-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all z-20"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>

                        <div className="mb-4">
                            <label className="text-[9px] font-black text-slate-400 uppercase">Kategori Başlığı</label>
                            <input
                                type="text"
                                value={cat.title}
                                onChange={(e) => {
                                    const newCats = [...categories];
                                    newCats[catIdx].title = e.target.value;
                                    updateActiveQuestion({ categories: newCats });
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all max-w-sm mt-1"
                                placeholder="Örn: Memeliler"
                            />
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Bu Kategoriye Ait Elemanlar</span>
                            {cat.items.map((item, itemIdx) => (
                                <div key={itemIdx} className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        value={item}
                                        onChange={(e) => {
                                            const newCats = [...categories];
                                            newCats[catIdx].items[itemIdx] = e.target.value;
                                            updateActiveQuestion({ categories: newCats });
                                        }}
                                        className="flex-1 max-w-md bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                        placeholder="Eleman adı (Örn: Köpek)"
                                    />
                                    <button
                                        onClick={() => {
                                            const newCats = [...categories];
                                            newCats[catIdx].items = newCats[catIdx].items.filter((_, idx) => idx !== itemIdx);
                                            updateActiveQuestion({ categories: newCats });
                                        }}
                                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const newCats = [...categories];
                                    newCats[catIdx].items.push('');
                                    updateActiveQuestion({ categories: newCats });
                                }}
                                className="text-left text-[11px] font-black text-indigo-500 hover:text-indigo-600 flex items-center gap-1 mt-1.5 outline-none"
                            >
                                <Plus className="w-3.5 h-3.5" /> Eleman Ekle
                            </button>
                        </div>
                    </div>
                ))}
                <button
                    onClick={() => {
                        const newCats = [...categories, { id: Date.now().toString(), title: '', items: [] }];
                        updateActiveQuestion({ categories: newCats });
                    }}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl py-3.5 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest mt-2 bg-white"
                >
                    <Plus className="w-4 h-4" /> Yeni Kategori Ekle
                </button>
            </div>
        );
    };

    const renderImageDropEditor = (q: DragDropQuestion) => {
        const imgConfig = q.imageDrop || { imageUrl: '', hotspots: [] };
        return (
            <div className="flex flex-col gap-4 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">GÖRSEL & ETİKET SIRALARI</span>
                <div className="bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm">
                    <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Görsel Adresi (URL)</label>
                    <input
                        type="text"
                        value={imgConfig.imageUrl}
                        onChange={(e) => {
                            updateActiveQuestion({
                                imageDrop: { ...imgConfig, imageUrl: e.target.value }
                            });
                        }}
                        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-600 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                        placeholder="https://..."
                    />
                </div>

                <div className="flex flex-col gap-3 mt-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase px-1">Görsel Sıcak Noktaları (Hotspots)</span>
                    {imgConfig.hotspots.map((spot, idx) => (
                        <div key={spot.id} className="flex gap-4 items-center bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm">
                            <div className="flex-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Etiket Adı</label>
                                <input
                                    type="text"
                                    value={spot.label}
                                    onChange={(e) => {
                                        const newSpots = [...imgConfig.hotspots];
                                        newSpots[idx].label = e.target.value;
                                        updateActiveQuestion({ imageDrop: { ...imgConfig, hotspots: newSpots } });
                                    }}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                    placeholder="Örn: Kalp"
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Yatay Poz. (%)</label>
                                <input
                                    type="number"
                                    value={spot.x}
                                    onChange={(e) => {
                                        const newSpots = [...imgConfig.hotspots];
                                        newSpots[idx].x = Number(e.target.value);
                                        updateActiveQuestion({ imageDrop: { ...imgConfig, hotspots: newSpots } });
                                    }}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-center"
                                />
                            </div>
                            <div className="w-24">
                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Dikey Poz. (%)</label>
                                <input
                                    type="number"
                                    value={spot.y}
                                    onChange={(e) => {
                                        const newSpots = [...imgConfig.hotspots];
                                        newSpots[idx].y = Number(e.target.value);
                                        updateActiveQuestion({ imageDrop: { ...imgConfig, hotspots: newSpots } });
                                    }}
                                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-center"
                                />
                            </div>
                            <button
                                onClick={() => {
                                    const newSpots = imgConfig.hotspots.filter(s => s.id !== spot.id);
                                    updateActiveQuestion({ imageDrop: { ...imgConfig, hotspots: newSpots } });
                                }}
                                className="mt-5 p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                    <button
                        onClick={() => {
                            const newSpots = [...imgConfig.hotspots, { id: Date.now().toString(), label: '', x: 50, y: 50 }];
                            updateActiveQuestion({ imageDrop: { ...imgConfig, hotspots: newSpots } });
                        }}
                        className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl py-3.5 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest mt-2 bg-white"
                    >
                        <Plus className="w-4 h-4" /> Yeni Etiket Ekle
                    </button>
                </div>
            </div>
        );
    };

    const renderTimelineEditor = (q: DragDropQuestion) => {
        const events = q.timelineEvents || [];
        return (
            <div className="flex flex-col gap-4 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">KRONOLOJİK OLAYLAR (DOĞRU SIRADA YAZIN)</span>
                {events.map((ev, idx) => (
                    <div key={ev.id} className="flex gap-4 items-center bg-white border-2 border-slate-100 p-5 rounded-2xl shadow-sm">
                        <div className="w-24">
                            <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Yıl / Zaman</label>
                            <input
                                type="text"
                                value={ev.year}
                                onChange={(e) => {
                                    const newEvents = [...events];
                                    newEvents[idx].year = e.target.value;
                                    updateActiveQuestion({ timelineEvents: newEvents });
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all text-center"
                                placeholder="Örn: 1914"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Olay Açıklaması</label>
                            <input
                                type="text"
                                value={ev.event}
                                onChange={(e) => {
                                    const newEvents = [...events];
                                    newEvents[idx].event = e.target.value;
                                    updateActiveQuestion({ timelineEvents: newEvents });
                                }}
                                className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                                placeholder="Örn: I. Dünya Savaşı'nın Başlaması"
                            />
                        </div>
                        <button
                            onClick={() => {
                                updateActiveQuestion({ timelineEvents: events.filter(e => e.id !== ev.id) });
                            }}
                            className="mt-5 p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                <button
                    onClick={() => {
                        const newEvents = [...events, { id: Date.now().toString(), event: '', year: '' }];
                        updateActiveQuestion({ timelineEvents: newEvents });
                    }}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 hover:border-indigo-500 rounded-2xl py-3.5 text-xs font-black text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest mt-2 bg-white"
                >
                    <Plus className="w-4 h-4" /> Yeni Tarih/Olay Ekle
                </button>
            </div>
        );
    };

    const activeQuestion = getActiveQuestion();

    const CONCEPT_COLORS = [
        { bg: 'bg-red-500', border: 'border-red-700', text: 'text-white' },
        { bg: 'bg-blue-500', border: 'border-blue-700', text: 'text-white' },
        { bg: 'bg-amber-500', border: 'border-amber-700', text: 'text-white' },
        { bg: 'bg-green-500', border: 'border-green-700', text: 'text-white' },
        { bg: 'bg-purple-500', border: 'border-purple-700', text: 'text-white' },
        { bg: 'bg-pink-500', border: 'border-pink-700', text: 'text-white' },
        { bg: 'bg-cyan-500', border: 'border-cyan-700', text: 'text-white' }
    ];

    const getConceptColor = (conceptId: string) => {
        const pairs = activeQuestion.pairs || [];
        const idx = pairs.findIndex(p => p.id === conceptId);
        return CONCEPT_COLORS[idx !== -1 ? idx % CONCEPT_COLORS.length : 0];
    };

    // Index-based general colors helper
    const getIndexedColor = (idx: number) => {
        return CONCEPT_COLORS[idx % CONCEPT_COLORS.length];
    };

    return (
        <div className="flex flex-col min-h-full h-auto bg-[#f8fafc] overflow-visible select-none pt-10">
            {mode === 'editor' ? (
                <div className="max-w-5xl mx-auto w-full p-8 pb-80 flex gap-8">
                    {/* LEFT BAR - ACTIVITY TYPE SELECTOR (Styled like the sidebar navbar outline layout) */}
                    <div className="w-64 flex flex-col gap-2.5 shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-3 mb-1">ETKİNLİK TÜRÜ</span>
                        {[
                            { id: 'matching', label: 'Eşleştirme', icon: Layout },
                            { id: 'sorting', label: 'Sıralama', icon: ListOrdered },
                            { id: 'categories', label: 'Kategorilere Ayır', icon: FolderClosed },
                            { id: 'image_drop', label: 'Görsel Üzerine Bırak', icon: Image },
                            { id: 'timeline', label: 'Timeline', icon: CalendarRange }
                        ].map((t) => {
                            const isActive = activeType === t.id;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => handleTypeChange(t.id as any)}
                                    className={`w-full text-left px-5 py-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all duration-200 ${
                                        isActive
                                            ? 'border-indigo-400 bg-indigo-50/40 text-indigo-600 font-black shadow-sm'
                                            : 'border-transparent text-slate-400 hover:bg-slate-100/50 hover:text-slate-600 font-extrabold'
                                    } text-xs uppercase tracking-wider`}
                                >
                                    <t.icon className={`w-4 h-4 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`} />
                                    <span>{t.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* RIGHT AREA - MAIN EDITOR FORM */}
                    <div className="flex-1 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-8">
                        {/* TOP SETTINGS ROW: Süre (moved here to prevent top tab overlap) */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Puzzle className="w-5 h-5 text-indigo-500 animate-pulse" />
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest font-display">Soru Ayarları</span>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto sm:justify-end">
                                {/* Süre Ayarı */}
                                <div className="flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-2xl px-3 py-2 shadow-sm shrink-0">
                                    <Clock className="w-4 h-4 text-indigo-500" />
                                    <span className="text-[10px] font-black text-slate-550 uppercase font-display">Süre:</span>
                                    <input
                                        type="number"
                                        value={config.timeLimit}
                                        onChange={(e) => updateConfig({ timeLimit: Number(e.target.value) || 60 })}
                                        className="w-12 bg-white border-2 border-slate-200 rounded-xl py-1 text-center text-xs font-black text-slate-700 outline-none focus:border-indigo-500"
                                    />
                                    <span className="text-[10px] font-black text-slate-450 uppercase font-display">sn</span>
                                </div>
                            </div>
                        </div>
                        {/* Question Title - Big beautiful card matching BÖLÜM 1 design */}
                        <div className="bg-white border-2 border-slate-200 border-b-4 rounded-3xl p-8 shadow-sm text-center w-full mb-8 relative">
                            <span className="text-slate-400 font-black text-xs uppercase tracking-widest block mb-2">SORU METNİ / YÖNERGE</span>
                            <input
                                type="text"
                                value={activeQuestion.text}
                                onChange={(e) => updateActiveQuestion({ text: e.target.value })}
                                className="text-3xl font-black text-slate-700 font-display text-center w-full bg-transparent focus:outline-none focus:bg-slate-50 rounded-xl px-4 py-2 placeholder-slate-300"
                                placeholder="Yönergeyi veya soruyu buraya yazın..."
                            />
                        </div>

                        {activeType === 'matching' && renderMatchingEditor(activeQuestion)}
                        {activeType === 'sorting' && renderSortingEditor(activeQuestion)}
                        {activeType === 'categories' && renderCategoriesEditor(activeQuestion)}
                        {activeType === 'image_drop' && renderImageDropEditor(activeQuestion)}
                        {activeType === 'timeline' && renderTimelineEditor(activeQuestion)}
                    </div>
                </div>
            ) : (
                <div className="max-w-4xl mx-auto w-full p-8 pb-12 flex flex-col items-center justify-start min-h-[450px]">
                    {/* Teacher Mode answer key indicator banner */}
                    {previewRole === 'teacher' && (
                        <div className="bg-amber-100 border-2 border-amber-300 text-amber-800 rounded-2xl px-6 py-2.5 text-xs font-black uppercase tracking-widest mb-6 animate-pulse w-max mx-auto shadow-sm">
                            👨‍🏫 ÖĞRETMEN ÖNİZLEMESİ: CEVAP ANAHTARI AKTİF
                        </div>
                    )}
                    <div className="bg-white rounded-3xl border-2 border-b-8 border-slate-200 shadow-xl w-full p-8 text-center relative overflow-visible">
                        
                        {/* Progress Bar Header Area Matching original matching game layout */}
                        <div className="w-full flex justify-between items-center mb-8 px-4 relative z-10">
                            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center cursor-default opacity-50">
                                <Puzzle className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="flex-1 mx-8 h-3.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                <div className="h-full bg-indigo-500 w-full animate-pulse opacity-30"></div>
                            </div>
                            <div className="text-base font-black text-slate-400 font-display w-12 text-right">
                                1/1
                            </div>
                        </div>

                        {/* Large Question Block */}
                        <div className="bg-white border-2 border-slate-200 border-b-4 rounded-3xl p-8 shadow-sm text-center w-full mb-8">
                            <span className="text-slate-400 font-black text-xs uppercase tracking-widest block mb-2">AKTİVİTE</span>
                            <span className="text-3xl font-black text-slate-700 font-display leading-tight">{activeQuestion.text}</span>
                        </div>

                        {activeType === 'matching' && (
                            <div className="flex flex-col md:flex-row gap-8 justify-center items-start w-full mt-4">
                                {/* Left Side: Game Board */}
                                <div className="flex-1 max-w-xl">
                                    {/* Available Concepts to Drag */}
                                    <div className="flex flex-wrap gap-3 justify-center mb-10 bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-2xl min-h-[70px]">
                                        {previewConcepts
                                            .filter(c => !Object.values(matches).includes(c.id))
                                            .map(c => {
                                                const color = getConceptColor(c.id);
                                                return (
                                                    <div
                                                        key={c.id}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, c.id)}
                                                        className={`border-2 border-b-4 ${color.bg} ${color.border} hover:scale-105 rounded-xl px-4 py-2.5 text-xs font-black ${color.text} shadow-md cursor-grab active:cursor-grabbing select-none transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 font-display`}
                                                    >
                                                        <span className="opacity-70">⠿</span> {c.concept}
                                                    </div>
                                                );
                                            })}
                                        {previewConcepts.filter(c => !Object.values(matches).includes(c.id)).length === 0 && (
                                            <span className="text-xs text-slate-400 font-bold self-center animate-pulse">Tüm kavramlar yerleştirildi!</span>
                                        )}
                                    </div>

                                    {/* Definitions list with drop zones */}
                                    <div className="flex flex-col gap-4 text-left">
                                        {previewDefinitions.map((def) => {
                                            const matchedConceptId = matches[def.id];
                                            const matchedConcept = previewConcepts.find(c => c.id === matchedConceptId);
                                            const isCorrectMatch = matchedConceptId === def.id;

                                            let cardBorderClass = 'border-slate-200 hover:border-slate-300';
                                            let cardBgClass = 'bg-white';
                                            
                                            if (showResults) {
                                                if (isCorrectMatch) {
                                                    cardBorderClass = 'border-green-500 border-b-8';
                                                    cardBgClass = 'bg-green-50/20';
                                                } else {
                                                    cardBorderClass = 'border-red-500 border-b-8';
                                                    cardBgClass = 'bg-red-50/20';
                                                }
                                            }

                                            return (
                                                <div
                                                    key={def.id}
                                                    onDragOver={handleDragOver}
                                                    onDrop={(e) => handleDrop(e, def.id)}
                                                    className={`flex items-center gap-5 border-2 border-b-4 ${cardBorderClass} ${cardBgClass} rounded-2xl p-5 transition-all`}
                                                >
                                                    {/* Drop Zone */}
                                                    <div
                                                        className={`w-40 min-h-[44px] rounded-xl flex items-center justify-center p-0.5 text-xs font-black transition-all ${
                                                            matchedConcept
                                                                ? ''
                                                                : 'border-2 border-dashed border-slate-200 text-slate-400 bg-slate-50 hover:bg-slate-100/50'
                                                        }`}
                                                        onClick={() => {
                                                            if (matchedConcept) {
                                                                setMatches(prev => {
                                                                    const next = { ...prev };
                                                                    delete next[def.id];
                                                                    return next;
                                                                });
                                                            }
                                                        }}
                                                        title={matchedConcept ? "Eşleştirmeyi Kaldır" : "Kavramı buraya sürükleyin"}
                                                    >
                                                        {matchedConcept ? (() => {
                                                            const color = getConceptColor(matchedConcept.id);
                                                            return (
                                                                <div className={`w-full h-full flex items-center justify-center py-2 px-3 rounded-lg ${color.bg} border-b-4 ${color.border} ${color.text} shadow-sm hover:scale-[1.02] active:translate-y-0.5 transition-all font-display`}>
                                                                    {matchedConcept.concept}
                                                                </div>
                                                            );
                                                        })() : (
                                                            <span className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold">Bırakın</span>
                                                        )}
                                                    </div>

                                                    <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />

                                                    {/* Definition */}
                                                    <div className="flex-1 text-sm font-bold text-slate-700 leading-snug">
                                                        {def.definition}
                                                    </div>

                                                    {/* Feedback Icon */}
                                                    {showResults && (
                                                        <div className="shrink-0 animate-in zoom-in-75">
                                                            {isCorrectMatch ? (
                                                                <span className="bg-green-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-black border-b-2 border-green-700">✓</span>
                                                            ) : (
                                                                <span className="bg-red-500 text-white w-7 h-7 rounded-full flex items-center justify-center text-sm font-black border-b-2 border-red-700">✗</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Action Control Panel */}
                                <div className="w-48 shrink-0 flex flex-col gap-4 bg-slate-50/80 border-2 border-b-6 border-slate-200 p-5 rounded-2xl sticky top-8 shadow-sm">
                                    {previewRole === 'teacher' && (
                                        <button
                                            onClick={fillCorrectAnswers}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-md"
                                        >
                                            Cevapları Doldur
                                        </button>
                                    )}
                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center block mb-1">KONTROLLER</span>
                                    <button
                                        onClick={() => setShowResults(true)}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-0.5 transition-all shadow-md uppercase tracking-wider text-center"
                                    >
                                        Kontrol Et
                                    </button>
                                    <button
                                        onClick={() => {
                                            setMatches({});
                                            setShowResults(false);
                                        }}
                                        className="w-full bg-slate-200/80 hover:bg-slate-350/50 text-slate-700 font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-slate-350 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center"
                                        style={{ borderColor: '#cbd5e1' }}
                                    >
                                        Temizle
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeType === 'sorting' && (
                            <div className="flex flex-col md:flex-row gap-8 justify-center items-start w-full mt-4">
                                {/* Left Side: Game Board (Step Cards List) */}
                                <div className="flex-1 max-w-xl text-left">
                                    <div className="flex flex-col gap-4">
                                        {previewSteps.map((step, idx) => {
                                            const color = getIndexedColor(idx);
                                            let cardBorderClass = `border-${color.border.split('-')[1]}-700`;
                                            let cardBgClass = color.bg;
                                            let cardTextClass = color.text;

                                            if (showResults) {
                                                const isCorrect = idx === step.correctIdx;
                                                if (isCorrect) {
                                                    cardBorderClass = 'border-green-700';
                                                    cardBgClass = 'bg-green-500';
                                                    cardTextClass = 'text-white';
                                                } else {
                                                    cardBorderClass = 'border-red-700';
                                                    cardBgClass = 'bg-red-500';
                                                    cardTextClass = 'text-white';
                                                }
                                            }

                                            return (
                                                <div
                                                    key={step.id}
                                                    draggable
                                                    onDragStart={() => setDraggedStepIdx(idx)}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={() => {
                                                        if (draggedStepIdx !== null && draggedStepIdx !== idx) {
                                                            const newSteps = [...previewSteps];
                                                            const [moved] = newSteps.splice(draggedStepIdx, 1);
                                                            newSteps.splice(idx, 0, moved);
                                                            setPreviewSteps(newSteps);
                                                            setDraggedStepIdx(null);
                                                        }
                                                    }}
                                                    className={`border-2 border-b-6 ${cardBorderClass} ${cardBgClass} ${cardTextClass} rounded-2xl p-5 flex items-center justify-between cursor-grab active:cursor-grabbing shadow-md transition-all select-none`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <span className="w-8 h-8 rounded-xl bg-white/20 text-white font-black text-sm flex items-center justify-center shadow-inner">
                                                            {idx + 1}
                                                        </span>
                                                        <span className="text-sm font-black tracking-tight">{step.text}</span>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        {showResults && (
                                                            idx === step.correctIdx ? (
                                                                <span className="bg-white text-green-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">✓</span>
                                                            ) : (
                                                                <span className="bg-white text-red-600 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black">✗</span>
                                                            )
                                                        )}
                                                        <span className="text-[10px] font-black opacity-60 uppercase">⠿</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="w-48 shrink-0 flex flex-col gap-4 bg-slate-50/80 border-2 border-b-6 border-slate-200 p-5 rounded-2xl sticky top-8 shadow-sm">
                                    {previewRole === 'teacher' && (
                                        <button
                                            onClick={fillCorrectAnswers}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-md"
                                        >
                                            Cevapları Doldur
                                        </button>
                                    )}
                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center block mb-1">KONTROLLER</span>
                                    <button
                                        onClick={() => setShowResults(true)}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-0.5 transition-all shadow-md uppercase tracking-wider text-center"
                                    >
                                        Kontrol Et
                                    </button>
                                    <button
                                        onClick={() => {
                                            startPreviewGame();
                                        }}
                                        className="w-full bg-slate-200/80 hover:bg-slate-350/50 text-slate-700 font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-slate-350 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center"
                                        style={{ borderColor: '#cbd5e1' }}
                                    >
                                        Karıştır
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeType === 'categories' && (
                            <div className="flex flex-col md:flex-row gap-8 justify-center items-start w-full mt-4">
                                {/* Left Side: Game Board */}
                                <div className="flex-1 max-w-xl text-left">
                                    {/* Shuffled Item Pool */}
                                    <div className="flex flex-wrap gap-3 justify-center mb-8 bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-2xl min-h-[80px]">
                                        {categoryItemsPool.map((item, idx) => {
                                            const color = getIndexedColor(idx);
                                            return (
                                                <div
                                                    key={item}
                                                    draggable
                                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', item)}
                                                    className={`border-2 border-b-4 ${color.bg} ${color.border} hover:scale-105 rounded-xl px-4 py-2.5 text-xs font-black ${color.text} shadow-md cursor-grab active:cursor-grabbing select-none transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 font-display`}
                                                >
                                                    <span className="opacity-75">⠿</span> {item}
                                                </div>
                                            );
                                        })}
                                        {categoryItemsPool.length === 0 && (
                                            <span className="text-xs text-slate-400 font-bold self-center animate-pulse">Tüm kartlar kategorilere yerleştirildi!</span>
                                        )}
                                    </div>

                                    {/* Category Target Box Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        {(activeQuestion.categories || []).map((cat, idx) => {
                                            const matchedItems = categoryMatches[cat.id] || [];
                                            const color = getIndexedColor(idx + 3);

                                            return (
                                                <div
                                                    key={cat.id}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        const item = e.dataTransfer.getData('text/plain');
                                                        if (item && !matchedItems.includes(item)) {
                                                            setCategoryItemsPool(prev => prev.filter(x => x !== item));
                                                            setCategoryMatches(prev => ({
                                                                ...prev,
                                                                [cat.id]: [...(prev[cat.id] || []), item]
                                                            }));
                                                        }
                                                    }}
                                                    className="border-2 border-slate-200/80 bg-white rounded-3xl p-5 min-h-[180px] flex flex-col justify-start shadow-sm hover:border-indigo-300 transition-all"
                                                >
                                                    {/* Category Header */}
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4 border-b border-slate-100 pb-2">{cat.title || 'Kategori'}</span>
                                                    
                                                    {/* Matched Items Inside Category */}
                                                    <div className="flex flex-wrap gap-2.5">
                                                        {matchedItems.map(item => {
                                                            const originalCat = (activeQuestion.categories || []).find(c => c.id === cat.id);
                                                            const isCorrect = originalCat?.items.includes(item);

                                                            let borderStyle = `border-2 border-b-4 ${color.border} ${color.bg} ${color.text}`;
                                                            if (showResults) {
                                                                if (isCorrect) {
                                                                    borderStyle = 'border-2 border-b-4 border-green-700 bg-green-500 text-white';
                                                                } else {
                                                                    borderStyle = 'border-2 border-b-4 border-red-700 bg-red-500 text-white';
                                                                }
                                                            }

                                                            return (
                                                                <div
                                                                    key={item}
                                                                    onClick={() => {
                                                                        // Remove from category, return to pool
                                                                        setCategoryMatches(prev => ({
                                                                            ...prev,
                                                                            [cat.id]: prev[cat.id].filter(x => x !== item)
                                                                        }));
                                                                        setCategoryItemsPool(prev => [...prev, item]);
                                                                    }}
                                                                    className={`${borderStyle} hover:scale-102 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 rounded-xl px-3 py-2 text-xs font-black shadow-sm cursor-pointer transition-all flex items-center gap-1.5`}
                                                                    title="Geri çıkar"
                                                                >
                                                                    {item}
                                                                    {showResults && (
                                                                        isCorrect ? (
                                                                            <span className="bg-white text-green-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
                                                                        ) : (
                                                                            <span className="bg-white text-red-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold">✗</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                        {matchedItems.length === 0 && (
                                                            <div className="flex-1 py-8 text-center text-[10px] font-bold text-slate-300 uppercase tracking-wide border-2 border-dashed border-slate-100 rounded-2xl flex items-center justify-center">
                                                                Kartı Buraya Bırakın
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="w-48 shrink-0 flex flex-col gap-4 bg-slate-50/80 border-2 border-b-6 border-slate-200 p-5 rounded-2xl sticky top-8 shadow-sm">
                                    {previewRole === 'teacher' && (
                                        <button
                                            onClick={fillCorrectAnswers}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-md"
                                        >
                                            Cevapları Doldur
                                        </button>
                                    )}
                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center block mb-1">KONTROLLER</span>
                                    <button
                                        onClick={() => setShowResults(true)}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-0.5 transition-all shadow-md uppercase tracking-wider text-center"
                                    >
                                        Kontrol Et
                                    </button>
                                    <button
                                        onClick={() => {
                                            startPreviewGame();
                                        }}
                                        className="w-full bg-slate-200/80 hover:bg-slate-350/50 text-slate-700 font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-slate-350 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center"
                                        style={{ borderColor: '#cbd5e1' }}
                                    >
                                        Temizle
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeType === 'image_drop' && (
                            <div className="flex flex-col md:flex-row gap-8 justify-center items-start w-full mt-4">
                                {/* Left Side: Game Board */}
                                <div className="flex-1 max-w-xl flex flex-col gap-6 text-center">
                                    <div className="relative border-4 border-slate-100 rounded-3xl overflow-hidden shadow-inner aspect-video bg-slate-50">
                                        {activeQuestion.imageDrop?.imageUrl && (
                                            <img src={activeQuestion.imageDrop.imageUrl} className="w-full h-full object-cover select-none" />
                                        )}
                                        
                                        {/* Drop Zone Hotspots */}
                                        {(activeQuestion.imageDrop?.hotspots || []).map((spot, idx) => {
                                            const matchedLabel = imageMatches[spot.id];
                                            const isCorrect = matchedLabel === spot.label;
                                            const color = getIndexedColor(idx + 1);

                                            let hotspotStyle = "w-8 h-8 rounded-full border-2 border-dashed border-indigo-500 bg-white/90 shadow-lg flex items-center justify-center text-xs font-black text-indigo-600 cursor-pointer animate-pulse hover:scale-110";
                                            
                                            if (matchedLabel) {
                                                hotspotStyle = `px-3.5 py-2 rounded-2xl border-2 border-b-4 ${color.border} ${color.bg} ${color.text} shadow-md flex items-center gap-2 cursor-pointer font-display text-xs font-black hover:scale-102`;
                                                if (showResults) {
                                                    if (isCorrect) {
                                                        hotspotStyle = 'px-3.5 py-2 rounded-2xl border-2 border-b-4 border-green-700 bg-green-500 text-white shadow-md flex items-center gap-2 cursor-pointer text-xs font-black';
                                                    } else {
                                                        hotspotStyle = 'px-3.5 py-2 rounded-2xl border-2 border-b-4 border-red-700 bg-red-500 text-white shadow-md flex items-center gap-2 cursor-pointer text-xs font-black';
                                                    }
                                                }
                                            }

                                            return (
                                                <div
                                                    key={spot.id}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        const label = e.dataTransfer.getData('text/plain');
                                                        if (label) {
                                                            setImageLabelsPool(prev => prev.filter(x => x !== label));
                                                            setImageMatches(prev => ({
                                                                ...prev,
                                                                [spot.id]: label
                                                            }));
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        if (matchedLabel) {
                                                            // Return label to pool
                                                            setImageMatches(prev => {
                                                                const next = { ...prev };
                                                                delete next[spot.id];
                                                                return next;
                                                            });
                                                            setImageLabelsPool(prev => [...prev, matchedLabel]);
                                                        }
                                                    }}
                                                    className="absolute -translate-x-1/2 -translate-y-1/2 transition-all"
                                                    style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                                                >
                                                    {matchedLabel ? (
                                                        <div className="flex items-center gap-1.5">
                                                            {matchedLabel}
                                                            {showResults && (
                                                                isCorrect ? (
                                                                    <span className="bg-white text-green-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold">✓</span>
                                                                ) : (
                                                                    <span className="bg-white text-red-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold">✗</span>
                                                                )
                                                            )}
                                                        </div>
                                                    ) : (
                                                        "?"
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Shuffled Label Pool */}
                                    <div className="flex gap-3 justify-center bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-2xl min-h-[70px] items-center">
                                        {imageLabelsPool.map((label, idx) => {
                                            const color = getIndexedColor(idx + 1);
                                            return (
                                                <div
                                                    key={label}
                                                    draggable
                                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', label)}
                                                    className={`border-2 border-b-4 ${color.bg} ${color.border} hover:scale-105 rounded-xl px-4 py-2.5 text-xs font-black ${color.text} shadow-md cursor-grab active:cursor-grabbing select-none transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 font-display`}
                                                >
                                                    <span className="opacity-75">⠿</span> {label}
                                                </div>
                                            );
                                        })}
                                        {imageLabelsPool.length === 0 && (
                                            <span className="text-xs text-slate-400 font-bold self-center animate-pulse">Tüm etiketler yerleştirildi!</span>
                                        )}
                                    </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="w-48 shrink-0 flex flex-col gap-4 bg-slate-50/80 border-2 border-b-6 border-slate-200 p-5 rounded-2xl sticky top-8 shadow-sm">
                                    {previewRole === 'teacher' && (
                                        <button
                                            onClick={fillCorrectAnswers}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-md"
                                        >
                                            Cevapları Doldur
                                        </button>
                                    )}
                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center block mb-1">KONTROLLER</span>
                                    <button
                                        onClick={() => setShowResults(true)}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-0.5 transition-all shadow-md uppercase tracking-wider text-center"
                                    >
                                        Kontrol Et
                                    </button>
                                    <button
                                        onClick={() => {
                                            startPreviewGame();
                                        }}
                                        className="w-full bg-slate-200/80 hover:bg-slate-350/50 text-slate-700 font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-slate-350 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center"
                                        style={{ borderColor: '#cbd5e1' }}
                                    >
                                        Temizle
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeType === 'timeline' && (
                            <div className="flex flex-col md:flex-row gap-8 justify-center items-start w-full mt-4">
                                {/* Left Side: Game Board */}
                                <div className="flex-1 max-w-xl flex flex-col gap-10 py-6 text-center">
                                    {/* Shuffled Event Pool */}
                                    <div className="flex gap-3 justify-center bg-slate-50 border-2 border-dashed border-slate-200 p-6 rounded-2xl min-h-[80px] items-center">
                                        {timelineEventsPool.map((ev, idx) => {
                                            const color = getIndexedColor(idx + 2);
                                            return (
                                                <div
                                                    key={ev.id}
                                                    draggable
                                                    onDragStart={(e) => e.dataTransfer.setData('text/plain', ev.id)}
                                                    className={`border-2 border-b-4 ${color.bg} ${color.border} hover:scale-105 rounded-xl px-4 py-2.5 text-xs font-black ${color.text} shadow-md cursor-grab active:cursor-grabbing select-none transition-all flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0 active:border-b-2 font-display`}
                                                >
                                                    <span className="opacity-75">⠿</span> {ev.event}
                                                </div>
                                            );
                                        })}
                                        {timelineEventsPool.length === 0 && (
                                            <span className="text-xs text-slate-400 font-bold self-center animate-pulse">Tüm olaylar çizelgeye dizildi!</span>
                                        )}
                                    </div>

                                    {/* Chronological Timeline Axis */}
                                    <div className="relative w-full h-1 bg-slate-300 rounded-full flex justify-between px-10 mt-16 pb-12">
                                        {(activeQuestion.timelineEvents || []).map((slot, idx) => {
                                            const matchedEventId = timelineMatches[slot.id];
                                            const matchedEvent = (activeQuestion.timelineEvents || []).find(e => e.id === matchedEventId);
                                            const isCorrect = matchedEventId === slot.id;
                                            const color = getIndexedColor(idx + 4);

                                            return (
                                                <div
                                                    key={slot.id}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => {
                                                        const eventId = e.dataTransfer.getData('text/plain');
                                                        if (eventId && !Object.values(timelineMatches).includes(eventId)) {
                                                            const originalEv = timelineEventsPool.find(x => x.id === eventId);
                                                            if (originalEv) {
                                                                setTimelineEventsPool(prev => prev.filter(x => x.id !== eventId));
                                                                setTimelineMatches(prev => ({
                                                                    ...prev,
                                                                    [slot.id]: eventId
                                                                }));
                                                            }
                                                        }
                                                    }}
                                                    onClick={() => {
                                                        if (matchedEventId) {
                                                            // Return event to pool
                                                            setTimelineMatches(prev => {
                                                                const next = { ...prev };
                                                                delete next[slot.id];
                                                                return next;
                                                            });
                                                            const originalEv = (activeQuestion.timelineEvents || []).find(e => e.id === matchedEventId);
                                                            if (originalEv) {
                                                                setTimelineEventsPool(prev => [...prev, originalEv]);
                                                            }
                                                        }
                                                    }}
                                                    className="relative flex flex-col items-center"
                                                >
                                                    {/* Drop Zone Box */}
                                                    <div className="absolute -top-24 w-32 min-h-[50px] flex items-center justify-center p-0.5 transition-all">
                                                        {matchedEvent ? (() => {
                                                            let borderStyle = `border-2 border-b-4 ${color.border} ${color.bg} ${color.text}`;
                                                            if (showResults) {
                                                                if (isCorrect) {
                                                                    borderStyle = 'border-2 border-b-4 border-green-700 bg-green-500 text-white';
                                                                } else {
                                                                    borderStyle = 'border-2 border-b-4 border-red-700 bg-red-500 text-white';
                                                                }
                                                            }

                                                            return (
                                                                <div className={`w-full py-2 px-2.5 rounded-xl text-center text-xs font-black shadow-md cursor-pointer transition-all flex items-center justify-center gap-1.5 ${borderStyle} font-display leading-tight hover:scale-[1.02]`}>
                                                                    <span>{matchedEvent.event}</span>
                                                                    {showResults && (
                                                                        isCorrect ? (
                                                                            <span className="bg-white text-green-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">✓</span>
                                                                        ) : (
                                                                            <span className="bg-white text-red-600 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0">✗</span>
                                                                        )
                                                                    )}
                                                                </div>
                                                            );
                                                        })() : (
                                                            <div className="w-full border-2 border-dashed border-slate-200 text-slate-350 bg-slate-50 hover:bg-slate-100/50 rounded-xl py-3 flex items-center justify-center text-[9px] uppercase tracking-wider font-extrabold select-none">
                                                                Bırakın
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Node Point */}
                                                    <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border-2 border-white -mt-1.5 shadow-sm" />
                                                    
                                                    {/* Year Label */}
                                                    <span className="text-xs font-black text-slate-500 mt-2 font-display bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">{slot.year}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Right Side: Actions */}
                                <div className="w-48 shrink-0 flex flex-col gap-4 bg-slate-50/80 border-2 border-b-6 border-slate-200 p-5 rounded-2xl sticky top-8 shadow-sm">
                                    {previewRole === 'teacher' && (
                                        <button
                                            onClick={fillCorrectAnswers}
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-amber-700 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center flex items-center justify-center gap-1.5 shadow-md"
                                        >
                                            Cevapları Doldur
                                        </button>
                                    )}
                                    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest text-center block mb-1">KONTROLLER</span>
                                    <button
                                        onClick={() => setShowResults(true)}
                                        className="w-full bg-green-500 hover:bg-green-600 text-white font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-0.5 transition-all shadow-md uppercase tracking-wider text-center"
                                    >
                                        Kontrol Et
                                    </button>
                                    <button
                                        onClick={() => {
                                            startPreviewGame();
                                        }}
                                        className="w-full bg-slate-200/80 hover:bg-slate-350/50 text-slate-700 font-extrabold text-xs py-3.5 rounded-2xl border-b-4 border-slate-350 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider text-center"
                                        style={{ borderColor: '#cbd5e1' }}
                                    >
                                        Temizle
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    {/* Spacer directly below the white game card so the slide strip overlaps empty space */}
                    <div className="h-[180px] shrink-0 pointer-events-none" />
                </div>
            )}
        </div>
    );
};

export default DragDropGameBuilder;
