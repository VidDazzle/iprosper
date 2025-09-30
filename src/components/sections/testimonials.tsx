"use client";

import React from "react";
import Image from "next/image";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const testimonials = [
{
  name: "Bob Summers",
  title: "CEO", 
  company: "GoodCall",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/iQG8esj7GEya0w96I0RpYNM0-32.svg?",
  quote: "iProsper.io is the only product in existence with model latency of less than 100 ms, outperforming its next best alternative by a factor of four and without a doubt the smartest LLM we have ever communicated with",
  href: "#",
  gradient: "from-[#ffc107] to-[#ff6b00]"
},
{
  name: "Kwindla Hultman",
  title: "CEO",
  company: "Daily",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/vQ6VEl7pEqIyw0a02LyNu5njpg-33.svg?",
  quote: "iProsper.io is hands down the best voice model today for real-time multimodal use cases. I have used other competitors but now that I have experienced iProsper.io I will never go back",
  href: "#",
  gradient: "from-[#00bcd4] to-[#0099ff]"
},
{
  name: "Spencer Chan",
  title: "Head of Poe Product",
  company: "Quora",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/wsqyBHycBWFGly4vievVAqfauiI-34.svg?",
  quote: "With iProsper.io model, users can interact with a wide range of high-quality, human-like voices in multiple languages, enhancing their experience on our platform.",
  href: "#",
  gradient: "from-[#9c27b0] to-[#4a148c]"
},
{
  name: "Vipul Ved Prakash",
  title: "CEO",
  company: "Together AI",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/aZLO4U73p9NITNL1VAzSI61WUq4-35.svg?",
  quote: "iProsper.io is leading the charge of building efficient, multimodal models from first principles, starting with their advanced TTS model.",
  href: "#",
  gradient: "from-[#ff4081] to-[#d50000]"
},
{
  name: "Hassaan Raza",
  title: "CEO",
  company: "Tavus",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/CAb434VZrVJMXEMmYMb6DpG8-36.svg?",
  quote: "iProsper.io model is a game-changer. Its ultra-low latency of 90ms and high-quality voice generation have enabled us to create truly immersive real-time conversations.",
  href: "#",
  gradient: "from-[#00c853] to-[#00695c]"
},
{
  name: "Sarah Mitchell",
  title: "CTO",
  company: "VoiceTech",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/iQG8esj7GEya0w96I0RpYNM0-32.svg?",
  quote: "The quality and speed of voice synthesis with iProsper.io has revolutionized our customer service platform. Our clients are amazed by the natural-sounding conversations.",
  href: "#",
  gradient: "from-[#e91e63] to-[#ad1457]"
},
{
  name: "Michael Chen",
  title: "VP of Engineering",
  company: "AudioFlow",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/vQ6VEl7pEqIyw0a02LyNu5njpg-33.svg?",
  quote: "Implementing iProsper.io's voice AI into our workflow automation reduced our processing time by 60%. The multilingual support is exceptional.",
  href: "#",
  gradient: "from-[#3f51b5] to-[#1a237e]"
},
{
  name: "Emma Rodriguez",
  title: "Head of Product",
  company: "SpeakEasy",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/wsqyBHycBWFGly4vievVAqfauiI-34.svg?",
  quote: "The voice cloning capabilities are mind-blowing. We've been able to create personalized experiences for our users that were previously impossible.",
  href: "#",
  gradient: "from-[#ff9800] to-[#e65100]"
},
{
  name: "David Kim",
  title: "Founder",
  company: "TalkBot",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/aZLO4U73p9NITNL1VAzSI61WUq4-35.svg?",
  quote: "As a startup, we needed reliable, cost-effective voice AI. iProsper.io delivered beyond our expectations with seamless API integration and stellar performance.",
  href: "#",
  gradient: "from-[#4caf50] to-[#1b5e20]"
},
{
  name: "Lisa Thompson",
  title: "Director of Innovation",
  company: "MediaCorp",
  companyLogoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/CAb434VZrVJMXEMmYMb6DpG8-36.svg?",
  quote: "The emotional nuance and natural flow in iProsper.io's generated speech has transformed our content creation process. Our audience engagement has increased significantly.",
  href: "#",
  gradient: "from-[#607d8b] to-[#263238]"
}];

type Testimonial = (typeof testimonials)[0];

const TestimonialCard = ({ testimonial }: {testimonial: Testimonial;}) =>
<a
  href={testimonial.href}
  target="_blank"
  rel="noopener noreferrer"
  className={cn(
    "group flex h-full min-h-[320px] flex-col gap-6 rounded-2xl bg-gradient-to-br p-6 text-black lg:p-7",
    testimonial.gradient
  )}>

    <div className="flex items-center gap-3">
      <div className="flex-1">
        <p className="text-lg font-semibold text-black">{testimonial.name}</p>
        <p className="text-sm text-black/70">{testimonial.title}</p>
      </div>
      <div className="flex h-8 w-8 items-center justify-center rounded border border-black/10 bg-white/20 p-1">
        <Image
        src={testimonial.companyLogoUrl}
        alt={`${testimonial.company} logo`}
        width={24}
        height={24}
        className="h-full w-full object-contain" />
      </div>
    </div>
    <p className="flex-grow text-lg leading-relaxed text-black/70 lg:text-xl lg:leading-relaxed !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line">
      {testimonial.quote}
    </p>
    <div className="mt-auto flex items-center justify-end">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/20 transition-transform duration-300 group-hover:rotate-45">
        <ArrowUpRight className="h-4 w-4 text-black" />
      </div>
    </div>
  </a>;


export default function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    loop: true,
    skipSnaps: false,
    dragFree: true
  });

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Auto-play functionality
  React.useEffect(() => {
    if (!emblaApi) return;

    const autoPlay = setInterval(() => {
      emblaApi.scrollNext();
    }, 20000); // Auto-advance every 20 seconds (stopping for 20 seconds after each box)

    // Pause auto-play when user interacts
    const handleUserInteraction = () => {
      clearInterval(autoPlay);
    };

    emblaApi.on("pointerDown", handleUserInteraction);
    emblaApi.on("select", () => {
      // Resume auto-play after 25 seconds of no interaction
      setTimeout(() => {
        const newAutoPlay = setInterval(() => {
          emblaApi.scrollNext();
        }, 20000);

        // Clear the interval when component unmounts or API changes
        return () => clearInterval(newAutoPlay);
      }, 25000);
    });

    return () => {
      clearInterval(autoPlay);
    };
  }, [emblaApi]);

  return (
    <section className="w-full overflow-hidden bg-[#1a1a1a] py-20">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 lg:gap-16">
        <div className="relative">
          <div className="overflow-x-auto overflow-y-hidden" ref={emblaRef}>
            <div className="flex gap-6 pb-4">
              {testimonials.map((testimonial, i) =>
              <div
                key={i}
                className="min-w-0 flex-shrink-0 basis-full md:basis-[48%] lg:basis-[32%]">
                  <TestimonialCard testimonial={testimonial} />
                </div>
              )}
            </div>
          </div>
          <div className="absolute -bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4 pt-12 md:left-auto md:right-0 md:-bottom-24 md:translate-x-0">
            <button
              onClick={scrollPrev}
              aria-label="Previous testimonial"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10">
              <span className="text-xs">Click Here To Read More.....</span>
            </button>
            <button
              onClick={scrollNext}
              aria-label="Next testimonial"
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10">
              <span className="text-xs">Click Here To Read More.....</span>
            </button>
          </div>
        </div>
      </div>
    </section>);
}