import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Save,
  Plus,
  X,
  Loader2,
  Play,
  Cloud,
  Sparkles,
  Circle,
  Triangle,
  Hexagon,
  Home,
  Brain as LucideBrain,
  Pencil as LucidePencil,
  Puzzle as LucidePuzzle,
  Trophy as LucideTrophy,
  HelpCircle,
  FileText,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Settings,
} from "lucide-react";
import api from "../../api";

// Sprites matching the student view
import GrassIcon from "../../assets/sprites/grass.png";
import ButtonCyan from "../../assets/sprites/ButtonCyan.png";
import ButtonPurple from "../../assets/sprites/ButtonPurple.png";
import ButtonYellow from "../../assets/sprites/ButtonYellow.png";
import ButtonGreen from "../../assets/sprites/ButtonGreen.png";
import BrainIcon from "../../assets/sprites/Brain.png";
import PencilIcon from "../../assets/sprites/Pencil.png";
import PuzzleIcon from "../../assets/sprites/Puzzle.png";
import TrophyIcon from "../../assets/sprites/Trophy.png";
import ButtonDarkBlue from "../../assets/sprites/ButtonDarkBlue.png";
import ButtonDarkPurple from "../../assets/sprites/ButtonDarkPurple.png";
import QuestionIcon from "../../assets/sprites/Question.png";
import BagIcon from "../../assets/sprites/Bag.png";

interface SectionNode {
  id: string | number;
  title: string;
  lectures?: any[];
  [key: string]: any;
}

const InstructorRoadmapBuilder: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  const [course, setCourse] = useState<any>(null);
  const [sections, setSections] = useState<SectionNode[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [liveSessionsConfig, setLiveSessionsConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | number | null>(null);
  const [activePlusMenuId, setActivePlusMenuId] = useState<string | number | null>(null);
  const [draggedItem, setDraggedItem] = useState<{ type: "level" | "divider"; index: number } | null>(null);
  const [dragOverItem, setDragOverItem] = useState<{ type: "level" | "divider" | "connector" | "plus_connector" | "plus_divider"; index: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Roadmap Generator States
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("Beginner");
  const [aiLessonsCount, setAiLessonsCount] = useState(6);
  const [autoLessonsCount, setAutoLessonsCount] = useState(true);
  const [aiAudience, setAiAudience] = useState("Hiç kodlama deneyimi olmayan öğrenciler.");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProgressStatus, setAiProgressStatus] = useState("");
  const [aiProgressPercent, setAiProgressPercent] = useState(0);
  const [aiLessons, setAiLessons] = useState<any[]>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState<number>(-1);
  const [aiStep, setAiStep] = useState<"form" | "topics_raw_edit" | "topics_edit" | "planning" | "generating">("form");
  const [suggestedTopics, setSuggestedTopics] = useState<string[]>([]);
  const [newTopicInput, setNewTopicInput] = useState<string>("");
  interface SuggestedLesson {
    lessonNumber: number;
    title: string;
    topics: string[];
  }
  const [suggestedLessons, setSuggestedLessons] = useState<SuggestedLesson[]>([]);
  const [aiLessonDuration, setAiLessonDuration] = useState<number>(60);
  const [isSuggestingParameters, setIsSuggestingParameters] = useState<boolean>(false);
  const [hasDraftAIContent, setHasDraftAIContent] = useState(false);
  const [isRegeneratingLessonIndex, setIsRegeneratingLessonIndex] = useState<number | null>(null);
  const [isSuggestingTitleId, setIsSuggestingTitleId] = useState<string | number | null>(null);
  const [isSuggestingLevelId, setIsSuggestingLevelId] = useState<string | number | null>(null);
  const [isPlanningStructure, setIsPlanningStructure] = useState(false);
  const [activeSuggestionsMenuId, setActiveSuggestionsMenuId] = useState<string | number | null>(null);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfContent, setPdfContent] = useState<string>("");
  const roadmapScrollContainerRef = useRef<HTMLDivElement>(null);

  const handleCloseAIModal = () => {
    setIsAIModalOpen(false);
    setAiStep("form");
  };

  const handleUpdateModuleTopicField = (id: string | number, val: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === id ? { ...s, aiModuleTopic: val } : s))
    );
  };

  const handleRegenerateLessonLevels = async (targetLessonNumber: number, lessonTopic: string) => {
    if (!lessonTopic.trim()) {
      alert("Lütfen ders başlığı girin.");
      return;
    }
    
    setIsRegeneratingLessonIndex(targetLessonNumber);
    try {
      const response = await api.post("/courses/suggest_lesson_modules", {
        lesson_title: lessonTopic,
        course_topic: aiTopic,
        difficulty: aiDifficulty,
        audience: aiAudience,
        pdf_content: pdfContent || null
      });
      
      if (response.data?.success && response.data?.modules) {
        const modules = response.data.modules;
        const objective = response.data.objective;
        
        setSections((prevSections) => {
          const startIndex = prevSections.findIndex(s => s.lessonNumber === targetLessonNumber);
          if (startIndex === -1) return prevSections;
          
          let endIndex = startIndex + 1;
          while (endIndex < prevSections.length && !prevSections[endIndex].lessonNumber) {
            endIndex++;
          }
          
          const newNodes = modules.map((m: any, j: number) => {
            const isFirstModule = j === 0;
            const theme = getThemeFromModuleType(m.type);
            const levelId = `sec_ai_draft_${Date.now()}_${targetLessonNumber}_${j}_${Math.floor(Math.random() * 1000)}`;
            const shortTitle = getShortTitle(m.topic) || `Ders ${targetLessonNumber}`;
            
            const node: any = {
              id: levelId,
              title: shortTitle,
              theme: theme,
              lectures: [],
              isAIDraft: true,
              aiModuleTopic: m.topic || "",
              aiLessonObjective: objective || `Bu derste ${lessonTopic} konusu öğrenilecektir.`
            };
            
            if (isFirstModule) {
              node.lessonTopic = lessonTopic;
              node.lessonNumber = targetLessonNumber;
            }
            return node;
          });
          
          const updated = [...prevSections];
          updated.splice(startIndex, endIndex - startIndex, ...newNodes);
          return recalculateSectionsList(updated);
        });
        
        // Also close edit panel in case active node was deleted/replaced
        setActiveNodeId(null);
      } else {
        alert("Ders seviyeleri yeniden oluşturulamadı.");
      }
    } catch (error: any) {
      console.error("Error regenerating lesson levels:", error);
      alert(error.response?.data?.detail || "Ders seviyeleri yeniden oluşturulurken hata oluştu.");
    } finally {
      setIsRegeneratingLessonIndex(null);
    }
  };

  const handleSuggestLessonTitle = async (sectionId: string | number, lessonNumber: number) => {
    setActiveSuggestionsMenuId(sectionId);
    setSuggestedTitles([]);
    setIsSuggestingTitleId(sectionId);
    try {
      const existingLessons: string[] = [];
      sections.forEach((s) => {
        if (s.lessonTopic !== undefined) {
          existingLessons.push(s.lessonTopic);
        }
      });

      const response = await api.post("/courses/suggest_lesson_title", {
        course_topic: aiTopic || course?.title || "Ders",
        difficulty: aiDifficulty,
        audience: aiAudience,
        lesson_number: lessonNumber,
        existing_lessons: existingLessons,
        pdf_content: pdfContent || null
      });

      if (response.data?.success && response.data?.titles) {
        setSuggestedTitles(response.data.titles);
      }
    } catch (error) {
      console.error("Error suggesting lesson title:", error);
    } finally {
      setIsSuggestingTitleId(null);
    }
  };

  const handleSelectSuggestedTitle = (sectionId: string | number, title: string) => {
    handleUpdateLessonTopic(sectionId, title);
    setActiveSuggestionsMenuId(null);
  };

  const handleSuggestLevelDetails = async (id: string | number, theme?: string) => {
    const sectionIndex = sections.findIndex(s => s.id === id);
    if (sectionIndex === -1) return;
    const section = sections[sectionIndex];
    
    let lessonTitle = "";
    for (let i = sectionIndex; i >= 0; i--) {
      if (sections[i].lessonTopic !== undefined) {
        lessonTitle = sections[i].lessonTopic || "";
        break;
      }
    }
    
    const siblingModules: any[] = [];
    let idx = sectionIndex;
    while (idx >= 0) {
      if (idx !== sectionIndex) {
        siblingModules.push({
          type: getModuleTypeFromTheme(sections[idx].theme),
          topic: sections[idx].aiModuleTopic || sections[idx].title
        });
      }
      if (sections[idx].lessonTopic !== undefined) break;
      idx--;
    }
    idx = sectionIndex + 1;
    while (idx < sections.length && sections[idx].lessonTopic === undefined) {
      siblingModules.push({
        type: getModuleTypeFromTheme(sections[idx].theme),
        topic: sections[idx].aiModuleTopic || sections[idx].title
      });
      idx++;
    }

    setIsSuggestingLevelId(id);
    try {
      const response = await api.post("/courses/suggest_level_details", {
        course_topic: aiTopic || course?.title || "Ders",
        difficulty: aiDifficulty,
        audience: aiAudience,
        lesson_title: lessonTitle || "Giriş",
        module_type: getModuleTypeFromTheme(theme),
        sibling_modules: siblingModules,
        pdf_content: pdfContent || null
      });

      if (response.data?.success) {
        const { title, topic } = response.data;
        setSections((prev) =>
          prev.map((s) => (s.id === id ? { ...s, title: title, aiModuleTopic: topic } : s))
        );
      }
    } catch (error) {
      console.error("Error suggesting level details:", error);
    } finally {
      setIsSuggestingLevelId(null);
    }
  };

  const getModuleTypeFromTheme = (theme?: string) => {
    if (!theme) return "UNDERSTAND";
    const t = theme.toLowerCase();
    if (t === "purple") return "UNDERSTAND";
    if (t === "cyan") return "APPLY";
    if (t === "green") return "CONNECT";
    if (t === "yellow") return "CREATE";
    if (t === "quiz") return "QUIZ";
    if (t === "homework") return "HOMEWORK";
    return "UNDERSTAND";
  };

  const handleCancelDraft = async () => {
    if (window.confirm("AI Ders Taslağını iptal etmek istiyor musunuz? Yol haritası eski haline dönecektir.")) {
      setHasDraftAIContent(false);
      setIsLoading(true);
      try {
        const response = await api.get(`/courses/${courseId}`);
        setCourse(response.data);
        setAiTopic(response.data.title || "");
        setNotes(response.data.notes || []);
        
        const rawCurriculum = response.data?.curriculum || [];
        const pattern = ["purple", "cyan", "green", "yellow"];
        const actualSections = rawCurriculum
          .filter((item: any) => item.type !== "live_sessions_config")
          .map((item: any, idx: number) => {
            if (!item.theme) {
              return { ...item, theme: pattern[idx % pattern.length] };
            }
            return item;
          });
        const configItem = rawCurriculum.find(
          (item: any) => item.type === "live_sessions_config"
        );
        
        if (actualSections.length > 0 && !actualSections[0].lessonTopic) {
          actualSections[0].lessonTopic = response.data.title || "Giriş Konusu";
          actualSections[0].lessonNumber = 1;
        }
        
        setSections(actualSections);
        setLiveSessionsConfig(configItem || null);
      } catch (error) {
        console.error("Error reverting draft:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleStartGeneratingSlidesFromDraft = async () => {
    const chapters = getChaptersFromSections(sections);
    if (chapters.length === 0) {
      alert("Haritada ders bulunamadı.");
      return;
    }

    setIsGeneratingAI(true);
    setAiProgressStatus("Ders slaytları ve içerikleri üretiliyor...");
    setAiProgressPercent(5);
    setCurrentLessonIndex(0);

    const allNotes: any[] = [];
    let overallIdx = 1;

    try {
      for (let i = 0; i < chapters.length; i++) {
        setCurrentLessonIndex(i);
        const chapter = chapters[i];

        const firstNodeId = chapter.levels[0]?.id;
        const firstNodeIndex = sections.findIndex(s => s.id === firstNodeId);
        if (firstNodeIndex !== -1) {
          scrollActiveNodeIntoView(firstNodeIndex);
        }

        // Show spinner on current chapter nodes
        setSections((prev) =>
          prev.map((s) =>
            chapter.levels.some((cl) => cl.id === s.id)
              ? { ...s, isAILoading: true }
              : s
          )
        );

        setAiProgressStatus(`Ders ${i + 1}/${chapters.length}: "${chapter.topic}" Slaytları Dolduruluyor...`);
        setAiProgressPercent(Math.round(15 + (i / chapters.length) * 75));

        const modules = chapter.levels.map((lvl) => ({
          type: getModuleTypeFromTheme(lvl.theme),
          topic: lvl.title
        }));

        const objective = chapter.levels[0]?.aiLessonObjective || `Bu derste ${chapter.topic} konusu öğrenilecektir.`;

        const lessonRes = await api.post("/courses/generate_lesson_slides", {
          topic: aiTopic || course?.title || "Ders",
          difficulty: aiDifficulty,
          audience: aiAudience,
          lesson_number: chapter.number,
          lesson_title: chapter.topic,
          lesson_objective: objective,
          modules: modules,
          pdf_content: pdfContent || null
        });

        if (lessonRes.data?.success) {
          const returnedModules = lessonRes.data.modules || [];
          const returnedNotes = lessonRes.data.notes || [];

          returnedModules.forEach((node: any) => {
            node.title = `Ders ${overallIdx}`;
            overallIdx++;
            delete node.isAIDraft;
            delete node.isAILoading;
          });

          returnedNotes.forEach((note: any) => {
            const matchedNode = returnedModules.find((nm: any) => nm.id === note.id);
            if (matchedNode) {
              note.noteTitle = matchedNode.title;
            }
          });

          allNotes.push(...returnedNotes);

          setSections((prevSections) => {
            const updated = [...prevSections];
            const chapterLevelIds = chapter.levels.map((l) => l.id);
            const firstPlaceholderIdx = updated.findIndex((s) => chapterLevelIds.includes(s.id));
            if (firstPlaceholderIdx !== -1) {
              updated.splice(firstPlaceholderIdx, chapter.levels.length, ...returnedModules);
            }
            return recalculateSectionsList(updated);
          });
        }
      }

      setCurrentLessonIndex(chapters.length);
      setAiProgressStatus("Yol Haritası Görselleştiriliyor...");
      setAiProgressPercent(95);

      setNotes(allNotes);
      setHasDraftAIContent(false);

      setAiProgressStatus("Tamamlandı!");
      setAiProgressPercent(100);

      setTimeout(() => {
        alert("AI başarıyla yol haritasını ve tüm ders slaytlarını hazırladı! Kaydetmek için 'Haritayı Kaydet' butonuna basabilirsiniz.");
      }, 300);

    } catch (error: any) {
      console.error("AI Generation error:", error);
      alert(error.response?.data?.detail || "AI ders slaytlarını üretirken hata oluştu.");
    } finally {
      setIsGeneratingAI(false);
      setSections((prev) => prev.map((s) => ({ ...s, isAILoading: false })));
      setCurrentLessonIndex(-1);
    }
  };


  const getThemeFromModuleType = (type: string) => {
    const t = type.toUpperCase();
    if (t === "UNDERSTAND") return "purple";
    if (t === "APPLY") return "cyan";
    if (t === "CONNECT") return "green";
    if (t === "CREATE") return "yellow";
    if (t === "QUIZ") return "quiz";
    if (t === "HOMEWORK") return "homework";
    return "purple";
  };

  const scrollActiveNodeIntoView = (index: number) => {
    if (roadmapScrollContainerRef.current) {
      const elementWidth = 320;
      const targetScroll = index * elementWidth - (roadmapScrollContainerRef.current.clientWidth / 2) + 160;
      roadmapScrollContainerRef.current.scrollTo({
        left: Math.max(0, targetScroll),
        behavior: "smooth"
      });
    }
  };

  const handleExportRoadmap = async () => {
    setIsSaving(true);
    try {
      const response = await api.get(`/courses/${courseId}/export_roadmap`);
      const data = response.data;
      
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(data, null, 2)
      )}`;
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", jsonString);
      
      const fileName = `${course?.title ? course.title.replace(/\s+/g, "_") : "course"}_roadmap.json`;
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (error) {
      console.error("Yol haritası dışa aktarılırken hata:", error);
      alert("Yol haritası dışa aktarılamadı.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Dikkat! Yol haritası yüklemek, bu kursun mevcut tüm müfredatını, ders içeriklerini ve quizlerini tamamen silecektir. Devam etmek istiyor musunuz?")) {
      return;
    }

    setIsSaving(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsedData = JSON.parse(event.target?.result as string);
        
        // Basic validation
        if (!parsedData.curriculum || !Array.isArray(parsedData.curriculum)) {
          throw new Error("Geçersiz dosya formatı: 'curriculum' alanı eksik veya hatalı.");
        }

        const response = await api.post(`/courses/${courseId}/import_roadmap`, parsedData);
        if (response.data.success) {
          alert("Yol haritası ve içerikleri başarıyla yüklendi!");
          window.location.reload();
        } else {
          alert(response.data.message || "Yol haritası yüklenirken bir hata oluştu.");
        }
      } catch (error: any) {
        console.error("Yol haritası içe aktarılırken hata:", error);
        alert(`Yol haritası içe aktarılamadı: ${error.message || error}`);
      } finally {
        setIsSaving(false);
      }
    };
    reader.readAsText(file);
  };

  const getShortTitle = (fullText: string) => {
    if (!fullText) return "";
    const parts = fullText.split(/[?:-]/);
    const firstPart = parts[0].trim();
    if (firstPart.length > 25) {
      return firstPart.substring(0, 22) + "...";
    }
    return firstPart;
  };

  const handleEditLessonTitle = (lIdx: number, title: string) => {
    setSuggestedLessons(prev => prev.map((l, idx) => idx === lIdx ? { ...l, title } : l));
  };

  const handleDeleteLesson = (lIdx: number) => {
    setSuggestedLessons(prev => prev.filter((_, idx) => idx !== lIdx).map((l, idx) => ({ ...l, lessonNumber: idx + 1 })));
  };

  const handleAddLesson = () => {
    setSuggestedLessons(prev => [
      ...prev,
      {
        lessonNumber: prev.length + 1,
        title: `Ders ${prev.length + 1}`,
        topics: ["Yeni Konu Başlığı"]
      }
    ]);
  };

  const handleEditTopicTitle = (lIdx: number, tIdx: number, topicVal: string) => {
    setSuggestedLessons(prev => prev.map((l, idx) => {
      if (idx !== lIdx) return l;
      const updatedTopics = l.topics.map((t, tIdx2) => tIdx2 === tIdx ? topicVal : t);
      return { ...l, topics: updatedTopics };
    }));
  };

  const handleDeleteTopic = (lIdx: number, tIdx: number) => {
    setSuggestedLessons(prev => prev.map((l, idx) => {
      if (idx !== lIdx) return l;
      return { ...l, topics: l.topics.filter((_, tIdx2) => tIdx2 !== tIdx) };
    }));
  };

  const handleAddTopic = (lIdx: number) => {
    setSuggestedLessons(prev => prev.map((l, idx) => {
      if (idx !== lIdx) return l;
      return { ...l, topics: [...l.topics, "Yeni Konu Başlığı"] };
    }));
  };

  const [isDistributingTopics, setIsDistributingTopics] = useState<boolean>(false);
  const [isExpandingTopics, setIsExpandingTopics] = useState<boolean>(false);
  const [expandingTopicIndex, setExpandingTopicIndex] = useState<number | null>(null);

  const handleExpandSingleTopic = async (tIdx: number) => {
    const topicToExpand = suggestedTopics[tIdx];
    if (!topicToExpand || !topicToExpand.trim()) return;

    setIsExpandingTopics(true);
    setExpandingTopicIndex(tIdx);

    try {
      const response = await api.post("/courses/expand_topics", {
        topics: [topicToExpand],
        course_topic: aiTopic,
        difficulty: aiDifficulty,
        audience: aiAudience
      });

      if (response.data?.success && response.data.expanded_topics) {
        const expanded = response.data.expanded_topics;
        setSuggestedTopics(prev => {
          const next = [...prev];
          next.splice(tIdx, 1, ...expanded);
          return next;
        });
      } else {
        alert("Konu detaylandırılamadı.");
      }
    } catch (error: any) {
      console.error("Error expanding topic:", error);
      alert(error.response?.data?.detail || "Konu detaylandırılırken bir hata oluştu.");
    } finally {
      setIsExpandingTopics(false);
      setExpandingTopicIndex(null);
    }
  };

  const handleExpandAllTopics = async () => {
    if (suggestedTopics.length === 0) {
      alert("Detaylandırılacak konu bulunmamaktadır.");
      return;
    }

    setIsExpandingTopics(true);

    try {
      const response = await api.post("/courses/expand_topics", {
        topics: suggestedTopics,
        course_topic: aiTopic,
        difficulty: aiDifficulty,
        audience: aiAudience
      });

      if (response.data?.success && response.data.expanded_topics) {
        setSuggestedTopics(response.data.expanded_topics);
      } else {
        alert("Konular genişletilemedi.");
      }
    } catch (error: any) {
      console.error("Error expanding topics:", error);
      alert(error.response?.data?.detail || "Konular genişletilirken bir hata oluştu.");
    } finally {
      setIsExpandingTopics(false);
    }
  };

  const handleSuggestRawTopics = async () => {
    if (!aiTopic.trim()) {
      alert("Lütfen bir ders konusu girin.");
      return;
    }
    setIsSuggestingParameters(true);
    setPdfContent(""); // Clear previous PDF text
    try {
      const formData = new FormData();
      formData.append("topic", aiTopic);
      formData.append("difficulty", aiDifficulty);
      formData.append("audience", aiAudience);
      if (pdfFile) {
        formData.append("pdf_file", pdfFile);
      }

      const response = await api.post("/courses/suggest_raw_topics", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      if (response.data?.success) {
        setSuggestedTopics(response.data.suggested_topics || []);
        if (response.data.pdf_text) {
          setPdfContent(response.data.pdf_text);
        }
        setAiStep("topics_raw_edit");
      } else {
        alert("Konu önerileri alınamadı.");
      }
    } catch (error: any) {
      console.error("Error suggesting raw topics:", error);
      alert(error.response?.data?.detail || "Konu önerileri alınırken hata oluştu.");
    } finally {
      setIsSuggestingParameters(false);
    }
  };

  const handleDistributeTopics = async (customTopicsList?: string[], customCount?: number) => {
    const listToDistribute = customTopicsList || suggestedTopics;
    if (listToDistribute.length === 0) {
      alert("Lütfen en az bir konu başlığı ekleyin.");
      return;
    }
    
    setIsDistributingTopics(true);
    const targetCount = customCount !== undefined ? customCount : (autoLessonsCount ? 0 : aiLessonsCount);
    
    try {
      const response = await api.post("/courses/distribute_topics_into_lessons", {
        topics: listToDistribute,
        lesson_duration: aiLessonDuration,
        lessons_count: targetCount
      });

      if (response.data?.success) {
        const lessons = response.data.suggested_lessons || [];
        const formatted = lessons.map((l: any) => ({
          lessonNumber: l.lesson_number,
          title: l.title,
          topics: l.topics || []
        }));
        setSuggestedLessons(formatted);
        setAiLessonsCount(response.data.suggested_lessons_count || 6);
        setAiStep("topics_edit");
      } else {
        alert("Konular derslere bölüştürülemedi.");
      }
    } catch (error: any) {
      console.error("Error distributing topics:", error);
      alert(error.response?.data?.detail || "Konular derslere bölüştürülürken hata oluştu.");
    } finally {
      setIsDistributingTopics(false);
    }
  };

  const handleSuggestRoadmap = async () => {
    if (!aiTopic.trim()) {
      alert("Lütfen bir ders konusu girin.");
      return;
    }
    
    setIsAIModalOpen(false);
    setIsPlanningStructure(true);
    setAiLessons([]);
    
    try {
      const payloadLessons = suggestedLessons.map((l) => ({
        title: l.title,
        topics: l.topics
      }));

      const response = await api.post("/courses/generate_roadmap_structure", {
        topic: aiTopic,
        difficulty: aiDifficulty,
        lessons_count: autoLessonsCount ? 0 : aiLessonsCount,
        audience: aiAudience,
        pdf_content: pdfContent || null,
        custom_lessons: payloadLessons.length > 0 ? payloadLessons : null
      });
      
      if (response.data?.success && response.data?.roadmap) {
        const roadmap = response.data.roadmap;
        const lessons = roadmap.lessons || [];
        
        if (lessons.length === 0) {
          alert("Ders planı oluşturulamadı.");
          return;
        }
        
        // Build the temporary draft sections list to show visual draft nodes immediately on the canvas!
        const tempSections: any[] = [];
        let tempLessonNum = 1;
        lessons.forEach((lesson: any, i: number) => {
          const modules = lesson.modules || [];
          modules.forEach((m: any, j: number) => {
            const isFirstModule = j === 0;
            const theme = getThemeFromModuleType(m.type);
            const levelId = `sec_ai_draft_${Date.now()}_${i}_${j}_${Math.floor(Math.random() * 1000)}`;
            const shortTitle = getShortTitle(m.topic) || `Ders ${tempLessonNum}`;
            
            const node: any = {
              id: levelId,
              title: shortTitle,
              theme: theme,
              lectures: [],
              isAIDraft: true, // Mark as draft
              aiModuleTopic: m.topic || "", // Store full detailed suggestion here
              aiLessonObjective: lesson.objective || `Bu derste ${lesson.title} konusu öğrenilecektir.`
            };
            
            if (isFirstModule) {
              node.lessonTopic = lesson.title;
              node.lessonNumber = tempLessonNum;
              tempLessonNum++;
            }
            tempSections.push(node);
          });
        });
        
        setSections(recalculateSectionsList(tempSections));
        setHasDraftAIContent(true);
      } else {
        alert("Ders planı önerilemedi.");
      }
    } catch (error: any) {
      console.error("AI Roadmap Structure Generation error:", error);
      alert(error.response?.data?.detail || "AI ders planı önerirken hata oluştu.");
    } finally {
      setIsPlanningStructure(false);
      setAiStep("form"); // Reset modal step
    }
  };


  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        const response = await api.get(`/courses/${courseId}`);
        setCourse(response.data);
        setAiTopic(response.data.title || "");
        setNotes(response.data.notes || []);
        
        const rawCurriculum = response.data?.curriculum || [];
        const pattern = ["purple", "cyan", "green", "yellow"];
        const actualSections = rawCurriculum
          .filter((item: any) => item.type !== "live_sessions_config")
          .map((item: any, idx: number) => {
            if (!item.theme) {
              return { ...item, theme: pattern[idx % pattern.length] };
            }
            return item;
          });
        const configItem = rawCurriculum.find(
          (item: any) => item.type === "live_sessions_config"
        );
        
        // Ensure Level 1 has a starting lessonTopic if there are levels
        if (actualSections.length > 0 && !actualSections[0].lessonTopic) {
          actualSections[0].lessonTopic = response.data.title || "Giriş Konusu";
          actualSections[0].lessonNumber = 1;
        }
        
        setSections(actualSections);
        setLiveSessionsConfig(configItem || null);
      } catch (error) {
        console.error("Kurs bilgileri yüklenemedi:", error);
        alert("Kurs verileri yüklenirken bir hata oluştu.");
        navigate("/instructor/courses");
      } finally {
        setIsLoading(false);
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, navigate]);

  const handleSaveCurriculumOnly = async (customSections: SectionNode[] = sections) => {
    try {
      const curriculumPayload = [];
      if (liveSessionsConfig) {
        curriculumPayload.push(liveSessionsConfig);
      } else {
        curriculumPayload.push({
          type: "live_sessions_config",
          is_live: false,
          sessions: [],
        });
      }
      curriculumPayload.push(...customSections);

      await api.put(`/update_course/${courseId}`, {
        curriculum: curriculumPayload,
        notes: notes,
      });
    } catch (error) {
      console.error("Error auto-saving curriculum:", error);
    }
  };

  const recalculateSectionsList = (list: SectionNode[]): SectionNode[] => {
    let lessonNum = 1;
    return list.map((s, idx) => {
      const isDefaultTitle = !s.title || /^Ders \d+$/.test(s.title);
      const updatedTitle = isDefaultTitle ? `Ders ${idx + 1}` : s.title;

      let updatedTopic = s.lessonTopic;
      let updatedNum = s.lessonNumber;

      if (idx === 0 && s.lessonTopic === undefined) {
        updatedTopic = course?.title || "Giriş Konusu";
        updatedNum = lessonNum++;
      } else if (s.lessonTopic !== undefined) {
        updatedNum = lessonNum++;
      }

      const returned: SectionNode = {
        ...s,
        title: updatedTitle,
      };

      if (updatedTopic !== undefined) {
        returned.lessonTopic = updatedTopic;
      } else {
        delete returned.lessonTopic;
      }
      if (updatedNum !== undefined) {
        returned.lessonNumber = updatedNum;
      } else {
        delete returned.lessonNumber;
      }

      return returned;
    });
  };

  const handleAddSection = () => {
    const newId = `sec_${Date.now()}`;
    const pattern = ["purple", "cyan", "green", "yellow"];
    const defaultTheme = pattern[sections.length % pattern.length];
    const newSection: SectionNode = {
      id: newId,
      title: `Ders ${sections.length + 1}`,
      lectures: [],
      theme: defaultTheme,
    };
    if (sections.length === 0) {
      newSection.lessonTopic = course?.title || "Giriş Konusu";
      newSection.lessonNumber = 1;
    }
    const updated = [...sections, newSection];
    const final = recalculateSectionsList(updated);
    setSections(final);
    setActiveNodeId(newId);
  };

  const handleRemoveSection = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Bu seviyeyi yol haritasından silmek istediğinize emin misiniz?")) {
      const updated = sections.filter((s) => s.id !== id);
      const final = recalculateSectionsList(updated);
      setSections(final);
      if (activeNodeId === id) setActiveNodeId(null);
    }
  };

  const handleUpdateTitle = (id: string | number, newTitle: string) => {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
  };

  const handleAddDivider = (sectionId: string | number) => {
    const updated = sections.map((s) => {
      if (s.id === sectionId) {
        return {
          ...s,
          lessonTopic: "Yeni Ders Konusu",
          lessonNumber: 0
        };
      }
      return s;
    });

    const final = recalculateSectionsList(updated);
    setSections(final);
  };

  const handleRemoveDivider = (sectionId: string | number) => {
    const updated = sections.map((s) => {
      if (s.id === sectionId) {
        const { lessonTopic, lessonNumber, ...rest } = s;
        return rest as SectionNode;
      }
      return s;
    });

    const final = recalculateSectionsList(updated);
    setSections(final);
  };

  const handleUpdateLessonTopic = (sectionId: string | number, topic: string) => {
    setSections(
      sections.map((s) => (s.id === sectionId ? { ...s, lessonTopic: topic } : s))
    );
  };

  const handleAddLevelAt = (index: number, insertAfterDivider: boolean = false) => {
    const newId = `sec_${Date.now()}`;
    const targetIdx = insertAfterDivider ? index : index + 1;
    const pattern = ["purple", "cyan", "green", "yellow"];
    const defaultTheme = pattern[targetIdx % pattern.length];

    const newSection: SectionNode = {
      id: newId,
      title: `Ders ${sections.length + 1}`,
      lectures: [],
      theme: defaultTheme,
    };
    
    let updated = [...sections];
    if (insertAfterDivider) {
      const currentSec = updated[index];
      if (currentSec && currentSec.lessonTopic) {
        newSection.lessonTopic = currentSec.lessonTopic;
        newSection.lessonNumber = currentSec.lessonNumber;
        
        const { lessonTopic, lessonNumber, ...rest } = currentSec;
        updated[index] = rest as SectionNode;
      }
      updated.splice(index, 0, newSection);
    } else {
      updated.splice(index + 1, 0, newSection);
    }
    
    const final = recalculateSectionsList(updated);
    setSections(final);
    setActivePlusMenuId(null);
    setActiveNodeId(newId);
  };

  const handleAddDividerAt = (index: number) => {
    handleAddDivider(sections[index + 1].id);
    setActivePlusMenuId(null);
  };

  const getCategoryFromTheme = (theme?: string, index?: number) => {
    const activeTheme = theme || (index !== undefined ? (index % 4 === 0 ? "purple" : index % 4 === 1 ? "cyan" : index % 4 === 2 ? "green" : "yellow") : "purple");
    if (activeTheme === "purple") return "ANLA";
    if (activeTheme === "cyan") return "UYGULA";
    if (activeTheme === "green") return "BİRLEŞTİR";
    if (activeTheme === "quiz") return "QUIZ";
    if (activeTheme === "homework") return "ÖDEV";
    return "ÜRET";
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const curriculumPayload = [];
      if (liveSessionsConfig) {
        curriculumPayload.push(liveSessionsConfig);
      } else {
        curriculumPayload.push({
          type: "live_sessions_config",
          is_live: false,
          sessions: [],
        });
      }
      curriculumPayload.push(...sections);

      await api.put(`/update_course/${courseId}`, {
        curriculum: curriculumPayload,
        notes: notes,
      });

      alert("Yol haritası başarıyla kaydedildi!");
      navigate("/instructor/courses");
    } catch (error) {
      console.error("Yol haritası kaydedilirken hata:", error);
      alert("Yol haritası kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (
      window.confirm(
        "Tüm yol haritasını silmek istediğinize emin misiniz? Bu işlem tüm seviyeleri ve ders çizgilerini temizleyecektir ve geri alınamaz!"
      )
    ) {
      setSections([]);
      setActiveNodeId(null);
      setActivePlusMenuId(null);
      await handleSaveCurriculumOnly([]);
    }
  };

  const handleUpdateTheme = (id: string | number, themeId: string) => {
    setSections(
      sections.map((s) => (s.id === id ? { ...s, theme: themeId } : s))
    );
  };

  const handleDragStart = (e: React.DragEvent, type: "level" | "divider", index: number) => {
    setDraggedItem({ type, index });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, type: "level" | "divider" | "connector" | "plus_connector" | "plus_divider", index: number) => {
    e.preventDefault();
    if (!draggedItem) return;
    if (dragOverItem?.type !== type || dragOverItem?.index !== index) {
      setDragOverItem({ type, index });
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverItem(null);
  };

  const getChaptersFromSections = (list: SectionNode[]) => {
    const chapters: { topic: string; number: number; levels: SectionNode[] }[] = [];
    let currentChapter: typeof chapters[0] | null = null;

    list.forEach((s) => {
      if (s.lessonTopic || !currentChapter) {
        currentChapter = {
          topic: s.lessonTopic || course?.title || "Giriş Konusu",
          number: s.lessonNumber || (chapters.length + 1),
          levels: [],
        };
        chapters.push(currentChapter);
      }
      const { lessonTopic, lessonNumber, ...rest } = s;
      currentChapter.levels.push(rest as SectionNode);
    });

    return chapters;
  };

  const handleDrop = (e: React.DragEvent, targetType: "level" | "divider" | "connector" | "plus_connector" | "plus_divider", targetIdx: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    const sourceIdx = draggedItem.index;
    const sourceType = draggedItem.type;

    if (sourceType === "level") {
      if (targetType === "level" && sourceIdx !== targetIdx) {
        // Swap elements at sourceIdx and targetIdx, but preserve the chapter divider positions
        const updated = [...sections];
        
        const sourceTopic = updated[sourceIdx].lessonTopic;
        const sourceNum = updated[sourceIdx].lessonNumber;
        const targetTopic = updated[targetIdx].lessonTopic;
        const targetNum = updated[targetIdx].lessonNumber;

        const temp = updated[sourceIdx];
        updated[sourceIdx] = updated[targetIdx];
        updated[targetIdx] = temp;

        // Restore chapter details to original positions
        if (sourceTopic !== undefined) {
          updated[sourceIdx].lessonTopic = sourceTopic;
        } else {
          delete updated[sourceIdx].lessonTopic;
        }
        if (sourceNum !== undefined) {
          updated[sourceIdx].lessonNumber = sourceNum;
        } else {
          delete updated[sourceIdx].lessonNumber;
        }

        if (targetTopic !== undefined) {
          updated[targetIdx].lessonTopic = targetTopic;
        } else {
          delete updated[targetIdx].lessonTopic;
        }
        if (targetNum !== undefined) {
          updated[targetIdx].lessonNumber = targetNum;
        } else {
          delete updated[targetIdx].lessonNumber;
        }

        const final = recalculateSectionsList(updated);
        setSections(final);
        handleSaveCurriculumOnly(final);
      } else if (targetType === "plus_connector" || targetType === "plus_divider") {
        const sourceSec = sections[sourceIdx];
        const targetSec = sections[targetIdx];

        if (sourceSec && targetSec) {
          const chapters = getChaptersFromSections(sections);

          let sourceChIdx = -1, sourceLvlIdx = -1;
          let targetChIdx = -1, targetLvlIdx = -1;

          chapters.forEach((ch, chIdx) => {
            const sLvlIdx = ch.levels.findIndex((l) => l.id === sourceSec.id);
            if (sLvlIdx !== -1) {
              sourceChIdx = chIdx;
              sourceLvlIdx = sLvlIdx;
            }
            const tLvlIdx = ch.levels.findIndex((l) => l.id === targetSec.id);
            if (tLvlIdx !== -1) {
              targetChIdx = chIdx;
              targetLvlIdx = tLvlIdx;
            }
          });

          if (sourceChIdx !== -1 && targetChIdx !== -1) {
            const [removedLvl] = chapters[sourceChIdx].levels.splice(sourceLvlIdx, 1);
            let adjustedTargetLvlIdx = targetLvlIdx;
            if (sourceChIdx === targetChIdx && sourceLvlIdx < targetLvlIdx) {
              adjustedTargetLvlIdx = targetLvlIdx - 1;
            }

            if (targetType === "plus_connector") {
              chapters[targetChIdx].levels.splice(adjustedTargetLvlIdx + 1, 0, removedLvl);
            } else if (targetType === "plus_divider") {
              chapters[targetChIdx].levels.splice(adjustedTargetLvlIdx, 0, removedLvl);
            }

            const filteredChapters = chapters.filter((ch) => ch.levels.length > 0);
            const rebuilt: SectionNode[] = [];
            filteredChapters.forEach((ch) => {
              ch.levels.forEach((lvl, lvlIdx) => {
                if (lvlIdx === 0) {
                  rebuilt.push({
                    ...lvl,
                    lessonTopic: ch.topic,
                    lessonNumber: ch.number,
                  });
                } else {
                  rebuilt.push(lvl);
                }
              });
            });

            const final = recalculateSectionsList(rebuilt);
            setSections(final);
            handleSaveCurriculumOnly(final);
          }
        }
      }
    } else if (sourceType === "divider") {
      if (targetType === "connector") {
        const destinationIdx = targetIdx + 1; // Dropped on connector after targetIdx, so it goes before destinationIdx
        if (sourceIdx !== destinationIdx) {
          const updated = [...sections];
          const sourceSec = updated[sourceIdx];
          const targetSec = updated[destinationIdx];

          if (sourceSec && targetSec) {
            // Swap topic and number to avoid data loss
            const tempTopic = targetSec.lessonTopic;
            const tempNumber = targetSec.lessonNumber;

            targetSec.lessonTopic = sourceSec.lessonTopic;
            targetSec.lessonNumber = sourceSec.lessonNumber;

            if (tempTopic) {
              sourceSec.lessonTopic = tempTopic;
              sourceSec.lessonNumber = tempNumber;
            } else {
              delete sourceSec.lessonTopic;
              delete sourceSec.lessonNumber;
            }
          }

          const final = recalculateSectionsList(updated);
          setSections(final);
          handleSaveCurriculumOnly(final);
        }
      }
    }

    setDraggedItem(null);
    setDragOverItem(null);
  };

  // Helper to map themes to levels matching student view exact parameters
  const getNodeMetadata = (idx: number, customTheme?: string) => {
    const themes: { [key: string]: any } = {
      purple: { button: ButtonPurple, icon: BrainIcon, ringColor: "border-fuchsia-400 bg-white", baseColor: "#d946ef", strokeColor: "#c026d3", iconSize: "w-20 h-20", iconOffset: "-mt-22", isAsset: true },
      cyan: { button: ButtonCyan, icon: PencilIcon, ringColor: "border-cyan-400 bg-white", baseColor: "#06b6d4", strokeColor: "#0891b2", iconSize: "w-24 h-24", iconOffset: "-mt-20", isAsset: true },
      green: { button: ButtonGreen, icon: PuzzleIcon, ringColor: "border-green-400 bg-white", baseColor: "#22c55e", strokeColor: "#16a34a", iconSize: "w-20 h-20", iconOffset: "-mt-20", isAsset: true },
      yellow: { button: ButtonYellow, icon: TrophyIcon, ringColor: "border-yellow-400 bg-white", baseColor: "#eab308", strokeColor: "#ca8a04", iconSize: "w-24 h-24", iconOffset: "-mt-20", isAsset: true },
      quiz: { button: ButtonDarkPurple, icon: QuestionIcon, ringColor: "border-purple-400 bg-white", baseColor: "#7c3aed", strokeColor: "#6d28d9", iconSize: "w-26 h-26", iconOffset: "-mt-24", isAsset: true },
      homework: { button: ButtonDarkBlue, icon: BagIcon, ringColor: "border-indigo-400 bg-white", baseColor: "#2563eb", strokeColor: "#1d4ed8", iconSize: "w-26 h-26", iconOffset: "-mt-24", isAsset: true },
    };

    if (customTheme && themes[customTheme]) {
      return themes[customTheme];
    }

    const pattern = ["purple", "cyan", "green", "yellow"];
    const defaultTheme = pattern[idx % pattern.length];
    return themes[defaultTheme];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mb-4" />
        <h2 className="text-xl font-black text-gray-700">Yol Haritası Yükleniyor...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col relative select-none overflow-hidden">
      {/* GLOBAL ROADMAP BUILDER BAR (Themed like LessonBuilderHeader) */}
      <div className="h-20 bg-gradient-to-r from-indigo-600 to-violet-600 border-b-4 border-indigo-800 flex items-center justify-between px-6 z-50 shrink-0 shadow-2xl relative overflow-hidden">
        
        {/* Decorative Background Elements */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <Cloud className="absolute top-[-10px] left-96 text-white/10 transform -rotate-12" size={80} />
          <Cloud className="absolute -bottom-8 right-1/4 text-white/5 transform rotate-12" size={60} />
          <Sparkles className="absolute top-4 right-1/3 text-yellow-300/20 animate-pulse" size={24} />
          <Circle className="absolute top-1/2 left-1/4 text-white/5" size={16} />
          <Triangle className="absolute bottom-2 left-32 text-white/10 transform rotate-45" size={20} />
          <Hexagon className="absolute top-2 right-10 text-white/10" size={40} />

          {/* Decorative Dots */}
          <div className="absolute top-10 left-1/3 w-1.5 h-1.5 bg-white/30 rounded-full"></div>
          <div className="absolute bottom-4 right-1/2 w-2 h-2 bg-white/10 rounded-full"></div>
        </div>

        {/* LEFT: Back & Project Info */}
        <div className="flex items-center gap-4 relative z-10">
          <button
            onClick={() => navigate("/instructor/courses")}
            className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl text-white hover:scale-105 transition-all shadow-sm"
            title="Kurslara Geri Dön"
          >
            <Home className="w-5 h-5" />
          </button>
          <div className="h-8 w-px bg-indigo-400/50"></div>
          <div className="flex flex-col">
            <span className="font-black text-white text-xl leading-none">
              {course?.title || "Yükleniyor..."}
            </span>
            <span className="text-xs font-bold text-indigo-200 px-0.5 mt-1 tracking-wide uppercase opacity-80">
              Yol Haritası Düzenleyici (Roadmap Builder)
            </span>
          </div>
        </div>

        {/* RIGHT: Save Actions */}
        <div className="flex items-center gap-4 relative z-10">
          {/* Save Status / Loader */}
          {isSaving && (
            <div className="flex items-center gap-2 text-indigo-200 pr-2">
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span className="text-xs font-bold text-white">Kaydediliyor...</span>
            </div>
          )}

          <button
            onClick={handleClearAll}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-black rounded-xl shadow-[0_4px_0_#991b1b] hover:shadow-[0_2px_0_#991b1b] hover:translate-y-[2px] transition-all text-xs sm:text-sm uppercase tracking-wide group"
            title="Tüm Yolu Temizle"
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Tümünü Temizle</span>
          </button>

          <button
            onClick={() => setIsAIModalOpen(true)}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-650 hover:to-indigo-750 text-white font-black rounded-xl shadow-[0_4px_0_#4338ca] hover:shadow-[0_2px_0_#4338ca] hover:translate-y-[2px] transition-all text-xs sm:text-sm uppercase tracking-wide group"
            title="AI ile Yol Haritası Oluştur"
          >
            <Sparkles className="w-4 h-4 group-hover:animate-pulse transition-transform text-purple-200" />
            <span>AI ile Oluştur</span>
          </button>

          <button
            onClick={handleExportRoadmap}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-black rounded-xl shadow-[0_4px_0_#4338ca] hover:shadow-[0_2px_0_#4338ca] hover:translate-y-[2px] transition-all text-xs sm:text-sm uppercase tracking-wide group"
            title="Yol Haritasını JSON Olarak İndir"
          >
            <Download className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>JSON İndir</span>
          </button>

          <button
            onClick={handleImportClick}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black rounded-xl shadow-[0_4px_0_#b45309] hover:shadow-[0_2px_0_#b45309] hover:translate-y-[2px] transition-all text-xs sm:text-sm uppercase tracking-wide group"
            title="JSON Dosyasından Yol Haritası Yükle"
          >
            <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>JSON Yükle</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            accept=".json"
            className="hidden"
          />

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 font-black rounded-xl shadow-[0_4px_0_rgba(0,0,0,0.1)] hover:shadow-[0_2px_0_rgba(0,0,0,0.1)] hover:translate-y-[2px] transition-all text-sm uppercase tracking-wide group"
          >
            <Save className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span>Haritayı Kaydet</span>
          </button>
        </div>
      </div>

      {/* Main Roadmap Path Container */}
      <div 
        ref={roadmapScrollContainerRef}
        onClick={() => { setActiveNodeId(null); setActivePlusMenuId(null); }}
        className="flex-1 w-full flex items-center justify-start px-12 md:px-24 relative roadmap-canvas overflow-x-auto custom-scrollbar pt-20 pb-20"
      >
        <style>{`
          .roadmap-canvas {
            background-color: #ffffff;
            background-image: radial-gradient(#e2e8f0 1.5px, transparent 1.5px);
            background-size: 24px 24px;
          }
          .custom-scrollbar::-webkit-scrollbar {
            height: 12px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-8px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>

        <div className="flex items-center min-w-max relative pl-20 pr-20">
          {sections.map((section, index) => {
            const metadata = getNodeMetadata(index, section.theme);
            const levelCounter = index + 1;
            const curve = index % 2 === 0 ? "up" : "down";

            return (
              <React.Fragment key={section.id}>
                {/* STARTING/CUSTOM LESSON HEADER DIVIDER CARD */}
                {section.lessonTopic !== undefined && (
                  <div className="w-48 h-64 -mx-4 relative z-10 flex items-center justify-center">
                    {/* Vertical Dashed Line */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2px] bg-gray-300 border-l-2 border-dashed border-gray-300 h-96 -z-10 opacity-50" />

                    {/* Main Divider Body */}
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, "divider", index)}
                      onDragOver={(e) => {
                        if (draggedItem?.type === "divider") {
                          handleDragOver(e, "divider", index);
                        }
                      }}
                      onDrop={(e) => {
                        if (draggedItem?.type === "divider") {
                          handleDrop(e, "divider", index);
                        }
                      }}
                      onDragEnd={handleDragEnd}
                      className={`relative w-full flex flex-col items-center group/divider cursor-grab active:cursor-grabbing transition-all duration-200 ${
                        draggedItem?.type === "divider" && draggedItem.index === index
                          ? "opacity-40 scale-95"
                          : ""
                      } ${
                        dragOverItem?.type === "divider" && dragOverItem.index === index
                          ? "scale-105 rotate-1"
                          : ""
                      }`}
                    >
                      {/* Title Suggestions Popover Menu */}
                      {activeSuggestionsMenuId === section.id && (
                        <div
                          className="absolute bottom-full mb-3 bg-slate-900 border-2 border-indigo-500 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-1.5 w-60 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150 text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest pb-1.5 border-b border-slate-800 mb-1 flex items-center justify-between">
                            <span>DERS BAŞLIĞI SEÇİN</span>
                            <button
                              onClick={() => setActiveSuggestionsMenuId(null)}
                              className="text-slate-500 hover:text-slate-350 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </span>

                          {isSuggestingTitleId === section.id ? (
                            <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
                              <div className="w-5 h-5 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450">Konular Hazırlanıyor...</span>
                            </div>
                          ) : suggestedTitles.length === 0 ? (
                            <span className="text-[10px] font-bold text-slate-450 text-center py-2">Öneri bulunamadı.</span>
                          ) : (
                            <div className="flex flex-col gap-1 max-h-48 overflow-y-auto custom-scrollbar">
                              {suggestedTitles.map((title, tIdx) => (
                                <button
                                  key={tIdx}
                                  onClick={() => handleSelectSuggestedTitle(section.id, title)}
                                  className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-200 hover:bg-slate-800 hover:text-white rounded-xl transition-all border border-transparent hover:border-slate-700/60 leading-normal"
                                >
                                  {title}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Arrow Tail pointing down */}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 w-3.5 h-3.5 rotate-45 bg-slate-900 border-b-2 border-r-2 border-indigo-500 -mt-1.5"></div>
                        </div>
                      )}
                      {/* Delete Divider Button on Hover */}
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveDivider(section.id)}
                          onDragStart={(e) => e.stopPropagation()}
                          draggable={false}
                          className="absolute -top-3 right-3 w-6 h-6 bg-red-100 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover/divider:opacity-100 shadow-md z-30"
                          title="Bölümü Kaldır"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      )}

                      {/* Topic Badge */}
                      <div className={`bg-white p-4 rounded-2xl shadow-lg border-2 flex flex-col items-center transform hover:scale-105 transition-all z-10 w-40 ${
                        dragOverItem?.type === "divider" && dragOverItem.index === index
                          ? "border-indigo-500 ring-4 ring-indigo-100 shadow-2xl"
                          : "border-indigo-100"
                      }`}>
                        <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-1 shrink-0">
                          DERS {section.lessonNumber || 1}
                        </span>
                        <textarea
                          rows={2}
                          value={section.lessonTopic}
                          onClick={(e) => e.stopPropagation()}
                          onDragStart={(e) => e.stopPropagation()}
                          draggable={false}
                          onChange={(e) => handleUpdateLessonTopic(section.id, e.target.value)}
                          className="text-sm font-black font-display tracking-tight text-gray-800 text-center bg-transparent focus:outline-none w-full resize-none leading-tight py-0.5 border-b border-transparent hover:border-gray-200 focus:border-indigo-500"
                        />
                        {hasDraftAIContent && (
                          <div className="flex flex-col gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100 w-full shrink-0 animate-in fade-in slide-in-from-top-1 duration-150">
                            {/* Title Suggestion */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSuggestLessonTitle(section.id, section.lessonNumber || 1);
                              }}
                              disabled={isSuggestingTitleId === section.id}
                              className="w-full py-1 px-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/60 text-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shrink-0"
                            >
                              {isSuggestingTitleId === section.id ? (
                                <div className="w-3 h-3 rounded-full border-2 border-indigo-500/25 border-t-indigo-650 animate-spin"></div>
                              ) : (
                                <Sparkles size={11} />
                              )}
                              <span className="text-[9px] font-black tracking-wide uppercase">Başlık Öner</span>
                            </button>

                            {/* Levels Suggestion */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRegenerateLessonLevels(section.lessonNumber, section.lessonTopic);
                              }}
                              disabled={isRegeneratingLessonIndex === section.lessonNumber}
                              className="w-full py-1 px-2 rounded-lg bg-purple-50 hover:bg-purple-100 border border-purple-100/60 text-purple-750 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] shrink-0"
                            >
                              {isRegeneratingLessonIndex === section.lessonNumber ? (
                                <div className="w-3 h-3 rounded-full border-2 border-purple-500/25 border-t-purple-650 animate-spin"></div>
                              ) : (
                                <RefreshCw size={10} />
                              )}
                              <span className="text-[9px] font-black tracking-wide uppercase">Konuları Yenile</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Connector line from Divider to Level Node (only when lessonTopic is set) */}
                {section.lessonTopic !== undefined && (
                  <div className={`w-40 h-20 -mx-4 relative flex items-center justify-center ${
                    activePlusMenuId === `div_${section.id}` ? 'z-50' : 'z-0'
                  }`}>
                    <svg className="w-full h-full overflow-visible animate-pulse" viewBox="0 0 120 100" fill="none">
                      <path
                        d={curve === "up" ? "M0 45 Q 60 70 120 65" : "M0 45 Q 60 20 120 45"}
                        stroke="#cbd5e1"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray="0 22"
                        fill="none"
                      />
                    </svg>

                    {/* Plus button and interactive insert selection menu for divider-to-node connector */}
                    <div className="absolute z-40 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePlusMenuId(`div_${section.id}`);
                        }}
                        onDragOver={(e) => {
                          if (draggedItem?.type === "level") {
                            handleDragOver(e, "plus_divider", index);
                          }
                        }}
                        onDrop={(e) => {
                          if (draggedItem?.type === "level") {
                            handleDrop(e, "plus_divider", index);
                          }
                        }}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-md ${
                          activePlusMenuId === `div_${section.id}`
                            ? "bg-indigo-600 border-indigo-600 text-white scale-110"
                            : dragOverItem?.type === "plus_divider" && dragOverItem.index === index
                            ? "bg-indigo-600 border-indigo-600 text-white scale-125 ring-4 ring-indigo-200"
                            : "bg-white border-indigo-200 hover:border-indigo-500 text-indigo-500 hover:bg-indigo-50 hover:scale-110"
                        }`}
                        title="Ekleme Seçenekleri"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>

                      {/* Selection Menu Popup */}
                      {activePlusMenuId === `div_${section.id}` && (
                        <div
                          className="absolute top-full mt-3 bg-white border border-gray-100 rounded-2xl shadow-xl p-2.5 flex flex-col gap-1 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-150 cursor-default"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-center pb-1 border-b border-gray-100 mb-1">
                            NE EKLEMEK İSTERSİNİZ?
                          </span>
                          
                          <button
                            onClick={() => handleAddLevelAt(index, true)}
                            className="flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 rounded-xl transition-colors w-full"
                          >
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <Sparkles size={13} fill="currentColor" />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Yeni Seviye Ekle</span>
                          </button>

                          {/* Arrow Tail */}
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-t border-l border-gray-100"></div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Node Box */}
                <div
                  draggable={!section.isAILoading}
                  onDragStart={(e) => {
                    if (section.isAILoading) return;
                    handleDragStart(e, "level", index);
                  }}
                  onDragOver={(e) => {
                    if (section.isAILoading || draggedItem?.type !== "level") return;
                    handleDragOver(e, "level", index);
                  }}
                  onDrop={(e) => {
                    if (section.isAILoading || draggedItem?.type !== "level") return;
                    handleDrop(e, "level", index);
                  }}
                  onDragEnd={handleDragEnd}
                  className={`relative z-10 group ${section.isAILoading ? 'cursor-wait' : 'cursor-pointer transform hover:scale-105'} transition-all duration-200 ${
                    curve === "up" ? "mt-32" : "-mt-12"
                  } ${
                    draggedItem?.type === "level" && draggedItem.index === index
                      ? "opacity-40 scale-90"
                      : ""
                  } ${
                    dragOverItem?.type === "level" && dragOverItem.index === index
                      ? "scale-110 rotate-2"
                      : ""
                  }`}
                  onClick={(e) => {
                    if (section.isAILoading) return;
                    e.stopPropagation();
                    setActiveNodeId(activeNodeId === section.id ? null : section.id);
                    setActivePlusMenuId(null);
                  }}
                >
                  {/* Delete Button on Hover (Hidden when AI is generating) */}
                  {!section.isAILoading && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveSection(section.id, e)}
                      onDragStart={(e) => e.stopPropagation()}
                      draggable={false}
                      className="absolute -top-4 right-2 w-7 h-7 bg-red-100 border border-red-200 text-red-500 hover:bg-red-500 hover:text-white rounded-full flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 shadow-md z-[70]"
                      title="Seviyeyi Sil"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  )}

                  {/* Student-style interactive bubble popup above circle */}
                  {activeNodeId === section.id && (
                    <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 z-[60] mb-14 origin-bottom animate-in fade-in slide-in-from-bottom-3 duration-250 cursor-default"
                      onClick={(e) => e.stopPropagation()}
                      onDragStart={(e) => e.stopPropagation()}
                      draggable={false}
                    >
                      <div className="relative min-w-[280px] rounded-3xl border-x-2 border-t-2 border-b-[6px] shadow-2xl p-5 flex flex-col gap-3"
                           style={{ backgroundColor: metadata.baseColor, borderColor: metadata.strokeColor }}>
                        
                        {/* Glow shapes */}
                        <div className="absolute -top-12 -right-12 w-48 h-48 bg-white opacity-20 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="absolute bottom-0 -left-10 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl pointer-events-none"></div>
                        
                        {/* Tail */}
                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-5 h-5 rotate-45 rounded-sm"
                             style={{ backgroundColor: metadata.baseColor, borderRight: `2px solid ${metadata.strokeColor}`, borderBottom: `2px solid ${metadata.strokeColor}` }}></div>

                        {/* Title Editable Input */}
                        <div className="relative z-10 flex flex-col w-full">
                          <label className="text-white/85 text-[10px] font-black tracking-widest uppercase mb-1">
                            {section.isAIDraft ? "KISA DERS BAŞLIĞI" : "DERS BAŞLIĞI"}
                          </label>
                          <input
                            type="text"
                            value={section.title}
                            onChange={(e) => handleUpdateTitle(section.id, e.target.value)}
                            onDragStart={(e) => e.stopPropagation()}
                            draggable={false}
                            placeholder="Başlık girin..."
                            className="bg-white/20 text-white font-black text-sm px-3 py-2 rounded-xl focus:outline-none focus:bg-white/30 border border-white/10 placeholder-white/50 w-full"
                          />
                        </div>



                        {/* Level Type Selector */}
                        <div className="relative z-10 flex flex-col w-full">
                          <label className="text-white/85 text-[10px] font-black tracking-widest uppercase mb-1.5">SEVİYE TÜRÜ</label>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "purple", name: "Anla", icon: "brain" },
                              { id: "cyan", name: "Uygula", icon: "pencil" },
                              { id: "green", name: "Birleştir", icon: "puzzle" },
                              { id: "yellow", name: "Üret", icon: "trophy" },
                              { id: "quiz", name: "Quiz", icon: "quiz" },
                              { id: "homework", name: "Ödev", icon: "homework" }
                            ].map((th) => {
                              const isSelected = (section.theme || (index % 4 === 0 ? "purple" : index % 4 === 1 ? "cyan" : index % 4 === 2 ? "green" : "yellow")) === th.id;
                              return (
                                <button
                                  key={th.id}
                                  type="button"
                                  onClick={() => handleUpdateTheme(section.id, th.id)}
                                  className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all gap-1 ${
                                    isSelected
                                      ? "border-white bg-white/25 scale-105 shadow-md"
                                      : "border-transparent bg-white/5 opacity-70 hover:opacity-100"
                                  }`}
                                  title={th.name}
                                >
                                  {th.icon === "brain" && <LucideBrain size={16} className="text-white" />}
                                  {th.icon === "pencil" && <LucidePencil size={16} className="text-white" />}
                                  {th.icon === "puzzle" && <LucidePuzzle size={16} className="text-white" />}
                                  {th.icon === "trophy" && <LucideTrophy size={16} className="text-white" />}
                                  {th.icon === "quiz" && <HelpCircle size={16} className="text-white" />}
                                  {th.icon === "homework" && <FileText size={16} className="text-white" />}
                                  <span className="text-[10px] font-black text-white">{th.name}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hover circle overlay */}
                  <div
                    className={`absolute top-[75%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-16 border-8 rounded-[100%] opacity-0 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 pointer-events-none z-0 ${
                      metadata.ringColor
                    }`}
                  ></div>

                  {/* Button Sprite background */}
                  <img src={metadata.button} alt="Button Sprite" className={`w-36 relative z-10 transition-all duration-200 ${
                    section.isAILoading ? "opacity-20 blur-[1px] animate-pulse" : ""
                  } ${
                    section.isAIDraft ? "opacity-60 saturate-[0.6]" : ""
                  } ${
                    dragOverItem?.type === "level" && dragOverItem.index === index
                      ? "filter drop-shadow-[0_0_12px_rgba(99,102,241,0.8)]"
                      : ""
                  }`} />

                  {/* Float Shadow */}
                  <div className="absolute inset-0 flex items-center justify-center z-15 pointer-events-none">
                    <div
                      className="w-14 h-4 bg-gray-200 rounded-[100%] animate-shadow-pulse -mt-10"
                      style={{ animationDelay: `${index * 0.5 * -1}s` }}
                    ></div>
                  </div>

                  {/* Icon details with dynamic offsets and float behavior */}
                  <div className={`absolute inset-0 flex items-center justify-center z-20 ${metadata.iconOffset}`}>
                    {section.isAILoading ? (
                      <div className="w-16 h-16 flex items-center justify-center -mt-6 relative">
                        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-650 animate-spin"></div>
                        <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse absolute" />
                      </div>
                    ) : (
                      metadata.isAsset ? (
                        <img
                          src={metadata.icon}
                          alt={section.title}
                          className={`${metadata.iconSize} animate-float relative z-10`}
                          style={{ animationDelay: `${index * 0.5 * -1}s` }}
                        />
                      ) : (
                        <div 
                          className="animate-float relative z-10 w-16 h-16 flex items-center justify-center -mt-6 bg-white/20 rounded-full border-4 border-white/40 shadow-2xl backdrop-blur-sm"
                          style={{ animationDelay: `${index * 0.5 * -1}s` }}
                        >
                          {metadata.icon === "quiz" ? (
                            <HelpCircle size={36} className="text-white drop-shadow-md stroke-[3.5]" />
                          ) : (
                            <FileText size={36} className="text-white drop-shadow-md stroke-[3.5]" />
                          )}
                        </div>
                      )
                    )}

                    {/* Level label */}
                    <div
                      className="absolute -bottom-14 flex flex-col items-center justify-center animate-float z-20"
                      style={{ animationDelay: `${index * 0.5 * -1}s` }}
                    >
                      <span
                        className="text-2xl font-black tracking-wider select-none uppercase font-display text-center truncate max-w-[180px]"
                        style={{
                          color: "white",
                          WebkitTextStroke: `1.5px ${metadata.strokeColor}`,
                          paintOrder: "stroke fill",
                          textShadow: `2px 2px 0px ${metadata.strokeColor}`,
                        }}
                        title={section.title}
                      >
                        {section.title}
                      </span>
                      {section.isAIDraft && (
                        <span className="text-[8px] font-black text-amber-700 bg-amber-100 border border-amber-250 px-1.5 py-0.5 rounded-full mt-1.5 tracking-wider uppercase shrink-0">
                          TASLAK
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Edit Content Action below level */}
                  <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-48 text-center z-30 flex flex-col items-center">
                    {/* Play/Edit Content Button slides down under the node when clicked - mt-12 pushes it below LEVEL label */}
                    {activeNodeId === section.id && (
                      section.isAIDraft ? (
                        <div className="mt-16 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border-b-[3px] border-black/10 transition-all select-none">
                          Taslak Ders Seviyesi
                        </div>
                      ) : (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setIsSaving(true);
                            await handleSaveCurriculumOnly();
                            setIsSaving(false);
                            navigate(`/instructor/builder?courseId=${courseId}&noteId=${section.id}&category=${getCategoryFromTheme(section.theme, index)}`);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 mt-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-650 hover:to-teal-650 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border-b-[3px] border-black/10 active:border-b-0 active:translate-y-[3px] transition-all animate-in slide-in-from-top-2 duration-200"
                        >
                          <Play size={12} fill="currentColor" />
                          <span>İçeriği Düzenle</span>
                        </button>
                      )
                    )}
                  </div>
                </div>

                {/* Connector line to the next node / divider */}
                <div
                  onDragOver={(e) => {
                    if (draggedItem?.type === "divider" && index < sections.length - 1) {
                      handleDragOver(e, "connector", index);
                    }
                  }}
                  onDrop={(e) => {
                    if (draggedItem?.type === "divider" && index < sections.length - 1) {
                      handleDrop(e, "connector", index);
                    }
                  }}
                  className={`w-40 h-20 -mx-4 relative flex items-center justify-center transition-all duration-200 ${
                    activePlusMenuId === section.id ? 'z-50' : 'z-0'
                  } ${
                    dragOverItem?.type === "connector" && dragOverItem.index === index
                      ? "scale-110 z-30"
                      : ""
                  }`}
                >
                  <svg className="w-full h-full overflow-visible animate-pulse" viewBox="0 0 120 100" fill="none">
                    <path
                      d={
                        sections[index + 1]?.lessonTopic !== undefined
                          ? (curve === "up" ? "M0 65 Q 60 70 120 45" : "M0 45 Q 60 20 120 45")
                          : (curve === "up" ? "M0 65 Q 60 0 120 45" : "M0 45 Q 60 110 120 65")
                      }
                      stroke={
                        dragOverItem?.type === "connector" && dragOverItem.index === index
                          ? "#6366f1"
                          : "#cbd5e1"
                      }
                      strokeWidth={
                        dragOverItem?.type === "connector" && dragOverItem.index === index
                          ? "14"
                          : "10"
                      }
                      strokeLinecap="round"
                      strokeDasharray="0 22"
                      fill="none"
                    />
                  </svg>

                  {/* Plus button and interactive insert selection menu */}
                  {index < sections.length - 1 && (
                    <div className="absolute z-40 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePlusMenuId(activePlusMenuId === section.id ? null : section.id);
                        }}
                        onDragOver={(e) => {
                          if (draggedItem?.type === "level") {
                            handleDragOver(e, "plus_connector", index);
                          }
                        }}
                        onDrop={(e) => {
                          if (draggedItem?.type === "level") {
                            handleDrop(e, "plus_connector", index);
                          }
                        }}
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow-md ${
                          activePlusMenuId === section.id
                            ? "bg-indigo-600 border-indigo-600 text-white scale-110"
                            : dragOverItem?.type === "plus_connector" && dragOverItem.index === index
                            ? "bg-indigo-600 border-indigo-600 text-white scale-125 ring-4 ring-indigo-200"
                            : "bg-white border-indigo-200 hover:border-indigo-500 text-indigo-500 hover:bg-indigo-50 hover:scale-110"
                        }`}
                        title="Ekleme Seçenekleri"
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>

                      {/* Selection Menu Popup */}
                      {activePlusMenuId === section.id && (
                        <div
                          className="absolute top-full mt-3 bg-white border border-gray-100 rounded-2xl shadow-xl p-2.5 flex flex-col gap-1 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-150 cursor-default"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider text-center pb-1 border-b border-gray-100 mb-1">
                            NE EKLEMEK İSTERSİNİZ?
                          </span>
                          
                          <button
                            onClick={() => handleAddLevelAt(index)}
                            className="flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 rounded-xl transition-colors w-full"
                          >
                            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                              <Sparkles size={13} fill="currentColor" />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Yeni Seviye Ekle</span>
                          </button>

                          <button
                            onClick={() => handleAddDividerAt(index)}
                            disabled={!!sections[index + 1]?.lessonTopic}
                            className={`flex items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50 rounded-xl transition-colors w-full ${
                              sections[index + 1]?.lessonTopic ? "opacity-40 cursor-not-allowed hover:bg-transparent" : ""
                            }`}
                          >
                            <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                              <Cloud size={13} />
                            </div>
                            <span className="text-xs font-bold text-gray-700">Ders Çizgisi Ekle</span>
                          </button>

                          {/* Arrow Tail */}
                          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-white border-t border-l border-gray-100"></div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grass Sprites for cute aesthetic */}
                  <img
                    src={GrassIcon}
                    alt="Grass Deco"
                    className="absolute w-6 opacity-40 select-none pointer-events-none"
                    style={{ left: "40%", top: curve === "up" ? "30%" : "70%" }}
                  />
                </div>
              </React.Fragment>
            );
          })}

          {/* Plus sign gray button representing the next uncreated level */}
          <div
            className={`relative z-10 group transform hover:scale-105 transition-transform duration-200 ${
              sections.length % 2 === 0 ? "mt-32" : "-mt-12"
            }`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddSection();
              }}
              className="w-32 h-32 rounded-full border-4 border-dashed border-gray-300 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-600 text-gray-400 flex flex-col items-center justify-center transition-all shadow-inner active:scale-95 duration-100"
              title="Yeni Seviye Ekle"
            >
              <Plus size={36} strokeWidth={3} className="mb-1" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Yeni Seviye
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* AI ROADMAP GENERATOR MODAL */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onMouseDown={(e) => e.stopPropagation()}>
          <div className={`bg-white rounded-3xl shadow-2xl w-full ${aiStep === 'topics_edit' ? 'max-w-5xl h-[85vh] flex flex-col' : (aiStep === 'planning' || aiStep === 'generating') ? 'max-w-2xl' : 'max-w-lg'} overflow-hidden transition-all duration-300 animate-in zoom-in-95 duration-200`}>
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-indigo-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 animate-pulse text-purple-200" />
                <h3 className="text-lg font-black tracking-wide font-display">AI ile Yol Haritası Oluştur</h3>
              </div>
              <button
                onClick={handleCloseAIModal}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {aiStep === "planning" && (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-6 min-h-[360px] animate-in fade-in duration-300">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center animate-ping absolute inset-0"></div>
                  <div className="w-16 h-16 rounded-full bg-indigo-600 border border-indigo-500 flex items-center justify-center relative z-10 shadow-lg">
                    <Sparkles className="w-8 h-8 text-white animate-spin duration-[4000ms]" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-black text-indigo-600 uppercase tracking-widest animate-pulse">Müfredat Planlanıyor</span>
                  <span className="text-sm text-gray-550 font-bold">Yapay zeka ders konularını ve modülleri tasarlıyor, lütfen bekleyin...</span>
                </div>
              </div>
            )}

            {aiStep === "generating" && (
              <div className="p-8 flex flex-col items-center justify-center text-center gap-6 min-h-[420px] animate-in fade-in duration-300">
                {/* Visual Roadmap Section */}
                <div className="w-full bg-slate-950 border border-slate-900 rounded-2xl p-6 relative overflow-hidden min-h-[180px] flex flex-col justify-center items-center shadow-inner">
                  {/* Dotted grid background */}
                  <div className="absolute inset-0 bg-[radial-gradient(#334155_1.2px,transparent_1.2px)] [background-size:16px_16px] opacity-40"></div>
                  
                  {aiLessons.length === 0 ? (
                    <div className="relative z-10 flex flex-col items-center gap-4 animate-pulse">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-purple-650/20 border-2 border-purple-500 flex items-center justify-center animate-ping absolute inset-0"></div>
                        <div className="w-16 h-16 rounded-full bg-indigo-600 border border-indigo-500 flex items-center justify-center relative z-10 shadow-lg">
                          <Sparkles className="w-8 h-8 text-white animate-spin duration-[4000ms]" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-black text-indigo-400 uppercase tracking-widest animate-pulse">Müfredat Planlanıyor</span>
                        <span className="text-[10px] text-slate-400 font-bold">Yapay zeka ders konularını ve modülleri tasarlıyor...</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative z-10 w-full flex flex-col items-center gap-4">
                      {/* Title display */}
                      <div className="bg-indigo-950/60 border border-indigo-800/40 px-4 py-1.5 rounded-full text-indigo-200 text-xs font-black tracking-wide shadow-sm max-w-md truncate">
                        {currentLessonIndex >= 0 && currentLessonIndex < aiLessons.length
                          ? `Aktif: Ders ${currentLessonIndex + 1}/${aiLessons.length} - ${aiLessons[currentLessonIndex].title}`
                          : "Yol Haritası Oluşturuldu!"}
                      </div>

                      {/* Map Path container */}
                      <div className="w-full overflow-x-auto py-4 px-2 flex items-center justify-start md:justify-center gap-0 scrollbar-none select-none">
                        {aiLessons.map((lesson, idx) => {
                          const isCompleted = idx < currentLessonIndex;
                          const isActive = idx === currentLessonIndex;

                          // Theme logic or color logic
                          let nodeColor = "bg-slate-800 text-slate-500 border-slate-700";
                          if (isCompleted) {
                            nodeColor = "bg-gradient-to-br from-green-500 to-emerald-600 text-white border-green-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]";
                          } else if (isActive) {
                            nodeColor = "bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-purple-400 animate-pulse shadow-[0_0_20px_rgba(147,51,234,0.5)] scale-110";
                          }

                          return (
                            <React.Fragment key={idx}>
                              {/* Connector line (except for first node) */}
                              {idx > 0 && (
                                <div className="flex-1 min-w-[24px] max-w-[48px] h-0 border-t-2 border-dashed transition-colors duration-500" style={{
                                  borderColor: isCompleted ? "#10b981" : isActive ? "#9333ea" : "#1e293b",
                                  borderStyle: isCompleted ? "solid" : "dashed"
                                }}></div>
                              )}

                              {/* Lesson Node */}
                              <div className="flex flex-col items-center gap-1.5 relative group">
                                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-black text-sm transition-all duration-500 relative ${nodeColor}`}>
                                  {isCompleted ? (
                                    <span className="text-white text-xs font-black">✓</span>
                                  ) : (
                                    <span>{idx + 1}</span>
                                  )}
                                  
                                  {/* Pulsing loading ring around active node */}
                                  {isActive && (
                                    <div className="absolute -inset-1 rounded-full border-2 border-purple-500 animate-ping opacity-60"></div>
                                  )}
                                </div>

                                {/* Floating Module Icons list for this node */}
                                <div className="absolute -top-6 flex gap-0.5 justify-center">
                                  {lesson.modules?.map((m: any, mIdx: number) => {
                                    let iconEl = <div key={mIdx} className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[7px] text-slate-400" title={m.type}>{m.type[0]}</div>;
                                    
                                    if (isCompleted) {
                                      iconEl = <div key={mIdx} className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-450 flex items-center justify-center text-[7px] text-white" title={m.type}>✓</div>;
                                    } else if (isActive) {
                                      let moduleBg = "bg-purple-600";
                                      if (m.type === "APPLY") moduleBg = "bg-cyan-500";
                                      if (m.type === "QUIZ") moduleBg = "bg-yellow-500";
                                      if (m.type === "HOMEWORK") moduleBg = "bg-red-500";
                                      iconEl = (
                                        <div 
                                          key={mIdx} 
                                          className={`w-3.5 h-3.5 rounded-full ${moduleBg} border border-white/20 flex items-center justify-center text-[7px] text-white animate-bounce`} 
                                          style={{ animationDelay: `${mIdx * 150}ms` }}
                                          title={m.type}
                                        >
                                          {m.type[0]}
                                        </div>
                                      );
                                    }
                                    return iconEl;
                                  })}
                                </div>

                                {/* Floating Lesson Title */}
                                <span className="absolute -bottom-6 text-[9px] font-black tracking-wide truncate max-w-[64px] text-center" style={{
                                  color: isCompleted ? "#34d399" : isActive ? "#c084fc" : "#64748b"
                                }}>
                                  {lesson.title}
                                </span>
                              </div>
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full relative z-10">
                  <h4 className="font-black text-gray-800 tracking-wide text-sm flex items-center justify-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
                    <span>GoMufi Yapay Zeka Müfredatı İnşa Ediyor</span>
                  </h4>
                  <p className="text-xs text-gray-500 font-bold px-4 transition-all duration-300 min-h-[32px]">{aiProgressStatus}</p>
                </div>
                
                {/* Progress bar container */}
                <div className="w-full bg-gray-150 h-3 rounded-full overflow-hidden shadow-inner relative mt-1 border border-gray-200">
                  <div 
                    className="bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 h-full transition-all duration-500 rounded-full"
                    style={{ width: `${aiProgressPercent}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">% {aiProgressPercent} Tamamlandı</span>
              </div>
            )}

            {aiStep === "form" && (
              <>
                {/* Body */}
                <div className="p-6 flex flex-col gap-4 text-left">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Kurs Konusu</label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      placeholder="örn: Python Programlamaya Giriş"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Zorluk Seviyesi</label>
                      <select
                        value={aiDifficulty}
                        onChange={(e) => setAiDifficulty(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-855 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      >
                        <option value="Beginner">Başlangıç</option>
                        <option value="Intermediate">Orta</option>
                        <option value="Advanced">İleri</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ders Süresi (Dakika)</label>
                      <select
                        value={aiLessonDuration}
                        onChange={(e) => setAiLessonDuration(parseInt(e.target.value))}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-855 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                      >
                        <option value="30">30 Dakika</option>
                        <option value="40">40 Dakika</option>
                        <option value="45">45 Dakika</option>
                        <option value="60">60 Dakika (1 Saat)</option>
                        <option value="90">90 Dakika</option>
                        <option value="120">120 Dakika (2 Saat)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Hedef Kitle</label>
                    <textarea
                      value={aiAudience}
                      onChange={(e) => setAiAudience(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm resize-none h-20"
                      placeholder="örn: Daha önce programlama yapmamış ilkokul öğrencileri."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Ders Kaynağı Yükle (PDF) (İsteğe Bağlı)</label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-200 hover:border-indigo-400 rounded-xl transition-all w-full text-xs font-bold text-gray-550 hover:text-indigo-650">
                        <Upload className="w-4 h-4 shrink-0" />
                        <span className="truncate">{pdfFile ? pdfFile.name : "PDF Dosyası Seç (Kitap, Ders Notu vb.)"}</span>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setPdfFile(file);
                          }}
                          className="hidden"
                        />
                      </label>
                      {pdfFile && (
                        <button
                          type="button"
                          onClick={() => setPdfFile(null)}
                          className="p-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-500 rounded-xl transition-all flex items-center justify-center shrink-0"
                          title="Dosyayı Kaldır"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    onClick={handleCloseAIModal}
                    className="px-4 py-2 border-2 border-gray-250 text-gray-550 font-black rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-xs uppercase"
                  >
                    Vazgeç
                  </button>
                  <button
                    onClick={handleSuggestRawTopics}
                    disabled={isSuggestingParameters}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-xl shadow-[0_4px_0_rgba(124,58,237,0.3)] hover:shadow-[0_2px_0_rgba(124,58,237,0.3)] hover:translate-y-[2px] transition-all text-xs uppercase flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSuggestingParameters ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                        <span>Konular Öneriliyor...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>Müfredat Konularını Öner</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {aiStep === "topics_raw_edit" && (
              <>
                {/* Body */}
                <div className="p-6 flex flex-col gap-5 text-left max-h-[480px] overflow-y-auto custom-scrollbar bg-slate-50/50">
                  <div className="flex flex-col gap-1 border-b border-gray-100 pb-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-purple-655 uppercase tracking-widest flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-550 animate-pulse" />
                        Müfredat Konu Önerileri (Adım 1/2)
                      </h3>
                      <span className="text-[10px] font-black bg-purple-50 text-purple-600 border border-purple-100 px-2.5 py-0.5 rounded-full">
                        {suggestedTopics.length} Konu Başlığı
                      </span>
                    </div>
                    <p className="text-[11px] font-bold text-gray-500 leading-normal">
                      Kursunuzda işlemek istediğiniz temel konu başlıklarını aşağıdan düzenleyin. Bir sonraki adımda bu konular ders sürelerinize göre otomatik olarak derslere dağıtılacaktır.
                    </p>
                  </div>

                  {/* Suggested Topics List */}
                  <div className="flex flex-col gap-2">
                    {suggestedTopics.map((topic, tIdx) => (
                      <div key={tIdx} className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 text-[10px] font-black border border-purple-100">
                          {tIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={topic}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSuggestedTopics((prev) =>
                              prev.map((t, idx) => (idx === tIdx ? val : t))
                            );
                          }}
                          className="flex-grow px-3 py-2 bg-white border border-gray-150 rounded-xl font-bold text-gray-800 text-xs focus:outline-none focus:border-purple-400 focus:bg-white transition-all shadow-sm"
                        />
                        <button
                          type="button"
                          onClick={() => handleExpandSingleTopic(tIdx)}
                          className="p-2 text-purple-550 hover:bg-purple-50 rounded-xl border border-transparent hover:border-purple-100 transition-all shrink-0"
                          title="AI ile bu konuyu detaylandır"
                          disabled={isExpandingTopics}
                        >
                          <Sparkles size={14} className={isExpandingTopics && expandingTopicIndex === tIdx ? "animate-spin" : ""} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSuggestedTopics((prev) => prev.filter((_, idx) => idx !== tIdx));
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all shrink-0"
                          title="Konuyu Sil"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {suggestedTopics.length > 0 && (
                    <button
                      type="button"
                      onClick={handleExpandAllTopics}
                      disabled={isExpandingTopics}
                      className="self-start text-[11px] font-black text-purple-600 hover:text-purple-700 flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-100 rounded-xl transition-all disabled:opacity-50"
                    >
                      <Sparkles size={12} className={isExpandingTopics && expandingTopicIndex === null ? "animate-spin" : ""} />
                      Tüm Konu Listesini Yapay Zekayla Detaylandır
                    </button>
                  )}

                  {/* Add New Topic Row */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <input
                      type="text"
                      value={newTopicInput}
                      onChange={(e) => setNewTopicInput(e.target.value)}
                      placeholder="Yeni konu başlığı ekleyin..."
                      className="flex-grow px-3 py-2 bg-white border border-gray-150 rounded-xl font-bold text-gray-855 text-xs focus:outline-none focus:border-purple-400 focus:bg-white transition-all shadow-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newTopicInput.trim()) {
                          setSuggestedTopics((prev) => [...prev, newTopicInput.trim()]);
                          setNewTopicInput("");
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (!newTopicInput.trim()) return;
                        setIsExpandingTopics(true);
                        try {
                          const response = await api.post("/courses/expand_topics", {
                            topics: [newTopicInput.trim()],
                            course_topic: aiTopic,
                            difficulty: aiDifficulty,
                            audience: aiAudience
                          });
                          if (response.data?.success && response.data.expanded_topics) {
                            setSuggestedTopics((prev) => [...prev, ...response.data.expanded_topics]);
                            setNewTopicInput("");
                          } else {
                            alert("Konu detaylandırılamadı.");
                          }
                        } catch (error: any) {
                          console.error("Error expanding topic:", error);
                          alert(error.response?.data?.detail || "Konu detaylandırılırken hata oluştu.");
                        } finally {
                          setIsExpandingTopics(false);
                        }
                      }}
                      disabled={isExpandingTopics || !newTopicInput.trim()}
                      className="px-3.5 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white rounded-xl text-xs font-black active:scale-95 transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                      title="Yazılan konuyu AI ile alt konulara parçalayarak ekle"
                    >
                      <Sparkles size={12} className={isExpandingTopics ? "animate-spin" : ""} />
                      <span>AI Detaylandır</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (newTopicInput.trim()) {
                          setSuggestedTopics((prev) => [...prev, newTopicInput.trim()]);
                          setNewTopicInput("");
                        }
                      }}
                      className="px-3.5 py-2 bg-purple-650 text-white rounded-xl text-xs font-black hover:bg-purple-700 active:scale-95 transition-all shrink-0"
                    >
                      Ekle
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                  <button
                    onClick={() => setAiStep("form")}
                    className="px-4 py-2 border-2 border-gray-250 text-gray-550 font-black rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-xs uppercase"
                  >
                    Geri Dön
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCloseAIModal}
                      className="px-4 py-2 border border-transparent text-gray-400 font-bold hover:text-gray-650 transition-colors text-xs uppercase"
                    >
                      Kapat
                    </button>
                    <button
                      onClick={() => handleDistributeTopics()}
                      disabled={isDistributingTopics}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-xl shadow-[0_4px_0_rgba(124,58,237,0.3)] hover:shadow-[0_2px_0_rgba(124,58,237,0.3)] hover:translate-y-[2px] transition-all text-xs uppercase flex items-center gap-2 disabled:opacity-50"
                    >
                      {isDistributingTopics ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                          <span>Derslere Dağıtılıyor...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Ders Planına Dönüştür</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {aiStep === "topics_edit" && (
              <>
                {/* Two-Column Wizard Body */}
                <div className="flex-grow flex overflow-hidden min-h-0 bg-slate-50">
                  {/* LEFT COLUMN: Settings Panel (1/3 width) */}
                  <div className="w-80 border-r border-gray-150 p-6 flex flex-col gap-4 overflow-y-auto bg-white/70">
                    <div className="flex flex-col gap-1 pb-2 border-b border-gray-100">
                      <h4 className="text-[11px] font-black text-indigo-650 uppercase tracking-widest flex items-center gap-1.5">
                        <Settings className="w-3.5 h-3.5" />
                        Müfredat Ayarları
                      </h4>
                      <p className="text-[10px] text-gray-550 font-bold leading-normal">
                        Müfredat parametrelerini değiştirebilir ve konuları yeniden hesaplatabilirsiniz.
                      </p>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Kurs Konusu</label>
                        <input
                          type="text"
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Ders Süresi</label>
                          <select
                            value={aiLessonDuration}
                            onChange={(e) => setAiLessonDuration(parseInt(e.target.value))}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs focus:outline-none focus:border-indigo-500"
                          >
                            <option value="30">30 Dakika</option>
                            <option value="40">40 Dakika</option>
                            <option value="45">45 Dakika</option>
                            <option value="60">60 Dakika (1 Saat)</option>
                            <option value="90">90 Dakika</option>
                            <option value="120">120 Dakika (2 Saat)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Zorluk Seviyesi</label>
                          <select
                            value={aiDifficulty}
                            onChange={(e) => setAiDifficulty(e.target.value)}
                            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs focus:outline-none focus:border-indigo-500"
                          >
                            <option value="Beginner">Başlangıç</option>
                            <option value="Intermediate">Orta</option>
                            <option value="Advanced">İleri</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold text-gray-500 uppercase tracking-wider mb-1">Hedef Kitle</label>
                        <textarea
                          value={aiAudience}
                          onChange={(e) => setAiAudience(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 text-xs focus:outline-none focus:border-indigo-500 resize-none h-16"
                        />
                      </div>
                    </div>

                    {/* Redistribute button */}
                    <button
                      onClick={() => handleDistributeTopics(suggestedLessons.flatMap(l => l.topics))}
                      disabled={isDistributingTopics}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-650 hover:from-purple-700 hover:to-indigo-755 text-white font-black rounded-xl text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/10 disabled:opacity-50 transition-all active:scale-95"
                    >
                      {isDistributingTopics ? (
                        <>
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                          <span>Yeniden Dağıtılıyor...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-purple-200" />
                          <span>Dersleri Yeniden Dağıt</span>
                        </>
                      )}
                    </button>

                    {/* Lesson Count Settings Block */}
                    <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-2.5">
                      <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider flex justify-between items-center select-none">
                        <span>Ders Sayısı Ayarı</span>
                        {autoLessonsCount ? (
                          <span className="text-purple-600 font-black text-[9px] bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100">
                            OTOMATİK ({suggestedLessons.length} Ders)
                          </span>
                        ) : (
                          <span className="text-indigo-650 font-black bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md text-[9px]">{aiLessonsCount} DERS</span>
                        )}
                      </label>
                      
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={autoLessonsCount}
                            onChange={(e) => setAutoLessonsCount(e.target.checked)}
                            className="w-3.5 h-3.5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-[10px] font-bold text-gray-550 leading-tight">Otomatik Belirle</span>
                        </label>
                        
                        {!autoLessonsCount && (
                          <div className="flex items-center gap-3 animate-in slide-in-from-top-1 duration-150 pt-1">
                            <input
                              type="range"
                              min="2"
                              max="20"
                              value={aiLessonsCount}
                              onChange={(e) => setAiLessonsCount(parseInt(e.target.value))}
                              className="flex-grow h-1.5 bg-gray-250 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                            />
                            <span className="text-xs font-black text-gray-700 w-8 text-right shrink-0">{aiLessonsCount} Ders</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN: Curriculum Timeline Panel (2/3 width) */}
                  <div className="flex-grow p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar bg-slate-50">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        <h4 className="font-extrabold text-sm text-gray-800">Ders & Konu Hiyerarşisi</h4>
                      </div>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-100 px-2.5 py-0.5 rounded-full">
                        {suggestedLessons.reduce((acc, curr) => acc + curr.topics.length, 0)} Konu Planlandı
                      </span>
                    </div>

                    <div className="flex flex-col gap-4">
                      {suggestedLessons.map((lesson, lIdx) => (
                        <div 
                          key={lIdx} 
                          className="bg-white border border-gray-200/90 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 group/lesson relative flex flex-col gap-3"
                        >
                          {/* Lesson Header Row */}
                          <div className="flex items-center justify-between gap-4 border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-3 flex-grow">
                              <div className="flex flex-col items-center justify-center shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black shadow-sm">
                                <span className="text-[8px] uppercase tracking-wider opacity-75 font-extrabold leading-none">Ders</span>
                                <span className="text-sm leading-none mt-1">{lIdx + 1}</span>
                              </div>
                              <input
                                type="text"
                                value={lesson.title}
                                onChange={(e) => handleEditLessonTitle(lIdx, e.target.value)}
                                className="bg-transparent font-black text-gray-855 text-xs w-full focus:outline-none placeholder-gray-305"
                                placeholder={`Ders ${lIdx + 1} Konsept Başlığı`}
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleDeleteLesson(lIdx)}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover/lesson:opacity-100"
                              title="Tüm Dersi Sil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          {/* Lesson Sub-Topics Nested List */}
                          <div className="flex flex-col gap-2 pl-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">BU DERSTE ANLATILACAK KONULAR:</span>
                            
                            {lesson.topics.map((topic, tIdx) => (
                              <div 
                                key={tIdx} 
                                className="flex items-center gap-2 bg-slate-50 border border-slate-150 rounded-xl px-3 py-2 group/topic hover:border-indigo-150 hover:bg-white transition-all"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0"></span>
                                <input
                                  type="text"
                                  value={topic}
                                  onChange={(e) => handleEditTopicTitle(lIdx, tIdx, e.target.value)}
                                  className="flex-grow bg-transparent font-bold text-gray-700 text-xs focus:outline-none placeholder-gray-300"
                                  placeholder="Konu başlığı girin..."
                                />
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTopic(lIdx, tIdx)}
                                  className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors opacity-0 group-hover/topic:opacity-100"
                                  title="Konuyu Sil"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}

                            {/* Add Topic Row */}
                            <button
                              type="button"
                              onClick={() => handleAddTopic(lIdx)}
                              className="self-start text-[10px] font-black text-indigo-650 hover:text-indigo-755 hover:underline flex items-center gap-1 mt-1 pl-1"
                            >
                              + Yeni Konu Ekle
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add New Lesson Button Card */}
                      <button
                        type="button"
                        onClick={handleAddLesson}
                        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-250 hover:border-indigo-400 rounded-2xl text-xs font-black text-gray-550 hover:text-indigo-650 bg-white/50 hover:bg-white transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ Müfredata Yeni Ders Ekle</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
                  <button
                    onClick={() => setAiStep("form")}
                    className="px-4 py-2 border-2 border-gray-250 text-gray-550 font-black rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-xs uppercase"
                  >
                    Geri Dön
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleCloseAIModal}
                      className="px-4 py-2 border border-transparent text-gray-400 font-bold hover:text-gray-655 transition-colors text-xs uppercase"
                    >
                      Kapat
                    </button>
                    <button
                      onClick={handleSuggestRoadmap}
                      className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-xl shadow-[0_4px_0_rgba(124,58,237,0.3)] hover:shadow-[0_2px_0_rgba(124,58,237,0.3)] hover:translate-y-[2px] transition-all text-xs uppercase flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Ders Planını Oluştur</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* FLOATING AI DRAFT STATUS BANNER & EDIT BAR */}
      {hasDraftAIContent && !isGeneratingAI && (() => {
        const activeSection = activeNodeId ? sections.find(s => s.id === activeNodeId) : null;
        const isEditingDraft = activeSection && activeSection.isAIDraft;

        if (isEditingDraft) {
          const index = sections.indexOf(activeSection);
          const activeMetadata = getNodeMetadata(index, activeSection.theme);

          return (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[95%] max-w-3xl bg-slate-900/95 border-2 border-purple-500 rounded-3xl p-5 shadow-2xl flex flex-col gap-3.5 animate-in slide-in-from-bottom-5 duration-250 backdrop-blur-md text-left">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase border shrink-0"
                    style={{ 
                      backgroundColor: `${activeMetadata.baseColor}33`, 
                      borderColor: activeMetadata.strokeColor, 
                      color: activeMetadata.strokeColor 
                    }}
                  >
                    {activeSection.theme === "purple" && "Anla"}
                    {activeSection.theme === "cyan" && "Uygula"}
                    {activeSection.theme === "green" && "Birleştir"}
                    {activeSection.theme === "yellow" && "Üret"}
                    {activeSection.theme === "quiz" && "Quiz"}
                    {activeSection.theme === "homework" && "Ödev"}
                  </span>
                  <span className="text-xs font-black text-white uppercase tracking-wider">
                    Ders İçeriği Düzenle: <span className="text-purple-400">{activeSection.title}</span>
                  </span>
                </div>
                <button 
                  onClick={() => setActiveNodeId(null)}
                  className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors"
                  title="Düzenlemeyi Kapat"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Editor Input Area */}
              <div className="flex items-center gap-3">
                <textarea
                  rows={2}
                  value={activeSection.aiModuleTopic || ""}
                  onChange={(e) => handleUpdateModuleTopicField(activeSection.id, e.target.value)}
                  placeholder="Yapay zekanın bu seviyede anlatacağı detayları yazın (örn: Değişken nedir, int, float, string türleri)..."
                  className="flex-1 bg-slate-800 text-slate-100 font-medium text-xs px-3.5 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500 focus:bg-slate-800 transition-all resize-none leading-relaxed"
                />
                <button
                  type="button"
                  onClick={() => handleSuggestLevelDetails(activeSection.id, activeSection.theme)}
                  disabled={isSuggestingLevelId === activeSection.id}
                  className="px-4 py-3.5 bg-slate-800 hover:bg-slate-750 text-purple-400 hover:text-purple-300 border border-slate-700 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all text-center shrink-0 flex items-center justify-center gap-1.5 animate-in zoom-in-95 duration-100"
                  title="Yapay zeka ile bu seviyenin başlığını ve açıklamasını otomatik doldur"
                >
                  {isSuggestingLevelId === activeSection.id ? (
                    <div className="w-3.5 h-3.5 rounded-full border border-purple-500/20 border-t-purple-500 animate-spin"></div>
                  ) : (
                    <Sparkles size={13} />
                  )}
                  <span>AI Öner</span>
                </button>
                <button
                  onClick={() => setActiveNodeId(null)}
                  className="px-5 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-650 hover:to-indigo-650 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg active:scale-95 transition-all text-center shrink-0 flex items-center justify-center"
                >
                  Kaydet
                </button>
              </div>
            </div>
          );
        }

        // Default Status Banner
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900/95 border-2 border-purple-500 rounded-3xl p-5 shadow-2xl flex flex-col sm:flex-row items-center gap-4 max-w-2xl animate-in slide-in-from-bottom-10 duration-300 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-650 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-purple-400 uppercase tracking-widest">AI Ders Taslağı Hazır!</span>
                <span className="text-xs text-slate-200 font-bold leading-normal">
                  Ders çizgilerini (başlıkları) ve seviyeleri yukarıdaki haritada dilediğiniz gibi düzenleyin. Hazır olduğunuzda slaytları üretin.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleCancelDraft}
                className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-white font-black rounded-xl hover:bg-slate-800 active:scale-95 transition-all text-xs uppercase"
              >
                İptal Et
              </button>
              <button
                onClick={handleStartGeneratingSlidesFromDraft}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-xl shadow-lg hover:translate-y-[2px] transition-all text-xs uppercase flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5" fill="currentColor" />
                <span>Slaytları Üret</span>
              </button>
            </div>
          </div>
        );
      })()}

      {/* FLOATING AI PLANNING STATUS PANEL */}
      {isPlanningStructure && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border-2 border-purple-500 rounded-3xl p-5 shadow-2xl flex items-center gap-4 max-w-sm animate-in slide-in-from-bottom-6 duration-300 text-left">
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-10 h-10 rounded-full border-2 border-purple-500/20 border-t-purple-500 animate-spin"></div>
            <Sparkles className="w-4 h-4 text-purple-400 absolute animate-pulse" />
          </div>
          <div className="flex flex-col gap-1 text-left min-w-[200px]">
            <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Ders Akışı Tasarlanıyor</span>
            <span className="text-[10px] text-slate-350 font-bold leading-normal">Yapay zeka ders konularını ve modülleri planlıyor...</span>
          </div>
        </div>
      )}

      {/* FLOATING AI GENERATOR STATUS PANEL */}
      {isGeneratingAI && (
        <div className="fixed bottom-6 right-6 z-[100] bg-slate-900 border-2 border-indigo-500 rounded-3xl p-5 shadow-2xl flex items-center gap-4 max-w-sm animate-in slide-in-from-bottom-6 duration-300">
          <div className="relative flex items-center justify-center shrink-0">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
            <Sparkles className="w-5 h-5 text-indigo-400 absolute animate-pulse" />
          </div>
          <div className="flex flex-col gap-1 text-left min-w-[200px]">
            <span className="text-xs font-black text-indigo-400 uppercase tracking-widest">GoMufi AI Oluşturuyor</span>
            <span className="text-[10px] text-slate-300 font-bold leading-normal truncate">{aiProgressStatus}</span>
            {/* Mini progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div 
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${aiProgressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorRoadmapBuilder;
