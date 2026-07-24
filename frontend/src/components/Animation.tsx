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
  
  // Cat refs for GSAP targeting — SVG <g> elementleri SVGGElement tipinde olmalı
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
  const [catMood, setCatMood] = useState<string>('Mutlu 😺');

  // Ambient Idle Animations (Head bobbing, tail wagging, ears twitching, breathing)
  const idleTimeline = useRef<gsap.core.Timeline | null>(null);
  const blinkTimeline = useRef<gsap.core.Timeline | null>(null);

  useGSAP(() => {
    if (activeAction !== 'idle') return;

    // Reset components to standard idle layout with explicit transformOrigin in GSAP
    gsap.set([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, scaleX: 1, y: 0, scale: 1, transformOrigin: (i) => (i === 0 ? '150px 225px' : '250px 225px') });
    gsap.set(leftEarRef.current, { rotation: -15, y: 0, transformOrigin: '145px 190px' });
    gsap.set(rightEarRef.current, { rotation: 15, y: 0, transformOrigin: '255px 190px' });
    gsap.set(catRef.current, { y: 0, x: 0 });
    gsap.set(headRef.current, { y: 0, rotation: 0, transformOrigin: '200px 270px' });
    gsap.set(bodyRef.current, { scaleY: 1, scaleX: 1, rotation: 0, transformOrigin: '200px 420px' });
    gsap.set(tailRef.current, { rotation: 0, scaleY: 1, transformOrigin: '240px 430px' });
    gsap.set([leftLegRef.current, rightLegRef.current], { y: 0, transformOrigin: (i) => (i === 0 ? '150px 420px' : '250px 420px') });

    // 1. Idle Timeline
    idleTimeline.current = gsap.timeline({ repeat: -1, yoyo: true })
      // Tail Wag
      .to(tailRef.current, { rotation: -8, transformOrigin: '240px 430px', duration: 1.8, ease: 'sine.inOut' }, 0)
      // Head Bob
      .to(headRef.current, { y: 3, rotation: 0.5, transformOrigin: '200px 270px', duration: 2, ease: 'sine.inOut' }, 0)
      // Breathing Body
      .to(bodyRef.current, { scaleY: 1.02, scaleX: 0.99, transformOrigin: '200px 420px', duration: 2, ease: 'sine.inOut' }, 0);

    // 2. Random Blink Timeline
    const blink = () => {
      if (activeAction !== 'idle' && activeAction !== 'pet') return;
      blinkTimeline.current = gsap.timeline({ onComplete: () => {
        // Schedule next random blink (between 2 to 5 seconds)
        gsap.delayedCall(gsap.utils.random(2, 5), blink);
      }})
      .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 0.05, transformOrigin: (i) => (i === 0 ? '150px 225px' : '250px 225px'), duration: 0.12, ease: 'power2.inOut' })
      .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, transformOrigin: (i) => (i === 0 ? '150px 225px' : '250px 225px'), duration: 0.12, ease: 'power2.inOut' });
    };
    
    // Start blinking loop
    gsap.delayedCall(2, blink);

    // 3. Random Ear Twitches
    const twitchEars = () => {
      if (activeAction !== 'idle') return;
      const targetEar = Math.random() > 0.5 ? leftEarRef.current : rightEarRef.current;
      const rotAmount = targetEar === leftEarRef.current ? -25 : 25;
      const origRot = targetEar === leftEarRef.current ? -15 : 15;
      const tOrigin = targetEar === leftEarRef.current ? '145px 190px' : '255px 190px';

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
    setCatMood('Keyifli 😻');

    // 1. Tilt Head and close eyes happily
    gsap.timeline({
      onComplete: () => {
        setActiveAction('idle');
        setCatMood('Mutlu 😺');
      }
    })
    .to(headRef.current, { rotation: 8, y: 5, transformOrigin: '200px 270px', duration: 0.4, ease: 'sine.inOut' })
    .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 0.2, transformOrigin: (i) => (i === 0 ? '150px 225px' : '250px 225px'), duration: 0.3 }, 0)
    // 2. Fast tail wagging
    .to(tailRef.current, { rotation: -22, transformOrigin: '240px 430px', duration: 0.15, yoyo: true, repeat: 7 }, 0)
    // 3. Relax back
    .to(headRef.current, { rotation: 0, y: 0, transformOrigin: '200px 270px', duration: 0.4 })
    .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, transformOrigin: (i) => (i === 0 ? '150px 225px' : '250px 225px'), duration: 0.3 }, '+=0.1');
  };

  const handleScare = () => {
    if (activeAction === 'sleep') handleWakeUp();
    setActiveAction('scare');
    setCatMood('Korkmuş! 🙀');
    triggerParticle('exclamation');

    const mainTl = gsap.timeline({
      onComplete: () => {
        setActiveAction('idle');
        setCatMood('Sakinleşti 😼');
      }
    });

    // 1. Jumps & Shakes
    mainTl.to(catRef.current, { y: -80, rotation: -2, transformOrigin: '200px 450px', duration: 0.2, ease: 'power2.out' })
      .to(catRef.current, { y: 0, rotation: 0, transformOrigin: '200px 450px', duration: 0.25, ease: 'bounce.out' })
      .to(catRef.current, { x: '+=4', duration: 0.05, yoyo: true, repeat: 10 }, 0.45);

    // 2. Eyes wide and high
    mainTl.to([leftEyeRef.current, rightEyeRef.current], { scale: 1.35, y: -4, transformOrigin: (i) => (i === 0 ? '150px 225px' : '250px 225px'), duration: 0.15, ease: 'power2.out' }, 0);

    // 3. Ears flat to the side
    mainTl.to(leftEarRef.current, { rotation: -60, y: 6, transformOrigin: '145px 190px', duration: 0.15 }, 0)
      .to(rightEarRef.current, { rotation: 60, y: 6, transformOrigin: '255px 190px', duration: 0.15 }, 0);

    // 4. Tail gets thin/stiff
    mainTl.to(tailRef.current, { rotation: 35, scaleY: 1.4, transformOrigin: '240px 430px', duration: 0.15 }, 0);

    // 5. Restore layouts slowly
    mainTl.to([leftEyeRef.current, rightEyeRef.current], { scale: 1, y: 0, transformOrigin: (i) => (i === 0 ? '150px 225px' : '250px 225px'), duration: 0.6, ease: 'power1.inOut' }, 1.2)
      .to(leftEarRef.current, { rotation: -15, y: 0, transformOrigin: '145px 190px', duration: 0.5 }, 1.2)
      .to(rightEarRef.current, { rotation: 15, y: 0, transformOrigin: '255px 190px', duration: 0.5 }, 1.2)
      .to(tailRef.current, { rotation: 0, scaleY: 1, transformOrigin: '240px 430px', duration: 0.5 }, 1.2);
  };

  const handleDance = () => {
    if (activeAction === 'sleep') handleWakeUp();
    setActiveAction('dance');
    setCatMood('Dans Ediyor! 🕺😸');

    const danceTl = gsap.timeline({
      onComplete: () => {
        setActiveAction('idle');
        setCatMood('Mutlu 😺');
      }
    });

    // Sway 1
    danceTl.to(bodyRef.current, { rotation: -8, scaleX: 1.03, transformOrigin: '200px 420px', duration: 0.3, ease: 'sine.inOut' })
      .to(headRef.current, { rotation: 5, x: 8, transformOrigin: '200px 270px', duration: 0.3, ease: 'sine.inOut' }, 0)
      .to(leftLegRef.current, { y: -10, transformOrigin: '150px 420px', duration: 0.15, yoyo: true, repeat: 1 }, 0)
      .to(tailRef.current, { rotation: -24, transformOrigin: '240px 430px', duration: 0.3 }, 0);

    // Sway 2
    danceTl.to(bodyRef.current, { rotation: 8, scaleX: 1.03, transformOrigin: '200px 420px', duration: 0.6, yoyo: true, repeat: 3, ease: 'sine.inOut' })
      .to(headRef.current, { rotation: -5, x: -8, transformOrigin: '200px 270px', duration: 0.6, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.3)
      .to(rightLegRef.current, { y: -10, transformOrigin: '250px 420px', duration: 0.15, yoyo: true, repeat: 1, delay: 0.15 }, 0.3)
      .to(leftLegRef.current, { y: -10, transformOrigin: '150px 420px', duration: 0.15, yoyo: true, repeat: 1, delay: 0.45 }, 0.3)
      .to(rightLegRef.current, { y: -10, transformOrigin: '250px 420px', duration: 0.15, yoyo: true, repeat: 1, delay: 0.75 }, 0.3)
      .to(tailRef.current, { rotation: 24, transformOrigin: '240px 430px', duration: 0.6, yoyo: true, repeat: 3 }, 0.3);

    // Centering back
    danceTl.to(bodyRef.current, { x: 0, rotation: 0, scaleX: 1, transformOrigin: '200px 420px', duration: 0.4 })
      .to(headRef.current, { x: 0, rotation: 0, transformOrigin: '200px 270px', duration: 0.4 }, 0)
      .to(tailRef.current, { x: 0, rotation: 0, transformOrigin: '240px 430px', duration: 0.4 }, 0);
  };

  const handleSleep = () => {
    setActiveAction('sleep');
    setCatMood('Uyuyor... 😴💤');

    gsap.to(headRef.current, { y: 14, rotation: -3, transformOrigin: '200px 270px', duration: 1.8, ease: 'power1.inOut' });
    gsap.to([leftEyeRef.current, rightEyeRef.current], { scaleY: 0, transformOrigin: (i: number) => (i === 0 ? '150px 225px' : '250px 225px'), duration: 1.2, ease: 'power1.inOut' });
    gsap.to(leftEarRef.current, { rotation: -25, transformOrigin: '145px 190px', duration: 1.5 });
    gsap.to(rightEarRef.current, { rotation: 25, transformOrigin: '255px 190px', duration: 1.5 });
    gsap.to(tailRef.current, { rotation: 6, transformOrigin: '240px 430px', duration: 2 });
  };

  const handleWakeUp = () => {
    setActiveAction('idle');
    setCatMood('Günaydın! 🌅😺');
    triggerParticle('exclamation');

    gsap.timeline()
      .to(headRef.current, { y: 0, rotation: 0, transformOrigin: '200px 270px', duration: 0.6, ease: 'back.out(1.5)' })
      .to([leftEyeRef.current, rightEyeRef.current], { scaleY: 1, transformOrigin: (i) => (i === 0 ? '150px 225px' : '250px 225px'), duration: 0.4 }, 0)
      .to(leftEarRef.current, { rotation: -15, transformOrigin: '145px 190px', duration: 0.5 }, 0)
      .to(rightEarRef.current, { rotation: 15, transformOrigin: '255px 190px', duration: 0.5 }, 0);
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
              <div ref={catRef} className="cat-character relative w-[300px] h-[480px] flex items-center justify-center select-none">
                
                <svg viewBox="0 0 400 500" className="w-full h-full drop-shadow-2xl">
                  {/* Ground Shadow */}
                  <ellipse cx="200" cy="465" rx="85" ry="7" fill="#202737" opacity="0.35" />

                  {/* Curved Tail (Cream with Peach Tip) */}
                  <g ref={tailRef} className="cat-tail origin-[240px_430px]">
                    <path 
                      d="M 230,425 C 170,445 90,435 80,390 C 70,345 105,310 160,330 C 180,338 190,346 195,352" 
                      fill="none" 
                      stroke="#fffcf4" 
                      strokeWidth="24" 
                      strokeLinecap="round" 
                    />
                    <path 
                      d="M 160,330 C 180,338 190,346 195,352" 
                      fill="none" 
                      stroke="#fcae96" 
                      strokeWidth="24" 
                      strokeLinecap="round" 
                    />
                  </g>

                  {/* Legs & Feet */}
                  <g id="legs">
                    {/* Left Leg */}
                    <g ref={leftLegRef} className="cat-leg-left origin-[150px_420px]">
                      <path d="M 142,420 L 142,450 C 142,455 158,455 158,450 L 158,420 Z" fill="#fffcf4" />
                      <rect x="126" y="445" width="46" height="18" rx="9" fill="#fcae96" />
                    </g>

                    {/* Right Leg */}
                    <g ref={rightLegRef} className="cat-leg-right origin-[250px_420px]">
                      <path d="M 242,420 L 242,450 C 242,455 258,455 258,450 L 258,420 Z" fill="#fffcf4" />
                      <rect x="228" y="445" width="46" height="18" rx="9" fill="#fcae96" />
                    </g>
                  </g>

                  {/* Body Group */}
                  <g ref={bodyRef} className="cat-body origin-[200px_420px]">
                    {/* Torso */}
                    <path d="M 140,290 C 115,325 125,420 160,430 L 240,430 C 275,420 285,325 260,290 Z" fill="#fffcf4" />
                    
                    {/* Left Arm Curve */}
                    <path d="M 145,315 C 122,325 118,368 138,390" fill="none" stroke="#fffcf4" strokeWidth="26" strokeLinecap="round" />
                    <path d="M 145,315 C 122,325 118,368 138,390" fill="none" stroke="#e1ded4" strokeWidth="2" strokeLinecap="round" />

                    {/* Right Arm Curve */}
                    <path d="M 255,315 C 278,325 282,368 262,390" fill="none" stroke="#fffcf4" strokeWidth="26" strokeLinecap="round" />
                    <path d="M 255,315 C 278,325 282,368 262,390" fill="none" stroke="#e1ded4" strokeWidth="2" strokeLinecap="round" />
                  </g>

                  {/* Head Group */}
                  <g ref={headRef} className="cat-head origin-[200px_270px]">
                    
                    {/* Ears */}
                    {/* Left Ear */}
                    <g ref={leftEarRef} className="cat-ear-left origin-[145px_190px]">
                      <path d="M 120,190 C 115,140 125,75 168,90 C 175,93 178,115 174,130 C 170,145 165,160 162,175 Z" fill="#fffcf4" />
                      <path d="M 132,180 C 128,145 136,92 162,102 C 167,105 170,118 167,128 Z" fill="#fcae96" />
                    </g>

                    {/* Right Ear */}
                    <g ref={rightEarRef} className="cat-ear-right origin-[255px_190px]">
                      <path d="M 280,190 C 285,140 275,75 232,90 C 225,93 222,115 226,130 C 230,145 235,160 238,175 Z" fill="#fffcf4" />
                      <path d="M 268,180 C 272,145 264,92 238,102 C 233,105 230,118 233,128 Z" fill="#fcae96" />
                    </g>

                    {/* Pointy Cheek Tufts (Face Spikes) */}
                    {/* Left Tufts */}
                    <path d="M 115,220 C 95,225 80,240 75,245 C 85,250 100,250 110,252 C 90,258 80,272 75,278 C 88,280 105,274 115,266 Z" fill="#fffcf4" />
                    {/* Right Tufts */}
                    <path d="M 285,220 C 305,225 320,240 325,245 C 315,250 300,250 290,252 C 310,258 320,272 325,278 C 312,280 295,274 285,266 Z" fill="#fffcf4" />

                    {/* Main Head Shape - Wider at the bottom for chubby cheeks */}
                    <path d="M 110,240 C 110,165 290,165 290,240 C 290,310 270,320 200,320 C 130,320 110,310 110,240 Z" fill="#fffcf4" />

                    {/* Eyes */}
                    {/* Left Eye */}
                    <g ref={leftEyeRef} className="cat-eye-left origin-[150px_225px]">
                      <ellipse cx="150" cy="225" rx="28" ry="36" fill="#ffffff" stroke="#e9e7dc" strokeWidth="1" />
                      {/* Iris */}
                      <circle cx="156" cy="229" r="19" fill="#2c9cf0" />
                      {/* Pupil */}
                      <circle cx="159" cy="231" r="13" fill="#212121" />
                      {/* Dual Highlights */}
                      <circle cx="163" cy="235" r="5.5" fill="#ffffff" />
                      <circle cx="155" cy="226" r="2.5" fill="#ffffff" />
                    </g>

                    {/* Right Eye */}
                    <g ref={rightEyeRef} className="cat-eye-right origin-[250px_225px]">
                      <ellipse cx="250" cy="225" rx="28" ry="36" fill="#ffffff" stroke="#e9e7dc" strokeWidth="1" />
                      {/* Iris */}
                      <circle cx="244" cy="229" r="19" fill="#3d3d3d" />
                      {/* Pupil */}
                      <circle cx="241" cy="231" r="13" fill="#212121" />
                      {/* Dual Highlights */}
                      <circle cx="245" cy="235" r="5.5" fill="#ffffff" />
                      <circle cx="237" cy="226" r="2.5" fill="#ffffff" />
                    </g>

                    {/* Nose */}
                    <path d="M 194,244 L 206,244 C 208,244 201,252 200,253 C 199,252 192,244 194,244 Z" fill="#fcae96" />

                    {/* Open Mouth with Tongue and Smile Folds */}
                    <g id="mouth" className="cat-mouth">
                      {/* Cavity */}
                      <path d="M 188,256 C 188,256 188,285 200,285 C 212,285 212,256 212,256 Z" fill="#7d1a21" />
                      {/* Tongue */}
                      <path d="M 191,273 C 191,273 194,285 200,285 C 206,285 209,273 209,273 Z" fill="#f03d4c" />
                      {/* Cheek Folds / Smile Overlay */}
                      <path d="M 184,255 C 192,258 198,258 200,256 C 202,258 208,258 216,255" fill="none" stroke="#fffcf4" strokeWidth="4.5" strokeLinecap="round" />
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
