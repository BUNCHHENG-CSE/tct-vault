"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PlusCircle, Loader2 } from "lucide-react";
import { subscriptionSchema, type SubscriptionInput } from "@/lib/validations";
import { createSubscriptionAction } from "@/lib/actions/subscriptions";
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

interface SubscriptionDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SubscriptionDialog({
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: SubscriptionDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = isControlled ? setControlledOpen : setInternalOpen;

  const form = useForm<SubscriptionInput>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      name: "",
      amount: undefined,
      billing_day: 1,
      category: "software",
      status: "active",
    },
  });

  const onSubmit = async (values: SubscriptionInput) => {
    setIsSubmitting(true);
    try {
      const res = await createSubscriptionAction(values);
      if (res.success) {
        toast.success("Recurring subscription mapped to calendar");
        form.reset({
          name: "",
          amount: undefined,
          billing_day: 1,
          category: "software",
          status: "active",
        });
        setIsOpen?.(false);
      } else {
        toast.error(res.error || "Failed to add subscription");
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
            <span>Add Subscription</span>
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 shadow-2xl backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Track Recurring Subscription
          </DialogTitle>
          <DialogDescription className="text-xs">
            Schedule recurring monthly bills to forecast burn on your 31-day visual calendar.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Service Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Netflix 4K, GitHub Copilot, Gym Membership"
                      className="h-10 rounded-xl text-xs bg-background/60"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Monthly Cost ($)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        className="h-10 rounded-xl font-mono text-xs bg-background/60"
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
                name="billing_day"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Billing Day (1-31)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="31"
                        placeholder="1"
                        className="h-10 rounded-xl font-mono text-xs bg-background/60"
                        value={field.value === undefined ? "" : field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60">
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-border/80">
                        <SelectItem value="software" className="rounded-lg cursor-pointer text-xs">Software / Cloud</SelectItem>
                        <SelectItem value="entertainment" className="rounded-lg cursor-pointer text-xs">Entertainment / Streaming</SelectItem>
                        <SelectItem value="utilities" className="rounded-lg cursor-pointer text-xs">Utilities</SelectItem>
                        <SelectItem value="housing" className="rounded-lg cursor-pointer text-xs">Housing</SelectItem>
                        <SelectItem value="food" className="rounded-lg cursor-pointer text-xs">Food / Meal Kits</SelectItem>
                        <SelectItem value="general" className="rounded-lg cursor-pointer text-xs">General</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold">Initial Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger className="h-10 rounded-xl text-xs bg-background/60">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-xl border-border/80">
                        <SelectItem value="active" className="rounded-lg cursor-pointer text-xs">Active</SelectItem>
                        <SelectItem value="paused" className="rounded-lg cursor-pointer text-xs">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full h-10.5 rounded-xl gap-2 font-bold shadow-lg shadow-primary/20 cursor-pointer"
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting ? "Locking Schedule..." : "Add to Subscription Calendar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
