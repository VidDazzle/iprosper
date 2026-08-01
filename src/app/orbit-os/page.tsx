import type { Metadata } from "next";
import OrbitLanding from "./OrbitLanding";

export const metadata: Metadata = {
  title: "Orbit — Your Life, In Sync",
  description:
    "Orbit is the personal OS for the life you actually live. Connect the Google or Outlook calendar you already use, and let a concierge, fitness coach, shared date-planner, and nearby-people discovery orbit around your real availability.",
};

export default function OrbitOsPage() {
  return <OrbitLanding />;
}
