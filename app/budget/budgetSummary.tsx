"use client";

import { useAuth } from "@clerk/nextjs";
import { ArrowDownRight, ArrowUpRight, Landmark, MoreHorizontal, Pencil, Plus, ReceiptText, Trash2, WalletCards } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../_utilityComponents/dropdownmenu";
import { formatCurrency } from "@/lib/utils";
import { ExpenseForm, getIconComponent } from "./budgetForm";
import { getBudgets, saveBudgets } from "./budgetServer";
import styles from "./budget.module.css";

interface Transaction {
  id: number; name?: string; category: string; amount: number; type: "expense" | "income"; icon: string; frequency?: string; date?: Date; subitems?: { name: string; amount: number }[];
}
type Filter = "all" | "expense" | "income";
const COLORS = ["#55e6ae", "#60a5fa", "#f59e0b", "#f472b6", "#a78bfa", "#fb7185", "#22d3ee", "#94a3b8"];

const normalize = (items: Awaited<ReturnType<typeof getBudgets>> | undefined): Transaction[] => (items ?? []).map((item, index) => ({
  ...item,
  id: typeof item.id === "number" ? item.id : index + 1,
  category: item.category || "uncategorized",
  type: item.type === "income" ? "income" : "expense",
  date: typeof item.date === "string" ? new Date(item.date) : item.date ?? undefined,
})) as Transaction[];

export default function BudgetSummary() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [addModal, setAddModal] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { isLoaded, userId } = useAuth();

  useEffect(() => { if (!isLoaded || !userId) return; let cancelled = false; setLoading(true); void getBudgets().then((items) => { if (!cancelled) setTransactions(normalize(items)); }).catch(() => toast.error("Could not load your budget")).finally(() => { if (!cancelled) setLoading(false); }); return () => { cancelled = true; }; }, [isLoaded, userId]);

  const totals = useMemo(() => {
    const income = transactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
    const expenses = transactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [transactions]);
  const pieData = useMemo(() => Object.values(transactions.filter((item) => item.type === "expense").reduce((groups, item) => {
    const key = item.category || "uncategorized";
    groups[key] ??= { name: key, value: 0 };
    groups[key].value += item.amount;
    return groups;
  }, {} as Record<string, { name: string; value: number }>)), [transactions]);
  const visible = transactions.filter((item) => filter === "all" || item.type === filter);

  const saveAll = async (items: Transaction[]) => {
    setSaving(true);
    try {
      const result = await saveBudgets({ budgetItems: items });
      if (typeof result === "string") throw new Error(result);
      setTransactions(normalize(result?.budgetItems));
    } finally { setSaving(false); }
  };
  const submit = async (values: any) => {
    const converted = { ...values, amount: Number(values.amount), subitems: values.subitems?.map((item: { name: string; amount: string }) => ({ ...item, amount: Number(item.amount) })) };
    const items = editing ? transactions.map((item) => item.id === editing.id ? { ...item, ...converted } : item) : [...transactions, { ...converted, id: transactions.length ? Math.max(...transactions.map((item) => item.id)) + 1 : 1 }];
    try { await saveAll(items); toast.success(editing ? "Transaction updated" : "Transaction added"); setAddModal(false); setEditing(null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Could not save transaction"); }
  };
  const remove = async (id: number) => { try { await saveAll(transactions.filter((item) => item.id !== id)); toast.success("Transaction deleted"); } catch { toast.error("Could not delete transaction"); } };

  return (
    <section className={styles.legacyBudget} aria-labelledby="legacy-budget-title">
      {addModal ? <ExpenseForm open onOpenChange={(open) => { setAddModal(open); if (!open) setEditing(null); }} onSubmit={submit} defaultValues={editing ? { ...editing, amount: String(editing.amount), date: editing.date ?? new Date(), frequency: editing.frequency ?? "one-time", subitems: editing.subitems?.map((item) => ({ ...item, amount: String(item.amount) })) ?? [] } : undefined} /> : null}
      <header className={styles.legacyHeader}><p>Existing data preserved</p><div><h2 id="legacy-budget-title">Legacy budget ledger</h2><p>These original entries remain available in their existing storage and calculations. They have not been silently converted into Finance plans or recorded transactions.</p></div></header>
      <section className={styles.metrics}>
        <article className={styles.balance}><span><WalletCards />Available balance</span><strong>{formatCurrency(totals.balance)}</strong><small>{transactions.length} recorded transactions</small></article>
        <article><span><ArrowUpRight />Income</span><strong>{formatCurrency(totals.income)}</strong><small>Across all entries</small></article>
        <article><span><ArrowDownRight />Expenses</span><strong>{formatCurrency(totals.expenses)}</strong><small>{totals.income ? `${Math.round((totals.expenses / totals.income) * 100)}% of income` : "Add income to compare"}</small></article>
      </section>
      <section className={styles.workspace}>
        <div className={styles.transactions}>
          <div className={styles.panelHeader}><div><small>Ledger</small><h2>Transactions</h2></div><button type="button" onClick={() => { setEditing(null); setAddModal(true); }}><Plus />Add transaction</button></div>
          <div className={styles.filters}>{(["all", "expense", "income"] as Filter[]).map((value) => <button type="button" key={value} className={filter === value ? styles.activeFilter : ""} onClick={() => setFilter(value)}>{value === "all" ? "All" : `${value}s`}<b>{value === "all" ? transactions.length : transactions.filter((item) => item.type === value).length}</b></button>)}</div>
          <div className={styles.transactionList}>{loading ? <div className={styles.empty}>Loading transactions…</div> : visible.length ? visible.map((item) => <article className={styles.transaction} key={item.id}><div className={`${styles.icon} ${item.type === "income" ? styles.incomeIcon : styles.expenseIcon}`}>{getIconComponent(item.icon)}</div><div className={styles.transactionName}><strong>{item.name || "Untitled transaction"}</strong><span>{item.category} · {item.frequency || "one-time"}</span></div><div className={item.type === "income" ? styles.positive : styles.negative}>{item.type === "income" ? "+" : "−"}{formatCurrency(item.amount)}</div><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Actions for ${item.name}`}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => { setEditing(item); setAddModal(true); }}><Pencil />Edit</DropdownMenuItem><DropdownMenuItem className="text-red-400" disabled={saving} onClick={() => void remove(item.id)}><Trash2 />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></article>) : <div className={styles.empty}><ReceiptText /><strong>No transactions here</strong><span>Add an entry to begin your budget.</span></div>}</div>
        </div>
        <aside className={styles.breakdown}>
          <div className={styles.panelHeader}><div><small>Spending mix</small><h2>By category</h2></div><Landmark /></div>
          {pieData.length ? <><div className={styles.chart}><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="82%" paddingAngle={3}>{pieData.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip formatter={(value) => formatCurrency(Number(value))} /></PieChart></ResponsiveContainer><div><strong>{formatCurrency(totals.expenses)}</strong><span>Total spent</span></div></div><div className={styles.legend}>{pieData.map((entry, index) => <div key={entry.name}><i style={{ background: COLORS[index % COLORS.length] }} /><span>{entry.name}</span><b>{formatCurrency(entry.value)}</b></div>)}</div></> : <div className={styles.empty}><Landmark /><strong>No spending data</strong><span>Expense categories will appear here.</span></div>}
        </aside>
      </section>
    </section>
  );
}
