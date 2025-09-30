"use client";

import { useState } from "react";
import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronRight, 
  MapPin, 
  Clock, 
  Users, 
  Brain, 
  Code, 
  Briefcase, 
  Heart,
  Shield,
  Globe,
  Zap,
  Award,
  Coffee,
  Plane,
  GraduationCap,
  Filter,
  ExternalLink
} from "lucide-react";

const jobCategories = [
  { id: "all", name: "All Positions", count: 12 },
  { id: "engineering", name: "Engineering", count: 6 },
  { id: "research", name: "Research", count: 3 },
  { id: "product", name: "Product", count: 2 },
  { id: "business", name: "Business", count: 1 }
];

const jobs = [
  {
    id: 1,
    title: "Senior AI/ML Engineer",
    department: "Engineering",
    category: "engineering",
    location: "San Francisco, CA / Remote",
    type: "Full-time",
    description: "Build and optimize state-of-the-art voice AI models using cutting-edge State Space Model architectures. Work on real-time inference, model optimization, and deployment at scale.",
    requirements: ["5+ years ML engineering experience", "Deep learning frameworks (PyTorch, TensorFlow)", "Production ML systems", "Voice/audio processing"],
    posted: "2 days ago"
  },
  {
    id: 2,
    title: "Staff Research Scientist - Voice AI",
    department: "Research",
    category: "research",
    location: "San Francisco, CA",
    type: "Full-time",
    description: "Lead groundbreaking research in voice synthesis, cloning, and real-time speech generation. Publish papers and advance the state-of-the-art in neural audio processing.",
    requirements: ["PhD in ML/AI or equivalent", "Voice synthesis research", "Published papers", "State Space Models experience"],
    posted: "1 week ago"
  },
  {
    id: 3,
    title: "Frontend Engineer - Developer Experience",
    department: "Engineering",
    category: "engineering",
    location: "Remote",
    type: "Full-time",
    description: "Create beautiful, intuitive interfaces for our developer platform. Build tools that make voice AI accessible to developers worldwide.",
    requirements: ["React/Next.js expertise", "Developer tools experience", "API design", "TypeScript proficiency"],
    posted: "3 days ago"
  },
  {
    id: 4,
    title: "Product Manager - Voice Platform",
    department: "Product",
    category: "product",
    location: "San Francisco, CA / Remote",
    type: "Full-time",
    description: "Drive product strategy for our voice AI platform. Work closely with engineering and research teams to deliver products that delight developers.",
    requirements: ["5+ years product management", "Developer platform experience", "AI/ML product knowledge", "Technical background"],
    posted: "5 days ago"
  },
  {
    id: 5,
    title: "DevOps Engineer - ML Infrastructure",
    department: "Engineering",
    category: "engineering",
    location: "Remote",
    type: "Full-time",
    description: "Scale our ML infrastructure to handle millions of voice generation requests. Build robust, secure systems for real-time AI inference.",
    requirements: ["Kubernetes/Docker expertise", "ML infrastructure", "AWS/GCP experience", "CI/CD pipelines"],
    posted: "1 week ago"
  },
  {
    id: 6,
    title: "Research Engineer - Audio Processing",
    department: "Research",
    category: "research",
    location: "San Francisco, CA / Remote",
    type: "Full-time",
    description: "Implement and optimize novel audio processing algorithms. Bridge the gap between research breakthroughs and production systems.",
    requirements: ["Audio signal processing", "C++/Python proficiency", "Real-time systems", "Research implementation"],
    posted: "4 days ago"
  }
];

const benefits = [
  {
    icon: Heart,
    title: "Health & Wellness",
    description: "Comprehensive medical, dental, and vision insurance. Mental health support and wellness stipends."
  },
  {
    icon: Zap,
    title: "Competitive Compensation",
    description: "Top-tier salary and meaningful equity. Performance bonuses and regular compensation reviews."
  },
  {
    icon: Globe,
    title: "Remote-First Culture",
    description: "Work from anywhere with flexible hours. Home office setup budget and co-working allowances."
  },
  {
    icon: GraduationCap,
    title: "Professional Development",
    description: "Conference attendance, learning budgets, and mentorship programs. Pursue your growth."
  },
  {
    icon: Coffee,
    title: "Work-Life Balance",
    description: "Unlimited PTO, sabbatical options, and flexible schedules. Family leave and support."
  },
  {
    icon: Plane,
    title: "Team Retreats",
    description: "Quarterly team gatherings in amazing locations. Build connections and celebrate wins."
  }
];

const applicationSteps = [
  {
    step: 1,
    title: "Application Review",
    description: "Our team reviews your application within 48 hours. We look for passion, skills, and cultural fit."
  },
  {
    step: 2,
    title: "Initial Screening",
    description: "30-minute conversation with our talent team to discuss your background and interests."
  },
  {
    step: 3,
    title: "Technical Interview",
    description: "Role-specific technical assessment. For engineers: coding and system design. For others: relevant skills."
  },
  {
    step: 4,
    title: "Team Interviews",
    description: "Meet with potential teammates and cross-functional partners. Cultural fit and collaboration focus."
  },
  {
    step: 5,
    title: "Final Interview",
    description: "Conversation with leadership about vision, growth, and how you'll shape iProsper's future."
  },
  {
    step: 6,
    title: "Offer & Onboarding",
    description: "Competitive offer and comprehensive onboarding program to set you up for success."
  }
];

const companyValues = [
  {
    icon: Brain,
    title: "Innovation First",
    description: "Push boundaries and challenge conventional thinking in every project."
  },
  {
    icon: Users,
    title: "Diverse Perspectives",
    description: "Build inclusive teams that represent the world we're building for."
  },
  {
    icon: Shield,
    title: "Ethical AI",
    description: "Develop responsible AI that respects privacy and human values."
  },
  {
    icon: Award,
    title: "Excellence",
    description: "Maintain the highest standards in research, engineering, and product."
  }
];

export default function CareersPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const filteredJobs = selectedCategory === "all" 
    ? jobs 
    : jobs.filter(job => job.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Breadcrumb */}
      <div className="container pt-24 pb-8">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Home</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">Careers</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="container pb-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-accent bg-clip-text text-transparent">
            Join Our Mission
          </h1>
          <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
            Help us shape the future of voice AI technology. Join a team of world-class researchers, 
            engineers, and visionaries building the next generation of interactive intelligence that 
            will transform how humans communicate with AI systems.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              View Open Positions
            </Button>
            <Button variant="outline" size="lg">
              Learn About Our Culture
            </Button>
          </div>
        </div>
        
        {/* Animated gradient visualization */}
        <div className="mt-16 h-32 relative overflow-hidden rounded-lg bg-gradient-to-r from-accent/20 via-purple-500/20 to-orange-500/20">
          <div className="absolute inset-0 flex items-end justify-center space-x-1 p-4">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="w-2 bg-gradient-to-t from-accent via-purple-500 to-orange-500 rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${1 + Math.random()}s`
                }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Why Work Here */}
      <section className="container py-20">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">Why Work at iProsper AI</h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join a mission-driven team building the future of human-AI interaction with cutting-edge 
            voice technology, incredible growth opportunities, and a culture that values innovation and collaboration.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {companyValues.map((value, index) => (
            <div key={index} className="card group hover:border-accent/50 transition-all duration-300">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors duration-300">
                  <value.icon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Open Positions */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-6">Open Positions</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Discover opportunities to work on groundbreaking voice AI technology with a world-class team.
          </p>
        </div>

        {/* Job Category Filter */}
        <div className="flex flex-wrap gap-2 justify-center mb-12">
          {jobCategories.map((category) => (
            <Button
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(category.id)}
              className="group"
            >
              <Filter className="w-4 h-4 mr-2" />
              {category.name}
              <Badge variant="secondary" className="ml-2">
                {category.count}
              </Badge>
            </Button>
          ))}
        </div>

        {/* Job Listings */}
        <div className="space-y-6">
          {filteredJobs.map((job) => (
            <div 
              key={job.id}
              className="card hover:border-accent/50 transition-all duration-300 cursor-pointer"
              onClick={() => setExpandedJob(expandedJob === job.id ? null : job.id)}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    <h3 className="text-2xl font-semibold">{job.title}</h3>
                    <Badge variant="outline" className="bg-accent/10 text-accent border-accent/30">
                      {job.department}
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-6 text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Posted {job.posted}</span>
                    </div>
                  </div>
                  
                  <p className="text-muted-foreground mb-4">{job.description}</p>
                  
                  {expandedJob === job.id && (
                    <div className="pt-6 border-t border-border">
                      <h4 className="font-semibold mb-3">Key Requirements:</h4>
                      <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-6">
                        {job.requirements.map((req, index) => (
                          <li key={index}>{req}</li>
                        ))}
                      </ul>
                      <div className="flex gap-3">
                        <Button className="bg-accent hover:bg-accent/90">
                          Apply Now
                          <ExternalLink className="w-4 h-4 ml-2" />
                        </Button>
                        <Button variant="outline">
                          Learn More
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Button 
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Handle direct apply
                    }}
                  >
                    Quick Apply
                  </Button>
                  <ChevronRight 
                    className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                      expandedJob === job.id ? 'rotate-90' : ''
                    }`} 
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Application Process */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-6">Our Hiring Process</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We've designed a thorough but efficient process to help us get to know each other 
            and ensure mutual fit for long-term success.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            {applicationSteps.map((step, index) => (
              <div key={step.step} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-bold">
                    {step.step}
                  </div>
                  {index < applicationSteps.length - 1 && (
                    <div className="w-px h-16 bg-border ml-6 mt-4" />
                  )}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits & Perks */}
      <section className="container py-20">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-6">Benefits & Perks</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            We believe in taking care of our team with comprehensive benefits, 
            competitive compensation, and perks that support your best work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="card group hover:border-accent/50 transition-all duration-300">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors duration-300 flex-shrink-0">
                  <benefit.icon className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Office & Remote */}
      <section className="container py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">Work From Anywhere</h2>
            <p className="text-xl text-muted-foreground mb-6">
              We're a remote-first company with headquarters in San Francisco. 
              Whether you prefer working from home, a co-working space, or our beautiful 
              SF office, we support flexible work arrangements that help you do your best work.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>San Francisco HQ with modern amenities</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>Remote work supported globally</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>Home office setup budget</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>Co-working space allowances</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-accent" />
                <span>Quarterly team retreats</span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <div className="aspect-square rounded-2xl bg-gradient-to-br from-accent/20 via-purple-500/20 to-orange-500/20 p-8">
              <div className="h-full rounded-xl bg-card border border-border p-6 flex flex-col justify-center items-center text-center">
                <Globe className="w-16 h-16 text-accent mb-4" />
                <h3 className="text-2xl font-semibold mb-3">Global Team</h3>
                <p className="text-muted-foreground">
                  Join colleagues across 15+ countries building the future of voice AI together.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20">
        <div className="card max-w-4xl mx-auto text-center bg-gradient-to-r from-accent/5 via-purple-500/5 to-orange-500/5 border-accent/20">
          <h2 className="text-4xl font-bold mb-6">Ready to Shape the Future?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Don't see the perfect role? We're always looking for exceptional talent. 
            Send us your resume and let's explore how you can contribute to our mission.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Apply to Open Roles
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg">
              Send General Application
            </Button>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border">
            <p className="text-muted-foreground">
              Questions about our culture, benefits, or open roles? 
              <a href="mailto:careers@iprosper.ai" className="text-accent hover:underline ml-1">
                Contact our talent team
              </a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}