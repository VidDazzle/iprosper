"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AttorneyLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/partners/logout", { method: "POST" });
    router.push("/attorneys/login");
    router.refresh();
  }
  return (
    <button onClick={logout} aria-label="Sign out"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-rose-400/40 hover:text-rose-300">
      <LogOut className="h-4 w-4" />
    </button>
  );
}
