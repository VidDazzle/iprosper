import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@apex/db";
import { loadEnv } from "@apex/config";
import { dispatch } from "@apex/dispatch";

const bodySchema = z.object({ url: z.string().url() });

const RATE_LIMIT_PER_DAY = 3; // spec Section 4: "Rate limit 3 generations/IP/day"

function getClientIp(req: NextRequest): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "A valid url is required." }, { status: 400 });
  }

  const ip = getClientIp(req);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const recentCount = await prisma.dispatchJob.count({
    where: {
      source: "rebrand-engine",
      createdAt: { gte: dayAgo },
      task: { path: ["ip"], equals: ip },
    },
  });

  if (recentCount >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      { error: `Rate limit reached: ${RATE_LIMIT_PER_DAY} previews per IP per day.` },
      { status: 429 },
    );
  }

  const env = loadEnv();
  const ts = new Date().toISOString();

  try {
    const job = await dispatch({
      agentId: "rebrand-engine",
      engine: "client-acquisition",
      source: "rebrand-engine",
      task: { url: parsed.data.url, ip, ts },
      budgetCap: env.MAX_COST_PER_PREVIEW,
    });

    return NextResponse.json({ jobId: job.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to queue preview generation." },
      { status: 500 },
    );
  }
}
