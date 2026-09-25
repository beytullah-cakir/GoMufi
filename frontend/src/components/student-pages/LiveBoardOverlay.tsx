import React from 'react';
import { Presentation, X, XCircle } from 'lucide-react';

/**
 * "Tahtada göster": bir öğrencinin çözümü İSİMSİZ olarak sınıfa.
 *
 * Sık düşen bir ölçütü sınıfça tartışmak için. İsim sunucudan hiç gelmiyor;
 * başlık "bir arkadaşımızın çözümü" der. Öğretmen ekranında büyük (tahtaya
 * yansıyor), öğrenci ekranında öğretmen gönderdiyse görünür.
 */
export interface BoardView {
    task: string;
    code: string;
    failed: string[];
    note: string | null;
}

const LiveBoardOverlay: React.FC<{
    board: BoardView;
    onClose: () => void;
    audience: 'teacher' | 'student';
}> = ({ board, onClose, audience }) => (
    <div className="fixed inset-0 z-[170] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 md:p-10" onClick={onClose}>
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-full flex flex-col overflow-hidden border-b-8 border-slate-300"
             onClick={(e) => e.stopPropagation()}>
            <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5">
                        <Presentation size={14} /> Birlikte bakalım
                    </p>
                    <h2 className="text-lg md:text-2xl font-black text-slate-800">Bir arkadaşımızın çözümü · {board.task}</h2>
                </div>
                <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500" title="Kapat">
                    <X size={22} />
                </button>
            </header>
            <div className="p-6 overflow-auto space-y-4">
                {board.note && <p className="text-base font-bold text-slate-700">{board.note}</p>}
                {board.failed.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {board.failed.map((f) => (
                            <span key={f} className="inline-flex items-center gap-1.5 text-sm font-black text-rose-700 bg-rose-50 border-2 border-rose-200 rounded-xl px-3 py-1.5">
                                <XCircle size={15} /> {f}
                            </span>
                        ))}
                    </div>
                )}
                <pre className={`bg-slate-900 text-slate-100 font-mono rounded-2xl p-5 overflow-auto whitespace-pre ${audience === 'teacher' ? 'text-base md:text-lg' : 'text-sm'}`}>
                    {board.code.split('\n').map((line, i) => (
                        <div key={i} className="flex">
                            <span className="select-none text-slate-500 w-10 shrink-0 text-right pr-4">{i + 1}</span>
                            <span>{line || ' '}</span>
                        </div>
                    ))}
                </pre>
                <p className="text-xs font-bold text-slate-400">
                    {audience === 'teacher'
                        ? 'Öğrencinin adı gösterilmez. Hangi satır sorunlu? Nasıl düzeltirdiniz?'
                        : 'Öğretmenin bu çözümü sınıfla paylaştı. Sence hangi satır sorunlu?'}
                </p>
            </div>
        </div>
    </div>
);

export default LiveBoardOverlay;
