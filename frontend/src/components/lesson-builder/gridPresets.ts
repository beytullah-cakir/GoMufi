import type { GridCell, GridRow, SlideLayout } from './grid';

/**
 * Boş grid şablonları.
 *
 * Bunlar "hazır slayt" değil, boş İSKELET. Öğretmen bir düzen seçiyor, sonra
 * hücrelere blok koyuyor. Eski şablon kütüphanesi (2'ye bölünmüş, kod + açıklama…)
 * zaten bu yapıları dayatıyordu — sadece motorun okuyabileceği biçimde yazılı
 * değillerdi. Grid öğretmenden bir özgürlük almıyor, şablonun çoktan verdiği
 * kararı kayıt altına alıyor.
 */

let seq = 0;
/** Şablonlar birden çok kez örneklenebildiği için id'ler her çağrıda tazelenir. */
const uid = (prefix: string): string => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const cell = (weight: number, blocks = 0, narrow?: 'keep' | 'hide'): GridCell => ({
    id: uid('cell'),
    weight,
    // Boş iskelet: bloklar öğretmen ekledikçe dolar. `blocks` sayısı yalnızca
    // önceden bölünmüş hücrelerde (ör. sağda 3 parçalı sütun) yer ayırmak için.
    blocks: Array.from({ length: blocks }, () => ({ id: uid('slot'), weight: 1 })),
    narrow,
});

const row = (weight: number, cells: GridCell[]): GridRow => ({ id: uid('row'), weight, cells });

const layout = (rows: GridRow[]): SlideLayout => ({ rows, gap: 24, padding: 48 });

export interface GridPreset {
    key: string;
    label: string;
    hint: string;
    /** Önizleme çizimi için satır başına kolon ağırlıkları. */
    preview: number[][];
    build: () => SlideLayout;
}

export const GRID_PRESETS: GridPreset[] = [
    {
        key: 'single',
        label: 'Tek Alan',
        hint: 'Tam genişlik. Başlık slaytları ve büyük görseller için.',
        preview: [[1]],
        build: () => layout([row(1, [cell(1)])]),
    },
    {
        key: 'two-equal',
        label: '2\'ye Bölünmüş',
        hint: 'Eşit iki kolon. Dar modda alt alta iner.',
        preview: [[1, 1]],
        build: () => layout([row(1, [cell(1), cell(1)])]),
    },
    {
        key: 'two-wide-left',
        label: 'Geniş Sol (7:5)',
        hint: 'Solda anlatım, sağda destek. ANLA aşamasının varsayılanı.',
        preview: [[7, 5]],
        build: () => layout([row(1, [cell(7), cell(5)])]),
    },
    {
        key: 'two-wide-right',
        label: 'Geniş Sağ (5:7)',
        hint: 'Solda kısa metin, sağda geniş kod veya görsel.',
        preview: [[5, 7]],
        build: () => layout([row(1, [cell(5), cell(7)])]),
    },
    {
        key: 'three-equal',
        label: '3\'e Bölünmüş',
        hint: 'Üç eşit kolon. Karşılaştırma ve adım anlatımı için.',
        preview: [[1, 1, 1]],
        build: () => layout([row(1, [cell(1), cell(1), cell(1)])]),
    },
    {
        key: 'four-grid',
        label: '4\'e Bölünmüş (2×2)',
        hint: 'Dörtlü kare düzen. Dar modda dört blok alt alta iner.',
        preview: [[1, 1], [1, 1]],
        build: () => layout([
            row(1, [cell(1), cell(1)]),
            row(1, [cell(1), cell(1)]),
        ]),
    },
    {
        key: 'four-rows',
        label: '4 Satır',
        hint: 'Alt alta dört şerit. Adım adım listeler için.',
        preview: [[1], [1], [1], [1]],
        build: () => layout([row(1, [cell(1)]), row(1, [cell(1)]), row(1, [cell(1)]), row(1, [cell(1)])]),
    },
    {
        key: 'header-two',
        label: 'Başlık + 2 Kolon',
        hint: 'Üstte tam genişlik başlık, altta iki kolon.',
        preview: [[1], [1, 1]],
        build: () => layout([
            row(1, [cell(1)]),
            row(4, [cell(1), cell(1)]),
        ]),
    },
    {
        key: 'header-three',
        label: 'Başlık + 3 Kolon',
        hint: 'Üstte başlık, altta üç eşit kolon.',
        preview: [[1], [1, 1, 1]],
        build: () => layout([
            row(1, [cell(1)]),
            row(4, [cell(1), cell(1), cell(1)]),
        ]),
    },
    {
        key: 'code-right-stack',
        label: 'Açıklama + Kod',
        hint: 'Solda başlık ve açıklama üst üste, sağda kod. UYGULA için.',
        preview: [[5, 7]],
        build: () => layout([
            row(1, [
                // Sol kolon üç parçaya bölünmüş geliyor: başlık, açıklama, not.
                // Ağırlıklar başlığı küçük, açıklamayı büyük tutuyor.
                { id: uid('cell'), weight: 5, blocks: [
                    { id: uid('slot'), weight: 1 },
                    { id: uid('slot'), weight: 3 },
                    { id: uid('slot'), weight: 1 },
                ] },
                cell(7, 1),
            ]),
        ]),
    },
    {
        key: 'code-left-stack',
        label: 'Kod + Açıklama',
        hint: 'Solda kod, sağda başlık ve açıklama üst üste.',
        preview: [[7, 5]],
        build: () => layout([
            row(1, [
                cell(7, 1),
                { id: uid('cell'), weight: 5, blocks: [
                    { id: uid('slot'), weight: 1 },
                    { id: uid('slot'), weight: 3 },
                    { id: uid('slot'), weight: 1 },
                ] },
            ]),
        ]),
    },
    {
        key: 'header-code-note',
        label: 'Başlık + Kod + Not',
        hint: 'Üstte başlık, ortada kod, altta ipucu şeridi.',
        preview: [[1], [1], [1]],
        build: () => layout([
            row(1, [cell(1, 1)]),
            row(5, [cell(1, 1)]),
            // İpucu şeridi dar modda gizlenir: panelde yer darken önce süs gider.
            row(1, [cell(1, 1, 'hide')]),
        ]),
    },
];

export const presetByKey = (key: string): GridPreset | undefined =>
    GRID_PRESETS.find((p) => p.key === key);

/**
 * Şablonun hazır blok yuvaları için boş metin elemanları üretir.
 *
 * Yuvalar element'siz kalırsa hücre görünmez olurdu; öğretmen "burada bir şey
 * vardı" diye aramak zorunda kalır. Boş ama seçilebilir bir metin bloğu
 * koyuyoruz — tıklayıp yazmaya başlıyor.
 */
export function emptyBlocksFor(layout: SlideLayout): { id: string; type: 'text' }[] {
    const out: { id: string; type: 'text' }[] = [];
    layout.rows.forEach((r) => r.cells.forEach((c) => c.blocks.forEach((b) => {
        out.push({ id: b.id, type: 'text' });
    })));
    return out;
}
