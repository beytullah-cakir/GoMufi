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
  Info,
  CheckCircle2,
  Trash2,
  BookOpen,
  ChevronDown,
  ChevronUp
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

interface MetricsData {
  total_requests: number;
  total_prompt_tokens: number;
  total_candidates_tokens: number;
  total_tokens: number;
  total_cost_usd: number;
  total_cost_tl: number;
  usd_to_tl_rate: number;
  by_action: Record<string, ActionStat>;
  by_model: Record<string, ModelStat>;
  by_course: CourseSummaryItem[];
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
        </div>
      </div>

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
