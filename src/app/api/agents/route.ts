import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents/registry";

/** Public roster of Solvana's AI agent workforce (marketing-safe fields only —
 *  system prompts and tool grants stay server-side). */
export async function GET() {
  const roster = AGENTS.map((a) => ({
    id: a.id,
    name: a.name,
    role: a.role,
    summary: a.summary,
    channels: a.channels,
    voice: a.voice ? { style: a.voice.style, languages: a.voice.languages } : null,
    clientFacing: a.channels.some((c) => c !== "internal"),
  }));
  return NextResponse.json({ workforce: roster, count: roster.length });
}
