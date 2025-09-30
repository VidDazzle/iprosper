import Navigation from "@/components/sections/navigation";
import { Calendar, Clock, Video, Users, CheckCircle, ArrowRight } from "lucide-react";

export default function CalendarPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20">
          <div className="container">
            <div className="text-center mb-16">
              <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
                Schedule a Call
              </h1>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto mb-8">
                Book a personalized consultation with our sales team to discover how Cartesia's 
                ultra-realistic voice AI can transform your business operations and customer interactions.
              </p>
            </div>

            {/* Benefits Grid */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-accent to-chart-4 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Quick Setup</h3>
                <p className="text-text-secondary">Get started with Cartesia's voice AI in minutes, not hours</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-chart-1 to-chart-2 flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Live Demo</h3>
                <p className="text-text-secondary">Experience our real-time voice agents and cloning capabilities</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-r from-chart-3 to-chart-5 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Expert Guidance</h3>
                <p className="text-text-secondary">Connect with our team to design the perfect voice solution</p>
              </div>
            </div>

            {/* Main Booking Section */}
            <div className="max-w-4xl mx-auto">
              <div className="grid md:grid-cols-2 gap-12 items-start">
                {/* Left Column - What to Expect */}
                <div className="space-y-8">
                  <div>
                    <h2 className="text-3xl font-semibold text-white mb-6">What to expect</h2>
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-white">Technical Deep Dive</h4>
                          <p className="text-text-secondary">Explore our State Space Model technology and ultra-low latency capabilities</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-white">Custom Use Case Discussion</h4>
                          <p className="text-text-secondary">Review your specific requirements and integration needs</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-white">Pricing & Implementation</h4>
                          <p className="text-text-secondary">Discuss pricing options and deployment strategies</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start space-x-3">
                        <CheckCircle className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-white">Next Steps Planning</h4>
                          <p className="text-text-secondary">Create a roadmap for your voice AI implementation</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 rounded-lg border border-border bg-card/50">
                    <div className="flex items-center space-x-3 mb-4">
                      <Calendar className="w-5 h-5 text-accent" />
                      <h3 className="font-semibold text-white">Meeting Details</h3>
                    </div>
                    <div className="space-y-2 text-sm text-text-secondary">
                      <p>📅 Duration: 30-45 minutes</p>
                      <p>🎯 Format: Video call via Google Meet</p>
                      <p>🌍 Timezone: Automatically adjusted to your location</p>
                      <p>📋 Preparation: We'll send a brief questionnaire beforehand</p>
                    </div>
                  </div>
                </div>

                {/* Right Column - Booking Widget Placeholder */}
                <div className="space-y-6">
                  <div className="bg-card border border-border rounded-lg p-8 text-center min-h-[500px] flex flex-col items-center justify-center">
                    <Calendar className="w-16 h-16 text-accent mb-6" />
                    <h3 className="text-xl font-semibold text-white mb-4">
                      Calendar Booking Widget
                    </h3>
                    <p className="text-text-secondary mb-6">
                      Interactive calendar widget would be embedded here to allow visitors to select 
                      their preferred date and time for the consultation.
                    </p>
                    <div className="space-y-3 w-full max-w-xs">
                      <button className="w-full bg-white text-background px-6 py-3 rounded-full font-medium hover:bg-text-secondary transition-colors duration-300">
                        Book Meeting
                      </button>
                      <button className="w-full border border-border text-white px-6 py-3 rounded-full font-medium hover:bg-secondary transition-colors duration-300">
                        View Available Times
                      </button>
                    </div>
                  </div>

                  {/* Alternative Contact Options */}
                  <div className="text-center">
                    <p className="text-text-secondary mb-4">Prefer a different approach?</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button className="flex items-center justify-center space-x-2 text-accent hover:text-white transition-colors duration-300">
                        <span>Contact sales directly</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button className="flex items-center justify-center space-x-2 text-accent hover:text-white transition-colors duration-300">
                        <span>Request a callback</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Section */}
            <div className="mt-20 text-center">
              <div className="max-w-2xl mx-auto p-8 rounded-lg border border-border bg-gradient-to-r from-card/50 to-secondary/30">
                <h2 className="text-2xl font-semibold text-white mb-4">
                  Ready to revolutionize your voice interactions?
                </h2>
                <p className="text-text-secondary mb-6">
                  Join leading companies like Quora, LiveKit, and Daily who are already leveraging 
                  Cartesia's cutting-edge voice AI technology to create exceptional user experiences.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button className="bg-white text-background px-8 py-3 rounded-full font-medium hover:bg-text-secondary transition-colors duration-300">
                    Schedule Now
                  </button>
                  <button className="border border-border text-white px-8 py-3 rounded-full font-medium hover:bg-secondary transition-colors duration-300">
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}