import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight, Calculator, Music, Languages, Palette, Code, Dumbbell, Star, ChevronLeft, Briefcase, Clock, Users, Trophy } from 'lucide-react';

interface QuizModalProps {
    isOpen: boolean;
    onClose: () => void;
    userType?: 'student' | 'instructor';
}

const QuizModal: React.FC<QuizModalProps> = ({ isOpen, onClose, userType = 'student' }) => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [selections, setSelections] = useState<any>({});
    const [isLoading, setIsLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSelections({});
            setShowResults(false);
            setIsLoading(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSelect = (key: string, value: string) => {
        setSelections({ ...selections, [key]: value });
        nextStep();
    };

    const nextStep = () => {
        if (step < 3) {
            setStep(step + 1);
        } else {
            setIsLoading(true);
            setTimeout(() => {
                setIsLoading(false);
                setShowResults(true);
            }, 1500);
        }
    };

    const prevStep = () => {
        if (step > 1 && !showResults) setStep(step - 1);
    };

    // --- STUDENT STEPS ---
    const renderStudentStep1 = () => (
        <div className="space-y-4 animate-fade-in">
            <h3 className="text-2xl font-bold text-gray-900 text-center mb-6">Ders kimin için?</h3>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => handleSelect('who', 'myself')}
                    className="p-6 border-2 border-gray-100 rounded-2xl hover:border-indigo-600 hover:bg-indigo-50 transition-all group text-left"
                >
                    <div className="text-3xl mb-3">🙋‍♂️</div>
                    <div className="font-bold text-gray-800 group-hover:text-indigo-600">Kendim İçin</div>
                    <div className="text-sm text-gray-500">Yeni bir hobi veya kariyer hedefi</div>
                </button>
                <button
                    onClick={() => handleSelect('who', 'child')}
                    className="p-6 border-2 border-gray-100 rounded-2xl hover:border-purple-600 hover:bg-purple-50 transition-all group text-left"
                >
                    <div className="text-3xl mb-3">👶</div>
                    <div className="font-bold text-gray-800 group-hover:text-purple-600">Çocuğum İçin</div>
                    <div className="text-sm text-gray-500">Okul takviyesi veya gelişim</div>
                </button>
            </div>
        </div>
    );

    // Used for both Student Step 2 and Instructor Step 1 (with logic)
    const renderSubjectSelection = (isInstructor = false) => (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center mb-6">
                {!isInstructor && <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>}
                <h3 className="text-2xl font-bold text-gray-900 text-center flex-1">{isInstructor ? 'Hangi alanda ders veriyorsun?' : 'Hangi konuyla ilgileniyorsun?'}</h3>
                {!isInstructor && <div className="w-10"></div>}
            </div>

            <div className="grid grid-cols-3 gap-4">
                {[
                    { id: 'math', label: 'Matematik', icon: <Calculator className="w-6 h-6" />, color: 'text-blue-500 bg-blue-50' },
                    { id: 'music', label: 'Müzik', icon: <Music className="w-6 h-6" />, color: 'text-pink-500 bg-pink-50' },
                    { id: 'lang', label: 'Dil', icon: <Languages className="w-6 h-6" />, color: 'text-orange-500 bg-orange-50' },
                    { id: 'art', label: 'Sanat', icon: <Palette className="w-6 h-6" />, color: 'text-purple-500 bg-purple-50' },
                    { id: 'code', label: 'Yazılım', icon: <Code className="w-6 h-6" />, color: 'text-indigo-500 bg-indigo-50' },
                    { id: 'sport', label: 'Spor', icon: <Dumbbell className="w-6 h-6" />, color: 'text-green-500 bg-green-50' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => handleSelect('subject', item.id)}
                        className="flex flex-col items-center p-4 border border-gray-100 rounded-2xl hover:shadow-md hover:border-indigo-300 transition-all"
                    >
                        <div className={`p-3 rounded-full ${item.color} mb-3`}>{item.icon}</div>
                        <span className="font-bold text-gray-700 text-sm">{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderStudentStep3 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center mb-6">
                <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                <h3 className="text-2xl font-bold text-gray-900 text-center flex-1">Hedefin ne?</h3>
                <div className="w-10"></div>
            </div>

            <div className="space-y-3">
                {['Okul notlarını yükseltmek', 'Yeni bir hobi edinmek', 'Sınavlara hazırlık', 'Mesleki gelişim'].map((goal) => (
                    <button
                        key={goal}
                        onClick={() => handleSelect('goal', goal)}
                        className="w-full text-left p-4 border border-gray-100 rounded-xl font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-500 hover:text-indigo-700 transition-colors flex items-center justify-between group"
                    >
                        {goal}
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-indigo-500" />
                    </button>
                ))}
            </div>
        </div>
    );

    // --- INSTRUCTOR STEPS ---
    const renderInstructorStep2 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center mb-6">
                <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                <h3 className="text-2xl font-bold text-gray-900 text-center flex-1">Deneyimin ne kadar?</h3>
                <div className="w-10"></div>
            </div>

            <div className="space-y-3">
                {[
                    { label: '0-2 Yıl (Yeni Başlayan)', icon: <Star className="w-5 h-5 text-gray-400" /> },
                    { label: '2-5 Yıl (Deneyimli)', icon: <Star className="w-5 h-5 text-indigo-500" /> },
                    { label: '5+ Yıl (Uzman)', icon: <Trophy className="w-5 h-5 text-yellow-500" /> },
                    { label: 'Sertifikalı Eğitmen', icon: <Briefcase className="w-5 h-5 text-blue-500" /> }
                ].map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelect('experience', item.label)}
                        className="w-full text-left p-4 border border-gray-100 rounded-xl font-medium text-gray-700 hover:bg-purple-50 hover:border-purple-500 hover:text-purple-700 transition-colors flex items-center gap-3 group"
                    >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-purple-500" />
                    </button>
                ))}
            </div>
        </div>
    );

    const renderInstructorStep3 = () => (
        <div className="space-y-4 animate-fade-in">
            <div className="flex items-center mb-6">
                <button onClick={prevStep} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft /></button>
                <h3 className="text-2xl font-bold text-gray-900 text-center flex-1">GoMufi'de hedefin ne?</h3>
                <div className="w-10"></div>
            </div>

            <div className="space-y-3">
                {[
                    { label: 'Ek gelir elde etmek', icon: <Clock className="w-5 h-5" /> },
                    { label: 'Tam zamanlı kariyer', icon: <Briefcase className="w-5 h-5" /> },
                    { label: 'Öğrenci ağımı büyütmek', icon: <Users className="w-5 h-5" /> },
                ].map((item, idx) => (
                    <button
                        key={idx}
                        onClick={() => handleSelect('goal', item.label)}
                        className="w-full text-left p-4 border border-gray-100 rounded-xl font-medium text-gray-700 hover:bg-green-50 hover:border-green-500 hover:text-green-700 transition-colors flex items-center gap-3 group"
                    >
                        {item.icon}
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-green-500" />
                    </button>
                ))}
            </div>
        </div>
    );

    // --- COMMON ---
    const renderLoading = () => (
        <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <div className="w-16 h-16 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-6"></div>
            <h3 className="text-xl font-bold text-gray-800">
                {userType === 'student' ? 'En uygun eğitmenler aranıyor...' : 'Profilin analize ediliyor...'}
            </h3>
            <p className="text-gray-500 mt-2">Yapay zeka analiz yapıyor 🤖</p>
        </div>
    );

    const renderResults = () => {
        if (userType === 'student') {
            return (
                <div className="animate-fade-in">
                    <h3 className="text-2xl font-black text-gray-900 text-center mb-2">🎉 Eşleşme Tamamlandı!</h3>
                    <p className="text-gray-500 text-center mb-8">Senin için en uygun 3 eğitmeni bulduk.</p>

                    <div className="space-y-4 mb-8">
                        {[
                            { name: 'Selin B.', title: 'Deneyimli Piyano Eğitmeni', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Selin' },
                            { name: 'Mert K.', title: 'Konservatvuar Mezunu', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mert' },
                            { name: 'Ayşe T.', title: 'Çocuklar için Müzik', img: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ayse2' },
                        ].map((instructor, idx) => (
                            <div key={idx} className="flex items-center gap-4 p-3 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-colors">
                                <img src={instructor.img} className="w-12 h-12 rounded-full bg-gray-100" />
                                <div className="flex-1">
                                    <h4 className="font-bold text-gray-900">{instructor.name}</h4>
                                    <p className="text-xs text-indigo-600 font-bold">{instructor.title}</p>
                                </div>
                                <div className="flex items-center text-yellow-500 text-xs font-bold gap-1">
                                    <Star className="w-4 h-4 fill-current" /> 5.0
                                </div>
                            </div>
                        ))}
                    </div>

                    <button onClick={onClose} className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
                        Tüm Eşleşmeleri Gör
                    </button>
                </div>
            );
        } else {
            return (
                <div className="animate-fade-in text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                        <Trophy className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 mb-2">Harika bir eşleşme!</h3>
                    <p className="text-gray-500 mb-4 px-4">
                        Senin uzmanlık alanına ihtiyaç duyan <strong className="text-indigo-600">450+ öğrenci</strong> seni bekliyor.
                    </p>
                    <div className="bg-indigo-50 p-4 rounded-xl mb-8 mx-4">
                        <p className="text-sm font-bold text-indigo-900">🚀 Potansiyel Gelir: <span className="text-green-600">₺15.000 / Ay</span></p>
                        <p className="text-xs text-indigo-400 mt-1">*Tahmini kazanç</p>
                    </div>

                    <button
                        onClick={() => navigate('/auth')}
                        className="w-full py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg shadow-purple-200 hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                    >
                        Hemen Eğitmen Profilini Oluştur <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden relative min-h-[500px] flex flex-col">
                {/* Header */}
                {!showResults && !isLoading && (
                    <div className="px-8 pt-6 flex justify-between items-center">
                        <div className="flex gap-2">
                            {[1, 2, 3].map(i => (
                                <div key={i} className={`h-2 w-8 rounded-full transition-colors ${i <= step ? (userType === 'student' ? 'bg-indigo-600' : 'bg-purple-600') : 'bg-gray-100'}`}></div>
                            ))}
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="p-8 flex-1 flex flex-col justify-center">
                    {isLoading ? renderLoading() : showResults ? renderResults() : (
                        <>
                            {userType === 'student' ? (
                                <>
                                    {step === 1 && renderStudentStep1()}
                                    {step === 2 && renderSubjectSelection()}
                                    {step === 3 && renderStudentStep3()}
                                </>
                            ) : (
                                <>
                                    {/* Instructor Flow */}
                                    {step === 1 && renderSubjectSelection(true)}
                                    {step === 2 && renderInstructorStep2()}
                                    {step === 3 && renderInstructorStep3()}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QuizModal;
