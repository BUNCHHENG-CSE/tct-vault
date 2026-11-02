"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2 } from "lucide-react";
import { transferSchema, type TransferInput } from "@/lib/validations";
import { transferBetweenAccountsAction } from "@/lib/actions/transactions";
import type { Account } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
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

interface TransferDialogProps {
  accounts: Account[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function TransferDialog({
  accounts,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: TransferDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;

  const defaultFrom = accounts[0]?.id || "";
  const defaultTo = accounts[1]?.id || "";

  const form = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      from_account_id: defaultFrom,
      to_account_id: defaultTo,
      amount: 100,
      date: new Date().toISOString().slice(0, 10),
      description: "",
    },
  });

  const selectedFromId = form.watch("from_account_id");
  const selectedFromAcc = accounts.find((a) => a.id === selectedFromId);

  const onSubmit = async (values: TransferInput) => {
    setIsSubmitting(true);
    try {
      const res = await transferBetweenAccountsAction(values);
      if (res.success) {
        toast.success("Transfer executed successfully");
        form.reset({
          from_account_id: defaultFrom,
          to_account_id: defaultTo,
          amount: 100,
          date: new Date().toISOString().slice(0, 10),
          description: "",
        });
        setIsOpen?.(false);
      } else {
        toast.error(res.error || "Failed to execute transfer");
      }
    } catch {
      toast.error("An unexpected error occurred during transfer");
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 font-mono text-xs border-border/80 hover:bg-muted"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            <span>Transfer Funds</span>
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold font-mono">
                Inter-Account Vault Transfer
              </DialogTitle>
              <DialogDescription className="text-xs font-mono">
                Rebalance balances between accounts without impacting income or expense cashflow.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            {/* From Account */}
            <FormField
              control={form.control}
              name="from_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono font-semibold">
                    Source Account (Debited)
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10 rounded-xl text-xs font-mono bg-background/60">
                        <SelectValue placeholder="Select origin account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-border">
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="text-xs font-mono">
                          {acc.name} ({formatCurrency(Number(acc.balance), acc.currency)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* To Account */}
            <FormField
              control={form.control}
              name="to_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono font-semibold">
                    Destination Account (Credited)
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="h-10 rounded-xl text-xs font-mono bg-background/60">
                        <SelectValue placeholder="Select destination account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-border">
                      {accounts
                        .filter((acc) => acc.id !== selectedFromId)
                        .map((acc) => (
                          <SelectItem key={acc.id} value={acc.id} className="text-xs font-mono">
                            {acc.name} ({formatCurrency(Number(acc.balance), acc.currency)})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono font-semibold">
                      Transfer Amount ($)
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

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-mono font-semibold">
                      Execution Date
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-10 rounded-xl font-mono text-xs bg-background/60"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Memo */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-mono font-semibold">
                    Memo / Note (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Monthly emergency reserve deposit, Credit card payment"
                      className="h-10 rounded-xl text-xs font-mono bg-background/60"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting || accounts.length < 2}
                className="w-full h-10 rounded-xl gap-2 font-mono text-xs font-bold"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing Ledger Transfer...</span>
                  </>
                ) : (
                  <>
                    <ArrowLeftRight className="h-4 w-4" />
                    <span>Confirm Transfer</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
