import { requireHealthUserId } from "../auth";
import ConfigurePanel from "../ConfigurePanel";
import { getConfigureDashboardData } from "../data";
import { measureHealthLoad } from "../timing";

export default async function ConfigurePage() {
  const userId = await requireHealthUserId();
  const data = await measureHealthLoad("configure", () => getConfigureDashboardData(userId));
  return <ConfigurePanel data={data} />;
}
