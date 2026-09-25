import React, { useState } from 'react';
import { Check, ChevronDown, Code2, Loader2, X } from 'lucide-react';
import { learningApi } from './learningApi';
import { formatTime } from './learningUi';

/** Bir öğrenme olayının tek satırı: ne oldu, neden düştü, koç ne dedi; istenirse o denemenin kodu. */

export const EVENT_LABEL: Record<string, string> = {
    check: 'Kontrol',
    coach: 'YZ koçu',
    quiz_answer: 'Quiz',
    homework_review: 'Ödev (YZ)',
    homework_graded: 'Ödev notu',
    explain: 'Kodunu açıkla',
    submitted: 'Teslim',
    hint_opened: 'İpucu açtı',
    module_completed: 'Modül bitti',
    help_request: 'Yardım istedi',
    teacher_nudge: 'Öğretmen ipucu gönderdi',
    teacher_assessment: 'Öğretmen değerlendirmesi',
};

const ASSESSMENT_LABEL: Record<string, string> = { hakim: 'Hakim', gelisiyor: 'Gelişiyor', zorlaniyor: 'Zorlanıyor' };

export interface EventLike {
    event_id: number;
    at: string;
    type: string;
    task: string | null;
    outcome: string | null;
    attempt: number | null;
    error_type: string | null;
    failed: string[];
    misconception: string | null;
    coach: string | null;
    has_code: boolean;
    grade?: number | null;
    question?: string | null;
    note?: string | null;
}

const OUTCOME_STYLE: Record<string, string> = {
    pass: 'bg-emerald-500', fail: 'bg-rose-500', error: 'bg-rose-500', ran: 'bg-sky-400',
};

const EventRow: React.FC<{ courseId: number; event: EventLike }> = ({ courseId, event }) => {
    const [open, setOpen] = useState(false);
    const [code, setCode] = useState<{ code: string | null; stderr: string | null } | null>(null);
    const [loading, setLoading] = useState(false);

    const toggle = async () => {
        const next = !open;
        setOpen(next);
        if (next && !code && event.has_code) {
            setLoading(true);
            try { setCode(await learningApi.eventCode(courseId, event.event_id)); } finally { setLoading(false); }
        }
    };

    return (
        <div className="border-b border-gray-50 last:border-0 py-2">
            <div className="flex items-start gap-2">
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${OUTCOME_STYLE[event.outcome ?? ''] ?? 'bg-slate-300'}`} />
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-700">
                        <span className="font-black">{EVENT_LABEL[event.type] ?? event.type}</span>
                        {event.task && <span className="text-gray-500"> · {event.task}</span>}
                        {event.attempt && event.type === 'check' && <span className="text-gray-400"> · {event.attempt}. deneme</span>}
                        {typeof event.grade === 'number' && <span className="text-gray-500"> · {event.grade}/100</span>}
                        {event.type === 'teacher_assessment' && event.outcome && (
                            <span className="text-indigo-700"> · {ASSESSMENT_LABEL[event.outcome] ?? event.outcome}</span>
                        )}
                    </p>
                    {event.note && <p className="text-[11px] text-indigo-700 italic">“{event.note}”</p>}
                    {event.question && <p className="text-[11px] text-gray-500">{event.question} {event.outcome === 'pass' ? '✓' : '✗'}</p>}
                    {event.error_type && <p className="text-[11px] text-rose-700 font-bold">Hata: {event.error_type}</p>}
                    {event.failed.length > 0 && <p className="text-[11px] text-rose-700">Düşen: {event.failed.join(' · ')}</p>}
                    {event.misconception && <p className="text-[11px] text-violet-700 font-bold">Yanılgı: {event.misconception}</p>}
                    {event.coach && <p className="text-[11px] text-gray-500 italic">Koç: {event.coach}</p>}
                </div>
                <span className="text-[10px] font-bold text-gray-400 shrink-0">{formatTime(event.at)}</span>
                {event.has_code && (
                    <button onClick={toggle} className="flex items-center gap-0.5 text-[10.5px] font-black text-indigo-600 shrink-0">
                        <Code2 size={12} /> Kod <ChevronDown size={11} className={open ? 'rotate-180' : ''} />
                    </button>
                )}
            </div>
            {open && (
                <div className="mt-2 ml-4">
                    {loading && <Loader2 size={14} className="animate-spin text-gray-400" />}
                    {code?.code && (
                        <pre className="bg-slate-900 text-slate-100 text-[11px] font-mono rounded-xl p-3 overflow-auto max-h-64 whitespace-pre-wrap">{code.code}</pre>
                    )}
                    {code?.stderr && (
                        <pre className="mt-1 bg-rose-50 text-rose-700 text-[10.5px] font-mono rounded-xl p-2 whitespace-pre-wrap">{code.stderr}</pre>
                    )}
                    {code && !code.code && <p className="text-[11px] text-gray-400">Kod saklama süresi dolmuş.</p>}
                </div>
            )}
        </div>
    );
};

export const OutcomeIcon: React.FC<{ ok: boolean }> = ({ ok }) =>
    ok ? <Check size={13} className="text-emerald-600" /> : <X size={13} className="text-rose-500" />;

export default EventRow;
