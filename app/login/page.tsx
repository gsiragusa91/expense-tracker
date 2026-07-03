import Link from "next/link";
import { signInAction } from "@/app/actions";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const hasSupabase = isSupabaseConfigured();

  return (
    <main className="mobile-shell flex min-h-dvh items-center px-5 py-8">
      <section className="w-full rounded-[28px] border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--primary-strong)]">Expense Tracker</p>
        <h1 className="mt-2 text-3xl font-black text-[var(--ink)]">Entrar al hogar</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Dos logins separados, una misma cuenta compartida para Guido y Dalu.
        </p>

        {hasSupabase ? (
          <form action={signInAction} className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-[var(--ink)]">
              Email
              <input name="email" type="email" className="field mt-1" required autoComplete="email" />
            </label>
            <label className="block text-sm font-bold text-[var(--ink)]">
              Password
              <input name="password" type="password" className="field mt-1" required autoComplete="current-password" />
            </label>
            {error ? <p className="rounded-2xl bg-[var(--danger)]/20 p-3 text-sm text-[var(--ink)]">{decodeURIComponent(error)}</p> : null}
            <button type="submit" className="w-full rounded-full bg-[var(--primary-strong)] px-4 py-3 font-bold text-white">
              Entrar
            </button>
          </form>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="rounded-2xl bg-[var(--warning)]/55 p-4 text-sm font-semibold text-[var(--ink)]">
              Supabase no está configurado todavía. La app abre en modo demo para validar UI, parsers y flujo de voz.
            </p>
            <Link href="/" className="block w-full rounded-full bg-[var(--primary-strong)] px-4 py-3 text-center font-bold text-white">
              Entrar modo demo
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
