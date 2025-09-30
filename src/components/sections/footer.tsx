"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

interface NavLink {
  name: string;
  href: string;
}

interface LinkColumn {
  title: string;
  links: NavLink[];
}

const footerLinkColumns: LinkColumn[] = [
  {
    title: "Models",
    links: [
      { name: "Sonic", href: "/docs" },
      { name: "Deployments", href: "/docs" },
    ],
  },
  {
    title: "Products",
    links: [
      { name: "Voice Changer", href: "/docs" },
      { name: "Voice Cloning", href: "/docs" },
      { name: "Text-to-Speech", href: "/docs" },
    ],
  },
  {
    title: "Resources",
    links: [
      { name: "Pricing", href: "/pricing" },
      { name: "Docs", href: "/docs" },
      { name: "Blog", href: "/blog" },
      { name: "Research", href: "/research" },
    ],
  },
  {
    title: "Company",
    links: [
      { name: "About", href: "/company" },
      { name: "Meet the Team", href: "/team" },
      { name: "Careers", href: "/careers" },
    ],
  },
];

const legalLinks: NavLink[] = [
  { name: "Terms of Use", href: "#" },
  { name: "Privacy", href: "#" },
  { name: "Acceptable Use", href: "#" },
];

const SmartLink = ({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className: string;
}) => {
  const isExternal = href.startsWith("http") || href.startsWith("#");
  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
};

// ✅ COMPONENT NAMES FIXED: Uppercase first letter
const IProsperLogo = () => (
  <Link href="/" className="flex items-center">
    <Image
      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1757009205035-fx2gim7laip.png"
      alt="iProsper.io"
      width={160}
      height={50}
      className="h-10 w-auto brightness-100 contrast-100"
      priority
      style={{ maxWidth: "none" }}
    />
  </Link>
);

const PartnerLogo = () => (
  <div className="flex items-center gap-3">
    <Image
      src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1757013548086-rh1p8kgykdl.png"
      alt="Partner Logo"
      width={80}
      height={32}
      className="h-8 w-auto"
    />
    <span className="text-sm text-text-secondary">© 2025</span>
  </div>
);

const CookieBanner = ({ onClose }: { onClose: () => void }) => (
  <div
    role="dialog"
    aria-label="Cookie settings"
    className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-popover p-6 shadow-2xl bg-gradient-to-br from-[#0099ff1a] via-transparent to-[#ff6b001a]"
  >
    <h3 className="font-semibold text-white text-base">
      We use cookies to personalize content
    </h3>
    <p className="mt-2 text-sm text-muted-foreground">
      We use cookies to personalize content, run ads, and analyze traffic.
    </p>
    <div className="mt-6 flex items-center justify-end gap-3">
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("cookie_consent", "rejected");
          onClose();
        }}
        className="text-sm font-medium text-red-400 hover:text-red-300 transition-colors"
      >
        Reject all
      </button>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("cookie_consent", "customize");
          onClose();
        }}
        className="text-sm font-medium rounded-lg px-4 py-2 border border-input bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        Customize
      </button>
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("cookie_consent", "accepted");
          onClose();
        }}
        className="rounded-lg bg-[#0099ff] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0086e0]"
      >
        Accept all
      </button>
    </div>
  </div>
);

export default function Footer() {
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const consent = localStorage.getItem("cookie_consent");
      if (!consent) setShowCookieBanner(true);
    }
  }, []);

  return (
    <>
      <footer className="bg-[#1a1a1a] text-white px-6">
        <div className="max-w-6xl mx-auto py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8">
            <div className="lg:col-span-2 sm:col-span-2">
              <IProsperLogo />
              <p className="mt-4 text-base text-text-secondary leading-normal">
                Real-time, multimodal intelligence for every device.
              </p>
            </div>

            {footerLinkColumns.map((column) => (
              <div key={column.title}>
                <h3 className="text-base font-semibold text-white">{column.title}</h3>
                <ul className="mt-4 space-y-2">
                  {column.links.map((link) => (
                    <li key={link.name}>
                      <SmartLink
                        href={link.href}
                        className="text-base text-text-secondary hover:text-white transition-colors"
                      >
                        {link.name}
                      </SmartLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-16 border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6">
              <p className="text-sm font-semibold text-white">Legal</p>
              <ul className="flex items-center gap-4">
                {legalLinks.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-text-secondary hover:text-white transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-4">
              <PartnerLogo />
              <p className="text-sm text-text-secondary text-center md:text-right">
                © 2024 iProsper.io. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      {showCookieBanner && <CookieBanner onClose={() => setShowCookieBanner(false)} />}
    </>
  );
}
