import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import type { Subscription } from "@/types/database";
import { SubscriptionCalendar } from "@/components/subscriptions/subscription-calendar";
import { SubscriptionDialog } from "@/components/subscriptions/subscription-dialog";
import { Badge } from "@/components/ui/badge";

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let subscriptions: Subscription[] = [];
  if (user) {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .order("billing_day", { ascending: true });
    subscriptions = (data as Subscription[]) || [];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground font-sans">
              Subscription Calendar
            </h1>
            <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5">
              {subscriptions.length} tracked
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Predictive recurring cashflow calendar and automated monthly burn rate metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <SubscriptionDialog />
        </div>
      </div>

      {/* 31-Day Visual Grid & Monthly Fixed Burn */}
      <SubscriptionCalendar subscriptions={subscriptions} />
    </div>
  );
}
