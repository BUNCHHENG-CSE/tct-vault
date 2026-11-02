"use client";

import * as React from "react";
import {
  Target,
  Trophy,
  PiggyBank,
  Sparkles,
  PlusCircle,
  Search,
  Filter,
  SlidersHorizontal,
  X,
  ShieldCheck,
  Laptop,
  Plane,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  Layers,
} from "lucide-react";
import type { Goal, Account } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalDialog } from "@/components/goals/goal-dialog";
import type { GoalInput } from "@/lib/validations";

interface GoalsClientViewProps {
  initialGoals: (Goal & { accounts?: Pick<Account, "name" | "type"> })[];
  accounts: Account[];
}

type FilterStatus = "all" | "active" | "completed";
type SortOption = "deadline" | "progress_desc" | "progress_asc" | "remaining_asc" | "target_desc";

export function GoalsClientView({ initialGoals, accounts }: GoalsClientViewProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<FilterStatus>("all");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("all");
  const [sortBy, setSortBy] = React.useState<SortOption>("deadline");
  const [templateDialogValues, setTemplateDialogValues] = React.useState<Partial<GoalInput> | null>(null);
  const [templateDialogOpen, setTemplateDialogOpen] = React.useState(false);

  // Summary Metrics computed from all goals
  const totalTarget = initialGoals.reduce((sum, g) => sum + Number(g.target_amount), 0);
  const totalSaved = initialGoals.reduce((sum, g) => sum + Number(g.current_amount), 0);
  const netShortfall = Math.max(0, totalTarget - totalSaved);
  const overallPercentage =
    totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;
  const completedGoals = initialGoals.filter(
    (g) => Number(g.current_amount) >= Number(g.target_amount)
  ).length;
  const activeGoals = initialGoals.length - completedGoals;

  // Extract distinct categories
  const categories = React.useMemo(() => {
    const set = new Set<string>();
    initialGoals.forEach((g) => {
      if (g.category) set.add(g.category.toLowerCase());
    });
    return Array.from(set);
  }, [initialGoals]);

  // Filter and sort goals
  const filteredGoals = React.useMemo(() => {
    return initialGoals
      .filter((goal) => {
        const current = Number(goal.current_amount) || 0;
        const target = Number(goal.target_amount) || 1;
        const isDone = current >= target;

        // Status Filter
        if (statusFilter === "active" && isDone) return false;
        if (statusFilter === "completed" && !isDone) return false;

        // Category Filter
        if (selectedCategory !== "all" && (goal.category || "general").toLowerCase() !== selectedCategory) {
          return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = goal.name.toLowerCase().includes(q);
          const matchCategory = (goal.category || "").toLowerCase().includes(q);
          const matchAccount = (goal.accounts?.name || "").toLowerCase().includes(q);
          if (!matchName && !matchCategory && !matchAccount) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const currentA = Number(a.current_amount) || 0;
        const targetA = Number(a.target_amount) || 1;
        const pctA = (currentA / targetA) * 100;
        const remainingA = Math.max(0, targetA - currentA);

        const currentB = Number(b.current_amount) || 0;
        const targetB = Number(b.target_amount) || 1;
        const pctB = (currentB / targetB) * 100;
        const remainingB = Math.max(0, targetB - currentB);

        switch (sortBy) {
          case "progress_desc":
            return pctB - pctA;
          case "progress_asc":
            return pctA - pctB;
          case "remaining_asc":
            return remainingA - remainingB;
          case "target_desc":
            return targetB - targetA;
          case "deadline":
          default:
            if (!a.target_date && !b.target_date) return 0;
            if (!a.target_date) return 1;
            if (!b.target_date) return -1;
            return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
        }
      });
  }, [initialGoals, statusFilter, selectedCategory, searchQuery, sortBy]);

  const handleOpenTemplate = (template: Partial<GoalInput>) => {
    setTemplateDialogValues(template);
    setTemplateDialogOpen(true);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Eyebrow & Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-widest text-primary/80 uppercase">
              CAPITAL PROTOCOL // TARGET ALLOCATION ENGINE
            </span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground font-mono">
              Savings Goals & Target Reserves
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 beacon-emerald" />
              <span>{initialGoals.length} active</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl leading-relaxed">
            Allocate capital reserves towards strategic life goals, hardware upgrades, and emergency buffers.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <GoalDialog accounts={accounts} />
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
        {/* Card 1: Total Saved */}
        <Card className="glass-card glass-card-interactive relative overflow-hidden rounded-2xl border-border/70 hover:border-emerald-500/30 transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-400 to-transparent" />
          <CardContent className="p-4 pt-5 md:pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Saved in Funds
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {formatCurrency(totalSaved)}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-foreground">{overallPercentage}%</strong> of total target funded
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Target Allocation */}
        <Card className="glass-card glass-card-interactive relative overflow-hidden rounded-2xl border-border/70 hover:border-cyan-500/30 transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-400 to-transparent" />
          <CardContent className="p-4 pt-5 md:pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Target Allocation Sum
              </span>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Target className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {formatCurrency(totalTarget)}
              </div>
              <div className="text-[11px] text-muted-foreground">
                <span>
                  {netShortfall > 0 ? (
                    <>
                      <strong className="text-foreground">{formatCurrency(netShortfall)}</strong> net capital shortfall
                    </>
                  ) : (
                    <span className="text-emerald-400 font-bold">100% Capital Objective Fulfilled</span>
                  )}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Milestones Achieved */}
        <Card className="glass-card glass-card-interactive relative overflow-hidden rounded-2xl border-border/70 hover:border-amber-500/30 transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-amber-500 via-yellow-400 to-transparent" />
          <CardContent className="p-4 pt-5 md:pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Milestones Achieved
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Trophy className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-2xl font-extrabold text-foreground tracking-tight">
                {completedGoals} of {initialGoals.length} completed
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Badge variant="outline" className="text-[9px] px-1 py-0 bg-muted/40">
                  {activeGoals} in flight
                </Badge>
                <span>targets awaiting funding</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Overall Completion */}
        <Card className="glass-card glass-card-interactive relative overflow-hidden rounded-2xl border-border/70 hover:border-violet-500/30 transition-all duration-300">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500 via-purple-400 to-transparent" />
          <CardContent className="p-4 pt-5 md:pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Overall Completion
              </span>
              <div className="h-8 w-8 rounded-lg bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-baseline justify-between">
                <div className="text-2xl font-extrabold text-foreground tracking-tight">
                  {overallPercentage}%
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {formatCurrency(netShortfall)} left
                </span>
              </div>

              {/* Multi-tone gradient progress bar */}
              <div className="relative h-2 w-full bg-secondary/80 rounded-full overflow-hidden border border-border/40">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Controls & Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-3 rounded-2xl glass-card border border-border/80">
        {/* Left: Status Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Tabs
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as FilterStatus)}
            className="w-auto"
          >
            <TabsList className="h-8 p-0.5 rounded-xl bg-muted/60 border border-border/60">
              <TabsTrigger
                value="all"
                className="text-xs px-3 font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
              >
                All ({initialGoals.length})
              </TabsTrigger>
              <TabsTrigger
                value="active"
                className="text-xs px-3 font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-2xs"
              >
                Active ({activeGoals})
              </TabsTrigger>
              <TabsTrigger
                value="completed"
                className="text-xs px-3 font-semibold data-[state=active]:bg-card data-[state=active]:text-emerald-400 data-[state=active]:shadow-2xs"
              >
                Completed ({completedGoals})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Chips if multiple categories exist */}
          {categories.length > 1 && (
            <div className="hidden lg:flex items-center gap-1 border-l border-border/60 pl-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("all")}
                className={`px-2 py-1 text-[11px] rounded-lg transition-all capitalize ${
                  selectedCategory === "all"
                    ? "bg-foreground/10 text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Pillars
              </button>
              {categories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-1 text-[11px] rounded-lg transition-all capitalize ${
                    selectedCategory === cat
                      ? "bg-primary/15 text-primary font-bold border border-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Search & Sort Controls */}
        <div className="flex items-center gap-2 flex-1 md:flex-initial justify-end">
          {/* Search Box */}
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search reserve or account..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs rounded-xl bg-background/60 border-border/60 focus-visible:ring-primary"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
            <SelectTrigger className="h-8 w-[160px] text-xs rounded-xl bg-background/60 border-border/60">
              <ArrowUpDown className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border bg-card font-mono text-xs">
              <SelectItem value="deadline">Deadline: Soonest</SelectItem>
              <SelectItem value="progress_desc">Progress %: Highest</SelectItem>
              <SelectItem value="progress_asc">Progress %: Lowest</SelectItem>
              <SelectItem value="remaining_asc">Shortfall: Lowest</SelectItem>
              <SelectItem value="target_desc">Target: Largest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Goals Grid or Empty State */}
      {filteredGoals.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 bg-card/40 p-12 text-center rounded-2xl">
          <div className="flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-xl bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground">
              {searchQuery || statusFilter !== "all" || selectedCategory !== "all" ? (
                <Filter className="h-6 w-6" />
              ) : (
                <Target className="h-6 w-6" />
              )}
            </div>

            {searchQuery || statusFilter !== "all" || selectedCategory !== "all" ? (
              <>
                <h3 className="text-base font-bold text-foreground">
                  No reserve funds match criteria
                </h3>
                <p className="text-xs text-muted-foreground">
                  No targets matched your active query &quot;{searchQuery}&quot; or selected filters.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                    setSelectedCategory("all");
                  }}
                  className="rounded-xl mt-2 text-xs font-bold"
                >
                  Clear All Filters
                </Button>
              </>
            ) : (
              <>
                <h3 className="text-base font-bold text-foreground">
                  No target funds established yet
                </h3>
                <p className="text-xs text-muted-foreground">
                  Establish capital milestones like Emergency Reserves, Hardware Refreshes, or Tokyo Flights to track capital pacing.
                </p>
                {/* Starter Templates */}
                <div className="w-full pt-4 space-y-2 text-left">
                  <span className="text-[10px] uppercase font-bold text-muted-foreground">
                    Quick Starter Templates
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenTemplate({
                          name: "6-Month Emergency Buffer",
                          target_amount: 15000,
                          category: "general",
                        })
                      }
                      className="p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/70 text-left transition-all group"
                    >
                      <ShieldCheck className="h-4 w-4 text-emerald-400 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="text-xs font-bold text-foreground">Emergency Buffer</div>
                      <div className="text-[10px] text-muted-foreground">$15,000 Target</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenTemplate({
                          name: "M4 Max Workstation Rig",
                          target_amount: 3800,
                          category: "software",
                        })
                      }
                      className="p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/70 text-left transition-all group"
                    >
                      <Laptop className="h-4 w-4 text-cyan-400 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="text-xs font-bold text-foreground">M4 Max Dev Rig</div>
                      <div className="text-[10px] text-muted-foreground">$3,800 Target</div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenTemplate({
                          name: "Tokyo Cyberpunk & Tech Tour",
                          target_amount: 4500,
                          category: "entertainment",
                        })
                      }
                      className="p-3 rounded-xl border border-border/70 bg-muted/30 hover:bg-muted/70 text-left transition-all group"
                    >
                      <Plane className="h-4 w-4 text-violet-400 mb-1 group-hover:scale-110 transition-transform" />
                      <div className="text-xs font-bold text-foreground">Tokyo Tech Tour</div>
                      <div className="text-[10px] text-muted-foreground">$4,500 Target</div>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <GoalDialog accounts={accounts} />
                </div>
              </>
            )}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredGoals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} accounts={accounts} />
          ))}
        </div>
      )}

      {/* Template Dialog */}
      {templateDialogValues && (
        <GoalDialog
          accounts={accounts}
          initialValues={templateDialogValues}
          open={templateDialogOpen}
          onOpenChange={(open) => {
            setTemplateDialogOpen(open);
            if (!open) setTemplateDialogValues(null);
          }}
        />
      )}
    </div>
  );
}