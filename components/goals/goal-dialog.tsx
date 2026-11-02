"use client";

import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Target,
  PlusCircle,
  Edit2,
  Loader2,
  ShieldCheck,
  Laptop,
  Home,
  Plane,
  ShoppingBag,
  Sparkles,
  Calendar,
} from "lucide-react";
import { differenceInMonths, parseISO, format } from "date-fns";
import { goalSchema, type GoalInput } from "@/lib/validations";
import { createGoalAction, updateGoalAction } from "@/lib/actions/goals";
import type { Goal, Account } from "@/types/database";
import { formatCurrency } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoalDialogProps {
  goal?: Goal;
  accounts?: Account[];
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialValues?: Partial<GoalInput>;
}

export function GoalDialog({
  goal,
  accounts = [],
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  initialValues,
}: GoalDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;
  const isEditing = !!goal;

  const form = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      name: goal?.name || initialValues?.name || "",
      target_amount:
        goal?.target_amount !== undefined
          ? Number(goal.target_amount)
          : initialValues?.target_amount ?? 5000,
      current_amount:
        goal?.current_amount !== undefined
          ? Number(goal.current_amount)
          : initialValues?.current_amount ?? 0,
      target_date: goal?.target_date || initialValues?.target_date || "",
      category: goal?.category || initialValues?.category || "general",
      account_id: goal?.account_id || initialValues?.account_id || null,
    },
  });

  React.useEffect(() => {
    if (goal) {
      form.reset({
        name: goal.name,
        target_amount: Number(goal.target_amount),
        current_amount: Number(goal.current_amount),
        target_date: goal.target_date || "",
        category: goal.category || "general",
        account_id: goal.account_id || null,
      });
    } else if (initialValues) {
      form.reset({
        name: initialValues.name || "",
        target_amount: initialValues.target_amount ?? 5000,
        current_amount: initialValues.current_amount ?? 0,
        target_date: initialValues.target_date || "",
        category: initialValues.category || "general",
        account_id: initialValues.account_id || null,
      });
    }
  }, [goal, initialValues, form]);

  // Watch fields for live telemetry calculation
  const watchedTarget = useWatch({ control: form.control, name: "target_amount" });
  const watchedCurrent = useWatch({ control: form.control, name: "current_amount" });
  const watchedDate = useWatch({ control: form.control, name: "target_date" });

  let monthlyPacing: number | null = null;
  let monthsUntilDeadline: number | null = null;

  if (watchedDate && watchedTarget) {
    try {
      const parsed = parseISO(watchedDate);
      const now = new Date();
      monthsUntilDeadline = Math.max(1, differenceInMonths(parsed, now));
      const remainingAmount = Math.max(0, Number(watchedTarget) - Number(watchedCurrent || 0));
      if (remainingAmount > 0) {
        monthlyPacing = Number((remainingAmount / monthsUntilDeadline).toFixed(2));
      }
    } catch {
      // Ignore parse failure
    }
  }

  const onSubmit = async (values: GoalInput) => {
    setIsSubmitting(true);
    try {
      const res =
        isEditing && goal
          ? await updateGoalAction(goal.id, values)
          : await createGoalAction(values);

      if (res.success) {
        toast.success(
          isEditing ? "Target reserve parameters updated" : "New target fund established in vault"
        );
        if (!isEditing) {
          form.reset({
            name: "",
            target_amount: 5000,
            current_amount: 0,
            target_date: "",
            category: "general",
            account_id: null,
          });
        }
        setIsOpen?.(false);
      } else {
        toast.error(res.error || "Failed to establish target fund");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : !isControlled ? (
        <DialogTrigger asChild>
          {isEditing ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              className="gap-2 font-mono text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-md shadow-primary/20 rounded-xl cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Target Fund</span>
            </Button>
          )}
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card shadow-2xl font-mono">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
              <Target className="h-4.5 w-4.5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold tracking-tight">
                {isEditing ? "Configure Target Fund" : "Establish Capital Reserve"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set milestone parameters for equipment refreshes, strategic buffers, or milestones.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-1">
            {/* Goal Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-muted-foreground">
                    Reserve Fund Objective Name
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 6-Month Emergency Fund, M4 Max Workstation"
                      className="h-10 rounded-xl text-xs bg-background/60 border-border focus-visible:ring-primary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Target and Current Amounts */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="target_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">
                      Target Ceiling ($)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="10000.00"
                        className="h-10 rounded-xl text-xs bg-background/60 font-mono border-border"
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">
                      Initial Allocated ($)
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10 rounded-xl text-xs bg-background/60 font-mono border-border"
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Target Date and Category */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">
                      Target Deadline
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className="h-10 rounded-xl text-xs bg-background/60 border-border"
                        value={field.value || ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">
                      Pillar Category
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60 border-border">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-border bg-card">
                        <SelectItem value="general" className="text-xs font-mono">
                          <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                            <span>General / Emergency</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="software" className="text-xs font-mono">
                          <span className="flex items-center gap-1.5">
                            <Laptop className="h-3.5 w-3.5 text-cyan-400" />
                            <span>Tech & Hardware</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="housing" className="text-xs font-mono">
                          <span className="flex items-center gap-1.5">
                            <Home className="h-3.5 w-3.5 text-amber-400" />
                            <span>Real Estate & Housing</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="entertainment" className="text-xs font-mono">
                          <span className="flex items-center gap-1.5">
                            <Plane className="h-3.5 w-3.5 text-violet-400" />
                            <span>Travel & Leisure</span>
                          </span>
                        </SelectItem>
                        <SelectItem value="shopping" className="text-xs font-mono">
                          <span className="flex items-center gap-1.5">
                            <ShoppingBag className="h-3.5 w-3.5 text-rose-400" />
                            <span>Projects & Gear</span>
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Linked Depository */}
            {accounts.length > 0 && (
              <FormField
                control={form.control}
                name="account_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold text-muted-foreground">
                      Linked Depository Account (Optional)
                    </FormLabel>
                    <Select
                      value={field.value || "none"}
                      onValueChange={(val) => field.onChange(val === "none" ? null : val)}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60 border-border">
                          <SelectValue placeholder="Link to an account" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-border bg-card">
                        <SelectItem value="none" className="text-xs font-mono">
                          No Linked Account (Virtual Pool)
                        </SelectItem>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id} className="text-xs font-mono">
                            {acc.name} ({formatCurrency(Number(acc.balance), acc.currency)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Live Telemetry Forecast Box */}
            {monthlyPacing !== null && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-primary font-bold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Telemetry Forecast</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  To achieve this reserve by{" "}
                  <strong className="text-foreground">
                    {format(parseISO(watchedDate!), "MMM d, yyyy")}
                  </strong>
                  , you need to allocate approximately{" "}
                  <strong className="text-primary font-bold">{formatCurrency(monthlyPacing)}/month</strong> across the next {monthsUntilDeadline} months.
                </p>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-10 rounded-xl gap-2 font-mono text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Synchronizing vault parameters...</span>
                  </>
                ) : (
                  <>
                    <Target className="h-4 w-4" />
                    <span>{isEditing ? "Update Reserve Parameters" : "Establish Target Fund"}</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}