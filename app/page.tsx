import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/server/context";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const { month } = await searchParams;
  const data = await getDashboardData(month);
  if (!data) redirect("/login");

  return (
    <AppShell member={data.member}>
      <Dashboard summary={data.summary} expenses={data.expenses} availableMonths={data.availableMonths} />
    </AppShell>
  );
}
