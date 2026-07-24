"use client";

import { useEffect, useState } from "react";

/**
 * Shared rule (spec Section 5): "mobile-first with scaled-down motion
 * values below 768px." Returns a multiplier templates apply to their
 * transition distances/durations.
 */
export function useReducedMotionValues(): { scale: number; isMobile: boolean } {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return { scale: isMobile ? 0.5 : 1, isMobile };
}
