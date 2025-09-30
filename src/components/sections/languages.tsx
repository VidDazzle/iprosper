import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Plus } from 'lucide-react';

const languages = [
{ name: 'English', variant: 'American', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/JbrbaWl5kw9vXgw8Cb4WY4NMw-17-12.svg?' },
{ name: 'Spanish', variant: 'Latin', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/kUIj6Y3JxFpj3s9sEX4P17hus-18-13.svg?' },
{ name: 'French', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/4nXVR8FtwdMeRqDbQq3o4Sep10-19-14.svg?' },
{ name: 'Portuguese', variant: 'Brazilian', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/gDrhDDShGy4wNgZygPtTPh81FE-20-15.svg?' },
{ name: 'Hindi', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/Mofss3JCmL5WiydOBymQv5uFBd4-21-16.svg?' },
{ name: 'Chinese', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/yx4lfVHDp7WH070tI4lnbpyJgcU-22-17.svg?' },
{ name: 'Russian', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/0u3HO0PB0FqC5Fiz4N8Dyl6P7XY-23-18.svg?' },
{ name: 'Dutch', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/hINjdc9TL2i6pvVOhCJsYH' },
{ name: 'Japanese', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/DTYVXu7yhGao3pKENexHMPaVWA-25-20.svg?' },
{ name: 'Turkish', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/pz5X7R2Bpt9Ghvp9UKd3s5m2LH4-26-21.svg?' },
{ name: 'Korean', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/orFJVuCX8VdAq5kkrEdGnC0FI-27-22.svg?' },
{ name: 'German', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/pHXd74S7C0xZE4JWy7O2lActTg-28-23.svg?' },
{ name: 'Swedish', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/8ogRvo4FUvxnzoyRHsntNnIyQY-29-24.svg?' },
{ name: 'Italian', variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/vfMwWHapR1dXpmk4RbJGMBdFjg-30-25.svg?' },
{ name: "Over 150 Laungages", variant: '', icon: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/svgs/K5qrhcTjGC1hWoLw3bJq63ZCRo-31.svg?' }];


const LanguageCard = ({ name, variant, icon }: {name: string;variant?: string;icon: string;}) =>
<a href="#" className="group flex items-center justify-between border-b border-border py-5 transition-colors hover:border-white/20">
        <div className="flex items-center gap-4">
            <Image src={icon} alt={`${name} flag`} width={24} height={16} className="object-contain !w-6 !h-4 !max-w-6 !block" unoptimized />
            <p className="text-base text-white !whitespace-pre-line !whitespace-pre-line !whitespace-pre-line">
                {name}
                {variant && <span className="ml-2 text-neutral-500">{variant}</span>}
            </p>
        </div>
        <ChevronRight className="h-5 w-5 text-neutral-500 opacity-0 transition-opacity group-hover:opacity-100" />
    </a>;


const LanguagesSection = () => {
  return (
    <section id="languages" className="bg-[#1A1A1A] py-[120px] px-6">
      <div className="mx-auto max-w-[1152px] grid grid-cols-1 items-start gap-16 md:grid-cols-2">
        <div className="md:sticky md:top-28">
          <h2 className="text-4xl font-semibold tracking-tighter text-white md:text-5xl">
            Speak every language
          </h2>
          <p className="mt-4 text-lg leading-[1.6] text-secondary !whitespace-pre-line">iProsper.io supports native speech in Over 150 languages. Localize a given voice to any accent or language.

          </p>
          <Link
            href="/schedule-demo"
            className="mt-8 inline-flex h-14 items-center justify-center rounded-full bg-white px-8 text-base font-medium text-black transition-transform hover:scale-105">

            Schedule Demo
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
          {languages.map((lang) =>
          <LanguageCard key={lang.name} {...lang} />
          )}
          <div className="flex items-center gap-4 rounded-lg border border-dashed border-border p-5 text-neutral-500 mt-5 sm:mt-0 justify-center sm:justify-start">
            <Plus className="h-4 w-4" />
            <span className="text-base">Coming soon...</span>
          </div>
        </div>
      </div>
    </section>);

};

export default LanguagesSection;