"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BadgeCheck,
  Coffee,
  CreditCard,
  Home,
  Loader2,
  Plus,
  ShoppingBag,
  Trash2,
  Wallet,
  DollarSign,
  Car,
  Utensils,
  Gift,
  Smartphone,
  Briefcase,
  Heart,
  Plane,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { useState, useEffect } from "react";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

const formSchema = z
  .object({
    name: z.string().min(1, "Name is required"),
    category: z.string().optional(),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine((val) => !isNaN(Number(val)), {
        message: "Amount must be a number",
      }),
    type: z.enum(["expense", "income"]),
    frequency: z.enum(["one-time", "daily", "weekly", "monthly", "yearly"]),
    date: z.date({
      required_error: "Date is required",
    }),
    icon: z.string().min(1, "Icon is required"),
    subitems: z.array(
      z.object({
        name: z.string().min(1, "Name is required"),
        amount: z
          .string()
          .min(1, "Amount is required")
          .refine((val) => !isNaN(Number(val)), {
            message: "Amount must be a number",
          }),
      }),
    ),
  })
  .refine(
    (data) => {
      const mainAmount = Number(data.amount);
      const subitemsTotal = data.subitems.reduce((sum, item) => sum + Number(item.amount), 0);

      // Allow empty subitems or matching total
      return data.subitems.length === 0 || Math.abs(mainAmount - subitemsTotal) < 0.01;
    },
    {
      message: "Subitems total must equal the main amount",
      path: ["subitems"],
    },
  );

const categories = [
  { value: "salary", label: "Salary" },
  { value: "rent", label: "Rent" },
  { value: "groceries", label: "Groceries" },
  { value: "coffee", label: "Coffee" },
  { value: "credit-card", label: "Credit Card" },
  { value: "investment", label: "Investment" },
  { value: "transportation", label: "Transportation" },
  { value: "dining", label: "Dining" },
  { value: "entertainment", label: "Entertainment" },
  { value: "utilities", label: "Utilities" },
  { value: "shopping", label: "Shopping" },
  { value: "travel", label: "Travel" },
];

const icons = [
  { value: "dollar", icon: DollarSign, label: "Dollar" },
  { value: "home", icon: Home, label: "Home" },
  { value: "shopping", icon: ShoppingBag, label: "Shopping" },
  { value: "coffee", icon: Coffee, label: "Coffee" },
  { value: "card", icon: CreditCard, label: "Card" },
  { value: "wallet", icon: Wallet, label: "Wallet" },
  { value: "badge", icon: BadgeCheck, label: "Badge" },
  { value: "car", icon: Car, label: "Car" },
  { value: "food", icon: Utensils, label: "Food" },
  { value: "gift", icon: Gift, label: "Gift" },
  { value: "phone", icon: Smartphone, label: "Phone" },
  { value: "work", icon: Briefcase, label: "Work" },
  { value: "health", icon: Heart, label: "Health" },
  { value: "travel", icon: Plane, label: "Travel" },
];

export const getIconComponent = (iconName: string) => {
  const icon = icons.find((i) => i.value === iconName);
  if (icon) {
    const IconComponent = icon.icon;
    return <IconComponent className="h-5 w-5" />;
  }
  return <DollarSign className="h-5 w-5" />;
};

export function ExpenseForm({
  open,
  onOpenChange,
  defaultValues,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: any;
  onSubmit: (values: z.infer<typeof formSchema>) => Promise<void>;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues || {
      name: "",
      category: "",
      amount: "",
      type: "expense",
      frequency: "one-time",
      date: new Date(),
      icon: "dollar",
      subitems: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subitems",
  });

  const isLoading = form.formState.isSubmitting;
  const [subitemsTotal, setSubitemsTotal] = useState(0);
  const mainAmount = form.watch("amount") ? Number(form.watch("amount")) : 0;
  const subitems = form.watch("subitems");

  useEffect(() => {
    const total = subitems?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) || 0;
    setSubitemsTotal(total);
  }, [subitems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return open ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-background relative flex h-[80vh] w-full max-w-sm flex-col rounded-lg border shadow-lg sm:max-w-[380px]">
        {/* Sticky header with close button, title, and description */}
        <div className="bg-background sticky top-0 z-10 flex flex-col border-b px-6 pt-6 pb-2">
          <button
            className="ring-offset-background focus:ring-ring absolute top-6 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none"
            onClick={() => onOpenChange(false)}
            type="button"
            aria-label="Close"
            style={{ zIndex: 20 }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="pr-8 text-lg leading-none font-semibold tracking-tight">{defaultValues ? "Edit Transaction" : "Add Transaction"}</div>
          <div className="text-muted-foreground pr-8 text-sm">{defaultValues ? "Edit your transaction details below." : "Add a new transaction to your list."}</div>
        </div>
        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 pt-2 pb-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input className="placeholder:text-sm" placeholder="Transaction name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount</FormLabel>
                      <FormControl>
                        <Input placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue className="placeholder:text-xs" placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              <div className="flex items-center gap-2">{category.label}</div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="one-time">One-time</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icon</FormLabel>
                    <div className="grid grid-cols-7 gap-2">
                      {icons.map((icon) => (
                        <div key={icon.value} className="flex flex-col items-center">
                          <Button
                            type="button"
                            variant={field.value === icon.value ? "default" : "outline"}
                            className={cn("h-10 w-10 rounded-md p-2", field.value === icon.value && "border-text bg-accent border-2")}
                            onClick={() => field.onChange(icon.value)}
                          >
                            <icon.icon className="h-6 w-6" />
                            <span className="sr-only">{icon.label}</span>
                          </Button>
                          <span className="mt-1 text-[0.6rem]">{icon.label}</span>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium">Subitems</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Total: {formatCurrency(subitemsTotal)}</span>
                    {mainAmount > 0 && (
                      <Badge variant={Math.abs(mainAmount - subitemsTotal) < 0.01 ? "outline" : "destructive"}>
                        {Math.abs(mainAmount - subitemsTotal) < 0.01
                          ? "Balanced"
                          : `${formatCurrency(Math.abs(mainAmount - subitemsTotal))} ${mainAmount > subitemsTotal ? "remaining" : "over"}`}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <Card key={field.id}>
                      <CardContent className="p-3">
                        <div className="flex items-end gap-3">
                          <FormField
                            control={form.control}
                            name={`subitems.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormLabel className={cn(index !== 0 && "sr-only")}>Name</FormLabel>
                                <FormControl>
                                  <Input className="placeholder:text-sm" placeholder="Subitem name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`subitems.${index}.amount`}
                            render={({ field }) => (
                              <FormItem className="w-1/3">
                                <FormLabel className={cn(index !== 0 && "sr-only")}>Amount</FormLabel>
                                <FormControl>
                                  <Input placeholder="0.00" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Remove</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => append({ name: "", amount: "" })}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subitem
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                <button
                  type="submit"
                  className="bg-primary hover:bg-primary/90 focus:ring-ring inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {defaultValues ? "Save changes" : "Add transaction"}
                </button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  ) : null;
}
