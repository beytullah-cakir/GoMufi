import React, { useState, useEffect, useCallback } from "react";
import api from "../../api";

interface MatchingGameProps {
  level: number;
  lessonTitle: string;
  courseId?: string;
  sectionId?: string;
  localNodeIndex?: number;
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
// Fallback Mock Questions Data
const DEFAULT_QUESTIONS = [
  { id: 1, text: "Metin 1", options: ["Şık 1", "Şık 2", "Şık 3", "Şık 4"], correctAnswer: "Şık 1" },
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
  courseId,
  sectionId,
  localNodeIndex,
  onClose,
  onComplete,
}) => {
  const [questions, setQuestions] = useState<any[]>(DEFAULT_QUESTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(100); // Percentage
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Fetch AI Quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      // Find course by title if needed - actually the backend expects course_id as int
      // I need to ensure courseId passed from StudentApp is the actual ID.
      // Wait, let's assume courseId is handled.
      try {
        console.log(`[GameFetch] Quiz aranıyor: CourseID=${courseId}, SectionID=${sectionId}, NodeIndex=${localNodeIndex}`);
        const response = await api.get('/quiz_by_node', {
          params: {
            course_id: parseInt(courseId || "1"),
            section_id: sectionId,
            node_id: localNodeIndex
          }
        });

        if (response.data.success && response.data.quiz) {
          const q = response.data.quiz;
          console.log("[GameFetch] Quiz verisi isleniyor:", q);
          
          // Support both nested and flat structures for maximum resilience
          const questionText = q.quiz?.soru || q.question_text || "Soru metni bulunamadı";
          const options = q.quiz?.secenekler || q.options || ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"];
          const correctAnswer = q.quiz?.cevap || q.correct_answer || (options ? options[0] : "");
          const explanation = q.quiz?.aciklama || q.explanation || "";

          setQuestions([{
            id: q.id,
            text: questionText,
            options: options,
            correctAnswer: correctAnswer,
            explanation: explanation
          }]);
          console.log("[GameFetch] Soru basariyla yüklendi:", questionText);
        }
      } catch (err) {
        console.error("Quiz çekme hatası:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (sectionId && localNodeIndex) {
      fetchQuiz();
    } else {
      setIsLoading(false);
    }
  }, [sectionId, localNodeIndex]);

  const [countdownPhrase] = useState(
    () =>
      COUNTDOWN_PHRASES[Math.floor(Math.random() * COUNTDOWN_PHRASES.length)]
  );

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
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
      // Auto-advance ONLY if correct. If wrong, wait for user to read explanation
      if (isCorrect) {
        timeout = setTimeout(() => {
          nextQuestion();
        }, 1500);
      }
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
    if (score === 100) return 3; // 100% accuracy = 3 stars
    if (score >= 60) return 2;  // 60-80% = 2 stars
    if (score >= 20) return 1;  // 20-40% = 1 star
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
      <div className="w-full max-w-5xl flex flex-col h-[92vh] py-4 relative overflow-hidden">
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
                    <div className="space-y-2">
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
                      {currentQuestion.explanation && (
                        <div className={`p-4 rounded-2xl border ${selectedAnswer === null ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-red-50 border-red-200 text-red-800'} text-sm font-medium animate-in fade-in slide-in-from-top-1`}>
                          <span className="font-black uppercase text-[10px] tracking-widest block mb-1 opacity-60">Açıklama</span>
                          {currentQuestion.explanation}
                        </div>
                      )}
                    </div>
                  )}
                  {isCorrectResult && (
                    <p className="text-green-600 font-bold text-lg">
                      +20 Puan kazandın!
                    </p>
                  )}
                </div>

                {/* Next Button / Close Button */}
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
                  {isCorrectResult ? (
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
                  ) : (
                    <svg
                      className="w-6 h-6"
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
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Header (Exit & Timer) */}
        <div className="w-full flex justify-between items-center mb-4 px-4 shrink-0">
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
            {currentQuestionIndex + 1}/{questions.length}
          </div>
        </div>

        {/* Desktop Split Layout / Mobile Stack Layout */}
        <div className="flex-1 flex flex-col lg:flex-row gap-12 px-4 mb-4 overflow-hidden min-h-0">
          
          {/* Left Side: Question Area - Scrollable */}
          <div className="flex-[1.5] flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
            <div className="bg-white border-2 border-gray-100 border-b-4 rounded-[40px] p-6 md:p-10 shadow-sm text-center w-full min-h-fit h-full flex flex-col justify-center">
              <span className="text-sky-500 font-black text-sm uppercase tracking-[0.2em] block mb-6 px-4 py-2 bg-sky-50 w-fit mx-auto rounded-full border border-sky-100 shrink-0">
                {lessonTitle}
              </span>
              
              <div className="text-left w-full space-y-6">
                {currentQuestion.text.split(/```/).map((part: string, i: number) => {
                  if (i % 2 === 1) {
                    const lines = part.trim().split('\n');
                    const code = lines.length > 1 && lines[0].length < 10 && !lines[0].includes(' ') 
                                 ? lines.slice(1).join('\n') 
                                 : part.trim();

                    return (
                      <div key={i} className="my-6 relative group max-w-full shrink-0">
                        <div className="absolute -top-3 left-8 px-4 py-1.5 bg-gray-900 text-sky-400 text-[10px] font-black rounded-full z-10 border border-gray-700 shadow-xl tracking-widest uppercase">
                          KOD EDİTÖRÜ
                        </div>
                        <div className="absolute top-4 right-8 flex gap-1.5 opacity-50 group-hover:opacity-100 transition-opacity">
                          <div className="w-2.5 h-2.5 rounded-full bg-red-400/50"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/50"></div>
                          <div className="w-2.5 h-2.5 rounded-full bg-green-400/50"></div>
                        </div>
                        <pre className="bg-gray-950 text-sky-50 p-8 pt-10 rounded-[32px] overflow-x-auto font-mono text-base md:text-lg leading-relaxed border-2 border-gray-800 shadow-2xl scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                          <code className="block min-w-max">{code}</code>
                        </pre>
                      </div>
                    );
                  }
                  return (
                    <h2 key={i} className="text-xl md:text-2xl lg:text-3xl font-black text-gray-800 font-display leading-snug text-center px-4">
                      {part.trim()}
                    </h2>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Side: Options Grid - 2x2 Layout */}
          <div className="flex-1 grid grid-cols-2 gap-6 h-fit lg:h-full lg:overflow-y-auto lg:pr-2 custom-scrollbar shrink-0 lg:shrink content-center">
            {(currentQuestion?.options || ["A", "B", "C", "D"]).map((option: string, idx: number) => {
              const colors = [
                { bg: "bg-indigo-500", hover: "hover:bg-indigo-600", border: "border-indigo-700", box: "bg-indigo-700" },
                { bg: "bg-sky-500", hover: "hover:bg-sky-600", border: "border-sky-700", box: "bg-sky-700" },
                { bg: "bg-amber-400", hover: "hover:bg-amber-500", border: "border-amber-600", box: "bg-amber-600" },
                { bg: "bg-emerald-500", hover: "hover:bg-emerald-600", border: "border-emerald-700", box: "bg-emerald-700" },
              ];
              const color = colors[idx % colors.length];

              let stateClass = "opacity-100 scale-100 cursor-pointer";
              if (phase === "feedback" || phase === "result") {
                if (option === currentQuestion.correctAnswer) stateClass = "ring-8 ring-green-400/50 z-10 scale-105 shadow-2xl";
                else if (option === selectedAnswer) stateClass = "opacity-50 grayscale scale-95";
                else stateClass = "opacity-30 scale-90 grayscale";
              }

              return (
                <button
                  key={option}
                  disabled={phase === "feedback" || phase === "result"}
                  onClick={() => handleAnswer(option)}
                  className={`${color.bg} ${phase === "playing" ? color.hover : ""} active:translate-y-1 active:shadow-inner border-b-8 ${color.border} active:border-b-0 rounded-[28px] flex items-center p-4 md:p-6 gap-4 md:gap-6 shadow-lg transition-all transform ${stateClass} w-full lg:min-h-[100px]`}
                >
                  <div className={`w-10 h-10 md:w-14 md:h-14 ${color.box} rounded-2xl flex items-center justify-center shadow-inner text-xl md:text-2xl font-black text-white font-display flex-shrink-0`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className="text-lg md:text-xl font-black text-white font-display text-left line-clamp-2 leading-tight">
                    {option}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default MatchingGame;
