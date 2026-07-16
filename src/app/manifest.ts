import type { MetadataRoute } from "next";

/**
 * PWA manifest (served at /manifest.webmanifest). Makes the app installable on
 * phone and desktop — "Add to Home Screen" / "Install app" — running full-screen
 * with its own icon, like a native download.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Evolve — AI business suite",
    short_name: "Evolve",
    description:
      "Autonomous AI calendar, encrypted email, meetings, CRM, and delivery — one installable app.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0b",
    theme_color: "#0b0b0b",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Mail", url: "/mail" },
      { name: "Calendar", url: "/calendar/dashboard" },
      { name: "Meetings", url: "/meetings" },
      { name: "CRM", url: "/crm" },
    ],
  };
}
