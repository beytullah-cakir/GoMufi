import React, { useState, useEffect } from "react";
import dragonSprite from "../../assets/sprites/DragonMonster.png";
import mufiArmorSprite from "../../assets/sprites/MufiArmor.png";
import battleBg from "../../assets/sprites/BattleBg.png";

interface MonsterBattleGameProps {
  level: number;
  courseId?: string;
  sectionId?: string;
  localNodeIndex?: number;
  onClose: () => void;
  onComplete: (stars: number) => void;
}

type BattlePhase =
  | "intro"
  | "player_turn"
  | "question"
  | "monster_turn"
  | "effect"
  | "victory"
  | "defeat";

const MonsterBattleGame: React.FC<MonsterBattleGameProps> = ({
  level,
  courseId,
  sectionId,
  localNodeIndex,
  onClose,
  onComplete,
}) => {
  // Game State
  const [phase, setPhase] = useState<BattlePhase>("intro");
  const [playerHP, setPlayerHP] = useState(100);
  const [maxPlayerHP] = useState(100);
  const [monsterHP, setMonsterHP] = useState(200);
  const [maxMonsterHP] = useState(200);
  const [inventory, setInventory] = useState({
    potions: 2,
    shields: 1,
    bombs: 1,
  });
  const [effectMessage, setEffectMessage] = useState<string | null>(null);
  const [monsterAnimation, setMonsterAnimation] = useState("");
  const [heroAnimation, setHeroAnimation] = useState("");

  // Mock Questions for Attack
  const [currentQuestion] = useState({
    text: "Canavarın zayıf noktası neresi? (Sıfatı bul)",
    options: ["Beautiful", "Run", "Quickly", "Cat"],
    answer: "Beautiful",
  });

  // Intro Animation
  useEffect(() => {
    setTimeout(() => setPhase("player_turn"), 2000);
  }, []);

  // Combat Logic
  const handleAttack = () => {
    setPhase("question");
  };

  const handleAnswer = (option: string) => {
    const isCorrect = option === currentQuestion.answer;

    if (isCorrect) {
      setPhase("effect");
      setHeroAnimation("animate-lunge-right");
      setTimeout(() => {
        setEffectMessage("Kritik Vuruş! 🔥");
        setMonsterHP((prev) => Math.max(0, prev - 50));
        setMonsterAnimation("animate-flash animate-shake");
        setHeroAnimation("");

        // Slight delay then check win or monster turn
        setTimeout(() => {
          setMonsterAnimation("");
          if (monsterHP - 50 <= 0) {
            setPhase("victory");
          } else {
            setPhase("monster_turn");
          }
        }, 1500);
      }, 300);
    } else {
      setPhase("effect");
      setEffectMessage("Iskaladın! 💨");
      setTimeout(() => setPhase("monster_turn"), 1500);
    }
  };

  const handleItem = (item: "potion" | "shield" | "bomb") => {
    if (item === "potion" && inventory.potions > 0) {
      setInventory((prev) => ({ ...prev, potions: prev.potions - 1 }));
      setPlayerHP((prev) => Math.min(maxPlayerHP, prev + 40));
      setEffectMessage("Canın Yenilendi! ❤️");
      setPhase("effect");
      setTimeout(() => setPhase("monster_turn"), 1500);
    }
    // Other items logic...
    if (item === "bomb" && inventory.bombs > 0) {
      setInventory((prev) => ({ ...prev, bombs: prev.bombs - 1 }));
      setMonsterHP((prev) => Math.max(0, prev - 80));
      setEffectMessage("BOOM! 💥");
      setMonsterAnimation("animate-flash animate-shake");
      setPhase("effect");
      setTimeout(() => {
        setMonsterAnimation("");
        if (monsterHP - 80 <= 0) {
          setPhase("victory");
        } else {
          setPhase("monster_turn");
        }
      }, 1500);
    }
  };

  // Monster Turn
  useEffect(() => {
    if (phase === "monster_turn") {
      setTimeout(() => {
        setPlayerHP((prev) => prev - 20);
        setEffectMessage("Canavar Saldırdı! ⚔️");
        setHeroAnimation("animate-flash animate-shake");
        setPhase("effect");
        setTimeout(() => {
          setHeroAnimation("");
          if (playerHP - 20 <= 0) {
            setPhase("defeat");
          } else {
            setPhase("player_turn");
          }
        }, 1500);
      }, 1000);
    }
  }, [phase]);

  // Renderers
  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-in zoom-in-50 bg-black text-white">
        <h1 className="text-6xl font-black font-display mb-8">
          Vahşi CANAVAR belirdi!
        </h1>
      </div>
    );
  }

  if (phase === "victory") {
    const stars = playerHP > 80 ? 3 : playerHP > 40 ? 2 : 1;
    return (
      <div className="flex flex-col items-center justify-center h-full animate-in zoom-in bg-green-500 text-white">
        <h1 className="text-6xl font-black font-display mb-8">KAZANDIN!</h1>
        <span className="text-9xl mb-8">🏆</span>
        
        {/* Stars Display */}
        <div className="flex gap-4 mb-8">
            {[1, 2, 3].map((star) => (
                <svg
                    key={star}
                    xmlns="http://www.w3.org/2000/svg"
                    className={`w-16 h-16 ${
                        star <= stars
                            ? "text-yellow-300 drop-shadow-lg"
                            : "text-green-400"
                    }`}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        fillRule="evenodd"
                        d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z"
                        clipRule="evenodd"
                    />
                </svg>
            ))}
        </div>

        <button
          onClick={() => onComplete(stars)}
          className="bg-white text-green-600 font-black text-2xl py-4 px-12 rounded-2xl border-b-8 border-green-800 active:border-b-0 active:translate-y-2 transition-all"
        >
          DEVAM ET
        </button>
      </div>
    );
  }

  if (phase === "defeat") {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-in zoom-in bg-red-600 text-white">
        <h1 className="text-6xl font-black font-display mb-8">KAYBETTİN...</h1>
        <span className="text-9xl mb-8">💀</span>
        <button
          onClick={onClose}
          className="bg-white text-red-600 font-black text-2xl py-4 px-12 rounded-2xl border-b-8 border-red-800 active:border-b-0 active:translate-y-2 transition-all"
        >
          ÇIKIŞ
        </button>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative overflow-hidden bg-cover bg-center font-display"
      style={{ backgroundImage: `url(${battleBg})` }}
    >
      {/* Effect Overlay */}
      {phase === "effect" && (
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
          <h2 className="text-5xl font-black text-white drop-shadow-[0_4px_4px_rgba(0,0,0,1)] animate-bounce stroke-black">
            {effectMessage}
          </h2>
        </div>
      )}

      {/* Battle Scene - Pokemon Style Layout */}
      <div className="w-full h-full max-w-5xl mx-auto relative">
        {/* 1. Monster Area (Top Right) */}
        <div className="absolute top-12 right-12 flex flex-col items-end">
          {/* Status Box */}
          <div className="bg-white/90 border-4 border-gray-700 rounded-lg p-4 mb-4 shadow-lg min-w-[300px] skew-x-[-12deg]">
            <div className="skew-x-[12deg]">
              <h2 className="text-xl font-black text-gray-800 uppercase">
                Karanlık Ejderha
              </h2>
              <div className="w-full bg-gray-300 h-4 rounded-full mt-2 border border-gray-500 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-full h-full bg-gray-300"></div>{" "}
                {/* Background fix */}
                <div
                  className={`h-full transition-all duration-500 ${
                    monsterHP < 50 ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{ width: `${(monsterHP / maxMonsterHP) * 100}%` }}
                />
              </div>
            </div>
          </div>
          {/* Sprite */}
          <div className="relative mr-16">
            <div className="absolute -bottom-8 -left-8 w-48 h-12 bg-black/20 rounded-[50%] blur-md"></div>{" "}
            {/* Shadow */}
            <img
              src={dragonSprite}
              alt="Monster"
              className={`w-64 h-64 object-contain ${monsterAnimation}`}
            />
          </div>
        </div>

        {/* 2. Player Area (Bottom Left) */}
        <div className="absolute bottom-40 left-12 flex flex-col items-start">
          {/* Sprite */}
          <div className="relative ml-16 mb-4">
            <div className="absolute -bottom-6 -left-4 w-40 h-10 bg-black/20 rounded-[50%] blur-md"></div>{" "}
            {/* Shadow */}
            <img
              src={mufiArmorSprite}
              alt="Hero"
              className={`w-48 h-48 object-contain ${heroAnimation}`}
            />
          </div>
          {/* Status Box */}
          <div className="bg-white/90 border-4 border-gray-700 rounded-lg p-4 shadow-lg min-w-[320px] skew-x-[-12deg]">
            <div className="skew-x-[12deg]">
              <div className="flex justify-between items-end mb-1">
                <h2 className="text-xl font-black text-gray-800 uppercase">
                  Kahraman Mufi
                </h2>
                <span className="text-lg font-bold text-gray-600">
                  {playerHP}/{maxPlayerHP}
                </span>
              </div>
              <div className="w-full bg-gray-300 h-4 rounded-full border border-gray-500 overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-500 ${
                    playerHP < 30 ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{ width: `${(playerHP / maxPlayerHP) * 100}%` }}
                />
              </div>
              <div className="text-xs font-bold text-gray-500 mt-1">Lv. 15</div>
            </div>
          </div>
        </div>

        {/* 3. Action Menu (Bottom Right/Center) */}
        {phase !== "question" && (
          <div className="absolute bottom-4 right-4 max-w-xl w-full flex gap-4 p-4 bg-gray-800/80 backdrop-blur-md rounded-t-3xl border-t-4 border-white/20">
            <div className="grid grid-cols-2 gap-4 w-full">
              <button
                onClick={handleAttack}
                disabled={phase !== "player_turn"}
                className="bg-red-500 hover:bg-red-400 text-white font-black text-xl py-6 rounded-xl border-b-4 border-red-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider"
              >
                Saldır
              </button>
              <button
                onClick={() => handleItem("potion")}
                disabled={phase !== "player_turn" || inventory.potions === 0}
                className="bg-green-500 hover:bg-green-400 text-white font-black text-xl py-6 rounded-xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
              >
                İyileş{" "}
                <span className="text-sm bg-black/20 px-2 rounded">
                  {inventory.potions}
                </span>
              </button>
              <button
                onClick={() => handleItem("shield")}
                disabled={phase !== "player_turn" || inventory.shields === 0}
                className="bg-blue-500 hover:bg-blue-400 text-white font-black text-xl py-6 rounded-xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
              >
                Savun{" "}
                <span className="text-sm bg-black/20 px-2 rounded">
                  {inventory.shields}
                </span>
              </button>
              <button
                onClick={() => handleItem("bomb")}
                disabled={phase !== "player_turn" || inventory.bombs === 0}
                className="bg-orange-500 hover:bg-orange-400 text-white font-black text-xl py-6 rounded-xl border-b-4 border-orange-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-wider flex items-center justify-center gap-2"
              >
                Bomba{" "}
                <span className="text-sm bg-black/20 px-2 rounded">
                  {inventory.bombs}
                </span>
              </button>
            </div>
            <div className="flex-1 bg-white/10 rounded-xl p-4 text-white font-bold text-lg hidden md:flex items-center">
              {phase === "player_turn" ? "Ne yapacaksın?" : "Bekleniyor..."}
            </div>
          </div>
        )}

        {/* 4. Question Overlay (Takes up bottom half like Pokemon dialogue) */}
        {phase === "question" && (
          <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-white border-t-8 border-gray-800 p-8 flex flex-col animate-slide-up">
            <h3 className="text-2xl font-black text-gray-800 mb-6">
              {currentQuestion.text}
            </h3>
            <div className="grid grid-cols-2 gap-4 h-full">
              {currentQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xl rounded-xl border-2 border-gray-300 active:bg-gray-300 transition-all text-left px-6 flex items-center"
                >
                  <span className="text-gray-400 mr-4 font-black">▶</span> {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 p-2 bg-white/50 backdrop-blur rounded-xl hover:bg-white/80 shadow-sm border border-gray-200 transition-colors z-50"
      >
        ❌
      </button>
    </div>
  );
};

export default MonsterBattleGame;
