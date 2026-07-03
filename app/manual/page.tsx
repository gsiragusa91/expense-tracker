import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ManualExpenseForm } from "@/components/manual-expense-form";
import { getAppContext } from "@/lib/server/context";

export default async function ManualPage() {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") redirect("/login");

  return (
    <AppShell member={context.member}>
      <ManualExpenseForm member={context.member} />
    </AppShell>
  );
}
