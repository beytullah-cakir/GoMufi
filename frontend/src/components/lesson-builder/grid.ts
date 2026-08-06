import type { Slide, SlideElement } from './types';

/**
 * Grid yerleşim motoru.
 *
 * NEDEN VAR: slaytlar iki farklı yüzeyde gösteriliyor — sınıfta 16:9 projeksiyon,
 * VS Code'da dar bir panel. Mutlak konumlandırmada (x/y/width/height) bir tasarım
 * yalnızca tasarlandığı orana uyar; dar panelde her şey birlikte küçülüp okunmaz
 * hale gelir. Grid, yerleşimi piksel yerine YAPI olarak sakladığı için aynı
 * slayt iki yüzeyde de yeniden çözümlenebiliyor.
 *
 * NEDEN CanvasElement'E DOKUNMUYOR: motor bir render bileşeni değil, saf bir
 * çözümleyici. Girdi olarak yapıyı alır, çıktı olarak her elemana hesaplanmış
 * x/y/width/height yazar. CanvasElement bu değerleri zaten mutlak konum olarak
 * kullanıyor — yani kod widget'ı, oyunlar, quiz'ler hiçbir değişiklik olmadan
 * grid içinde de çalışır. Tek doğruluk kaynağı korunur.
 *
 * NEDEN AĞIRLIK, PİKSEL DEĞİL: öğretmen "sol taraf biraz daha geniş" der,
 * "sol taraf 747 piksel" demez. Ağırlık iki yüzeyde de anlamlıdır, piksel değil.
 */

/** Sahne (16:9) tuval ölçüsü. Mevcut mutlak slaytlarla aynı taban. */
export const STAGE_WIDTH = 1280;
export const STAGE_HEIGHT = 720;

/**
 * Dar mod taban genişliği.
 *
 * 1280 değil 600: dar panelde 1280 tabanlı bir tuval %47 ölçekle çizilirdi ve
 * 32px başlık 15px'e düşerdi. Tabanı gerçek panel genişliğine yaklaştırınca
 * ölçek ~1.0 kalıyor, yazılar tasarlandıkları boyutta çiziliyor.
 */
export const NARROW_WIDTH = 600;

/**
 * Bu genişliğin altında akış moduna geçilir.
 *
 * Orana değil GENİŞLİĞE bakıyoruz: okunabilirliği belirleyen şey genişlik.
 * 1:1 bir alan 900px'de rahat, 500px'de değil — oran ikisinde de aynı.
 */
export const NARROW_BREAKPOINT = 720;

/** Dar modda bir hücrenin inebileceği en küçük yükseklik. */
const MIN_NARROW_CELL = 120;

export type LayoutMode = 'stage' | 'narrow';

/** Hücre içindeki tek bir blok: bir SlideElement'e işaret eder. */
export interface GridBlock {
    /** SlideElement.id */
    id: string;
    /** Hücre yüksekliğinden aldığı pay. */
    weight: number;
}

export interface GridCell {
    id: string;
    /** Satır genişliğinden aldığı pay. */
    weight: number;
    /** Üstten alta bloklar. */
    blocks: GridBlock[];
    /**
     * Dar modda ne olacağı. Şimdilik iki seçenek — üçüncüsü ("üste çıksın")
     * öğretmeni her hücrede karar vermeye zorlar, karşılığında az şey verir.
     */
    narrow?: 'keep' | 'hide';
}

export interface GridRow {
    id: string;
    /** Tuval yüksekliğinden aldığı pay. */
    weight: number;
    cells: GridCell[];
}

export interface SlideLayout {
    rows: GridRow[];
    /** Hücreler arası boşluk (sahne piksel cinsinden). */
    gap: number;
    /** Tuval kenar boşluğu. */
    padding: number;
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ResolvedLayout {
    /** Blok id → hesaplanmış dikdörtgen. */
    rects: Record<string, Rect>;
    /** Çözümlenen tuvalin ölçüsü. */
    width: number;
    height: number;
    /** Hücre id → dikdörtgen. Builder'da boş hücreleri çizmek için. */
    cells: Record<string, Rect>;
    /** Dar modda gizlenen blok id'leri. */
    hidden: string[];
}

const sum = (values: number[]): number => values.reduce((a, b) => a + b, 0);

/** Ağırlıkları toplam uzunluğa böler. Sıfır/eksi ağırlıklar 1 sayılır. */
function share(weights: number[], total: number, gap: number): number[] {
    if (weights.length === 0) return [];
    const safe = weights.map((w) => (w > 0 ? w : 1));
    const usable = total - gap * (safe.length - 1);
    const whole = sum(safe);
    return safe.map((w) => Math.max(0, (usable * w) / whole));
}

/**
 * Sahne (16:9) çözümlemesi. Satırlar 720'yi, hücreler satır genişliğini,
 * bloklar hücre yüksekliğini ağırlıklarına göre paylaşır.
 *
 * Yükseklik sabit ve içerik ölçülmüyor — bu bilinçli. Sahne modu sınıfta
 * projeksiyonda gösteriliyor; orada kaydırma kabul edilemez, çünkü arka
 * sıradaki öğrenci alt kısmı hiç görmez. Sabit çerçeve tek doğru davranış.
 */
function resolveStage(layout: SlideLayout): ResolvedLayout {
    const { gap, padding } = layout;
    const rects: Record<string, Rect> = {};
    const cells: Record<string, Rect> = {};

    const innerW = STAGE_WIDTH - padding * 2;
    const innerH = STAGE_HEIGHT - padding * 2;
    const rowHeights = share(layout.rows.map((r) => r.weight), innerH, gap);

    let y = padding;
    layout.rows.forEach((row, ri) => {
        const rowH = rowHeights[ri];
        const cellWidths = share(row.cells.map((c) => c.weight), innerW, gap);

        let x = padding;
        row.cells.forEach((cell, ci) => {
            const cellW = cellWidths[ci];
            cells[cell.id] = { x, y, width: cellW, height: rowH };

            const blockHeights = share(cell.blocks.map((b) => b.weight), rowH, gap);
            let by = y;
            cell.blocks.forEach((block, bi) => {
                rects[block.id] = { x, y: by, width: cellW, height: blockHeights[bi] };
                by += blockHeights[bi] + gap;
            });

            x += cellW + gap;
        });

        y += rowH + gap;
    });

    return { rects, cells, width: STAGE_WIDTH, height: STAGE_HEIGHT, hidden: [] };
}

/**
 * Dar mod çözümlemesi: kolonlar alt alta iner.
 *
 * Kural tek cümle: "satırlar aynı kalır, kolonlar alt alta iner." Öğretmenin
 * bir kez öğrenip tasarlarken kafasında canlandırabileceği bir kural olması
 * şart — serbest yerleşimde bu mümkün değildi, grid'in asıl kazancı bu.
 *
 * Hücre yüksekliği sahne modundaki yüksekliğinden alınır. Oranı korumak
 * (h * W_dar / w_sahne) dar bir kolonu aşırı uzatırdı; oysa kolon genişleyince
 * metin DAHA AZ yer ister. Sahne yüksekliğini taşımak bu yüzden hem basit hem
 * cömert — hiçbir şey kırpılmaz.
 */
function resolveNarrow(layout: SlideLayout): ResolvedLayout {
    const stage = resolveStage(layout);
    const { gap, padding } = layout;
    const rects: Record<string, Rect> = {};
    const cells: Record<string, Rect> = {};
    const hidden: string[] = [];

    // Dar tabanı sahne tabanıyla aynı oranda boşluk kullansın.
    const k = NARROW_WIDTH / STAGE_WIDTH;
    const narrowGap = gap * k;
    const narrowPad = padding * k;
    const innerW = NARROW_WIDTH - narrowPad * 2;

    let y = narrowPad;
    layout.rows.forEach((row) => {
        row.cells.forEach((cell) => {
            if (cell.narrow === 'hide') {
                cell.blocks.forEach((b) => hidden.push(b.id));
                return;
            }

            const stageCell = stage.cells[cell.id];
            const cellH = Math.max(MIN_NARROW_CELL, (stageCell?.height ?? MIN_NARROW_CELL));
            cells[cell.id] = { x: narrowPad, y, width: innerW, height: cellH };

            const blockHeights = share(cell.blocks.map((b) => b.weight), cellH, narrowGap);
            let by = y;
            cell.blocks.forEach((block, bi) => {
                rects[block.id] = { x: narrowPad, y: by, width: innerW, height: blockHeights[bi] };
                by += blockHeights[bi] + narrowGap;
            });

            y += cellH + narrowGap;
        });
    });

    return {
        rects,
        cells,
        width: NARROW_WIDTH,
        height: Math.max(y - narrowGap + narrowPad, MIN_NARROW_CELL),
        hidden,
    };
}

export function resolveLayout(layout: SlideLayout, mode: LayoutMode): ResolvedLayout {
    return mode === 'narrow' ? resolveNarrow(layout) : resolveStage(layout);
}

/** Bir element id'sinin yerleşimde yeri var mı? */
export function isPlaced(layout: SlideLayout, elementId: string): boolean {
    return layout.rows.some((r) => r.cells.some((c) => c.blocks.some((b) => b.id === elementId)));
}

/**
 * Slaydın elemanlarını verilen mod için konumlandırılmış hale getirir.
 *
 * Yerleşimde yeri OLMAYAN elemanlar "süs katmanı" sayılır: sahne modunda
 * kendi x/y'leriyle olduğu gibi çizilir, dar modda düşer. Üst üste binen sarı
 * yapışkan not, kenardan sarkan maskot, eğik rozet — grid bunları öldürürdü ve
 * GoMufi'nin görünüşü tam olarak bunlardan oluşuyor. Serbest katman onları
 * kurtarıyor; dar modda kimse kaybettiklerini fark etmiyor.
 */
export function layoutElements(
    slide: Slide,
    mode: LayoutMode,
): { elements: SlideElement[]; width: number; height: number } {
    const layout = slide.layout;
    if (!layout) {
        // Grid'i olmayan slaytlar eski yolda kalır. Mevcut kütüphaneyi toptan
        // dönüştürmek, %15'i sessizce bozulmuş bir kütüphane demekti.
        return { elements: slide.elements, width: STAGE_WIDTH, height: STAGE_HEIGHT };
    }

    const resolved = resolveLayout(layout, mode);
    const hidden = new Set(resolved.hidden);
    const out: SlideElement[] = [];

    slide.elements.forEach((el) => {
        const rect = resolved.rects[el.id];
        if (rect) {
            // Grid'e yerleşmiş blok: hesaplanan dikdörtgeni alır. Rotasyon
            // sıfırlanır — grid içinde eğik duran bir kutu komşusunun üstüne taşar.
            out.push({ ...el, x: rect.x, y: rect.y, width: rect.width, height: rect.height, rotation: 0 });
            return;
        }
        if (hidden.has(el.id)) return;
        // Süs katmanı: dar modda düşer.
        if (mode === 'narrow') return;
        out.push(el);
    });

    return { elements: out, width: resolved.width, height: resolved.height };
}

/** Ölçüye göre hangi modda çizileceğine karar verir. */
export const modeForWidth = (width: number): LayoutMode =>
    width < NARROW_BREAKPOINT ? 'narrow' : 'stage';

/** Sahne koordinatındaki bir noktanın düştüğü hücre. Sürükle-bırak için. */
export function cellAtPoint(layout: SlideLayout, x: number, y: number): string | null {
    const resolved = resolveLayout(layout, 'stage');
    let fallback: string | null = null;
    for (const [id, r] of Object.entries(resolved.cells)) {
        if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return id;
        fallback = fallback ?? id;
    }
    // Boşluklara (gap/padding) denk gelen bırakmalar kaybolmasın: en yakın hücreye git.
    let best: string | null = null;
    let bestDist = Infinity;
    for (const [id, r] of Object.entries(resolved.cells)) {
        const dx = Math.max(r.x - x, 0, x - (r.x + r.width));
        const dy = Math.max(r.y - y, 0, y - (r.y + r.height));
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) { bestDist = dist; best = id; }
    }
    return best ?? fallback;
}

/**
 * Bloğu hücreye ekler.
 *
 * `replaceBlockId` verilirse o bloğun YERİNE geçer — boş bir yuvaya bırakma
 * böyle çalışır. Yeni blok sona eklenseydi, öğretmen "+"in üstüne bıraktığı
 * halde altında boş bir yuva kalmaya devam ederdi.
 */
export function addBlockToCell(
    layout: SlideLayout,
    cellId: string,
    blockId: string,
    replaceBlockId?: string,
): SlideLayout {
    return {
        ...layout,
        rows: layout.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => {
                if (cell.id !== cellId) return cell;
                if (replaceBlockId && cell.blocks.some((b) => b.id === replaceBlockId)) {
                    return {
                        ...cell,
                        blocks: cell.blocks.map((b) =>
                            b.id === replaceBlockId ? { ...b, id: blockId } : b),
                    };
                }
                return { ...cell, blocks: [...cell.blocks, { id: blockId, weight: 1 }] };
            }),
        })),
    };
}

/** Bloğu yerleşimden çıkarır (eleman silindiğinde yuvası da kapanmalı). */
export function removeBlock(layout: SlideLayout, blockId: string): SlideLayout {
    return {
        ...layout,
        rows: layout.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => ({
                ...cell,
                blocks: cell.blocks.filter((b) => b.id !== blockId),
            })),
        })),
    };
}

/**
 * Bloğu bulunduğu hücreden çıkarıp hedef hücreye taşır.
 *
 * Ağırlığı korunur: öğretmen bir bloğa "3 birim yer" verdiyse taşındığında da
 * o payı hak eder. Sıfırlansaydı taşıma sessizce bir yeniden boyutlandırma
 * olurdu ve nedeni görünmezdi.
 */
export function moveBlockToCell(
    layout: SlideLayout,
    blockId: string,
    targetCellId: string,
): SlideLayout {
    let carried: GridBlock | undefined;
    layout.rows.forEach((r) => r.cells.forEach((c) => {
        const found = c.blocks.find((b) => b.id === blockId);
        if (found) carried = found;
    }));
    if (!carried) return layout;

    return {
        ...layout,
        rows: layout.rows.map((row) => ({
            ...row,
            cells: row.cells.map((cell) => {
                const without = cell.blocks.filter((b) => b.id !== blockId);
                if (cell.id !== targetCellId) return { ...cell, blocks: without };
                return { ...cell, blocks: [...without, carried as GridBlock] };
            }),
        })),
    };
}

/**
 * Bir satırdaki komşu iki kolonun ağırlığını, aralarındaki ayıraç sürüklenerek
 * değiştirir. `deltaPx` sahne koordinatındaki yatay kayma.
 *
 * Toplam ağırlık korunuyor: yalnızca iki komşu arasında yer alışverişi oluyor.
 * Tek kolonun ağırlığını serbest bırakmak, satırdaki diğer TÜM kolonları da
 * kaydırırdı — öğretmen soldaki ayıracı çekerken en sağdaki kolonun neden
 * daraldığını anlayamazdı.
 */
export function resizeColumns(
    layout: SlideLayout,
    rowId: string,
    leftCellId: string,
    deltaPx: number,
): SlideLayout {
    const MIN_WEIGHT = 0.5;
    return {
        ...layout,
        rows: layout.rows.map((row) => {
            if (row.id !== rowId) return row;
            const i = row.cells.findIndex((c) => c.id === leftCellId);
            if (i < 0 || i + 1 >= row.cells.length) return row;

            const left = row.cells[i];
            const right = row.cells[i + 1];
            const pairWeight = left.weight + right.weight;
            const innerW = STAGE_WIDTH - layout.padding * 2 - layout.gap * (row.cells.length - 1);
            const totalWeight = sum(row.cells.map((c) => (c.weight > 0 ? c.weight : 1)));
            // Piksel kaymasını ağırlık cinsine çevir.
            const deltaWeight = (deltaPx / innerW) * totalWeight;

            const nextLeft = Math.min(pairWeight - MIN_WEIGHT, Math.max(MIN_WEIGHT, left.weight + deltaWeight));
            const cells = [...row.cells];
            cells[i] = { ...left, weight: nextLeft };
            cells[i + 1] = { ...right, weight: pairWeight - nextLeft };
            return { ...row, cells };
        }),
    };
}

/** Hücrenin içi tamamen boş olan ilk yuvası — bırakılan blok onun yerine geçer. */
export function emptySlotInCell(
    layout: SlideLayout,
    cellId: string,
    isFilled: (blockId: string) => boolean,
): string | undefined {
    for (const row of layout.rows) {
        for (const cell of row.cells) {
            if (cell.id !== cellId) continue;
            return cell.blocks.find((b) => !isFilled(b.id))?.id;
        }
    }
    return undefined;
}
