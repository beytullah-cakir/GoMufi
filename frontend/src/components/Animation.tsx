import { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ArrowLeft, Sparkles, Heart, Moon, Zap, Smile, Volume2, ShieldAlert } from 'lucide-react';

interface Particle {
  id: number;
  type: 'heart' | 'zzz' | 'exclamation';
  x: number;
  y: number;
}

export default function Animation() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Cat refs for GSAP targeting
  // catRef bir <div>, geri kalanlar SVG <g> gruplarına bağlanıyor.
  const catRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const tailRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const leftEyeRef = useRef<SVGGElement>(null);
  const rightEyeRef = useRef<SVGGElement>(null);
  const leftEarRef = useRef<SVGGElement>(null);
  const rightEarRef = useRef<SVGGElement>(null);
  const leftLegRef = useRef<SVGGElement>(null);
  const rightLegRef = useRef<SVGGElement>(null);

  const [activeAction, setActiveAction] = useState<null | 'idle' | 'pet' | 'scare' | 'dance' | 'sleep'>('idle');
  const [particles, setParticles] = useState<Particle[]>([]);
  const [catMood, setCatMood] = useState<string>('Mutlu');

  // Ambient Idle Animations (Head bobbing, tail wagging, ears twitching, breathing)
  const idleTimeline = useRef<gsap.core.Timeline | null>(null);
  const blinkTimeline = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    if (activeAction !== 'idle') return;

    // Reset components to standard idle layout with explicit transformOrigin in GSAP
    gsap.set([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, scaleX: 1, y: 0, scale: 1, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px') });
    gsap.set(leftEarRef.current, { rotation: 0, y: 0, transformOrigin: '120px 127px' });
    gsap.set(rightEarRef.current, { rotation: 0, y: 0, transformOrigin: '280px 127px' });
    gsap.set(catRef.current, { y: 0, x: 0 });
    gsap.set(headRef.current, { y: 0, rotation: 0, transformOrigin: '200px 276px' });
    gsap.set(bodyRef.current, { scaleY: 1, scaleX: 1, rotation: 0, transformOrigin: '200px 430px' });
    gsap.set(tailRef.current, { rotation: 0, scaleY: 1, transformOrigin: '150px 404px' });
    gsap.set([leftLegRef.current, rightLegRef.current], { y: 0, transformOrigin: (i) => (i === 0 ? '170px 410px' : '230px 410px') });

    // 1. Idle Timeline
    idleTimeline.current = gsap.timeline({ repeat: -1, yoyo: true })
      // Tail Wag
      .to(tailRef.current, { rotation: -8, transformOrigin: '150px 404px', duration: 1.8, ease: 'sine.inOut' }, 0)
      // Head Bob
      .to(headRef.current, { y: 3, rotation: 0.5, transformOrigin: '200px 276px', duration: 2, ease: 'sine.inOut' }, 0)
      // Breathing Body
      .to(bodyRef.current, { scaleY: 1.02, scaleX: 0.99, transformOrigin: '200px 430px', duration: 2, ease: 'sine.inOut' }, 0);

    // 2. Random Blink Timeline
    const blink = () => {
      if (activeAction !== 'idle' && activeAction !== 'pet') return;
      blinkTimeline.current = gsap.timeline({ onComplete: () => {
        // Schedule next random blink (between 2 to 5 seconds)
        gsap.delayedCall(gsap.utils.random(2, 5), blink);
      }})
      .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 0.05, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px'), duration: 0.12, ease: 'power2.inOut' })
      .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px'), duration: 0.12, ease: 'power2.inOut' });
    };
    
    // Start blinking loop
    gsap.delayedCall(2, blink);

    // 3. Random Ear Twitches
    const twitchEars = () => {
      if (activeAction !== 'idle') return;
      const targetEar = Math.random() > 0.5 ? leftEarRef.current : rightEarRef.current;
      const rotAmount = targetEar === leftEarRef.current ? -25 : 25;
      const origRot = 0;
      const tOrigin = targetEar === leftEarRef.current ? '120px 127px' : '280px 127px';

      gsap.timeline({ onComplete: () => gsap.delayedCall(gsap.utils.random(3, 6), twitchEars) })
        .to(targetEar, { rotation: rotAmount, transformOrigin: tOrigin, duration: 0.08, yoyo: true, repeat: 3, ease: 'power1.inOut' })
        .to(targetEar, { rotation: origRot, transformOrigin: tOrigin, duration: 0.1 });
    };
    gsap.delayedCall(3, twitchEars);

    return () => {
      if (idleTimeline.current) idleTimeline.current.kill();
      if (blinkTimeline.current) blinkTimeline.current.kill();
      gsap.killTweensOf(blink);
      gsap.killTweensOf(twitchEars);
    };
  }, { scope: containerRef, dependencies: [activeAction] });

  // Handle particle animation triggering
  const triggerParticle = (type: 'heart' | 'zzz' | 'exclamation') => {
    const id = Date.now() + Math.random();
    const x = Math.random() * 120 - 60; // offset around head
    const y = -100;
    setParticles(prev => [...prev, { id, type, x, y: 0 }]);
  };

  // Particle floating animation using GSAP on mount
  useEffect(() => {
    particles.forEach(p => {
      const el = document.querySelector(`.particle-${p.id}`);
      if (el) {
        gsap.fromTo(el,
          { y: 0, opacity: 1, scale: 0.5 },
          { 
            y: -140, 
            x: p.x + (Math.random() * 40 - 20), 
            opacity: 0, 
            scale: 1.3, 
            duration: 1.8, 
            ease: 'power1.out',
            onComplete: () => {
              setParticles(prev => prev.filter(item => item.id !== p.id));
            }
          }
        );
      }
    });
  }, [particles]);

  // Dynamic sleep state interval for spawning "Zzz"
  useEffect(() => {
    if (activeAction !== 'sleep') return;
    const interval = setInterval(() => {
      triggerParticle('zzz');
    }, 1200);
    return () => clearInterval(interval);
  }, [activeAction]);

  // Dynamic pet state interval for spawning Hearts
  useEffect(() => {
    if (activeAction !== 'pet') return;
    const interval = setInterval(() => {
      triggerParticle('heart');
    }, 600);
    return () => clearInterval(interval);
  }, [activeAction]);

  // Custom Interactive Actions
  const handlePet = () => {
    if (activeAction === 'sleep') handleWakeUp();
    setActiveAction('pet');
    setCatMood('Keyifli');

    // 1. Tilt Head and close eyes happily
    gsap.timeline({
      onComplete: () => {
        setActiveAction('idle');
        setCatMood('Mutlu');
      }
    })
    .to(headRef.current, { rotation: 8, y: 5, transformOrigin: '200px 276px', duration: 0.4, ease: 'sine.inOut' })
    .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 0.2, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px'), duration: 0.3 }, 0)
    // 2. Fast tail wagging
    .to(tailRef.current, { rotation: -22, transformOrigin: '150px 404px', duration: 0.15, yoyo: true, repeat: 7 }, 0)
    // 3. Relax back
    .to(headRef.current, { rotation: 0, y: 0, transformOrigin: '200px 276px', duration: 0.4 })
    .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px'), duration: 0.3 }, '+=0.1');
  };

  const handleScare = () => {
    if (activeAction === 'sleep') handleWakeUp();
    setActiveAction('scare');
    setCatMood('Korkmuş!');
    triggerParticle('exclamation');

    const mainTl = gsap.timeline({
      onComplete: () => {
        setActiveAction('idle');
        setCatMood('Sakinleşti');
      }
    });

    // 1. Jumps & Shakes
    mainTl.to(catRef.current, { y: -80, rotation: -2, transformOrigin: '150px 470px', duration: 0.2, ease: 'power2.out' })
      .to(catRef.current, { y: 0, rotation: 0, transformOrigin: '150px 470px', duration: 0.25, ease: 'bounce.out' })
      .to(catRef.current, { x: '+=4', duration: 0.05, yoyo: true, repeat: 10 }, 0.45);

    // 2. Eyes wide and high
    mainTl.to([leftEyeRef.current, rightEyeRef.current], { scale: 1.35, y: -4, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px'), duration: 0.15, ease: 'power2.out' }, 0);

    // 3. Ears flat to the side
    mainTl.to(leftEarRef.current, { rotation: -60, y: 6, transformOrigin: '120px 127px', duration: 0.15 }, 0)
      .to(rightEarRef.current, { rotation: 60, y: 6, transformOrigin: '280px 127px', duration: 0.15 }, 0);

    // 4. Tail gets thin/stiff
    mainTl.to(tailRef.current, { rotation: 35, scaleY: 1.4, transformOrigin: '150px 404px', duration: 0.15 }, 0);

    // 5. Restore layouts slowly
    mainTl.to([leftEyeRef.current, rightEyeRef.current], { scale: 1, y: 0, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px'), duration: 0.6, ease: 'power1.inOut' }, 1.2)
      .to(leftEarRef.current, { rotation: 0, y: 0, transformOrigin: '120px 127px', duration: 0.5 }, 1.2)
      .to(rightEarRef.current, { rotation: 0, y: 0, transformOrigin: '280px 127px', duration: 0.5 }, 1.2)
      .to(tailRef.current, { rotation: 0, scaleY: 1, transformOrigin: '150px 404px', duration: 0.5 }, 1.2);
  };

  const handleDance = () => {
    if (activeAction === 'sleep') handleWakeUp();
    setActiveAction('dance');
    setCatMood('Dans Ediyor!');

    const danceTl = gsap.timeline({
      onComplete: () => {
        setActiveAction('idle');
        setCatMood('Mutlu');
      }
    });

    // Sway 1
    danceTl.to(bodyRef.current, { rotation: -8, scaleX: 1.03, transformOrigin: '200px 430px', duration: 0.3, ease: 'sine.inOut' })
      .to(headRef.current, { rotation: 5, x: 8, transformOrigin: '200px 276px', duration: 0.3, ease: 'sine.inOut' }, 0)
      .to(leftLegRef.current, { y: -10, transformOrigin: '170px 410px', duration: 0.15, yoyo: true, repeat: 1 }, 0)
      .to(tailRef.current, { rotation: -24, transformOrigin: '150px 404px', duration: 0.3 }, 0);

    // Sway 2
    danceTl.to(bodyRef.current, { rotation: 8, scaleX: 1.03, transformOrigin: '200px 430px', duration: 0.6, yoyo: true, repeat: 3, ease: 'sine.inOut' })
      .to(headRef.current, { rotation: -5, x: -8, transformOrigin: '200px 276px', duration: 0.6, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.3)
      .to(rightLegRef.current, { y: -10, transformOrigin: '230px 410px', duration: 0.15, yoyo: true, repeat: 1, delay: 0.15 }, 0.3)
      .to(leftLegRef.current, { y: -10, transformOrigin: '170px 410px', duration: 0.15, yoyo: true, repeat: 1, delay: 0.45 }, 0.3)
      .to(rightLegRef.current, { y: -10, transformOrigin: '230px 410px', duration: 0.15, yoyo: true, repeat: 1, delay: 0.75 }, 0.3)
      .to(tailRef.current, { rotation: 24, transformOrigin: '150px 404px', duration: 0.6, yoyo: true, repeat: 3 }, 0.3);

    // Centering back
    danceTl.to(bodyRef.current, { x: 0, rotation: 0, scaleX: 1, transformOrigin: '200px 430px', duration: 0.4 })
      .to(headRef.current, { x: 0, rotation: 0, transformOrigin: '200px 276px', duration: 0.4 }, 0)
      .to(tailRef.current, { x: 0, rotation: 0, transformOrigin: '150px 404px', duration: 0.4 }, 0);
  };

  const handleSleep = () => {
    setActiveAction('sleep');
    setCatMood('Uyuyor...');

    gsap.to(headRef.current, { y: 14, rotation: -3, transformOrigin: '200px 276px', duration: 1.8, ease: 'power1.inOut' });
    gsap.to([leftEyeRef.current, rightEyeRef.current], { scaleY: 0, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px'), duration: 1.2, ease: 'power1.inOut' });
    // NOT: position parametresi (3. argüman) yalnızca timeline'larda geçerlidir,
    // tekil gsap.to() çağrılarında değil — bu yüzden kaldırıldı.
    gsap.to(leftEarRef.current, { rotation: -25, transformOrigin: '120px 127px', duration: 1.5 });
    gsap.to(rightEarRef.current, { rotation: 25, transformOrigin: '280px 127px', duration: 1.5 });
    gsap.to(tailRef.current, { rotation: 6, transformOrigin: '150px 404px', duration: 2 });
  };

  const handleWakeUp = () => {
    setActiveAction('idle');
    setCatMood('Günaydın!');
    triggerParticle('exclamation');

    gsap.timeline()
      .to(headRef.current, { y: 0, rotation: 0, transformOrigin: '200px 276px', duration: 0.6, ease: 'back.out(1.5)' })
      .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, transformOrigin: (i) => (i === 0 ? '150px 189px' : '250px 189px'), duration: 0.4 }, 0)
      .to(leftEarRef.current, { rotation: 0, transformOrigin: '120px 127px', duration: 0.5 }, 0)
      .to(rightEarRef.current, { rotation: 0, transformOrigin: '280px 127px', duration: 0.5 }, 0);
  };

  return (
    <div 
      ref={containerRef} 
      className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12 overflow-hidden relative selection:bg-purple-500 selection:text-white"
    >
      {/* Background Ornaments */}
      <div className="absolute top-[-10%] right-[-10%] w-[35rem] h-[35rem] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[35rem] h-[35rem] bg-sky-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Navigation / Header */}
        <header className="flex justify-between items-center mb-12 border-b border-slate-800/80 pb-6">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Ana Sayfaya Dön
          </button>
          <div className="flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> GSAP v3 + React 19
          </div>
        </header>

        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 flex justify-center gap-3 overflow-hidden py-1">
            <span className="inline-block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">GSAP & CSS</span>
            <span className="inline-block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Karakter Animasyonu</span>
          </h1>
          <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto font-medium">
            Özel CSS çizimi ile tasarlanan sevimli kediyi GSAP zaman çizelgeleri ve fizik animasyonlarıyla canlandıralım.
          </p>
        </div>

        {/* Primary Cat Animation Showcase */}
        <div className="bg-slate-900/60 border border-slate-800/60 rounded-3xl p-8 backdrop-blur-md mb-12 shadow-2xl">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            
            {/* Left: Interactive Cat Sandbox */}
            <div className="flex-1 flex flex-col items-center justify-center relative min-h-[420px] w-full bg-slate-950/40 rounded-2xl p-8 border border-slate-850">
              
              {/* Particle Spawner Area */}
              <div className="absolute top-16 z-30 pointer-events-none select-none">
                {particles.map(p => (
                  <div 
                    key={p.id} 
                    className={`particle-${p.id} absolute flex items-center justify-center text-3xl transition-transform`}
                  >
                    {p.type === 'heart' && <Heart className="w-8 h-8 text-pink-500 fill-pink-500" />}
                    {p.type === 'zzz' && <span className="font-black text-sky-400 drop-shadow-md">Zzz</span>}
                    {p.type === 'exclamation' && <span className="font-black text-amber-500 text-4xl drop-shadow-md">!</span>}
                  </div>
                ))}
              </div>

              {/* Cat Wrapper - High-Fidelity SVG Implementation */}
              <div ref={catRef} className="cat-character relative w-[336px] h-[420px] flex items-center justify-center select-none">
                
                <svg viewBox="0 0 400 500" className="w-full h-full drop-shadow-2xl">
                  {/* Zemin: koyu lacivert duz platform */}
                  <rect x="119" y="459" width="162" height="17" rx="8.5" fill="#3c4a63" />

                  {/* Kuyruk: govdenin arkasindan sola uzanir, dis yarisi somon */}
                  <g ref={tailRef} className="cat-tail origin-[150px_404px]">
                    <path d="M 152,404 C 130,413 112,411 100,403" fill="none" stroke="#fdfaf0" strokeWidth="34" strokeLinecap="round" />
                    <path d="M 100,403 C 82,394 60,379 46,362" fill="none" stroke="#f4a189" strokeWidth="34" strokeLinecap="butt" />
                    <circle cx="46" cy="362" r="17" fill="#f4a189" />
                  </g>

                  {/* Bacaklar + somon patiler (ustleri govdenin arkasinda) */}
                  <g id="legs">
                    <g ref={leftLegRef} className="cat-leg-left origin-[170px_410px]">
                      <rect x="150" y="392" width="44" height="52" rx="18" fill="#fdfaf0" />
                      <ellipse cx="168" cy="449" rx="28" ry="13.5" fill="#f4a189" />
                    </g>
                    <g ref={rightLegRef} className="cat-leg-right origin-[230px_410px]">
                      <rect x="206" y="392" width="44" height="52" rx="18" fill="#fdfaf0" />
                      <ellipse cx="232" cy="449" rx="28" ry="13.5" fill="#f4a189" />
                    </g>
                  </g>

                  {/* Govde + yanlarda yuvarlak kol loblari */}
                  <g ref={bodyRef} className="cat-body origin-[200px_430px]">
                    <path
                      d="M 152,270 C 139,292 135,326 137,362 C 139,392 145,416 155,428 C 161,434 188,436 194,434 C 195,426 197,416 200,408 C 203,416 205,426 206,434 C 212,436 239,434 245,428 C 255,416 261,392 263,362 C 265,326 261,292 248,270 Z"
                      fill="#fdfaf0"
                    />
                    <path d="M 132,310 C 125,332 125,354 134,374" fill="none" stroke="#fdfaf0" strokeWidth="32" strokeLinecap="round" />
                    <path d="M 268,310 C 275,332 275,354 266,374" fill="none" stroke="#fdfaf0" strokeWidth="32" strokeLinecap="round" />
                    <path d="M 147,314 C 141,334 141,354 148,372" fill="none" stroke="#e8e0cc" strokeWidth="2.8" strokeLinecap="round" />
                    <path d="M 253,314 C 259,334 259,354 252,372" fill="none" stroke="#e8e0cc" strokeWidth="2.8" strokeLinecap="round" />
                  </g>

                  {/* Bas grubu */}
                  <g ref={headRef} className="cat-head origin-[200px_276px]">

                    {/* Kulaklar: genis ucgen, ucu hafif yuvarlak */}
                    <g ref={leftEarRef} className="cat-ear-left origin-[120px_127px]">
                      <path d="M 85,145 C 80,110 88,58 97,38 C 100,32 106,34 110,42 C 122,66 142,92 155,110 Z" fill="#fdfaf0" />
                      <path d="M 96,133 C 92,108 98,70 104,55 C 107,50 111,52 114,58 C 124,78 139,98 148,112 Z" fill="#f4a189" />
                    </g>
                    <g ref={rightEarRef} className="cat-ear-right origin-[280px_127px]">
                      <path d="M 315,145 C 320,110 312,58 303,38 C 300,32 294,34 290,42 C 278,66 258,92 245,110 Z" fill="#fdfaf0" />
                      <path d="M 304,133 C 308,108 302,70 296,55 C 293,50 289,52 286,58 C 276,78 261,98 252,112 Z" fill="#f4a189" />
                    </g>

                    {/* Yanak tuyleri */}
                    <path d="M 88,178 C 78,183 67,190 60,197 C 70,201 80,201 90,200 C 79,207 69,216 63,225 C 75,228 88,222 97,213 Z" fill="#fdfaf0" />
                    <path d="M 312,178 C 322,183 333,190 340,197 C 330,201 320,201 310,200 C 321,207 331,216 337,225 C 325,228 312,222 303,213 Z" fill="#fdfaf0" />

                    {/* Ana bas formu: enli, yuvarlak kare */}
                    <path d="M 75,150 C 75,106 126,85 200,85 C 274,85 325,106 325,150 C 325,194 324,238 300,260 C 278,280 242,282 200,282 C 158,282 122,280 100,260 C 76,238 75,194 75,150 Z" fill="#fdfaf0" />

                    {/* Kulak diplerindeki tuy kabarciklari */}
                    <path d="M 140,100 C 146,88 155,85 161,96 C 167,85 177,86 183,99 Z" fill="#fdfaf0" />
                    <path d="M 260,100 C 254,88 245,85 239,96 C 233,85 223,86 217,99 Z" fill="#fdfaf0" />

                    {/* Gozler: iris gozu neredeyse doldurur, ustte beyaz hilal */}
                    <g ref={leftEyeRef} className="cat-eye-left origin-[150px_189px]">
                      <ellipse cx="150" cy="189" rx="33" ry="38.5" fill="#ffffff" stroke="#efe9d9" strokeWidth="1.5" />
                      <circle cx="154" cy="194" r="25" fill="#1f6cb0" />
                      <circle cx="146" cy="184" r="9" fill="#ffffff" />
                      <circle cx="166" cy="208" r="5" fill="#ffffff" />
                    </g>
                    <g ref={rightEyeRef} className="cat-eye-right origin-[250px_189px]">
                      <ellipse cx="250" cy="189" rx="33" ry="38.5" fill="#ffffff" stroke="#efe9d9" strokeWidth="1.5" />
                      <circle cx="246" cy="194" r="25" fill="#2b2b2b" />
                      <circle cx="238" cy="184" r="9" fill="#ffffff" />
                      <circle cx="258" cy="208" r="5" fill="#ffffff" />
                    </g>

                    {/* Burun */}
                    <path d="M 190,202 C 189,199 191,197 194,197 L 206,197 C 209,197 211,199 210,202 C 208,209 203,215 200,215 C 197,215 192,209 190,202 Z" fill="#f4a189" />

                    {/* Acik agiz + dil */}
                    <g id="mouth" className="cat-mouth">
                      <path d="M 180,224 C 186,218 195,223 200,230 C 205,223 214,218 220,224 C 224,244 213,260 200,260 C 187,260 176,244 180,224 Z" fill="#a3132c" />
                      <path d="M 186,243 C 189,257 211,257 214,243 C 206,237 194,237 186,243 Z" fill="#ea2440" />
                    </g>

                  </g>
                </svg>

              </div>

            </div>

            {/* Right: Controller Dashboard */}
            <div className="flex-1 flex flex-col justify-between h-full min-h-[380px]">
              <div>
                <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                  Kedi Etkileşim Paneli <Smile className="w-6 h-6 text-purple-400" />
                </h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Çizilen sevimli kediye farklı tepkiler verdirebilirsiniz. Her buton, kedinin organları üzerindeki GSAP zaman çizgilerini ve fiziksel sarsıntı modellerini tetikler.
                </p>

                <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-6 mb-8">
                  <div className="text-xs uppercase font-bold tracking-widest text-slate-500 mb-1.5">Mevcut Ruh Hali</div>
                  <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-pulse">
                    {catMood}
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handlePet}
                  disabled={activeAction !== 'idle' && activeAction !== 'sleep'}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold bg-[#ec4899] hover:bg-[#db2777] text-white transition-all shadow-lg shadow-pink-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Heart className="w-5 h-5 fill-white" />
                  Sev (Sevgi Ver)
                </button>

                <button
                  onClick={handleScare}
                  disabled={activeAction !== 'idle' && activeAction !== 'sleep'}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold bg-[#f59e0b] hover:bg-[#d97706] text-white transition-all shadow-lg shadow-amber-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Volume2 className="w-5 h-5" />
                  Korkut!
                </button>

                <button
                  onClick={handleDance}
                  disabled={activeAction !== 'idle' && activeAction !== 'sleep'}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold bg-[#3b82f6] hover:bg-[#2563eb] text-white transition-all shadow-lg shadow-blue-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Zap className="w-5 h-5 fill-white" />
                  Dans Ettir
                </button>

                {activeAction === 'sleep' ? (
                  <button
                    onClick={handleWakeUp}
                    className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/10 cursor-pointer"
                  >
                    <Sparkles className="w-5 h-5" />
                    Uyandır
                  </button>
                ) : (
                  <button
                    onClick={handleSleep}
                    disabled={activeAction !== 'idle'}
                    className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-100 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Moon className="w-5 h-5" />
                    Uyu
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Existing GSAP Demos Section */}
        <div className="border-t border-slate-900 pt-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-200">Diğer GSAP Laboratuvarı Örnekleri</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Card 1: Timeline Showcase */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" /> Zaman Çizelgesi (Timeline)
                </h3>
                <p className="text-slate-400 text-xs mb-6">
                  Sıralı animasyonlar kurmak için idealdir. Aşağıdaki kutuyu kontrol edebilirsiniz.
                </p>
                <div className="h-32 bg-slate-950/60 border border-slate-850 rounded-xl p-4 mb-4 flex items-center relative overflow-hidden">
                  <div className="cat-demo-box w-12 h-12 bg-blue-500 rounded-lg shadow-lg flex items-center justify-center text-[10px] font-black">
                    VITE
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  gsap.to('.cat-demo-box', { x: 120, rotation: 360, duration: 1, yoyo: true, repeat: 1, ease: 'power2.inOut' });
                }}
                className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white cursor-pointer"
              >
                Kutuyu Oynat
              </button>
            </div>

            {/* Card 2: 3D Hover Card */}
            <div className="bg-slate-900/40 border border-slate-850 rounded-3xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-100 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-400" /> 3D Perspektif Hover
                </h3>
                <p className="text-slate-400 text-xs mb-6">
                  Mouse hareketine göre tilt olan pürüzsüz kart animasyonu örneği.
                </p>
                <div className="h-32 flex items-center justify-center bg-slate-950/60 border border-slate-850 rounded-xl p-4">
                  <div 
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left - rect.width / 2;
                      const y = e.clientY - rect.top - rect.height / 2;
                      gsap.to(e.currentTarget, { rotateY: x * 0.2, rotateX: -y * 0.2, transformPerspective: 300, duration: 0.2 });
                    }}
                    onMouseLeave={(e) => {
                      gsap.to(e.currentTarget, { rotateY: 0, rotateX: 0, duration: 0.4 });
                    }}
                    className="w-40 h-20 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center text-xs font-black shadow-lg cursor-pointer"
                  >
                    3D KART
                  </div>
                </div>
              </div>
              <div className="text-[10px] text-center text-slate-500">Mouse'u kartın üstüne getirin</div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
