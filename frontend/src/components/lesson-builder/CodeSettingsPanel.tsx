import React from 'react';
import { Settings, Eye, MessageCircle, AlertCircle } from 'lucide-react';
import type { SlideElement } from './types';

interface CodeSettingsPanelProps {
    element: SlideElement;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
}

const CodeSettingsPanel: React.FC<CodeSettingsPanelProps> = ({ element, updateElement }) => {

    const handleConfigUpdate = (key: string, value: any) => {
        updateElement(element.id, {
            codeConfig: {
                ...element.codeConfig,
                [key]: value
            }
        });
    };

    // Styling constants matching the previous dark theme default or light
    // We'll stick to a clean sidebar look, usually light in builder context?
    // User's sidebar (slide strip) is white. Let's make this white too.
    const inputBg = '#ffffff';
    const inputBorder = '#e5e7eb';
    const inputText = '#374151';

    return (
        <div className="flex flex-col gap-5 p-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3 mb-1">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                    <Settings className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                    <h3 className="font-bold text-gray-800 text-xs uppercase tracking-wide">Yapılandırma</h3>
                    <p className="text-[10px] text-gray-400">Element davranışlarını özelleştirin</p>
                </div>
            </div>

            {/* Language Selector */}
            <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <AlertCircle className="w-3 h-3 text-emerald-500" />
                    Dil (Language)
                </label>
                <select
                    className="w-full rounded-md p-2 text-xs outline-none border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-gray-50/50 hover:bg-white"
                    value={element.codeConfig?.language || 'python'}
                    onChange={(e) => handleConfigUpdate('language', e.target.value)}
                >
                    <option value="python">Python 3</option>
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="cpp">C++</option>
                </select>
            </div>

            {/* Expected Output */}
            <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <Eye className="w-3 h-3 text-indigo-500" />
                    Beklenen Çıktı
                </label>
                <textarea
                    className="w-full h-20 rounded-md p-2 text-xs font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all resize-none border border-gray-200 bg-gray-50/50 hover:bg-white placeholder:text-gray-300"
                    placeholder="Örn: Hello World"
                    value={element.codeConfig?.expectedOutput || ''}
                    onChange={(e) => handleConfigUpdate('expectedOutput', e.target.value)}
                />
            </div>

            {/* Hint */}
            <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <MessageCircle className="w-3 h-3 text-amber-500" />
                    İpucu (Hint)
                </label>
                <textarea
                    className="w-full h-16 rounded-md p-2 text-xs font-sans focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none border border-gray-200 bg-gray-50/50 hover:bg-white placeholder:text-gray-300"
                    placeholder="Öğrenci için ipucu..."
                    value={element.codeConfig?.hint || ''}
                    onChange={(e) => handleConfigUpdate('hint', e.target.value)}
                />
            </div>

            {/* Autocomplete Toggle */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 cursor-pointer select-none" onClick={() => handleConfigUpdate('enableAutocomplete', !element.codeConfig?.enableAutocomplete)}>
                    Otomatik Tamamlama
                </label>
                <div
                    className={`relative w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 ease-in-out ${element.codeConfig?.enableAutocomplete ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    onClick={() => handleConfigUpdate('enableAutocomplete', !element.codeConfig?.enableAutocomplete)}
                >
                    <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform duration-200 ${element.codeConfig?.enableAutocomplete ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
            </div>
        </div>
    );
};

export default CodeSettingsPanel;
