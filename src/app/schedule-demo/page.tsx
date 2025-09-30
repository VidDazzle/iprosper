"use client";

import { useState, useEffect } from "react";
import { Calendar, ExternalLink, Loader2 } from "lucide-react";
import Navigation from "@/components/sections/navigation";
import { Button } from "@/components/ui/button";

export default function ScheduleDemo() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const calendarUrl = "https://calendar.google.com/calendar/appointments/schedules/AcZssZ0gq3W8_58aywd7212xaNxKGP_3qJqOazuab5LB_kAuYSXQz9wZzHpAOcjCm9aC62BVKjPti8Je?gv=true";

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleOpenInNewTab = () => {
    window.open(calendarUrl, '_blank', 'noopener,noreferrer');
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      <main className="pt-20">
        <div className="container mx-auto px-6 py-12">
          {/* Header Section */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center mb-6">
              <div className="p-3 rounded-full bg-accent/10 mr-4">
                <Calendar className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-5xl font-bold text-gray-900">
                Schedule a Demo
              </h1>
            </div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Book a personalized demonstration of iProsper.io ultra-realistic voice AI platform. 
              Our team will show you how to integrate our State Space Model technology into your applications.
            </p>
          </div>

          {/* Calendar Container */}
          <div className="relative max-w-4xl mx-auto">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg">
              {/* Calendar Header */}
              <div className="border-b border-gray-200 p-6 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Choose Your Preferred Time
                    </h2>
                    <p className="text-gray-600">
                      Select an available slot that works best for your schedule
                    </p>
                  </div>
                  <Button
                    onClick={handleOpenInNewTab}
                    variant="outline"
                    className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in New Tab
                  </Button>
                </div>
              </div>

              {/* Calendar Iframe Container */}
              <div className="relative bg-white">
                {/* Loading State */}
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-4" />
                      <p className="text-gray-600">Loading calendar...</p>
                    </div>
                  </div>
                )}

                {/* Error State */}
                {hasError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                    <div className="text-center p-8">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Calendar Unavailable
                      </h3>
                      <p className="text-gray-600 mb-6">
                        We're having trouble loading the calendar. Please try opening it in a new tab.
                      </p>
                      <Button
                        onClick={handleOpenInNewTab}
                        className="bg-accent text-white hover:bg-accent/90"
                      >
                        Open Calendar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Google Calendar Iframe */}
                <iframe
                  src={calendarUrl}
                  className="w-full h-[600px] border-0 bg-white"
                  title="Schedule Demo - Google Calendar"
                  onLoad={handleIframeLoad}
                  onError={handleIframeError}
                  style={{ 
                    minHeight: '600px',
                    opacity: isLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out',
                    backgroundColor: 'white'
                  }}
                />
              </div>
            </div>

            {/* Footer Information */}
            <div className="mt-8 text-center">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  What to Expect
                </h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm text-gray-600">
                  <div>
                    <div className="font-medium text-gray-900 mb-2">Duration</div>
                    <div>30-45 minutes</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 mb-2">Format</div>
                    <div>Video call with screen sharing</div>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 mb-2">Follow-up</div>
                    <div>Technical documentation and next steps</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Confirmation Notice */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                📧 You'll receive a confirmation email with the meeting link and calendar invite after booking.
                <br />
                Need help? Contact our team at{" "}
                <a href="mailto:support@cartesia.ai" className="text-accent hover:underline">
                  support@cartesia.ai
                </a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}