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
  const [aiAudience, setAiAudience] = useState("Hiç kodlama deneyimi olmayan öğrenciler.");
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);


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

  const handleGenerateAI = async () => {
    if (!aiTopic.trim()) {
      alert("Lütfen bir ders konusu girin.");
      return;
    }
    
    setIsGeneratingAI(true);
    try {
      const response = await api.post("/courses/generate_roadmap", {
        topic: aiTopic,
        difficulty: aiDifficulty,
        lessons_count: aiLessonsCount,
        audience: aiAudience
      });
      
      if (response.data?.success && response.data?.curriculum) {
        const finalSections = recalculateSectionsList(response.data.curriculum);
        setSections(finalSections);
        setNotes(response.data.notes || []);
        setIsAIModalOpen(false);
        alert("AI başarıyla yol haritasını ve ders anlatım slaytlarını hazırladı! Kaydetmek için 'Haritayı Kaydet' butonuna basabilirsiniz.");
      } else {
        alert("Yol haritası üretilemedi.");
      }
    } catch (error: any) {
      console.error("AI Generation error:", error);
      alert(error.response?.data?.detail || "AI yol haritası üretirken hata oluştu.");
    } finally {
      setIsGeneratingAI(false);
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

      if (idx === 0 && !s.lessonTopic) {
        updatedTopic = course?.title || "Giriş Konusu";
        updatedNum = lessonNum++;
      } else if (s.lessonTopic) {
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
                {section.lessonTopic && (
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
                        <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-1 shrink-0">DERS {section.lessonNumber || 1}</span>
                        <textarea
                          rows={2}
                          value={section.lessonTopic}
                          onClick={(e) => e.stopPropagation()}
                          onDragStart={(e) => e.stopPropagation()}
                          draggable={false}
                          onChange={(e) => handleUpdateLessonTopic(section.id, e.target.value)}
                          className="text-sm font-black font-display tracking-tight text-gray-800 text-center bg-transparent focus:outline-none w-full resize-none leading-tight py-0.5 border-b border-transparent hover:border-gray-200 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Connector line from Divider to Level Node (only when lessonTopic is set) */}
                {section.lessonTopic && (
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
                  draggable
                  onDragStart={(e) => handleDragStart(e, "level", index)}
                  onDragOver={(e) => {
                    if (draggedItem?.type === "level") {
                      handleDragOver(e, "level", index);
                    }
                  }}
                  onDrop={(e) => {
                    if (draggedItem?.type === "level") {
                      handleDrop(e, "level", index);
                    }
                  }}
                  onDragEnd={handleDragEnd}
                  className={`relative z-10 group cursor-pointer transform hover:scale-105 transition-all duration-200 ${
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
                    e.stopPropagation();
                    setActiveNodeId(activeNodeId === section.id ? null : section.id);
                    setActivePlusMenuId(null);
                  }}
                >
                  {/* Delete Button on Hover */}
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
                          <label className="text-white/85 text-[10px] font-black tracking-widest uppercase mb-1">DERS BAŞLIĞI</label>
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
                    {metadata.isAsset ? (
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
                    </div>
                  </div>

                  {/* Edit Content Action below level */}
                  <div className="absolute top-[110%] left-1/2 -translate-x-1/2 w-48 text-center z-30 flex flex-col items-center">
                    {/* Play/Edit Content Button slides down under the node when clicked - mt-12 pushes it below LEVEL label */}
                    {activeNodeId === section.id && (
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setIsSaving(true);
                          await handleSaveCurriculumOnly();
                          setIsSaving(false);
                          navigate(`/instructor/builder?courseId=${courseId}&noteId=${section.id}&category=${getCategoryFromTheme(section.theme, index)}`);
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 mt-12 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg border-b-[3px] border-black/10 active:border-b-0 active:translate-y-[3px] transition-all animate-in slide-in-from-top-2 duration-200"
                      >
                        <Play size={12} fill="currentColor" />
                        <span>İçeriği Düzenle</span>
                      </button>
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
                        sections[index + 1]?.lessonTopic
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
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 border-b border-indigo-700 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-6 h-6 animate-pulse text-purple-200" />
                <h3 className="text-lg font-black tracking-wide font-display">AI ile Yol Haritası Oluştur</h3>
              </div>
              <button
                onClick={() => setIsAIModalOpen(false)}
                className="p-1.5 hover:bg-white/10 rounded-full text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl font-medium text-gray-850 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all text-sm"
                  >
                    <option value="Beginner">Başlangıç</option>
                    <option value="Intermediate">Orta</option>
                    <option value="Advanced">İleri</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex justify-between">
                    <span>Tahmini Ders Sayısı</span>
                    <span className="text-indigo-600 font-black">{aiLessonsCount}</span>
                  </label>
                  <div className="flex items-center gap-3 h-[48px]">
                    <input
                      type="range"
                      min="2"
                      max="20"
                      value={aiLessonsCount}
                      onChange={(e) => setAiLessonsCount(parseInt(e.target.value))}
                      className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-550"
                    />
                  </div>
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
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsAIModalOpen(false)}
                className="px-4 py-2 border-2 border-gray-250 text-gray-505 font-black rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-xs uppercase"
              >
                Vazgeç
              </button>
              <button
                onClick={handleGenerateAI}
                disabled={isGeneratingAI}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-black rounded-xl shadow-[0_4px_0_rgba(124,58,237,0.3)] hover:shadow-[0_2px_0_rgba(124,58,237,0.3)] hover:translate-y-[2px] transition-all text-xs uppercase flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI Üretiyor...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Yol Haritası Oluştur</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstructorRoadmapBuilder;
