"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  Flame,
  PauseCircle,
  Trash2,
  Loader2,
  Play,
  Laptop,
  Tv,
  ShoppingBag,
  Receipt,
  Utensils,
  Home,
  Zap,
} from "lucide-react";
import type { Subscription } from "@/types/database";
import {
  toggleSubscriptionStatusAction,
  deleteSubscriptionAction,
} from "@/lib/actions/subscriptions";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  software: Laptop,
  entertainment: Tv,
  shopping: ShoppingBag,
  general: Receipt,
  food: Utensils,
  utilities: Zap,
  housing: Home,
};

interface SubscriptionCalendarProps {
  subscriptions: Subscription[];
}

export function SubscriptionCalendar({
  subscriptions,
}: SubscriptionCalendarProps) {
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const today = new Date().getDate();

  // Active vs Paused calculations
  const activeSubs = React.useMemo(
    () => subscriptions.filter((s) => s.status === "active"),
    [subscriptions]
  );
  const pausedSubs = React.useMemo(
    () => subscriptions.filter((s) => s.status === "paused"),
    [subscriptions]
  );

  const monthlyBurn = React.useMemo(
    () => activeSubs.reduce((sum, sub) => sum + Number(sub.amount), 0),
    [activeSubs]
  );

  // Group subscriptions by billing day (1 - 31)
  const subsByDay = React.useMemo(() => {
    const map: Record<number, Subscription[]> = {};
    for (let i = 1; i <= 31; i++) {
      map[i] = [];
    }
    subscriptions.forEach((sub) => {
      const day = Number(sub.billing_day);
      if (map[day]) {
        map[day].push(sub);
      }
    });
    return map;
  }, [subscriptions]);

  // Find next upcoming active renewal
  const nextRenewal = React.useMemo(() => {
    if (activeSubs.length === 0) return null;
    const sorted = [...activeSubs].sort((a, b) => {
      const diffA = (a.billing_day >= today ? a.billing_day - today : 31 - today + a.billing_day);
      const diffB = (b.billing_day >= today ? b.billing_day - today : 31 - today + b.billing_day);
      return diffA - diffB;
    });
    return sorted[0];
  }, [activeSubs, today]);

  const handleToggleStatus = async (sub: Subscription) => {
    setLoadingId(sub.id);
    const newStatus = sub.status === "active" ? "paused" : "active";
    try {
      const res = await toggleSubscriptionStatusAction(sub.id, newStatus);
      if (res.success) {
        toast.success(
          `${sub.name} is now ${newStatus === "active" ? "active" : "paused"}`
        );
      } else {
        toast.error(res.error || "Failed to update subscription");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setLoadingId(id);
    try {
      const res = await deleteSubscriptionAction(id);
      if (res.success) {
        toast.success(`Removed ${name} from subscription tracking`);
      } else {
        toast.error(res.error || "Failed to delete subscription");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Burn Rate Header Card */}
      <Card className="border-border bg-card shadow-2xs rounded-xl">
        <CardContent className="p-5 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-3.5">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground font-semibold">
                  Monthly Fixed Burn Rate
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-foreground">
                  {formatCurrency(monthlyBurn)}
                  <span className="text-xs sm:text-sm font-normal text-muted-foreground ml-1.5 font-mono">
                    / mo
                  </span>
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
              <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2">
                <span className="text-muted-foreground text-[10px] block font-semibold uppercase">Annual Cost</span>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(monthlyBurn * 12)}/yr
                </span>
              </div>

              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3.5 py-2">
                <span className="text-emerald-600 dark:text-emerald-400 text-[10px] block font-semibold uppercase">Active Bills</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {activeSubs.length} services
                </span>
              </div>

              {nextRenewal && (
                <div className="rounded-lg border border-border bg-muted/30 px-3.5 py-2">
                  <span className="text-muted-foreground text-[10px] block font-semibold uppercase">Next Renewal</span>
                  <span className="text-sm font-bold text-foreground">
                    {nextRenewal.name} (Day {nextRenewal.billing_day})
                  </span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 31-Day Visual Monthly Grid */}
      <Card className="border-border bg-card shadow-2xs overflow-hidden rounded-xl">
        <CardHeader className="border-b border-border bg-muted/30 pb-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold flex items-center gap-2 font-mono">
                <CalendarDays className="h-4 w-4 text-foreground" />
                31-Day Billing Matrix
              </CardTitle>
              <CardDescription className="text-xs font-mono">
                Predictive visual map showing calendar debit points for all recurring services.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-muted text-foreground font-semibold text-[10px]">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Today: Day {today}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 md:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const daySubs = subsByDay[day] || [];
              const isToday = day === today;
              const hasSubs = daySubs.length > 0;
              const isUpcomingSoon = day > today && day <= today + 3;

              return (
                <div
                  key={day}
                  className={`min-h-[100px] rounded-lg border p-2 flex flex-col justify-between transition-colors ${
                    isToday
                      ? "border-primary bg-primary/10 shadow-2xs ring-1 ring-primary/40"
                      : hasSubs
                      ? isUpcomingSoon
                        ? "border-amber-500/40 bg-amber-500/5 shadow-2xs"
                        : "border-border bg-card shadow-2xs"
                      : "border-border/50 bg-muted/15 opacity-65"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-bold h-5.5 w-5.5 rounded flex items-center justify-center ${
                        isToday
                          ? "bg-primary text-primary-foreground font-extrabold"
                          : "text-muted-foreground bg-muted/50"
                      }`}
                    >
                      {day}
                    </span>
                    {hasSubs && (
                      <span className="text-[9px] text-muted-foreground font-semibold">
                        {daySubs.length} bill{daySubs.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 my-1 flex-1 overflow-y-auto max-h-[65px]">
                    {daySubs.map((sub) => {
                      const isActive = sub.status === "active";
                      return (
                        <div
                          key={sub.id}
                          className={`rounded px-1.5 py-0.5 text-[10px] flex items-center justify-between border ${
                            isActive
                              ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25 font-bold"
                              : "bg-muted text-muted-foreground border-border line-through opacity-50"
                          }`}
                          title={`${sub.name}: ${formatCurrency(Number(sub.amount))} (${sub.category})`}
                        >
                          <span className="truncate max-w-[65px]">
                            {sub.name}
                          </span>
                          <span>
                            ${Number(sub.amount).toFixed(0)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {hasSubs && (
                    <div className="text-[9px] text-right text-muted-foreground pt-1 border-t border-border font-semibold">
                      ${daySubs
                        .filter((s) => s.status === "active")
                        .reduce((a, b) => a + Number(b.amount), 0)
                        .toFixed(0)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Subscription List with Actions */}
      <Card className="border-border bg-card shadow-2xs overflow-hidden rounded-xl">
        <CardHeader className="pb-3.5 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold tracking-tight font-mono">
                All Tracked Subscriptions
              </CardTitle>
              <CardDescription className="text-xs font-mono">
                Manage recurring memberships, pause unused SaaS accounts, or cancel services.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {subscriptions.length} entries
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {subscriptions.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground space-y-1 font-mono">
              <p className="font-semibold text-foreground">No recurring bills registered</p>
              <p className="text-[11px]">Click &quot;Add Subscription&quot; above to track Netflix, Spotify, or software subscriptions.</p>
            </div>
          ) : (
            <div className="divide-y divide-border font-mono">
              {subscriptions.map((sub) => {
                const isActive = sub.status === "active";
                const isItemLoading = loadingId === sub.id;
                const CategoryIcon = CATEGORY_ICONS[sub.category.toLowerCase()] || Laptop;

                return (
                  <div
                    key={sub.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 hover:bg-muted/40 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8.5 w-8.5 rounded-lg flex items-center justify-center border shrink-0 ${
                          isActive
                            ? "bg-primary/10 text-primary border-primary/20"
                            : "bg-muted text-muted-foreground border-border"
                        }`}
                      >
                        <CategoryIcon className="h-4 w-4" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-xs text-foreground ${
                              !isActive ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {sub.name}
                          </span>
                          <Badge
                            variant={isActive ? "success" : "secondary"}
                            className="text-[9px] px-1.5 py-0"
                          >
                            {isActive ? "Active" : "Paused"}
                          </Badge>
                          <Badge variant="outline" className="text-[9px] capitalize text-muted-foreground">
                            {sub.category}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          Charges on day {sub.billing_day} of each month
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <span className="font-extrabold text-sm text-foreground">
                          {formatCurrency(Number(sub.amount))}
                        </span>
                        <span className="text-[9px] text-muted-foreground block">
                          / month
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7.5 rounded-md text-xs cursor-pointer"
                          onClick={() => handleToggleStatus(sub)}
                          disabled={isItemLoading}
                        >
                          {isItemLoading ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isActive ? (
                            <>
                              <PauseCircle className="h-3 w-3 mr-1 text-muted-foreground" />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1 text-emerald-600 dark:text-emerald-400" />
                              Resume
                            </>
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7.5 w-7.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
                          onClick={() => handleDelete(sub.id, sub.name)}
                          disabled={isItemLoading}
                          title="Delete subscription"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
