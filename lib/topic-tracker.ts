// Per-book topic progress tracking. Users can group questions under custom
// topic names (e.g. "Agent2UI", "Agent3 Sandbox", "Graph Algorithms") and mark
// how many questions of each topic they have covered. Persisted in localStorage
// keyed by book id + topic name.

export interface TopicRecord {
  id: string;
  name: string;
  total: number;
  done: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = "md-book:topics";

export function readTopics(bookId: string): TopicRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Record<string, TopicRecord[]>;
    const list = parsed[bookId];
    if (!Array.isArray(list)) return [];
    return list
      .filter((t) => t && typeof t.id === "string" && typeof t.name === "string")
      .sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

function writeTopics(bookId: string, topics: TopicRecord[]): void {
  try {
    const parsed = (() => {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      try {
        return JSON.parse(raw) as Record<string, TopicRecord[]>;
      } catch {
        return {};
      }
    })();
    parsed[bookId] = topics;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch {
    /* storage unavailable — ignore */
  }
}

export interface AddTopicInput {
  name: string;
  total: number;
  done?: number;
  notes?: string;
}

export function addTopic(bookId: string, input: AddTopicInput): TopicRecord[] {
  const topics = readTopics(bookId);
  const record: TopicRecord = {
    id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    total: Math.max(0, Math.floor(input.total) || 0),
    done: Math.min(input.done ?? 0, Math.max(0, Math.floor(input.total) || 0)),
    notes: input.notes?.trim() || undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  topics.push(record);
  writeTopics(bookId, topics);
  return topics;
}

export function updateTopic(bookId: string, id: string, patch: Partial<Omit<TopicRecord, "id" | "createdAt">>): TopicRecord[] {
  const topics = readTopics(bookId).map((t) => {
    if (t.id !== id) return t;
    const total = patch.total !== undefined ? Math.max(0, Math.floor(patch.total) || 0) : t.total;
    const done = patch.done !== undefined ? Math.min(Math.max(0, Math.floor(patch.done) || 0), total) : Math.min(t.done, total);
    return {
      ...t,
      ...patch,
      total,
      done,
      name: (patch.name ?? t.name).trim() || t.name,
      updatedAt: Date.now(),
    };
  });
  writeTopics(bookId, topics);
  return topics;
}

export function incrementTopicDone(bookId: string, id: string, by = 1): TopicRecord[] {
  const topics = readTopics(bookId).map((t) => {
    if (t.id !== id) return t;
    const done = Math.max(0, Math.min(t.done + by, t.total));
    return { ...t, done, updatedAt: Date.now() };
  });
  writeTopics(bookId, topics);
  return topics;
}

export function removeTopic(bookId: string, id: string): TopicRecord[] {
  const topics = readTopics(bookId).filter((t) => t.id !== id);
  writeTopics(bookId, topics);
  return topics;
}