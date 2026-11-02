import * as React from "react";
import Link from "next/link";
import { format, subMonths } from "date-fns";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Flame,
  ArrowRight,
  Receipt,
  Utensils,
  Home,
  Laptop,
  Tv,
  ShoppingBag,
  Zap,
  Briefcase,
  Activity,
  PiggyBank,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Account, Transaction, Subscription, Goal } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { convertCurrency } from "@/lib/currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart";
import { SeedButton } from "@/components/dashboard/seed-button";
import { TransactionSheet } from "@/components/transactions/transaction-sheet";
import { AccountDialog } from "@/components/accounts/account-dialog";
import { TransferDialog } from "@/components/transactions/transfer-dialog";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  salary: Briefcase,
  freelance: Zap,
  housing: Home,
  food: Utensils,
  utilities: Zap,
  software: Laptop,
  entertainment: Tv,
  shopping: ShoppingBag,
  general: Receipt,
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let accounts: Account[] = [];
  let transactions: (Transaction & { accounts?: Pick<Account, "name" | "type"> })[] = [];
  let subscriptions: Subscription[] = [];
  let goals: Goal[] = [];

  if (user) {
    const [accRes, txRes, subRes, goalRes] = await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("transactions")
        .select("*, accounts(name, type)")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id),
      supabase
        .from("goals")
        .select("*")
        .eq("user_id", user.id),
    ]);

    accounts = (accRes.data as Account[]) || [];
    transactions = (txRes.data as unknown as (Transaction & { accounts?: Pick<Account, "name" | "type"> })[]) || [];
    subscriptions = (subRes.data as Subscription[]) || [];
    goals = (goalRes.data as Goal[]) || [];
  }

  // 1. KPI: Total Net Worth normalized in USD
  const netWorth = accounts.reduce(
    (sum, acc) =>
      sum + convertCurrency(Number(acc.balance), acc.currency || "USD", "USD"),
    0
  );

  // Asset vs Liability breakdown
  const totalAssets = accounts
    .filter((a) => a.type !== "credit" && Number(a.balance) > 0)
    .reduce(
      (sum, a) =>
        sum + convertCurrency(Number(a.balance), a.currency || "USD", "USD"),
      0
    );

  const totalLiabilities = accounts
    .filter((a) => a.type === "credit" || Number(a.balance) < 0)
    .reduce(
      (sum, a) =>
        sum +
        convertCurrency(
          Math.abs(Number(a.balance)),
          a.currency || "USD",
          "USD"
        ),
      0
    );

  // Liquid cash reserves (checking + savings)
  const liquidCash = accounts
    .filter(
      (a) =>
        (a.type === "checking" || a.type === "savings") && Number(a.balance) > 0
    )
    .reduce(
      (sum, a) =>
        sum + convertCurrency(Number(a.balance), a.currency || "USD", "USD"),
      0
    );

  // 2 & 3. KPIs: Current Month Income & Expenses
  const now = new Date();
  const currentYearMonth = format(now, "yyyy-MM");

  const currentMonthTransactions = transactions.filter((tx) =>
    tx.date.startsWith(currentYearMonth)
  );

  const monthlyIncome = currentMonthTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const monthlyExpenses = currentMonthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + Number(tx.amount), 0);

  const netSavingsRate = monthlyIncome > 0
    ? Math.max(0, Math.round(((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100))
    : 0;

  // 4. KPI: Subscriptions Fixed Burn
  const monthlyBurn = subscriptions
    .filter((sub) => sub.status === "active")
    .reduce((sum, sub) => sum + Number(sub.amount), 0);

  // Cashflow historical data for last 6 months
  const cashflowData = Array.from({ length: 6 }).map((_, i) => {
    const d = subMonths(now, 5 - i);
    const prefix = format(d, "yyyy-MM");
    const monthLabel = format(d, "MMM yyyy");

    const monthTxs = transactions.filter((tx) => tx.date.startsWith(prefix));
    const income = monthTxs
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const expenses = monthTxs
      .filter((tx) => tx.type === "expense")
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      month: monthLabel,
      income: Number(income.toFixed(2)),
      expenses: Number(expenses.toFixed(2)),
    };
  });

  // Current Month Category Breakdown for Donut Chart
  const categorySpendMap: Record<string, number> = {};
  currentMonthTransactions
    .filter((tx) => tx.type === "expense")
    .forEach((tx) => {
      categorySpendMap[tx.category] =
        (categorySpendMap[tx.category] || 0) + Number(tx.amount);
    });

  const categorySpendData = Object.entries(categorySpendMap).map(
    ([category, amount]) => ({
      category,
      amount: Number(amount.toFixed(2)),
    })
  );

  const isZeroState = accounts.length === 0;

  return (
    <div className="space-y-6">
      {/* Top Welcome & Actions Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono">
              Financial Cockpit
            </h1>
            <Badge variant="outline" className="font-mono text-xs px-2 py-0.5">
              {format(now, "MMMM yyyy")}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            Real-time balance telemetry, algorithmic cashflow, and recurring subscription burn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <TransferDialog accounts={accounts} />
          <AccountDialog />
          <TransactionSheet accounts={accounts} />
          {!isZeroState && (
            <SeedButton variant="outline" size="sm" />
          )}
        </div>
      </div>

      {/* Prominent Zero State Onboarding Banner */}
      {isZeroState && (
        <Card className="border-border bg-card p-6 md:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl font-mono">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-xs">
                  PORTFOLIO INITIALIZATION
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Vault is empty
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                Load Realistic Demo Portfolio in 1 Click
              </h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Populate 3 accounts (Checking, Savings, Platinum Credit), 12 realistic income/expense transactions, 5 recurring subscriptions, and 4 monthly category limits to test out all terminal features immediately.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
              <SeedButton size="lg" />
              <AccountDialog
                trigger={
                  <Button variant="outline" size="lg">
                    Add Account Manually
                  </Button>
                }
              />
            </div>
          </div>
        </Card>
      )}

      {/* Hero Net Worth Card + 3 Secondary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-mono">
        {/* Total Net Worth */}
        <Card className="border-border bg-card shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Total Net Worth
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-muted text-foreground border border-border flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-foreground">
              {formatCurrency(netWorth)}
            </div>
            <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-muted-foreground border-t border-border pt-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+{formatCurrency(totalAssets)} assets</span>
              <span>•</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">-{formatCurrency(totalLiabilities)} debt</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Inflow */}
        <Card className="border-border bg-card shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Monthly Inflow
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(monthlyIncome)}
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground border-t border-border pt-2">
              <span>Savings Rate:</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{netSavingsRate}% saved</span>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Outflow */}
        <Card className="border-border bg-card shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Monthly Outflow
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-rose-600 dark:text-rose-400">
              -{formatCurrency(monthlyExpenses)}
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground border-t border-border pt-2">
              <span>Debits:</span>
              <span className="font-semibold text-foreground">
                {currentMonthTransactions.filter((tx) => tx.type === "expense").length} events
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Fixed Burn */}
        <Card className="border-border bg-card shadow-2xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
              Subscriptions Burn
            </CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Flame className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold font-mono tracking-tight text-amber-600 dark:text-amber-400">
              {formatCurrency(monthlyBurn)}
              <span className="text-xs font-normal text-muted-foreground ml-1">/mo</span>
            </div>
            <div className="mt-2 flex items-center justify-between font-mono text-[11px] text-muted-foreground border-t border-border pt-2">
              <span>Annual:</span>
              <span className="font-semibold text-foreground">{formatCurrency(monthlyBurn * 12)}/yr</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intelligence & Goals Quick Banner */}
      <div className="grid gap-4 sm:grid-cols-2 font-mono">
        <Link href="/analytics" className="group">
          <Card className="border-border bg-card/60 hover:bg-card hover:border-border/80 transition-all shadow-2xs p-4 flex items-center justify-between rounded-xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                <Activity className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Runway Intelligence & Burn Velocity
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Liquid reserves: {formatCurrency(liquidCash)} • {(liquidCash / Math.max(1, monthlyExpenses || 3000)).toFixed(1)} mo horizon
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
          </Card>
        </Link>

        <Link href="/goals" className="group">
          <Card className="border-border bg-card/60 hover:bg-card hover:border-border/80 transition-all shadow-2xs p-4 flex items-center justify-between rounded-xl">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <PiggyBank className="h-4.5 w-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                  Savings Goals & Target Reserves
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {goals.length} target funds • {goals.filter((g) => Number(g.current_amount) >= Number(g.target_amount)).length} milestones achieved
                </p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 group-hover:text-primary transition-all" />
          </Card>
        </Link>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        <CashflowChart data={cashflowData} />
        <CategoryPieChart data={categorySpendData} />
      </div>

      {/* Recent Ledger Transactions */}
      <Card className="border-border bg-card shadow-2xs overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold tracking-tight font-mono">
                Recent Ledger Activity
              </CardTitle>
              <Badge variant="outline" className="font-mono text-[9px] px-1.5 py-0">
                LIVE
              </Badge>
            </div>
            <CardDescription className="text-xs font-mono">
              Latest cash movements synchronized to encrypted storage
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-xs cursor-pointer">
            <a href="/transactions" className="flex items-center gap-1 font-semibold">
              Full Ledger <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
            </a>
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground font-mono space-y-1">
              <p className="font-medium text-foreground">No transactions logged yet</p>
              <p className="text-[11px]">Use &quot;Log Transaction&quot; or press <kbd className="text-foreground">⌘K</kbd> to record cashflow.</p>
            </div>
          ) : (
            <div className="divide-y divide-border font-mono">
              {transactions.slice(0, 6).map((tx) => {
                const isIncome = tx.type === "income";
                const CategoryIcon = CATEGORY_ICONS[tx.category.toLowerCase()] || Receipt;

                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8.5 w-8.5 rounded-lg flex items-center justify-center border shrink-0 ${
                          isIncome
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        <CategoryIcon className="h-4 w-4" />
                      </div>

                      <div className="flex flex-col">
                        <span className="font-semibold text-xs text-foreground">
                          {tx.description}
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mt-0.5">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span className="capitalize">{tx.category}</span>
                          <span>•</span>
                          <span>{tx.accounts?.name || "Account"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`text-sm font-extrabold tracking-tight ${
                          isIncome ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
                        }`}
                      >
                        {isIncome ? "+" : "-"}
                        {formatCurrency(Number(tx.amount))}
                      </div>
                      <span className="text-[9px] uppercase text-muted-foreground">
                        {isIncome ? "Inflow" : "Outflow"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
