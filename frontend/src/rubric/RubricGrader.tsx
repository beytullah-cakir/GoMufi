import React from 'react';
import type { Rubric } from '../components/lesson-builder/types';
import { rubricGrade, type RubricScores } from './rubric';

/**
 * Anahtarla değerlendirme: her ölçüt için seviye seçilir, not hesaplanır.
 * `readOnly`: öğrencinin kendi sonucunu (ya da teslimden önce ölçütleri) görmesi.
 */
const RubricGrader: React.FC<{
    rubric: Rubric;
    scores: RubricScores;
    onChange?: (scores: RubricScores) => void;
    readOnly?: boolean;
    /** YZ'nin ölçüt başına gerekçesi (taslak). */
    reasons?: Record<string, string>;
}> = ({ rubric, scores, onChange, readOnly, reasons }) => {
    const grade = rubricGrade(rubric, scores);
    return (
        <div className="space-y-2">
            {rubric.criteria.map((c) => (
                <div key={c.id} className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <p className="text-xs font-black text-slate-800">{c.title}</p>
                    {c.description && <p className="text-[10.5px] text-slate-500">{c.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {c.levels.map((level, i) => {
                            const on = scores[c.id] === i;
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => onChange?.({ ...scores, [c.id]: i })}
                                    title={level.description || undefined}
                                    className={`text-[10.5px] font-black px-2 py-1 rounded-lg border-2 transition-colors ${
                                        on ? 'bg-indigo-600 border-indigo-700 text-white'
                                            : readOnly ? 'bg-slate-50 border-slate-100 text-slate-400'
                                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                                >
                                    {level.label} · {level.points}
                                </button>
                            );
                        })}
                    </div>
                    {reasons?.[c.id] && <p className="text-[10.5px] text-violet-700 mt-1">YZ: {reasons[c.id]}</p>}
                    {readOnly && scores[c.id] !== undefined && c.levels[scores[c.id]]?.description && (
                        <p className="text-[10.5px] text-slate-500 mt-1">{c.levels[scores[c.id]].description}</p>
                    )}
                </div>
            ))}
            {!readOnly && (
                <p className="text-[11px] font-black text-slate-600">
                    Anahtara göre not: {grade === null ? 'her ölçüt için seviye seç' : `${grade} / 100`}
                </p>
            )}
        </div>
    );
};

export default RubricGrader;
