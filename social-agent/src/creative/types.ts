export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Any chat-style LLM: OpenAI, Anthropic, Groq, local Ollama, or a custom proxy. */
export interface LLMProvider {
  readonly id: string;
  chat(messages: ChatMessage[], opts?: { json?: boolean; maxTokens?: number }): Promise<string>;
}

export interface VideoGenerationRequest {
  prompt: string;
  durationSeconds: number;
  aspectRatio: "9:16" | "1:1" | "16:9";
  referenceImageUrl?: string;
}

export interface VideoGenerationResult {
  assetUrl: string;
  jobId?: string;
  provider: string;
}

export interface VideoProvider {
  readonly id: string;
  generateVideo(req: VideoGenerationRequest): Promise<VideoGenerationResult>;
}

export interface ImageProvider {
  readonly id: string;
  generateImage(prompt: string, opts?: { aspectRatio?: string }): Promise<{ assetUrl: string }>;
}

export interface VoiceProvider {
  readonly id: string;
  synthesize(text: string, opts?: { voiceId?: string }): Promise<{ assetUrl: string }>;
}

export interface ViralityProvider {
  readonly id: string;
  predict(input: { videoUrl?: string; caption: string; hook: string }): Promise<{
    score: number;
    reasoning?: string;
  }>;
}
