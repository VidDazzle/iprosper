"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <header className="relative z-50 w-full border-b border-white/10 bg-[#1a1a1a] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/evolve-mark.svg"
            alt="Evolve mark"
            width={34}
            height={34}
            className="h-8 w-8"
            priority
          />
          <span className="text-lg font-bold tracking-tight text-white">Evolve</span>
        </Link>

        <div className="flex items-center space-x-8">
          <nav className="flex items-center space-x-8">
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/" className="text-navigation hover:text-white transition-colors">
                Home
              </Link>
              <Link href="/agents" className="text-navigation hover:text-white transition-colors">
                Agents
              </Link>
              <Link href="/solutions" className="text-navigation hover:text-white transition-colors">
                Solutions
              </Link>
              <Link href="/ai-os" className="text-navigation hover:text-white transition-colors">
                AI OS
              </Link>
              <Link href="/pricing" className="text-navigation hover:text-white transition-colors">
                Pricing
              </Link>
            </div>

            {/* Desktop Action Buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <Link href="/schedule-demo" className="text-navigation hover:text-white transition-colors">
                Contact sales
              </Link>
              <Link href="/signin" className="text-navigation hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/schedule-demo">
                <Button className="bg-white text-black hover:bg-gray-200 rounded-3xl px-6 py-2">
                  Schedule Demo
                </Button>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-white hover:text-gray-300 transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden mt-4 pb-4 border-t border-gray-800">
          <div className="flex flex-col space-y-4 pt-4 px-6">
            <Link 
              href="/" 
              className="text-navigation hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              href="/agents" 
              className="text-navigation hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Agents
            </Link>
            <Link 
              href="/solutions" 
              className="text-navigation hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Solutions
            </Link>
            <Link
              href="/ai-os"
              className="text-navigation hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              AI OS
            </Link>
            <Link
              href="/pricing"
              className="text-navigation hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              href="/schedule-demo" 
              className="text-navigation hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Contact sales
            </Link>
            <Link 
              href="/signin" 
              className="text-navigation hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Sign in
            </Link>
            <Link 
              href="/schedule-demo"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Button className="bg-white text-black hover:bg-gray-200 rounded-3xl px-6 py-2 w-full">
                Schedule Demo
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}