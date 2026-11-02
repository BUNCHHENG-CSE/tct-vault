"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BarChart3 } from "lucide-react";

interface MonthlyTrajectoryPoint {
  month: string;
  income: number;
  expenses: number;
  savings: number;
}

interface SpendingTrajectoryChartProps {
  data: MonthlyTrajectoryPoint[];
}

export function SpendingTrajectoryChart({ data }: SpendingTrajectoryChartProps) {
  const hasData = data && data.length > 0;

  return (
    <Card className="border-border bg-card shadow-2xs font-mono">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold tracking-tight">
                6-Month Inflow vs Outflow Comparison
              </CardTitle>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground font-semibold">
                HISTORICAL
              </span>
            </div>
            <CardDescription className="text-xs">
              Direct monthly comparison of gross income, debited expenditures, and retained savings.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5">
        {!hasData ? (
          <div className="flex h-[260px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            <BarChart3 className="h-8 w-8 mb-2 opacity-50" />
            <p>No historical trajectory available</p>
          </div>
        ) : (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                  opacity={0.6}
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-border bg-popover/95 p-3 shadow-xl backdrop-blur-md font-mono text-xs space-y-1.5">
                          <p className="font-bold text-foreground border-b border-border/80 pb-1">
                            {label}
                          </p>
                          {payload.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground capitalize">
                                {String(item.name || item.dataKey)}:
                              </span>
                              <span className="font-semibold text-foreground">
                                {formatCurrency(Number(item.value))}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ paddingTop: "12px", fontSize: "11px" }}
                  iconType="circle"
                />
                <Bar dataKey="income" name="Gross Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenditures" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="savings" name="Net Retained" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
