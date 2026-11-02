import * as React from "react";
import { format, subMonths } from "date-fns";
import { Activity, ShieldCheck, TrendingUp, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction } from "@/types/database";
import { convertCurrency } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { BurnRateCard } from "@/components/analytics/burn-rate-card";
import { SpendingTrajectoryChart } from "@/components/analytics/spending-trajectory-chart";
import { SpendingBreakdown } from "@/components/analytics/spending-breakdown-chart";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accounts: Account[] = [];
  let transactions: Transaction[] = [];

  if (user) {
    const [accRes, txRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id),
      supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
    ]);

    accounts = (accRes.data as Account[]) || [];
    transactions = (txRes.data as Transaction[]) || [];
  }

  // 1. Calculate liquid cash in USD (checking and savings accounts)
  const liquidCash = accounts
    .filter((a) => (a.type === "checking" || a.type === "savings") && Number(a.balance) > 0)
    .reduce(
      (sum, a) => sum + convertCurrency(Number(a.balance), a.currency || "USD", "USD"),
      0
    );

  // 2. Compute 6-Month Trajectory Points
  const now = new Date();
  const monthsData: { month: string; income: number; expenses: number; savings: number }[] = [];
  let totalExpensesPastMonths = 0;
  let activeExpenseMonths = 0;

  for (let i = 5; i >= 0; i--) {
    const targetMonth = subMonths(now, i);
    const yyyyMm = format(targetMonth, "yyyy-MM");
    const label = format(targetMonth, "MMM yyyy");

    const monthTxs = transactions.filter((tx) => tx.date.startsWith(yyyyMm));
    
    // Ignore internal transfers so they don't distort inflow/outflow
    const monthIncome = monthTxs
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const monthExpense = monthTxs
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    if (monthExpense > 0) {
      totalExpensesPastMonths += monthExpense;
      activeExpenseMonths++;
    }

    monthsData.push({
      month: label,
      income: Number(monthIncome.toFixed(2)),
      expenses: Number(monthExpense.toFixed(2)),
      savings: Number((monthIncome - monthExpense).toFixed(2)),
    });
  }

  // Average monthly burn rate
  const avgMonthlyBurn =
    activeExpenseMonths > 0
      ? Number((totalExpensesPastMonths / activeExpenseMonths).toFixed(2))
      : 3000;

  // Current month metrics
  const currentYm = format(now, "yyyy-MM");
  const currentMonthTxs = transactions.filter((tx) => tx.date.startsWith(currentYm));
  const currentMonthIncome = currentMonthTxs
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const currentMonthExpense = currentMonthTxs
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  // 3. Category Outflow Breakdown (for all expense transactions)
  const catMap: Record<string, number> = {};
  let totalExpenseVolume = 0;

  const expenseTxs = transactions.filter((tx) => tx.type === "expense");
  expenseTxs.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    catMap[tx.category] = (catMap[tx.category] || 0) + amt;
    totalExpenseVolume += amt;
  });

  const categories = Object.entries(catMap)
    .map(([category, total]) => ({
      category,
      total: Number(total.toFixed(2)),
      percentage: totalExpenseVolume > 0 ? Math.round((total / totalExpenseVolume) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // 4. Top Merchants / Payees
  const merchantMap: Record<string, { count: number; total: number }> = {};
  expenseTxs.forEach((tx) => {
    const desc = tx.description.trim();
    if (!merchantMap[desc]) {
      merchantMap[desc] = { count: 0, total: 0 };
    }
    merchantMap[desc].count++;
    merchantMap[desc].total += Number(tx.amount) || 0;
  });

  const topMerchants = Object.entries(merchantMap)
    .map(([merchant, data]) => ({
      merchant,
      count: data.count,
      total: Number(data.total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              Vault Intelligence & Financial Runway
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              Algorithmic Health
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Burn velocity metrics, cash survival horizon, and comprehensive cashflow analytics.
          </p>
        </div>
      </div>

      {/* Runway & Burn Rate Index */}
      <BurnRateCard
        liquidCash={liquidCash}
        monthlyBurn={avgMonthlyBurn}
        monthlyIncome={currentMonthIncome || 5000}
      />

      {/* Trajectory comparison */}
      <SpendingTrajectoryChart data={monthsData} />

      {/* Categories & Merchants */}
      <SpendingBreakdown categories={categories} topMerchants={topMerchants} />
    </div>
  );
}
