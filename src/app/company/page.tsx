import React from "react"
import { Button } from "@/components/ui/button"
import Navigation from "@/components/sections/navigation"
import Footer from "@/components/sections/footer"
import { ArrowRight, Users, Award, ShieldCheck, Building, Globe, Zap, Target, Heart } from "lucide-react"
import Link from "next/link"

export default function AboutPage() {
  const stats = [
    { number: "15+", label: "Languages Supported", icon: Globe },
    { number: "1M+", label: "API Calls Daily", icon: Zap },
    { number: "500+", label: "Enterprise Clients", icon: Building },
    { number: "99.9%", label: "Uptime SLA", icon: ShieldCheck },
  ]

  const values = [
    {
      icon: Target,
      title: "Innovation First",
      description: "We push the boundaries of what's possible with State Space Models and neural audio generation."
    },
    {
      icon: Users,
      title: "Developer-Centric",
      description: "Every API and tool we build is designed with developer experience at the forefront."
    },
    {
      icon: Heart,
      title: "Quality Obsessed",
      description: "We believe that ultra-realistic voice AI requires uncompromising attention to detail."
    },
    {
      icon: Globe,
      title: "Globally Inclusive",
      description: "Building voice AI that works beautifully across languages, cultures, and communities."
    },
  ]

  const certifications = [
    { name: "SOC 2 Type II", description: "Security compliance certification" },
    { name: "HIPAA Compliant", description: "Healthcare data protection" },
    { name: "PCI DSS", description: "Payment card industry standards" },
    { name: "GDPR Compliant", description: "European data protection regulation" },
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="container mx-auto px-6 pt-32 pb-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-200 to-accent bg-clip-text text-transparent">
            About iProsper
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            We're building the next generation of AI-powered voice technology, making interactive intelligence 
            accessible to developers worldwide through our revolutionary State Space Model architecture.
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-accent to-purple-500 mx-auto rounded-full"></div>
        </div>
      </section>

      {/* Mission & Vision Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6 text-white">Our Mission</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              To democratize access to ultra-realistic voice AI technology, empowering developers and businesses 
              to create more natural, engaging, and accessible user experiences through the power of advanced 
              State Space Models.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              We envision a world where interactive intelligence is ubiquitous—where every application, 
              device, and service can communicate with users as naturally as humans do.
            </p>
          </div>
          <div className="relative">
            <div className="aspect-square bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-2xl p-8 border border-white/10 relative overflow-hidden">
              {/* Enhanced Ripple effects - larger and more prominent */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="absolute w-40 h-40 border-4 border-accent/50 rounded-full animate-ping"></div>
                <div className="absolute w-60 h-60 border-4 border-accent/40 rounded-full animate-ping" style={{animationDelay: '0.3s'}}></div>
                <div className="absolute w-80 h-80 border-3 border-accent/30 rounded-full animate-ping" style={{animationDelay: '0.6s'}}></div>
                <div className="absolute w-96 h-96 border-3 border-accent/25 rounded-full animate-ping" style={{animationDelay: '0.9s'}}></div>
                <div className="absolute w-[28rem] h-[28rem] border-2 border-accent/20 rounded-full animate-ping" style={{animationDelay: '1.2s'}}></div>
                <div className="absolute w-[32rem] h-[32rem] border-2 border-accent/15 rounded-full animate-ping" style={{animationDelay: '1.5s'}}></div>
              </div>
              <div className="h-full w-full bg-gradient-to-br from-accent/10 to-purple-500/10 rounded-xl flex items-center justify-center relative z-10">
                <div className="text-center">
                  <Target className="h-16 w-16 text-accent mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Next-Gen AI</h3>
                  <p className="text-muted-foreground">State Space Model Technology</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">Our Values</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The principles that guide everything we do, from research to product development
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {values.map((value, index) => (
            <div key={index} className="card group hover:border-accent/50 transition-all duration-300">
              <value.icon className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-xl font-semibold text-white mb-3">{value.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{value.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Technology Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="aspect-video bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl p-8 border border-white/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5"></div>
              <div className="relative z-10 h-full flex items-center justify-center">
                <div className="flex space-x-2 items-end">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-4 bg-gradient-to-t from-orange-500 to-red-500 rounded-full animate-waveform-pulse"
                      style={{
                        height: `${30 + (i % 4) * 15}px`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '1.5s'
                      }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-6 text-white">Technology Leadership</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Our proprietary State Space Model architecture delivers unprecedented performance in voice AI, 
              achieving ultra-low latency while maintaining the highest quality audio generation in the industry.
            </p>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-white">Real-time voice synthesis with &lt;50ms latency</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-white">Multi-language support with native pronunciation</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-white">Advanced voice cloning and emotion modeling</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-white">Enterprise-grade security and compliance</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">Trusted by Industry Leaders</h2>
          <p className="text-lg text-muted-foreground">
            Powering voice AI for companies around the world
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center card group hover:border-accent/50 transition-all duration-300">
              <stat.icon className="h-12 w-12 text-accent mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <div className="text-3xl font-bold text-white mb-2">{stat.number}</div>
              <div className="text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Certifications Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-white">Enterprise-Grade Security</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We maintain the highest standards of security and compliance to protect your data and ensure regulatory adherence
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {certifications.map((cert, index) => (
            <div key={index} className="card text-center group hover:border-accent/50 transition-all duration-300">
              <ShieldCheck className="h-12 w-12 text-accent mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
              <h3 className="text-lg font-semibold text-white mb-2">{cert.name}</h3>
              <p className="text-sm text-muted-foreground">{cert.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Leadership Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 text-white">Leadership Team</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our team combines deep expertise in AI research, engineering excellence, and industry experience 
            to push the boundaries of what's possible with voice AI.
          </p>
          <Link href="/team">
            <Button className="btn-primary group">
              Meet the Team
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="card text-center bg-gradient-to-r from-accent/10 to-purple-500/10 border-accent/20">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to Build the Future?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join our team of researchers, engineers, and innovators who are shaping the next generation of AI technology.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/careers">
              <Button className="btn-primary group">
                View Open Positions
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="secondary" className="btn-secondary group">
                Contact Sales
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-muted-foreground">
              Interested in partnerships? <Link href="/contact" className="text-accent hover:underline">Get in touch</Link> to explore collaboration opportunities.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}