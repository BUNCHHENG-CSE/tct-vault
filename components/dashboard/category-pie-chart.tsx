"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { PieChart as PieIcon } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  housing: "#6366f1", // Indigo
  food: "#f59e0b", // Amber
  utilities: "#10b981", // Emerald
  software: "#8b5cf6", // Purple
  entertainment: "#ec4899", // Pink
  shopping: "#06b6d4", // Cyan
  general: "#64748b", // Slate
  freelance: "#14b8a6", // Teal
  salary: "#22c55e", // Green
};

const DEFAULT_COLORS = [
  "#6366f1",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#64748b",
];

interface CategorySpend {
  category: string;
  amount: number;
}

interface CategoryPieChartProps {
  data: CategorySpend[];
}

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const filteredData = React.useMemo(
    () => (data || []).filter((item) => item.amount > 0),
    [data]
  );

  const totalExpense = React.useMemo(
    () => filteredData.reduce((acc, curr) => acc + curr.amount, 0),
    [filteredData]
  );

  return (
    <Card className="border-border bg-card shadow-2xs col-span-full lg:col-span-3 flex flex-col justify-between overflow-hidden">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold tracking-tight font-mono">
            Category Breakdown
          </CardTitle>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border bg-muted/60 text-muted-foreground font-semibold">
            THIS MONTH
          </span>
        </div>
        <CardDescription className="text-xs font-mono">
          Outflow distribution by expense classification
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4 flex-1 flex flex-col justify-between">
        {filteredData.length === 0 ? (
          <div className="flex h-[280px] w-full flex-col items-center justify-center rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground my-auto">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center mb-2">
              <PieIcon className="h-4.5 w-4.5 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground">No current month expenses</p>
            <p className="mt-1 text-[11px] max-w-xs text-muted-foreground">
              Spendings will categorize automatically into this donut chart.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Donut Chart with Centered Total */}
            <div className="h-[200px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredData}
                    cx="50%"
                    cy="50%"
                    innerRadius={56}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey="category"
                    strokeWidth={0}
                  >
                    {filteredData.map((entry, index) => {
                      const color =
                        CATEGORY_COLORS[entry.category.toLowerCase()] ||
                        DEFAULT_COLORS[index % DEFAULT_COLORS.length];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload as CategorySpend;
                        const pct =
                          totalExpense > 0
                            ? ((item.amount / totalExpense) * 100).toFixed(1)
                            : "0";
                        return (
                          <div className="rounded-lg border border-border bg-popover text-popover-foreground p-2.5 shadow-xl backdrop-blur-md text-xs font-mono">
                            <p className="font-bold capitalize flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    CATEGORY_COLORS[item.category.toLowerCase()] || "#6366f1",
                                }}
                              />
                              {item.category}
                            </p>
                            <div className="mt-1 flex items-center justify-between gap-3 text-[11px]">
                              <span className="font-bold text-foreground">
                                {formatCurrency(item.amount)}
                              </span>
                              <span className="text-muted-foreground">({pct}%)</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  OUTFLOW
                </span>
                <span className="text-sm font-extrabold font-mono text-foreground">
                  {formatCurrency(totalExpense)}
                </span>
              </div>
            </div>

            {/* Category breakdown pill list */}
            <div className="space-y-1.5 max-h-[130px] overflow-y-auto pr-1">
              {filteredData.map((item, idx) => {
                const pct =
                  totalExpense > 0
                    ? ((item.amount / totalExpense) * 100).toFixed(0)
                    : "0";
                const color =
                  CATEGORY_COLORS[item.category.toLowerCase()] ||
                  DEFAULT_COLORS[idx % DEFAULT_COLORS.length];

                return (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-xs py-1 px-2 rounded-md bg-muted/40 border border-border hover:bg-muted/70 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="capitalize font-medium text-foreground text-[11px]">
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="font-semibold text-foreground">
                        {formatCurrency(item.amount)}
                      </span>
                      <span className="text-muted-foreground text-[10px] bg-muted px-1.5 py-0.2 rounded border border-border/40">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
