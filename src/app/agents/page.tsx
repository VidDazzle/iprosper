import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Code, FileText, MessageSquare, ArrowRight, Play, Zap, Users, Wrench } from "lucide-react";

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <section className="pt-20 pb-16 relative overflow-hidden">
          {/* Animated Background Particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-blue-500 rounded-full animate-pulse opacity-60"></div>
            <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-purple-500 rounded-full animate-bounce opacity-40"></div>
            <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-orange-500 rounded-full animate-ping opacity-50"></div>
            <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-cyan-500 rounded-full animate-pulse opacity-70"></div>
          </div>
          
          <div className="container mx-auto px-6 text-center relative z-10">
            <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 animate-fade-in">
              The modern voice agent
              <br />
              development platform
            </h1>
            <p className="text-xl text-gray-400 mb-8 max-w-3xl mx-auto animate-fade-in-delay !whitespace-pre-line">iProsper.io is a code-first ecosystem to get from zero—to your first agent—to your best agent, in record time.

            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-fade-in-delay-2">
              <Link href="/docs">
                <Button className="bg-white text-black hover:bg-gray-200 rounded-3xl px-8 py-3 text-lg hover:scale-105 transition-transform !whitespace-pre-line">ProblemSolved

                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800 rounded-3xl px-8 py-3 text-lg hover:scale-105 transition-transform">
                  Read the docs
                </Button>
              </Link>
            </div>
            
            {/* Animated Waveform Visualization */}
            <div className="max-w-4xl mx-auto mb-8">
              <div className="flex justify-center items-end space-x-1 h-32 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-lg p-8">
                {Array.from({ length: 50 }, (_, i) =>
                <div
                  key={i}
                  className="bg-gradient-to-t from-orange-500 via-red-500 to-purple-500 rounded-full animate-audio-bars"
                  style={{
                    width: '4px',
                    height: `${Math.random() * 60 + 20}px`,
                    animationDelay: `${i * 0.1}s`,
                    animationDuration: `${Math.random() * 1 + 0.5}s`
                  }}>
                </div>
                )}
              </div>
            </div>
            
            {/* Hero Graphic with Animation */}
            <div className="max-w-4xl mx-auto animate-float">
              <Image
                src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/7faa4423-29cc-4b27-a117-d33c42640a6e/generated_images/modern-voice-agent-development-platform--d6550113-20250907010506.jpg"
                alt="Modern voice agent development platform"
                width={800}
                height={400}
                className="w-full h-auto rounded-lg border border-gray-800 hover:scale-105 transition-transform duration-500" />

            </div>
          </div>
        </section>

        {/* Audio Waveform Visualization Section */}
        <section className="py-16 bg-gradient-to-r from-orange-600/20 to-red-600/20 relative overflow-hidden animate-gradient-x">
          {/* Animated Background Waves */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 animate-wave"></div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="animate-slide-in-left">
                <h2 className="text-4xl font-bold text-white mb-6">
                  Real-time voice processing
                </h2>
                <p className="text-xl text-gray-300 mb-6">
                  Experience ultra-low latency voice interactions powered by state-of-the-art audio processing technology.
                </p>
                <div className="flex items-center space-x-4">
                  <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-full p-3 animate-pulse-slow hover:scale-110 transition-transform">
                    <Play className="w-6 h-6" />
                  </Button>
                  <span className="text-gray-300">Listen to real-time voice synthesis</span>
                </div>
              </div>
              <div className="animate-slide-in-right">
                {/* Interactive Waveform Display */}
                <div className="relative bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-lg p-8 border border-orange-500/30">
                  <div className="flex justify-center items-end space-x-2 h-48">
                    {Array.from({ length: 30 }, (_, i) =>
                    <div
                      key={i}
                      className="bg-gradient-to-t from-orange-400 to-red-400 rounded-full animate-waveform-pulse hover:scale-110 transition-transform cursor-pointer"
                      style={{
                        width: '6px',
                        height: `${Math.random() * 120 + 40}px`,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: `${Math.random() * 2 + 1}s`
                      }}>
                    </div>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ways to Get Started Section */}
        <section className="py-20 bg-[#1f1f1f] relative">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-4xl font-bold text-white mb-6">
                Start from anywhere. We'll meet you there
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-4xl mx-auto !whitespace-pre-line">Bring your own code, start with a url, or even a prompt. iProsper.io meets you where you are and gets you live fast. All roads lead to a code file that's written in the Line SDK, so you can use the ecosystem to iterate.

              </p>
              <Link href="/pricing">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-3xl px-8 py-3 text-lg hover:scale-105 transition-transform animate-glow">
                  Get started
                </Button>
              </Link>
            </div>

            {/* Animated Workflow Diagram */}
            <div className="mb-16 animate-fade-in-up-delay">
              <div className="relative">
                <Image
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/7faa4423-29cc-4b27-a117-d33c42640a6e/generated_images/voice-agent-workflow-diagram-graphic%2c--d3ef41fd-20250907010517.jpg"
                  alt="Voice agent workflow diagram"
                  width={1000}
                  height={400}
                  className="w-full h-auto rounded-lg mx-auto hover:scale-105 transition-transform duration-700" />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Bring Your Own Reasoning */}
              <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-800 hover:border-purple-500/50 transition-all duration-300 animate-card-hover group hover:scale-105">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-6 group-hover:animate-spin">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">
                  Bring-your-own reasoning
                </h3>
                <p className="text-gray-400 mb-6">
                  Bring the full complexity of your existing production-grade reasoning system or start anew.
                </p>
                <p className="text-gray-400 text-sm">
                  Using Line's public SDK, you can quickly turn your knowledgeable text chatbot into a voice agent or start from a clean, easy foundation. Connect to any LLM system and tool call backends you want.
                </p>
              </div>

              {/* Templates */}
              <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-800 hover:border-green-500/50 transition-all duration-300 animate-card-hover-delay group hover:scale-105">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6 group-hover:animate-bounce">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">
                  Templates
                </h3>
                <p className="text-gray-400 mb-6">
                  Jumpstart a new voice agent with ready-made templates.
                </p>
                <p className="text-gray-400 text-sm">
                  Get started fast with our pre-built agent templates for common use cases. Each template is fully customizable and built on the Line SDK foundation.
                </p>
              </div>

              {/* Text-to-Agent */}
              <div className="bg-[#2a2a2a] rounded-lg p-8 border border-gray-800 hover:border-orange-500/50 transition-all duration-300 animate-card-hover-delay-2 group hover:scale-105">
                <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center mb-6 group-hover:animate-pulse">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-white mb-4">
                  Text-to-Agent
                </h3>
                <p className="text-gray-400 mb-6">
                  Get to a v0 voice agent—with its code—through just a sentence.
                </p>
                <p className="text-gray-400 text-sm">
                  Describe what you want your agent to do in plain English, and we'll generate a working voice agent with full source code that you can customize and deploy.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Code-First Development Section */}
        <section className="py-20 relative overflow-hidden">
          {/* Animated Code Particles */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-10 left-10 text-green-400 animate-typing">{'<>'}</div>
            <div className="absolute top-20 right-20 text-blue-400 animate-typing-delay">{'() => {}'}</div>
            <div className="absolute bottom-20 left-20 text-purple-400 animate-typing-delay-2">{'const'}</div>
            <div className="absolute bottom-10 right-10 text-orange-400 animate-typing-delay-3">{'async'}</div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="animate-slide-in-left">
                <h2 className="text-4xl font-bold text-white mb-6 !whitespace-pre-line">Built for any Industry

                </h2>
                <p className="text-xl text-gray-400 mb-8 !whitespace-pre-line">Unlike cookie cutter ai voice agents our agents are custom built for your brand

                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4 animate-feature-slide-in">
                    <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 animate-pulse-color">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Lightning fast deployment
                      </h3>
                      <p className="text-gray-400">
                        From local development to production in minutes. Our platform handles scaling, monitoring, and reliability.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4 animate-feature-slide-in-delay">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 animate-pulse-color-delay">
                      <Wrench className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Full customization
                      </h3>
                      <p className="text-gray-400">
                        Every aspect of your agent is under your control. Custom reasoning, integrations, and behavior patterns.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-4 animate-feature-slide-in-delay-2">
                    <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1 animate-pulse-color-delay-2">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Enterprise ready
                      </h3>
                      <p className="text-gray-400">
                        Built for scale with enterprise security, compliance, and support. Trusted by teams building production agents.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative animate-slide-in-right">
                {/* Animated Code Interface */}
                <div className="relative bg-[#0f0f0f] rounded-lg p-8 border border-gray-800 animate-terminal-glow">
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse-delay"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse-delay-2"></div>
                  </div>
                  <div className="text-green-400 text-sm font-mono mb-4 animate-typing">
                    ~/my-voice-agent
                  </div>
                  <div className="text-gray-300 text-sm font-mono overflow-x-auto animate-code-reveal">
                    {`import { Agent } from "@cartesia/line-sdk";

const agent = new Agent({
  voice: "cartesia:sonic-english",
  model: "gpt-4",
  instructions: \`You are a helpful assistant 
    that can answer questions about our 
    products and help schedule demos.\`,
  tools: [scheduleDemo, getProductInfo]
});

agent.start();`}
                  </div>
                  {/* Cursor Animation */}
                  <div className="inline-block w-2 h-5 bg-green-400 animate-cursor-blink ml-1"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosystem Section */}
        <section className="py-20 bg-[#1f1f1f] relative overflow-hidden">
          {/* Animated Network Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-20 left-20 w-2 h-2 bg-blue-400 rounded-full animate-network-pulse"></div>
            <div className="absolute top-40 right-40 w-2 h-2 bg-purple-400 rounded-full animate-network-pulse-delay"></div>
            <div className="absolute bottom-40 left-40 w-2 h-2 bg-orange-400 rounded-full animate-network-pulse-delay-2"></div>
            <div className="absolute bottom-20 right-20 w-2 h-2 bg-cyan-400 rounded-full animate-network-pulse-delay-3"></div>
          </div>
          
          <div className="container mx-auto px-6 relative z-10">
            <div className="text-center mb-16 animate-fade-in-up">
              <h2 className="text-4xl font-bold text-white mb-6">
                Complete voice agent ecosystem
              </h2>
              <p className="text-xl text-gray-400 max-w-3xl mx-auto !whitespace-pre-line !whitespace-pre-line">From development to deployment, iProsper.io provides 1000+  integration you need to build, test, and scale production-ready voice agents.

              </p>
            </div>
            
            <div className="max-w-5xl mx-auto animate-ecosystem-reveal">
              <div className="relative">
                <Image
                  src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/7faa4423-29cc-4b27-a117-d33c42640a6e/generated_images/voice-agent-ecosystem-graphic-showing-co-3dcb788a-20250907010547.jpg"
                  alt="Voice agent ecosystem showing components and connections"
                  width={1000}
                  height={600}
                  className="w-full h-auto rounded-lg hover:scale-105 transition-transform duration-700" />

                {/* Floating Icons */}
                <div className="absolute top-10 left-10 animate-float-delay">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center animate-spin">
                    <Code className="w-4 h-4 text-blue-400" />
                  </div>
                </div>
                <div className="absolute top-20 right-20 animate-float-delay-2">
                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center animate-spin">
                    <MessageSquare className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
                <div className="absolute bottom-20 left-20 animate-float-delay-3">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center animate-spin">
                    <Zap className="w-4 h-4 text-orange-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600 relative overflow-hidden animate-gradient-xy">
          {/* Animated Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/50 to-blue-600/50 animate-gradient-shift"></div>
          
          <div className="container mx-auto px-6 text-center relative z-10">
            <h2 className="text-4xl font-bold text-white mb-6 animate-scale-in">
              Ready to build your voice agent?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto animate-fade-in-up-delay">
              Join thousands of developers building the future of voice AI with Line.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-buttons-reveal">
              <Link href="/docs">
                <Button className="bg-white text-black hover:bg-gray-200 rounded-3xl px-8 py-3 text-lg hover:scale-110 transition-transform animate-glow-white">
                  Start building now
                  <ArrowRight className="w-5 h-5 ml-2 animate-bounce-horizontal" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button variant="outline" className="border-white text-white hover:bg-white/10 rounded-3xl px-8 py-3 text-lg hover:scale-110 transition-transform">
                  Browse templates
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>);

}