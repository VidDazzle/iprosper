"use client";

import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Mail } from "lucide-react";
import Navigation from "@/components/sections/navigation";
import Footer from "@/components/sections/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  image: string;
}

const blogPosts: BlogPost[] = [
  {
    id: 1,
    title: "The Rise of Multimodal AI: Beyond Text and Images",
    excerpt: "Exploring how AI systems are evolving to understand and generate content across multiple modalities, from text and images to audio and video, creating more comprehensive AI experiences.",
    category: "Technology",
    date: "Dec 15, 2024",
    image: "/api/placeholder/400/250"
  },
  {
    id: 2,
    title: "Real-Time Voice AI Achieves Human-Level Pronunciation",
    excerpt: "Latest breakthroughs in voice synthesis technology demonstrate unprecedented accuracy in pronunciation and natural speech patterns, marking a new era for conversational AI.",
    category: "Voice AI",
    date: "Dec 10, 2024",
    image: "/api/placeholder/400/250"
  },
  {
    id: 3,
    title: "State Space Models: The New Architecture Revolutionizing AI",
    excerpt: "Deep dive into State Space Models and how they're transforming AI architectures with improved efficiency and performance across various applications.",
    category: "Research",
    date: "Dec 5, 2024",
    image: "/api/placeholder/400/250"
  },
  {
    id: 4,    
    title: "AI Voice Cloning Reaches 99% Accuracy in Clinical Trials",
    excerpt: "Clinical studies reveal remarkable progress in voice cloning technology, with applications spanning healthcare, accessibility, and personalized AI assistants.",
    category: "Healthcare",
    date: "Nov 30, 2024",
    image: "/api/placeholder/400/250"
  },
  {
    id: 5,
    title: "Breaking: New Language Model Supports 50+ Languages",
    excerpt: "Revolutionary multilingual capabilities enable AI systems to understand and communicate across diverse languages with unprecedented accuracy and cultural context.",
    category: "Language",
    date: "Nov 25, 2024",
    image: "/api/placeholder/400/250"
  },
  {
    id: 6,
    title: "Enterprise AI Security: SOC 2 Compliance Made Simple",
    excerpt: "Comprehensive guide to implementing enterprise-grade security measures for AI systems, ensuring SOC 2 compliance while maintaining performance.",
    category: "Security",
    date: "Nov 20, 2024",
    image: "/api/placeholder/400/250"
  },
  {
    id: 7,
    title: "Low-Latency AI: 10ms Response Times Now Possible",
    excerpt: "Technical breakthrough achieves sub-10ms response times for AI inference, enabling real-time applications previously thought impossible.",
    category: "Performance",
    date: "Nov 15, 2024",
    image: "/api/placeholder/400/250"
  },
  {
    id: 8,
    title: "AI Integration with Twilio and LiveKit Platforms",
    excerpt: "Seamless integration capabilities with leading communication platforms, enabling developers to build sophisticated voice AI applications with minimal complexity.",
    category: "Integrations",
    date: "Nov 10, 2024",
    image: "/api/placeholder/400/250"
  }
];

const categories = ["All", "Technology", "Voice AI", "Research", "Healthcare", "Language", "Security", "Performance", "Integrations"];

const categoryColors: { [key: string]: string } = {
  "Technology": "bg-gradient-to-r from-blue-500 to-purple-600",
  "Voice AI": "bg-gradient-to-r from-orange-500 to-red-500",
  "Research": "bg-gradient-to-r from-purple-500 to-pink-500",
  "Healthcare": "bg-gradient-to-r from-green-500 to-teal-500",
  "Language": "bg-gradient-to-r from-yellow-500 to-orange-500",
  "Security": "bg-gradient-to-r from-red-500 to-pink-500",
  "Performance": "bg-gradient-to-r from-cyan-500 to-blue-500",
  "Integrations": "bg-gradient-to-r from-indigo-500 to-purple-500"
};

const recentPosts = blogPosts.slice(0, 4);

export default function BlogPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const startIndex = (currentPage - 1) * postsPerPage;
  const currentPosts = filteredPosts.slice(startIndex, startIndex + postsPerPage);

  return (
    <>
      <Navigation />
      
      <main className="min-h-screen bg-[#1a1a1a] text-white">
        {/* Header Section */}
        <section className="pt-24 pb-16">
          <div className="container mx-auto px-6 text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              AI Breakthroughs & News
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Stay updated with the latest developments in artificial intelligence, voice technology, and cutting-edge research shaping the future of AI.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <div className="lg:w-3/4">
              {/* Search and Filter Bar */}
              <div className="mb-8 flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search articles..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#2a2a2a] border-gray-600 text-white placeholder-gray-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="text-gray-400 h-5 w-5" />
                  <span className="text-gray-400 text-sm">Filter:</span>
                </div>
              </div>

              {/* Category Filter */}
              <div className="mb-8 flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setCurrentPage(1);
                    }}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      selectedCategory === category
                        ? "bg-white text-black"
                        : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* Blog Posts Grid */}
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 mb-12">
                {currentPosts.map((post) => (
                  <article
                    key={post.id}
                    className="bg-[#2a2a2a] rounded-lg overflow-hidden border border-gray-700 hover:border-gray-600 transition-all duration-300 group hover:transform hover:-translate-y-1"
                  >
                    <div className="relative overflow-hidden">
                      <div className="w-full h-48 bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        <div className="text-gray-500 text-sm">Featured Image</div>
                      </div>
                      <div className="absolute top-4 left-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${categoryColors[post.category]}`}>
                          {post.category}
                        </span>
                      </div>
                    </div>
                    
                    <div className="p-6">
                      <div className="text-sm text-gray-400 mb-2">{post.date}</div>
                      <h3 className="text-xl font-semibold mb-3 group-hover:text-blue-400 transition-colors duration-300">
                        {post.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                        {post.excerpt}
                      </p>
                      <Button
                        variant="ghost"
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 p-0 h-auto font-medium"
                      >
                        Read more →
                      </Button>
                    </div>
                  </article>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mb-12">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="text-gray-400 hover:text-white hover:bg-[#3a3a3a]"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className={
                        currentPage === page
                          ? "bg-white text-black hover:bg-gray-200"
                          : "text-gray-400 hover:text-white hover:bg-[#3a3a3a]"
                      }
                    >
                      {page}
                    </Button>
                  ))}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="text-gray-400 hover:text-white hover:bg-[#3a3a3a]"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:w-1/4">
              <div className="sticky top-24 space-y-8">
                {/* Categories Widget */}
                <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4">Categories</h3>
                  <div className="space-y-2">
                    {categories.slice(1).map((category) => (
                      <button
                        key={category}
                        onClick={() => {
                          setSelectedCategory(category);
                          setCurrentPage(1);
                        }}
                        className="block w-full text-left px-3 py-2 rounded text-gray-400 hover:text-white hover:bg-[#3a3a3a] transition-colors duration-200"
                      >
                        {category}
                        <span className="float-right text-sm">
                          {blogPosts.filter(post => post.category === category).length}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recent Posts Widget */}
                <div className="bg-[#2a2a2a] rounded-lg p-6 border border-gray-700">
                  <h3 className="text-xl font-semibold mb-4">Recent Posts</h3>
                  <div className="space-y-4">
                    {recentPosts.map((post) => (
                      <div key={post.id} className="group cursor-pointer">
                        <div className="text-sm font-medium group-hover:text-blue-400 transition-colors duration-200 mb-1">
                          {post.title}
                        </div>
                        <div className="text-xs text-gray-400">{post.date}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <section className="py-16 bg-[#2a2a2a] mt-16">
          <div className="container mx-auto px-6 text-center">
            <div className="max-w-2xl mx-auto">
              <Mail className="h-12 w-12 text-blue-400 mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
              <p className="text-gray-400 mb-6">
                Get the latest AI breakthroughs and insights delivered directly to your inbox.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <Input
                  placeholder="Enter your email"
                  className="bg-[#1a1a1a] border-gray-600 text-white placeholder-gray-400 flex-1"
                />
                <Button className="bg-white text-black hover:bg-gray-200 font-medium">
                  Subscribe
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}