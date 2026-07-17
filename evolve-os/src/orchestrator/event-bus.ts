/**
 * Minimal typed in-process event bus. The kernel and subsystems communicate
 * through named events so components stay decoupled. In a distributed
 * deployment this interface is the seam to swap for NATS / Kafka / Redis
 * Streams without changing publishers or subscribers.
 */
export type EventHandler<T> = (payload: T) => void | Promise<void>;

export interface EventMap {
  "task.submitted": { taskId: string; agentId: string; tenantId: string };
  "task.started": { taskId: string; agentId: string };
  "task.completed": { taskId: string; agentId: string; ok: boolean };
  "task.failed": { taskId: string; agentId: string; error: string };
  "agent.state": { agentId: string; state: string };
  "policy.deny": { actor: string; action: string; reason: string };
  "security.alert": { severity: "low" | "medium" | "high"; message: string };
}

export class EventBus {
  private readonly handlers = new Map<keyof EventMap, Set<EventHandler<any>>>();

  on<K extends keyof EventMap>(event: K, handler: EventHandler<EventMap[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler);
    return () => set!.delete(handler);
  }

  async emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): Promise<void> {
    const set = this.handlers.get(event);
    if (!set) return;
    await Promise.all(
      [...set].map(async (h) => {
        try {
          await h(payload);
        } catch (err) {
          // A misbehaving subscriber must not break the emitter.
          console.error(`[event-bus] handler for ${String(event)} threw:`, err);
        }
      }),
    );
  }
}
