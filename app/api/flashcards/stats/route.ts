import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { users, dailyActivity } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userData = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const days = await db
      .select()
      .from(dailyActivity)
      .where(eq(dailyActivity.userId, userId))
      .orderBy(dailyActivity.date);

    const uniqueDays = [...new Set(days.map((d) => d.date))].sort().reverse();
    let currentStreak = 0;
    const today = new Date().toISOString().slice(0, 10);
    let check = today;

    for (const d of uniqueDays) {
      if (d === check) {
        currentStreak++;
        const dt = new Date(d);
        dt.setDate(dt.getDate() - 1);
        check = dt.toISOString().slice(0, 10);
      } else if (d < check) break;
    }
    if (uniqueDays.includes(today) && currentStreak === 0) currentStreak = 1;

    const stats = {
      totalPoints: userData[0]?.totalPoints ?? 0,
      longestStreak: userData[0]?.longestStreak ?? 0,
      currentStreak,
      totalCardsReviewed: days.reduce((a, d) => a + d.cardsReviewed, 0),
    };

    return Response.json(stats);
  } catch (error) {
    console.error("Stats error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
