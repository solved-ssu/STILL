import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/session";

export default async function IndexPage() {
  redirect((await getCurrentUser()) ? "/home" : "/landing");
}
