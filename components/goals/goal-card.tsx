"use client";

import * as React from "react";
import { format, differenceInDays, differenceInMonths, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Target,
  Calendar,
  Wallet,
  MoreVertical,
  Trash2,
  Edit2,
  CheckCircle2,
  Flame,
  ArrowRight,
  Plus,
  ShieldCheck,
  Laptop,
  Plane,
  Home,
  Car,
  TrendingUp,
  Cpu,
  Clock,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
} from "lucide-react";
import type { Goal, Account } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { deleteGoalAction } from "@/lib/actions/goals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GoalDialog } from "@/components/goals/goal-dialog";
import { GoalContributeDialog } from "@/components/goals/goal-contribute-dialog";

interface GoalCardProps {
  goal: Goal;
  accounts?: Account[];
}

interface ThemeConfig {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgTint: string;
  borderColor: string;
  topLine: string;
  progressGradient: string;
}

function getGoalTheme(goal: Goal): ThemeConfig {
  const name = (goal.name || "").toLowerCase();
  const cat = (goal.category || "").toLowerCase();

  if (name.includes("emergency") || name.includes("reserve") || name.includes("buffer") || cat === "general") {
    return {
      icon: ShieldCheck,
      color: "text-emerald-400",
      bgTint: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      topLine: "from-emerald-500 via-teal-400 to-transparent",
      progressGradient: "from-emerald-500 to-teal-400",
    };
  }

  if (
    name.includes("workstation") ||
    name.includes("m4") ||
    name.includes("mac") ||
    name.includes("developer") ||
    name.includes("hardware") ||
    name.includes("laptop") ||
    cat === "software"
  ) {
    return {
      icon: Laptop,
      color: "text-cyan-400",
      bgTint: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      topLine: "from-cyan-500 via-blue-400 to-transparent",
      progressGradient: "from-cyan-500 to-blue-400",
    };
  }

  if (
    name.includes("tokyo") ||
    name.includes("tour") ||
    name.includes("travel") ||
    name.includes("flight") ||
    name.includes("trip") ||
    cat === "entertainment"
  ) {
    return {
      icon: Plane,
      color: "text-violet-400",
      bgTint: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
      topLine: "from-violet-500 via-purple-400 to-transparent",
      progressGradient: "from-violet-500 to-purple-400",
    };
  }

  if (name.includes("house") || name.includes("home") || name.includes("rent") || cat === "housing") {
    return {
      icon: Home,
      color: "text-amber-400",
      bgTint: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      topLine: "from-amber-500 via-yellow-400 to-transparent",
      progressGradient: "from-amber-500 to-yellow-400",
    };
  }

  if (name.includes("car") || name.includes("auto") || name.includes("vehicle")) {
    return {
      icon: Car,
      color: "text-sky-400",
      bgTint: "bg-sky-500/10",
      borderColor: "border-sky-500/20",
      topLine: "from-sky-500 via-indigo-400 to-transparent",
      progressGradient: "from-sky-500 to-indigo-400",
    };
  }

  return {
    icon: Target,
    color: "text-primary",
    bgTint: "bg-primary/10",
    borderColor: "border-primary/20",
    topLine: "from-primary via-primary/50 to-transparent",
    progressGradient: "from-primary to-primary/80",
  };
}

export function GoalCard({ goal, accounts = [] }: GoalCardProps) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [contributeOpen, setContributeOpen] = React.useState(false);
  const [contributeType, setContributeType] = React.useState<"deposit" | "withdraw">("deposit");
  const [contributeAmount, setContributeAmount] = React.useState<number>(100);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const target = Number(goal.target_amount) || 1;
  const current = Number(goal.current_amount) || 0;
  const percentage = Math.min(100, Math.round((current / target) * 100));
  const remaining = Math.max(0, target - current);
  const isCompleted = current >= target;

  const theme = getGoalTheme(goal);
  const IconComponent = isCompleted ? CheckCircle2 : theme.icon;

  // Deadline and monthly forecast calculation
  let daysLeft: number | null = null;
  let monthlyNeeded: number | null = null;
  let isOverdue = false;

  if (goal.target_date) {
    try {
      const targetDate = parseISO(goal.target_date);
      const now = new Date();
      daysLeft = differenceInDays(targetDate, now);
      isOverdue = daysLeft < 0;
      const monthsLeft = Math.max(1, differenceInMonths(targetDate, now));

      if (remaining > 0 && daysLeft > 0) {
        monthlyNeeded = Number((remaining / monthsLeft).toFixed(2));
      }
    } catch {
      // Ignore date parsing issues
    }
  }

  const openDeposit = (amount: number = 100) => {
    setContributeType("deposit");
    setContributeAmount(amount);
    setContributeOpen(true);
  };

  const openWithdraw = () => {
    setContributeType("withdraw");
    setContributeAmount(100);
    setContributeOpen(true);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteGoalAction(goal.id);
      if (res.success) {
        toast.success("Target fund removed from vault");
      } else {
        toast.error(res.error || "Failed to remove target fund");
      }
    } catch {
      toast.error("Failed to remove target fund");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="glass-card glass-card-interactive relative overflow-hidden rounded-2xl border-border/70 hover:border-border font-mono transition-all duration-300 group shadow-lg">
        {/* Top ambient color bar */}
        <div
          className={`absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r ${
            isCompleted ? "from-emerald-400 via-teal-300 to-transparent" : theme.topLine
          }`}
        />

        <CardContent className="p-5 pt-6 space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-200 group-hover:scale-105 ${
                  isCompleted
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/20"
                    : `${theme.bgTint} ${theme.color} ${theme.borderColor}`
                }`}
              >
                <IconComponent className="h-5 w-5" />
              </div>

              <div className="space-y-1 min-w-0">
                <h3 className="text-sm font-bold tracking-tight text-foreground truncate group-hover:text-primary transition-colors">
                  {goal.name}
                </h3>
                <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1.5 py-0 capitalize bg-muted/40 border-border/60"
                  >
                    {goal.category || "General"}
                  </Badge>
                  {goal.accounts && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[130px]">
                      <Landmark className="h-2.5 w-2.5 shrink-0 opacity-70" />
                      <span className="truncate">{goal.accounts.name}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* Status Indicator Pill */}
              {isCompleted ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  COMPLETED
                </span>
              ) : isOverdue ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  OVERDUE
                </span>
              ) : daysLeft !== null && daysLeft <= 35 ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {daysLeft}D LEFT
                </span>
              ) : percentage >= 75 ? (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  FINAL STRETCH
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold bg-muted/50 text-muted-foreground border border-border/60">
                  ACTIVE
                </span>
              )}

              {/* Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-xl border-border bg-card font-mono text-xs">
                  <DropdownMenuItem
                    onClick={() => openDeposit(100)}
                    className="gap-2 cursor-pointer text-emerald-400 focus:text-emerald-400"
                  >
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                    <span>Quick Deposit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={openWithdraw}
                    className="gap-2 cursor-pointer text-rose-400 focus:text-rose-400"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5" />
                    <span>Quick Withdraw</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setEditOpen(true)}
                    className="gap-2 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Parameters</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Fund</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Amount and Progress Telemetry */}
          <div className="space-y-2 pt-1">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Saved Amount
                </span>
                <div className="text-2xl font-extrabold text-foreground tracking-tight">
                  {formatCurrency(current)}
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Target Fund
                </span>
                <div className="text-sm font-bold text-muted-foreground">
                  {formatCurrency(target)}
                </div>
              </div>
            </div>

            {/* Precision Cyber Progress Bar */}
            <div className="space-y-1.5 pt-0.5">
              <div className="relative h-2.5 w-full bg-secondary/80 rounded-full overflow-hidden border border-border/40">
                <div
                  className={`h-full transition-all duration-500 rounded-full bg-gradient-to-r ${
                    isCompleted
                      ? "from-emerald-400 to-teal-300"
                      : theme.progressGradient
                  }`}
                  style={{ width: `${percentage}%` }}
                />
                {/* Precision tick marks at 25%, 50%, 75% */}
                <div className="absolute inset-y-0 left-1/4 w-px bg-background/40 pointer-events-none" />
                <div className="absolute inset-y-0 left-2/4 w-px bg-background/40 pointer-events-none" />
                <div className="absolute inset-y-0 left-3/4 w-px bg-background/40 pointer-events-none" />
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-foreground">
                  {percentage}% reached
                </span>
                <span className="text-muted-foreground">
                  {isCompleted ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Fully Funded
                    </span>
                  ) : (
                    <span>{formatCurrency(remaining)} remaining</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Pacing & Target Date Ribbon */}
          <div className="rounded-xl border border-border/70 bg-muted/30 p-2.5 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-muted-foreground min-w-0">
              <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">
                {goal.target_date ? (
                  <>
                    {format(parseISO(goal.target_date), "MMM d, yyyy")}
                    {daysLeft !== null && (
                      <span className="ml-1 text-[11px] opacity-80">
                        ({daysLeft > 0 ? `${daysLeft}d left` : isOverdue ? "Overdue" : "Due today"})
                      </span>
                    )}
                  </>
                ) : (
                  <span className="italic opacity-70">No deadline established</span>
                )}
              </span>
            </div>

            {isCompleted ? (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shrink-0 font-bold">
                Secured 🎉
              </Badge>
            ) : monthlyNeeded !== null ? (
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20 shrink-0 font-bold flex items-center gap-1"
              >
                <Flame className="h-3 w-3 text-amber-400 shrink-0" />
                <span>{formatCurrency(monthlyNeeded)}/mo</span>
              </Badge>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => openDeposit(100)}
              variant="outline"
              size="sm"
              className="flex-1 h-9 rounded-xl gap-1.5 font-bold text-xs border-border/80 bg-background/50 hover:bg-muted text-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Deposit / Withdraw</span>
            </Button>

            {!isCompleted && (
              <Button
                onClick={() => openDeposit(100)}
                variant="outline"
                size="sm"
                className="h-9 px-3 rounded-xl font-bold text-[11px] border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0"
                title="Quick deposit $100"
              >
                +$100
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <GoalDialog
        goal={goal}
        accounts={accounts}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Contribute Dialog */}
      <GoalContributeDialog
        goal={goal}
        accounts={accounts}
        open={contributeOpen}
        onOpenChange={setContributeOpen}
        defaultAmount={contributeAmount}
        defaultType={contributeType}
      />
    </>
  );
}