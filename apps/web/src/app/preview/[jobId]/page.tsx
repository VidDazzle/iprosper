import type { Metadata } from "next";
import { PreviewClient } from "./PreviewClient";

// Spec Section 4: "Preview pages noindex, watermarked, auto-purged at TTL."
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ exp?: string; sig?: string }>;
}) {
  const { jobId } = await params;
  const { exp, sig } = await searchParams;

  return <PreviewClient jobId={jobId} exp={exp} sig={sig} />;
}
