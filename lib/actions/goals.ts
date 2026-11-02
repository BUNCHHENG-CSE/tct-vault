"use server";

import { createClient } from "@/lib/supabase/server";
import {
  goalSchema,
  goalContributionSchema,
  type GoalInput,
  type GoalContributionInput,
} from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createGoalAction(data: GoalInput) {
  const validated = goalSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid goal data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to create a savings goal",
    };
  }

  const { error } = await supabase.from("goals").insert({
    user_id: user.id,
    name: validated.data.name,
    target_amount: validated.data.target_amount,
    current_amount: validated.data.current_amount || 0,
    target_date: validated.data.target_date || null,
    category: validated.data.category || "general",
    account_id: validated.data.account_id || null,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateGoalAction(id: string, data: GoalInput) {
  const validated = goalSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid goal data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to update a savings goal",
    };
  }

  const { error } = await supabase
    .from("goals")
    .update({
      name: validated.data.name,
      target_amount: validated.data.target_amount,
      current_amount: validated.data.current_amount,
      target_date: validated.data.target_date || null,
      category: validated.data.category || "general",
      account_id: validated.data.account_id || null,
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteGoalAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to delete a goal",
    };
  }

  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function contributeToGoalAction(data: GoalContributionInput) {
  const validated = goalContributionSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid contribution data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to modify goal funds",
    };
  }

  // 1. Fetch current goal
  const { data: goal, error: goalErr } = await supabase
    .from("goals")
    .select("*")
    .eq("id", validated.data.goal_id)
    .eq("user_id", user.id)
    .single();

  if (goalErr || !goal) {
    return {
      success: false,
      error: "Goal was not found",
    };
  }

  const currentGoalAmount = Number(goal.current_amount) || 0;
  const delta =
    validated.data.type === "deposit"
      ? validated.data.amount
      : -validated.data.amount;

  const newGoalAmount = Math.max(0, Number((currentGoalAmount + delta).toFixed(2)));

  // 2. If an account is selected, adjust account balance (deposit to goal deducts from account; withdrawal adds to account)
  const targetAccountId = validated.data.account_id || goal.account_id;
  if (targetAccountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("id, balance, name")
      .eq("id", targetAccountId)
      .eq("user_id", user.id)
      .single();

    if (account) {
      const currentAccBalance = Number(account.balance) || 0;
      const accountDelta =
        validated.data.type === "deposit"
          ? -validated.data.amount
          : validated.data.amount;
      const newAccBalance = Number((currentAccBalance + accountDelta).toFixed(2));

      await supabase
        .from("accounts")
        .update({ balance: newAccBalance })
        .eq("id", targetAccountId)
        .eq("user_id", user.id);

      // Record a transaction for the vault transfer
      await supabase.from("transactions").insert({
        user_id: user.id,
        account_id: targetAccountId,
        description:
          validated.data.type === "deposit"
            ? `Goal Allocation: ${goal.name}`
            : `Goal Withdrawal: ${goal.name}`,
        amount: validated.data.amount,
        type: validated.data.type === "deposit" ? "expense" : "income",
        category: "general",
        date: new Date().toISOString().slice(0, 10),
      });
    }
  }

  // 3. Update goal
  const { error: updateGoalErr } = await supabase
    .from("goals")
    .update({ current_amount: newGoalAmount })
    .eq("id", validated.data.goal_id)
    .eq("user_id", user.id);

  if (updateGoalErr) {
    return {
      success: false,
      error: updateGoalErr.message,
    };
  }

  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  return { success: true };
}
