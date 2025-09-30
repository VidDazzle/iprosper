import Image from "next/image";

const MissionSection = () => {
  return (
    <section className="flex flex-col items-center gap-12 bg-[#181818] px-6 pt-24 pb-[160px] text-center">
      <div className="flex max-w-lg flex-col items-center gap-6">
        <h2 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
          Our mission
        </h2>
        <p className="text-base text-[#d4d4d4] md:text-lg">
          We empower businesses to transform their customer experience and operations through intelligent voice AI automation. Our mission is to eliminate wait times, reduce costs, and deliver 24/7 professional service that scales instantly - helping companies capture every lead, support every customer, and stay ahead of the competition.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <a
          href="/team"
          className="flex h-[48px] items-center justify-center rounded-lg bg-white px-8 text-base font-medium text-black transition-transform hover:scale-105"
        >
          Meet the team
        </a>
        <a
          href="https://jobs.ashbyhq.com/cartesia"
          className="flex h-[48px] items-center justify-center rounded-lg border border-white/10 bg-white/5 px-8 text-base font-medium text-white transition-colors hover:bg-white/10"
        >
          Careers
        </a>
      </div>
    </section>
  );
};

export default MissionSection;