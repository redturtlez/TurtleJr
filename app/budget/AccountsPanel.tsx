"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Archive, Landmark, Pencil, PiggyBank, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { centsToUsdInput, formatUsdCents } from "@/lib/finance/money";
import { archiveFinanceAccount, correctBalanceSnapshot, createFinanceAccount, recordBalanceSnapshot, updateFinanceAccount } from "./financeActions";
import type { FinanceAccountData, FinanceSnapshotData } from "./financeData";
import styles from "./budget.module.css";

type AccountEditor = { mode: "create" } | { mode: "edit"; account: FinanceAccountData };
type BalanceEditor =
  | { mode: "record"; account: FinanceAccountData }
  | { mode: "correct"; account: FinanceAccountData; snapshot: FinanceSnapshotData };

function todayKey(): string {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function isStale(date: string | null): boolean {
  if (!date) return false;
  const age = Date.now() - new Date(`${date}T12:00:00`).getTime();
  return age > 14 * 86_400_000;
}

function readableDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${date}T12:00:00`));
}

export default function AccountsPanel({ accounts }: { accounts: FinanceAccountData[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accountEditor, setAccountEditor] = useState<AccountEditor | null>(null);
  const [balanceEditor, setBalanceEditor] = useState<BalanceEditor | null>(null);

  const submit = (work: () => Promise<void>, success: string, close: () => void): void => {
    startTransition(async () => {
      try {
        await work();
        toast.success(success);
        close();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update Finance");
      }
    });
  };

  const submitAccount = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!accountEditor) return;
    const form = new FormData(event.currentTarget);
    const input = { name: String(form.get("name") ?? ""), type: String(form.get("type") ?? "") };
    submit(
      () => accountEditor.mode === "create" ? createFinanceAccount(input) : updateFinanceAccount({ ...input, id: accountEditor.account.id }),
      accountEditor.mode === "create" ? "Account added" : "Account updated",
      () => setAccountEditor(null),
    );
  };

  const submitBalance = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!balanceEditor) return;
    const form = new FormData(event.currentTarget);
    const values = {
      balance: String(form.get("balance") ?? ""),
      asOfDate: String(form.get("asOfDate") ?? ""),
      note: String(form.get("note") ?? ""),
    };
    submit(
      () => balanceEditor.mode === "record"
        ? recordBalanceSnapshot({ ...values, accountId: balanceEditor.account.id })
        : correctBalanceSnapshot({ ...values, snapshotId: balanceEditor.snapshot.id }),
      balanceEditor.mode === "record" ? "Balance recorded" : "Balance corrected; the original was preserved",
      () => setBalanceEditor(null),
    );
  };

  const archive = (account: FinanceAccountData): void => {
    if (!window.confirm(`Archive ${account.name}? Its balance history will be preserved.`)) return;
    submit(() => archiveFinanceAccount(account.id), "Account archived", () => undefined);
  };

  return (
    <div>
      <section className={styles.accountsSection} aria-labelledby="accounts-heading">
        <div className={styles.accountsHeading}><div><small>Actual balances</small><h2 id="accounts-heading">Checking & savings</h2></div><button type="button" onClick={() => setAccountEditor({ mode: "create" })}><Plus />Add account</button></div>
        {accounts.length ? (
          <div className={styles.accountGrid}>
            {accounts.map((account) => {
              const activeSnapshots = account.snapshots.filter((snapshot) => !snapshot.correctedAt);
              return (
                <article className={styles.accountCard} key={account.id}>
                  <div className={styles.accountTop}>
                    <div className={styles.accountIcon}>{account.type === "SAVINGS" ? <PiggyBank /> : <Landmark />}</div>
                    <div><span>{account.type.toLowerCase()}</span><h3>{account.name}</h3></div>
                    <div className={styles.accountActions}>
                      <button type="button" aria-label={`Edit ${account.name}`} onClick={() => setAccountEditor({ mode: "edit", account })}><Pencil /></button>
                      <button type="button" aria-label={`Archive ${account.name}`} onClick={() => archive(account)}><Archive /></button>
                    </div>
                  </div>
                  <div className={styles.accountBalance}>
                    <strong>{account.currentBalanceCents === null ? "No balance" : formatUsdCents(account.currentBalanceCents)}</strong>
                    <span>{account.currentAsOfDate ? `As of ${readableDate(account.currentAsOfDate)}` : "Add the first dated balance"}{isStale(account.currentAsOfDate) ? " · Update recommended" : ""}</span>
                  </div>
                  <button className={styles.recordButton} type="button" onClick={() => setBalanceEditor({ mode: "record", account })}><Plus />Record balance</button>
                  <div className={styles.snapshotHistory}>
                    <h4>Balance history</h4>
                    {account.snapshots.length ? account.snapshots.slice(0, 6).map((snapshot) => (
                      <div key={snapshot.id} data-corrected={Boolean(snapshot.correctedAt)}>
                        <div><strong>{formatUsdCents(snapshot.balanceCents)}</strong><span>{readableDate(snapshot.asOfDate)}{snapshot.correctedAt ? " · corrected" : snapshot.replacesSnapshotId ? " · correction" : ""}</span></div>
                        {!snapshot.correctedAt ? <button type="button" onClick={() => setBalanceEditor({ mode: "correct", account, snapshot })}>Correct</button> : null}
                      </div>
                    )) : <p>No balance history yet.</p>}
                    {activeSnapshots.length > 6 ? <p>{activeSnapshots.length - 6} earlier records are retained.</p> : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className={styles.accountsEmpty}><PiggyBank /><strong>No accounts yet</strong><p>Add checking or savings, then record a dated balance. Nothing connects to a bank.</p><button type="button" onClick={() => setAccountEditor({ mode: "create" })}>Add your first account</button></div>
        )}
      </section>

      <Dialog open={accountEditor !== null} onOpenChange={(open) => { if (!open && !pending) setAccountEditor(null); }}>
        <DialogContent className={styles.financeDialog}>
          <form key={accountEditor?.mode === "edit" ? accountEditor.account.id : "new"} onSubmit={submitAccount}>
            <DialogHeader><DialogTitle>{accountEditor?.mode === "edit" ? "Edit account" : "Add account"}</DialogTitle><DialogDescription>Manual tracking only. Turtle Jr. Finance does not connect to your bank.</DialogDescription></DialogHeader>
            <div className={styles.financeFields}>
              <label>Account name<Input name="name" required maxLength={80} defaultValue={accountEditor?.mode === "edit" ? accountEditor.account.name : ""} placeholder="Primary checking" /></label>
              <label>Account type<select name="type" defaultValue={accountEditor?.mode === "edit" ? accountEditor.account.type : "CHECKING"}><option value="CHECKING">Checking</option><option value="SAVINGS">Savings</option></select></label>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save account"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={balanceEditor !== null} onOpenChange={(open) => { if (!open && !pending) setBalanceEditor(null); }}>
        <DialogContent className={styles.financeDialog}>
          <form key={balanceEditor?.mode === "correct" ? balanceEditor.snapshot.id : balanceEditor?.account.id} onSubmit={submitBalance}>
            <DialogHeader><DialogTitle>{balanceEditor?.mode === "correct" ? "Correct balance record" : `Record ${balanceEditor?.account.name ?? "account"} balance`}</DialogTitle><DialogDescription>{balanceEditor?.mode === "correct" ? "The original record remains in history and is marked corrected." : "Use the balance shown by the account on the selected date."}</DialogDescription></DialogHeader>
            <div className={styles.financeFields}>
              <label>Balance<Input name="balance" required inputMode="decimal" defaultValue={balanceEditor?.mode === "correct" ? centsToUsdInput(balanceEditor.snapshot.balanceCents) : ""} placeholder="0.00" /></label>
              <label>As-of date<Input name="asOfDate" required type="date" defaultValue={balanceEditor?.mode === "correct" ? balanceEditor.snapshot.asOfDate : todayKey()} /></label>
              <label>Note (optional)<Input name="note" maxLength={240} defaultValue={balanceEditor?.mode === "correct" ? balanceEditor.snapshot.note ?? "" : ""} placeholder="Statement balance or manual check-in" /></label>
            </div>
            <DialogFooter><DialogClose asChild><Button type="button" variant="outline" disabled={pending}>Cancel</Button></DialogClose><Button type="submit" disabled={pending}>{pending ? "Saving…" : balanceEditor?.mode === "correct" ? "Save correction" : "Record balance"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
