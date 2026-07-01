import React, { useState, useEffect, useRef } from "react";
import { Image as ImageIcon, Video as VideoIcon, Loader2, FolderOpen, Globe, ExternalLink, FileText, Pencil, Mic, PenTool, Trophy, Code2, FileUp, Send, CheckCircle, GitMerge } from "lucide-react";
import CodeWidget from "./CodeWidget";
import type { SlideElement, ElementStyle } from "./types";
import api from "../../api";

interface CanvasElementProps {
  el: SlideElement;
  isEditing: boolean;
  setEditingElementId: (id: string | null) => void;
  updateElement: (id: string, updates: Partial<SlideElement>) => void;
  updateElementStyle: (id: string, style: Partial<ElementStyle>) => void;
  deleteElement: (id: string) => void;
  handleMouseDown: (
    e: React.MouseEvent,
    id: string,
    action: "drag" | "resize" | "rotate",
    handle?: string,
  ) => void;
  isPreview: boolean;
  previewRole?: 'student' | 'teacher';
  elements?: SlideElement[];
  onSpawnCodeEditor?: (challengeId: string, x: number, y: number, height: number) => void;
  allLessons?: any[];
}

interface WhiteboardWidgetProps {
    el: SlideElement;
    isPreview: boolean;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
}

const WhiteboardWidget: React.FC<WhiteboardWidgetProps> = ({ el, isPreview, updateElement }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const [color, setColor] = useState('#1e293b');
    const [brushSize, setBrushSize] = useState(4);

    // Load saved drawing on mount or element content change
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set dimensions to match element size exactly
        canvas.width = el.width || 500;
        canvas.height = (el.height || 350) - 48; // subtract top toolbar height

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (el.content && el.content.startsWith('data:image')) {
            const img = new Image();
            img.src = el.content;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
            };
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    }, [el.content, el.width, el.height]);

    const getMousePos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        
        let clientX = 0;
        let clientY = 0;
        
        if ('touches' in e) {
            if (e.touches.length === 0) return { x: 0, y: 0 };
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.stopPropagation();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getMousePos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        setIsDrawing(true);
    };

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.stopPropagation();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getMousePos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : color;
        ctx.lineWidth = tool === 'eraser' ? brushSize * 3 : brushSize;
        ctx.stroke();
    };

    const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.stopPropagation();
        setIsDrawing(false);

        const canvas = canvasRef.current;
        if (!canvas) return;
        
        // Save canvas as base64 image content
        const dataUrl = canvas.toDataURL();
        updateElement(el.id, { content: dataUrl });
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateElement(el.id, { content: '' });
    };

    return (
        <div className="w-full h-full bg-white rounded-2xl border-[6px] border-slate-700/10 shadow-xl overflow-hidden flex flex-col relative pointer-events-auto">
            {/* Top Toolbar controls */}
            <div className="h-12 bg-slate-50 border-b border-slate-100 px-4 flex items-center justify-between select-none shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 tracking-wider">BEYAZ TAHTA</span>
                </div>
                
                {/* Tools & Colors */}
                <div className="flex items-center gap-3">
                    {/* Pen Colors */}
                    <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 mr-1">
                        {[
                            { hex: '#1e293b', label: 'Siyah' },
                            { hex: '#ef4444', label: 'Kırmızı' },
                            { hex: '#3b82f6', label: 'Mavi' },
                            { hex: '#10b981', label: 'Yeşil' }
                        ].map(c => (
                            <button
                                key={c.hex}
                                onClick={(e) => { e.stopPropagation(); setColor(c.hex); setTool('pen'); }}
                                className={`w-5 h-5 rounded-full transition-all hover:scale-110 ${color === c.hex && tool === 'pen' ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                                style={{ backgroundColor: c.hex }}
                                title={c.label}
                            />
                        ))}
                    </div>

                    {/* Brush Tools */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); setTool('pen'); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all ${tool === 'pen' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            Kalem
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setTool('eraser'); }}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all ${tool === 'eraser' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            Silgi
                        </button>
                    </div>

                    {/* Brush Sizes */}
                    <select
                        value={brushSize}
                        onChange={(e) => { e.stopPropagation(); setBrushSize(Number(e.target.value)); }}
                        className="text-[10px] font-extrabold bg-white border border-slate-200 rounded-lg p-1 outline-none"
                    >
                        <option value={2}>İnce</option>
                        <option value={4}>Orta</option>
                        <option value={8}>Kalın</option>
                        <option value={14}>Çok Kalın</option>
                    </select>

                    {/* Clear Button */}
                    <button
                        onClick={handleClear}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase text-red-500 hover:bg-red-50 transition-all"
                    >
                        Temizle
                    </button>
                </div>
            </div>

            {/* Drawable Area */}
            <div className="flex-1 bg-white relative cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="absolute top-0 left-0 w-full h-full"
                />
            </div>
        </div>
    );
};

interface FileWidgetProps {
    el: SlideElement;
    isPreview: boolean;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
}

const FileWidget: React.FC<FileWidgetProps> = ({ el, isPreview, updateElement }) => {
    const [fileName, setFileName] = useState(el.content || 'Kaynak_Dokuman.pdf');
    const [fileUrl, setFileUrl] = useState(el.src || '');

    useEffect(() => {
        setFileName(el.content);
        setFileUrl(el.src || '');
    }, [el.content, el.src]);

    const handleSave = () => {
        updateElement(el.id, { content: fileName, src: fileUrl });
    };

    if (isPreview) {
        return (
            <a
                href={fileUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-full bg-amber-50/90 border-2 border-amber-200 rounded-2xl p-4 flex items-center gap-4 hover:scale-[1.02] hover:bg-amber-100/50 hover:shadow-md transition-all group pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <span className="font-extrabold text-slate-800 text-xs tracking-tight truncate">{fileName}</span>
                    <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">Dosyayı İndir</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <ExternalLink className="w-4 h-4" />
                </div>
            </a>
        );
    }

    return (
        <div 
            className="w-full h-full bg-amber-50/20 border-2 border-dashed border-amber-200 rounded-2xl p-3 flex flex-col gap-1.5 justify-center relative cursor-default"
        >
            <div className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    onBlur={handleSave}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Dosya Adı (Örn: Python_Rehberi.pdf)"
                    className="flex-1 text-[11px] font-extrabold text-slate-800 bg-white border border-amber-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-500/20"
                />
            </div>
            <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                    type="text"
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    onBlur={handleSave}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="İndirme URL adresi (https://...)"
                    className="flex-1 text-[10px] font-medium text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-amber-500/20"
                />
            </div>
        </div>
    );
};

interface LinkWidgetProps {
    el: SlideElement;
    isPreview: boolean;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
}

const LinkWidget: React.FC<LinkWidgetProps> = ({ el, isPreview, updateElement }) => {
    const [linkLabel, setLinkLabel] = useState(el.content || 'Faydalı Bağlantı');
    const [linkUrl, setLinkUrl] = useState(el.src || '');

    useEffect(() => {
        setLinkLabel(el.content);
        setLinkUrl(el.src || '');
    }, [el.content, el.src]);

    const handleSave = () => {
        updateElement(el.id, { content: linkLabel, src: linkUrl });
    };

    if (isPreview) {
        return (
            <a
                href={linkUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-full bg-blue-50/90 border-2 border-blue-200 rounded-2xl p-4 flex items-center gap-4 hover:scale-[1.02] hover:bg-blue-100/50 hover:shadow-md transition-all group pointer-events-auto"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-110 transition-transform">
                    <Globe className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <span className="font-extrabold text-slate-800 text-xs tracking-tight truncate">{linkLabel}</span>
                    <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider mt-0.5">Bağlantıyı Aç</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <ExternalLink className="w-4 h-4" />
                </div>
            </a>
        );
    }

    return (
        <div 
            className="w-full h-full bg-blue-50/20 border-2 border-dashed border-blue-200 rounded-2xl p-3 flex flex-col gap-1.5 justify-center relative cursor-default"
        >
            <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500 shrink-0" />
                <input
                    type="text"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    onBlur={handleSave}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Bağlantı Başlığı (Örn: Python Dokümantasyonu)"
                    className="flex-1 text-[11px] font-extrabold text-slate-800 bg-white border border-blue-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
            </div>
            <div className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                    type="text"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    onBlur={handleSave}
                    onMouseDown={(e) => e.stopPropagation()}
                    placeholder="Web adresi (https://...)"
                    className="flex-1 text-[10px] font-medium text-slate-500 bg-white border border-slate-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500/20"
                />
            </div>
        </div>
    );
};

interface SpeakingNoteWidgetProps {
    el: SlideElement;
    isPreview: boolean;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
}

const SpeakingNoteWidget: React.FC<SpeakingNoteWidgetProps> = ({ el, isPreview, updateElement }) => {
    const [text, setText] = useState(el.content || '');

    useEffect(() => {
        setText(el.content);
    }, [el.content]);

    const handleSave = () => {
        updateElement(el.id, { content: text });
    };

    return (
        <div className="w-full h-full bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-3 flex flex-col gap-2 relative cursor-default">
            <div className="flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-1.5 text-slate-400">
                    <Mic className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">Konuşma Notu</span>
                </div>
                <div className="w-4 h-4 flex items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing">
                    <span className="text-xs">⋮⋮</span>
                </div>
            </div>
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onBlur={handleSave}
                onMouseDown={(e) => e.stopPropagation()}
                placeholder="Öğretmen notunu buraya yazın..."
                className="flex-1 w-full text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl p-2 outline-none focus:ring-2 focus:ring-slate-300/20 resize-none leading-relaxed"
            />
        </div>
    );
};

interface AnswerBoxWidgetProps {
    el: SlideElement;
    isPreview: boolean;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
}

const AnswerBoxWidget: React.FC<AnswerBoxWidgetProps> = ({ el, isPreview, updateElement }) => {
    const [question, setQuestion] = useState(el.content || 'Soru: Python\'da listeler ile demetler (tuples) arasındaki fark nedir?');
    const [studentAnswer, setStudentAnswer] = useState(el.src || '');

    useEffect(() => {
        setQuestion(el.content || '');
        setStudentAnswer(el.src || '');
    }, [el.content, el.src]);

    const handleSaveQuestion = () => {
        updateElement(el.id, { content: question });
    };

    const handleSaveAnswer = () => {
        updateElement(el.id, { src: studentAnswer });
    };

    return (
        <div className="w-full h-full bg-cyan-50/20 border-2 border-cyan-200 rounded-2xl p-4 flex flex-col gap-3 relative cursor-default select-none pointer-events-auto">
            <div className="flex items-center justify-between border-b border-cyan-100 pb-2 shrink-0 select-none">
                <div className="flex items-center gap-1.5 text-cyan-600">
                    <PenTool className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Cevap Kutusu</span>
                </div>
                {isPreview ? (
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Öğrenci Yanıtı</span>
                ) : (
                    <span className="text-[9px] font-extrabold text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded-md">Soru Editörü</span>
                )}
            </div>
            
            {/* Question/Prompt Area */}
            <div className="flex flex-col gap-1 shrink-0">
                {isPreview ? (
                    <p className="text-xs font-bold text-slate-700 leading-relaxed bg-white border border-slate-100 rounded-xl p-3 shadow-sm select-text">
                        {question || 'Soru tanımsız.'}
                    </p>
                ) : (
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onBlur={handleSaveQuestion}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Sorunuzu veya yönlendirmenizi buraya yazın..."
                        className="w-full text-xs font-bold text-slate-700 bg-white border border-cyan-200 rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none leading-relaxed"
                        rows={2}
                    />
                )}
            </div>

            {/* Student Answer Input Area */}
            <div className="flex-1 min-h-0 flex flex-col">
                <textarea
                    value={studentAnswer}
                    onChange={(e) => setStudentAnswer(e.target.value)}
                    onBlur={handleSaveAnswer}
                    onMouseDown={(e) => e.stopPropagation()}
                    disabled={!isPreview}
                    placeholder={isPreview ? "Yanıtınızı buraya yazın..." : "Öğrenci yanıtı buraya girilecek (Önizlemede aktif)"}
                    className={`flex-1 w-full text-xs font-medium text-slate-600 border rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none leading-relaxed ${
                        isPreview 
                            ? 'bg-white border-slate-200 focus:border-cyan-400' 
                            : 'bg-slate-100/50 border-slate-200 cursor-not-allowed'
                    }`}
                />
            </div>
        </div>
    );
};

interface ChallengeWidgetProps {
    el: SlideElement;
    isPreview: boolean;
    previewRole?: 'student' | 'teacher';
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    elements?: SlideElement[];
    deleteElement?: (id: string) => void;
    onSpawnCodeEditor?: (challengeId: string, x: number, y: number, height: number) => void;
}

const ChallengeWidget: React.FC<ChallengeWidgetProps> = ({ 
    el, 
    isPreview, 
    previewRole = 'student', 
    updateElement, 
    elements = [], 
    deleteElement, 
    onSpawnCodeEditor 
}) => {
    const [title, setTitle] = useState(el.extra?.title || 'Challenge (Mini Görev)');
    const [prompt, setPrompt] = useState(el.content || '5 dakikada bu fonksiyonu yaz.');
    
    // Student Input State
    const [activeTab, setActiveTab] = useState<'text' | 'code' | 'file'>(el.extra?.activeTab || 'text');
    const [textInput, setTextInput] = useState(el.extra?.submittedText || '');
    const [codeInput, setCodeInput] = useState(el.extra?.submittedCode || '# Çözüm kodunuzu buraya yazın\n');
    const [fileName, setFileName] = useState(el.extra?.submittedFile || '');
    const [isSubmitted, setIsSubmitted] = useState(!!el.extra?.isSubmitted);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Teacher Grading State
    const [feedback, setFeedback] = useState(el.extra?.teacherFeedback || '');
    const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);

    useEffect(() => {
        setTitle(el.extra?.title || 'Challenge (Mini Görev)');
        setPrompt(el.content || '');
        setTextInput(el.extra?.submittedText || '');
        setCodeInput(el.extra?.submittedCode || '# Çözüm kodunuzu buraya yazın\n');
        setFileName(el.extra?.submittedFile || '');
        setIsSubmitted(!!el.extra?.isSubmitted);
        setFeedback(el.extra?.teacherFeedback || '');
        setActiveTab(el.extra?.activeTab || 'text');
    }, [el.content, el.extra]);

    const handleSaveConfig = () => {
        updateElement(el.id, {
            content: prompt,
            extra: {
                ...el.extra,
                title
            }
        });
    };

    const handleStudentSubmit = (e: React.MouseEvent) => {
        e.stopPropagation();

        let finalCode = codeInput;
        if (activeTab === 'code' && el.extra?.linkedCodeEditorId) {
            const linkedEditor = elements?.find(item => item.id === el.extra.linkedCodeEditorId);
            if (linkedEditor) {
                finalCode = linkedEditor.content;
            }
        }

        updateElement(el.id, {
            extra: {
                ...el.extra,
                submittedText: textInput,
                submittedCode: finalCode,
                submittedFile: fileName,
                isSubmitted: true,
                submittedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
            }
        });
        setIsSubmitted(true);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleStudentReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateElement(el.id, {
            extra: {
                ...el.extra,
                isSubmitted: false
            }
        });
        setIsSubmitted(false);
    };

    const handleTeacherGrade = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateElement(el.id, {
            extra: {
                ...el.extra,
                teacherFeedback: feedback
            }
        });
        setShowFeedbackSuccess(true);
        setTimeout(() => setShowFeedbackSuccess(false), 3000);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
        }
    };

    const handleTabChange = (tab: 'text' | 'code' | 'file') => {
        if (tab === 'code') {
            if (onSpawnCodeEditor && (!el.extra?.linkedCodeEditorId || !elements?.some(item => item.id === el.extra.linkedCodeEditorId))) {
                onSpawnCodeEditor(el.id, el.x + el.width + 20, el.y, el.height);
            } else {
                updateElement(el.id, {
                    extra: {
                        ...el.extra,
                        activeTab: tab
                    }
                });
            }
        } else {
            if (el.extra?.linkedCodeEditorId && deleteElement) {
                deleteElement(el.extra.linkedCodeEditorId);
            }
            updateElement(el.id, {
                extra: {
                    ...el.extra,
                    linkedCodeEditorId: undefined,
                    activeTab: tab
                }
            });
        }
        setActiveTab(tab);
    };

    // Style helper for tabs
    const tabClass = (tab: 'text' | 'code' | 'file') => `
        flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-black rounded-xl transition-all border-2
        ${activeTab === tab 
            ? 'bg-rose-500 border-rose-600 text-white shadow-sm' 
            : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
        }
    `;

    return (
        <div className="w-full h-full bg-white border-2 border-b-6 border-slate-200 rounded-3xl p-4 flex flex-col gap-3 relative cursor-default select-none pointer-events-auto shadow-sm overflow-hidden">
            {/* Header section */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
                <div className="flex items-center gap-2 max-w-[60%]">
                    <Trophy className="w-4.5 h-4.5 text-rose-500 shrink-0" />
                    {isPreview ? (
                        <span className="text-xs font-black text-rose-500 uppercase tracking-widest font-display truncate">{title}</span>
                    ) : (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleSaveConfig}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="bg-transparent text-xs font-black text-rose-500 uppercase tracking-widest outline-none border-b border-rose-250 focus:border-rose-500 font-display w-44"
                        />
                    )}
                </div>
                
                {/* State badges */}
                <div className="flex items-center gap-2 shrink-0">
                    {previewRole === 'teacher' ? (
                        <span className="text-[9px] font-black text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg">👨‍🏫 ÖĞRETMEN</span>
                    ) : isPreview ? (
                        isSubmitted ? (
                            <span className="text-[9px] font-black text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-lg">✓ TESLİM EDİLDİ</span>
                        ) : (
                            <span className="text-[9px] font-black text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-lg">🎓 ÖĞRENCİ</span>
                        )
                    ) : (
                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg">EDİTÖR</span>
                    )}
                </div>
            </div>

            {/* Prompt Instruction area */}
            <div className="shrink-0 flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Görev Yönergesi</span>
                {isPreview ? (
                    <div className="bg-rose-50/20 border border-rose-100 rounded-xl px-3 py-2 text-[11px] font-extrabold text-slate-700 leading-normal select-text border-l-4 border-l-rose-500 max-h-[80px] overflow-y-auto">
                        {prompt || 'Görev detayları belirtilmemiş.'}
                    </div>
                ) : (
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onBlur={handleSaveConfig}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="Öğrenciye vereceğiniz görevi buraya yazın..."
                        className="w-full text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-rose-400 resize-none leading-relaxed"
                        rows={2}
                    />
                )}
            </div>

            {/* Content area based on preview and role */}
            <div className="flex-1 min-h-0 flex flex-col gap-2.5">
                {previewRole === 'teacher' ? (
                    // Teacher View: Inspect student's submission and write feedback
                    <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Öğrenci Teslimat Bilgisi</span>
                        
                        {el.extra?.isSubmitted ? (
                            <div className="flex flex-col gap-2.5 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-[11px] select-text">
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 border-b border-slate-50 pb-1.5">
                                    <span>Teslim Saati: {el.extra.submittedAt || 'Belirtilmemiş'}</span>
                                </div>
                                {el.extra.submittedText && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Öğrenci Metni:</span>
                                        <p className="bg-slate-50 p-2 rounded-xl font-bold text-slate-750">{el.extra.submittedText}</p>
                                    </div>
                                )}
                                {el.extra.submittedCode && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Öğrenci Kodu:</span>
                                        <pre className="bg-slate-900 text-slate-100 p-2.5 rounded-xl font-mono text-[9px] whitespace-pre-wrap">{el.extra.submittedCode}</pre>
                                    </div>
                                )}
                                {el.extra.submittedFile && (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[9px] font-black text-slate-400 uppercase">Öğrenci Dosyası:</span>
                                        <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-xl text-indigo-600 font-black">
                                            <FolderOpen className="w-3.5 h-3.5" />
                                            <span>{el.extra.submittedFile}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Grading Feedback */}
                                <div className="flex flex-col gap-1.5 mt-1.5 pt-1.5 border-t border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Öğretmen Geri Bildirimi:</span>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        placeholder="Öğrencinin teslimatını değerlendirin..."
                                        className="w-full text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none focus:border-amber-400 focus:bg-white resize-none"
                                        rows={2}
                                    />
                                    <button
                                        onClick={handleTeacherGrade}
                                        className="self-end bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[9px] px-3.5 py-1.5 rounded-lg border-b-2 border-amber-700 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider flex items-center gap-1.5"
                                    >
                                        Geri Bildirimi Kaydet
                                    </button>
                                    {showFeedbackSuccess && (
                                        <span className="text-right text-[9px] font-bold text-green-600 animate-pulse">✓ Kaydedildi!</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 text-slate-400 text-center">
                                <span className="text-xs font-bold uppercase tracking-wider">Henüz Teslimat Yapılmadı</span>
                                <span className="text-[9px] mt-1">Öğrenci önizlemesinde teslimat yapıldıktan sonra buradan görüntülenebilir.</span>
                            </div>
                        )}
                    </div>
                ) : (
                    // Student or Editor View
                    <div className="flex-1 flex flex-col gap-2.5 min-h-0">
                        {/* Tab Headers */}
                        <div className="flex items-center gap-2 shrink-0 w-full" onMouseDown={(e) => e.stopPropagation()}>
                            <button onClick={() => handleTabChange('text')} className={tabClass('text')}>Metin</button>
                            <button onClick={() => handleTabChange('code')} className={tabClass('code')}>Kod</button>
                            <button onClick={() => handleTabChange('file')} className={tabClass('file')}>Dosya</button>
                        </div>

                        {/* Tab Content Panels */}
                        <div className="flex-1 min-h-0 bg-white border border-slate-200/60 rounded-2xl p-3 flex flex-col relative select-text overflow-hidden">
                            {activeTab === 'text' && (
                                <textarea
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    disabled={!isPreview || isSubmitted}
                                    placeholder={isPreview ? "Metin yanıtınızı buraya yazın..." : "Öğrenci metin yanıt kutusu (Önizlemede aktif)"}
                                    className="w-full h-full text-[11px] font-bold text-slate-700 bg-transparent resize-none outline-none leading-relaxed placeholder-slate-350"
                                />
                            )}
                            
                            {activeTab === 'code' && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-center select-none bg-slate-50 border border-slate-100 rounded-2xl h-full">
                                    <Code2 className="w-8 h-8 text-rose-500 animate-pulse" />
                                    <span className="text-xs font-black text-slate-750 uppercase tracking-wide">Kod Editörü Bağlandı</span>
                                    <p className="text-[10px] font-bold text-slate-400 max-w-[200px] leading-relaxed">
                                        Lütfen çözüm kodunuzu sağdaki kod editörü penceresini kullanarak yazın.
                                    </p>
                                </div>
                            )}

                            {activeTab === 'file' && (
                                <div className="flex-1 flex flex-col items-center justify-center gap-2 select-none h-full w-full">
                                    <input
                                        type="file"
                                        id={`challenge-upload-${el.id}`}
                                        className="hidden"
                                        disabled={!isPreview || isSubmitted}
                                        onChange={handleFileUpload}
                                    />
                                    
                                    {fileName ? (
                                        <div className="flex flex-col items-center justify-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-3 w-full">
                                            <FileUp className="w-6 h-6 text-rose-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-slate-750 truncate max-w-full px-2">{fileName}</span>
                                            {isPreview && !isSubmitted && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setFileName(''); }}
                                                    className="text-[8px] font-black text-red-500 uppercase hover:underline"
                                                >
                                                    Dosyayı Kaldır
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (isPreview && !isSubmitted) {
                                                    document.getElementById(`challenge-upload-${el.id}`)?.click();
                                                }
                                            }}
                                            className={`border border-dashed border-slate-250 bg-slate-50 hover:bg-slate-100/50 rounded-xl p-4 w-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${(!isPreview || isSubmitted) ? 'cursor-not-allowed opacity-60' : ''}`}
                                        >
                                            <FileUp className="w-5 h-5 text-slate-400" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider text-center">Dosya Seçin veya Bırakın</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Submit Button for Student Preview */}
                        {isPreview && (
                            <div className="shrink-0 flex items-center justify-between mt-1 select-none" onMouseDown={(e) => e.stopPropagation()}>
                                {isSubmitted ? (
                                    <div className="flex flex-col gap-1.5 w-full">
                                        <div className="flex items-center gap-2 justify-between">
                                            <button
                                                onClick={handleStudentReset}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[9px] px-3.5 py-1.5 rounded-lg border-b-2 border-slate-350 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider"
                                                style={{ borderColor: '#cbd5e1' }}
                                            >
                                                Yenile
                                            </button>
                                            <span className="text-[9px] font-black text-green-600 flex items-center gap-1">✓ Başarıyla İletildi!</span>
                                        </div>
                                        {el.extra?.teacherFeedback && (
                                            <div className="bg-amber-50/50 border border-amber-250 rounded-xl p-2.5 text-[9px] text-slate-700 leading-normal select-text mt-0.5 border-l-4 border-l-amber-500">
                                                <span className="font-black text-amber-800 uppercase block mb-0.5">👨‍🏫 Eğitmen Geri Bildirimi:</span>
                                                <span className="font-bold">{el.extra.teacherFeedback}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleStudentSubmit}
                                        className="w-full bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[11px] py-2.5 rounded-xl border-b-4 border-rose-700 active:border-b-0 active:translate-y-0.5 transition-all shadow-sm uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                                    >
                                        <Send className="w-3.5 h-3.5" /> Görevi Teslim Et
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {showSuccess && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center select-none animate-in fade-in zoom-in-95 duration-200">
                                <CheckCircle className="w-10 h-10 text-green-500 mb-1.5 animate-bounce" />
                                <h4 className="font-black text-slate-700 text-xs uppercase tracking-wide">Tebrikler!</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Göreviniz eğitmeninize iletildi.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
interface ConnectionTaskWidgetProps {
    el: SlideElement;
    isPreview: boolean;
    previewRole?: 'student' | 'teacher';
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
    allLessons?: any[];
}

const ConnectionTaskWidget: React.FC<ConnectionTaskWidgetProps> = ({ el, isPreview, previewRole = 'student', updateElement, allLessons = [] }) => {
    const [title, setTitle] = useState(el.extra?.title || 'Bağlantı Görevi (Connection Task)');
    const [previousTopic, setPreviousTopic] = useState(el.extra?.previousTopic || 'Function');
    const [currentTopic, setCurrentTopic] = useState(el.extra?.currentTopic || 'Class');
    const [prompt, setPrompt] = useState(el.content || 'Function bilgisini kullanarak bir Student Class oluştur.');
    
    // Student Input State
    const [answerInput, setAnswerInput] = useState(el.extra?.submittedAnswer || '');
    const [isSubmitted, setIsSubmitted] = useState(!!el.extra?.isSubmitted);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Teacher Grading State
    const [feedback, setFeedback] = useState(el.extra?.teacherFeedback || '');
    const [showFeedbackSuccess, setShowFeedbackSuccess] = useState(false);

    // Overlay State
    const [showOverlay, setShowOverlay] = useState(false);
    const [overlaySlideIndex, setOverlaySlideIndex] = useState(el.extra?.linkedSlideIndex || 0);
    const [overlayScale, setOverlayScale] = useState(0.8);
    const overlayContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setTitle(el.extra?.title || 'Bağlantı Görevi (Connection Task)');
        setPreviousTopic(el.extra?.previousTopic || 'Function');
        setCurrentTopic(el.extra?.currentTopic || 'Class');
        setPrompt(el.content || '');
        setAnswerInput(el.extra?.submittedAnswer || '');
        setIsSubmitted(!!el.extra?.isSubmitted);
        setFeedback(el.extra?.teacherFeedback || '');
    }, [el.content, el.extra]);

    useEffect(() => {
        if (showOverlay) {
            const handleResize = () => {
                if (overlayContainerRef.current) {
                    const rect = overlayContainerRef.current.getBoundingClientRect();
                    const wScale = (rect.width - 24) / 1000;
                    const hScale = (rect.height - 24) / 562.5;
                    setOverlayScale(Math.max(0.1, Math.min(wScale, hScale)));
                }
            };
            handleResize();
            window.addEventListener('resize', handleResize);
            return () => window.removeEventListener('resize', handleResize);
        }
    }, [showOverlay, overlaySlideIndex]);

    const handleSaveConfig = () => {
        updateElement(el.id, {
            content: prompt,
            extra: {
                ...el.extra,
                title,
                previousTopic,
                currentTopic
            }
        });
    };

    const handleStudentSubmit = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateElement(el.id, {
            extra: {
                ...el.extra,
                submittedAnswer: answerInput,
                isSubmitted: true,
                submittedAt: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
            }
        });
        setIsSubmitted(true);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
    };

    const handleStudentReset = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateElement(el.id, {
            extra: {
                ...el.extra,
                isSubmitted: false
            }
        });
        setIsSubmitted(false);
    };

    const handleTeacherGrade = (e: React.MouseEvent) => {
        e.stopPropagation();
        updateElement(el.id, {
            extra: {
                ...el.extra,
                teacherFeedback: feedback
            }
        });
        setShowFeedbackSuccess(true);
        setTimeout(() => setShowFeedbackSuccess(false), 3000);
    };

    return (
        <div className="w-full h-full bg-white border-2 border-b-6 border-slate-200 rounded-3xl p-4 flex flex-col gap-3 relative cursor-default select-none pointer-events-auto shadow-sm overflow-hidden">
            {/* Header section */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 shrink-0">
                <div className="flex items-center gap-2 max-w-[60%]">
                    <GitMerge className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                    {isPreview ? (
                        <span className="text-xs font-black text-emerald-600 uppercase tracking-widest font-display truncate">{title}</span>
                    ) : (
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={handleSaveConfig}
                            onMouseDown={(e) => e.stopPropagation()}
                            className="bg-transparent text-xs font-black text-emerald-600 uppercase tracking-widest outline-none border-b border-emerald-250 focus:border-emerald-500 font-display w-44"
                        />
                    )}
                </div>
                
                {/* State badges */}
                <div className="flex items-center gap-2 shrink-0">
                    {previewRole === 'teacher' ? (
                        <span className="text-[9px] font-black text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg">👨‍🏫 ÖĞRETMEN</span>
                    ) : isPreview ? (
                        isSubmitted ? (
                            <span className="text-[9px] font-black text-green-700 bg-green-100 border border-green-200 px-2 py-0.5 rounded-lg">✓ TESLİM EDİLDİ</span>
                        ) : (
                            <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 border border-emerald-250 px-2 py-0.5 rounded-lg">🎓 ÖĞRENCİ</span>
                        )
                    ) : (
                        <span className="text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg">EDİTÖR</span>
                    )}
                </div>
            </div>

            {/* Concept Connection Visual */}
            <div className="shrink-0 flex flex-col gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
                {isPreview ? (
                    <div className="flex items-center justify-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-2 shrink-0">
                        <div className="flex-1 bg-white border border-slate-150 rounded-xl p-2 text-center shadow-sm flex flex-col items-center justify-between">
                            <div>
                                <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Önceki Ders</span>
                                <span className="text-xs font-black text-slate-700 block truncate">{previousTopic}</span>
                            </div>
                            {el.extra?.linkedLessonId && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setOverlaySlideIndex(el.extra.linkedSlideIndex || 0);
                                        setShowOverlay(true);
                                    }}
                                    className="mt-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[8px] px-2 py-1 rounded-lg shadow-sm hover:shadow hover:scale-105 active:scale-95 transition-all uppercase tracking-wider w-full flex items-center justify-center gap-0.5"
                                >
                                    🔍 İncele
                                </button>
                            )}
                        </div>
                        <div className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0 shadow-inner">
                            <GitMerge className="w-4 h-4 animate-spin duration-3000" style={{ animationDuration: '6s' }} />
                        </div>
                        <div className="flex-1 bg-white border border-emerald-150 rounded-xl p-2 text-center shadow-sm">
                            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">Şimdiki Ders</span>
                            <span className="text-xs font-black text-emerald-600 block truncate">{currentTopic}</span>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-2">
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Önceki Konu Başlığı</span>
                                <input
                                    type="text"
                                    value={previousTopic}
                                    onChange={(e) => setPreviousTopic(e.target.value)}
                                    onBlur={handleSaveConfig}
                                    placeholder="Örn: Function"
                                    className="w-full text-xs font-bold text-slate-750 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-emerald-400"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Şimdiki Konu Başlığı</span>
                                <input
                                    type="text"
                                    value={currentTopic}
                                    onChange={(e) => setCurrentTopic(e.target.value)}
                                    onBlur={handleSaveConfig}
                                    placeholder="Örn: Class"
                                    className="w-full text-xs font-bold text-slate-750 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-emerald-400"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bağlantılı Seviye (Level)</span>
                                <select
                                    value={el.extra?.linkedLessonId || ""}
                                    onChange={(e) => {
                                        const lessonId = e.target.value;
                                        const selectedLesson = allLessons?.find(l => String(l.id) === String(lessonId));
                                        updateElement(el.id, {
                                            extra: {
                                                ...el.extra,
                                                linkedLessonId: lessonId,
                                                linkedSlideIndex: 0,
                                                previousTopic: selectedLesson ? (selectedLesson.noteTitle || selectedLesson.title) : previousTopic
                                            }
                                        });
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full text-[10px] font-bold text-slate-750 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 outline-none focus:border-emerald-400"
                                >
                                    <option value="">-- Bağlantı Yok --</option>
                                    {allLessons?.map((l, idx) => (
                                        <option key={l.id} value={l.id}>
                                            Level {idx + 1} - {l.noteTitle || l.title || `Ders ${idx + 1}`}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bağlantılı Slayt Sayfası</span>
                                <select
                                    value={el.extra?.linkedSlideIndex || 0}
                                    disabled={!el.extra?.linkedLessonId}
                                    onChange={(e) => {
                                        updateElement(el.id, {
                                            extra: {
                                                ...el.extra,
                                                linkedSlideIndex: parseInt(e.target.value)
                                            }
                                        });
                                    }}
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="w-full text-[10px] font-bold text-slate-750 bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 outline-none focus:border-emerald-400 disabled:opacity-50"
                                >
                                    {allLessons?.find(l => String(l.id) === String(el.extra?.linkedLessonId))?.slides?.map((s: any, idx: number) => (
                                        <option key={idx} value={idx}>
                                            Sayfa {idx + 1}
                                        </option>
                                    )) || <option value={0}>Sayfa 1</option>}
                                </select>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Prompt Instruction area */}
            <div className="shrink-0 flex flex-col gap-1">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bağlantı Görevi</span>
                {isPreview ? (
                    <div className="bg-emerald-50/20 border border-emerald-100 rounded-xl px-3 py-2 text-[11px] font-extrabold text-slate-700 leading-normal select-text border-l-4 border-l-emerald-500 max-h-[80px] overflow-y-auto">
                        {prompt || 'Görev detayları belirtilmemiş.'}
                    </div>
                ) : (
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onBlur={handleSaveConfig}
                        onMouseDown={(e) => e.stopPropagation()}
                        placeholder="İki konuyu birleştiren görevi buraya yazın..."
                        className="w-full text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-emerald-400 resize-none leading-relaxed"
                        rows={2}
                    />
                )}
            </div>

            {/* Content area based on preview and role */}
            <div className="flex-1 min-h-0 flex flex-col gap-2.5">
                {previewRole === 'teacher' ? (
                    // Teacher View: Inspect student's submission and write feedback
                    <div className="flex-1 flex flex-col gap-2.5 overflow-y-auto pr-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Öğrenci Çözümü</span>
                        
                        {el.extra?.isSubmitted ? (
                            <div className="flex flex-col gap-2.5 bg-white border border-slate-100 rounded-2xl p-3 shadow-sm text-[11px] select-text">
                                <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 border-b border-slate-50 pb-1.5">
                                    <span>Teslim Saati: {el.extra.submittedAt || 'Belirtilmemiş'}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <p className="bg-slate-50 p-2.5 rounded-xl font-bold text-slate-755 whitespace-pre-wrap">{el.extra.submittedAnswer}</p>
                                </div>

                                {/* Grading Feedback */}
                                <div className="flex flex-col gap-1.5 mt-1.5 pt-1.5 border-t border-slate-100">
                                    <span className="text-[9px] font-black text-slate-400 uppercase">Öğretmen Geri Bildirimi:</span>
                                    <textarea
                                        value={feedback}
                                        onChange={(e) => setFeedback(e.target.value)}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        placeholder="Öğrencinin çözümünü değerlendirin..."
                                        className="w-full text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2 outline-none focus:border-amber-400 focus:bg-white resize-none"
                                        rows={2}
                                    />
                                    <button
                                        onClick={handleTeacherGrade}
                                        className="self-end bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[9px] px-3.5 py-1.5 rounded-lg border-b-2 border-amber-700 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider flex items-center gap-1.5"
                                    >
                                        Geri Bildirimi Kaydet
                                    </button>
                                    {showFeedbackSuccess && (
                                        <span className="text-right text-[9px] font-bold text-green-600 animate-pulse">✓ Kaydedildi!</span>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-4 text-slate-400 text-center">
                                <span className="text-xs font-bold uppercase tracking-wider">Henüz Çözüm Gönderilmedi</span>
                                <span className="text-[9px] mt-1">Öğrenci önizlemesinde çözüm girildikten sonra buradan incelenebilir.</span>
                            </div>
                        )}
                    </div>
                ) : (
                    // Student or Editor View
                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">Çözümünüz</span>
                        <div className="flex-1 min-h-0 bg-white border border-slate-200/60 rounded-2xl p-2.5 flex flex-col relative select-text">
                            <textarea
                                value={answerInput}
                                onChange={(e) => setAnswerInput(e.target.value)}
                                onMouseDown={(e) => e.stopPropagation()}
                                disabled={!isPreview || isSubmitted}
                                placeholder={isPreview ? "Önceki ders konusunu şimdiki ders konusuyla nasıl harmanladığınızı buraya yazın..." : "Öğrenci çözüm giriş alanı (Önizlemede aktif)"}
                                className="flex-1 w-full text-[11px] font-bold text-slate-700 bg-transparent resize-none outline-none leading-relaxed placeholder-slate-350"
                            />
                        </div>

                        {/* Submit Button for Student Preview */}
                        {isPreview && (
                            <div className="shrink-0 flex items-center justify-between mt-1 select-none" onMouseDown={(e) => e.stopPropagation()}>
                                {isSubmitted ? (
                                    <div className="flex flex-col gap-1.5 w-full">
                                        <div className="flex items-center gap-2 justify-between">
                                            <button
                                                onClick={handleStudentReset}
                                                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[9px] px-3.5 py-1.5 rounded-lg border-b-2 border-slate-350 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider"
                                                style={{ borderColor: '#cbd5e1' }}
                                            >
                                                Yenile
                                            </button>
                                            <span className="text-[9px] font-black text-green-600 flex items-center gap-1">✓ Başarıyla Gönderildi!</span>
                                        </div>
                                        {el.extra?.teacherFeedback && (
                                            <div className="bg-amber-50/50 border border-amber-250 rounded-xl p-2.5 text-[9px] text-slate-700 leading-normal select-text mt-0.5 border-l-4 border-l-amber-500">
                                                <span className="font-black text-amber-800 uppercase block mb-0.5">👨‍🏫 Eğitmen Geri Bildirimi:</span>
                                                <span className="font-bold">{el.extra.teacherFeedback}</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleStudentSubmit}
                                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-[11px] py-2.5 rounded-xl border-b-4 border-emerald-700 active:border-b-0 active:translate-y-0.5 transition-all shadow-sm uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                                    >
                                        <Send className="w-3.5 h-3.5" /> Bağlantıyı Tamamla
                                    </button>
                                )}
                            </div>
                        )}
                        
                        {showSuccess && (
                            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-4 text-center select-none animate-in fade-in zoom-in-95 duration-200">
                                <CheckCircle className="w-10 h-10 text-green-500 mb-1.5 animate-bounce" />
                                <h4 className="font-black text-slate-700 text-xs uppercase tracking-wide">Harika Bağlantı!</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">Bağlantı görevi çözümünüz başarıyla eğitmeninize iletildi.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Slide Preview Overlay */}
            {showOverlay && (() => {
                const linkedLesson = allLessons?.find(l => String(l.id) === String(el.extra?.linkedLessonId));
                const slides = linkedLesson?.slides || [];
                const currentSlide = slides[overlaySlideIndex];

                return (
                    <div 
                        className="fixed inset-0 z-[999] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="w-full max-w-5xl flex items-center justify-between text-white mb-3.5 px-4 shrink-0">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">BAĞLANTILI İÇERİK</span>
                                <h3 className="text-sm font-black font-display text-slate-100">
                                    Level {allLessons?.findIndex(l => String(l.id) === String(el.extra?.linkedLessonId)) + 1} - {linkedLesson?.noteTitle || linkedLesson?.title || "Ders İçeriği"}
                                </h3>
                            </div>
                            
                            {/* Navigation controls */}
                            {slides.length > 1 && (
                                <div className="flex items-center gap-3.5 bg-slate-900/80 px-4 py-1.5 rounded-xl border border-slate-800 shadow-inner">
                                    <button
                                        disabled={overlaySlideIndex <= 0}
                                        onClick={() => setOverlaySlideIndex((prev: number) => prev - 1)}
                                        className="text-xs font-black disabled:opacity-30 hover:text-emerald-400 transition-colors cursor-pointer"
                                    >
                                        ◀ Önceki Sayfa
                                    </button>
                                    <span className="text-xs font-black text-slate-400">
                                        {overlaySlideIndex + 1} / {slides.length}
                                    </span>
                                    <button
                                        disabled={overlaySlideIndex >= slides.length - 1}
                                        onClick={() => setOverlaySlideIndex((prev: number) => prev + 1)}
                                        className="text-xs font-black disabled:opacity-30 hover:text-emerald-400 transition-colors cursor-pointer"
                                    >
                                        Sonraki Sayfa ▶
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => setShowOverlay(false)}
                                className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs px-4 py-2 rounded-xl shadow-lg border-b-4 border-rose-700 active:border-b-0 active:translate-y-0.5 transition-all uppercase tracking-wider cursor-pointer"
                            >
                                Kapat ve Geri Dön
                            </button>
                        </div>

                        {/* Slide Canvas Wrapper */}
                        <div 
                            ref={overlayContainerRef}
                            className="flex-1 w-full flex items-center justify-center min-h-0 relative overflow-hidden"
                        >
                            {currentSlide ? (
                                <div 
                                    className="relative shrink-0"
                                    style={{
                                        width: 1000 * overlayScale,
                                        height: 562.5 * overlayScale
                                    }}
                                >
                                    <div 
                                        className="bg-white rounded-2xl shadow-2xl absolute overflow-hidden border border-slate-100" 
                                        style={{ 
                                            width: 1000, 
                                            height: 562.5, 
                                            transform: `scale(${overlayScale})`,
                                            transformOrigin: 'top left',
                                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                        }}
                                    >
                                        {currentSlide.elements?.map((subEl: SlideElement) => (
                                            <CanvasElement
                                                key={subEl.id}
                                                el={subEl}
                                                isEditing={false}
                                                setEditingElementId={() => {}}
                                                updateElement={() => {}}
                                                updateElementStyle={() => {}}
                                                deleteElement={() => {}}
                                                handleMouseDown={() => {}}
                                                isPreview={true}
                                                previewRole="student"
                                                elements={currentSlide.elements}
                                            />
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-400 font-bold text-sm">Slayt içeriği yüklenemedi.</div>
                            )}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};


const CanvasElement: React.FC<CanvasElementProps> = ({
  el,
  isEditing,
  setEditingElementId,
  updateElement,
  handleMouseDown,
  isPreview,
  previewRole = 'student',
  elements = [],
  deleteElement,
  onSpawnCodeEditor,
  allLessons = [],
}) => {
  if (isPreview && el.type === 'speaking_note') {
      return null;
  }
  const contentRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (isEditing && contentRef.current) {
      contentRef.current.focus();
      // Optional: Select all text or place cursor at end
      const range = document.createRange();
      range.selectNodeContents(contentRef.current);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

  const htmlContent = React.useMemo(
    () => ({ __html: el.content }),
    [el.content],
  );

  // Move commonStyle definition outside or useMemo
  const style = React.useMemo(
    () =>
      ({
        fontWeight: el.style?.bold ? "bold" : "normal",
        fontStyle: el.style?.italic ? "italic" : "normal",
        textDecoration: el.style?.underline ? "underline" : "none",
        color: el.style?.color,
        fontSize: `${el.style?.fontSize || 24}px`,
        fontFamily:
          el.style?.fontFamily === "Inter"
            ? '"Inter", sans-serif'
            : el.style?.fontFamily === "Fredoka"
              ? '"Fredoka", sans-serif'
              : el.style?.fontFamily === "Bangers"
                ? '"Bangers", cursive'
                : el.style?.fontFamily === "Comic Neue"
                  ? '"Comic Neue", cursive'
                  : el.style?.fontFamily === "Pacifico"
                    ? '"Pacifico", cursive'
                    : el.style?.fontFamily === "Fira Code"
                      ? '"Fira Code", monospace'
                      : '"Patrick Hand", cursive',
        textAlign: el.style?.textAlign || "center",
        // For sticky specifics, we can merge later or here?
        // Let's keep it general here as it was commonStyle
      }) as React.CSSProperties,
    [el.style],
  );

  const getYoutubeId = (url: string) => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  return (
    <div
      className="absolute group"
      style={{
        left: el.x || 0,
        top: el.y || 0,
        width: el.width || 100,
        height: el.height || 100,
        transform: `rotate(${el.rotation || 0}deg)`,
        pointerEvents: el.type === "draw" ? "none" : "auto",
      }}
      onMouseDown={(e) => {
        if (isPreview || isEditing) {
          e.stopPropagation();
          return;
        }
        handleMouseDown(e, el.id, "drag");
      }}
      data-id={el.id}
      data-type={el.type}
    >
      {/* ARROW ELEMENT */}
      {el.type === "arrow" && el.arrowConfig && (
        <div className="w-full h-full pointer-events-none">
          <svg className="w-full h-full overflow-visible pointer-events-none">
            <defs>
              <marker
                id={`arrowhead-${el.id}`}
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill={el.style?.color || "#374151"}
                />
              </marker>
            </defs>
            {(() => {
              const s = el.arrowConfig.start;
              const e = el.arrowConfig.end;
              let d = `M ${s.x} ${s.y} L ${e.x} ${e.y}`; // Default Straight

              if (el.arrowConfig.arrowStyle === "curved") {
                // S-Curve Logic
                const dist = Math.abs(e.x - s.x);
                const cp1 = { x: s.x + dist * 0.5, y: s.y };
                const cp2 = { x: e.x - dist * 0.5, y: e.y };

                d = `M ${s.x} ${s.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${e.x} ${e.y}`;
              } else if (el.arrowConfig.arrowStyle === "elbow") {
                // Elbow Logic with Standoffs & Smart Routing
                const startSide = el.arrowConfig.startSide;
                const endSide = el.arrowConfig.endSide;

                const startMargin = el.arrowConfig.customStartOffset ?? 30;
                const endMargin = el.arrowConfig.customEndOffset ?? 30;

                // 1. Calculate Standoff Points (p1, p2)
                let p1 = { ...s };
                if (startSide === "top") p1.y -= startMargin;
                else if (startSide === "bottom") p1.y += startMargin;
                else if (startSide === "left") p1.x -= startMargin;
                else if (startSide === "right") p1.x += startMargin;

                let p2 = { ...e };
                if (endSide === "top") p2.y -= endMargin;
                else if (endSide === "bottom") p2.y += endMargin;
                else if (endSide === "left") p2.x -= endMargin;
                else if (endSide === "right") p2.x += endMargin;

                // 2. Determine Axis
                const isStartVertical =
                  startSide === "top" || startSide === "bottom";
                const isEndVertical = endSide === "top" || endSide === "bottom";

                let midPath = "";

                if (isStartVertical === isEndVertical) {
                  if (startSide === endSide) {
                    if (isStartVertical) {
                      const defaultChannel =
                        startSide === "top"
                          ? Math.min(p1.y, p2.y) - 30
                          : Math.max(p1.y, p2.y) + 30;
                      const channel =
                        el.arrowConfig.customChannel ?? defaultChannel;
                      midPath = `L ${p1.x} ${channel} L ${p2.x} ${channel}`;
                    } else {
                      const defaultChannel =
                        startSide === "left"
                          ? Math.min(p1.x, p2.x) - 30
                          : Math.max(p1.x, p2.x) + 30;
                      const channel =
                        el.arrowConfig.customChannel ?? defaultChannel;
                      midPath = `L ${channel} ${p1.y} L ${channel} ${p2.y}`;
                    }
                  } else {
                    if (isStartVertical) {
                      const defaultChannel = (p1.y + p2.y) / 2;
                      const channel =
                        el.arrowConfig.customChannel ?? defaultChannel;
                      midPath = `L ${p1.x} ${channel} L ${p2.x} ${channel}`;
                    } else {
                      const defaultChannel = (p1.x + p2.x) / 2;
                      const channel =
                        el.arrowConfig.customChannel ?? defaultChannel;
                      midPath = `L ${channel} ${p1.y} L ${channel} ${p2.y}`;
                    }
                  }
                } else {
                  if (isStartVertical) midPath = `L ${p1.x} ${p2.y}`;
                  else midPath = `L ${p2.x} ${p1.y}`;
                }

                d = `M ${s.x} ${s.y} L ${p1.x} ${p1.y} ${midPath} L ${p2.x} ${p2.y} L ${e.x} ${e.y}`;
              }

              return (
                <path
                  d={d}
                  stroke={el.style?.color || "#374151"}
                  strokeWidth={el.style?.borderWidth || 4}
                  fill="none"
                  markerEnd={`url(#arrowhead-${el.id})`}
                  className="pointer-events-auto cursor-pointer"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })()}
          </svg>
        </div>
      )}

      {/* CONTENT */}
      <div
        className={`w-full h-full ${el.type === "draw" || el.type === "arrow" || (el.type === "shape" && el.style?.borderPosition === "outside") ? "" : "overflow-hidden"}`}
        onDoubleClick={(e) => {
          if (isPreview) return;
          if (["text", "sticky", "code", "video"].includes(el.type)) {
            e.stopPropagation();
            setEditingElementId(el.id);
          }
        }}
      >
        {el.type === "shape" && (
          <div
            className={`w-full h-full flex ${el.style?.verticalAlign === "top" ? "items-start" : el.style?.verticalAlign === "bottom" ? "items-end" : "items-center"} justify-center ${el.shapeType === "circle" ? "rounded-full" : ""}`}
            style={{
              backgroundColor: el.style?.backgroundColor,
              borderRadius: el.style?.borderRadius
                ? `${el.style.borderRadius}px`
                : undefined,
              borderWidth:
                !el.style?.borderPosition ||
                el.style?.borderPosition === "inside"
                  ? el.style?.borderWidth !== undefined
                    ? `${el.style.borderWidth}px`
                    : "4px"
                  : "0px",
              borderColor: el.style?.borderColor || "#1f2937",
              boxShadow:
                el.style?.borderPosition === "outside" && el.style?.borderWidth
                  ? `0 0 0 ${el.style.borderWidth}px ${el.style.borderColor || "#1f2937"}`
                  : undefined,
              padding: "10px",
            }}
          >
            <div
              ref={contentRef}
              className={`w-full min-h-[1.2em] outline-none ${isEditing ? "cursor-text select-text" : "cursor-default select-none"} ${
                el.style?.textAlign === "left"
                  ? "text-left"
                  : el.style?.textAlign === "right"
                    ? "text-right"
                    : el.style?.textAlign === "center"
                      ? "text-center"
                      : "text-center"
              }`}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onMouseDown={(e) => {
                if (isEditing) e.stopPropagation();
              }}
              onBlur={(e) => {
                updateElement(el.id, { content: e.currentTarget.innerHTML });
                setEditingElementId(null);
              }}
              style={style}
              dangerouslySetInnerHTML={htmlContent}
            />
          </div>
        )}
        {el.type === "text" && (
          <div
            className={`w-full h-full flex ${
              el.style?.verticalAlign === "top"
                ? "items-start"
                : el.style?.verticalAlign === "bottom"
                  ? "items-end"
                  : "items-center"
            }`}
          >
            <div
              ref={contentRef}
              className={`w-full outline-none ${isEditing ? "cursor-text select-text" : "cursor-default select-none"} ${
                el.style?.textAlign === "left"
                  ? "text-left"
                  : el.style?.textAlign === "right"
                    ? "text-right"
                    : "text-center"
              }`}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onMouseDown={(e) => {
                if (isEditing) e.stopPropagation();
              }}
              onBlur={(e) => {
                updateElement(el.id, { content: e.currentTarget.innerHTML });
                setEditingElementId(null);
              }}
              style={style}
              dangerouslySetInnerHTML={htmlContent}
            />
          </div>
        )}
        {el.type === "sticky" && (
          <div
            className={`w-full h-full shadow-lg p-4 flex ${
              el.style?.verticalAlign === "top"
                ? "items-start"
                : el.style?.verticalAlign === "bottom"
                  ? "items-end"
                  : "items-center"
            }`}
            style={{ backgroundColor: el.style?.backgroundColor }}
          >
            <div
              ref={contentRef}
              className={`w-full outline-none ${isEditing ? "cursor-text select-text" : "cursor-default select-none"} ${
                el.style?.textAlign === "left"
                  ? "text-left"
                  : el.style?.textAlign === "right"
                    ? "text-right"
                    : "text-center"
              }`}
              contentEditable={isEditing}
              suppressContentEditableWarning
              onMouseDown={(e) => {
                if (isEditing) e.stopPropagation();
              }}
              onBlur={(e) => {
                updateElement(el.id, { content: e.currentTarget.innerHTML });
                setEditingElementId(null);
              }}
              style={style}
              dangerouslySetInnerHTML={htmlContent}
            />
          </div>
        )}
        {el.type === "code" && (
          <CodeWidget
            el={el}
            isEditing={isEditing}
            updateElement={updateElement}
            setEditingElementId={setEditingElementId}
            handleMouseDown={handleMouseDown}
            readOnly={isPreview}
            isPreview={isPreview}
          />
        )}
        {el.type === "code_editor" && (
          <CodeWidget
            el={el}
            isEditing={isEditing}
            updateElement={updateElement}
            setEditingElementId={setEditingElementId}
            handleMouseDown={handleMouseDown}
            readOnly={false}
            isPreview={isPreview}
          />
        )}
        {(el.type === "image" || el.type === "video") && (
          <div
            className="w-full h-full bg-gray-100 flex items-center justify-center overflow-hidden relative cursor-pointer"
            onClick={() => {
              if (el.type === "image") {
                const input = document.getElementById(
                  `file-input-${el.id}`,
                ) as HTMLInputElement;
                input?.click();
              }
            }}
            style={{
              borderRadius: el.style?.borderRadius
                ? `${el.style.borderRadius}px`
                : "16px",
              borderWidth:
                el.style?.borderWidth !== undefined
                  ? `${el.style.borderWidth}px`
                  : el.type === "image"
                    ? "2px"
                    : "2px",
              borderColor: el.style?.borderColor || "#d1d5db",
              borderStyle:
                el.src || el.imageUrl || el.videoUrl ? "solid" : "dashed",
            }}
          >
            {isUploading && (
              <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            )}

            {el.type === "image" && (
              <input
                id={`file-input-${el.id}`}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  setIsUploading(true);
                  const formData = new FormData();
                  formData.append("file", file);

                  try {
                    const response = await api.post(
                      "/builder/upload-image",
                      formData,
                      {
                        headers: { "Content-Type": "multipart/form-data" },
                      },
                    );
                    if (response.data.success) {
                      updateElement(el.id, {
                        imageUrl: response.data.imageUrl,
                        // Optionally update size based on uploaded image dimensions?
                        // For now just the URL
                      });
                    }
                  } catch (err: any) {
                    console.error(
                      "Upload failed",
                      err.response?.data || err.message,
                    );
                    alert(
                      "Yükleme başarısız: " +
                        (err.response?.data?.detail || err.message),
                    );
                  } finally {
                    setIsUploading(false);
                  }
                }}
              />
            )}

            {el.type === "image" ? (
              el.imageUrl || el.src ? (
                <img
                  src={el.imageUrl || el.src}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <ImageIcon className="text-gray-300 w-10 h-10" />
              )
            ) : el.videoUrl || el.src ? (
              getYoutubeId(el.videoUrl || el.src || "") ? (
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${getYoutubeId(el.videoUrl || el.src || "")}`}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className={
                    isEditing ? "pointer-events-auto" : "pointer-events-none"
                  }
                />
              ) : (
                <video
                  src={el.videoUrl || el.src}
                  controls
                  className={`w-full h-full object-cover ${isEditing ? "pointer-events-auto" : "pointer-events-none"}`}
                />
              )
            ) : (
              <VideoIcon className="text-gray-500 w-10 h-10" />
            )}
          </div>
        )}
        {el.type === "draw" && (
          <div className="w-full h-full">
            <svg className="w-full h-full overflow-visible">
              <path
                className="pointer-events-auto cursor-pointer"
                d={el.content}
                fill="none"
                stroke={el.style?.borderColor || "#1f2937"}
                strokeWidth={el.style?.borderWidth || 3}
                strokeOpacity={el.style?.opacity ?? 1}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
        {el.type === "whiteboard" && (
          <WhiteboardWidget el={el} isPreview={isPreview} updateElement={updateElement} />
        )}
        {el.type === "file" && (
          <FileWidget el={el} isPreview={isPreview} updateElement={updateElement} />
        )}
        {el.type === "link" && (
          <LinkWidget el={el} isPreview={isPreview} updateElement={updateElement} />
        )}
        {el.type === "speaking_note" && (
          <SpeakingNoteWidget el={el} isPreview={isPreview} updateElement={updateElement} />
        )}
        {el.type === "answer_box" && (
          <AnswerBoxWidget el={el} isPreview={isPreview} updateElement={updateElement} />
        )}
        {el.type === "challenge" && (
          <ChallengeWidget 
            el={el} 
            isPreview={isPreview} 
            previewRole={previewRole} 
            updateElement={updateElement} 
            elements={elements}
            deleteElement={deleteElement}
            onSpawnCodeEditor={onSpawnCodeEditor}
          />
        )}
        {el.type === "connection_task" && (
          <ConnectionTaskWidget 
            el={el} 
            isPreview={isPreview} 
            previewRole={previewRole} 
            updateElement={updateElement} 
            allLessons={allLessons}
          />
        )}
      </div>
    </div>
  );
};

export default CanvasElement;
