import type { CodeHistory, EditOp } from './learningApi';

/**
 * Kod oynatma: yazım kaydını baştan uygulayıp istenen andaki metni ve her
 * parçanın kaynağını verir.
 *
 * Sunucudaki backend/code_provenance.py ile AYNI kurallar (tür kodu → kaynak,
 * biçimlendirme ve geri alma mirası). Sunucu yalnızca SON durumu saklıyor;
 * öğretmenin kaydırıcıyla gezdiği ara anlar burada hesaplanıyor.
 */

const KIND_SOURCES: Record<string, string> = {
    t: 'typed', a: 'autocomplete', p: 'paste_external', c: 'paste_internal',
    l: 'lesson', b: 'bulk', e: 'external',
};

export interface Segment { source: string; length: number }

export interface ReplayStep {
    /** Mutlak zaman (istemci saati, epoch ms). */
    at: number;
    file: string;
    kind: string;
    inserted: number;
    deleted: number;
}

export interface ReplayFrame {
    text: string;
    segments: Segment[];
}

const merge = (segments: Segment[]): Segment[] => {
    const out: Segment[] = [];
    for (const s of segments) {
        if (s.length <= 0) continue;
        const last = out[out.length - 1];
        if (last && last.source === s.source) last.length += s.length;
        else out.push({ ...s });
    }
    return out;
};

const split = (segments: Segment[], at: number): [Segment[], Segment[]] => {
    const left: Segment[] = [];
    const right: Segment[] = [];
    let pos = 0;
    for (const s of segments) {
        const end = pos + s.length;
        if (end <= at) left.push({ ...s });
        else if (pos >= at) right.push({ ...s });
        else {
            left.push({ source: s.source, length: at - pos });
            right.push({ source: s.source, length: end - at });
        }
        pos = end;
    }
    return [left, right];
};

const dominant = (segments: Segment[]): string | null => {
    const totals = new Map<string, number>();
    for (const s of segments) totals.set(s.source, (totals.get(s.source) ?? 0) + s.length);
    let best: string | null = null;
    for (const [src, n] of totals) if (best === null || n > (totals.get(best) ?? 0)) best = src;
    return best;
};

interface FileState extends ReplayFrame {
    recentDeletes: Array<{ text: string; segments: Segment[] }>;
}

const applyOp = (state: FileState, op: EditOp) => {
    const [, rawOffset, rawDelete, inserted, kind] = op;
    const offset = Math.max(0, Math.min(rawOffset, state.text.length));
    const deleteLen = Math.max(0, Math.min(rawDelete, state.text.length - offset));
    const [left, rest] = split(state.segments, offset);
    const [deletedSegs, right] = split(rest, deleteLen);
    const deletedText = state.text.slice(offset, offset + deleteLen);
    if (deleteLen) {
        state.recentDeletes.push({ text: deletedText, segments: merge(deletedSegs) });
        if (state.recentDeletes.length > 20) state.recentDeletes.shift();
    }

    let fresh: Segment[] = [];
    if (inserted) {
        if (kind === 'f') {
            const src = dominant(deletedSegs) ?? left[left.length - 1]?.source ?? right[0]?.source ?? 'typed';
            fresh = [{ source: src, length: inserted.length }];
        } else if (kind === 'u' || kind === 'r') {
            const exact = [...state.recentDeletes].reverse().find((d) => d.text === inserted);
            if (exact) fresh = exact.segments.map((s) => ({ ...s }));
            else {
                const partial = [...state.recentDeletes].reverse().find((d) => d.text.includes(inserted));
                if (partial) {
                    const at = partial.text.indexOf(inserted);
                    fresh = split(split(partial.segments, at)[1], inserted.length)[0];
                } else fresh = [{ source: 'unknown', length: inserted.length }];
            }
        } else {
            fresh = [{ source: KIND_SOURCES[kind] ?? 'unknown', length: inserted.length }];
        }
    }
    state.text = state.text.slice(0, offset) + inserted + state.text.slice(offset + deleteLen);
    state.segments = merge([...left, ...fresh, ...right]);
};

const applyBase = (state: FileState, base: string, starters: Set<string>) => {
    if (!state.text && !state.segments.length) {
        state.text = base;
        state.segments = merge([{ source: starters.has(base) ? 'starter' : 'unknown', length: base.length }]);
        return;
    }
    if (base === state.text) return;
    let prefix = 0;
    while (prefix < base.length && prefix < state.text.length && base[prefix] === state.text[prefix]) prefix++;
    let suffix = 0;
    while (suffix < base.length - prefix && suffix < state.text.length - prefix
        && base[base.length - 1 - suffix] === state.text[state.text.length - 1 - suffix]) suffix++;
    const [left, rest] = split(state.segments, prefix);
    const [, right] = split(rest, state.text.length - suffix - prefix);
    const added = base.length - suffix - prefix;
    state.text = base;
    state.segments = merge([...left, { source: 'external', length: added }, ...right]);
};

/**
 * Kaydı adımlara açar. Adımlar dosyalardan bağımsız, zamana göre sıralı;
 * `frameAt(n)` ilk n adım uygulandığında her dosyanın hâlini verir.
 */
export const buildReplay = (history: CodeHistory, starterTexts: string[] = []) => {
    type Item = { at: number; file: string; op?: EditOp; base?: string };
    const items: Item[] = [];
    for (const [file, chunks] of Object.entries(history.files)) {
        for (const chunk of chunks) {
            if (chunk.base_text !== null) items.push({ at: chunk.started_at_ms, file, base: chunk.base_text.replace(/\r\n/g, '\n') });
            for (const op of chunk.ops) items.push({ at: chunk.started_at_ms + Number(op[0]), file, op });
        }
    }
    // Aynı andaki paket temeli, o paketin düzenlemelerinden önce gelir.
    items.sort((a, b) => a.at - b.at || (a.base !== undefined ? -1 : 1));

    const steps: ReplayStep[] = items.filter((i) => i.op).map((i) => ({
        at: i.at, file: i.file, kind: i.op![4], inserted: i.op![3].length, deleted: i.op![2],
    }));
    const starters = new Set(starterTexts.map((s) => s.replace(/\r\n/g, '\n')));

    const frameAt = (stepCount: number): Record<string, ReplayFrame> => {
        const files: Record<string, FileState> = {};
        let applied = 0;
        for (const item of items) {
            const state = files[item.file] ??= { text: '', segments: [], recentDeletes: [] };
            if (item.base !== undefined) {
                applyBase(state, item.base, starters);
                continue;
            }
            if (applied >= stepCount) break;
            applyOp(state, item.op!);
            applied++;
        }
        return Object.fromEntries(Object.entries(files).map(([f, s]) => [f, { text: s.text, segments: s.segments }]));
    };

    return { steps, frameAt };
};

/** Bir karedeki metni kaynak rengine göre parçalara böler (ekranda boyamak için). */
export const coloredRuns = (frame: ReplayFrame): Array<{ text: string; source: string }> => {
    const runs: Array<{ text: string; source: string }> = [];
    let pos = 0;
    for (const s of frame.segments) {
        runs.push({ text: frame.text.slice(pos, pos + s.length), source: s.source });
        pos += s.length;
    }
    if (pos < frame.text.length) runs.push({ text: frame.text.slice(pos), source: 'unknown' });
    return runs;
};
