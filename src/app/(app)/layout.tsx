import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth/session";
import { getDatabase } from "@/lib/db/database";
import { listTopics } from "@/lib/db/pages";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/landing");
  return <AppShell user={user} topics={listTopics(getDatabase())}>{children}</AppShell>;
}
