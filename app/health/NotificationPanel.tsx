"use client";

import { Bell, BellOff, CheckCircle2, Download, Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "react-toastify";
import { saveNotificationSettings, sendTestPush, subscribeToPush, unsubscribeFromPush } from "./notificationActions";
import type { NotificationDashboardData } from "./notificationData";
import { formatMinutes } from "./scheduling";
import styles from "./health.module.css";

function timeValue(minutes: number | null): string {
  if (minutes === null) return "";
  return `${Math.floor(minutes / 60).toString().padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

function parseTime(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value) return null;
  const [hour, minute] = value.split(":").map(Number);
  return Number.isInteger(hour) && Number.isInteger(minute) ? (hour ?? 0) * 60 + (minute ?? 0) : null;
}

function applicationServerKey(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const decoded = window.atob((value + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(new ArrayBuffer(decoded.length));
  for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
  return bytes;
}

export default function NotificationPanel({ data }: { data: NotificationDashboardData }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [ios, setIos] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const available = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setSupported(available);
    setStandalone(window.matchMedia("(display-mode: standalone)").matches);
    setIos(/iPad|iPhone|iPod/.test(navigator.userAgent));
    if (!available) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then(async (registration) => setSubscription(await registration.pushManager.getSubscription()))
      .catch(() => toast.error("Could not prepare browser notifications"));
  }, []);

  const enable = (): void => {
    startTransition(async () => {
      if (!data.vapidPublicKey) {
        toast.error("Push keys are not configured on the server");
        return;
      }
      let created: PushSubscription | null = null;
      try {
        if (Notification.permission === "denied") throw new Error("Notifications are blocked in this browser's site settings");
        const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Notification permission was not granted");
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        created = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(data.vapidPublicKey) });
        const serialized = created.toJSON();
        if (!serialized.endpoint || !serialized.keys?.p256dh || !serialized.keys.auth) throw new Error("The browser returned an incomplete subscription");
        await subscribeToPush({ endpoint: serialized.endpoint, expirationTime: serialized.expirationTime ?? null, keys: serialized.keys, userAgent: navigator.userAgent });
        setSubscription(created);
        toast.success("Push notifications enabled on this browser");
      } catch (error) {
        if (created && !subscription) await created.unsubscribe().catch(() => undefined);
        toast.error(error instanceof Error ? error.message : "Could not enable notifications");
      }
    });
  };

  const disable = (): void => {
    startTransition(async () => {
      if (!subscription) return;
      try {
        await unsubscribeFromPush(subscription.endpoint);
        await subscription.unsubscribe();
        setSubscription(null);
        toast.success("Push notifications disabled on this browser");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not disable notifications");
      }
    });
  };

  const test = (): void => {
    startTransition(async () => {
      if (!subscription) return;
      try { await sendTestPush(subscription.endpoint); toast.success("Test notification sent"); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not send the test notification"); }
    });
  };

  const save = (formData: FormData): void => {
    startTransition(async () => {
      try {
        await saveNotificationSettings({
          dailyDigestEnabled: formData.get("dailyDigestEnabled") === "on",
          dailyDigestMinutes: parseTime(formData.get("dailyDigestTime")) ?? 1080,
          activityPushRemindersEnabled: formData.get("activityPushRemindersEnabled") === "on",
          inAppRemindersEnabled: formData.get("inAppRemindersEnabled") === "on",
          quietStartMinutes: parseTime(formData.get("quietStart")),
          quietEndMinutes: parseTime(formData.get("quietEnd")),
          showActivityNames: formData.get("showActivityNames") === "on",
        });
        toast.success("Notification preferences saved");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save notification preferences");
      }
    });
  };

  const quietSummary = data.settings.quietStartMinutes !== null && data.settings.quietEndMinutes !== null
    ? `${formatMinutes(data.settings.quietStartMinutes)} to ${formatMinutes(data.settings.quietEndMinutes)}`
    : "Off";

  return <section className={styles.notificationPage}>
    <div className={styles.notificationGrid}>
      <article className={styles.managePanel}>
        <div className={styles.panelHeading}><div><small>Browser delivery</small><h2>Push notifications</h2></div>{subscription ? <CheckCircle2 /> : <Bell />}</div>
        {!data.pushConfigured ? <p className={styles.notice}>Push is safely disabled until VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT are configured on the server.</p> : supported === false ? <p className={styles.notice}>This browser does not support web push.</p> : <>
          <p className={styles.panelCopy}>{subscription ? "This browser is subscribed." : "Permission is requested only when you choose Enable."} {data.activeSubscriptionCount} active {data.activeSubscriptionCount === 1 ? "browser" : "browsers"} saved.</p>
          <div className={styles.notificationActions}>{subscription ? <><button type="button" disabled={pending} onClick={test}><Send />Send test</button><button type="button" disabled={pending} onClick={disable}><BellOff />Disable this browser</button></> : <button type="button" disabled={pending || supported !== true} onClick={enable}><Bell />Enable on this browser</button>}</div>
        </>}
      </article>

      <article className={styles.managePanel}>
        <div className={styles.panelHeading}><div><small>Installable app</small><h2>Add Turtle Jr to your device</h2></div><Download /></div>
        {standalone ? <p className={styles.panelCopy}>Turtle Jr is running as an installed app.</p> : <p className={styles.panelCopy}>{ios ? "On iPhone or iPad, use Share, then Add to Home Screen. Push requires the installed home-screen app on supported iOS versions." : "Use your browser menu's Install app or Add to Home screen command when available."}</p>}
        <p className={styles.privacyNote}>The service worker handles push clicks only. It does not cache private dashboard pages or queue offline changes.</p>
      </article>
    </div>

    <form className={`${styles.activityForm} ${styles.notificationSettings}`} action={save}>
      <div className={styles.formHeading}><div><small>Preferences</small><h3>Reminder delivery</h3></div><span>Quiet hours: {quietSummary}</span></div>
      <label className={styles.checkRow}><input name="inAppRemindersEnabled" type="checkbox" defaultChecked={data.settings.inAppRemindersEnabled} /><span>Show timely reminders while the dashboard is open <small>Checked once per minute near fixed times and flexible-window starts.</small></span></label>
      <label className={styles.checkRow}><input name="activityPushRemindersEnabled" type="checkbox" defaultChecked={data.settings.activityPushRemindersEnabled} /><span>Send scheduled activity push reminders <small>Fixed times, flexible-window starts, and expired snoozes are checked every 30 minutes.</small></span></label>
      <label className={styles.checkRow}><input name="dailyDigestEnabled" type="checkbox" defaultChecked={data.settings.dailyDigestEnabled} /><span>Send one daily push digest <small>{data.schedule}.</small></span></label>
      <label><span>Daily digest time</span><input name="dailyDigestTime" type="time" defaultValue={timeValue(data.settings.dailyDigestMinutes)} required /></label>
      <div className={styles.twoColumns}><label><span>Quiet hours start</span><input name="quietStart" type="time" defaultValue={timeValue(data.settings.quietStartMinutes)} /></label><label><span>Quiet hours end</span><input name="quietEnd" type="time" defaultValue={timeValue(data.settings.quietEndMinutes)} /></label></div>
      <label className={styles.checkRow}><input name="showActivityNames" type="checkbox" defaultChecked={data.settings.showActivityNames} /><span>Show activity names in push notifications <small>Off by default so lock-screen messages reveal only the open count.</small></span></label>
      <p className={styles.privacyNote}>Reminders due during quiet hours are grouped and delivered after quiet hours end. Times use your Life Dashboard time zone. Sequential activities without a scheduled time appear only in the daily digest. Cron security is {data.cronConfigured ? "configured" : "not configured"}.</p>
      <button className={styles.primaryButton} disabled={pending}>{pending ? "Saving…" : "Save notification preferences"}</button>
    </form>
  </section>;
}
