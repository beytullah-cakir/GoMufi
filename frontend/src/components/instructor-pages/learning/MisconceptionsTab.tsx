import React from 'react';
import { HelpCircle, ListChecks, Wand2 } from 'lucide-react';
import { learningApi, type MisconceptionRow, type Scope } from './learningApi';
import { Card, Empty, ErrorBox, Loading, pct, useLoad } from './learningUi';
import type { PracticeTarget } from './InsightCard';

/**
 * "Neyi anlamadılar?" — öğretmenin asıl sorusu.
 *
 * Yanılgılar tek listede, kaç ÖĞRENCİNİN düştüğüne göre sıralı: ders slaytında
 * seçilen yanlış şıkkın yanılgısı, oyunda karıştırılan eşleşmeler, YZ koçunun
 * etiketi ve ödev değerlendirmesi. Her satırdan o öğrencilere özel tekrar görevi
 * hazırlanabilir. Altta slayt sorularının ilk denemedeki doğru oranı.
 */

const SOURCE_TONE: Record<string, string> = {
    soru: 'bg-indigo-50 text-indigo-700',
    oyun: 'bg-amber-50 text-amber-700',
    'koç': 'bg-cyan-50 text-cyan-700',
    'ödev': 'bg-violet-50 text-violet-700',
};

const MisconceptionItem: React.FC<{
    row: MisconceptionRow;
    total: number;
    onOpenStudent: (id: number) => void;
    onPractice: (target: PracticeTarget) => void;
}> = ({ row, total, onOpenStudent, onPractice }) => (
    <li className="py-3.5 flex flex-col md:flex-row md:items-start gap-3">
        <div className="w-14 shrink-0 text-center">
            <p className="text-xl font-black text-rose-600 leading-none">{row.student_count}</p>
            <p className="text-[10px] font-bold text-gray-400 mt-1">öğrenci{total ? ` / ${total}` : ''}</p>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-sm font-black text-gray-800">{row.label}</p>
            <div className="flex flex-wrap items-center gap-1.5">
                {Object.entries(row.sources).map(([src, n]) => (
                    <span key={src} className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${SOURCE_TONE[src] ?? 'bg-gray-50 text-gray-600'}`}>
                        {src} · {n}
                    </span>
                ))}
                {row.concept && <span className="text-[10px] font-bold text-gray-500">Kavram: {row.concept}</span>}
                {row.modules.length > 0 && <span className="text-[10px] font-bold text-gray-400">{row.modules.join(' · ')}</span>}
            </div>
            {row.examples.length > 0 && (
                <p className="text-[11px] text-gray-500 truncate" title={row.examples.join('\n')}>Örnek: {row.examples[0]}</p>
            )}
            <div className="flex flex-wrap gap-1">
                {row.students.map((st) => (
                    <button key={st.id} onClick={() => onOpenStudent(st.id)}
                            className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-indigo-50 hover:text-indigo-700">
                        {st.name}
                    </button>
                ))}
            </div>
        </div>
        {row.concept_id && (
            <button
                onClick={() => onPractice({ conceptId: row.concept_id!, misconception: row.label, students: row.students })}
                className="shrink-0 flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                title="Bu yanılgıyı hedefleyen görev hazırla; yalnızca bu öğrencilere atayabilirsin"
            >
                <Wand2 size={14} /> Tekrar görevi
            </button>
        )}
    </li>
);

const MisconceptionsTab: React.FC<{
    courseId: number;
    refreshKey: number;
    scope: Scope;
    studentCount?: number;
    onOpenStudent: (id: number) => void;
    onPractice: (target: PracticeTarget) => void;
}> = ({ courseId, refreshKey, scope, studentCount = 0, onOpenStudent, onPractice }) => {
    const { data, error, loading } = useLoad(
        () => learningApi.misconceptions(courseId, scope), [courseId, refreshKey, scope.classId, scope.since],
    );
    if (error) return <ErrorBox message={error} />;
    if (!data) return loading ? <Loading /> : null;

    return (
        <div className="space-y-6">
            <Card title="Neyi anlamadılar?" icon={<HelpCircle size={16} className="text-rose-500" />}>
                {data.misconceptions.length === 0 ? (
                    <Empty>
                        Henüz yanılgı kaydı yok. Ders slaytlarındaki çoktan seçmeli sorularda yanlış şıklara
                        "yanılgı" yazarsan, o şıkkı seçen öğrenciler burada toplanır. Oyunlarda karıştırılan
                        eşleşmeler, koçun ve ödev değerlendirmesinin tespitleri de burada görünür.
                    </Empty>
                ) : (
                    <ul className="divide-y divide-gray-50 -my-3">
                        {data.misconceptions.map((row) => (
                            <MisconceptionItem key={row.label} row={row} total={studentCount}
                                               onOpenStudent={onOpenStudent} onPractice={onPractice} />
                        ))}
                    </ul>
                )}
            </Card>

            <Card title="Slayt soruları · ilk denemede doğru" icon={<ListChecks size={16} className="text-indigo-500" />}>
                {data.questions.length === 0 ? (
                    <Empty>Öğrenciler slayt sorularını cevapladıkça burada görünür.</Empty>
                ) : (
                    <div className="overflow-x-auto -mx-5">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    <th className="px-5 py-2">Soru</th>
                                    <th className="px-3 py-2 w-24">Doğru</th>
                                    <th className="px-5 py-2">En çok seçilen yanlışlar</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.questions.map((q) => (
                                    <tr key={`${q.slide_id}:${q.element_id}`} className="align-top">
                                        <td className="px-5 py-2.5">
                                            <p className="font-bold text-gray-800">{q.question || 'Soru'}</p>
                                            {q.module && <p className="text-[10px] font-bold text-gray-400 mt-0.5">{q.module}</p>}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <span className={`font-black ${q.correct_rate >= 0.7 ? 'text-emerald-600' : q.correct_rate >= 0.4 ? 'text-amber-600' : 'text-rose-600'}`}>
                                                {pct(q.correct_rate)}
                                            </span>
                                            <span className="block text-[10px] font-bold text-gray-400">{q.first_try_correct}/{q.answered}</span>
                                        </td>
                                        <td className="px-5 py-2.5 space-y-0.5">
                                            {q.wrong_choices.length === 0 ? <span className="text-gray-300">—</span> : q.wrong_choices.slice(0, 3).map((w) => (
                                                <p key={w.text} className="text-gray-600">
                                                    <b>{w.text}</b> · {w.students} öğrenci
                                                    {w.misconception && <span className="text-rose-600"> — {w.misconception}</span>}
                                                </p>
                                            ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default MisconceptionsTab;
