import React from 'react';
import {
    Settings, Eye, MessageCircle, Code2, SquareTerminal, FileCode, Zap, Info,
} from 'lucide-react';
import type { SlideElement } from './types';
import { LANGUAGE_GROUPS, findLanguage, isTerminalView } from './codeLanguages';

interface CodeSettingsPanelProps {
    element: SlideElement;
    updateElement: (id: string, updates: Partial<SlideElement>) => void;
}

const CodeSettingsPanel: React.FC<CodeSettingsPanelProps> = ({ element, updateElement }) => {

    const handleConfigUpdate = (key: string, value: any) => {
        updateElement(element.id, {
            codeConfig: {
                ...element.codeConfig,
                [key]: value,
                // Dil değişince görünüm kilidi açılır: Bash seçen öğretmen
                // terminali, Python seçen editörü görmeli. Elle seçim yaptıysa
                // (mode) o seçim yalnızca o dil için geçerliydi.
                ...(key === 'language' ? { mode: undefined } : {}),
            },
        });
    };

    const lang = findLanguage(element.codeConfig?.language);
    const terminal = isTerminalView(element.codeConfig?.language, element.codeConfig?.mode);

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
                    <Code2 className="w-3 h-3 text-emerald-500" />
                    Dil (Language)
                </label>
                <select
                    className="w-full rounded-md p-2 text-xs outline-none border border-gray-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all bg-gray-50/50 hover:bg-white"
                    value={lang.id}
                    onChange={(e) => handleConfigUpdate('language', e.target.value)}
                >
                    {LANGUAGE_GROUPS.map((g) => (
                        <optgroup key={g.group} label={g.group}>
                            {g.items.map((l) => (
                                <option key={l.id} value={l.id}>{l.label}</option>
                            ))}
                        </optgroup>
                    ))}
                </select>

                {/* Dosya uzantısı ve çalıştırılabilirlik: öğretmen slaydı
                    kurarken "bu blok VS Code'da ne olacak" sorusunun cevabını
                    görmeli. Çalıştırılamayan diller yine editörde açılır. */}
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-400">
                    <span className="font-mono bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">
                        .{lang.ext}
                    </span>
                    {lang.runsInVSCode ? (
                        <span className="flex items-center gap-1 text-emerald-600">
                            <Zap className="w-3 h-3" /> VS Code'da çalıştırılabilir
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            <Info className="w-3 h-3" /> VS Code'da yalnızca açılır
                        </span>
                    )}
                </div>
            </div>

            {/* View mode: editör mü, terminal mi */}
            <div className="flex flex-col gap-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    <SquareTerminal className="w-3 h-3 text-sky-500" />
                    Görünüm
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                    {([
                        { key: 'editor', label: 'Editör', icon: FileCode },
                        { key: 'terminal', label: 'Terminal', icon: SquareTerminal },
                    ] as const).map(({ key, label, icon: Icon }) => {
                        const on = terminal === (key === 'terminal');
                        return (
                            <button
                                key={key}
                                onClick={() => handleConfigUpdate('mode', key)}
                                className={`flex items-center justify-center gap-1.5 rounded-md border py-1.5 text-[11px] font-bold transition-all ${
                                    on ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                       : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'}`}
                            >
                                <Icon className="w-3.5 h-3.5" /> {label}
                            </button>
                        );
                    })}
                </div>
                <p className="text-[10px] text-gray-400 leading-snug">
                    Terminal görünümü komut satırı içindir: her satır komut istemiyle
                    (<span className="font-mono">{findLanguage(lang.id).prompt || '$'}</span>) gösterilir,
                    öğrenci komutu kopyalayabilir. Örn. <span className="font-mono">pip install pandas</span>
                </p>
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
