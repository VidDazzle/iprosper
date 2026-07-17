import { prefixedId } from "../crypto/random.js";
import {
  validateManifest,
  withDefaults,
  type AgentManifest,
} from "./manifest.js";

/**
 * Agent lifecycle states. Transitions are guarded — an agent must pass through
 * review before it can be deployed, and can be paused or quarantined (e.g. by
 * the policy engine after anomalous behavior) at any time.
 */
export type AgentState =
  | "registered"
  | "reviewing"
  | "approved"
  | "deployed"
  | "paused"
  | "quarantined"
  | "retired";

export interface AgentRecord {
  id: string;
  manifest: AgentManifest;
  state: AgentState;
  createdAt: string;
  updatedAt: string;
  /** Ed25519 public key PEM that identifies this agent's signed outputs. */
  identityPublicKeyPem?: string;
}

const ALLOWED: Record<AgentState, AgentState[]> = {
  registered: ["reviewing", "retired"],
  reviewing: ["approved", "registered", "retired"],
  approved: ["deployed", "retired"],
  deployed: ["paused", "quarantined", "retired"],
  paused: ["deployed", "quarantined", "retired"],
  quarantined: ["paused", "retired"],
  retired: [],
};

export class TransitionError extends Error {}

export class AgentRegistry {
  private readonly byId = new Map<string, AgentRecord>();
  private readonly byName = new Map<string, string>(); // tenant:name -> id

  register(manifest: AgentManifest, identityPublicKeyPem?: string): AgentRecord {
    const full = withDefaults(manifest);
    const v = validateManifest(full);
    if (!v.ok) throw new TransitionError(`invalid manifest: ${v.errors.join("; ")}`);

    const key = `${full.tenantId}:${full.name}`;
    if (this.byName.has(key)) {
      throw new TransitionError(`agent ${key} already registered`);
    }
    const now = new Date().toISOString();
    const record: AgentRecord = {
      id: prefixedId("agt"),
      manifest: full,
      state: "registered",
      createdAt: now,
      updatedAt: now,
      ...(identityPublicKeyPem ? { identityPublicKeyPem } : {}),
    };
    this.byId.set(record.id, record);
    this.byName.set(key, record.id);
    return record;
  }

  get(id: string): AgentRecord | undefined {
    return this.byId.get(id);
  }

  getByName(tenantId: string, name: string): AgentRecord | undefined {
    const id = this.byName.get(`${tenantId}:${name}`);
    return id ? this.byId.get(id) : undefined;
  }

  list(tenantId?: string): AgentRecord[] {
    const all = [...this.byId.values()];
    return tenantId ? all.filter((r) => r.manifest.tenantId === tenantId) : all;
  }

  transition(id: string, to: AgentState): AgentRecord {
    const rec = this.byId.get(id);
    if (!rec) throw new TransitionError(`unknown agent ${id}`);
    if (!ALLOWED[rec.state].includes(to)) {
      throw new TransitionError(
        `illegal transition ${rec.state} -> ${to} for ${id}`,
      );
    }
    rec.state = to;
    rec.updatedAt = new Date().toISOString();
    return rec;
  }

  /** Is the agent currently allowed to receive and run tasks? */
  isRunnable(id: string): boolean {
    return this.byId.get(id)?.state === "deployed";
  }
}
