"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CalendarClock, CircleAlert, Landmark, PiggyBank, RefreshCw, Target, TrendingUp, WalletCards } from "lucide-react";
import { useRouter } from "next/navigation";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { buildCashHistory, fundingCoverageBasisPoints, latestComparableBalanceChange, savingsRateBasisPoints } from "@/lib/finance/overview";
import { centsToUsdInput, formatUsdCents, sumCents } from "@/lib/finance/money";
import { addDaysToKey, generateOccurrences, summarizePlanned } from "@/lib/finance/recurrence";
import { recordBalanceSnapshot } from "./financeActions";
import type { FinanceAccountData } from "./financeData";
import type { FinanceBudgetData } from "./financeBudgetData";
import type { FinanceGoalData } from "./financeGoalData";
import styles from "./budget.module.css";

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function readableDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function compactMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value / 100);
}

function accountStatus(account: FinanceAccountData, today: string): { label: string; state: "missing" | "stale" | "current" } {
  if (!account.currentAsOfDate) return { label: "Balance missing", state: "missing" };
  const age = (new Date(`${today}T12:00:00`).getTime() - new Date(`${account.currentAsOfDate}T12:00:00`).getTime()) / 86_400_000;
  return age > 14 ? { label: `${Math.floor(age)} days old`, state: "stale" } : { label: `Current · ${readableDate(account.currentAsOfDate)}`, state: "current" };
}

export default function FinanceOverview({ accounts, budget, goals }: { accounts: FinanceAccountData[]; budget: FinanceBudgetData; goals: FinanceGoalData[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [balanceAccount, setBalanceAccount] = useState<FinanceAccountData | null>(null);
  const today = todayKey();
  const tracked = accounts.filter((account) => account.currentBalanceCents !== null);
  const total = sumCents(tracked.map((account) => account.currentBalanceCents ?? "0"));
  const checking = sumCents(accounts.filter((account) => account.type === "CHECKING").map((account) => account.currentBalanceCents ?? "0"));
  const savings = sumCents(accounts.filter((account) => account.type === "SAVINGS").map((account) => account.currentBalanceCents ?? "0"));
  const occurrences = generateOccurrences(budget.planItems, today, addDaysToKey(today, 29));
  const planned = summarizePlanned(occurrences);
  const savingsRate = savingsRateBasisPoints(planned.incomeCents, planned.surplusCents);
  const emergencyCoverage = fundingCoverageBasisPoints(goals.filter((goal) => goal.kind === "EMERGENCY"));
  const history = buildCashHistory(accounts);
  const balanceChange = latestComparableBalanceChange(history);
  const chartSafe = history.every((point) => point.totalCents >= BigInt(Number.MIN_SAFE_INTEGER) && point.totalCents <= BigInt(Number.MAX_SAFE_INTEGER));
  const chartData = chartSafe ? history.slice(-24).map((point) => ({ date: point.date, totalCents: Number(point.totalCents), accountCount: point.accountIds.length })) : [];
  const latestUpdate = accounts.map((account) => account.lastRecordedAt).filter((value): value is string => value !== null).toSorted().at(-1) ?? null;
  const upcomingBills = occurrences.filter((item) => item.kind === "BILL").slice(0, 6);

  const submitBalance = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!balanceAccount) return;
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        await recordBalanceSnapshot({ accountId: balanceAccount.id, balance: String(form.get("balance") ?? ""), asOfDate: String(form.get("asOfDate") ?? ""), note: String(form.get("note") ?? "") });
        toast.success(`${balanceAccount.name} updated`);
        setBalanceAccount(null);
        router.refresh();
      } catch (error) { toast.error(error instanceof Error ? error.message : "Could not record balance"); }
    });
  };

  return (
    <section aria-labelledby="finance-title">
      <header className={styles.header}>
        <p>Turtle Jr. Finance</p>
        <div><h1 id="finance-title">Your cash, <span>with context.</span></h1><p className={styles.intro}>Actual balances, estimated cash flow, earmarked goals, and hypothetical scenarios stay explicitly separate.</p></div>
      </header>

      <section className={styles.overviewMetrics} aria-label="Finance overview">
        <article className={styles.overviewPrimary}><span><WalletCards />Total tracked cash <i>Actual</i></span><strong>{tracked.length ? formatUsdCents(total) : "Not recorded"}</strong><small>{tracked.length} of {accounts.length} active accounts · {latestUpdate ? `updated ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(latestUpdate))}` : "never updated"}</small></article>
        <article><span><Landmark />Checking <i>Actual</i></span><strong>{formatUsdCents(checking)}</strong><small>{accounts.filter((account) => account.type === "CHECKING").length} accounts</small></article>
        <article><span><PiggyBank />Savings <i>Actual</i></span><strong>{formatUsdCents(savings)}</strong><small>{accounts.filter((account) => account.type === "SAVINGS").length} accounts</small></article>
        <article><span><TrendingUp />30-day surplus <i>Estimated</i></span><strong>{formatUsdCents(planned.surplusCents)}</strong><small>Exact scheduled dates; not actual savings</small></article>
        <article><span><RefreshCw />Savings rate <i>Estimated</i></span><strong>{savingsRate === null ? "Not calculable" : `${(savingsRate / 100).toFixed(1)}%`}</strong><small>{savingsRate === null ? "No planned income in this window" : "Projected surplus ÷ planned income"}</small></article>
        <article><span><Target />Emergency reserve <i>Earmarked</i></span><strong>{emergencyCoverage === null ? "Not set" : `${(emergencyCoverage / 100).toFixed(1)}%`}</strong><small>{goals.filter((goal) => goal.kind === "EMERGENCY").length} emergency goals</small></article>
      </section>

      <div className={styles.overviewGrid}>
        <section className={styles.overviewPanel} aria-labelledby="history-title">
          <div className={styles.overviewPanelHead}><div><small>Actual snapshots</small><h2 id="history-title">Tracked cash history</h2></div><span>{balanceChange ? `${balanceChange.changeCents >= BigInt(0) ? "+" : ""}${formatUsdCents(balanceChange.changeCents)} since ${readableDate(balanceChange.fromDate)}` : "Comparable change unavailable"}</span></div>
          {chartData.length > 1 ? <figure className={styles.historyFigure}>
            <ResponsiveContainer width="100%" height="100%"><LineChart data={chartData} accessibilityLayer margin={{ top: 12, right: 10, bottom: 4, left: 2 }}><CartesianGrid stroke="rgba(255,255,255,.06)" vertical={false} /><XAxis dataKey="date" tickFormatter={(value) => String(value).slice(5)} tick={{ fill: "rgba(255,255,255,.4)", fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={28} /><YAxis tickFormatter={compactMoney} tick={{ fill: "rgba(255,255,255,.4)", fontSize: 9 }} axisLine={false} tickLine={false} width={58} /><Tooltip labelFormatter={(value) => readableDate(String(value))} formatter={(value) => [formatUsdCents(BigInt(Math.round(Number(value)))), "Tracked cash"]} contentStyle={{ background: "rgb(19 25 23)", border: "1px solid rgba(91,107,101,.45)", borderRadius: 10, fontSize: 11 }} /><Line type="linear" dataKey="totalCents" stroke="rgb(16 185 129)" strokeWidth={2.5} dot={{ r: 3, fill: "rgb(16 185 129)", strokeWidth: 0 }} activeDot={{ r: 5 }} /></LineChart></ResponsiveContainer>
            <figcaption>Each point combines the latest non-corrected balance known for each tracked account on that date. Changes are unexplained actual balance differences—not inferred savings, spending, or interest.</figcaption>
          </figure> : <div className={styles.overviewEmpty}>{history.length > 1 && !chartSafe ? "History values exceed the chart range; exact summary values remain available." : "Record at least two dated balances to display history."}</div>}
        </section>

        <aside className={styles.overviewPanel} aria-labelledby="checkin-title">
          <div className={styles.overviewPanelHead}><div><small>Five-minute routine</small><h2 id="checkin-title">Weekly check-in</h2></div><RefreshCw /></div>
          <div className={styles.checkinAccounts}>{accounts.length ? accounts.map((account) => { const status = accountStatus(account, today); return <div key={account.id}><span data-state={status.state}>{status.label}</span><strong>{account.name}</strong><small>{account.currentBalanceCents === null ? "No balance" : formatUsdCents(account.currentBalanceCents)}</small><button type="button" aria-label={`Update ${account.name} balance`} onClick={() => setBalanceAccount(account)}>Update</button></div>; }) : <p>Add an account to begin weekly check-ins.</p>}</div>
          <div className={styles.checkinSection}><h3><CalendarClock />Upcoming obligations</h3>{upcomingBills.length ? upcomingBills.map((bill, index) => <div key={`${bill.planId}-${bill.date}-${index}`}><span>{bill.date} · {bill.name}</span><strong>{formatUsdCents(bill.amountCents)}</strong></div>) : <p>No planned bills in the next 30 days.</p>}</div>
          <div className={styles.checkinSection}><h3><Target />Goal progress</h3>{goals.length ? goals.slice(0, 4).map((goal) => <div key={goal.id}><span>{goal.name}</span><strong>{formatUsdCents(goal.allocatedCents)} / {formatUsdCents(goal.targetCents)}</strong></div>) : <p>No active goals yet.</p>}</div>
          {accounts.some((account) => accountStatus(account, today).state !== "current") ? <p className={styles.checkinAlert}><CircleAlert />At least one account is missing a balance or is more than 14 days old.</p> : null}
        </aside>
      </div>

      <Dialog open={balanceAccount !== null} onOpenChange={(open) => { if (!open && !pending) setBalanceAccount(null); }}><DialogContent className={styles.financeDialog}><form key={balanceAccount?.id} onSubmit={submitBalance}><DialogHeader><DialogTitle>Update {balanceAccount?.name ?? "account"}</DialogTitle><DialogDescription>Record the actual balance shown by the account. This adds a dated snapshot and does not infer why it changed.</DialogDescription></DialogHeader><div className={styles.financeFields}><label>Balance<Input name="balance" required inputMode="decimal" defaultValue={balanceAccount?.currentBalanceCents === null || balanceAccount?.currentBalanceCents === undefined ? "" : centsToUsdInput(balanceAccount.currentBalanceCents)} /></label><label>As-of date<Input name="asOfDate" required type="date" max={today} defaultValue={today} /></label><label>Note (optional)<Input name="note" maxLength={240} placeholder="Weekly check-in" /></label></div><DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Record balance"}</Button></DialogFooter></form></DialogContent></Dialog>
    </section>
  );
}
