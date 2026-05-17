import { GoogleGenAI } from "@google/genai";

export interface LlmQueryOptions {
  prompt: string;
  model?: string;
  maxTokens?: number;
  task?: string;
  // Legacy keys kept as optional for backwards compatibility with un-migrated callers.
  // Ignored by this implementation.
  accessToken?: string;
  appName?: string;
  provider?: string;
  max_tokens?: number;
}

export interface LlmResponse {
  success: boolean;
  content?: string;
  error?: string;
  thinking?: string;
}

let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client = new GoogleGenAI({ apiKey });
  return client;
}

export async function queryLLM(opts: LlmQueryOptions): Promise<LlmResponse> {
  const {
    prompt,
    model = process.env.LLM_MODEL ?? "gemini-2.5-flash",
    maxTokens,
    max_tokens,
    task = "generic",
  } = opts;
  const limit = maxTokens ?? max_tokens ?? 60000;

  if (!prompt?.trim()) return { success: false, error: "prompt is required" };

  try {
    const res = await getClient().models.generateContent({
      model,
      contents: prompt,
      config: { maxOutputTokens: limit },
    });
    const text = res.text ?? "";
    return { success: true, content: text };
  } catch (err) {
    console.error(`[llm:${task}]`, err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "unknown llm error",
    };
  }
}
