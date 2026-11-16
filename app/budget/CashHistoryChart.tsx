"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatUsdCents } from "@/lib/finance/money";

export interface CashHistoryPoint {
  date: string;
  totalCents: number;
  accountCount: number;
}

function readableDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function compactMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value / 100);
}

export default function CashHistoryChart({ data }: { data: CashHistoryPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%"><LineChart data={data} accessibilityLayer margin={{ top: 12, right: 10, bottom: 4, left: 2 }}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} tick={{ fill: "rgba(255,255,255,.4)", fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} /><YAxis tickFormatter={compactMoney} tick={{ fill: "rgba(255,255,255,.4)", fontSize: 9 }} axisLine={false} tickLine={false} width={58} /><Tooltip labelFormatter={(value) => readableDate(String(value))} formatter={(value) => [formatUsdCents(BigInt(Math.round(Number(value)))), "Tracked cash"]} contentStyle={{ background: "rgb(19 25 23)", border: "1px solid rgba(91,107,101,.45)", borderRadius: 10, fontSize: 11 }} /><Line type="linear" dataKey="totalCents" stroke="rgb(16 185 129)" strokeWidth={2.5} dot={{ r: 3, fill: "rgb(16 185 129)", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer>
  );
}
