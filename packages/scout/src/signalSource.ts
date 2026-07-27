import type { CandidateInput } from "./scoring.js";

/**
 * Pluggable extension point for Scout's actual data gathering. NOT
 * implemented with any real data source in this build — wiring one up
 * (market research APIs, competitor monitoring, historical APEX
 * performance analysis) is future work. Scout's scoring/threshold/
 * human-gate infrastructure is real and tested; what's missing is
 * something to feed it, deliberately, rather than fabricating
 * candidate opportunities with invented revenue numbers to make this
 * look more finished than it is.
 */
export interface SignalSource {
  name: string;
  gatherCandidates(): Promise<CandidateInput[]>;
}

/** Test/dev double — proposes nothing. A real integration replaces this, it doesn't extend it. */
export class NoopSignalSource implements SignalSource {
  name = "noop";
  async gatherCandidates(): Promise<CandidateInput[]> {
    return [];
  }
}
