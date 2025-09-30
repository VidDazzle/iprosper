import Navigation from "@/components/sections/navigation";
import Hero from "@/components/sections/hero";
import PartnerLogos from "@/components/sections/partner-logos";
import RealTimeVoiceAgents from "@/components/sections/real-time-voice-agents";
import Languages from "@/components/sections/languages";
import Products from "@/components/sections/products";
import Testimonials from "@/components/sections/testimonials";
import Research from "@/components/sections/research";
import Security from "@/components/sections/security";
import Mission from "@/components/sections/mission";
import Footer from "@/components/sections/footer";

export default function Home() {
  return (
    <div className="font-sans">
      <Navigation />
      <Hero />
      <PartnerLogos />
      <RealTimeVoiceAgents />
      <Languages />
      <Products />
      <Testimonials />
      <Research />
      <Security />
      <Mission />
      <Footer />
    </div>
  );
}