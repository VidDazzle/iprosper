"use client";

import { useState } from "react";

const RealTimeVoiceAgents = () => {
  const [isPlaying, setIsPlaying] = useState(false);

  const handleStartCall = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <section className="bg-[#1a1a1a] text-white py-[120px] px-6 relative" style={{ overflow: 'hidden', isolation: 'isolate' }}>
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-12 sm:gap-16">
        {/* Heading */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-semibold tracking-tight">
            Perfect for real-time voice agents
          </h2>
          <p className="mt-4 text-lg text-[#a0a0a0] leading-[1.6]">
            Best-in-class pronunciations: Get complex phone numbers, addresses,
            and IDs right every time.
          </p>
        </div>
        
        <iframe id="audio_iframe" src="https://voiceagents.tech//widget/v2/8b28518f-ba4f-4083-b282-8dbd0a00c7ab/1758814938820x190350333809891300" allow="microphone" width="400px" height="550px" pointer-events="none" scrolling="no" style={{ position: "relative", margin: "auto", display: "flex", background: "transparent", border: "none", zIndex: 999 }}></iframe>

        {/* Feature text grid */}
        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 md:gap-16">
          <div>
            <p className="text-base leading-[1.6] text-[#a0a0a0] !whitespace-pre-line">
              <strong className="font-medium text-white">Low-latency.</strong>{" "}
              iProsper has the lowest latency of any AI voice model we have
              tested—meaning your voice agents can spend more time
              understanding, thinking, and acting on user inputs.
            </p>
          </div>
          <div>
            <p className="text-base leading-[1.6] text-[#a0a0a0] !whitespace-pre-line">
              <strong className="font-medium text-white">
                Best-in-class pronunciations.
              </strong>{" "}
              Get complex phone numbers, addresses, language's and IDs right
              every time.
            </p>
          </div>
        </div>
      </div>
      
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes morphCircle {
          0% {
            border-radius: 50%;
            transform: scale(1);
          }
          25% {
            border-radius: 45% 55% 40% 60%;
            transform: scale(1.1) rotate(90deg);
          }
          50% {
            border-radius: 35% 65% 55% 45%;
            transform: scale(0.9) rotate(180deg);
          }
          75% {
            border-radius: 60% 40% 35% 65%;
            transform: scale(1.15) rotate(270deg);
          }
          100% {
            border-radius: 50%;
            transform: scale(1) rotate(360deg);
          }
        }

        @keyframes morphCircle2 {
          0% {
            border-radius: 50%;
            transform: scale(1);
          }
          20% {
            border-radius: 60% 40% 50% 50%;
            transform: scale(1.05);
          }
          40% {
            border-radius: 40% 60% 45% 55%;
            transform: scale(0.95);
          }
          60% {
            border-radius: 55% 45% 60% 40%;
            transform: scale(1.08);
          }
          80% {
            border-radius: 45% 55% 35% 65%;
            transform: scale(0.92);
          }
          100% {
            border-radius: 50%;
            transform: scale(1);
          }
        }

        @keyframes organicPulse {
          0%, 100% {
            border-radius: 50%;
            transform: scale(1);
          }
          33% {
            border-radius: 45% 55% 50% 50%;
            transform: scale(1.02);
          }
          66% {
            border-radius: 55% 45% 40% 60%;
            transform: scale(0.98);
          }
        }

        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            filter: blur(0px);
            border-radius: 50%;
          }
          25% {
            transform: scale(1.03);
            filter: blur(0.2px);
            border-radius: 45% 55% 50% 50%;
          }
          50% {
            transform: scale(1.05);
            filter: blur(0.5px);
            border-radius: 40% 60% 45% 55%;
          }
          75% {
            transform: scale(1.02);
            filter: blur(0.3px);
            border-radius: 55% 45% 60% 40%;
          }
        }

        @keyframes textGlow {
          0% {
            text-shadow: 
              0 0 20px rgba(255, 255, 255, 0.8),
              0 0 40px rgba(0, 245, 255, 0.6),
              0 0 60px rgba(160, 32, 240, 0.4);
          }
          100% {
            text-shadow: 
              0 0 30px rgba(255, 255, 255, 1),
              0 0 60px rgba(0, 245, 255, 0.8),
              0 0 90px rgba(160, 32, 240, 0.6);
          }
        }

        @keyframes pulseRingOrganic {
          0% {
            transform: translate(-50%, -50%) scale(0.8);
            opacity: 0;
            border-radius: 50%;
          }
          25% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.5;
            border-radius: 45% 55% 50% 50%;
          }
          50% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 1;
            border-radius: 40% 60% 45% 55%;
          }
          75% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.5;
            border-radius: 55% 45% 35% 65%;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.2);
            opacity: 0;
            border-radius: 50%;
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            transform: scale(0.8);
            opacity: 0.3;
            border-radius: 50%;
          }
          25% {
            transform: scale(1.0);
            opacity: 0.5;
            border-radius: 45% 55% 50% 50%;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.7;
            border-radius: 40% 60% 45% 55%;
          }
          75% {
            transform: scale(1.1);
            opacity: 0.6;
            border-radius: 55% 45% 35% 65%;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
            opacity: 0.4;
          }
          25% {
            transform: translateY(-20px) translateX(10px) rotate(90deg);
            opacity: 0.8;
          }
          50% {
            transform: translateY(-10px) translateX(-15px) rotate(180deg);
            opacity: 1;
          }
          75% {
            transform: translateY(-30px) translateX(5px) rotate(270deg);
            opacity: 0.6;
          }
        }

        .animation-play-state-paused {
          animation-play-state: paused !important;
        }
      `}</style>
    </section>
  );
};

export default RealTimeVoiceAgents;