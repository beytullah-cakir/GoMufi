import React, { useState } from 'react';
import { Sparkles, Brain, Plus, Trash2, Edit2, CheckCircle2, Loader2, Wand2, ArrowRight, Settings2, HelpCircle, X, ChevronRight, BookOpen } from 'lucide-react';
import api from '../../api';

interface GeneratedQuestion {
    id: string;
    text: string;
    options?: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: 'Kolay' | 'Orta' | 'Zor';
    type: 'multiple-choice' | 'true-false' | 'open-ended';
}

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
    if (!text) return null;
    
    // Split by triple backticks for code blocks
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('```') && part.endsWith('```')) {
                    // It's a code block
                    const langMatch = part.match(/```(\w+)/);
                    const lang = langMatch ? langMatch[1] : '';
                    const code = part
                        .replace(/^```(\w+)?\n?/, '')
                        .replace(/```$/, '')
                        .trim();
                        
                    return (
                        <div key={i} className="my-6 relative group">
                            {lang && (
                                <div className="absolute -top-3 left-6 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg z-10">
                                    {lang}
                                </div>
                            )}
                            <div className="rounded-3xl overflow-hidden border-2 border-gray-800 bg-gray-900 shadow-2xl">
                                <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800/50 border-b border-gray-800">
                                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50"></div>
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50"></div>
                                </div>
                                <pre className="p-6 text-indigo-200 overflow-x-auto font-mono text-sm leading-relaxed custom-scrollbar">
                                    <code>{code}</code>
                                </pre>
                            </div>
                        </div>
                    );
                }
                
                // Handle inline code `...`
                const inlineParts = part.split(/(`[^`]+`)/g);
                return (
                    <span key={i} className="whitespace-pre-wrap">
                        {inlineParts.map((inlinePart, j) => {
                            if (inlinePart.startsWith('`') && inlinePart.endsWith('`')) {
                                return (
                                    <code key={j} className="mx-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg font-mono text-[0.85em] font-bold border border-indigo-100">
                                        {inlinePart.slice(1, -1)}
                                    </code>
                                );
                            }
                            return inlinePart;
                        })}
                    </span>
                );
            })}
        </>
    );
};

const InstructorAIQuestions: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState<'Kolay' | 'Orta' | 'Zor'>('Orta');
    const [questionType, setQuestionType] = useState<'multiple-choice' | 'true-false' | 'open-ended'>('multiple-choice');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
    
    // Node Selection State
    const [myCourses, setMyCourses] = useState<any[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
    const [selectedSection, setSelectedSection] = useState<any | null>(null);
    const [selectedSectionIndex, setSelectedSectionIndex] = useState<number | null>(null);
    const [isAssigning, setIsAssigning] = useState(false);

    React.useEffect(() => {
        const fetchCourses = async () => {
            try {
                const response = await api.get('/teacher/content');
                setMyCourses(response.data);
            } catch (error) {
                console.error("Kurslar çekilemedi:", error);
            }
        };
        fetchCourses();
    }, []);

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setIsGenerating(true);
        
        try {
            const response = await api.post('/generate_quiz', {
                topic: topic,
                difficulty: difficulty,
                type: questionType
            });

            if (response.data.success) {
                const quizData = response.data.quiz;
                const newQuestion: GeneratedQuestion = {
                    id: response.data.db_id?.toString() || Date.now().toString(),
                    text: quizData.soru,
                    options: quizData.secenekler,
                    correctAnswer: quizData.cevap,
                    explanation: quizData.aciklama,
                    difficulty: difficulty,
                    type: questionType
                };
                
                setGeneratedQuestions(prev => [newQuestion, ...prev]);
            } else {
                alert("Soru üretilirken bir hata oluştu.");
            }
        } catch (error: any) {
            console.error("AI Soru Üretme Hatası:", error);
            const detail = error.response?.data?.detail || "Sunucuya bağlanırken bir hata oluştu.";
            alert(detail);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRemoveQuestion = (id: string) => {
        setGeneratedQuestions(prev => prev.filter(q => q.id !== id));
    };

    const handleAssignClick = (quizId: string) => {
        setSelectedQuizId(quizId);
        setIsModalOpen(true);
        setSelectedCourse(null);
        setSelectedSection(null);
        setSelectedSectionIndex(null);
    };

    const handleNodeSelect = async (nodeId: number) => {
        if (!selectedQuizId || !selectedCourse || !selectedSection) return;
        
        setIsAssigning(true);
        try {
            // Fallback to section_X if id is missing, matching StudentApp.tsx logic
            const sectionId = selectedSection.id || `section_${(selectedSectionIndex || 0) + 1}`;
            
            const response = await api.post('/assign_quiz', {
                quiz_id: Number(selectedQuizId),
                course_id: Number(selectedCourse.id),
                section_id: sectionId,
                node_id: nodeId
            });

            if (response.data.success) {
                alert("Soru başarıyla düğüme atandı!");
                setIsModalOpen(false);
                // Optionally remove from the list
                setGeneratedQuestions(prev => prev.filter(q => q.id !== selectedQuizId));
            }
        } catch (error: any) {
            console.error("Atama Hatası:", error);
            alert(error.response?.data?.detail || "Soru atanırken bir hata oluştu.");
        } finally {
            setIsAssigning(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* -- HERO SECTION -- */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 p-10 text-white shadow-2xl shadow-indigo-200">
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="flex-1 space-y-4 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-xs font-black uppercase tracking-widest">
                            <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                            AI Destekli Soru Üretici
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black font-display leading-tight"> Saniyeler İçinde <br /> Soru Oluşturun </h1>
                        <p className="text-indigo-100 text-lg font-medium max-w-xl"> Konu başlığını girin, zorluk seviyesini seçin ve GoMufi AI sizin için en kaliteli soruları hazırlasın. </p>
                    </div>
                    <div className="w-48 h-48 md:w-64 md:h-64 bg-white/10 rounded-full blur-3xl absolute -right-20 -top-20 animate-pulse"></div>
                    <div className="w-48 h-48 md:w-64 md:h-64 bg-purple-500/20 rounded-full blur-3xl absolute -left-20 -bottom-20 animate-pulse delay-700"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* -- SIDEBAR: CONFIGURATION -- */}
                <div className="lg:col-span-4 space-y-6 sticky top-24">
                    <div className="bg-white rounded-[2rem] p-8 border-2 border-gray-100 shadow-sm border-b-4 border-gray-200">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                <Settings2 className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-black text-gray-800">Yapılandırma</h3>
                        </div>

                        <div className="space-y-6">
                            {/* Topic Input */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block pl-1">Ders / Konu</label>
                                <div className="relative group">
                                    <Brain className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                                    <input 
                                        type="text" 
                                        placeholder="Örn: Python Döngüler..."
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 transition-all placeholder:font-normal"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Difficulty Selection */}
                            <div className="space-y-2">
                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block pl-1">Zorluk Seviyesi</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['Kolay', 'Orta', 'Zor'] as const).map(d => (
                                        <button 
                                            key={d}
                                            onClick={() => setDifficulty(d)}
                                            className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${difficulty === d ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-100' : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600'}`}
                                        >
                                            {d}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Action Button */}
                            <button 
                                onClick={handleGenerate}
                                disabled={isGenerating || !topic.trim()}
                                className={`w-full py-5 rounded-2xl font-black text-sm shadow-xl transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 mt-4
                                    ${isGenerating || !topic.trim()
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                                        : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:shadow-indigo-200'
                                    }
                                `}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sorular Hazırlanıyor...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 className="w-5 h-5" />
                                        SORULARI ÜRET
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Pro Tips Section */}
                    <div className="bg-indigo-50 rounded-[2rem] p-6 border-2 border-indigo-100">
                        <div className="flex items-center gap-2 text-indigo-600 mb-3">
                            <HelpCircle size={18} strokeWidth={3} />
                            <span className="text-sm font-black uppercase tracking-wider">İpucu</span>
                        </div>
                        <p className="text-xs text-indigo-800 font-medium leading-relaxed"> Daha spesifik başlıklar kullanarak (örn: "Python list comprehension hatası") daha kaliteli ve hedefe yönelik sorular elde edebilirsiniz. </p>
                    </div>
                </div>

                {/* -- MAIN CONTENT: RESULTS -- */}
                <div className="lg:col-span-8 space-y-6">
                    {generatedQuestions.length === 0 && !isGenerating ? (
                        <div className="bg-white rounded-[2.5rem] border-2 border-dashed border-gray-200 p-20 flex flex-col items-center justify-center text-center space-y-4 opacity-70">
                            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-200 border-2 border-gray-100 mb-4">
                                <Plus size={48} strokeWidth={1} />
                            </div>
                            <h3 className="text-2xl font-black text-gray-400">Henüz Soru Üretilmedi</h3>
                            <p className="text-sm font-bold text-gray-300 max-w-sm"> Soldaki panelden bir konu başlığı girerek ilk sorularınızı üretmeye başlayın. </p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Header Info */}
                            <div className="flex items-center justify-between px-4">
                                <h3 className="text-2xl font-black text-gray-800 flex items-center gap-3">
                                    Üretilen Sorular
                                    <span className="bg-purple-100 text-purple-600 text-xs font-black px-3 py-1 rounded-full">{generatedQuestions.length} ADET</span>
                                </h3>
                                <button className="text-sm font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-2 group transition-all">
                                    TÜMÜNÜ EKLE 
                                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>

                            {/* Question List */}
                            <div className="space-y-4">
                                {generatedQuestions.map((question, index) => (
                                    <div 
                                        key={question.id} 
                                        className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm hover:border-indigo-200 transition-all overflow-hidden group border-b-4 border-gray-200"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <div className="p-8">
                                            {/* Header */}
                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                                                        question.difficulty === 'Kolay' ? 'bg-green-100 text-green-600' :
                                                        question.difficulty === 'Orta' ? 'bg-orange-100 text-orange-600' :
                                                        'bg-red-100 text-red-600'
                                                    }`}>
                                                        {question.difficulty}
                                                    </span>
                                                    <span className="bg-gray-100 text-gray-500 text-[10px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest">
                                                        {question.type === 'multiple-choice' ? 'ÇOKTAN SEÇMELİ' : 
                                                         question.type === 'true-false' ? 'DOĞRU / YANLIŞ' : 'AÇIK UÇLU'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRemoveQuestion(question.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Question Text */}
                                            <div className="text-xl font-black text-gray-800 mb-8 leading-relaxed">
                                                <FormattedText text={question.text} />
                                            </div>

                                            {/* Options */}
                                            {question.options && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                                                    {question.options.map((option, i) => (
                                                        <div 
                                                            key={i} 
                                                            className={`p-4 rounded-2xl border-2 text-sm font-bold flex items-center justify-between transition-all ${
                                                                option === question.correctAnswer 
                                                                    ? 'bg-green-50 border-green-200 text-green-700' 
                                                                    : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs flex-shrink-0 ${option === question.correctAnswer ? 'bg-green-500 text-white' : 'bg-white text-gray-400'}`}>
                                                                    {String.fromCharCode(65 + i)}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <FormattedText text={option} />
                                                                </div>
                                                            </div>
                                                            {option === question.correctAnswer && <CheckCircle2 size={18} className="flex-shrink-0" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Correct Answer for Open Ended */}
                                            {!question.options && question.correctAnswer && (
                                                <div className="mb-8 p-6 bg-green-50 border-2 border-green-100 rounded-2xl">
                                                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">Beklenen Örnek Cevap</p>
                                                    <p className="text-sm font-bold text-green-800">{question.correctAnswer}</p>
                                                </div>
                                            )}

                                            {/* Explanation */}
                                            <div className="bg-gray-50 rounded-2xl p-6 border-l-4 border-indigo-400 bg-gradient-to-r from-gray-50 to-white">
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                                    <Brain size={14} className="text-indigo-500"/>
                                                    Çözüm Açıklaması
                                                </p>
                                                <div className="text-sm font-medium text-gray-600 leading-relaxed">
                                                    <FormattedText text={question.explanation} />
                                                </div>
                                            </div>

                                            {/* Add to System Button */}
                                            <button 
                                                onClick={() => handleAssignClick(question.id)}
                                                className="w-full mt-6 py-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-2 border-indigo-100 group"
                                            >
                                                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                                                SİSTEME EKLE
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Node Selection Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border-2 border-gray-100 animate-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b-2 border-gray-50 flex items-center justify-between bg-gray-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800">Soru Atama</h3>
                                <p className="text-sm font-bold text-gray-400">Bu soruyu hangi dersin hangi adımına eklemek istersiniz?</p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="p-3 bg-white border-2 border-gray-100 rounded-2xl text-gray-400 hover:text-red-500 hover:border-red-100 transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {!selectedCourse ? (
                                <div className="space-y-4">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest block pl-1">Ders Seçin</label>
                                    <div className="grid grid-cols-1 gap-3">
                                        {myCourses.length > 0 ? myCourses.map(course => (
                                            <button
                                                key={course.id}
                                                onClick={() => setSelectedCourse(course)}
                                                className="flex items-center justify-between p-5 rounded-3xl border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm border-2 border-gray-50 group-hover:scale-110 transition-transform">
                                                        {course.category === 'coding' ? '💻' : '📚'}
                                                    </div>
                                                    <div className="text-left">
                                                        <h4 className="font-black text-gray-800">{course.title}</h4>
                                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{course.category}</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                            </button>
                                        )) : (
                                            <p className="text-center py-10 text-gray-400 font-bold">Hiç kursunuz bulunamadı.</p>
                                        )}
                                    </div>
                                </div>
                            ) : !selectedSection ? (
                                <div className="space-y-6">
                                    <button 
                                        onClick={() => setSelectedCourse(null)}
                                        className="text-xs font-black text-indigo-500 hover:text-indigo-600 flex items-center gap-1 uppercase tracking-widest transition-all"
                                    >
                                        ← Ders Seçimine Dön
                                    </button>
                                    
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block pl-1">
                                            {selectedCourse.title} - Bölüm Seçin
                                        </label>
                                        <div className="grid grid-cols-1 gap-3">
                                            {selectedCourse.curriculum && selectedCourse.curriculum.filter((item: any) => item.type !== 'live_sessions_config').map((section: any, idx: number) => (
                                                <button
                                                    key={section.id || idx}
                                                    onClick={() => {
                                                        setSelectedSection(section);
                                                        setSelectedSectionIndex(idx);
                                                    }}
                                                    className="flex items-center justify-between p-5 rounded-3xl border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg font-black text-indigo-500 border-2 border-gray-50 group-hover:bg-indigo-500 group-hover:text-white transition-all">
                                                            {idx + 1}
                                                        </div>
                                                        <div className="text-left">
                                                            <h4 className="font-black text-gray-800">{section.title}</h4>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BÖLÜM {idx + 1}</span>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <button 
                                        onClick={() => setSelectedSection(null)}
                                        className="text-xs font-black text-indigo-500 hover:text-indigo-600 flex items-center gap-1 uppercase tracking-widest transition-all"
                                    >
                                        ← Bölüm Seçimine Dön
                                    </button>
                                    
                                    <div className="space-y-4">
                                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block pl-1">
                                            {selectedSection.title} - Adım Seçin (Node)
                                        </label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {[
                                                { label: 'Giriş: Konuya Merhaba', type: 'step' },
                                                { label: 'Anla: Konuyu Kavra', type: 'start' },
                                                { label: 'Pekiştir: Detayları Gör', type: 'step' },
                                                { label: 'Uygula: Alıştırma Yap', type: 'paw' },
                                                { label: 'Özümse: Derinleş', type: 'step' },
                                                { label: 'Birleştir: Parçaları Tamamla', type: 'paw' },
                                                { label: 'Üret: Kendini Göster', type: 'chest' }
                                            ].map((nodeInfo, i) => (
                                                <button
                                                    key={i + 1}
                                                    onClick={() => handleNodeSelect(i + 1)}
                                                    disabled={isAssigning}
                                                    className="flex items-center justify-between p-4 rounded-2xl border-2 border-gray-100 hover:border-indigo-400 hover:bg-indigo-50 transition-all group disabled:opacity-50"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-white border-2 border-gray-50 flex items-center justify-center text-xs font-black text-gray-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                                                            {i + 1}
                                                        </div>
                                                        <div className="flex flex-col text-left">
                                                            <span className="font-bold text-gray-800 text-sm leading-tight">{nodeInfo.label}</span>
                                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{nodeInfo.type.toUpperCase()} DÜĞÜMÜ</span>
                                                        </div>
                                                    </div>
                                                    {isAssigning ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : <Plus className="text-gray-300 group-hover:text-indigo-500 transition-colors" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InstructorAIQuestions;
