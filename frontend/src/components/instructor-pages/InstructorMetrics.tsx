import React, { useState, useEffect } from "react";
import {
  BarChart3,
  Coins,
  Cpu,
  RefreshCw,
  Zap,
  Activity,
  Layers,
  Search,
  Calculator,
  FileText,
  Info,
  CheckCircle2,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Boxes,
  GraduationCap,
  Sigma
} from "lucide-react";
import api from "../../api";

interface AIUsageItem {
  id: number;
  teacher_id: number | null;
  course_id?: number | null;
  course_title?: string | null;
  action: string;
  model_name: string;
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
  cost_usd: number;
  details?: string | null;
  created_at: string | null;
}

interface CourseSummaryItem {
  course_title: string;
  course_id?: number | null;
  total_calls: number;
  prompt_tokens: number;
  candidates_tokens: number;
  total_tokens: number;
  cost_usd: number;
  cost_tl: number;
  steps: AIUsageItem[];
}

interface ActionStat {
  count: number;
  tokens: number;
  cost_usd: number;
}

interface ModelStat {
  count: number;
  tokens: number;
  cost_usd: number;
}

interface Money {
  usd: number;
  tl: number;
}

interface ModuleTypeEstimate {
  type: string;
  label: string;
  weight: number;
  est_cost_usd: number;
  est_cost_tl: number;
}

interface UnitEconomics {
  lessons_generated: number;
  courses_measured: number;
  projection_lessons: number;
  avg_modules_per_lesson: number;
  avg_cost_per_lesson: Money;
  avg_cost_per_module: Money;
  avg_cost_per_course: Money;
  projected_course: Money;
  estimated_cost_by_module_type: ModuleTypeEstimate[];
}

interface OperationRow {
  operation: string;
  model: string;
  unit: string;
  unit_cost_usd: number;
  unit_cost_tl: number;
  usage_per_lesson: number;
  cost_per_lesson_usd: number;
  cost_per_lesson_tl: number;
  usage_per_month: number;
  cost_per_month_usd: number;
  cost_per_month_tl: number;
  samples: number;
  source: string;
  last_date: string | null;
}

interface OperationBreakdown {
  lessons_per_teacher_month: number;
  lessons_generated: number;
  rows: OperationRow[];
}

interface Money {
  usd: number;
  tl: number;
}

interface SourceActionRow {
  action: string;
  label: string;
  calls: number;
  source_chars: number;
  source_tokens: number;
  avg_chars_per_call: number;
  cost_usd: number;
  cost_tl: number;
}

/** Yüklenen kaynak PDF'in maliyetteki PAYI — toplama ek değil, içinden ayrıştırma. */
interface SourceMaterial {
  calls_with_source: number;
  calls_total: number;
  total_source_chars: number;
  total_source_tokens: number;
  avg_source_chars_per_call: number;
  share_of_total_pct: number;
  total_source_cost: Money;
  source_cost_per_lesson: Money;
  by_action: SourceActionRow[];
}

interface MetricsData {
  total_requests: number;
  total_prompt_tokens: number;
  total_candidates_tokens: number;
  total_thoughts_tokens?: number;
  total_tokens: number;
  total_cost_usd: number;
  total_cost_tl: number;
  usd_to_tl_rate: number;
  by_action: Record<string, ActionStat>;
  by_model: Record<string, ModelStat>;
  by_course: CourseSummaryItem[];
  unit_economics?: UnitEconomics;
  operation_breakdown?: OperationBreakdown;
  source_material?: SourceMaterial;
  recent_logs: AIUsageItem[];
}

const InstructorMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedCourseTitle, setExpandedCourseTitle] = useState<string | null>(null);

  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get("/ai/metrics");
      if (res.data && res.data.metrics) {
        setMetrics(res.data.metrics);
      } else {
        setError("Metrik verisi alınamadı.");
      }
    } catch (err: any) {
      console.error("Failed to fetch AI metrics:", err);
      setError(err?.response?.data?.detail || "AI Metrikleri yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearMetrics = async () => {
    if (!window.confirm("Tüm AI kullanım ve metrik verilerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.")) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await api.delete("/ai/metrics");
      if (res.data && res.data.success) {
        await fetchMetrics();
      }
    } catch (err: any) {
      console.error("Failed to clear metrics:", err);
      alert(err?.response?.data?.detail || "Veriler silinirken bir hata oluştu.");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const formatActionName = (actionKey: string) => {
    const map: Record<string, string> = {
      generate_roadmap_structure: "Ders Müfredat Yapısı Oluşturma",
      generate_roadmap_content: "Tüm Ders Slaytları & İçerik Üretimi",
      generate_lesson_slides: "Tekil Ders Slaytı & İçerik Üretimi",
      suggest_raw_topics: "Ham Konu Ayrıştırma (PDF/Metin)",
      distribute_topics: "Konuları Derslere Dağıtma",
      expand_topics: "Konu Detaylandırma",
      suggest_lesson_modules: "Ders Modül Yapısı Tasarımı",
      suggest_lesson_title: "Ders Başlığı Önerisi",
      suggest_level_details: "Level/Modül Detay Tasarımı",
      generate_quiz: "Quiz Sorusu Üretimi",
      evaluate_homework: "Ödev Değerlendirme",
    };
    return map[actionKey] || actionKey;
  };

  const getActionBadgeColor = (actionKey: string) => {
    if (actionKey.includes("roadmap") || actionKey.includes("slides")) return "bg-purple-100 text-purple-700 border-purple-200";
    if (actionKey.includes("topics")) return "bg-sky-100 text-sky-700 border-sky-200";
    if (actionKey.includes("quiz")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const filteredLogs = metrics?.recent_logs.filter((log) => {
    const matchesAction = filterAction === "ALL" || log.action === filterAction;
    const matchesSearch =
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formatActionName(log.action).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesAction && matchesSearch;
  }) || [];

  // Calculate per-action average step costs
  const calculateStepAverages = () => {
    if (!metrics?.recent_logs || metrics.recent_logs.length === 0) return [];

    const grouped: Record<string, { count: number; promptSum: number; candSum: number; costSum: number }> = {};

    metrics.recent_logs.forEach((log) => {
      if (!grouped[log.action]) {
        grouped[log.action] = { count: 0, promptSum: 0, candSum: 0, costSum: 0 };
      }
      grouped[log.action].count += 1;
      grouped[log.action].promptSum += log.prompt_tokens || 0;
      grouped[log.action].candSum += log.candidates_tokens || 0;
      grouped[log.action].costSum += log.cost_usd || 0;
    });

    return Object.entries(grouped).map(([actionKey, stat]) => ({
      action: actionKey,
      count: stat.count,
      avgPrompt: Math.round(stat.promptSum / stat.count),
      avgCandidates: Math.round(stat.candSum / stat.count),
      avgTotal: Math.round((stat.promptSum + stat.candSum) / stat.count),
      avgCostUsd: stat.costSum / stat.count,
      avgCostTl: (stat.costSum / stat.count) * (metrics.usd_to_tl_rate || 38),
    }));
  };

  const stepAverages = calculateStepAverages();

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-indigo-950 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border-2 border-slate-800">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-black uppercase tracking-wider mb-3 border border-sky-500/30">
              <Zap size={14} className="animate-pulse text-amber-400" /> Detaylı Adım Başı & Kurs Bazlı Yapay Zeka Analitiği
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white font-display">
              AI Kullanım & Kurs Bazlı Maliyet Analitiği
            </h1>
            <p className="text-slate-300 text-sm font-semibold mt-1 max-w-2xl">
              Oluşturulan her bir kursun baştan sona toplam AI maliyeti, adım başı token harcaması ve canlı cent hesabı burada raporlanmaktadır.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <button
              onClick={fetchMetrics}
              disabled={isLoading || isDeleting}
              className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-black px-5 py-3 rounded-2xl border-b-4 border-sky-700 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
              Verileri Yenile
            </button>

            <button
              onClick={handleClearMetrics}
              disabled={isLoading || isDeleting}
              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-black px-5 py-3 rounded-2xl border-b-4 border-rose-800 active:border-b-0 active:translate-y-1 transition-all cursor-pointer shadow-lg disabled:opacity-50"
            >
              <Trash2 size={18} className={isDeleting ? "animate-spin" : ""} />
              Verileri Sıfırla
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-2 border-red-200 text-red-700 font-bold rounded-2xl text-sm flex items-center gap-3">
          <Activity className="text-red-500 shrink-0" size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Cost USD */}
        <div className="bg-white p-6 rounded-3xl border-2 border-emerald-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Toplam Harcama ($)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black">
              <Coins size={22} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-display">
            ${metrics?.total_cost_usd?.toFixed(4) || "0.0000"}
          </div>
          <div className="mt-2 text-xs font-bold text-slate-500 flex flex-col gap-0.5">
            <span className="text-emerald-600 font-black">
              ≈ ₺{metrics?.total_cost_tl?.toFixed(2) || "0.00"} TL <span className="text-slate-400 font-normal">(KDV Dahil ≈ ₺{((metrics?.total_cost_tl || 0) * 1.20).toFixed(2)} TL)</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">(Kur: 1$ = ₺{metrics?.usd_to_tl_rate || 38})</span>
          </div>
        </div>

        {/* Total API Requests */}
        <div className="bg-white p-6 rounded-3xl border-2 border-sky-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-sky-600 bg-sky-50 px-3 py-1 rounded-full border border-sky-200">
              Toplam AI İsteği
            </span>
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center font-black">
              <Activity size={22} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-display">
            {metrics?.total_requests?.toLocaleString() || 0}
          </div>
          <div className="mt-2 text-xs font-bold text-slate-500">
            Gerçekleştirilen Toplam Gemini Çağrısı
          </div>
        </div>

        {/* Total Tokens */}
        <div className="bg-white p-6 rounded-3xl border-2 border-purple-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-purple-600 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
              Toplam Token Hacmi
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center font-black">
              <Cpu size={22} />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-display">
            {metrics?.total_tokens?.toLocaleString() || 0}
          </div>
          <div className="mt-2 text-xs font-bold text-slate-500">
            İşlenen Tüm Girdi ve Çıktı Token'ları
          </div>
        </div>

        {/* Prompt vs Candidate Breakdown */}
        <div className="bg-white p-6 rounded-3xl border-2 border-amber-100 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Girdi / Çıktı Oranı
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-black">
              <BarChart3 size={22} />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span>Prompt (Input):</span>
            <span className="font-black text-slate-900 font-mono">
              {metrics?.total_prompt_tokens?.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 mt-1">
            <span>Output (Completion):</span>
            <span className="font-black text-slate-900 font-mono">
              {metrics?.total_candidates_tokens?.toLocaleString() || 0}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs font-bold text-rose-500 mt-1" title="Gemini'nin görünmez düşünme token'ları — çıktı tarifesinden faturalanır">
            <span>Thinking (Gizli):</span>
            <span className="font-black font-mono">
              {metrics?.total_thoughts_tokens?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>

      {/* UNIT ECONOMICS — Ortalama birim maliyetler */}
      {metrics?.unit_economics && (
        <div className="bg-white p-6 rounded-3xl border-2 border-teal-100 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
                <Sigma className="text-teal-600" size={22} /> Birim Ekonomisi — Ortalama Maliyetler
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                Bir ders, bir modül ve tam bir kursun ortalama kaç para yaktığının canlı hesabı
              </p>
            </div>
          </div>

          {/* Ölçülen ortalamalar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Ort. ders */}
            <div className="bg-teal-50/60 p-5 rounded-2xl border-2 border-b-4 border-teal-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-600 flex items-center justify-center"><BookOpen size={18} /></div>
                <span className="text-[11px] font-black uppercase tracking-wider text-teal-700">Ort. Bir Ders</span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">₺{metrics.unit_economics.avg_cost_per_lesson.tl.toFixed(3)}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">
                ${metrics.unit_economics.avg_cost_per_lesson.usd.toFixed(5)} • {metrics.unit_economics.lessons_generated} ders üzerinden
              </div>
            </div>

            {/* Ort. modül */}
            <div className="bg-purple-50/60 p-5 rounded-2xl border-2 border-b-4 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center"><Boxes size={18} /></div>
                <span className="text-[11px] font-black uppercase tracking-wider text-purple-700">Ort. Bir Modül</span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">₺{metrics.unit_economics.avg_cost_per_module.tl.toFixed(4)}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">
                ${metrics.unit_economics.avg_cost_per_module.usd.toFixed(5)} • ort. {metrics.unit_economics.avg_modules_per_lesson} modül/ders
              </div>
            </div>

            {/* Ort. kurs */}
            <div className="bg-indigo-50/60 p-5 rounded-2xl border-2 border-b-4 border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center"><GraduationCap size={18} /></div>
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">Ort. Bir Kurs</span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">₺{metrics.unit_economics.avg_cost_per_course.tl.toFixed(3)}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">
                ${metrics.unit_economics.avg_cost_per_course.usd.toFixed(5)} • {metrics.unit_economics.courses_measured} gerçek kurs
              </div>
            </div>

            {/* Projeksiyon */}
            <div className="bg-amber-50/60 p-5 rounded-2xl border-2 border-b-4 border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center"><Calculator size={18} /></div>
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">{metrics.unit_economics.projection_lessons} Derslik Kurs</span>
              </div>
              <div className="text-2xl font-black text-slate-900 font-mono">₺{metrics.unit_economics.projected_course.tl.toFixed(3)}</div>
              <div className="text-[11px] font-bold text-slate-500 mt-1">
                ${metrics.unit_economics.projected_course.usd.toFixed(5)} • tahmini (ort. ders × {metrics.unit_economics.projection_lessons})
              </div>
            </div>
          </div>

          {/* Modül tipine göre tahmini maliyet */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Modül Tipine Göre Tahmini Maliyet</span>
              <span className="group relative">
                <Info size={14} className="text-slate-400 cursor-help" />
                <span className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 bg-slate-800 text-white text-[11px] font-semibold p-2.5 rounded-xl shadow-lg z-20 leading-relaxed">
                  Bir ders tek AI çağrısında tüm modülleri birlikte üretir; tek bir tip ayrı ölçülemez. Bu değerler, ölçülen ders maliyetinin her tipin ürettiği ortalama slayt sayısına (ağırlık) göre dağıtılmış TAHMİNİdir.
                </span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {metrics.unit_economics.estimated_cost_by_module_type.map((m) => (
                <div key={m.type} className="bg-slate-50 border-2 border-b-[3px] border-slate-200 rounded-2xl p-3.5 text-center">
                  <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider">{m.label}</div>
                  <div className="text-base font-black text-emerald-600 font-mono mt-1">₺{m.est_cost_tl.toFixed(4)}</div>
                  <div className="text-[9px] font-bold text-slate-400 mt-0.5">${m.est_cost_usd.toFixed(6)}</div>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-semibold text-slate-400 mt-2 italic">
              * Tahmini dağılım — slayt ağırlığına dayalıdır, ölçülmüş kesin değer değildir.
            </p>
          </div>
        </div>
      )}

      {/* OPERATION-CATEGORY COST TABLE */}
      {metrics?.operation_breakdown && (
        <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
                <Layers className="text-slate-600" size={22} /> İşlem Bazında Birim Maliyet Tablosu
              </h2>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                Her AI işlem türünün birim, ders başı ve öğretmen aylık maliyet dökümü
              </p>
            </div>
            <span className="text-xs font-black px-3.5 py-1 bg-slate-50 text-slate-600 border border-slate-200 rounded-full self-start md:self-auto">
              Varsayım: {metrics.operation_breakdown.lessons_per_teacher_month} ders/ay · öğretmen
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b-2 border-slate-200 text-xs font-black uppercase text-slate-500 tracking-wider">
                  <th className="py-3.5 px-4">İşlem / Özellik</th>
                  <th className="py-3.5 px-4">Model / Servis</th>
                  <th className="py-3.5 px-4 text-center">Birim</th>
                  <th className="py-3.5 px-4 text-right">Birim Maliyet (₺)</th>
                  <th className="py-3.5 px-4 text-right">1 Ders Kullanım</th>
                  <th className="py-3.5 px-4 text-right">1 Ders Maliyeti</th>
                  <th className="py-3.5 px-4 text-right">Öğretmen/Ay Kullanım</th>
                  <th className="py-3.5 px-4 text-right">Öğretmen Aylık Maliyet</th>
                  <th className="py-3.5 px-4">Ölçüm Kaynağı / Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                {metrics.operation_breakdown.rows.map((row) => {
                  const isFree = row.operation === "Görsel üretimi";
                  return (
                    <tr key={row.operation} className={`hover:bg-slate-50/80 transition-colors ${isFree ? "opacity-70" : ""}`}>
                      <td className="py-4 px-4 font-black text-slate-900 text-sm">{row.operation}</td>
                      <td className="py-4 px-4">
                        <span className="inline-block px-3 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-black">
                          {row.model}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-slate-600 font-bold text-sm">{row.unit}</td>
                      <td className="py-4 px-4 text-right font-black text-slate-900 font-mono text-sm">
                        {isFree ? "—" : `₺${row.unit_cost_tl.toFixed(4)}`}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-600 font-mono text-sm font-bold">
                        {isFree ? "—" : `${row.usage_per_lesson}×`}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-emerald-600 font-mono text-sm">
                        {isFree ? "Ücretsiz" : `₺${row.cost_per_lesson_tl.toFixed(4)}`}
                      </td>
                      <td className="py-4 px-4 text-right text-slate-600 font-mono text-sm font-bold">
                        {isFree ? "—" : `${row.usage_per_month}×`}
                      </td>
                      <td className="py-4 px-4 text-right font-black text-emerald-700 font-mono text-sm">
                        {isFree ? "₺0,00" : `₺${row.cost_per_month_tl.toFixed(2)}`}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-600 max-w-[260px]">
                        <span className="block truncate font-semibold text-slate-800" title={row.source}>{row.source}</span>
                        {row.last_date && (
                          <span className="text-slate-500 font-medium">{new Date(row.last_date).toLocaleDateString("tr-TR")}</span>
                        )}
                        {row.samples > 0 && <span className="text-slate-500 font-medium"> · {row.samples} örnek</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50 text-sm font-black text-slate-900">
                  <td className="py-4 px-4" colSpan={5}>TOPLAM — 1 ders başına</td>
                  <td className="py-4 px-4 text-right text-emerald-600 font-mono text-base font-black" colSpan={4}>
                    ₺{metrics.operation_breakdown.rows.reduce((s, r) => s + r.cost_per_lesson_tl, 0).toFixed(4)}
                  </td>
                </tr>
                <tr className="bg-indigo-50/60 text-sm font-black text-slate-900">
                  <td className="py-3.5 px-4" colSpan={5}>
                    ≈ 8 Derslik 1 Kurs <span className="font-bold text-slate-500 normal-case">(bir kursun tipik ders sayısı)</span>
                  </td>
                  <td className="py-3.5 px-4 text-right text-indigo-700 font-mono text-base font-black" colSpan={4}>
                    ₺{(metrics.operation_breakdown.rows.reduce((s, r) => s + r.cost_per_lesson_tl, 0) * 8).toFixed(2)}
                  </td>
                </tr>
                <tr className="bg-slate-50 text-sm font-black text-slate-900">
                  <td className="py-4 px-4" colSpan={5}>
                    Öğretmen Aylık Toplam <span className="font-bold text-slate-500 normal-case">({metrics.operation_breakdown.lessons_per_teacher_month} ders/ay varsayımı — bir kurs değil, bir AYIN tüm üretimi)</span>
                  </td>
                  <td className="py-4 px-4 text-right text-emerald-700 font-mono text-base font-black" colSpan={4}>
                    ₺{metrics.operation_breakdown.rows.reduce((s, r) => s + r.cost_per_month_tl, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-3.5 italic leading-relaxed">
            * "Ders başı" değerleri, kategorinin toplam maliyetinin üretilen ders sayısına bölünmesiyle (amortisman) bulunur — müfredat gibi kurs-başı işlemler ders başına düşen paylarıyla görünür.
            "8 derslik kurs" = ders başı toplam × 8 (tipik kurs varsayımı). "Öğretmen aylık" ise {metrics.operation_breakdown.lessons_per_teacher_month} ders/ay varsayımına dayalı AYRI bir projeksiyondur — bir kursun değil, bir öğretmenin bir ayda ürettiği TÜM derslerin toplam maliyetidir, bu yüzden kurs maliyetinden yüksek görünür. Görseller Wikipedia ve Openverse'ten ücretsiz çekilir (AI maliyeti yok).
          </p>
        </div>
      )}

      {/* KAYNAK PDF MALİYETİ — toplama ek değil, toplamın içinden ayrıştırma */}
      {metrics?.source_material && (
        <div className="bg-white p-6 rounded-3xl border-2 border-teal-100 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
              <FileText className="text-teal-600" size={22} /> Yüklenen Kaynak (PDF) Maliyeti
            </h2>
            <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
              Öğretmenin yüklediği kaynak, prompt'un içine gömülü gider. Bu bölüm o maliyeti
              toplamın <span className="font-black text-teal-700">içinden ayrıştırır</span> — üstüne
              eklemez. Yani buradaki tutar zaten yukarıdaki toplam maliyetin bir parçasıdır.
            </p>
          </div>

          {metrics.source_material.calls_with_source === 0 ? (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center">
              <p className="text-sm font-bold text-slate-500">
                Henüz kaynak PDF ile yapılmış bir üretim yok.
              </p>
              <p className="text-xs font-semibold text-slate-400 mt-1">
                Kaynak ölçümü bu özellik eklendikten sonraki üretimlerde birikir; daha eski
                kayıtlar "kaynaksız" görünür.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-teal-50 border-2 border-teal-100 rounded-2xl p-4">
                  <div className="text-[11px] font-black uppercase tracking-wider text-teal-700 mb-1.5">Toplam Kaynak Maliyeti</div>
                  <div className="text-2xl font-black text-slate-900 font-mono">₺{metrics.source_material.total_source_cost.tl.toFixed(3)}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">
                    ${metrics.source_material.total_source_cost.usd.toFixed(5)} • {metrics.source_material.calls_with_source}/{metrics.source_material.calls_total} çağrıda kaynak var
                  </div>
                </div>
                <div className="bg-teal-50 border-2 border-teal-100 rounded-2xl p-4">
                  <div className="text-[11px] font-black uppercase tracking-wider text-teal-700 mb-1.5">Toplam Maliyetteki Payı</div>
                  <div className="text-2xl font-black text-slate-900 font-mono">%{metrics.source_material.share_of_total_pct.toFixed(2)}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">tüm AI harcamasının içinde</div>
                </div>
                <div className="bg-teal-50 border-2 border-teal-100 rounded-2xl p-4">
                  <div className="text-[11px] font-black uppercase tracking-wider text-teal-700 mb-1.5">Ders Başına Kaynak</div>
                  <div className="text-2xl font-black text-slate-900 font-mono">₺{metrics.source_material.source_cost_per_lesson.tl.toFixed(4)}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">${metrics.source_material.source_cost_per_lesson.usd.toFixed(6)}</div>
                </div>
                <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-600 mb-1.5">Gönderilen Kaynak Metni</div>
                  <div className="text-2xl font-black text-slate-900 font-mono">{metrics.source_material.total_source_tokens.toLocaleString("tr-TR")}</div>
                  <div className="text-[11px] font-semibold text-slate-500 mt-1">
                    token • {metrics.source_material.total_source_chars.toLocaleString("tr-TR")} karakter
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-100">
                      <th className="text-left py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-500">İşlem</th>
                      <th className="text-right py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Çağrı</th>
                      <th className="text-right py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Ort. Karakter</th>
                      <th className="text-right py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Kaynak Token</th>
                      <th className="text-right py-3 px-4 text-[11px] font-black uppercase tracking-wider text-slate-500">Maliyet</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.source_material.by_action.map((row) => (
                      <tr key={row.action} className="border-b border-slate-50 hover:bg-teal-50/40 transition-colors">
                        <td className="py-3 px-4 font-black text-slate-800">{row.label}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-600 tabular-nums">{row.calls}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-600 tabular-nums">{row.avg_chars_per_call.toLocaleString("tr-TR")}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-600 tabular-nums">{row.source_tokens.toLocaleString("tr-TR")}</td>
                        <td className="py-3 px-4 text-right font-mono font-black text-teal-700 tabular-nums">₺{row.cost_tl.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-xs font-semibold text-slate-500 mt-3.5 italic leading-relaxed">
                * Kaynak token sayısı, kaydın ÖLÇÜLEN prompt token'ının karakter oranıyla
                paylaştırılmasıdır — sabit bir karakter/token katsayısı kullanılmadığı için dile
                göre kendini düzeltir, ama token yoğunluğu metin boyunca birebir düzgün
                dağılmadığından YAKLAŞIK bir değerdir. Kaynak yalnızca girdi tarafında
                faturalanır; çıktı ve thinking token'ı üretmez.
              </p>
            </>
          )}
        </div>
      )}

      {/* COURSE-BY-COURSE COST TELEMETRY REPORT */}
      <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
              <BookOpen className="text-indigo-600" size={22} /> Kurs Bazında Toplam Maliyet & Harcama Raporu
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Oluşturulan her bir kurs için baştan sona yapılan tüm AI harcamaları ve toplam maliyet dökümü
            </p>
          </div>
          <span className="text-xs font-black px-3.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full self-start md:self-auto">
            {metrics?.by_course?.length || 0} Kurs Kaydı
          </span>
        </div>

        <div className="space-y-4">
          {metrics?.by_course && metrics.by_course.length > 0 ? (
            metrics.by_course.map((course) => {
              const isExpanded = expandedCourseTitle === course.course_title;
              return (
                <div
                  key={course.course_title}
                  className="border-2 border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50 hover:border-indigo-200 transition-all"
                >
                  <div
                    onClick={() => setExpandedCourseTitle(isExpanded ? null : course.course_title)}
                    className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black shrink-0">
                        <BookOpen size={20} />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 font-display">
                          {course.course_title}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-500 mt-0.5">
                          {course.total_calls} AI Çağrısı • {course.total_tokens.toLocaleString()} Toplam Token
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 self-end md:self-auto">
                      <div className="text-right">
                        <div className="text-sm font-black text-emerald-600 font-mono">
                          ${course.cost_usd.toFixed(4)}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-700 font-mono">
                          ≈ ₺{course.cost_tl.toFixed(2)} TL
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded steps list */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/80 p-5 space-y-3">
                      <div className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
                        Bu Kurs İçin Yapılan Adım Adım AI İstekleri:
                      </div>
                      <div className="divide-y divide-slate-200/60 bg-white rounded-xl border border-slate-200 overflow-hidden">
                        {course.steps.map((step, sIdx) => (
                          <div key={step.id || sIdx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getActionBadgeColor(step.action)}`}>
                                  {step.action}
                                </span>
                                <span className="font-black text-slate-800">{formatActionName(step.action)}</span>
                              </div>
                              {step.details && (
                                <p className="text-[11px] text-slate-600 font-semibold">{step.details}</p>
                              )}
                            </div>

                            <div className="flex items-center gap-4 text-right font-mono shrink-0">
                              <div className="text-[11px] text-slate-500">
                                {step.total_tokens?.toLocaleString()} token
                              </div>
                              <div className="font-black text-emerald-600">
                                ${step.cost_usd?.toFixed(6)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-slate-400 font-bold text-xs">
              Henüz kurs bazında kaydedilmiş veri bulunmamaktadır. Yeni bir kurs veya ders oluşturduğunuzda burada kurs maliyeti listelenecektir.
            </div>
          )}
        </div>
      </div>

      {/* STEP-BY-STEP UNIT COST TABLE */}
      <div className="bg-white p-6 rounded-3xl border-2 border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
              <Calculator className="text-indigo-500" size={20} /> Adım Başına Birim Maliyet & Token Tablosu
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Kurs oluşturma sürecindeki her bir aşamanın ortalama harcadığı token ve maliyet karşılığı
            </p>
          </div>
          <span className="text-xs font-black px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full self-start md:self-auto">
            Ortalama Hesaplama
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3 px-4">İşlem / Adım Adı</th>
                <th className="py-3 px-4 text-center">Örnek Sayısı</th>
                <th className="py-3 px-4 text-right">Ort. Girdi Token</th>
                <th className="py-3 px-4 text-right">Ort. Çıktı Token</th>
                <th className="py-3 px-4 text-right">Ort. Toplam Token</th>
                <th className="py-3 px-4 text-right">Ort. Maliyet ($)</th>
                <th className="py-3 px-4 text-right">Ort. Maliyet (₺)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {stepAverages.length > 0 ? (
                stepAverages.map((item) => (
                  <tr key={item.action} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-black text-slate-900 flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] border font-black uppercase ${getActionBadgeColor(item.action)}`}>
                        {item.action}
                      </span>
                      <span>{formatActionName(item.action)}</span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                      {item.count} çağrı
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 font-mono">
                      {item.avgPrompt.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right text-slate-600 font-mono">
                      {item.avgCandidates.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-900 font-mono">
                      {item.avgTotal.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-600 font-mono">
                      ${item.avgCostUsd.toFixed(5)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-emerald-700 font-mono">
                      ₺{item.avgCostTl.toFixed(3)} TL
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-bold">
                    Henüz adım verisi birikmedi. Kurs veya ders oluşturulduğunda burada ortalama birim maliyetler hesaplanacaktır.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECENT DETAILED LOGS TABLE */}
      <div className="bg-white rounded-3xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
              <Activity className="text-emerald-500" size={20} /> Adım Adı ve Detaylı İstek Logları
            </h2>
            <p className="text-xs font-bold text-slate-500 mt-0.5">
              Hangi kurs ve ders için ne kadar token ve masraf yapıldığının adım adım canlı kaydı
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Konu, ders veya detay ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-2 bg-slate-50 border-2 border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-sky-400 transition-all w-full sm:w-56"
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-slate-50 border-2 border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 outline-none focus:border-sky-400 transition-all cursor-pointer"
            >
              <option value="ALL">Tüm Adımlar ({metrics?.recent_logs.length || 0})</option>
              <option value="generate_roadmap_structure">Müfredat Yapısı</option>
              <option value="generate_roadmap_content">Tüm Ders Slaytları</option>
              <option value="generate_lesson_slides">Tekil Ders Slaytı</option>
              <option value="suggest_raw_topics">Ham Konu Ayrıştırma</option>
              <option value="distribute_topics">Konu Dağılımı</option>
              <option value="expand_topics">Konu Genişletme</option>
              <option value="generate_quiz">Quiz Üretimi</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                <th className="py-3.5 px-5">Tarih / Saat</th>
                <th className="py-3.5 px-5">Adım / İşlem Türü</th>
                <th className="py-3.5 px-5">Açıklama / İçerik Detayı</th>
                <th className="py-3.5 px-5">Model</th>
                <th className="py-3.5 px-5 text-right">Girdi Token</th>
                <th className="py-3.5 px-5 text-right">Çıktı Token</th>
                <th className="py-3.5 px-5 text-right">Toplam Token</th>
                <th className="py-3.5 px-5 text-right">Maliyet ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-5 text-slate-500 whitespace-nowrap text-[11px]">
                      {log.created_at ? new Date(log.created_at).toLocaleString("tr-TR") : "-"}
                    </td>
                    <td className="py-3.5 px-5 font-black text-slate-900 whitespace-nowrap">
                      {formatActionName(log.action)}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 max-w-xs truncate" title={log.details || undefined}>
                      {log.details ? (
                        <span className="text-slate-800 font-semibold">{log.details}</span>
                      ) : (
                        <span className="text-slate-300 italic">Detay belirtilmedi</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 whitespace-nowrap">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-black">
                        {log.model_name}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right text-slate-600 font-mono">
                      {log.prompt_tokens?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right text-slate-600 font-mono">
                      {log.candidates_tokens?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right font-black text-slate-900 font-mono">
                      {log.total_tokens?.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-5 text-right font-black text-emerald-600 font-mono whitespace-nowrap">
                      ${log.cost_usd?.toFixed(6)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-bold">
                    Aranan kriterlere uygun istek kaydı bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default InstructorMetrics;
