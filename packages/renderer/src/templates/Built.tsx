"use client";

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform, animate } from "framer-motion";
import type { BrandKit } from "@apex/contracts";
import { Watermark } from "../Watermark.js";

const EASE = [0.25, 0.46, 0.45, 0.94] as const; // power2.out

function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const controls = animate(0, to, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (v) => setValue(Math.round(v)),
    });
    return () => controls.stop();
  }, [to]);
  return (
    <span>
      {value}
      {suffix}
    </span>
  );
}

export interface BuiltTemplateProps {
  brandKit: BrandKit;
}

export function BuiltTemplate({ brandKit }: BuiltTemplateProps) {
  const { scrollYProgress } = useScroll();
  const ctaY = useTransform(scrollYProgress, [0.55, 0.65], [80, 0]);
  const ctaOpacity = useTransform(scrollYProgress, [0.55, 0.65], [0, 1]);

  return (
    <div className="min-h-screen bg-white text-[var(--brand-color-primary)] font-[var(--brand-font-body)]">
      <header
        className="relative overflow-hidden px-6 py-24 text-white"
        style={{
          background: "var(--brand-color-primary)",
          clipPath: "polygon(0 0, 100% 0, 100% 85%, 0 100%)",
        }}
      >
        <h1 className="font-[var(--brand-font-heading)] max-w-2xl text-4xl md:text-5xl font-bold">
          {brandKit.services[0] ? `Problems with ${brandKit.services[0].toLowerCase()}? We fix it right.` : "We fix it right."}
        </h1>
        <p className="mt-4 max-w-lg text-white/80">
          {brandKit.name} gets it done — licensed, insured, and on schedule.
        </p>
        <div className="mt-8 flex gap-4">
          <a href="#estimate" className="rounded bg-white px-6 py-3 font-semibold text-[var(--brand-color-primary)]">
            Get My Estimate
          </a>
          <a href="tel:" className="rounded border border-white px-6 py-3 font-semibold">
            Call Now
          </a>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-6 border-b px-6 py-10 text-center md:grid-cols-4">
        <div>
          <div className="text-3xl font-bold">
            <Counter to={brandKit.reviews.length || 20} suffix="+" />
          </div>
          <div className="text-sm text-gray-500">Reviews</div>
        </div>
        <div>
          <div className="text-3xl font-bold">
            <Counter to={15} suffix=" yrs" />
          </div>
          <div className="text-sm text-gray-500">In Business</div>
        </div>
        <div>
          <div className="text-3xl font-bold">
            <Counter to={100} suffix="%" />
          </div>
          <div className="text-sm text-gray-500">Licensed &amp; Insured</div>
        </div>
        <div>
          <div className="text-3xl font-bold">
            <Counter to={brandKit.services.length || 5} />
          </div>
          <div className="text-sm text-gray-500">Services Offered</div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 py-16 md:grid-cols-3">
        {brandKit.services.slice(0, 6).map((service) => (
          <motion.div
            key={service}
            whileHover={{ y: -4 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="rounded-lg border p-6"
          >
            <h3 className="font-[var(--brand-font-heading)] font-semibold">{service}</h3>
            <p className="mt-1 text-sm text-gray-500">Done right, guaranteed.</p>
          </motion.div>
        ))}
      </section>

      <motion.div
        id="estimate"
        style={{ y: ctaY, opacity: ctaOpacity }}
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full bg-[var(--brand-color-accent)] px-8 py-4 font-semibold text-white shadow-lg"
      >
        Get My Free Estimate
      </motion.div>

      <Watermark />
    </div>
  );
}
