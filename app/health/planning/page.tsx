import { prisma } from "@/lib/database";
import { requireHealthUserId } from "../auth";
import { getLifeContext } from "../data";
import { getPlanningNutritionData } from "../nutritionData";
import PlanningPanel from "../PlanningPanel";
import { getPlanningDashboardData } from "../planningData";
import { measureHealthLoad } from "../timing";

export default async function PlanningPage() {
  const userId = await requireHealthUserId();
  const { context, nutrition, planning } = await measureHealthLoad("planning-route", () => prisma.$transaction(async (database) => {
    const { context } = await measureHealthLoad("planning-context", () => getLifeContext(userId, new Date(), database));
    const nutritionPromise = measureHealthLoad("planning-nutrition", () => getPlanningNutritionData(userId, context.localDate, database));
    const planningPromise = measureHealthLoad("planning", () => getPlanningDashboardData(userId, context.localDate, nutritionPromise, database));
    const [nutrition, planning] = await Promise.all([nutritionPromise, planningPromise]);
    return { context, nutrition, planning };
  }));
  return <PlanningPanel data={planning} foods={nutrition.foods} localDate={context.localDate} />;
}
