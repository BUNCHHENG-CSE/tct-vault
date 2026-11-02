"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusCircle, Edit2, Loader2, CreditCard, Landmark, PiggyBank, TrendingUp } from "lucide-react";
import { accountSchema, type AccountInput } from "@/lib/validations";
import { createAccountAction, updateAccountAction } from "@/lib/actions/accounts";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import type { Account } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

interface AccountDialogProps {
  account?: Account;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function AccountDialog({
  account,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: AccountDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;
  const isEditing = !!account;

  const form = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      name: account?.name || "",
      type: account?.type || "checking",
      balance: account?.balance !== undefined ? Number(account.balance) : 0,
      currency: account?.currency || "USD",
    },
  });

  React.useEffect(() => {
    if (account) {
      form.reset({
        name: account.name,
        type: account.type,
        balance: Number(account.balance),
        currency: account.currency || "USD",
      });
    }
  }, [account, form]);

  const onSubmit = async (values: AccountInput) => {
    setIsSubmitting(true);
    try {
      const res = isEditing && account
        ? await updateAccountAction(account.id, values)
        : await createAccountAction(values);

      if (res.success) {
        toast.success(
          isEditing ? "Account updated successfully" : "New account created in vault"
        );
        if (!isEditing) {
          form.reset({ name: "", type: "checking", balance: 0, currency: "USD" });
        }
        setIsOpen?.(false);
      } else {
        toast.error(res.error || "Failed to save account");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          {isEditing ? (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg">
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5 font-bold shadow-md shadow-primary/20 cursor-pointer">
              <PlusCircle className="h-4 w-4" />
              <span>Add Account</span>
            </Button>
          )}
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            {isEditing ? "Edit Account" : "Register Financial Account"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {isEditing
              ? "Update your account designation and current balance."
              : "Register a checking depository, savings pool, credit card, or brokerage portfolio."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Account Label</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Chase Sapphire Checking, Amex Gold"
                      className="h-10 rounded-xl text-xs bg-background/60"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Account Classification</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-border/80">
                      <SelectItem value="checking" className="rounded-lg cursor-pointer">
                        Checking (Daily Liquid Cashflow)
                      </SelectItem>
                      <SelectItem value="savings" className="rounded-lg cursor-pointer">
                        Savings (High-Yield & Reserves)
                      </SelectItem>
                      <SelectItem value="credit" className="rounded-lg cursor-pointer">
                        Credit Card (Revolving Balance)
                      </SelectItem>
                      <SelectItem value="investment" className="rounded-lg cursor-pointer">
                        Investment / Brokerage (Equities & Crypto)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Base Currency</FormLabel>
                    <Select
                      value={field.value || "USD"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60">
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-border/80">
                        {Object.values(SUPPORTED_CURRENCIES).map((c) => (
                          <SelectItem key={c.code} value={c.code} className="rounded-lg cursor-pointer">
                            {c.code} ({c.symbol}) - {c.name}
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
                name="balance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">
                      {form.watch("type") === "credit"
                        ? "Current Balance / Debt"
                        : "Starting Balance"}
                    </FormLabel>
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
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full h-10.5 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20 cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting
                  ? "Saving to Ledger..."
                  : isEditing
                  ? "Save Changes"
                  : "Register Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
