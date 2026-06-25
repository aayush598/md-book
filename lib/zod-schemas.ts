import { z } from "zod";

export const emailSchema = z.string().email().max(255);

export const userIdSchema = z.string().min(1).max(255);

export const bookIdSchema = z.string().min(1).max(255);

export const flashcardReviewSchema = z.object({
  bookId: bookIdSchema,
  count: z.number().int().min(1).max(100),
});

export const readingProgressSchema = z.object({
  bookId: bookIdSchema,
  filePath: z.string().min(1).max(500),
});

export const bookmarkSchema = z.object({
  bookId: bookIdSchema,
  bookName: z.string().min(1).max(255),
  filePath: z.string().min(1).max(500),
  title: z.string().min(1).max(255),
});

export const dailyActivityQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export const flashcardSessionSchema = z.object({
  bookId: bookIdSchema,
  cardsReviewed: z.number().int().min(0),
  pointsEarned: z.number().int().min(0),
});
