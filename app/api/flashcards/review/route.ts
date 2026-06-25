import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { dailyActivity, flashcardSessions, users } from "@/db/schema";
import { flashcardReviewSchema } from "@/lib/zod-schemas";
import { eq, and, sql } from "drizzle-orm";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = flashcardReviewSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: parsed.error.flatten() }, { status: 400 });

  const { bookId, count } = parsed.data;
  const points = count * 10;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(users).values({ id: userId, email: "", totalPoints: points });
    }

    await db
      .update(users)
      .set({
        totalPoints: sql`${users.totalPoints} + ${points}`,
      })
      .where(eq(users.id, userId));

    const day = await db
      .select()
      .from(dailyActivity)
      .where(and(eq(dailyActivity.userId, userId), eq(dailyActivity.date, today)))
      .limit(1);

    if (day.length > 0) {
      await db
        .update(dailyActivity)
        .set({
          cardsReviewed: sql`${dailyActivity.cardsReviewed} + ${count}`,
          pointsEarned: sql`${dailyActivity.pointsEarned} + ${points}`,
        })
        .where(eq(dailyActivity.id, day[0].id));
    } else {
      await db
        .insert(dailyActivity)
        .values({ userId, date: today, cardsReviewed: count, pointsEarned: points });
    }

    await db
      .insert(flashcardSessions)
      .values({ userId, bookId, cardsReviewed: count, pointsEarned: points });

    await computeStreak(userId);

    return Response.json({ points, cardsReviewed: count });
  } catch (error) {
    console.error("Flashcard review error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function computeStreak(userId: string) {
  try {
    const days = await db
      .select({ date: dailyActivity.date })
      .from(dailyActivity)
      .where(eq(dailyActivity.userId, userId))
      .orderBy(dailyActivity.date);

    const uniqueDays = [...new Set(days.map((d) => d.date))].sort().reverse();
    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let check = today;

    for (const d of uniqueDays) {
      if (d === check) {
        streak++;
        const dt = new Date(d);
        dt.setDate(dt.getDate() - 1);
        check = dt.toISOString().slice(0, 10);
      } else if (d < check) break;
    }

    if (uniqueDays.includes(today) && streak === 0) streak = 1;

    await db
      .update(users)
      .set({
        longestStreak: sql`GREATEST(${users.longestStreak}, ${streak})`,
      })
      .where(eq(users.id, userId));
  } catch {}
}
