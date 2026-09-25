/**
 * Bir konunun altındaki kazanım + beceri şeridi.
 *
 * Bu bileşen "atlanması en kolay, en değerli adım"ın kendisidir: modelin
 * eşleştirmesini öğretmene GÖSTERİR ve düzelttirir. Üç şeyi birden kazandırır:
 *   Doğruluk — yanlış eşleşmeyi insan düzeltir.
 *   Güven    — öğretmen sistemin neyi ölçeceğini görür, kara kutu olmaz.
 *   Etiketleme — her düzeltme sözlüğü iyileştiren bir veri noktasıdır.
 *
 * Öğretmene "kavram" denmez; başlık "Ölçülecek Beceriler"dir.
 */
import React, { useMemo, useState } from "react";
import { Plus, Star, X, AlertTriangle } from "lucide-react";
import type { ConceptEntry, TopicConcept, TopicMeta } from "./concepts";
import { CONCEPTS_UI_LABEL, MAX_CONCEPTS_PER_TOPIC, normalizeTopicConcepts } from "./concepts";

interface Props {
  meta?: TopicMeta;
  dictionary: ConceptEntry[];
  onChange: (meta: TopicMeta) => void;
  /** Zenginleştirme sürüyor: şerit yerine iskelet gösterilir. */
  loading?: boolean;
}

const TopicConceptTags: React.FC<Props> = ({ meta, dictionary, onChange, loading }) => {
  const [isPicking, setIsPicking] = useState(false);
  const [search, setSearch] = useState("");

  const concepts = meta?.concepts || [];
  const outcomes = meta?.outcomes || [];

  const selectedIds = useMemo(() => new Set(concepts.map((c) => c.concept_id)), [concepts]);

  const options = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("tr");
    return dictionary
      .filter((entry) => !selectedIds.has(entry.concept_id))
      .filter((entry) =>
        !query ||
        entry.label.toLocaleLowerCase("tr").includes(query) ||
        entry.concept_id.includes(query)
      )
      .slice(0, 40);
  }, [dictionary, selectedIds, search]);

  const commit = (next: TopicConcept[]) => {
    onChange({
      outcomes,
      concepts: normalizeTopicConcepts(next),
      tooBroad: meta?.tooBroad,
    });
  };

  const handleAdd = (entry: ConceptEntry) => {
    if (concepts.length >= MAX_CONCEPTS_PER_TOPIC) return;
    commit([
      ...concepts,
      { concept_id: entry.concept_id, label: entry.label, primary: concepts.length === 0 },
    ]);
    setSearch("");
    setIsPicking(false);
  };

  const handleRemove = (conceptId: string) =>
    commit(concepts.filter((c) => c.concept_id !== conceptId));

  const handleMakePrimary = (conceptId: string) =>
    commit(concepts.map((c) => ({ ...c, primary: c.concept_id === conceptId })));

  const handleEditOutcome = (index: number, value: string) =>
    onChange({ outcomes: outcomes.map((o, i) => (i === index ? value : o)), concepts, tooBroad: meta?.tooBroad });

  const handleRemoveOutcome = (index: number) =>
    onChange({ outcomes: outcomes.filter((_, i) => i !== index), concepts, tooBroad: meta?.tooBroad });

  if (loading) {
    return (
      <div className="pl-7 pr-2 pb-1 flex items-center gap-1.5">
        <span className="h-4 w-24 rounded-md bg-slate-200 animate-pulse" />
        <span className="h-4 w-20 rounded-md bg-slate-200 animate-pulse" />
      </div>
    );
  }

  // Ne zenginleştirme yapıldı ne de kullanılabilir sözlük var: şerit hiç
  // çizilmez. "Beceri bağlanmadı" uyarısı burada yanlış olurdu — eşleşme
  // denenmemiş, kurs bir programlama dersi bile olmayabilir.
  if (!meta && dictionary.length === 0) return null;

  const isFull = concepts.length >= MAX_CONCEPTS_PER_TOPIC;

  return (
    <div className="pl-7 pr-2 pb-1.5 flex flex-col gap-1.5">
      {/* Kazanımlar — "Bu konuyu bitiren öğrenci ..." */}
      {outcomes.length > 0 && (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
            Bu konuyu bitiren öğrenci
          </span>
          {outcomes.map((outcome, i) => (
            <div key={i} className="flex items-center gap-1.5 group/outcome">
              <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
              <input
                type="text"
                value={outcome}
                onChange={(e) => handleEditOutcome(i, e.target.value)}
                className="flex-grow bg-transparent text-[11px] font-bold text-gray-600 focus:outline-none focus:text-gray-900 border-b border-transparent focus:border-emerald-300"
              />
              <button
                type="button"
                onClick={() => handleRemoveOutcome(i)}
                className="p-0.5 text-gray-300 hover:text-red-500 rounded opacity-0 group-hover/outcome:opacity-100 transition-opacity"
                title="Kazanımı sil"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Ölçülecek beceriler */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mr-0.5">
          {CONCEPTS_UI_LABEL}
        </span>

        {concepts.map((concept) => (
          <span
            key={concept.concept_id}
            className={`group/chip inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-lg border text-[10px] font-black transition-all ${
              concept.primary
                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                : "bg-slate-100 border-slate-200 text-slate-600"
            }`}
            title={concept.primary ? "Birincil beceri — konu asıl bunu ölçüyor" : "Birincil yapmak için yıldıza tıklayın"}
          >
            <button
              type="button"
              onClick={() => handleMakePrimary(concept.concept_id)}
              className={concept.primary ? "text-indigo-500" : "text-slate-300 hover:text-indigo-500"}
              title="Birincil beceri yap"
            >
              <Star size={9} fill={concept.primary ? "currentColor" : "none"} />
            </button>
            {concept.label}
            <button
              type="button"
              onClick={() => handleRemove(concept.concept_id)}
              className="p-0.5 text-slate-300 hover:text-red-500 opacity-0 group-hover/chip:opacity-100 transition-opacity"
              title="Bu beceriyi kaldır"
            >
              <X size={9} />
            </button>
          </span>
        ))}

        {concepts.length === 0 && (
          <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2 py-0.5">
            Beceri bağlanmadı — sözlükte eşleşme yok
          </span>
        )}

        {!isFull && (
          <button
            type="button"
            onClick={() => setIsPicking((v) => !v)}
            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg border border-dashed border-gray-300 text-[10px] font-black text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
            title="Sözlükten beceri ekle"
          >
            <Plus size={10} />
            Ekle
          </button>
        )}

        {meta?.tooBroad && (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-black text-orange-600"
            title="Bu konuya 4'ten fazla beceri düştü. Konuyu ikiye bölmek ölçümü netleştirir."
          >
            <AlertTriangle size={10} />
            Konu geniş
          </span>
        )}
      </div>

      {/* Sözlükten seçme kutusu — yalnızca sözlükteki kimlikler seçilebilir */}
      {isPicking && (
        <div className="relative">
          <div className="absolute z-30 mt-1 w-72 max-h-56 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl p-2 flex flex-col gap-1">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Beceri ara..."
              className="w-full px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] font-bold focus:outline-none focus:border-indigo-400"
            />
            {options.length === 0 && (
              <span className="text-[10px] font-bold text-gray-400 px-2 py-2">
                Eşleşen beceri yok. Sözlükte olmayan bir beceri buradan eklenemez —
                sözlüğü Beceri Sözlüğü ekranından genişletin.
              </span>
            )}
            {options.map((entry) => (
              <button
                key={entry.concept_id}
                type="button"
                onClick={() => handleAdd(entry)}
                className="text-left px-2 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
              >
                <span className="block text-[11px] font-black text-gray-800">{entry.label}</span>
                {entry.description && (
                  <span className="block text-[9px] font-bold text-gray-400 leading-snug">
                    {entry.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicConceptTags;
