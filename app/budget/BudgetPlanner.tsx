"use client";

import { useState, useTransition, type FormEvent } from "react";
import { CalendarClock, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { centsToUsdInput, formatUsdCents } from "@/lib/finance/money";
import { addDaysToKey, generateOccurrences, summarizePlanned, type FinanceRecurrenceValue } from "@/lib/finance/recurrence";
import { summarizeRecorded } from "@/lib/finance/transactions";
import type { FinanceAccountData } from "./financeData";
import type { FinanceBudgetData, FinancePlanItemData, FinanceTransactionData } from "./financeBudgetData";
import { archivePlanItem, createPlanItem, createRecordedTransaction, updatePlanItem, updateRecordedTransaction, voidRecordedTransaction } from "./financeBudgetActions";
import styles from "./budget.module.css";

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function label(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase());
}

export default function BudgetPlanner({ accounts, data }: { accounts: FinanceAccountData[]; data: FinanceBudgetData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [planEditor, setPlanEditor] = useState<FinancePlanItemData | "new" | null>(null);
  const [transactionEditor, setTransactionEditor] = useState<FinanceTransactionData | "new" | null>(null);
  const [recurrence, setRecurrence] = useState<FinanceRecurrenceValue>("MONTHLY");
  const [transactionType, setTransactionType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const today = todayKey();
  const occurrences = generateOccurrences(data.planItems, today, addDaysToKey(today, 29));
  const planned = summarizePlanned(occurrences);
  const monthPrefix = today.slice(0, 7);
  const recorded = summarizeRecorded(data.transactions.filter((item) => item.occurredOn.startsWith(monthPrefix)));
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const accountName = (accountId: string | null): string => accountNames.get(accountId ?? "") ?? "Archived account";

  const run = (work: () => Promise<void>, message: string, close: () => void): void => {
    startTransition(async () => {
      try { await work(); toast.success(message); close(); router.refresh(); }
      catch (error) { toast.error(error instanceof Error ? error.message : "Could not update Finance"); }
    });
  };

  const openPlan = (item: FinancePlanItemData | "new"): void => { setPlanEditor(item); setRecurrence(item === "new" ? "MONTHLY" : item.recurrence); };
  const openTransaction = (item: FinanceTransactionData | "new"): void => { setTransactionEditor(item); setTransactionType(item === "new" ? "EXPENSE" : item.type); };

  const submitPlan = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault(); if (!planEditor) return;
    const form = new FormData(event.currentTarget);
    const input = {
      accountId: String(form.get("accountId") ?? ""), name: String(form.get("name") ?? ""), kind: String(form.get("kind") ?? ""), amount: String(form.get("amount") ?? ""),
      category: String(form.get("category") ?? ""), recurrence: String(form.get("recurrence") ?? ""), startDate: String(form.get("startDate") ?? ""),
      semimonthlyFirstDay: recurrence === "SEMIMONTHLY" ? Number(form.get("semimonthlyFirstDay")) : null,
      semimonthlySecondDay: recurrence === "SEMIMONTHLY" ? Number(form.get("semimonthlySecondDay")) : null,
    };
    run(() => planEditor === "new" ? createPlanItem(input) : updatePlanItem({ ...input, id: planEditor.id }), planEditor === "new" ? "Planned item added" : "Planned item updated", () => setPlanEditor(null));
  };

  const submitTransaction = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault(); if (!transactionEditor) return;
    const form = new FormData(event.currentTarget);
    const input = {
      accountId: String(form.get("accountId") ?? ""), transferAccountId: transactionType === "TRANSFER" ? String(form.get("transferAccountId") ?? "") : null,
      name: String(form.get("name") ?? ""), type: transactionType, amount: String(form.get("amount") ?? ""), occurredOn: String(form.get("occurredOn") ?? ""),
      category: String(form.get("category") ?? ""), note: String(form.get("note") ?? ""),
    };
    run(() => transactionEditor === "new" ? createRecordedTransaction(input) : updateRecordedTransaction({ ...input, id: transactionEditor.id }), transactionEditor === "new" ? "Transaction recorded" : "Transaction updated", () => setTransactionEditor(null));
  };

  const upcomingBills = occurrences.filter((item) => item.kind === "BILL").slice(0, 8);
  return (
    <section className={styles.planner} aria-labelledby="planner-title">
      <div className={styles.plannerHeading}><div><small>Estimated from exact dates</small><h2 id="planner-title">30-day cash plan</h2></div><span>Planned and recorded values stay separate</span></div>
      <div className={styles.plannerMetrics}>
        <article><span>Planned income</span><strong className={styles.positive}>{formatUsdCents(planned.incomeCents)}</strong></article>
        <article><span>Bills + allowance</span><strong className={styles.negative}>{formatUsdCents(planned.billCents + planned.allowanceCents)}</strong></article>
        <article><span>Projected surplus</span><strong>{formatUsdCents(planned.surplusCents)}</strong></article>
        <article><span>Recorded this month</span><strong>{formatUsdCents(recorded.netCashFlowCents)}</strong><small>Transfers excluded</small></article>
      </div>

      <div className={styles.plannerGrid}>
        <section className={styles.plannerPanel}>
          <div className={styles.plannerPanelHead}><div><small>Recurring plan</small><h3>Income, bills & allowance</h3></div><button type="button" disabled={!accounts.length} onClick={() => openPlan("new")}><Plus />Add</button></div>
          <div className={styles.financeList}>{data.planItems.length ? data.planItems.map((item) => <article key={item.id}><div data-kind={item.kind}><strong>{item.name}</strong><span>{label(item.kind)} · {label(item.recurrence)} · {accountName(item.accountId)}</span></div><b className={item.kind === "INCOME" ? styles.positive : styles.negative}>{item.kind === "INCOME" ? "+" : "−"}{formatUsdCents(item.amountCents)}</b><button aria-label={`Edit ${item.name}`} onClick={() => openPlan(item)}><Pencil /></button><button aria-label={`Archive ${item.name}`} onClick={() => { if (confirm(`Archive ${item.name}?`)) run(() => archivePlanItem(item.id), "Planned item archived", () => undefined); }}><Trash2 /></button></article>) : <p className={styles.listEmpty}>Add recurring income, bills, or a discretionary allowance.</p>}</div>
        </section>

        <aside className={styles.plannerPanel}>
          <div className={styles.plannerPanelHead}><div><small>Known obligations</small><h3>Upcoming bills</h3></div><CalendarClock /></div>
          <div className={styles.upcomingList}>{upcomingBills.length ? upcomingBills.map((item, index) => <div key={`${item.planId}-${item.date}-${index}`}><span>{item.date}<b>{item.name}</b></span><strong>{formatUsdCents(item.amountCents)}</strong></div>) : <p className={styles.listEmpty}>No bills occur in the next 30 days.</p>}</div>
        </aside>
      </div>

      <section className={styles.plannerPanel}>
        <div className={styles.plannerPanelHead}><div><small>Optional actuals</small><h3>Recorded transactions</h3></div><button type="button" disabled={!accounts.length} onClick={() => openTransaction("new")}><Plus />Record</button></div>
        <div className={styles.financeList}>{data.transactions.length ? data.transactions.map((item) => <article key={item.id}><div><strong>{item.name}</strong><span>{item.occurredOn} · {label(item.type)} · {accountName(item.accountId)}{item.type === "TRANSFER" ? ` → ${accountName(item.transferAccountId)}` : ""}</span></div><b className={item.type === "INCOME" ? styles.positive : item.type === "EXPENSE" ? styles.negative : ""}>{item.type === "INCOME" ? "+" : item.type === "EXPENSE" ? "−" : ""}{formatUsdCents(item.amountCents)}</b><button aria-label={`Edit ${item.name}`} onClick={() => openTransaction(item)}><Pencil /></button><button aria-label={`Void ${item.name}`} onClick={() => { if (confirm(`Void ${item.name}? The record will be retained.`)) run(() => voidRecordedTransaction(item.id), "Transaction voided", () => undefined); }}><Trash2 /></button></article>) : <p className={styles.listEmpty}>Detailed logging is optional. Record only what is useful.</p>}</div>
      </section>

      <Dialog open={planEditor !== null} onOpenChange={(open) => { if (!open && !pending) setPlanEditor(null); }}><DialogContent className={styles.financeDialog}><form key={planEditor === "new" ? "new-plan" : planEditor?.id} onSubmit={submitPlan}><DialogHeader><DialogTitle>{planEditor === "new" ? "Add planned cash flow" : "Edit planned cash flow"}</DialogTitle><DialogDescription>Forecasts use the actual dates generated by this schedule.</DialogDescription></DialogHeader><div className={styles.financeFields}>
        <label>Name<Input name="name" required defaultValue={planEditor && planEditor !== "new" ? planEditor.name : ""} /></label><label>Amount<Input name="amount" required inputMode="decimal" defaultValue={planEditor && planEditor !== "new" ? centsToUsdInput(planEditor.amountCents) : ""} /></label>
        <label>Kind<select name="kind" defaultValue={planEditor && planEditor !== "new" ? planEditor.kind : "BILL"}><option value="INCOME">Income</option><option value="BILL">Bill</option><option value="ALLOWANCE">Discretionary allowance</option></select></label><label>Account<select name="accountId" defaultValue={planEditor && planEditor !== "new" ? planEditor.accountId : accounts[0]?.id}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        <label>Schedule<select name="recurrence" value={recurrence} onChange={(event) => setRecurrence(event.target.value as FinanceRecurrenceValue)}><option value="WEEKLY">Weekly</option><option value="BIWEEKLY">Every two weeks</option><option value="SEMIMONTHLY">Twice monthly</option><option value="MONTHLY">Monthly</option><option value="QUARTERLY">Quarterly</option><option value="YEARLY">Yearly</option></select></label><label>Starts<Input name="startDate" type="date" required defaultValue={planEditor && planEditor !== "new" ? planEditor.startDate : today} /></label>
        {recurrence === "SEMIMONTHLY" ? <div className={styles.inlineFields}><label>First day<Input name="semimonthlyFirstDay" type="number" min="1" max="31" required defaultValue={planEditor && planEditor !== "new" ? planEditor.semimonthlyFirstDay ?? 1 : 1} /></label><label>Second day<Input name="semimonthlySecondDay" type="number" min="1" max="31" required defaultValue={planEditor && planEditor !== "new" ? planEditor.semimonthlySecondDay ?? 15 : 15} /></label></div> : null}<label>Category (optional)<Input name="category" maxLength={60} defaultValue={planEditor && planEditor !== "new" ? planEditor.category ?? "" : ""} /></label>
      </div><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button disabled={pending} type="submit">{pending ? "Saving…" : "Save plan"}</Button></DialogFooter></form></DialogContent></Dialog>

      <Dialog open={transactionEditor !== null} onOpenChange={(open) => { if (!open && !pending) setTransactionEditor(null); }}><DialogContent className={styles.financeDialog}><form key={transactionEditor === "new" ? "new-transaction" : transactionEditor?.id} onSubmit={submitTransaction}><DialogHeader><DialogTitle>{transactionEditor === "new" ? "Record transaction" : "Edit transaction"}</DialogTitle><DialogDescription>Transfers move owned cash and are excluded from income and expenses.</DialogDescription></DialogHeader><div className={styles.financeFields}>
        <label>Name<Input name="name" required defaultValue={transactionEditor && transactionEditor !== "new" ? transactionEditor.name : ""} /></label><label>Amount<Input name="amount" required inputMode="decimal" defaultValue={transactionEditor && transactionEditor !== "new" ? centsToUsdInput(transactionEditor.amountCents) : ""} /></label>
        <label>Type<select name="type" value={transactionType} onChange={(event) => setTransactionType(event.target.value as typeof transactionType)}><option value="INCOME">Income</option><option value="EXPENSE">Expense</option><option value="TRANSFER">Transfer</option></select></label><label>{transactionType === "TRANSFER" ? "From account" : "Account"}<select name="accountId" defaultValue={transactionEditor && transactionEditor !== "new" ? transactionEditor.accountId : accounts[0]?.id}>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>
        {transactionType === "TRANSFER" ? <label>To account<select name="transferAccountId" defaultValue={transactionEditor && transactionEditor !== "new" ? transactionEditor.transferAccountId ?? "" : ""}><option value="">Choose account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label> : null}<label>Date<Input name="occurredOn" type="date" required max={today} defaultValue={transactionEditor && transactionEditor !== "new" ? transactionEditor.occurredOn : today} /></label><label>Category (optional)<Input name="category" maxLength={60} defaultValue={transactionEditor && transactionEditor !== "new" ? transactionEditor.category ?? "" : ""} /></label><label>Note (optional)<Input name="note" maxLength={240} defaultValue={transactionEditor && transactionEditor !== "new" ? transactionEditor.note ?? "" : ""} /></label>
      </div><DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button disabled={pending} type="submit">{pending ? "Saving…" : "Save transaction"}</Button></DialogFooter></form></DialogContent></Dialog>
    </section>
  );
}
