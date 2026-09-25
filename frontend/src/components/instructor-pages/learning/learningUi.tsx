import React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import type { Flag, MasteryStatus } from './learningApi';

/**
 * Öğrenme analizi sayfasının ortak parçaları.
 *
 * Renk anlamları sayfanın her yerinde AYNI: kırmızı zorlanıyor, sarı gelişiyor,
 * yeşil hakim, gri veri az. Sınıf adları tam metin — Tailwind birleştirilmiş
 * adları (`bg-${renk}-500`) göremez.
 */

export const STATUS_STYLE: Record<MasteryStatus, { label: string; pill: string; cell: string; dot: string }> = {
    zorlaniyor: { label: 'Zorlanıyor', pill: 'bg-rose-50 text-rose-700 border-rose-200', cell: 'bg-rose-400 hover:bg-rose-500', dot: 'bg-rose-500' },
    gelisiyor: { label: 'Gelişiyor', pill: 'bg-amber-50 text-amber-700 border-amber-200', cell: 'bg-amber-300 hover:bg-amber-400', dot: 'bg-amber-400' },
    hakim: { label: 'Hakim', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', cell: 'bg-emerald-400 hover:bg-emerald-500', dot: 'bg-emerald-500' },
    veri_az: { label: 'Veri az', pill: 'bg-slate-50 text-slate-500 border-slate-200', cell: 'bg-slate-200 hover:bg-slate-300', dot: 'bg-slate-300' },
};

export const StatusPill: React.FC<{ status: MasteryStatus }> = ({ status }) => (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg border ${STATUS_STYLE[status].pill}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[status].dot}`} />
        {STATUS_STYLE[status].label}
    </span>
);

/** Kod kökeni kaynakları: renk ve öğretmene gösterilen ad. */
export const SOURCE_STYLE: Record<string, { label: string; bar: string; text: string; mark: string }> = {
    typed: { label: 'Elle yazılan', bar: 'bg-emerald-500', text: 'text-emerald-700', mark: '' },
    autocomplete: { label: 'Kısa tamamlama', bar: 'bg-teal-400', text: 'text-teal-700', mark: '' },
    paste_external: { label: 'Dışarıdan yapıştırma', bar: 'bg-rose-500', text: 'text-rose-700', mark: 'bg-rose-500/40 rounded-sm' },
    paste_internal: { label: 'VS Code içinden yapıştırma', bar: 'bg-orange-400', text: 'text-orange-700', mark: 'bg-orange-400/35 rounded-sm' },
    lesson: { label: 'Ders materyalinden', bar: 'bg-sky-400', text: 'text-sky-700', mark: 'bg-sky-400/30 rounded-sm' },
    bulk: { label: 'Toplu ekleme', bar: 'bg-violet-500', text: 'text-violet-700', mark: 'bg-violet-500/40 rounded-sm' },
    external: { label: 'Editör dışı değişiklik', bar: 'bg-fuchsia-600', text: 'text-fuchsia-700', mark: 'bg-fuchsia-600/40 rounded-sm' },
    starter: { label: 'Başlangıç kodu', bar: 'bg-slate-300', text: 'text-slate-500', mark: 'text-slate-400' },
    unknown: { label: 'Kaynağı bilinmiyor', bar: 'bg-slate-400', text: 'text-slate-600', mark: 'bg-slate-400/30 rounded-sm' },
};

/** Kodun kaynaklara göre dağılımı — tek çubuk. */
export const ProvenanceBar: React.FC<{ share: Record<string, number>; compact?: boolean }> = ({ share, compact }) => {
    const entries = Object.entries(share).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return <span className="text-[10px] text-slate-400 font-bold">kayıt yok</span>;
    return (
        <div className={compact ? 'w-28' : 'w-full'}>
            <div className={`flex overflow-hidden rounded-full bg-slate-100 ${compact ? 'h-2' : 'h-3'}`}>
                {entries.map(([src, v]) => (
                    <div
                        key={src}
                        className={SOURCE_STYLE[src]?.bar ?? 'bg-slate-400'}
                        style={{ width: `${v * 100}%` }}
                        title={`${SOURCE_STYLE[src]?.label ?? src}: %${Math.round(v * 100)}`}
                    />
                ))}
            </div>
            {!compact && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {entries.map(([src, v]) => (
                        <span key={src} className="flex items-center gap-1 text-[10.5px] font-bold text-slate-600">
                            <span className={`w-2 h-2 rounded-full ${SOURCE_STYLE[src]?.bar ?? 'bg-slate-400'}`} />
                            {SOURCE_STYLE[src]?.label ?? src} %{Math.round(v * 100)}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

/** Öğrencinin kendi yazdığı pay — tablolarda tek bakışta. */
export const OwnShare: React.FC<{ value: number | null | undefined }> = ({ value }) => {
    if (value === null || value === undefined) return <span className="text-[10px] text-slate-300 font-bold">—</span>;
    const pct = Math.round(value * 100);
    const tone = pct >= 70 ? 'text-emerald-600' : pct >= 40 ? 'text-amber-600' : 'text-rose-600';
    return <span className={`text-xs font-black ${tone}`}>%{pct}</span>;
};

export const FlagList: React.FC<{ flags: Flag[] }> = ({ flags }) => (
    <div className="flex flex-col gap-1">
        {flags.map((f) => (
            <div key={f.code} className="flex gap-1.5 text-[11px] text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-2 py-1">
                <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                <span><b>{f.label}.</b> {f.detail}</span>
            </div>
        ))}
    </div>
);

export const Card: React.FC<{
    title?: React.ReactNode; icon?: React.ReactNode; actions?: React.ReactNode;
    children: React.ReactNode; className?: string;
}> = ({ title, icon, actions, children, className = '' }) => (
    <section className={`bg-white rounded-2xl border-2 border-gray-100 shadow-sm ${className}`}>
        {title && (
            <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-3 border-b border-gray-50">
                <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">{icon}{title}</h3>
                {actions}
            </header>
        )}
        <div className="p-5">{children}</div>
    </section>
);

export const Stat: React.FC<{ label: string; value: React.ReactNode; tone?: string; hint?: string }> = ({
    label, value, tone = 'text-indigo-600', hint,
}) => (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm" title={hint}>
        <p className={`text-2xl font-black ${tone}`}>{value}</p>
        <p className="text-xs text-gray-400 font-bold mt-0.5">{label}</p>
    </div>
);

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs text-gray-400 font-bold text-center py-6">{children}</p>
);

export const Loading: React.FC = () => (
    <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 size={22} className="animate-spin" />
    </div>
);

export const ErrorBox: React.FC<{ message: string }> = ({ message }) => (
    <div className="flex gap-2 bg-rose-50 border-2 border-rose-100 rounded-2xl p-4 text-sm font-bold text-rose-700">
        <AlertTriangle size={16} className="shrink-0 mt-0.5" /> {message}
    </div>
);

export const pct = (value: number | null | undefined) =>
    value === null || value === undefined ? '—' : `%${Math.round(value * 100)}`;

export const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    // Sunucu UTC yazıyor (saat dilimi eki olmadan); yerel saate çevrilir.
    const date = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
};

export const STAGE_BADGE: Record<string, string> = {
    'UYGULA': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'BİRLEŞTİR': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'ÜRET': 'bg-amber-50 text-amber-700 border-amber-200',
    'ÖDEV': 'bg-blue-50 text-blue-700 border-blue-200',
    'QUIZ': 'bg-violet-50 text-violet-700 border-violet-200',
};

export const StageBadge: React.FC<{ stage?: string | null }> = ({ stage }) => stage ? (
    <span className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md border ${STAGE_BADGE[stage] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
        {stage}
    </span>
) : null;

/** Veri yüklemek için küçük kanca: yükleniyor / hata / veri / yenile. */
export function useLoad<T>(loader: () => Promise<T>, deps: React.DependencyList) {
    const [tick, setTick] = React.useState(0);
    // Verinin hangi isteğe ait olduğu: bağımlılık değişince "yükleniyor" bundan
    // türetilir (etki içinde durumu sıfırlamaya gerek kalmaz).
    const depsKey = JSON.stringify(deps);
    const key = `${depsKey}#${tick}`;
    const [state, setState] = React.useState<{
        key: string | null; depsKey: string | null; data: T | null; error: string | null;
    }>({ key: null, depsKey: null, data: null, error: null });
    React.useEffect(() => {
        let alive = true;
        loader()
            .then((data) => { if (alive) setState({ key, depsKey, data, error: null }); })
            .catch((err) => {
                if (alive) setState({ key, depsKey, data: null, error: err?.response?.data?.detail || 'Veri yüklenemedi.' });
            });
        return () => { alive = false; };
    }, [key]);
    const loading = state.key !== key;
    // Aynı bağlam yenilenirken eski veri ekranda kalır (titreme olmasın);
    // bağlam değiştiyse (başka öğrenci/görev) eski veri gösterilmez.
    const sameContext = state.depsKey === depsKey;
    return {
        data: sameContext ? state.data : null,
        error: loading ? null : state.error,
        loading,
        reload: () => setTick((t) => t + 1),
    };
}
