import * as React from "react";
import { createClient } from "@/lib/supabase/server";
import type { Goal, Account } from "@/types/database";
import { GoalsClientView } from "@/components/goals/goals-client-view";

export default async function GoalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let goals: (Goal & { accounts?: Pick<Account, "name" | "type"> })[] = [];
  let accounts: Account[] = [];

  if (user) {
    const [goalRes, accRes] = await Promise.all([
      supabase
        .from("goals")
        .select("*, accounts(name, type)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    goals = (goalRes.data as unknown as (Goal & { accounts?: Pick<Account, "name" | "type"> })[]) || [];
    accounts = (accRes.data as Account[]) || [];
  }

  return <GoalsClientView initialGoals={goals} accounts={accounts} />;
}
