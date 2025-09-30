"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Calendar, Loader2 } from "lucide-react";

interface ScheduleDemoModalProps {
  children: React.ReactNode;
}

export const ScheduleDemoModal = ({ children }: ScheduleDemoModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const CALENDAR_URL = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ0gq3W8_58aywd7212xaNxKGP_3qJqOazuab5LB_kAuYSXQz9wZzHpAOcjCm9aC62BVKjPti8Je?gv=true';

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  const handleOpenInNewTab = () => {
    window.open(CALENDAR_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      
      <DialogContent className="max-w-none w-[98vw] h-[98vh] overflow-hidden p-0 bg-card border-border">
        <DialogHeader className="px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-accent" />
              <DialogTitle className="text-xl font-semibold text-foreground">
                Schedule a Demo
              </DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenInNewTab}
                className="text-xs"
              >
                Open in New Tab
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 p-0 hover:bg-secondary"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 relative h-[calc(98vh-120px)] bg-background">
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 bg-background z-10">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="text-muted-foreground text-sm">Loading Google Calendar...</p>
            </div>
          )}

          {/* Google Calendar iframe */}
          <iframe
            src={CALENDAR_URL}
            width="100%"
            height="100%"
            frameBorder="0"
            scrolling="yes"
            onLoad={handleIframeLoad}
            className={`w-full h-full transition-opacity duration-300 ${
              isLoading ? 'opacity-0' : 'opacity-100'
            }`}
            style={{ minHeight: '100%', minWidth: '100%' }}
            title="Schedule Demo - Google Calendar"
            allow="camera; microphone; geolocation; encrypted-media; fullscreen"
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Select a time that works best for you. You'll receive a confirmation email with meeting details.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};