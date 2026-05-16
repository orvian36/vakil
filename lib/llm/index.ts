export interface LlmQueryOptions {
    prompt: string;
    provider?: string;   // default: gemini
    model?: string;      // default: gemini-3-flash-preview
    max_tokens?: number;  // default: 10000
    appName?: string;    // required for tracking
    task?: string;       // optional, context about the task
    accessToken: string; // required
  }
  export interface LlmResponse {
    success: boolean;
    content?: string;   // the actual LLM output
    error?: string;     // error message if failed
    thinking?: string;   // the actual LLM output
  }
  
  
  const LLM_ENDPOINT = "https://platform.makebell.com/api/llm/query";
  
  export async function queryLLM(options: LlmQueryOptions): Promise<LlmResponse> {
    const {
      prompt,
      provider = "qwen",
      model = "google/gemini-3-flash-preview",
      max_tokens = 59000,
      appName = "personal-injury",
      task = "document-analysis",
      accessToken,
    } = options;
  
    if (!prompt?.trim()) {
      return { success: false, error: "Prompt is required" };
    }
  
    if (!accessToken) {
      return { success: false, error: "Access token is required" };
    }
  
    try {
      const response = await fetch(LLM_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          prompt,
          provider,
          model,
          max_tokens: max_tokens,
          app_name: appName,
          task,
        }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [LLMService] API Error:", errorText);
        return {
          success: false,
          error: `LLM request failed with status ${response.status}`,
        };
      }
      const data = await response.json();
      return { success: true, content: data.content ?? "" , thinking: data.thinking ?? "" };
    } catch (err) {
      console.error("❌ [LLMService] Network/Parsing Error:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
  