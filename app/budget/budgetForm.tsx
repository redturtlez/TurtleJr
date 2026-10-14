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
  CalendarDays,
  X,
  ArrowDownRight,
  ArrowUpRight,
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
import { Badge } from "@/components/ui/badge";
import styles from "./budget.module.css";

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

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [onOpenChange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return open ? (
    <div className={styles.modalBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onOpenChange(false); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="transaction-form-title">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={styles.modalForm}>
            <header className={styles.modalHeader}>
              <div>
                <span>{defaultValues ? "Update your ledger" : "New ledger entry"}</span>
                <h2 id="transaction-form-title">{defaultValues ? "Edit transaction" : "Add transaction"}</h2>
                <p>{defaultValues ? "Adjust the details for this entry." : "Record income or spending in a few quick steps."}</p>
              </div>
              <button className={styles.modalClose} onClick={() => onOpenChange(false)} type="button" aria-label="Close transaction form">
                <X />
              </button>
            </header>

            <div className={styles.modalBody}>
              <section className={styles.formSection}>
                <div className={styles.sectionHeading}><span>01</span><div><h3>Transaction details</h3><p>What happened and when.</p></div></div>
                <div className={styles.formGrid}>
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className={styles.wideField}>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Weekly groceries" {...field} />
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
                        <div className={styles.amountInput}><span>$</span><Input inputMode="decimal" placeholder="0.00" {...field} /></div>
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
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn(styles.dateButton, !field.value && "text-muted-foreground")}>
                              <CalendarDays />
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
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}><span>02</span><div><h3>Classification</h3><p>Choose how this entry appears in your budget.</p></div></div>
                <FormField control={form.control} name="type" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction type</FormLabel>
                    <div className={styles.typePicker}>
                      <button type="button" data-active={field.value === "expense"} onClick={() => field.onChange("expense")}><ArrowDownRight />Expense</button>
                      <button type="button" data-active={field.value === "income"} onClick={() => field.onChange("income")}><ArrowUpRight />Income</button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="icon" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ledger icon</FormLabel>
                    <div className={styles.iconPicker}>
                      {icons.map((icon) => (
                        <button key={icon.value} type="button" title={icon.label} aria-label={icon.label} aria-pressed={field.value === icon.value} data-active={field.value === icon.value} onClick={() => field.onChange(icon.value)}>
                          <icon.icon />
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </section>

              <section className={styles.formSection}>
                <div className={styles.breakdownHeading}>
                  <div className={styles.sectionHeading}><span>03</span><div><h3>Optional breakdown</h3><p>Split the amount into smaller line items.</p></div></div>
                  <div className={styles.subitemTotal}>
                    <span>{formatCurrency(subitemsTotal)} of {formatCurrency(mainAmount)}</span>
                    {mainAmount > 0 && (
                      <Badge variant={Math.abs(mainAmount - subitemsTotal) < 0.01 ? "outline" : "destructive"}>
                        {Math.abs(mainAmount - subitemsTotal) < 0.01
                          ? "Balanced"
                          : `${formatCurrency(Math.abs(mainAmount - subitemsTotal))} ${mainAmount > subitemsTotal ? "remaining" : "over"}`}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className={styles.subitems}>
                  {fields.map((field, index) => (
                    <div className={styles.subitem} key={field.id}>
                          <FormField
                            control={form.control}
                            name={`subitems.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={cn(index !== 0 && "sr-only")}>Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Line item" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`subitems.${index}.amount`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={cn(index !== 0 && "sr-only")}>Amount</FormLabel>
                                <FormControl>
                                  <div className={styles.amountInput}><span>$</span><Input inputMode="decimal" placeholder="0.00" {...field} /></div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label={`Remove subitem ${index + 1}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                    </div>
                  ))}

                  <button type="button" className={styles.addSubitem} onClick={() => append({ name: "", amount: "" })}><Plus />Add a line item</button>
                </div>
              </section>
            </div>

              <footer className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => onOpenChange(false)}>Cancel</button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {defaultValues ? "Save changes" : "Add transaction"}
                </button>
              </footer>
          </form>
        </Form>
      </div>
    </div>
  ) : null;
}
