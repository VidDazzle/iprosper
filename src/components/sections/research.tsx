import Image from "next/image";

const publications = [
{
  date: 'Jul 6, 2025',
  title: 'Understanding and Improving Length Generalization in Recurrent Models',
  url: 'https://goombalab.github.io/blog/2025/improving-length-generalization/',
  imageUrl: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/images/next-081880-5shFjCpf7kc6RDma88UH4Qblo.png?'
},
{
  date: 'Jan 2, 2025',
  title: 'Llamba: Scaling Distilled Recurrent Models for Efficient Language Processing',
  url: 'https://arxiv.org/abs/2502.14458',
  imageUrl: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/images/next-081880-5shFjCpf7kc6RDma88UH4Qblo.png?'
},
{
  date: 'Jan 2, 2024',
  title: 'Based: Simple Linear Attention Language Models Balance the Recall-Throughput Tradeoff',
  url: 'https://cartesia.ai/blog/based',
  imageUrl: 'https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/7faa4423-29cc-4b27-a117-d33c42640a6e-delphi-ai-clone-vercel-app/assets/images/next-081880-VhaUmkAYPKAGzWylHZ039wPQlLY.png?'
}];


const ResearchSection = () => {
  return (
    <section className="py-3 px-6 bg-[#1a1a1a] text-white">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight max-w-xl">
            Pioneering new architectures for the next generation of AI.
          </h2>
          <a
            href="https://cartesia.ai/research"
            className="flex-shrink-0 h-[20px] rounded-full flex items-center justify-center px-3 bg-white text-black font-medium text-sm hover:bg-neutral-200 transition-colors">

            All publications
          </a>
        </div>
        <div className="grid md:grid-cols-3 gap-1 mt-2">
          {publications.map((pub, index) => {
            if (pub.imageUrl) {
              return (
                <a
                  key={index}
                  href={pub.url}
                  className="block border border-white/10 rounded hover:bg-white/5 transition-colors group overflow-hidden"
                  target="_blank"
                  rel="noopener noreferrer">

                  <div className="p-1">
                    <p className="text-sm text-[#a0a0a0]">{pub.date}</p>
                    <h3 className="mt-1 text-base font-medium text-white">
                      {pub.title}
                    </h3>
                  </div>
                  <div className="relative aspect-[383/215] transition-transform group-hover:scale-105 !w-[93px] !h-[52px] flex items-center justify-center bg-white/5 border border-white/10 rounded">
                    <span className="text-xs text-white">Click Here To Read More.....</span>
                  </div>
                </a>);

            }
            return (
              <a
                key={index}
                href={pub.url}
                className="block p-1 border border-white/10 rounded hover:bg-white/5 transition-colors group"
                target="_blank"
                rel="noopener noreferrer">

                <p className="text-sm text-[#a0a0a0]">{pub.date}</p>
                <h3 className="mt-1 text-base font-medium text-white">
                  {pub.title}
                </h3>
              </a>);

          })}
        </div>
      </div>
    </section>);

};

export default ResearchSection;