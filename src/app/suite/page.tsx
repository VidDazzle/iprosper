import type { Metadata } from "next";
import SuiteLanding from "./SuiteLanding";

export const metadata: Metadata = {
  title: "Evolve — The Autonomous Business OS",
  description:
    "Three autonomous AI instruments — encrypted Mail, self-scheduling Calendar, and consent-first Meet — running on one brain that heals, optimizes, and secures itself.",
};

export default function SuitePage() {
  return <SuiteLanding />;
}
