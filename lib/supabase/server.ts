import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createLocalSupabaseClient } from "@/lib/supabase/local-db";

export function isLocalDemoMode() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("dummy-project") || url.includes("your-project-id");
}

export async function createClient() {
  if (isLocalDemoMode()) {
    return createLocalSupabaseClient() as unknown as ReturnType<
      typeof createServerClient
    >;
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing user sessions.
          }
        },
      },
    }
  );
}
