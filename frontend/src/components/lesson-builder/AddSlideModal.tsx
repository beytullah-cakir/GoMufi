import React from 'react';
import { Gamepad2, LayoutTemplate } from 'lucide-react';

interface AddSlideModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSlide: (type: 'normal' | 'game') => void;
}

const AddSlideModal: React.FC<AddSlideModalProps> = ({ isOpen, onClose, onAddSlide }) => {
    if (!isOpen) return null;

    return (
        <div className="absolute inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-8 border-b border-gray-100 text-center">
                    <h2 className="text-2xl font-black text-gray-800 font-display">Yeni Slayt Ekle</h2>
                    <p className="text-gray-500 mt-2">Ne tür bir içerik oluşturmak istiyorsun?</p>
                </div>
                <div className="p-8 grid grid-cols-2 gap-4">
                    <button
                        onClick={() => onAddSlide('normal')}
                        className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-50 hover:bg-indigo-50 border-2 border-gray-200 hover:border-indigo-500 rounded-2xl transition-all group"
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <LayoutTemplate className="w-8 h-8 text-gray-400 group-hover:text-indigo-500" />
                        </div>
                        <span className="font-bold text-gray-600 group-hover:text-indigo-600">Boş Sayfa</span>
                    </button>

                    <button
                        onClick={() => onAddSlide('game')}
                        className="flex flex-col items-center justify-center gap-4 p-8 bg-gray-50 hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-500 rounded-2xl transition-all group"
                    >
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                            <Gamepad2 className="w-8 h-8 text-gray-400 group-hover:text-purple-500" />
                        </div>
                        <span className="font-bold text-gray-600 group-hover:text-purple-600">Eşleştirme Oyunu</span>
                    </button>
                </div>
                <div className="p-4 bg-gray-50 flex justify-center">
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold text-sm">İptal</button>
                </div>
            </div>
        </div>
    );
};

export default AddSlideModal;
