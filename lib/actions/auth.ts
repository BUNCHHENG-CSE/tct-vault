"use server";

import { createClient } from "@/lib/supabase/server";
import { authSchema } from "@/lib/validations";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function loginAction(formData: FormData | { email: string; password: string }) {
  const rawData =
    formData instanceof FormData
      ? {
          email: formData.get("email"),
          password: formData.get("password"),
        }
      : formData;

  const validated = authSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid input",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signupAction(formData: FormData | { email: string; password: string }) {
  const rawData =
    formData instanceof FormData
      ? {
          email: formData.get("email"),
          password: formData.get("password"),
        }
      : formData;

  const validated = authSchema.safeParse(rawData);
  if (!validated.success) {
    return {
      success: false,
      error: validated.error.issues[0]?.message || "Invalid input",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: validated.data.email,
    password: validated.data.password,
  });

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
