import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Dashboard } from "@/components/dashboard";
import { getDashboardData } from "@/lib/server/context";
import type { DashboardView } from "@/lib/domain/types";

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<{ month?: string; view?: string }>;
}) {
  const { month, view } = await searchParams;
  const dashboardView: DashboardView = view === "devengado" ? "devengado" : "cashflow";
  const data = await getDashboardData(month, dashboardView);
  if (!data) redirect("/login");

  return (
    <AppShell member={data.member}>
      <Dashboard
        summary={data.summary}
        expenses={data.expenses}
        availableMonths={data.availableMonths}
        view={dashboardView}
      />
    </AppShell>
  );
}
