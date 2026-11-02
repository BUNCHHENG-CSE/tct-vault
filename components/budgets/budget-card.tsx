"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Utensils,
  Home,
  Laptop,
  Tv,
  ShoppingBag,
  Zap,
  Briefcase,
  Receipt,
  AlertCircle,
} from "lucide-react";
import type { BudgetWithSpending } from "@/types/database";
import { deleteBudgetAction } from "@/lib/actions/budgets";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

interface BudgetCardProps {
  budget: BudgetWithSpending;
}

export function BudgetCard({ budget }: BudgetCardProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const percentage = Math.min(100, Math.round(budget.percentage));
  const rawPercentage = budget.percentage;
  const isOver = budget.spent > budget.monthly_limit;
  const isWarning = rawPercentage >= 80 && rawPercentage < 100;
  const isHealthy = rawPercentage < 80;

  const indicatorColor = isOver
    ? "bg-rose-500"
    : isWarning
    ? "bg-amber-500"
    : "bg-emerald-500";

  const badgeVariant = isOver
    ? "destructive"
    : isWarning
    ? "warning"
    : "success";

  const CategoryIcon = CATEGORY_ICONS[budget.category.toLowerCase()] || Receipt;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteBudgetAction(budget.id);
      if (res.success) {
        toast.success(`Removed budget ceiling for ${budget.category}`);
      } else {
        toast.error(res.error || "Failed to remove budget");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-border bg-card shadow-2xs rounded-xl overflow-hidden font-mono">
      <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between space-y-0 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div
            className={`h-8 w-8 rounded-md flex items-center justify-center border ${
              isOver
                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                : isWarning
                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            }`}
          >
            <CategoryIcon className="h-4 w-4" />
          </div>

          <div>
            <CardTitle className="text-xs font-bold capitalize tracking-tight text-foreground">
              {budget.category}
            </CardTitle>
            <span className="text-[9px] text-muted-foreground uppercase">
              Ceiling
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant={badgeVariant} className="text-[9px] uppercase px-1.5 py-0">
            {isOver
              ? "Exceeded"
              : isWarning
              ? "Near 80%"
              : "On Track"}
          </Badge>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md cursor-pointer"
            onClick={handleDelete}
            disabled={isDeleting}
            title="Delete budget ceiling"
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="flex items-baseline justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Debited</span>
            <div className="text-lg font-bold text-foreground">
              {formatCurrency(budget.spent)}
            </div>
          </div>
          <div className="text-right space-y-0.5">
            <span className="text-[10px] text-muted-foreground">Limit</span>
            <div className="text-xs text-muted-foreground font-semibold">
              {formatCurrency(budget.monthly_limit)}
            </div>
          </div>
        </div>

        {/* Progress Bar with Dynamic Color Indicator */}
        <div className="space-y-1.5">
          <Progress
            value={percentage}
            className="h-2 bg-muted rounded-full"
            indicatorClassName={indicatorColor}
          />
          <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
            <span className="flex items-center gap-1 font-semibold">
              {isOver ? (
                <span className="text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {rawPercentage.toFixed(0)}%
                </span>
              ) : isWarning ? (
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {rawPercentage.toFixed(0)}%
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {rawPercentage.toFixed(0)}%
                </span>
              )}
            </span>
            <span>
              {isOver ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  +{formatCurrency(budget.spent - budget.monthly_limit)} over
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {formatCurrency(budget.remaining)} left
                </span>
              )}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
