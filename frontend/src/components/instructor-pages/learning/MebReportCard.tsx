import React, { useState } from 'react';
import { Landmark } from 'lucide-react';
import { learningApi, type MasteryStatus, type Scope } from './learningApi';
import { Card, ErrorBox, STATUS_STYLE, StatusPill, useLoad } from './learningUi';

/**
 * MEB kazanım raporu: öğretmenin kurs menüsünden (MEB Kazanımları) eşlediği her
 * kazanımda sınıfın dağılımı. Durum, eşlenen modüllerin kavramlarındaki hakimiyetten gelir.
 */

const ORDER: MasteryStatus[] = ['hakim', 'gelisiyor', 'zorlaniyor', 'veri_az'];

const MebReportCard: React.FC<{ courseId: number; refreshKey: number; scope?: Scope; onOpenStudent: (id: number) => void }> = ({
    courseId, refreshKey, scope, onOpenStudent,
}) => {
    const { data, error } = useLoad(() => learningApi.mebReport(courseId, scope), [courseId, refreshKey, scope?.classId]);
    const [open, setOpen] = useState<string | null>(null);

    if (error) return <ErrorBox message={error} />;
    if (!data) return null;
    if (!data.outcomes.length) {
        return (
            <p className="text-xs font-bold text-gray-500 bg-white border-2 border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-2">
                <Landmark size={14} className="text-indigo-500" />
                MEB kazanımı raporu için Kurslarım → kurs menüsü → "MEB Kazanımları"ndan programındaki kazanımları ekleyip modüllerle eşle.
            </p>
        );
    }

    return (
        <Card title="MEB kazanımları" icon={<Landmark size={16} className="text-indigo-500" />}>
            <div className="space-y-3">
                {data.outcomes.map((o) => {
                    const total = Math.max(1, data.student_count);
                    return (
                        <div key={o.code} className="border-b border-gray-50 pb-3 last:border-0">
                            <button onClick={() => setOpen(open === o.code ? null : o.code)} className="w-full text-left">
                                <div className="flex items-start gap-3">
                                    <span className="shrink-0 text-[11px] font-black font-mono text-indigo-600 mt-0.5">{o.code}</span>
                                    <span className="flex-1 text-xs font-bold text-gray-800">{o.text}</span>
                                </div>
                                {o.modules.length === 0 ? (
                                    <p className="text-[10.5px] font-bold text-amber-600 mt-1.5">Henüz hiçbir modülle eşlenmedi.</p>
                                ) : (
                                    <>
                                        <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mt-2">
                                            {ORDER.map((st) => o.counts[st] > 0 && (
                                                <div key={st} className={STATUS_STYLE[st].dot} style={{ width: `${(o.counts[st] / total) * 100}%` }}
                                                     title={`${STATUS_STYLE[st].label}: ${o.counts[st]}`} />
                                            ))}
                                        </div>
                                        <p className="text-[10.5px] font-bold text-gray-400 mt-1">
                                            {ORDER.filter((st) => o.counts[st]).map((st) => `${STATUS_STYLE[st].label} ${o.counts[st]}`).join(' · ')}
                                            {' · '}modülleri bitiren {o.completed_all}/{data.student_count} · {o.modules.join(', ')}
                                            {o.concepts.length === 0 && ' · modüllerde kavram etiketi yok, hakimiyet ölçülemiyor'}
                                        </p>
                                    </>
                                )}
                            </button>
                            {open === o.code && o.modules.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {o.students.map((st) => (
                                        <button key={st.id} onClick={() => onOpenStudent(st.id)} className="flex items-center gap-1.5 text-[11px] font-bold text-gray-600 bg-gray-50 hover:bg-indigo-50 rounded-lg px-2 py-1">
                                            {st.name} <StatusPill status={st.status} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
                {data.unmapped_modules.length > 0 && (
                    <p className="text-[10.5px] font-bold text-gray-400">Kazanımla eşlenmemiş modüller: {data.unmapped_modules.join(', ')}</p>
                )}
            </div>
        </Card>
    );
};

export default MebReportCard;
