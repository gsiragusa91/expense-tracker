import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Importer } from "@/components/importer";
import { getAppContext } from "@/lib/server/context";

export default async function ImportPage() {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") redirect("/login");

  return (
    <AppShell member={context.member}>
      <Importer />
    </AppShell>
  );
}
