"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function AdminLogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin-login");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      aria-label="Sign out"
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-rose-400/40 hover:text-rose-300"
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
