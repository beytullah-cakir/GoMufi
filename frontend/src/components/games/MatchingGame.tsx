import React, { useState, useEffect, useCallback } from "react";
import api from "../../api";
import { Check, X, RefreshCw, AlertCircle, PenTool, FileText } from "lucide-react";

interface MatchingGameProps {
  level: number;
  lessonTitle: string;
  courseId?: string;
  sectionId?: string;
  localNodeIndex?: number;
  onClose: () => void;
  onComplete: (stars: number) => void;
  onStatsUpdate?: () => void;
  isPreviewMode?: boolean;
  previewQuestions?: any[];
  previewRole?: 'student' | 'teacher';
}

type GamePhase =
  | "intro"
  | "countdown"
  | "playing"
  | "feedback"
  | "result"
  | "score";

interface StandardQuestion {
  id: string | number;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'open_ended';
  multipleCorrect: boolean;
  text: string;
  options: { id: string; text: string; isCorrect: boolean }[];
  correctShortAnswer?: string;
  explanation?: string;
  timeLimit?: number;
}

const DEFAULT_QUESTIONS: StandardQuestion[] = [
  {
    id: 1,
    type: 'multiple_choice',
    multipleCorrect: false,
    text: "Python'da listeler hangi parantez ile gösterilir?",
    options: [
      { id: 'A', text: '[]', isCorrect: true },
      { id: 'B', text: '()', isCorrect: false },
      { id: 'C', text: '{}', isCorrect: false },
      { id: 'D', text: '<>', isCorrect: false },
    ],
    explanation: "Listeler köşeli parantez [] kullanılarak tanımlanır."
  },
];

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
  onStatsUpdate,
  isPreviewMode = false,
  previewQuestions = [],
  previewRole = 'student'
}) => {
  const [questions, setQuestions] = useState<StandardQuestion[]>(DEFAULT_QUESTIONS);
  const [isLoading, setIsLoading] = useState(true);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [countdown, setCountdown] = useState(3);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(100);

  // Play States
  const [selectedAnswerIds, setSelectedAnswerIds] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Fetch Questions
  useEffect(() => {
    const fetchQuestionsAndQuiz = async () => {
      try {
        if (isPreviewMode) {
          if (previewQuestions && previewQuestions.length > 0) {
            const mapped = previewQuestions.map((q: any) => ({
              id: q.id || Date.now().toString(),
              type: q.type || 'multiple_choice',
              multipleCorrect: !!q.multipleCorrect,
              text: q.text || 'Soru',
              options: q.options || [],
              correctShortAnswer: q.correctShortAnswer || '',
              explanation: q.explanation || '',
              timeLimit: q.timeLimit || 30
            }));
            setQuestions(mapped);
          } else {
            setQuestions(DEFAULT_QUESTIONS);
          }
          setIsLoading(false);
          return;
        }

        console.log(`[GameFetch] Loading custom & legacy questions... CourseID=${courseId}, SectionID=${sectionId}`);

        let customQuestions: StandardQuestion[] = [];
        let hasCustomGame = false;

        if (courseId && sectionId) {
          try {
            const courseRes = await api.get(`/courses/${courseId}`);
            const notes = courseRes.data?.notes || [];
            const matchingNote = notes.find((n: any) => String(n.id) === String(sectionId));
            const gameSlide = matchingNote?.slides?.find((s: any) => s.type === 'game' && s.gameType === 'matching');

            if (gameSlide && gameSlide.gameConfig && gameSlide.gameConfig.questions && gameSlide.gameConfig.questions.length > 0) {
              customQuestions = gameSlide.gameConfig.questions.map((q: any) => ({
                id: q.id || Date.now().toString(),
                type: q.type || 'multiple_choice',
                multipleCorrect: !!q.multipleCorrect,
                text: q.text || 'Soru',
                options: q.options || [],
                correctShortAnswer: q.correctShortAnswer || '',
                explanation: q.explanation || '',
                timeLimit: q.timeLimit || 30
              }));
              hasCustomGame = true;
            }
          } catch (notesErr) {
            console.warn("Course notes fetch failed, falling back to quiz_by_node:", notesErr);
          }
        }

        if (!hasCustomGame && sectionId && localNodeIndex !== undefined) {
          const response = await api.get('/quiz_by_node', {
            params: {
              course_id: parseInt(courseId || "1"),
              section_id: sectionId,
              node_id: localNodeIndex
            }
          });

          if (response.data.success && response.data.quizzes) {
            const quizList = response.data.quizzes;
            customQuestions = quizList.map((q: any) => {
              const questionText = q.quiz?.soru || q.question_text || "Soru metni bulunamadı";
              const rawOptions = q.quiz?.secenekler || q.options || ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"];
              const rawCorrectAnswer = q.quiz?.cevap || q.correct_answer || "";
              const explanation = q.quiz?.aciklama || q.explanation || "";
              
              const typeStr = q.type || q.question_type || "multiple_choice";
              let standardType: 'multiple_choice' | 'true_false' | 'short_answer' | 'open_ended' = 'multiple_choice';
              if (typeStr.includes('true') || typeStr.includes('false')) {
                standardType = 'true_false';
              } else if (typeStr.includes('short')) {
                standardType = 'short_answer';
              } else if (typeStr.includes('open') || typeStr.includes('essay')) {
                standardType = 'open_ended';
              }

              let options: { id: string; text: string; isCorrect: boolean }[] = [];
              let correctShortAnswer = "";

              if (standardType === 'multiple_choice') {
                options = rawOptions.map((o: any, idx: number) => {
                  const oText = typeof o === 'object' ? (o.text || '') : String(o);
                  const isCorrectOpt = typeof o === 'object' 
                    ? !!o.isCorrect 
                    : (oText === rawCorrectAnswer || (idx === 0 && !rawCorrectAnswer));
                  return {
                    id: ['A', 'B', 'C', 'D'][idx % 4] || String(idx),
                    text: oText,
                    isCorrect: isCorrectOpt
                  };
                });
              } else if (standardType === 'true_false') {
                options = [
                  { id: 'A', text: 'Doğru', isCorrect: rawCorrectAnswer === 'Doğru' || rawCorrectAnswer === 'True' },
                  { id: 'B', text: 'Yanlış', isCorrect: rawCorrectAnswer === 'Yanlış' || rawCorrectAnswer === 'False' }
                ];
              } else if (standardType === 'short_answer') {
                correctShortAnswer = rawCorrectAnswer;
              }

              return {
                id: q.id || Date.now().toString(),
                type: standardType,
                multipleCorrect: false,
                text: questionText,
                options,
                correctShortAnswer,
                explanation
              };
            });
          }
        }

        if (customQuestions.length > 0) {
          setQuestions(customQuestions);
        }
      } catch (err) {
        console.error("Fetch quiz fail:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestionsAndQuiz();
  }, [sectionId, localNodeIndex, courseId, isPreviewMode, previewQuestions]);

  const [countdownPhrase] = useState(
    () => COUNTDOWN_PHRASES[Math.floor(Math.random() * COUNTDOWN_PHRASES.length)]
  );

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setTimer(100);
      setSelectedAnswerIds([]);
      setTextAnswer("");
      setIsCorrect(null);
      setPhase("playing");
    } else {
      setPhase("score");
    }
  }, [currentQuestionIndex, questions.length]);

  // Phase Management
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (phase === "intro") {
      timeout = setTimeout(() => {
        setPhase("countdown");
      }, 2000);
    } else if (phase === "countdown") {
      if (countdown > 0) {
        timeout = setTimeout(() => {
          setCountdown((prev) => {
            if (prev <= 1) setPhase("playing");
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => clearTimeout(timeout);
  }, [phase, countdown]);

  const handleCheckAnswer = useCallback(async () => {
    if (!currentQuestion) return;

    let correct = false;

    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
      const correctOptionIds = currentQuestion.options.filter(o => o.isCorrect).map(o => o.id);
      correct =
        selectedAnswerIds.length === correctOptionIds.length &&
        selectedAnswerIds.every(id => correctOptionIds.includes(id));
    } else if (currentQuestion.type === 'short_answer') {
      const expected = (currentQuestion.correctShortAnswer || '').trim().toLowerCase();
      const actual = textAnswer.trim().toLowerCase();
      correct = actual === expected;
    } else if (currentQuestion.type === 'open_ended') {
      correct = true;
    }

    setIsCorrect(correct);
    setPhase("result");

    if (correct) {
      const pointsPerQuestion = Math.ceil(100 / questions.length);
      setScore((prev) => Math.min(100, prev + pointsPerQuestion));
    } else {
      if (!isPreviewMode) {
        api.post("/profile/student/stats", { hearts_change: -1 })
          .then(() => onStatsUpdate?.())
          .catch(console.error);
      }
    }
  }, [currentQuestion, selectedAnswerIds, textAnswer, questions.length, isPreviewMode]);

  // Game Timer
  useEffect(() => {
    if (phase === "playing") {
      const questionTime = currentQuestion?.timeLimit || 30; // default 30s
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 0) {
            clearInterval(interval);
            setIsCorrect(false);
            setPhase("result");
            if (!isPreviewMode) {
              api.post("/profile/student/stats", { hearts_change: -1 })
                .then(() => onStatsUpdate?.())
                .catch(console.error);
            }
            return 0;
          }
          // decrease by (10 / questionTime) percentage per 100ms
          return prev - (10 / questionTime);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, isPreviewMode, currentQuestion]);

  // Calculate Stars
  const getStars = () => {
    if (score === 100) return 3;
    if (score >= 60) return 2;
    if (score >= 20) return 1;
    return 0;
  };

  // Grant rewards
  useEffect(() => {
    if (phase === "score" && !isPreviewMode) {
      const stars = getStars();
      if (stars > 0) {
        api.post("/profile/student/stats", { 
          xp_gain: stars * 15, 
          gems_gain: stars 
        })
        .then(() => onStatsUpdate?.())
        .catch(console.error);
      }
    }
  }, [phase, isPreviewMode]);

  const handleToggleOption = (optId: string) => {
    if (phase !== "playing" || previewRole === 'teacher') return;

    if (currentQuestion?.type === 'multiple_choice' && currentQuestion.multipleCorrect) {
      if (selectedAnswerIds.includes(optId)) {
        setSelectedAnswerIds(prev => prev.filter(id => id !== optId));
      } else {
        setSelectedAnswerIds(prev => [...prev, optId]);
      }
    } else {
      setSelectedAnswerIds([optId]);
    }
  };

  const isInputEmpty = () => {
    if (!currentQuestion) return true;
    if (previewRole === 'teacher') return false; // Teacher never blocked
    if (currentQuestion.type === 'multiple_choice' || currentQuestion.type === 'true_false') {
      return selectedAnswerIds.length === 0;
    }
    if (currentQuestion.type === 'short_answer' || currentQuestion.type === 'open_ended') {
      return textAnswer.trim().length === 0;
    }
    return true;
  };

  // --- RENDERERS ---

  if (isLoading || questions.length === 0 || !currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center p-8 select-none min-h-[300px]">
        <RefreshCw className="w-10 h-10 animate-spin text-sky-500 mb-4" />
        <span className="text-gray-500 font-black text-lg">Yükleniyor...</span>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="flex flex-col items-center animate-in zoom-in-50 duration-500 select-none">
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
      <div className="flex flex-col items-center justify-center animate-in zoom-in-50 duration-500 select-none">
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
      <div className="flex flex-col items-center animate-in zoom-in-50 duration-500 select-none">
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
                star <= stars ? "text-yellow-400 drop-shadow-lg" : "text-gray-200"
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

  if (phase === "playing" || phase === "result") {
    const isChecked = phase === "result";
    const isTeacher = previewRole === 'teacher';

    return (
      <div className="w-full max-w-5xl flex flex-col h-[94vh] py-4 relative overflow-hidden text-slate-800">
        
        {/* Header Bar */}
        <div className="w-full flex justify-between items-center mb-6 px-4 shrink-0 select-none">
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
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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

        {/* Content Layout - Stacked Vertical Layout */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-32 pt-2 px-4 select-text">
          
          {/* Question Text Area (Top Card) */}
          <div className="w-full shrink-0">
            <div className="bg-white border border-gray-100 rounded-[32px] p-6 md:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center w-full relative">
              
              {/* Teacher Mode Overlay Badge */}
              {isTeacher && (
                <div className="absolute top-4 right-4 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-[10px] font-black text-amber-600 tracking-wider uppercase select-none">
                  👨‍🏫 ÖĞRETMEN GÖRÜNÜMÜ
                </div>
              )}

              <span className="text-gray-400 font-extrabold text-[10px] uppercase tracking-[0.2em] block mb-2 select-none">
                SORU METNİ
              </span>
              
              <div className="text-left w-full space-y-4">
                {currentQuestion.text.split(/```/).map((part: string, i: number) => {
                  if (i % 2 === 1) {
                    const lines = part.trim().split('\n');
                    const code = lines.length > 1 && lines[0].length < 10 && !lines[0].includes(' ') 
                                 ? lines.slice(1).join('\n') 
                                 : part.trim();

                    return (
                      <div key={i} className="my-4 relative group max-w-full shrink-0 select-none">
                        <div className="absolute -top-3 left-8 px-4 py-1.5 bg-gray-900 text-sky-400 text-[10px] font-black rounded-full z-10 border border-gray-700 shadow-xl tracking-widest uppercase">
                          KOD EDİTÖRÜ
                        </div>
                        <pre className="bg-gray-950 text-sky-50 p-5 pt-8 rounded-3xl overflow-x-auto font-mono text-sm md:text-base leading-relaxed border-2 border-gray-800 shadow-2xl">
                          <code className="block min-w-max">{code}</code>
                        </pre>
                      </div>
                    );
                  }
                  return (
                    <h2 key={i} className="text-xl md:text-2xl lg:text-3xl font-black text-gray-850 font-display leading-snug text-center px-4">
                      {part.trim()}
                    </h2>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Interactive Input Area (Bottom Grid) */}
          <div className="w-full shrink-0">
            
            {/* 1. Çoktan Seçmeli (Multiple Choice) */}
            {currentQuestion.type === 'multiple_choice' && (
              <div className="grid grid-cols-2 gap-4 w-full select-none">
                {currentQuestion.options.map((opt, idx) => {
                  const colors = [
                    { bg: "bg-rose-500", hover: "hover:bg-rose-600", border: "border-rose-700", box: "bg-rose-700" },
                    { bg: "bg-sky-500", hover: "hover:bg-sky-600", border: "border-sky-700", box: "bg-sky-700" },
                    { bg: "bg-amber-400", hover: "hover:bg-amber-500", border: "border-amber-600", box: "bg-amber-600" },
                    { bg: "bg-emerald-500", hover: "hover:bg-emerald-600", border: "border-emerald-700", box: "bg-emerald-700" },
                  ];
                  const color = colors[idx % colors.length] || colors[0];
                  const isSelected = selectedAnswerIds.includes(opt.id);

                  let stateClass = "opacity-100 scale-100 cursor-pointer";
                  
                  if (isTeacher) {
                    if (opt.isCorrect) {
                      stateClass = "ring-4 ring-green-400/50 scale-[1.01] shadow-xl border-emerald-750 bg-emerald-500 text-white";
                    } else {
                      stateClass = "opacity-55 scale-98 border-rose-700 bg-rose-500 text-white";
                    }
                  } else if (isChecked) {
                    if (opt.isCorrect) {
                      stateClass = "ring-8 ring-green-400/50 scale-[1.02] shadow-2xl border-emerald-750 bg-emerald-500 text-white";
                    } else if (isSelected) {
                      stateClass = "opacity-60 scale-95 border-rose-750 bg-rose-500 grayscale text-white";
                    } else {
                      stateClass = "opacity-30 scale-95 grayscale text-white";
                    }
                  } else if (isSelected) {
                    stateClass = "ring-4 ring-white/60 scale-[1.01] shadow-md text-white";
                  }

                  const borderClass = isSelected && !isTeacher && !isChecked
                    ? "border-b-2 translate-y-[6px] shadow-sm"
                    : "border-b-8 shadow-lg active:translate-y-[2px]";

                  return (
                    <button
                      key={opt.id}
                      disabled={isChecked || isTeacher}
                      onClick={() => handleToggleOption(opt.id)}
                      className={`${color.bg} ${!isChecked && !isTeacher ? color.hover : ""} ${stateClass} ${borderClass} ${color.border} rounded-[24px] flex items-center p-4 gap-4 transition-all text-white w-full h-[88px]`}
                    >
                      <div className={`w-12 h-12 ${color.box} rounded-2xl flex items-center justify-center shadow-inner text-xl font-black font-display shrink-0`}>
                        {opt.id}
                      </div>
                      <div className="flex-1 text-left overflow-hidden flex items-center justify-between gap-2">
                        <span className="text-base md:text-lg font-black font-display leading-snug break-words">
                          {opt.text}
                        </span>
                        
                        {/* Indicators */}
                        {isTeacher ? (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 bg-white ${opt.isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {opt.isCorrect ? <Check size={16} strokeWidth={4} /> : <X size={16} strokeWidth={4} />}
                          </div>
                        ) : isChecked ? (
                          isSelected && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 bg-white text-emerald-600">
                              {opt.isCorrect ? <Check size={16} strokeWidth={4} /> : <X size={16} strokeWidth={4} />}
                            </div>
                          )
                        ) : (
                          isSelected && (
                            <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-xs shrink-0 text-white animate-in zoom-in-75 duration-150">
                              <Check size={16} strokeWidth={4} />
                            </div>
                          )
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. Doğru / Yanlış (True / False) */}
            {currentQuestion.type === 'true_false' && (
              <div className="grid grid-cols-2 gap-4 w-full select-none">
                {currentQuestion.options.map((opt, idx) => {
                  const colors = [
                    { bg: "bg-sky-500", hover: "hover:bg-sky-600", border: "border-sky-700", box: "bg-sky-700" },
                    { bg: "bg-rose-500", hover: "hover:bg-rose-600", border: "border-rose-700", box: "bg-rose-700" }
                  ];
                  const color = colors[idx % 2] || colors[0];
                  const isSelected = selectedAnswerIds.includes(opt.id);

                  let stateClass = "opacity-100 scale-100 cursor-pointer";
                  
                  if (isTeacher) {
                    if (opt.isCorrect) {
                      stateClass = "ring-4 ring-green-400/50 scale-[1.01] shadow-xl border-emerald-750 bg-emerald-500 text-white";
                    } else {
                      stateClass = "opacity-55 scale-98 border-rose-700 bg-rose-500 text-white";
                    }
                  } else if (isChecked) {
                    if (opt.isCorrect) {
                      stateClass = "ring-8 ring-green-400/50 scale-[1.02] shadow-2xl border-emerald-750 bg-emerald-500 text-white";
                    } else if (isSelected) {
                      stateClass = "opacity-60 scale-95 border-rose-750 bg-rose-500 grayscale text-white";
                    } else {
                      stateClass = "opacity-30 scale-95 grayscale text-white";
                    }
                  } else if (isSelected) {
                    stateClass = "ring-4 ring-white/60 scale-[1.01] shadow-md text-white";
                  }

                  const borderClass = isSelected && !isTeacher && !isChecked
                    ? "border-b-2 translate-y-[6px] shadow-sm"
                    : "border-b-8 shadow-lg active:translate-y-[2px]";

                  return (
                    <button
                      key={opt.id}
                      disabled={isChecked || isTeacher}
                      onClick={() => handleToggleOption(opt.id)}
                      className={`${color.bg} ${!isChecked && !isTeacher ? color.hover : ""} ${stateClass} ${borderClass} ${color.border} rounded-[24px] flex items-center p-4 gap-4 transition-all text-white w-full h-[88px]`}
                    >
                      <div className={`w-12 h-12 ${color.box} rounded-2xl flex items-center justify-center shadow-inner text-xl font-black font-display shrink-0`}>
                        {opt.id}
                      </div>
                      <div className="flex-1 text-left overflow-hidden flex items-center justify-between gap-2">
                        <span className="text-lg font-black font-display leading-snug break-words">
                          {opt.text}
                        </span>

                        {isTeacher ? (
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 bg-white ${opt.isCorrect ? 'text-emerald-600' : 'text-rose-500'}`}>
                            {opt.isCorrect ? <Check size={16} strokeWidth={4} /> : <X size={16} strokeWidth={4} />}
                          </div>
                        ) : isChecked ? (
                          isSelected && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 bg-white text-emerald-600">
                              {opt.isCorrect ? <Check size={16} strokeWidth={4} /> : <X size={16} strokeWidth={4} />}
                            </div>
                          )
                        ) : (
                          isSelected && (
                            <div className="w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-xs shrink-0 text-white animate-in zoom-in-75 duration-150">
                              <Check size={16} strokeWidth={4} />
                            </div>
                          )
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Kısa Cevap (Short Answer) */}
            {currentQuestion.type === 'short_answer' && (
              <div className="bg-amber-50/50 border-2 border-amber-200 rounded-[2rem] p-6 w-full shadow-sm flex flex-col gap-4 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-amber-700 font-extrabold text-sm select-none">
                  <PenTool className="w-5 h-5" />
                  <span>{isTeacher ? "ÖĞRETMEN YANITI VE DOĞRULAMA:" : "KISA CEVABINIZ:"}</span>
                </div>
                <input
                  type="text"
                  disabled={isChecked || isTeacher}
                  value={isTeacher ? (currentQuestion.correctShortAnswer || '') : textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="bg-white border-2 border-amber-100 p-4 text-lg font-bold text-slate-800 rounded-2xl focus:outline-none focus:border-amber-400 shadow-inner w-full text-center"
                  placeholder="Cevabınızı buraya yazın..."
                />
                
                {isTeacher && (
                  <div className="p-3 bg-emerald-50 border border-emerald-250 rounded-xl text-[11px] text-emerald-800 font-black text-center flex items-center justify-center gap-2 select-none">
                    <Check className="w-4 h-4" />
                    <span>Beklenen Doğru Cevap: "{currentQuestion.correctShortAnswer}"</span>
                  </div>
                )}
              </div>
            )}

            {/* 4. Açık Uçlu (Open Ended) */}
            {currentQuestion.type === 'open_ended' && (
              <div className="bg-emerald-50/40 border-2 border-emerald-200 rounded-[2rem] p-6 w-full shadow-sm flex flex-col gap-4 animate-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 text-emerald-700 font-extrabold text-sm select-none">
                  <FileText className="w-5 h-5" />
                  <span>AÇIKLAMALI CEVABINIZ:</span>
                </div>
                <textarea
                  disabled={isChecked || isTeacher}
                  rows={4}
                  value={isTeacher ? "Bu soru tipi açık uçlu olduğu için öğrenci istediği uzunlukta bir metin girebilir ve her yanıt sistem tarafından otomatik olarak onaylanır." : textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                  className="bg-white border-2 border-emerald-100 p-4 text-base font-semibold text-slate-800 rounded-2xl focus:outline-none focus:border-emerald-400 shadow-inner w-full resize-none leading-relaxed"
                  placeholder="Cevabınızı buraya detaylı olarak açıklayın..."
                />
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM DUOLINGO ACTION BANNER */}
        <div className="fixed inset-x-0 bottom-0 bg-white border-t border-gray-150 p-6 z-[100] flex flex-col select-none">
          <div className="max-w-5xl mx-auto w-full flex items-center justify-between gap-6">
            
            {/* Explanation / Checked Banner Details */}
            {isChecked || isTeacher ? (
              <div className="flex-1 flex items-center gap-4 animate-in slide-in-from-bottom-3 duration-250">
                <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center shrink-0 ${
                  isTeacher || isCorrect 
                    ? "bg-white border-green-500 text-green-500" 
                    : "bg-white border-red-500 text-red-500"
                }`}>
                  {isTeacher || isCorrect ? <Check size={28} strokeWidth={4} /> : <X size={28} strokeWidth={4} />}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <h3 className={`text-2xl font-black font-display tracking-tight leading-none ${
                    isTeacher || isCorrect ? "text-green-700" : "text-red-700"
                  }`}>
                    {isTeacher ? "SORU DÜZENİ" : isCorrect ? "HARİKA GİDİYORSUN!" : "YANLIŞ CEVAP!"}
                  </h3>
                  <div className="text-xs font-bold text-slate-500 mt-1 truncate">
                    {isTeacher ? (
                      <span>Eğitmen gözünden doğru cevaplar ve ayarlar listelenmektedir.</span>
                    ) : isCorrect ? (
                      <span className="text-green-600">+20 Puan kazandınız!</span>
                    ) : (
                      <span>
                        Doğru Cevap:{" "}
                        <span className="font-extrabold">
                          {currentQuestion.type === 'short_answer'
                            ? currentQuestion.correctShortAnswer
                            : currentQuestion.options.filter(o => o.isCorrect).map(o => o.text).join(', ')
                          }
                        </span>
                      </span>
                    )}
                  </div>
                  {currentQuestion.explanation && (
                    <div className="text-xs text-slate-500 font-semibold bg-gray-50 border border-gray-150 rounded-xl p-2.5 mt-2 max-h-[80px] overflow-y-auto leading-relaxed">
                      <span className="font-bold block text-[9px] uppercase tracking-wider text-slate-400 mb-0.5">AÇIKLAMA</span>
                      {currentQuestion.explanation}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center gap-2 text-slate-400 font-bold text-sm">
                <AlertCircle className="w-5 h-5" />
                <span>Lütfen soruyu yanıtlayıp "Kontrol Et" butonuna basın.</span>
              </div>
            )}

            {/* Submition buttons */}
            {isTeacher ? (
              <button
                onClick={nextQuestion}
                className="px-10 py-4 font-black text-sm uppercase tracking-wider bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg border-b-[4px] border-indigo-800 active:border-b-0 active:translate-y-[4px] transition-all shrink-0"
              >
                {currentQuestionIndex < questions.length - 1 ? "Sonraki Soru" : "Bitir (Önizleme)"}
              </button>
            ) : isChecked ? (
              <button
                onClick={nextQuestion}
                className={`px-10 py-4 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg border-b-[4px] border-black/15 text-white active:border-b-0 active:translate-y-[4px] transition-all shrink-0 ${
                  isCorrect 
                    ? "bg-green-500 hover:bg-green-600 active:bg-green-700" 
                    : "bg-red-500 hover:bg-red-600 active:bg-red-700"
                }`}
              >
                Devam Et
              </button>
            ) : (
              <button
                onClick={handleCheckAnswer}
                disabled={isInputEmpty()}
                className={`px-10 py-4 font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg border-b-[4px] border-black/15 active:border-b-0 active:translate-y-[4px] transition-all shrink-0 ${
                  isInputEmpty()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed border-none shadow-none"
                    : "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                }`}
              >
                Kontrol Et
              </button>
            )}

          </div>
        </div>

      </div>
    );
  }

  return null;
};

export default MatchingGame;
