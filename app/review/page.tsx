import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ReviewList } from "@/components/review-list";
import { getAppContext } from "@/lib/server/context";

export default async function ReviewPage() {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") redirect("/login");

  return (
    <AppShell member={context.member}>
      <ReviewList expenses={context.expenses} mode={context.mode} />
    </AppShell>
  );
}
