export function cleanEnvValue(value: string | undefined) {
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
    url: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL),
    anonKey: cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY)
  };
}

export function isSupabaseEnvConfigured() {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.anonKey);
}

export function getSupabaseDiagnostics() {
  const { url, anonKey } = getSupabaseEnv();
  const urlRef = url?.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i)?.[1] ?? null;
  let jwtRef: string | null = null;
  let jwtRole: string | null = null;
  let jwtError: string | null = null;

  if (anonKey) {
    try {
      const [, payload] = anonKey.split(".");
      if (!payload) throw new Error("missing payload");
      const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
        ref?: string;
        role?: string;
      };
      jwtRef = parsed.ref ?? null;
      jwtRole = parsed.role ?? null;
    } catch (error) {
      jwtError = error instanceof Error ? error.message : "invalid jwt";
    }
  }

  return {
    configured: Boolean(url && anonKey),
    urlHost: url ? new URL(url).host : null,
    urlRef,
    anonKeyLength: anonKey?.length ?? 0,
    jwtRef,
    jwtRole,
    jwtError,
    refMatches: Boolean(urlRef && jwtRef && urlRef === jwtRef)
  };
}
