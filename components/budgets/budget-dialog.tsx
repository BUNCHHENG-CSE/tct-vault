"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";
import { budgetSchema, transactionCategories, type BudgetInput } from "@/lib/validations";
import { upsertBudgetAction } from "@/lib/actions/budgets";
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

interface BudgetDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultCategory?: string;
  defaultLimit?: number;
}

export function BudgetDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  defaultCategory,
  defaultLimit,
}: BudgetDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;

  const form = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      category: defaultCategory || "food",
      monthly_limit: defaultLimit || undefined,
    },
  });

  const onSubmit = async (values: BudgetInput) => {
    setIsSubmitting(true);
    try {
      const res = await upsertBudgetAction(values);
      if (res.success) {
        toast.success(`Spending ceiling set for ${values.category}`);
        form.reset();
        setIsOpen?.(false);
      } else {
        toast.error(res.error || "Failed to set budget");
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
          <Button size="sm" className="gap-1.5 font-bold shadow-md shadow-primary/20 cursor-pointer">
            <PlusCircle className="h-4 w-4" />
            <span>Set Spending Ceiling</span>
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Establish Category Ceiling
          </DialogTitle>
          <DialogDescription className="text-xs">
            Set monthly expenditure ceilings. Live monitors will automatically track pace and warn at 80% & 100% capacity.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Expense Classification</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="rounded-xl border-border/80">
                      {transactionCategories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="rounded-lg cursor-pointer text-xs">
                          <span className="capitalize">{cat}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="monthly_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Monthly Ceiling ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 600.00"
                      className="h-10 rounded-xl font-mono text-xs bg-background/60"
                      value={field.value === undefined ? "" : field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full h-10.5 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20 cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Locking Ceiling..." : "Save Spending Ceiling"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
