import Link from "next/link";
import type { Metadata } from "next";
import { requireAttorney } from "@/lib/partners/session";
import { getPartner } from "@/lib/partners/store";
import { SolvanaLogo } from "@/components/solvana/nav";
import AttorneyEditForm from "@/components/partners/edit-form";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Edit Listing | X Debt", robots: { index: false, follow: false } };

export default async function EditListingPage() {
  const session = await requireAttorney();
  const partner = await getPartner(session.pid);
  if (!partner) return null;

  return (
    <div className="min-h-screen bg-[#050810] font-sans text-slate-200">
      <header className="border-b border-white/10 bg-[#03040a]/80 px-5 py-3">
        <div className="mx-auto max-w-3xl"><Link href="/"><SolvanaLogo /></Link></div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-8">
        <Link href="/partner" className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"><ArrowLeft className="h-4 w-4" /> Back to dashboard</Link>
        <h1 className="mb-1 text-2xl font-bold text-white">Edit your listing</h1>
        <p className="mb-6 text-sm text-slate-400">Update your bio, contact info, practice areas, and booking calendar.</p>
        <AttorneyEditForm
          initial={{
            bio: partner.bio ?? "", phone: partner.phone ?? "", website: partner.website ?? "",
            practiceAreas: partner.practiceAreas, calendarEnabled: partner.calendarEnabled,
            busyIcsUrl: partner.busyIcsUrl ?? "",
            availability: partner.availability ?? { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, slotMinutes: 30, timezone: "America/Chicago" },
          }}
        />
      </main>
    </div>
  );
}
