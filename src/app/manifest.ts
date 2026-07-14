import type { MetadataRoute } from "next";

// Web App Manifest — makes Solvana installable on phones and desktops
// ("Add to Home Screen" / "Install app"), launching standalone like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Solvana — AI Debt Settlement",
    short_name: "Solvana",
    description:
      "Solvana's AI voice agents negotiate with your creditors to settle unsecured debts for less than you owe. Track your program, upload documents, and approve settlements from your phone.",
    id: "/",
    start_url: "/portal",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#050810",
    theme_color: "#050810",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "My dashboard", url: "/portal", description: "See your program status" },
      { name: "Approvals", url: "/portal/approvals", description: "Review actions awaiting your decision" },
      { name: "Upload a document", url: "/portal/documents", description: "Send a statement or letter for AI analysis" },
    ],
  };
}
