import React, { useState } from 'react';
import { X } from 'lucide-react';
import { learningApi, type MasteryStatus, type Scope } from './learningApi';
import EventRow from './EventRow';
import { Card, Empty, ErrorBox, Loading, STATUS_STYLE, StatusPill, useLoad } from './learningUi';
import { AssessControl } from './TeacherTools';

/**
 * Kazanım haritası: satırlar öğrenciler, sütunlar kavramlar (yol haritası sırasıyla).
 * Hücreye tıklanınca o hücrenin GEREKÇESİ açılır: hangi görevde, kaç deneme,
 * hangi ölçüt düştü, koç ne tespit etti.
 */
const ConceptMapTab: React.FC<{
    courseId: number;
    refreshKey: number;
    onOpenStudent: (id: number) => void;
    onPractice: (conceptId: string) => void;
    scope?: Scope;
}> = ({ courseId, refreshKey, onOpenStudent, onPractice, scope }) => {
    const { data, error, loading } = useLoad(() => learningApi.concepts(courseId, scope), [courseId, refreshKey, scope?.classId]);
    const [cell, setCell] = useState<{ studentId: number; student: string; conceptId: string } | null>(null);

    if (loading && !data) return <Loading />;
    if (error) return <ErrorBox message={error} />;
    if (!data) return null;
    if (!data.concepts.length) {
        return <Card><Empty>Kurs modüllerinde kavram etiketi ya da öğrenci verisi henüz yok.</Empty></Card>;
    }

    const counts = (conceptId: string) => {
        const c: Record<MasteryStatus, number> = { zorlaniyor: 0, gelisiyor: 0, hakim: 0, veri_az: 0 };
        for (const s of data.students) c[s.cells[conceptId]?.status ?? 'veri_az']++;
        return c;
    };

    return (
        <div className="grid xl:grid-cols-[1fr_380px] gap-6 items-start">
            <Card title="Kazanım haritası">
                <div className="flex flex-wrap gap-3 mb-4">
                    {(Object.keys(STATUS_STYLE) as MasteryStatus[]).map((s) => <StatusPill key={s} status={s} />)}
                </div>
                <div className="overflow-auto max-h-[70vh]">
                    <table className="border-separate border-spacing-1">
                        <thead>
                            <tr>
                                <th className="sticky left-0 top-0 z-20 bg-white" />
                                {data.concepts.map((c) => {
                                    const n = counts(c.concept_id);
                                    return (
                                        <th key={c.concept_id} className="sticky top-0 z-10 bg-white align-bottom p-0">
                                            <div className="w-10 h-40 flex flex-col items-center justify-end gap-1" title={`${c.label}\n${c.nodes.join(', ')}`}>
                                                <span className="text-[10.5px] font-black text-gray-600 whitespace-nowrap [writing-mode:vertical-rl] rotate-180 max-h-32 overflow-hidden text-ellipsis">
                                                    {c.label}
                                                </span>
                                                {n.zorlaniyor > 0 && (
                                                    <button onClick={() => onPractice(c.concept_id)} title="Bu kavram için tekrar görevi üret"
                                                            className="text-[9px] font-black text-rose-600 bg-rose-50 rounded px-1">
                                                        {n.zorlaniyor}
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {data.students.map((s) => (
                                <tr key={s.student_id}>
                                    <td className="sticky left-0 z-10 bg-white pr-2">
                                        <button onClick={() => onOpenStudent(s.student_id)}
                                                className="text-xs font-bold text-gray-700 hover:text-indigo-600 whitespace-nowrap max-w-[160px] truncate block text-left">
                                            {s.student}
                                        </button>
                                    </td>
                                    {data.concepts.map((c) => {
                                        const v = s.cells[c.concept_id];
                                        const status = v?.status ?? 'veri_az';
                                        const active = cell?.studentId === s.student_id && cell.conceptId === c.concept_id;
                                        return (
                                            <td key={c.concept_id} className="p-0">
                                                <button
                                                    onClick={() => setCell({ studentId: s.student_id, student: s.student, conceptId: c.concept_id })}
                                                    className={`w-10 h-8 rounded-md transition-colors ${STATUS_STYLE[status].cell} ${active ? 'ring-2 ring-indigo-600 ring-offset-1' : ''}`}
                                                    title={`${s.student} · ${c.label}: ${STATUS_STYLE[status].label}`
                                                        + (v ? ` (${v.successes} başarı, ${v.failures} başarısız)` : '')
                                                        + (v?.misconception ? `\nYanılgı: ${v.misconception}` : '')}
                                                >
                                                    {v?.misconception && <span className="text-[10px] font-black text-white">!</span>}
                                                </button>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="text-[10.5px] font-bold text-gray-400 mt-3">
                    "!" işaretli hücrelerde YZ koçunun ya da ödev değerlendirmesinin tespit ettiği bir yanılgı var.
                </p>
            </Card>

            {cell ? (
                <CellEvidence key={`${cell.studentId}-${cell.conceptId}`} courseId={courseId} {...cell}
                              onClose={() => setCell(null)} onOpenStudent={onOpenStudent} />
            ) : (
                <Card><Empty>Bir hücreye tıkla: o öğrencinin o kavramdaki kanıtları burada açılır.</Empty></Card>
            )}
        </div>
    );
};

const CellEvidence: React.FC<{
    courseId: number; studentId: number; student: string; conceptId: string;
    onClose: () => void; onOpenStudent: (id: number) => void;
}> = ({ courseId, studentId, student, conceptId, onClose, onOpenStudent }) => {
    const [tick, setTick] = useState(0);
    const { data, error, loading } = useLoad(
        () => learningApi.conceptEvidence(courseId, studentId, conceptId), [courseId, studentId, conceptId, tick],
    );
    return (
        <Card
            title={data ? data.label : 'Kanıtlar'}
            actions={<button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><X size={15} /></button>}
            className="xl:sticky xl:top-4"
        >
            <button onClick={() => onOpenStudent(studentId)} className="text-sm font-black text-indigo-600 hover:underline">{student}</button>
            {loading && <Loading />}
            {error && <ErrorBox message={error} />}
            {data && (
                <div className="space-y-3 mt-2">
                    <div className="flex items-center gap-2">
                        <StatusPill status={data.status} />
                        {data.score !== null && <span className="text-[11px] font-bold text-gray-400">puan {Math.round(data.score * 100)}</span>}
                    </div>
                    {data.description && <p className="text-[11.5px] text-gray-500">{data.description}</p>}
                    {data.misconception && (
                        <p className="text-xs font-bold text-violet-700 bg-violet-50 rounded-xl px-3 py-2">Son tespit edilen yanılgı: {data.misconception}</p>
                    )}
                    {data.prerequisites.length > 0 && (
                        <p className="text-[11px] text-gray-500">Önkoşullar: {data.prerequisites.map((p) => p.label).join(', ')}</p>
                    )}
                    <AssessControl courseId={courseId} studentId={studentId} conceptId={conceptId}
                                   onSaved={() => setTick((t) => t + 1)} />
                    <div className="max-h-[50vh] overflow-y-auto">
                        {data.evidence.length === 0 ? <Empty>Bu kavramda kayıtlı kanıt yok.</Empty>
                            : data.evidence.map((e) => <EventRow key={e.event_id} courseId={courseId} event={e} />)}
                    </div>
                </div>
            )}
        </Card>
    );
};

export default ConceptMapTab;
