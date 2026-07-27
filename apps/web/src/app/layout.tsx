import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "APEX Rebrand Preview",
  description: "See your business, reimagined.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
