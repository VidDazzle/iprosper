import Image from "next/image";
import { Sparkles } from "lucide-react";

// Data array for partners
const partners = [
  {
    name: "Quora",
    logoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/wsqyBHycBWFGly4vievVAqfauiI-1.svg?",
    width: 80,
    height: 26,
    type: "image",
  },
  {
    name: "LiveKit",
    logoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/q46u6sPafRUkh1ZfJArgowpZM8-2.svg?",
    width: 90,
    height: 26,
    type: "image",
  },
  {
    name: "goodcall",
    logoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/iQG8esj7GEya0w96I0RpYNM0-3.svg?",
    width: 110,
    height: 20,
    type: "image",
  },
  {
    name: "hedra",
    type: "component",
  },
  {
    name: "tavus",
    logoUrl: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/CAb434VZrVJMXEMmYMb6DpG8-4.svg?",
    width: 85,
    height: 24,
    type: "image",
  },
];

const PartnerLogos = () => {
  return (
    <div className="w-full bg-[#181818]">
      <div className="mx-auto w-full max-w-[1239px]">
        <div className="grid w-full grid-cols-5 border-y border-border">
          {partners.map((partner, index) => (
            <div
              key={partner.name}
              className={`flex h-[90px] items-center justify-center ${
                index < partners.length - 1 ? "border-r border-border" : ""
              }`}
            >
              {partner.type === "image" ? (
                <Image
                  src={partner.logoUrl!}
                  alt={partner.name}
                  width={partner.width!}
                  height={partner.height!}
                  className="filter grayscale brightness-0 invert opacity-60"
                />
              ) : (
                <div className="flex items-center gap-1.5 text-neutral-500">
                  <Sparkles className="h-5 w-5 fill-current" />
                  <span className="text-2xl font-medium tracking-tight">
                    {partner.name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PartnerLogos;