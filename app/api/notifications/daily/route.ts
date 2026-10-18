import { NextResponse } from "next/server";
import { env } from "@/env.mjs";
import { deliverNotificationChecks } from "@/app/health/deliverNotifications";
import { cronRequestIsAuthorized } from "@/app/health/notificationSecurity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  if (!cronRequestIsAuthorized(request, env.CRON_SECRET)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await deliverNotificationChecks());
  } catch {
    return NextResponse.json({ error: "Notification delivery failed" }, { status: 500 });
  }
}
