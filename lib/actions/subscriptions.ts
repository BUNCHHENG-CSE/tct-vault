"use server";

import { createClient } from "@/lib/supabase/server";
import { subscriptionSchema, type SubscriptionInput } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function createSubscriptionAction(data: SubscriptionInput) {
  const validated = subscriptionSchema.safeParse(data);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid subscription data",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to create a subscription",
    };
  }

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    name: validated.data.name,
    amount: validated.data.amount,
    billing_day: validated.data.billing_day,
    category: validated.data.category,
    status: validated.data.status,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleSubscriptionStatusAction(
  id: string,
  newStatus: "active" | "paused"
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to update a subscription",
    };
  }

  const { error } = await supabase
    .from("subscriptions")
    .update({ status: newStatus })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSubscriptionAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "You must be signed in to delete a subscription",
    };
  }

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/subscriptions");
  revalidatePath("/dashboard");
  return { success: true };
}
