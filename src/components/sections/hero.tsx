"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ScheduleDemoModal } from "@/components/ui/schedule-demo-modal";

const BAR_COUNT = 125;
const COLORS = [
"#a454ff",
"#ff4081",
"#4a90e2",
"#4caf50",
"#ff6b35",
"#9c27b0",
"#ef8d4b",
"#6c43c1",
"#33a1e2",
"#f472b6",
"#2dd4bf",
"#818cf8",
"#fb7185",
"#22d3ee",
"#d946ef"];


const getRandomHeight = () => Math.floor(Math.random() * 80) + 10;

const WaveformVisualization = () => {
  const [bars, setBars] = useState(() =>
  Array.from({ length: BAR_COUNT }, (_, i) => ({
    height: getRandomHeight(),
    color: COLORS[i % COLORS.length]
  }))
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBars((currentBars) =>
      currentBars.map((bar) => ({
        ...bar,
        height: getRandomHeight()
      }))
      );
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="absolute inset-0 flex items-end justify-center overflow-hidden">
      {bars.map((bar, index) =>
      <div
        key={index}
        className="w-[0.8%] flex-shrink-0 rounded-t-sm transition-all duration-1000 ease-in-out"
        style={{
          height: `${bar.height}%`,
          backgroundColor: bar.color
        }} />
      )}
    </div>);

};

export default function HeroSection() {
  // Add animation state for bars
  const [barHeights, setBarHeights] = useState(() =>
  Array.from({ length: 125 }, () => Math.random() * 200 + 50)
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBarHeights(Array.from({ length: 125 }, () => Math.random() * 200 + 50));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <section className="relative px-6 py-20 text-center text-white bg-[#1a1a1a]">
      <div className="container mx-auto max-w-5xl">
        <h1 className="mb-6 text-6xl font-bold leading-tight lg:text-7xl">
          The fastest, ultra-realistic{" "}
          <span className="bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            voice AI
          </span>{" "}
          platform
        </h1>
        
        <p className="mx-auto mb-12 max-w-3xl text-xl text-gray-300 !whitespace-pre-line">We build lifelike conversational AI agents with our State Space Model technology. Lightning-fast inference and unparalleled voice quality.


        </p>

        <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
          <Link href="/schedule-demo">
            <Button className="rounded-3xl bg-white px-8 py-3 text-lg font-medium text-black hover:bg-gray-200">
              Schedule Demo
            </Button>
          </Link>
          <Link href="/docs">
            <Button
              variant="outline"
              className="rounded-3xl border-gray-500 px-8 py-3 text-lg font-medium text-black hover:bg-gray-100">

              Read the docs
            </Button>
          </Link>
        </div>

        {/* Audio Visualization */}
        <div className="flex justify-center items-end space-x-1 h-64">
          {Array.from({ length: 125 }).map((_, i) => {
            const colors = ['#ff6b00', '#ff1744', '#9c27b0', '#0099ff', '#00bcd4', '#ffc107', '#4caf50', '#e91e63', '#a454ff', '#ff4081', '#4a90e2', '#ef8d4b', '#6c43c1', '#33a1e2', '#f472b6'];
            return (
              <div
                key={i}
                className="transition-all duration-1000 ease-in-out"
                style={{
                  width: '6px',
                  height: `${barHeights[i]}px`,
                  backgroundColor: colors[i % colors.length],
                  borderRadius: '3px'
                }} />);


          })}
        </div>
      </div>
    </section>);

}