"use client";

import { useEffect, useState, useCallback } from "react";
import Navigation from "@/components/sections/navigation";
import { Loader2, Plus, Copy, ExternalLink, ShoppingBag } from "lucide-react";

function money(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function ProductsManage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/products");
    const data = await res.json();
    setRows(data.products || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  async function create() {
    if (!name.trim() || !price) return;
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, priceCents: Math.round(parseFloat(price) * 100) }),
    });
    setName("");
    setPrice("");
    setDescription("");
    load();
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <Navigation />
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1 text-xs font-medium text-pink-300">
            <ShoppingBag className="h-3.5 w-3.5" /> Sell anywhere
          </div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-gray-400">
            Create a product and share its buy link — drop it in a webinar chat and people can purchase live.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-medium"><Plus className="h-4 w-4" /> New product</h2>
          <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Product name" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="Price $" className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          </div>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description" rows={2} className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none" />
          <button onClick={create} className="mt-3 flex items-center gap-2 rounded-lg bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-gray-200">
            <Plus className="h-4 w-4" /> Create
          </button>
        </div>

        {loading ? (
          <div className="flex h-24 items-center justify-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">No products yet.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((p) => {
              const link = `${origin}/buy/${p.slug}`;
              return (
                <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3">
                  <div>
                    <div className="font-medium">{p.name} · <span className="text-emerald-400">{money(p.priceCents, p.currency)}</span></div>
                    <div className="text-xs text-gray-500">{link}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => navigator.clipboard.writeText(link)} className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"><Copy className="h-3.5 w-3.5" /> Copy link</button>
                    <a href={`/buy/${p.slug}`} target="_blank" className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs hover:bg-white/5"><ExternalLink className="h-3.5 w-3.5" /> View</a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
