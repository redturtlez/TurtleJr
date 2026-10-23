import { requireHealthUserId } from "../auth";
import { getGoalsDashboardData } from "../data";
import GoalsPanel from "../GoalsPanel";
import { measureHealthLoad } from "../timing";

export default async function GoalsPage() {
  const userId = await requireHealthUserId();
  const data = await measureHealthLoad("goals", () => getGoalsDashboardData(userId));
  return <GoalsPanel data={data} />;
}
