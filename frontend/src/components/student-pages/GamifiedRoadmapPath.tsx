import React, { useState } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import ButtonCyan from '../../assets/sprites/ButtonCyan.png';
import ButtonPurple from '../../assets/sprites/ButtonPurple.png';
import ButtonYellow from '../../assets/sprites/ButtonYellow.png';
import ButtonGreen from '../../assets/sprites/ButtonGreen.png';
import ButtonDarkBlue from '../../assets/sprites/ButtonDarkBlue.png';
import ButtonDarkPurple from '../../assets/sprites/ButtonDarkPurple.png';
import BrainIcon from '../../assets/sprites/Brain.png';
import PencilIcon from '../../assets/sprites/Pencil.png';
import PuzzleIcon from '../../assets/sprites/Puzzle.png';
import TrophyIcon from '../../assets/sprites/Trophy.png';
import QuestionIcon from '../../assets/sprites/Question.png';
import BagIcon from '../../assets/sprites/Bag.png';
import GrassIcon from '../../assets/sprites/grass.png';

/**
 * VS Code panelindeki oyunlaştırılmış yol haritası.
 *
 * NEDEN AYNI GÖRSEL DİL: öğrenci siteyi ve paneli aynı gün içinde açıyor;
 * roadmap iki yerde farklı görünseydi "burası başka bir ürün" hissi verirdi.
 * Bu yüzden düğümün İÇİ (kaide sprite'ı, süzülen ikon, yer gölgesi, konturlu
 * başlık, yıldızlar) HomePage'deki roadmap ile birebir aynı işaretlemedir.
 *
 * NEDEN AÇIK ZEMİN: pastel parıltılar (`pastelColor` + beyaz blur) beyaz zemin
 * için çizilmiş — koyu zeminde her kaidenin arkasında kocaman bir hâle olarak
 * patlıyorlar. Sitedeki gibi beyaz zeminde bunlar yumuşak bir aydınlanmaya
 * dönüşüyor, bu yüzden panel de beyaz.
 *
 * TEK YAPISAL FARK YÖN: panel dar ve dikey. Sitede yol soldan sağa akar; burada
 * yukarıdan aşağıya. Dolayısıyla düğümlerin `curve` (yukarı/aşağı) alternansı
 * yerine yatay kaydırma dalgası (`OFFSETS`) var ve bağlayıcı eğri dikey çizilir.
 */

export interface RoadmapModule {
    key: string;
    title: string;
    stage: string;
    xp: number;
    slides: any[];
    stars?: number;
    /** Sunucuda bitmiş sayılıyor mu (düğme "Tekrar et" olur) */
    done?: boolean;
    isLocked?: boolean;
    lessonNumber?: number;
    lessonTopic?: string;
}

interface GamifiedRoadmapPathProps {
    courseTitle: string;
    modules: RoadmapModule[];
    onSelectModule: (module: RoadmapModule) => void;
    activeKey?: string | null;
    /** Kurs başlığı şeridi. Ana sayfada kahraman alanı kursu zaten gösterdiği için kapatılır. */
    showHeader?: boolean;
    isDark?: boolean;
}

// StudentApp.tsx'teki `getNodeMetadata` ile aynı tablo. Orada anahtar tema adı
// (purple/cyan/...), burada aşama adı — panelde elimizde tema değil aşama var.
const STAGE_META: Record<string, any> = {
    'ANLA': { button: ButtonPurple, icon: BrainIcon, ringColor: 'border-fuchsia-400 bg-white', baseColor: '#d946ef', strokeColor: '#c026d3', pastelColor: '#fae8ff', iconSize: 'w-20 h-20', iconOffset: '-mt-22' },
    'UYGULA': { button: ButtonCyan, icon: PencilIcon, ringColor: 'border-cyan-400 bg-white', baseColor: '#06b6d4', strokeColor: '#0891b2', pastelColor: '#cffafe', iconSize: 'w-24 h-24', iconOffset: '-mt-20' },
    'BİRLEŞTİR': { button: ButtonGreen, icon: PuzzleIcon, ringColor: 'border-green-400 bg-white', baseColor: '#22c55e', strokeColor: '#16a34a', pastelColor: '#dcfce7', iconSize: 'w-20 h-20', iconOffset: '-mt-20' },
    'ÜRET': { button: ButtonYellow, icon: TrophyIcon, ringColor: 'border-yellow-400 bg-white', baseColor: '#eab308', strokeColor: '#ca8a04', pastelColor: '#fef9c3', iconSize: 'w-24 h-24', iconOffset: '-mt-20' },
    'QUIZ': { button: ButtonDarkPurple, icon: QuestionIcon, ringColor: 'border-purple-400 bg-white', baseColor: '#7c3aed', strokeColor: '#6d28d9', pastelColor: '#ede9fe', iconSize: 'w-26 h-26', iconOffset: '-mt-24' },
    'ÖDEV': { button: ButtonDarkBlue, icon: BagIcon, ringColor: 'border-indigo-400 bg-white', baseColor: '#2563eb', strokeColor: '#1d4ed8', pastelColor: '#e0e7ff', iconSize: 'w-26 h-26', iconOffset: '-mt-24' },
};

// Yılan yolu: sitedeki yatay `curve: up/down` alternansının dikey karşılığı.
// Genlik ±52px — düğüm (144px) ve başlık (208px) ile birlikte en geniş noktada
// ~312px yer kaplar, dar bir panelde bile taşmaz.
const OFFSETS = [0, 36, 52, 36, 0, -36, -52, -36];

// Kaidenin ALTINDA kalan mutlak konumlu içerik: konturlu başlık (~85→130px) ve
// yıldızlar (140→172px). Yani her düğümün altında akışta yer kaplamayan ama
// dolu olan ~96px'lik bir şerit var. Noktalı yol bu şeridin İÇİNE girmemeli —
// sitede de yol düğümlerin yanından geçer, başlığın üstünden değil.
const NODE_TAIL = 96;
// Yolun kendisine ayrılan yükseklik (sonraki düğümün süzülen ikonu buraya taşar).
const PATH_H = 116;

/** Modül balonundaki düğmenin yazısı; ana sayfadaki yatay yolla aynı kural. */
export const moduleActionLabel = (slideCount: number, done: boolean, xp: number) =>
    slideCount === 0 ? 'Henüz içerik yok' : done ? 'Tekrar et' : `Başlat · +${xp} XP`;

export const GamifiedRoadmapPath: React.FC<GamifiedRoadmapPathProps> = ({
    courseTitle,
    showHeader = true,
    modules,
    onSelectModule,
    activeKey,
    isDark = false,
}) => {
    const [selectedKey, setSelectedKey] = useState<string | null>(activeKey || null);

    const metaOf = (stage: string) => STAGE_META[stage] || STAGE_META['ANLA'];
    const offsetOf = (index: number) => OFFSETS[index % OFFSETS.length];
    const headMeta = metaOf(modules[0]?.stage || 'ANLA');

    return (
        <div className="w-full flex flex-col items-center select-none pb-28">
            {/* Kurs başlığı — sitedeki renkli ünite başlığının dar panele sığan hâli */}
            {showHeader && (
            <div
                className="w-full max-w-[280px] rounded-2xl px-4 py-3 mb-2 text-white shadow-sm border-b-4 relative overflow-hidden"
                style={{ backgroundColor: headMeta.baseColor, borderColor: headMeta.strokeColor }}
            >
                <div className="absolute top-0 left-0 w-full h-1 bg-white/20" />
                <h2 className="text-[9px] font-black tracking-widest opacity-90 mb-0.5 uppercase font-display">
                    Oyunlaştırılmış Harita
                </h2>
                <h1 className="text-base font-black font-display tracking-tight drop-shadow-sm truncate">
                    {courseTitle}
                </h1>
            </div>
            )}

            {/* Dikey yılan yolu */}
            <div className="w-full flex flex-col items-center pt-20">
                {modules.map((mod, idx) => {
                    const meta = metaOf(mod.stage);
                    const isSelected = selectedKey === mod.key;
                    const isLocked = mod.isLocked || false;
                    const stars = mod.stars ?? 0;
                    const off = offsetOf(idx);

                    return (
                        <React.Fragment key={mod.key}>
                            {/* DERS AYIRACI — builder'daki kartın aynısı. Oradaki dikey
                                kesikli çizgi yolu yatay kestiği için; burada yol dikey
                                aktığından çizgi de yatay. */}
                            {mod.lessonTopic && (
                                <>
                                    <div className="w-full relative z-10 flex items-center justify-center pt-6 pb-2">
                                        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-dashed border-gray-300 opacity-50 -z-10" />
                                        <div className={`p-4 rounded-2xl shadow-lg border-2 flex flex-col items-center transform hover:scale-105 transition-all z-10 w-40 ${
                                            isDark ? 'bg-slate-900 border-indigo-900' : 'bg-white border-indigo-100'
                                        }`}>
                                            <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-1 shrink-0">
                                                DERS {mod.lessonNumber || 1}
                                            </span>
                                            <span className={`text-sm font-black font-display tracking-tight text-center leading-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                {mod.lessonTopic}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ayıraçtan düğüme inen yol (builder'da da ayrı bir bağlayıcı) */}
                                    <Connector from={0} to={off} index={idx} tail={0} color={meta.baseColor} />
                                </>
                            )}

                            {/* Düğüm sarmalayıcı: yatay kaydırma BURADA yapılır.
                                İçerideki hover:scale-105 de bir transform — ikisi aynı
                                elemanda olsaydı satır içi stil sınıfı ezer ve hover
                                büyümesi ölürdü. */}
                            <div
                                className="relative flex justify-center w-full"
                                style={{ transform: `translateX(${off}px)` }}
                            >
                                <div
                                    className={`relative z-10 group w-36 transform hover:scale-105 transition-transform duration-200 ${
                                        isLocked ? 'grayscale opacity-75 pointer-events-none' : 'cursor-pointer'
                                    }`}
                                    onClick={() => {
                                        if (isLocked) return;
                                        setSelectedKey(isSelected ? null : mod.key);
                                    }}
                                >
                                    {/* Yıldızlar */}
                                    <div className="absolute top-35 left-1/2 -translate-x-1/2 flex gap-1 z-30 items-start">
                                        {[0, 1, 2].map((i) => (
                                            <svg
                                                key={i}
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                className={`w-8 h-8 drop-shadow-md transition-transform
                                                    ${i < stars ? 'text-yellow-400' : 'text-gray-300'}
                                                    ${i === 0 ? 'rotate-6' : ''}
                                                    ${i === 1 ? 'translate-y-1 scale-110' : ''}
                                                    ${i === 2 ? '-rotate-6' : ''}
                                                `}
                                            >
                                                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                                            </svg>
                                        ))}
                                    </div>

                                    {/* Hover halkası */}
                                    <div className={`absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-16 border-8 rounded-[100%] opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none z-0 ${
                                        isDark ? meta.ringColor.replace(' bg-white', '') : meta.ringColor
                                    } ${isLocked ? 'hidden' : ''}`} />

                                    {/* Kaide sprite'ı */}
                                    <img src={meta.button} alt="" className="w-36 relative z-10" />

                                    {/* Yer gölgesi — süzülen ikondan bağımsız nabız atar */}
                                    <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
                                        <div
                                            className={`w-14 h-4 rounded-[100%] animate-shadow-pulse -mt-10 ${isDark ? 'bg-black/45' : 'bg-gray-300'}`}
                                            style={{ animationDelay: `${idx * 0.5 * -1}s` }}
                                        />
                                    </div>

                                    {/* Süzülen ikon + altındaki konturlu başlık */}
                                    <div className={`absolute inset-0 flex items-center justify-center z-20 ${meta.iconOffset}`}>
                                        <div
                                            className="absolute w-36 h-36 rounded-full blur-3xl opacity-100 animate-pulse"
                                            style={{ backgroundColor: meta.pastelColor, animationDelay: `${idx * 0.5 * -1}s` }}
                                        />
                                        <div
                                            className="absolute w-16 h-16 bg-white rounded-full blur-2xl opacity-80 animate-pulse"
                                            style={{ animationDelay: `${idx * 0.5 * -1}s` }}
                                        />

                                        {isLocked ? (
                                            <div className="w-16 h-16 rounded-2xl bg-gray-200 border-4 border-gray-300 flex items-center justify-center shadow-md relative z-10">
                                                <Lock className="w-7 h-7 text-gray-500" />
                                            </div>
                                        ) : (
                                            <img
                                                src={meta.icon}
                                                alt={mod.stage}
                                                className={`${meta.iconSize} animate-float relative z-10`}
                                                style={{
                                                    filter: `drop-shadow(0 0 5px ${meta.pastelColor})`,
                                                    animationDelay: `${idx * 0.5 * -1}s`,
                                                }}
                                            />
                                        )}

                                        <div
                                            className="absolute top-[105%] flex flex-col items-center justify-start animate-float z-20 w-52"
                                            style={{ animationDelay: `${idx * 0.5 * -1}s` }}
                                        >
                                            <span
                                                className="text-lg font-black tracking-wide select-none text-center line-clamp-2 leading-tight max-w-[200px] px-1 break-words"
                                                style={{
                                                    fontFamily: "'Fredoka', sans-serif",
                                                    color: 'white',
                                                    WebkitTextStroke: `1.5px ${meta.strokeColor}`,
                                                    paintOrder: 'stroke fill',
                                                    textShadow: `2px 2px 0px ${meta.strokeColor}`,
                                                }}
                                                title={mod.title}
                                            >
                                                {mod.title?.toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Balon kart.
                                Sitede kart düğümün üstünde HAVADA durur; orada bolca boş
                                yatay alan var. Dar ve dikey panelde havada duran kart ya
                                bir üstteki ya bir alttaki düğümün üzerine biniyordu — bu
                                yüzden burada AKIŞA giriyor: açıldığında yer açar, hiçbir
                                şeyin üstünü örtmez. */}
                            {isSelected && !isLocked && (
                                <div
                                    className="relative w-full flex justify-center z-30 animate-slide-up"
                                    style={{ marginTop: NODE_TAIL + 8 }}
                                >
                                    <div className="relative w-[248px]">
                                        {/* Zemin + parıltı */}
                                        <div
                                            className="absolute inset-0 rounded-3xl overflow-hidden shadow-xl border-x-2 border-t-2 border-b-[6px]"
                                            style={{ backgroundColor: meta.baseColor, borderColor: meta.strokeColor }}
                                        >
                                            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-20 rounded-full blur-3xl" />
                                            <div className="absolute bottom-0 -left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl" />
                                            <Sparkles size={24} className="absolute top-4 right-6 text-white/30" />
                                        </div>

                                        {/* Kuyruk yukarı, düğümün gerçek yatay konumuna bakar */}
                                        <div
                                            className="absolute -top-2 w-6 h-6 -translate-x-1/2 rotate-45 rounded-sm"
                                            style={{ backgroundColor: meta.baseColor, left: `calc(50% + ${off}px)` }}
                                        />

                                        <div className="relative z-10 p-5 flex flex-col items-start text-left">
                                            <h3 className="text-white font-black font-display text-lg leading-snug mb-1 drop-shadow-md pr-6">
                                                {mod.title}
                                            </h3>
                                            <span className="text-white/90 font-bold text-[10px] uppercase tracking-widest mb-4">
                                                {mod.stage} · {mod.slides.length} slayt · {mod.done ? 'tamamlandı' : `+${mod.xp} XP`}
                                            </span>

                                            <button
                                                className="w-full bg-white hover:bg-gray-50 text-center py-3 rounded-2xl shadow-lg border-b-[4px] border-black/5 active:border-b-0 active:translate-y-[4px] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:active:translate-y-0"
                                                disabled={mod.slides.length === 0}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectModule(mod);
                                                }}
                                            >
                                                <span className="font-black text-sm uppercase tracking-wider" style={{ color: meta.baseColor }}>
                                                    {moduleActionLabel(mod.slides.length, mod.done ?? stars > 0, mod.xp)}
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Bağlayıcı: noktalı yol + çimenler.
                                Kart açıkken başlık/yıldız şeridi zaten kartın üstünde
                                kaldı; yolun onu atlaması gerekmiyor, boşuna 96px boşluk
                                bırakmasın diye `tail` sıfırlanıyor. */}
                            {idx < modules.length - 1 && (
                                <Connector
                                    from={off}
                                    // Sıradaki modül bir ders ayıracıyla başlıyorsa yol
                                    // düğüme değil, ortadaki ayıraç kartına iner.
                                    to={modules[idx + 1].lessonTopic ? 0 : offsetOf(idx + 1)}
                                    index={idx}
                                    tail={isSelected && !isLocked ? 8 : NODE_TAIL}
                                    color={meta.baseColor}
                                />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

/**
 * İki düğüm arasındaki noktalı yol.
 *
 * `strokeDasharray="0 24"` + yuvarlak uç: iri nokta görünümünü veren numara —
 * kesikli çizgi değil, sıfır uzunluktaki parçaların yuvarlak uçları. Renk gri
 * değil, yolun ÇIKTIĞI düğümün `baseColor`'ı: builder'da da her bağlayıcı kendi
 * seviyesinin rengini taşır, böylece yol aşama geçişini renkle anlatır.
 *
 * SVG sabit 240px: `w-full` olsaydı dar panelde küçülür, noktalar düğümlerin
 * kaydırma değerinden kopardı ve yol düğümlere değmezdi.
 */
const Connector: React.FC<{
    from: number; to: number; index: number; tail: number; color: string;
}> = ({ from, to, index, tail, color }) => {
    const x1 = 120 + from;
    const x2 = 120 + to;
    const height = tail + PATH_H;

    return (
        <div
            className="relative w-full z-0 flex justify-center pointer-events-none"
            style={{ height }}
        >
            <svg
                width={240}
                height={height}
                className="overflow-visible shrink-0 animate-pulse"
                viewBox={`0 0 240 ${height}`}
                fill="none"
            >
                <path
                    d={`M ${x1} ${tail} C ${x1} ${tail + PATH_H * 0.38}, ${x2} ${tail + PATH_H * 0.62}, ${x2} ${height}`}
                    stroke={color}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="0 24"
                    fill="none"
                    className="opacity-75"
                />
            </svg>

            {/* Dekoratif çimenler — yolun iki yanına serpiştirilir */}
            {[
                { t: 0.12, dx: -32, w: 'w-5', rot: '-rotate-6', op: 'opacity-80' },
                { t: 0.38, dx: 28, w: 'w-6', rot: 'rotate-6', op: 'opacity-90' },
                { t: 0.62, dx: -24, w: 'w-7', rot: '-rotate-3', op: 'opacity-85' },
                { t: 0.86, dx: 34, w: 'w-5', rot: 'rotate-12', op: 'opacity-80' },
            ].map((g, i) => (
                <img
                    key={i}
                    src={GrassIcon}
                    alt=""
                    className={`absolute ${g.w} ${g.rot} ${g.op}`}
                    style={{
                        top: tail + PATH_H * g.t,
                        left: `calc(50% + ${g.dx + (index % 2 === 0 ? 6 : -6)}px)`,
                    }}
                />
            ))}
        </div>
    );
};

export default GamifiedRoadmapPath;
