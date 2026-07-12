import SolvanaNav from "@/components/solvana/nav";
import SolvanaHero from "@/components/solvana/hero";
import HowItWorks from "@/components/solvana/how-it-works";
import AgentGrid from "@/components/solvana/agent-grid";
import SavingsCalculator from "@/components/solvana/calculator";
import Transparency from "@/components/solvana/transparency";
import ComplianceSection from "@/components/solvana/compliance";
import FAQ from "@/components/solvana/faq";
import FinalCTA from "@/components/solvana/cta";
import SolvanaFooter from "@/components/solvana/footer";

export default function Home() {
  return (
    <div className="bg-[#050810] font-sans">
      <SolvanaNav />
      <SolvanaHero />
      <HowItWorks />
      <AgentGrid compact />
      <SavingsCalculator />
      <Transparency />
      <ComplianceSection />
      <FAQ />
      <FinalCTA />
      <SolvanaFooter />
    </div>
  );
}
