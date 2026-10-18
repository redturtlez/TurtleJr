"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CircleAlert, Pencil, Plus, Target, Trash2, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { parseApyPercentToPpm } from "@/lib/finance/advisor";
import { calculateGoalProgress, simulateSavingsGrowth } from "@/lib/finance/goals";
import { centsToUsdInput, formatUsdCents, parseUsdToCents } from "@/lib/finance/money";
import { archiveFinanceGoal, createFinanceGoal, updateFinanceGoal } from "./financeGoalActions";
import type { FinanceGoalData } from "./financeGoalData";
import type { FinanceAccountData } from "./financeData";
import styles from "./budget.module.css";

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function readableDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
}

function kindLabel(kind: FinanceGoalData["kind"]): string {
  if (kind === "EMERGENCY") return "Emergency fund";
  if (kind === "PURCHASE") return "Purchase";
  return "General savings";
}

function nonnegativeInput(value: string): bigint {
  const cents = parseUsdToCents(value || "0");
  if (cents < BigInt(0)) throw new Error("Amounts cannot be negative");
  return cents;
}

export default function GoalsAndGrowth({ accounts, goals }: { accounts: FinanceAccountData[]; goals: FinanceGoalData[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editor, setEditor] = useState<FinanceGoalData | "new" | null>(null);
  const [starting, setStarting] = useState("0.00");
  const [monthly, setMonthly] = useState("0.00");
  const [annualRate, setAnnualRate] = useState("0");
  const [months, setMonths] = useState(12);
  const savingsAccounts = accounts.filter((account) => account.type === "SAVINGS");
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const allocatedByAccount = new Map<string, bigint>();
  for (const goal of goals) allocatedByAccount.set(goal.accountId, (allocatedByAccount.get(goal.accountId) ?? BigInt(0)) + BigInt(goal.allocatedCents));

  const run = (work: () => Promise<void>, message: string, close: () => void): void => {
    startTransition(async () => {
      try { await work(); toast.success(message); close(); router.refresh(); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not update goal"); }
    });
  };

  const submitGoal = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!editor) return;
    const form = new FormData(event.currentTarget);
    const input = {
      accountId: String(form.get("accountId") ?? ""),
      name: String(form.get("name") ?? ""),
      kind: String(form.get("kind") ?? ""),
      target: String(form.get("target") ?? ""),
      allocation: String(form.get("allocation") ?? ""),
      monthlyContribution: String(form.get("monthlyContribution") ?? ""),
    };
    run(
      () => editor === "new" ? createFinanceGoal(input) : updateFinanceGoal({ ...input, id: editor.id }),
      editor === "new" ? "Goal added" : "Goal updated",
      () => setEditor(null),
    );
  };

  let simulation: ReturnType<typeof simulateSavingsGrowth> | null = null;
  let simulationError: string | null = null;
  try { simulation = simulateSavingsGrowth(nonnegativeInput(starting), nonnegativeInput(monthly), parseApyPercentToPpm(annualRate), months); }
  catch (error) { simulationError = error instanceof Error ? error.message : "Check the simulation inputs"; }

  return (
    <section className={styles.goals} aria-labelledby="goals-title">
      <div className={styles.goalsHeading}>
        <div><small>Earmarks and scenarios</small><h2 id="goals-title">Goals & growth</h2></div>
        <span>Allocations label existing savings; they do not move or spend money.</span>
      </div>
      <div className={styles.goalsGrid}>
        <section className={styles.goalsPanel}>
          <div className={styles.goalsPanelHead}><div><Target /><div><small>Saved purposefully</small><h3>Savings goals</h3></div></div><button type="button" disabled={!savingsAccounts.length} onClick={() => setEditor("new")}><Plus />Add goal</button></div>
          {savingsAccounts.map((account) => {
            const balance = BigInt(account.currentBalanceCents ?? "0");
            const allocated = allocatedByAccount.get(account.id) ?? BigInt(0);
            return allocated > (balance > BigInt(0) ? balance : BigInt(0)) ? <p key={account.id} className={styles.advisorNotice}><CircleAlert />{account.name} allocations exceed its latest balance by {formatUsdCents(allocated - (balance > BigInt(0) ? balance : BigInt(0)))}. Update the balance or goal allocations.</p> : null;
          })}
          {!savingsAccounts.length ? <p className={styles.goalsEmpty}>Add a savings account before creating a goal.</p> : goals.length ? <div className={styles.goalCards}>{goals.map((goal) => {
            const progress = calculateGoalProgress(goal, todayKey());
            return <article key={goal.id}>
              <div className={styles.goalTop}><div><span>{kindLabel(goal.kind)} · {accountNames.get(goal.accountId) ?? "Archived account"}</span><h4>{goal.name}</h4></div><button aria-label={`Edit ${goal.name}`} onClick={() => setEditor(goal)}><Pencil /></button><button aria-label={`Archive ${goal.name}`} onClick={() => { if (confirm(`Archive ${goal.name}? Its allocation will be released.`)) run(() => archiveFinanceGoal(goal.id), "Goal archived", () => undefined); }}><Trash2 /></button></div>
              <div className={styles.goalProgress} aria-label={`${(progress.progressBasisPoints / 100).toFixed(1)} percent funded`}><i style={{ width: `${progress.progressBasisPoints / 100}%` }} /></div>
              <div className={styles.goalAmounts}><strong>{formatUsdCents(goal.allocatedCents)} <small>of {formatUsdCents(goal.targetCents)}</small></strong><span>{(progress.progressBasisPoints / 100).toFixed(1)}%</span></div>
              <p>{progress.estimatedCompletionDate ? `Estimated completion ${readableDate(progress.estimatedCompletionDate)} at ${formatUsdCents(goal.monthlyContributionCents)}/month.` : progress.remainingCents === BigInt(0) ? "Target funded." : "Add a monthly contribution to estimate completion."}</p>
            </article>;
          })}</div> : <p className={styles.goalsEmpty}>No active goals. Create one to earmark part of a savings balance.</p>}
          {savingsAccounts.length ? <div className={styles.allocationSummary}>{savingsAccounts.map((account) => {
            const allocated = allocatedByAccount.get(account.id) ?? BigInt(0);
            const balance = BigInt(account.currentBalanceCents ?? "0");
            const available = (balance > BigInt(0) ? balance : BigInt(0)) - allocated;
            return <div key={account.id}><span>{account.name}</span><strong>{formatUsdCents(allocated)} allocated</strong><small>{formatUsdCents(available)} unallocated from latest balance</small></div>;
          })}</div> : null}
        </section>

        <section className={styles.goalsPanel}>
          <div className={styles.goalsPanelHead}><div><TrendingUp /><div><small>Hypothetical savings</small><h3>Growth simulator</h3></div></div></div>
          <div className={styles.simulatorFields}>
            <label>Starting balance<input value={starting} inputMode="decimal" onChange={(event) => setStarting(event.target.value)} /></label>
            <label>Monthly contribution<input value={monthly} inputMode="decimal" onChange={(event) => setMonthly(event.target.value)} /></label>
            <label>Effective annual rate %<input value={annualRate} inputMode="decimal" onChange={(event) => setAnnualRate(event.target.value)} /></label>
            <label>Horizon<select value={months} onChange={(event) => setMonths(Number(event.target.value))}><option value={12}>1 year</option><option value={36}>3 years</option><option value={60}>5 years</option><option value={120}>10 years</option><option value={240}>20 years</option><option value={360}>30 years</option></select></label>
          </div>
          {simulationError ? <p className={styles.advisorNotice}><CircleAlert />{simulationError}</p> : simulation ? <div className={styles.simulatorResults}>
            <article><span>Starting principal</span><strong>{formatUsdCents(simulation.startingPrincipalCents)}</strong></article>
            <article><span>Contributions</span><strong>{formatUsdCents(simulation.contributionPrincipalCents)}</strong></article>
            <article><span>Estimated interest</span><strong>{formatUsdCents(simulation.estimatedInterestCents)}</strong></article>
            <article><span>Hypothetical ending</span><strong>{formatUsdCents(simulation.endingBalanceCents)}</strong></article>
          </div> : null}
          <p className={styles.advisorDisclosure}>This is a savings illustration, not a stock-return forecast or financial directive. It treats the entered rate as effective annual yield, assumes contributions arrive at each month&apos;s end, holds the rate constant, and rounds the final result once to the nearest cent. Actual rates, taxes, fees, timing, and withdrawals change outcomes.</p>
        </section>
      </div>

      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open && !pending) setEditor(null); }}><DialogContent className={styles.financeDialog}><form key={editor === "new" ? "new-goal" : editor?.id} onSubmit={submitGoal}><DialogHeader><DialogTitle>{editor === "new" ? "Add savings goal" : "Edit savings goal"}</DialogTitle><DialogDescription>An allocation earmarks part of one latest savings balance. It is not a transaction.</DialogDescription></DialogHeader><div className={styles.financeFields}>
        <label>Name<Input name="name" required maxLength={100} defaultValue={editor && editor !== "new" ? editor.name : ""} /></label>
        <label>Purpose<select name="kind" defaultValue={editor && editor !== "new" ? editor.kind : "GENERAL"}><option value="EMERGENCY">Emergency fund</option><option value="PURCHASE">Purchase</option><option value="GENERAL">General savings</option></select></label>
        <label>Savings account<select name="accountId" defaultValue={editor && editor !== "new" ? editor.accountId : savingsAccounts[0]?.id}>{savingsAccounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label>Target<Input name="target" required inputMode="decimal" defaultValue={editor && editor !== "new" ? centsToUsdInput(editor.targetCents) : ""} /></label>
        <label>Currently allocated<Input name="allocation" required inputMode="decimal" defaultValue={editor && editor !== "new" ? centsToUsdInput(editor.allocatedCents) : "0.00"} /></label>
        <label>Planned monthly contribution<Input name="monthlyContribution" required inputMode="decimal" defaultValue={editor && editor !== "new" ? centsToUsdInput(editor.monthlyContributionCents) : "0.00"} /></label>
      </div><DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save goal"}</Button></DialogFooter></form></DialogContent></Dialog>
    </section>
  );
}
