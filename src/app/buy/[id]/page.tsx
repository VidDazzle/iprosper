"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Loader2, ShoppingBag, Lock, CheckCircle2 } from "lucide-react";

function money(cents: number, currency = "usd") {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency.toUpperCase() }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default function BuyPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const src = search.get("src"); // e.g. a webinar/meeting room code

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [placed, setPlaced] = useState<null | { manual: boolean }>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/products/${params.id}`);
    if (res.ok) setProduct((await res.json()).product);
    setLoading(false);
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function buy() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        buyerName: name || undefined,
        buyerEmail: email || undefined,
        sourceContext: src || undefined,
      }),
    });
    const data = await res.json();
    setBusy(false);
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl; // Stripe hosted checkout
      return;
    }
    if (data.orderId) {
      setPlaced({ manual: data.provider === "manual" });
      return;
    }
    setError(data.error || "Could not start checkout.");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!product) {
    return <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] text-gray-300">Product not found.</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0b0b] p-4 text-white">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#141414]">
        {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="h-44 w-full object-cover" />}
        <div className="p-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-pink-500/40 bg-pink-500/10 px-3 py-1 text-xs font-medium text-pink-300">
            <ShoppingBag className="h-3.5 w-3.5" /> Secure checkout
          </div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          {product.description && <p className="mt-1 text-sm text-gray-400">{product.description}</p>}
          <div className="mt-4 text-3xl font-bold text-emerald-400">{money(product.priceCents, product.currency)}</div>

          {placed ? (
            <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5 text-center">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-400" />
              <p className="font-semibold">Order placed!</p>
              <p className="mt-1 text-sm text-gray-400">
                {placed.manual
                  ? "We've recorded your order and will email you payment details shortly."
                  : "Thank you for your purchase."}
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-pink-500/60" />
              <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-sm outline-none focus:border-pink-500/60" />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button onClick={buy} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 text-sm font-semibold text-black hover:bg-gray-200 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Buy now — {money(product.priceCents, product.currency)}
              </button>
              <p className="text-center text-xs text-gray-500">
                {src ? "You're purchasing live from the webinar. " : ""}Payments are processed securely.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
