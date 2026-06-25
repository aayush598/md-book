import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { dailyActivity } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { dailyActivityQuerySchema } from "@/lib/zod-schemas";

export async function GET(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const daysParam = url.searchParams.get("days");
  const parsed = dailyActivityQuerySchema.safeParse({ days: daysParam ?? 30 });
  const days = parsed.success ? parsed.data.days : 30;

  const endDate = new Date().toISOString().slice(0, 10);
  const start = new Date();
  start.setDate(start.getDate() - days);
  const startDate = start.toISOString().slice(0, 10);

  try {
    const rows = await db
      .select()
      .from(dailyActivity)
      .where(
        and(
          eq(dailyActivity.userId, userId),
          gte(dailyActivity.date, startDate),
          lte(dailyActivity.date, endDate)
        )
      )
      .orderBy(dailyActivity.date);

    const activity = rows.map((r) => ({
      date: r.date,
      cardsReviewed: r.cardsReviewed,
      pointsEarned: r.pointsEarned,
    }));

    return Response.json(activity);
  } catch (error) {
    console.error("Activity error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
