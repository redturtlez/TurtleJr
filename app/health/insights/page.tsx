import { prisma } from "@/lib/database";
import { requireHealthUserId } from "../auth";
import { getInsightsDashboardData, getLifeContext } from "../data";
import InsightsPanel from "../InsightsPanel";
import { getNutritionInsightReview } from "../nutritionData";
import { measureHealthLoad } from "../timing";

export default async function InsightsPage() {
  const userId = await requireHealthUserId();
  const { data, insightReview } = await measureHealthLoad("insights-route", () => prisma.$transaction(async (database) => {
    const { profile, context } = await measureHealthLoad("insights-context", () => getLifeContext(userId, new Date(), database));
    const [data, insightReview] = await Promise.all([
      measureHealthLoad("insights-life", () => getInsightsDashboardData(userId, profile.timeZone, context.localDate, new Date(), database)),
      measureHealthLoad("insights-nutrition", () => getNutritionInsightReview(userId, context.localDate, database)),
    ]);
    return { data, insightReview };
  }));
  return <InsightsPanel data={data} nutrition={{ insightReview }} />;
}
