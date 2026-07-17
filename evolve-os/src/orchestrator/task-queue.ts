import { prefixedId } from "../crypto/random.js";

export type TaskState =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export interface Task {
  id: string;
  agentId: string;
  tenantId: string;
  /** Higher runs first. */
  priority: number;
  /** Opaque, JSON-serializable input for the agent. */
  input: unknown;
  state: TaskState;
  attempts: number;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
  result?: unknown;
  error?: string;
}

export interface SubmitOptions {
  priority?: number;
  maxAttempts?: number;
}

/**
 * In-memory priority queue with per-attempt bookkeeping. Durable deployments
 * back this with Postgres / Redis; the interface (submit / lease / complete /
 * fail) is intentionally queue-agnostic.
 */
export class TaskQueue {
  private readonly tasks = new Map<string, Task>();
  private readonly pending: string[] = []; // task ids, kept priority-sorted

  submit(
    agentId: string,
    tenantId: string,
    input: unknown,
    opts: SubmitOptions = {},
  ): Task {
    const now = new Date().toISOString();
    const task: Task = {
      id: prefixedId("tsk"),
      agentId,
      tenantId,
      priority: opts.priority ?? 0,
      input,
      state: "queued",
      attempts: 0,
      maxAttempts: opts.maxAttempts ?? 3,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    this.pending.push(task.id);
    this.pending.sort(
      (a, b) => (this.tasks.get(b)!.priority) - (this.tasks.get(a)!.priority),
    );
    return task;
  }

  /** Lease the next runnable task for an agent (or any agent if omitted). */
  lease(agentId?: string): Task | undefined {
    const idx = this.pending.findIndex((id) => {
      const t = this.tasks.get(id)!;
      return t.state === "queued" && (!agentId || t.agentId === agentId);
    });
    if (idx === -1) return undefined;
    const [id] = this.pending.splice(idx, 1);
    const task = this.tasks.get(id!)!;
    task.state = "running";
    task.attempts += 1;
    task.updatedAt = new Date().toISOString();
    return task;
  }

  complete(id: string, result: unknown): Task {
    const t = this.mustGet(id);
    t.state = "completed";
    t.result = result;
    t.updatedAt = new Date().toISOString();
    return t;
  }

  fail(id: string, error: string): Task {
    const t = this.mustGet(id);
    t.error = error;
    t.updatedAt = new Date().toISOString();
    if (t.attempts < t.maxAttempts) {
      t.state = "queued";
      this.pending.push(t.id);
      this.pending.sort(
        (a, b) => this.tasks.get(b)!.priority - this.tasks.get(a)!.priority,
      );
    } else {
      t.state = "failed";
    }
    return t;
  }

  cancel(id: string): Task {
    const t = this.mustGet(id);
    if (t.state === "queued" || t.state === "running") {
      t.state = "cancelled";
      t.updatedAt = new Date().toISOString();
      const i = this.pending.indexOf(id);
      if (i >= 0) this.pending.splice(i, 1);
    }
    return t;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  list(tenantId?: string): Task[] {
    const all = [...this.tasks.values()];
    return tenantId ? all.filter((t) => t.tenantId === tenantId) : all;
  }

  private mustGet(id: string): Task {
    const t = this.tasks.get(id);
    if (!t) throw new Error(`unknown task ${id}`);
    return t;
  }
}
