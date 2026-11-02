"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusCircle, Loader2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import {
  transactionSchema,
  transactionCategories,
  type TransactionInput,
} from "@/lib/validations";
import { createTransactionAction } from "@/lib/actions/transactions";
import type { Account } from "@/types/database";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TransactionSheetProps {
  accounts: Account[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function TransactionSheet({
  accounts,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: TransactionSheetProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;

  const defaultValues: Partial<TransactionInput> = {
    account_id: accounts.length > 0 ? accounts[0].id : "",
    description: "",
    amount: undefined,
    type: "expense",
    category: "general",
    date: new Date().toISOString().split("T")[0],
  };

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: defaultValues as TransactionInput,
  });

  // Keep default account updated if accounts load
  React.useEffect(() => {
    if (accounts.length > 0 && !form.getValues("account_id")) {
      form.setValue("account_id", accounts[0].id);
    }
  }, [accounts, form]);

  const currentType = form.watch("type");

  const onSubmit = async (values: TransactionInput) => {
    if (!values.account_id) {
      toast.error("Please add or select an account first");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createTransactionAction(values);
      if (res.success) {
        toast.success(
          `${values.type === "income" ? "Income" : "Expense"} recorded & balance adjusted`
        );
        form.reset({
          ...defaultValues,
          account_id: values.account_id,
          type: values.type,
        } as TransactionInput);
        setIsOpen?.(false);
      } else {
        toast.error(res.error || "Failed to log transaction");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <SheetTrigger asChild>{trigger}</SheetTrigger>
      ) : !isControlled ? (
        <SheetTrigger asChild>
          <Button size="sm" className="gap-1.5 font-bold shadow-md shadow-primary/20 cursor-pointer">
            <PlusCircle className="h-4 w-4" />
            <span>Log Transaction</span>
          </Button>
        </SheetTrigger>
      ) : null}

      <SheetContent className="overflow-y-auto sm:max-w-md border-l border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl">
        <SheetHeader className="pb-2 border-b border-border/40">
          <SheetTitle className="text-xl font-bold tracking-tight">
            Log Cash Movement
          </SheetTitle>
          <SheetDescription className="text-xs">
            Record revenue inflow or categorized debit. Your target account balance will automatically adjust.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4.5 py-4"
          >
            {/* Type selector: Income or Expense */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Flow Direction</FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={(val) => {
                        field.onChange(val as "income" | "expense");
                        if (val === "income" && form.getValues("category") === "general") {
                          form.setValue("category", "salary");
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2 p-1 rounded-xl bg-muted/60">
                        <TabsTrigger
                          value="expense"
                          className="data-[state=active]:bg-rose-500/15 data-[state=active]:text-rose-500 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          <ArrowDownRight className="h-3.5 w-3.5 mr-1 text-rose-500" />
                          Expense (Debit)
                        </TabsTrigger>
                        <TabsTrigger
                          value="income"
                          className="data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-500 font-bold text-xs rounded-lg cursor-pointer"
                        >
                          <ArrowUpRight className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                          Income (Credit)
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target Account */}
            <FormField
              control={form.control}
              name="account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Target Account</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={accounts.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60">
                        <SelectValue
                          placeholder={
                            accounts.length === 0
                              ? "No accounts available"
                              : "Select an account"
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-border/80">
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="rounded-lg cursor-pointer text-xs">
                          {acc.name} ({acc.type}) - ${Number(acc.balance).toFixed(2)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Description / Payee</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        currentType === "income"
                          ? "e.g. Stripe Payout, Consulting Invoice"
                          : "e.g. Whole Foods Groceries, GitHub Copilot"
                      }
                      className="h-10 rounded-xl text-xs bg-background/60"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="h-10 rounded-xl font-mono text-xs bg-background/60"
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Category</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-border/80">
                      {transactionCategories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="rounded-lg cursor-pointer text-xs">
                          <span className="capitalize">{cat}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Transaction Date</FormLabel>
                  <FormControl>
                    <Input type="date" className="h-10 rounded-xl text-xs bg-background/60 font-mono" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <SheetFooter className="pt-4">
              <Button
                type="submit"
                className="w-full h-10.5 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20 cursor-pointer"
                disabled={isSubmitting || accounts.length === 0}
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {isSubmitting ? "Updating Ledger..." : "Commit Transaction"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
