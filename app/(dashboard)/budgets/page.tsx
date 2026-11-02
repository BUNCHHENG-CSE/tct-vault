import * as React from "react";
import { format, getDaysInMonth, getDate } from "date-fns";
import { Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Budget, BudgetWithSpending, Transaction } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BudgetCard } from "@/components/budgets/budget-card";
import { BudgetDialog } from "@/components/budgets/budget-dialog";

export default async function BudgetsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rawBudgets: Budget[] = [];
  let transactions: Transaction[] = [];

  const now = new Date();
  const currentYearMonth = format(now, "yyyy-MM");
  const totalDaysInMonth = getDaysInMonth(now);
  const currentDay = getDate(now);
  const remainingDays = Math.max(1, totalDaysInMonth - currentDay + 1);

  if (user) {
    const [budgetRes, txRes] = await Promise.all([
      supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .gte("date", `${currentYearMonth}-01`),
    ]);

    rawBudgets = (budgetRes.data as Budget[]) || [];
    transactions = (txRes.data as Transaction[]) || [];
  }

  // Calculate spent per category for current month
  const categorySpentMap: Record<string, number> = {};
  transactions.forEach((tx) => {
    categorySpentMap[tx.category] =
      (categorySpentMap[tx.category] || 0) + Number(tx.amount);
  });

  const budgetsWithSpending: BudgetWithSpending[] = rawBudgets.map((b) => {
    const spent = categorySpentMap[b.category] || 0;
    const limit = Number(b.monthly_limit);
    const percentage = limit > 0 ? (spent / limit) * 100 : 0;
    const remaining = Math.max(0, limit - spent);

    return {
      ...b,
      monthly_limit: limit,
      spent: Number(spent.toFixed(2)),
      percentage: Number(percentage.toFixed(1)),
      remaining: Number(remaining.toFixed(2)),
    };
  });

  // Overall totals across all budgets
  const totalLimit = budgetsWithSpending.reduce(
    (sum, b) => sum + b.monthly_limit,
    0
  );
  const totalSpent = budgetsWithSpending.reduce(
    (sum, b) => sum + b.spent,
    0
  );
  const totalRemaining = Math.max(0, totalLimit - totalSpent);
  const overallPercentage =
    totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0;

  // Safe daily allowance calculation for rest of month
  const safeDailyAllowance = totalRemaining > 0 ? totalRemaining / remainingDays : 0;

  const isOverallWarning =
    totalLimit > 0 && totalSpent / totalLimit >= 0.8 && totalSpent <= totalLimit;
  const isOverallOver = totalLimit > 0 && totalSpent > totalLimit;

  return (
    <div className="space-y-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Spending Ceilings
            </h1>
            <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
              {format(now, "MMMM yyyy")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time category spending thresholds with automated 80% & 100% threshold telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <BudgetDialog />
        </div>
      </div>

      {/* Monthly Budget Summary Card */}
      <Card className="border-border bg-card shadow-2xs rounded-xl">
        <CardContent className="p-5 md:p-6">
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex items-center gap-3.5">
                <div className="h-12 w-12 rounded-xl bg-muted border border-border flex items-center justify-center text-foreground shadow-2xs">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                    Aggregate Spending vs Ceiling
                  </p>
                  <h2 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-foreground">
                    {formatCurrency(totalSpent)}
                    <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-2 font-mono">
                      / {formatCurrency(totalLimit)}
                    </span>
                  </h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2">
                  <span className="text-muted-foreground text-[10px] block font-semibold uppercase">Remaining Room</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalRemaining)}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2">
                  <span className="text-muted-foreground text-[10px] block font-semibold uppercase">Daily Safe Burn</span>
                  <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
                    {formatCurrency(safeDailyAllowance)}/day
                  </span>
                </div>
              </div>
            </div>

            {/* Global progress */}
            <div className="space-y-2 pt-2 border-t border-border">
              <Progress
                value={overallPercentage}
                className="h-2.5 bg-muted rounded-full"
                indicatorClassName={
                  isOverallOver
                    ? "bg-rose-500"
                    : isOverallWarning
                    ? "bg-amber-500"
                    : "bg-emerald-500"
                }
              />
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-0.5">
                <span className="font-semibold text-foreground">
                  {overallPercentage.toFixed(0)}% consumed
                </span>
                <span>
                  {remainingDays} days left in cycle • {budgetsWithSpending.length} ceilings set
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid of Category Budgets */}
      {budgetsWithSpending.length === 0 ? (
        <Card className="border-dashed border-border p-10 text-center bg-card/60">
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">
              No category ceilings established
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Keep lifestyle inflation in check by establishing spending limits for Groceries, Dining, Software, or Housing.
            </p>
            <div className="pt-2">
              <BudgetDialog />
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgetsWithSpending.map((budget) => (
            <BudgetCard key={budget.id} budget={budget} />
          ))}
        </div>
      )}
    </div>
  );
}
