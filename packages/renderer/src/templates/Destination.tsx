"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BrandKit } from "@apex/contracts";
import { Watermark } from "../Watermark.js";

export interface DestinationTemplateProps {
  brandKit: BrandKit;
}

export function DestinationTemplate({ brandKit }: DestinationTemplateProps) {
  const [heroIndex, setHeroIndex] = useState(0);
  const galleryImages = brandKit.reviews.length > 0 ? brandKit.reviews : [{}, {}, {}];

  return (
    <div className="min-h-screen bg-black text-white font-[var(--brand-font-body)]">
      <nav className="flex items-center justify-between px-8 py-6 text-sm uppercase tracking-widest">
        <span className="font-[var(--brand-font-heading)] text-xl">{brandKit.name}</span>
        <div className="flex gap-8">
          <a href="#gallery">Gallery</a>
          <a href="#map">Map</a>
          <a href="#inquire">Request Access</a>
        </div>
      </nav>

      <div className="relative h-[70vh] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={heroIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, scale: [1, 1.08] }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.2 }, scale: { duration: 8, ease: "linear" } }}
            onAnimationComplete={() => setHeroIndex((i) => (i + 1) % 3)}
            className="absolute inset-0"
            style={{
              background: `linear-gradient(to bottom, transparent, black), var(--brand-color-primary)`,
            }}
          />
        </AnimatePresence>
        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <h1 className="font-[var(--brand-font-heading)] text-5xl md:text-6xl max-w-2xl">
            {brandKit.services[0] ?? "Somewhere worth being."}
          </h1>
          <p className="mt-4 max-w-md text-white/70">A place. A feeling. Yours, if you inquire.</p>
          <a
            href="#inquire"
            className="mt-8 rounded-full bg-white px-8 py-3 text-sm uppercase tracking-widest text-black"
          >
            Inquire
          </a>
        </div>
      </div>

      <section id="gallery" className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-8 py-16">
        {galleryImages.map((_, i) => (
          <div
            key={i}
            className="h-64 w-80 flex-shrink-0 snap-center rounded-lg"
            style={{ background: `var(--brand-color-${(i % 3) + 1}, var(--brand-color-secondary))` }}
          />
        ))}
      </section>

      <section className="mx-auto grid max-w-4xl grid-cols-2 gap-4 px-8 py-16 md:grid-cols-4">
        {brandKit.services.slice(0, 8).map((amenity) => (
          <div key={amenity} className="rounded border border-white/20 p-4 text-center text-sm">
            {amenity}
          </div>
        ))}
      </section>

      <section id="inquire" className="mx-auto max-w-md px-8 py-16 text-center">
        <h2 className="font-[var(--brand-font-heading)] text-2xl">Explore Availability</h2>
        <p className="mt-2 text-sm text-white/60">A concierge will follow up personally.</p>
        <div className="mt-6 rounded-lg border border-white/20 p-6 text-sm text-white/50">
          Inquiry form renders here (lead-gate component, apps/web).
        </div>
      </section>

      <Watermark />
    </div>
  );
}
