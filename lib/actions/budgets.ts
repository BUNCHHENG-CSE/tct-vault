"use server";

import { createClient } from "@/lib/supabase/server";
import { budgetSchema, type BudgetInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function upsertBudgetAction(data: BudgetInput) {
  const validated = budgetSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid budget data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to manage budgets",
    };
  }

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: user.id,
      category: validated.data.category,
      monthly_limit: validated.data.monthly_limit,
    },
    { onConflict: "user_id,category" }
  );

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteBudgetAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to delete a budget",
    };
  }

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  return { success: true };
}
