'use client';

import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const pricingTiers = [
{
  name: "Starter",
  monthlyPrice: 200,
  annualPrice: 2000,
  price: "$200",
  period: "/month",
  description: "Perfect for solopreneurs",
  features: [
  "Up to 200 minutes/month",
  "AI training",
  "Email support",
  "Standard integrations",
  "Basic analytics",
  "1 phone number"],

  popular: false
},
{
  name: "Professional",
  monthlyPrice: 400,
  annualPrice: 4000,
  price: "$400",
  period: "/month",
  description: "Ideal for growing teams",
  features: [
  "Up to 400 minutes/month",
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
  name: "Business",
  monthlyPrice: 1000,
  annualPrice: 10000,
  price: "$1,000",
  period: "/month",
  description: "For established companies",
  features: [
  "Up to 1,000 minutes/month",
  "Expert AI training",
  "24/7 chat support",
  "All premium integrations",
  "Advanced analytics dashboard",
  "1 phone numbers",
  "Custom voice cloning",
  "Multi-language support",
  "API access"],

  popular: false
},
{
  name: "Premium",
  monthlyPrice: 2000,
  annualPrice: 20000,
  price: "$2,000",
  period: "/month",
  description: "For scaling organizations",
  features: [
  "Up to 2,000 minutes/month",
  "Custom AI model training",
  "Dedicated account manager",
  "White-label solutions",
  "Enterprise analytics",
  "1 phone numbers",
  "Advanced voice cloning",
  "Multi-tenant architecture",
  "Custom integrations",
  "SLA guarantee"],

  popular: false
},
{
  name: "Corporate",
  monthlyPrice: 10000,
  annualPrice: 100000,
  price: "$10,000",
  period: "/month",
  description: "For large enterprises",
  features: [
  "Up to 10,000 minutes/month",
  "Fully custom AI development",
  "Priority phone support",
  "Complete white-labeling",
  "Real-time analytics suite",
  "1 phone numbers",
  "Enterprise voice cloning",
  "Multi-region deployment",
  "Custom development",
  "Compliance reporting",
  "Dedicated infrastructure"],

  popular: false
},
{
  name: "Enterprise",
  monthlyPrice: "Custom",
  annualPrice: "Custom",
  period: "pricing",
  description: "For large organizations",
  features: [
  "Unlimited Possibilities",
  "Custom AI development",
  "Dedicated support team",
  "All integrations",
  "Enterprise analytics",
  "1 Vanity phone numbers",
  "On-premise deployment",
  "24/7 phone support",
  "Global infrastructure",
  "Custom SLAs",
  "Regulatory compliance",
  "White-glove onboarding"],

  popular: false
}];


export default function PricingPage() {
  const router = useRouter();
  const [barHeights, setBarHeights] = useState(() =>
    Array.from({ length: 15 }, () => Math.random() * 60 + 15)
  );

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBarHeights(Array.from({ length: 15 }, () => Math.random() * 60 + 15));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleGetStarted = () => {
    router.push('/schedule-demo');
  };

  const formatPrice = (tier: any) => {
    if (tier.name === "Enterprise") {
      return { price: "Custom", period: "pricing" };
    }

    if (billingCycle === 'monthly') {
      return {
        price: `$${tier.monthlyPrice.toLocaleString()}`,
        period: "/month"
      };
    } else {
      const monthlyEquivalent = Math.round(tier.annualPrice / 12);
      return {
        price: `$${monthlyEquivalent.toLocaleString()}`,
        period: "/month",
        annualPrice: `$${tier.annualPrice.toLocaleString()}/year`,
        savings: `Save $${(tier.monthlyPrice * 12 - tier.annualPrice).toLocaleString()}`
      };
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      
      <main className="pt-20">
        <section className="py-20 px-6">
          <div className="container mx-auto">
            {/* Smaller Animated Bars */}
            <div className="flex justify-center items-end space-x-1.5 h-20 mb-12">
              {Array.from({ length: 15 }).map((_, i) => {
                const colors = ['#ff6b00', '#ff1744', '#9c27b0', '#0099ff', '#00bcd4', '#ffc107', '#4caf50', '#e91e63'];
                return (
                  <div
                    key={i}
                    className="transition-all duration-1000 ease-in-out !block"
                    style={{
                      width: '6px',
                      height: `${barHeights[i]}px`,
                      backgroundColor: colors[i % colors.length],
                      borderRadius: '3px'
                    }} />);

              })}
            </div>
            
            <h2 className="text-5xl font-semibold text-center mb-4 text-white">Simple, Transparent Pricing</h2>
            <p className="text-xl text-neutral-400 text-center mb-8">
              Choose the plan that fits your business needs
            </p>

            {/* Billing Toggle */}
            <div className="flex justify-center mb-16">
              <div className="bg-[#2a2a2a] border border-white/10 rounded-full p-1 flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  billingCycle === 'monthly' ?
                  'bg-white text-black' :
                  'text-white hover:text-gray-300'}`
                  }>

                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 relative ${
                  billingCycle === 'annual' ?
                  'bg-white text-black' :
                  'text-white hover:text-gray-300'}`
                  }>

                  Annual
                  <Badge className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1 py-0.5">
                    Save 17%
                  </Badge>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              {pricingTiers.map((tier, index) => {
                const pricing = formatPrice(tier);
                return (
                  <Card key={index} className={`relative bg-[#2a2a2a] border-white/10 flex flex-col h-full ${tier.popular ? 'border-blue-500 shadow-lg shadow-blue-500/20' : ''}`}>
                    {tier.popular &&
                    <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white">
                        Most Popular
                      </Badge>
                    }
                    <CardContent className="p-8 flex flex-col flex-1">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-semibold mb-2 text-white">{tier.name}</h3>
                        <div className="mb-2">
                          <span className="text-4xl font-bold text-white !whitespace-pre-line">{pricing.price}</span>
                          <span className="text-neutral-400">{pricing.period}</span>
                        </div>
                        {billingCycle === 'annual' && tier.name !== "Enterprise" &&
                        <div className="text-sm text-neutral-400">
                            <div>{pricing.annualPrice}</div>
                            <div className="text-green-400 font-medium">{pricing.savings}</div>
                          </div>
                        }
                        <p className="text-neutral-400">{tier.description}</p>
                      </div>
                      <ul className="space-y-3 mb-8 flex-1">
                        {tier.features.map((feature, featureIndex) =>
                        <li key={featureIndex} className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                            <span className="text-white !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line">{feature}</span>
                          </li>
                        )}
                      </ul>
                      <Button 
                        onClick={handleGetStarted}
                        className={`w-full mt-auto ${tier.popular ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white text-black hover:bg-gray-200'}`}
                      >
                        Get Started
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>);

              })}
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>);

}