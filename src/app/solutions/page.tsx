'use client'

import Navigation from '@/components/sections/navigation'
import Footer from '@/components/sections/footer'
import { useState, useEffect } from 'react'

export default function SolutionsPage() {
  const [barHeights, setBarHeights] = useState(() =>
    Array.from({ length: 20 }, () => Math.random() * 100 + 20)
  );

  useEffect(() => {
    const intervalId = setInterval(() => {
      setBarHeights(Array.from({ length: 20 }, () => Math.random() * 100 + 20));
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  const customerExperienceSolutions = [
    {
      title: "Never Miss a Lead Again",
      description: "Capture every opportunity with 24/7 intelligent voice assistance that engages prospects instantly",
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Eliminate Customer Hold Times",
      description: "Provide instant responses and reduce wait times with AI-powered voice agents",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      title: "Offer 24/7 Customer Support",
      description: "Round-the-clock availability ensures customers get help whenever they need it",
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      title: "Deliver Consistent, On-Brand Service",
      description: "Maintain uniform service quality and messaging across all customer interactions",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Provide Instant Answers to FAQs",
      description: "Resolve common questions immediately without human intervention",
      gradient: "from-green-500 to-teal-500"
    },
    {
      title: "Ensure Full Compliance",
      description: "Meet regulatory requirements with built-in compliance features and audit trails",
      gradient: "from-yellow-500 to-orange-500"
    }
  ]

  const bottomLineSolutions = [
    {
      title: "Cut Operational Costs Dramatically",
      description: "Reduce staffing expenses and overhead with automated voice operations",
      gradient: "from-red-500 to-pink-500"
    },
    {
      title: "Boost Team Productivity",
      description: "Free up human agents to focus on complex, high-value customer interactions",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Scale Instantly Without Hiring",
      description: "Handle unlimited concurrent calls without adding personnel",
      gradient: "from-purple-500 to-blue-500"
    },
    {
      title: "Reduce Human Error",
      description: "Eliminate mistakes in data collection, call routing, and information delivery",
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Eliminate Phone Tag",
      description: "Connect customers directly with the right information or department instantly",
      gradient: "from-cyan-500 to-purple-500"
    },
    {
      title: "Qualify Leads Automatically",
      description: "Screen and prioritize prospects based on predefined criteria",
      gradient: "from-green-500 to-blue-500"
    },
    {
      title: "Eliminate Understaffing, Call Outs, Operations Bottle Necking",
      description: "Maintain consistent service levels regardless of staffing challenges",
      gradient: "from-yellow-500 to-red-500"
    }
  ]

  const competitiveEdgeSolutions = [
    {
      title: "Gain a Competitive Advantage",
      description: "Stay ahead with cutting-edge AI technology that competitors lack",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Enhance Your Professional Image",
      description: "Impress customers with sophisticated, intelligent voice interactions",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      title: "Improve Call Routing Efficiency",
      description: "Direct calls to the right destination faster and more accurately",
      gradient: "from-cyan-500 to-blue-500"
    },
    {
      title: "Support Multiple Languages",
      description: "Serve diverse customer bases with multilingual voice capabilities",
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Future-Proof Your Sales & Customer Service",
      description: "Build on scalable AI infrastructure that evolves with your business",
      gradient: "from-green-500 to-teal-500"
    },
    {
      title: "Deploy in Days, Not Months",
      description: "Get up and running quickly with our streamlined implementation process",
      gradient: "from-yellow-500 to-orange-500"
    }
  ]

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
            Voice AI Solutions
          </h1>
          <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-16">
            Transform your customer experience and business operations with intelligent voice automation
          </p>
          
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

      {/* For Your Customers' Experience Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              For Your Customers' Experience
            </h2>
            <p className="text-xl text-gray-400">
              Deliver exceptional customer experiences that drive satisfaction and loyalty
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customerExperienceSolutions.map((solution, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${solution.gradient} rounded-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
              >
                <h3 className="text-xl font-bold text-white mb-3">
                  {solution.title}
                </h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  {solution.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Your Bottom Line & Efficiency Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              For Your Bottom Line & Efficiency
            </h2>
            <p className="text-xl text-gray-400">
              Maximize profitability and operational efficiency with intelligent automation
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bottomLineSolutions.map((solution, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${solution.gradient} rounded-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl ${
                  index === bottomLineSolutions.length - 1 
                    ? 'md:col-span-2 lg:col-span-3 max-w-md mx-auto' 
                    : ''
                }`}
              >
                <h3 className="text-xl font-bold text-white mb-3">
                  {solution.title}
                </h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  {solution.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Your Competitive Edge Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              For Your Competitive Edge
            </h2>
            <p className="text-xl text-gray-400">
              Stay ahead of the competition with next-generation voice AI technology
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {competitiveEdgeSolutions.map((solution, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${solution.gradient} rounded-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
              >
                <h3 className="text-xl font-bold text-white mb-3">
                  {solution.title}
                </h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  {solution.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}