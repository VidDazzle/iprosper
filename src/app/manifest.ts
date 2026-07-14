import type { MetadataRoute } from "next";

// Web App Manifest — makes X Debt installable on phones and desktops
// ("Add to Home Screen" / "Install app"), launching standalone like a native app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "X Debt — Get Out of Debt, Faster",
    short_name: "X Debt",
    description:
      "X Debt by VidDazzle LLC builds a free plan to eliminate every kind of debt and negotiates settlements on qualifying unsecured debt. Track your plan, upload documents, and approve actions from your phone.",
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
