"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { useState, useEffect } from "react";
import { PieChart, Pie, ResponsiveContainer, Cell, Legend, LabelList } from "recharts";
import { BadgeCheck, Coffee, CreditCard, Edit, Home, MoreVertical, Plus, ShoppingBag, Trash2, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../_utilityComponents/dropdownmenu";
import { formatCurrency } from "@/lib/utils";
import { ExpenseForm, getIconComponent } from "./budgetForm";
import { toast } from "react-toastify";
import { getBudgets, saveBudgets } from "./budgetServer";

export default function BudgetSummary() {
  const [sumTab, setSumTab] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState(1);
  const [activeIndex, setActiveIndex] = useState(-1);
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A259F7", "#F76E6C", "#43BCCD", "#F7C46C"];

  interface Transaction {
    id: number;
    name?: string;
    category: string;
    amount: number;
    type: "expense" | "income";
    icon: string;
    frequency?: string;
    date?: Date;
    subitems?: { name: string; amount: number }[];
  }

  // REMOVE test data, start with empty array and load from server
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  // TODO: Load transactions from server on mount and after CRUD

  // Replace with your auth logic
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") || "turtle" : "turtle";

  // Load transactions from server
  useEffect(() => {
    async function load() {
      const items = await getBudgets(userId);
      // Normalize: ensure id and type are present and valid
      const normalized = (items || []).map((item: any, idx: number) => ({
        ...item,
        id: typeof item.id === "number" ? item.id : idx + 1,
        type: item.type === "income" ? "income" : "expense",

        date: typeof item.date === "string" ? new Date(item.date) : item.date,
      }));
      setTransactions(normalized);
    }
    load();
  }, [userId]);

  // Save all transactions to server and reload
  async function saveAll(newItems: Transaction[]) {
    await saveBudgets({ userid: userId, budgetItems: newItems });
    // Reload from server to ensure UI is in sync
    const items = await getBudgets(userId);
    const normalized = (items || []).map((item: any, idx: number) => ({
      ...item,
      id: typeof item.id === "number" ? item.id : idx + 1,
      type: item.type === "income" ? "income" : "expense",

      date: typeof item.date === "string" ? new Date(item.date) : item.date,
    }));
    setTransactions(normalized);
  }

  // Calculate summary values
  const totalExpenses = transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0);
  const totalIncomes = transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncomes - totalExpenses;

  // Checkbox state for pie chart filtering
  const [showExpenses, setShowExpenses] = useState(true);
  const [showIncomes, setShowIncomes] = useState(true);

  // Pie chart data by category/type, filtered by checkboxes
  const pieData = Object.values(
    transactions
      .filter((t) => (showExpenses && t.type === "expense") || (showIncomes && t.type === "income"))
      .reduce(
        (acc, t) => {
          const key = t.category + "-" + t.type;
          if (!acc[key]) {
            acc[key] = {
              name: t.category,
              value: 0,
              type: t.type,
            };
          }
          acc[key].value += t.amount;
          return acc;
        },
        {} as Record<string, { name: string; value: number; type: string }>,
      ),
  );

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  // Add or edit transaction
  const handleAddOrEditTransaction = async (values: any) => {
    let newItems;
    if (editingTransaction) {
      newItems = transactions.map((t) => (t.id === editingTransaction.id ? { ...t, ...values, amount: Number(values.amount) } : t));
    } else {
      const nextId = transactions.length ? Math.max(...transactions.map((t) => t.id || 0)) + 1 : 1;
      newItems = [...transactions, { ...values, id: nextId, amount: Number(values.amount) }];
    }
    await saveAll(newItems);
    setAddModal(false);
    setEditingTransaction(null);
    toast.success(editingTransaction ? "Transaction updated successfully" : "Transaction added successfully");
  };

  // Delete transaction
  const handleDeleteTransaction = async (id: number) => {
    const newItems = transactions.filter((t) => t.id !== id);
    await saveAll(newItems);
    toast.success("Transaction deleted");
  };

  const tabs = [
    <>
      <Card className="my-4 flex flex-1 flex-col">
        <CardHeader className="z-10 p-2 pb-0">
          <CardTitle className="px-4 text-center text-lg font-bold">
            <div className="pb-2 text-2xl">Summary</div>
            <div className="grid grid-cols-2 items-center gap-4">
              <div className="">
                <Checkbox id="expenses" checked={showExpenses} onCheckedChange={(v) => setShowExpenses(!!v)} className="data-[state=checked]:bg-accent/90 align-middle" />
                <label htmlFor="expenses" className="pl-2">
                  Expenses
                </label>
              </div>
              <div className="">
                <Checkbox id="incomes" checked={showIncomes} onCheckedChange={(v) => setShowIncomes(!!v)} className="data-[state=checked]:bg-accent/90 align-middle" />
                <label htmlFor="incomes" className="pl-2">
                  Incomes
                </label>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="-mt-4 flex-1 p-0">
          <ResponsiveContainer className="text-wrap">
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                data={pieData}
                dataKey="value"
                nameKey="name"
                onMouseEnter={onPieEnter}
                style={{ cursor: "pointer", outline: "none" }}
                isAnimationActive={false}
              >
                <LabelList dataKey={"value"} />
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>{" "}
      <Button className="border-primary bg-accent/90 mb-4 h-12 w-full border text-xl" onClick={() => setSumTab((prev) => !prev)}>
        View/Edit Items
      </Button>
    </>,
    <>
      <div className="bg-background my-4 flex flex-1 flex-col rounded-none border-none">
        <div className="bg-secondary mb-4 flex h-14 w-full justify-evenly self-center rounded-full py-2 text-lg">
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (activeTab === 1 ? "bg-accent/80 text-text font-semibold" : "text-accent")}
            onClick={() => setActiveTab(1)}
          >
            <p className="m-auto">All</p>
          </div>
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (activeTab === 2 ? "bg-accent/80 text-text font-semibold" : "text-accent")}
            onClick={() => setActiveTab(2)}
          >
            <p className="m-auto">Expenses</p>
          </div>
          <div
            className={"self-center rounded-full px-4 py-1 font-semibold " + (activeTab === 3 ? "bg-accent/80 text-text font-semibold" : "text-accent")}
            onClick={() => setActiveTab(3)}
          >
            <p className="m-auto">Incomes</p>
          </div>
        </div>

        <ScrollArea className="flex flex-1 flex-col gap-2 overflow-y-scroll p-0">
          {transactions
            .filter((transaction) => (activeTab === 1 ? true : activeTab === 2 ? transaction.type === "expense" : transaction.type === "income"))
            .map((transaction, index) => (
              <Card
                key={transaction.id}
                className={`mr-2 flex items-center justify-between p-3 ${transaction.type === "expense" ? "border-red-900 bg-red-950" : "border-green-900 bg-green-950"}`}
              >
                <div className="mr-2 flex min-w-0 items-center gap-2">
                  <div className={`shrink-0 rounded-full p-2 ${transaction.type === "expense" ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"}`}>
                    {getIconComponent(transaction.icon)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold capitalize">{transaction.name || "(No Name)"}</p>
                    <div className="text-muted-foreground flex flex-row gap-2 text-xs">
                      <span className="capitalize">{transaction.category}</span>
                      <span className={transaction.type === "expense" ? "text-red-300" : "text-green-300"}>
                        {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <p className={`w-fit text-sm font-semibold ${transaction.type === "expense" ? "text-red-300" : "text-green-300"}`}>
                    {transaction.type === "expense" ? "-" : "+"}
                    {formatCurrency(transaction.amount)}
                  </p>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingTransaction(transaction);
                          setAddModal(true);
                        }}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400" onClick={() => handleDeleteTransaction(transaction.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </Card>
            ))}
        </ScrollArea>
      </div>
      <div className="flex gap-4">
        <Button className="border-primary bg-accent/90 mb-4 h-12 w-3/4 border text-xl" onClick={() => setSumTab((prev) => !prev)}>
          View Summary
        </Button>
        <Button
          className="border-primary bg-accent/90 mb-4 h-12 w-1/4 border text-xl"
          onClick={() => {
            setEditingTransaction(null);
            setAddModal(true);
          }}
        >
          Add
        </Button>
      </div>
    </>,
  ];

  // Unified close handler for modal
  const handleModalClose = () => {
    setAddModal(false);
    setEditingTransaction(null);
    document.body.style.overflow = "auto";
  };

  return (
    <>
      {addModal && (
        <ExpenseForm
          open={addModal}
          onOpenChange={(open) => {
            if (!open) handleModalClose();
          }}
          onSubmit={async (values) => {
            await handleAddOrEditTransaction(values);
            handleModalClose();
          }}
          defaultValues={
            editingTransaction
              ? {
                  name: editingTransaction.name,
                  category: editingTransaction.category,
                  amount: String(editingTransaction.amount),
                  type: editingTransaction.type,
                  frequency: editingTransaction.frequency,
                  date: editingTransaction.date,
                  icon: editingTransaction.icon,
                  subitems:
                    editingTransaction.subitems?.map((item) => ({
                      name: item.name,
                      amount: String(item.amount),
                    })) || [],
                }
              : undefined
          }
        />
      )}
      <div className="bg-background container flex flex-1 flex-col">
        <div className="sq:text-6xl mx-auto mb-4 text-4xl font-bold">Budget</div>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-md mx-auto">Balance</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="text-center text-sm font-bold">{formatCurrency(balance)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-md mx-auto">Expenses</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="text-center text-sm font-bold">{formatCurrency(totalExpenses)}</div>
            </CardContent>
          </Card>
          <Card className="">
            <CardHeader className="p-2">
              <CardTitle className="text-md mx-auto">Income</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="text-center text-sm font-bold">{formatCurrency(totalIncomes)}</div>
            </CardContent>
          </Card>
        </div>

        {sumTab ? tabs[0] : tabs[1]}
      </div>
    </>
  );
}
