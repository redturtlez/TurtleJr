import { prisma } from "@/lib/database";
import { requireHealthUserId } from "../auth";
import { getLifeContext } from "../data";
import NutritionPanel from "../NutritionPanel";
import { getNutritionDashboardData } from "../nutritionData";
import { measureHealthLoad } from "../timing";

export default async function NutritionPage() {
  const userId = await requireHealthUserId();
  const { context, nutrition } = await measureHealthLoad("nutrition-route", () => prisma.$transaction(async (database) => {
    const { context } = await measureHealthLoad("nutrition-context", () => getLifeContext(userId, new Date(), database));
    const nutrition = await measureHealthLoad("nutrition", () => getNutritionDashboardData(userId, context.localDate, database));
    return { context, nutrition };
  }));
  return <NutritionPanel data={nutrition} localDate={context.localDate} />;
}
