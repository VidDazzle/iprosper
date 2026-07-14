import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";
import Booking from "@/components/partners/booking";
import { getPartner } from "@/lib/partners/store";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Book a Consultation | X Debt", robots: { index: false, follow: false } };

export default async function BookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await getPartner(Number(id));
  if (!partner || partner.status !== "active") notFound();

  return (
    <div className="bg-[#050810] font-sans text-white">
      <SolvanaNav />
      <section className="px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <Link href="/find-an-attorney" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to attorneys
          </Link>

          <div className="mb-6 flex items-start gap-4">
            {partner.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.photoUrl} alt={partner.firmName} className="h-16 w-16 rounded-xl border border-white/10 object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-pink-600 text-xl font-bold text-white">
                {partner.attorneyName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </span>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{partner.firmName}</h1>
              <p className="text-sm text-slate-400">{partner.attorneyName}, Esq.{partner.stateCode ? ` · ${partner.stateCode}` : ""}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {partner.practiceAreas.slice(0, 4).map((a) => (
                  <span key={a} className="rounded border border-white/10 px-2 py-0.5 text-xs text-slate-400">{a}</span>
                ))}
              </div>
            </div>
          </div>

          <Booking partnerId={partner.id} firmName={partner.firmName} />
        </div>
      </section>
      <SolvanaFooter />
    </div>
  );
}
