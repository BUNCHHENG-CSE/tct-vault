"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  CheckCircle2,
  Wallet,
  Zap,
} from "lucide-react";
import { contributeToGoalAction } from "@/lib/actions/goals";
import type { Goal, Account } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface GoalContributeDialogProps {
  goal: Goal;
  accounts?: Account[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAmount?: number;
  defaultType?: "deposit" | "withdraw";
}

export function GoalContributeDialog({
  goal,
  accounts = [],
  open,
  onOpenChange,
  defaultAmount = 100,
  defaultType = "deposit",
}: GoalContributeDialogProps) {
  const [type, setType] = React.useState<"deposit" | "withdraw">(defaultType);
  const [amount, setAmount] = React.useState<number>(defaultAmount);
  const [selectedAccountId, setSelectedAccountId] = React.useState<string>(
    goal.account_id || accounts[0]?.id || ""
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Sync state whenever the dialog opens with defaults
  const [prevOpen, setPrevOpen] = React.useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setType(defaultType);
      setAmount(defaultAmount);
      setSelectedAccountId(goal.account_id || accounts[0]?.id || "");
    }
  }

  const targetAmount = Number(goal.target_amount) || 1;
  const currentAmount = Number(goal.current_amount) || 0;
  const currentPercentage = Math.min(100, Math.round((currentAmount / targetAmount) * 100));
  const remaining = Math.max(0, targetAmount - currentAmount);

  // Calculate projected values
  const delta = type === "deposit" ? (amount || 0) : -(amount || 0);
  const projectedAmount = Math.max(0, currentAmount + delta);
  const projectedPercentage = Math.min(100, Math.round((projectedAmount / targetAmount) * 100));
  const willComplete = projectedAmount >= targetAmount;

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  const handlePresetClick = (presetVal: number) => {
    setAmount(presetVal);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await contributeToGoalAction({
        goal_id: goal.id,
        amount,
        type,
        account_id: selectedAccountId || undefined,
      });

      if (res.success) {
        toast.success(
          type === "deposit"
            ? `Successfully allocated ${formatCurrency(amount)} into ${goal.name}`
            : `Withdrew ${formatCurrency(amount)} from ${goal.name}`
        );
        onOpenChange(false);
      } else {
        toast.error(res.error || "Failed to update target reserve funds");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card shadow-2xl font-mono">
        <DialogHeader className="pb-1">
          <div className="flex items-center gap-2">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                type === "deposit"
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}
            >
              {type === "deposit" ? (
                <ArrowDownLeft className="h-4.5 w-4.5" />
              ) : (
                <ArrowUpRight className="h-4.5 w-4.5" />
              )}
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight">
                {type === "deposit" ? "Allocate Capital to Reserve" : "Withdraw from Reserve"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Target: <span className="text-foreground font-semibold">{goal.name}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Deposit / Withdraw Tabs */}
          <Tabs
            value={type}
            onValueChange={(val) => setType(val as "deposit" | "withdraw")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 h-9 p-0.5 rounded-xl bg-muted/60 border border-border">
              <TabsTrigger
                value="deposit"
                className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-emerald-400 data-[state=active]:shadow-2xs transition-all"
              >
                + Capital Allocation
              </TabsTrigger>
              <TabsTrigger
                value="withdraw"
                className="text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-rose-400 data-[state=active]:shadow-2xs transition-all"
              >
                - Capital Withdrawal
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Amount Input with Quick Preset Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground">
                Transfer Amount ($)
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Current: <strong className="text-foreground">{formatCurrency(currentAmount)}</strong>
              </span>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground font-bold">
                $
              </div>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount === 0 ? "" : amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="h-11 pl-7 rounded-xl text-base font-mono font-bold bg-background/60 border-border focus-visible:ring-emerald-500"
                autoFocus
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[25, 50, 100, 250, 500].map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => handlePresetClick(preset)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg border font-mono transition-all ${
                    amount === preset
                      ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400 font-bold"
                      : "border-border/60 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  +${preset}
                </button>
              ))}
              {type === "deposit" && remaining > 0 && (
                <button
                  type="button"
                  onClick={() => handlePresetClick(remaining)}
                  className="px-2.5 py-1 text-[11px] rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 font-bold transition-all ml-auto"
                >
                  Full Shortfall (${remaining.toLocaleString()})
                </button>
              )}
            </div>
          </div>

          {/* Live Impact Preview Card */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span>Projected Reserve Balance</span>
              </span>
              <span className="text-foreground font-extrabold text-sm">
                {formatCurrency(projectedAmount)}
              </span>
            </div>

            <div className="space-y-1">
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    willComplete
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${projectedPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>
                  {currentPercentage}% → <strong className="text-foreground">{projectedPercentage}%</strong> of target
                </span>
                <span>
                  {willComplete ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Target Met!
                    </span>
                  ) : (
                    `${formatCurrency(Math.max(0, targetAmount - projectedAmount))} to go`
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Account selector */}
          {accounts.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  <span>
                    {type === "deposit" ? "Source Depository (Debit)" : "Destination Depository (Credit)"}
                  </span>
                </Label>
                {selectedAccount && (
                  <span className="text-[10px] text-muted-foreground">
                    Avail: <strong className="text-foreground">{formatCurrency(Number(selectedAccount.balance))}</strong>
                  </span>
                )}
              </div>

              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60 border-border">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border bg-card">
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id} className="text-xs font-mono">
                      {acc.name} ({formatCurrency(Number(acc.balance), acc.currency)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || amount <= 0}
              className={`w-full h-10 rounded-xl gap-2 font-mono text-xs font-bold transition-all shadow-md ${
                type === "deposit"
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20"
                  : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20"
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : type === "deposit" ? (
                <>
                  <ArrowDownLeft className="h-4 w-4" />
                  <span>Execute Allocation (+{formatCurrency(amount)})</span>
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-4 w-4" />
                  <span>Execute Withdrawal (-{formatCurrency(amount)})</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}