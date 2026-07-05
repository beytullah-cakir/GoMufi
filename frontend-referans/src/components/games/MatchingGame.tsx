import React, { useState, useEffect, useCallback } from "react";

interface MatchingGameProps {
  level: number;
  lessonTitle: string;
  onClose: () => void;
  onComplete: (stars: number) => void;
}

type GamePhase =
  | "intro"
  | "countdown"
  | "playing"
  | "feedback"
  | "result"
  | "score";

// Mock Questions Data
const QUESTIONS = [
  { id: 1, text: "Metin 1", correctAnswer: "A" },
  { id: 2, text: "Metin 2", correctAnswer: "A" },
  { id: 3, text: "Metin 3", correctAnswer: "A" },
  { id: 4, text: "Metin 4", correctAnswer: "A" },
  { id: 5, text: "Metin 5", correctAnswer: "A" },
];

// Random Countdown Phrases
const COUNTDOWN_PHRASES = [
  "HAZIR OL!",
  "ODAKLAN!",
  "DERİN NEFES AL",
  "YAPABİLİRSİN!",
  "KALEMİNİ KUŞAN!",
  "SOĞUKKANLI OL",
  "GÖSTER KENDİNİ!",
  "HEDEFİNE KİLİTLEN",
];

const MatchingGame: React.FC<MatchingGameProps> = ({
  level,
  lessonTitle,
  onClose,
  onComplete,
}) => {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(100); // Percentage
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentQuestion = QUESTIONS[currentQuestionIndex];

  const [countdownPhrase] = useState(
    () =>
      COUNTDOWN_PHRASES[Math.floor(Math.random() * COUNTDOWN_PHRASES.length)]
  );

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < QUESTIONS.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimer(100);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setPhase("playing");
    } else {
      setPhase("score");
    }
  }, [currentQuestionIndex]);

  // Phase Management
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "intro") {
      timeout = setTimeout(() => {
        setPhase("countdown");
      }, 2000); // 2s Intro
    } else if (phase === "countdown") {
      if (countdown > 0) {
        timeout = setTimeout(() => {
          setCountdown((prev) => {
            if (prev <= 1) setPhase("playing");
            return prev - 1;
          });
        }, 1000);
      }
    } else if (phase === "result") {
      // Auto-advance result screen after 2 seconds
      timeout = setTimeout(() => {
        nextQuestion();
      }, 2000);
    }

    return () => clearTimeout(timeout);
  }, [phase, countdown, nextQuestion]);

  const handleAnswer = useCallback(
    (answer: string | null) => {
      setSelectedAnswer(answer);
      const correct = answer === currentQuestion.correctAnswer;
      setIsCorrect(correct);
      setPhase("feedback");

      if (correct) {
        setScore((prev) => prev + 20);
      }

      // Show Result Screen immediately (almost)
      setTimeout(() => {
        setPhase("result");
      }, 50);
    },
    [currentQuestion.correctAnswer]
  );

  // Game Timer
  useEffect(() => {
    if (phase === "playing") {
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            handleAnswer(null); // Timeout
            return 0;
          }
          return prev - 0.5; // Decrement speed
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [phase, handleAnswer]);

  // Calculate Stars
  const getStars = () => {
    if (score >= 80) return 3;
    if (score >= 40) return 2;
    if (score > 0) return 1;
    return 0;
  };

  // --- RENDERERS ---

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center animate-in zoom-in-50 duration-500">
        <span className="text-gray-400 font-black text-2xl uppercase tracking-widest mb-4">
          Seviye
        </span>
        <span className="text-9xl font-black text-gray-800 font-display drop-shadow-sm">
          {level}
        </span>
        <span className="text-gray-400 font-bold text-3xl font-display mt-6 tracking-wide">
          {lessonTitle}
        </span>
      </div>
    );
  }

  if (phase === "countdown") {
    return (
      <div className="flex flex-col items-center justify-center animate-in zoom-in-50 duration-500">
        <span className="text-gray-400 font-black text-4xl font-display tracking-widest mb-16 animate-pulse text-center px-4">
          {countdownPhrase}
        </span>
        <span
          key={countdown}
          className="text-9xl font-black text-sky-500 font-display animate-ping-once drop-shadow-md"
        >
          {countdown > 0 ? countdown : "BAŞLA!"}
        </span>
      </div>
    );
  }

  if (phase === "score") {
    const stars = getStars();
    return (
      <div className="flex flex-col items-center animate-in zoom-in-50 duration-500">
        <h2 className="text-5xl font-black text-gray-800 font-display mb-8">
          Oyun Bitti!
        </h2>

        {/* Stars */}
        <div className="flex gap-4 mb-8">
          {[1, 2, 3].map((star) => (
            <svg
              key={star}
              xmlns="http://www.w3.org/2000/svg"
              className={`w-24 h-24 ${
                star <= stars
                  ? "text-yellow-400 drop-shadow-lg"
                  : "text-gray-200"
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

        <div className="text-center mb-12">
          <span className="text-gray-400 font-bold text-xl uppercase tracking-widest block mb-2">
            Toplam Puan
          </span>
          <span className="text-6xl font-black text-sky-500 font-display">
            {score}
          </span>
        </div>

        <button
          onClick={() => onComplete(stars)}
          className="bg-green-500 hover:bg-green-600 text-white font-black text-xl py-4 px-12 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all"
        >
          DEVAM ET
        </button>
      </div>
    );
  }

  // Main Game Render (Playing, Feedback, Result)
  if (phase === "playing" || phase === "feedback" || phase === "result") {
    const isCorrectResult = isCorrect === true;

    return (
      <div className="w-full max-w-4xl flex flex-col items-center h-[90vh] py-8 relative">
        {/* Result Overlay */}
        {phase === "result" && (
          <div className="fixed inset-0 z-[200] flex flex-col justify-end pointer-events-none">
            {/* Backdrop - lighter to keep game visible */}
            <div className="absolute inset-0 bg-black/5" />

            {/* Bottom Sheet Card */}
            <div
              className={`relative w-full ${
                isCorrectResult
                  ? "bg-green-100"
                  : selectedAnswer === null
                  ? "bg-yellow-100"
                  : "bg-red-100"
              } rounded-t-3xl p-8 pb-12 shadow-2xl animate-slide-up pointer-events-auto`}
            >
              <div className="max-w-4xl mx-auto flex items-center gap-6">
                {/* Status Icon */}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${
                    isCorrectResult
                      ? "bg-white border-green-500 text-green-500"
                      : selectedAnswer === null
                      ? "bg-white border-yellow-500 text-yellow-500"
                      : "bg-white border-red-500 text-red-500"
                  }`}
                >
                  {isCorrectResult ? (
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : selectedAnswer === null ? (
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="4"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h2
                    className={`text-3xl font-black font-display mb-1 ${
                      isCorrectResult
                        ? "text-green-700"
                        : selectedAnswer === null
                        ? "text-yellow-700"
                        : "text-red-700"
                    }`}
                  >
                    {isCorrectResult
                      ? "HARİKA GİDİYORSUN!"
                      : selectedAnswer === null
                      ? "ZAMANIN DOLDU!"
                      : "YANLIŞ CEVAP!"}
                  </h2>
                  {!isCorrectResult && (
                    <p
                      className={`${
                        selectedAnswer === null
                          ? "text-yellow-600"
                          : "text-red-600"
                      } font-bold text-lg`}
                    >
                      Doğru Cevap:{" "}
                      <span className="font-black">
                        {currentQuestion.correctAnswer}
                      </span>
                    </p>
                  )}
                  {isCorrectResult && (
                    <p className="text-green-600 font-bold text-lg">
                      +20 Puan kazandın!
                    </p>
                  )}
                </div>

                {/* Next Arrow */}
                <button
                  onClick={nextQuestion}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-transform active:scale-95 ${
                    isCorrectResult
                      ? "bg-green-500 text-white hover:bg-green-600"
                      : selectedAnswer === null
                      ? "bg-yellow-500 text-white hover:bg-yellow-600"
                      : "bg-red-500 text-white hover:bg-red-600"
                  }`}
                >
                  <svg
                    className="w-6 h-6 animate-pulse"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header (Exit & Timer) */}
        <div className="w-full flex justify-between items-center mb-8 px-4">
          <button
            onClick={onClose}
            className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-2xl flex items-center justify-center transition-colors group cursor-pointer"
          >
            <svg
              className="w-8 h-8 text-gray-400 group-hover:text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Timer Bar */}
          <div className="flex-1 mx-8 h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
            <div
              className={`h-full transition-all duration-100 ease-linear ${
                timer < 30 ? "bg-red-500" : "bg-purple-500"
              }`}
              style={{ width: `${timer}%` }}
            ></div>
          </div>

          <div className="text-xl font-black text-gray-400 font-display w-12 text-right">
            {currentQuestionIndex + 1}/{QUESTIONS.length}
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 flex items-center justify-center mb-12 w-full">
          <div className="bg-white border-2 border-gray-200 border-b-4 rounded-3xl p-12 shadow-sm text-center w-full mx-4">
            <span className="text-gray-400 font-bold text-lg uppercase tracking-widest block mb-4">
              {lessonTitle}
            </span>
            <h2 className="text-4xl font-black text-gray-700 font-display">
              {currentQuestion.text}
            </h2>
          </div>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-4 w-full h-80 px-4">
          {["A", "B", "C", "D"].map((option, idx) => {
            const colors = [
              {
                bg: "bg-red-500",
                hover: "hover:bg-red-600",
                border: "border-red-700",
                box: "bg-red-700",
              },
              {
                bg: "bg-blue-500",
                hover: "hover:bg-blue-600",
                border: "border-blue-700",
                box: "bg-blue-700",
              },
              {
                bg: "bg-yellow-400",
                hover: "hover:bg-yellow-500",
                border: "border-yellow-600",
                box: "bg-yellow-600",
              },
              {
                bg: "bg-green-500",
                hover: "hover:bg-green-600",
                border: "border-green-700",
                box: "bg-green-700",
              },
            ];
            const color = colors[idx];

            // Feedback Logic
            let opacityClass = "opacity-100";
            if (phase === "feedback" || phase === "result") {
              if (option === currentQuestion.correctAnswer)
                opacityClass = "opacity-100 ring-4 ring-green-400";
              else if (option === selectedAnswer)
                opacityClass = "opacity-50 ring-4 ring-red-400";
              else opacityClass = "opacity-40";
            }

            return (
              <button
                key={option}
                disabled={phase === "feedback" || phase === "result"}
                onClick={() => handleAnswer(option)}
                className={`${color.bg} ${
                  phase === "playing" ? color.hover : ""
                } active:translate-y-1 border-b-8 ${
                  color.border
                } active:border-b-0 rounded-2xl flex items-center p-6 gap-6 transition-all group ${opacityClass}`}
              >
                <div
                  className={`w-16 h-16 ${color.box} rounded-xl flex items-center justify-center shadow-inner text-3xl font-black text-white font-display`}
                >
                  {option}
                </div>
                <span className="text-3xl font-black text-white font-display">
                  Sık {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
};

export default MatchingGame;
