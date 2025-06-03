"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { useState } from "react";
import { PieChart, Pie, ResponsiveContainer, Cell, Legend, LabelList } from "recharts";
import { BadgeCheck, Coffee, CreditCard, Edit, Home, MoreVertical, Plus, ShoppingBag, Trash2, Wallet } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../_utilityComponents/dropdownmenu";
import { formatCurrency } from "@/lib/utils";
import { ExpenseForm } from "./budgetForm";
import { toast } from "react-toastify";

export default function BudgetSummary() {
  const [sumTab, setSumTab] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const categoryIcons: { [key: string]: React.ReactNode } = {
    salary: <BadgeCheck className="h-5 w-5" />,
    rent: <Home className="h-5 w-5" />,
    groceries: <ShoppingBag className="h-5 w-5" />,
    coffee: <Coffee className="h-5 w-5" />,
    credit_card: <CreditCard className="h-5 w-5" />,
    investment: <Wallet className="h-5 w-5" />,
  };
  const [activeTab, setActiveTab] = useState(1);
  const [activeIndex, setActiveIndex] = useState(-1);
  const data = [
    { name: "Geeksforgeeks", students: 400 },
    { name: "Technical scripter", students: 700 },
    { name: "Geek-i-knack", students: 200 },
    { name: "Geek-o-mania", students: 1000 },
  ];
  const data2 = [1, 2, 3, 4, 3, 123, 12, 3, 12, 31, 23, 12, 3, 12];
  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  interface Transaction {
    id: number;
    category: string;
    amount: number;
    type: "expense" | "income";
    icon: React.ReactNode;
  }
  const handleAddTransaction = async (values: any) => {
    try {
      const newTransaction = {
        id: transactions.length + 1,
        name: values.name,
        category: values.category,
        amount: Number(values.amount),
        type: values.type,
        frequency: values.frequency,
        date: values.date,
        icon: values.icon,
        subitems: values.subitems.map((item: any) => ({
          name: item.name,
          amount: Number(item.amount),
        })),
      };
      setTransactions([...transactions, newTransaction]);
      setAddModal(false);
      toast.success("Transaction added successfully");
    } catch (error) {
      toast.error("Failed to add transaction");
    }
  };

  const handleDeleteTransaction = () => {};
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: 1,
      category: "salary",
      amount: 5000,
      type: "income",
      icon: categoryIcons["salary"],
    },
    {
      id: 2,
      category: "rent",
      amount: 1200,
      type: "expense",
      icon: categoryIcons["rent"],
    },
    {
      id: 3,
      category: "groceries",
      amount: 200,
      type: "expense",
      icon: categoryIcons["groceries"],
    },
    {
      id: 4,
      category: "salary",
      amount: 1000,
      type: "income",
      icon: categoryIcons["salary"],
    },
    {
      id: 5,
      category: "coffee",
      amount: 25,
      type: "expense",
      icon: categoryIcons["coffee"],
    },
    {
      id: 6,
      category: "credit-card",
      amount: 500,
      type: "expense",
      icon: categoryIcons["credit_card"],
    },
    {
      id: 7,
      category: "investmentssssssssssss",
      amount: 2000,
      type: "income",
      icon: categoryIcons["investment"],
    },
  ]);
  const tabs = [
    <>
      <Card className="my-4 flex flex-1 flex-col">
        <CardHeader className="z-10 p-2 pb-0">
          <CardTitle className="px-4 text-center text-lg font-bold">
            <div className="pb-2 text-2xl">Summary</div>
            <div className="grid grid-cols-2 items-center gap-4">
              <div className="">
                <Checkbox id="expenses" className="data-[state=checked]:bg-accent/90 align-middle" defaultChecked />
                <label htmlFor="expenses" className="pl-2">
                  Expenses
                </label>
              </div>
              <div className="">
                <Checkbox id="incomes" className="data-[state=checked]:bg-accent/90 align-middle" defaultChecked />
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
                data={data}
                dataKey="students"
                nameKey="name"
                onMouseEnter={onPieEnter}
                style={{ cursor: "pointer", outline: "none" }} // Ensure no outline on focus
                // label={(e) => {
                //   return e.name;
                // }}
                isAnimationActive={false}
              >
                <LabelList dataKey={"students"} />
                {data.map((entry, index) => (
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
          {transactions.map((transaction, index) => (
            <Card
              key={transaction.id}
              className={`mr-2 flex items-center justify-between p-4 ${transaction.type === "expense" ? "border-red-900 bg-red-950" : "border-green-900 bg-green-950"}`}
            >
              <div className="mr-2 flex items-center gap-2">
                <div className={`shrink-0 rounded-full p-2 ${transaction.type === "expense" ? "bg-red-900 text-red-300" : "bg-green-900 text-green-300"}`}>{transaction.icon}</div>
                <div>
                  <p className="truncate font-medium capitalize">{transaction.category}</p>
                  <p className={`text-xs ${transaction.type === "expense" ? "text-red-300" : "text-green-300"}`}>
                    {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                  </p>
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
                    <DropdownMenuItem onClick={() => {}}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-400" onClick={() => {}}>
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
        <Button className="border-primary bg-accent/90 mb-4 h-12 w-1/4 border text-xl" onClick={() => setAddModal((prev) => !prev)}>
          Add
        </Button>
      </div>
    </>,
  ];
  return (
    <>
      {addModal ? (
        <ExpenseForm
          open={addModal}
          onOpenChange={(open) => {
            setAddModal(open);
          }}
          onSubmit={handleAddTransaction}
          defaultValues={undefined}
        />
      ) : null}
      <div className="bg-background container flex flex-1 flex-col">
        <div className="sq:text-6xl mx-auto mb-4 text-4xl font-bold">Budget</div>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-md mx-auto">Balance</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="text-center text-sm font-bold">${(10200.432 as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-2">
              <CardTitle className="text-md mx-auto">Expenses</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="text-center text-sm font-bold">${(10200.432 as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
          <Card className="">
            <CardHeader className="p-2">
              <CardTitle className="text-md mx-auto">Income</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <div className="text-center text-sm font-bold">${(10200.432 as number).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>
        </div>

        {sumTab ? tabs[0] : tabs[1]}
      </div>
    </>
  );
}
