/**
 * Kavram sözlüğü istemcisi — tipler ve API çağrıları.
 *
 * Sözlük DİLE aittir, kursa değil: bir Python kursu için yazılan kavramlar
 * bütün Python kurslarında geçerlidir (bkz. backend/concept_seeds.py). Bu
 * yüzden burada kurs kimliği geçen tek bir çağrı yok — hepsi dil bazlı.
 *
 * Öğretmene "kavram" kelimesi GÖSTERİLMEZ. Arayüzde bunun adı
 * "ölçülecek beceriler"dir; terim değil, iş anlaşılsın.
 */
import api from "../../api";

export const CONCEPTS_UI_LABEL = "Ölçülecek Beceriler";

/** Bir konuya en fazla bu kadar beceri bağlanır (sunucu da aynı sınırı uygular). */
export const MAX_CONCEPTS_PER_TOPIC = 4;

export interface ConceptEntry {
  concept_id: string;
  label: string;
  description: string;
  prerequisites: string[];
  source?: string;
}

/** Bir konuya bağlanmış beceri. */
export interface TopicConcept {
  concept_id: string;
  label: string;
  primary: boolean;
}

/** Bir konunun kazanım + beceri zenginleştirmesi. */
export interface TopicMeta {
  outcomes: string[];
  concepts: TopicConcept[];
  /** Model 4'ten fazla beceri istedi: konu muhtemelen çok geniş, ikiye bölünmeli. */
  tooBroad?: boolean;
}

export interface EnrichResult {
  language: string | null;
  languageLabel: string;
  dictionaryMissing: boolean;
  /** Konu metni -> zenginleştirme. Anahtar konunun kendisidir. */
  byTopic: Record<string, TopicMeta>;
}

export interface DetectResult {
  language: string | null;
  label: string;
  hasDictionary: boolean;
  conceptCount: number;
}

/** Kurs konusundan dili ve sözlüğün var olup olmadığını sorar. */
export const detectConceptLanguage = async (
  courseTopic: string,
  audience?: string
): Promise<DetectResult> => {
  const response = await api.get("/concepts/detect", {
    params: { course_topic: courseTopic, audience: audience || undefined },
  });
  return {
    language: response.data?.language ?? null,
    label: response.data?.label || "",
    hasDictionary: !!response.data?.has_dictionary,
    conceptCount: response.data?.concept_count || 0,
  };
};

export const fetchDictionary = async (language: string): Promise<ConceptEntry[]> => {
  const response = await api.get(`/concepts/${encodeURIComponent(language)}`);
  return response.data?.concepts || [];
};

/** Sözlüğü olmayan dil için taslak ürettirir. Taslak KAYDEDİLMEZ. */
export const draftDictionary = async (
  language: string,
  body: { course_topic?: string; audience?: string; difficulty?: string }
): Promise<{ alreadyExists: boolean; concepts: ConceptEntry[] }> => {
  const response = await api.post(`/concepts/${encodeURIComponent(language)}/draft`, body);
  return {
    alreadyExists: !!response.data?.already_exists,
    concepts: response.data?.concepts || [],
  };
};

/** Öğretmenin onayladığı sözlüğü kalıcı yazar. Sonraki kurslar hazır bulur. */
export const approveDictionary = async (
  language: string,
  entries: ConceptEntry[]
): Promise<ConceptEntry[]> => {
  const response = await api.post(`/concepts/${encodeURIComponent(language)}/approve`, {
    entries: entries.map((e) => ({
      concept_id: e.concept_id,
      label: e.label,
      description: e.description,
      prerequisites: e.prerequisites || [],
    })),
  });
  return response.data?.concepts || [];
};

/** Konu başlıklarına kazanım + beceri bağlar. */
export const enrichTopics = async (params: {
  topics: string[];
  courseTopic: string;
  difficulty?: string;
  audience?: string;
  language?: string | null;
}): Promise<EnrichResult> => {
  const response = await api.post("/courses/enrich_topics", {
    topics: params.topics,
    course_topic: params.courseTopic,
    difficulty: params.difficulty || "Beginner",
    audience: params.audience || "",
    language: params.language || null,
  });

  const byTopic: Record<string, TopicMeta> = {};
  for (const item of response.data?.topics || []) {
    byTopic[item.topic] = {
      outcomes: item.outcomes || [],
      concepts: item.concepts || [],
      tooBroad: !!item.too_broad,
    };
  }

  return {
    language: response.data?.language ?? null,
    languageLabel: response.data?.language_label || "",
    dictionaryMissing: !!response.data?.dictionary_missing,
    byTopic,
  };
};

/**
 * Bir konunun becerilerini öğretmen düzenlemesinden sonra tutarlı hale getirir.
 *
 * Değişmez kural: liste boş değilse DAİMA tam olarak bir birincil beceri
 * vardır. Öğretmen birincil olanı silerse birincillik sıradakine geçer —
 * aksi halde konu, neyi ölçtüğü belirsiz bir halde kalırdı.
 */
export const normalizeTopicConcepts = (concepts: TopicConcept[]): TopicConcept[] => {
  const trimmed = concepts.slice(0, MAX_CONCEPTS_PER_TOPIC);
  if (trimmed.length === 0) return trimmed;
  const primaryIndex = trimmed.findIndex((c) => c.primary);
  const target = primaryIndex >= 0 ? primaryIndex : 0;
  return trimmed.map((c, i) => ({ ...c, primary: i === target }));
};
