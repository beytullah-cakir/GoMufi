import React from 'react';
import { AlertTriangle, BookCheck } from 'lucide-react';
import { learningApi, scopeKey, type Scope } from './learningApi';
import { Card, Empty, ErrorBox, formatTime, Loading, useLoad } from './learningUi';

/**
 * Ödev analizi: kim teslim etti, notlar nasıl dağıldı, sınıfın ORTAK zayıflıkları
 * neler (YZ değerlendirmelerinden, kavrama bağlı) ve öğretmen notu ile YZ puanı
 * ne kadar ayrışıyor.
 */

const BUCKETS = ['0-49', '50-69', '70-84', '85-100'];
const BUCKET_TONE: Record<string, string> = {
    '0-49': 'bg-rose-400', '50-69': 'bg-amber-300', '70-84': 'bg-sky-400', '85-100': 'bg-emerald-400',
};

const HomeworkTab: React.FC<{
    courseId: number;
    refreshKey: number;
    onOpenStudent: (id: number) => void;
    onPractice: (conceptId: string) => void;
    scope?: Scope;
}> = ({ courseId, refreshKey, onOpenStudent, onPractice, scope }) => {
    const { data, error, loading } = useLoad(() => learningApi.homework(courseId, scope), [courseId, refreshKey, scopeKey(scope)]);
    if (loading && !data) return <Loading />;
    if (error) return <ErrorBox message={error} />;
    if (!data?.length) return <Card><Empty>Bu kursta ödev slaytı yok.</Empty></Card>;

    return (
        <div className="space-y-6">
            {data.map((h) => {
                const maxBucket = Math.max(1, ...BUCKETS.map((b) => h.grade_distribution[b] ?? 0));
                return (
                    <Card key={h.task_key} title={h.title} icon={<BookCheck size={16} className="text-blue-500" />}
                          actions={(
                              <span className="text-[11px] font-bold text-gray-400">
                                  {h.node}
                                  {h.due_at && (
                                      <span className={h.overdue ? 'text-rose-600' : 'text-gray-500'}>
                                          {h.node ? ' · ' : ''}Son teslim {formatTime(h.due_at)}{h.overdue ? ' (doldu)' : ''}
                                      </span>
                                  )}
                              </span>
                          )}>
                        <div className="grid md:grid-cols-4 gap-4 mb-5">
                            <div>
                                <p className="text-2xl font-black text-indigo-600">{h.submitted}/{h.enrolled}</p>
                                <p className="text-xs font-bold text-gray-400">
                                    Teslim{h.late > 0 && <span className="text-rose-600"> · {h.late} geç</span>}
                                </p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-emerald-600">{h.avg_grade ?? '—'}</p>
                                <p className="text-xs font-bold text-gray-400">Ortalama not ({h.graded} değerlendirildi)</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-violet-600">{h.avg_ai_score ?? '—'}</p>
                                <p className="text-xs font-bold text-gray-400">Ortalama YZ puanı</p>
                            </div>
                            <div>
                                <p className={`text-2xl font-black ${h.pending_grading ? 'text-amber-600' : 'text-gray-300'}`}>{h.pending_grading}</p>
                                <p className="text-xs font-bold text-gray-400">Değerlendirme bekliyor</p>
                            </div>
                        </div>

                        {h.ai_teacher_gap !== null && h.ai_teacher_gap >= 15 && (
                            <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-4">
                                <AlertTriangle size={12} /> Senin notun ile YZ puanı arasında ortalama {h.ai_teacher_gap} puan fark var — bu ödevde YZ değerlendirmesine temkinli yaklaş.
                            </p>
                        )}

                        <div className="grid lg:grid-cols-2 gap-6">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">NOT DAĞILIMI</p>
                                {h.graded === 0 ? <Empty>Henüz not verilmedi.</Empty> : (
                                    <div className="flex items-end gap-3 h-28">
                                        {BUCKETS.map((b) => {
                                            const n = h.grade_distribution[b] ?? 0;
                                            return (
                                                <div key={b} className="flex-1 flex flex-col items-center gap-1">
                                                    <span className="text-[10px] font-black text-gray-500">{n}</span>
                                                    <div className={`w-full rounded-t-lg ${BUCKET_TONE[b]}`} style={{ height: `${(n / maxBucket) * 80}px` }} />
                                                    <span className="text-[10px] font-bold text-gray-400">{b}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 tracking-widest mb-2">ORTAK ZAYIFLIKLAR</p>
                                {h.common_weaknesses.length === 0 ? <Empty>YZ değerlendirmesi yapılmış teslim yok.</Empty> : (
                                    <div className="space-y-2">
                                        {h.common_weaknesses.map((w) => (
                                            <div key={w.label} className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-black text-gray-800">{w.label}</p>
                                                    {w.misconceptions.map((m) => <p key={m} className="text-[11px] text-violet-700">“{m}”</p>)}
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-xs font-black text-rose-600">{w.students} öğrenci</span>
                                                    {w.concept_id && (
                                                        <button onClick={() => onPractice(w.concept_id!)} className="text-[10px] font-black text-indigo-600 hover:underline">
                                                            tekrar görevi
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {(h.missing.length > 0 || h.self_checks > 0) && (
                            <div className="mt-5 pt-4 border-t border-gray-50 text-[11px] font-bold text-gray-500 space-y-1">
                                {h.missing.length > 0 && (
                                    <p>
                                        Teslim etmeyenler:{' '}
                                        {h.missing.map((s, i) => (
                                            <React.Fragment key={s.student_id}>
                                                {i > 0 && ', '}
                                                <button onClick={() => onOpenStudent(s.student_id)} className="text-rose-600 hover:underline">{s.student}</button>
                                            </React.Fragment>
                                        ))}
                                    </p>
                                )}
                                {h.self_checks > 0 && <p>Öğrenciler teslimden önce {h.self_checks} kez YZ kontrolü yaptı.</p>}
                            </div>
                        )}
                    </Card>
                );
            })}
        </div>
    );
};

export default HomeworkTab;
