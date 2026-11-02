"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface CashflowPoint {
  month: string;
  income: number;
  expenses: number;
}

interface CashflowChartProps {
  data: CashflowPoint[];
}

export function CashflowChart({ data }: CashflowChartProps) {
  const hasData = data && data.length > 0 && data.some((d) => d.income > 0 || d.expenses > 0);

  const totalIncome = data?.reduce((acc, curr) => acc + curr.income, 0) || 0;
  const totalExpense = data?.reduce((acc, curr) => acc + curr.expenses, 0) || 0;
  const netSavings = totalIncome - totalExpense;

  return (
    <Card className="border-border bg-card shadow-2xs col-span-full lg:col-span-4 overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 gap-4 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-bold tracking-tight font-mono">
              Cashflow Analytics
            </CardTitle>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground font-semibold">
              6-MONTH TRAJECTORY
            </span>
          </div>
          <CardDescription className="text-xs font-mono">
            Historical inflow vs expense burn velocity
          </CardDescription>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 text-[11px] font-mono font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span>Income</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-rose-500/25 bg-rose-500/10 text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            <span>Expenses</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {!hasData ? (
          <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mb-2">
              <TrendingUp className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No historical cashflow recorded yet</p>
            <p className="mt-1 text-[11px] max-w-xs text-muted-foreground">
              Add transactions or generate demo portfolio data to view dynamic trajectories.
            </p>
          </div>
        ) : (
          <div>
            <div className="h-[270px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorIncomeV2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="90%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExpenseV2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="90%" stopColor="#f43f5e" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--border)"
                    strokeOpacity={0.6}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={false}
                    dy={6}
                  />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) =>
                      `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                    }
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const inc = Number(payload[0]?.value || 0);
                        const exp = Number(payload[1]?.value || 0);
                        const delta = inc - exp;
                        return (
                          <div className="rounded-lg border border-border bg-popover text-popover-foreground p-3 shadow-xl backdrop-blur-md text-xs font-mono space-y-2 min-w-[170px]">
                            <div className="flex items-center justify-between border-b border-border pb-1.5">
                              <span className="font-bold">{label}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${delta >= 0 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"}`}>
                                {delta >= 0 ? `+${formatCurrency(delta)}` : formatCurrency(delta)}
                              </span>
                            </div>
                            <div className="space-y-1 text-[11px]">
                              <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Income
                                </span>
                                <span>+{formatCurrency(inc)}</span>
                              </div>
                              <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 font-semibold">
                                <span className="flex items-center gap-1.5">
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                  Expenses
                                </span>
                                <span>-{formatCurrency(exp)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIncomeV2)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expenses"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorExpenseV2)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bottom summary strip */}
            <div className="mt-3.5 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground">6-Mo Inflow:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">+{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border border-border">
                <span className="text-muted-foreground">6-Mo Net Margin:</span>
                <span className={`font-bold ${netSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {netSavings >= 0 ? "+" : ""}{formatCurrency(netSavings)}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
