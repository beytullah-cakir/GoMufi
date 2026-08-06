import React from 'react';
import { Plus, GripVertical } from 'lucide-react';
import { resolveLayout } from './grid';
import type { SlideLayout } from './grid';

/**
 * Builder tuvalinde grid hücrelerinin görünür ve düzenlenebilir kılınması.
 *
 * NEDEN GEREKLİ: grid'in bedeli, öğretmenin artık istediği yere bırakamaması.
 * Bunu kabul edilebilir kılan tek şey yapının GÖRÜNÜR olması — nereye
 * bırakabileceğini görmüyorsa sistem ona keyfi geliyor.
 *
 * Aynı veri modeli iki farklı şey gibi hissettirebiliyor: blokları sürükleyip
 * bırakıyorsa öğretmen buna "tasarım" der, kenar çubuğundan kolon seçiyorsa
 * "form doldurma" der ve sistemden soğur. Bu yüzden hücreler tıklanabilir,
 * bloklar sürüklenebilir, ayıraçlar çekilebilir.
 */

interface GridOverlayProps {
    layout: SlideLayout;
    /** Yerleşimde yeri olan ve İÇİ DOLU blokların id'leri. */
    filledBlockIds: Set<string>;
    /** Boş bir yuvaya tıklandı — o blok seçilir ve yazmaya hazır hale gelir. */
    onPickSlot: (blockId: string) => void;
    /** Sürüklenen bir blok hücreye bırakıldı. */
    onMoveBlock: (blockId: string, targetCellId: string) => void;
    /** Kolon ayıracı sürüklendi (sahne pikseli cinsinden kayma). */
    onResizeColumns: (rowId: string, leftCellId: string, deltaPx: number) => void;
    /** Tuvalin zoom katsayısı — fare kaymasını sahne koordinatına çevirmek için. */
    scale: number;
}

const GridOverlay: React.FC<GridOverlayProps> = ({
    layout, filledBlockIds, onPickSlot, onMoveBlock, onResizeColumns, scale,
}) => {
    const resolved = React.useMemo(() => resolveLayout(layout, 'stage'), [layout]);
    // Bir blok taşınırken TÜM hücreler bırakma hedefi olur. Sürekli açık
    // bıraksaydık, bu şeffaf katman normal tıklamaları yutardı.
    const [draggingId, setDraggingId] = React.useState<string | null>(null);
    const [hoverCell, setHoverCell] = React.useState<string | null>(null);

    /** Ayıraç sürükleme: fare hareketini pencere düzeyinde izler. */
    const startResize = (e: React.MouseEvent, rowId: string, leftCellId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        let last = 0;

        const onMove = (ev: MouseEvent) => {
            // Zoom'a bölüyoruz: %50 zoom'da 10px fare hareketi 20px sahne demek.
            const deltaPx = (ev.clientX - startX) / (scale || 1);
            onResizeColumns(rowId, leftCellId, deltaPx - last);
            last = deltaPx;
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    };

    return (
        <>
            {/* HÜCRE ÇERÇEVELERİ — yapıyı göstermek için, etkileşimsiz. */}
            {Object.entries(resolved.cells).map(([cellId, rect]) => (
                <div
                    key={cellId}
                    className={`absolute pointer-events-none rounded-xl border border-dashed z-0 transition-colors ${
                        hoverCell === cellId ? 'border-emerald-400 bg-emerald-50/40' : 'border-indigo-300/50'
                    }`}
                    style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
                />
            ))}

            {/* BIRAKMA HEDEFLERİ — yalnızca bir blok taşınırken açılır. */}
            {draggingId && Object.entries(resolved.cells).map(([cellId, rect]) => (
                <div
                    key={`drop-${cellId}`}
                    className="absolute z-[40]"
                    style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
                    onDragOver={(e) => { e.preventDefault(); setHoverCell(cellId); }}
                    onDragLeave={() => setHoverCell((c) => (c === cellId ? null : c))}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (draggingId) onMoveBlock(draggingId, cellId);
                        setDraggingId(null);
                        setHoverCell(null);
                    }}
                />
            ))}

            {/* KOLON AYIRAÇLARI — komşu iki kolon arasında yer alışverişi. */}
            {layout.rows.flatMap((row) =>
                row.cells.slice(0, -1).map((cell) => {
                    const rect = resolved.cells[cell.id];
                    if (!rect) return null;
                    return (
                        <div
                            key={`sash-${cell.id}`}
                            onMouseDown={(e) => startResize(e, row.id, cell.id)}
                            className="absolute z-[45] flex items-center justify-center cursor-col-resize group"
                            style={{
                                left: rect.x + rect.width - layout.gap / 2 - 6,
                                top: rect.y + rect.height / 2 - 22,
                                width: 12 + layout.gap,
                                height: 44,
                            }}
                        >
                            <div className="w-1.5 h-11 rounded-full bg-indigo-200 group-hover:bg-indigo-500 transition-colors flex items-center justify-center">
                                <GripVertical className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>
                    );
                }),
            )}

            {layout.rows.flatMap((row) =>
                row.cells.flatMap((cell) =>
                    cell.blocks.map((block) => {
                        const rect = resolved.rects[block.id];
                        if (!rect) return null;

                        // BOŞ YUVA: tıklanabilir "+" alanı.
                        if (!filledBlockIds.has(block.id)) {
                            return (
                                <button
                                    key={block.id}
                                    type="button"
                                    onMouseDown={(e) => e.stopPropagation()}
                                    onClick={(e) => { e.stopPropagation(); onPickSlot(block.id); }}
                                    className="absolute z-[5] rounded-xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center gap-1 group cursor-pointer"
                                    style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }}
                                >
                                    <Plus className="w-6 h-6 text-indigo-300 group-hover:text-indigo-500 transition-colors" />
                                    <span className="text-[11px] font-bold text-indigo-300 group-hover:text-indigo-500 transition-colors">
                                        Blok ekle
                                    </span>
                                    {cell.narrow === 'hide' && (
                                        <span className="text-[9px] font-bold uppercase tracking-wider text-amber-500/70">
                                            dar modda gizli
                                        </span>
                                    )}
                                </button>
                            );
                        }

                        // DOLU BLOK: sol üstte taşıma tutamağı. Bloğun kendisini
                        // sürüklenebilir yapmıyoruz — o zaman metin seçmek,
                        // kod yazmak, quiz'e tıklamak imkânsızlaşırdı.
                        return (
                            <div
                                key={`grip-${block.id}`}
                                draggable
                                onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.effectAllowed = 'move';
                                    // Araç çubuğundan gelen bırakmalarla karışmasın diye
                                    // 'type' YAZILMIYOR; handleCanvasDrop onu arıyor.
                                    e.dataTransfer.setData('moveBlockId', block.id);
                                    setDraggingId(block.id);
                                }}
                                onDragEnd={() => { setDraggingId(null); setHoverCell(null); }}
                                onMouseDown={(e) => e.stopPropagation()}
                                title="Bu bloğu başka bir hücreye taşı"
                                className="absolute z-[46] w-6 h-6 rounded-lg bg-white/80 border border-indigo-200 shadow-sm flex items-center justify-center cursor-grab active:cursor-grabbing opacity-40 hover:opacity-100 hover:bg-indigo-50 hover:border-indigo-400 transition-all"
                                style={{ left: rect.x + 4, top: rect.y + 4 }}
                            >
                                <GripVertical className="w-3.5 h-3.5 text-indigo-400" />
                            </div>
                        );
                    }),
                ),
            )}
        </>
    );
};

export default GridOverlay;
