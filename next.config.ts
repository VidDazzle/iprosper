import path from "node:path";
const LOADER = path.resolve(__dirname, 'src/visual-edits/component-tagger-loader.js');

// export a valid Next.js config
const config = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "slelguoygbfzlpylpxfs.supabase.co",
      },
    ],
  },
} satisfies import("next").NextConfig;
export default config;
// Orchids restart: 1757939109366