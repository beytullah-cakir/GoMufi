import React, { useState } from 'react';
import { PenTool, CheckCircle, FileText, Code, Image, File, Send, Upload, Star, X, Sparkles } from 'lucide-react';
import api from '../../api';

interface StudentHomeworkViewProps {
    slide: any;
    courseId?: string | number;
    isPreviewMode?: boolean;
    onComplete?: () => void;
    onClose?: () => void;
}

const StudentHomeworkView: React.FC<StudentHomeworkViewProps> = ({
    slide,
    courseId,
    isPreviewMode = false,
    onComplete,
    onClose
}) => {
    const config = slide?.homeworkConfig || {
        title: 'Python Değişkenleri ile Hesaplama',
        instructions: '1. Bir "ad" değişkeni tanımlayıp kendi isminizi atayın.\n2. Bir "yas" değişkeni tanımlayıp yaşınızı atayın.\n3. Bu değişkenleri print kullanarak konsola yazdırın.',
        submissionType: 'text',
        points: 100,
        starterCode: '# Kodunuzu buraya yazın\n'
    };

    const [textInput, setTextInput] = useState('');
    const [codeValue, setCodeValue] = useState(config.starterCode || '');
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (config.submissionType === 'image') {
            const reader = new FileReader();
            reader.onload = () => {
                setUploadedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setUploadedFile(file);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        
        // Simulating delay for gamified submit
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
            if (!isPreviewMode && courseId) {
                // Submit to backend
                await api.post("/profile/student/stats", {
                    xp_gain: config.points || 100,
                    gems_gain: 3
                });
                
                // Store submission status locally
                localStorage.setItem(`homework_submitted_${courseId}_${slide.id}`, 'true');
            }
            
            setIsSuccess(true);
            setIsSubmitting(false);
            
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 3000);
        } catch (err) {
            console.error("Homework submission error:", err);
            setIsSubmitting(false);
            alert("Gönderim sırasında hata oluştu. Tekrar deneyin.");
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[300] flex flex-col items-center justify-center animate-in fade-in duration-300 select-none overflow-hidden"
            style={{ 
                backgroundColor: '#ffffff',
                backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)',
                backgroundSize: '20px 20px',
            }}
        >
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-[90%] max-w-5xl aspect-[16/9] border-4 border-gray-150 overflow-hidden flex flex-col md:flex-row relative animate-in zoom-in-95 duration-200">
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 z-50 p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors bg-white shadow-sm"
                >
                    <X size={20} />
                </button>

                {/* Left Side: Instructions (45%) */}
                <div className="md:w-[45%] bg-gradient-to-b from-blue-600 to-indigo-750 p-8 text-white flex flex-col justify-between relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]"></div>
                    <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>

                    <div className="relative z-10 space-y-6">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-3 py-1 rounded-full border border-white/10">
                                DERS ÖDEVİ
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-wider bg-yellow-400 text-yellow-950 px-2.5 py-1 rounded-full flex items-center gap-1">
                                <Star size={10} fill="currentColor" /> +{config.points || 100} XP
                            </span>
                        </div>

                        <div>
                            <h3 className="text-2xl font-black tracking-tight font-display text-white">
                                {config.title}
                            </h3>
                            <div className="w-12 h-1 bg-white/25 rounded-full mt-3"></div>
                        </div>

                        <div>
                            <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest block mb-2">Talimatlar</span>
                            <div className="text-sm text-blue-50 font-medium leading-relaxed whitespace-pre-line bg-black/10 p-4 rounded-2xl border border-white/5 h-64 overflow-y-auto">
                                {config.instructions}
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 text-[10px] text-blue-200 font-bold uppercase tracking-wider">
                        GoMufi Asenkron Akademi
                    </div>
                </div>

                {/* Right Side: Submission Area (55%) */}
                <div className="flex-1 bg-white p-8 flex flex-col justify-between overflow-y-auto relative">
                    
                    {/* Success screen */}
                    {isSuccess ? (
                        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center p-8 z-20 animate-in zoom-in-95 duration-300">
                            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-green-500 mb-6 border-4 border-green-200 relative">
                                <CheckCircle size={48} className="animate-bounce" />
                                <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-yellow-400 animate-pulse" />
                            </div>
                            <h4 className="text-2xl font-black text-gray-800 font-display">Tebrikler! 🎉</h4>
                            <p className="text-sm text-gray-500 font-bold text-center mt-2">
                                Ödeviniz başarıyla teslim edildi. <br />
                                <span className="text-indigo-600">+{config.points || 100} XP</span> ve <span className="text-purple-600">+3 Elmas</span> kazandınız!
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4 flex-1 flex flex-col min-h-0">
                                <div>
                                    <h4 className="font-black text-gray-800 text-sm font-display tracking-tight uppercase">Ödevini Teslim Et</h4>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">Lütfen istenen formatta yanıtınızı yükleyin.</p>
                                </div>

                                <div className="flex-1 min-h-0 flex flex-col">
                                    
                                    {/* Text Submission */}
                                    {config.submissionType === 'text' && (
                                        <textarea
                                            className="w-full flex-1 p-4 bg-gray-50 border-2 border-gray-100 hover:border-gray-200 focus:border-blue-500 focus:bg-white rounded-2xl font-medium text-gray-700 placeholder-gray-400 transition-all text-sm outline-none resize-none h-full"
                                            placeholder="Cevabınızı buraya yazın..."
                                            value={textInput}
                                            onChange={(e) => setTextInput(e.target.value)}
                                        />
                                    )}

                                    {/* Code Submission */}
                                    {config.submissionType === 'code' && (
                                        <div className="w-full flex-1 flex flex-col min-h-0 border-2 border-gray-150 rounded-2xl overflow-hidden bg-gray-900">
                                            <div className="bg-gray-800 px-4 py-2 border-b border-gray-950 flex items-center justify-between text-white/50 text-xs font-mono">
                                                <span>main.py</span>
                                                <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">PYTHON</span>
                                            </div>
                                            <textarea
                                                className="w-full flex-1 p-4 bg-gray-950 font-mono text-xs text-green-400 outline-none resize-none"
                                                value={codeValue}
                                                onChange={(e) => setCodeValue(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    {/* Image Submission */}
                                    {config.submissionType === 'image' && (
                                        <div className="w-full flex-1 flex flex-col justify-center">
                                            {uploadedImage ? (
                                                <div className="relative w-full aspect-video border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden bg-gray-50 p-2">
                                                    <img src={uploadedImage} alt="Preview" className="w-full h-full object-contain rounded-xl" />
                                                    <button 
                                                        onClick={() => setUploadedImage(null)}
                                                        className="absolute top-4 right-4 bg-black/60 text-white p-1.5 rounded-full hover:bg-black transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-full aspect-video border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer bg-gray-50/50 hover:bg-blue-50/10 transition-all group">
                                                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-105 group-hover:text-blue-500 transition-all shadow-sm">
                                                        <Upload size={20} />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-xs font-black text-gray-700 block">Resim Dosyası Sürükleyin veya Seçin</span>
                                                        <span className="text-[10px] text-gray-400 font-bold mt-0.5">PNG, JPG formatında ekran görüntüsü</span>
                                                    </div>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                                                </label>
                                            )}
                                        </div>
                                    )}

                                    {/* File Submission */}
                                    {config.submissionType === 'file' && (
                                        <div className="w-full flex-1 flex flex-col justify-center">
                                            {uploadedFile ? (
                                                <div className="p-4 bg-blue-50/50 border-2 border-blue-200 rounded-2xl flex items-center justify-between">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                                            <File size={20} />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <span className="text-xs font-bold text-gray-800 block truncate">{uploadedFile.name}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold mt-0.5">{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => setUploadedFile(null)}
                                                        className="p-1.5 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-full aspect-video border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer bg-gray-50/50 hover:bg-blue-50/10 transition-all group">
                                                    <div className="w-12 h-12 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover:scale-105 group-hover:text-blue-500 transition-all shadow-sm">
                                                        <Upload size={20} />
                                                    </div>
                                                    <div className="text-center">
                                                        <span className="text-xs font-black text-gray-700 block">Ödev Dosyası Seçin</span>
                                                        <span className="text-[10px] text-gray-400 font-bold mt-0.5">PDF, ZIP, DOCX vb.</span>
                                                    </div>
                                                    <input type="file" className="hidden" onChange={handleFileChange} />
                                                </label>
                                            )}
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                disabled={
                                    isSubmitting ||
                                    (config.submissionType === 'text' && !textInput.trim()) ||
                                    (config.submissionType === 'code' && !codeValue.trim()) ||
                                    (config.submissionType === 'image' && !uploadedImage) ||
                                    (config.submissionType === 'file' && !uploadedFile)
                                }
                                onClick={handleSubmit}
                                className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:translate-y-[2px] transition-all shrink-0 ${
                                    isSubmitting 
                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none hover:translate-y-0' 
                                        : 'bg-green-500 text-white hover:bg-green-600 shadow-green-550/20'
                                }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
                                        <span>GÖNDERİLİYOR...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send size={16} />
                                        <span>ÖDEVİ TESLİM ET</span>
                                    </>
                                )}
                            </button>
                        </>
                    )}

                </div>
            </div>
        </div>
    );
};

export default StudentHomeworkView;
