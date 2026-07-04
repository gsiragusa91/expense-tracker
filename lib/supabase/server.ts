import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv, isSupabaseEnvConfigured } from "@/lib/supabase/env";

export function isSupabaseConfigured() {
  return isSupabaseEnvConfigured();
}

export async function createClient() {
  if (!isSupabaseConfigured()) return null;
  const { url, anonKey } = getSupabaseEnv();

  const cookieStore = await cookies();
  return createServerClient(
    url!,
    anonKey!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Server Components cannot mutate cookies. Route handlers/actions can.
          }
        }
      }
    }
  );
}
