import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQS = [
  {
    q: "Is X Debt really run entirely by AI?",
    a: "Yes — intake, analysis, negotiation, account management, and client support are all handled by specialized AI voice agents, supervised by a compliance agent with veto power over every action. Licensed human attorneys step in for legal matters (like a creditor lawsuit), and you can ask to speak to a human supervisor at any time on any call.",
  },
  {
    q: "Do you pay off my debts for me?",
    a: "No. X Debt is not a lender and does not pay your debts directly. You save money monthly in a dedicated FDIC-insured account that you own. When enough accumulates, our AI negotiates with each creditor to accept a smaller one-time lump-sum payment from that account and forgive the rest.",
  },
  {
    q: "How much does it cost?",
    a: "Nothing upfront — federal law (the FTC Telemarketing Sales Rule) prohibits advance fees for debt settlement, and our payment system enforces that in code. When a debt settles, you approve the terms, and you make the first settlement payment, we charge 15%–25% of that debt's enrolled balance.",
  },
  {
    q: "Will this hurt my credit?",
    a: "Almost certainly, yes — especially early on. The program requires you to stop paying enrolled creditors, which leads to missed-payment reporting, and creditors may add interest and fees or pursue collection, including lawsuits. Many clients see scores recover after settlements complete, but we never promise that. If protecting your score is your top priority, debt settlement is the wrong product, and our intake agent will tell you so.",
  },
  {
    q: "What debts qualify?",
    a: "Unsecured debts: credit cards, medical bills, personal loans, store cards, collections, and unsecured business debt — with at least $7,500 in total qualifying debt. We cannot settle secured debts (mortgages, auto loans), federal student loans, tax debt, or child support.",
  },
  {
    q: "How long does the program take?",
    a: "Typically 24 to 36 months, depending on how much you deposit monthly and how your creditors negotiate. Individual debts often settle along the way — many clients see their first settlement within 4–6 months.",
  },
  {
    q: "What if I change my mind?",
    a: "Leave anytime. The dedicated account is yours: every dollar in it (minus fees on debts already settled with your approval) returns to you, with no exit penalty. Our Sage agent will process your exit without retention pressure — that's a hard rule in its guardrails.",
  },
  {
    q: "What happens if a creditor sues me?",
    a: "Creditors can sue over unpaid debt, and no settlement company can prevent that. If it happens, our Guardian agent calendars your response deadline, tells you explicitly never to ignore a summons, and connects you with an independent licensed consumer attorney from our network within 24 hours. Accounts in litigation get priority for settlement, which often resolves the suit.",
  },
];

export default function FAQ() {
  return (
    <section className="bg-[#03040a] px-6 py-24 text-white">
      <div className="mx-auto max-w-3xl">
        <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-cyan-400">
          FAQ
        </p>
        <h2 className="mb-12 text-center text-4xl font-bold md:text-5xl">
          Straight answers
        </h2>
        <Accordion type="single" collapsible className="space-y-3">
          {FAQS.map((f, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-white/10 bg-white/5 px-6 backdrop-blur"
            >
              <AccordionTrigger className="text-left text-white hover:text-cyan-300 hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm leading-relaxed text-gray-400">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
