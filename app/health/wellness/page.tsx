import { requireHealthUserId } from "../auth";
import { getLifeContext } from "../data";
import { measureHealthLoad } from "../timing";
import WellnessPanel from "../WellnessPanel";
import { getWellnessDashboardData } from "../wellnessData";

export default async function WellnessPage() {
  const userId = await requireHealthUserId();
  const { context } = await measureHealthLoad("wellness-context", () => getLifeContext(userId));
  const wellness = await measureHealthLoad("wellness", () => getWellnessDashboardData(userId, context.localDate));
  return <WellnessPanel data={wellness} localDate={context.localDate} />;
}
