"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";
import { PieChart, Store } from "lucide-react";

interface CategorySpending {
  category: string;
  total: number;
  percentage: number;
}

interface TopMerchant {
  merchant: string;
  count: number;
  total: number;
}

interface SpendingBreakdownProps {
  categories: CategorySpending[];
  topMerchants: TopMerchant[];
}

export function SpendingBreakdown({ categories, topMerchants }: SpendingBreakdownProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2 font-mono">
      {/* Category Spending Rank */}
      <Card className="border-border bg-card shadow-2xs">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <PieChart className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-bold tracking-tight">
              Categorical Outflow Distribution
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Spending volume ranked by expenditure pillar.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-4">
          {categories.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No expenses recorded
            </p>
          ) : (
            categories.slice(0, 6).map((cat, idx) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">#{idx + 1}</span>
                    <span className="font-bold capitalize text-foreground">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{formatCurrency(cat.total)}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {cat.percentage}%
                    </Badge>
                  </div>
                </div>
                <Progress value={cat.percentage} className="h-1.5 rounded-full" />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Top Merchants / Counter-parties */}
      <Card className="border-border bg-card shadow-2xs">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-emerald-500" />
            <CardTitle className="text-sm font-bold tracking-tight">
              Top Merchants & Counter-Parties
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Most frequent payees and vendors in ledger history.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {topMerchants.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">
              No merchant data recorded
            </p>
          ) : (
            <div className="space-y-3">
              {topMerchants.slice(0, 6).map((m, idx) => (
                <div
                  key={m.merchant}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground">
                      0{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-foreground line-clamp-1">{m.merchant}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {m.count} {m.count === 1 ? "transaction" : "transactions"}
                      </p>
                    </div>
                  </div>
                  <div className="font-bold text-foreground">
                    {formatCurrency(m.total)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
