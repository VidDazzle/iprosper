'use client'

import Navigation from '@/components/sections/navigation'
import Footer from '@/components/sections/footer'
import Link from 'next/link'

export default function AiOsPage() {
  const integrations = [
    {
      title: "Your Email",
      description: "Agents read inbound messages, classify intent, draft replies, and send follow-ups — with permissions you set on exactly what they can touch.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Your CRM",
      description: "Every call, meeting, and conversation is logged automatically. Deal stages update themselves. No more end-of-day data entry.",
      gradient: "from-blue-500 to-purple-500"
    },
    {
      title: "Your Video Conferencing",
      description: "Meetings get booked, summarized, and followed up on. The work that happens after the call ends is handled before you close the laptop.",
      gradient: "from-cyan-500 to-blue-500"
    }
  ]

  const advantages = [
    {
      title: "The Connective Tissue Your Tools Are Missing",
      description: "Email, CRM, and video conferencing don't talk to each other. Evolve AI OS turns them into one automated workflow: inbound email → intent classified → CRM checked → meeting booked → outcome logged. No human relay in the middle.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      title: "Automates the Work Between the Tools",
      description: "Each tool automates its own interior. None of them automates the hand-offs — and the hand-offs are where your team's day goes. Our agent pipelines run the whole chain end to end, 24/7.",
      gradient: "from-green-500 to-teal-500"
    },
    {
      title: "Safe Delegation, Enforced by the Kernel",
      description: "Every agent declares exactly which systems and actions it needs, and the OS enforces that ceiling on every action. Your follow-up agent can write CRM notes — it structurally cannot mass-email your customer list.",
      gradient: "from-yellow-500 to-orange-500"
    },
    {
      title: "One Audit Trail Across Every System",
      description: "Every agent action across email, CRM, and meetings lands in a single tamper-evident ledger: which agent, which trigger, which data, allowed or denied. Answer any \"who did what\" question with cryptographic proof.",
      gradient: "from-red-500 to-pink-500"
    },
    {
      title: "Self-Healing, So You Never Babysit It",
      description: "A failing agent is quarantined automatically and returned to service when healthy. A flaky integration is circuit-broken instead of hammered. Your team keeps using their tools — the OS works them from the other side.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      title: "Built to Grow Past Three Tools",
      description: "Email, CRM, and video are just the first connectors. Billing, support desk, e-signature, your own products — each new connector is instantly available to every agent, under the same security and audit controls.",
      gradient: "from-cyan-500 to-purple-500"
    }
  ]

  const anywhereFeatures = [
    {
      title: "Runs in the Cloud, Always On",
      description: "Your AI workforce doesn't live on any one device. It runs around the clock — answering, booking, logging — whether your laptop is open or not.",
      gradient: "from-orange-500 to-red-500"
    },
    {
      title: "Full Control from Your Phone",
      description: "Deploy an agent from the couch. Pause one from the airport. Check the audit trail from the school pickup line. Every control works from any browser, on any device.",
      gradient: "from-purple-500 to-blue-500"
    },
    {
      title: "Your Agents Reach You Anywhere",
      description: "Agents can notify you by text or push when something needs a human decision — \"this deal needs your approval\" — and act the moment you answer.",
      gradient: "from-green-500 to-blue-500"
    }
  ]

  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-32 pb-20">
        <div className="container mx-auto px-6 text-center">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
            Evolve AI OS
          </h1>
          <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-8">
            Your email, meetings, and CRM hold the data. Evolve AI OS is the workforce that moves it —
            with permissions you set and a record you can prove.
          </p>
          <Link
            href="/schedule-demo"
            className="inline-block bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold px-8 py-4 rounded-lg hover:opacity-90 transition-opacity"
          >
            Schedule a Demo
          </Link>
        </div>
      </section>

      {/* Works With Your Stack Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Keep Your Tools. Add a Workforce.
            </h2>
            <p className="text-xl text-gray-400">
              Evolve AI OS doesn't replace the systems you rely on — it puts intelligent agents to work inside them
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {integrations.map((item, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${item.gradient} rounded-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
              >
                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Add an AI OS Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Why Add an Operating System for Your AI?
            </h2>
            <p className="text-xl text-gray-400">
              Because tools that people operate become exponentially more valuable when agents can operate them too
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advantages.map((item, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${item.gradient} rounded-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
              >
                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Control From Anywhere Section (bottom) */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Runs in the Cloud. Controlled from Anywhere.
            </h2>
            <p className="text-xl text-gray-400 max-w-4xl mx-auto">
              Your laptop, your tablet, your phone — Evolve AI OS is not another system to install or manage.
              It works for you around the clock, and answers to you from whatever device is in your hand.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {anywhereFeatures.map((item, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${item.gradient} rounded-lg p-6 transform hover:scale-105 transition-all duration-300 hover:shadow-2xl`}
              >
                <h3 className="text-xl font-bold text-white mb-3">
                  {item.title}
                </h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-16">
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              The operating system for your AI workforce — not for your computer.
            </p>
            <Link
              href="/schedule-demo"
              className="inline-block bg-gradient-to-r from-orange-500 to-pink-500 text-white font-semibold px-8 py-4 rounded-lg hover:opacity-90 transition-opacity"
            >
              See It Work With Your Stack
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
