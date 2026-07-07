import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { CategoryManager } from "@/components/category-manager";
import { ReviewList } from "@/components/review-list";
import { getAppContext } from "@/lib/server/context";

export default async function ReviewPage() {
  const context = await getAppContext();
  if (context.mode === "unauthenticated") redirect("/login");

  return (
    <AppShell member={context.member}>
      <div className="space-y-4">
        <CategoryManager categories={context.categories} expenses={context.expenses} mode={context.mode} />
        <ReviewList expenses={context.expenses} mode={context.mode} categories={context.categories} />
      </div>
    </AppShell>
  );
}
