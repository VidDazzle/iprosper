/**
 * Attorney-partner data access. DB when TURSO is configured; otherwise an
 * in-memory store so the feature is demonstrable in dev — same signatures.
 */

import { SETUP_FEE, CALENDAR_ADDON, FREE_REFERRALS, getTier, type Tier } from "./pricing";
import type { Availability } from "./scheduling";

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
  passwordHash?: string;
  // Advertiser agreement: background-check consent + sole-discretion acknowledgment
  backgroundCheckConsent: boolean;
  advertiserAgreementVersion?: string;
  advertiserAgreedAt?: string;
  // Chronos calendar add-on
  calendarEnabled: boolean;
  calendarProvider?: "google" | "ics" | "manual";
  busyIcsUrl?: string;
  availability?: Availability;
  createdAt: string;
}

export interface AttorneyAppointment {
  id: number;
  partnerId: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  topic?: string;
  startUtc: string;
  endUtc: string;
  status: "booked" | "completed" | "cancelled";
  feeAmount: number;
  createdAt: string;
}

const DEFAULT_AVAILABILITY: Availability = {
  days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, slotMinutes: 30,
  timezone: "America/Chicago", horizonDays: 14, bufferMinutes: 0,
};

export interface AttorneyLead {
  id: number;
  partnerId: number;
  clientRef?: string;
  channel: "call" | "text" | "notification";
  practiceArea?: string;
  billingModel: "per_lead";
  feeAmount: number;
  complimentary: boolean; // one of the first free referrals
  status: "delivered" | "contacted" | "invoiced";
  createdAt: string;
}

const mem = {
  partners: [] as AttorneyPartner[],
  leads: [] as AttorneyLead[],
  appointments: [] as AttorneyAppointment[],
  seq: { partner: 1, lead: 1, appt: 1 },
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
      tier: "spotlight", setupFeePaid: true, status: "active",
      backgroundCheckConsent: true, advertiserAgreementVersion: "2026-07-14", advertiserAgreedAt: now(),
      calendarEnabled: true, calendarProvider: "ics", busyIcsUrl: undefined,
      availability: { days: [1, 2, 3, 4, 5], startHour: 9, endHour: 17, slotMinutes: 30, timezone: "America/Chicago", horizonDays: 14, bufferMinutes: 15 },
      createdAt: now(),
    },
    {
      id: mem.seq.partner++, firmName: "Okafor Legal Group", attorneyName: "David Okafor",
      email: "dokafor@okaforlegal.example", phone: "(602) 555-0199", website: "okaforlegal.example",
      barNumber: "AZ-028841", stateCode: "AZ",
      practiceAreas: ["Chapter 13 bankruptcy", "Mortgage / foreclosure", "Auto loan / repossession"],
      bio: "Bankruptcy and foreclosure-defense attorney focused on keeping people in their homes and cars.",
      photoType: "firm", photoUrl: undefined, businessCardGenerated: true,
      tier: "featured", setupFeePaid: true, status: "active",
      backgroundCheckConsent: true, advertiserAgreementVersion: "2026-07-14", advertiserAgreedAt: now(),
      calendarEnabled: true, calendarProvider: "manual", busyIcsUrl: undefined,
      availability: { days: [1, 2, 3, 4], startHour: 10, endHour: 16, slotMinutes: 45, timezone: "America/Phoenix", horizonDays: 10, bufferMinutes: 0 },
      createdAt: now(),
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
      setupFeePaid: false, status: "pending", passwordHash: input.passwordHash,
      backgroundCheckConsent: input.backgroundCheckConsent ?? false,
      advertiserAgreementVersion: input.advertiserAgreementVersion,
      advertiserAgreedAt: input.advertiserAgreedAt,
      calendarEnabled: input.calendarEnabled ?? false, calendarProvider: input.calendarProvider,
      busyIcsUrl: input.busyIcsUrl, timezone: input.availability?.timezone,
      availability: input.availability ? JSON.stringify(input.availability) : null,
      createdAt: record.createdAt,
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
    tier: r.tier, setupFeePaid: r.setupFeePaid, status: r.status, passwordHash: r.passwordHash ?? undefined,
    backgroundCheckConsent: Boolean(r.backgroundCheckConsent),
    advertiserAgreementVersion: r.advertiserAgreementVersion ?? undefined,
    advertiserAgreedAt: r.advertiserAgreedAt ?? undefined,
    calendarEnabled: Boolean(r.calendarEnabled), calendarProvider: r.calendarProvider ?? undefined,
    busyIcsUrl: r.busyIcsUrl ?? undefined,
    availability: r.availability ? JSON.parse(r.availability) : (r.calendarEnabled ? DEFAULT_AVAILABILITY : undefined),
    createdAt: r.createdAt,
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
  // First FREE_REFERRALS client connections are complimentary (signup incentive).
  const priorLeads = (await listLeads()).filter((l) => l.partnerId === input.partnerId).length;
  const complimentary = priorLeads < FREE_REFERRALS;
  const feeAmount = complimentary ? 0 : getTier(partner.tier).perLeadFee;
  const record: AttorneyLead = {
    id: mem.seq.lead++, partnerId: input.partnerId, clientRef: input.clientRef,
    channel: input.channel, practiceArea: input.practiceArea, billingModel: "per_lead",
    feeAmount, complimentary, status: "delivered", createdAt: now(),
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
      feeAmount: r.feeAmount ?? 0, complimentary: (r.feeAmount ?? 0) === 0, status: r.status, createdAt: r.createdAt,
    }));
  }
  ensureSeed();
  return [...mem.leads];
}

export async function leadsForPartner(partnerId: number): Promise<AttorneyLead[]> {
  return (await listLeads()).filter((l) => l.partnerId === partnerId);
}

export async function appointmentsForPartner(partnerId: number): Promise<AttorneyAppointment[]> {
  return (await listAppointments()).filter((a) => a.partnerId === partnerId);
}

type EditablePartnerFields = Partial<Pick<AttorneyPartner,
  "bio" | "phone" | "website" | "practiceAreas" | "calendarEnabled" | "calendarProvider" | "busyIcsUrl" | "availability">>;

/** Attorney self-service listing edit. */
export async function updatePartner(id: number, patch: EditablePartnerFields): Promise<AttorneyPartner | undefined> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyPartners } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const values: any = {};
    if (patch.bio !== undefined) values.bio = patch.bio;
    if (patch.phone !== undefined) values.phone = patch.phone;
    if (patch.website !== undefined) values.website = patch.website;
    if (patch.practiceAreas !== undefined) values.practiceAreas = JSON.stringify(patch.practiceAreas);
    if (patch.calendarEnabled !== undefined) values.calendarEnabled = patch.calendarEnabled;
    if (patch.calendarProvider !== undefined) values.calendarProvider = patch.calendarProvider;
    if (patch.busyIcsUrl !== undefined) values.busyIcsUrl = patch.busyIcsUrl;
    if (patch.availability !== undefined) { values.availability = JSON.stringify(patch.availability); values.timezone = patch.availability?.timezone; }
    if (Object.keys(values).length) await db.update(attorneyPartners).set(values).where(eq(attorneyPartners.id, id));
    return getPartner(id);
  }
  ensureSeed();
  const p = mem.partners.find((x) => x.id === id);
  if (!p) return undefined;
  Object.assign(p, patch);
  return p;
}

export async function findPartnerByEmail(email: string): Promise<AttorneyPartner | undefined> {
  const em = email.toLowerCase();
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyPartners } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(attorneyPartners).where(eq(attorneyPartners.email, em)).limit(1);
    return rows[0] ? mapPartner(rows[0]) : undefined;
  }
  ensureSeed();
  return mem.partners.find((p) => p.email.toLowerCase() === em);
}

/* ------------------------------ appointments ------------------------------ */

export async function createAppointment(input: {
  partnerId: number; clientName: string; clientEmail: string; clientPhone?: string;
  topic?: string; startUtc: string; endUtc: string;
}): Promise<AttorneyAppointment> {
  const record: AttorneyAppointment = {
    ...input, id: mem.seq.appt++, status: "booked",
    feeAmount: CALENDAR_ADDON.perAppointment, createdAt: now(),
  };
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyAppointments } = await import("@/db/schema");
    const inserted = await db.insert(attorneyAppointments).values({
      partnerId: input.partnerId, clientName: input.clientName, clientEmail: input.clientEmail,
      clientPhone: input.clientPhone, topic: input.topic, startUtc: input.startUtc, endUtc: input.endUtc,
      status: "booked", feeAmount: record.feeAmount, createdAt: record.createdAt,
    }).returning({ id: attorneyAppointments.id });
    record.id = inserted[0].id;
    return record;
  }
  mem.appointments.unshift(record);
  return record;
}

export async function listAppointments(): Promise<AttorneyAppointment[]> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { attorneyAppointments } = await import("@/db/schema");
    const { desc } = await import("drizzle-orm");
    const rows = await db.select().from(attorneyAppointments).orderBy(desc(attorneyAppointments.startUtc));
    return rows.map((r: any) => ({
      id: r.id, partnerId: r.partnerId, clientName: r.clientName, clientEmail: r.clientEmail,
      clientPhone: r.clientPhone ?? undefined, topic: r.topic ?? undefined,
      startUtc: r.startUtc, endUtc: r.endUtc, status: r.status, feeAmount: r.feeAmount ?? 0, createdAt: r.createdAt,
    }));
  }
  ensureSeed();
  return [...mem.appointments];
}

/** Booked intervals (epoch ms) for a partner — used to block taken slots. */
export async function bookedIntervals(partnerId: number): Promise<{ start: number; end: number }[]> {
  const all = await listAppointments();
  return all
    .filter((a) => a.partnerId === partnerId && a.status !== "cancelled")
    .map((a) => ({ start: Date.parse(a.startUtc), end: Date.parse(a.endUtc) }));
}

/** Monthly recurring + setup + per-lead + appointment revenue for the admin. */
export async function partnerRevenue() {
  const [partners, leads, appts] = await Promise.all([listAllPartners(), listLeads(), listAppointments()]);
  const active = partners.filter((p) => p.status === "active");
  const mrr =
    active.reduce((s, p) => s + getTier(p.tier).monthly, 0) +
    active.filter((p) => p.calendarEnabled).length * CALENDAR_ADDON.monthly;
  const setupCollected = partners.filter((p) => p.setupFeePaid).length * SETUP_FEE;
  const leadRevenue = leads.reduce((s, l) => s + l.feeAmount, 0);
  const appointmentRevenue = appts.reduce((s, a) => s + a.feeAmount, 0);
  return {
    activePartners: active.length,
    totalPartners: partners.length,
    calendarPartners: active.filter((p) => p.calendarEnabled).length,
    mrr,
    setupCollected,
    leadRevenue,
    leadCount: leads.length,
    appointmentRevenue,
    appointmentCount: appts.length,
  };
}
