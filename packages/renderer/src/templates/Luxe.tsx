"use client";

import { motion } from "framer-motion";
import type { BrandKit } from "@apex/contracts";
import { Watermark } from "../Watermark.js";
import { useReducedMotionValues } from "../useReducedMotionValues.js";

// Motion notes (spec Section 5): "slow Lenis lerp (~0.08)" is a global
// smooth-scroll setting, wired at the app root (apps/web layout), not
// per-template — this component's own transitions use a slow, no-bounce
// easeOut curve to match that feel locally (fade+lift on load, staggered
// reveals, subtle 1.0->1.05 scale-on-scroll).

const EASE = [0.16, 1, 0.3, 1] as const; // easeOutExpo-ish, no bounce/snap

export interface LuxeTemplateProps {
  brandKit: BrandKit;
}

export function LuxeTemplate({ brandKit }: LuxeTemplateProps) {
  const { scale: motionScale } = useReducedMotionValues();
  const dur = 0.8 * (0.6 + motionScale * 0.4); // slightly faster on mobile, never instant

  return (
    <div className="min-h-screen bg-[var(--brand-color-primary)] text-white font-[var(--brand-font-body)]">
      <nav className="flex items-center justify-center gap-12 py-8 text-sm tracking-widest uppercase">
        <a href="#services">Services</a>
        <span className="font-[var(--brand-font-heading)] text-xl tracking-[0.3em]">{brandKit.name}</span>
        <a href="#contact">Begin</a>
      </nav>

      <motion.section
        initial={{ opacity: 0, y: 24 * motionScale }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: dur, ease: EASE }}
        className="flex h-[80vh] flex-col items-center justify-center text-center px-6"
      >
        <h1 className="font-[var(--brand-font-heading)] text-5xl md:text-6xl max-w-2xl leading-tight">
          Reveal the version of you that's been waiting.
        </h1>
        <p className="mt-6 max-w-md text-white/70">
          You deserve results you can feel, not just see. {brandKit.services[0] ?? "Every visit"} is built around
          how you want to feel next.
        </p>
        <a
          href="#contact"
          className="mt-10 rounded-full border border-white/40 px-8 py-3 text-sm uppercase tracking-widest hover:bg-white hover:text-[var(--brand-color-primary)] transition-colors"
        >
          Reserve Your Visit
        </a>
      </motion.section>

      <section id="services" className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-24 md:grid-cols-3">
        {brandKit.services.slice(0, 6).map((service, i) => (
          <motion.div
            key={service}
            initial={{ opacity: 0, y: 24 * motionScale }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-10%" }}
            transition={{ duration: dur, ease: EASE, delay: i * 0.08 }}
            whileHover={{ scale: 1.05 }}
            className={i % 3 === 1 ? "md:mt-12 rounded-2xl bg-white/5 p-8" : "rounded-2xl bg-white/5 p-8"}
          >
            <h3 className="font-[var(--brand-font-heading)] text-lg">{service}</h3>
            <p className="mt-2 text-sm text-white/60">Feel it before you see it.</p>
          </motion.div>
        ))}
      </section>

      {brandKit.reviews.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <motion.blockquote
            initial={{ opacity: 0, y: 24 * motionScale }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: dur, ease: EASE }}
            className="text-2xl font-[var(--brand-font-heading)] italic"
          >
            &ldquo;{String((brandKit.reviews[0] as Record<string, unknown>)?.text ?? "")}&rdquo;
          </motion.blockquote>
        </section>
      )}

      <Watermark />
    </div>
  );
}
