"use server";

import { createClient } from "@/lib/supabase/server";
import { accountSchema, type AccountInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createAccountAction(data: AccountInput) {
  const validated = accountSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid account data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to create an account",
    };
  }

  const { error } = await supabase.from("accounts").insert({
    user_id: user.id,
    name: validated.data.name,
    type: validated.data.type,
    balance: validated.data.balance,
    currency: validated.data.currency || "USD",
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  return { success: true };
}

export async function updateAccountAction(id: string, data: AccountInput) {
  const validated = accountSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid account data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to update an account",
    };
  }

  const { error } = await supabase
    .from("accounts")
    .update({
      name: validated.data.name,
      type: validated.data.type,
      balance: validated.data.balance,
      currency: validated.data.currency || "USD",
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  revalidatePath("/analytics");
  return { success: true };
}

export async function deleteAccountAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to delete an account",
    };
  }

  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { success: true };
}
