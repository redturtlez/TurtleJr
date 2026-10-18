import { getTodos } from "@/app/todo/todoServer";
import { generateMetadata } from "@/lib/server";
import HealthDashboard, { type DashboardTask } from "./HealthDashboard";
import { getLifeDashboardData } from "./data";
import { getNutritionDashboardData } from "./nutritionData";
import { getNotificationDashboardData } from "./notificationData";
import { getPlanningDashboardData } from "./planningData";
import { getWellnessDashboardData } from "./wellnessData";

export const metadata = generateMetadata({ title: "Life Dashboard", description: "Daily routines, habits, and priorities" });

function localDateKey(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function HealthPage() {
  const data = await getLifeDashboardData();
  const [nutrition, wellness, notifications, todos] = await Promise.all([
    getNutritionDashboardData(data.context.localDate),
    getWellnessDashboardData(data.context.localDate),
    getNotificationDashboardData(),
    getTodos(),
  ]);
  const planning = await getPlanningDashboardData(data.context.localDate, nutrition);
  const tasks: DashboardTask[] = todos
    .filter((todo) => todo.nextShow && localDateKey(new Date(todo.nextShow), data.profile.timeZone) <= data.context.localDate)
    .map((todo) => ({
      title: todo.title,
      priority: todo.priority,
      dueDate: todo.nextShow ? localDateKey(new Date(todo.nextShow), data.profile.timeZone) : null,
    }));
  return <HealthDashboard data={data} nutrition={nutrition} planning={planning} wellness={wellness} notifications={notifications} tasks={tasks} />;
}
