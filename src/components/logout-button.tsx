"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return <button type="button" onClick={async () => { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/landing"); router.refresh(); }} className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-200 hover:text-stone-700" aria-label="로그아웃"><LogOut size={17} /></button>;
}
