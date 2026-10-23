import { requireHealthUserId } from "../auth";
import NotificationPanel from "../NotificationPanel";
import { getNotificationDashboardData } from "../notificationData";
import { measureHealthLoad } from "../timing";

export default async function NotificationsPage() {
  const userId = await requireHealthUserId();
  const notifications = await measureHealthLoad("notifications", () => getNotificationDashboardData(userId));
  return <NotificationPanel data={notifications} />;
}
