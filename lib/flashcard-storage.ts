"use client";

const STATS_KEY = "md-book-fc-stats";
const DAYS_KEY = "md-book-fc-days";
const SESSIONS_KEY = "md-book-fc-sessions";

export interface DayActivity {
  date: string;
  cardsReviewed: number;
  pointsEarned: number;
}

export interface FlashcardStats {
  totalPoints: number;
  longestStreak: number;
  totalCardsReviewed: number;
  currentStreak: number;
}

export interface SessionRecord {
  date: string;
  cardsReviewed: number;
  pointsEarned: number;
  avgTime: number;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDays(): Record<string, DayActivity> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(DAYS_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDays(days: Record<string, DayActivity>): void {
  localStorage.setItem(DAYS_KEY, JSON.stringify(days));
}

function getStats(): FlashcardStats {
  if (typeof window === "undefined") return { totalPoints: 0, longestStreak: 0, totalCardsReviewed: 0, currentStreak: 0 };
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY) || '{"totalPoints":0,"longestStreak":0,"totalCardsReviewed":0,"currentStreak":0}');
  } catch {
    return { totalPoints: 0, longestStreak: 0, totalCardsReviewed: 0, currentStreak: 0 };
  }
}

function saveStats(s: FlashcardStats): void {
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
}

export function recordFlashcardReview(count: number): void {
  const d = today();
  const days = getDays();
  const day = days[d] || { date: d, cardsReviewed: 0, pointsEarned: 0 };
  const points = count * 10;
  day.cardsReviewed += count;
  day.pointsEarned += points;
  days[d] = day;
  saveDays(days);

  const stats = getStats();
  stats.totalPoints += points;
  stats.totalCardsReviewed += count;
  stats.currentStreak = computeStreak(days);
  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }
  saveStats(stats);

  const sessions = getSessions();
  sessions.push({ date: d, cardsReviewed: count, pointsEarned: points, avgTime: 0 });
  saveSessions(sessions);
}

function computeStreak(days: Record<string, DayActivity>): number {
  const sorted = Object.keys(days).sort().reverse();
  let streak = 0;
  const todayDate = today();
  let check = todayDate;
  for (const d of sorted) {
    if (d === check) {
      streak++;
      const dt = new Date(d);
      dt.setDate(dt.getDate() - 1);
      check = dt.toISOString().slice(0, 10);
    }
  }
  if (streak === 0 && days[todayDate]) streak = 1;
  return streak;
}

export function getDailyActivity(daysBack: number = 30): DayActivity[] {
  const days = getDays();
  const result: DayActivity[] = [];
  const start = new Date();
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(start);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    result.push(days[key] || { date: key, cardsReviewed: 0, pointsEarned: 0 });
  }
  return result;
}

export function getFlashcardStats(): FlashcardStats {
  const stats = getStats();
  stats.currentStreak = computeStreak(getDays());
  return stats;
}

export function resetFlashcardStats(): void {
  localStorage.removeItem(STATS_KEY);
  localStorage.removeItem(DAYS_KEY);
  localStorage.removeItem(SESSIONS_KEY);
}

function getSessions(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSessions(s: SessionRecord[]): void {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(s));
}
