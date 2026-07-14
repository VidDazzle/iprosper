"use client";

import { useState } from "react";
import { Phone, MessageSquare, Bell, Globe, BadgeCheck } from "lucide-react";
import type { AttorneyPartner } from "@/lib/partners/store";

/** A client-facing attorney advertisement. Contacting logs a per-lead
 *  advertising charge to the attorney (flat fee — never a share of their fee). */
export default function AttorneyCard({ partner }: { partner: AttorneyPartner }) {
  const [revealed, setRevealed] = useState(false);

  async function connect(channel: "call" | "text" | "notification") {
    fetch("/api/partners/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ partnerId: partner.id, channel, practiceArea: partner.practiceAreas[0] }),
    }).catch(() => {});
    setRevealed(true);
  }

  const featured = partner.tier !== "listed";

  return (
    <article className={`rounded-2xl border p-6 ${featured ? "border-cyan-400/30 bg-cyan-400/[0.03]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex items-start gap-4">
        {partner.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.photoUrl} alt={partner.firmName} className="h-16 w-16 flex-shrink-0 rounded-xl border border-white/10 object-cover" />
        ) : (
          <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-pink-600 text-xl font-bold text-white">
            {partner.attorneyName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-white">{partner.firmName}</h3>
            {partner.tier === "spotlight" && <span className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-2 py-0.5 text-[10px] font-semibold text-white">Spotlight</span>}
            {partner.tier === "featured" && <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">Featured</span>}
          </div>
          <p className="text-sm text-slate-400">{partner.attorneyName}, Esq.{partner.stateCode ? ` · ${partner.stateCode}` : ""}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {partner.practiceAreas.slice(0, 3).map((a) => (
              <span key={a} className="rounded border border-white/10 px-2 py-0.5 text-xs text-slate-400">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {partner.bio && <p className="mt-4 text-sm text-slate-400">{partner.bio}</p>}

      {revealed ? (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-4 text-sm">
          <p className="mb-2 flex items-center gap-2 font-medium text-emerald-200"><BadgeCheck className="h-4 w-4" /> You&rsquo;re connected</p>
          {partner.phone && <p className="text-slate-300">Phone: <a href={`tel:${partner.phone}`} className="text-cyan-300">{partner.phone}</a></p>}
          <p className="text-slate-300">Email: <a href={`mailto:${partner.email}`} className="text-cyan-300">{partner.email}</a></p>
          {partner.website && <p className="text-slate-300"><a href={`https://${partner.website}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-300"><Globe className="h-3.5 w-3.5" /> {partner.website}</a></p>}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => connect("call")} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 px-4 py-2 text-sm font-medium text-white">
            <Phone className="h-4 w-4" /> Call
          </button>
          <button onClick={() => connect("text")} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5">
            <MessageSquare className="h-4 w-4" /> Text
          </button>
          <button onClick={() => connect("notification")} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-sm text-white hover:bg-white/5">
            <Bell className="h-4 w-4" /> Request contact
          </button>
        </div>
      )}
      <p className="mt-3 text-[11px] text-slate-600">Paid advertisement. X Debt does not endorse any attorney.</p>
    </article>
  );
}
