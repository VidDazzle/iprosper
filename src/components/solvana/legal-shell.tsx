import type { ReactNode } from "react";
import SolvanaNav from "@/components/solvana/nav";
import SolvanaFooter from "@/components/solvana/footer";

export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-[#050810] font-sans text-white">
      <SolvanaNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="mb-2 text-4xl font-bold">{title}</h1>
        <p className="mb-10 text-sm text-gray-500">Last updated: {updated}</p>
        <div className="space-y-8 text-sm leading-relaxed text-gray-300 [&_h2]:mb-3 [&_h2]:mt-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white">
          {children}
        </div>
      </main>
      <SolvanaFooter />
    </div>
  );
}
