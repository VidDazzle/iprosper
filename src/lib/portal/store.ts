/**
 * Portal data access. Uses the database when TURSO is configured; otherwise a
 * process-memory store so the portal is fully demonstrable in dev (uploads and
 * approvals work within the running server). The function signatures are the
 * same either way, so wiring the DB later needs no call-site changes.
 */

import type { AgentId } from "@/lib/agents/types";

export interface PortalUser {
  id: number | string;
  email: string;
  passwordHash: string;
  name: string;
  phone?: string | null;
  opsClientId: string;
  notifyEmail: boolean;
  notifySms: boolean;
}

export interface DocumentRecord {
  id: number;
  clientId: string;
  fileName: string;
  mimeType?: string;
  sizeBytes?: number;
  declaredType?: string;
  analyzedType?: string;
  analyzedAgent?: AgentId;
  findings: string[];
  recommendedAction?: string;
  priority: "normal" | "high" | "urgent";
  status: "analyzing" | "analyzed" | "action_created";
  createdAt: string;
}

export interface ApprovalRecord {
  id: number;
  clientId: string;
  agent: AgentId;
  title: string;
  detail: string;
  amount?: number;
  creditor?: string;
  documentId?: number;
  status: "pending" | "approved" | "rejected" | "expired";
  channelsSent: string[];
  decidedAt?: string;
  decidedVia?: "portal" | "email" | "sms";
  createdAt: string;
}

export interface NotificationRecord {
  id: number;
  clientId: string;
  message: string;
  href?: string;
  read: boolean;
  createdAt: string;
}

const DEMO_CID = "SOLV-10248";

// ---- process-memory store (dev / no-DB) ----
const mem = {
  users: new Map<string, PortalUser>(), // key: email
  docs: [] as DocumentRecord[],
  approvals: [] as ApprovalRecord[],
  notifications: [] as NotificationRecord[],
  seq: { doc: 1, approval: 1, notif: 1, user: 1 },
  seeded: false,
};

export function hasDb(): boolean {
  return Boolean(process.env.TURSO_CONNECTION_URL);
}

function now(): string {
  return new Date().toISOString();
}

/** Seed a demo account and some activity so the portal is walkable without a DB.
 *  Password for demo@solvana.ai is "demo1234" — see login route. */
export async function ensureDemoSeed() {
  if (mem.seeded) return;
  mem.seeded = true;
  // Demo user is created lazily by the login route (needs async hashing).
  const cid = DEMO_CID;
  mem.docs.push({
    id: mem.seq.doc++, clientId: cid, fileName: "chase_statement_july.pdf", mimeType: "application/pdf",
    declaredType: "Creditor statement", analyzedType: "creditor_statement", analyzedAgent: "atlas",
    findings: ["Classified as a creditor statement (Chase).", "Balance read: $8,420.", "Added to your debt dossier."],
    recommendedAction: "Add to debt dossier and update negotiation strategy.", priority: "normal",
    status: "analyzed", createdAt: now(),
  });
  mem.approvals.push({
    id: mem.seq.approval++, clientId: cid, agent: "nova",
    title: "Approve settlement with Capital One",
    detail: "Nova negotiated a settlement offer of $4,150 (44% of the $9,400 balance). Approving authorizes releasing this amount from your dedicated account to resolve the account in full.",
    amount: 4150, creditor: "Capital One", status: "pending", channelsSent: ["email", "sms"], createdAt: now(),
  });
  mem.notifications.push({
    id: mem.seq.notif++, clientId: cid,
    message: "Nova has a settlement offer from Capital One awaiting your approval.",
    href: "/portal/approvals", read: false, createdAt: now(),
  });
}

/* -------------------------------- users ----------------------------------- */

export async function findUserByEmail(email: string): Promise<PortalUser | undefined> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientUsers } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(clientUsers).where(eq(clientUsers.email, email)).limit(1);
    const u = rows[0];
    return u
      ? { id: u.id, email: u.email, passwordHash: u.passwordHash, name: u.name, phone: u.phone,
          opsClientId: u.opsClientId ?? "", notifyEmail: u.notifyEmail, notifySms: u.notifySms }
      : undefined;
  }
  return mem.users.get(email.toLowerCase());
}

export async function createUser(input: {
  email: string; passwordHash: string; name: string; phone?: string; opsClientId?: string;
  notifyEmail?: boolean; notifySms?: boolean;
}): Promise<PortalUser> {
  const opsClientId = input.opsClientId ?? `SOLV-${10300 + Math.floor(Math.random() * 5000)}`;
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientUsers } = await import("@/db/schema");
    const inserted = await db.insert(clientUsers).values({
      email: input.email.toLowerCase(), passwordHash: input.passwordHash, name: input.name,
      phone: input.phone ?? null, opsClientId, notifyEmail: input.notifyEmail ?? true,
      notifySms: input.notifySms ?? Boolean(input.phone), createdAt: now(),
    }).returning();
    const u = inserted[0];
    return { id: u.id, email: u.email, passwordHash: u.passwordHash, name: u.name, phone: u.phone,
      opsClientId: u.opsClientId ?? opsClientId, notifyEmail: u.notifyEmail, notifySms: u.notifySms };
  }
  const user: PortalUser = {
    id: mem.seq.user++, email: input.email.toLowerCase(), passwordHash: input.passwordHash,
    name: input.name, phone: input.phone, opsClientId,
    notifyEmail: input.notifyEmail ?? true, notifySms: input.notifySms ?? Boolean(input.phone),
  };
  mem.users.set(user.email, user);
  return user;
}

/* ------------------------------ documents --------------------------------- */

export async function addDocument(doc: Omit<DocumentRecord, "id" | "createdAt">): Promise<DocumentRecord> {
  const record: DocumentRecord = { ...doc, id: mem.seq.doc++, createdAt: now() };
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientDocuments } = await import("@/db/schema");
    const inserted = await db.insert(clientDocuments).values({
      clientId: doc.clientId, fileName: doc.fileName, mimeType: doc.mimeType, sizeBytes: doc.sizeBytes,
      declaredType: doc.declaredType, analyzedType: doc.analyzedType, analyzedAgent: doc.analyzedAgent,
      findings: JSON.stringify(doc.findings), recommendedAction: doc.recommendedAction,
      priority: doc.priority, status: doc.status, createdAt: record.createdAt,
    }).returning({ id: clientDocuments.id });
    record.id = inserted[0].id;
    return record;
  }
  mem.docs.unshift(record);
  return record;
}

export async function listDocuments(clientId: string): Promise<DocumentRecord[]> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientDocuments } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const rows = await db.select().from(clientDocuments).where(eq(clientDocuments.clientId, clientId)).orderBy(desc(clientDocuments.createdAt));
    return rows.map((r) => ({
      id: r.id, clientId: r.clientId, fileName: r.fileName, mimeType: r.mimeType ?? undefined,
      sizeBytes: r.sizeBytes ?? undefined, declaredType: r.declaredType ?? undefined,
      analyzedType: r.analyzedType ?? undefined, analyzedAgent: (r.analyzedAgent ?? undefined) as AgentId | undefined,
      findings: r.findings ? JSON.parse(r.findings) : [], recommendedAction: r.recommendedAction ?? undefined,
      priority: r.priority as DocumentRecord["priority"], status: r.status as DocumentRecord["status"], createdAt: r.createdAt,
    }));
  }
  await ensureDemoSeed();
  return mem.docs.filter((d) => d.clientId === clientId);
}

/* ------------------------------ approvals --------------------------------- */

export async function addApproval(a: Omit<ApprovalRecord, "id" | "createdAt" | "status" | "channelsSent"> & {
  channelsSent?: string[];
}): Promise<ApprovalRecord> {
  const record: ApprovalRecord = { ...a, id: mem.seq.approval++, status: "pending", channelsSent: a.channelsSent ?? [], createdAt: now() };
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientApprovals } = await import("@/db/schema");
    const inserted = await db.insert(clientApprovals).values({
      clientId: a.clientId, agent: a.agent, title: a.title, detail: a.detail, amount: a.amount,
      creditor: a.creditor, documentId: a.documentId, status: "pending",
      channelsSent: JSON.stringify(record.channelsSent), createdAt: record.createdAt,
    }).returning({ id: clientApprovals.id });
    record.id = inserted[0].id;
    return record;
  }
  mem.approvals.unshift(record);
  return record;
}

export async function listApprovals(clientId: string): Promise<ApprovalRecord[]> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientApprovals } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const rows = await db.select().from(clientApprovals).where(eq(clientApprovals.clientId, clientId)).orderBy(desc(clientApprovals.createdAt));
    return rows.map(mapApproval);
  }
  await ensureDemoSeed();
  return mem.approvals.filter((a) => a.clientId === clientId);
}

export async function getApproval(id: number): Promise<ApprovalRecord | undefined> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientApprovals } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(clientApprovals).where(eq(clientApprovals.id, id)).limit(1);
    return rows[0] ? mapApproval(rows[0]) : undefined;
  }
  await ensureDemoSeed();
  return mem.approvals.find((a) => a.id === id);
}

export async function decideApproval(id: number, decision: "approved" | "rejected", via: "portal" | "email" | "sms"): Promise<ApprovalRecord | undefined> {
  const decidedAt = now();
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientApprovals } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await db.update(clientApprovals).set({ status: decision, decidedAt, decidedVia: via }).where(eq(clientApprovals.id, id));
    return getApproval(id);
  }
  const a = mem.approvals.find((x) => x.id === id);
  if (a && a.status === "pending") {
    a.status = decision;
    a.decidedAt = decidedAt;
    a.decidedVia = via;
  }
  return a;
}

/* ---------------------------- notifications ------------------------------- */

export async function addNotification(clientId: string, message: string, href?: string): Promise<void> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientNotifications } = await import("@/db/schema");
    await db.insert(clientNotifications).values({ clientId, message, href, read: false, createdAt: now() });
    return;
  }
  mem.notifications.unshift({ id: mem.seq.notif++, clientId, message, href, read: false, createdAt: now() });
}

export async function listNotifications(clientId: string): Promise<NotificationRecord[]> {
  if (hasDb()) {
    const { db } = await import("@/db");
    const { clientNotifications } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");
    const rows = await db.select().from(clientNotifications).where(eq(clientNotifications.clientId, clientId)).orderBy(desc(clientNotifications.createdAt));
    return rows.map((r) => ({ id: r.id, clientId: r.clientId, message: r.message, href: r.href ?? undefined, read: r.read, createdAt: r.createdAt }));
  }
  await ensureDemoSeed();
  return mem.notifications.filter((n) => n.clientId === clientId);
}

function mapApproval(r: Record<string, unknown>): ApprovalRecord {
  return {
    id: r.id as number,
    clientId: r.clientId as string,
    agent: r.agent as ApprovalRecord["agent"],
    title: r.title as string,
    detail: r.detail as string,
    amount: (r.amount as number) ?? undefined,
    creditor: (r.creditor as string) ?? undefined,
    documentId: (r.documentId as number) ?? undefined,
    status: r.status as ApprovalRecord["status"],
    channelsSent: r.channelsSent ? JSON.parse(r.channelsSent as string) : [],
    decidedAt: (r.decidedAt as string) ?? undefined,
    decidedVia: (r.decidedVia as ApprovalRecord["decidedVia"]) ?? undefined,
    createdAt: r.createdAt as string,
  };
}

export { DEMO_CID };
