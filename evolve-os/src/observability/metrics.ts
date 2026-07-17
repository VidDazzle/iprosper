/**
 * Dependency-free metrics registry. Feeds both the self-healing supervisor and
 * the self-optimizing controller. Tracks counters, a rolling latency window
 * (p50/p95), and per-agent success/failure streaks derived from the event bus.
 */
export interface LatencyStats {
  count: number;
  p50: number;
  p95: number;
  avg: number;
  max: number;
}

export interface AgentMetrics {
  started: number;
  completed: number;
  failed: number;
  /** Consecutive failures with no intervening success. */
  failureStreak: number;
  /** Consecutive successes with no intervening failure. */
  successStreak: number;
  latency: LatencyStats;
  inFlight: number;
}

interface AgentState {
  started: number;
  completed: number;
  failed: number;
  failureStreak: number;
  successStreak: number;
  inFlight: number;
  latencies: number[]; // rolling window (ms)
  startTimes: Map<string, number>; // taskId -> start epoch ms
}

const WINDOW = 200;

export class MetricsRegistry {
  private readonly agents = new Map<string, AgentState>();
  private readonly counters = new Map<string, number>();

  private state(agentId: string): AgentState {
    let s = this.agents.get(agentId);
    if (!s) {
      s = {
        started: 0, completed: 0, failed: 0,
        failureStreak: 0, successStreak: 0, inFlight: 0,
        latencies: [], startTimes: new Map(),
      };
      this.agents.set(agentId, s);
    }
    return s;
  }

  inc(counter: string, by = 1): void {
    this.counters.set(counter, (this.counters.get(counter) ?? 0) + by);
  }

  counter(name: string): number {
    return this.counters.get(name) ?? 0;
  }

  taskStarted(agentId: string, taskId: string, now = Date.now()): void {
    const s = this.state(agentId);
    s.started++;
    s.inFlight++;
    s.startTimes.set(taskId, now);
    this.inc("tasks.started");
  }

  taskCompleted(agentId: string, taskId: string, now = Date.now()): void {
    const s = this.state(agentId);
    s.completed++;
    s.successStreak++;
    s.failureStreak = 0;
    s.inFlight = Math.max(0, s.inFlight - 1);
    this.recordLatency(s, taskId, now);
    this.inc("tasks.completed");
  }

  taskFailed(agentId: string, taskId: string, now = Date.now()): void {
    const s = this.state(agentId);
    s.failed++;
    s.failureStreak++;
    s.successStreak = 0;
    s.inFlight = Math.max(0, s.inFlight - 1);
    this.recordLatency(s, taskId, now);
    this.inc("tasks.failed");
  }

  private recordLatency(s: AgentState, taskId: string, now: number): void {
    const start = s.startTimes.get(taskId);
    if (start !== undefined) {
      s.latencies.push(now - start);
      if (s.latencies.length > WINDOW) s.latencies.shift();
      s.startTimes.delete(taskId);
    }
  }

  private latencyStats(latencies: number[]): LatencyStats {
    if (latencies.length === 0) return { count: 0, p50: 0, p95: 0, avg: 0, max: 0 };
    const sorted = [...latencies].sort((a, b) => a - b);
    const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
    const sum = sorted.reduce((a, b) => a + b, 0);
    return {
      count: sorted.length,
      p50: at(0.5),
      p95: at(0.95),
      avg: Math.round(sum / sorted.length),
      max: sorted[sorted.length - 1]!,
    };
  }

  forAgent(agentId: string): AgentMetrics {
    const s = this.state(agentId);
    return {
      started: s.started, completed: s.completed, failed: s.failed,
      failureStreak: s.failureStreak, successStreak: s.successStreak,
      inFlight: s.inFlight, latency: this.latencyStats(s.latencies),
    };
  }

  agentIds(): string[] {
    return [...this.agents.keys()];
  }

  /** Failure rate across all agents in the current windows. */
  globalFailureRate(): number {
    let ok = 0, fail = 0;
    for (const s of this.agents.values()) {
      ok += s.completed;
      fail += s.failed;
    }
    const total = ok + fail;
    return total === 0 ? 0 : fail / total;
  }

  snapshot(): {
    counters: Record<string, number>;
    agents: Record<string, AgentMetrics>;
    globalFailureRate: number;
  } {
    const agents: Record<string, AgentMetrics> = {};
    for (const id of this.agents.keys()) agents[id] = this.forAgent(id);
    return {
      counters: Object.fromEntries(this.counters),
      agents,
      globalFailureRate: this.globalFailureRate(),
    };
  }
}
