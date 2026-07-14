"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function AttorneyLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputCls = "border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/partners/login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) { router.push("/partner"); router.refresh(); }
      else { setError(data.error ?? "Sign-in failed."); setLoading(false); }
    } catch { setError("Network error."); setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <Label htmlFor="email" className="mb-1.5 block text-sm text-slate-300">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@firm.com" />
      </div>
      <div>
        <Label htmlFor="password" className="mb-1.5 block text-sm text-slate-300">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in to dashboard"}
      </Button>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-center text-xs text-slate-500">
        Demo: <span className="text-cyan-300">attorney@xdebt.ai</span> / <span className="text-cyan-300">demo1234</span>
      </div>
      <p className="text-center text-sm text-slate-500">
        Not advertising yet? <Link href="/attorneys" className="text-cyan-300 hover:text-cyan-200">Apply to advertise</Link>
      </p>
    </form>
  );
}
