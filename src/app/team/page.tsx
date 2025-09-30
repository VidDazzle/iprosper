import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Brain, Code, Users, Globe, Award, Zap, Target, BookOpen, Shield } from "lucide-react";
import Image from "next/image";

export default function TeamPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <section className="pt-20 pb-16">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6">
              Help us build the next
              <br />
              generation of AI
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto">
              We're building the next generation of AI: ubiquitous, interactive intelligence that runs wherever you are.
            </p>
            <Link href="/careers">
              <Button className="bg-white text-black hover:bg-gray-200 rounded-3xl px-8 py-3 text-lg">
                See open positions
              </Button>
            </Link>
          </div>
        </section>

        {/* Innovation Section */}
        <section className="py-20 bg-[#1f1f1f]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-6">
                New architectures are necessary for the next generation of AI.
              </h2>
              <Link href="/research">
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800 rounded-3xl px-8 py-3 text-lg">
                  Explore our research
                </Button>
              </Link>
            </div>

            <div className="max-w-4xl mx-auto text-center">
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Our founding team met as researchers at leading AI institutions, where we developed State Space Models (SSMs), 
                a fundamental new primitive for training large-scale foundation models that are higher quality and more efficient.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                Over the past several years, we've built the theory behind SSMs and scaled it up to achieve state-of-the-art 
                results in modalities as diverse as text, audio, video, images, and time-series data.
              </p>
            </div>
          </div>
        </section>

        {/* Funding & Achievements Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">SERIES A</div>
                <p className="text-gray-400">Funded by leading VCs to scale our technology</p>
              </div>
              <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">50M+</div>
                <p className="text-gray-400">API calls processed monthly</p>
              </div>
              <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-800 text-center">
                <div className="text-3xl font-bold text-orange-400 mb-2">15+</div>
                <p className="text-gray-400">Languages supported globally</p>
              </div>
            </div>
          </div>
        </section>

        {/* Team Names Section - Random Names Grid */}
        <section className="py-20 bg-[#1f1f1f]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-6">
                Meet our team
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                We're a diverse group of researchers, engineers, and builders united by our passion 
                for advancing the state of AI and making it accessible to everyone.
              </p>
            </div>

            {/* Random Names Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-16">
              {/* Row 1 */}
              <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Alex Chen</p>
                <p className="text-gray-400 text-sm">AI Researcher</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Sarah Mitchell</p>
                <p className="text-gray-400 text-sm">ML Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">David Rodriguez</p>
                <p className="text-gray-400 text-sm">Backend Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Emily Johnson</p>
                <p className="text-gray-400 text-sm">Product Manager</p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Michael Park</p>
                <p className="text-gray-400 text-sm">DevOps Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Lisa Wang</p>
                <p className="text-gray-400 text-sm">Data Scientist</p>
              </div>

              {/* Row 2 */}
              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">James Thompson</p>
                <p className="text-gray-400 text-sm">Frontend Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Maria Garcia</p>
                <p className="text-gray-400 text-sm">UX Designer</p>
              </div>

              <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Ryan Kim</p>
                <p className="text-gray-400 text-sm">Research Scientist</p>
              </div>

              <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Anna Kowalski</p>
                <p className="text-gray-400 text-sm">Security Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Omar Hassan</p>
                <p className="text-gray-400 text-sm">Platform Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Sophie Taylor</p>
                <p className="text-gray-400 text-sm">Marketing Manager</p>
              </div>

              {/* Row 3 */}
              <div className="bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Carlos Mendez</p>
                <p className="text-gray-400 text-sm">Solutions Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Rachel Green</p>
                <p className="text-gray-400 text-sm">Content Manager</p>
              </div>

              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Thomas Anderson</p>
                <p className="text-gray-400 text-sm">System Architect</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Priya Sharma</p>
                <p className="text-gray-400 text-sm">QA Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Lucas Brown</p>
                <p className="text-gray-400 text-sm">Business Analyst</p>
              </div>

              <div className="bg-gradient-to-br from-cyan-500/20 to-teal-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Nina Petrov</p>
                <p className="text-gray-400 text-sm">HR Manager</p>
              </div>

              {/* Row 4 */}
              <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Kevin O'Connor</p>
                <p className="text-gray-400 text-sm">Sales Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-indigo-500/20 to-blue-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Amanda Davis</p>
                <p className="text-gray-400 text-sm">Operations Lead</p>
              </div>

              <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Diego Silva</p>
                <p className="text-gray-400 text-sm">Mobile Developer</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Zoe Williams</p>
                <p className="text-gray-400 text-sm">Technical Writer</p>
              </div>

              <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Raj Patel</p>
                <p className="text-gray-400 text-sm">Cloud Engineer</p>
              </div>

              <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-lg p-4 text-center border border-gray-700">
                <p className="text-white font-medium">Isabella Martinez</p>
                <p className="text-gray-400 text-sm">Finance Manager</p>
              </div>
            </div>

            {/* Team Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl font-bold text-blue-400 mb-2">50+</div>
                <p className="text-gray-400">Team Members</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-purple-400 mb-2">15+</div>
                <p className="text-gray-400">Countries</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-orange-400 mb-2">10+</div>
                <p className="text-gray-400">Disciplines</p>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-400 mb-2">100%</div>
                <p className="text-gray-400">Remote-First</p>
              </div>
            </div>
          </div>
        </section>

        {/* Company Culture Section */}
        <section className="py-20">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-6">
                Our Culture
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                We believe that breakthrough technology comes from diverse perspectives, 
                collaborative innovation, and a culture that empowers everyone to do their best work.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Research First</h3>
                <p className="text-gray-400">
                  We push the boundaries of what's possible with AI through rigorous research and experimentation.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Collaborative</h3>
                <p className="text-gray-400">
                  Great ideas come from everywhere. We foster an environment where everyone's voice is heard.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Global Impact</h3>
                <p className="text-gray-400">
                  We're building technology that will transform how people interact with AI worldwide.
                </p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Move Fast</h3>
                <p className="text-gray-400">
                  We iterate quickly, learn from failures, and ship products that make a real difference.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Perks & Benefits Section */}
        <section className="py-20 bg-[#1f1f1f]">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-white mb-6">
                Why join our team?
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto">
                We offer competitive compensation, equity, and benefits, but more importantly, 
                the opportunity to work on cutting-edge technology that will shape the future of AI.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-800">
                <Target className="w-10 h-10 text-blue-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Meaningful Work</h3>
                <p className="text-gray-400">
                  Work on products that millions of developers and users rely on every day.
                </p>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-800">
                <Award className="w-10 h-10 text-purple-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Equity & Growth</h3>
                <p className="text-gray-400">
                  Competitive salary, significant equity, and opportunities for career advancement.
                </p>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-800">
                <Globe className="w-10 h-10 text-green-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Remote First</h3>
                <p className="text-gray-400">
                  Work from anywhere with flexible hours and a strong remote-first culture.
                </p>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-800">
                <BookOpen className="w-10 h-10 text-orange-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Learn & Grow</h3>
                <p className="text-gray-400">
                  Conference budgets, learning stipends, and mentorship from world-class researchers.
                </p>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-800">
                <Shield className="w-10 h-10 text-cyan-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Comprehensive Benefits</h3>
                <p className="text-gray-400">
                  Health, dental, vision insurance, unlimited PTO, and wellness stipends.
                </p>
              </div>

              <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-800">
                <Code className="w-10 h-10 text-red-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">Top-tier Tools</h3>
                <p className="text-gray-400">
                  Latest hardware, premium software licenses, and access to cutting-edge research tools.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold text-white mb-6">
              Ready to shape the future of AI?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join our team of world-class researchers, engineers, and builders who are creating 
              the next generation of voice AI technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/careers">
                <Button className="bg-white text-black hover:bg-gray-200 rounded-3xl px-8 py-3 text-lg">
                  View Open Positions
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 rounded-3xl px-8 py-3 text-lg">
                  Get in Touch
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}