import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Client Portal | X Debt",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="font-sans">{children}</div>;
}
