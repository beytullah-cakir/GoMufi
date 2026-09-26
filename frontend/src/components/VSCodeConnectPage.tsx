import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, AlertCircle, Plug } from 'lucide-react';
import api from '../api';

/**
 * VS Code eklentisinin bağlanma onayı.
 *
 * Eklenti bu sayfayı `?state=<rastgele>` ile açar. Öğrenci sitede zaten oturum
 * açmış olduğu için tek tık yeter — parola VS Code'a hiç girilmez.
 *
 * ONAY NEDEN KODLA: `state` yalnızca eklentinin ürettiği bir değer. Tek tıkla
 * onay yetmiyordu: saldırgan kendi `state`'iyle bir bağlantı gönderip öğrenciye
 * "Onayla"ya bastırırsa hesaba erişen token saldırgana giderdi. Artık öğrenci
 * KENDİ VS Code'unda gördüğü 8 karakterlik kodu yazıyor; kendisi başlatmadığı
 * bir bağlantıda elinde böyle bir kod yok. Kodu sunucu doğrular.
 */
const VSCodeConnectPage: React.FC = () => {
    const [params] = useSearchParams();
    const state = params.get('state') || '';

    const [durum, setDurum] = useState<'hazir' | 'gonderiliyor' | 'tamam' | 'hata'>('hazir');
    const [hata, setHata] = useState<string>('');
    const [kod, setKod] = useState('');
    const temizKod = kod.toUpperCase().replace(/[^A-Z0-9]/g, '');

    useEffect(() => {
        if (!state || state.length < 32) {
            setDurum('hata');
            setHata('Bağlantı kodu geçersiz. VS Code’dan tekrar “Giriş Yap” de.');
        }
    }, [state]);

    const onayla = async () => {
        setDurum('gonderiliyor');
        try {
            await api.post('/auth/device-approve', { state, code: temizKod });
            setDurum('tamam');
        } catch (e: any) {
            setDurum('hata');
            setHata(
                e?.response?.status === 401
                    ? 'Önce GoMufi hesabınla giriş yapmalısın, sonra bu sayfayı yenile.'
                    : e?.response?.data?.detail || 'Bağlantı kurulamadı.',
            );
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
            <div className="w-full max-w-md rounded-3xl border-2 border-b-4 border-gray-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                    <Plug size={26} />
                </div>

                {durum === 'tamam' ? (
                    <>
                        <h1 className="mt-4 font-display text-xl font-black text-slate-800">
                            VS Code bağlandı
                        </h1>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                            Artık bu sekmeyi kapatabilirsin. Sitede <b>Çalıştır</b>’a bastığında
                            kod VS Code’da açılıp çalışacak.
                        </p>
                        <div className="mt-5 flex items-center justify-center gap-2 text-emerald-600">
                            <CheckCircle2 size={20} />
                            <span className="font-display text-sm font-black uppercase tracking-wider">
                                Hazır
                            </span>
                        </div>
                    </>
                ) : durum === 'hata' ? (
                    <>
                        <h1 className="mt-4 font-display text-xl font-black text-slate-800">
                            Bağlanamadık
                        </h1>
                        <div className="mt-3 flex items-start gap-2 rounded-2xl border-2 border-rose-200 bg-rose-50 p-3 text-left">
                            <AlertCircle size={18} className="mt-0.5 shrink-0 text-rose-500" />
                            <p className="text-[13px] font-bold text-rose-700">{hata}</p>
                        </div>
                    </>
                ) : (
                    <>
                        <h1 className="mt-4 font-display text-xl font-black text-slate-800">
                            VS Code’u bağla
                        </h1>
                        <p className="mt-2 text-sm font-medium leading-relaxed text-slate-500">
                            VS Code eklentisi hesabına bağlanmak istiyor. VS Code’un sağ altında
                            gördüğün <b>8 karakterlik kodu</b> buraya yaz.
                        </p>
                        <label className="block mt-5 text-left">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-500">VS Code’daki kod</span>
                            <input
                                value={kod}
                                onChange={(e) => setKod(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && temizKod.length === 8) void onayla(); }}
                                placeholder="ABCD-EFGH"
                                maxLength={12}
                                autoFocus
                                autoComplete="off"
                                spellCheck={false}
                                className="mt-1 w-full rounded-2xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.3em] uppercase outline-none focus:border-indigo-400 focus:bg-white"
                            />
                        </label>
                        <button
                            onClick={onayla}
                            disabled={durum === 'gonderiliyor' || temizKod.length !== 8}
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-b-4 border-indigo-800 bg-indigo-600 py-3.5 font-display text-[13px] font-black uppercase tracking-widest text-white transition-all hover:bg-indigo-700 active:translate-y-[3px] active:border-b-0 disabled:opacity-60"
                        >
                            {durum === 'gonderiliyor'
                                ? <><Loader2 size={16} className="animate-spin" /> Bağlanıyor…</>
                                : 'Bağlantıyı Onayla'}
                        </button>
                        <p className="mt-3 text-[11px] font-bold text-slate-400">
                            VS Code’da böyle bir kod görmüyorsan bu sayfayı kapat — birisi hesabına erişmeye çalışıyor olabilir.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default VSCodeConnectPage;
