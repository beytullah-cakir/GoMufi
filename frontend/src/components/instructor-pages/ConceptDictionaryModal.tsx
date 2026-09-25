/**
 * Sözlüğü olmayan bir dil için taslak onay ekranı.
 *
 * Akış (backend/routers/concepts.py ile aynı):
 *   1. Sistem mevcut sözlüklerde eşleşme arar. Bulamazsa UYDURMAZ.
 *   2. O dil için taslak çıkarır ve öğretmene sorar: "bu kursta şu becerileri
 *      ölçeceğiz, doğru mu?"
 *   3. Onaylanan sözlük KALICI kaydedilir. Aynı dili sonra açan öğretmen
 *      hazır bulur.
 *
 * Yani ilk kullanıcı birkaç dakikalık onay maliyeti öder, sonraki herkes
 * bedava kullanır. Kütüphane kullanıldıkça büyür.
 */
import React, { useEffect, useState } from "react";
import { Sparkles, X, Check, Loader2, Trash2 } from "lucide-react";
import type { ConceptEntry } from "./concepts";
import { approveDictionary, draftDictionary } from "./concepts";

interface Props {
  language: string;
  languageLabel: string;
  courseTopic: string;
  audience?: string;
  difficulty?: string;
  onClose: () => void;
  /** Sözlük kalıcı yazıldıktan sonra çağrılır; sihirbaz zenginleştirmeyi tekrarlar. */
  onApproved: (concepts: ConceptEntry[]) => void;
}

const ConceptDictionaryModal: React.FC<Props> = ({
  language,
  languageLabel,
  courseTopic,
  audience,
  difficulty,
  onClose,
  onApproved,
}) => {
  const [entries, setEntries] = useState<ConceptEntry[]>([]);
  const [isDrafting, setIsDrafting] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await draftDictionary(language, {
          course_topic: courseTopic,
          audience,
          difficulty,
        });
        if (cancelled) return;
        setEntries(result.concepts);
        // Sözlük bu arada başka bir öğretmen tarafından onaylanmış olabilir.
        if (result.alreadyExists) {
          onApproved(result.concepts);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.detail || "Taslak üretilemedi.");
      } finally {
        if (!cancelled) setIsDrafting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Bağımlılık YALNIZCA `language`: taslak dil başına bir kez üretilir,
    // her render'da yeniden üretmek para yakar.
  }, [language]);

  const handleApprove = async () => {
    if (entries.length === 0) return;
    setIsSaving(true);
    setError("");
    try {
      const saved = await approveDictionary(language, entries);
      onApproved(saved);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Sözlük kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {languageLabel} için ölçülecek beceriler
            </h3>
            <p className="text-[11px] font-bold text-gray-500 leading-normal">
              Bu kursta şu becerileri ölçeceğiz — doğru mu? Silin, düzeltin, onaylayın.
              Onayladığınız liste kalıcı olarak saklanır; {languageLabel} kursu açan
              herkes bunu hazır bulur.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto p-5 bg-slate-50">
          {isDrafting && (
            <div className="flex flex-col items-center justify-center gap-2 py-14">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
              <span className="text-xs font-black text-gray-600">
                {languageLabel} beceri listesi çıkarılıyor...
              </span>
            </div>
          )}

          {!isDrafting && error && (
            <div className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              {error}
            </div>
          )}

          {!isDrafting && entries.length > 0 && (
            <div className="flex flex-col gap-2">
              {entries.map((entry, index) => (
                <div
                  key={entry.concept_id}
                  className="group/entry bg-white border border-gray-150 rounded-xl px-3 py-2 flex items-start gap-2 shadow-sm"
                >
                  <span className="w-5 h-5 shrink-0 mt-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[9px] font-black flex items-center justify-center border border-indigo-100">
                    {index + 1}
                  </span>
                  <div className="flex-grow flex flex-col gap-0.5 min-w-0">
                    <input
                      type="text"
                      value={entry.label}
                      onChange={(e) =>
                        setEntries((prev) =>
                          prev.map((x, i) => (i === index ? { ...x, label: e.target.value } : x))
                        )
                      }
                      className="w-full bg-transparent text-xs font-black text-gray-800 focus:outline-none border-b border-transparent focus:border-indigo-300"
                    />
                    <input
                      type="text"
                      value={entry.description}
                      placeholder="Öğrencinin tam olarak neyde takıldığı..."
                      onChange={(e) =>
                        setEntries((prev) =>
                          prev.map((x, i) =>
                            i === index ? { ...x, description: e.target.value } : x
                          )
                        )
                      }
                      className="w-full bg-transparent text-[10px] font-bold text-gray-500 focus:outline-none border-b border-transparent focus:border-indigo-200"
                    />
                    {entry.prerequisites.length > 0 && (
                      <span className="text-[9px] font-bold text-gray-400 truncate">
                        Ön koşul: {entry.prerequisites.join(", ")}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setEntries((prev) => prev.filter((_, i) => i !== index))}
                    className="p-1 text-gray-300 hover:text-red-500 rounded-lg opacity-0 group-hover/entry:opacity-100 transition-opacity shrink-0"
                    title="Listeden çıkar"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] font-black text-gray-400">
            {entries.length} beceri
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-500 font-bold hover:text-gray-800 transition-colors text-xs uppercase"
            >
              Şimdilik Geç
            </button>
            <button
              onClick={handleApprove}
              disabled={isDrafting || isSaving || entries.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-black rounded-xl text-xs uppercase flex items-center gap-2 disabled:opacity-50 active:scale-95 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Onayla ve Kaydet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConceptDictionaryModal;
