"use client";

import React, { useState, useEffect } from 'react';
import Navigation from "@/components/sections/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScheduleDemoModal } from "@/components/ui/schedule-demo-modal";
import {
  Zap,
  Clock,
  Globe,
  Wifi,
  Phone,
  Settings,
  TrendingUp,
  Users,
  DollarSign,
  Scissors,
  HeadphonesIcon as Support,
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Play } from
'lucide-react';

export default function ProductPage() {
  const features = [
  {
    icon: <Zap className="h-8 w-8" />,
    title: "High Quality LLMs",
    description: "State-of-the-art language models trained for natural conversations"
  },
  {
    icon: <Clock className="h-8 w-8" />,
    title: "High Speed AI",
    description: "Ultra-fast response times for seamless real-time interactions"
  },
  {
    icon: <Globe className="h-8 w-8" />,
    title: "Deploy Anywhere",
    description: "Cloud, on-premise, or hybrid deployment options available"
  },
  {
    icon: <Wifi className="h-8 w-8" />,
    title: "Best-in-class TTFB",
    description: "Industry-leading Time To First Byte for optimal performance"
  },
  {
    icon: <Phone className="h-8 w-8" />,
    title: "24/7 Availability",
    description: "Round-the-clock service with 99.9% uptime guarantee"
  },
  {
    icon: <Settings className="h-8 w-8" />,
    title: "Seamless Integration",
    description: "Easy API integration with your existing business systems"
  }];


  const businessBenefits = [
  {
    icon: <Clock className="h-8 w-8" />,
    title: "Unlock Time Savings",
    description: "Automate routine calls and free up staff for high-value activities",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    icon: <Users className="h-8 w-8" />,
    title: "Improve Customer Experience",
    description: "Provide instant, accurate responses 24/7 with consistent quality",
    gradient: "from-orange-500 to-red-500"
  },
  {
    icon: <TrendingUp className="h-8 w-8" />,
    title: "Increase Revenue",
    description: "Convert more leads and never miss a business opportunity",
    gradient: "from-green-500 to-teal-500"
  },
  {
    icon: <DollarSign className="h-8 w-8" />,
    title: "Reduce Operational Costs",
    description: "Cut call center expenses by up to 70% with AI automation",
    gradient: "from-purple-500 to-pink-500"
  },
  {
    icon: <Support className="h-8 w-8" />,
    title: "Enhance Service Accuracy",
    description: "Eliminate human error with consistent, trained AI responses",
    gradient: "from-cyan-500 to-blue-500"
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    title: "Discover Data Insights",
    description: "Analyze customer interactions to understand what they truly want",
    gradient: "from-yellow-500 to-orange-500"
  }];


  const useCases = [
  {
    title: "Health Care Practice",
    description: "Pre-visit questions, post-visit follow-ups, general FAQ",
    phone: "+1 (555) 123-4567",
    gradient: "from-blue-600 to-purple-700"
  },
  {
    title: "Restaurant Staff",
    description: "Menu questions, handle bookings, cancellations",
    phone: "+1 (555) 234-5678",
    gradient: "from-orange-600 to-red-600"
  },
  {
    title: "E-Commerce Store",
    description: "Customer preferences, business services, product inquiries",
    phone: "+1 (555) 345-6789",
    gradient: "from-green-600 to-teal-600"
  }];


  const roiStats = [
  { industry: "Builder", percentage: "+750%" },
  { industry: "Moving Company", percentage: "+461%" },
  { industry: "Construction", percentage: "+687%" },
  { industry: "Kitchen & Bath Remodeling", percentage: "+1025%" },
  { industry: "Financial Services", percentage: "+1475%" }];


  const whyChooseReasons = [
  "Proven ROI with 10x national average results",
  "Industry-versatile solutions for any business",
  "Always on-brand AI agents trained on your data",
  "24/7 customer service capability",
  "Advanced natural language processing",
  "Easy integration with existing systems",
  "Comprehensive analytics and insights",
  "Cost-effective compared to human call centers"];


  const pricingTiers = [
  {
    name: "Starter",
    price: "$400",
    period: "/month",
    description: "Perfect for small businesses",
    features: [
    "Up to 400 minutes/month",
    "Basic AI training",
    "Email support",
    "Standard integrations",
    "Basic analytics",
    "1 phone number"],

    popular: false
  },
  {
    name: "Professional",
    price: "$2,000",
    period: "/month",
    description: "Ideal for growing businesses",
    features: [
    "Up to 2,000 minutes/month",
    "Advanced AI training",
    "Priority support",
    "Premium integrations",
    "Advanced analytics",
    "1 phone number",
    "Custom voice cloning",
    "CRM integration"],

    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "pricing",
    description: "For large organizations",
    features: [
    "Unlimited Possibilites",
    "Custom AI development",
    "Dedicated support team",
    "All integrations",
    "Enterprise analytics",
    "Vanity phone numbers",
    "On-premise deployment",
    "24/7 phone support"],

    popular: false
  }];


  const testimonials = [
  {
    name: "Sarah Johnson",
    title: "CEO",
    company: "MedCare Clinic",
    quote: "iProsper.io has revolutionized our patient communications. We've reduced no-shows by 40% and our staff can focus on patient care instead of answering basic questions.",
    avatar: "/api/placeholder/64/64"
  },
  {
    name: "Mike Rodriguez",
    title: "Operations Manager",
    company: "Elite Construction",
    quote: "The ROI was immediate. We're capturing leads 24/7 and our conversion rate has increased by 300%. Best investment we've made for our business.",
    avatar: "/api/placeholder/64/64"
  },
  {
    name: "Lisa Chen",
    title: "Restaurant Owner",
    company: "Golden Dragon",
    quote: "Our AI handles reservations perfectly, even during our busiest hours. Customers love the instant response and we never miss a booking again.",
    avatar: "/api/placeholder/64/64"
  }];


  // Add animation state for bars
  const [barHeights, setBarHeights] = useState(() =>
    Array.from({ length: 20 }, () => Math.random() * 100 + 20)
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBarHeights(Array.from({ length: 20 }, () => Math.random() * 100 + 20));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-6 pt-32">
        <div className="container mx-auto text-center">
          <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            Conversational Voice AI, Trained To Speak Your Business
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Deploy AI agents that are efficient, effective, and always on-brand. Transform your customer communications with intelligent voice technology that works around the clock.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/schedule-demo">
              <Button 
                size="lg" 
                className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-6 rounded-3xl"
              >
                Schedule Demo
              </Button>
            </Link>
            <Link href="/schedule-demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-3xl border-white/20 hover:bg-white/10">
                Schedule Demo
              </Button>
            </Link>
          </div>
          
          {/* Animated Bars */}
          <div className="flex justify-center items-end space-x-2 h-32">
            {Array.from({ length: 20 }).map((_, i) => {
              const colors = ['#ff6b00', '#ff1744', '#9c27b0', '#0099ff', '#00bcd4', '#ffc107', '#4caf50', '#e91e63'];
              return (
                <div
                  key={i}
                  className="transition-all duration-1000 ease-in-out !block"
                  style={{
                    width: '8px',
                    height: `${barHeights[i]}px`,
                    backgroundColor: colors[i % colors.length],
                    borderRadius: '4px'
                  }} />
              );
            })}
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-5xl font-semibold text-center mb-16">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) =>
            <Card key={index} className="bg-card border-white/10 hover:border-white/20 transition-all duration-300">
                <CardContent className="p-8">
                  <div className="text-blue-400 mb-4">{feature.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Business Benefits Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-5xl font-semibold text-center mb-16">Transform Your Business</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {businessBenefits.map((benefit, index) =>
            <Card key={index} className="group relative overflow-hidden border-white/10 hover:border-white/20 transition-all duration-300">
                <div className={`absolute inset-0 bg-gradient-to-br ${benefit.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <CardContent className="p-8 relative">
                  <div className="text-white mb-4">{benefit.icon}</div>
                  <h3 className="text-xl font-semibold mb-3">{benefit.title}</h3>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-5xl font-semibold text-center mb-16">Try Our Demo Agents</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) =>
            <Card key={index} className="group relative overflow-hidden border-white/10">
                <div className={`absolute inset-0 bg-gradient-to-br ${useCase.gradient} opacity-90`} />
                <CardContent className="p-8 relative text-white">
                  <h3 className="text-2xl font-semibold mb-4">{useCase.title}</h3>
                  <p className="mb-6 text-white/90">{useCase.description}</p>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5" />
                      <span className="font-mono">{useCase.phone}</span>
                    </div>
                    <Button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm">
                      <Play className="h-4 w-4 mr-2" />
                      Try Demo
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* ROI Statistics Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-5xl font-semibold text-center mb-4">Proven Results</h2>
          <p className="text-xl text-muted-foreground text-center mb-16">
            Our clients see exceptional ROI across all industries
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
            {roiStats.map((stat, index) =>
            <div key={index} className="text-center">
                <div className="text-4xl font-bold text-green-400 mb-2">{stat.percentage}</div>
                <div className="text-muted-foreground">{stat.industry}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Why Choose iProsper.io Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-5xl font-semibold text-center mb-16">Why Choose iProsper.io</h2>
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {whyChooseReasons.map((reason, index) =>
              <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="h-6 w-6 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-lg">{reason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-5xl font-semibold text-center mb-4">Simple, Transparent Pricing</h2>
          <p className="text-xl text-muted-foreground text-center mb-16">
            Choose the plan that fits your business needs
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingTiers.map((tier, index) =>
            <Card key={index} className={`relative border-white/10 ${tier.popular ? 'border-blue-500 shadow-lg shadow-blue-500/20' : ''}`}>
                {tier.popular &&
              <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                    Most Popular
                  </Badge>
              }
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-semibold mb-2">{tier.name}</h3>
                    <div className="mb-2">
                      <span className="text-4xl font-bold !whitespace-pre-line !whitespace-pre-line">{tier.price}</span>
                      <span className="text-muted-foreground">{tier.period}</span>
                    </div>
                    <p className="text-muted-foreground">{tier.description}</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((feature, featureIndex) =>
                  <li key={featureIndex} className="flex items-center space-x-2">
                        <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                        <span className="!whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line">{feature}</span>
                      </li>
                  )}
                  </ul>
                  <Button className={`w-full ${tier.popular ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white text-black hover:bg-gray-200'}`}>
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <h2 className="text-5xl font-semibold text-center mb-16">What Our Customers Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) =>
            <Card key={index} className="bg-card border-white/10">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {Array.from({ length: 5 }).map((_, i) =>
                  <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  )}
                  </div>
                  <blockquote className="text-lg mb-6 italic">"{testimonial.quote}"</blockquote>
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold">{testimonial.name.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-semibold">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground">{testimonial.title}, {testimonial.company}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto text-center">
          <h2 className="text-5xl font-semibold mb-6">Ready to Transform Your Business?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of businesses using AI to improve customer experience and boost revenue.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/schedule-demo">
              <Button 
                size="lg" 
                className="bg-white text-black hover:bg-gray-200 text-lg px-8 py-6 rounded-3xl"
              >
                Schedule Demo
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="/schedule-demo">
              <Button variant="outline" size="lg" className="text-lg px-8 py-6 rounded-3xl border-white/20 hover:bg-white/10">
                Schedule Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>);

}