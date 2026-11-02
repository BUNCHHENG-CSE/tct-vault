"use client";

import * as React from "react";
import {
  Flame,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Wallet,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/utils";

interface BurnRateCardProps {
  liquidCash: number;
  monthlyBurn: number;
  monthlyIncome: number;
}

export function BurnRateCard({
  liquidCash,
  monthlyBurn,
  monthlyIncome,
}: BurnRateCardProps) {
  const safeBurn = Math.max(1, monthlyBurn);
  const runwayMonths = Number((liquidCash / safeBurn).toFixed(1));
  const dailyBurn = Number((monthlyBurn / 30).toFixed(2));
  const netMonthly = monthlyIncome - monthlyBurn;
  const savingsRate =
    monthlyIncome > 0
      ? Math.max(0, Math.round((netMonthly / monthlyIncome) * 100))
      : 0;

  // Status tiers
  let statusColor = "text-emerald-500 bg-emerald-500/10 border-emerald-500/25";
  let statusText = "Fortress (Optimal)";
  let statusDesc = "Over 6 months of liquid operational runway. Capital reserves are extremely resilient.";
  let Icon = ShieldCheck;

  if (runwayMonths < 3) {
    statusColor = "text-rose-500 bg-rose-500/10 border-rose-500/25";
    statusText = "Critical (Immediate Attention)";
    statusDesc = "Under 3 months of emergency runway. Immediate expense reduction or liquidity injection recommended.";
    Icon = AlertTriangle;
  } else if (runwayMonths < 6) {
    statusColor = "text-amber-500 bg-amber-500/10 border-amber-500/25";
    statusText = "Standard Buffer (Adequate)";
    statusDesc = "3 to 6 months of emergency coverage. Healthy foundation with moderate buffer.";
    Icon = Clock;
  }

  // Progress relative to a 12-month standard ceiling
  const runwayProgress = Math.min(100, Math.round((runwayMonths / 12) * 100));

  return (
    <Card className="border-border bg-card shadow-2xs font-mono">
      <CardHeader className="border-b border-border pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold tracking-tight">
                Runway & Burn Velocity Index
              </CardTitle>
              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 border ${statusColor}`}>
                <Icon className="h-3 w-3 mr-1" />
                {statusText}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Survival horizon based on total liquid reserves vs average monthly expenditure.
            </CardDescription>
          </div>

          <div className="text-right">
            <div className="text-2xl font-extrabold text-foreground">
              {runwayMonths} <span className="text-xs font-normal text-muted-foreground">months</span>
            </div>
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">
              Calculated Runway
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 space-y-5">
        {/* Progress towards 12-month target */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Capital Horizon Gauge (Target: 12.0 mo)</span>
            <span className="font-bold text-foreground">{runwayMonths} / 12.0 mo</span>
          </div>
          <Progress value={runwayProgress} className="h-2.5 rounded-full" />
          <p className="text-[11px] text-muted-foreground">{statusDesc}</p>
        </div>

        {/* 3 Metric Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span>Liquid Assets</span>
            </div>
            <div className="text-base font-bold text-foreground">
              {formatCurrency(liquidCash)}
            </div>
            <span className="text-[10px] text-muted-foreground">Checking + High-Yield</span>
          </div>

          <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
              <Flame className="h-3.5 w-3.5 text-rose-500" />
              <span>Monthly Burn Rate</span>
            </div>
            <div className="text-base font-bold text-rose-500">
              {formatCurrency(monthlyBurn)}/mo
            </div>
            <span className="text-[10px] text-muted-foreground">
              ~{formatCurrency(dailyBurn)} daily burn
            </span>
          </div>

          <div className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-1">
            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] uppercase font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
              <span>Net Savings Velocity</span>
            </div>
            <div className={`text-base font-bold ${netMonthly >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
              {savingsRate}% ({formatCurrency(netMonthly)})
            </div>
            <span className="text-[10px] text-muted-foreground">
              {netMonthly >= 0 ? "Positive Cash Accumulation" : "Negative Cash Outflow"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
