"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

function useAuthSubmit(endpoint: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(payload: Record<string, unknown>) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/portal");
        router.refresh();
      } else {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
      }
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }
  return { submit, loading, error };
}

const inputCls = "border-white/15 bg-[#03040a] text-white placeholder:text-slate-600";

export function SignInForm() {
  const { submit, loading, error } = useAuthSubmit("/api/portal/login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); submit({ email, password }); }}
      className="space-y-4"
    >
      <div>
        <Label htmlFor="email" className="mb-1.5 block text-sm text-slate-300">Email</Label>
        <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@email.com" />
      </div>
      <div>
        <Label htmlFor="password" className="mb-1.5 block text-sm text-slate-300">Password</Label>
        <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} placeholder="••••••••" />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
      </Button>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3 text-center text-xs text-slate-500">
        Demo account: <span className="text-cyan-300">demo@xdebt.ai</span> / <span className="text-cyan-300">demo1234</span>
      </div>
      <p className="text-center text-sm text-slate-500">
        New client? <Link href="/portal/signup" className="text-cyan-300 hover:text-cyan-200">Create your account</Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const { submit, loading, error } = useAuthSubmit("/api/portal/register");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <form onSubmit={(e) => { e.preventDefault(); submit(form); }} className="space-y-4">
      <div>
        <Label htmlFor="name" className="mb-1.5 block text-sm text-slate-300">Full name</Label>
        <Input id="name" required value={form.name} onChange={set("name")} className={inputCls} placeholder="Your name" />
      </div>
      <div>
        <Label htmlFor="email" className="mb-1.5 block text-sm text-slate-300">Email</Label>
        <Input id="email" type="email" required value={form.email} onChange={set("email")} className={inputCls} placeholder="you@email.com" />
      </div>
      <div>
        <Label htmlFor="phone" className="mb-1.5 block text-sm text-slate-300">Mobile (for approval texts)</Label>
        <Input id="phone" type="tel" value={form.phone} onChange={set("phone")} className={inputCls} placeholder="(555) 555-5555" />
      </div>
      <div>
        <Label htmlFor="password" className="mb-1.5 block text-sm text-slate-300">Password</Label>
        <Input id="password" type="password" required value={form.password} onChange={set("password")} className={inputCls} placeholder="At least 8 characters" />
      </div>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <Button type="submit" disabled={loading} className="h-11 w-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 text-white hover:from-cyan-400 hover:to-violet-500">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
      </Button>
      <p className="text-center text-xs text-slate-500">
        By creating an account you agree to our{" "}
        <Link href="/legal/terms" className="text-cyan-300">Terms</Link> and{" "}
        <Link href="/legal/privacy" className="text-cyan-300">Privacy Policy</Link>.
      </p>
      <p className="text-center text-sm text-slate-500">
        Already enrolled? <Link href="/portal/signin" className="text-cyan-300 hover:text-cyan-200">Sign in</Link>
      </p>
    </form>
  );
}
