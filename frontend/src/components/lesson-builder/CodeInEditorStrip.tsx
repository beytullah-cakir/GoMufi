import React from 'react';
import { Code2, ExternalLink, Check } from 'lucide-react';
import { openCodeInVSCode } from '../../vscodeBridge';

/**
 * Dar VS Code panelinde kod bloğunun yerine geçen şerit.
 *
 * NEDEN: web'de `Yazı | Kod` yan yana durmak zorunda, başka yer yok. VS Code'da
 * ise zaten bir kod editörü açık — panelin içinde ikinci bir kod ekranı çizmek
 * dar alanı iki kez harcamak demek. Kod gerçek editöre taşınınca panelin dar
 * olması sorun olmaktan çıkıyor.
 *
 * Kodun tamamen kaybolmaması önemli: ilk satırları burada kalıyor ki öğrenci
 * "hangi koddu bu" diye editöre gidip gelmek zorunda olmasın.
 */

interface CodeInEditorStripProps {
    code: string;
    language?: string;
    title?: string;
}

const CodeInEditorStrip: React.FC<CodeInEditorStripProps> = ({ code, language = 'python', title }) => {
    const [opened, setOpened] = React.useState(false);
    const preview = React.useMemo(
        () => code.split('\n').filter(l => l.trim()).slice(0, 3),
        [code],
    );

    return (
        <div className="w-full h-full flex flex-col rounded-2xl border-2 border-slate-700 bg-[#131a33] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#0f1529] border-b border-slate-700/60 shrink-0">
                <Code2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 truncate">
                    {title || language}
                </span>
            </div>

            <div className="flex-1 min-h-0 px-3 py-2 overflow-hidden">
                {preview.map((line, i) => (
                    <div key={i} className="text-[11px] font-mono text-slate-400 truncate leading-relaxed">
                        {line}
                    </div>
                ))}
                {code.split('\n').filter(l => l.trim()).length > preview.length && (
                    <div className="text-[11px] font-mono text-slate-600 leading-relaxed">…</div>
                )}
            </div>

            <button
                type="button"
                onClick={() => {
                    if (openCodeInVSCode(code, language, title)) setOpened(true);
                }}
                className="shrink-0 m-2 mt-0 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 border-b-[3px] border-sky-700 active:border-b-0 active:translate-y-[3px] text-white text-xs font-black transition-all cursor-pointer"
            >
                {opened
                    ? (<><Check className="w-3.5 h-3.5" /> Editörde açıldı</>)
                    : (<><ExternalLink className="w-3.5 h-3.5" /> Kodu editörde aç</>)}
            </button>
        </div>
    );
};

export default CodeInEditorStrip;
