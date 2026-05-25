import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

export function makeLLM(opts: { task: string; model?: string; maxTokens?: number }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  return new ChatGoogleGenerativeAI({
    apiKey,
    model: opts.model ?? process.env.LLM_MODEL ?? "gemini-2.5-pro",
    maxOutputTokens: opts.maxTokens ?? 60000,
    metadata: { task: opts.task },
  });
}
