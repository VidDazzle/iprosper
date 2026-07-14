/**
 * Attorney-partner data access. DB when TURSO is configured; otherwise an
 * in-memory store so the feature is demonstrable in dev — same signatures.
 */

import { SETUP_FEE, getTier, type Tier } from "./pricing";

export interface AttorneyPartner {
  id: number;
  firmName: string;
  attorneyName: string;
  email: string;
  phone?: string;
  website?: string;
  barNumber?: string;
  stateCode?: string;
  practiceAreas: string[];
  bio?: string;
  photoType?: "firm" | "self";
  photoUrl?: string;
  businessCardUrl?: string;
  businessCardGenerated: boolean;
  tier: Tier;
  setupFeePaid: boolean;
  status: "pending" | "active" | "paused" | "rejected";
  createdAt: string;
}

export interface AttorneyLead {
  id: number;
  partnerId: number;
  clientRef?: string;
  channel: "call" | "text" | "notification";
  practiceArea?: string;
  billingModel: "per_lead";
  feeAmount: number;
  status: "delivered" | "contacted" | "invoiced";
  createdAt: string;
}

const mem = {
  partners: [] as AttorneyPartner[],
  leads: [] as AttorneyLead[],
  seq: { partner: 1, lead: 1 },
  seeded: false,
};

function hasDb() {
  return Boolean(process.env.TURSO_CONNECTION_URL);
}
const now = () => new Date().toISOString();

/** Seed a couple of active advertisers so the directory renders in dev. */
function ensureSeed() {
  if (mem.seeded) return;
  mem.seeded = true;
  mem.partners.push(
    {
      id: mem.seq.partner++, firmName: "Harbor & Reyes Debt Law", attorneyName: "Maria Reyes",
      email: "mreyes@harborreyes.example", phone: "(312) 555-0142", website: "harborreyes.example",
      barNumber: "IL-6291103", stateCode: "IL",
      practiceAreas: ["Credit card debt", "Debt collection defense (FDCPA)", "Chapter 7 bankruptcy"],
      bio: "Consumer debt and bankruptcy attorney with 14 years defending clients against collectors and helping families get a fresh start.",
      photoType: "self", photoUrl: undefined, businessCardGenerated: true,
      tier: "spotlight", setupFeePaid: true, status: "active", createdAt: now(),
    },
    {
      id: mem.seq.partner++, firmName: "Okafor Legal Group", attorneyName: "David Okafor",
      email: "dokafor@okaforlegal.example", phone: "(602) 555-0199", website: "okaforlegal.example",
      barNumber: "AZ-028841", stateCode: "AZ",
      practiceAreas: ["Chapter 13 bankruptcy", "Mortgage / foreclosure", "Auto loan / repossession"],
      bio: "Bankruptcy and foreclosure-defense attorney focused on keeping people in their homes and cars.",
      photoType: "firm", photoUrl: undefined, businessCardGenerated: true,
      tier: "featured", setupFeePaid: true, status: "active", createdAt: now(),
    }
  );
}

/* ------------------------------- partners --------------------------------- */

export async function createPartner(input: Omit<AttorneyPartner, "id" | "createdAt" | "status" | "setupFeePaid" | "businessCardGenerated"> & {
  businessCardGenerated?: boolean;
}): Promise<AttorneyPartner> {
  const record: AttorneyPartner = {
    ...input,
    businessCardGenerated: input.businessCardGenerated ?? false,
    id: mem.seq.partner++,
    setupFeePaid: false,
    status: "pending",
    createdAt: now(),
  };
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyPartners } = await import("@/db/schema");
    const inserted = await db.insert(attorneyPartners).values({
      firmName: input.firmName, attorneyName: input.attorneyName, email: input.email, phone: input.phone,
      website: input.website, barNumber: input.barNumber, stateCode: input.stateCode,
      practiceAreas: JSON.stringify(input.practiceAreas), bio: input.bio, photoType: input.photoType,
      photoUrl: input.photoUrl, businessCardUrl: input.businessCardUrl,
      businessCardGenerated: record.businessCardGenerated, tier: input.tier,
      setupFeePaid: false, status: "pending", createdAt: record.createdAt,
    }).returning({ id: attorneyPartners.id });
    record.id = inserted[0].id;
    return record;
  }
  mem.partners.unshift(record);
  return record;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapPartner(r: any): AttorneyPartner {
  return {
    id: r.id, firmName: r.firmName, attorneyName: r.attorneyName, email: r.email,
    phone: r.phone ?? undefined, website: r.website ?? undefined, barNumber: r.barNumber ?? undefined,
    stateCode: r.stateCode ?? undefined, practiceAreas: r.practiceAreas ? JSON.parse(r.practiceAreas) : [],
    bio: r.bio ?? undefined, photoType: r.photoType ?? undefined, photoUrl: r.photoUrl ?? undefined,
    businessCardUrl: r.businessCardUrl ?? undefined, businessCardGenerated: r.businessCardGenerated,
    tier: r.tier, setupFeePaid: r.setupFeePaid, status: r.status, createdAt: r.createdAt,
  };
}

export async function listActivePartners(practiceArea?: string): Promise<AttorneyPartner[]> {
  let partners: AttorneyPartner[];
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyPartners } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(attorneyPartners).where(eq(attorneyPartners.status, "active"));
    partners = rows.map(mapPartner);
  } else {
    ensureSeed();
    partners = mem.partners.filter((p) => p.status === "active");
  }
  if (practiceArea) partners = partners.filter((p) => p.practiceAreas.includes(practiceArea));
  // Spotlight first, then featured, then listed.
  const rank: Record<Tier, number> = { spotlight: 0, featured: 1, listed: 2 };
  return partners.sort((a, b) => rank[a.tier] - rank[b.tier]);
}

export async function listAllPartners(): Promise<AttorneyPartner[]> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyPartners } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await db.select().from(attorneyPartners).orderBy(desc(attorneyPartners.createdAt));
    return rows.map(mapPartner);
  }
  ensureSeed();
  return [...mem.partners];
}

export async function getPartner(id: number): Promise<AttorneyPartner | undefined> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyPartners } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(attorneyPartners).where(eq(attorneyPartners.id, id)).limit(1);
    return rows[0] ? mapPartner(rows[0]) : undefined;
  }
  ensureSeed();
  return mem.partners.find((p) => p.id === id);
}

/* --------------------------------- leads ---------------------------------- */

export async function recordLead(input: {
  partnerId: number;
  channel: AttorneyLead["channel"];
  practiceArea?: string;
  clientRef?: string;
}): Promise<AttorneyLead | undefined> {
  const partner = await getPartner(input.partnerId);
  if (!partner) return undefined;
  const feeAmount = getTier(partner.tier).perLeadFee;
  const record: AttorneyLead = {
    id: mem.seq.lead++, partnerId: input.partnerId, clientRef: input.clientRef,
    channel: input.channel, practiceArea: input.practiceArea, billingModel: "per_lead",
    feeAmount, status: "delivered", createdAt: now(),
  };
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyLeads } = await import("@/db/schema");
    const inserted = await db.insert(attorneyLeads).values({
      partnerId: input.partnerId, clientRef: input.clientRef, channel: input.channel,
      practiceArea: input.practiceArea, billingModel: "per_lead", feeAmount,
      status: "delivered", createdAt: record.createdAt,
    }).returning({ id: attorneyLeads.id });
    record.id = inserted[0].id;
    return record;
  }
  mem.leads.unshift(record);
  return record;
}

export async function listLeads(): Promise<AttorneyLead[]> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyLeads } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await db.select().from(attorneyLeads).orderBy(desc(attorneyLeads.createdAt));
    return rows.map((r: any) => ({
      id: r.id, partnerId: r.partnerId, clientRef: r.clientRef ?? undefined, channel: r.channel,
      practiceArea: r.practiceArea ?? undefined, billingModel: "per_lead" as const,
      feeAmount: r.feeAmount ?? 0, status: r.status, createdAt: r.createdAt,
    }));
  }
  ensureSeed();
  return [...mem.leads];
}

/** Monthly recurring + setup + per-lead revenue snapshot for the admin. */
export async function partnerRevenue() {
  const [partners, leads] = await Promise.all([listAllPartners(), listLeads()]);
  const active = partners.filter((p) => p.status === "active");
  const mrr = active.reduce((s, p) => s + getTier(p.tier).monthly, 0);
  const setupCollected = partners.filter((p) => p.setupFeePaid).length * SETUP_FEE;
  const leadRevenue = leads.reduce((s, l) => s + l.feeAmount, 0);
  return {
    activePartners: active.length,
    totalPartners: partners.length,
    mrr,
    setupCollected,
    leadRevenue,
    leadCount: leads.length,
  };
}
