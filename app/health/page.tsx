import { getTodos } from "@/app/todo/todoServer";
import { generateMetadata } from "@/lib/server";
import { requireHealthUserId } from "./auth";
import { getTodayDashboardData } from "./data";
import { getReminderSettings } from "./notificationData";
import { measureHealthLoad } from "./timing";
import TodayDashboard, { type DashboardTask } from "./TodayDashboard";

export const metadata = generateMetadata({ title: "Life Dashboard", description: "Daily routines, habits, and priorities" });

function localDateKey(value: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default async function HealthPage() {
  const userId = await requireHealthUserId();
  const [data, reminders, todos] = await Promise.all([
    measureHealthLoad("today-core", () => getTodayDashboardData(userId)),
    measureHealthLoad("today-reminders", () => getReminderSettings(userId)),
    measureHealthLoad("today-tasks", getTodos),
  ]);
  const tasks: DashboardTask[] = todos
    .filter((todo) => todo.nextShow && localDateKey(new Date(todo.nextShow), data.profile.timeZone) <= data.context.localDate)
    .map((todo) => ({
      title: todo.title,
      priority: todo.priority,
      dueDate: todo.nextShow ? localDateKey(new Date(todo.nextShow), data.profile.timeZone) : null,
    }));
  return <TodayDashboard data={data} reminders={reminders} tasks={tasks} />;
}
