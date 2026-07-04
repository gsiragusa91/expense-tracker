function cleanEnvValue(value: string | undefined) {
  if (!value) return undefined;

  let cleaned = value.trim();

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith("`") && cleaned.endsWith("`"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  const assignmentIndex = cleaned.indexOf("=");
  if (assignmentIndex > -1 && cleaned.slice(0, assignmentIndex).includes("SUPABASE")) {
    cleaned = cleaned.slice(assignmentIndex + 1).trim();
  }

  return cleaned || undefined;
}

export function getSupabaseEnv() {
  return {
    url: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  };
}

export function isSupabaseEnvConfigured() {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.anonKey);
}
