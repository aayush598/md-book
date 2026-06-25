import { pgTable, text, integer, timestamp, boolean, serial, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  longestStreak: integer("longest_streak").default(0).notNull(),
});

export const dailyActivity = pgTable("daily_activity", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  date: text("date").notNull(),
  cardsReviewed: integer("cards_reviewed").default(0).notNull(),
  pointsEarned: integer("points_earned").default(0).notNull(),
});

export const readingProgress = pgTable("reading_progress", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  bookId: text("book_id").notNull(),
  filePath: text("file_path").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  bookId: text("book_id").notNull(),
  bookName: text("book_name").notNull(),
  filePath: text("file_path").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const flashcardSessions = pgTable("flashcard_sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  bookId: text("book_id").notNull(),
  cardsReviewed: integer("cards_reviewed").default(0).notNull(),
  pointsEarned: integer("points_earned").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
