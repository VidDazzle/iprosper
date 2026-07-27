import { prisma } from "@apex/db";
import { loadEnv, isChannelLive } from "@apex/config";
import type { BrandKit } from "@apex/contracts";

export interface VoiceResult {
  voiceAgentId: string | null;
  live: boolean;
}

/**
 * Ephemeral ElevenLabs voice-demo agent, primed with business name +
 * services, expiring with the preview (spec Section 4). Gated on the
 * "voice" channel switch (LIVE_MODE AND VOICE_ENABLED) — in dry-run
 * this returns a null agent id and touches nothing external, so no
 * real ElevenLabs cost is incurred while developing/testing. NOT
 * verified against a live ElevenLabs API in this build — no key was
 * available to test against; the request shape below is best-effort
 * from ElevenLabs' documented conversational-agent API and needs a
 * real smoke test before this stage is trusted live.
 */
export async function voice(jobId: string, brandKit: BrandKit): Promise<VoiceResult> {
  const env = loadEnv();

  if (!isChannelLive("voice") || !env.ELEVENLABS_API_KEY) {
    await prisma.previewResult.update({ where: { jobId }, data: { voiceAgentId: null } });
    return { voiceAgentId: null, live: false };
  }

  const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
    method: "POST",
    headers: {
      "xi-api-key": env.ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `${brandKit.name} — APEX Preview Receptionist`,
      conversation_config: {
        agent: {
          prompt: {
            prompt: `You are the AI receptionist for ${brandKit.name}. Services: ${brandKit.services.join(", ")}. Answer questions about these services warmly and briefly. This is a demo — do not take payments or make bookings.`,
          },
          first_message: `Hi, thanks for calling ${brandKit.name}! How can I help you today?`,
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`ElevenLabs agent creation failed: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { agent_id: string };
  await prisma.previewResult.update({ where: { jobId }, data: { voiceAgentId: data.agent_id } });

  return { voiceAgentId: data.agent_id, live: true };
}
