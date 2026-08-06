import React from 'react';
import { Monitor, PanelRight } from 'lucide-react';
import type { LayoutMode } from './grid';

/**
 * Sahne / Dar mod önizleme anahtarı.
 *
 * NEDEN GEREKLİ: grid'in bedeli, öğretmenin artık istediği yere bırakamaması.
 * Bunu kabul edilebilir kılan şey, karşılığında ne kazandığını GÖREBİLMESİ.
 * Dar modda ne olacağını göremezse yeniden akış onun için öngörülemez bir şey
 * kalır ve sistemden soğur.
 *
 * Öğretmen 16:9 sahne katmanında ÇALIŞMAYA devam ediyor — bu düğme bir düzenleme
 * kipi değil, yalnızca önizleme. Dar modda düzenlemeye izin vermek iki ayrı
 * tasarım demek olurdu; tek doğruluk kaynağını korumak için kasıtlı olarak
 * salt görüntü.
 */

interface LayoutModeToggleProps {
    mode: LayoutMode;
    setMode: (m: LayoutMode) => void;
    /** Grid'i olmayan slaytlarda anahtar anlamsız — kapalı gösterilir. */
    disabled?: boolean;
}

const LayoutModeToggle: React.FC<LayoutModeToggleProps> = ({ mode, setMode, disabled }) => (
    <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center bg-white rounded-2xl shadow-xl border-2 border-gray-100 p-1.5 gap-1 ${
            disabled ? 'opacity-40 pointer-events-none' : ''
        }`}
        title={disabled ? 'Bu slaytta grid yok — dar mod önizlemesi yalnızca bölünmüş düzenlerde çalışır.' : undefined}
    >
        <button
            type="button"
            onClick={() => setMode('stage')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                mode === 'stage' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
            <Monitor className="w-4 h-4" /> Sınıf 16:9
        </button>
        <button
            type="button"
            onClick={() => setMode('narrow')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-colors ${
                mode === 'narrow' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
        >
            <PanelRight className="w-4 h-4" /> VS Code
        </button>
    </div>
);

export default LayoutModeToggle;
