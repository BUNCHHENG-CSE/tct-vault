"use server";

import { createClient, isLocalDemoMode } from "@/lib/supabase/server";
import { resetLocalDbWithSeed } from "@/lib/supabase/local-db";
import { buildSeedDataset } from "@/lib/seed-data";
import { revalidatePath } from "next/cache";

export async function seedDemoDataAction() {
  if (isLocalDemoMode()) {
    resetLocalDbWithSeed();
    revalidatePath("/dashboard");
    revalidatePath("/accounts");
    revalidatePath("/transactions");
    revalidatePath("/subscriptions");
    revalidatePath("/budgets");
    revalidatePath("/goals");
    revalidatePath("/analytics");
    return { success: true };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to seed demo data",
    };
  }

  const dataset = buildSeedDataset(user.id);

  // 1. Insert accounts (strip deterministic non-UUID ids so Postgres generates valid UUIDs)
  const accountsPayload = dataset.accounts.map(({ name, type, balance, currency }) => ({
    user_id: user.id,
    name,
    type,
    balance,
    currency: currency || "USD",
  }));

  const { data: accounts, error: accError } = await supabase
    .from("accounts")
    .insert(accountsPayload)
    .select("id, name, type");

  if (accError || !accounts || accounts.length === 0) {
    return {
      success: false,
      error: accError?.message || "Failed to create demo accounts",
    };
  }

  const checkingAcc =
    accounts.find((a: { type: string }) => a.type === "checking") || accounts[0];
  const creditAcc =
    accounts.find((a: { type: string }) => a.type === "credit") || accounts[0];

  // 2. Insert transactions across 6 months
  const transactionsPayload = dataset.transactions.map((tx) => ({
    user_id: user.id,
    account_id: tx.account_id.includes("3333") ? creditAcc.id : checkingAcc.id,
    description: tx.description,
    amount: tx.amount,
    type: tx.type,
    category: tx.category,
    date: tx.date,
  }));

  await supabase.from("transactions").insert(transactionsPayload);

  // 3. Insert recurring subscriptions
  const subscriptionsPayload = dataset.subscriptions.map(
    ({ name, amount, billing_day, category, status }) => ({
      user_id: user.id,
      name,
      amount,
      billing_day,
      category,
      status,
    })
  );

  await supabase.from("subscriptions").insert(subscriptionsPayload);

  // 4. Upsert monthly category budgets
  const budgetsPayload = dataset.budgets.map(({ category, monthly_limit }) => ({
    user_id: user.id,
    category,
    monthly_limit,
  }));

  await supabase
    .from("budgets")
    .upsert(budgetsPayload, { onConflict: "user_id,category" });

  // 5. Insert savings goals
  const goalsPayload = dataset.goals.map((g) => ({
    user_id: user.id,
    name: g.name,
    target_amount: g.target_amount,
    current_amount: g.current_amount,
    target_date: g.target_date,
    category: g.category,
    account_id: checkingAcc.id,
  }));

  await supabase.from("goals").insert(goalsPayload);

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  revalidatePath("/subscriptions");
  revalidatePath("/budgets");
  revalidatePath("/goals");
  revalidatePath("/analytics");

  return { success: true };
}
